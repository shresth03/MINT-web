import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../mocks/supabase.js'
import StoryComposer from '../../components/StoryComposer'

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id', email: 'test@test.com' } })
}))

vi.mock('../../hooks/useStoryComposer', () => ({
  useStoryComposer: () => ({
    publishStory: vi.fn().mockResolvedValue({ post: { id: 'new-post' }, error: null }),
    searchThreads: vi.fn().mockResolvedValue([]),
    getRecentThreads: vi.fn().mockResolvedValue([
      { id: 35, headline: 'Indian vessels spotted', tag: 'MILITARY', region: 'Asia Pacific', confidence: 50 }
    ]),
    generateHeadline: vi.fn().mockResolvedValue('Indian Vessels Advance Toward South China Sea'),
    generateSummary: vi.fn().mockResolvedValue('Indian vessels are reportedly advancing.'),
  })
}))

describe('StoryComposer', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onPublished: vi.fn(),
  }

  it('renders step 1 by default', () => {
    render(<StoryComposer {...defaultProps} />)
    expect(screen.getByText(/WRITE INTEL/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Write your intelligence report/i)).toBeInTheDocument()
  })

  it('NEXT button disabled when body is empty', () => {
    render(<StoryComposer {...defaultProps} />)
    const nextBtn = screen.getByText('NEXT →')
    fireEvent.click(nextBtn)
    // Should still be on step 1
    expect(screen.getByPlaceholderText(/Write your intelligence report/i)).toBeInTheDocument()
  })

  it('advances to step 2 when body has content', async () => {
    render(<StoryComposer {...defaultProps} />)
    const textarea = screen.getByPlaceholderText(/Write your intelligence report/i)
    await userEvent.type(textarea, 'Indian vessels spotted near Thailand')
    fireEvent.click(screen.getByText('NEXT →'))
    await waitFor(() => {
      expect(screen.getByText(/ATTACH TO THREAD/i)).toBeInTheDocument()
    })
  })

  it('shows recent threads in step 2', async () => {
    render(<StoryComposer {...defaultProps} />)
    await userEvent.type(
      screen.getByPlaceholderText(/Write your intelligence report/i),
      'Test post'
    )
    fireEvent.click(screen.getByText('NEXT →'))
    await waitFor(() => {
      expect(screen.getByText('Indian vessels spotted')).toBeInTheDocument()
    })
  })

  it('advances to step 3 and shows AI labels', async () => {
    render(<StoryComposer {...defaultProps} />)
    await userEvent.type(
      screen.getByPlaceholderText(/Write your intelligence report/i),
      'Indian vessels spotted near Thailand'
    )
    fireEvent.click(screen.getByText('NEXT →'))
    await waitFor(() => screen.getByText(/ATTACH TO THREAD/i))
    fireEvent.click(screen.getByText('PREVIEW →'))
    await waitFor(() => {
      expect(screen.getByText(/AI HEADLINE/i)).toBeInTheDocument()
      expect(screen.getByText(/AI DRAFT/i)).toBeInTheDocument()
    })
  })

  it('calls onClose when cancel is clicked', () => {
    render(<StoryComposer {...defaultProps} />)
    fireEvent.click(screen.getByText('CANCEL'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('calls publishStory and onPublished on publish', async () => {
    render(<StoryComposer {...defaultProps} />)
    await userEvent.type(
      screen.getByPlaceholderText(/Write your intelligence report/i),
      'Test post body'
    )
    fireEvent.click(screen.getByText('NEXT →'))
    await waitFor(() => screen.getByText(/ATTACH TO THREAD/i))
    fireEvent.click(screen.getByText('PREVIEW →'))
    await waitFor(() => screen.getByText(/PUBLISH STORY/i))
    fireEvent.click(screen.getByText(/PUBLISH STORY/i))
    await waitFor(() => {
      expect(defaultProps.onPublished).toHaveBeenCalled()
    })
  })
})