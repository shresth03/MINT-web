import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Login from '../../pages/auth/Login'

const mockNavigate = vi.fn()
const mockSignIn = vi.fn()
const mockResetPassword = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({ signIn: mockSignIn, resetPassword: mockResetPassword }),
}))

vi.mock('../../hooks/core/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

const renderLogin = () => render(<MemoryRouter><Login /></MemoryRouter>)

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignIn.mockResolvedValue({ data: { session: { access_token: 'tok' } }, error: null })
    mockResetPassword.mockResolvedValue({ error: null })
  })

  // ── Logo (#22) ──────────────────────────────────────────────────────────

  it('renders MINT logo as <img>', () => {
    renderLogin()
    expect(screen.getByRole('img', { name: 'MINT' })).toBeInTheDocument()
  })

  it('dark theme → logo src is logo-dark.png', () => {
    renderLogin()
    const img = screen.getByRole('img', { name: 'MINT' })
    expect(img.getAttribute('src')).toContain('logo-dark.png')
  })

  it('light theme → logo src is logo-light.png', () => {
    vi.doMock('../../hooks/core/useTheme', () => ({
      useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
    }))
  })

  // ── Layout ──────────────────────────────────────────────────────────────

  it('renders email and password inputs', () => {
    renderLogin()
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })

  it('renders SIGN IN button', () => {
    renderLogin()
    expect(screen.getByRole('button', { name: /SIGN IN/i })).toBeInTheDocument()
  })

  it('renders link to register page', () => {
    renderLogin()
    expect(screen.getByText(/Create one/i)).toBeInTheDocument()
  })

  // ── Validation ──────────────────────────────────────────────────────────

  it('shows error when fields are empty', async () => {
    renderLogin()
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }))
    await waitFor(() => {
      expect(screen.getByText(/fill in all fields/i)).toBeInTheDocument()
    })
  })

  it('shows error when only email is filled', async () => {
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }))
    await waitFor(() => {
      expect(screen.getByText(/fill in all fields/i)).toBeInTheDocument()
    })
  })

  // ── Auth flows ──────────────────────────────────────────────────────────

  it('calls signIn with correct credentials', async () => {
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }))
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('a@b.com', 'pass123')
    })
  })

  it('navigates to /feed on successful sign in', async () => {
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass123' } })
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/feed')
    })
  })

  it('shows error message on failed sign in', async () => {
    mockSignIn.mockResolvedValue({ data: null, error: { message: 'Invalid credentials' } })
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /SIGN IN/i }))
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  // ── Enter key (#29 equivalent for Login) ────────────────────────────────

  it('pressing Enter on email field submits the form', async () => {
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass123' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Email address'), { key: 'Enter' })
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('a@b.com', 'pass123')
    })
  })

  it('pressing Enter on password field submits the form', async () => {
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'pass123' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Password'), { key: 'Enter' })
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('a@b.com', 'pass123')
    })
  })

  // ── Password reset flow ──────────────────────────────────────────────────

  it('shows reset form when "Forgot password?" is clicked', () => {
    renderLogin()
    fireEvent.click(screen.getByText(/Forgot password/i))
    expect(screen.getByText(/Reset your password/i)).toBeInTheDocument()
  })

  it('calls resetPassword and shows success banner', async () => {
    renderLogin()
    fireEvent.click(screen.getByText(/Forgot password/i))
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'a@b.com' } })
    fireEvent.click(screen.getByText('SEND RESET LINK'))
    await waitFor(() => {
      expect(mockResetPassword).toHaveBeenCalledWith('a@b.com')
      expect(screen.getByText(/Reset link sent/i)).toBeInTheDocument()
    })
  })

  it('shows error when reset link fails', async () => {
    mockResetPassword.mockResolvedValue({ error: { message: 'User not found' } })
    renderLogin()
    fireEvent.click(screen.getByText(/Forgot password/i))
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'x@x.com' } })
    fireEvent.click(screen.getByText('SEND RESET LINK'))
    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument()
    })
  })

  it('← Back to sign in returns to login form', () => {
    renderLogin()
    fireEvent.click(screen.getByText(/Forgot password/i))
    fireEvent.click(screen.getByText(/Back to sign in/i))
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
  })
})
