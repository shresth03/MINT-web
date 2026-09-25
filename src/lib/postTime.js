// How times read across MINT ("smart mix"): recent posts feel
// live ("12m ago"), older ones say exactly when ("Yesterday · 7:57 PM",
// "23 Aug · 9:57 PM", "20 Aug 2025"). Follows the viewer's locale, time zone
// and 12/24-hour clock.

const MIN = 60 * 1000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const sameDay = (a, b) => a.toDateString() === b.toDateString()
const clock = d => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export function postTime(value, now = new Date()) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const ms = now - d  // negative if the server clock is a little ahead: treat as now

  if (ms < MIN) return 'Just now'
  if (ms < HOUR) return `${Math.floor(ms / MIN)}m ago`
  if (ms < 6 * HOUR && sameDay(d, now)) return `${Math.floor(ms / HOUR)}h ago`
  if (sameDay(d, now)) return `Today · ${clock(d)}`
  if (sameDay(d, new Date(now - DAY))) return `Yesterday · ${clock(d)}`
  if (d.getFullYear() === now.getFullYear()) {
    return `${d.toLocaleDateString([], { day: 'numeric', month: 'short' })} · ${clock(d)}`
  }
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
}

// Compact version for tight spaces (My Tell list, notifications, small
// counters), like messaging apps: "now", "12m", "5h", "9:24 AM",
// "Yesterday", "23 Aug", "Aug 2025"
export function compactTime(value, now = new Date()) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const ms = now - d

  if (ms < MIN) return 'now'
  if (ms < HOUR) return `${Math.floor(ms / MIN)}m`
  if (ms < 6 * HOUR && sameDay(d, now)) return `${Math.floor(ms / HOUR)}h`
  if (sameDay(d, now)) return clock(d)
  if (sameDay(d, new Date(now - DAY))) return 'Yesterday'
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
  return d.toLocaleDateString([], { month: 'short', year: 'numeric' })
}

// Full timestamp for hover: local date, time and zone, plus UTC for comparing
// with OSINT reports, e.g. "Sun, 23 Aug 2026, 9:57 PM CDT (24 Aug, 02:57 UTC)"
export function fullTimestamp(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const local = d.toLocaleString([], {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  })
  const utc = d.toLocaleString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return `${local} (${utc} UTC)`
}
