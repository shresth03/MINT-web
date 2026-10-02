import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
} from 'vitest'

import {
  renderHook,
  act,
  waitFor,
} from '@testing-library/react'

import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import { useClaims } from '../../hooks/feed/useClaims'

const mockUser = {
  id: 'u1',
  email: 'test@test.com',
}

vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

describe('useClaims', () => {
  beforeEach(() => {
    vi.resetAllMocks()

    mockSupabase.rpc.mockResolvedValue({
      data: [],
      error: null,
    })

    mockSupabase.from.mockReturnThis()
    mockSupabase.select.mockReturnThis()
    mockSupabase.insert.mockReturnThis()
    mockSupabase.update.mockReturnThis()
    mockSupabase.delete.mockReturnThis()
    mockSupabase.eq.mockReturnThis()
    mockSupabase.in.mockReturnThis()
    mockSupabase.order.mockReturnThis()

    mockSupabase.single.mockResolvedValue({
      data: null,
      error: null,
    })

    mockSupabase.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    })
  })

  it('loads claim and notes for a post', async () => {
    const claim = {
      id: 1,
      post_id: 10,
      status: 'open',
      created_at: new Date().toISOString(),
    }

    const note = {
      id: 2,
      post_id: 10,
      author_id: 'u2',
      body: 'This claim needs more evidence',
      stance: 'challenges',
      weight: 1,
      created_at: new Date().toISOString(),
    }

    mockSupabase.rpc.mockImplementation(
      functionName => {
        if (functionName === 'mod_get_claim_for_post') {
          return Promise.resolve({
            data: [claim],
            error: null,
          })
        }

        if (functionName === 'mod_get_notes_for_post') {
          return Promise.resolve({
            data: [note],
            error: null,
          })
        }

        return Promise.resolve({
          data: [],
          error: null,
        })
      }
    )

    mockSupabase.in.mockResolvedValue({
      data: [
        {
          id: 'u2',
          username: 'bob',
          role: 'public',
          score: 10,
        },
      ],
      error: null,
    })

    const { result } = renderHook(
      () => useClaims(10)
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.claim).toEqual(claim)
    expect(result.current.notes).toHaveLength(1)
    expect(result.current.notes[0].body).toBe(
      'This claim needs more evidence'
    )

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'mod_get_claim_for_post',
      { p_post_id: 10 }
    )

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'mod_get_notes_for_post',
      { p_post_id: 10 }
    )
  })

  it('submitNote calls mod_create_note with the correct payload', async () => {
    const createdNote = {
      id: 3,
      post_id: 10,
      author_id: 'u1',
      body: 'This information is supported',
      stance: 'supports',
    }

    mockSupabase.rpc.mockImplementation(
      functionName => {
        if (functionName === 'mod_create_note') {
          return Promise.resolve({
            data: [createdNote],
            error: null,
          })
        }

        return Promise.resolve({
          data: [],
          error: null,
        })
      }
    )

    const { result } = renderHook(
      () => useClaims(10)
    )

    await act(async () => {
      await result.current.submitNote(
        'This information is supported',
        'supports'
      )
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'mod_create_note',
      {
        p_payload: {
          post_id: 10,
          body: 'This information is supported',
          stance: 'supports',
        },
      }
    )
  })

  it('does not submit a second note when user already has one', async () => {
    const existingNote = {
      id: 5,
      post_id: 10,
      author_id: 'u1',
      body: 'Existing note',
      stance: 'supports',
    }

    mockSupabase.rpc.mockImplementation(
      functionName => {
        if (functionName === 'mod_get_notes_for_post') {
          return Promise.resolve({
            data: [existingNote],
            error: null,
          })
        }

        return Promise.resolve({
          data: [],
          error: null,
        })
      }
    )

    const { result } = renderHook(
      () => useClaims(10)
    )

    await waitFor(() => {
      expect(result.current.userNote).toMatchObject(existingNote)
    })

    await act(async () => {
      await result.current.submitNote(
        'Another note',
        'challenges'
      )
    })

    expect(mockSupabase.rpc).not.toHaveBeenCalledWith(
      'mod_create_note',
      expect.anything()
    )
  })

  it('deleteNote calls mod_delete_note with the correct note id', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [],
      error: null,
    })

    const { result } = renderHook(
      () => useClaims(10)
    )

    await act(async () => {
      await result.current.deleteNote(3)
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'mod_delete_note',
      {
        p_note_id: 3,
      }
    )
  })

  it('resolveClaim calls mod_resolve_claim with the correct payload', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [],
      error: null,
    })

    const { result } = renderHook(
      () => useClaims(10)
    )

    await act(async () => {
      await result.current.resolveClaim(
        7,
        'resolved',
        'Evidence confirms the claim.'
      )
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'mod_resolve_claim',
      {
        p_claim_id: 7,
        p_payload: {
          status: 'resolved',
          resolution_note:
            'Evidence confirms the claim.',
        },
      }
    )
  })

  it('rateNote calls mod_update_note with accuracy rating', async () => {
    mockSupabase.rpc.mockResolvedValue({
      data: [],
      error: null,
    })

    const { result } = renderHook(
      () => useClaims(10)
    )

    await act(async () => {
      await result.current.rateNote(4, 5)
    })

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'mod_update_note',
      {
        p_note_id: 4,
        p_payload: {
          accuracy_rating: 5,
        },
      }
    )
  })

  it('calculates challenge and support weights', async () => {
    const notes = [
      {
        id: 1,
        post_id: 10,
        author_id: 'u2',
        body: 'Challenge 1',
        stance: 'challenges',
        weight: 3,
      },
      {
        id: 2,
        post_id: 10,
        author_id: 'u3',
        body: 'Challenge 2',
        stance: 'challenges',
        weight: 2,
      },
      {
        id: 3,
        post_id: 10,
        author_id: 'u4',
        body: 'Support',
        stance: 'supports',
        weight: 2,
      },
    ]

    mockSupabase.rpc.mockImplementation(
      functionName => {
        if (functionName === 'mod_get_notes_for_post') {
          return Promise.resolve({
            data: notes,
            error: null,
          })
        }

        return Promise.resolve({
          data: [],
          error: null,
        })
      }
    )

    const { result } = renderHook(
      () => useClaims(10)
    )

    await waitFor(() => {
      expect(result.current.notes).toHaveLength(3)
    })

    expect(result.current.challengeWeight).toBe(5)
    expect(result.current.supportWeight).toBe(2)
    expect(result.current.claimVisible).toBe(true)
  })

  it('fetchAllOpenClaims uses mod_get_open_claims', async () => {
    const claims = [
      {
        id: 1,
        post_id: 10,
        status: 'open',
      },
    ]

    mockSupabase.rpc.mockImplementation(
      functionName => {
        if (functionName === 'mod_get_open_claims') {
          return Promise.resolve({
            data: claims,
            error: null,
          })
        }

        return Promise.resolve({
          data: [],
          error: null,
        })
      }
    )

    mockSupabase.in.mockResolvedValue({
      data: [],
      error: null,
    })

    const { result } = renderHook(
      () => useClaims()
    )

    let openClaims

    await act(async () => {
      openClaims =
        await result.current.fetchAllOpenClaims()
    })

    expect(openClaims).toMatchObject(claims)

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'mod_get_open_claims'
    )
  })
})