import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const NAV_ITEMS = [
    { id: "feed",     label: "Intel Feed",        icon: "◈", section: "Feed" },
    { id: "trending", label: "Trending",           icon: "↑", badge: "12" },
    { id: "map",      label: "Event Map",          icon: "◉" },
    { id: "verified", label: "Verified Sources",   icon: "◆", badge: "47", badgeClass: "green", section: "OSINT Channels" },
    { id: "pending",  label: "Under Review",       icon: "◇" },
    { id: "apply",    label: "Apply to Join",      icon: "⊕" },
    { id: "profile",  label: "My Profile",         icon: "○", section: "Account" },
    { id: "settings", label: "Settings",           icon: "≡" },
  ]
  
  export default function Sidebar({ navItem, setNavItem, setShowApply }) {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()

    const handleSignOut = async () => {
        await signOut()
        navigate('/login')
    }
    return (
    <div className="sidebar">
        <div className="logo">
            <div className="logo-icon">⬡</div>
                <div>
                    <div className="logo-text">SIGINT</div>
                    <div className="logo-sub">OPEN SOURCE INTEL NETWORK</div>
                </div>
            </div>
  
        <div className="nav">
          {NAV_ITEMS.map((n) => (
            <span key={n.id}>
              {n.section && (
                <div className="nav-section">{n.section}</div>
              )}
              <div
                className={`nav-item ${navItem === n.id ? "active" : ""}`}
                onClick={() => {
                  setNavItem(n.id)
                  if (n.id === "apply") setShowApply(true)
                }}
              >
                <span style={{ fontSize: 12 }}>{n.icon}</span>
                {n.label}
                {n.badge && (
                  <span className={`nav-badge ${n.badgeClass || ""}`}>
                    {n.badge}
                  </span>
                )}
              </div>
            </span>
          ))}
        </div>
  
        <div className="sidebar-bottom">
            <div className="user-card">
                <div className="avatar">
                    {user?.email?.[0].toUpperCase() || 'U'}
                </div>
                <div>
                    <div className="user-name">{user?.email || 'User'}</div>
                    <div className="user-role">PUBLIC_USER</div>
                </div>
            </div>
            <div
                onClick={handleSignOut}
                style={{ marginTop: 10, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', cursor: 'pointer', letterSpacing: 1 }}
            >
                ⊗ SIGN OUT
            </div>
        </div>
    </div>
    )
  }