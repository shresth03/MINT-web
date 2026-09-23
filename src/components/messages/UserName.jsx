import { BadgeCheck } from 'lucide-react'

// Username in mono, green with a check for verified OSINT accounts
export default function UserName({ user, fontSize = 11, fontWeight = 600, badgeSize = 10, badgeGap = 3, style }) {
  const osint = user?.role === 'osint'
  return (
    <div style={{
      fontFamily: 'var(--mono)', fontSize, fontWeight,
      color: osint ? 'var(--verified)' : 'var(--text)',
      ...style,
    }}>
      {user?.username || 'Unknown'}
      {osint && <BadgeCheck size={badgeSize} style={{ color: 'var(--verified)', marginLeft: badgeGap }} />}
    </div>
  )
}
