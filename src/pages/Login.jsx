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
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 28px;
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
    border: 1px solid #ff6b35;
    border-radius: 4px; padding: 10px 14px;
    color: #ff6b35; font-size: 12px;
    margin-bottom: 14px;
  }
  .auth-link {
    text-align: center; margin-top: 20px;
    font-size: 12px; color: #4a6080;
  }
  .auth-link a { color: #00d4ff; text-decoration: none; }
  .auth-link a:hover { text-decoration: underline; }
`

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await signIn(email, password)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate('/feed')
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
          <div className="auth-title">Sign in to your account</div>

          {error && <div className="auth-error">{error}</div>}

          <input
            className="auth-input"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />

          <button
            className="auth-btn"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>

          <div className="auth-link">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </>
  )
}