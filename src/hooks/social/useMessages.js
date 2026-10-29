import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, identityDb, socialDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

// Messages live in the `messaging` schema, shared with the mobile app. All
// reads and writes go through the public msg_* RPCs (the tables have no
// insert/update policies), the same calls the app makes.
//
// The app encrypts chats end to end once everyone in them has keys. The web
// has no keys yet, so it shows those messages as locked and does not send
// into an encrypted chat: a plaintext message there would undo the
// encryption for everyone in it.

const PAGE_SIZE = 50
export const ENCRYPTED_PREVIEW = '🔒 Encrypted message'
export const ENCRYPTED_CHAT_NOTICE =
  'This chat is end-to-end encrypted. Open it in the MINT app to read and reply.'

function preview(body) {
  return body.length > 60 ? body.substring(0, 60) + '...' : body
}

function systemText(body) {
  if (body === 'e2ee:identity_changed') return 'Security code changed'
  if (body?.startsWith('e2ee:')) return 'Security update'
  return body || ''
}

function attachmentsOf(row) {
  return Array.isArray(row.attachments)
    ? row.attachments.filter(a => a && a.url).map(a => ({ url: a.url, type: a.type || 'file', name: a.name || null }))
    : []
}

function inboxPreview(row) {
  if (row.last_message_deleted) return 'Message deleted'
  if (row.last_message_kind === 'e2ee') return ENCRYPTED_PREVIEW
  if (row.last_message_kind === 'system') return systemText(row.last_message_body)
  const body = (row.last_message_body || '').trim()
  if (body) return preview(body)
  return row.last_message_id ? 'Attachment' : null
}

// Group name: its title, or the first few members
export function conversationName(conv, currentUserId) {
  if (!conv) return ''
  if (!conv.isGroup) return conv.otherUser?.username || 'Deleted user'
  const title = (conv.title || '').trim()
  if (title) return title
  const names = (conv.participants || [])
    .filter(p => p.user_id !== currentUserId)
    .map(p => p.profile?.username)
    .filter(Boolean)
    .slice(0, 3)
  return names.length ? names.join(', ') : 'Group'
}

async function profilesByIds(ids) {
  const unique = [...new Set(ids.filter(Boolean))]
  if (!unique.length) return {}
  const { data } = await identityDb
    .from('profiles')
    .select('id, username, role')
    .in('id', unique)
  return Object.fromEntries((data || []).map(p => [p.id, p]))
}

function rows(data) {
  if (Array.isArray(data)) return data
  return data ? [data] : []
}

export function useMessages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)
  // Callbacks below depend on the id only, so they stay stable across renders
  // and callers can list them as effect dependencies without resubscribing
  const userId = user?.id
  // Latest conversation details per id, for the send guard and notifications
  const details = useRef({})

  const fetchConversations = useCallback(async () => {
    const { data, error } = await supabase.rpc('msg_get_inbox', { p_limit: 100, p_before: null })
    if (error || !data) { setLoading(false); return }

    const list = rows(data)
    const profiles = await profilesByIds(list.map(r => r.other_user_id))
    setConversations(list.map(r => {
      const isGroup = r.kind === 'group'
      return {
        id: r.conversation_id,
        kind: r.kind || 'direct',
        isGroup,
        title: r.title || null,
        isEncrypted: !!r.is_e2ee,
        isMuted: !!r.is_muted,
        otherUser: isGroup ? null : profiles[r.other_user_id] || null,
        last_message: inboxPreview(r),
        last_message_at: r.last_activity_at,
        lastSenderId: r.last_message_sender_id || null,
        unreadCount: r.unread_count || 0,
      }
    }))
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!userId) return
    fetchConversations()

    // A new message bumps its conversation's last activity; joining or
    // leaving a chat changes this user's participant row
    const sub = supabase
      .channel(`inbox:${userId}:${Date.now()}`)
      .on('postgres_changes', {
        event: '*', schema: 'messaging', table: 'conversations',
      }, () => { fetchConversations() })
      .on('postgres_changes', {
        event: '*', schema: 'messaging', table: 'participants',
        filter: `user_id=eq.${userId}`,
      }, () => { fetchConversations() })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [userId, fetchConversations])

  const getOrCreateConversation = useCallback(async otherUserId => {
    const { data, error } = await supabase.rpc('msg_get_or_create_direct', { p_other_user_id: otherUserId })
    if (error || !data) return null
    return { id: data, kind: 'direct', isGroup: false }
  }, [])

  // Mark everything up to the newest message as read
  const markConversationRead = useCallback(async conversationId => {
    await supabase.rpc('msg_mark_read', { p_conversation_id: conversationId, p_message_id: null })
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c))
  }, [])

  // The conversation (members, encryption) and its newest messages,
  // oldest-first. Each message's `read` says, for one you sent, whether
  // someone else has read it, and for one you received, whether you had
  // read it before this load.
  const fetchThread = useCallback(async (conversationId, { markRead = true } = {}) => {
    const [convRes, msgRes] = await Promise.all([
      supabase.rpc('msg_get_conversation', { p_conversation_id: conversationId }),
      supabase.rpc('msg_get_messages', { p_conversation_id: conversationId, p_before_id: null, p_limit: PAGE_SIZE }),
    ])
    const convRow = rows(convRes.data)[0] || null
    const msgRows = rows(msgRes.data)
    const participants = convRow?.participants || []

    const profiles = await profilesByIds([
      ...participants.map(p => p.user_id),
      ...msgRows.map(m => m.sender_id),
    ])
    const isGroup = convRow?.kind === 'group'
    const others = participants.filter(p => p.user_id !== userId)
    const mine = participants.find(p => p.user_id === userId)
    const myLastRead = mine?.last_read_message_id || 0
    const othersLastRead = Math.max(0, ...others.map(p => p.last_read_message_id || 0))

    const conversation = convRow && {
      id: convRow.id,
      kind: convRow.kind || 'direct',
      isGroup,
      title: convRow.title || null,
      isEncrypted: !!convRow.e2ee,
      participants: participants.map(p => ({ ...p, profile: profiles[p.user_id] || null })),
      otherUser: isGroup ? null : profiles[others[0]?.user_id] || null,
    }
    if (conversation) details.current[conversationId] = conversation

    const messages = msgRows
      .map(m => {
        const deleted = !!m.deleted_at
        const encrypted = m.kind === 'e2ee'
        const system = m.kind === 'system'
        return {
          id: m.id,
          conversation_id: m.conversation_id,
          sender_id: m.sender_id,
          sender: profiles[m.sender_id] || null,
          kind: encrypted ? 'e2ee' : system ? 'system' : 'text',
          encrypted,
          deleted,
          removedByModerator: !!m.removed_by_moderator,
          edited: !!m.edited_at,
          body: system ? systemText(m.body) : encrypted ? '' : m.body || '',
          attachments: deleted || encrypted ? [] : attachmentsOf(m),
          created_at: m.created_at,
          read: m.sender_id === userId ? m.id <= othersLastRead : m.id <= myLastRead,
        }
      })
      // Newest-first from the server; oldest-first for display
      .reverse()

    if (markRead) await markConversationRead(conversationId)
    return { conversation, messages }
  }, [userId, markConversationRead])

  const fetchMessages = useCallback(async conversationId =>
    (await fetchThread(conversationId)).messages, [fetchThread])

  // Calls onChange whenever a message or member in the chat changes
  const watchConversation = useCallback((conversationId, onChange) => {
    const sub = supabase
      .channel(`conv:${conversationId}:${Date.now()}`)
      .on('postgres_changes', {
        event: '*', schema: 'messaging', table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => onChange({ type: 'message', senderId: payload.new?.sender_id || null }))
      .on('postgres_changes', {
        event: '*', schema: 'messaging', table: 'participants',
        filter: `conversation_id=eq.${conversationId}`,
      }, () => onChange({ type: 'participants' }))
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  const sendMessage = useCallback(async (conversationId, body) => {
    if (details.current[conversationId]?.isEncrypted) {
      return { error: { message: ENCRYPTED_CHAT_NOTICE } }
    }
    const { error } = await supabase.rpc('msg_send', {
      p_conversation_id: conversationId,
      p_body: body,
      p_attachments: [],
      p_reply_to_id: null,
    })

    if (!error) {
      // Keep the web's bell notification for direct chats
      const conv = details.current[conversationId]
      const otherId = !conv?.isGroup && conv?.otherUser?.id
      if (otherId) {
        await socialDb.from('notifications').insert({
          to_user_id: otherId,
          from_user_id: userId,
          type: 'message',
          post_id: null,
        })
      }
      fetchConversations()
    }
    return { error }
  }, [userId, fetchConversations])

  return {
    conversations, unreadCount, loading,
    getOrCreateConversation, fetchThread, fetchMessages, sendMessage,
    markConversationRead, watchConversation,
  }
}
