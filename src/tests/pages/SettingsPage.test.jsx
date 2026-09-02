import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SettingsPage from '../../pages/account/SettingsPage'

const mockNavigate    = vi.fn()
const mockSignOut     = vi.fn()
const mockResetPw     = vi.fn()
const mockUpdateProf  = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../hooks/core/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'alice@test.com' },
    signOut: mockSignOut,
    resetPassword: mockResetPw,
  }),
}))

// Stable reference so useEffect([profile]) doesn't re-run on every render
const MOCK_PROFILE = { username: 'alice', role: 'osint', score: 88 }
vi.mock('../../hooks/account/useUser', () => ({
  useUser: () => ({
    profile: MOCK_PROFILE,
    updateProfile: mockUpdateProf,
    loading: false,
  }),
}))

const renderPage = () => render(<MemoryRouter><SettingsPage /></MemoryRouter>)

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateProf.mockResolvedValue({ error: null })
    mockResetPw.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({})
    localStorage.clear()
  })

  // ── Layout ───────────────────────────────────────────────────────────────

  it('renders the SETTINGS page title in the shell', () => {
    renderPage()
    expect(screen.getByText('SETTINGS')).toBeInTheDocument()
  })

  it('renders all section headings', () => {
    renderPage()
    // Use exact string to avoid matching "DELETE ACCOUNT" with /Account/i
    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
    expect(screen.getByText('Appearance')).toBeInTheDocument()
    expect(screen.getByText('Notifications')).toBeInTheDocument()
    expect(screen.getByText('Danger Zone')).toBeInTheDocument()
  })

  // ── Account card ─────────────────────────────────────────────────────────

  it('pre-fills username input from profile', () => {
    renderPage()
    expect(screen.getByPlaceholderText('your username').value).toBe('alice')
  })

  it('shows read-only email field', () => {
    renderPage()
    const emailInput = screen.getByDisplayValue('alice@test.com')
    expect(emailInput).toBeDisabled()
  })

  it('shows role badge for osint user', () => {
    renderPage()
    expect(screen.getByText(/VERIFIED OSINT/i)).toBeInTheDocument()
  })

  it('calls updateProfile with new username on Save', async () => {
    const user = userEvent.setup()
    renderPage()
    const input = screen.getByPlaceholderText('your username')
    await user.clear(input)
    await user.type(input, 'alice_v2')
    await user.click(screen.getByText('SAVE CHANGES'))
    await waitFor(() => {
      expect(mockUpdateProf).toHaveBeenCalledWith({ username: 'alice_v2' })
    })
  })

  it('shows Saved! confirmation after successful save', async () => {
    renderPage()
    fireEvent.click(screen.getByText('SAVE CHANGES'))
    await waitFor(() => {
      expect(screen.getByText(/Saved!/i)).toBeInTheDocument()
    })
  })

  // ── Security card ─────────────────────────────────────────────────────────

  it('renders the SEND RESET LINK button', () => {
    renderPage()
    expect(screen.getByText('SEND RESET LINK')).toBeInTheDocument()
  })

  it('calls resetPassword with user email when reset link clicked', async () => {
    renderPage()
    fireEvent.click(screen.getByText('SEND RESET LINK'))
    await waitFor(() => {
      expect(mockResetPw).toHaveBeenCalledWith('alice@test.com')
    })
  })

  it('shows success message after reset link sent', async () => {
    renderPage()
    fireEvent.click(screen.getByText('SEND RESET LINK'))
    await waitFor(() => {
      expect(screen.getByText(/Reset link sent to your inbox/i)).toBeInTheDocument()
    })
  })

  it('shows error message when reset link fails', async () => {
    mockResetPw.mockResolvedValue({ error: { message: 'User not found' } })
    renderPage()
    fireEvent.click(screen.getByText('SEND RESET LINK'))
    await waitFor(() => {
      expect(screen.getByText('User not found')).toBeInTheDocument()
    })
  })

  // ── Notifications card ────────────────────────────────────────────────────

  it('renders all three notification rows', () => {
    renderPage()
    expect(screen.getByText('Mentions')).toBeInTheDocument()
    expect(screen.getByText('Follows')).toBeInTheDocument()
    expect(screen.getByText('Breaking events')).toBeInTheDocument()
  })

  it('toggles are enabled by default (ToggleRight icon)', () => {
    renderPage()
    // Each enabled toggle renders with title="Click to disable"; there should be 3
    const enabled = screen.getAllByTitle('Click to disable')
    expect(enabled.length).toBeGreaterThanOrEqual(3)
  })

  it('clicking a toggle flips it to disabled (○)', () => {
    renderPage()
    // All 3 toggles start enabled; target the first one (Mentions)
    fireEvent.click(screen.getAllByTitle('Click to disable')[0])
    expect(screen.getAllByTitle('Click to enable').length).toBeGreaterThan(0)
  })

  it('saves notification prefs to localStorage on toggle', () => {
    renderPage()
    const firstToggle = screen.getAllByTitle('Click to disable')[0]
    fireEvent.click(firstToggle)
    const stored = JSON.parse(localStorage.getItem('mint_notif_prefs'))
    expect(stored).toBeTruthy()
    // One of the prefs should now be false
    const values = Object.values(stored)
    expect(values).toContain(false)
  })

  it('loads saved notification prefs from localStorage on mount', () => {
    localStorage.setItem('mint_notif_prefs', JSON.stringify({
      mentions: false, follows: true, breaking: true,
    }))
    renderPage()
    // One toggle should be disabled (○), two enabled (●)
    expect(screen.getAllByTitle('Click to enable').length).toBe(1)
    expect(screen.getAllByTitle('Click to disable').length).toBe(2)
  })

  // ── Danger zone ───────────────────────────────────────────────────────────

  it('renders SIGN OUT and DELETE ACCOUNT buttons', () => {
    renderPage()
    expect(screen.getByText('SIGN OUT')).toBeInTheDocument()
    expect(screen.getByText('DELETE ACCOUNT')).toBeInTheDocument()
  })

  it('sign out calls signOut and navigates to /login', async () => {
    renderPage()
    fireEvent.click(screen.getByText('SIGN OUT'))
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('clicking DELETE ACCOUNT reveals confirmation panel', () => {
    renderPage()
    fireEvent.click(screen.getByText('DELETE ACCOUNT'))
    expect(screen.getByText(/This will permanently delete your account/i)).toBeInTheDocument()
  })

  it('CANCEL in confirmation panel hides it again', () => {
    renderPage()
    fireEvent.click(screen.getByText('DELETE ACCOUNT'))
    fireEvent.click(screen.getByText('CANCEL'))
    expect(screen.queryByText(/This will permanently delete your account/i))
      .not.toBeInTheDocument()
  })

  it('final delete button is disabled (requires server-side action)', () => {
    renderPage()
    fireEvent.click(screen.getByText('DELETE ACCOUNT'))
    const confirmBtn = screen.getByText(/YES, DELETE MY ACCOUNT/i)
    expect(confirmBtn).toBeDisabled()
  })
})
