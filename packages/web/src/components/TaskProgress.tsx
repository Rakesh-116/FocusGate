/* Progress card showing today's task completion ratio. */
interface TaskProgressProps {
  completed: number
  total: number
}

export function TaskProgress({ completed, total }: TaskProgressProps) {
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--card)]/92 p-7 glass-panel-dark theme-shadow">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--muted)]">Progress</p>
          <h3 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">{completed} / {total} complete</h3>
        </div>
        <span className="rounded-full bg-[color:var(--surface-3)]/90 px-5 py-3 text-sm font-semibold text-[color:var(--accent)]">{progress}%</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-[color:var(--surface-3)]/90">
        <div className="h-full rounded-full bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] transition-all" style={{ width: `${progress}%` }} />
      </div>
      {total > 0 && progress === 100 && (
        <p className="mt-5 text-sm font-medium text-[color:var(--success)]">Day Unlocked!</p>
      )}
    </div>
  )
}
