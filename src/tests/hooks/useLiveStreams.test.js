import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import { useLiveStreams } from '../../hooks/useLiveStreams'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@test.com' } }),
}))

describe('useLiveStreams', () => {
  beforeEach(() => vi.clearAllMocks())

  it('initialises with empty streams and loading true', () => {
    const { result } = renderHook(() => useLiveStreams())
    expect(result.current.streams).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('exposes createStream, goLive, endStream functions', () => {
    const { result } = renderHook(() => useLiveStreams())
    expect(typeof result.current.createStream).toBe('function')
    expect(typeof result.current.goLive).toBe('function')
    expect(typeof result.current.endStream).toBe('function')
  })

  it('createStream calls insert with title and host_id', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 's1', title: 'Test Stream', status: 'scheduled' }, error: null })

    const { result } = renderHook(() => useLiveStreams())
    let res
    await act(async () => {
      res = await result.current.createStream('Test Stream', 'A description')
    })

    expect(mockSupabase.insert).toHaveBeenCalled()
    expect(res?.error).toBeFalsy()
  })

  it('goLive updates stream status to live in state', async () => {
    const stream = { id: 's1', title: 'Test', status: 'scheduled', host_id: 'test-user' }
    const { result } = renderHook(() => useLiveStreams())

    // Seed streams
    act(() => { result.current.streams.push(stream) })

    await act(async () => {
      await result.current.goLive('s1')
    })

    expect(mockSupabase.update).toHaveBeenCalled()
  })

  it('endStream removes stream from state', async () => {
    const { result } = renderHook(() => useLiveStreams())
    await act(async () => {
      await result.current.endStream('s1')
    })
    expect(mockSupabase.update).toHaveBeenCalled()
  })
})
