import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mockSupabase } from '../mocks/supabase.js'
import '../mocks/supabase.js'
import ResetPassword from '../../pages/auth/ResetPassword'

const mockNavigate = vi.fn()
const mockUpdatePassword = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ updatePassword: mockUpdatePassword }),
}))

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

const renderPage = () => render(<MemoryRouter><ResetPassword /></MemoryRouter>)

describe('ResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    mockSupabase.auth.onAuthStateChange = vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
    mockUpdatePassword.mockResolvedValue({ error: null })
  })

  afterEach(() => {
    sessionStorage.clear()
    vi.useRealTimers()
  })

  // ── Initial state ────────────────────────────────────────────────────────

  it('shows verifying state initially when no recovery flag', () => {
    renderPage()
    expect(screen.getByText(/Verifying reset link/i)).toBeInTheDocument()
  })

  it('shows form immediately when mint_recovery flag is set', () => {
    sessionStorage.setItem('mint_recovery', '1')
    renderPage()
    expect(screen.getByPlaceholderText('New password')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument()
    expect(screen.getByText('UPDATE PASSWORD')).toBeInTheDocument()
  })

  it('shows expired state after 1500ms timeout with no recovery flag', async () => {
    vi.useFakeTimers()
    renderPage()
    await act(async () => { vi.advanceTimersByTime(1600) })
    expect(screen.getByText(/Link expired or invalid/i)).toBeInTheDocument()
  })

  it('shows "Back to sign in" link in expired state', async () => {
    vi.useFakeTimers()
    renderPage()
    await act(async () => { vi.advanceTimersByTime(1600) })
    expect(screen.getByText(/Back to sign in/i)).toBeInTheDocument()
  })

  it('shows form when PASSWORD_RECOVERY event fires via direct listener', async () => {
    let capturedCallback
    mockSupabase.auth.onAuthStateChange = vi.fn().mockImplementation((cb) => {
      capturedCallback = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    renderPage()
    act(() => { capturedCallback('PASSWORD_RECOVERY', {}) })
    await waitFor(() => {
      expect(screen.getByPlaceholderText('New password')).toBeInTheDocument()
    })
  })

  // ── Validation ───────────────────────────────────────────────────────────

  it('validates empty password', () => {
    sessionStorage.setItem('mint_recovery', '1')
    renderPage()
    fireEvent.click(screen.getByText('UPDATE PASSWORD'))
    expect(screen.getByText('Enter a new password')).toBeInTheDocument()
  })

  it('validates password shorter than 6 characters', () => {
    sessionStorage.setItem('mint_recovery', '1')
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'abc' } })
    fireEvent.click(screen.getByText('UPDATE PASSWORD'))
    expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument()
  })

  it('validates mismatched passwords', () => {
    sessionStorage.setItem('mint_recovery', '1')
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'password123' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'different' } })
    fireEvent.click(screen.getByText('UPDATE PASSWORD'))
    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
  })

  // ── Submit ───────────────────────────────────────────────────────────────

  it('calls updatePassword with the entered password', async () => {
    sessionStorage.setItem('mint_recovery', '1')
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newPass123' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'newPass123' } })
    fireEvent.click(screen.getByText('UPDATE PASSWORD'))
    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('newPass123')
    })
  })

  it('shows success state after password update', async () => {
    sessionStorage.setItem('mint_recovery', '1')
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newPass123' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'newPass123' } })
    fireEvent.click(screen.getByText('UPDATE PASSWORD'))
    await waitFor(() => {
      expect(screen.getByText(/Password updated/i)).toBeInTheDocument()
    })
  })

  it('clears mint_recovery from sessionStorage on success', async () => {
    sessionStorage.setItem('mint_recovery', '1')
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newPass123' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'newPass123' } })
    fireEvent.click(screen.getByText('UPDATE PASSWORD'))
    await waitFor(() => {
      expect(screen.getByText(/Password updated/i)).toBeInTheDocument()
    })
    expect(sessionStorage.getItem('mint_recovery')).toBeNull()
  })

  it('shows API error message on failed update', async () => {
    mockUpdatePassword.mockResolvedValue({ error: { message: 'Auth session expired' } })
    sessionStorage.setItem('mint_recovery', '1')
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newPass123' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'newPass123' } })
    fireEvent.click(screen.getByText('UPDATE PASSWORD'))
    await waitFor(() => {
      expect(screen.getByText('Auth session expired')).toBeInTheDocument()
    })
  })

  it('Enter key on confirm field submits the form', async () => {
    sessionStorage.setItem('mint_recovery', '1')
    renderPage()
    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'newPass123' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'newPass123' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Confirm new password'), { key: 'Enter' })
    await waitFor(() => {
      expect(mockUpdatePassword).toHaveBeenCalledWith('newPass123')
    })
  })
})
