import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import { useChannel } from '../../hooks/social/useChannel'

const resolveOnce = data => mockSupabase.then.mockImplementationOnce(resolve =>
  Promise.resolve({ data, error: null }).then(resolve))

describe('useChannel', () => {
  beforeEach(() => vi.clearAllMocks())

  it('finds the stories a user contributed to through their posts', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-1', username: 'elsa' }, error: null })
    resolveOnce([{ id: 'p1', body: 'latest post' }])            // their 20 latest posts
    resolveOnce([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }])      // all their post ids
    resolveOnce([                                                // story_sources for those posts
      { stories: { id: 's1', headline: 'Older story', created_at: '2026-09-20T10:00:00Z' } },
      { stories: { id: 's2', headline: 'Newer story', created_at: '2026-09-22T10:00:00Z' } },
      { stories: { id: 's1', headline: 'Older story', created_at: '2026-09-20T10:00:00Z' } }, // p3 also fed s1
    ])

    const { result } = renderHook(() => useChannel('elsa'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Looked up by the user's post ids, not by their user id
    expect(mockSupabase.in).toHaveBeenCalledWith('post_id', ['p1', 'p2', 'p3'])
    expect(mockSupabase.eq).not.toHaveBeenCalledWith('post_id', 'user-1')
    // Each story once, newest first
    expect(result.current.stories.map(s => s.id)).toEqual(['s2', 's1'])
  })

  it('shows no stories for a user without posts, without querying sources', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'user-2', username: 'newbie' }, error: null })
    resolveOnce([])   // latest posts
    resolveOnce([])   // all post ids

    const { result } = renderHook(() => useChannel('newbie'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.stories).toEqual([])
    expect(mockSupabase.in).not.toHaveBeenCalled()
  })
})
