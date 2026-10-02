import { useState, useEffect } from 'react'
import { supabase, identityDb, socialDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

export function useMessages() {
  const { user } = useAuth()

  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    fetchConversations()

    const sub = supabase
      .channel(`msgs:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'messaging',
          table: 'messages'
        },
        () => {
          fetchConversations()
        }
      )
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [user])

  async function fetchConversations() {
    if (!user?.id) return

    setLoading(true)

    const { data, error } = await socialDb.rpc('msg_get_inbox', {
      p_limit: 30,
      p_before: null,
    })

    if (error) {
      console.error('Error fetching conversations:', error)
      setLoading(false)
      return
    }

    const rows = data || []

    const otherUserIds = rows
      .map(c => c.other_user_id)
      .filter(Boolean)

    let profilesById = new Map()

    if (otherUserIds.length) {
      const { data: profiles, error: profileError } =
        await identityDb.rpc('profile_get_by_ids', {
          p_ids: [...new Set(otherUserIds)]
        })

      if (profileError) {
        console.error('Error fetching conversation profiles:', profileError)
      }

      profilesById = new Map(
        (profiles || []).map(profile => [profile.id, profile])
      )
    }

    const enrichedConversations = rows.map(c => ({
      ...c,
      other_user: profilesById.get(c.other_user_id) || null,
    }))

    setConversations(enrichedConversations)

    const totalUnread = rows.reduce(
      (total, conversation) => total + (conversation.unread_count || 0),
      0
    )

    setUnreadCount(totalUnread)
    setLoading(false)
  }

  async function getOrCreateConversation(otherUserId) {
    if (!user?.id || !otherUserId) return null

    const { data, error } = await socialDb.rpc(
      'msg_get_or_create_direct',
      {
        p_other_user_id: otherUserId,
      }
    )

    if (error) {
      console.error('Error creating conversation:', error)
      return null
    }

    return data
  }

  async function fetchMessages(conversationId, beforeId = null) {
    if (!conversationId) return

    const { data, error } = await socialDb.rpc('msg_get_messages', {
      p_conversation_id: conversationId,
      p_before_id: beforeId,
      p_limit: 50,
    })

    if (error) {
      console.error('Error fetching messages:', error)
      return
    }

    const fetchedMessages = [...(data || [])].reverse()

    setMessages(fetchedMessages)

    if (fetchedMessages.length > 0) {
      await socialDb.rpc('msg_mark_read', {
        p_conversation_id: conversationId,
        p_message_id: fetchedMessages[fetchedMessages.length - 1].id,
      })

      fetchConversations()
    }
  }

  async function sendMessage(conversationId, body) {
    const { data: message, error } = await socialDb.rpc('msg_send', {
      p_conversation_id: conversationId,
      p_body: body,
      p_attachments: [],
      p_reply_to_id: null,
    })

    if (error) {
      return { error }
    }

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

    return {
      data: message,
      error: null
    }
  }

  async function getOtherParticipant(conversationId) {
    const { data, error } = await socialDb.rpc(
      'msg_get_conversation',
      {
        p_conversation_id: conversationId
      }
    )

    if (error || !data) {
      if (error) {
        console.error('Error fetching conversation:', error)
      }

      return null
    }

    const participants = data.participants || []

    const otherParticipant = participants.find(
      participant => participant.user_id !== user.id
    )

    return otherParticipant?.user_id || null
  }

  return {
    conversations,
    messages,
    unreadCount,
    loading,
    getOrCreateConversation,
    fetchMessages,
    sendMessage
  }
}