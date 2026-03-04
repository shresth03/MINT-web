import { useState, useEffect, useRef } from 'react'
import { usePosts } from '../../hooks/usePosts'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../api/supabase'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

function ReplyThread({ postId, onClose, createReply, fetchReplies }) {
  const { user } = useAuth()
  const [replies, setReplies] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadReplies()
    // Realtime subscription for this post's replies
    const sub = supabase
      .channel(`replies:${postId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'replies',
        filter: `post_id=eq.${postId}`
      }, payload => {
        fetchNewReply(payload.new.id)
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [postId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies])

  async function loadReplies() {
    const { data } = await fetchReplies(postId)
    setReplies(data)
    setLoading(false)
  }

  async function fetchNewReply(id) {
    const { data } = await supabase
      .from('replies')
      .select('*, users(username, role)')
      .eq('id', id)
      .single()
    if (data) setReplies(prev => [...prev, data])
  }

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    const { error } = await createReply(postId, body.trim())
    if (!error) setBody('')
    setSending(false)
  }

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg)',
      padding: '12px 16px',
    }}>
      {/* Reply list */}
      {loading ? (
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', padding:'8px 0' }}>
          LOADING REPLIES...
        </div>
      ) : replies.length === 0 ? (
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', padding:'8px 0' }}>
          No replies yet. Be the first.
        </div>
      ) : (
        <div style={{ marginBottom: 12 }}>
          {replies.map(r => (
            <div key={r.id} style={{
              display: 'flex',
              gap: 10,
              padding: '8px 0',
              borderBottom: '1px solid var(--border)',
            }}>
              {/* Thread line */}
              <div style={{
                width: 2,
                background: 'var(--border)',
                borderRadius: 2,
                flexShrink: 0,
                marginLeft: 6
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                  <span style={{
                    fontFamily:'var(--mono)', fontSize:11,
                    color: r.users?.role === 'osint' ? 'var(--verified)' :
                           r.users?.role === 'admin' ? 'var(--accent)' : 'var(--text)',
                    fontWeight: 600
                  }}>
                    {r.users?.username || 'Unknown'}
                    {r.users?.role === 'osint' && <span style={{color:'var(--verified)',marginLeft:4}}>◆</span>}
                  </span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)' }}>
                    {timeAgo(r.created_at)}
                  </span>
                </div>
                <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>
                  {r.body}
                </div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Reply composer */}
      <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
        <div style={{
          width:28, height:28, borderRadius:'50%',
          background:'linear-gradient(135deg,#1e3a5f,#0d6efd)',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:11, fontWeight:700, color:'white', flexShrink:0
        }}>
          {user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="Write a reply..."
          maxLength={500}
          rows={2}
          style={{
            flex:1, background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:6, padding:'8px 10px', color:'var(--text)',
            fontFamily:'IBM Plex Sans, sans-serif', fontSize:12,
            resize:'none', outline:'none', lineHeight:1.5
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
          }}
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending}
          style={{
            padding:'8px 14px', background:'var(--accent)', color:'#000',
            border:'none', borderRadius:4, fontFamily:'var(--mono)',
            fontSize:10, fontWeight:700, cursor:'pointer',
            opacity: (!body.trim() || sending) ? 0.4 : 1,
            letterSpacing:1, whiteSpace:'nowrap'
          }}
        >
          {sending ? '...' : 'REPLY'}
        </button>
      </div>
      <div style={{
        fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)',
        marginTop:6, marginLeft:36
      }}>
        {body.length}/500 · Cmd+Enter to send
      </div>
    </div>
  )
}

export default function GeneralFeed() {
  const { user } = useAuth()
  const { posts, loading, createPost, likePost, createReply, fetchReplies } = usePosts()
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [openThreads, setOpenThreads] = useState(new Set())

  async function handlePost() {
    if (!body.trim()) return
    if (body.length > 500) { setError('Max 500 characters'); return }
    setPosting(true)
    setError('')
    const { error } = await createPost(body.trim())
    if (error) setError(error.message)
    else setBody('')
    setPosting(false)
  }

  function toggleThread(postId) {
    setOpenThreads(prev => {
      const next = new Set(prev)
      next.has(postId) ? next.delete(postId) : next.add(postId)
      return next
    })
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>
      {/* Composer */}
      <div style={{
        padding:'16px', borderBottom:'1px solid var(--border)',
        background:'var(--surface)', flexShrink:0
      }}>
        <div style={{ display:'flex', gap:10 }}>
          <div style={{
            width:36, height:36, borderRadius:'50%',
            background:'linear-gradient(135deg,#1e3a5f,#0d6efd)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:13, fontWeight:700, color:'white', flexShrink:0
          }}>
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex:1 }}>
            <textarea
              value={body}
              onChange={e => { setBody(e.target.value); setError('') }}
              placeholder="Share intelligence, observations or analysis..."
              maxLength={500}
              rows={3}
              style={{
                width:'100%', background:'var(--bg)',
                border:'1px solid var(--border)', borderRadius:6,
                padding:'10px 12px', color:'var(--text)',
                fontFamily:'IBM Plex Sans, sans-serif', fontSize:13,
                resize:'none', outline:'none', lineHeight:1.6,
                transition:'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor='var(--accent)'}
              onBlur={e => e.target.style.borderColor='var(--border)'}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost()
              }}
            />
            <div style={{
              display:'flex', justifyContent:'space-between',
              alignItems:'center', marginTop:8
            }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <span style={{
                  fontFamily:'var(--mono)', fontSize:10,
                  color: body.length > 450 ? 'var(--accent2)' : 'var(--muted)'
                }}>
                  {body.length}/500
                </span>
                {error && (
                  <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)' }}>
                    ⚠ {error}
                  </span>
                )}
              </div>
              <button
                onClick={handlePost}
                disabled={!body.trim() || posting}
                style={{
                  padding:'7px 18px', background:'var(--accent)', color:'#000',
                  border:'none', borderRadius:4, fontFamily:'var(--mono)',
                  fontSize:10, fontWeight:700, letterSpacing:1,
                  cursor: (!body.trim() || posting) ? 'not-allowed' : 'pointer',
                  opacity: (!body.trim() || posting) ? 0.5 : 1,
                  transition:'all 0.15s'
                }}
              >
                {posting ? 'POSTING...' : 'POST'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {loading ? (
          <div style={{
            padding:40, textAlign:'center',
            fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)'
          }}>
            LOADING FEED...
          </div>
        ) : posts.length === 0 ? (
          <div style={{
            padding:40, textAlign:'center',
            fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)'
          }}>
            No posts yet. Be the first to share intelligence.
          </div>
        ) : (
          posts.map(post => (
            <div key={post.id} style={{
              borderBottom:'1px solid var(--border)',
              background:'var(--surface)'
            }}>
              {/* Post */}
              <div style={{ padding:'14px 16px' }}>
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{
                    width:36, height:36, borderRadius:'50%',
                    background:'linear-gradient(135deg,#1e3a5f,#0d6efd)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:13, fontWeight:700, color:'white', flexShrink:0
                  }}>
                    {post.users?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                      <span style={{
                        fontFamily:'var(--mono)', fontSize:12, fontWeight:600,
                        color: post.users?.role === 'osint' ? 'var(--verified)' :
                               post.users?.role === 'admin' ? 'var(--accent)' : 'var(--text)'
                      }}>
                        {post.users?.username || 'Unknown'}
                        {post.users?.role === 'osint' && (
                          <span style={{color:'var(--verified)',marginLeft:4,fontSize:10}}>◆</span>
                        )}
                      </span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>
                        {timeAgo(post.created_at)}
                      </span>
                    </div>
                    <div style={{ fontSize:13, lineHeight:1.6, marginBottom:10 }}>
                      {post.body}
                    </div>
                    {/* Actions */}
                    <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                      <button
                        onClick={() => likePost(post.id, post.likes || 0)}
                        style={{
                          background:'none', border:'none', cursor:'pointer',
                          display:'flex', alignItems:'center', gap:5,
                          fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)',
                          padding:0, transition:'color 0.15s'
                        }}
                        onMouseOver={e => e.currentTarget.style.color='#e05'}
                        onMouseOut={e => e.currentTarget.style.color='var(--muted)'}
                      >
                        ♡ {post.likes || 0}
                      </button>
                      <button
                        onClick={() => toggleThread(post.id)}
                        style={{
                          background:'none', border:'none', cursor:'pointer',
                          display:'flex', alignItems:'center', gap:5,
                          fontFamily:'var(--mono)', fontSize:11,
                          color: openThreads.has(post.id) ? 'var(--accent)' : 'var(--muted)',
                          padding:0, transition:'color 0.15s'
                        }}
                      >
                        ↩ {post.reply_count || 0}
                        {openThreads.has(post.id) ? ' ▲' : ' ▼'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reply Thread */}
              {openThreads.has(post.id) && (
                <ReplyThread
                  postId={post.id}
                  onClose={() => toggleThread(post.id)}
                  createReply={createReply}
                  fetchReplies={fetchReplies}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
