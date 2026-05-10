import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

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

  useEffect(() => {
    async function initSession() {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Failed to get session', error)
      }
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
    }

    initSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      user,
      session,
      loading,
      signOut: async () => {
        await supabase.auth.signOut()
        setSession(null)
        setUser(null)
      },
    }),
    [user, session, loading],
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
