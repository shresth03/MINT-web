// Styles shared by the admin dashboard and its tabs.

export const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 20px', marginBottom: 12, transition: 'border-color 0.15s' }
export const fieldLabel = { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }
export const fieldValue = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, fontFamily: 'var(--sans)' }
export const sectionTitle = { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }
export const emptyState = { textAlign: 'center', padding: 40, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }
export const avatarStyle = { width: 38, height: 38, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--bg)', flexShrink: 0, fontFamily: 'var(--mono)' }

export function actionBtn(variant) {
  const map = {
    approve:    { bg: 'var(--verified)',  color: '#000',            border: 'var(--verified)' },
    reject:     { bg: 'transparent',      color: 'var(--accent2)',  border: 'var(--accent2)' },
    verified:   { bg: 'var(--verified)',  color: '#000',            border: 'var(--verified)' },
    false:      { bg: 'transparent',      color: '#ff4757',         border: '#ff4757' },
    developing: { bg: 'transparent',      color: 'var(--accent)',   border: 'var(--accent)' },
    reversed:   { bg: 'transparent',      color: 'var(--warn)',     border: 'var(--warn)' },
  }
  const s = map[variant] || map.reject
  return {
    padding: '7px 18px', borderRadius: 4, fontFamily: 'var(--mono)',
    fontSize: 10, letterSpacing: 1, cursor: 'pointer',
    border: `1px solid ${s.border}`, background: s.bg, color: s.color,
    transition: 'all 0.15s', fontWeight: 600,
  }
}

export const inputStyle = {
  width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4,
  padding: '8px 12px', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 12,
  outline: 'none', boxSizing: 'border-box',
}
