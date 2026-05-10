import { useState } from 'react'
import type { Task } from '../hooks/useTasks'

interface TaskListProps {
  tasks: Task[]
  onToggle: (task: Task) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAdd: (title: string) => Promise<void>
  isLoading: boolean
  maxReached: boolean
}

export function TaskList({ tasks, onToggle, onDelete, onAdd, isLoading, maxReached }: TaskListProps) {
  const [newTask, setNewTask] = useState('')

  async function handleAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newTask.trim() || maxReached) return
    await onAdd(newTask.trim())
    setNewTask('')
  }

  return (
    <div className="rounded-[32px] border border-slate-800 bg-slate-950/90 p-6 shadow-soft">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Your tasks</h2>
          <p className="mt-1 text-sm text-slate-400">Add up to 7 tasks for today.</p>
        </div>
      </div>

      <div className="grid gap-3">
        {tasks.length === 0 && (
          <div className="rounded-3xl bg-slate-900/80 px-4 py-5 text-sm text-slate-400">
            No tasks yet. Add one to begin.
          </div>
        )}

        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-3 rounded-3xl bg-slate-900/80 px-4 py-3">
            <label className="flex items-center gap-4 text-slate-100">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggle(task)}
                className="h-5 w-5 rounded border-slate-700 bg-slate-950 text-violet-500 focus:ring-violet-500"
              />
              <span className={task.completed ? 'line-through text-slate-500' : 'text-slate-100'}>{task.title}</span>
            </label>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              aria-label="Delete task"
              className="rounded-2xl bg-slate-800 px-3 py-2 text-sm text-slate-400 transition hover:bg-slate-700 hover:text-slate-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none ring-1 ring-transparent transition focus:border-violet-400 focus:ring-violet-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          type="text"
          placeholder={maxReached ? 'Daily task limit reached' : 'Add a new task'}
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
          disabled={maxReached || isLoading}
        />
        <button
          type="submit"
          className="rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!newTask.trim() || maxReached || isLoading}
        >
          +
        </button>
      </form>
    </div>
  )
}
