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
})
