import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--mono)',
      color: 'var(--muted)',
    }}>
      <div style={{ fontSize: 40, marginBottom: 16, color: 'var(--border)' }}>◈</div>
      <div style={{ fontSize: 12, letterSpacing: 2, color: 'var(--accent)', marginBottom: 8 }}>
        404 — SIGNAL NOT FOUND
      </div>
      <div style={{ fontSize: 11, marginBottom: 24, color: 'var(--muted)' }}>
        This intelligence report does not exist.
      </div>
      <button
        onClick={() => navigate('/feed')}
        style={{
          padding: '8px 20px',
          background: 'transparent',
          border: '1px solid var(--border)',
          color: 'var(--muted)',
          borderRadius: 4,
          fontFamily: 'var(--mono)',
          fontSize: 10,
          cursor: 'pointer',
          letterSpacing: 1,
          transition: 'all 0.15s',
        }}
        onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
        onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
      >
        ↩ RETURN TO FEED
      </button>
    </div>
  )
}