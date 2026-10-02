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
    const { data, error } = await identityDb.rpc(
      'profile_get_by_username',
      {
        p_username: username,
      }
    )

    if (error || !data?.length) {
      setLoading(false)
      return
    }

    const userData = data[0]
    setChannel(userData)

    // Fetch their posts
    const { data: postsData } = await contentDb
      .from('posts')
      .select('id, body, tag, region, likes, reply_count, repost_count, created_at, post_type, is_osint')
      .eq('author_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setPosts(postsData || [])

    // Fetch stories they contributed to via their posts
    const postIds = (postsData || []).map(post => post.id)

    const { data: sourcesData } = postIds.length
      ? await contentDb
          .from('story_sources')
          .select('stories(id, headline, tag, region, confidence, is_breaking, created_at)')
          .in('post_id', postIds)
      : { data: [] }

    setStories((sourcesData || []).map(s => s.stories).filter(Boolean))
    setLoading(false)
  }, [username])

  useEffect(() => {
    if (!username) return
    fetchChannel()
  }, [username, fetchChannel])

  return { channel, posts, stories, loading }
}