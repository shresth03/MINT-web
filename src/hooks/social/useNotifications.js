import { useState, useEffect, useCallback } from 'react'
import { supabase, contentDb, identityDb, socialDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

// Adds the sender's profile and the post text to a notification row
async function enrichNotification(n) {
  const { data: fromUser } = await identityDb
    .from('profiles')
    .select('id, username, role')
    .eq('id', n.from_user_id)
    .single()

  let postBody = null
  if (n.post_id) {
    const { data: post } = await contentDb
      .from('posts')
      .select('body')
      .eq('id', n.post_id)
      .single()
    postBody = post?.body || null
  }

  return { ...n, from_user: fromUser, posts: postBody ? { body: postBody } : null }
}

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const userId = user?.id


  const fetchNotifications = useCallback(async () => {
    const { data } = await socialDb
      .from('notifications')
      .select('id, to_user_id, from_user_id, post_id, type, read, created_at')
      .eq('to_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!data) { setLoading(false); return }

    const enriched = await Promise.all(data.map(enrichNotification))
    setNotifications(enriched)
    setUnreadCount(enriched.filter(n => !n.read).length)
    setLoading(false)
  }, [userId])

  const fetchSingleNotification = useCallback(async id => {
    const { data } = await socialDb
      .from('notifications')
      .select('id, to_user_id, from_user_id, post_id, type, read, created_at')
      .eq('id', id)
      .single()

    if (data) {
      const enriched = await enrichNotification(data)
      setNotifications(prev => [enriched, ...prev])
      setUnreadCount(c => c + 1)
    }
  }, [])

  useEffect(() => {
    if (!userId) return
    fetchNotifications()

    const sub = supabase
      .channel(`notifs:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'social',
        table: 'notifications',
        filter: `to_user_id=eq.${userId}`
      }, payload => {
        fetchSingleNotification(payload.new.id)
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [userId, fetchNotifications, fetchSingleNotification])

  async function markAllRead() {
    await socialDb
      .from('notifications')
      .update({ read: true })
      .eq('to_user_id', user.id)
      .eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markRead(id) {
    await socialDb
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    setNotifications(prev => prev.map(n =>
      n.id === id ? { ...n, read: true } : n
    ))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  async function createNotification(toUserId, type, postId = null) {
    if (!user?.id || toUserId === user.id) return
    await socialDb.from('notifications').insert({
      to_user_id: toUserId,
      from_user_id: user.id,
      type,
      post_id: postId || null
    })
  }

  return {
    notifications, unreadCount, loading,
    markAllRead, markRead, createNotification
  }
}
