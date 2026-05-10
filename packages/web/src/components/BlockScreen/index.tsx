import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useEmblaCarousel from 'embla-carousel-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export interface BlockScreenProps {
  blockedUrl: string
  onBypass: (reason: string) => void
  onClose?: () => void
  previewMode?: boolean
}

type Quote = {
  id: string
  text: string
  author: string
}

type TaskItem = {
  id: string
  title: string
  completed: boolean
}

type VisionCard = {
  id: string
  image_url: string
  caption: string | null
  sort_order: number | null
}

type UserSettings = {
  show_quotes_on_block_screen: boolean
  show_tasks_on_block_screen: boolean
  show_vision_cards_on_block_screen: boolean
  bypass_cooldown_seconds: number
  bypass_requires_reason: boolean
}

const PREVIEW_QUOTE: Quote = {
  id: 'preview-quote',
  text: 'When distraction is a threat, your next task is the strongest anchor.',
  author: 'FocusGate',
}

const PREVIEW_TASKS: TaskItem[] = [
  { id: 'task-1', title: 'Finish the focus plan', completed: false },
  { id: 'task-2', title: 'Close social media tabs', completed: false },
  { id: 'task-3', title: 'Review my vision board', completed: false },
]

const PREVIEW_CARDS: VisionCard[] = [
  { id: 'card-1', image_url: 'https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=1200&q=80', caption: 'Ship the MVP', sort_order: 1 },
  { id: 'card-2', image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80', caption: 'Build a daily ritual', sort_order: 2 },
]

const PREVIEW_SETTINGS: UserSettings = {
  show_quotes_on_block_screen: true,
  show_tasks_on_block_screen: true,
  show_vision_cards_on_block_screen: true,
  bypass_cooldown_seconds: 30,
  bypass_requires_reason: true,
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function getDayOfYear(date: Date) {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

export default function BlockScreen({ blockedUrl, onBypass, onClose, previewMode }: BlockScreenProps) {
  const { user } = useAuth()
  const userId = previewMode ? 'preview-user' : user?.id
  const queryClient = useQueryClient()
  const [emblaRef] = useEmblaCarousel({ loop: false })
  const [hiddenTaskIds, setHiddenTaskIds] = useState<string[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isCounting, setIsCounting] = useState(false)
  const [showBypassError, setShowBypassError] = useState(false)
  const [allDoneTriggered, setAllDoneTriggered] = useState(false)
  const [previewTasks, setPreviewTasks] = useState<TaskItem[]>(PREVIEW_TASKS)

  const quoteQuery = useQuery<Quote | null>({
    queryKey: ['quote-of-day'],
    queryFn: async () => {
      const countRes = await supabase.from('quotes').select('id', { count: 'exact' })
      if (countRes.error) throw countRes.error
      const total = countRes.count ?? 0
      if (total === 0) return null
      const offset = getDayOfYear(new Date()) % total
      const quoteRes = await supabase.from('quotes').select('id, text, author').range(offset, offset).limit(1).single()
      if (quoteRes.error) throw quoteRes.error
      return quoteRes.data
    },
    staleTime: 86400000,
    enabled: !previewMode && !!userId,
  })

  const tasksQuery = useQuery<TaskItem[]>({
    queryKey: ['tasks-today', userId],
    queryFn: async () => {
      if (previewMode) return previewTasks
      if (!userId) return []
      const result = await supabase
        .from('tasks')
        .select('id,title,completed')
        .eq('user_id', userId)
        .eq('date', getTodayDate())
        .eq('completed', false)
        .order('created_at', { ascending: true })
      if (result.error) throw result.error
      return result.data ?? []
    },
    enabled: !!userId,
    refetchOnWindowFocus: true,
  })

  const visionCardsQuery = useQuery<VisionCard[]>({
    queryKey: ['vision-cards', userId],
    queryFn: async () => {
      if (previewMode) return PREVIEW_CARDS
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
    staleTime: 3600000,
  })

  const settingsQuery = useQuery<UserSettings>({
    queryKey: ['user-settings', userId],
    queryFn: async () => {
      if (previewMode) return PREVIEW_SETTINGS
      if (!userId) return PREVIEW_SETTINGS
      const result = await supabase
        .from('user_settings')
        .select(
          'show_quotes_on_block_screen,show_tasks_on_block_screen,show_vision_cards_on_block_screen,bypass_cooldown_seconds,bypass_requires_reason',
        )
        .eq('user_id', userId)
        .single()
      if (result.error) throw result.error
      return result.data as UserSettings
    },
    enabled: !!userId || previewMode,
    staleTime: 300000,
  })

  const toggleTaskMutation = useMutation({
    mutationFn: async (task: TaskItem) => {
      if (previewMode) {
        setPreviewTasks((next) => next.map((item) => (item.id === task.id ? { ...item, completed: !item.completed } : item)))
        return { ...task, completed: !task.completed }
      }
      const result = await supabase
        .from('tasks')
        .update({ completed: !task.completed })
        .eq('id', task.id)
        .select('id,title,completed')
        .single()
      if (result.error) throw result.error
      return result.data as TaskItem
    },
    onSuccess: (updatedTask) => {
      if (!previewMode) queryClient.invalidateQueries({ queryKey: ['tasks-today', userId] })
      if (updatedTask.completed) {
        window.setTimeout(() => {
          setHiddenTaskIds((list) => [...list, updatedTask.id])
        }, 800)
      }
    },
  })

  const bypassMutation = useMutation({
    mutationFn: async (bypassReason: string) => {
      if (previewMode) return null
      if (!userId) throw new Error('Missing user ID')
      const now = new Date().toISOString()
      const result = await supabase.from('block_attempts').insert([{ user_id: userId, app_or_url: blockedUrl, timestamp: now, bypassed: true, bypass_reason: bypassReason, }])
      if (result.error) throw result.error
      return result.data
    },
  })

  const quote = previewMode ? PREVIEW_QUOTE : quoteQuery.data
  const settings = settingsQuery.data ?? PREVIEW_SETTINGS
  const tasks = previewMode ? previewTasks : tasksQuery.data ?? []
  const visionCards = visionCardsQuery.data ?? []
  const visibleTasks = tasks.filter((task) => !hiddenTaskIds.includes(task.id))
  const allComplete = visibleTasks.length > 0 && visibleTasks.every((task) => task.completed)

  useEffect(() => {
    if (allComplete && !allDoneTriggered) {
      setAllDoneTriggered(true)
      const timer = window.setTimeout(() => {
        onBypass('')
      }, 2000)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [allComplete, allDoneTriggered, onBypass])

  useEffect(() => {
    if (!panelOpen) {
      setReason('')
      setSecondsLeft(settings.bypass_cooldown_seconds)
      setIsCounting(false)
      setShowBypassError(false)
    }
  }, [panelOpen, settings.bypass_cooldown_seconds])

  useEffect(() => {
    if (!panelOpen || settings.bypass_cooldown_seconds <= 0) return undefined
    if (!isCounting) {
      setIsCounting(true)
      setSecondsLeft(settings.bypass_cooldown_seconds)
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [panelOpen, settings.bypass_cooldown_seconds, isCounting])

  const handleToggle = async (task: TaskItem) => {
    await toggleTaskMutation.mutateAsync(task)
  }

  const handleSubmitBypass = async () => {
    if (settings.bypass_requires_reason && !reason.trim()) {
      setShowBypassError(true)
      return
    }
    onBypass(reason.trim())
    await bypassMutation.mutateAsync(reason.trim())
    setPanelOpen(false)
  }

  const quoteSection = (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
      className="rounded-[32px] border border-white/5 bg-white/5 p-8 shadow-soft"
    >
      <p className="max-w-3xl text-center text-2xl italic leading-relaxed text-white/90 sm:text-3xl">
        “{quote?.text ?? 'Focus is the ability to say no to distractions.'}”
      </p>
      <p className="mt-6 text-center text-sm font-semibold tracking-[0.18em] text-purple-400">— {quote?.author ?? 'FocusGate'}</p>
    </motion.section>
  )

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-[#0A0A14] via-[#0D0D1F] to-[#120820] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 rounded-[32px] border border-white/5 bg-slate-950/80 p-4 backdrop-blur-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Blocked content</p>
            <p className="text-sm text-slate-400">You tried to open: {blockedUrl}</p>
          </div>
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-700/80 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Close
              </button>
            )}
            <Link to="/preview-block" className="rounded-full border border-slate-700/80 bg-slate-900/90 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-slate-500">
              Preview route
            </Link>
          </div>
        </div>

        {settings.show_quotes_on_block_screen && quoteSection}

        {settings.show_tasks_on_block_screen && (
          <section className="rounded-[32px] border border-white/5 bg-white/5 p-8 shadow-soft">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Finish these first</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Your live task list</h2>
              </div>
              {visibleTasks.length === 0 && (
                <p className="text-sm text-slate-400">No tasks set today. <Link to="/vision-cards" className="font-semibold text-violet-300 underline">Add some in FocusGate.</Link></p>
              )}
            </div>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {visibleTasks.length === 0 ? (
                  <motion.div
                    key="no-tasks"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-3xl border border-slate-700/50 bg-slate-950/80 p-6 text-center text-sm text-slate-300"
                  >
                    No tasks set today. <Link to="/vision-cards" className="font-semibold text-violet-300 underline">Add some in FocusGate.</Link>
                  </motion.div>
                ) : visibleTasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: index * 0.08 }}
                    className="flex items-center justify-between gap-4 rounded-3xl border border-slate-700/50 bg-slate-950/80 px-5 py-4"
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(task)}
                      className="flex items-center gap-4 text-left"
                    >
                      <span className={`grid h-6 w-6 place-items-center rounded-xl border ${task.completed ? 'bg-emerald-400 border-emerald-400 text-slate-950' : 'border-slate-600 text-slate-400'}`}>
                        {task.completed ? '✓' : ''}
                      </span>
                      <span className={`text-sm ${task.completed ? 'line-through text-slate-500' : 'text-slate-100'}`}>{task.title}</span>
                    </button>
                    {task.completed && <span className="text-xs uppercase tracking-[0.24em] text-emerald-300">Completed</span>}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {allComplete && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 rounded-3xl bg-emerald-500/10 p-6 text-center text-lg font-semibold text-emerald-200"
              >
                🎉 All done! Day Unlocked!
              </motion.div>
            )}
          </section>
        )}

        {settings.show_vision_cards_on_block_screen && (
          <section className="rounded-[32px] border border-white/5 bg-white/5 p-8 shadow-soft">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Vision board</p>
                <h2 className="mt-3 text-3xl font-semibold text-white">Stay connected to your why</h2>
              </div>
              <Link to="/vision-cards" className="text-sm font-semibold text-violet-300 underline">Manage cards</Link>
            </div>

            <div className="overflow-hidden rounded-[28px] bg-slate-950/80">
              <div className="embla" ref={emblaRef}>
                <div className="flex gap-4 pb-4">
                  <AnimatePresence initial={false}>
                    {visionCards.length > 0 ? visionCards.map((card) => (
                      <motion.div
                        key={card.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="min-w-full flex-shrink-0"
                      >
                        <div className="relative h-80 overflow-hidden rounded-[28px] bg-slate-900">
                          <VisionCardImage src={card.image_url} alt={card.caption ?? 'Vision card'} className="h-full w-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/95 via-slate-950/35 to-transparent px-6 py-5">
                            <p className="text-sm font-semibold text-white">{card.caption ?? 'Dream big'}</p>
                          </div>
                        </div>
                      </motion.div>
                    )) : (
                      <motion.div
                        key="placeholder-card"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="min-w-full flex-shrink-0"
                      >
                        <div className="relative flex h-80 items-center justify-center overflow-hidden rounded-[28px] bg-slate-900 p-8 text-center">
                          <div>
                            <p className="text-xl font-semibold text-white">Add your vision — tap to upload</p>
                            <p className="mt-3 text-sm text-slate-400">A new card will appear here when your vision is live.</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[32px] border border-white/5 bg-white/5 p-8 shadow-soft"
        >
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-slate-400">Emergency Bypass</p>
              <p className="mt-2 max-w-2xl text-slate-300">This should be your last option. Finishing your tasks is the better path.</p>
            </div>
          </div>

          {settings.bypass_cooldown_seconds === -1 ? (
            <div className="rounded-3xl bg-slate-950/80 p-6 text-sm text-slate-300">Bypass disabled. Finish your tasks.</div>
          ) : (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setPanelOpen((value) => !value)}
                className="rounded-3xl border border-slate-700/70 bg-slate-900/90 px-5 py-4 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
              >
                Emergency Unlock
              </button>

              <AnimatePresence>
                {panelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 24 }}
                    className="space-y-4 rounded-3xl border border-slate-700/70 bg-slate-900/90 p-6"
                  >
                    {settings.bypass_cooldown_seconds > 0 && (
                      <div className="rounded-3xl bg-slate-950/80 p-4 text-sm text-slate-300">
                        Countdown: <span className="font-semibold text-white">{secondsLeft}s</span>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <label className="text-sm font-medium text-slate-200">What are you doing instead?</label>
                      <textarea
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        rows={4}
                        className="min-h-[120px] rounded-3xl border border-slate-700/70 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none ring-1 ring-transparent transition focus:border-violet-400 focus:ring-violet-500/30"
                        placeholder="Describe your alternate plan"
                      />
                    </div>

                    {showBypassError && (
                      <p className="text-sm text-rose-300">Please enter a reason before bypassing.</p>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setPanelOpen(false)}
                        className="rounded-3xl border border-slate-700/70 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmitBypass}
                        disabled={settings.bypass_requires_reason && !reason.trim()}
                        className="rounded-3xl bg-rose-500/90 px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Confirm bypass
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.section>
      </div>
    </div>
  )
}
