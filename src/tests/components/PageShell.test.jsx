import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PageShell from '../../components/PageShell'

const mockNavigate = vi.fn()
const mockToggleTheme = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../hooks/core/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: mockToggleTheme }),
}))

// MobileBottomNav uses useNavigate/useLocation — keep it real, MemoryRouter covers it
const renderShell = (props = {}) =>
  render(
    <MemoryRouter>
      <PageShell {...props}>
        <div data-testid="child-content">Page content</div>
      </PageShell>
    </MemoryRouter>
  )

describe('PageShell', () => {
  beforeEach(() => vi.clearAllMocks())

  // ── Layout ───────────────────────────────────────────────────────────────

  it('renders children', () => {
    renderShell()
    expect(screen.getByTestId('child-content')).toBeInTheDocument()
  })

  it('renders MINT logo', () => {
    renderShell()
    expect(screen.getByRole('img', { name: 'MINT' })).toBeInTheDocument()
  })

  it('uses dark logo when theme is dark', () => {
    renderShell()
    expect(screen.getByRole('img', { name: 'MINT' }).getAttribute('src')).toContain('logo-dark.png')
  })

  it('renders page title when provided', () => {
    renderShell({ title: 'SETTINGS' })
    expect(screen.getByText('SETTINGS')).toBeInTheDocument()
  })

  it('does not render title when not provided', () => {
    renderShell()
    // default title prop is undefined — no title span
    expect(screen.queryByText('SETTINGS')).not.toBeInTheDocument()
  })

  // ── Back button ──────────────────────────────────────────────────────────

  it('renders BACK button by default', () => {
    renderShell()
    expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument()
  })

  it('hides BACK button when showBack=false', () => {
    renderShell({ showBack: false })
    expect(screen.queryByRole('button', { name: /go back/i })).not.toBeInTheDocument()
  })

  it('calls navigate(-1) when BACK is clicked', async () => {
    renderShell()
    fireEvent.click(screen.getByRole('button', { name: /go back/i }))
    // BackButton plays an exit animation before navigating
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(-1))
  })

  // ── Logo hold-to-switch theme ───────────────────────────────────────────

  it('calls toggleTheme when the logo is held', () => {
    renderShell()
    const logo = screen.getByRole('img', { name: 'MINT' }).parentElement
    fireEvent.mouseDown(logo)
    expect(mockToggleTheme).toHaveBeenCalled()
  })
})
