import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMessages } from '../../hooks/social/useMessages'
import { useAuth } from '../../hooks/core/useAuth'
import { supabase, identityDb, socialDb } from '../../api/supabase'
import { useIsMobile } from '../../hooks/core/useIsMobile'
import BackButton from '../../components/BackButton'
import TopbarLogo from '../../components/TopbarLogo'
import ConversationList from '../../components/messages/ConversationList'
import EmptyThread from '../../components/messages/EmptyThread'
import ThreadHeader from '../../components/messages/ThreadHeader'
import MessageList from '../../components/messages/MessageList'
import Composer from '../../components/messages/Composer'

export default function MessagesPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const { conversations, loading, getOrCreateConversation, fetchMessages, sendMessage, markConversationRead } = useMessages()
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [otherUser, setOtherUser] = useState(null)
  const [initialized, setInitialized] = useState(false)
  // First message that was unread when the chat was opened, for the
  // "New messages" divider
  const [firstUnreadId, setFirstUnreadId] = useState(null)
  const isMobile = useIsMobile()

  useEffect(() => {
    if (loading || initialized) return
    const userId = searchParams.get('user')
    if (userId) { setInitialized(true); openConversationWithUser(userId) }
    else setInitialized(true)
  }, [loading, searchParams, initialized])

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

  function firstUnread(msgs) {
    return msgs.find(m => !m.read && m.sender_id !== user?.id)?.id || null
  }

  async function openConversation(conv) {
    setActiveConv(conv)
    setOtherUser(conv.otherUser || null)
    setFirstUnreadId(null)
    const msgs = await fetchMessages(conv.id)
    setMessages(msgs)
    setFirstUnreadId(firstUnread(msgs))
  }

  async function openConversationWithUser(userId) {
    const { data: userData } = await identityDb.from('profiles').select('*').eq('id', userId).single()
    if (!userData) return
    const conv = await getOrCreateConversation(userId)
    if (conv) {
      setActiveConv(conv)
      setOtherUser(userData)
      setFirstUnreadId(null)
      const msgs = await fetchMessages(conv.id)
      setMessages(msgs)
      setFirstUnreadId(firstUnread(msgs))
    }
  }

  async function handleSend() {
    if (!body.trim() || !activeConv || sending) return
    setSending(true)
    await sendMessage(activeConv.id, body.trim())
    setBody('')
    setSending(false)
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
        <ConversationList
          conversations={conversations}
          loading={loading}
          activeConvId={activeConv?.id}
          isMobile={isMobile}
          hidden={isMobile && !!activeConv}
          currentUserId={user?.id}
          onOpen={openConversation}
        />

        {/* Thread area */}
        <div style={{
          flex: 1, minHeight: 0,
          display: isMobile && !activeConv ? 'none' : 'flex',
          flexDirection: 'column', overflow: 'hidden',
        }}>
          {!activeConv ? (
            <EmptyThread noConversations={!loading && conversations.length === 0} />
          ) : (
            <>
              {!isMobile && <ThreadHeader otherUser={otherUser} />}
              <MessageList
                messages={messages}
                currentUserId={user?.id}
                otherUser={otherUser}
                firstUnreadId={firstUnreadId}
              />
              <Composer
                value={body}
                onChange={setBody}
                onSend={handleSend}
                sending={sending}
                isMobile={isMobile}
                conversationId={activeConv.id}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}