import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMessages } from '../hooks/useMessages'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../api/supabase'
import { useIsMobile } from '../hooks/useIsMobile'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function MessagesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { conversations, loading, getOrCreateConversation, fetchMessages, sendMessage } = useMessages()
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [otherUser, setOtherUser] = useState(null)
  const [initialized, setInitialized] = useState(false)
  const isMobile = useIsMobile()
  const bottomRef = useRef(null)

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
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, async payload => {
        const { data } = await supabase.from('messages').select('*').eq('id', payload.new.id).single()
        if (data) setMessages(prev => [...prev, data])
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [activeConv])

  async function openConversation(conv) {
    setActiveConv(conv)
    setOtherUser(conv.otherUser || null)
    const msgs = await fetchMessages(conv.id)
    setMessages(msgs)
  }

  async function openConversationWithUser(userId) {
    const { data: userData } = await supabase.from('users').select('*').eq('id', userId).single()
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
    if (!body.trim() || !activeConv) return
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
        height: 52, minHeight: 52, background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 24px', gap: 16, flexShrink: 0,
      }}>
        <span style={{ fontSize: 20, color: 'var(--accent)' }}>⬡</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 2, color: 'var(--accent)' }}>
          {isMobile && activeConv
            ? otherUser?.username?.toUpperCase() || 'MESSAGES'
            : 'MINT — MESSAGES'}
        </span>
        {isMobile && activeConv ? (
          <button
            onClick={() => setActiveConv(null)}
            style={{
              marginLeft: 'auto', background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--muted)',
              padding: '6px 14px', borderRadius: 4,
              fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
            }}
          >
            ← Back
          </button>
        ) : (
          <button
            onClick={() => navigate('/feed')}
            style={{
              marginLeft: 'auto', background: 'transparent',
              border: '1px solid var(--border)', color: 'var(--muted)',
              padding: '6px 14px', borderRadius: 4,
              fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
            }}
          >
            ← Back to Feed
          </button>
        )}
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
                        {other?.role === 'osint' && <span style={{ color: 'var(--verified)', marginLeft: 3 }}>◆</span>}
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
                          {other?.role === 'osint' && <span style={{ color: 'var(--verified)', marginLeft: 3 }}>◆</span>}
                        </div>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {timeAgo(conv.last_message_at)}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.last_message || 'No messages yet'}
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
              <div style={{ fontSize: 32, opacity: 0.2 }}>◇</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1 }}>
                Select a conversation
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--sans)' }}>
                or visit a channel profile to start a new one
              </div>
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
                      {otherUser?.role === 'osint' && <span style={{ color: 'var(--verified)', marginLeft: 4 }}>◆</span>}
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
                padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                {messages.length === 0 ? (
                  <div style={{
                    textAlign: 'center', padding: 40,
                    fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)',
                  }}>
                    No messages yet. Say hello!
                  </div>
                ) : messages.map(msg => {
                  const isSent = msg.sender_id === user?.id
                  return (
                    <div key={msg.id} style={{
                      display: 'flex', flexDirection: 'column',
                      alignItems: isSent ? 'flex-end' : 'flex-start',
                    }}>
                      <div style={{
                        maxWidth: '70%', padding: '10px 14px',
                        borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                        wordBreak: 'break-word', fontFamily: 'var(--sans)',
                        ...(isSent ? {
                          background: 'var(--accent)', color: 'var(--bg)',
                          borderBottomRightRadius: 4,
                        } : {
                          background: 'var(--surface2)', color: 'var(--text)',
                          borderBottomLeftRadius: 4, border: '1px solid var(--border)',
                        })
                      }}>
                        {msg.body}
                      </div>
                      <div style={{
                        fontFamily: 'var(--mono)', fontSize: 9,
                        color: 'var(--muted)', marginTop: 4,
                        textAlign: isSent ? 'right' : 'left',
                      }}>
                        {timeAgo(msg.created_at)} ago
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <div style={{
                padding: '16px 20px', borderTop: '1px solid var(--border)',
                display: 'flex', gap: 10, background: 'var(--surface)', flexShrink: 0,
              }}>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Write a message... (Cmd+Enter to send)"
                  rows={2}
                  maxLength={1000}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend() }}
                  style={{
                    flex: 1, background: 'var(--bg)',
                    border: '1px solid var(--border)', borderRadius: 8,
                    padding: '10px 14px', color: 'var(--text)',
                    fontFamily: 'var(--sans)', fontSize: 13,
                    outline: 'none', resize: 'none', transition: 'border-color 0.15s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button
                  onClick={handleSend}
                  disabled={!body.trim() || sending}
                  style={{
                    padding: '10px 18px', background: 'var(--accent)',
                    color: 'var(--bg)', border: 'none', borderRadius: 8,
                    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                    cursor: !body.trim() || sending ? 'not-allowed' : 'pointer',
                    letterSpacing: 1, opacity: !body.trim() || sending ? 0.4 : 1,
                    transition: 'opacity 0.15s', alignSelf: 'flex-end',
                  }}
                >
                  {sending ? '...' : 'SEND'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}