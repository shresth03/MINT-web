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
        .from('likes').select('post_id').eq('user_id', user.id)
      const { data: savedData } = await supabase
        .from('saved_posts').select('post_id').eq('user_id', user.id)
      const { data: repostedData } = await supabase
        .from('reposts').select('post_id').eq('user_id', user.id)
  
      // Fetch reposts from others to show in feed
      const { data: repostsData } = await supabase
        .from('reposts')
        .select('*, posts(*, users(id, username, role, score)), users(id, username, role)')
        .order('created_at', { ascending: false })
        .limit(50)
  
      const likedIds = new Set((likedData || []).map(l => l.post_id))
      const savedIds = new Set((savedData || []).map(s => s.post_id))
      const repostedIds = new Set((repostedData || []).map(r => r.post_id))
  
      const originalPosts = data.map(p => ({
        ...p,
        _type: 'post',
        liked: likedIds.has(p.id),
        saved: savedIds.has(p.id),
        reposted: repostedIds.has(p.id),
      }))
  
      // Build repost cards — skip if the reposter is the original author
      const repostCards = (repostsData || [])
        .filter(r => r.posts && r.user_id !== r.posts.author_id)
        .map(r => ({
          ...r.posts,
          _type: 'repost',
          _reposter: r.users,
          _quote: r.quote_body,
          _repost_created_at: r.created_at,
          _repost_id: r.id,
          liked: likedIds.has(r.posts?.id),
          saved: savedIds.has(r.posts?.id),
          reposted: repostedIds.has(r.posts?.id),
        }))
  
      // Merge and sort by relevance timestamp
      const merged = [
        ...originalPosts,
        ...repostCards,
      ].sort((a, b) => {
        const aTime = a._type === 'repost' ? a._repost_created_at : a.created_at
        const bTime = b._type === 'repost' ? b._repost_created_at : b.created_at
        return new Date(bTime) - new Date(aTime)
      })
  
      setPosts(merged)
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

  async function createReply(postId, body, parentReplyId = null) {
    const { data: insertData, error } = await supabase
      .from('replies')
      .insert({
        post_id: postId,
        author_id: user.id,
        body,
        parent_reply_id: parentReplyId || null
      })
      .select('id')
      .single()
  
    if (error) return { data: null, error }
  
    const { data: replyData } = await supabase
      .from('replies')
      .select('*, users(username, role)')
      .eq('id', insertData.id)
      .single()
  
    // Update reply count
    const post = posts.find(p => p.id === postId)
    if (post) {
      await supabase.from('posts')
        .update({ reply_count: (post.reply_count || 0) + 1 })
        .eq('id', postId)
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p
      ))
    }
  
    // Parse @mentions and notify mentioned users
    const mentions = [...body.matchAll(/@(\w+)/g)].map(m => m[1])
    if (mentions.length > 0) {
      const { data: mentionedUsers } = await supabase
        .from('users')
        .select('id, username')
        .in('username', mentions)
      if (mentionedUsers) {
        await Promise.all(
          mentionedUsers
            .filter(u => u.id !== user.id) // don't notify yourself
            .map(u => supabase.from('notifications').insert({
              to_user_id: u.id,
              from_user_id: user.id,
              type: 'mention',
              post_id: postId,
            }))
        )
      }
    }
  
    return { data: replyData || null, error: null }
  }

  async function fetchReplies(postId) {
    const { data, error } = await supabase
      .from('replies')
      .select('*, users(username, role)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
  
    if (!data) return { data: [], error }
  
    // Fetch current user's votes for these replies
    const replyIds = data.map(r => r.id)
    const { data: votes } = await supabase
      .from('reply_votes')
      .select('reply_id, vote')
      .eq('user_id', user.id)
      .in('reply_id', replyIds)
  
    const voteMap = {}
    ;(votes || []).forEach(v => { voteMap[v.reply_id] = v.vote })
  
    return {
      data: data.map(r => ({ ...r, user_vote: voteMap[r.id] || 0 })),
      error
    }
  }
  
  async function voteReply(replyId, vote) {
    const { data: existing } = await supabase
      .from('reply_votes')
      .select('id, vote')
      .eq('reply_id', replyId)
      .eq('user_id', user.id)
      .maybeSingle()
  
    let delta = 0
  
    if (existing) {
      if (existing.vote === vote) {
        // Toggle off
        await supabase.from('reply_votes').delete().eq('id', existing.id)
        delta = -vote
      } else {
        // Switch vote
        await supabase.from('reply_votes').update({ vote }).eq('id', existing.id)
        delta = vote * 2
      }
    } else {
      await supabase.from('reply_votes').insert({ reply_id: replyId, user_id: user.id, vote })
      delta = vote
    }
  
    // Update vote_count
    if (delta !== 0) {
      const { data: reply } = await supabase
        .from('replies').select('vote_count').eq('id', replyId).single()
      await supabase.from('replies')
        .update({ vote_count: (reply?.vote_count || 0) + delta })
        .eq('id', replyId)
    }
  
    return { delta }
  }
  
  async function fetchReplyVotes(postId) {
    const { data } = await supabase
      .from('reply_votes')
      .select('reply_id, vote')
      .eq('user_id', user.id)
    return data || []
  }

  async function fetchSavedPosts() {
    const { data, error } = await supabase
      .from('saved_posts')
      .select('*, posts(*, users(username, role))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    return { data: data || [], error }
  }

  async function fetchUserReposts(userId) {
    const { data } = await supabase
      .from('reposts')
      .select('*, posts(*, users(id, username, role, score))')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    return { data: data || [] }
  }

  async function searchUsers(query) {
    if (!query || query.length < 1) return []
    const { data } = await supabase
      .from('users')
      .select('id, username, role')
      .ilike('username', `${query}%`)
      .limit(5)
    return data || []
  }

  return {
    posts, loading, createPost, likePost,
    savePost, repost, createReply, fetchReplies,
    fetchSavedPosts, fetchUserReposts, searchUsers,
    voteReply, fetchReplyVotes
  }
}