import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import ProfilePage from '../../pages/account/ProfilePage'

const mockNavigate = vi.fn()
const mockUpdateProfile = vi.fn()
const mockFetchSavedPosts = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'alice@test.com' } }),
}))

const MOCK_PROFILE = { username: 'alice', role: 'public', score: 42 }

vi.mock('../../hooks/useUser', () => ({
  useUser: () => ({
    profile: MOCK_PROFILE,
    loading: false,
    updateProfile: mockUpdateProfile,
  }),
}))

vi.mock('../../hooks/usePosts', () => ({
  usePosts: () => ({ fetchSavedPosts: mockFetchSavedPosts }),
}))

const renderPage = () => render(<MemoryRouter><ProfilePage /></MemoryRouter>)

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateProfile.mockResolvedValue({ error: null })
    mockFetchSavedPosts.mockResolvedValue({ data: [] })
    mockSupabase.from.mockReturnThis()
    mockSupabase.select.mockReturnThis()
    mockSupabase.eq.mockReturnThis()
    mockSupabase.then.mockImplementation((resolve) =>
      Promise.resolve({ data: [], count: 5 }).then(resolve)
    )
  })

  // ── Layout ───────────────────────────────────────────────────────────────

  it('renders MY PROFILE title', () => {
    renderPage()
    expect(screen.getByText('MY PROFILE')).toBeInTheDocument()
  })

  it('shows the username in the input', () => {
    renderPage()
    expect(screen.getByDisplayValue('alice')).toBeInTheDocument()
  })

  it('shows read-only email field', () => {
    renderPage()
    expect(screen.getByDisplayValue('alice@test.com')).toBeDisabled()
  })

  // ── Save without reload (#26) ─────────────────────────────────────────

  it('does NOT call window.location.reload after save', async () => {
    const reloadSpy = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { reload: reloadSpy },
      writable: true,
    })

    renderPage()
    fireEvent.click(screen.getByText('SAVE CHANGES'))
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalled()
    })
    // Give any pending timers a chance to fire
    await new Promise(r => setTimeout(r, 50))
    expect(reloadSpy).not.toHaveBeenCalled()
  })

  it('shows Saved! banner after successful save', async () => {
    renderPage()
    fireEvent.click(screen.getByText('SAVE CHANGES'))
    await waitFor(() => {
      expect(screen.getByText(/Saved!/i)).toBeInTheDocument()
    })
  })

  it('schedules Saved! banner dismissal after 2000ms', async () => {
    const timeoutSpy = vi.spyOn(globalThis, 'setTimeout')
    renderPage()
    fireEvent.click(screen.getByText('SAVE CHANGES'))
    await waitFor(() => expect(screen.getByText(/Saved!/i)).toBeInTheDocument())
    expect(timeoutSpy).toHaveBeenCalledWith(expect.any(Function), 2000)
    timeoutSpy.mockRestore()
  })

  it('calls updateProfile with the new username value', async () => {
    renderPage()
    const input = screen.getByPlaceholderText('your username')
    fireEvent.change(input, { target: { value: 'alice_new' } })
    fireEvent.click(screen.getByText('SAVE CHANGES'))
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({ username: 'alice_new' })
    })
  })

  it('does not show Saved! if updateProfile returns an error', async () => {
    mockUpdateProfile.mockResolvedValue({ error: { message: 'DB error' } })
    renderPage()
    fireEvent.click(screen.getByText('SAVE CHANGES'))
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalled())
    expect(screen.queryByText(/Saved!/i)).not.toBeInTheDocument()
  })
})
