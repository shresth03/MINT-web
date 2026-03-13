import { useState, useEffect, useRef } from 'react'
import { usePosts } from '../../hooks/usePosts'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../api/supabase'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import { useClaims } from '../../hooks/useClaims'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

// ── Claim badge colours + labels ──────────────────────────────────────────────
const CLAIM_STYLE = {
  open:       { color: '#ff9f43', label: '⚑ OPEN CLAIM',  bg: 'rgba(255,159,67,0.08)'  },
  verified:   { color: '#00ff88', label: '✓ VERIFIED',    bg: 'rgba(0,255,136,0.08)'   },
  false:      { color: '#ff4757', label: '✗ FALSE',       bg: 'rgba(255,71,87,0.08)'   },
  developing: { color: '#00d4ff', label: '◎ DEVELOPING',  bg: 'rgba(0,212,255,0.08)'   },
  reversed:   { color: '#ffd32a', label: '⟳ REVERSED',   bg: 'rgba(255,211,42,0.08)'  },
}

// ── Community Note Modal ───────────────────────────────────────────────────────
function NoteModal({ post, onClose }) {
  const { user } = useAuth()
  const { claim, notes, userNote, claimVisible, challengeWeight, supportWeight, submitNote } = useClaims(post.id)
  const [stance, setStance] = useState('challenges')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [err, setErr] = useState('')

  async function handleSubmit() {
    if (!body.trim()) return
    setSubmitting(true)
    const { error } = await submitNote(body.trim(), stance)
    if (error) setErr(typeof error === 'string' ? error : error.message)
    else setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
      display:'flex', alignItems:'center', justifyContent:'center', zIndex:1100
    }} onClick={onClose}>
      <div style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:10, padding:24, width:500, maxWidth:'92vw',
        maxHeight:'85vh', overflowY:'auto'
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:2, color:'var(--accent)' }}>
            COMMUNITY NOTES
          </div>
          <button onClick={onClose} style={{
            background:'none', border:'none', color:'var(--muted)',
            cursor:'pointer', fontSize:18, lineHeight:1
          }}>×</button>
        </div>

        {/* Original post preview */}
        <div style={{
          background:'var(--bg)', border:'1px solid var(--border)',
          borderRadius:6, padding:12, marginBottom:16
        }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', marginBottom:6 }}>
            {post.users?.username || 'Unknown'} · {timeAgo(post.created_at)}
          </div>
          <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>
            {post.body.length > 200 ? post.body.slice(0, 200) + '…' : post.body}
          </div>
        </div>

        {/* Claim status if visible */}
        {claimVisible && claim && (
          <div style={{
            display:'flex', alignItems:'center', gap:8,
            padding:'8px 12px', borderRadius:6, marginBottom:16,
            background: CLAIM_STYLE[claim.status]?.bg || 'rgba(255,159,67,0.08)',
            border: `1px solid ${CLAIM_STYLE[claim.status]?.color || '#ff9f43'}22`
          }}>
            <span style={{
              fontFamily:'var(--mono)', fontSize:11, fontWeight:700,
              color: CLAIM_STYLE[claim.status]?.color || '#ff9f43'
            }}>
              {CLAIM_STYLE[claim.status]?.label || 'OPEN CLAIM'}
            </span>
            {claim.resolution_note && (
              <span style={{ fontSize:11, color:'var(--muted)', marginLeft:4 }}>
                — {claim.resolution_note}
              </span>
            )}
          </div>
        )}

        {/* Weight indicators */}
        <div style={{ display:'flex', gap:10, marginBottom:16 }}>
          <div style={{
            flex:1, padding:'8px 12px', background:'rgba(255,71,87,0.06)',
            border:'1px solid rgba(255,71,87,0.2)', borderRadius:6,
            fontFamily:'var(--mono)', fontSize:10, color:'#ff4757', textAlign:'center'
          }}>
            ⚑ CHALLENGING<br />
            <span style={{ fontSize:18, fontWeight:700 }}>{challengeWeight}</span>
            <span style={{ fontSize:9, color:'var(--muted)', display:'block' }}>weight / 5 needed</span>
          </div>
          <div style={{
            flex:1, padding:'8px 12px', background:'rgba(0,255,136,0.06)',
            border:'1px solid rgba(0,255,136,0.2)', borderRadius:6,
            fontFamily:'var(--mono)', fontSize:10, color:'var(--verified)', textAlign:'center'
          }}>
            ✓ SUPPORTING<br />
            <span style={{ fontSize:18, fontWeight:700 }}>{supportWeight}</span>
            <span style={{ fontSize:9, color:'var(--muted)', display:'block' }}>weight total</span>
          </div>
        </div>

        {/* Existing notes */}
        {notes.length > 0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:2,
              color:'var(--muted)', marginBottom:8
            }}>
              NOTES ({notes.length})
            </div>
            {notes.map(n => (
              <div key={n.id} style={{
                padding:'10px 12px', marginBottom:8,
                background:'var(--bg)', borderRadius:6,
                border:`1px solid ${n.stance === 'challenges' ? 'rgba(255,71,87,0.25)' : 'rgba(0,255,136,0.2)'}`,
              }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:6 }}>
                  <span style={{
                    fontFamily:'var(--mono)', fontSize:10, fontWeight:600,
                    color: n.users?.role === 'osint' ? 'var(--verified)' : 'var(--text)'
                  }}>
                    {n.users?.username || 'Unknown'}
                    {n.users?.role === 'osint' && <span style={{ color:'var(--verified)', marginLeft:3 }}>◆</span>}
                  </span>
                  <span style={{
                    fontFamily:'var(--mono)', fontSize:8, letterSpacing:1, padding:'1px 6px',
                    borderRadius:3,
                    background: n.stance === 'challenges' ? 'rgba(255,71,87,0.15)' : 'rgba(0,255,136,0.12)',
                    color: n.stance === 'challenges' ? '#ff4757' : 'var(--verified)'
                  }}>
                    {n.stance === 'challenges' ? '⚑ CHALLENGING' : '✓ SUPPORTING'}
                  </span>
                  {n.accuracy_rating && (
                    <span style={{
                      fontFamily:'var(--mono)', fontSize:8, letterSpacing:1, padding:'1px 6px',
                      borderRadius:3,
                      background: n.accuracy_rating === 'accurate' ? 'rgba(0,255,136,0.12)' : 'rgba(255,71,87,0.15)',
                      color: n.accuracy_rating === 'accurate' ? 'var(--verified)' : '#ff4757'
                    }}>
                      {n.accuracy_rating === 'accurate' ? '✓ RATED ACCURATE' : '✗ RATED INACCURATE'}
                    </span>
                  )}
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', marginLeft:'auto' }}>
                    wt:{n.weight}
                  </span>
                </div>
                <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>{n.body}</div>
              </div>
            ))}
          </div>
        )}

        {/* Write note — only if user hasn't written one yet */}
        {!submitted && !userNote ? (
          <div>
            <div style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:2,
              color:'var(--muted)', marginBottom:10
            }}>
              WRITE A NOTE
            </div>

            {/* Stance selector */}
            <div style={{ display:'flex', gap:8, marginBottom:12 }}>
              {['challenges', 'supports'].map(s => (
                <button key={s} onClick={() => setStance(s)} style={{
                  flex:1, padding:'8px 0',
                  background: stance === s
                    ? (s === 'challenges' ? 'rgba(255,71,87,0.15)' : 'rgba(0,255,136,0.12)')
                    : 'transparent',
                  border: `1px solid ${stance === s
                    ? (s === 'challenges' ? '#ff4757' : 'var(--verified)')
                    : 'var(--border)'}`,
                  borderRadius:4, fontFamily:'var(--mono)', fontSize:10,
                  color: stance === s
                    ? (s === 'challenges' ? '#ff4757' : 'var(--verified)')
                    : 'var(--muted)',
                  cursor:'pointer', letterSpacing:1
                }}>
                  {s === 'challenges' ? '⚑ CHALLENGES' : '✓ SUPPORTS'}
                </button>
              ))}
            </div>

            <textarea
              value={body}
              onChange={e => { setBody(e.target.value); setErr('') }}
              placeholder={
                stance === 'challenges'
                  ? 'Explain why this claim is inaccurate or misleading...'
                  : 'Provide additional context or corroboration...'
              }
              maxLength={500}
              rows={3}
              style={{
                width:'100%', background:'var(--bg)',
                border:'1px solid var(--border)', borderRadius:6,
                padding:'10px 12px', color:'var(--text)',
                fontFamily:'IBM Plex Sans, sans-serif', fontSize:12,
                resize:'none', outline:'none', boxSizing:'border-box',
                marginBottom:8
              }}
              onFocus={e => e.target.style.borderColor='var(--accent)'}
              onBlur={e => e.target.style.borderColor='var(--border)'}
            />

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)' }}>
                {body.length}/500
                {err && <span style={{ color:'var(--accent2)', marginLeft:8 }}>⚠ {err}</span>}
              </span>
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={onClose} style={{
                  padding:'7px 14px', background:'transparent',
                  border:'1px solid var(--border)', color:'var(--muted)',
                  borderRadius:4, fontFamily:'var(--mono)', fontSize:10, cursor:'pointer'
                }}>
                  CANCEL
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!body.trim() || submitting}
                  style={{
                    padding:'7px 16px',
                    background: stance === 'challenges' ? '#ff4757' : 'var(--verified)',
                    color:'#000', border:'none', borderRadius:4,
                    fontFamily:'var(--mono)', fontSize:10, fontWeight:700,
                    cursor: !body.trim() || submitting ? 'not-allowed' : 'pointer',
                    opacity: !body.trim() || submitting ? 0.5 : 1, letterSpacing:1
                  }}
                >
                  {submitting ? '...' : 'SUBMIT NOTE'}
                </button>
              </div>
            </div>
          </div>
        ) : submitted || userNote ? (
          <div style={{
            padding:'12px 16px', background:'rgba(0,255,136,0.06)',
            border:'1px solid rgba(0,255,136,0.2)', borderRadius:6,
            fontFamily:'var(--mono)', fontSize:11, color:'var(--verified)', textAlign:'center'
          }}>
            ✓ Your note has been submitted
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── ClaimBadge — lightweight, fetches its own claim ──────────────────────────
function ClaimBadge({ postId }) {
  const { claim, claimVisible } = useClaims(postId)
  if (!claimVisible || !claim) return null
  const s = CLAIM_STYLE[claim.status]
  if (!s) return null
  return (
    <div style={{
      display:'inline-flex', alignItems:'center', gap:5,
      padding:'3px 8px', borderRadius:4, marginBottom:8,
      background: s.bg, border:`1px solid ${s.color}33`
    }}>
      <span style={{ fontFamily:'var(--mono)', fontSize:9, fontWeight:700, color: s.color, letterSpacing:1 }}>
        {s.label}
      </span>
    </div>
  )
}

// ── ReplyThread (unchanged) ───────────────────────────────────────────────────
function ReplyThread({ postId, authorId, onClose, createReply, fetchReplies, createNotification }) {
  const { user } = useAuth()
  const [replies, setReplies] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  useEffect(() => {
    loadReplies()
    const sub = supabase
      .channel(`replies:${postId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'replies',
        filter: `post_id=eq.${postId}`
      }, payload => { fetchNewReply(payload.new.id) })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [postId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [replies])

  async function loadReplies() {
    const { data } = await fetchReplies(postId)
    setReplies(data)
    setLoading(false)
  }

  async function fetchNewReply(id) {
    const { data } = await supabase
      .from('replies').select('*, users(username, role)').eq('id', id).single()
    if (data) setReplies(prev => [...prev, data])
  }

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    const { error } = await createReply(postId, body.trim())
    if (!error) {
      setBody('')
      const { data } = await fetchReplies(postId)
      setReplies(data)
      if (authorId && createNotification) createNotification(authorId, 'reply', postId)
    }
    setSending(false)
  }

  return (
    <div style={{ borderTop:'1px solid var(--border)', background:'var(--bg)', padding:'12px 16px' }}>
      {loading ? (
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', padding:'8px 0' }}>LOADING REPLIES...</div>
      ) : replies.length === 0 ? (
        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', padding:'8px 0' }}>No replies yet. Be the first.</div>
      ) : (
        <div style={{ marginBottom:12 }}>
          {replies.map(r => (
            <div key={r.id} style={{ display:'flex', gap:10, padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <div style={{ width:2, background:'var(--border)', borderRadius:2, flexShrink:0, marginLeft:6 }} />
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                  <span style={{
                    fontFamily:'var(--mono)', fontSize:11,
                    color: r.users?.role === 'osint' ? 'var(--verified)' :
                           r.users?.role === 'admin' ? 'var(--accent)' : 'var(--text)',
                    fontWeight:600
                  }}>
                    {r.users?.username || 'Unknown'}
                    {r.users?.role === 'osint' && <span style={{ color:'var(--verified)', marginLeft:4 }}>◆</span>}
                  </span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)' }}>{timeAgo(r.created_at)}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>{r.body}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}
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
          value={body} onChange={e => setBody(e.target.value)}
          placeholder="Write a reply..." maxLength={500} rows={2}
          style={{
            flex:1, background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:6, padding:'8px 10px', color:'var(--text)',
            fontFamily:'IBM Plex Sans, sans-serif', fontSize:12,
            resize:'none', outline:'none', lineHeight:1.5
          }}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend() }}
        />
        <button
          onClick={handleSend} disabled={!body.trim() || sending}
          style={{
            padding:'8px 14px', background:'var(--accent)', color:'#000',
            border:'none', borderRadius:4, fontFamily:'var(--mono)',
            fontSize:10, fontWeight:700, cursor:'pointer',
            opacity: (!body.trim() || sending) ? 0.4 : 1, letterSpacing:1, whiteSpace:'nowrap'
          }}
        >
          {sending ? '...' : 'REPLY'}
        </button>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', marginTop:6, marginLeft:36 }}>
        {body.length}/500 · Cmd+Enter to send
      </div>
    </div>
  )
}

// ── Main Feed ─────────────────────────────────────────────────────────────────
export default function GeneralFeed() {
  const { user } = useAuth()
  const { posts, loading, createPost, likePost, savePost, repost, createReply, fetchReplies } = usePosts()
  const [repostModal, setRepostModal]   = useState(null)
  const [noteModal, setNoteModal]       = useState(null)
  const [quoteBody, setQuoteBody]       = useState('')
  const [body, setBody]                 = useState('')
  const [posting, setPosting]           = useState(false)
  const [error, setError]               = useState('')
  const [openThreads, setOpenThreads]   = useState(new Set())
  const [mediaFile, setMediaFile]       = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [uploading, setUploading]       = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const { createNotification } = useNotifications()

  async function handlePost() {
    if (!body.trim()) return
    if (body.length > 500) { setError('Max 500 characters'); return }
    setPosting(true); setError('')
    let mediaUrl = null
    if (mediaFile) {
      setUploading(true)
      const ext = mediaFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('mint-media').upload(path, mediaFile)
      if (uploadError) {
        setError('Image upload failed: ' + uploadError.message)
        setUploading(false); setPosting(false); return
      }
      const { data: urlData } = supabase.storage.from('mint-media').getPublicUrl(path)
      mediaUrl = urlData.publicUrl
      setUploading(false)
    }
    const { error } = await createPost(body.trim(), mediaUrl)
    if (error) setError(error.message)
    else { setBody(''); setMediaFile(null); setMediaPreview(null) }
    setPosting(false)
  }

  function toggleThread(postId) {
    setOpenThreads(prev => {
      const next = new Set(prev)
      next.has(postId) ? next.delete(postId) : next.add(postId)
      return next
    })
  }

  function handleFileSelect(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Only image files are supported'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5MB'); return }
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
    setError('')
    e.target.value = ''
  }

  function removeMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null); setMediaPreview(null)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Community Note Modal */}
      {noteModal && <NoteModal post={noteModal} onClose={() => setNoteModal(null)} />}

      {/* Repost Modal */}
      {repostModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
          display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000
        }} onClick={() => setRepostModal(null)}>
          <div style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:10, padding:24, width:480, maxWidth:'90vw'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:2, color:'var(--accent)', marginBottom:16 }}>
              {repostModal.reposted ? '⟳ UNDO REPOST' : '⟳ REPOST'}
            </div>
            <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:6, padding:12, marginBottom:16 }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:6 }}>
                {repostModal.users?.username || 'Unknown'}
              </div>
              <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>{repostModal.body}</div>
            </div>
            {!repostModal.reposted && (
              <>
                <textarea
                  value={quoteBody} onChange={e => setQuoteBody(e.target.value)}
                  placeholder="Add a comment (optional)..." maxLength={500} rows={3}
                  style={{
                    width:'100%', background:'var(--bg)', border:'1px solid var(--border)',
                    borderRadius:6, padding:'10px 12px', color:'var(--text)',
                    fontFamily:'IBM Plex Sans, sans-serif', fontSize:13,
                    resize:'none', outline:'none', marginBottom:12, boxSizing:'border-box'
                  }}
                />
                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', marginBottom:16 }}>
                  {quoteBody.length}/500
                </div>
              </>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button onClick={() => setRepostModal(null)} style={{
                padding:'8px 16px', background:'transparent', border:'1px solid var(--border)',
                color:'var(--muted)', borderRadius:4, fontFamily:'var(--mono)', fontSize:10, cursor:'pointer'
              }}>CANCEL</button>
              <button
                onClick={async () => { await repost(repostModal.id, quoteBody || null); setRepostModal(null); setQuoteBody('') }}
                style={{
                  padding:'8px 16px',
                  background: repostModal.reposted ? 'var(--accent2)' : 'var(--verified)',
                  color:'#000', border:'none', borderRadius:4,
                  fontFamily:'var(--mono)', fontSize:10, fontWeight:700, cursor:'pointer'
                }}
              >
                {repostModal.reposted ? 'UNDO REPOST' : '⟳ REPOST'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      <div style={{ padding:'16px', borderBottom:'1px solid var(--border)', background:'var(--surface)', flexShrink:0 }}>
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
              value={body} onChange={e => { setBody(e.target.value); setError('') }}
              placeholder="Share intelligence, observations or analysis..."
              maxLength={500} rows={3}
              style={{
                width:'100%', background:'var(--bg)', border:'1px solid var(--border)',
                borderRadius:6, padding:'10px 12px', color:'var(--text)',
                fontFamily:'IBM Plex Sans, sans-serif', fontSize:13,
                resize:'none', outline:'none', lineHeight:1.6, transition:'border-color 0.15s'
              }}
              onFocus={e => e.target.style.borderColor='var(--accent)'}
              onBlur={e => e.target.style.borderColor='var(--border)'}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost() }}
            />
            {mediaPreview && (
              <div style={{ position:'relative', marginTop:8 }}>
                <img src={mediaPreview} alt="preview" style={{
                  width:'100%', maxHeight:200, objectFit:'cover',
                  borderRadius:6, border:'1px solid var(--border)', display:'block'
                }} />
                <button onClick={removeMedia} style={{
                  position:'absolute', top:6, right:6,
                  background:'rgba(0,0,0,0.75)', border:'none', borderRadius:'50%',
                  width:22, height:22, color:'white', cursor:'pointer', fontSize:11,
                  display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1
                }}>✕</button>
                <div style={{
                  position:'absolute', bottom:6, left:8, fontFamily:'var(--mono)', fontSize:9,
                  color:'rgba(255,255,255,0.7)', background:'rgba(0,0,0,0.5)', padding:'2px 6px', borderRadius:3
                }}>
                  {(mediaFile.size / 1024).toFixed(0)}KB
                </div>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileSelect} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 }}>
              <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:10, color: body.length > 450 ? 'var(--accent2)' : 'var(--muted)' }}>
                  {body.length}/500
                </span>
                {error && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--accent2)' }}>⚠ {error}</span>}
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button onClick={() => fileInputRef.current?.click()} title="Attach image (max 5MB)" style={{
                  padding:'5px 10px',
                  background: mediaFile ? 'rgba(0,255,180,0.1)' : 'transparent',
                  border:`1px solid ${mediaFile ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius:4, fontFamily:'var(--mono)', fontSize:10,
                  color: mediaFile ? 'var(--accent)' : 'var(--muted)', cursor:'pointer', letterSpacing:0.5
                }}>
                  {mediaFile ? '📎 ATTACHED' : '📎 IMAGE'}
                </button>
                <button onClick={handlePost} disabled={!body.trim() || posting} style={{
                  padding:'7px 18px', background:'var(--accent)', color:'#000',
                  border:'none', borderRadius:4, fontFamily:'var(--mono)',
                  fontSize:10, fontWeight:700, letterSpacing:1,
                  cursor: (!body.trim() || posting) ? 'not-allowed' : 'pointer',
                  opacity: (!body.trim() || posting) ? 0.5 : 1, transition:'all 0.15s'
                }}>
                  {uploading ? 'UPLOADING...' : posting ? 'POSTING...' : 'POST'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {loading ? (
          <div style={{ padding:40, textAlign:'center', fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>
            LOADING FEED...
          </div>
        ) : posts.length === 0 ? (
          <div style={{ padding:40, textAlign:'center', fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>
            No posts yet. Be the first to share intelligence.
          </div>
        ) : posts.map(post => (
          <div key={post.id} style={{ borderBottom:'1px solid var(--border)', background:'var(--surface)' }}>
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

                  {/* Author row — username + score badge */}
                  <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                    <span style={{
                      fontFamily:'var(--mono)', fontSize:12, fontWeight:600,
                      color: post.users?.role === 'osint' ? 'var(--verified)' :
                             post.users?.role === 'admin' ? 'var(--accent)' : 'var(--text)'
                    }}>
                      <span
                        onClick={() => navigate(`/channel/${post.users?.username}`)}
                        style={{ cursor:'pointer' }}
                        onMouseOver={e => e.currentTarget.style.textDecoration='underline'}
                        onMouseOut={e => e.currentTarget.style.textDecoration='none'}
                      >
                        {post.users?.username || 'Unknown'}
                      </span>
                      {post.users?.role === 'osint' && (
                        <span style={{ color:'var(--verified)', marginLeft:4, fontSize:10 }}>◆</span>
                      )}
                    </span>

                    {/* Credibility score badge — OSINT only */}
                    {post.users?.role === 'osint' && post.users?.score != null && (
                      <span style={{
                        fontFamily:'var(--mono)', fontSize:9, fontWeight:700,
                        padding:'1px 6px', borderRadius:3, letterSpacing:1,
                        background: post.users.score >= 75 ? 'rgba(0,255,136,0.12)' :
                                    post.users.score >= 50 ? 'rgba(0,212,255,0.1)'  :
                                    post.users.score >= 0  ? 'rgba(255,159,67,0.1)' :
                                                             'rgba(255,71,87,0.12)',
                        color: post.users.score >= 75 ? 'var(--verified)' :
                               post.users.score >= 50 ? 'var(--accent)'   :
                               post.users.score >= 0  ? '#ff9f43'         :
                                                        '#ff4757',
                        border: `1px solid ${
                          post.users.score >= 75 ? 'rgba(0,255,136,0.25)'  :
                          post.users.score >= 50 ? 'rgba(0,212,255,0.2)'   :
                          post.users.score >= 0  ? 'rgba(255,159,67,0.2)'  :
                                                   'rgba(255,71,87,0.25)'
                        }`
                      }}>
                        ◈ {post.users.score}
                      </span>
                    )}

                    <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>
                      {timeAgo(post.created_at)}
                    </span>
                  </div>

                  {/* Claim badge — Intel posts only */}
                  {post.is_osint && <ClaimBadge postId={post.id} />}

                  {/* Post body */}
                  <div style={{ fontSize:13, lineHeight:1.6, marginBottom: post.media_url ? 8 : 10 }}>
                    {post.body}
                  </div>

                  {/* Media */}
                  {post.media_url && (
                    <div style={{ marginBottom:10 }}>
                      <img src={post.media_url} alt="attachment" style={{
                        width:'100%', maxHeight:300, objectFit:'cover',
                        borderRadius:6, border:'1px solid var(--border)',
                        display:'block', cursor:'pointer'
                      }} onClick={() => window.open(post.media_url, '_blank')} />
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                    <button onClick={() => likePost(post.id, createNotification)} style={{
                      background:'none', border:'none', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:5,
                      fontFamily:'var(--mono)', fontSize:11,
                      color: post.liked ? '#e05577' : 'var(--muted)', padding:0, transition:'color 0.15s'
                    }}>
                      {post.liked ? '♥' : '♡'} {post.likes || 0}
                    </button>
                    <button onClick={() => toggleThread(post.id)} style={{
                      background:'none', border:'none', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:5,
                      fontFamily:'var(--mono)', fontSize:11,
                      color: openThreads.has(post.id) ? 'var(--accent)' : 'var(--muted)',
                      padding:0, transition:'color 0.15s'
                    }}>
                      ↩ {post.reply_count || 0}{openThreads.has(post.id) ? ' ▲' : ' ▼'}
                    </button>
                    <button onClick={() => { setRepostModal(post); setQuoteBody('') }} style={{
                      background:'none', border:'none', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:5,
                      fontFamily:'var(--mono)', fontSize:11,
                      color: post.reposted ? 'var(--verified)' : 'var(--muted)', padding:0, transition:'color 0.15s'
                    }}>
                      ⟳ {post.repost_count || 0}
                    </button>

                    {/* Community Note button — Intel posts only */}
                    {post.is_osint && (
                      <button onClick={() => setNoteModal(post)} style={{
                        background:'none', border:'none', cursor:'pointer',
                        display:'flex', alignItems:'center', gap:4,
                        fontFamily:'var(--mono)', fontSize:11,
                        color:'var(--muted)', padding:0, transition:'color 0.15s'
                      }}
                        onMouseOver={e => e.currentTarget.style.color='#ff9f43'}
                        onMouseOut={e => e.currentTarget.style.color='var(--muted)'}
                        title="Write a community note"
                      >
                        ⚑ NOTE
                      </button>
                    )}

                    <button onClick={() => savePost(post.id)} style={{
                      background:'none', border:'none', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:5,
                      fontFamily:'var(--mono)', fontSize:11,
                      color: post.saved ? '#ffcc00' : 'var(--muted)',
                      padding:0, transition:'color 0.15s', marginLeft:'auto'
                    }}>
                      {post.saved ? 'bookmarked ◈' : '◇'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Reply Thread */}
            {openThreads.has(post.id) && (
              <ReplyThread
                postId={post.id}
                authorId={post.users?.id}
                onClose={() => toggleThread(post.id)}
                createReply={createReply}
                fetchReplies={fetchReplies}
                createNotification={createNotification}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
