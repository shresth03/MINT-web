import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Heart, CornerUpLeft, Repeat2, UserPlus, Mail, AtSign, BadgeCheck, Gauge, Bell, Inbox } from 'lucide-react'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

function notifIcon(type) {
    switch(type) {
      case 'like':                 return { Icon: Heart,       color: '#e05577' }
      case 'reply':                return { Icon: CornerUpLeft, color: 'var(--accent)' }
      case 'repost':               return { Icon: Repeat2,     color: 'var(--verified)' }
      case 'follow':               return { Icon: UserPlus,    color: 'var(--warn)' }
      case 'message':              return { Icon: Mail,        color: '#a78bfa' }
      case 'mention':              return { Icon: AtSign,      color: 'var(--accent)' }
      case 'application_approved': return { Icon: BadgeCheck,  color: 'var(--verified)' }
      case 'score_override':       return { Icon: Gauge,       color: 'var(--accent)' }
      default:                     return { Icon: Bell,        color: 'var(--muted)' }
    }
  }
  
  function notifText(n) {
    const name = n.from_user?.username || 'Someone'
    switch(n.type) {
      case 'like':                 return `${name} liked your post`
      case 'reply':                return `${name} replied to your post`
      case 'repost':               return `${name} reposted your post`
      case 'follow':               return `${name} started following you`
      case 'message':              return `${name} sent you a message`
      case 'mention':              return `${name} mentioned you in a reply`
      case 'application_approved': return 'Your OSINT application was approved'
      case 'score_override':       return 'Your credibility score was updated by an admin'
      default:                     return `New notification from ${name}`
    }
  }

export default function NotificationPanel({ notifications, unreadCount, onMarkAllRead, onMarkRead, onClose }) {
  const panelRef = useRef(null)
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleNotifClick(n) {
    onMarkRead(n.id)
    if (n.type === 'follow') {
        navigate(`/channel/${n.from_user?.username}`)
      } else if (n.type === 'message') {
        navigate(`/messages?user=${n.from_user_id}`)
      } else if (n.post_id) {
        navigate('/feed')
      }
    onClose()
  }

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute',
        top: 52,
        right: 20,
        width: 360,
        maxHeight: 480,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 11,
          letterSpacing: 2, color: 'var(--accent)'
        }}>
          NOTIFICATIONS
          {unreadCount > 0 && (
            <span style={{
              marginLeft: 8, background: 'var(--accent2)',
              color: '#fff', fontSize: 9, padding: '1px 6px',
              borderRadius: 10, fontWeight: 700
            }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllRead}
            style={{
              background: 'none', border: 'none',
              fontFamily: 'var(--mono)', fontSize: 9,
              color: 'var(--muted)', cursor: 'pointer',
              letterSpacing: 1
            }}
          >
            MARK ALL READ
          </button>
        )}
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {notifications.length === 0 ? (
          <div style={{
            padding: 40, textAlign: 'center',
            fontFamily: 'var(--mono)', fontSize: 11,
            color: 'var(--muted)', letterSpacing: 1
          }}>
            <Inbox size={24} style={{ marginBottom: 12, opacity: 0.3 }} />
            No notifications yet
          </div>
        ) : (
          notifications.map(n => {
            const { Icon: NotifIcon, color } = notifIcon(n.type)
            return (
              <div
                key={n.id}
                onClick={() => handleNotifClick(n)}
                style={{
                  display: 'flex', gap: 12, padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  background: n.read ? 'transparent' : 'rgba(0,212,255,0.04)',
                  cursor: 'pointer', transition: 'background 0.15s'
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseOut={e => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(0,212,255,0.04)'}
              >
                {/* Icon */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: `${color}22`,
                  border: `1px solid ${color}44`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color, flexShrink: 0
                }}>
                  <NotifIcon size={15} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, lineHeight: 1.4, marginBottom: 4 }}>
                    {notifText(n)}
                  </div>
                  {n.posts?.body && (
                    <div style={{
                      fontSize: 11, color: 'var(--muted)',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap', marginBottom: 4
                    }}>
                      "{n.posts.body}"
                    </div>
                  )}
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 9,
                    color: 'var(--muted)'
                  }}>
                    {timeAgo(n.created_at)}
                  </div>
                </div>

                {/* Unread dot */}
                {!n.read && (
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--accent)', flexShrink: 0,
                    marginTop: 4
                  }} />
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}