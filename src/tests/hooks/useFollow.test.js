import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import { useFollow } from '../../hooks/social/useFollow'

const mockUser = { id: 'me' }
vi.mock('../../hooks/core/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }))

describe('useFollow', () => {
  beforeEach(() => vi.clearAllMocks())

  it('treats "no follow row" as not following, without an error lookup', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const { result } = renderHook(() => useFollow('them'))
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.following).toBe(false)
    expect(mockSupabase.maybeSingle).toHaveBeenCalled()
    expect(mockSupabase.single).not.toHaveBeenCalled()
  })

  it('reports following when the row exists', async () => {
    mockSupabase.maybeSingle.mockResolvedValueOnce({ data: { id: 'f1' }, error: null })
    const { result } = renderHook(() => useFollow('them'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.following).toBe(true)
  })
})
