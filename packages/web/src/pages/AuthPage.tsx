import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { session } = useAuth()

  if (session) {
    navigate('/dashboard')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)

    if (mode === 'signup' && password !== confirmPassword) {
      setErrorMessage('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      navigate('/dashboard')
    } catch (error) {
      setErrorMessage((error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setErrorMessage(null)
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' })
    if (error) {
      setErrorMessage(error.message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a14] px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-lg flex-col gap-8 rounded-[32px] border border-slate-800 bg-slate-950/95 p-8 shadow-soft">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-900/80 p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition ${mode === 'login' ? 'bg-slate-100 text-slate-950' : 'text-slate-300 hover:text-slate-100'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition ${mode === 'signup' ? 'bg-slate-100 text-slate-950' : 'text-slate-300 hover:text-slate-100'}`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-300">Email</label>
            <input
              className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none ring-1 ring-transparent transition focus:border-violet-400 focus:ring-violet-500/40"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-slate-300">Password</label>
            <input
              className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none ring-1 ring-transparent transition focus:border-violet-400 focus:ring-violet-500/40"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {mode === 'signup' && (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-slate-300">Confirm password</label>
              <input
                className="rounded-2xl border border-slate-800 bg-slate-950/90 px-4 py-3 text-slate-100 outline-none ring-1 ring-transparent transition focus:border-violet-400 focus:ring-violet-500/40"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
          )}

          {errorMessage && <div className="rounded-2xl bg-rose-500/15 px-4 py-3 text-sm text-rose-300">{errorMessage}</div>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Working…' : mode === 'login' ? 'Continue' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="h-px flex-1 bg-slate-800" />
          <span>OR</span>
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-slate-800"
        >
          Continue with Google
        </button>
      </div>
    </div>
  )
}
