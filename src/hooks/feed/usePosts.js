import { useState, useEffect } from 'react'
import { supabase, contentDb, identityDb, socialDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

// content.posts/reposts reference identity.profiles across a schema boundary,
// which PostgREST can't embed in one query — fetch profiles separately and
// merge them in under the `users` key so the JSX consuming these objects
// (post.users?.username etc.) doesn't need to change.
async function fetchProfilesByIds(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map()
  const { data } = await identityDb.from('profiles').select('id, username, role, score').in('id', uniqueIds)
  return new Map((data || []).map(p => [p.id, p]))
}

export function usePosts() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPosts()
    const sub = supabase
      .channel('content:posts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'content',
        table: 'posts',
        filter: 'is_osint=eq.false'
      }, payload => {
        fetchSinglePost(payload.new.id)
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function fetchPosts() {
    if (!user?.id) { setLoading(false); return }
    const { data, error } = await contentDb
      .from('posts')
      .select('*')
      .eq('is_osint', false)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      const { data: likedData } = await contentDb
        .from('likes').select('post_id').eq('user_id', user.id)
      const { data: savedData } = await contentDb
        .from('saved_posts').select('post_id').eq('user_id', user.id)
      const { data: repostedData } = await contentDb
        .from('reposts').select('post_id').eq('user_id', user.id)

      // Fetch reposts from others to show in feed
      const { data: repostsRaw } = await contentDb
        .from('reposts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)

      const repostPostIds = [...new Set((repostsRaw || []).map(r => r.post_id).filter(Boolean))]
      const { data: repostedPosts } = repostPostIds.length
        ? await contentDb.from('posts').select('*').in('id', repostPostIds)
        : { data: [] }
      const repostedPostsById = new Map((repostedPosts || []).map(p => [p.id, p]))

      const profilesById = await fetchProfilesByIds([
        ...data.map(p => p.author_id),
        ...(repostedPosts || []).map(p => p.author_id),
        ...(repostsRaw || []).map(r => r.user_id),
      ])

      const likedIds = new Set((likedData || []).map(l => l.post_id))
      const savedIds = new Set((savedData || []).map(s => s.post_id))
      const repostedIds = new Set((repostedData || []).map(r => r.post_id))

      const originalPosts = data.map(p => ({
        ...p,
        users: profilesById.get(p.author_id) || null,
        _type: 'post',
        liked: likedIds.has(p.id),
        saved: savedIds.has(p.id),
        reposted: repostedIds.has(p.id),
      }))

      // Build repost cards — skip if the reposter is the original author
      const repostCards = (repostsRaw || [])
        .map(r => ({ ...r, posts: repostedPostsById.get(r.post_id) || null }))
        .filter(r => r.posts && r.user_id !== r.posts.author_id)
        .map(r => ({
          ...r.posts,
          users: profilesById.get(r.posts.author_id) || null,
          _type: 'repost',
          _reposter: profilesById.get(r.user_id) || null,
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
    const { data } = await contentDb
      .from('posts')
      .select('*')
      .eq('id', id)
      .single()
    if (!data) return

    const profilesById = await fetchProfilesByIds([data.author_id])

    const [{ data: likedRow }, { data: savedRow }, { data: repostedRow }] = await Promise.all([
      contentDb.from('likes').select('post_id').eq('user_id', user.id).eq('post_id', id).maybeSingle(),
      contentDb.from('saved_posts').select('post_id').eq('user_id', user.id).eq('post_id', id).maybeSingle(),
      contentDb.from('reposts').select('post_id').eq('user_id', user.id).eq('post_id', id).maybeSingle(),
    ])
    setPosts(prev => [{
      ...data,
      users: profilesById.get(data.author_id) || null,
      _type: 'post', liked: !!likedRow, saved: !!savedRow, reposted: !!repostedRow,
    }, ...prev])
  }

  async function createPost(body, mediaUrl = null, region = null, tag = null, postType = 'general') {
    if (!user?.id) return { error: new Error('Not authenticated') }
    const extractedTag = tag || (body.match(/#(\w+)/)?.[1]?.toUpperCase() || null)
    const { error } = await contentDb.from('posts').insert({
      author_id: user.id,
      body,
      region,
      tag: extractedTag,
      is_osint: false,
      post_type: postType,
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
      await contentDb.from('likes').delete()
        .eq('user_id', user.id).eq('post_id', id)
      await contentDb.from('posts')
        .update({ likes: Math.max(0, (posts.find(p=>p.id===id)?.likes||1)-1) })
        .eq('id', id)
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, likes: Math.max(0,(p.likes||1)-1), liked: false } : p
      ))
    } else {
      await contentDb.from('likes').insert({ user_id: user.id, post_id: id })
      const post = posts.find(p => p.id === id)
      if (createNotification && post?.users?.id) {
        createNotification(post.users.id, 'like', id)
      }
      await contentDb.from('posts')
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
      await contentDb.from('saved_posts').delete()
        .eq('user_id', user.id).eq('post_id', id)
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, saved: false } : p
      ))
    } else {
      await contentDb.from('saved_posts').insert({ user_id: user.id, post_id: id })
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, saved: true } : p
      ))
    }
  }

  async function repost(id, quoteBody = null) {
    const existing = posts.find(p => p.id === id)?.reposted
    if (existing) {
      await contentDb.from('reposts').delete()
        .eq('user_id', user.id).eq('post_id', id)
      await contentDb.from('posts')
        .update({ repost_count: Math.max(0, (posts.find(p=>p.id===id)?.repost_count||1)-1) })
        .eq('id', id)
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, repost_count: Math.max(0,(p.repost_count||1)-1), reposted: false } : p
      ))
    } else {
      await contentDb.from('reposts').insert({
        user_id: user.id,
        post_id: id,
        quote_body: quoteBody || null
      })
      await contentDb.from('posts')
        .update({ repost_count: (posts.find(p=>p.id===id)?.repost_count||0)+1 })
        .eq('id', id)
      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, repost_count: (p.repost_count||0)+1, reposted: true } : p
      ))
    }
  }

  async function createReply(postId, body, parentReplyId = null) {
    const { data: insertData, error } = await socialDb
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

    const { data: replyRow } = await socialDb
      .from('replies')
      .select('*')
      .eq('id', insertData.id)
      .single()
    const profilesById = await fetchProfilesByIds([replyRow?.author_id])
    const replyData = replyRow ? { ...replyRow, users: profilesById.get(replyRow.author_id) || null } : null

    // Update reply count
    const post = posts.find(p => p.id === postId)
    if (post) {
      await contentDb.from('posts')
        .update({ reply_count: (post.reply_count || 0) + 1 })
        .eq('id', postId)
      setPosts(prev => prev.map(p =>
        p.id === postId ? { ...p, reply_count: (p.reply_count || 0) + 1 } : p
      ))
    }

    // Parse @mentions and notify mentioned users
    const mentions = [...body.matchAll(/@(\w+)/g)].map(m => m[1])
    if (mentions.length > 0) {
      const { data: mentionedUsers } = await identityDb
        .from('profiles')
        .select('id, username')
        .in('username', mentions)
      if (mentionedUsers) {
        await Promise.all(
          mentionedUsers
            .filter(u => u.id !== user.id) // don't notify yourself
            .map(u => socialDb.from('notifications').insert({
              to_user_id: u.id,
              from_user_id: user.id,
              type: 'mention',
              post_id: postId,
            }))
        )
      }
    }

    return { data: replyData, error: null }
  }

  async function fetchReplies(postId) {
    const { data, error } = await socialDb
      .from('replies')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (!data) return { data: [], error }

    const profilesById = await fetchProfilesByIds(data.map(r => r.author_id))

    // Fetch current user's votes for these replies
    const replyIds = data.map(r => r.id)
    const { data: votes } = await socialDb
      .from('reply_votes')
      .select('reply_id, vote')
      .eq('user_id', user.id)
      .in('reply_id', replyIds)

    const voteMap = {}
    ;(votes || []).forEach(v => { voteMap[v.reply_id] = v.vote })

    return {
      data: data.map(r => ({
        ...r,
        users: profilesById.get(r.author_id) || null,
        user_vote: voteMap[r.id] || 0,
      })),
      error
    }
  }

  async function voteReply(replyId, vote) {
    const { data: existing } = await socialDb
      .from('reply_votes')
      .select('id, vote')
      .eq('reply_id', replyId)
      .eq('user_id', user.id)
      .maybeSingle()

    let delta = 0

    if (existing) {
      if (existing.vote === vote) {
        // Toggle off
        await socialDb.from('reply_votes').delete().eq('id', existing.id)
        delta = -vote
      } else {
        // Switch vote
        await socialDb.from('reply_votes').update({ vote }).eq('id', existing.id)
        delta = vote * 2
      }
    } else {
      await socialDb.from('reply_votes').insert({ reply_id: replyId, user_id: user.id, vote })
      delta = vote
    }

    // Update vote_count
    if (delta !== 0) {
      const { data: reply } = await socialDb
        .from('replies').select('vote_count').eq('id', replyId).single()
      await socialDb.from('replies')
        .update({ vote_count: (reply?.vote_count || 0) + delta })
        .eq('id', replyId)
    }

    return { delta }
  }

  async function fetchSavedPosts() {
    const { data, error } = await contentDb
      .from('saved_posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (!data) return { data: [], error }

    const postIds = [...new Set(data.map(s => s.post_id))]
    const { data: postsData } = postIds.length
      ? await contentDb.from('posts').select('*').in('id', postIds)
      : { data: [] }
    const postsById = new Map((postsData || []).map(p => [p.id, p]))
    const profilesById = await fetchProfilesByIds((postsData || []).map(p => p.author_id))

    const merged = data.map(s => {
      const post = postsById.get(s.post_id)
      return { ...s, posts: post ? { ...post, users: profilesById.get(post.author_id) || null } : null }
    })
    return { data: merged, error }
  }

  async function fetchUserReposts(userId) {
    const { data } = await contentDb
      .from('reposts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (!data) return { data: [] }

    const postIds = [...new Set(data.map(r => r.post_id))]
    const { data: postsData } = postIds.length
      ? await contentDb.from('posts').select('*').in('id', postIds)
      : { data: [] }
    const postsById = new Map((postsData || []).map(p => [p.id, p]))
    const profilesById = await fetchProfilesByIds((postsData || []).map(p => p.author_id))

    const merged = data.map(r => {
      const post = postsById.get(r.post_id)
      return { ...r, posts: post ? { ...post, users: profilesById.get(post.author_id) || null } : null }
    })
    return { data: merged }
  }

  async function searchUsers(query) {
    if (!query || query.length < 1) return []
    const { data } = await identityDb
      .from('profiles')
      .select('id, username, role')
      .ilike('username', `${query}%`)
      .limit(5)
    return data || []
  }

  return {
    posts, loading, createPost, likePost,
    savePost, repost, createReply, fetchReplies,
    fetchSavedPosts, fetchUserReposts, searchUsers,
    voteReply
  }
}
