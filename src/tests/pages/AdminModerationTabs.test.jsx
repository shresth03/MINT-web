import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NewsReviewTab from '../../pages/admin/NewsReviewTab'
import BlocklistTab from '../../pages/admin/BlocklistTab'
import RemovedPostsTab from '../../pages/admin/RemovedPostsTab'

const now = new Date().toISOString()

describe('NewsReviewTab', () => {
  const posts = [{ post_id: 7, author_username: 'ana', author_role: 'public', body: 'Breaking: bridge closed', created_at: now }]

  it('approves without a reason', async () => {
    const onReview = vi.fn().mockResolvedValue({ error: null })
    render(<NewsReviewTab posts={posts} loading={false} onReview={onReview} />)
    fireEvent.click(screen.getByRole('button', { name: /approve/i }))
    await waitFor(() => expect(onReview).toHaveBeenCalledWith(7, true, null))
  })

  it('asks for a reason before rejecting', async () => {
    const onReview = vi.fn().mockResolvedValue({ error: null })
    render(<NewsReviewTab posts={posts} loading={false} onReview={onReview} />)
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))
    expect(await screen.findByText(/Add a reason before rejecting/)).toBeInTheDocument()
    expect(onReview).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Rejection reason'), { target: { value: 'Unverified' } })
    fireEvent.click(screen.getByRole('button', { name: /reject/i }))
    await waitFor(() => expect(onReview).toHaveBeenCalledWith(7, false, 'Unverified'))
  })

  it('shows an empty state', () => {
    render(<NewsReviewTab posts={[]} loading={false} onReview={vi.fn()} />)
    expect(screen.getByText('No posts awaiting review')).toBeInTheDocument()
  })
})

describe('BlocklistTab', () => {
  const terms = [{ id: 1, term: 'badword', reason: 'No slurs.', created_by_username: 'elsa', created_at: now }]

  it('adds a term with its reason and clears the form', async () => {
    const onAdd = vi.fn().mockResolvedValue({ error: null })
    render(<BlocklistTab terms={terms} loading={false} onAdd={onAdd} onRemove={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Blocked word or phrase'), { target: { value: '  bad thing ' } })
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Abusive' } })
    fireEvent.click(screen.getByRole('button', { name: 'BLOCK' }))
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith('bad thing', 'Abusive'))
    await waitFor(() => expect(screen.getByLabelText('Blocked word or phrase')).toHaveValue(''))
  })

  it('explains a duplicate', async () => {
    const onAdd = vi.fn().mockResolvedValue({ error: { message: 'term_already_blocked' } })
    render(<BlocklistTab terms={terms} loading={false} onAdd={onAdd} onRemove={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Blocked word or phrase'), { target: { value: 'B@dword' } })
    fireEvent.click(screen.getByRole('button', { name: 'BLOCK' }))
    expect(await screen.findByText(/already blocked/)).toBeInTheDocument()
  })

  it('unblocks a term', async () => {
    const onRemove = vi.fn().mockResolvedValue({ error: null })
    render(<BlocklistTab terms={terms} loading={false} onAdd={vi.fn()} onRemove={onRemove} />)
    expect(screen.getByText('badword')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Unblock badword' }))
    await waitFor(() => expect(onRemove).toHaveBeenCalledWith(1))
  })
})

describe('RemovedPostsTab', () => {
  const posts = [
    { post_id: 3, author_username: 'ana', body: 'Rejected one', post_type: 'news', created_at: now,
      removed_at: now, removed_by_username: 'elsa', reason: 'Unverified claim', source: 'review' },
    { post_id: 4, author_username: 'bo', body: 'Old removal', post_type: 'general', created_at: now,
      removed_at: null, removed_by_username: null, reason: null, source: 'moderator' },
  ]

  it('shows who removed each post, why and where from', () => {
    render(<RemovedPostsTab posts={posts} loading={false} source={null} onSource={vi.fn()} onRestore={vi.fn()} />)
    expect(screen.getByText('Unverified claim')).toBeInTheDocument()
    expect(screen.getByText('elsa')).toBeInTheDocument()
    expect(screen.getByText('REVIEW')).toBeInTheDocument()
    expect(screen.getByText('MODERATOR')).toBeInTheDocument()
    expect(screen.getAllByText('Not recorded')).toHaveLength(2)
  })

  it('filters by source', () => {
    const onSource = vi.fn()
    render(<RemovedPostsTab posts={posts} loading={false} source={null} onSource={onSource} onRestore={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Removed after reports' }))
    expect(onSource).toHaveBeenCalledWith('reports')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('restores with an optional reason', async () => {
    const onRestore = vi.fn().mockResolvedValue({ error: null })
    render(<RemovedPostsTab posts={posts.slice(0, 1)} loading={false} source={null} onSource={vi.fn()} onRestore={onRestore} />)
    fireEvent.change(screen.getByLabelText('Restore reason'), { target: { value: 'Verified' } })
    fireEvent.click(screen.getByRole('button', { name: /restore/i }))
    await waitFor(() => expect(onRestore).toHaveBeenCalledWith(3, 'Verified'))
  })
})
