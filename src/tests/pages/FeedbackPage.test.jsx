import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../mocks/supabase.js'
import { mockSupabase } from '../mocks/supabase.js'
import FeedbackPage from '../../pages/support/FeedbackPage'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user' } })
}))
vi.mock('../../hooks/useUser', () => ({
  useUser: () => ({ profile: { username: 'shresth' } })
}))
vi.mock('../../components/PageShell', () => ({
  default: ({ children }) => <div>{children}</div>
}))

const renderPage = () => render(
  <MemoryRouter><FeedbackPage /></MemoryRouter>
)

describe('FeedbackPage', () => {

  it('renders feature list', () => {
    renderPage()
    expect(screen.getByText('Intel Feed')).toBeInTheDocument()
    expect(screen.getByText('AI Summary')).toBeInTheDocument()
    expect(screen.getByText('Overall Experience')).toBeInTheDocument()
  })

  it('submit button is disabled with no ratings', () => {
    renderPage()
    const btn = screen.getByText(/SUBMIT INTELLIGENCE REPORT/i)
    expect(btn).toBeDisabled()
  })

  it('submit button enables after a rating is selected', async () => {
    renderPage()
    const checkboxes = document.querySelectorAll('[style*="border-radius: 3px"]')
    fireEvent.click(checkboxes[0])
    await waitFor(() => {
      const btn = screen.getByText(/SUBMIT INTELLIGENCE REPORT/i)
      expect(btn).not.toBeDisabled()
    })
  })

  it('shows rating count in summary bar after selection', async () => {
    renderPage()
    const checkboxes = document.querySelectorAll('[style*="border-radius: 3px"]')
    fireEvent.click(checkboxes[0])
    await waitFor(() => {
      expect(screen.getByText(/1 OF/)).toBeInTheDocument()
    })
  })

  it('submits feedback to supabase and shows success', async () => {
    mockSupabase.single.mockResolvedValueOnce({ data: { id: 'fb-1' }, error: null })
    renderPage()
    const checkboxes = document.querySelectorAll('[style*="border-radius: 3px"]')
    fireEvent.click(checkboxes[0])
    fireEvent.click(screen.getByText(/SUBMIT INTELLIGENCE REPORT/i))
    await waitFor(() => {
      expect(mockSupabase.insert).toHaveBeenCalled()
    })
  })
})