import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import { useVideos } from '../../hooks/feed/useVideos'

vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'test-user',
      email: 'test@test.com',
    },
  }),
}))

const storageBucket = {
  upload: vi.fn().mockResolvedValue({ error: null }),
  getPublicUrl: vi.fn().mockReturnValue({
    data: {
      publicUrl: 'https://cdn.example.com/video.mp4',
    },
  }),
}

describe('useVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    storageBucket.upload.mockResolvedValue({ error: null })

    storageBucket.getPublicUrl.mockReturnValue({
      data: {
        publicUrl: 'https://cdn.example.com/video.mp4',
      },
    })

    mockSupabase.storage = {
      from: vi.fn().mockReturnValue(storageBucket),
    }

    mockSupabase.rpc.mockResolvedValue({
      data: [],
      error: null,
    })
  })

  it('initialises with empty videos and loading true', () => {
    const { result } = renderHook(() => useVideos())

    expect(result.current.videos).toEqual([])
    expect(result.current.loading).toBe(true)
    expect(result.current.uploading).toBe(false)
  })

  it('exposes uploadVideo, likeVideo, incrementView', async () => {
    const { result } = renderHook(() => useVideos())

    expect(typeof result.current.uploadVideo).toBe('function')
    expect(typeof result.current.likeVideo).toBe('function')
    expect(typeof result.current.incrementView).toBe('function')

    await act(async () => {
      await Promise.resolve()
    })
  })

  it('loads liked video ids and sets _liked', async () => {
    mockSupabase.rpc.mockImplementation(functionName => {
      if (functionName === 'engagement_get_liked_video_ids') {
        return Promise.resolve({
          data: ['v1'],
          error: null,
        })
      }

      return Promise.resolve({
        data: [],
        error: null,
      })
    })

    const { result } = renderHook(() => useVideos())

    await act(async () => {
      await result.current.refetch()
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'engagement_get_liked_video_ids'
    )
  })

  it('uploadVideo calls storage upload then inserts record', async () => {
    const fakeFile = new File(
      ['video content'],
      'test.mp4',
      { type: 'video/mp4' }
    )

    const { result } = renderHook(() => useVideos())

    // Allow the hook's initial fetchVideos() effect to finish.
    await act(async () => {
      await Promise.resolve()
    })

    mockSupabase.single.mockResolvedValue({
      data: {
        id: 'v1',
        author_id: 'test-user',
        title: 'Test Reel',
        body: '',
        video_url: 'https://cdn.example.com/video.mp4',
        type: 'reel',
        stream_id: null,
      },
      error: null,
    })

    let res
    

    await act(async () => {
      res = await result.current.uploadVideo(
        fakeFile,
        {
          title: 'Test Reel',
          type: 'reel',
        }
      )
    })

    expect(mockSupabase.storage.from)
      .toHaveBeenCalledWith('videos')

    expect(mockSupabase.insert)
      .toHaveBeenCalled()

    expect(res?.error).toBeFalsy()
  })

  it('uploadVideo returns error if storage upload fails', async () => {
    storageBucket.upload.mockResolvedValueOnce({
      error: {
        message: 'Upload failed',
      },
    })

    const fakeFile = new File(
      ['video'],
      'test.mp4',
      { type: 'video/mp4' }
    )

    const { result } = renderHook(() => useVideos())

    let res

    await act(async () => {
      res = await result.current.uploadVideo(
        fakeFile,
        {}
      )
    })

    expect(res.error).toBeTruthy()
    expect(result.current.uploading).toBe(false)
  })

  it('likeVideo uses engagement_like_video and updates counter', async () => {
    const { result } = renderHook(() => useVideos())

    act(() => {
      result.current.videos.push({
        id: 'v1',
        likes: 3,
        _liked: false,
      })
    })

    await act(async () => {
      await result.current.likeVideo('v1')
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'engagement_like_video',
      {
        p_video_id: 'v1',
      }
    )

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'engagement_update_video_counter',
      {
        p_video_id: 'v1',
        p_column: 'likes',
        p_value: 4,
      }
    )
  })

  it('likeVideo uses engagement_unlike_video and updates counter', async () => {
    const { result } = renderHook(() => useVideos())

    act(() => {
      result.current.videos.push({
        id: 'v1',
        likes: 5,
        _liked: true,
      })
    })

    await act(async () => {
      await result.current.likeVideo('v1')
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'engagement_unlike_video',
      {
        p_video_id: 'v1',
      }
    )

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'engagement_update_video_counter',
      {
        p_video_id: 'v1',
        p_column: 'likes',
        p_value: 4,
      }
    )
  })

  it('filters by type when type param passed', async () => {
    const { result: reels } = renderHook(
      () => useVideos('reel')
    )

    const { result: replays } = renderHook(
      () => useVideos('replay')
    )

    expect(reels.current.videos).toEqual([])
    expect(replays.current.videos).toEqual([])

    await act(async () => {
      await Promise.resolve()
    })
  })
})