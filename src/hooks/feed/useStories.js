import { useState, useEffect } from 'react'
import { contentDb, identityDb } from '../../api/supabase'

export function useStories() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStories()
  }, [])

  async function fetchStories() {
    // story_sources/posts are both in `content`, so that embed works — but
    // posts.author_id points into `identity`, a separate schema PostgREST
    // can't traverse in one query, so profiles are fetched and merged after.
    const { data, error } = await contentDb
      .from('stories')
      .select(`
        *,
        story_sources (
          post_id,
          posts (
            id,
            body,
            created_at,
            author_id
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    const authorIds = [...new Set(
      (data || []).flatMap(s => (s.story_sources || []).map(src => src.posts?.author_id)).filter(Boolean)
    )]
    const { data: authors } = authorIds.length
      ? await identityDb.from('profiles').select('id, username, score, role').in('id', authorIds)
      : { data: [] }
    const authorsById = new Map((authors || []).map(a => [a.id, a]))

    setStories((data || []).map(s => ({
      ...s,
      story_sources: (s.story_sources || []).map(src => ({
        ...src,
        posts: src.posts ? { ...src.posts, users: authorsById.get(src.posts.author_id) || null } : null,
      })),
    })))
    setLoading(false)
  }

  return { stories, loading, error, refetch: fetchStories }
}
