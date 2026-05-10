/* Block screen preview page with a recent-images picker and larger preview-first layout. */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import BlockScreen from '../components/BlockScreen'
import { VisionCardImage } from '../components/VisionCardImage'

type PreviewVisionCard = {
  id: string
  image_url: string
  caption: string | null
  sort_order: number | null
}

type BlockedRuleItem = {
  id: string
  app_or_url: string
}

const VISION_CARD_BUCKET = 'vision-cards'
const DEFAULT_BLOCK_GROUP_NAME = 'FocusGate Web Blocklist'
const FALLBACK_PREVIEW_CARD: PreviewVisionCard = {
  id: 'preview-card',
  image_url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80',
  caption: 'Stay connected to your why',
  sort_order: 1,
}

export default function BlockScreenPreview() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [quoteText, setQuoteText] = useState('When distraction is a threat, your next task is the strongest anchor.')
  const [quoteAuthor, setQuoteAuthor] = useState('FocusGate')
  const [caption, setCaption] = useState('Stay connected to your why')
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [showQuote, setShowQuote] = useState(true)
  const [showTasks, setShowTasks] = useState(true)
  const [showVisionCards, setShowVisionCards] = useState(true)
  const [uploadMessage, setUploadMessage] = useState('')
  const [newBlockedRule, setNewBlockedRule] = useState('')

  function normalizeRule(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
  }

  async function ensureDefaultBlockGroup(userIdValue: string) {
    const existingGroupResult = await supabase
      .from('block_groups')
      .select('id')
      .eq('user_id', userIdValue)
      .eq('name', DEFAULT_BLOCK_GROUP_NAME)
      .maybeSingle()

    if (existingGroupResult.error) throw existingGroupResult.error
    if (existingGroupResult.data?.id) return existingGroupResult.data.id

    const createdGroupResult = await supabase
      .from('block_groups')
      .insert([
        {
          user_id: userIdValue,
          name: DEFAULT_BLOCK_GROUP_NAME,
          is_active: true,
          color: '#7C3AED',
          icon: 'shield',
        },
      ])
      .select('id')
      .single()

    if (createdGroupResult.error) throw createdGroupResult.error
    return createdGroupResult.data.id as string
  }

  const { data: tasksData = [] } = useQuery({
    queryKey: ['tasks-today', userId],
    queryFn: async () => {
      if (!userId) return []
      const today = new Date().toISOString().slice(0, 10)
      const result = await supabase
        .from('tasks')
        .select('id,title,completed')
        .eq('user_id', userId)
        .eq('date', today)
        .order('created_at', { ascending: true })
      return result.data ?? []
    },
    enabled: !!userId,
  })

  const { data: visionCardsData = [] } = useQuery<PreviewVisionCard[]>({
    queryKey: ['vision-cards', userId],
    queryFn: async () => {
      if (!userId) return []
      const result = await supabase
        .from('vision_cards')
        .select('id,image_url,caption,sort_order')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
      return result.data ?? []
    },
    enabled: !!userId,
  })

  const { data: blockedRulesData = [] } = useQuery<BlockedRuleItem[]>({
    queryKey: ['blocked-rules', userId],
    queryFn: async () => {
      if (!userId) return []

      const groupResult = await supabase
        .from('block_groups')
        .select('id')
        .eq('user_id', userId)
        .eq('name', DEFAULT_BLOCK_GROUP_NAME)
        .maybeSingle()

      if (groupResult.error) throw groupResult.error
      if (!groupResult.data?.id) return []

      const itemsResult = await supabase
        .from('block_group_items')
        .select('id,app_or_url')
        .eq('group_id', groupResult.data.id)
        .in('platform', ['web', 'all'])
        .order('app_or_url', { ascending: true })

      if (itemsResult.error) throw itemsResult.error
      return (itemsResult.data ?? []) as BlockedRuleItem[]
    },
    enabled: !!userId,
  })

  const uploadMutation = useMutation<PreviewVisionCard, Error, File>({
    mutationFn: async (file) => {
      if (!userId) throw new Error('You must be signed in to upload images.')
      const fileExtension = file.name.split('.').pop() || 'jpg'
      const filename = `${userId}/${crypto.randomUUID()}.${fileExtension}`
      const { error: uploadError } = await supabase.storage.from(VISION_CARD_BUCKET).upload(filename, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (uploadError) throw uploadError

      const urlData = await supabase.storage.from(VISION_CARD_BUCKET).getPublicUrl(filename)
      const imageUrl = urlData.data.publicUrl
      const sortOrder = visionCardsData.length + 1

      const { data, error } = await supabase
        .from('vision_cards')
        .insert([
          {
            user_id: userId,
            image_url: imageUrl,
            caption: 'New inspiration',
            sort_order: sortOrder,
          },
        ])
        .select('id,image_url,caption,sort_order')
        .single()

      if (error) throw error
      return data as PreviewVisionCard
    },
    onSuccess: (newCard) => {
      queryClient.invalidateQueries({ queryKey: ['vision-cards', userId] })
      setSelectedImageId(newCard.id)
      setCaption(newCard.caption || 'Stay connected to your why')
      setUploadMessage('Image added to your preview library.')
    },
    onError: (error) => {
      setUploadMessage(error.message)
    },
  })

  const addBlockedRuleMutation = useMutation<BlockedRuleItem, Error, string>({
    mutationFn: async (rule) => {
      if (!userId) throw new Error('You must be signed in to save blocked links.')
      const normalizedRule = normalizeRule(rule)
      if (!normalizedRule) throw new Error('Enter a valid URL prefix.')

      const groupId = await ensureDefaultBlockGroup(userId)
      const insertResult = await supabase
        .from('block_group_items')
        .insert([
          {
            group_id: groupId,
            app_or_url: normalizedRule,
            platform: 'web',
          },
        ])
        .select('id,app_or_url')
        .single()

      if (insertResult.error) throw insertResult.error
      return insertResult.data as BlockedRuleItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-rules', userId] })
      setNewBlockedRule('')
    },
  })

  const removeBlockedRuleMutation = useMutation<string, Error, string>({
    mutationFn: async (id) => {
      const deleteResult = await supabase.from('block_group_items').delete().eq('id', id)
      if (deleteResult.error) throw deleteResult.error
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocked-rules', userId] })
    },
  })

  useEffect(() => {
    if (visionCardsData.length === 0) return
    const matchingCard = visionCardsData.find((card) => card.id === selectedImageId)
    const nextCard = matchingCard ?? visionCardsData[0]
    setSelectedImageId(nextCard.id)
    setCaption(nextCard.caption || 'Stay connected to your why')
  }, [selectedImageId, visionCardsData])

  useEffect(() => {
    const blockedRules = blockedRulesData.map((item) => item.app_or_url)
    window.postMessage(
      {
        type: 'FOCUSGATE_SYNC_BLOCKED_URLS',
        payload: blockedRules,
      },
      window.location.origin,
    )
  }, [blockedRulesData])

  const selectedVisionCard = useMemo(() => {
    if (visionCardsData.length === 0) return FALLBACK_PREVIEW_CARD
    return visionCardsData.find((card) => card.id === selectedImageId) ?? visionCardsData[0]
  }, [selectedImageId, visionCardsData])

  const previewQuote = useMemo(
    () => ({ id: 'preview-quote', text: quoteText, author: quoteAuthor }),
    [quoteText, quoteAuthor],
  )

  const previewVisionCards = useMemo(
    () => [
      {
        id: selectedVisionCard.id,
        image_url: selectedVisionCard.image_url,
        caption: caption || selectedVisionCard.caption || 'Stay connected to your why',
        sort_order: 1,
      },
    ],
    [caption, selectedVisionCard],
  )

  const previewTasks = useMemo(
    () =>
      tasksData.length > 0
        ? tasksData
        : [
          { id: 'task-1', title: 'Finish the focus plan', completed: false },
          { id: 'task-2', title: 'Close social media tabs', completed: false },
          { id: 'task-3', title: 'Review my vision board', completed: false },
        ],
    [tasksData],
  )

  const previewSettings = useMemo(
    () => ({
      show_quotes_on_block_screen: showQuote,
      show_tasks_on_block_screen: showTasks,
      show_vision_cards_on_block_screen: showVisionCards,
      bypass_cooldown_seconds: 20,
      bypass_requires_reason: false,
    }),
    [showQuote, showTasks, showVisionCards],
  )

  function handleUploadButtonClick() {
    fileInputRef.current?.click()
  }

  function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0] ?? null
    if (!selectedFile) return
    setUploadMessage('')
    uploadMutation.mutate(selectedFile)
    event.target.value = ''
  }

  return (
    <div className="min-h-screen bg-[color:var(--surface)] px-4 py-10 text-[color:var(--text)]">
      <div className="mx-auto max-w-[1500px] space-y-8">
        <div className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface-2)]/95 p-8 theme-shadow">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-[color:var(--muted)]">Preview builder</p>
              <h1 className="mt-3 text-4xl font-semibold text-[color:var(--text)]">Customize your block screen preview.</h1>
              <p className="mt-4 max-w-2xl text-[color:var(--muted)]">
                Choose the message, browse your recent images, and preview the actual blocker at a much larger size.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/dashboard"
                className="rounded-full border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-semibold text-[color:var(--text)] transition hover:bg-[color:var(--surface-3)]"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-8 xl:grid-cols-[0.4fr_0.6fr]">
          <div className="space-y-6 rounded-[32px] border border-[color:var(--border)] bg-[color:var(--card)]/95 p-8 theme-shadow">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-[color:var(--text)]">Controls</h2>
              <p className="text-sm text-[color:var(--muted)]">Edit the quote and choose which uploaded image should appear in the block-screen preview.</p>
            </div>

            <div className="space-y-5 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-3)]/90 p-6">
              <label className="grid gap-2 text-sm text-[color:var(--text)]">
                Quote text
                <textarea
                  rows={4}
                  value={quoteText}
                  onChange={(event) => setQuoteText(event.target.value)}
                  className="min-h-[120px] rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-[color:var(--text)] outline-none ring-1 ring-transparent transition focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)]/30"
                />
              </label>

              <label className="grid gap-2 text-sm text-[color:var(--text)]">
                Quote author
                <input
                  type="text"
                  value={quoteAuthor}
                  onChange={(event) => setQuoteAuthor(event.target.value)}
                  className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-[color:var(--text)] outline-none ring-1 ring-transparent transition focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)]/30"
                />
              </label>

              <div className="grid gap-4 text-sm text-[color:var(--text)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-semibold">Your images</span>
                  <button
                    type="button"
                    onClick={handleUploadButtonClick}
                    disabled={uploadMutation.isPending}
                    className="rounded-full bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploadMutation.isPending ? 'Uploading...' : 'Add new image'}
                  </button>
                </div>

                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelection} className="hidden" />

                {uploadMessage && (
                  <div className="rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-xs text-[color:var(--muted)]">
                    {uploadMessage}
                  </div>
                )}

                <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface)]/95">
                  <div className="border-b border-[color:var(--border)] px-5 py-4">
                    <p className="text-sm font-medium text-[color:var(--text)]">Recent images</p>
                  </div>

                  {visionCardsData.length > 0 ? (
                    <>
                      <div className="flex gap-2 overflow-x-auto px-5 py-4">
                        {visionCardsData.map((card) => {
                          const isSelected = card.id === selectedVisionCard.id
                          return (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => {
                                setSelectedImageId(card.id)
                                setCaption(card.caption || 'Stay connected to your why')
                              }}
                              className={`min-w-[78px] overflow-hidden rounded-lg border transition ${isSelected
                                ? 'border-[color:var(--accent)] ring-2 ring-[color:var(--accent)]/25'
                                : 'border-[color:var(--border)] hover:border-[color:var(--accent)]/40'
                                }`}
                            >
                              <VisionCardImage
                                src={card.image_url}
                                alt={card.caption ?? 'Vision card'}
                                className="h-16 w-full object-cover"
                              />
                            </button>
                          )
                        })}
                      </div>

                      <div className="border-t border-[color:var(--border)] px-5 py-4">
                        <div className="mx-auto max-w-[360px] overflow-hidden rounded-[28px] border border-[color:var(--accent)]/35 bg-[color:var(--surface-2)]/70">
                          <VisionCardImage
                            src={selectedVisionCard.image_url}
                            alt={selectedVisionCard.caption ?? 'Selected vision card'}
                            className=" w-full object-fit"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="px-5 py-5 text-[color:var(--muted)]">
                      No uploaded images yet. Use the add button above and your first image will appear here immediately.
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] px-5 py-4">
                    <span className="text-sm text-[color:var(--text)]">Choose a photo</span>
                    <button
                      type="button"
                      onClick={handleUploadButtonClick}
                      disabled={uploadMutation.isPending}
                      className="rounded-xl border border-[color:var(--border)] bg-[color:var(--surface-2)] px-4 py-2 text-sm font-medium text-[color:var(--text)] transition hover:bg-[color:var(--surface-3)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Browse photos
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 text-sm text-[color:var(--text)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-lg font-semibold">Blocked links</span>
                  <span className="text-xs text-[color:var(--muted)]">Synced to the extension</span>
                </div>

                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newBlockedRule}
                    onChange={(event) => setNewBlockedRule(event.target.value)}
                    placeholder="e.g. youtube.com/shorts"
                    className="flex-1 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-[color:var(--text)] outline-none ring-1 ring-transparent transition focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)]/30"
                  />
                  <button
                    type="button"
                    onClick={() => addBlockedRuleMutation.mutate(newBlockedRule)}
                    disabled={!newBlockedRule.trim() || addBlockedRuleMutation.isPending}
                    className="rounded-3xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Add
                  </button>
                </div>

                {(addBlockedRuleMutation.error || removeBlockedRuleMutation.error) && (
                  <div className="rounded-2xl bg-rose-500/10 px-4 py-3 text-xs text-rose-400">
                    {addBlockedRuleMutation.error?.message || removeBlockedRuleMutation.error?.message}
                  </div>
                )}

                {blockedRulesData.length > 0 ? (
                  <div className="grid gap-2">
                    {blockedRulesData.map((rule) => (
                      <div key={rule.id} className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                        <span className="text-sm text-[color:var(--text)]">{rule.app_or_url}</span>
                        <button
                          type="button"
                          onClick={() => removeBlockedRuleMutation.mutate(rule.id)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-100"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-4 text-xs text-[color:var(--muted)]">
                    No blocked links yet. Add the distracting URL prefixes you want the extension to block.
                  </div>
                )}
              </div>

              <label className="grid gap-2 text-sm text-[color:var(--text)]">
                Selected image caption
                <input
                  type="text"
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-[color:var(--text)] outline-none ring-1 ring-transparent transition focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)]/30"
                  placeholder="Add a short reminder for your future self"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex items-center gap-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                  <input type="checkbox" checked={showQuote} onChange={(event) => setShowQuote(event.target.checked)} className="h-4 w-4 rounded border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--accent)]" />
                  <span className="text-sm text-[color:var(--text)]">Show quote</span>
                </label>
                <label className="flex items-center gap-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                  <input type="checkbox" checked={showTasks} onChange={(event) => setShowTasks(event.target.checked)} className="h-4 w-4 rounded border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--accent)]" />
                  <span className="text-sm text-[color:var(--text)]">Show tasks</span>
                </label>
                <label className="flex items-center gap-3 rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3">
                  <input type="checkbox" checked={showVisionCards} onChange={(event) => setShowVisionCards(event.target.checked)} className="h-4 w-4 rounded border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--accent)]" />
                  <span className="text-sm text-[color:var(--text)]">Show vision card</span>
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--card)]/95 p-8 theme-shadow">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-[color:var(--muted)]">Live preview</p>
                <h2 className="mt-3 text-2xl font-semibold text-[color:var(--text)]">Block screen preview</h2>
              </div>
            </div>
            <div className="mt-6 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--surface-3)]/95 p-4">
              <BlockScreen
                blockedUrl="youtube.com/shorts"
                onBypass={() => undefined}
                previewMode
                previewQuote={previewQuote}
                previewVisionCards={previewVisionCards}
                previewSettings={previewSettings}
                previewTasks={previewTasks}
              />
            </div>
            <div className="mt-6 rounded-3xl bg-[color:var(--surface-3)]/90 p-4 text-sm text-[color:var(--muted)]">
              <p className="font-semibold text-[color:var(--text)]">Tip:</p>
              <p className="mt-2">Use the recent-images area to swap the selected card quickly while the larger preview panel helps you inspect the image before checking the final block-screen result.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
