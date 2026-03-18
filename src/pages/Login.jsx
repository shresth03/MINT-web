import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) { setError('Please fill in all fields'); return }
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/feed')
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28, justifyContent: 'center' }}>
          <div style={{
            width: 36, height: 36, background: 'var(--accent)',
            clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: 'var(--bg)', fontFamily: 'var(--mono)',
          }}>⬡</div>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700,
            color: 'var(--accent)', letterSpacing: 3,
          }}>MINT</div>
        </div>

        {/* Subtitle */}
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2,
          color: 'var(--muted)', textAlign: 'center',
          marginBottom: 28, textTransform: 'uppercase',
        }}>
          Sign in to your account
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

        {/* Inputs */}
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

        {/* Button */}
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

        {/* Link */}
        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
          Don't have an account?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  )
}