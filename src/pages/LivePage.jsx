import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { useLiveStreams, useStreamViewers } from '../hooks/useLiveStreams'
import { useAuth } from '../hooks/useAuth'
import { BadgeCheck, PenLine, Play, Radio, Inbox } from 'lucide-react'
import { supabase } from '../api/supabase'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function LiveBadge() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 3,
      background: 'rgba(232,72,72,0.15)', border: '1px solid rgba(232,72,72,0.5)',
      fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: '#e84848',
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: '#e84848',
        animation: 'pulse 1.5s ease-in-out infinite',
      }} />
      LIVE
    </span>
  )
}

function StreamRoom({ stream, onEnd, isHost }) {
  const viewerCount = useStreamViewers(stream.id)

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      {/* Video placeholder */}
      <div style={{
        background: '#0a0a0a', aspectRatio: '16/9',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12,
        position: 'relative',
      }}>
        {stream.status === 'live' ? (
          <>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: 'var(--surface)',
              border: '2px solid var(--border)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 24, color: 'var(--muted)',
            }}>
              {stream.users?.username?.[0]?.toUpperCase() || '?'}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
              Live broadcast in progress
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', opacity: 0.5 }}>
              Video streaming coming soon
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 32, color: 'var(--muted)' }}>◷</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
              Scheduled — not yet live
            </div>
          </>
        )}

        {/* Top badges */}
        <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
          {stream.status === 'live' && <LiveBadge />}
        </div>
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 8px',
            background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border)',
            borderRadius: 3, color: 'var(--text)',
          }}>
            👁 {viewerCount} watching
          </span>
        </div>
      </div>

      {/* Info bar */}
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
          {stream.title}
        </div>
        {stream.description && (
          <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
            {stream.description}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)' }}>
            @{stream.users?.username}
          </span>
          {stream.users?.role === 'osint' && <span style={{ color: 'var(--verified)', fontSize: 10, display:'flex', alignItems:'center', gap:3 }}><BadgeCheck size={10} /> OSINT</span>}
          {stream.users?.role === 'reporter' && <span style={{ color: 'var(--accent)', fontSize: 10, display:'flex', alignItems:'center', gap:3 }}><PenLine size={10} /> REPORTER</span>}
          {stream.started_at && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginLeft: 'auto' }}>
              Started {timeAgo(stream.started_at)}
            </span>
          )}
        </div>

        {isHost && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            {stream.status === 'scheduled' && (
              <button
                onClick={() => onEnd('go_live', stream.id)}
                style={{
                  padding: '7px 16px', background: '#e84848', color: '#fff',
                  border: 'none', borderRadius: 4, fontFamily: 'var(--mono)',
                  fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: 'pointer',
                }}
              >
                <Play size={11} style={{display:'inline',verticalAlign:'middle',marginRight:5}} /> GO LIVE
              </button>
            )}
            {stream.status === 'live' && (
              <button
                onClick={() => onEnd('end', stream.id)}
                style={{
                  padding: '7px 16px', background: 'var(--surface2)',
                  color: 'var(--muted)', border: '1px solid var(--border)',
                  borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
                }}
              >
                ■ END STREAM
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateStreamModal({ onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!title.trim()) return
    setCreating(true)
    await onCreate(title.trim(), description.trim())
    setCreating(false)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 28, width: 420, maxWidth: '92vw',
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--text)', marginBottom: 20 }}>
          <Play size={11} style={{display:'inline',verticalAlign:'middle',marginRight:5}} /> CREATE BROADCAST
        </div>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Stream title..."
          autoFocus
          style={{
            width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '10px 14px', color: 'var(--text)',
            fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', marginBottom: 12,
            boxSizing: 'border-box',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What will you cover? (optional)"
          rows={3}
          style={{
            width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 4, padding: '10px 14px', color: 'var(--text)',
            fontFamily: 'var(--sans)', fontSize: 13, outline: 'none', marginBottom: 16,
            boxSizing: 'border-box', resize: 'none',
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
          <button onClick={handleCreate} disabled={!title.trim() || creating} style={{
            flex: 2, padding: '9px 0', background: 'var(--accent)', color: 'var(--bg)',
            border: 'none', borderRadius: 4, fontFamily: 'var(--mono)',
            fontSize: 10, fontWeight: 700, cursor: !title.trim() ? 'not-allowed' : 'pointer',
            opacity: !title.trim() ? 0.5 : 1,
          }}>
            {creating ? 'CREATING...' : 'CREATE BROADCAST'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StreamCard({ stream }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s',
    }}
      onMouseOver={e => e.currentTarget.style.borderColor = stream.status === 'live' ? '#e84848' : 'var(--accent)'}
      onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{
        background: stream.status === 'live' ? 'rgba(232,72,72,0.05)' : '#0a0a0a',
        aspectRatio: '16/9', display: 'flex', alignItems: 'center',
        justifyContent: 'center', position: 'relative',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'var(--surface)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontSize: 18, color: 'var(--text)',
        }}>
          {stream.users?.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={{ position: 'absolute', top: 8, left: 8 }}>
          {stream.status === 'live' ? <LiveBadge /> : (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 8px',
              background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border)',
              borderRadius: 3, color: 'var(--muted)',
            }}>SCHEDULED</span>
          )}
        </div>
        {stream.viewer_count > 0 && (
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 8px',
              background: 'rgba(0,0,0,0.6)', border: '1px solid var(--border)',
              borderRadius: 3, color: 'var(--text)',
            }}>👁 {stream.viewer_count}</span>
          </div>
        )}
      </div>
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontFamily: 'var(--sans)', fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
          {stream.title}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--accent)' }}>
          @{stream.users?.username}
          {stream.users?.role === 'osint' && <BadgeCheck size={11} style={{ color: 'var(--verified)', marginLeft: 4 }} />}
        </div>
      </div>
    </div>
  )
}

export default function LivePage() {
  const { user } = useAuth()
  const { streams, loading, createStream, goLive, endStream } = useLiveStreams()
  const [showCreate, setShowCreate] = useState(false)
  const [activeStream, setActiveStream] = useState(null)
  const [userRole, setUserRole] = useState(null)

  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.id) return
    supabase.from('users').select('role').eq('id', user.id).single()
      .then(({ data }) => setUserRole(data?.role || null))
  }, [user?.id])

  const canBroadcast = ['osint', 'reporter', 'admin'].includes(userRole)

  const liveStreams = streams.filter(s => s.status === 'live')
  const scheduledStreams = streams.filter(s => s.status === 'scheduled')

  const handleAction = async (action, streamId) => {
    if (action === 'go_live') await goLive(streamId)
    if (action === 'end') await endStream(streamId)
  }

  return (
    <PageShell>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: 2, marginBottom: 4 }}>
              <Radio size={12} style={{display:'inline',verticalAlign:'middle',marginRight:5}} /> LIVE BROADCASTS
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 1 }}>
              Real-time intel briefings from OSINT analysts and reporters
            </div>
          </div>
          {canBroadcast && (
            <button
              onClick={() => setShowCreate(true)}
              style={{
                marginLeft: 'auto', padding: '9px 18px',
                background: '#e84848', color: '#fff',
                border: 'none', borderRadius: 4,
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                letterSpacing: 1, cursor: 'pointer',
              }}
            >
              ▶ GO LIVE
            </button>
          )}
        </div>

        {/* Active stream detail */}
        {activeStream && (
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <button onClick={() => setActiveStream(null)} style={{
                background: 'none', border: 'none', color: 'var(--muted)',
                fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer',
              }}>← BACK</button>
            </div>
            <StreamRoom
              stream={activeStream}
              isHost={activeStream.host_id === user?.id}
              onEnd={handleAction}
            />
          </div>
        )}

        {!activeStream && (
          <>
            {loading ? (
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', padding: 40, textAlign: 'center' }}>
                LOADING STREAMS...
              </div>
            ) : streams.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Radio size={32} style={{ marginBottom: 16 }} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  No live broadcasts right now
                </div>
                {canBroadcast && (
                  <button onClick={() => setShowCreate(true)} style={{
                    marginTop: 12, padding: '9px 20px', background: 'var(--accent)',
                    color: 'var(--bg)', border: 'none', borderRadius: 4,
                    fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, cursor: 'pointer',
                  }}>
                    START THE FIRST BROADCAST
                  </button>
                )}
              </div>
            ) : (
              <>
                {liveStreams.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: '#e84848', marginBottom: 12 }}>
                      <span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:'currentColor',marginRight:5,verticalAlign:'middle'}} />LIVE NOW
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                      {liveStreams.map(s => (
                        <div key={s.id} onClick={() => setActiveStream(s)} style={{ cursor: 'pointer' }}>
                          <StreamCard stream={s} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {scheduledStreams.length > 0 && (
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'var(--muted)', marginBottom: 12 }}>
                      ◷ SCHEDULED
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                      {scheduledStreams.map(s => (
                        <div key={s.id} onClick={() => s.host_id === user?.id ? setActiveStream(s) : null}
                          style={{ cursor: s.host_id === user?.id ? 'pointer' : 'default' }}>
                          <StreamCard stream={s} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateStreamModal
          onClose={() => setShowCreate(false)}
          onCreate={async (title, desc) => {
            const { data } = await createStream(title, desc)
            if (data) setActiveStream(data)
          }}
        />
      )}
    </PageShell>
  )
}

