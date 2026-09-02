import { useTheme } from '../hooks/core/useTheme'
import { useNavigate } from 'react-router-dom'
import MobileBottomNav from './layout/MobileBottomNav'

export default function PageShell({ children, title, showBack = true }) {
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      color: 'var(--text)',
      fontFamily: 'var(--sans)',
    }}>
      <style>{`
        @media (max-width: 768px) {
          .page-shell-content { padding-bottom: 72px !important; }
          .page-shell-content > div { padding-left: 14px !important; padding-right: 14px !important; }
        }
      `}</style>

      {/* Topbar */}
      <div style={{
        height: 52, borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 16,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ flexShrink: 0 }}>
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="MINT"
            style={{ height: 34, width: 'auto', display: 'block' }}
          />
        </div>

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
        <div style={{ marginLeft: 'auto' }} />
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Ghost' : 'Switch to Void'}
          style={{
            background: 'none', border: '1px solid var(--border)',
            borderRadius: 4, padding: '5px 8px', cursor: 'pointer',
            color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: 9,
            letterSpacing: 1, flexShrink: 0,
          }}
        >
          {theme === 'dark' ? '☀ GHOST' : '☾ VOID'}
        </button>
      </div>

      {/* Page content — gets bottom padding on mobile so nav doesn't cover it */}
      <div className="page-shell-content">
        {children}
      </div>

      <MobileBottomNav />
    </div>
  )
}
