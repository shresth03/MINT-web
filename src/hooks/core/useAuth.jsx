import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../../api/supabase'
import {
  isIdle, markActivity, clearActivity, readLastActivity, setExpiredNotice,
} from '../../lib/auth/sessionTimeout'

const AuthContext = createContext({})

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
const ACTIVITY_WRITE_EVERY_MS = 5 * 1000
const IDLE_CHECK_EVERY_MS = 30 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange fires immediately with the current session,
    // so we use it as the single source of truth for both initial load and changes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        // Supabase also sends SIGNED_IN when a tab regains focus, so only a
        // sign-in with no activity on record starts the clock; otherwise a
        // stale session would be revived instead of timed out.
        if (_event === 'SIGNED_IN' && !readLastActivity()) markActivity()
        if (_event === 'PASSWORD_RECOVERY') markActivity()
        if (_event === 'SIGNED_OUT') clearActivity()
        setUser(session?.user ?? null)
        setLoading(false)
        // If Supabase redirected the user to the wrong page (e.g. homepage because
        // /reset-password wasn't in the allow-list), redirect them now.
        if (_event === 'PASSWORD_RECOVERY') {
          // Flag this as a genuine recovery session so ResetPassword can gate on it.
          // sessionStorage survives window.location.replace but not a new tab.
          sessionStorage.setItem('mint_recovery', '1')
          if (window.location.pathname !== '/reset-password') {
            window.location.replace('/reset-password')
          }
        }
      }
    )

    // Fallback: if onAuthStateChange never fires (e.g. network error), unblock the UI
    supabase.auth.getSession().catch(() => setLoading(false))

    return () => subscription.unsubscribe()
  }, [])

  // Session timeout: sign this browser out after IDLE_LIMIT_MS with no
  // activity in any tab. Only this browser — the person's other devices stay
  // signed in.
  useEffect(() => {
    if (!user) return

    const expire = () => {
      clearActivity()
      setExpiredNotice()
      supabase.auth.signOut({ scope: 'local' })
    }
    if (isIdle()) { expire(); return }
    if (!readLastActivity()) markActivity()

    let lastWrite = 0
    const onActivity = () => {
      const now = Date.now()
      if (now - lastWrite < ACTIVITY_WRITE_EVERY_MS) return
      lastWrite = now
      markActivity(now)
    }
    // A tab coming back from the background checks before anything else runs.
    const onVisible = () => {
      if (document.visibilityState === 'visible' && isIdle()) expire()
    }
    const check = setInterval(() => { if (isIdle()) expire() }, IDLE_CHECK_EVERY_MS)

    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, onActivity, { passive: true }))
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(check)
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, onActivity))
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [user])

  const signUp = async (email, password, username, role = 'public') => {
    const normalizedUsername = username.trim()

    // A taken username makes the profile trigger fail, which surfaces as a
    // vague "Database error saving new user" — so check first. Matching
    // ignores case; the database enforces the same rule.
    const { data: available, error: usernameError } = await supabase.rpc(
      'auth_username_available', { p_username: normalizedUsername }
    )
    if (usernameError) {
      return { error: { message: 'Unable to check username availability. Please try again.' } }
    }
    if (!available) {
      return { error: { message: 'That username is already taken.' } }
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        // Pass the extra data here so the trigger can read it!
        data: {
          username: normalizedUsername,
          role: ['public', 'reporter'].includes(role) ? role : 'public'
        }
      },
    })
    if (error) return { error }
    // REMOVED the supabase.from('users').insert(...) entirely!
    return { data, needsEmailConfirmation: !data.session }
  }

  const resendVerification = async (email) => {
    const { error } = await supabase.auth.resend({ type: 'signup', email })
    return { error }
  }

  const signIn = async (email, password) => {
    // Start the clock before the SIGNED_IN event lands, so an old timestamp
    // from an earlier session can't time out the new one straight away.
    markActivity()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  // Signs out this browser only; other devices keep their sessions.
  const signOut = async () => {
    clearActivity()
    await supabase.auth.signOut({ scope: 'local' })
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { error }
  }

  const updatePassword = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, resetPassword, updatePassword, resendVerification }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}