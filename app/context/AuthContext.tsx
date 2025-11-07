'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase, getUserCredits, UserCredits } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  credits: UserCredits | null
  creditsLoading: boolean
  signOut: () => Promise<void>
  refreshCredits: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  credits: null,
  creditsLoading: false,
  signOut: async () => {},
  refreshCredits: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [credits, setCredits] = useState<UserCredits | null>(null)
  const [creditsLoading, setCreditsLoading] = useState(false)

  const fetchCredits = async (userId: string) => {
    setCreditsLoading(true)
    try {
      const creditsData = await getUserCredits(userId)
      // getUserCredits automatically creates a record with 1 credit if it doesn't exist
      setCredits(creditsData)
      if (!creditsData) {
        console.warn('Failed to fetch or create credits for user:', userId)
      }
    } catch (error) {
      console.error('Error fetching credits:', error)
    } finally {
      setCreditsLoading(false)
    }
  }

  const refreshCredits = async () => {
    if (user?.id) {
      await fetchCredits(user.id)
    }
  }

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user?.id) {
        fetchCredits(session.user.id)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user?.id) {
        fetchCredits(session.user.id)
      } else {
        setCredits(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setCredits(null)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      credits,
      creditsLoading,
      signOut, 
      refreshCredits 
    }}>
      {children}
    </AuthContext.Provider>
  )
}

