import { Users } from 'lucide-react'

// Accent circle with the user's initial, or a people icon for a group
export default function Avatar({ username, group = false, size = 38, fontSize = 14 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 700, color: 'var(--bg)',
      flexShrink: 0, fontFamily: 'var(--mono)',
    }}>
      {group
        ? <Users size={Math.round(size * 0.45)} aria-hidden="true" />
        : username?.[0]?.toUpperCase() || '?'}
    </div>
  )
}
