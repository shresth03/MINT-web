import { useState } from 'react'
import { Check } from 'lucide-react'

const VOTE_ERRORS = {
  poll_closed: 'This poll has closed.',
  already_voted: "You've already voted on this poll.",
}

function timeLeft(endsAt) {
  const ms = new Date(endsAt) - Date.now()
  if (ms <= 0) return null
  const mins = Math.ceil(ms / 60000)
  if (mins < 60) return `${mins}m left`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h left`
  return `${Math.floor(hours / 24)}d left`
}

// A post's poll, as returned by poll_get_for_posts. Votes are final, so once
// the viewer has voted (or the poll has ended) it switches to results.
export default function PostPoll({ poll, onVote }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  const left = timeLeft(poll.ends_at)
  const closed = poll.is_closed || !left
  const showResults = closed || poll.my_option_id != null
  const total = poll.total_votes || 0

  async function vote(optionId) {
    setPending(true)
    setError('')
    const { error: err } = await onVote(optionId)
    setPending(false)
    if (err) setError(VOTE_ERRORS[err.message] || "Couldn't record your vote. Try again.")
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
      {(poll.options || []).map(o => {
        if (!showResults) {
          return (
            <button
              key={o.id}
              type="button"
              disabled={pending}
              onClick={() => vote(o.id)}
              style={{
                width: '100%', textAlign: 'left', padding: '8px 12px',
                borderRadius: 6, border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text)',
                fontFamily: 'var(--sans)', fontSize: 13,
                cursor: pending ? 'wait' : 'pointer', opacity: pending ? 0.6 : 1,
              }}
            >
              {o.label}
            </button>
          )
        }
        const pct = total ? Math.round((o.votes / total) * 100) : 0
        const mine = o.id === poll.my_option_id
        return (
          <div
            key={o.id}
            aria-label={`${o.label}: ${pct}%${mine ? ', your vote' : ''}`}
            style={{
              position: 'relative', overflow: 'hidden', padding: '8px 12px',
              borderRadius: 6, border: `1px solid ${mine ? 'var(--accent)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--text)',
            }}
          >
            <div style={{
              position: 'absolute', inset: 0, width: `${pct}%`,
              background: 'var(--accent)', opacity: mine ? 0.18 : 0.1,
            }} />
            <span style={{ position: 'relative', flex: 1 }}>{o.label}</span>
            {mine && <Check size={14} style={{ position: 'relative', color: 'var(--accent)' }} />}
            <span style={{ position: 'relative', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
              {pct}%
            </span>
          </div>
        )
      })}

      {error && (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)' }}>⚠ {error}</div>
      )}
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
        {total} {total === 1 ? 'vote' : 'votes'} · {closed ? 'Final results' : left}
      </div>
    </div>
  )
}
