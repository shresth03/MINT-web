import { useAuth } from '../../hooks/useAuth'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../../api/supabase'
import { useState, useEffect } from 'react'
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

export default function Sidebar({ setShowApply }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { theme } = useTheme()
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
      <div className="logo" style={{ padding: '16px 20px', display: 'flex', justifyContent: 'center' }}>
        <img
          src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
          alt="MINT"
          style={{ height: 28, width: 'auto', display: 'block' }}
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
