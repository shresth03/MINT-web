import { Fragment, useEffect, useRef } from 'react'
import { Lock, Paperclip } from 'lucide-react'
import Avatar from './Avatar'
import UserName from './UserName'
import { dayLabel, clockTime, sameDay, startsGroup } from './messageTime'

const ROLE_LABEL = { osint: 'VERIFIED OSINT', admin: 'ADMIN' }

// Shown in place of messages when a conversation has none yet
function ConversationIntro({ otherUser, isGroup, groupName }) {
  if (isGroup) {
    return (
      <div style={{
        margin: 'auto', padding: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', gap: 8,
      }}>
        <Avatar username={groupName} group size={64} fontSize={24} />
        <UserName user={{ username: groupName }} fontSize={14} fontWeight={700} style={{ marginTop: 6 }} />
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: 0.5,
          color: 'var(--muted)', maxWidth: '36ch', marginTop: 4, lineHeight: 1.6,
        }}>
          This is the start of the group. Say hello!
        </div>
      </div>
    )
  }
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

// Security updates and other notices from the server, centred in the thread
function SystemLine({ msg, marginTop }) {
  return (
    <div style={{
      alignSelf: 'center', marginTop, marginBottom: 4,
      fontFamily: 'var(--mono)', fontSize: 9.5, letterSpacing: 0.5,
      color: 'var(--muted)', textAlign: 'center',
    }}>
      {msg.body}
    </div>
  )
}

function Attachments({ items, isSent }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
      {items.map(a => a.type === 'image' ? (
        <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
          <img src={a.url} alt={a.name || 'Image'} style={{ maxWidth: 240, maxHeight: 240, borderRadius: 10, display: 'block' }} />
        </a>
      ) : (
        <a
          key={a.url} href={a.url} target="_blank" rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: isSent ? 'var(--bg)' : 'var(--accent)', fontSize: 12,
          }}
        >
          <Paperclip size={12} aria-hidden="true" /> {a.name || (a.type === 'video' ? 'Video' : 'Attachment')}
        </a>
      ))}
    </div>
  )
}

// What the bubble says: the text, or why it can't be shown here
function BubbleContent({ msg, isSent }) {
  const muted = { fontStyle: 'italic', opacity: 0.75 }
  if (msg.deleted) {
    return <span style={muted}>{msg.removedByModerator ? 'Removed by a moderator' : 'Message deleted'}</span>
  }
  if (msg.encrypted) {
    return (
      <span style={{ ...muted, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <Lock size={12} aria-hidden="true" /> Encrypted message · open MINT on your phone to read it
      </span>
    )
  }
  return (
    <>
      {msg.body}
      {msg.attachments?.length > 0 && <Attachments items={msg.attachments} isSent={isSent} />}
    </>
  )
}

function MessageBubble({ msg, isSent, groupStart, groupEnd, marginTop, status, senderName }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: isSent ? 'flex-end' : 'flex-start',
      marginTop,
    }}>
      {senderName && groupStart && (
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)',
          margin: '0 0 3px 6px',
        }}>
          {senderName}
        </div>
      )}
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
        <BubbleContent msg={msg} isSent={isSent} />
      </div>
      {groupEnd && (
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9,
          color: 'var(--muted)', marginTop: 4,
        }}>
          {clockTime(msg.created_at)}
          {msg.edited && !msg.deleted && ' · Edited'}
          {status && ` · ${status}`}
        </div>
      )}
    </div>
  )
}

export default function MessageList({ messages, currentUserId, otherUser, isGroup = false, groupName, firstUnreadId }) {
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
        <ConversationIntro otherUser={otherUser} isGroup={isGroup} groupName={groupName} />
      ) : messages.map((msg, i) => {
        const prev = messages[i - 1]
        const next = messages[i + 1]
        const isSent = msg.sender_id === currentUserId
        const newDay = !prev || !sameDay(prev.created_at, msg.created_at)
        const isFirstUnread = msg.id === firstUnreadId
        const groupStart = startsGroup(prev, msg) || isFirstUnread
        const groupEnd = !next || startsGroup(msg, next) || next.id === firstUnreadId
        const marginTop = newDay || isFirstUnread ? 0 : groupStart ? 14 : 3
        if (msg.kind === 'system') {
          return (
            <Fragment key={msg.id}>
              {newDay && <Divider marginTop={i === 0 ? 0 : 18}>{dayLabel(msg.created_at)}</Divider>}
              <SystemLine msg={msg} marginTop={newDay ? 0 : 10} />
            </Fragment>
          )
        }
        return (
          <Fragment key={msg.id}>
            {newDay && <Divider marginTop={i === 0 ? 0 : 18}>{dayLabel(msg.created_at)}</Divider>}
            {isFirstUnread && <Divider accent marginTop={i === 0 || newDay ? 0 : 18}>New messages</Divider>}
            <MessageBubble
              senderName={isGroup && !isSent ? msg.sender?.username || 'Unknown' : null}
              msg={msg}
              isSent={isSent}
              groupStart={groupStart}
              groupEnd={groupEnd}
              marginTop={marginTop}
              status={isSent && !next ? (msg.read ? 'Seen' : 'Sent') : null}
            />
          </Fragment>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
