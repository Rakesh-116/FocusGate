import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTasks } from '../hooks/useTasks'
import { TaskList } from '../components/TaskList'
import { TaskProgress } from '../components/TaskProgress'
import { supabase } from '../lib/supabase'
import { useQuery } from '@tanstack/react-query'

function getToday() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

function useStreak(userId: string | null) {
  type StreakTask = { date: string; completed: boolean }
  type StreakAttempt = { timestamp: string; bypassed: boolean }

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
        .select('timestamp,bypassed')
        .eq('user_id', userId)
        .gte('timestamp', isoFrom)
      if (attemptsError) throw attemptsError

      const completedByDate = new Map<string, boolean>()
        ; (tasks as StreakTask[] | null | undefined)?.forEach((task) => {
          const date = task.date
          const hadAllDone = completedByDate.get(date) ?? true
          completedByDate.set(date, hadAllDone && task.completed)
        })

      const bypassDates = new Set<string>()
        ; (attempts as StreakAttempt[] | null | undefined)?.forEach((attempt) => {
          if (attempt.bypassed) {
            const date = new Date(attempt.timestamp).toISOString().slice(0, 10)
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

  const message = useMemo(() => {
    if (totalCount === 0) return 'Start your first focus task for today.'
    if (completedCount === totalCount) return 'All tasks completed — great work!'
    return 'Stay on track by completing your top tasks.'
  }, [completedCount, totalCount])

  return (
    <div className="min-h-screen bg-[#0a0a14] px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <header className="grid gap-6 rounded-[32px] border border-slate-800 bg-slate-950/90 p-8 shadow-soft md:grid-cols-[1.4fr_0.8fr] md:items-center">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Today · {getToday()}</p>
            <h1 className="mt-4 text-4xl font-semibold text-slate-100 sm:text-5xl">Welcome back, {user?.email?.split('@')[0] ?? 'FocusGate user'}</h1>
            <p className="mt-4 max-w-2xl text-slate-400">{message}</p>
          </div>
          <div className="flex flex-col items-start gap-4 sm:items-end">
            <div className="rounded-full bg-violet-500/10 px-5 py-3 text-sm font-semibold text-violet-200 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.12)]">
              🔥 {streak} day streak
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-violet-500/40 hover:bg-slate-800"
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
        </main>
      </div>
    </div>
  )
}
