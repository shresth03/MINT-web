import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc, mockUseAuth } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockUseAuth: vi.fn(),
}))

vi.mock('../../api/supabase', () => ({
  identityDb: {
    rpc: mockRpc,
  },
}))

vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: mockUseAuth,
}))

import { useUser } from '../../hooks/account/useUser'

describe('useUser', () => {
  const user = {
    id: 'user-123',
  }

  const profile = {
    id: 'user-123',
    username: 'testuser',
    role: 'public',
    score: 50,
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockUseAuth.mockReturnValue({
      user,
    })

    mockRpc.mockResolvedValue({
      data: [profile],
      error: null,
    })
  })

  it('fetches the profile using profile_get_by_id RPC', async () => {
    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.profile).toEqual(profile)
    })

    expect(mockRpc).toHaveBeenCalledWith('profile_get_by_id', {
      p_user_id: 'user-123',
    })
  })

  it('sets loading to false after fetching the profile', async () => {
    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })
  })

  it('updates the profile using profile_update RPC', async () => {
    const updatedProfile = {
      ...profile,
      username: 'updateduser',
    }

    mockRpc
      .mockResolvedValueOnce({
        data: [profile],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [updatedProfile],
        error: null,
      })

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.profile).toEqual(profile)
    })

    await act(async () => {
      await result.current.updateProfile({
        username: 'updateduser',
      })
    })

    expect(mockRpc).toHaveBeenLastCalledWith('profile_update', {
      p_user_id: 'user-123',
      p_username: 'updateduser',
    })

    expect(result.current.profile).toEqual(updatedProfile)
  })

  it('returns an error when trying to update unsupported profile fields', async () => {
    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.profile).toEqual(profile)
    })

    let response

    await act(async () => {
      response = await result.current.updateProfile({
        role: 'osint',
      })
    })

    expect(response.error).toBeInstanceOf(Error)
    expect(response.error.message).toBe(
      'profile_update only supports username'
    )

    expect(mockRpc).toHaveBeenCalledTimes(1)
  })

  it('handles profile fetch errors', async () => {
    const error = new Error('Failed to fetch profile')

    mockRpc.mockResolvedValueOnce({
      data: null,
      error,
    })

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toBe(null)
  })

  it('does not call the profile RPC when there is no authenticated user', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
    })

    const { result } = renderHook(() => useUser())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(mockRpc).not.toHaveBeenCalled()
    expect(result.current.profile).toBe(null)
  })
})