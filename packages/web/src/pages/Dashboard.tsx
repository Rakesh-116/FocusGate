/* Dashboard page for daily tasks, progress, and streak status. */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useTasks } from '../hooks/useTasks'
import { TaskList } from '../components/TaskList'
import { TaskProgress } from '../components/TaskProgress'
import { BlockedLinksManager } from '../components/BlockedLinksManager'
import { FocusFuturePanel } from '../components/FocusFuturePanel'
import { useFocusPlan } from '../hooks/useFocusPlan'
import { supabase } from '../lib/supabase'

function getToday() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function useStreak(userId: string | null) {
  type StreakTask = { date: string; completed: boolean }
  type StreakAttempt = { attempted_at: string; bypassed: boolean }

  return useQuery<number>({
    queryKey: ['streak', userId],
    queryFn: async () => {
      if (!userId) return 0
      const fromDate = new Date()
      fromDate.setDate(fromDate.getDate() - 14)
      const isoFrom = fromDate.toISOString().slice(0, 10)
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('date,completed')
        .eq('user_id', userId)
        .gte('date', isoFrom)
      if (tasksError) throw tasksError

      const { data: attempts, error: attemptsError } = await supabase
        .from('block_attempts')
        .select('attempted_at,bypassed')
        .eq('user_id', userId)
        .gte('attempted_at', isoFrom)
      if (attemptsError) throw attemptsError

      const completedByDate = new Map<string, boolean>()
      ;(tasks as StreakTask[] | null | undefined)?.forEach((task) => {
        const date = task.date
        const hadAllDone = completedByDate.get(date) ?? true
        completedByDate.set(date, hadAllDone && task.completed)
      })

      const bypassDates = new Set<string>()
      ;(attempts as StreakAttempt[] | null | undefined)?.forEach((attempt) => {
        if (attempt.bypassed) {
          const date = new Date(attempt.attempted_at).toISOString().slice(0, 10)
          bypassDates.add(date)
        }
      })

      let streak = 0
      const current = new Date()
      for (let offset = 0; offset < 14; offset += 1) {
        const date = new Date(current)
        date.setDate(current.getDate() - offset)
        const key = date.toISOString().slice(0, 10)
        if (bypassDates.has(key)) break
        const allDone = completedByDate.get(key)
        if (allDone === undefined || !allDone) break
        streak += 1
      }

      return streak
    },
    enabled: Boolean(userId),
  })
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const userId = user?.id ?? null
  const { tasks, addTask, toggleTask, deleteTask, isLoading, completedCount, totalCount, maxReached } = useTasks(userId)
  const { data: streak = 0 } = useStreak(userId)
  const focusPlan = useFocusPlan(userId, streak)

  const message = useMemo(() => {
    if (totalCount === 0) return 'Start your first focus task for today.'
    if (completedCount === totalCount) return 'All tasks completed - great work!'
    return 'Stay on track by completing your top tasks.'
  }, [completedCount, totalCount])

  return (
    <div className="min-h-screen bg-[color:var(--surface)] px-4 py-10 text-[color:var(--text)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header className="grid gap-8 rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface-2)]/90 p-10 glass-panel-dark theme-shadow md:grid-cols-[1.4fr_0.9fr] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--muted)]">Today | {getToday()}</p>
            <h1 className="text-hero mt-4 text-5xl font-semibold text-[color:var(--text)] sm:text-6xl">
              Welcome back, {user?.email?.split('@')[0] ?? 'FocusGate user'}
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-[color:var(--muted)]">{message}</p>
          </div>
          <div className="flex flex-col items-start gap-4 sm:items-end">
            <div className="rounded-full bg-[color:var(--accent-muted)] px-6 py-3 text-sm font-semibold text-[color:var(--accent)] shadow-[inset_0_0_0_1px_var(--border)]">
              Streak: {streak} day{streak === 1 ? '' : 's'}
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-3xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(139,92,246,0.18)] transition hover:brightness-105"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <TaskProgress completed={completedCount} total={totalCount} />
          <TaskList
            tasks={tasks}
            onAdd={addTask}
            onToggle={toggleTask}
            onDelete={deleteTask}
            isLoading={isLoading}
            maxReached={maxReached}
          />
          <BlockedLinksManager userId={userId} />
        </main>

        <FocusFuturePanel
          goal={focusPlan.goal}
          commits={focusPlan.commits}
          futures={focusPlan.futures}
          score={focusPlan.score}
          outcome={focusPlan.outcome}
          committedCount={focusPlan.committedCount}
          completedCount={focusPlan.completedCount}
          featuredFuture={focusPlan.featuredFuture}
          isLoading={focusPlan.isLoading}
          isSavingGoal={focusPlan.isSavingGoal}
          isGeneratingFuture={focusPlan.isGeneratingFuture}
          onSaveGoal={focusPlan.saveGoal}
          onAddCommitment={focusPlan.addCommitment}
          onToggleCommitment={focusPlan.toggleCommitment}
          onRemoveCommitment={focusPlan.removeCommitment}
          onGenerateFuture={focusPlan.generateFuture}
        />
      </div>
    </div>
  )
}
