import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080c10',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'IBM Plex Mono', monospace",
      color: '#4a6080'
    }}>
      <div style={{ fontSize: 40, marginBottom: 16, color: '#1e2d3d' }}>◈</div>
      <div style={{ fontSize: 12, letterSpacing: 2, color: '#00d4ff', marginBottom: 8 }}>
        404 — SIGNAL NOT FOUND
      </div>
      <div style={{ fontSize: 11, marginBottom: 24 }}>
        This intelligence report does not exist.
      </div>
      <button
        onClick={() => navigate('/feed')}
        style={{
          padding: '8px 20px',
          background: 'transparent',
          border: '1px solid #1e2d3d',
          color: '#4a6080',
          borderRadius: 4,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          cursor: 'pointer',
          letterSpacing: 1,
          transition: 'all 0.15s'
        }}
      >
        ↩ RETURN TO FEED
      </button>
    </div>
  )
}