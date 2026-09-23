import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import { useMessages } from '../../hooks/social/useMessages'

// Stable user object: useMessages refetches whenever `user` changes identity
const mockUser = { id: 'test-user', email: 'test@test.com' }
vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // fetchConversations filters with .or(), which the shared chain lacks
    mockSupabase.or = vi.fn().mockReturnValue(mockSupabase)
  })

  it('fetchMessages loads the newest 100 and returns them oldest-first', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Server returns newest-first because of the descending order
    const newestFirst = [
      { id: 'm3', created_at: '2026-09-23T10:02:00Z' },
      { id: 'm2', created_at: '2026-09-23T10:01:00Z' },
      { id: 'm1', created_at: '2026-09-23T10:00:00Z' },
    ]
    mockSupabase.then.mockImplementationOnce(resolve =>
      Promise.resolve({ data: newestFirst, error: null }).then(resolve))

    let msgs
    await act(async () => { msgs = await result.current.fetchMessages('conv-1') })

    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(mockSupabase.limit).toHaveBeenCalledWith(100)
    expect(msgs.map(m => m.id)).toEqual(['m1', 'm2', 'm3'])
  })
})
