import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PostPoll from '../../components/feed/PostPoll'
import PostAttachments from '../../components/feed/PostAttachments'

const inHours = h => new Date(Date.now() + h * 3600e3).toISOString()

function makePoll(overrides = {}) {
  return {
    post_id: 1, ends_at: inHours(5), is_closed: false, total_votes: 4, my_option_id: null,
    options: [{ id: 5, position: 0, label: 'Yes', votes: 3 }, { id: 6, position: 1, label: 'No', votes: 1 }],
    ...overrides,
  }
}

describe('PostPoll', () => {
  it('shows vote buttons before the viewer has voted, without counts', () => {
    render(<PostPoll poll={makePoll()} onVote={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument()
    expect(screen.queryByText('75%')).not.toBeInTheDocument()
    expect(screen.getByText(/4 votes · 5h left/)).toBeInTheDocument()
  })

  it('calls onVote with the option id', async () => {
    const onVote = vi.fn().mockResolvedValue({ data: {}, error: null })
    render(<PostPoll poll={makePoll()} onVote={onVote} />)
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    await waitFor(() => expect(onVote).toHaveBeenCalledWith(6))
  })

  it('shows a readable message when the vote is rejected', async () => {
    const onVote = vi.fn().mockResolvedValue({ data: null, error: { message: 'poll_closed' } })
    render(<PostPoll poll={makePoll()} onVote={onVote} />)
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(await screen.findByText(/This poll has closed/)).toBeInTheDocument()
  })

  it('shows results and marks the viewer\'s choice after voting', () => {
    render(<PostPoll poll={makePoll({ my_option_id: 5 })} onVote={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Yes: 75%, your vote')).toBeInTheDocument()
    expect(screen.getByLabelText('No: 25%')).toBeInTheDocument()
  })

  it('shows final results once the poll has ended', () => {
    render(<PostPoll poll={makePoll({ ends_at: inHours(-1), is_closed: true })} onVote={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/Final results/)).toBeInTheDocument()
  })

  it('handles a poll with no votes', () => {
    render(<PostPoll poll={makePoll({ total_votes: 0, is_closed: true, ends_at: inHours(-1),
      options: [{ id: 5, label: 'Yes', votes: 0 }, { id: 6, label: 'No', votes: 0 }] })} onVote={vi.fn()} />)
    expect(screen.getByText(/0 votes/)).toBeInTheDocument()
    expect(screen.getAllByText('0%')).toHaveLength(2)
  })
})

describe('PostAttachments', () => {
  it('renders each kind', () => {
    const { container } = render(<PostAttachments attachments={[
      { id: 1, kind: 'image', url: 'https://x/a.jpg', file_name: 'a.jpg' },
      { id: 2, kind: 'video', url: 'https://x/v.mp4', thumbnail_url: 'https://x/t.jpg' },
      { id: 3, kind: 'audio', url: 'https://x/s.m4a', file_name: 'clip.m4a' },
      { id: 4, kind: 'file', url: 'https://x/r.pdf', file_name: 'report.pdf', size_bytes: 2.5 * 1024 * 1024 },
    ]} />)
    expect(screen.getByAltText('a.jpg')).toHaveAttribute('src', 'https://x/a.jpg')
    expect(container.querySelector('video')).toHaveAttribute('poster', 'https://x/t.jpg')
    expect(container.querySelector('audio')).toHaveAttribute('src', 'https://x/s.m4a')
    expect(screen.getByText('report.pdf').closest('a')).toHaveAttribute('href', 'https://x/r.pdf')
    expect(screen.getByText('2.5 MB')).toBeInTheDocument()
  })
})
