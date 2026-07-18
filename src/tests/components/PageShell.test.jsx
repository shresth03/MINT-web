import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PageShell from '../../components/PageShell'

const mockNavigate = vi.fn()
const mockToggleTheme = vi.fn()

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../hooks/useTheme', () => ({
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
    expect(screen.getByText(/← BACK/i)).toBeInTheDocument()
  })

  it('hides BACK button when showBack=false', () => {
    renderShell({ showBack: false })
    expect(screen.queryByText(/← BACK/i)).not.toBeInTheDocument()
  })

  it('calls navigate(-1) when BACK is clicked', () => {
    renderShell()
    fireEvent.click(screen.getByText(/← BACK/i))
    expect(mockNavigate).toHaveBeenCalledWith(-1)
  })

  // ── Theme toggle ─────────────────────────────────────────────────────────

  it('renders theme toggle button', () => {
    renderShell()
    expect(screen.getByText(/GHOST|VOID/i)).toBeInTheDocument()
  })

  it('shows ☀ GHOST label in dark theme', () => {
    renderShell()
    expect(screen.getByText('☀ GHOST')).toBeInTheDocument()
  })

  it('calls toggleTheme when theme button is clicked', () => {
    renderShell()
    fireEvent.click(screen.getByText('☀ GHOST'))
    expect(mockToggleTheme).toHaveBeenCalled()
  })
})
