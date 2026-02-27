import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'

export function useStories() {
  const [stories, setStories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchStories() {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        setError(error.message)
      } else {
        setStories(data)
      }
      setLoading(false)
    }

    fetchStories()
  }, [])

  return { stories, loading, error }
}