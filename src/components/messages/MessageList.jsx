import { Fragment, useEffect, useRef } from 'react'
import Avatar from './Avatar'
import UserName from './UserName'
import { dayLabel, clockTime, sameDay, startsGroup } from './messageTime'

const ROLE_LABEL = { osint: 'VERIFIED OSINT', admin: 'ADMIN' }

// Shown in place of messages when a conversation has none yet
function ConversationIntro({ otherUser }) {
  const role = otherUser?.role
  const roleColor = role === 'osint' ? 'var(--verified)' : role === 'admin' ? 'var(--accent)' : null
  return (
    <div style={{
      margin: 'auto', padding: 20,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      textAlign: 'center', gap: 8,
    }}>
      <Avatar username={otherUser?.username} size={64} fontSize={24} />
      <UserName user={otherUser} fontSize={14} fontWeight={700} badgeSize={12} badgeGap={4} style={{ marginTop: 6 }} />
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
        padding: '2px 8px', borderRadius: 10,
        color: roleColor || 'var(--muted)',
        border: `1px solid ${roleColor || 'var(--border)'}`,
      }}>
        {ROLE_LABEL[role] || 'PUBLIC USER'}
      </span>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: 0.5,
        color: 'var(--muted)', maxWidth: '36ch', marginTop: 4, lineHeight: 1.6,
      }}>
        This is the start of your conversation with @{otherUser?.username || 'them'}. Say hello!
      </div>
    </div>
  )
}

// Labelled rule across the thread: day separators and "New messages"
function Divider({ children, accent, marginTop }) {
  const line = { flex: 1, height: 1, background: accent ? 'var(--accent)' : 'var(--border)', opacity: accent ? 0.5 : 1 }
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      margin: `${marginTop}px 0 10px`,
      fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
      fontWeight: accent ? 700 : undefined,
      textTransform: 'uppercase', color: accent ? 'var(--accent)' : 'var(--muted)',
    }}>
      <span style={line} />
      {children}
      <span style={line} />
    </div>
  )
}

const R = 16, TIGHT = 4

function MessageBubble({ msg, isSent, groupStart, groupEnd, marginTop, status }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isSent ? 'flex-end' : 'flex-start',
      marginTop,
    }}>
      <div style={{
        maxWidth: '70%', padding: '10px 14px',
        fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
        wordBreak: 'break-word', fontFamily: 'var(--sans)',
        ...(isSent ? {
          background: 'var(--accent)', color: 'var(--bg)',
          borderRadius: `${R}px ${groupStart ? R : TIGHT}px ${groupEnd ? R : TIGHT}px ${R}px`,
        } : {
          background: 'var(--surface2)', color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: `${groupStart ? R : TIGHT}px ${R}px ${R}px ${groupEnd ? R : TIGHT}px`,
        })
      }}>
        {msg.body}
      </div>
      {groupEnd && (
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9,
          color: 'var(--muted)', marginTop: 4,
        }}>
          {clockTime(msg.created_at)}
          {status && ` · ${status}`}
        </div>
      )}
    </div>
  )
}

export default function MessageList({ messages, currentUserId, otherUser, firstUnreadId }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div style={{
      flex: 1, minHeight: 0, overflowY: 'auto',
      padding: 20, display: 'flex', flexDirection: 'column',
    }}>
      {messages.length === 0 ? (
        <ConversationIntro otherUser={otherUser} />
      ) : messages.map((msg, i) => {
        const prev = messages[i - 1]
        const next = messages[i + 1]
        const isSent = msg.sender_id === currentUserId
        const newDay = !prev || !sameDay(prev.created_at, msg.created_at)
        const isFirstUnread = msg.id === firstUnreadId
        const groupStart = startsGroup(prev, msg) || isFirstUnread
        const groupEnd = !next || startsGroup(msg, next) || next.id === firstUnreadId
        return (
          <Fragment key={msg.id}>
            {newDay && <Divider marginTop={i === 0 ? 0 : 18}>{dayLabel(msg.created_at)}</Divider>}
            {isFirstUnread && <Divider accent marginTop={i === 0 || newDay ? 0 : 18}>New messages</Divider>}
            <MessageBubble
              msg={msg}
              isSent={isSent}
              groupStart={groupStart}
              groupEnd={groupEnd}
              marginTop={newDay || isFirstUnread ? 0 : groupStart ? 14 : 3}
              status={isSent && !next ? (msg.read ? 'Seen' : 'Sent') : null}
            />
          </Fragment>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
