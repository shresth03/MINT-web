import { useState, useEffect } from 'react'
import { supabase, identityDb, socialDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

function preview(body) {
  return body.length > 60 ? body.substring(0, 60) + '...' : body
}

export function useMessages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const unreadCount = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0)

  useEffect(() => {
    if (!user?.id) return
    fetchConversations()

    const sub = supabase
      .channel(`msgs:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'social',
        table: 'messages'
      }, () => {
        fetchConversations()
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [user])

  async function fetchConversations() {
    const { data } = await socialDb
      .from('conversations')
      .select('id, participant_1, participant_2, last_message, last_message_at')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false })

    if (!data) { setLoading(false); return }

    // Enrich each conversation with the other user's profile and its newest
    // message (who sent it, for the "You:" prefix, and its text/time)
    const enriched = await Promise.all(data.map(async conv => {
      const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
      const [{ data: otherUser }, { data: lastMsg }] = await Promise.all([
        identityDb
          .from('profiles')
          .select('id, username, role')
          .eq('id', otherId)
          .single(),
        socialDb
          .from('messages')
          .select('sender_id, body, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])
      return {
        ...conv,
        otherUser,
        lastSenderId: lastMsg?.sender_id || null,
        // Read from the message itself: a realtime refetch can land before the
        // sender's client has updated conversations.last_message
        last_message: lastMsg ? preview(lastMsg.body) : conv.last_message,
        last_message_at: lastMsg?.created_at || conv.last_message_at,
      }
    }))
    enriched.sort((a, b) => new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0))

    // Unread per conversation: messages from the other person not yet read
    const counts = {}
    if (enriched.length) {
      const { data: unread } = await socialDb
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', enriched.map(c => c.id))
        .eq('read', false)
        .neq('sender_id', user.id)
      for (const m of unread || []) counts[m.conversation_id] = (counts[m.conversation_id] || 0) + 1
    }

    setConversations(enriched.map(c => ({ ...c, unreadCount: counts[c.id] || 0 })))
    setLoading(false)
  }

  async function getOrCreateConversation(otherUserId) {
    // Check both participant orderings
    const { data: existing1 } = await socialDb
      .from('conversations')
      .select('id, participant_1, participant_2, last_message, last_message_at')
      .eq('participant_1', user.id)
      .eq('participant_2', otherUserId)
      .maybeSingle()

    if (existing1) return existing1

    const { data: existing2 } = await socialDb
      .from('conversations')
      .select('id, participant_1, participant_2, last_message, last_message_at')
      .eq('participant_1', otherUserId)
      .eq('participant_2', user.id)
      .maybeSingle()

    if (existing2) return existing2

    // Create new conversation
    const { data, error } = await socialDb
      .from('conversations')
      .insert({ participant_1: user.id, participant_2: otherUserId })
      .select()
      .single()

    if (!error) return data
    return null
  }

  async function fetchMessages(conversationId) {
    const { data } = await socialDb
      .from('messages')
      .select('id, conversation_id, sender_id, body, read, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(100)

    await markConversationRead(conversationId)

    // Fetched newest-first so the limit keeps the latest 100; flip back to
    // oldest-first for display
    return (data || []).reverse()
  }

  // Mark every message the other person sent in this conversation as read
  async function markConversationRead(conversationId) {
    await socialDb
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('read', false)
    setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, unreadCount: 0 } : c))
  }

  async function sendMessage(conversationId, body) {
    const { error } = await socialDb.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body
    })

    if (!error) {
        await socialDb
          .from('conversations')
          .update({
            last_message: preview(body),
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversationId)
      
        // Notify recipient
        const otherId = await getOtherParticipant(conversationId)
        if (otherId) {
          await socialDb.from('notifications').insert({
            to_user_id: otherId,
            from_user_id: user.id,
            type: 'message',
            post_id: null
          })
        }
      
        fetchConversations()
      }
    return { error }
  }
  async function getOtherParticipant(conversationId) {
    const { data } = await socialDb
      .from('conversations')
      .select('participant_1, participant_2')
      .eq('id', conversationId)
      .single()
    if (!data) return null
    return data.participant_1 === user.id ? data.participant_2 : data.participant_1
  }
  return {
    conversations, unreadCount, loading,
    getOrCreateConversation, fetchMessages, sendMessage, markConversationRead
  }
}