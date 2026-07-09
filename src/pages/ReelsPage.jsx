import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { useVideos } from '../hooks/useVideos'
import { useAuth } from '../hooks/useAuth'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function VideoReel({ video, isActive, onLike, onView }) {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    if (!videoRef.current) return
    if (isActive) {
      videoRef.current.play().catch(() => {})
      setPlaying(true)
      onView()
    } else {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
      setPlaying(false)
    }
  }, [isActive]) // eslint-disable-line react-hooks/exhaustive-deps

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) { videoRef.current.pause(); setPlaying(false) }
    else { videoRef.current.play(); setPlaying(true) }
  }

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: '#000', borderRadius: 10, overflow: 'hidden',
    }}>
      <video
        ref={videoRef}
        src={video.video_url}
        loop muted={muted} playsInline
        onClick={togglePlay}
        style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'pointer' }}
      />

      {/* Play/pause overlay */}
      {!playing && (
        <div onClick={togglePlay} style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)', border: '2px solid rgba(255,255,255,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, color: '#fff',
          }}>▶</div>
        </div>
      )}

      {/* Right actions */}
      <div style={{
        position: 'absolute', right: 12, bottom: 80,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      }}>
        {/* Author avatar */}
        <div
          onClick={() => navigate(`/channel/${video.users?.username}`)}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'var(--accent)', border: '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 15, fontWeight: 700,
            color: 'var(--bg)', cursor: 'pointer',
          }}
        >
          {video.users?.username?.[0]?.toUpperCase() || '?'}
        </div>

        {/* Like */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <button onClick={onLike} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 24, color: video._liked ? '#e84848' : '#fff',
            transition: 'transform 0.1s',
          }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            {video._liked ? '♥' : '♡'}
          </button>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#fff' }}>
            {video.likes || 0}
          </span>
        </div>

        {/* Views */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span style={{ fontSize: 20, color: '#fff' }}>👁</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#fff' }}>
            {video.view_count || 0}
          </span>
        </div>

        {/* Mute toggle */}
        <button onClick={() => setMuted(m => !m)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 18, color: '#fff', opacity: 0.8,
        }}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>

      {/* Bottom info */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 60,
        padding: '32px 14px 14px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
      }}>
        <div
          onClick={() => navigate(`/channel/${video.users?.username}`)}
          style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: '#fff', marginBottom: 4, cursor: 'pointer' }}
        >
          @{video.users?.username}
          {video.users?.role === 'osint' && <span style={{ color: 'var(--verified)', marginLeft: 6 }}>◆</span>}
          {video.users?.role === 'reporter' && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>◈</span>}
        </div>
        {video.title && (
          <div style={{ fontFamily: 'var(--sans)', fontSize: 13, color: '#fff', lineHeight: 1.4, marginBottom: 4 }}>
            {video.title}
          </div>
        )}
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'rgba(255,255,255,0.5)' }}>
          {timeAgo(video.created_at)}
        </div>
      </div>
    </div>
  )
}

function UploadModal({ onClose, onUpload, uploading }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [preview, setPreview] = useState(null)
  const fileRef = useRef(null)

  const handleFile = (f) => {
    if (!f || !f.type.startsWith('video/')) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleUpload = async () => {
    if (!file) return
    await onUpload(file, { title })
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 28, width: 440, maxWidth: '92vw',
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--text)', marginBottom: 20 }}>
          ▲ UPLOAD REEL
        </div>

        {/* Drop zone */}
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          style={{
            border: `2px dashed ${file ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 8, padding: '24px 0', textAlign: 'center',
            cursor: 'pointer', marginBottom: 16, transition: 'border-color 0.15s',
            background: file ? 'rgba(0,212,255,0.04)' : 'transparent',
          }}
        >
          {preview ? (
            <video src={preview} style={{ maxHeight: 180, borderRadius: 6, maxWidth: '100%' }} muted />
          ) : (
            <>
              <div style={{ fontSize: 28, marginBottom: 8 }}>▲</div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                Click or drag to upload MP4 / MOV
              </div>
            </>
          )}
        </div>
        <input ref={fileRef} type="file" accept="video/*" style={{ display: 'none' }}
          onChange={e => handleFile(e.target.files[0])} />

        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Title / caption (optional)"
          style={{
            width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '10px 14px', color: 'var(--text)',
            fontFamily: 'var(--sans)', fontSize: 13, outline: 'none',
            marginBottom: 16, boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '9px 0', background: 'transparent',
            border: '1px solid var(--border)', borderRadius: 4,
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', cursor: 'pointer',
          }}>CANCEL</button>
          <button onClick={handleUpload} disabled={!file || uploading} style={{
            flex: 2, padding: '9px 0', background: 'var(--accent)', color: 'var(--bg)',
            border: 'none', borderRadius: 4, fontFamily: 'var(--mono)',
            fontSize: 10, fontWeight: 700, cursor: !file ? 'not-allowed' : 'pointer',
            opacity: !file ? 0.5 : 1,
          }}>
            {uploading ? 'UPLOADING...' : 'POST REEL'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ReelsPage() {
  const { videos, loading, uploading, uploadVideo, likeVideo, incrementView } = useVideos('reel')
  const [activeIdx, setActiveIdx] = useState(0)
  const [showUpload, setShowUpload] = useState(false)
  const containerRef = useRef(null)
  const { user } = useAuth()

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const children = containerRef.current.children
    const containerTop = containerRef.current.scrollTop
    const itemHeight = containerRef.current.clientHeight
    const idx = Math.round(containerTop / itemHeight)
    setActiveIdx(Math.min(idx, videos.length - 1))
  }, [videos.length])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  const viewedRef = useRef(new Set())
  const handleView = useCallback((videoId) => {
    if (viewedRef.current.has(videoId)) return
    viewedRef.current.add(videoId)
    incrementView(videoId)
  }, [incrementView])

  return (
    <PageShell>
      <div style={{ height: 'calc(100vh - 60px)', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0,
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 13, fontWeight: 700, color: 'var(--text)', letterSpacing: 2 }}>
            ▶ REELS
          </div>
          <button
            onClick={() => setShowUpload(true)}
            style={{
              padding: '7px 16px', background: 'var(--accent)', color: 'var(--bg)',
              border: 'none', borderRadius: 4, fontFamily: 'var(--mono)',
              fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
            }}
          >
            ▲ UPLOAD
          </button>
        </div>

        {/* Vertical scroll feed */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
            LOADING REELS...
          </div>
        ) : videos.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
            <div style={{ fontSize: 36 }}>▶</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>No reels yet</div>
            <button onClick={() => setShowUpload(true)} style={{
              padding: '9px 20px', background: 'var(--accent)', color: 'var(--bg)',
              border: 'none', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, cursor: 'pointer',
            }}>
              UPLOAD FIRST REEL
            </button>
          </div>
        ) : (
          <div
            ref={containerRef}
            style={{
              flex: 1, overflowY: 'scroll', scrollSnapType: 'y mandatory',
              scrollbarWidth: 'none',
            }}
          >
            {videos.map((video, idx) => (
              <div key={video.id} style={{
                height: '100%', scrollSnapAlign: 'start', flexShrink: 0,
                padding: '8px 0',
                display: 'flex', justifyContent: 'center',
              }}>
                <div style={{ width: '100%', maxWidth: 420, height: '100%' }}>
                  <VideoReel
                    video={video}
                    isActive={idx === activeIdx}
                    onLike={() => likeVideo(video.id)}
                    onView={() => handleView(video.id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={uploadVideo}
          uploading={uploading}
        />
      )}
    </PageShell>
  )
}
