import { useAuth } from '../../hooks/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../api/supabase'
import { useState, useEffect } from 'react'

const ROLE_BADGE = {
  osint:    { icon: '◆', label: 'OSINT ANALYST', color: 'var(--verified)' },
  reporter: { icon: '◈', label: 'REPORTER',       color: 'var(--accent)' },
  admin:    { icon: '⬡', label: 'ADMIN',           color: '#ff9f43' },
  public:   { icon: '○', label: 'PUBLIC',          color: 'var(--muted)' },
}

const NAV = [
  { section: 'Feed' },
  { id: 'feed',     path: '/feed',     label: 'Intel Feed',   icon: '◈' },
  { id: 'general',  path: '/feed',     label: 'General',      icon: '◇' },
  { id: 'trending', path: '/feed',     label: 'Trending',     icon: '↑' },
  { section: 'Media' },
  { id: 'articles', path: '/articles', label: 'Articles',     icon: '◎' },
  { id: 'live',     path: '/live',     label: 'Live',         icon: '▶', accent: '#e84848' },
  { id: 'reels',    path: '/reels',    label: 'Reels',        icon: '▲' },
  { section: 'OSINT' },
  { id: 'search',   path: '/search',   label: 'Search',       icon: '⊙' },
  { id: 'messages', path: '/messages', label: 'Messages',     icon: '✉' },
  { section: 'Account' },
  { id: 'profile',  path: '/profile',  label: 'My Profile',   icon: '○' },
]

export default function Sidebar({ setShowApply }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userRole, setUserRole] = useState('public')
  const [username, setUsername] = useState('')

  useEffect(() => {
    if (!user?.id) return
    supabase.from('users').select('role, username').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) { setUserRole(data.role || 'public'); setUsername(data.username || '') }
      })
  }, [user?.id])

  const badge = ROLE_BADGE[userRole] || ROLE_BADGE.public
  const currentPath = location.pathname

  const handleNav = (item) => {
    if (item.id === 'apply') { setShowApply?.(true); return }
    if (item.path) navigate(item.path)
  }

  return (
    <div className="sidebar">
      <div className="logo">
        <div className="logo-icon">⬡</div>
        <div>
          <div className="logo-text">MINT</div>
          <div className="logo-sub">OPEN SOURCE INTEL NETWORK</div>
        </div>
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
              <span style={{ fontSize: 12, color: n.accent && active ? n.accent : undefined }}>{n.icon}</span>
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
              <span style={{ fontSize: 12 }}>⊕</span>
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
            <div className="user-role" style={{ color: badge.color }}>
              {badge.icon} {badge.label}
            </div>
          </div>
        </div>
        <div
          onClick={async () => { await signOut(); navigate('/login') }}
          style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', cursor: 'pointer', letterSpacing: 1 }}
        >
          ⊗ SIGN OUT
        </div>
      </div>
    </div>
  )
}
