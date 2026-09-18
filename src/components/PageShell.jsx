import { useState, useRef, useCallback } from 'react'
import { useTheme } from '../hooks/core/useTheme'
import BackButton from './BackButton'
import ThemeRipple from './ThemeRipple'
import MobileBottomNav from './layout/MobileBottomNav'

export default function PageShell({ children, title, showBack = true }) {
  const { theme, toggleTheme } = useTheme()
  const [ripple, setRipple] = useState(null)
  const holding = useRef(false)
  const logoRef = useRef(null)

  const startHold = useCallback(() => {
    if (ripple) return
    const rect = logoRef.current?.getBoundingClientRect()
    const origin = {
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    }
    holding.current = true
    toggleTheme()                   // switch theme immediately
    setRipple({ origin, theme })    // theme = OLD theme (for mask color)
  }, [theme, ripple, toggleTheme])

  const cancelHold = useCallback(() => { holding.current = false }, [])

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

      {ripple && (
        <ThemeRipple
          origin={ripple.origin}
          theme={ripple.theme}
          holding={holding}
          onDone={() => setRipple(null)}
          onRevert={() => { toggleTheme(); setRipple(null) }}
        />
      )}

      {/* Topbar */}
      <div style={{
        height: 52, borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 16,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div
          ref={logoRef}
          style={{ flexShrink: 0, cursor: 'pointer', userSelect: 'none' }}
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={(e) => { e.preventDefault(); startHold() }}
          onTouchEnd={cancelHold}
        >
          <img
            src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
            alt="MINT"
            draggable={false}
            style={{ height: 34, width: 'auto', display: 'block', pointerEvents: 'none', WebkitTouchCallout: 'none', userSelect: 'none' }}
          />
        </div>

        {title && (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 12,
            letterSpacing: 1, color: 'var(--muted)',
            textTransform: 'uppercase',
          }}>
            {title}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {showBack && <BackButton />}
        </div>
      </div>

      {/* Page content — gets bottom padding on mobile so nav doesn't cover it */}
      <div className="page-shell-content">
        {children}
      </div>

      <MobileBottomNav />
    </div>
  )
}
