import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Register from '../../pages/Register'

const mockSignUp = vi.fn()
const mockNavigate = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ signUp: mockSignUp }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

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

  it('shows success message on successful registration', async () => {
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { value: 'alice' } })
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'alice@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/Password/i), { target: { value: 'password123' } })
    fireEvent.click(screen.getByText('CREATE ACCOUNT'))
    await waitFor(() => {
      expect(screen.getByText(/Account created/i)).toBeInTheDocument()
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
})
