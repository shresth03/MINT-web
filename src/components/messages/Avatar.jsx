// Accent circle with the user's initial
export default function Avatar({ username, size = 38, fontSize = 14 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'var(--accent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize, fontWeight: 700, color: 'var(--bg)',
      flexShrink: 0, fontFamily: 'var(--mono)',
    }}>
      {username?.[0]?.toUpperCase() || '?'}
    </div>
  )
}
