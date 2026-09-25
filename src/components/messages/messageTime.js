export function dayLabel(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

export function clockTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function sameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

// Back-to-back messages from the same sender, on the same day and within
// 5 minutes of each other, render as one group with a single timestamp.
const GROUP_GAP_MS = 5 * 60 * 1000
export function startsGroup(prev, msg) {
  return !prev
    || prev.sender_id !== msg.sender_id
    || !sameDay(prev.created_at, msg.created_at)
    || new Date(msg.created_at) - new Date(prev.created_at) > GROUP_GAP_MS
}
