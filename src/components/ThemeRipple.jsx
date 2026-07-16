import { useState, useEffect, useRef } from 'react'

export default function ThemeRipple({ origin, theme, holding, onDone, onRevert }) {
  const HOLD_DURATION = 1500
  const rafRef = useRef(null)
  const startRef = useRef(null)
  const [radius, setRadius] = useState(0)
  const [phase, setPhase] = useState('expand')
  const maxR = Math.hypot(window.innerWidth, window.innerHeight)
  const peakRadius = useRef(0)
  const completed = useRef(false)

  useEffect(() => {
    if (phase === 'expand') {
      function tick(ts) {
        if (!startRef.current) startRef.current = ts
        const elapsed = ts - startRef.current
        const p = Math.min(elapsed / HOLD_DURATION, 1)
        const r = maxR * p
        peakRadius.current = r
        setRadius(r)

        if (p >= 1) {
          completed.current = true
          onDone?.()
          return
        } else if (holding.current) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setPhase('collapse')
          startRef.current = null
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    if (phase === 'collapse') {
      const collapseFrom = peakRadius.current
      if (collapseFrom === 0) { onRevert?.(); return }
      function tick(ts) {
        if (!startRef.current) startRef.current = ts
        const elapsed = ts - startRef.current
        const collapseDuration = (collapseFrom / maxR) * 500
        const p = Math.min(elapsed / collapseDuration, 1)
        setRadius(collapseFrom * (1 - p))
        if (p < 1) rafRef.current = requestAnimationFrame(tick)
        else onRevert?.()
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => cancelAnimationFrame(rafRef.current)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!holding.current && phase === 'expand') {
      cancelAnimationFrame(rafRef.current)
      setPhase('collapse')
      startRef.current = null
    }
  })

  // Mask hides old bg everywhere except inside the circle hole
  const oldBg = theme === 'dark' ? '#000000' : '#f8f7f5'
  const r = Math.max(radius, 0.1)
  const mask = `radial-gradient(circle ${r}px at ${origin.x}px ${origin.y}px, transparent ${r}px, black ${r}px)`

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none',
      background: oldBg,
      maskImage: mask,
      WebkitMaskImage: mask,
    }} />
  )
}
