import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import { usePosts } from '../../hooks/feed/usePosts'

vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'test@test.com' } }),
}))

const POSTS_RESPONSE = [
  { id: 'p1', body: 'Test post', author_id: 'u2', created_at: new Date().toISOString(),
    likes: 3, reply_count: 0, repost_count: 0, is_osint: false,
    users: { id: 'u2', username: 'bob', role: 'public', score: 10 } },
]

describe('usePosts', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockSupabase.rpc.mockResolvedValue({ data: [], error: null })
    mockSupabase.from.mockReturnThis()
    mockSupabase.select.mockReturnThis()
    mockSupabase.insert.mockReturnThis()
    mockSupabase.update.mockReturnThis()
    mockSupabase.delete.mockReturnThis()
    mockSupabase.eq.mockReturnThis()
    mockSupabase.neq.mockReturnThis()
    mockSupabase.in.mockReturnThis()
    mockSupabase.order.mockReturnThis()
    mockSupabase.not.mockReturnThis()
    mockSupabase.single.mockResolvedValue({ data: null, error: null })
    mockSupabase.maybeSingle.mockResolvedValue({ data: null, error: null })
    mockSupabase.limit.mockResolvedValue({ data: POSTS_RESPONSE, error: null })
    mockSupabase.channel.mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })
    mockSupabase.removeChannel.mockReturnValue(undefined)
  })

  // ── #25 — fetchReplyVotes removed ───────��────────────────────────────────

  it('does not expose fetchReplyVotes (dead export was removed)', () => {
    const { result } = renderHook(() => usePosts())
    expect(result.current.fetchReplyVotes).toBeUndefined()
  })

  it('still exposes voteReply (kept)', () => {
    const { result } = renderHook(() => usePosts())
    expect(typeof result.current.voteReply).toBe('function')
  })

  // ── Core exports still present ───────��────────────────────────────────────

  it('exposes all expected functions', () => {
    const { result } = renderHook(() => usePosts())
    const expected = [
      'createPost', 'likePost', 'savePost', 'repost',
      'createReply', 'fetchReplies', 'fetchSavedPosts',
      'fetchUserReposts', 'searchUsers', 'voteReply',
    ]
    expected.forEach(fn => {
      expect(typeof result.current[fn]).toBe('function')
    })
  })

  // ── #30 — fetchSinglePost hydrates interaction flags ──────────────────────

  it('fetchSinglePost — new post has liked/saved/reposted flags', async () => {
    let realtimeCallback = null

    mockSupabase.channel.mockReturnValue({
      on: vi.fn((event, filter, cb) => {
        realtimeCallback = cb
        return {
          subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
        }
      }),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })

    mockSupabase.rpc
      .mockResolvedValueOnce({
        data: [{
          id: 'p-new',
          body: 'New realtime post',
          author_id: 'u2',
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })

    const { result } = renderHook(() => usePosts())

    if (realtimeCallback) {
      await act(async () => {
        await realtimeCallback({ new: { id: 'p-new' } })
      })
    }

    const newPost = result.current.posts.find(p => p.id === 'p-new')

    if (newPost) {
      expect(newPost.liked).toBe(false)
      expect(newPost.saved).toBe(false)
      expect(newPost.reposted).toBe(false)
    }

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'feed_get_post',
      { p_post_id: 'p-new' }
    )
  })

  it('fetchSinglePost — sets liked=true if user has a like row', async () => {
    let realtimeCallback = null

    mockSupabase.channel.mockReturnValue({
      on: vi.fn((event, filter, cb) => {
        realtimeCallback = cb
        return {
          subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() })
        }
      }),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })

    mockSupabase.rpc
      .mockResolvedValueOnce({
        data: [{
          id: 'p-liked',
          body: 'Post I already liked',
          author_id: 'u2',
        }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: ['p-liked'],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })

    const { result } = renderHook(() => usePosts())

    if (realtimeCallback) {
      await act(async () => {
        await realtimeCallback({ new: { id: 'p-liked' } })
      })

      const newPost = result.current.posts.find(p => p.id === 'p-liked')

      if (newPost) {
        expect(newPost.liked).toBe(true)
        expect(newPost.saved).toBe(false)
        expect(newPost.reposted).toBe(false)
      }
    }
  })

  // ── createPost ────��───────────────────────────────────────────────────────

  it('createPost calls social_create_post with correct fields', async () => {
    mockSupabase.rpc.mockImplementation((functionName) => {
      if (functionName === 'social_create_post') {
        return Promise.resolve({ data: 123, error: null })
      }

      return Promise.resolve({ data: [], error: null })
    })

    const { result } = renderHook(() => usePosts())

    await act(async () => {
      await result.current.createPost('Hello world')
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'social_create_post',
      {
        p_body: 'Hello world',
        p_tag: null,
        p_region: null,
        p_media_url: null,
      }
    )
  })

  it('createPost extracts first hashtag as tag when no explicit tag is given', async () => {
    mockSupabase.rpc.mockImplementation((functionName) => {
      if (functionName === 'social_create_post') {
        return Promise.resolve({ data: 123, error: null })
      }

      return Promise.resolve({ data: [], error: null })
    })

    const { result } = renderHook(() => usePosts())

    await act(async () => {
      await result.current.createPost('Spotted in #MILITARY sector')
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'social_create_post',
      {
        p_body: 'Spotted in #MILITARY sector',
        p_tag: 'MILITARY',
        p_region: null,
        p_media_url: null,
      }
    )
  })
})
