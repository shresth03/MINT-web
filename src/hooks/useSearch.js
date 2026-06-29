import { useState } from 'react'
import { supabase } from '../api/supabase'

function dateFilterCutoff(filter) {
  if (filter === '1h')  return new Date(Date.now() - 60 * 60 * 1000).toISOString()
  if (filter === '24h') return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  if (filter === '7d')  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  return null
}

export function useSearch() {
  const [results, setResults] = useState({ stories: [], posts: [], users: [] })
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState(null)

  async function search(q, opts = {}) {
    const effectiveDateFilter = opts.dateFilter ?? dateFilter
    const effectiveTagFilter = opts.tagFilter ?? tagFilter

    if (!q || q.trim().length < 2) {
      setResults({ stories: [], posts: [], users: [] })
      return
    }
    setLoading(true)
    const trimmed = q.trim()
    const cutoff = dateFilterCutoff(effectiveDateFilter)

    // Strip leading # so "#cyber" and "cyber" both work
    const tagQuery = trimmed.startsWith('#') ? trimmed.slice(1).toUpperCase() : null

    let storiesQ = supabase
      .from('stories')
      .select('id, headline, tag, region, confidence, is_breaking, created_at')
      .limit(20)

    let postsQ = supabase
      .from('posts')
      .select('id, body, tag, created_at, likes, reply_count, author_id, users(username, role)')
      .eq('is_osint', false)
      .limit(20)

    // Tag-mode: search by tag column instead of FTS
    if (tagQuery) {
      storiesQ = storiesQ.ilike('tag', `%${tagQuery}%`)
      postsQ   = postsQ.ilike('tag', `%${tagQuery}%`)
    } else {
      storiesQ = storiesQ.textSearch('fts', trimmed, { type: 'websearch', config: 'english' })
      postsQ   = postsQ.textSearch('fts', trimmed, { type: 'websearch', config: 'english' })
    }

    // Tag filter chip (separate from query)
    if (effectiveTagFilter) {
      storiesQ = storiesQ.ilike('tag', `%${effectiveTagFilter}%`)
      postsQ   = postsQ.ilike('tag', `%${effectiveTagFilter}%`)
    }

    // Date filter
    if (cutoff) {
      storiesQ = storiesQ.gte('created_at', cutoff)
      postsQ   = postsQ.gte('created_at', cutoff)
    }

    const [storiesRes, postsRes, usersRes] = await Promise.all([
      storiesQ,
      postsQ,
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
    setTagFilter(null)
    setResults({ stories: [], posts: [], users: [] })
  }

  return {
    results, loading, query, setQuery, dateFilter, setDateFilter,
    tagFilter, setTagFilter, search, clear
  }
}