import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import VerifyEmail from '../../pages/auth/VerifyEmail'

const mockNavigate = vi.fn()
const mockResendVerification = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../hooks/core/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

const mockUser = { id: 'u1', email: 'user@example.com', email_confirmed_at: null }

vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({ user: mockUser, resendVerification: mockResendVerification }),
}))

const renderPage = (path = '/verify-email') =>
  render(<MemoryRouter initialEntries={[path]}><VerifyEmail /></MemoryRouter>)

describe('VerifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUser.email = 'user@example.com'
    mockUser.email_confirmed_at = null
    mockResendVerification.mockResolvedValue({ error: null })
  })

  // ── Layout ───────────────────────────────────────────────────────────────

  it('renders "Verify your email" heading', () => {
    renderPage()
    expect(screen.getByText(/Verify your email/i)).toBeInTheDocument()
  })

  it('renders the MINT logo', () => {
    renderPage()
    expect(screen.getByRole('img', { name: 'MINT' })).toBeInTheDocument()
  })

  it('shows RESEND EMAIL button', () => {
    renderPage()
    expect(screen.getByText(/RESEND EMAIL/i)).toBeInTheDocument()
  })

  it('shows email from authenticated user', () => {
    renderPage()
    expect(screen.getByText('user@example.com')).toBeInTheDocument()
  })

  it('shows email from ?email= query param when user has no email', () => {
    mockUser.email = undefined
    renderPage('/verify-email?email=guest@test.com')
    expect(screen.getByText('guest@test.com')).toBeInTheDocument()
  })

  it('shows "Sign up again" link', () => {
    renderPage()
    expect(screen.getByText(/Sign up again/i)).toBeInTheDocument()
  })

  it('shows "Sign in" link', () => {
    renderPage()
    expect(screen.getByText('Sign in')).toBeInTheDocument()
  })

  // ── Resend flow ──────────────────────────────────────────────────────────

  it('calls resendVerification with user email on click', async () => {
    renderPage()
    fireEvent.click(screen.getByText(/RESEND EMAIL/i))
    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalledWith('user@example.com')
    })
  })

  it('shows success banner after resend', async () => {
    renderPage()
    fireEvent.click(screen.getByText(/RESEND EMAIL/i))
    await waitFor(() => {
      expect(screen.getByText(/Email sent/i)).toBeInTheDocument()
    })
  })

  it('shows countdown on button after resend', async () => {
    renderPage()
    fireEvent.click(screen.getByText(/RESEND EMAIL/i))
    await waitFor(() => {
      expect(screen.getByText(/RESEND IN \d+s/i)).toBeInTheDocument()
    })
  })

  it('shows error banner on failed resend', async () => {
    mockResendVerification.mockResolvedValue({ error: { message: 'Rate limit exceeded' } })
    renderPage()
    fireEvent.click(screen.getByText(/RESEND EMAIL/i))
    await waitFor(() => {
      expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
    })
  })

  // ── Already confirmed ────────────────────────────────────────────────────

  it('redirects to /feed when email is already confirmed', () => {
    mockUser.email_confirmed_at = new Date().toISOString()
    renderPage()
    expect(mockNavigate).toHaveBeenCalledWith('/feed', { replace: true })
  })
})
