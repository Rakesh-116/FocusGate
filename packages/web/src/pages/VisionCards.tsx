import { useEffect, useState } from 'react'
import { DndContext, closestCenter } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

type VisionCard = {
  id: string
  image_url: string
  caption: string | null
  sort_order: number | null
}

type UploadState = 'idle' | 'uploading' | 'error'

const VISION_CARD_BUCKET = 'vision-cards'
const VISION_CARD_PUBLIC_PATH = `/storage/v1/object/public/${VISION_CARD_BUCKET}/`

function getVisionCardPathFromUrl(url: string) {
  try {
    if (url.startsWith(VISION_CARD_PUBLIC_PATH)) {
      return url.slice(VISION_CARD_PUBLIC_PATH.length)
    }
    const parsed = new URL(url)
    const marker = `/storage/v1/object/public/${VISION_CARD_BUCKET}/`
    const index = parsed.pathname.indexOf(marker)
    if (index !== -1) {
      return parsed.pathname.slice(index + marker.length)
    }
  } catch {
    // ignore invalid URLs
  }
  return null
}

function VisionCardImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [imageSrc, setImageSrc] = useState(src)
  const [triedFallback, setTriedFallback] = useState(false)

  const handleImageError = async () => {
    if (triedFallback) return
    const storagePath = getVisionCardPathFromUrl(imageSrc) ?? (imageSrc.startsWith('/') ? imageSrc : null)
    if (!storagePath) return

    setTriedFallback(true)
    const { data, error } = await supabase.storage.from(VISION_CARD_BUCKET).createSignedUrl(storagePath, 3600)
    if (data?.signedUrl) {
      setImageSrc(data.signedUrl)
    } else if (error) {
      console.warn('Vision card image failed to load and fallback signed URL could not be created:', error.message)
    }
  }

  return <img src={imageSrc} alt={alt} className={className} onError={handleImageError} />
}

function SortableCard({ card }: { card: VisionCard }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: card.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      className="group relative flex h-72 min-w-[280px] flex-col overflow-hidden rounded-[32px] border border-slate-700/70 bg-slate-950/90"
    >
      <VisionCardImage src={card.image_url} alt={card.caption ?? 'Vision card'} className="h-full w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/75 to-transparent px-5 py-4">
        <p className="text-sm font-semibold text-white">{card.caption ?? 'Capture your why'}</p>
      </div>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-200 opacity-0 transition group-hover:opacity-100"
      >
        Drag
      </button>
    </motion.div>
  )
}

export default function VisionCards() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [cards, setCards] = useState<VisionCard[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploadState, setUploadState] = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const cardsQuery = useQuery<VisionCard[]>({
    queryKey: ['vision-cards', userId],
    queryFn: async () => {
      if (!userId) return []
      const result = await supabase
        .from('vision_cards')
        .select('id,image_url,caption,sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
      if (result.error) throw result.error
      return result.data ?? []
    },
    enabled: !!userId,
  })

  const uploadMutation = useMutation<boolean, Error, void>({
    mutationFn: async () => {
      if (!userId || !file) throw new Error('Missing upload data')
      const filename = `${userId}/${crypto.randomUUID()}.jpg`
      const { error: uploadError } = await supabase.storage.from('vision-cards').upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadError) throw uploadError
      const urlData = await supabase.storage.from('vision-cards').getPublicUrl(filename)
      const imageUrl = urlData.data.publicUrl
      const order = cards.length + 1
      const { error: insertError } = await supabase.from('vision_cards').insert([{ user_id: userId, image_url: imageUrl, caption: caption || null, sort_order: order }])
      if (insertError) throw insertError
      return true
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vision-cards', userId] })
      setIsModalOpen(false)
      setFile(null)
      setCaption('')
      setUploadState('idle')
    },
    onError: (error) => {
      setErrorMessage(error.message)
      setUploadState('error')
    },
  })

  const deleteMutation = useMutation<string, Error, string>({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.from('vision_cards').delete().eq('id', cardId)
      if (error) throw error
      return cardId
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vision-cards', userId] }),
  })

  const reorderMutation = useMutation<VisionCard[], Error, VisionCard[]>({
    mutationFn: async (orderedCards: VisionCard[]) => {
      const updates = orderedCards.map((card, index) => ({ id: card.id, sort_order: index + 1 }))
      const { error } = await supabase.from('vision_cards').upsert(updates)
      if (error) throw error
      return orderedCards
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vision-cards', userId] }),
  })

  useEffect(() => {
    if (cardsQuery.data) {
      setCards(cardsQuery.data)
    }
  }, [cardsQuery.data])

  const active = cardsQuery.isFetching

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = cards.findIndex((card) => card.id === active.id)
    const newIndex = cards.findIndex((card) => card.id === over.id)
    const next = arrayMove(cards, oldIndex, newIndex)
    setCards(next)
    reorderMutation.mutate(next)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null
    setFile(selected)
    setErrorMessage('')
  }

  const handleAddCard = async () => {
    if (!file) {
      setErrorMessage('Please select an image file.')
      return
    }
    setUploadState('uploading')
    setErrorMessage('')
    uploadMutation.mutate()
  }

  const uploadButtonDisabled = uploadState === 'uploading' || !file

  return (
    <div className="min-h-screen bg-[color:var(--surface)] px-4 py-10 text-[color:var(--text)]">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex flex-col gap-4 rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface-2)]/90 p-8 shadow-soft glass-panel-dark sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-[color:var(--muted)]">Vision Cards</p>
            <h1 className="mt-3 text-4xl font-semibold text-[color:var(--text)] section-heading">Build the block screen that inspires you.</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-3xl bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Add Card
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-3)] px-5 py-3 text-sm font-semibold text-[color:var(--text)] transition hover:border-[color:var(--accent)]"
            >
              Back to dashboard
            </button>
          </div>
        </div>

        <div className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--card)]/95 p-8 shadow-soft">
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="text-sm text-[color:var(--muted)]">Drag cards to reorder how they appear on your block screen.</p>
            {active && <span className="text-sm text-[color:var(--muted)]">Syncing order...</span>}
          </div>
          {cards.length > 0 ? (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={cards.map((card) => card.id)} strategy={horizontalListSortingStrategy}>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {cards.map((card) => (
                    <div key={card.id} className="group relative">
                      <SortableCard card={card} />
                      <button
                        type="button"
                        onClick={() => deleteMutation.mutate(card.id)}
                        className="absolute right-3 top-3 z-10 rounded-full bg-[color:var(--surface-3)]/80 px-3 py-2 text-xs font-semibold text-[color:var(--text)] opacity-0 transition group-hover:opacity-100"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            <div className="rounded-[32px] border border-dashed border-[color:var(--border)] bg-[color:var(--surface-3)]/80 p-12 text-center text-[color:var(--muted)]">
              <p className="text-lg font-semibold text-[color:var(--text)]">No vision cards yet.</p>
              <p className="mt-3 text-sm">Add your first card to make the block screen more motivating.</p>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl rounded-[32px] border border-slate-700/80 bg-slate-950/95 p-8 shadow-soft backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-white">Add a Vision Card</h2>
                <p className="mt-2 text-sm text-slate-400">Upload an image and add a motivating caption.</p>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 transition hover:text-white">Close</button>
            </div>

            <div className="mt-8 grid gap-6">
              <label className="rounded-3xl border border-slate-700/70 bg-slate-900 px-4 py-5 text-sm text-slate-300">
                <span className="font-semibold text-slate-100">Image</span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="mt-4 w-full text-sm text-slate-200" />
              </label>
              <label className="grid gap-2 text-sm text-slate-300">
                Caption
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  className="rounded-3xl border border-slate-700/70 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none ring-1 ring-transparent transition focus:border-violet-400 focus:ring-violet-500/30"
                  placeholder="This is the life I want to build"
                />
              </label>
              {errorMessage && <p className="text-sm text-rose-300">{errorMessage}</p>}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-3xl border border-slate-700/70 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddCard}
                  disabled={uploadButtonDisabled}
                  className="rounded-3xl bg-violet-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadState === 'uploading' ? 'Uploading…' : 'Save card'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
