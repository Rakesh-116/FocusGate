import { useEffect, useState, type FormEvent } from 'react'
import { type DailyCommit, type FutureGeneration, type UserGoal } from '../hooks/useFocusPlan'

type FocusFuturePanelProps = {
  goal: UserGoal | null
  commits: DailyCommit[]
  futures: FutureGeneration[]
  score: number
  outcome: 'hell' | 'heaven' | 'neutral'
  committedCount: number
  completedCount: number
  featuredFuture: FutureGeneration | null
  isLoading: boolean
  isSavingGoal: boolean
  isGeneratingFuture: boolean
  onSaveGoal: (payload: { title: string; description: string; targetRole: string; targetCompany: string; intensity: number }) => Promise<void>
  onAddCommitment: (title: string, notes?: string) => Promise<void>
  onToggleCommitment: (commit: DailyCommit) => Promise<void>
  onRemoveCommitment: (commit: DailyCommit) => Promise<void>
  onGenerateFuture: () => Promise<void>
}

function getOutcomeLabel(outcome: 'hell' | 'heaven' | 'neutral') {
  if (outcome === 'heaven') return 'Heaven Path'
  if (outcome === 'hell') return 'Hell Path'
  return 'Crossroads'
}

function getScoreMessage(score: number) {
  if (score >= 85) return 'Your future is getting brighter because your actions are matching your ambitions.'
  if (score >= 60) return 'You are moving, but the system still needs more consistency to become believable.'
  return 'This is the danger zone: goals are strong, but daily proof is weak.'
}

export function FocusFuturePanel({
  goal,
  commits,
  futures,
  score,
  outcome,
  committedCount,
  completedCount,
  featuredFuture,
  isLoading,
  isSavingGoal,
  isGeneratingFuture,
  onSaveGoal,
  onAddCommitment,
  onToggleCommitment,
  onRemoveCommitment,
  onGenerateFuture,
}: FocusFuturePanelProps) {
  const [goalTitle, setGoalTitle] = useState(goal?.title ?? '')
  const [goalDescription, setGoalDescription] = useState(goal?.description ?? '')
  const [targetRole, setTargetRole] = useState(goal?.target_role ?? '')
  const [targetCompany, setTargetCompany] = useState(goal?.target_company ?? '')
  const [intensity, setIntensity] = useState(goal?.intensity ?? 3)
  const [commitTitle, setCommitTitle] = useState('')
  const [commitNotes, setCommitNotes] = useState('')

  useEffect(() => {
    setGoalTitle(goal?.title ?? '')
    setGoalDescription(goal?.description ?? '')
    setTargetRole(goal?.target_role ?? '')
    setTargetCompany(goal?.target_company ?? '')
    setIntensity(goal?.intensity ?? 3)
  }, [goal])

  async function handleGoalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSaveGoal({
      title: goalTitle,
      description: goalDescription,
      targetRole,
      targetCompany,
      intensity,
    })
  }

  async function handleCommitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!commitTitle.trim()) return
    await onAddCommitment(commitTitle, commitNotes)
    setCommitTitle('')
    setCommitNotes('')
  }

  const heavenFuture = futures.find((future) => future.scenario_type === 'heaven') ?? null
  const hellFuture = futures.find((future) => future.scenario_type === 'hell') ?? null

  return (
    <section className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--surface-2)]/92 p-8 glass-panel-dark theme-shadow">
      <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--muted)]">Future Simulator</p>
            <h2 className="mt-3 text-3xl font-semibold text-[color:var(--text)]">Turn commitments into consequences</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--muted)]">
              This is your Opal-inspired intervention layer, but personal: one active life goal, a small set of daily commitments, and a believable future check generated from what you actually did today.
            </p>
          </div>

          <form onSubmit={handleGoalSubmit} className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card)]/90 p-5">
            <div className="grid gap-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">Main life goal</label>
                <input
                  value={goalTitle}
                  onChange={(event) => setGoalTitle(event.target.value)}
                  placeholder="Get an SDE role in a strong product company"
                  className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">Target role</label>
                  <input
                    value={targetRole}
                    onChange={(event) => setTargetRole(event.target.value)}
                    placeholder="SDE-1"
                    className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">Target company</label>
                  <input
                    value={targetCompany}
                    onChange={(event) => setTargetCompany(event.target.value)}
                    placeholder="Product company / MAANG-tier"
                    className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">Why this matters</label>
                <textarea
                  value={goalDescription}
                  onChange={(event) => setGoalDescription(event.target.value)}
                  placeholder="Family freedom, confidence, better lifestyle, meaningful work."
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]"
                />
              </div>
              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">Hell intensity</label>
                  <span className="text-sm font-semibold text-[color:var(--accent)]">{intensity}/5</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={intensity}
                  onChange={(event) => setIntensity(Number(event.target.value))}
                  className="mt-3 w-full accent-[color:var(--accent)]"
                />
              </div>
              <button
                type="submit"
                disabled={isSavingGoal || !goalTitle.trim()}
                className="rounded-2xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSavingGoal ? 'Saving goal...' : goal ? 'Update goal' : 'Save goal'}
              </button>
            </div>
          </form>

          <form onSubmit={handleCommitSubmit} className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card)]/90 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">Daily commitments</p>
                <p className="mt-2 text-sm text-[color:var(--muted)]">These create the promises that power your future score and also sync into the blocker task list.</p>
              </div>
              <div className="rounded-full bg-[color:var(--accent-muted)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)]">
                {completedCount}/{committedCount || 0} kept
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <input
                value={commitTitle}
                onChange={(event) => setCommitTitle(event.target.value)}
                placeholder="Solve 3 DSA problems"
                className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]"
              />
              <input
                value={commitNotes}
                onChange={(event) => setCommitNotes(event.target.value)}
                placeholder="Optional context: arrays + binary search"
                className="w-full rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)]"
              />
              <button
                type="submit"
                disabled={!commitTitle.trim()}
                className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-5 py-3 text-sm font-semibold text-[color:var(--text)] transition hover:border-[color:var(--accent)]"
              >
                Add commitment
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {commits.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--border)] px-4 py-5 text-sm text-[color:var(--muted)]">
                  No commitments yet. Add 3-5 meaningful promises for today and they will appear here and on the blocked screen via your linked tasks.
                </div>
              ) : (
                commits.map((commit) => (
                  <div key={commit.id} className="flex items-start justify-between gap-4 rounded-2xl border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-4">
                    <button type="button" onClick={() => onToggleCommitment(commit)} className="flex items-start gap-3 text-left">
                      <span
                        className={`mt-0.5 grid h-6 w-6 place-items-center rounded-xl border text-xs font-bold ${
                          commit.completed
                            ? 'border-emerald-400 bg-emerald-400 text-slate-950'
                            : 'border-[color:var(--border)] text-[color:var(--muted)]'
                        }`}
                      >
                        {commit.completed ? 'OK' : ''}
                      </span>
                      <span>
                        <span className={`block text-sm font-semibold ${commit.completed ? 'text-[color:var(--muted)] line-through' : 'text-[color:var(--text)]'}`}>
                          {commit.title}
                        </span>
                        {commit.notes ? <span className="mt-1 block text-xs text-[color:var(--muted)]">{commit.notes}</span> : null}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveCommitment(commit)}
                      className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
                    >
                      Remove
                    </button>
                  </div>
                ))
              )}
            </div>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card)]/90 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">Today's future check</p>
                <h3 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">{score}/100</h3>
              </div>
              <div className={`rounded-full px-4 py-2 text-sm font-semibold ${outcome === 'heaven' ? 'bg-emerald-500/15 text-emerald-400' : outcome === 'hell' ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'}`}>
                {getOutcomeLabel(outcome)}
              </div>
            </div>
            <div className="mt-5 h-3 overflow-hidden rounded-full bg-[color:var(--surface)]">
              <div
                className={`h-full rounded-full ${
                  score >= 80 ? 'bg-emerald-400' : score >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                }`}
                style={{ width: `${Math.max(score, committedCount > 0 ? 8 : 0)}%` }}
              />
            </div>
            <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">{getScoreMessage(score)}</p>
            <button
              type="button"
              onClick={() => onGenerateFuture()}
              disabled={isGeneratingFuture || committedCount === 0}
              className="mt-5 rounded-2xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGeneratingFuture ? 'Generating future...' : 'Generate today\'s future check'}
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[hellFuture, heavenFuture].map((future, index) => (
              <div key={future?.scenario_type ?? `future-${index}`} className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card)]/90 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">
                    {future?.scenario_type === 'heaven' ? 'Heaven path' : 'Hell path'}
                  </p>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      future?.scenario_type === 'heaven' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                    }`}
                  >
                    {future?.status ?? 'draft'}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-7 text-[color:var(--muted)]">
                  {future?.narrative ?? `Generate your future check to create a ${future === heavenFuture ? 'positive' : 'warning'} scenario from your actual progress.`}
                </p>
                {future?.prompt ? <p className="mt-4 text-xs leading-6 text-[color:var(--muted)]">Prompt seed: {future.prompt}</p> : null}
              </div>
            ))}
          </div>

          <div className="rounded-[28px] border border-[color:var(--border)] bg-gradient-to-br from-[color:var(--surface-2)] via-[color:var(--card)] to-[color:var(--surface)] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--muted)]">Block screen preview payload</p>
            <h3 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">
              {featuredFuture?.scenario_type === 'heaven' ? 'Show the bright path' : 'Show the warning path'}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[color:var(--muted)]">
              {featuredFuture?.narrative ??
                'Once generated, a small version of this future check can be shown right inside the block screen so the user feels the consequence at the exact trigger moment.'}
            </p>
            <div className="mt-5 rounded-2xl border border-[color:var(--border)] bg-black/20 px-4 py-4 text-sm text-[color:var(--text)]">
              <p className="font-semibold">What this means right now</p>
              <p className="mt-2 leading-7 text-[color:var(--muted)]">
                {goal?.title
                  ? `Your blocker is no longer just saying "no." It is saying: this is how today connects to ${goal.title}.`
                  : 'Save your main goal and the intervention copy will become personal.'}
              </p>
            </div>
          </div>

          {isLoading ? <p className="text-sm text-[color:var(--muted)]">Loading goal, commitments, and future states...</p> : null}
        </div>
      </div>
    </section>
  )
}
