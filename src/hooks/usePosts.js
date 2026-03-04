import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'

export function usePosts() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
    const sub = supabase
      .channel('public:posts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: 'is_osint=eq.false'
      }, payload => {
        fetchSinglePost(payload.new.id)
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [])

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select('*, users(username, role, score)')
      .eq('is_osint', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error) setPosts(data || [])
    setLoading(false)
  }

  async function fetchSinglePost(id) {
    const { data } = await supabase
      .from('posts')
      .select('*, users(username, role, score)')
      .eq('id', id)
      .single()
    if (data) setPosts(prev => [data, ...prev])
  }

  async function createPost(body, region = null, tag = null) {
    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      body,
      region,
      tag,
      is_osint: false,
      likes: 0,
      reply_count: 0
    })
    return { error }
  }

  async function likePost(id, currentLikes) {
    const { error } = await supabase
      .from('posts')
      .update({ likes: currentLikes + 1 })
      .eq('id', id)
    if (!error) {
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, likes: currentLikes + 1 } : p
      ))
    }
  }

  async function createReply(postId, body) {
    const { error } = await supabase.from('replies').insert({
      post_id: postId,
      author_id: user.id,
      body
    })
    if (!error) {
      // Increment reply_count on the post
      const post = posts.find(p => p.id === postId)
      if (post) {
        await supabase
          .from('posts')
          .update({ reply_count: (post.reply_count || 0) + 1 })
          .eq('id', postId)
        setPosts(prev => prev.map(p =>
          p.id === postId ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p
        ))
      }
    }
    return { error }
  }

  async function fetchReplies(postId) {
    const { data, error } = await supabase
      .from('replies')
      .select('*, users(username, role)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    return { data: data || [], error }
  }

  return { posts, loading, createPost, likePost, createReply, fetchReplies }
}