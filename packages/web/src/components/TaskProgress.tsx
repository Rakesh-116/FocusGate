interface TaskProgressProps {
  completed: number
  total: number
}

export function TaskProgress({ completed, total }: TaskProgressProps) {
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="rounded-[32px] border border-slate-800 bg-slate-950/90 p-6 shadow-soft">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Progress</p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-100">{completed} / {total} complete</h3>
        </div>
        <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-violet-300">{progress}%</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-slate-900">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all" style={{ width: `${progress}%` }} />
      </div>
      {total > 0 && progress === 100 && (
        <p className="mt-5 text-sm font-medium text-emerald-300">🎉 Day Unlocked!</p>
      )}
    </div>
  )
}
