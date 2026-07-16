import { useAuth } from '../../hooks/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../api/supabase'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '../../hooks/useTheme'
import {
  Rss, Globe, TrendingUp, Newspaper, Radio, Film,
  Search, MessageSquare, User, Plus, LogOut,
  BadgeCheck, PenLine, ShieldAlert, CircleDot,
} from 'lucide-react'

const ROLE_BADGE = {
  osint:    { Icon: BadgeCheck,  label: 'OSINT ANALYST', color: 'var(--verified)' },
  reporter: { Icon: PenLine,     label: 'REPORTER',       color: 'var(--accent)' },
  admin:    { Icon: ShieldAlert, label: 'ADMIN',           color: '#ff9f43' },
  public:   { Icon: CircleDot,   label: 'PUBLIC',          color: 'var(--muted)' },
}

const NAV = [
  { section: 'Feed' },
  { id: 'feed',     path: '/feed',     label: 'Intel Feed',   Icon: Rss },
  { id: 'general',  path: '/feed',     label: 'General',      Icon: Globe },
  { id: 'trending', path: '/feed',     label: 'Trending',     Icon: TrendingUp },
  { section: 'Media' },
  { id: 'articles', path: '/articles', label: 'Articles',     Icon: Newspaper },
  { id: 'live',     path: '/live',     label: 'Live',         Icon: Radio, accent: '#e84848' },
  { id: 'reels',    path: '/reels',    label: 'Reels',        Icon: Film },
  { section: 'OSINT' },
  { id: 'search',   path: '/search',   label: 'Search',       Icon: Search },
  { id: 'messages', path: '/messages', label: 'Messages',     Icon: MessageSquare },
  { section: 'Account' },
  { id: 'profile',  path: '/profile',  label: 'My Profile',   Icon: User },
]

function ThemeRipple({ origin, theme, holding, onSwitch }) {
  const HOLD_DURATION = 3000
  const rafRef = useRef(null)
  const startRef = useRef(null)
  const [radius, setRadius] = useState(0)
  const [phase, setPhase] = useState('expand') // 'expand' | 'collapse'
  const maxR = Math.hypot(window.innerWidth, window.innerHeight)
  const switched = useRef(false)
  const peakRadius = useRef(0)

  useEffect(() => {
    if (phase === 'expand') {
      // Expand while held — tracks real time held
      function tick(ts) {
        if (!startRef.current) startRef.current = ts
        const elapsed = ts - startRef.current
        const p = Math.min(elapsed / HOLD_DURATION, 1)
        const r = maxR * p
        peakRadius.current = r
        setRadius(r)

        if (p >= 1) {
          // Held full 3s — switch theme then collapse
          if (!switched.current) {
            switched.current = true
            onSwitch()
          }
          setPhase('collapse')
          startRef.current = null
        } else if (holding.current) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          // Released early — collapse from current radius
          setPhase('collapse')
          startRef.current = null
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    if (phase === 'collapse') {
      const collapseFrom = peakRadius.current
      function tick(ts) {
        if (!startRef.current) startRef.current = ts
        const elapsed = ts - startRef.current
        const collapseDuration = (collapseFrom / maxR) * 800
        const p = Math.min(elapsed / collapseDuration, 1)
        setRadius(collapseFrom * (1 - p))
        if (p < 1) rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    return () => cancelAnimationFrame(rafRef.current)
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  // When holding stops mid-expand, kick into collapse
  useEffect(() => {
    if (!holding.current && phase === 'expand') {
      cancelAnimationFrame(rafRef.current)
      setPhase('collapse')
      startRef.current = null
    }
  })

  const nextBg = theme === 'dark' ? '#f8f7f5' : '#000000'
  const rings = [1, 0.72, 0.48, 0.28]

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', overflow: 'hidden' }}>
      {rings.map((scale, i) => (
        <div key={i} style={{
          position: 'absolute',
          left: origin.x, top: origin.y,
          width: radius * 2 * scale,
          height: radius * 2 * scale,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          background: i === 0 ? nextBg : 'transparent',
          border: i > 0 ? `1.5px solid ${nextBg}` : 'none',
          opacity: i === 0 ? 0.95 : 0.25 - i * 0.05,
        }} />
      ))}
    </div>
  )
}

export default function Sidebar({ setShowApply }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const [userRole, setUserRole] = useState('public')
  const [username, setUsername] = useState('')
  const [ripple, setRipple] = useState(null)
  const holding = useRef(false)
  const logoRef = useRef(null)

  useEffect(() => {
    if (!user?.id) return
    supabase.from('users').select('role, username').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) { setUserRole(data.role || 'public'); setUsername(data.username || '') }
      })
  }, [user?.id])

  const badge = ROLE_BADGE[userRole] || ROLE_BADGE.public
  const currentPath = location.pathname

  const startHold = useCallback((e) => {
    if (ripple) return
    const rect = logoRef.current?.getBoundingClientRect()
    const origin = {
      x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
    }
    holding.current = true
    setRipple({ origin, theme })
  }, [theme, ripple])

  const cancelHold = useCallback(() => {
    holding.current = false
  }, [])

  const handleNav = (item) => {
    if (item.id === 'apply') { setShowApply?.(true); return }
    if (item.path) navigate(item.path)
  }

  return (
    <div className="sidebar">
      {ripple && (
        <ThemeRipple
          origin={ripple.origin}
          theme={ripple.theme}
          holding={holding}
          onSwitch={() => {
            toggleTheme()
            setTimeout(() => setRipple(null), 900)
          }}
        />
      )}
      <div
        className="logo"
        ref={logoRef}
        style={{ padding: '16px 20px', display: 'flex', justifyContent: 'center', cursor: 'pointer', userSelect: 'none' }}
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
      >
        <img
          src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
          alt="MINT"
          style={{ height: 28, width: 'auto', display: 'block', pointerEvents: 'none' }}
        />
      </div>

      <div className="nav">
        {NAV.map((n, i) => {
          if (n.section) {
            return (
              <div key={`sec-${i}`} className="nav-section">{n.section}</div>
            )
          }
          const active = currentPath === n.path || (n.path !== '/feed' && currentPath.startsWith(n.path))
          return (
            <div
              key={n.id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => handleNav(n)}
              style={n.accent && active ? { color: n.accent } : undefined}
            >
              <n.Icon size={14} color={n.accent && active ? n.accent : undefined} />
              {n.label}
              {n.id === 'live' && (
                <span style={{
                  marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%',
                  background: '#e84848', display: 'inline-block',
                  boxShadow: '0 0 4px #e84848',
                }} />
              )}
            </div>
          )
        })}

        {/* Apply to OSINT — only for public/reporter */}
        {(userRole === 'public' || userRole === 'reporter') && (
          <>
            <div className="nav-section">OSINT</div>
            <div className="nav-item" onClick={() => setShowApply?.(true)}>
              <Plus size={14} />
              Apply for OSINT
            </div>
          </>
        )}
      </div>

      <div className="sidebar-bottom">
        <div className="user-card">
          <div className="avatar">{username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}</div>
          <div>
            <div className="user-name">{username || user?.email || 'User'}</div>
            <div className="user-role" style={{ color: badge.color, display: 'flex', alignItems: 'center', gap: 4 }}>
              <badge.Icon size={10} /> {badge.label}
            </div>
          </div>
        </div>
        <button
          onClick={async () => { await signOut(); navigate('/login') }}
          style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', cursor: 'pointer', letterSpacing: 1, background: 'none', border: 'none', padding: 0, textAlign: 'left' }}
        >
          <LogOut size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} /> SIGN OUT
        </button>
      </div>
    </div>
  )
}
