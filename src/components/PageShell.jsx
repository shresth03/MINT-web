import { useTheme } from '../hooks/useTheme'
import ThemeToggle from './ThemeToggle'
import { useNavigate } from 'react-router-dom'

export default function PageShell({ children, title, showBack = true, showToggle = true }) {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      fontFamily: 'var(--sans)',
    }}>
      {/* Topbar */}
      <div style={{
        height: 52, borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 16,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none',
              color: 'var(--muted)', cursor: 'pointer',
              fontFamily: 'var(--mono)', fontSize: 10,
              letterSpacing: 1, display: 'flex',
              alignItems: 'center', gap: 6, padding: 0,
            }}
          >
            ← BACK
          </button>
        )}
        {title && (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 12,
            letterSpacing: 1, color: 'var(--muted)',
            textTransform: 'uppercase',
          }}>
            {title}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {showToggle && <ThemeToggle theme={theme} onToggle={toggleTheme} />}
        </div>
      </div>

      {/* Page content */}
      {children}
    </div>
  )
}