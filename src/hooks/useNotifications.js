import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    fetchNotifications()

    const sub = supabase
      .channel(`notifs:${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `to_user_id=eq.${user.id}`
      }, payload => {
        fetchSingleNotification(payload.new.id)
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [user])

  async function enrichNotification(n) {
    const { data: fromUser } = await supabase
      .from('users')
      .select('id, username, role')
      .eq('id', n.from_user_id)
      .single()

    let postBody = null
    if (n.post_id) {
      const { data: post } = await supabase
        .from('posts')
        .select('body')
        .eq('id', n.post_id)
        .single()
      postBody = post?.body || null
    }

    return { ...n, from_user: fromUser, posts: postBody ? { body: postBody } : null }
  }

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('to_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!data) { setLoading(false); return }

    const enriched = await Promise.all(data.map(enrichNotification))
    setNotifications(enriched)
    setUnreadCount(enriched.filter(n => !n.read).length)
    setLoading(false)
  }

  async function fetchSingleNotification(id) {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      const enriched = await enrichNotification(data)
      setNotifications(prev => [enriched, ...prev])
      setUnreadCount(c => c + 1)
    }
  }

  async function markAllRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('to_user_id', user.id)
      .eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }

  async function markRead(id) {
    await supabase
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
    await supabase.from('notifications').insert({
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