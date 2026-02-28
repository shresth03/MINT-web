import { useState } from 'react'
import { usePosts } from '../../hooks/usePosts'
import { useAuth } from '../../hooks/useAuth'

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

export default function GeneralFeed() {
  const { posts, loading, createPost, likePost } = usePosts()
  const { user } = useAuth()
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const handlePost = async () => {
    if (!body.trim()) return
    if (body.length > 500) {
      setError('Post must be under 500 characters')
      return
    }
    setPosting(true)
    setError('')
    const { error } = await createPost(body.trim(), user.id)
    if (error) {
      setError(error.message)
    } else {
      setBody('')
    }
    setPosting(false)
  }

  return (
    <>
      <div className="section-header">
        <span className="section-label">Public Discussion</span>
      </div>

      <div style={{ padding:"10px 16px 10px", borderBottom:"1px solid var(--border)" }}>
        <textarea
          placeholder="Share your thoughts, analysis, or open-source finds..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          style={{ width:"100%", background:"var(--surface)", border:"1px solid var(--border)", borderRadius:4, padding:"10px 12px", color:"var(--text)", fontFamily:"'IBM Plex Sans', sans-serif", fontSize:12, resize:"none", height:70, outline:"none" }}
        />
        {error && (
          <div style={{ fontSize:10, color:"var(--accent2)", fontFamily:"var(--mono)", marginTop:4 }}>
            {error}
          </div>
        )}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 }}>
          <span style={{ fontSize:9, color:"var(--muted)", fontFamily:"var(--mono)" }}>
            {body.length}/500
          </span>
          <button
            onClick={handlePost}
            disabled={posting || !body.trim()}
            className="topbar-btn primary"
            style={{ fontSize:10, padding:"4px 12px", opacity: posting || !body.trim() ? 0.5 : 1 }}
          >
            {posting ? 'POSTING...' : 'POST'}
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ padding:20, textAlign:"center", fontFamily:"var(--mono)", fontSize:10, color:"var(--muted)" }}>
          LOADING...
        </div>
      ) : posts.length === 0 ? (
        <div style={{ padding:20, textAlign:"center", fontFamily:"var(--mono)", fontSize:10, color:"var(--muted)" }}>
          No posts yet. Be the first!
        </div>
      ) : (
        posts.map(post => (
          <div key={post.id} className="post-card">
            <div className="post-header">
              <div className="post-avatar" style={{ background:"#1a3050" }}>
                {post.users?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="post-author">{post.users?.username || 'Unknown'}</div>
                <div className="post-handle">@{post.users?.username || 'unknown'}</div>
              </div>
              <div className="post-time">{timeAgo(post.created_at)}</div>
            </div>
            <div className="post-body">{post.body}</div>
            <div className="post-actions">
              <span className="post-action" onClick={() => likePost(post.id, post.likes || 0)}>
                ♡ {post.likes || 0}
              </span>
              <span className="post-action">↩ {post.reply_count || 0}</span>
              <span className="post-action">↗ Share</span>
            </div>
          </div>
        ))
      )}
    </>
  )
}