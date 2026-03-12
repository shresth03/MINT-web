import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'

export function useMessages() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    fetchConversations()

    const sub = supabase
      .channel(`msgs:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages'
      }, () => {
        fetchConversations()
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [user])

  async function fetchConversations() {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false })

    if (!data) { setLoading(false); return }

    // Enrich each conversation with the other user's profile
    const enriched = await Promise.all(data.map(async conv => {
      const otherId = conv.participant_1 === user.id ? conv.participant_2 : conv.participant_1
      const { data: otherUser } = await supabase
        .from('users')
        .select('id, username, role')
        .eq('id', otherId)
        .single()
      return { ...conv, otherUser }
    }))

    setConversations(enriched)

    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact' })
      .eq('read', false)
      .neq('sender_id', user.id)

    setUnreadCount(count || 0)
    setLoading(false)
  }

  async function getOrCreateConversation(otherUserId) {
    // Check both participant orderings
    const { data: existing1 } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_1', user.id)
      .eq('participant_2', otherUserId)
      .maybeSingle()

    if (existing1) return existing1

    const { data: existing2 } = await supabase
      .from('conversations')
      .select('*')
      .eq('participant_1', otherUserId)
      .eq('participant_2', user.id)
      .maybeSingle()

    if (existing2) return existing2

    // Create new conversation
    const { data, error } = await supabase
      .from('conversations')
      .insert({ participant_1: user.id, participant_2: otherUserId })
      .select()
      .single()

    if (!error) return data
    return null
  }

  async function fetchMessages(conversationId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(100)

    // Mark received messages as read
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .eq('read', false)

    return data || []
  }

  async function sendMessage(conversationId, body) {
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body
    })

    if (!error) {
        await supabase
          .from('conversations')
          .update({
            last_message: body.length > 60 ? body.substring(0, 60) + '...' : body,
            last_message_at: new Date().toISOString()
          })
          .eq('id', conversationId)
      
        // Notify recipient
        const otherId = await getOtherParticipant(conversationId)
        if (otherId) {
          await supabase.from('notifications').insert({
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
    const { data } = await supabase
      .from('conversations')
      .select('participant_1, participant_2')
      .eq('id', conversationId)
      .single()
    if (!data) return null
    return data.participant_1 === user.id ? data.participant_2 : data.participant_1
  }
  return {
    conversations, unreadCount, loading,
    getOrCreateConversation, fetchMessages, sendMessage
  }
}