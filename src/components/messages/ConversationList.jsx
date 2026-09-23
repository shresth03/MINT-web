import Avatar from './Avatar'
import UserName from './UserName'
import { timeAgo } from './messageTime'

function UnreadBadge({ count }) {
  return (
    <span
      aria-label={`${count} unread`}
      style={{
        flexShrink: 0, minWidth: 18, height: 18, padding: '0 6px', borderRadius: 9,
        background: 'var(--accent)', color: 'var(--bg)',
        fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}

function ConversationRow({ conv, isActive, isMobile, currentUserId, onOpen }) {
  const other = conv.otherUser
  // The open chat is being read, so never badge it
  const unread = isActive ? 0 : conv.unreadCount || 0
  const badge = unread > 0 && <UnreadBadge count={unread} />
  const name = <UserName user={other} fontWeight={unread ? 700 : 600} />

  return (
    <div
      onClick={() => onOpen(conv)}
      style={{
        display: 'flex', gap: 10,
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
        cursor: 'pointer', transition: 'background 0.15s',
        background: isActive ? 'var(--active-bg)' : 'transparent',
      }}
      onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface2)' }}
      onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      <Avatar username={other?.username} />
      {isMobile ? (
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {name}
          {badge}
        </div>
      ) : (
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            {name}
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 9, whiteSpace: 'nowrap',
              color: unread ? 'var(--accent)' : 'var(--muted)', fontWeight: unread ? 700 : 400,
            }}>
              {timeAgo(conv.last_message_at)}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <div style={{
              fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
              color: unread ? 'var(--text)' : 'var(--muted)', fontWeight: unread ? 600 : 400,
            }}>
              {conv.last_message ? (
                <>
                  {conv.lastSenderId === currentUserId && <span style={{ color: 'var(--text)', fontWeight: 500 }}>You: </span>}
                  {conv.last_message}
                </>
              ) : 'No messages yet'}
            </div>
            {badge}
          </div>
        </div>
      )}
    </div>
  )
}

export default function ConversationList({ conversations, loading, activeConvId, isMobile, hidden, currentUserId, onOpen }) {
  // Total shown in the header; the open chat counts as read
  const listUnread = conversations.reduce(
    (sum, c) => sum + (c.id === activeConvId ? 0 : c.unreadCount || 0), 0)

  return (
    <div style={{
      width: isMobile ? '100%' : 280,
      minWidth: isMobile ? 'unset' : 280,
      borderRight: isMobile ? 'none' : '1px solid var(--border)',
      display: hidden ? 'none' : 'flex',
      flexDirection: 'column', overflow: 'hidden',
    }}>
      <div style={{
        padding: 16, borderBottom: '1px solid var(--border)',
        fontFamily: 'var(--mono)', fontSize: 10,
        letterSpacing: 2, color: 'var(--muted)', flexShrink: 0,
      }}>
        CONVERSATIONS
        {listUnread > 0 && (
          <> · <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{listUnread} UNREAD</span></>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 20, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
            LOADING...
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 20, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 2 }}>
            No conversations yet.<br />Visit a channel profile and click Message.
          </div>
        ) : conversations.map(conv => (
          <ConversationRow
            key={conv.id}
            conv={conv}
            isActive={activeConvId === conv.id}
            isMobile={isMobile}
            currentUserId={currentUserId}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  )
}
