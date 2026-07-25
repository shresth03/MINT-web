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
    // Only show the form if a genuine PASSWORD_RECOVERY event was detected
    // (flagged in sessionStorage by AuthProvider). A regular logged-in session
    // must not be able to reach this form — that would let any authenticated
    // user change any account's password by navigating here directly.
    const isRecovery = sessionStorage.getItem('mint_recovery') === '1'

    if (isRecovery) {
      setReady(true)
    } else {
      // Also catch PASSWORD_RECOVERY if we happen to be first tab receiving it
      // before AuthProvider's listener fires (rare but possible).
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          sessionStorage.setItem('mint_recovery', '1')
          setReady(true)
        }
      })
      // Give the auth listener a moment before showing expired state
      const t = setTimeout(() => setReady(prev => prev === null ? false : prev), 1500)
      return () => {
        subscription.unsubscribe()
        clearTimeout(t)
      }
    }
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
    else {
      sessionStorage.removeItem('mint_recovery')
      setDone(true)
    }
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
        <style>{`
          @keyframes rp-icon-enter {
            from { opacity: 0; transform: scale(0.7); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes rp-text-enter {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .rp-success-icon {
            animation: rp-icon-enter 300ms cubic-bezier(0.34,1.56,0.64,1) both;
          }
          .rp-success-text {
            animation: rp-text-enter 250ms ease-out both;
            animation-delay: 150ms;
          }
          .rp-success-sub {
            animation: rp-text-enter 250ms ease-out both;
            animation-delay: 220ms;
          }
          @media (prefers-reduced-motion: reduce) {
            .rp-success-icon, .rp-success-text, .rp-success-sub { animation-duration: 0ms; animation-delay: 0ms; }
          }
        `}</style>
        <div className="rp-success-icon" style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(48,216,128,0.1)', border: '1px solid var(--verified)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <CheckCircle size={24} style={{ color: 'var(--verified)' }} />
        </div>
        <div className="rp-success-text" style={{
          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
          letterSpacing: 2, color: 'var(--text)', textAlign: 'center',
          marginBottom: 10, textTransform: 'uppercase',
        }}>
          Password updated
        </div>
        <div className="rp-success-sub" style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)', textAlign: 'center' }}>
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
