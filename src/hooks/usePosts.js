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
      .select('*, users(id, username, role, score)')
      .eq('is_osint', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      const { data: likedData } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', user.id)
      const { data: savedData } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', user.id)
      const { data: repostedData } = await supabase
        .from('reposts')
        .select('post_id')
        .eq('user_id', user.id)

      const likedIds = new Set((likedData || []).map(l => l.post_id))
      const savedIds = new Set((savedData || []).map(s => s.post_id))
      const repostedIds = new Set((repostedData || []).map(r => r.post_id))

      setPosts(data.map(p => ({
        ...p,
        liked: likedIds.has(p.id),
        saved: savedIds.has(p.id),
        reposted: repostedIds.has(p.id)
      })))
    }
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

  async function createPost(body, mediaUrl = null, region = null, tag = null) {
    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      body,
      region,
      tag,
      is_osint: false,
      likes: 0,
      reply_count: 0,
      repost_count: 0,
      ...(mediaUrl ? { media_url: mediaUrl } : {})
    })
    return { error }
  }

  async function likePost(id, createNotification = null) {
    const existing = posts.find(p => p.id === id)?.liked
    if (existing) {
      await supabase.from('likes').delete()
        .eq('user_id', user.id).eq('post_id', id)
      await supabase.from('posts')
        .update({ likes: Math.max(0, (posts.find(p=>p.id===id)?.likes||1)-1) })
        .eq('id', id)
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, likes: Math.max(0,(p.likes||1)-1), liked: false } : p
      ))
    } else {
      await supabase.from('likes').insert({ user_id: user.id, post_id: id })
      const post = posts.find(p => p.id === id)
      if (createNotification && post?.users?.id) {
        createNotification(post.users.id, 'like', id)
      }
      await supabase.from('posts')
        .update({ likes: (posts.find(p=>p.id===id)?.likes||0)+1 })
        .eq('id', id)
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, likes: (p.likes||0)+1, liked: true } : p
      ))
    }
  }

  async function savePost(id) {
    const existing = posts.find(p => p.id === id)?.saved
    if (existing) {
      await supabase.from('saved_posts').delete()
        .eq('user_id', user.id).eq('post_id', id)
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, saved: false } : p
      ))
    } else {
      await supabase.from('saved_posts').insert({ user_id: user.id, post_id: id })
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, saved: true } : p
      ))
    }
  }

  async function repost(id, quoteBody = null) {
    const existing = posts.find(p => p.id === id)?.reposted
    if (existing) {
      await supabase.from('reposts').delete()
        .eq('user_id', user.id).eq('post_id', id)
      await supabase.from('posts')
        .update({ repost_count: Math.max(0, (posts.find(p=>p.id===id)?.repost_count||1)-1) })
        .eq('id', id)
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, repost_count: Math.max(0,(p.repost_count||1)-1), reposted: false } : p
      ))
    } else {
      await supabase.from('reposts').insert({
        user_id: user.id,
        post_id: id,
        quote_body: quoteBody || null
      })
      await supabase.from('posts')
        .update({ repost_count: (posts.find(p=>p.id===id)?.repost_count||0)+1 })
        .eq('id', id)
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, repost_count: (p.repost_count||0)+1, reposted: true } : p
      ))
    }
  }

  async function createReply(postId, body) {
    const { data: insertData, error } = await supabase
      .from('replies')
      .insert({ post_id: postId, author_id: user.id, body })
      .select('id')
      .single()
  
    if (error) return { data: null, error }
  
    // Fetch with user join separately (avoids RLS issue on inline join)
    const { data: replyData } = await supabase
      .from('replies')
      .select('*, users(username, role)')
      .eq('id', insertData.id)
      .single()
  
    const post = posts.find(p => p.id === postId)
    if (post) {
      await supabase.from('posts')
        .update({ reply_count: (post.reply_count || 0) + 1 })
        .eq('id', postId)
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p
      ))
    }
  
    return { data: replyData || null, error: null }
  }

  async function fetchReplies(postId) {
    const { data, error } = await supabase
      .from('replies')
      .select('*, users(username, role)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    return { data: data || [], error }
  }

  async function loadReplies() {
    const { data, error } = await fetchReplies(postId)
    console.log('loadReplies', postId, data, error)
    setReplies(data)
    setLoading(false)
  }
  
  async function fetchSavedPosts() {
    const { data, error } = await supabase
      .from('saved_posts')
      .select('*, posts(*, users(username, role))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    return { data: data || [], error }
  }

  return {
    posts, loading, createPost, likePost,
    savePost, repost, createReply, fetchReplies, fetchSavedPosts
  }
}