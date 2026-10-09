import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import TimeStamp from '../../components/TimeStamp'
import { card, fieldLabel, sectionTitle, emptyState, actionBtn, inputStyle } from './adminStyles'

const ERRORS = {
  term_already_blocked: 'That term (or a spelling of it) is already blocked.',
  empty_content: 'Enter a word or phrase.',
}

// Words and phrases no post may contain. The server checks every new post and
// edit against this list, matching case, spacing, punctuation and common
// substitutions ("b a d", "b.a.d", "b@d"), on whole words only.
export default function BlocklistTab({ terms, loading, onAdd, onRemove }) {
  const [term, setTerm] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')

  async function add(e) {
    e.preventDefault()
    if (!term.trim()) return
    setBusy(true)
    setError('')
    const { error: err } = await onAdd(term.trim(), reason.trim() || null)
    setBusy(false)
    if (err) { setError(ERRORS[err.message] || err.message); return }
    setTerm('')
    setReason('')
  }

  async function remove(id) {
    setError('')
    const { error: err } = await onRemove(id)
    if (err) setError(err.message)
  }

  const q = filter.trim().toLowerCase()
  const shown = q ? terms.filter(t => t.term.toLowerCase().includes(q) || (t.reason || '').toLowerCase().includes(q)) : terms

  return (
    <>
      <form onSubmit={add} style={{ ...card, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 180px' }}>
          <div style={fieldLabel}>Word or phrase</div>
          <input aria-label="Blocked word or phrase" value={term} maxLength={100} onChange={e => setTerm(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ flex: '2 1 240px' }}>
          <div style={fieldLabel}>Reason shown to the author (optional)</div>
          <input aria-label="Reason" value={reason} maxLength={200} placeholder="This post contains blocked content." onChange={e => setReason(e.target.value)} style={inputStyle} />
        </div>
        <button type="submit" style={actionBtn('approve')} disabled={busy || !term.trim()}>{busy ? '...' : 'BLOCK'}</button>
      </form>
      {error && <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)', margin: '-4px 0 12px' }}>⚠ {error}</div>}

      <div style={sectionTitle}>Blocked ({terms.length})<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>
      {terms.length > 8 && (
        <input aria-label="Filter blocked terms" placeholder="Filter…" value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }} />
      )}

      {loading ? <div style={emptyState}>LOADING...</div>
        : shown.length === 0 ? <div style={emptyState}>{terms.length ? 'No matches' : 'Nothing blocked yet'}</div>
        : shown.map(t => (
          <div key={t.id} style={{ ...card, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--text)', wordBreak: 'break-word' }}>{t.term}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--sans)', marginTop: 2 }}>
                {t.reason || 'No reason given'} · {t.created_by_username || 'unknown'} · <TimeStamp value={t.created_at} />
              </div>
            </div>
            <button
              aria-label={`Unblock ${t.term}`}
              title="Unblock"
              onClick={() => remove(t.id)}
              style={{ ...actionBtn('reject'), padding: '6px 10px' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))
      }
    </>
  )
}
