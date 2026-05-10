import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactElement } from 'react'

export function ProtectedRoute({ children }: { children: ReactElement }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a14] px-4 text-slate-100">
        <div className="rounded-[28px] border border-slate-800 bg-slate-950/90 px-6 py-4 text-sm font-medium shadow-soft">
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
