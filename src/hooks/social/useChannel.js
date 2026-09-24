import { useState, useEffect, useCallback } from 'react'
import { contentDb, identityDb } from '../../api/supabase'

export function useChannel(username) {
  const [channel, setChannel] = useState(null)
  const [posts, setPosts] = useState([])
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchChannel = useCallback(async () => {
    setLoading(true)

    // Fetch user profile
    const { data: userData } = await identityDb
      .from('profiles')
      .select('id, username, role, score, created_at')
      .eq('username', username)
      .single()

    if (!userData) { setLoading(false); return }
    setChannel(userData)

    // Fetch their posts
    const { data: postsData } = await contentDb
      .from('posts')
      .select('id, body, tag, region, likes, reply_count, repost_count, created_at, post_type, is_osint')
      .eq('author_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setPosts(postsData || [])

    // Stories they contributed to: story_sources is keyed by post id, so look
    // up all of their posts first (not just the 20 shown above)
    const { data: allPostIds } = await contentDb
      .from('posts')
      .select('id')
      .eq('author_id', userData.id)
    const ids = (allPostIds || []).map(p => p.id)
    const { data: sourcesData } = ids.length
      ? await contentDb
          .from('story_sources')
          .select('stories(id, headline, tag, region, confidence, is_breaking, created_at)')
          .in('post_id', ids)
      : { data: [] }

    // Several of their posts can feed the same story; list each story once, newest first
    const byId = new Map()
    for (const s of sourcesData || []) if (s.stories) byId.set(s.stories.id, s.stories)
    setStories([...byId.values()].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
    setLoading(false)
  }, [username])

  useEffect(() => {
    if (!username) return
    fetchChannel()
  }, [username, fetchChannel])

  return { channel, posts, stories, loading }
}
