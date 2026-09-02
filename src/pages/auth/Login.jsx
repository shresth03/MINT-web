import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../hooks/core/useAuth'
import { useTheme } from '../../hooks/core/useTheme'

export default function Login() {
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const { signIn, resetPassword } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true)
    setError('')
    const { data, error } = await signIn(email, password)
    if (error) { setError(error.message); setLoading(false) }
    else if (data?.session) navigate('/feed')
    else { setError('Sign-in failed — please try again'); setLoading(false) }
  }

  const handleReset = async () => {
    if (!resetEmail) { setError('Enter your email address'); return }
    setResetLoading(true)
    setError('')
    const { error } = await resetPassword(resetEmail)
    setResetLoading(false)
    if (error) setError(error.message)
    else setResetSent(true)
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 4,
    padding: '10px 14px', color: 'var(--text)',
    fontFamily: 'var(--sans)', fontSize: 13,
    outline: 'none', marginBottom: 14,
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 36, width: 400, maxWidth: '92vw',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="MINT"
            style={{ height: 36, width: 'auto' }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(232,72,72,0.1)', border: '1px solid var(--accent2)',
            borderRadius: 4, padding: '10px 14px', color: 'var(--accent2)',
            fontSize: 12, marginBottom: 14, fontFamily: 'var(--sans)',
          }}>
            {error}
          </div>
        )}

        {!showReset ? (
          <>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2,
              color: 'var(--muted)', textAlign: 'center',
              marginBottom: 28, textTransform: 'uppercase',
            }}>
              Sign in to your account
            </div>

            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{
                width: '100%', padding: 11, marginTop: 4,
                background: loading ? 'var(--border)' : 'var(--accent)',
                color: loading ? 'var(--muted)' : 'var(--bg)',
                fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                letterSpacing: 1, border: 'none', borderRadius: 4,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'SIGNING IN...' : 'SIGN IN'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => { setShowReset(true); setError('') }}
                style={{
                  background: 'none', border: 'none', color: 'var(--muted)',
                  fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
                  letterSpacing: 1, textDecoration: 'underline',
                }}
              >
                Forgot password?
              </button>
            </div>

            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                Create one
              </Link>
            </div>
          </>
        ) : (
          <>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2,
              color: 'var(--muted)', textAlign: 'center',
              marginBottom: 24, textTransform: 'uppercase',
            }}>
              Reset your password
            </div>

            {resetSent ? (
              <div style={{
                background: 'rgba(48,216,128,0.1)', border: '1px solid var(--verified)',
                borderRadius: 4, padding: '12px 14px', color: 'var(--verified)',
                fontSize: 12, marginBottom: 14, fontFamily: 'var(--sans)', textAlign: 'center',
              }}>
                Reset link sent — check your inbox.
              </div>
            ) : (
              <>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
                  Enter your email and we'll send a reset link.
                </div>
                <input
                  type="email"
                  placeholder="Email address"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleReset()}
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  onClick={handleReset}
                  disabled={resetLoading}
                  style={{
                    width: '100%', padding: 11,
                    background: resetLoading ? 'var(--border)' : 'var(--accent)',
                    color: resetLoading ? 'var(--muted)' : 'var(--bg)',
                    fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
                    letterSpacing: 1, border: 'none', borderRadius: 4,
                    cursor: resetLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  {resetLoading ? 'SENDING...' : 'SEND RESET LINK'}
                </button>
              </>
            )}

            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => { setShowReset(false); setResetSent(false); setError('') }}
                style={{
                  background: 'none', border: 'none', color: 'var(--muted)',
                  fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
                  letterSpacing: 1, textDecoration: 'underline',
                }}
              >
                ← Back to sign in
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
