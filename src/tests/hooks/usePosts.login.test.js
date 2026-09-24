import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import { usePosts } from '../../hooks/feed/usePosts'

// The signed-in user can arrive after the feed mounts (login still loading)
let mockUser = null
vi.mock('../../hooks/core/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }))

describe('usePosts when login finishes after the feed mounts', () => {
  beforeEach(() => { vi.clearAllMocks(); mockUser = null })

  it('loads posts once the user becomes known', async () => {
    const { result, rerender } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockSupabase.from).not.toHaveBeenCalledWith('posts')

    mockUser = { id: 'u1' }
    rerender()
    await waitFor(() => expect(mockSupabase.from).toHaveBeenCalledWith('posts'))
  })

  it('fetchSavedPosts waits for the user instead of throwing, then loads', async () => {
    const { result, rerender } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.loading).toBe(false))
    const before = result.current.fetchSavedPosts
    await expect(before()).resolves.toEqual({ data: [], error: null })

    mockUser = { id: 'u1' }
    rerender()
    // A new loader for the signed-in user, which queries their saved posts
    expect(result.current.fetchSavedPosts).not.toBe(before)
    await result.current.fetchSavedPosts()
    expect(mockSupabase.from).toHaveBeenCalledWith('saved_posts')
    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', 'u1')
  })
})
