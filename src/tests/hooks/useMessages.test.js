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

  it('markConversationRead marks only unread messages from the other person', async () => {
    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))
    vi.clearAllMocks()
    mockSupabase.or = vi.fn().mockReturnValue(mockSupabase)

    await act(async () => { await result.current.markConversationRead('conv-1') })

    expect(mockSupabase.update).toHaveBeenCalledWith({ read: true })
    expect(mockSupabase.eq).toHaveBeenCalledWith('conversation_id', 'conv-1')
    expect(mockSupabase.neq).toHaveBeenCalledWith('sender_id', 'test-user')
    expect(mockSupabase.eq).toHaveBeenCalledWith('read', false)
  })

  it('counts unread messages per conversation and in total', async () => {
    const resolveOnce = data => mockSupabase.then.mockImplementationOnce(resolve =>
      Promise.resolve({ data, error: null }).then(resolve))
    // 1st await: conversations list; 2nd await: unread messages
    resolveOnce([
      { id: 'c1', participant_1: 'test-user', participant_2: 'u2', last_message_at: '2026-09-23T09:00:00Z' },
      { id: 'c2', participant_1: 'u3', participant_2: 'test-user', last_message_at: '2026-09-23T10:00:00Z' },
    ])
    resolveOnce([
      { conversation_id: 'c1' }, { conversation_id: 'c1' }, { conversation_id: 'c1' },
      { conversation_id: 'c2' },
    ])

    const { result } = renderHook(() => useMessages())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const byId = Object.fromEntries(result.current.conversations.map(c => [c.id, c.unreadCount]))
    expect(byId).toEqual({ c1: 3, c2: 1 })
    expect(result.current.unreadCount).toBe(4)

    // Opening a conversation clears its count
    await act(async () => { await result.current.markConversationRead('c1') })
    expect(result.current.conversations.find(c => c.id === 'c1').unreadCount).toBe(0)
    expect(result.current.unreadCount).toBe(1)
  })
})
