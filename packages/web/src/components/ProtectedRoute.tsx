/* Route guard that redirects unauthenticated users to the auth page. */
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactElement } from 'react'

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[color:var(--surface)] px-4 text-[color:var(--text)]">
        <div className="rounded-[28px] border border-[color:var(--border)] bg-[color:var(--card)]/96 px-6 py-4 text-sm font-medium glass-panel-dark theme-shadow">
          Loading...
        </div>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/auth" replace />
  }

  return children
}
