/* Authentication page for login and sign-up flows. */
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
    <div className="min-h-screen bg-[color:var(--surface)] px-4 py-10 text-[color:var(--text)]">
      <div className="mx-auto flex max-w-lg flex-col gap-8 rounded-[32px] border border-[color:var(--border)] bg-[color:var(--card)]/96 p-8 glass-panel-dark theme-shadow">
        <div className="grid grid-cols-2 gap-1 rounded-full bg-[color:var(--surface-3)] p-1">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition ${mode === 'login' ? 'bg-[color:var(--surface-2)] text-[color:var(--text)]' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition ${mode === 'signup' ? 'bg-[color:var(--surface-2)] text-[color:var(--text)]' : 'text-[color:var(--muted)] hover:text-[color:var(--text)]'}`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium text-[color:var(--text)]">Email</label>
            <input
              className="rounded-2xl border border-[color:var(--input-border)] bg-[color:var(--input-bg)] px-4 py-3 text-[color:var(--text)] outline-none ring-1 ring-transparent transition focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)]/40"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium text-[color:var(--text)]">Password</label>
            <input
              className="rounded-2xl border border-[color:var(--input-border)] bg-[color:var(--input-bg)] px-4 py-3 text-[color:var(--text)] outline-none ring-1 ring-transparent transition focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)]/40"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {mode === 'signup' && (
            <div className="grid gap-2">
              <label className="text-sm font-medium text-[color:var(--text)]">Confirm password</label>
              <input
                className="rounded-2xl border border-[color:var(--input-border)] bg-[color:var(--input-bg)] px-4 py-3 text-[color:var(--text)] outline-none ring-1 ring-transparent transition focus:border-[color:var(--accent)] focus:ring-[color:var(--accent)]/40"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                required
              />
            </div>
          )}

          {errorMessage && <div className="rounded-2xl bg-rose-500/12 px-4 py-3 text-sm text-rose-400">{errorMessage}</div>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-2xl bg-gradient-to-r from-[color:var(--accent)] to-[color:var(--accent-strong)] px-5 py-3 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Working...' : mode === 'login' ? 'Continue' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-3 text-sm text-[color:var(--muted)]">
          <span className="h-px flex-1 bg-[color:var(--border)]" />
          <span>OR</span>
          <span className="h-px flex-1 bg-[color:var(--border)]" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--button-secondary-bg)] px-5 py-3 text-sm font-semibold text-[color:var(--button-secondary-text)] transition hover:bg-[color:var(--button-secondary-hover)]"
        >
          Continue with Google
        </button>
      </div>
    </div>
  )
}
