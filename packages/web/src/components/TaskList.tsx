/* Task list card for adding, completing, and deleting today's tasks. */
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
    <div className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--card)]/92 p-6 glass-panel-dark theme-shadow">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="section-heading text-[color:var(--text)]">Your tasks</h2>
          <p className="mt-3 text-sm text-[color:var(--muted)]">Add up to 7 tasks for today.</p>
        </div>
      </div>

      <div className="grid gap-3">
        {tasks.length === 0 && (
          <div className="rounded-3xl bg-[color:var(--surface-3)]/88 px-4 py-5 text-sm text-[color:var(--muted)]">
            No tasks yet. Add one to begin.
          </div>
        )}

        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-3 rounded-3xl bg-[color:var(--surface-3)]/88 px-4 py-3">
            <label className="flex items-center gap-4 text-[color:var(--text)]">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggle(task)}
                className="h-5 w-5 rounded border-[color:var(--border)] bg-[color:var(--surface)] text-[color:var(--accent)] focus:ring-[color:var(--accent)]"
              />
              <span className={task.completed ? 'line-through text-[color:var(--muted)]' : 'text-[color:var(--text)]'}>{task.title}</span>
            </label>
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              aria-label="Delete task"
              className="rounded-2xl bg-[color:var(--button-secondary-bg)] px-3 py-2 text-sm text-[color:var(--muted)] transition hover:bg-[color:var(--button-secondary-hover)] hover:text-[color:var(--text)]"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          className="rounded-3xl border border-[color:var(--input-border)] bg-[color:var(--input-bg)] px-5 py-4 text-[color:var(--text)] outline-none ring-1 ring-transparent transition focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)]/30 disabled:cursor-not-allowed disabled:opacity-50"
          type="text"
          placeholder={maxReached ? 'Daily task limit reached' : 'Add a new task'}
          value={newTask}
          onChange={(event) => setNewTask(event.target.value)}
          disabled={maxReached || isLoading}
        />
        <button
          type="submit"
          className="rounded-3xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] px-6 py-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!newTask.trim() || maxReached || isLoading}
        >
          Add
        </button>
      </form>
    </div>
  )
}
