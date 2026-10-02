/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../api/supabase'

const AuthContext = createContext({})

const INACTIVITY_LIMIT = 10 * 60 * 1000 // 10 minutes

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange fires immediately with the current session,
    // so we use it as the single source of truth for both initial load and changes.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)

      // If Supabase redirected the user to the wrong page
      // (e.g. homepage because /reset-password wasn't in the allow-list),
      // redirect them now.
      if (_event === 'PASSWORD_RECOVERY') {
        // Flag this as a genuine recovery session so ResetPassword can gate on it.
        // sessionStorage survives window.location.replace but not a new tab.
        sessionStorage.setItem('mint_recovery', '1')

        if (window.location.pathname !== '/reset-password') {
          window.location.replace('/reset-password')
        }
      }
    })

    // Fallback: if onAuthStateChange never fires (e.g. network error),
    // unblock the UI.
    supabase.auth.getSession().catch(() => setLoading(false))

    return () => subscription.unsubscribe()
  }, [])

  // Auto logout after 10 minutes of inactivity
  useEffect(() => {
    if (!user) return

    let inactivityTimer

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer)

      inactivityTimer = setTimeout(async () => {
        await supabase.auth.signOut()
      }, INACTIVITY_LIMIT)
    }

    const activityEvents = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
    ]

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer)
    })

    // Start the timer when the user becomes authenticated.
    resetInactivityTimer()

    return () => {
      clearTimeout(inactivityTimer)

      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer)
      })
    }
  }, [user])

  const signUp = async (email, password, username, role = 'public') => {
    const normalizedUsername = username.trim()

    // Check username availability before creating the account.
    // profile_get_by_username is a PUBLIC schema RPC, so use the main
    // Supabase client rather than identityDb.
    const {
      data: existingUsers,
      error: usernameError,
    } = await supabase.rpc('profile_get_by_username', {
      p_username: normalizedUsername,
    })

    if (usernameError) {
      return {
        error: {
          message: 'Unable to check username availability. Please try again.',
        },
      }
    }

    if (existingUsers && existingUsers.length > 0) {
      return {
        error: {
          message: 'Username is already taken.',
        },
      }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        // Pass the extra data here so the trigger can read it.
        data: {
          username: normalizedUsername,
          role: ['public', 'reporter'].includes(role) ? role : 'public',
        },
      },
    })

    if (error) return { error }

    return {
      data,
      needsEmailConfirmation: !data.session,
    }
  }

  const resendVerification = async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    })

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
      redirectTo: `${window.location.origin}/reset-password`,
    })

    return { error }
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    return { error }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        resendVerification,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}