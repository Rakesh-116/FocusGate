import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

interface AuthContextValue {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function initAuth() {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Auth init error', error)
      }
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    }

    initAuth()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (!session) {
        navigate('/auth')
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [navigate])

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signOut: async () => {
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
        navigate('/auth')
      },
    }),
    [user, session, loading, navigate],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
