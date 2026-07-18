import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { CircleDot, PenLine } from 'lucide-react'

const ACCOUNT_TYPES = [
  { id: 'public',   label: 'Public',   Icon: CircleDot, desc: 'Read intel, follow analysts, join discussions' },
  { id: 'reporter', label: 'Reporter', Icon: PenLine,   desc: 'Access articles, publish live broadcasts & reels' },
]

export default function Register() {
  const { theme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [accountType, setAccountType] = useState('public')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleRegister = async () => {
    if (!email || !password || !username) { setError('Please fill in all fields'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    setLoading(true)
    setError('')
    const { error, needsEmailConfirmation } = await signUp(email, password, username, accountType)
    if (error) { setError(error.message); setLoading(false) }
    else if (needsEmailConfirmation) navigate(`/verify-email?email=${encodeURIComponent(email)}`)
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
        borderRadius: 10, padding: 36, width: 420, maxWidth: '92vw',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="MINT"
            style={{ height: 36, width: 'auto' }}
          />
        </div>

        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 2, color: 'var(--muted)', textAlign: 'center', marginBottom: 24, textTransform: 'uppercase' }}>
          Create your account
        </div>

        {/* Account type selector */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase' }}>
            Account type
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {ACCOUNT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setAccountType(t.id)}
                style={{
                  flex: 1, padding: '10px 12px', cursor: 'pointer',
                  border: `1px solid ${accountType === t.id ? 'var(--accent)' : 'var(--border)'}`,
                  background: accountType === t.id ? 'var(--active-bg)' : 'transparent',
                  borderRadius: 6, textAlign: 'left', transition: 'all 0.15s',
                }}
              >
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: accountType === t.id ? 'var(--accent)' : 'var(--text)', marginBottom: 4 }}>
                  <t.Icon size={11} style={{ display:'inline', verticalAlign:'middle', marginRight:5 }} />{t.label.toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--sans)', fontSize: 10, color: 'var(--muted)', lineHeight: 1.4 }}>
                  {t.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(232,72,72,0.1)', border: '1px solid var(--accent2)', borderRadius: 4, padding: '10px 14px', color: 'var(--accent2)', fontSize: 12, marginBottom: 14, fontFamily: 'var(--sans)' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ background: 'rgba(48,216,128,0.1)', border: '1px solid var(--verified)', borderRadius: 4, padding: '10px 14px', color: 'var(--verified)', fontSize: 12, marginBottom: 14, fontFamily: 'var(--sans)' }}>
            {success}
          </div>
        )}

        <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRegister()} style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        <input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRegister()} style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        <input type="password" placeholder="Password (min 6 characters)" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRegister()} style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'} />

        <button onClick={handleRegister} disabled={loading} style={{
          width: '100%', padding: 11, marginTop: 4,
          background: loading ? 'var(--border)' : 'var(--accent)',
          color: loading ? 'var(--muted)' : 'var(--bg)',
          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
          letterSpacing: 1, border: 'none', borderRadius: 4,
          cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s',
        }}>
          {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
