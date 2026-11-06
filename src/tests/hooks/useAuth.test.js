import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'

// vi.mock is hoisted — use vi.hoisted so the fns are available inside the factory
const {
  mockAuthSignUp, mockAuthSignIn, mockAuthSignOut,
  mockAuthGetSession, mockAuthOnChange, mockAuthResetPw, mockAuthResend, mockRpc,
} = vi.hoisted(() => ({
  mockRpc: vi.fn().mockResolvedValue({ data: true, error: null }),
  mockAuthSignUp: vi.fn(),
  mockAuthSignIn: vi.fn(),
  mockAuthSignOut: vi.fn(),
  mockAuthGetSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  // Call the callback immediately so onAuthStateChange sets loading=false
  mockAuthOnChange: vi.fn((cb) => {
    cb('INITIAL_SESSION', null)
    return { data: { subscription: { unsubscribe: vi.fn() } } }
  }),
  mockAuthResetPw: vi.fn().mockResolvedValue({ error: null }),
  mockAuthResend: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('../../api/supabase', () => ({
  supabase: {
    rpc: mockRpc,
    auth: {
      getSession: mockAuthGetSession,
      onAuthStateChange: mockAuthOnChange,
      signUp: mockAuthSignUp,
      signInWithPassword: mockAuthSignIn,
      signOut: mockAuthSignOut,
      resetPasswordForEmail: mockAuthResetPw,
      resend: mockAuthResend,
    },
  },
}))

import { AuthProvider, useAuth } from '../../hooks/core/useAuth'

const wrapper = ({ children }) => React.createElement(AuthProvider, null, children)

// AuthProvider renders {!loading && children} — flush the getSession promise
// so loading becomes false and the hook component actually renders.
async function setup() {
  const hook = renderHook(() => useAuth(), { wrapper })
  await act(async () => {}) // flush getSession microtask → setLoading(false)
  return hook
}

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    mockRpc.mockResolvedValue({ data: true, error: null })
    mockAuthGetSession.mockResolvedValue({ data: { session: null } })
    mockAuthOnChange.mockImplementation((cb) => {
      cb('INITIAL_SESSION', null)
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
  })

  // ── signUp (#28) ─────────────────────────────────────────────────────────

  it('returns auth error if supabase.auth.signUp fails', async () => {
    mockAuthSignUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email rate limit exceeded' },
    })

    const { result } = await setup()
    let response
    await act(async () => {
      response = await result.current.signUp('a@b.com', 'pass123', 'alice')
    })

    expect(response.error).toBeTruthy()
    expect(response.error.message).toBe('Email rate limit exceeded')
  })

  it('returns { data } on fully successful signUp', async () => {
    mockAuthSignUp.mockResolvedValue({ data: { user: { id: 'u-new' } }, error: null })

    const { result } = await setup()
    let response
    await act(async () => {
      response = await result.current.signUp('a@b.com', 'pass123', 'alice')
    })

    expect(response.error).toBeFalsy()
    expect(response.data).toBeTruthy()
  })

  it('sanitises role — unknown role defaults to public', async () => {
    mockAuthSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const { result } = await setup()
    await act(async () => {
      await result.current.signUp('a@b.com', 'pass', 'alice', 'hacker')
    })

    expect(mockAuthSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ role: 'public' }),
        }),
      })
    )
  })

  it('allows reporter role through', async () => {
    mockAuthSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const { result } = await setup()
    await act(async () => {
      await result.current.signUp('a@b.com', 'pass', 'bob', 'reporter')
    })

    expect(mockAuthSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ role: 'reporter' }),
        }),
      })
    )
  })

  // ── username check ───────────────────────────────────────────────────────

  it('checks the trimmed username before creating the account', async () => {
    mockAuthSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const { result } = await setup()
    await act(async () => {
      await result.current.signUp('a@b.com', 'pass1234', '  alice  ')
    })

    expect(mockRpc).toHaveBeenCalledWith('auth_username_available', { p_username: 'alice' })
    expect(mockAuthSignUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          data: expect.objectContaining({ username: 'alice' }),
        }),
      })
    )
  })

  it('stops with a clear message when the username is taken', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })

    const { result } = await setup()
    let response
    await act(async () => {
      response = await result.current.signUp('a@b.com', 'pass1234', 'Alice')
    })

    expect(response.error.message).toBe('That username is already taken.')
    expect(mockAuthSignUp).not.toHaveBeenCalled()
  })

  it('does not create the account when the check itself fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'network' } })

    const { result } = await setup()
    let response
    await act(async () => {
      response = await result.current.signUp('a@b.com', 'pass1234', 'alice')
    })

    expect(response.error.message).toMatch(/Unable to check username/)
    expect(mockAuthSignUp).not.toHaveBeenCalled()
  })

  // ── sign out and session timeout ─────────────────────────────────────────

  it('signOut ends the session in this browser only', async () => {
    const { result } = await setup()
    await act(async () => { await result.current.signOut() })
    expect(mockAuthSignOut).toHaveBeenCalledWith({ scope: 'local' })
  })

  it('signs out on load when the last activity is older than the limit', async () => {
    localStorage.setItem('mint_last_activity', String(Date.now() - 11 * 60 * 1000))
    mockAuthOnChange.mockImplementation((cb) => {
      cb('INITIAL_SESSION', { user: { id: 'u1' } })
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    await setup()

    expect(mockAuthSignOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(sessionStorage.getItem('mint_session_expired')).toBe('1')
  })

  it('keeps a recently active session signed in', async () => {
    localStorage.setItem('mint_last_activity', String(Date.now() - 60 * 1000))
    mockAuthOnChange.mockImplementation((cb) => {
      cb('INITIAL_SESSION', { user: { id: 'u1' } })
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })

    const { result } = await setup()

    expect(mockAuthSignOut).not.toHaveBeenCalled()
    expect(result.current.user).toEqual({ id: 'u1' })
  })

  it('times out after 10 idle minutes', async () => {
    vi.useFakeTimers()
    try {
      mockAuthOnChange.mockImplementation((cb) => {
        cb('INITIAL_SESSION', { user: { id: 'u1' } })
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })
      await setup()
      expect(mockAuthSignOut).not.toHaveBeenCalled()

      await act(async () => { vi.advanceTimersByTime(9 * 60 * 1000) })
      expect(mockAuthSignOut).not.toHaveBeenCalled()

      await act(async () => { vi.advanceTimersByTime(90 * 1000) })
      expect(mockAuthSignOut).toHaveBeenCalledWith({ scope: 'local' })
    } finally {
      vi.useRealTimers()
    }
  })

  it('activity in the window resets the clock', async () => {
    vi.useFakeTimers()
    try {
      mockAuthOnChange.mockImplementation((cb) => {
        cb('INITIAL_SESSION', { user: { id: 'u1' } })
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      })
      await setup()

      await act(async () => { vi.advanceTimersByTime(8 * 60 * 1000) })
      await act(async () => { window.dispatchEvent(new Event('keydown')) })
      await act(async () => { vi.advanceTimersByTime(8 * 60 * 1000) })

      expect(mockAuthSignOut).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  // ── resetPassword ────────────────────────────────────────────────────────

  it('calls resetPasswordForEmail with correct email and redirectTo', async () => {
    const { result } = await setup()
    await act(async () => {
      await result.current.resetPassword('a@b.com')
    })
    expect(mockAuthResetPw).toHaveBeenCalledWith(
      'a@b.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/reset-password') })
    )
  })
})
