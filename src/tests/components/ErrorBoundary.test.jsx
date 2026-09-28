import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorBoundary from '../../components/ErrorBoundary'

function Boom() {
  throw new Error('Cannot read properties of undefined')
}

describe('ErrorBoundary', () => {
  const originalLocation = window.location

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})  // React logs caught errors
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '/somewhere', reload: vi.fn() },
    })
  })
  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    vi.restoreAllMocks()
  })

  it('renders children when nothing breaks', () => {
    render(<ErrorBoundary><p>All good</p></ErrorBoundary>)
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('shows the error screen with the technical message', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText('SYSTEM ERROR')).toBeInTheDocument()
    expect(screen.getByText('Cannot read properties of undefined')).toBeInTheDocument()
  })

  it('"Try again" reloads the page', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(window.location.reload).toHaveBeenCalled()
  })

  it('"Back to feed" goes to /feed (not the landing page)', () => {
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    fireEvent.click(screen.getByRole('button', { name: /back to feed/i }))
    expect(window.location.href).toBe('/feed')
  })
})
