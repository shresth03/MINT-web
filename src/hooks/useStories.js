import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'

export function useStories() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchStories()
  }, [])

  async function fetchStories() {
    const { data, error } = await supabase
      .from('stories')
      .select(`
        *,
        story_sources (
          post_id,
          posts (
            id,
            body,
            created_at,
            users ( username, score, role )
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      setStories(data)
    }
    setLoading(false)
  }

  return { stories, loading, error, refetch: fetchStories }
}