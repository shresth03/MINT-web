import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import React from 'react'

// vi.mock is hoisted — use vi.hoisted so the fns are available inside the factory
const {
  mockAuthSignUp, mockAuthSignIn, mockAuthSignOut,
  mockAuthGetSession, mockAuthOnChange, mockAuthResetPw, mockInsert,
} = vi.hoisted(() => ({
  mockAuthSignUp: vi.fn(),
  mockAuthSignIn: vi.fn(),
  mockAuthSignOut: vi.fn(),
  mockAuthGetSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  mockAuthOnChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  mockAuthResetPw: vi.fn().mockResolvedValue({ error: null }),
  mockInsert: vi.fn(),
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
    },
    from: () => ({ insert: mockInsert }),
  },
}))

import { AuthProvider, useAuth } from '../../hooks/useAuth'

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
    mockAuthOnChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
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
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('returns insert error when users table insert fails (#28)', async () => {
    mockAuthSignUp.mockResolvedValue({ data: { user: { id: 'u-new' } }, error: null })
    mockInsert.mockResolvedValue({
      data: null,
      error: { message: 'duplicate key value violates unique constraint "users_username_key"' },
    })

    const { result } = await setup()
    let response
    await act(async () => {
      response = await result.current.signUp('a@b.com', 'pass123', 'taken_name')
    })

    expect(response.error).toBeTruthy()
    expect(response.error.message).toMatch(/duplicate key/i)
  })

  it('returns { data } on fully successful signUp', async () => {
    mockAuthSignUp.mockResolvedValue({ data: { user: { id: 'u-new' } }, error: null })
    mockInsert.mockResolvedValue({ data: { id: 'u-new' }, error: null })

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
    mockInsert.mockResolvedValue({ data: {}, error: null })

    const { result } = await setup()
    await act(async () => {
      await result.current.signUp('a@b.com', 'pass', 'alice', 'hacker')
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'public' })
    )
  })

  it('allows reporter role through', async () => {
    mockAuthSignUp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockInsert.mockResolvedValue({ data: {}, error: null })

    const { result } = await setup()
    await act(async () => {
      await result.current.signUp('a@b.com', 'pass', 'bob', 'reporter')
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'reporter' })
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
      expect.objectContaining({ redirectTo: expect.stringContaining('/login') })
    )
  })
})
