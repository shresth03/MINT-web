import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const styles = `
  .auth-page {
    min-height: 100vh;
    background: #080c10;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .auth-card {
    background: #0d1219;
    border: 1px solid #1e2d3d;
    border-radius: 10px;
    padding: 36px;
    width: 400px;
  }
  .auth-logo {
    display: flex; align-items: center;
    gap: 10px; margin-bottom: 28px;
    justify-content: center;
  }
  .auth-logo-icon {
    width: 36px; height: 36px;
    background: #00d4ff;
    clip-path: polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; font-weight: 700; color: #000;
  }
  .auth-logo-text {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 18px; font-weight: 700;
    color: #00d4ff; letter-spacing: 3px;
  }
  .auth-title {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; letter-spacing: 2px;
    color: #4a6080; text-align: center;
    margin-bottom: 28px; text-transform: uppercase;
  }
  .auth-input {
    width: 100%; background: #080c10;
    border: 1px solid #1e2d3d; border-radius: 4px;
    padding: 10px 14px; color: #c8d6e5;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 13px; outline: none;
    margin-bottom: 14px; box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .auth-input:focus { border-color: #00d4ff; }
  .auth-btn {
    width: 100%; padding: 11px;
    background: #00d4ff; color: #000;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px; font-weight: 700;
    letter-spacing: 1px; border: none;
    border-radius: 4px; cursor: pointer;
    transition: background 0.15s; margin-top: 4px;
  }
  .auth-btn:hover { background: #00bde8; }
  .auth-btn:disabled { background: #1e2d3d; color: #4a6080; cursor: not-allowed; }
  .auth-error {
    background: rgba(255,107,53,0.1);
    border: 1px solid #ff6b35; border-radius: 4px;
    padding: 10px 14px; color: #ff6b35;
    font-size: 12px; margin-bottom: 14px;
  }
  .auth-success {
    background: rgba(0,255,136,0.1);
    border: 1px solid #00ff88; border-radius: 4px;
    padding: 10px 14px; color: #00ff88;
    font-size: 12px; margin-bottom: 14px;
  }
  .auth-link {
    text-align: center; margin-top: 20px;
    font-size: 12px; color: #4a6080;
  }
  .auth-link a { color: #00d4ff; text-decoration: none; }
  .auth-link a:hover { text-decoration: underline; }
`

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleRegister = async () => {
    if (!email || !password || !username) {
      setError('Please fill in all fields')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await signUp(email, password, username)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess('Account created! Redirecting...')
      setTimeout(() => navigate('/feed'), 1500)
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">⬡</div>
            <div className="auth-logo-text">SIGINT</div>
          </div>
          <div className="auth-title">Create your account</div>

          {error && <div className="auth-error">{error}</div>}
          {success && <div className="auth-success">{success}</div>}

          <input
            className="auth-input"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="auth-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
          />

          <button
            className="auth-btn"
            onClick={handleRegister}
            disabled={loading}
          >
            {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
          </button>

          <div className="auth-link">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </>
  )
}