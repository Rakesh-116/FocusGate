import { Session, User } from '@supabase/supabase-js'
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type AuthContextValue = {
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
    async function hydrateSession() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Failed to get session', error)
        }
        setSession(data.session)
        setUser(data.session?.user ?? null)
      } catch (error) {
        console.error('Failed to hydrate session', error)
      } finally {
        setLoading(false)
      }
    }

    void hydrateSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setLoading(false)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const value = useMemo<AuthContextValue>(
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
    [loading, session, user],
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
