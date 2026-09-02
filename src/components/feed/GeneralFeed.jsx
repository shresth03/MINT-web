import { useState, useEffect, useRef } from 'react'
import { usePosts } from '../../hooks/feed/usePosts'
import { useAuth } from '../../hooks/core/useAuth'
import { supabase, identityDb, socialDb } from '../../api/supabase'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/social/useNotifications'
import { useLocation } from 'react-router-dom'
import { useIsMobile } from '../../hooks/core/useIsMobile'
import { Heart, MessageCircle, Repeat2, Bookmark, Inbox, ChevronDown, ChevronUp, BadgeCheck } from 'lucide-react'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

function RichBody({ text, navigate }) {
  return text.split(/(#\w+|@\w+)/g).map((part, i) => {
    if (/^#\w+$/.test(part)) return (
      <span key={i}
        onClick={e => { e.stopPropagation(); navigate(`/search?q=${encodeURIComponent(part)}`) }}
        style={{ color: 'var(--verified)', fontWeight: 600, fontFamily: 'var(--mono)', cursor: 'pointer' }}
      >{part}</span>
    )
    if (/^@\w+$/.test(part)) return (
      <span key={i}
        onClick={e => { e.stopPropagation(); navigate(`/channel/${part.slice(1)}`) }}
        style={{ color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--mono)', cursor: 'pointer' }}
      >{part}</span>
    )
    return part
  })
}


function buildTree(replies) {
  const map = {}
  const roots = []
  replies.forEach(r => { map[r.id] = { ...r, children: [] } })
  replies.forEach(r => {
    if (r.parent_reply_id && map[r.parent_reply_id]) {
      map[r.parent_reply_id].children.push(map[r.id])
    } else {
      roots.push(map[r.id])
    }
  })
  return roots
}

function MentionTextarea({ value, onChange, placeholder, rows = 2, onKeyDown, autoFocus = false }) {
  const [suggestions, setSuggestions] = useState([])
  const [mentionStart, setMentionStart] = useState(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const textareaRef = useRef(null)
  const { searchUsers } = usePosts()

  async function handleChange(e) {
    const val = e.target.value
    const cursor = e.target.selectionStart
    onChange(val)

    // Detect @mention being typed
    const textUpToCursor = val.slice(0, cursor)
    const match = textUpToCursor.match(/@(\w*)$/)

    if (match) {
      setMentionStart(cursor - match[0].length)
      const results = await searchUsers(match[1])
      setSuggestions(results)
      setSelectedIdx(0)
    } else {
      setSuggestions([])
      setMentionStart(null)
    }
  }

  function insertMention(username) {
    const before = value.slice(0, mentionStart)
    const after = value.slice(textareaRef.current.selectionStart)
    const newVal = `${before}@${username} ${after}`
    onChange(newVal)
    setSuggestions([])
    setTimeout(() => {
      textareaRef.current?.focus()
      const pos = before.length + username.length + 2
      textareaRef.current?.setSelectionRange(pos, pos)
    }, 0)
  }

  function handleKeyDown(e) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (suggestions[selectedIdx]) { e.preventDefault(); insertMention(suggestions[selectedIdx].username) }
        return
      }
      if (e.key === 'Escape') { setSuggestions([]); setMentionStart(null) }
    }
    onKeyDown?.(e)
  }

  // Render @mentions in a highlighted way — we do this via the textarea value display
  // Actual highlighting requires a contenteditable div but textarea is simpler for now
  return (
    <div style={{ position: 'relative' }}>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={500}
        rows={rows}
        autoFocus={autoFocus}
        style={{
          width: '100%', background: 'transparent', border: 'none',
          outline: 'none', color: 'var(--text)', fontFamily: 'var(--sans)',
          fontSize: 13, resize: 'none', lineHeight: 1.5,
        }}
      />

      {/* Autocomplete dropdown */}
      {suggestions.length > 0 && (
        <div style={{
          position: 'absolute', bottom: '100%', left: 0,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 8, overflow: 'hidden', zIndex: 100,
          minWidth: 180, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          marginBottom: 4,
        }}>
          {suggestions.map((u, i) => (
            <div
              key={u.id}
              onClick={() => insertMention(u.username)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', cursor: 'pointer',
                background: i === selectedIdx ? 'var(--active-bg)' : 'transparent',
                transition: 'background 0.1s',
              }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: 'var(--accent)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: 'var(--bg)',
                fontFamily: 'var(--mono)', flexShrink: 0,
              }}>
                {u.username[0].toUpperCase()}
              </div>
              <div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                  color: u.role === 'osint' ? 'var(--verified)'
                    : u.role === 'admin' ? 'var(--accent)' : 'var(--text)'
                }}>
                  @{u.username}
                  {u.role === 'osint' && <BadgeCheck size={10} style={{ color: 'var(--verified)', marginLeft: 4, display: 'inline', verticalAlign: 'middle' }} />}
                </div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
                  {u.role.toUpperCase()}
                </div>
              </div>
            </div>
          ))}
          <div style={{
            padding: '4px 12px', fontFamily: 'var(--mono)', fontSize: 8,
            color: 'var(--muted)', borderTop: '1px solid var(--border)',
          }}>
            ↑↓ navigate · Enter to select · Esc to close
          </div>
        </div>
      )}
    </div>
  )
}

function ReplyNode({ node, depth = 0, postId, createReply, createNotification, postAuthorId, fetchNewReply, voteReply }) {
  const navigate = useNavigate()
  const [replyOpen, setReplyOpen] = useState(false)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  const usernameColor = node.users?.role === 'osint' ? 'var(--verified)'
    : node.users?.role === 'admin' ? 'var(--accent)' : 'var(--text)'
  const [voteCount, setVoteCount] = useState(node.vote_count || 0)
  const [userVote, setUserVote] = useState(node.user_vote || 0)
    
  async function handleVote(vote) {
    const prev = userVote
    // Optimistic update
    const delta = prev === vote ? -vote : prev !== 0 ? vote * 2 : vote
    setVoteCount(c => c + delta)
    setUserVote(prev === vote ? 0 : vote)
  
    const { delta: actual } = await voteReply(node.id, vote)
    // Reconcile if needed
    if (actual !== delta) {
      setVoteCount(c => c - delta + actual)
    }
  } 

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    const { error } = await createReply(postId, body.trim(), node.id)
    if (!error) {
      setBody('')
      setReplyOpen(false)
      if (postAuthorId && createNotification) createNotification(postAuthorId, 'reply', postId)
    }
    setSending(false)
  }

  return (
    <div style={{ display: 'flex', gap: 0, marginTop: depth === 0 ? 12 : 8 }}>
      {/* Left column — avatar + collapse line */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 10, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'var(--bg)',
          flexShrink: 0, fontFamily: 'var(--mono)', marginBottom: 4,
        }}>
          {node.users?.username?.[0]?.toUpperCase() || 'U'}
        </div>
        {!collapsed && node.children.length > 0 && (
          <div
            onClick={() => setCollapsed(true)}
            style={{
              width: 2, flex: 1, minHeight: 24,
              background: 'var(--border)', borderRadius: 2,
              cursor: 'pointer', transition: 'background 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'var(--accent)'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--border)'}
          />
        )}
      </div>

      {/* Right column — content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: collapsed ? 0 : 4 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: usernameColor }}>
            {node.users?.username || 'Unknown'}
            {node.users?.role === 'osint' && <BadgeCheck size={11} style={{ color: 'var(--verified)', marginLeft: 4, display: 'inline', verticalAlign: 'middle' }} />}
          </span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
            · {timeAgo(node.created_at)}
          </span>
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              style={{
                background: 'none', border: '1px solid var(--border)',
                borderRadius: '50%', width: 18, height: 18,
                cursor: 'pointer', color: 'var(--muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, marginLeft: 4,
              }}
            >+</button>
          )}
        </div>

        {!collapsed && (
          <>
            {/* Body */}
            <div style={{
              fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
              fontFamily: 'var(--sans)', marginBottom: 6,
            }}>
              <RichBody text={node.body} navigate={navigate} />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'var(--surface2)', borderRadius: 20, padding: '3px 10px',
              }}>
                <button
                  onClick={() => handleVote(1)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: userVote === 1 ? 'var(--accent)' : 'var(--muted)',
                    fontSize: 14, padding: 0, transition: 'color 0.15s',
                    fontWeight: userVote === 1 ? 700 : 400,
                  }}
                  onMouseOver={e => { if (userVote !== 1) e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseOut={e => { if (userVote !== 1) e.currentTarget.style.color = 'var(--muted)' }}
                >↑</button>
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11,
                  color: voteCount > 0 ? 'var(--accent)' : voteCount < 0 ? 'var(--accent2)' : 'var(--muted)',
                  minWidth: 20, textAlign: 'center', fontWeight: 600,
                }}>
                  {voteCount > 0 ? `+${voteCount}` : voteCount === 0 ? '—' : voteCount}
                </span>
                <button
                  onClick={() => handleVote(-1)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: userVote === -1 ? 'var(--accent2)' : 'var(--muted)',
                    fontSize: 14, padding: 0, transition: 'color 0.15s',
                    fontWeight: userVote === -1 ? 700 : 400,
                  }}
                  onMouseOver={e => { if (userVote !== -1) e.currentTarget.style.color = 'var(--accent2)' }}
                  onMouseOut={e => { if (userVote !== -1) e.currentTarget.style.color = 'var(--muted)' }}
                >↓</button>
              </div>

              <button
                onClick={() => setReplyOpen(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '3px 10px', borderRadius: 20,
                  fontFamily: 'var(--mono)', fontSize: 11,
                  color: replyOpen ? 'var(--accent)' : 'var(--muted)',
                  transition: 'all 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                <MessageCircle size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> Reply
              </button>

              <button
                onClick={() => navigator.clipboard?.writeText(window.location.href)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '3px 10px', borderRadius: 20,
                  fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)',
                }}
                onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
                onMouseOut={e => e.currentTarget.style.background = 'none'}
              >
                ↗ Share
              </button>

              {node.children.length > 0 && (
                <button
                  onClick={() => setCollapsed(true)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '3px 8px', borderRadius: 20,
                    fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseOut={e => e.currentTarget.style.background = 'none'}
                >⊖</button>
              )}
            </div>

            {/* Inline reply composer */}
            {replyOpen && (
              <div style={{
                marginTop: 8, marginBottom: 8,
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '10px 12px',
              }}>

                <MentionTextarea
                  value={body}
                  onChange={setBody}
                  placeholder={`Reply to @${node.users?.username || 'Unknown'}...`}
                  rows={2}
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend() }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
                    {body.length}/500 · ⌘Enter to send
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setReplyOpen(false); setBody('') }}
                      style={{
                        padding: '5px 12px', background: 'transparent',
                        border: '1px solid var(--border)', color: 'var(--muted)',
                        borderRadius: 20, fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
                      }}
                    >Cancel</button>
                    <button
                      onClick={handleSend}
                      disabled={!body.trim() || sending}
                      style={{
                        padding: '5px 14px', background: 'var(--accent)', color: 'var(--bg)',
                        border: 'none', borderRadius: 20, fontFamily: 'var(--mono)',
                        fontSize: 10, fontWeight: 700,
                        cursor: !body.trim() || sending ? 'not-allowed' : 'pointer',
                        opacity: !body.trim() || sending ? 0.4 : 1,
                      }}
                    >{sending ? '...' : 'Reply'}</button>
                  </div>
                </div>
              </div>
            )}

            {/* Nested children */}
            {node.children.map(child => (
            <ReplyNode
              key={child.id}
              node={child}
              depth={depth + 1}
              postId={postId}
              createReply={createReply}
              createNotification={createNotification}
              postAuthorId={postAuthorId}
              fetchNewReply={fetchNewReply}
              voteReply={voteReply}
            />
          ))}
          </>
        )}
      </div>
    </div>
  )
}

function ReplyThread({ postId, authorId, createReply, fetchReplies, createNotification, voteReply }) {
  const { user } = useAuth()
  const [replies, setReplies] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  async function loadReplies() {
    const { data } = await fetchReplies(postId)
    setReplies(data)
    setLoading(false)
  }

  async function fetchNewReply(id) {
    const { data } = await socialDb
      .from('replies').select('*').eq('id', id).single()
    if (!data) return
    const { data: author } = await identityDb
      .from('profiles').select('username, role').eq('id', data.author_id).maybeSingle()
    const enriched = { ...data, users: author || null }
    setReplies(prev => prev.some(r => r.id === enriched.id) ? prev : [...prev, enriched])
  }

  useEffect(() => {
    loadReplies()
    const sub = supabase
      .channel(`replies:${postId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'social', table: 'replies',
        filter: `post_id=eq.${postId}`
      }, payload => { fetchNewReply(payload.new.id) })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [postId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [replies])

  async function handleSend() {
    if (!body.trim()) return
    setSending(true)
    const { error } = await createReply(postId, body.trim(), null)
    if (!error) {
      setBody('')
      if (authorId && createNotification) createNotification(authorId, 'reply', postId)
    }
    setSending(false)
  }

  const tree = buildTree(replies)

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg)',
      padding: '8px 16px 16px',
    }}>
      {loading ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', padding: '8px 0' }}>
          LOADING REPLIES...
        </div>
      ) : replies.length === 0 ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', padding: '8px 0' }}>
          No replies yet. Be the first.
        </div>
      ) : (
        <div>
          {tree.map(node => (
            <ReplyNode
            key={node.id}
            node={node}
            depth={0}
            postId={postId}
            createReply={createReply}
            createNotification={createNotification}
            postAuthorId={authorId}
            fetchNewReply={fetchNewReply}
            voteReply={voteReply}
          />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Top-level reply composer */}
      <div style={{
        marginTop: 12, display: 'flex', gap: 10, alignItems: 'flex-start',
        paddingTop: 12, borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', background: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: 'var(--bg)', flexShrink: 0,
          fontFamily: 'var(--mono)',
        }}>
          {user?.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <div style={{
          flex: 1, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px',
        }}>
          <MentionTextarea
            value={body}
            onChange={setBody}
            placeholder="Write a reply... type @ to mention"
            rows={2}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend() }}
          />
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
              {body.length}/500 · ⌘Enter to send
            </span>
            <button
              onClick={handleSend}
              disabled={!body.trim() || sending}
              style={{
                padding: '5px 16px', background: 'var(--accent)', color: 'var(--bg)',
                border: 'none', borderRadius: 20, fontFamily: 'var(--mono)',
                fontSize: 10, fontWeight: 700,
                cursor: !body.trim() || sending ? 'not-allowed' : 'pointer',
                opacity: !body.trim() || sending ? 0.4 : 1,
              }}
            >{sending ? '...' : 'Reply'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ComposerInner({ user, body, setBody, error, setError, mediaFile, mediaPreview, fileInputRef, handlePost, handleFileSelect, removeMedia, posting, uploading, postType, setPostType }) {
  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: 'var(--bg)', flexShrink: 0, fontFamily: 'var(--mono)',
      }}>
        {user?.email?.[0]?.toUpperCase() || 'U'}
      </div>
      <div style={{ flex: 1 }}>
        <textarea
          value={body}
          onChange={e => { setBody(e.target.value); setError('') }}
          placeholder="Share intelligence, observations or analysis..."
          maxLength={500} rows={3}
          style={{
            width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '10px 12px', color: 'var(--text)',
            fontFamily: 'var(--sans)', fontSize: 13, resize: 'none', outline: 'none',
            lineHeight: 1.6, transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost() }}
        />
        {mediaPreview && (
          <div style={{ position: 'relative', marginTop: 8 }}>
            <img src={mediaPreview} alt="preview" style={{
              width: '100%', maxHeight: 200, objectFit: 'cover',
              borderRadius: 6, border: '1px solid var(--border)', display: 'block',
            }} />
            <button onClick={removeMedia} style={{
              position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.75)',
              border: 'none', borderRadius: '50%', width: 22, height: 22,
              color: 'white', cursor: 'pointer', fontSize: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>✕</button>
            <div style={{
              position: 'absolute', bottom: 6, left: 8, fontFamily: 'var(--mono)',
              fontSize: 9, color: 'rgba(255,255,255,0.7)',
              background: 'rgba(0,0,0,0.5)', padding: '2px 6px', borderRadius: 3,
            }}>
              {(mediaFile?.size / 1024).toFixed(0)}KB
            </div>
          </div>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: body.length > 450 ? 'var(--accent2)' : 'var(--muted)' }}>
              {body.length}/500
            </span>
            {error && <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)' }}>⚠ {error}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Post type toggle */}
            <div style={{ display: 'flex', borderRadius: 4, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {['general', 'news'].map(t => (
                <button
                  key={t}
                  onClick={() => setPostType(t)}
                  style={{
                    padding: '5px 10px', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
                    background: postType === t
                      ? t === 'news' ? 'rgba(48,216,128,0.15)' : 'rgba(0,212,255,0.1)'
                      : 'transparent',
                    color: postType === t
                      ? t === 'news' ? 'var(--verified)' : 'var(--accent)'
                      : 'var(--muted)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t === 'news'
                    ? <><BadgeCheck size={10} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} /> NEWS</>
                    : 'GENERAL'
                  }
                </button>
              ))}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: '5px 10px', background: mediaFile ? 'rgba(0,255,180,0.1)' : 'transparent',
                border: `1px solid ${mediaFile ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10,
                color: mediaFile ? 'var(--accent)' : 'var(--muted)', cursor: 'pointer',
              }}
            >
              {mediaFile ? '📎 ATTACHED' : '📎 IMAGE'}
            </button>
            <button
              onClick={handlePost}
              disabled={!body.trim() || posting}
              style={{
                padding: '7px 18px', background: 'var(--accent)', color: 'var(--bg)',
                border: 'none', borderRadius: 4, fontFamily: 'var(--mono)',
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                cursor: !body.trim() || posting ? 'not-allowed' : 'pointer',
                opacity: !body.trim() || posting ? 0.5 : 1, transition: 'all 0.15s',
              }}
            >
              {uploading ? 'UPLOADING...' : posting ? 'POSTING...' : 'POST'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GeneralFeed() {
  const { user } = useAuth()
  const { posts, loading, createPost, likePost, savePost, repost, createReply, fetchReplies, voteReply } = usePosts()
  const [repostModal, setRepostModal] = useState(null)
  const [quoteBody, setQuoteBody] = useState('')
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [openThreads, setOpenThreads] = useState(new Set())
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const { createNotification } = useNotifications()
  const location = useLocation()
  const [highlightId, setHighlightId] = useState(null)
  const postRefs = useRef({})
  const isMobile = useIsMobile()
  const [composerOpen, setComposerOpen] = useState(false)
  const [postType, setPostType] = useState('general')
  const [feedTab, setFeedTab] = useState('all')
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const [followedIds, setFollowedIds] = useState([])

  useEffect(() => {
    if (!user?.id) return
    identityDb.from('follows').select('following_id').eq('follower_id', user.id)
      .then(({ data }) => setFollowedIds((data || []).map(f => f.following_id)))
  }, [user?.id])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const id = params.get('highlight')
    if (!id || loading) return
    setHighlightId(id)
    setTimeout(() => {
      postRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => setHighlightId(null), 3000)
    }, 400)
  }, [location.search, loading])

  async function handlePost() {
    if (!body.trim()) return
    if (body.length > 500) { setError('Max 500 characters'); return }
    setPosting(true)
    setError('')

    let mediaUrl = null
    if (mediaFile) {
      setUploading(true)
      const ext = mediaFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('mint-media')
        .upload(path, mediaFile)
      if (uploadError) {
        setError('Image upload failed: ' + uploadError.message)
        setUploading(false)
        setPosting(false)
        return
      }
      const { data: urlData } = supabase.storage
        .from('mint-media')
        .getPublicUrl(path)
      mediaUrl = urlData.publicUrl
      setUploading(false)
    }

    const { error } = await createPost(body.trim(), mediaUrl, null, null, postType)
    if (error) setError(error.message)
    else {
      setBody('')
      setMediaFile(null)
      setMediaPreview(null)
      setPostType('general')
    }
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
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5MB')
      return
    }
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
    setError('')
    // Reset input so same file can be re-selected
    e.target.value = ''
  }

  function removeMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null)
    setMediaPreview(null)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', overflow:'hidden' }}>

      {/* Repost Modal */}
      {repostModal && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.7)',
          display:'flex', alignItems:'center', justifyContent:'center',
          zIndex:1000
        }} onClick={() => setRepostModal(null)}>
          <div style={{
            background:'var(--surface)', border:'1px solid var(--border)',
            borderRadius:10, padding:24, width:480, maxWidth:'90vw'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              fontFamily:'var(--mono)', fontSize:11, letterSpacing:2,
              color:'var(--accent)', marginBottom:16
            }}>
              <Repeat2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
              {repostModal.reposted ? 'UNDO REPOST' : 'REPOST'}
            </div>
            <div style={{
              background:'var(--bg)', border:'1px solid var(--border)',
              borderRadius:6, padding:12, marginBottom:16
            }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', marginBottom:6 }}>
                {repostModal.users?.username || 'Unknown'}
              </div>
              <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>
                {repostModal.body}
              </div>
            </div>
            {!repostModal.reposted && (
              <>
                <textarea
                  value={quoteBody}
                  onChange={e => setQuoteBody(e.target.value)}
                  placeholder="Add a comment (optional)..."
                  maxLength={500}
                  rows={3}
                  style={{
                    width:'100%', background:'var(--bg)',
                    border:'1px solid var(--border)', borderRadius:6,
                    padding:'10px 12px', color:'var(--text)',
                    fontFamily:'var(--sans)', fontSize:13,
                    resize:'none', outline:'none', marginBottom:12,
                    boxSizing:'border-box'
                  }}
                />
                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', marginBottom:16 }}>
                  {quoteBody.length}/500
                </div>
              </>
            )}
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button
                onClick={() => setRepostModal(null)}
                style={{
                  padding:'8px 16px', background:'transparent',
                  border:'1px solid var(--border)', color:'var(--muted)',
                  borderRadius:4, fontFamily:'var(--mono)', fontSize:10, cursor:'pointer'
                }}
              >
                CANCEL
              </button>
              <button
                onClick={async () => {
                  await repost(repostModal.id, quoteBody || null)
                  setRepostModal(null)
                  setQuoteBody('')
                }}
                style={{
                  padding:'8px 16px',
                  background: repostModal.reposted ? 'var(--accent2)' : 'var(--verified)',
                  color:'#000', border:'none', borderRadius:4,
                  fontFamily:'var(--mono)', fontSize:10, fontWeight:700, cursor:'pointer'
                }}
              >
                {repostModal.reposted ? 'UNDO REPOST' : 'REPOST'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Composer — desktop only inline */}
      {!isMobile && (
        <div style={{
          padding: '16px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', flexShrink: 0
        }}>
          <ComposerInner
            user={user} body={body} setBody={setBody}
            error={error} setError={setError}
            mediaFile={mediaFile} mediaPreview={mediaPreview}
            fileInputRef={fileInputRef}
            handlePost={handlePost} handleFileSelect={handleFileSelect}
            removeMedia={removeMedia} posting={posting} uploading={uploading}
            postType={postType} setPostType={setPostType}
          />
        </div>
      )}

      {/* Mobile FAB */}
      {isMobile && (
        <button
          onClick={() => setComposerOpen(true)}
          style={{
            position: 'fixed', bottom: 72, right: 20, zIndex: 500,
            width: 52, height: 52, borderRadius: '50%',
            background: 'var(--accent)', color: 'var(--bg)',
            border: 'none', fontSize: 28, fontWeight: 300,
            cursor: 'pointer', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            transition: 'transform 0.15s',
          }}
          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          +
        </button>
      )}

      {/* Mobile fullscreen composer */}
      {isMobile && composerOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'var(--bg)', display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{
            height: 52, display: 'flex', alignItems: 'center',
            padding: '0 16px', borderBottom: '1px solid var(--border)',
            background: 'var(--surface)', flexShrink: 0, gap: 12,
          }}>
            <button
              onClick={() => {
                setComposerOpen(false)
                setBody('')
                setMediaFile(null)
                setMediaPreview(null)
                setError('')
              }}
              style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                fontFamily: 'var(--mono)', fontSize: 11, cursor: 'pointer', letterSpacing: 1,
              }}
            >
              CANCEL
            </button>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)',
              letterSpacing: 2, flex: 1, textAlign: 'center',
            }}>
              NEW POST
            </span>
            <button
              onClick={async () => {
                await handlePost()
                setComposerOpen(false)
              }}
              disabled={!body.trim() || posting}
              style={{
                padding: '7px 18px', background: 'var(--accent)', color: 'var(--bg)',
                border: 'none', borderRadius: 4, fontFamily: 'var(--mono)',
                fontSize: 11, fontWeight: 700, letterSpacing: 1,
                cursor: !body.trim() || posting ? 'not-allowed' : 'pointer',
                opacity: !body.trim() || posting ? 0.4 : 1,
              }}
            >
              {posting ? '...' : 'POST'}
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'var(--bg)', flexShrink: 0,
                fontFamily: 'var(--mono)',
              }}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ flex: 1 }}>
                <textarea
                  value={body}
                  onChange={e => { setBody(e.target.value); setError('') }}
                  placeholder="Share intelligence, observations or analysis..."
                  maxLength={500}
                  autoFocus
                  style={{
                    width: '100%', background: 'transparent', border: 'none',
                    outline: 'none', color: 'var(--text)', fontFamily: 'var(--sans)',
                    fontSize: 16, resize: 'none', lineHeight: 1.6, minHeight: 180,
                  }}
                />
                {error && (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)', marginTop: 8 }}>
                    ⚠ {error}
                  </div>
                )}
                {mediaPreview && (
                  <div style={{ position: 'relative', marginTop: 8 }}>
                    <img src={mediaPreview} alt="preview" style={{
                      width: '100%', maxHeight: 240, objectFit: 'cover',
                      borderRadius: 8, border: '1px solid var(--border)', display: 'block',
                    }} />
                    <button onClick={removeMedia} style={{
                      position: 'absolute', top: 8, right: 8,
                      background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%',
                      width: 24, height: 24, color: 'white', cursor: 'pointer', fontSize: 12,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom toolbar */}
          <div style={{
            padding: '12px 16px', borderTop: '1px solid var(--border)',
            background: 'var(--surface)', display: 'flex',
            alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <input
                ref={fileInputRef} type="file" accept="image/*"
                style={{ display: 'none' }} onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: mediaFile ? 'var(--accent)' : 'var(--muted)',
                  fontSize: 20, display: 'flex', alignItems: 'center',
                }}
              >
                📎
              </button>
              {uploading && (
                <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                  UPLOADING...
                </span>
              )}
            </div>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 11,
              color: body.length > 450 ? 'var(--accent2)' : 'var(--muted)',
            }}>
              {body.length}/500
            </span>
          </div>
        </div>
      )}
      {/* Feed tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        {[{ id: 'all', label: 'For You' }, { id: 'following', label: 'Following' }, { id: 'trending', label: '↑ Trending' }].map(t => (
          <button
            key={t.id}
            onClick={() => setFeedTab(t.id)}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none',
              borderBottom: feedTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1,
              color: feedTab === t.id ? 'var(--accent)' : 'var(--muted)',
              cursor: 'pointer', transition: 'all 0.15s', textTransform: 'uppercase',
            }}
          >
            {t.label}
          </button>
        ))}
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
        ) : (() => {
          const hotScore = p => (p.likes || 0) + (p.reply_count || 0) * 2 + (p.repost_count || 0)

          const displayPosts = feedTab === 'following'
            ? posts.filter(p =>
                p._type === 'repost'
                  ? followedIds.includes(p._reposter?.id)
                  : followedIds.includes(p.author_id)
              )
            : feedTab === 'trending'
              ? posts
                  .filter(p => new Date(p._type === 'repost' ? p._repost_created_at : p.created_at) > cutoff48h)
                  .sort((a, b) => hotScore(b) - hotScore(a))
              : posts

          if (displayPosts.length === 0) {
            return (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <Inbox size={28} style={{ marginBottom: 12, color: 'var(--border)' }} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: 1, marginBottom: 8 }}>
                  {feedTab === 'following'
                    ? followedIds.length === 0
                      ? 'YOU\'RE NOT FOLLOWING ANYONE YET'
                      : 'NO POSTS FROM PEOPLE YOU FOLLOW'
                    : feedTab === 'trending'
                      ? 'NO ACTIVITY IN THE LAST 48 HOURS'
                      : 'NO POSTS YET'}
                </div>
                {feedTab === 'following' && followedIds.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--sans)', marginTop: 4 }}>
                    Visit a user's profile and hit <strong>+ FOLLOW</strong> to see their posts here.
                  </div>
                )}
              </div>
            )
          }

          return displayPosts.map((post, idx) => (
            <div
              key={post._type === 'repost' ? `repost-${post._repost_id}` : post.id}
              ref={el => { postRefs.current[post.id] = el }}
              style={{
                borderBottom: '1px solid var(--border)',
                background: highlightId === String(post.id) ? 'var(--active-bg)' : 'var(--surface)',
                borderLeft: highlightId === String(post.id) ? '3px solid var(--accent)' : '3px solid transparent',
                transition: 'background 0.4s ease, border-color 0.4s ease',
              }}
            >
              {/* Trending rank banner */}
              {feedTab === 'trending' && (
                <div style={{
                  padding: '6px 16px 0', display: 'flex', alignItems: 'center', gap: 8,
                  fontFamily: 'var(--mono)', fontSize: 10,
                }}>
                  <span style={{
                    fontSize: 14, fontWeight: 700, minWidth: 20,
                    color: idx === 0 ? '#ff9f43' : idx === 1 ? '#7a9bbf' : idx === 2 ? '#8a6a2a' : 'var(--muted)',
                  }}>
                    {idx + 1}
                  </span>
                  <span style={{ color: 'var(--muted)' }}>
                    ↑ {hotScore(post)} pts · {timeAgo(post.created_at)}
                  </span>
                </div>
              )}

              {/* Repost header banner */}
              {post._type === 'repost' && (
                <div style={{
                  padding: '6px 16px 0',
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)',
                }}>
                  <Repeat2 size={13} style={{ color: 'var(--verified)' }} />
                  <span
                    onClick={() => navigate(`/channel/${post._reposter?.username}`)}
                    style={{ cursor: 'pointer', color: 'var(--verified)', fontWeight: 600 }}
                    onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {post._reposter?.username}
                  </span>
                  <span>reposted · {timeAgo(post._repost_created_at)}</span>
                </div>
              )}
          
              <div style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: 'var(--bg)', flexShrink: 0,
                    fontFamily: 'var(--mono)',
                  }}>
                    {post.users?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                      <span style={{
                        fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                        color: post.users?.role === 'osint' ? 'var(--verified)' :
                               post.users?.role === 'admin' ? 'var(--accent)' : 'var(--text)'
                      }}>
                        <span
                          onClick={() => navigate(`/channel/${post.users?.username}`)}
                          style={{ cursor: 'pointer' }}
                          onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                          onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                        >
                          {post.users?.username || 'Unknown'}
                        </span>
                        {post.users?.role === 'osint' && (
                          <BadgeCheck size={12} style={{ color: 'var(--verified)', marginLeft: 4, display: 'inline', verticalAlign: 'middle' }} />
                        )}
                        {post.users?.role === 'reporter' && (
                          <BadgeCheck size={12} style={{ color: 'var(--accent)', marginLeft: 4, display: 'inline', verticalAlign: 'middle' }} />
                        )}
                      </span>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                        {timeAgo(post.created_at)}
                      </span>
                      {post.post_type === 'news' && (
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 8, letterSpacing: 1,
                          padding: '2px 6px', borderRadius: 3,
                          background: 'rgba(48,216,128,0.1)', border: '1px solid var(--verified)',
                          color: 'var(--verified)',
                        }}>
                          NEWS
                        </span>
                      )}
                    </div>

                    {/* Post body */}
                    <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: post.media_url ? 8 : 10, color: 'var(--text)', fontFamily: 'var(--sans)' }}>
                      <RichBody text={post.body} navigate={navigate} />
                    </div>
          
                    {/* Tag badge */}
                    {post.tag && (
                      <span
                        onClick={() => navigate(`/search?q=%23${post.tag.toLowerCase()}`)}
                        style={{
                          display: 'inline-block', marginBottom: 8,
                          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
                          padding: '2px 8px', borderRadius: 10,
                          border: '1px solid var(--verified)', color: 'var(--verified)',
                          cursor: 'pointer', transition: 'opacity 0.15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.opacity = '0.7'}
                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                      >
                        #{post.tag.toLowerCase()}
                      </span>
                    )}

                    {/* Quote body if repost with comment */}
                    {post._quote && (
                      <div style={{
                        padding: '8px 12px', marginBottom: 10,
                        background: 'var(--bg)', border: '1px solid var(--border)',
                        borderLeft: '2px solid var(--verified)', borderRadius: '0 4px 4px 0',
                        fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--sans)', lineHeight: 1.5,
                      }}>
                        {post._quote}
                      </div>
                    )}
          
                    {/* Media */}
                    {post.media_url && (
                      <div style={{ marginBottom: 10 }}>
                        <img
                          src={post.media_url}
                          alt="attachment"
                          style={{
                            width: '100%', maxHeight: 300, objectFit: 'cover',
                            borderRadius: 6, border: '1px solid var(--border)',
                            display: 'block', cursor: 'pointer',
                          }}
                          onClick={() => window.open(post.media_url, '_blank')}
                        />
                      </div>
                    )}
          
                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginTop: 4 }}>
                      <button
                        onClick={() => likePost(post.id, createNotification)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontFamily: 'var(--mono)', fontSize: 14,
                          color: post.liked ? '#e05577' : 'var(--muted)',
                          padding: 0, transition: 'color 0.15s',
                        }}
                      >
                        <Heart size={14} fill={post.liked ? 'currentColor' : 'none'} /> {post.likes || 0}
                      </button>
                      <button
                        onClick={() => toggleThread(post.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontFamily: 'var(--mono)', fontSize: 14,
                          color: openThreads.has(post.id) ? 'var(--accent)' : 'var(--muted)',
                          padding: 0, transition: 'color 0.15s',
                        }}
                      >
                        <MessageCircle size={14} /> {post.reply_count || 0}
                        {openThreads.has(post.id) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                      <button
                        onClick={() => { setRepostModal(post); setQuoteBody('') }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontFamily: 'var(--mono)', fontSize: 14,
                          color: post.reposted ? 'var(--verified)' : 'var(--muted)',
                          padding: 0, transition: 'color 0.15s',
                        }}
                      >
                        <Repeat2 size={14} /> {post.repost_count || 0}
                      </button>
                      <button
                        onClick={() => savePost(post.id)}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 6,
                          fontFamily: 'var(--mono)', fontSize: 14,
                          color: post.saved ? 'var(--warn)' : 'var(--muted)',
                          padding: 0, transition: 'color 0.15s', marginLeft: 'auto',
                        }}
                      >
                        <Bookmark size={14} fill={post.saved ? 'currentColor' : 'none'} />
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
                  voteReply={voteReply}
                />
              )}
            </div>
          ))
        })()}
      </div>
    </div>
  )
}
