import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import { usePosts } from '../../hooks/feed/usePosts'

vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'test@test.com' } }),
}))

const POSTS = [
  { id: 1, body: 'with files', author_id: 'u2', created_at: new Date().toISOString(), is_osint: false },
  { id: 2, body: 'plain', author_id: 'u2', created_at: new Date().toISOString(), is_osint: false },
]
const ATTACHMENTS = [{ id: 10, position: 0, kind: 'image', url: 'https://x/a.jpg' }]
const POLL = {
  post_id: 1, ends_at: new Date(Date.now() + 3600e3).toISOString(), is_closed: false,
  total_votes: 0, my_option_id: null,
  options: [{ id: 5, position: 0, label: 'Yes', votes: 0 }, { id: 6, position: 1, label: 'No', votes: 0 }],
}

describe('usePosts — attachments and polls', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    ;['from', 'select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'not'].forEach(m =>
      mockSupabase[m].mockReturnValue(mockSupabase))
    mockSupabase.then.mockImplementation(resolve => Promise.resolve({ data: [], error: null }).then(resolve))
    mockSupabase.limit.mockResolvedValue({ data: POSTS, error: null })
    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })
    mockSupabase.rpc.mockImplementation(async (fn, args) => {
      if (fn === 'attachment_get_for_posts') return { data: [{ post_id: 1, attachments: ATTACHMENTS }], error: null }
      if (fn === 'poll_get_for_posts') return { data: [POLL], error: null }
      if (fn === 'poll_vote') {
        return {
          data: [{ ...POLL, total_votes: 1, my_option_id: args.p_option_id,
            options: POLL.options.map(o => (o.id === args.p_option_id ? { ...o, votes: 1 } : o)) }],
          error: null,
        }
      }
      return { data: null, error: null }
    })
  })

  it('merges attachments and poll into the posts that have them', async () => {
    const { result } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.posts.length).toBe(2))

    const withFiles = result.current.posts.find(p => p.id === 1)
    const plain = result.current.posts.find(p => p.id === 2)
    expect(withFiles.attachments).toEqual(ATTACHMENTS)
    expect(withFiles.poll.options).toHaveLength(2)
    expect(plain.attachments).toEqual([])
    expect(plain.poll).toBeNull()
    expect(mockSupabase.rpc).toHaveBeenCalledWith('attachment_get_for_posts', { p_post_ids: [1, 2] })
  })

  it('keeps loading posts when the attachment/poll lookups fail', async () => {
    mockSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })
    const { result } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.posts.length).toBe(2))
    expect(result.current.posts.every(p => p.poll === null && p.attachments.length === 0)).toBe(true)
  })

  it('votePoll replaces the poll with the new counts', async () => {
    const { result } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.posts.length).toBe(2))

    await act(async () => {
      const { error } = await result.current.votePoll(1, 6)
      expect(error).toBeNull()
    })
    expect(mockSupabase.rpc).toHaveBeenCalledWith('poll_vote', { p_post_id: 1, p_option_id: 6 })
    const poll = result.current.posts.find(p => p.id === 1).poll
    expect(poll.my_option_id).toBe(6)
    expect(poll.total_votes).toBe(1)
  })

  it('votePoll leaves the poll alone and returns the error on failure', async () => {
    const { result } = renderHook(() => usePosts())
    await waitFor(() => expect(result.current.posts.length).toBe(2))
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'poll_closed' } })

    let res
    await act(async () => { res = await result.current.votePoll(1, 5) })
    expect(res.error.message).toBe('poll_closed')
    expect(result.current.posts.find(p => p.id === 1).poll.my_option_id).toBeNull()
  })
})
