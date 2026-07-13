import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { mockSupabase } from '../mocks/supabase.js'
import LivePage from '../../pages/LivePage'

const mockCreateStream = vi.fn()
const mockGoLive = vi.fn()
const mockEndStream = vi.fn()

const liveStream = {
  id: 'stream-1', title: 'Breaking: South China Sea Update',
  description: 'Live coverage of recent developments',
  status: 'live', viewer_count: 42,
  host_id: 'host-user', started_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  users: { id: 'host-user', username: 'osint_alice', role: 'osint' },
}

const scheduledStream = {
  id: 'stream-2', title: 'Cyber Threat Briefing',
  description: '', status: 'scheduled', viewer_count: 0,
  host_id: 'other-user', started_at: null,
  created_at: new Date().toISOString(),
  users: { id: 'other-user', username: 'reporter_bob', role: 'reporter' },
}

vi.mock('../../hooks/useLiveStreams', () => ({
  useLiveStreams: () => ({
    streams: [liveStream, scheduledStream],
    loading: false,
    createStream: mockCreateStream,
    goLive: mockGoLive,
    endStream: mockEndStream,
    refetch: vi.fn(),
  }),
  useStreamViewers: () => 42,
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'host-user', app_metadata: { role: 'osint' } } }),
}))

const renderPage = () => render(<MemoryRouter><LivePage /></MemoryRouter>)

describe('LivePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Role is fetched from users table; return 'osint' so canBroadcast is true
    mockSupabase.single.mockResolvedValue({ data: { role: 'osint' }, error: null })
  })

  it('renders page header', () => {
    renderPage()
    expect(screen.getByText(/LIVE BROADCASTS/i)).toBeInTheDocument()
  })

  it('shows live stream card with LIVE badge', () => {
    renderPage()
    expect(screen.getAllByText('LIVE').length).toBeGreaterThan(0)
    expect(screen.getByText('Breaking: South China Sea Update')).toBeInTheDocument()
  })

  it('shows scheduled stream', () => {
    renderPage()
    expect(screen.getByText('Cyber Threat Briefing')).toBeInTheDocument()
  })

  it('shows ● LIVE NOW section heading', () => {
    renderPage()
    expect(screen.getByText(/LIVE NOW/i)).toBeInTheDocument()
  })

  it('shows ◷ SCHEDULED section heading', () => {
    renderPage()
    // The scheduled section header has the ◷ symbol prefix
    expect(screen.getByText('◷ SCHEDULED')).toBeInTheDocument()
  })

  it('shows GO LIVE button for eligible users', async () => {
    renderPage()
    const buttons = await screen.findAllByText('▶ GO LIVE')
    expect(buttons.length).toBeGreaterThan(0)
  })

  it('opens create stream modal on GO LIVE click', async () => {
    renderPage()
    const buttons = await screen.findAllByText('▶ GO LIVE')
    fireEvent.click(buttons[0])
    expect(screen.getByPlaceholderText(/Stream title/i)).toBeInTheDocument()
  })

  it('closes create modal on CANCEL', async () => {
    renderPage()
    fireEvent.click((await screen.findAllByText('▶ GO LIVE'))[0])
    fireEvent.click(screen.getByText('CANCEL'))
    expect(screen.queryByPlaceholderText(/Stream title/i)).not.toBeInTheDocument()
  })

  it('calls createStream with title and description', async () => {
    mockCreateStream.mockResolvedValue({ data: { id: 'new-stream', status: 'scheduled' }, error: null })
    renderPage()
    fireEvent.click((await screen.findAllByText('▶ GO LIVE'))[0])
    fireEvent.change(screen.getByPlaceholderText(/Stream title/i), {
      target: { value: 'My Intel Briefing' },
    })
    fireEvent.click(screen.getByText('CREATE BROADCAST'))
    await waitFor(() => {
      expect(mockCreateStream).toHaveBeenCalledWith('My Intel Briefing', '')
    })
  })

  it('clicking a live stream card opens stream room', () => {
    renderPage()
    const titleEl = screen.getByText('Breaking: South China Sea Update')
    fireEvent.click(titleEl.closest('div'))
    // Stream room is visible — viewer count appears in the room header
    expect(screen.getByText(/42 watching/i)).toBeInTheDocument()
  })

  it('shows viewer count in stream room', () => {
    renderPage()
    const card = screen.getByText('Breaking: South China Sea Update').closest('div')
    fireEvent.click(card)
    expect(screen.getByText(/42 watching/i)).toBeInTheDocument()
  })
})
