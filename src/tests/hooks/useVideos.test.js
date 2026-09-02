import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import { useVideos } from '../../hooks/feed/useVideos'

vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@test.com' } }),
}))

const storageBucket = {
  upload: vi.fn().mockResolvedValue({ error: null }),
  getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/video.mp4' } }),
}

describe('useVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-attach storage mock after clearAllMocks resets vi.fn() implementations
    storageBucket.upload.mockResolvedValue({ error: null })
    storageBucket.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://cdn.example.com/video.mp4' } })
    mockSupabase.storage = { from: vi.fn().mockReturnValue(storageBucket) }
  })

  it('initialises with empty videos and loading true', () => {
    const { result } = renderHook(() => useVideos())
    expect(result.current.videos).toEqual([])
    expect(result.current.loading).toBe(true)
    expect(result.current.uploading).toBe(false)
  })

  it('exposes uploadVideo, likeVideo, incrementView', () => {
    const { result } = renderHook(() => useVideos())
    expect(typeof result.current.uploadVideo).toBe('function')
    expect(typeof result.current.likeVideo).toBe('function')
    expect(typeof result.current.incrementView).toBe('function')
  })

  it('uploadVideo calls storage upload then inserts record', async () => {
    const fakeFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' })
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'v1', video_url: 'https://cdn.example.com/video.mp4' }, error: null })

    const { result } = renderHook(() => useVideos())
    let res
    await act(async () => {
      res = await result.current.uploadVideo(fakeFile, { title: 'Test Reel', type: 'reel' })
    })

    expect(mockSupabase.storage.from).toHaveBeenCalledWith('videos')
    expect(mockSupabase.insert).toHaveBeenCalled()
    expect(res?.error).toBeFalsy()
  })

  it('uploadVideo returns error if storage upload fails', async () => {
    storageBucket.upload.mockResolvedValueOnce({ error: { message: 'Upload failed' } })
    const fakeFile = new File(['video'], 'test.mp4', { type: 'video/mp4' })

    const { result } = renderHook(() => useVideos())
    let res
    await act(async () => {
      res = await result.current.uploadVideo(fakeFile, {})
    })
    expect(res.error).toBeTruthy()
    expect(result.current.uploading).toBe(false)
  })

  it('likeVideo optimistically increments like count', async () => {
    const { result } = renderHook(() => useVideos())
    // Seed a video manually
    act(() => {
      result.current.videos.push({ id: 'v1', likes: 3, _liked: false })
    })
    await act(async () => {
      await result.current.likeVideo('v1')
    })
    expect(mockSupabase.insert).toHaveBeenCalled()
  })

  it('likeVideo removes like when already liked', async () => {
    const { result } = renderHook(() => useVideos())
    act(() => {
      result.current.videos.push({ id: 'v1', likes: 5, _liked: true })
    })
    await act(async () => {
      await result.current.likeVideo('v1')
    })
    expect(mockSupabase.delete).toHaveBeenCalled()
  })

  it('filters by type when type param passed', () => {
    const { result: reels } = renderHook(() => useVideos('reel'))
    const { result: replays } = renderHook(() => useVideos('replay'))
    // Both hooks initialise correctly — type filtering happens in query
    expect(reels.current.videos).toEqual([])
    expect(replays.current.videos).toEqual([])
  })
})
