import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import Sidebar from '../../components/layout/Sidebar'

const mockNavigate = vi.fn()
const mockSignOut = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/feed' }),
  }
})

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'alice@test.com' },
    signOut: mockSignOut,
  }),
}))

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

const renderSidebar = (props = {}) =>
  render(<MemoryRouter><Sidebar {...props} /></MemoryRouter>)

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue({})
    mockSupabase.from.mockReturnThis()
    mockSupabase.select.mockReturnThis()
    mockSupabase.eq.mockReturnThis()
    mockSupabase.single.mockResolvedValue({
      data: { role: 'public', username: 'alice' }, error: null,
    })
  })

  // ── Logo (#24) ──────────────────────────────────────────────────────────

  it('renders MINT logo as <img> (not old hex polygon)', () => {
    renderSidebar()
    expect(screen.getByRole('img', { name: 'MINT' })).toBeInTheDocument()
  })

  it('dark theme → logo src is /logo-dark.png', () => {
    renderSidebar()
    const img = screen.getByRole('img', { name: 'MINT' })
    expect(img.getAttribute('src')).toContain('logo-dark.png')
  })

  it('does NOT render the old "MINT" text node next to a polygon', () => {
    renderSidebar()
    // Old logo rendered <div class="logo-text">MINT</div> separately from the icon
    // The new img contains alt="MINT" — there should be no bare MINT text div
    const allMint = screen.queryAllByText('MINT')
    // All MINT mentions should be inside the <img> alt (not visible text nodes)
    allMint.forEach(el => {
      expect(el.tagName).not.toBe('DIV')
    })
  })

  // ── Sign-out accessibility (#27) ─────────────────────────────────────────

  it('sign-out element is a <button>, not a <div>', () => {
    renderSidebar()
    const signOutEl = screen.getByText(/SIGN OUT/i)
    expect(signOutEl.closest('button')).not.toBeNull()
    expect(signOutEl.closest('div[onClick]')).toBeNull()
  })

  it('sign-out button has role button (keyboard accessible)', () => {
    renderSidebar()
    expect(screen.getByRole('button', { name: /SIGN OUT/i })).toBeInTheDocument()
  })

  it('clicking sign-out calls signOut and navigates to /login', async () => {
    renderSidebar()
    fireEvent.click(screen.getByRole('button', { name: /SIGN OUT/i }))
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  // ── Navigation items ────────────────────────────────────────────────────

  it('renders primary nav items', () => {
    renderSidebar()
    expect(screen.getByText('Intel Feed')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('My Profile')).toBeInTheDocument()
  })

  it('public user sees Apply for OSINT option', async () => {
    renderSidebar()
    await waitFor(() => {
      expect(screen.getByText(/Apply for OSINT/i)).toBeInTheDocument()
    })
  })

  it('calling setShowApply when Apply is clicked', async () => {
    const mockSetShowApply = vi.fn()
    renderSidebar({ setShowApply: mockSetShowApply })
    await waitFor(() => screen.getByText(/Apply for OSINT/i))
    fireEvent.click(screen.getByText(/Apply for OSINT/i))
    expect(mockSetShowApply).toHaveBeenCalledWith(true)
  })
})
