import { useState } from 'react'

export default function BlockScreenPreview() {
  const [unlocked, setUnlocked] = useState(false)

  return (
    <div className="min-h-screen bg-[#0a0a14] px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-800 bg-slate-950/90 p-10 shadow-soft">
        <h1 className="text-3xl font-semibold text-slate-100">Block Screen Preview</h1>
        <p className="mt-4 text-slate-400">This route is reserved for the future <code className="rounded-md bg-slate-900 px-2 py-1 text-sm text-slate-200">BlockScreen</code> component.</p>
        <button
          type="button"
          onClick={() => setUnlocked(true)}
          className="mt-8 rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110"
        >
          {unlocked ? 'Unlocked' : 'Simulate Unlock'}
        </button>
      </div>
    </div>
  )
}
