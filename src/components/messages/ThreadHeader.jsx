import { useNavigate } from 'react-router-dom'
import Avatar from './Avatar'
import UserName from './UserName'

// Who you're talking to, above the messages (desktop only)
export default function ThreadHeader({ otherUser }) {
  const navigate = useNavigate()
  return (
    <div style={{
      padding: '14px 20px', borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center', gap: 12,
      flexShrink: 0, background: 'var(--surface)',
    }}>
      <Avatar username={otherUser?.username} size={36} fontSize={13} />
      <div>
        <UserName user={otherUser} fontSize={12} badgeGap={4} />
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
          {otherUser?.role?.toUpperCase() || 'USER'}
        </div>
      </div>
      <button
        onClick={() => navigate(`/channel/${otherUser?.username}`)}
        style={{
          marginLeft: 'auto', background: 'transparent',
          border: '1px solid var(--border)', borderRadius: 4,
          padding: '5px 12px', fontFamily: 'var(--mono)',
          fontSize: 9, color: 'var(--muted)', cursor: 'pointer', letterSpacing: 1,
        }}
      >
        VIEW PROFILE →
      </button>
    </div>
  )
}
