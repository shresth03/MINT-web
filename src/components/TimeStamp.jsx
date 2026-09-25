import { postTime, compactTime, fullTimestamp } from '../lib/postTime'

// A time as it reads across MINT: "12m ago" / "Yesterday · 7:57 PM" /
// "23 Aug · 9:57 PM" (or the compact "12m" / "Yesterday" / "23 Aug").
// Hover shows the full date, time and zone plus UTC. Takes the parent's font.
export default function TimeStamp({ value, compact = false, dateOnly = false, style }) {
  const d = new Date(value)
  if (!value || Number.isNaN(d.getTime())) return null
  return (
    <time dateTime={d.toISOString()} title={fullTimestamp(value)} style={{ cursor: 'help', ...style }}>
      {dateOnly
        ? d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
        : compact ? compactTime(value) : postTime(value)}
    </time>
  )
}
