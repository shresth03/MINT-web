import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TimeStamp from '../../components/TimeStamp'

describe('TimeStamp', () => {
  it('renders a <time> with a machine-readable date and a full-date hover', () => {
    const iso = new Date(Date.now() - 12 * 60 * 1000).toISOString()
    render(<TimeStamp value={iso} />)
    const el = screen.getByText('12m ago')
    expect(el.tagName).toBe('TIME')
    expect(el).toHaveAttribute('datetime', iso)
    expect(el.getAttribute('title')).toMatch(/UTC\)$/)
  })

  it('has a compact form', () => {
    render(<TimeStamp value={new Date(Date.now() - 12 * 60 * 1000)} compact />)
    expect(screen.getByText('12m')).toBeInTheDocument()
  })

  it('has a date-only form that includes the year', () => {
    render(<TimeStamp value={new Date(2025, 7, 20)} dateOnly />)
    expect(screen.getByText(/2025/)).toBeInTheDocument()
  })

  it('renders nothing for a missing or bad value (never "undefined")', () => {
    const { container } = render(<><TimeStamp value={undefined} /><TimeStamp value="nope" /></>)
    expect(container.textContent).toBe('')
  })
})
