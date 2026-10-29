import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMessages, conversationName, ENCRYPTED_CHAT_NOTICE } from '../../hooks/social/useMessages'
import { useAuth } from '../../hooks/core/useAuth'
import { identityDb } from '../../api/supabase'
import { useIsMobile } from '../../hooks/core/useIsMobile'
import BackButton from '../../components/BackButton'
import TopbarLogo from '../../components/TopbarLogo'
import ConversationList from '../../components/messages/ConversationList'
import EmptyThread from '../../components/messages/EmptyThread'
import ThreadHeader from '../../components/messages/ThreadHeader'
import MessageList from '../../components/messages/MessageList'
import Composer from '../../components/messages/Composer'

// First message someone else sent that we hadn't read yet
function firstUnreadIdIn(msgs, currentUserId) {
  return msgs.find(m => !m.read && m.sender_id && m.sender_id !== currentUserId)?.id || null
}

export default function MessagesPage() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()
  const {
    conversations, loading, getOrCreateConversation, fetchThread,
    sendMessage, markConversationRead, watchConversation,
  } = useMessages()
  const [activeConv, setActiveConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [otherUser, setOtherUser] = useState(null)
  const [initialized, setInitialized] = useState(false)
  // First message that was unread when the chat was opened, for the
  // "New messages" divider
  const [firstUnreadId, setFirstUnreadId] = useState(null)
  const isMobile = useIsMobile()
  const currentUserId = user?.id
  // Ignores a slow load that finishes after another chat was opened
  const openingId = useRef(null)

  const loadThread = useCallback(async (conv, { initial = false } = {}) => {
    openingId.current = conv.id
    const { conversation, messages: msgs } = await fetchThread(conv.id, {
      markRead: document.visibilityState === 'visible',
    })
    if (openingId.current !== conv.id) return
    if (conversation) {
      setActiveConv(prev => ({ ...prev, ...conversation }))
      if (conversation.otherUser) setOtherUser(conversation.otherUser)
    }
    setMessages(msgs)
    if (initial) setFirstUnreadId(firstUnreadIdIn(msgs, currentUserId))
  }, [fetchThread, currentUserId])

  // Opened from a channel profile's Message button (?user=<id>)
  const openConversationWithUser = useCallback(async otherUserId => {
    const { data: userData } = await identityDb.from('profiles').select('*').eq('id', otherUserId).single()
    if (!userData) return
    const conv = await getOrCreateConversation(otherUserId)
    if (conv) {
      setActiveConv({ ...conv, otherUser: userData })
      setOtherUser(userData)
      setFirstUnreadId(null)
      setSendError(null)
      await loadThread(conv, { initial: true })
    }
  }, [getOrCreateConversation, loadThread])

  useEffect(() => {
    if (loading || initialized) return
    const otherUserId = searchParams.get('user')
    setInitialized(true)
    if (otherUserId) openConversationWithUser(otherUserId)
  }, [loading, searchParams, initialized, openConversationWithUser])

  // Reload the open chat when a message or member changes, from the web or the app
  const activeId = activeConv?.id
  useEffect(() => {
    if (!activeId) return
    return watchConversation(activeId, () => { loadThread({ id: activeId }) })
  }, [activeId, watchConversation, loadThread])

  // Coming back to a background tab with a chat open marks it as read
  useEffect(() => {
    if (!activeId) return
    function onVisible() {
      if (document.visibilityState === 'visible') markConversationRead(activeId)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [activeId, markConversationRead])

  async function openConversation(conv) {
    setActiveConv(conv)
    setOtherUser(conv.otherUser || null)
    setFirstUnreadId(null)
    setMessages([])
    setSendError(null)
    await loadThread(conv, { initial: true })
  }

  async function handleSend() {
    if (!body.trim() || !activeConv || sending) return
    setSending(true)
    setSendError(null)
    const { error } = await sendMessage(activeConv.id, body.trim())
    if (error) {
      setSendError(error.message || 'Message not sent. Try again.')
    } else {
      setBody('')
      await loadThread({ id: activeConv.id })
    }
    setSending(false)
  }

  const threadName = conversationName(activeConv, currentUserId)
  const encrypted = !!activeConv?.isEncrypted

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
            ? threadName.toUpperCase() || 'MESSAGES'
            : 'My Tell'}
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
          currentUserId={currentUserId}
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
              {!isMobile && (
                <ThreadHeader
                  otherUser={otherUser}
                  conversation={activeConv}
                  name={threadName}
                />
              )}
              <MessageList
                messages={messages}
                currentUserId={currentUserId}
                otherUser={otherUser}
                isGroup={!!activeConv.isGroup}
                groupName={threadName}
                firstUnreadId={firstUnreadId}
              />
              <Composer
                value={body}
                onChange={setBody}
                onSend={handleSend}
                sending={sending}
                isMobile={isMobile}
                conversationId={activeConv.id}
                lockedReason={encrypted ? ENCRYPTED_CHAT_NOTICE : null}
                error={sendError}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}