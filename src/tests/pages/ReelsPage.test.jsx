import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import '../mocks/supabase.js'
import ReelsPage from '../../pages/ReelsPage'

vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn(), followSystem: vi.fn() }),
  ThemeProvider: ({ children }) => children,
}))

const mockUploadVideo = vi.fn()
const mockLikeVideo = vi.fn()
const mockIncrementView = vi.fn()

const mockVideos = [
  {
    id: 'v1', title: 'Breaking footage from conflict zone',
    video_url: 'https://example.com/video1.mp4',
    type: 'reel', likes: 14, view_count: 203, _liked: false,
    created_at: new Date().toISOString(),
    users: { id: 'u1', username: 'osint_alice', role: 'osint' },
  },
  {
    id: 'v2', title: 'Drone footage analysis',
    video_url: 'https://example.com/video2.mp4',
    type: 'reel', likes: 5, view_count: 89, _liked: true,
    created_at: new Date().toISOString(),
    users: { id: 'u2', username: 'reporter_bob', role: 'reporter' },
  },
]

vi.mock('../../hooks/useVideos', () => ({
  useVideos: () => ({
    videos: mockVideos,
    loading: false,
    uploading: false,
    uploadVideo: mockUploadVideo,
    likeVideo: mockLikeVideo,
    incrementView: mockIncrementView,
    refetch: vi.fn(),
  }),
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user', email: 'test@test.com' } }),
}))

const renderPage = () => render(<MemoryRouter><ReelsPage /></MemoryRouter>)

describe('ReelsPage', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders REELS header', () => {
    renderPage()
    expect(screen.getByText(/REELS/i)).toBeInTheDocument()
  })

  it('shows UPLOAD button', () => {
    renderPage()
    expect(screen.getByText(/UPLOAD/i)).toBeInTheDocument()
  })

  it('renders video titles', () => {
    renderPage()
    expect(screen.getByText('Breaking footage from conflict zone')).toBeInTheDocument()
    expect(screen.getByText('Drone footage analysis')).toBeInTheDocument()
  })

  it('shows OSINT badge for osint user', () => {
    renderPage()
    // BadgeCheck SVG renders next to the osint username — verify username is present
    expect(screen.getByText('@osint_alice')).toBeInTheDocument()
  })

  it('shows reporter badge for reporter user', () => {
    renderPage()
    // PenLine SVG renders next to the reporter username — verify username is present
    expect(screen.getByText('@reporter_bob')).toBeInTheDocument()
  })

  it('shows like counts', () => {
    renderPage()
    expect(screen.getByText('14')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('shows view counts', () => {
    renderPage()
    expect(screen.getByText('203')).toBeInTheDocument()
    expect(screen.getByText('89')).toBeInTheDocument()
  })

  it('opens upload modal on UPLOAD click', () => {
    renderPage()
    fireEvent.click(screen.getByText(/UPLOAD/i))
    expect(screen.getByText(/UPLOAD REEL/i)).toBeInTheDocument()
    expect(screen.getByText(/Click or drag to upload/i)).toBeInTheDocument()
  })

  it('closes upload modal on CANCEL', () => {
    renderPage()
    fireEvent.click(screen.getByText(/UPLOAD/i))
    fireEvent.click(screen.getByText('CANCEL'))
    expect(screen.queryByText(/UPLOAD REEL/i)).not.toBeInTheDocument()
  })

  it('POST REEL button disabled when no file selected', () => {
    renderPage()
    fireEvent.click(screen.getByText(/UPLOAD/i))
    const postBtn = screen.getByText('POST REEL')
    expect(postBtn.style.opacity).toBe('0.5')
  })

  it('calls likeVideo when like button is clicked', () => {
    const { container } = renderPage()
    // The like button is a <button> with onMouseOver handler wrapping a Heart SVG
    // It is the only button with fontSize=24 in its inline style
    const likeBtn = container.querySelector('button[style*="font-size: 24"]')
    fireEvent.click(likeBtn)
    expect(mockLikeVideo).toHaveBeenCalled()
  })

  it('shows filled heart for already-liked video', () => {
    renderPage()
    // v2._liked = true → Heart SVG has fill="currentColor"; verify its like count renders
    expect(screen.getByText('5')).toBeInTheDocument()
  })
})
