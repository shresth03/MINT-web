import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'

export function usePosts() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()

    // Realtime subscription
    const channel = supabase
      .channel('public-posts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: 'is_osint=eq.false'
      }, (payload) => {
        setPosts(prev => [payload.new, ...prev])
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  async function fetchPosts() {
    const { data, error } = await supabase
      .from('posts')
      .select(`*, users ( username )`)
      .eq('is_osint', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error) setPosts(data || [])
    setLoading(false)
  }

  async function createPost(body, authorId) {
    const { error } = await supabase
      .from('posts')
      .insert({ body, author_id: authorId, is_osint: false })
    return { error }
  }

  async function likePost(postId, currentLikes) {
    const { error } = await supabase
      .from('posts')
      .update({ likes: currentLikes + 1 })
      .eq('id', postId)

    if (!error) {
      setPosts(prev =>
        prev.map(p => p.id === postId ? { ...p, likes: currentLikes + 1 } : p)
      )
    }
  }

  return { posts, loading, createPost, likePost, refetch: fetchPosts }
}