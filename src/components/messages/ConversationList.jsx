import { useState } from 'react'
import { Search, X } from 'lucide-react'
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

// Brief highlight on a row when a new message arrives in it. The overlay is
// keyed by the message time, so each new message remounts it and replays
// the animation without any effect or timer.
const ARRIVED_CSS = `
  .conv-arrived {
    position: absolute; inset: 0; pointer-events: none;
    background: var(--topbar-hover);
    animation: conv-arrived 1.4s ease-out forwards;
  }
  @keyframes conv-arrived { from { opacity: 1; } to { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .conv-arrived { display: none; } }
`

function ConversationRow({ conv, isActive, currentUserId, listOpenedAt, onOpen }) {
  const other = conv.otherUser
  // The open chat is being read, so never badge it
  const unread = isActive ? 0 : conv.unreadCount || 0
  const badge = unread > 0 && <UnreadBadge count={unread} />
  const justArrived = !isActive
    && conv.lastSenderId && conv.lastSenderId !== currentUserId
    && new Date(conv.last_message_at).getTime() > listOpenedAt

  return (
    <div
      onClick={() => onOpen(conv)}
      style={{
        position: 'relative',
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
      {justArrived && <span key={conv.last_message_at} className="conv-arrived" aria-hidden="true" />}
      <Avatar username={other?.username} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
          <UserName user={other} fontWeight={unread ? 700 : 600} />
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
    </div>
  )
}

function matches(conv, query) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return (conv.otherUser?.username || '').toLowerCase().includes(q)
    || (conv.last_message || '').toLowerCase().includes(q)
}

function ConversationSearch({ value, onChange }) {
  return (
    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
        padding: '0 8px 0 10px', transition: 'border-color 0.15s',
      }}>
        <Search size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        {/* type="text" rather than "search": browsers add their own clear ×
            to search inputs, which doubled up with ours */}
        <input
          type="text"
          role="searchbox"
          enterKeyHint="search"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onChange('') }}
          placeholder="Search conversations"
          aria-label="Search conversations"
          style={{
            flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none',
            padding: '8px 0', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 12,
          }}
          onFocus={e => { e.target.parentElement.style.borderColor = 'var(--accent)' }}
          onBlur={e => { e.target.parentElement.style.borderColor = 'var(--border)' }}
        />
        {value && (
          <button
            onClick={() => onChange('')}
            aria-label="Clear search"
            style={{
              background: 'none', border: 'none', padding: 2, cursor: 'pointer',
              color: 'var(--muted)', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function ConversationList({ conversations, loading, activeConvId, isMobile, hidden, currentUserId, onOpen }) {
  const [query, setQuery] = useState('')
  // Rows only glow for messages that arrive after the list was opened
  const [listOpenedAt] = useState(() => Date.now())
  // Total shown in the header; the open chat counts as read
  const listUnread = conversations.reduce(
    (sum, c) => sum + (c.id === activeConvId ? 0 : c.unreadCount || 0), 0)
  const shown = conversations.filter(c => matches(c, query))

  return (
    <div style={{
      width: isMobile ? '100%' : 280,
      minWidth: isMobile ? 'unset' : 280,
      borderRight: isMobile ? 'none' : '1px solid var(--border)',
      display: hidden ? 'none' : 'flex',
      flexDirection: 'column', overflow: 'hidden',
    }}>
      <style>{ARRIVED_CSS}</style>
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
      {conversations.length > 0 && <ConversationSearch value={query} onChange={setQuery} />}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: 20, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
            LOADING...
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ padding: 20, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 2 }}>
            No conversations yet.<br />Visit a channel profile and click Message.
          </div>
        ) : shown.length === 0 ? (
          <div style={{ padding: 20, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 2 }}>
            No conversations match “{query.trim()}”.
          </div>
        ) : shown.map(conv => (
          <ConversationRow
            key={conv.id}
            conv={conv}
            isActive={activeConvId === conv.id}
            currentUserId={currentUserId}
            listOpenedAt={listOpenedAt}
            onOpen={onOpen}
          />
        ))}
      </div>
    </div>
  )
}
