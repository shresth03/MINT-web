import { useState, useEffect, useRef, Fragment } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMessages } from '../../hooks/social/useMessages'
import { useAuth } from '../../hooks/core/useAuth'
import { supabase, identityDb, socialDb } from '../../api/supabase'
import { BadgeCheck, Inbox, Search, ArrowUp } from 'lucide-react'
import { useIsMobile } from '../../hooks/core/useIsMobile'
import BackButton from '../../components/BackButton'
import TopbarLogo from '../../components/TopbarLogo'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function dayLabel(dateStr) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
}

function clockTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function sameDay(a, b) {
  return new Date(a).toDateString() === new Date(b).toDateString()
}

// Back-to-back messages from the same sender, on the same day and within
// 5 minutes of each other, render as one group with a single timestamp.
const GROUP_GAP_MS = 5 * 60 * 1000
function startsGroup(prev, msg) {
  return !prev
    || prev.sender_id !== msg.sender_id
    || !sameDay(prev.created_at, msg.created_at)
    || new Date(msg.created_at) - new Date(prev.created_at) > GROUP_GAP_MS
}

const ROLE_LABEL = { osint: 'VERIFIED OSINT', admin: 'ADMIN' }

export default function MessagesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { conversations, loading, getOrCreateConversation, fetchMessages, sendMessage, markConversationRead } = useMessages()
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [otherUser, setOtherUser] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const isMobile = useIsMobile()
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Grow the composer with its content, up to ~5 lines
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [body, activeConv])

  useEffect(() => {
    if (loading || initialized) return
    const userId = searchParams.get('user')
    if (userId) { setInitialized(true); openConversationWithUser(userId) }
    else setInitialized(true)
  }, [loading, searchParams, initialized])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!activeConv) return
    const sub = supabase
      .channel(`conv:${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'social', table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, async payload => {
        const { data } = await socialDb.from('messages').select('*').eq('id', payload.new.id).single()
        if (!data) return
        setMessages(prev => [...prev, data])
        // They sent it while this chat is open: count it as seen, unless the
        // tab is in the background (the visibility effect below covers that)
        if (data.sender_id !== user?.id && document.visibilityState === 'visible') {
          markConversationRead(activeConv.id)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'social', table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, payload => {
        // Flip "Sent" to "Seen" live when the other person reads our message
        setMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, read: payload.new.read } : m))
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
    // Resubscribe only when the open conversation changes; markConversationRead
    // is recreated every render and would otherwise churn the channel
  }, [activeConv])

  // Coming back to a background tab with a chat open marks it as read
  useEffect(() => {
    if (!activeConv) return
    function onVisible() {
      if (document.visibilityState === 'visible') markConversationRead(activeConv.id)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [activeConv])

  async function openConversation(conv) {
    setActiveConv(conv)
    setOtherUser(conv.otherUser || null)
    const msgs = await fetchMessages(conv.id)
    setMessages(msgs)
  }

  async function openConversationWithUser(userId) {
    const { data: userData } = await identityDb.from('profiles').select('*').eq('id', userId).single()
    if (!userData) return
    const conv = await getOrCreateConversation(userId)
    if (conv) {
      setActiveConv(conv)
      setOtherUser(userData)
      const msgs = await fetchMessages(conv.id)
      setMessages(msgs)
    }
  }

  async function handleSend() {
    if (!body.trim() || !activeConv || sending) return
    setSending(true)
    await sendMessage(activeConv.id, body.trim())
    setBody('')
    setSending(false)
  }

  const avatarStyle = {
    width: 38, height: 38, borderRadius: '50%',
    background: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 700, color: 'var(--bg)',
    flexShrink: 0, fontFamily: 'var(--mono)',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', color: 'var(--text)',
      fontFamily: 'var(--sans)', overflow: 'hidden', zIndex: 100,
    }}>

      {/* Topbar */}
      <div style={{
        position: 'relative',
        height: 52, minHeight: 52, background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 16, flexShrink: 0,
      }}>
        <TopbarLogo />
        <span aria-hidden="true" style={{ width: 1, height: 24, background: 'var(--border)', flexShrink: 0 }} />
        {isMobile && activeConv ? (
          <BackButton variant="outline" onClick={() => setActiveConv(null)} />
        ) : (
          <BackButton variant="outline" />
        )}
        <span style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700,
          letterSpacing: 1, color: 'var(--accent)', textTransform: 'uppercase',
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          {isMobile && activeConv
            ? otherUser?.username?.toUpperCase() || 'MESSAGES'
            : 'Messages'}
        </span>
      </div>

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>

        {/* Conversations list */}
        <div style={{
          width: isMobile ? '100%' : 280,
          minWidth: isMobile ? 'unset' : 280,
          borderRight: isMobile ? 'none' : '1px solid var(--border)',
          display: isMobile && activeConv ? 'none' : 'flex',
          flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{
            padding: 16, borderBottom: '1px solid var(--border)',
            fontFamily: 'var(--mono)', fontSize: 10,
            letterSpacing: 2, color: 'var(--muted)', flexShrink: 0,
          }}>
            CONVERSATIONS
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: 20, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                LOADING...
              </div>
            ) : conversations.length === 0 ? (
              <div style={{ padding: 20, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', lineHeight: 2 }}>
                No conversations yet.<br />Visit a channel profile and click Message.
              </div>
            ) : conversations.map(conv => {
              const other = conv.otherUser
              const isActive = activeConv?.id === conv.id
              return (
                <div
                  key={conv.id}
                  onClick={() => openConversation(conv)}
                  style={{
                    display: 'flex', gap: 10,
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer', transition: 'background 0.15s',
                    background: isActive ? 'var(--active-bg)' : 'transparent',
                  }}
                  onMouseOver={e => { if (!isActive) e.currentTarget.style.background = 'var(--surface2)' }}
                  onMouseOut={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={avatarStyle}>
                    {other?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  {isMobile ? (
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                        color: other?.role === 'osint' ? 'var(--verified)' : 'var(--text)'
                      }}>
                        {other?.username || 'Unknown'}
                        {other?.role === 'osint' && <BadgeCheck size={10} style={{ color: 'var(--verified)', marginLeft: 3 }} />}
                      </div>
                    </div>
                  ) : (
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600,
                          color: other?.role === 'osint' ? 'var(--verified)' : 'var(--text)'
                        }}>
                          {other?.username || 'Unknown'}
                          {other?.role === 'osint' && <BadgeCheck size={10} style={{ color: 'var(--verified)', marginLeft: 3 }} />}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {timeAgo(conv.last_message_at)}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.last_message ? (
                          <>
                            {conv.lastSenderId === user?.id && <span style={{ color: 'var(--text)', fontWeight: 500 }}>You: </span>}
                            {conv.last_message}
                          </>
                        ) : 'No messages yet'}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Thread area */}
        <div style={{
          flex: 1, minHeight: 0,
          display: isMobile && !activeConv ? 'none' : 'flex',
          flexDirection: 'column', overflow: 'hidden',
        }}>
          {!activeConv ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)', gap: 12,
            }}>
              <Inbox size={32} style={{ opacity: 0.3 }} />
              {!loading && conversations.length === 0 ? (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, textAlign: 'center' }}>
                  <div>No messages yet</div>
                  <div style={{ marginTop: 8, fontSize: 10.5 }}>Visit a channel profile and click Message</div>
                </div>
              ) : (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, textAlign: 'center' }}>
                  <div>Select a conversation</div>
                  <div style={{ marginTop: 8, fontSize: 10.5 }}>or find a channel to start a new one</div>
                </div>
              )}
              <button
                onClick={() => navigate('/search')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, marginTop: 6,
                  padding: '8px 18px', background: 'transparent',
                  color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 4,
                  fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: 1,
                  cursor: 'pointer', transition: 'background 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.background = 'var(--topbar-hover)' }}
                onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
              >
                <Search size={12} /> FIND CHANNELS
              </button>
            </div>
          ) : (
            <>
              {/* Thread header — desktop only */}
              {!isMobile && (
                <div style={{
                  padding: '14px 20px', borderBottom: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 12,
                  flexShrink: 0, background: 'var(--surface)',
                }}>
                  <div style={{ ...avatarStyle, width: 36, height: 36, fontSize: 13 }}>
                    {otherUser?.username?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                      color: otherUser?.role === 'osint' ? 'var(--verified)' : 'var(--text)'
                    }}>
                      {otherUser?.username || 'Unknown'}
                      {otherUser?.role === 'osint' && <BadgeCheck size={10} style={{ color: 'var(--verified)', marginLeft: 4 }} />}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginTop: 2 }}>
                      {otherUser?.role?.toUpperCase() || 'USER'}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/channel/${otherUser?.username}`)}
                    style={{
                      marginLeft: 'auto', background: 'transparent',
                      border: '1px solid var(--border)', borderRadius: 4,
                      padding: '5px 12px', fontFamily: 'var(--mono)',
                      fontSize: 9, color: 'var(--muted)', cursor: 'pointer', letterSpacing: 1,
                    }}
                  >
                    VIEW PROFILE →
                  </button>
                </div>
              )}

              {/* Messages */}
              <div style={{
                flex: 1, minHeight: 0, overflowY: 'auto',
                padding: 20, display: 'flex', flexDirection: 'column',
              }}>
                {messages.length === 0 ? (
                  <div style={{
                    margin: 'auto', padding: 20,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    textAlign: 'center', gap: 8,
                  }}>
                    <div style={{ ...avatarStyle, width: 64, height: 64, fontSize: 24 }}>
                      {otherUser?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, marginTop: 6,
                      color: otherUser?.role === 'osint' ? 'var(--verified)' : 'var(--text)',
                    }}>
                      {otherUser?.username || 'Unknown'}
                      {otherUser?.role === 'osint' && <BadgeCheck size={12} style={{ color: 'var(--verified)', marginLeft: 4 }} />}
                    </div>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
                      padding: '2px 8px', borderRadius: 10,
                      color: otherUser?.role === 'osint' ? 'var(--verified)' : otherUser?.role === 'admin' ? 'var(--accent)' : 'var(--muted)',
                      border: `1px solid ${otherUser?.role === 'osint' ? 'var(--verified)' : otherUser?.role === 'admin' ? 'var(--accent)' : 'var(--border)'}`,
                    }}>
                      {ROLE_LABEL[otherUser?.role] || 'PUBLIC USER'}
                    </span>
                    <div style={{
                      fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: 0.5,
                      color: 'var(--muted)', maxWidth: '36ch', marginTop: 4, lineHeight: 1.6,
                    }}>
                      This is the start of your conversation with @{otherUser?.username || 'them'}. Say hello!
                    </div>
                  </div>
                ) : messages.map((msg, i) => {
                  const prev = messages[i - 1]
                  const next = messages[i + 1]
                  const isSent = msg.sender_id === user?.id
                  const newDay = !prev || !sameDay(prev.created_at, msg.created_at)
                  const groupStart = startsGroup(prev, msg)
                  const groupEnd = !next || startsGroup(msg, next)
                  const R = 16, TIGHT = 4
                  return (
                    <Fragment key={msg.id}>
                      {newDay && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          margin: `${i === 0 ? 0 : 18}px 0 10px`,
                          fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
                          textTransform: 'uppercase', color: 'var(--muted)',
                        }}>
                          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                          {dayLabel(msg.created_at)}
                          <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                        </div>
                      )}
                      <div style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: isSent ? 'flex-end' : 'flex-start',
                        marginTop: newDay ? 0 : groupStart ? 14 : 3,
                      }}>
                        <div style={{
                          maxWidth: '70%', padding: '10px 14px',
                          fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word', fontFamily: 'var(--sans)',
                          ...(isSent ? {
                            background: 'var(--accent)', color: 'var(--bg)',
                            borderRadius: `${R}px ${groupStart ? R : TIGHT}px ${groupEnd ? R : TIGHT}px ${R}px`,
                          } : {
                            background: 'var(--surface2)', color: 'var(--text)',
                            border: '1px solid var(--border)',
                            borderRadius: `${groupStart ? R : TIGHT}px ${R}px ${R}px ${groupEnd ? R : TIGHT}px`,
                          })
                        }}>
                          {msg.body}
                        </div>
                        {groupEnd && (
                          <div style={{
                            fontFamily: 'var(--mono)', fontSize: 9,
                            color: 'var(--muted)', marginTop: 4,
                          }}>
                            {clockTime(msg.created_at)}
                            {isSent && !next && ` · ${msg.read ? 'Seen' : 'Sent'}`}
                          </div>
                        )}
                      </div>
                    </Fragment>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <div style={{
                padding: isMobile ? '12px 16px' : '12px 16px 8px',
                borderTop: '1px solid var(--border)',
                background: 'var(--surface)', flexShrink: 0,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-end', gap: 8,
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 22, padding: '6px 6px 6px 16px',
                  transition: 'border-color 0.15s',
                }}>
                  <textarea
                    ref={inputRef}
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Message…"
                    aria-label="Message"
                    rows={1}
                    maxLength={1000}
                    onKeyDown={e => {
                      // Desktop: Enter sends, Shift+Enter adds a line. Mobile keyboards
                      // have no Shift+Enter, so Enter stays a newline there.
                      if (!isMobile && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      padding: '6px 0', color: 'var(--text)',
                      fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.5,
                      outline: 'none', resize: 'none', maxHeight: 120, overflowY: 'auto',
                    }}
                    onFocus={e => { e.target.parentElement.style.borderColor = 'var(--accent)' }}
                    onBlur={e => { e.target.parentElement.style.borderColor = 'var(--border)' }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!body.trim() || sending}
                    aria-label="Send message"
                    style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: 'var(--accent)', color: 'var(--bg)', border: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: !body.trim() || sending ? 'not-allowed' : 'pointer',
                      opacity: !body.trim() || sending ? 0.35 : 1,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    <ArrowUp size={15} strokeWidth={2.4} />
                  </button>
                </div>
                {!isMobile && (
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)',
                    letterSpacing: 0.5, marginTop: 6, paddingLeft: 16,
                  }}>
                    Enter to send · Shift+Enter for a new line
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}