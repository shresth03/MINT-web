import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import TimeStamp from '../../components/TimeStamp'
import { card, fieldLabel, fieldValue, sectionTitle, emptyState, avatarStyle, actionBtn, inputStyle } from './adminStyles'

const SOURCES = [
  { id: null,        label: 'All' },
  { id: 'review',    label: 'Rejected in review' },
  { id: 'moderator', label: 'Removed by a moderator' },
  { id: 'reports',   label: 'Removed after reports' },
]
const SOURCE_LABEL = { review: 'REVIEW', moderator: 'MODERATOR', reports: 'REPORTS' }

// Posts with moderation_status 'removed' (mod_get_removed_posts): who removed
// them, why, when and where from. Restoring (mod_restore_post) makes the post
// visible again and is logged to the audit log.
export default function RemovedPostsTab({ posts, loading, source, onSource, onRestore }) {
  const [reasons, setReasons] = useState({})
  const [processing, setProcessing] = useState(null)
  const [errors, setErrors] = useState({})

  async function restore(post) {
    setProcessing(post.post_id)
    setErrors(prev => ({ ...prev, [post.post_id]: '' }))
    const { error } = await onRestore(post.post_id, (reasons[post.post_id] || '').trim() || null)
    if (error) setErrors(prev => ({ ...prev, [post.post_id]: error.message }))
    setProcessing(null)
  }

  return (
    <>
      <div role="group" aria-label="Filter by source" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {SOURCES.map(s => {
          const on = source === s.id
          return (
            <button
              key={s.label}
              aria-pressed={on}
              onClick={() => onSource(s.id)}
              style={{
                padding: '6px 12px', borderRadius: 14, cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1,
                border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                background: on ? 'var(--active-bg)' : 'transparent',
                color: on ? 'var(--accent)' : 'var(--muted)',
              }}
            >
              {s.label}
            </button>
          )
        })}
      </div>

      <div style={sectionTitle}>Removed ({posts.length})<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>

      {loading ? <div style={emptyState}>LOADING...</div>
        : posts.length === 0 ? <div style={emptyState}>No removed posts</div>
        : posts.map(post => (
          <div key={post.post_id} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={avatarStyle}>{post.author_username?.[0]?.toUpperCase() || 'U'}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{post.author_username || 'Unknown'}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  {post.post_type === 'news' ? 'News · ' : ''}posted <TimeStamp value={post.created_at} />
                </div>
              </div>
              <span style={{
                marginLeft: 'auto', padding: '3px 10px', borderRadius: 10,
                fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, letterSpacing: 1,
                color: 'var(--accent2)', border: '1px solid var(--accent2)',
              }}>
                {SOURCE_LABEL[post.source] || 'REMOVED'}
              </span>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={fieldLabel}>Post body</div>
              <div style={{ ...fieldValue, whiteSpace: 'pre-wrap' }}>{post.body}</div>
            </div>
            {post.media_url && (
              <img src={post.media_url} alt="attachment" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 8, display: 'block' }} />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, margin: '10px 0' }}>
              <div>
                <div style={fieldLabel}>Reason</div>
                <div style={fieldValue}>{post.reason || '—'}</div>
              </div>
              <div>
                <div style={fieldLabel}>Removed by</div>
                <div style={fieldValue}>{post.removed_by_username || 'Not recorded'}</div>
              </div>
              <div>
                <div style={fieldLabel}>Removed</div>
                <div style={fieldValue}>{post.removed_at ? <TimeStamp value={post.removed_at} /> : 'Not recorded'}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                aria-label="Restore reason"
                placeholder="Reason for restoring (optional)"
                value={reasons[post.post_id] || ''}
                onChange={e => setReasons(prev => ({ ...prev, [post.post_id]: e.target.value }))}
                style={{ ...inputStyle, flex: '1 1 200px', width: 'auto' }}
              />
              <button style={actionBtn('approve')} disabled={processing === post.post_id} onClick={() => restore(post)}>
                <RotateCcw size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {processing === post.post_id ? '...' : 'RESTORE'}
              </button>
            </div>
            {errors[post.post_id] && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)', marginTop: 8 }}>⚠ {errors[post.post_id]}</div>
            )}
          </div>
        ))
      }
    </>
  )
}
