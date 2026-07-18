import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { Mail, CheckCircle } from 'lucide-react'

const RESEND_COOLDOWN = 60

export default function VerifyEmail() {
  const { theme } = useTheme()
  const { user, resendVerification } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const emailFromQuery = searchParams.get('email') || ''
  const email = user?.email || emailFromQuery

  const [cooldown, setCooldown] = useState(0)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [error, setError] = useState('')

  // Already confirmed — send to feed
  useEffect(() => {
    if (user?.email_confirmed_at) navigate('/feed', { replace: true })
  }, [user])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  const handleResend = async () => {
    if (!email) return
    setResendLoading(true)
    setError('')
    setResendSuccess(false)
    const { error: err } = await resendVerification(email)
    setResendLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setResendSuccess(true)
      setCooldown(RESEND_COOLDOWN)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 40, width: 420, maxWidth: '92vw',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="MINT"
            style={{ height: 36, width: 'auto' }}
          />
        </div>

        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(77,200,232,0.1)', border: '1px solid var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <Mail size={24} style={{ color: 'var(--accent)' }} />
        </div>

        <div style={{
          fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700,
          letterSpacing: 2, color: 'var(--text)', marginBottom: 12,
          textTransform: 'uppercase',
        }}>
          Verify your email
        </div>

        <div style={{
          fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--muted)',
          lineHeight: 1.6, marginBottom: 24,
        }}>
          We sent a confirmation link to
          {email && (
            <span style={{ color: 'var(--text)', fontWeight: 600, display: 'block', marginTop: 4 }}>
              {email}
            </span>
          )}
          <span style={{ display: 'block', marginTop: 8 }}>
            Click the link in that email to activate your account.
          </span>
        </div>

        {error && (
          <div style={{
            background: 'rgba(232,72,72,0.1)', border: '1px solid var(--accent2)',
            borderRadius: 4, padding: '10px 14px', color: 'var(--accent2)',
            fontSize: 12, marginBottom: 16, fontFamily: 'var(--sans)',
          }}>
            {error}
          </div>
        )}

        {resendSuccess && (
          <div style={{
            background: 'rgba(48,216,128,0.1)', border: '1px solid var(--verified)',
            borderRadius: 4, padding: '10px 14px', color: 'var(--verified)',
            fontSize: 12, marginBottom: 16, fontFamily: 'var(--sans)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <CheckCircle size={13} /> Email sent — check your inbox.
          </div>
        )}

        <button
          onClick={handleResend}
          disabled={resendLoading || cooldown > 0}
          style={{
            width: '100%', padding: '11px 0',
            background: resendLoading || cooldown > 0 ? 'transparent' : 'var(--accent)',
            color: resendLoading || cooldown > 0 ? 'var(--muted)' : 'var(--bg)',
            border: resendLoading || cooldown > 0 ? '1px solid var(--border)' : 'none',
            fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
            letterSpacing: 1, borderRadius: 4,
            cursor: resendLoading || cooldown > 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s',
          }}
        >
          {resendLoading
            ? 'SENDING...'
            : cooldown > 0
            ? `RESEND IN ${cooldown}s`
            : 'RESEND EMAIL'}
        </button>

        <div style={{ marginTop: 20, fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)' }}>
          Wrong email?{' '}
          <Link to="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Sign up again
          </Link>
          {' · '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
