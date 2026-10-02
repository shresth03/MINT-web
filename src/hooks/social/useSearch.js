import { useState } from 'react'
import { contentDb, identityDb } from '../../api/supabase'

function dateFilterCutoff(filter) {
  if (filter === '1h') {
    return new Date(Date.now() - 60 * 60 * 1000).toISOString()
  }

  if (filter === '24h') {
    return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  }

  if (filter === '7d') {
    return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  }

  return null
}

export function useSearch() {
  const [results, setResults] = useState({
    stories: [],
    posts: [],
    users: [],
  })

  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState(null)

  async function search(q, opts = {}) {
    const effectiveDateFilter = opts.dateFilter ?? dateFilter
    const effectiveTagFilter = opts.tagFilter ?? tagFilter

    if (!q || q.trim().length < 2) {
      setResults({
        stories: [],
        posts: [],
        users: [],
      })
      return
    }

    setLoading(true)

    const trimmed = q.trim()
    const cutoff = dateFilterCutoff(effectiveDateFilter)

    // Strip leading # so "#cyber" and "cyber" both work
    const tagQuery = trimmed.startsWith('#')
      ? trimmed.slice(1).toUpperCase()
      : null

    const [storiesRes, postsRes, usersRes] = await Promise.all([
      // No exact RPC currently supports all story-search filters.
      // Keep this direct query unchanged.
      (() => {
        let queryBuilder = contentDb
          .from('stories')
          .select(
            'id, headline, tag, region, confidence, is_breaking, created_at'
          )
          .limit(20)

        if (tagQuery) {
          queryBuilder = queryBuilder.ilike(
            'tag',
            `%${tagQuery}%`
          )
        } else {
          queryBuilder = queryBuilder.textSearch(
            'fts',
            trimmed,
            {
              type: 'websearch',
              config: 'english',
            }
          )
        }

        if (effectiveTagFilter) {
          queryBuilder = queryBuilder.ilike(
            'tag',
            `%${effectiveTagFilter}%`
          )
        }

        if (cutoff) {
          queryBuilder = queryBuilder.gte(
            'created_at',
            cutoff
          )
        }

        return queryBuilder
      })(),

      contentDb.rpc('search_posts_query', {
        p_query: tagQuery || trimmed,
        p_is_tag: Boolean(tagQuery),
        p_tag: effectiveTagFilter,
        p_cutoff: cutoff,
        p_limit: 20,
      }),

      identityDb.rpc('search_profiles_query', {
        p_query: trimmed,
        p_limit: 10,
      }),
    ])

    const authorIds = [
      ...new Set(
        (postsRes.data || [])
          .map(post => post.author_id)
          .filter(Boolean)
      ),
    ]

    const { data: authors } = authorIds.length
      ? await identityDb.rpc('profile_get_by_ids', {
          p_ids: authorIds,
        })
      : { data: [] }

    const authorsById = new Map(
      (authors || []).map(author => [
        author.id,
        {
          id: author.id,
          username: author.username,
          role: author.role,
          score: author.score,
        },
      ])
    )

    const users = (usersRes.data || []).map(user => ({
      id: user.id,
      username: user.username,
      role: user.role,
      score: user.score,
    }))

    setResults({
      stories: storiesRes.data || [],
      posts: (postsRes.data || []).map(post => ({
        ...post,
        users: authorsById.get(post.author_id) || null,
      })),
      users,
    })

    setLoading(false)
  }

  function clear() {
    setQuery('')
    setTagFilter(null)
    setResults({
      stories: [],
      posts: [],
      users: [],
    })
  }

  return {
    results,
    loading,
    query,
    setQuery,
    dateFilter,
    setDateFilter,
    tagFilter,
    setTagFilter,
    search,
    clear,
  }
}