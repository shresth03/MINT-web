import { useState, useEffect } from 'react'
import { contentDb, identityDb } from '../../api/supabase'

export function useChannel(username) {
  const [channel, setChannel] = useState(null)
  const [posts, setPosts] = useState([])
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!username) return
    fetchChannel()
  }, [username])

  async function fetchChannel() {
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

    // Fetch stories they contributed to via story_sources
    const { data: sourcesData } = await contentDb
      .from('story_sources')
      .select('stories(id, headline, tag, region, confidence, is_breaking, created_at)')
      .eq('post_id', userData.id)

    setStories((sourcesData || []).map(s => s.stories).filter(Boolean))
    setLoading(false)
  }

  return { channel, posts, stories, loading }
}
