import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Register from '../../pages/auth/Register'

const mockSignUp = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

const renderRegister = () =>
  render(<MemoryRouter><Register /></MemoryRouter>)

describe('Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignUp.mockResolvedValue({ data: {}, error: null })
  })

  it('renders account type selector with Public and Reporter options', () => {
    renderRegister()
    expect(screen.getByText(/PUBLIC/i)).toBeInTheDocument()
    expect(screen.getByText(/REPORTER/i)).toBeInTheDocument()
  })

  it('defaults to public account type — public button has active background', () => {
    renderRegister()
    const publicBtn = screen.getByText(/PUBLIC/i).closest('button')
    // Active state sets a non-transparent rgba background
    expect(publicBtn.style.background).not.toBe('transparent')
    expect(publicBtn.style.background).not.toBe('')
  })

  it('switches to reporter when clicked — reporter button gets active background', () => {
    renderRegister()
    const reporterBtn = screen.getByText(/REPORTER/i).closest('button')
    fireEvent.click(reporterBtn)
    expect(reporterBtn.style.background).not.toBe('transparent')
    expect(reporterBtn.style.background).not.toBe('')
  })

  it('shows validation error when fields are empty', async () => {
    renderRegister()
    fireEvent.click(screen.getByText('CREATE ACCOUNT'))
    await waitFor(() => {
      expect(screen.getByText(/fill in all fields/i)).toBeInTheDocument()
    })
  })

  it('shows error when password too short', async () => {
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'alice@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: '123' } })
    fireEvent.click(screen.getByText('CREATE ACCOUNT'))
    await waitFor(() => {
      expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument()
    })
  })

  it('calls signUp with public role by default', async () => {
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'alice@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('CREATE ACCOUNT'))
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('alice@test.com', 'password123', 'alice', 'public')
    })
  })

  it('calls signUp with reporter role when reporter is selected', async () => {
    renderRegister()
    fireEvent.click(screen.getByText(/REPORTER/i).closest('button'))
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'bob' } })
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'bob@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('CREATE ACCOUNT'))
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('bob@test.com', 'password123', 'bob', 'reporter')
    })
  })

  it('navigates to /feed when email confirmation is not required', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: null, needsEmailConfirmation: false })
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'alice@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('CREATE ACCOUNT'))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/feed')
    })
  })

  it('navigates to /verify-email when email confirmation is required', async () => {
    mockSignUp.mockResolvedValue({ data: {}, error: null, needsEmailConfirmation: true })
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'alice@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('CREATE ACCOUNT'))
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/verify-email?email=alice%40test.com')
    })
  })

  it('shows API error message on failure', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'Email already in use' } })
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'alice@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('CREATE ACCOUNT'))
    await waitFor(() => {
      expect(screen.getByText('Email already in use')).toBeInTheDocument()
    })
  })

  // ── Logo (#23) ──────────────────────────────────────────────────────────

  it('renders MINT logo as <img>', () => {
    renderRegister()
    expect(screen.getByRole('img', { name: 'MINT' })).toBeInTheDocument()
  })

  it('dark theme → logo src is logo-dark.png', () => {
    renderRegister()
    expect(screen.getByRole('img', { name: 'MINT' }).getAttribute('src')).toContain('logo-dark.png')
  })

  // ── Account type selector CSS var (#21) ─────────────────────────────────

  it('active account type button background uses CSS variable, not hardcoded hex', () => {
    renderRegister()
    const publicBtn = screen.getByText(/PUBLIC/i).closest('button')
    // CSS variable value should be var(--active-bg), not a raw rgba/hex
    expect(publicBtn.style.background).toBe('var(--active-bg)')
  })

  it('inactive account type button has transparent background', () => {
    renderRegister()
    const reporterBtn = screen.getByText(/REPORTER/i).closest('button')
    expect(reporterBtn.style.background).toBe('transparent')
  })

  // ── Enter key on all fields (#29) ────────────────────────────────────────

  it('pressing Enter on username field submits the form', async () => {
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'alice@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Username'), { key: 'Enter' })
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('alice@test.com', 'password123', 'alice', 'public')
    })
  })

  it('pressing Enter on email field submits the form', async () => {
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'alice@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } })
    fireEvent.keyDown(screen.getByPlaceholderText('Email address'), { key: 'Enter' })
    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith('alice@test.com', 'password123', 'alice', 'public')
    })
  })

  // ── Users table insert error propagation (#28) ───────────────────────────

  it('shows error when username is already taken (users table insert error)', async () => {
    mockSignUp.mockResolvedValue({ error: { message: 'Username already taken' } })
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'taken_name' } })
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'new@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('CREATE ACCOUNT'))
    await waitFor(() => {
      expect(screen.getByText('Username already taken')).toBeInTheDocument()
    })
  })
})
