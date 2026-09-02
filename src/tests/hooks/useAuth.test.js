import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'

// vi.mock is hoisted — use vi.hoisted so the fns are available inside the factory
const {
  mockAuthSignUp, mockAuthSignIn, mockAuthSignOut,
  mockAuthGetSession, mockAuthOnChange, mockAuthResetPw, mockAuthResend,
} = vi.hoisted(() => ({
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
