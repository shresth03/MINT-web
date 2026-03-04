import { useState } from 'react'
import { supabase } from '../api/supabase'

export function useSearch() {
  const [results, setResults] = useState({ stories: [], posts: [], users: [] })
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  async function search(q) {
    if (!q || q.trim().length < 2) {
      setResults({ stories: [], posts: [], users: [] })
      return
    }
    setLoading(true)
    const trimmed = q.trim()

    const [storiesRes, postsRes, usersRes] = await Promise.all([
      // Stories full text search
      supabase
        .from('stories')
        .select('id, headline, tag, region, confidence, is_breaking, created_at')
        .textSearch('fts', trimmed, { type: 'websearch', config: 'english' })
        .limit(10),

      // Posts full text search
      supabase
        .from('posts')
        .select('id, body, created_at, likes, reply_count, users(username, role)')
        .textSearch('fts', trimmed, { type: 'websearch', config: 'english' })
        .eq('is_osint', false)
        .limit(10),

      // Users search by username
      supabase
        .from('users')
        .select('id, username, role, score')
        .ilike('username', `%${trimmed}%`)
        .limit(10)
    ])

    setResults({
      stories: storiesRes.data || [],
      posts: postsRes.data || [],
      users: usersRes.data || []
    })
    setLoading(false)
  }

  function clear() {
    setQuery('')
    setResults({ stories: [], posts: [], users: [] })
  }

  return { results, loading, query, setQuery, search, clear }
}