import { useState } from 'react'
import { Check, X } from 'lucide-react'
import TimeStamp from '../../components/TimeStamp'
import { card, fieldLabel, fieldValue, sectionTitle, emptyState, avatarStyle, actionBtn, inputStyle } from './adminStyles'

// Posts the News check couldn't decide on, waiting for a moderator
// (mod_get_pending_posts). Approving publishes the post; rejecting removes it
// with a reason, which the author sees and which lands in Removed Posts.
export default function NewsReviewTab({ posts, loading, onReview }) {
  const [reasons, setReasons] = useState({})
  const [processing, setProcessing] = useState(null)
  const [errors, setErrors] = useState({})

  async function review(post, approve) {
    const reason = (reasons[post.post_id] || '').trim()
    if (!approve && !reason) {
      setErrors(prev => ({ ...prev, [post.post_id]: 'Add a reason before rejecting.' }))
      return
    }
    setProcessing(post.post_id)
    setErrors(prev => ({ ...prev, [post.post_id]: '' }))
    const { error } = await onReview(post.post_id, approve, reason || null)
    if (error) setErrors(prev => ({ ...prev, [post.post_id]: error.message }))
    setProcessing(null)
  }

  return (
    <>
      <div style={sectionTitle}>⚑ Pending Review ({posts.length})<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>

      {loading ? <div style={emptyState}>LOADING...</div>
        : posts.length === 0 ? <div style={emptyState}>No posts awaiting review</div>
        : posts.map(post => (
          <div key={post.post_id} style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={avatarStyle}>{post.author_username?.[0]?.toUpperCase() || 'U'}</div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{post.author_username || 'Unknown'}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{post.author_role || ''}</div>
              </div>
              <div style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                <TimeStamp value={post.created_at} />
              </div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <div style={fieldLabel}>Post body</div>
              <div style={{ ...fieldValue, whiteSpace: 'pre-wrap' }}>{post.body}</div>
            </div>
            {post.media_url && (
              <img src={post.media_url} alt="attachment" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 6, border: '1px solid var(--border)', marginBottom: 8, display: 'block' }} />
            )}
            <div style={{ marginTop: 12 }}>
              <div style={fieldLabel}>Reason (required to reject, shown to the author)</div>
              <input
                aria-label="Rejection reason"
                placeholder="e.g. Unverified claim"
                value={reasons[post.post_id] || ''}
                onChange={e => setReasons(prev => ({ ...prev, [post.post_id]: e.target.value }))}
                style={inputStyle}
              />
            </div>
            {errors[post.post_id] && (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)', marginTop: 8 }}>⚠ {errors[post.post_id]}</div>
            )}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button style={actionBtn('approve')} disabled={processing === post.post_id} onClick={() => review(post, true)}>
                <Check size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />APPROVE
              </button>
              <button style={actionBtn('reject')} disabled={processing === post.post_id} onClick={() => review(post, false)}>
                <X size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />REJECT
              </button>
            </div>
          </div>
        ))
      }
    </>
  )
}
