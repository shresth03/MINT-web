import { useNavigate, useLocation } from 'react-router-dom'
import { Rss, Search, MessageSquare, User, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { label: 'Feed',     Icon: Rss,           path: '/feed' },
  { label: 'Search',   Icon: Search,        path: '/search' },
  { label: 'Messages', Icon: MessageSquare, path: '/messages' },
  { label: 'Profile',  Icon: User,          path: '/profile' },
  { label: 'Settings', Icon: Settings,      path: '/settings' },
]

export default function MobileBottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <>
      <style>{`
        .sbn-wrap {
          display: none;
          position: fixed; bottom: 0; left: 0; right: 0;
          height: calc(56px + env(safe-area-inset-bottom, 0px));
          padding-bottom: env(safe-area-inset-bottom, 0px);
          background: var(--surface);
          border-top: 1px solid var(--border);
          z-index: 997;
          align-items: center;
          justify-content: space-around;
        }
        @media (max-width: 768px) { .sbn-wrap { display: flex; } }
        .sbn-btn {
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 3px; flex: 1; height: 100%;
          background: none; border: none; cursor: pointer;
          color: var(--muted);
          font-family: var(--mono); font-size: 9px;
          letter-spacing: 0.5px; text-transform: uppercase;
          transition: color 0.15s; padding: 0;
        }
        .sbn-btn.active { color: var(--accent); }
        .sbn-btn:active { opacity: 0.7; }
      `}</style>
      <div className="sbn-wrap">
        {NAV_ITEMS.map(({ label, Icon, path }) => {
          const active = pathname === path ||
            (path !== '/feed' && pathname.startsWith(path))
          return (
            <button
              key={path}
              className={`sbn-btn${active ? ' active' : ''}`}
              onClick={() => navigate(path)}
            >
              <Icon size={19} />
              <span>{label}</span>
            </button>
          )
        })}
      </div>
    </>
  )
}
