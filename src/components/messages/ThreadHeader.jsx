import { useNavigate } from 'react-router-dom'
import { Lock } from 'lucide-react'
import Avatar from './Avatar'
import UserName from './UserName'

// Who you're talking to, above the messages (desktop only)
export default function ThreadHeader({ otherUser, conversation, name }) {
  const navigate = useNavigate()
  const isGroup = !!conversation?.isGroup
  const memberCount = conversation?.participants?.length || 0
  const subtitle = isGroup
    ? `${memberCount || ''} ${memberCount === 1 ? 'MEMBER' : 'MEMBERS'}`.trim()
    : otherUser?.role?.toUpperCase() || 'USER'

  return (
    <div style={{
      padding: '14px 20px', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 12,
      flexShrink: 0, background: 'var(--surface)',
    }}>
      <Avatar username={isGroup ? name : otherUser?.username} group={isGroup} size={36} fontSize={13} />
      <div>
        <UserName user={isGroup ? { username: name } : otherUser} fontSize={12} badgeGap={4} />
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginTop: 2,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {subtitle}
          {conversation?.isEncrypted && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
              · <Lock size={9} aria-hidden="true" /> ENCRYPTED
            </span>
          )}
        </div>
      </div>
      {!isGroup && otherUser?.username && (
        <button
          onClick={() => navigate(`/channel/${otherUser.username}`)}
          style={{
            marginLeft: 'auto', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 4,
            padding: '5px 12px', fontFamily: 'var(--mono)',
            fontSize: 9, color: 'var(--muted)', cursor: 'pointer', letterSpacing: 1,
          }}
        >
          VIEW PROFILE →
        </button>
      )}
    </div>
  )
}
