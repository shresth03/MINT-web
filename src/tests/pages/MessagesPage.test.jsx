import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../mocks/supabase.js'
import MessagesPage from '../../pages/social/MessagesPage'

const mockUser = { id: 'me' }
vi.mock('../../hooks/core/useAuth', () => ({
  useAuth: () => ({ user: mockUser }),
}))

vi.mock('../../hooks/core/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

const minutesAgo = m => new Date(Date.now() - m * 60 * 1000).toISOString()

const CONVERSATIONS = [
  {
    id: 'c1', otherUser: { id: 'u1', username: 'geo_watch', role: 'osint' },
    last_message: 'Want me to share it here?', last_message_at: minutesAgo(3),
    lastSenderId: 'u1', unreadCount: 2,
  },
  {
    id: 'c2', otherUser: { id: 'u2', username: 'signal_desk', role: 'public' },
    last_message: 'Thanks, sending now', last_message_at: minutesAgo(60),
    lastSenderId: 'me', unreadCount: 0,
  },
]

const THREAD = [
  { id: 'm1', conversation_id: 'c1', sender_id: 'me', body: 'Any update?', read: true, created_at: minutesAgo(30) },
  { id: 'm2', conversation_id: 'c1', sender_id: 'u1', body: 'New imagery just came in.', read: false, created_at: minutesAgo(4) },
  { id: 'm3', conversation_id: 'c1', sender_id: 'u1', body: 'Want me to share it here?', read: false, created_at: minutesAgo(3) },
]

const hook = {
  conversations: CONVERSATIONS,
  loading: false,
  getOrCreateConversation: vi.fn(),
  fetchMessages: vi.fn(),
  sendMessage: vi.fn(),
  markConversationRead: vi.fn(),
}
vi.mock('../../hooks/social/useMessages', () => ({
  useMessages: () => hook,
}))

const renderPage = () => render(<MemoryRouter><MessagesPage /></MemoryRouter>)

async function openGeoWatch() {
  renderPage()
  fireEvent.click(screen.getByText('geo_watch'))
  await screen.findByText('New imagery just came in.')
}

describe('MessagesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hook.conversations = CONVERSATIONS
    hook.loading = false
    hook.fetchMessages.mockResolvedValue(THREAD)
    hook.sendMessage.mockResolvedValue({ error: null })
    Element.prototype.scrollIntoView = vi.fn()
  })

  // ── Conversation list ────────────────────────────────────────────────────

  it('shows the Messages title and total unread in the list header', () => {
    renderPage()
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText('2 UNREAD')).toBeInTheDocument()
  })

  it('badges conversations with unread messages', () => {
    renderPage()
    expect(screen.getByLabelText('2 unread')).toHaveTextContent('2')
  })

  it('prefixes "You:" when you sent the last message', () => {
    renderPage()
    expect(screen.getByText('You:', { exact: false })).toBeInTheDocument()
    expect(screen.getByText('Thanks, sending now')).toBeInTheDocument()
  })

  it('shows the select-a-conversation state with a Find Channels button', () => {
    renderPage()
    expect(screen.getByText('Select a conversation')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /find channels/i })).toBeInTheDocument()
  })

  it('shows the new-user state when there are no conversations', () => {
    hook.conversations = []
    renderPage()
    expect(screen.getByText('No messages yet')).toBeInTheDocument()
  })

  // ── Thread ───────────────────────────────────────────────────────────────

  it('opening a conversation loads messages and clears its badge', async () => {
    await openGeoWatch()
    expect(hook.fetchMessages).toHaveBeenCalledWith('c1')
    expect(screen.queryByLabelText('2 unread')).not.toBeInTheDocument()
    expect(screen.queryByText('2 UNREAD')).not.toBeInTheDocument()
  })

  it('shows a Today separator and a New messages divider before the first unread', async () => {
    await openGeoWatch()
    expect(screen.getByText('Today')).toBeInTheDocument()
    const divider = screen.getByText('New messages')
    const firstUnread = screen.getByText('New imagery just came in.')
    expect(divider.compareDocumentPosition(firstUnread) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('groups back-to-back messages under one timestamp', async () => {
    await openGeoWatch()
    // m2 and m3 are one minute apart from the same sender: only m3 gets a time
    const m2 = screen.getByText('New imagery just came in.').parentElement
    const m3 = screen.getByText('Want me to share it here?', { selector: 'div[style*="pre-wrap"]' }).parentElement
    expect(m2.children).toHaveLength(1)
    expect(m3.children).toHaveLength(2)
  })

  it('shows Sent or Seen under your latest message when it is last', async () => {
    hook.fetchMessages.mockResolvedValue([
      { id: 'm9', conversation_id: 'c1', sender_id: 'me', body: 'Sending now', read: true, created_at: minutesAgo(1) },
    ])
    renderPage()
    fireEvent.click(screen.getByText('geo_watch'))
    expect(await screen.findByText(/· Seen/)).toBeInTheDocument()
  })

  it('introduces a brand-new conversation', async () => {
    hook.fetchMessages.mockResolvedValue([])
    renderPage()
    fireEvent.click(screen.getByText('signal_desk'))
    expect(await screen.findByText(/This is the start of your conversation with @signal_desk/)).toBeInTheDocument()
    expect(screen.getByText('PUBLIC USER')).toBeInTheDocument()
  })

  // ── Composer ─────────────────────────────────────────────────────────────

  it('sends on Enter and clears the box', async () => {
    await openGeoWatch()
    const box = screen.getByLabelText('Message')
    fireEvent.change(box, { target: { value: 'On my way' } })
    fireEvent.keyDown(box, { key: 'Enter' })
    await waitFor(() => expect(hook.sendMessage).toHaveBeenCalledWith('c1', 'On my way'))
    await waitFor(() => expect(box).toHaveValue(''))
  })

  it('does not send on Shift+Enter', async () => {
    await openGeoWatch()
    const box = screen.getByLabelText('Message')
    fireEvent.change(box, { target: { value: 'line one' } })
    fireEvent.keyDown(box, { key: 'Enter', shiftKey: true })
    expect(hook.sendMessage).not.toHaveBeenCalled()
  })

  it('disables the send button while the box is empty', async () => {
    await openGeoWatch()
    const composer = screen.getByLabelText('Message').parentElement
    expect(within(composer).getByRole('button', { name: /send message/i })).toBeDisabled()
  })
})
