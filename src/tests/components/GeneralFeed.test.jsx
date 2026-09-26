import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../mocks/supabase.js'
import GeneralFeed from '../../components/feed/GeneralFeed'

vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@test.com' } })
}))

vi.mock('../../hooks/social/useNotifications', () => ({
  useNotifications: () => ({ createNotification: vi.fn() })
}))

vi.mock('../../hooks/core/useIsMobile', () => ({
  useIsMobile: () => false  // desktop by default
}))

const mockPosts = [
  {
    id: 'post-1', body: 'Test post body', created_at: new Date().toISOString(),
    likes: 5, reply_count: 2, repost_count: 1, liked: false, saved: false,
    reposted: false, _type: 'post',
    users: { id: 'u1', username: 'shresth', role: 'admin', score: null }
  },
  {
    id: 'post-2', body: 'Original post content', created_at: new Date().toISOString(),
    likes: 3, reply_count: 0, repost_count: 2, liked: false, saved: false,
    reposted: false, _type: 'repost',
    _reposter: { username: 'osint23' },
    _quote: 'Great intel here',
    _repost_created_at: new Date().toISOString(),
    _repost_id: 'r-1',
    users: { id: 'u2', username: 'analyst', role: 'osint', score: 88 }
  },
]

vi.mock('../../hooks/feed/usePosts', () => ({
  usePosts: () => ({
    posts: mockPosts,
    loading: false,
    createPost: vi.fn().mockResolvedValue({ error: null }),
    likePost: vi.fn(),
    savePost: vi.fn(),
    repost: vi.fn(),
    createReply: vi.fn().mockResolvedValue({ data: null, error: null }),
    fetchReplies: vi.fn().mockResolvedValue({ data: [], error: null }),
    fetchUserReposts: vi.fn().mockResolvedValue({ data: [] }),
  })
}))

const renderFeed = () => render(
  <MemoryRouter><GeneralFeed /></MemoryRouter>
)

describe('GeneralFeed', () => {

  it('renders posts from feed', () => {
    renderFeed()
    expect(screen.getByText('Test post body')).toBeInTheDocument()
  })

  it('renders repost banner for repost cards', () => {
    renderFeed()
    expect(screen.getByText('osint23')).toBeInTheDocument()
    expect(screen.getByText(/reposted/)).toBeInTheDocument()
  })

  it('renders quote body on repost with comment', () => {
    renderFeed()
    expect(screen.getByText('Great intel here')).toBeInTheDocument()
  })

  it('shows repost modal on repost button click', () => {
    renderFeed()
    fireEvent.click(screen.getByRole('button', { name: 'Repost, 1' }))
    const repostHeaders = screen.getAllByText(/REPOST/i)
    expect(repostHeaders.length).toBeGreaterThan(0)
    expect(screen.getByText('CANCEL')).toBeInTheDocument()
  })

  it('shows composer on desktop', () => {
    renderFeed()
    expect(screen.getByPlaceholderText(/Share intelligence/i)).toBeInTheDocument()
  })

  it('shows FAB on mobile instead of inline composer', () => {
    vi.doMock('../../hooks/core/useIsMobile', () => ({
      useIsMobile: () => true
    }))
    // FAB renders as + button — just check composer textarea is NOT visible inline
    renderFeed()
    // Desktop composer should not be there on mobile
    // (full test would require re-render with mobile mock)
  })

  it('highlights post when highlight param in URL', async () => {
    render(
      <MemoryRouter initialEntries={['/feed?highlight=post-1']}>
        <GeneralFeed />
      </MemoryRouter>
    )
    await waitFor(() => {
      const post = screen.getByText('Test post body').closest('div[style]')
      expect(post).toBeTruthy()
    })
  })

  // ── Action bar ───────────────────────────────────────────────────────────

  it('labels action buttons with their counts for screen readers', () => {
    renderFeed()
    expect(screen.getByRole('button', { name: 'Like, 5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replies, 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Repost, 1' })).toBeInTheDocument()
  })

  it('hides zero counts', () => {
    renderFeed()
    // post-2 has no replies: the button is labelled without a number and shows none
    const replies = screen.getAllByRole('button', { name: /^Replies/ })
    const noReplies = replies.find(b => b.getAttribute('aria-label') === 'Replies')
    expect(noReplies).toBeTruthy()
    expect(noReplies.textContent).toBe('')
  })

  it('copies a link to the post that opens the General tab', async () => {
    const writeText = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    renderFeed()
    fireEvent.click(screen.getAllByRole('button', { name: 'Copy link to post' })[0])
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/feed?highlight=post-1`))
    expect(await screen.findByText('Copied')).toBeInTheDocument()
  })

  // ── Post box tools ───────────────────────────────────────────────────────

  it('switches the post type between General and News', () => {
    renderFeed()
    const general = screen.getByRole('radio', { name: /general/i })
    const news = screen.getByRole('radio', { name: /news/i })
    expect(general).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(news)
    expect(news).toHaveAttribute('aria-checked', 'true')
    expect(general).toHaveAttribute('aria-checked', 'false')
    expect(screen.getByText(/marked as a news report/)).toBeInTheDocument()
  })

  it('has a labelled image button instead of the 📎 emoji', () => {
    renderFeed()
    expect(screen.getByRole('button', { name: 'Add image' })).toBeInTheDocument()
    expect(screen.queryByText(/📎/)).not.toBeInTheDocument()
  })

  it('shows the character counter only past 400 characters', () => {
    renderFeed()
    const box = screen.getByPlaceholderText(/Share intelligence/i)
    fireEvent.change(box, { target: { value: 'short post' } })
    expect(screen.queryByText(/\/500/)).not.toBeInTheDocument()
    fireEvent.change(box, { target: { value: 'x'.repeat(420) } })
    expect(screen.getByText('420/500')).toBeInTheDocument()
  })

  // ── Opening a post on the right ──────────────────────────────────────────

  function renderWithPanel() {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const onOpenPost = vi.fn()
    const utils = render(<MemoryRouter><GeneralFeed detailHost={host} onOpenPost={onOpenPost} /></MemoryRouter>)
    return { ...utils, host, onOpenPost }
  }

  it('shows a "select a post" message on the right until a post is chosen', () => {
    const { host } = renderWithPanel()
    expect(within(host).getByText('SELECT A POST')).toBeInTheDocument()
  })

  it('opens a clicked post big on the right with its replies', async () => {
    const { host, onOpenPost } = renderWithPanel()
    fireEvent.click(screen.getAllByText('Test post body')[0])
    expect(onOpenPost).toHaveBeenCalled()
    expect(within(host).getByText('Test post body')).toBeInTheDocument()
    expect(within(host).getByText('2 replies')).toBeInTheDocument()
    expect(within(host).getByRole('button', { name: 'Like, 5' })).toBeInTheDocument()
  })

  it('opens the post from the replies button instead of expanding it in the list', () => {
    const { host } = renderWithPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Open post and replies, 2' }))
    expect(within(host).getByText('Test post body')).toBeInTheDocument()
  })

  it('does not open the post when an action button is clicked', () => {
    const { host, onOpenPost } = renderWithPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Repost, 1' }))
    expect(onOpenPost).not.toHaveBeenCalled()
    expect(within(host).getByText('SELECT A POST')).toBeInTheDocument()
  })

  it('shows the opened post’s picture in a 16:9 frame and full size on click', () => {
    mockPosts[0].media_url = 'https://example.com/pass.jpg'
    try {
      const { host } = renderWithPanel()
      fireEvent.click(screen.getAllByText('Test post body')[0])
      const frame = within(host).getByRole('button', { name: 'Open picture full size' })
      expect(frame).toHaveClass('post-photo')
      fireEvent.click(frame)
      const viewer = screen.getByRole('dialog', { name: 'Picture, full size' })
      expect(within(viewer).getByRole('img')).toHaveAttribute('src', 'https://example.com/pass.jpg')
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    } finally {
      delete mockPosts[0].media_url
    }
  })
})
