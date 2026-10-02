import { useState, useEffect, useCallback } from 'react'
import { supabase, contentDb, identityDb, socialDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

// content.posts/reposts reference identity.profiles across a schema boundary,
// which PostgREST can't embed in one query — fetch profiles separately and
// merge them in under the `users` key so the JSX consuming these objects
// (post.users?.username etc.) doesn't need to change.
async function fetchProfilesByIds(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map()

  const { data } = await identityDb
    .from('profiles')
    .select('id, username, role, score')
    .in('id', uniqueIds)

  return new Map((data || []).map(p => [p.id, p]))
}

export function usePosts() {
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchSinglePost = useCallback(async (id) => {
    const { data: postRows, error } = await supabase.rpc('feed_get_post', {
      p_post_id: id
    })

    const data = Array.isArray(postRows) ? postRows[0] : postRows

    if (error || !data) return

    const [
      { data: likedRows },
      { data: savedRows },
      { data: repostedRows }
    ] = await Promise.all([
      supabase.rpc('engagement_get_liked_post_ids'),
      supabase.rpc('engagement_get_saved_post_ids'),
      supabase.rpc('engagement_get_reposted_post_ids')
    ])

    const likedIds = new Set(likedRows || [])
    const savedIds = new Set(savedRows || [])
    const repostedIds = new Set(repostedRows || [])

    const profilesById = await fetchProfilesByIds([data.author_id])

    setPosts(prev => [{
      ...data,
      users: profilesById.get(data.author_id) || null,
      _type: 'post',
      liked: likedIds.has(data.id),
      saved: savedIds.has(data.id),
      reposted: repostedIds.has(data.id),
    }, ...prev])
  }, [])

  const fetchPosts = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const [
      { data, error },
      { data: likedData },
      { data: savedData },
      { data: repostedData },
      { data: repostsRaw }
    ] = await Promise.all([
      supabase.rpc('feed_get_posts', { p_limit: 50 }),
      supabase.rpc('engagement_get_liked_post_ids'),
      supabase.rpc('engagement_get_saved_post_ids'),
      supabase.rpc('engagement_get_reposted_post_ids'),
      supabase.rpc('feed_get_recent_reposts', { p_limit: 50 })
    ])

    if (!error && data) {
      const repostPostIds = [
        ...new Set(
          (repostsRaw || [])
            .map(r => r.post_id)
            .filter(Boolean)
        )
      ]

      const { data: repostedPosts } = repostPostIds.length
        ? await supabase.rpc('feed_get_posts_by_ids', {
            p_ids: repostPostIds
          })
        : { data: [] }

      const repostedPostsById = new Map(
        (repostedPosts || []).map(p => [p.id, p])
      )

      const profilesById = await fetchProfilesByIds([
        ...data.map(p => p.author_id),
        ...(repostedPosts || []).map(p => p.author_id),
        ...(repostsRaw || []).map(r => r.user_id),
      ])

      const likedIds = new Set(likedData || [])
      const savedIds = new Set(savedData || [])
      const repostedIds = new Set(repostedData || [])

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
        .map(r => ({
          ...r,
          posts: repostedPostsById.get(r.post_id) || null
        }))
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
        const aTime = a._type === 'repost'
          ? a._repost_created_at
          : a.created_at

        const bTime = b._type === 'repost'
          ? b._repost_created_at
          : b.created_at

        return new Date(bTime) - new Date(aTime)
      })

      setPosts(merged)
    }

    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    fetchPosts()

    const sub = supabase
      .channel('content:posts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'content',
          table: 'posts',
          filter: 'is_osint=eq.false'
        },
        payload => {
          fetchSinglePost(payload.new.id)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [fetchPosts, fetchSinglePost])

  async function createPost(body, mediaUrl = null, region = null, tag = null) {
    if (!user?.id) return { error: new Error('Not authenticated') }

    const extractedTag = tag || (body.match(/#(\w+)/)?.[1]?.toUpperCase() || null)

    const { data, error } = await contentDb.rpc('social_create_post', {
      p_body: body,
      p_tag: extractedTag,
      p_region: region,
      p_media_url: mediaUrl
    })

    return { data, error }
  }

  async function likePost(id, createNotification = null) {
    const post = posts.find(p => p.id === id)

    const { data, error } = await supabase.rpc('engagement_toggle_like', {
      p_post_id: id
    })

    if (error) return { error }

    const result = Array.isArray(data) ? data[0] : data

    if (result?.liked && createNotification && post?.users?.id) {
      createNotification(post.users.id, 'like', id)
    }

    setPosts(prev => prev.map(p =>
      p.id === id
        ? {
            ...p,
            likes: result?.likes ?? p.likes,
            liked: result?.liked ?? p.liked
          }
        : p
    ))

    return { data: result, error: null }
  }

  async function savePost(id) {
    const existing = posts.find(p => p.id === id)?.saved

    if (existing) {
      const { error } = await supabase.rpc('engagement_unsave_post', {
        p_post_id: id
      })

      if (error) return { error }

      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, saved: false } : p
      ))
    } else {
      const { error } = await supabase.rpc('engagement_save_post', {
        p_post_id: id
      })

      if (error) return { error }

      setPosts(prev => prev.map(p =>
        p.id === id ? { ...p, saved: true } : p
      ))
    }

    return { error: null }
  }

  async function repost(id, quoteBody = null) {
    const existing = posts.find(p => p.id === id)?.reposted

    if (existing) {
      const { error } = await supabase.rpc('engagement_undo_repost', {
        p_post_id: id
      })

      if (error) return { error }

      const { error: counterError } = await supabase.rpc(
        'engagement_update_post_counter',
        {
          p_post_id: id,
          p_column: 'repost_count',
          p_value: Math.max(
            0,
            (posts.find(p => p.id === id)?.repost_count || 1) - 1
          ),
        }
      )

      if (counterError) return { error: counterError }

      setPosts(prev => prev.map(p =>
        p.id === id
          ? {
              ...p,
              repost_count: Math.max(0, (p.repost_count || 1) - 1),
              reposted: false
            }
          : p
      ))
    } else {
      const { error } = await supabase.rpc('engagement_repost', {
        p_post_id: id,
        p_quote: quoteBody || null
      })

      if (error) return { error }

      const { error: counterError } = await supabase.rpc(
        'engagement_update_post_counter',
        {
          p_post_id: id,
          p_column: 'repost_count',
          p_value: (posts.find(p => p.id === id)?.repost_count || 0) + 1,
        }
      )

      if (counterError) return { error: counterError }

      setPosts(prev => prev.map(p =>
        p.id === id
          ? {
              ...p,
              repost_count: (p.repost_count || 0) + 1,
              reposted: true
            }
          : p
      ))
    }

    return { error: null }
  }

  async function createReply(postId, body, parentReplyId = null) {
    const { data: replyId, error } = await socialDb.rpc(
      'engagement_create_reply',
      {
        p_post_id: postId,
        p_body: body,
        p_parent_reply_id: parentReplyId || null
      }
    )

    if (error) return { data: null, error }

    const { data: replyRow } = await socialDb
      .from('replies')
      .select('*')
      .eq('id', replyId)
      .single()

    const profilesById = await fetchProfilesByIds([replyRow?.author_id])

    const replyData = replyRow
      ? {
          ...replyRow,
          users: profilesById.get(replyRow.author_id) || null
        }
      : null

    // Update local reply count
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, reply_count: (p.reply_count || 0) + 1 }
        : p
    ))

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
            .filter(u => u.id !== user.id)
            .map(u =>
              socialDb.from('notifications').insert({
                to_user_id: u.id,
                from_user_id: user.id,
                type: 'mention',
                post_id: postId,
              })
            )
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

    const profilesById = await fetchProfilesByIds(
      data.map(r => r.author_id)
    )

    // Fetch current user's votes for these replies
    const replyIds = data.map(r => r.id)

    const { data: votes } = await socialDb
      .from('reply_votes')
      .select('reply_id, vote')
      .eq('user_id', user.id)
      .in('reply_id', replyIds)

    const voteMap = {}
    ;(votes || []).forEach(v => {
      voteMap[v.reply_id] = v.vote
    })

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
        await socialDb
          .from('reply_votes')
          .delete()
          .eq('id', existing.id)

        delta = -vote
      } else {
        // Switch vote
        await socialDb
          .from('reply_votes')
          .update({ vote })
          .eq('id', existing.id)

        delta = vote * 2
      }
    } else {
      await socialDb
        .from('reply_votes')
        .insert({
          reply_id: replyId,
          user_id: user.id,
          vote
        })

      delta = vote
    }

    // Update vote_count
    if (delta !== 0) {
      const { data: reply } = await socialDb
        .from('replies')
        .select('vote_count')
        .eq('id', replyId)
        .single()

      await socialDb
        .from('replies')
        .update({
          vote_count: (reply?.vote_count || 0) + delta
        })
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
      ? await contentDb
          .from('posts')
          .select('*')
          .in('id', postIds)
      : { data: [] }

    const postsById = new Map(
      (postsData || []).map(p => [p.id, p])
    )

    const profilesById = await fetchProfilesByIds(
      (postsData || []).map(p => p.author_id)
    )

    const merged = data.map(s => {
      const post = postsById.get(s.post_id)

      return {
        ...s,
        posts: post
          ? {
              ...post,
              users: profilesById.get(post.author_id) || null
            }
          : null
      }
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
      ? await contentDb
          .from('posts')
          .select('*')
          .in('id', postIds)
      : { data: [] }

    const postsById = new Map(
      (postsData || []).map(p => [p.id, p])
    )

    const profilesById = await fetchProfilesByIds(
      (postsData || []).map(p => p.author_id)
    )

    const merged = data.map(r => {
      const post = postsById.get(r.post_id)

      return {
        ...r,
        posts: post
          ? {
              ...post,
              users: profilesById.get(post.author_id) || null
            }
          : null
      }
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
    posts,
    loading,
    createPost,
    likePost,
    savePost,
    repost,
    createReply,
    fetchReplies,
    fetchSavedPosts,
    fetchUserReposts,
    searchUsers,
    voteReply
  }
}