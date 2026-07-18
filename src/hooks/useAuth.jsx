import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../api/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange fires immediately with the current session,
    // so we use it as the single source of truth for both initial load and changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    // Fallback: if onAuthStateChange never fires (e.g. network error), unblock the UI
    supabase.auth.getSession().catch(() => setLoading(false))

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email, password, username, role = 'public') => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    })
    if (error) return { error }

    if (data.user) {
      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        username,
        role: ['public', 'reporter'].includes(role) ? role : 'public',
      })
      if (profileError) return { error: profileError }
    }
    // session is null when Supabase has email confirmation enabled
    return { data, needsEmailConfirmation: !data.session }
  }

  const resendVerification = async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    return { error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, resetPassword, resendVerification }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}