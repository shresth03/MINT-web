import { useState, useRef, useCallback } from 'react'
import { useTheme } from '../hooks/core/useTheme'
import ThemeRipple from './ThemeRipple'

// MINT wordmark for page top bars. Holding it switches theme with a
// ripple from the logo's centre; releasing early reverts.
export default function TopbarLogo() {
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
    <>
      {ripple && (
        <ThemeRipple
          origin={ripple.origin}
          theme={ripple.theme}
          holding={holding}
          onDone={() => setRipple(null)}
          onRevert={() => { toggleTheme(); setRipple(null) }}
        />
      )}
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
    </>
  )
}
