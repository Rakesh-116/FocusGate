/* Dashboard card for managing blocked web links synced to the extension. */
import { useState } from 'react'
import { useBlockedRules } from '../hooks/useBlockedRules'

export function BlockedLinksManager({ userId }: { userId: string | null }) {
  const [newBlockedRule, setNewBlockedRule] = useState('')
  const { blockedRules, isLoading, addBlockedRule, removeBlockedRule, addError, removeError } = useBlockedRules(userId)

  async function handleAddRule(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!newBlockedRule.trim()) return
    await addBlockedRule(newBlockedRule)
    setNewBlockedRule('')
  }

  return (
    <div className="rounded-[32px] border border-[color:var(--border)] bg-[color:var(--card)]/92 p-7 glass-panel-dark theme-shadow">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[color:var(--muted)]">Blocked links</p>
          <h3 className="mt-2 text-3xl font-semibold text-[color:var(--text)]">Keep the same rules everywhere.</h3>
          <p className="mt-3 text-sm text-[color:var(--muted)]">Add URL prefixes here and the extension will use the same blocked list.</p>
        </div>
        <div className="rounded-full bg-[color:var(--accent-muted)] px-4 py-2 text-xs font-semibold text-[color:var(--accent)] shadow-[inset_0_0_0_1px_var(--border)]">
          {blockedRules.length} active
        </div>
      </div>

      <form onSubmit={handleAddRule} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          type="text"
          value={newBlockedRule}
          onChange={(event) => setNewBlockedRule(event.target.value)}
          placeholder="e.g. youtube.com/shorts"
          className="rounded-3xl border border-[color:var(--input-border)] bg-[color:var(--input-bg)] px-5 py-4 text-[color:var(--text)] outline-none ring-1 ring-transparent transition focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)]/30"
        />
        <button
          type="submit"
          disabled={!newBlockedRule.trim()}
          className="rounded-3xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] px-6 py-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add link
        </button>
      </form>

      {(addError || removeError) && (
        <div className="mt-4 rounded-2xl bg-rose-500/10 px-4 py-3 text-sm text-rose-400">
          {addError?.message || removeError?.message}
        </div>
      )}

      <div className="mt-6 grid gap-3">
        {isLoading && (
          <div className="rounded-3xl bg-[color:var(--surface-3)]/88 px-4 py-5 text-sm text-[color:var(--muted)]">
            Loading blocked links...
          </div>
        )}

        {!isLoading && blockedRules.length === 0 && (
          <div className="rounded-3xl bg-[color:var(--surface-3)]/88 px-4 py-5 text-sm text-[color:var(--muted)]">
            No blocked links yet. Add the distracting URLs you want blocked in the extension.
          </div>
        )}

        {blockedRules.map((rule) => (
          <div key={rule.id} className="flex items-center justify-between gap-3 rounded-3xl bg-[color:var(--surface-3)]/88 px-4 py-3">
            <span className="text-sm text-[color:var(--text)]">{rule.app_or_url}</span>
            <button
              type="button"
              onClick={() => removeBlockedRule(rule.id)}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:bg-rose-100"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
