import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MobileBottomNav from '../../components/layout/MobileBottomNav'

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

const renderNav = (path = '/feed') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <MobileBottomNav />
    </MemoryRouter>
  )

describe('MobileBottomNav', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Renders all items ────────────────────────────────────────────────────

  it('renders Feed nav item', () => {
    renderNav()
    expect(screen.getByText('Feed')).toBeInTheDocument()
  })

  it('renders Search nav item', () => {
    renderNav()
    expect(screen.getByText('Search')).toBeInTheDocument()
  })

  it('renders Messages nav item', () => {
    renderNav()
    expect(screen.getByText('Messages')).toBeInTheDocument()
  })

  it('renders Profile nav item', () => {
    renderNav()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('renders Settings nav item', () => {
    renderNav()
    expect(screen.getByText('Settings')).toBeInTheDocument()
  })

  // ── Navigation ───────────────────────────────────────────────────────────

  it('navigates to /feed on Feed click', () => {
    renderNav()
    fireEvent.click(screen.getByText('Feed'))
    expect(mockNavigate).toHaveBeenCalledWith('/feed')
  })

  it('navigates to /search on Search click', () => {
    renderNav()
    fireEvent.click(screen.getByText('Search'))
    expect(mockNavigate).toHaveBeenCalledWith('/search')
  })

  it('navigates to /messages on Messages click', () => {
    renderNav()
    fireEvent.click(screen.getByText('Messages'))
    expect(mockNavigate).toHaveBeenCalledWith('/messages')
  })

  it('navigates to /profile on Profile click', () => {
    renderNav()
    fireEvent.click(screen.getByText('Profile'))
    expect(mockNavigate).toHaveBeenCalledWith('/profile')
  })

  it('navigates to /settings on Settings click', () => {
    renderNav()
    fireEvent.click(screen.getByText('Settings'))
    expect(mockNavigate).toHaveBeenCalledWith('/settings')
  })

  // ── Active state ─────────────────────────────────────────────────────────

  it('Feed button has active class when path is /feed', () => {
    renderNav('/feed')
    const feedBtn = screen.getByText('Feed').closest('button')
    expect(feedBtn.className).toContain('active')
  })

  it('Search button has active class when path is /search', () => {
    renderNav('/search')
    const searchBtn = screen.getByText('Search').closest('button')
    expect(searchBtn.className).toContain('active')
  })

  it('Search button has active class for sub-path /search/results', () => {
    renderNav('/search/results')
    const searchBtn = screen.getByText('Search').closest('button')
    expect(searchBtn.className).toContain('active')
  })

  it('Feed button is NOT active when path is /search', () => {
    renderNav('/search')
    const feedBtn = screen.getByText('Feed').closest('button')
    expect(feedBtn.className).not.toContain('active')
  })
})
