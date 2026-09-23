import BackButton from './BackButton'
import TopbarLogo from './TopbarLogo'
import MobileBottomNav from './layout/MobileBottomNav'

export default function PageShell({ children, title, showBack = true }) {
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
        <TopbarLogo />

        {showBack && (
          <>
            <span aria-hidden="true" style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />
            <BackButton variant="outline" />
          </>
        )}

        {title && (
          <span style={{
            position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700,
            letterSpacing: 1, color: 'var(--accent)',
            textTransform: 'uppercase',
            pointerEvents: 'none',
          }}>
            {title}
          </span>
        )}
      </div>

      {/* Page content — gets bottom padding on mobile so nav doesn't cover it */}
      <div className="page-shell-content">
        {children}
      </div>

      <MobileBottomNav />
    </div>
  )
}
