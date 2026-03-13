import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMessages } from '../hooks/useMessages'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../api/supabase'
import { useIsMobile } from '../hooks/useIsMobile'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s`
  if (diff < 3600) return `${Math.floor(diff/60)}m`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  return `${Math.floor(diff/86400)}d`
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#080c10; --surface:#0d1219; --surface2:#131c26;
    --border:#1e2d3d; --accent:#00d4ff; --accent2:#ff6b35;
    --verified:#00ff88; --text:#c8d6e5; --muted:#4a6080;
    --mono:'IBM Plex Mono',monospace;
  }
  .msg-page { position:fixed; inset:0; display:flex; flex-direction:column; background:var(--bg); color:var(--text); font-family:'IBM Plex Sans',sans-serif; overflow:hidden; z-index:100; }
  .msg-topbar { height:52px; min-height:52px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 24px; gap:16px; flex-shrink:0; }
  .msg-title { font-family:var(--mono); font-size:12px; letter-spacing:2px; color:var(--accent); }
  .back-btn { background:transparent; border:1px solid var(--border); color:var(--muted); padding:6px 14px; border-radius:4px; font-family:var(--mono); font-size:10px; cursor:pointer; }
  .back-btn:hover { color:var(--text); border-color:#2a3d54; }
  .msg-body { flex:1; min-height:0; display:flex; overflow:hidden; }
  .conv-list { width:280px; min-width:280px; border-right:1px solid var(--border); display:flex; flex-direction:column; overflow:hidden; }
  .conv-header { padding:16px; border-bottom:1px solid var(--border); font-family:var(--mono); font-size:10px; letter-spacing:2px; color:var(--muted); flex-shrink:0; }
  .conv-item { display:flex; gap:10px; padding:14px 16px; border-bottom:1px solid var(--border); cursor:pointer; transition:background 0.15s; }
  .conv-item:hover { background:var(--surface2); }
  .conv-item.active { background:rgba(0,212,255,0.06); border-left:2px solid var(--accent); }
  .conv-avatar { width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg,#1e3a5f,#0d6efd); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:white; flex-shrink:0; }
  .conv-name { font-family:var(--mono); font-size:11px; font-weight:600; margin-bottom:3px; }
  .conv-preview { font-size:11px; color:var(--muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .conv-time { font-family:var(--mono); font-size:9px; color:var(--muted); white-space:nowrap; }
  .thread-area { flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
  .thread-header { padding:14px 20px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:12px; flex-shrink:0; background:var(--surface); }
  .thread-messages { flex:1; min-height:0; overflow-y:auto; padding:20px; display:flex; flex-direction:column; gap:12px; }
  .msg-bubble { max-width:70%; padding:10px 14px; border-radius:12px; font-size:13px; line-height:1.5; word-break:break-word; }
  .msg-bubble.sent { background:var(--accent); color:#000; align-self:flex-end; border-bottom-right-radius:4px; }
  .msg-bubble.received { background:var(--surface2); color:var(--text); align-self:flex-start; border-bottom-left-radius:4px; border:1px solid var(--border); }
  .msg-time { font-family:var(--mono); font-size:9px; color:var(--muted); margin-top:4px; }
  .msg-time.sent { text-align:right; }
  .composer { padding:16px 20px; border-top:1px solid var(--border); display:flex; gap:10px; background:var(--surface); flex-shrink:0; }
  .msg-input { flex:1; background:var(--bg); border:1px solid var(--border); border-radius:8px; padding:10px 14px; color:var(--text); font-family:'IBM Plex Sans',sans-serif; font-size:13px; outline:none; resize:none; transition:border-color 0.15s; }
  .msg-input:focus { border-color:var(--accent); }
  .send-btn { padding:10px 18px; background:var(--accent); color:#000; border:none; border-radius:8px; font-family:var(--mono); font-size:10px; font-weight:700; cursor:pointer; letter-spacing:1px; transition:opacity 0.15s; align-self:flex-end; }
  .send-btn:disabled { opacity:0.4; cursor:not-allowed; }
  .empty-state { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--muted); gap:12px; }

  /* Mobile — conv list takes full width */
  @media (max-width: 768px) {
    .conv-list { width:100%; min-width:unset; border-right:none; }
  }
`

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
    if (userId) {
      setInitialized(true)
      openConversationWithUser(userId)
    } else {
      setInitialized(true)
    }
  }, [loading, searchParams, initialized])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!activeConv) return
    const sub = supabase
      .channel(`conv:${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, async payload => {
        const { data } = await supabase
          .from('messages')
          .select('*')
          .eq('id', payload.new.id)
          .single()
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
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
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

  return (
    <>
      <style>{styles}</style>
      <div className="msg-page">

        {/* Topbar */}
        <div className="msg-topbar">
          <span style={{ fontSize:20, color:'#00d4ff' }}>⬡</span>
          <span className="msg-title">
            {isMobile && activeConv
              ? otherUser?.username?.toUpperCase() || 'MESSAGES'
              : 'MINT — MESSAGES'}
          </span>
          {isMobile && activeConv ? (
            /* Mobile in-thread: back to conversation list */
            <button className="back-btn" style={{ marginLeft:'auto' }} onClick={() => setActiveConv(null)}>
              ← Back
            </button>
          ) : (
            /* Default: back to feed */
            <button className="back-btn" style={{ marginLeft:'auto' }} onClick={() => navigate('/feed')}>
              ← Back to Feed
            </button>
          )}
        </div>

        <div className="msg-body">

          {/* Conversations list — hidden on mobile when a thread is open */}
          <div className="conv-list" style={isMobile && activeConv ? { display:'none' } : {}}>
            <div className="conv-header">CONVERSATIONS</div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {loading ? (
                <div style={{ padding:20, fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>
                  LOADING...
                </div>
              ) : conversations.length === 0 ? (
                <div style={{ padding:20, fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', lineHeight:2 }}>
                  No conversations yet.<br/>Visit a channel profile and click Message.
                </div>
              ) : conversations.map(conv => {
                const other = conv.otherUser
                return (
                  <div
                    key={conv.id}
                    className={`conv-item ${activeConv?.id === conv.id ? 'active' : ''}`}
                    onClick={() => openConversation(conv)}
                  >
                    <div className="conv-avatar">
                      {other?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    {isMobile ? (
                      /* Mobile: name only */
                      <div style={{ flex:1, minWidth:0, display:'flex', alignItems:'center' }}>
                        <div className="conv-name" style={{
                          color: other?.role === 'osint' ? 'var(--verified)' : 'var(--text)'
                        }}>
                          {other?.username || 'Unknown'}
                          {other?.role === 'osint' && <span style={{color:'var(--verified)',marginLeft:3}}>◆</span>}
                        </div>
                      </div>
                    ) : (
                      /* Desktop: name + preview + time */
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                          <div className="conv-name" style={{
                            color: other?.role === 'osint' ? 'var(--verified)' : 'var(--text)'
                          }}>
                            {other?.username || 'Unknown'}
                            {other?.role === 'osint' && <span style={{color:'var(--verified)',marginLeft:3}}>◆</span>}
                          </div>
                          <div className="conv-time">{timeAgo(conv.last_message_at)}</div>
                        </div>
                        <div className="conv-preview">
                          {conv.last_message || 'No messages yet'}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Thread area — hidden on mobile until a conv is selected */}
          <div className="thread-area" style={isMobile && !activeConv ? { display:'none' } : {}}>
            {!activeConv ? (
              <div className="empty-state">
                <div style={{ fontSize:32, opacity:0.2 }}>◇</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:1 }}>
                  Select a conversation
                </div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
                  or visit a channel profile to start a new one
                </div>
              </div>
            ) : (
              <>
                {/* Thread header — desktop only, mobile uses topbar */}
                {!isMobile && (
                  <div className="thread-header">
                    <div style={{
                      width:36, height:36, borderRadius:'50%',
                      background:'linear-gradient(135deg,#1e3a5f,#0d6efd)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:14, fontWeight:700, color:'white', flexShrink:0
                    }}>
                      {otherUser?.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div style={{
                        fontFamily:'var(--mono)', fontSize:12, fontWeight:600,
                        color: otherUser?.role === 'osint' ? 'var(--verified)' : 'var(--text)'
                      }}>
                        {otherUser?.username || 'Unknown'}
                        {otherUser?.role === 'osint' && <span style={{color:'var(--verified)',marginLeft:4}}>◆</span>}
                      </div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', marginTop:2 }}>
                        {otherUser?.role?.toUpperCase() || 'USER'}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/channel/${otherUser?.username}`)}
                      style={{
                        marginLeft:'auto', background:'transparent',
                        border:'1px solid var(--border)', borderRadius:4,
                        padding:'5px 12px', fontFamily:'var(--mono)',
                        fontSize:9, color:'var(--muted)', cursor:'pointer',
                        letterSpacing:1
                      }}
                    >
                      VIEW PROFILE →
                    </button>
                  </div>
                )}

                {/* Messages */}
                <div className="thread-messages">
                  {messages.length === 0 ? (
                    <div style={{
                      textAlign:'center', padding:40,
                      fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)'
                    }}>
                      No messages yet. Say hello!
                    </div>
                  ) : messages.map(msg => {
                    const isSent = msg.sender_id === user?.id
                    return (
                      <div key={msg.id} style={{
                        display:'flex', flexDirection:'column',
                        alignItems: isSent ? 'flex-end' : 'flex-start'
                      }}>
                        <div className={`msg-bubble ${isSent ? 'sent' : 'received'}`}>
                          {msg.body}
                        </div>
                        <div className={`msg-time ${isSent ? 'sent' : ''}`}>
                          {timeAgo(msg.created_at)} ago
                        </div>
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Composer */}
                <div className="composer">
                  <textarea
                    className="msg-input"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Write a message... (Cmd+Enter to send)"
                    rows={2}
                    maxLength={1000}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend()
                    }}
                  />
                  <button
                    className="send-btn"
                    onClick={handleSend}
                    disabled={!body.trim() || sending}
                  >
                    {sending ? '...' : 'SEND'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
