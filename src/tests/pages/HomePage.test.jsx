import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import HomePage from '../../pages/HomePage'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

// Unauthenticated by default; overridden per-test when needed
const mockUseAuth = vi.fn(() => ({ user: null }))
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

const renderPage = () => render(<MemoryRouter><HomePage /></MemoryRouter>)

// Helper — footer has an anchor "SIGN IN"; scope to <button> elements only
const getSignInBtn  = () => screen.getAllByRole('button', { name: /^SIGN IN$/ })
const getCrAcctBtn  = () => screen.getAllByRole('button', { name: /^CREATE ACCOUNT$/ })

describe('HomePage — unauthenticated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: null })
  })

  it('renders MINT branding', () => {
    renderPage()
    expect(screen.getByRole('img', { name: 'MINT' })).toBeInTheDocument()
  })

  it('renders the hero headline', () => {
    renderPage()
    expect(screen.getByText(/INTELLIGENCE THAT/i)).toBeInTheDocument()
    expect(screen.getByText(/MOVES FASTER/i)).toBeInTheDocument()
    expect(screen.getByText(/THAN THE NEWS/i)).toBeInTheDocument()
  })

  it('renders the subtitle', () => {
    renderPage()
    expect(screen.getByText(/Verified OSINT. Real-time analysis/i)).toBeInTheDocument()
  })

  it('shows SIGN IN and CREATE ACCOUNT buttons when not logged in', () => {
    renderPage()
    expect(getSignInBtn().length).toBeGreaterThan(0)
    expect(getCrAcctBtn().length).toBeGreaterThan(0)
  })

  it('does NOT show ENTER FEED when not logged in', () => {
    renderPage()
    expect(screen.queryByRole('button', { name: /ENTER FEED/i })).not.toBeInTheDocument()
  })

  it('SIGN IN button navigates to /login', () => {
    renderPage()
    fireEvent.click(getSignInBtn()[0])
    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('CREATE ACCOUNT button navigates to /register', () => {
    renderPage()
    fireEvent.click(getCrAcctBtn()[0])
    expect(mockNavigate).toHaveBeenCalledWith('/register')
  })

  it('renders all 6 feature card titles', () => {
    renderPage()
    expect(screen.getByText('Intel Stories')).toBeInTheDocument()
    expect(screen.getByText('Global Event Map')).toBeInTheDocument()
    expect(screen.getByText('Verified Channels')).toBeInTheDocument()
    expect(screen.getByText('Live Broadcasts')).toBeInTheDocument()
    expect(screen.getByText('Community Notes')).toBeInTheDocument()
    expect(screen.getByText('Trending & Reels')).toBeInTheDocument()
  })

  it('renders how-it-works step numbers', () => {
    renderPage()
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByText('02')).toBeInTheDocument()
    expect(screen.getByText('03')).toBeInTheDocument()
  })

  it('renders how-it-works step titles', () => {
    renderPage()
    expect(screen.getByText(/Create or follow a verified channel/i)).toBeInTheDocument()
    expect(screen.getByText(/Monitor breaking intel stories/i)).toBeInTheDocument()
    expect(screen.getByText(/Add community notes/i)).toBeInTheDocument()
  })

  it('renders the stats strip', () => {
    renderPage()
    expect(screen.getByText(/247 intel stories/i)).toBeInTheDocument()
    expect(screen.getByText(/89 verified analysts/i)).toBeInTheDocument()
  })

  it('logo click navigates to /', () => {
    renderPage()
    const logo = screen.getByRole('img', { name: 'MINT' }).closest('div')
    fireEvent.click(logo)
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})

describe('HomePage — authenticated', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: 'user-1', email: 'alice@test.com' } })
  })

  it('shows ENTER FEED button when logged in', () => {
    renderPage()
    expect(screen.getByRole('button', { name: /ENTER FEED/i })).toBeInTheDocument()
  })

  it('does NOT show SIGN IN or CREATE ACCOUNT buttons when logged in', () => {
    renderPage()
    expect(screen.queryAllByRole('button', { name: /^SIGN IN$/ })).toHaveLength(0)
    expect(screen.queryAllByRole('button', { name: /^CREATE ACCOUNT$/ })).toHaveLength(0)
  })

  it('ENTER FEED navigates to /feed', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: /ENTER FEED/i }))
    expect(mockNavigate).toHaveBeenCalledWith('/feed')
  })
})
