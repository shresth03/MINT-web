import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { supabase } from '../api/supabase'
import { CheckCircle, Lock } from 'lucide-react'

export default function ResetPassword() {
  const { theme } = useTheme()
  const { updatePassword } = useAuth()
  const navigate = useNavigate()

  // null = still checking, true = recovery session found, false = no session
  const [ready, setReady] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    // Primary: getSession() reads from localStorage immediately after the redirect.
    // PASSWORD_RECOVERY fires on first load; subsequent loads replay as INITIAL_SESSION.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setReady(!!session)
    })

    // Secondary: catch PASSWORD_RECOVERY if we happen to be on the first load
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
      // If a sign-out happens while on this page, invalidate the form
      if (event === 'SIGNED_OUT') setReady(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => navigate('/feed', { replace: true }), 2500)
    return () => clearTimeout(t)
  }, [done])

  const handleSubmit = async () => {
    if (!password) { setError('Enter a new password'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    const { error: err } = await updatePassword(password)
    setLoading(false)
    if (err) setError(err.message)
    else setDone(true)
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 4,
    padding: '10px 14px', color: 'var(--text)',
    fontFamily: 'var(--sans)', fontSize: 13,
    outline: 'none', marginBottom: 14,
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  const renderBody = () => {
    // Still waiting on getSession()
    if (ready === null) return (
      <div style={{
        fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)',
        textAlign: 'center', padding: '20px 0',
      }}>
        Verifying reset link…
      </div>
    )

    // getSession() returned no session — link expired or user navigated here directly
    if (ready === false) return (
      <>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
          letterSpacing: 2, color: 'var(--text)', textAlign: 'center',
          marginBottom: 12, textTransform: 'uppercase',
        }}>
          Link expired or invalid
        </div>
        <div style={{
          fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)',
          textAlign: 'center', marginBottom: 20,
        }}>
          This reset link has expired or already been used.
          Request a new one from the sign-in page.
        </div>
        <Link to="/login" style={{
          display: 'block', textAlign: 'center',
          fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
          textDecoration: 'none', letterSpacing: 1,
        }}>
          ← Back to sign in
        </Link>
      </>
    )

    // Password successfully updated
    if (done) return (
      <>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(48,216,128,0.1)', border: '1px solid var(--verified)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <CheckCircle size={24} style={{ color: 'var(--verified)' }} />
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
          letterSpacing: 2, color: 'var(--text)', textAlign: 'center',
          marginBottom: 10, textTransform: 'uppercase',
        }}>
          Password updated
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
          Redirecting you to your feed…
        </div>
      </>
    )

    // Recovery session active — show the form
    return (
      <>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'rgba(77,200,232,0.1)', border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Lock size={20} style={{ color: 'var(--accent)' }} />
        </div>

        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2,
          color: 'var(--muted)', textAlign: 'center',
          marginBottom: 24, textTransform: 'uppercase',
        }}>
          Set a new password
        </div>

        {error && (
          <div style={{
            background: 'rgba(232,72,72,0.1)', border: '1px solid var(--accent2)',
            borderRadius: 4, padding: '10px 14px', color: 'var(--accent2)',
            fontSize: 12, marginBottom: 14, fontFamily: 'var(--sans)',
          }}>
            {error}
          </div>
        )}

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
          autoFocus
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', padding: 11,
            background: loading ? 'var(--border)' : 'var(--accent)',
            color: loading ? 'var(--muted)' : 'var(--bg)',
            fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
            letterSpacing: 1, border: 'none', borderRadius: 4,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Link to="/login" style={{
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)',
            textDecoration: 'underline', letterSpacing: 1,
          }}>
            ← Back to sign in
          </Link>
        </div>
      </>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 40, width: 400, maxWidth: '92vw',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="MINT"
            style={{ height: 36, width: 'auto' }}
          />
        </div>
        {renderBody()}
      </div>
    </div>
  )
}
