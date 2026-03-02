import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const styles = `
  .admin-page {
    min-height: 100vh;
    background: #080c10;
    color: #c8d6e5;
    font-family: 'IBM Plex Sans', sans-serif;
  }
  .admin-topbar {
    height: 52px;
    background: #0d1219;
    border-bottom: 1px solid #1e2d3d;
    display: flex;
    align-items: center;
    padding: 0 24px;
    gap: 16px;
  }
  .admin-title {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 2px;
    color: #00d4ff;
  }
  .admin-body {
    padding: 24px;
    max-width: 1000px;
    margin: 0 auto;
  }
  .admin-section-title {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 2px;
    color: #4a6080;
    text-transform: uppercase;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .admin-section-title::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #1e2d3d;
  }
  .app-card {
    background: #0d1219;
    border: 1px solid #1e2d3d;
    border-radius: 8px;
    padding: 18px 20px;
    margin-bottom: 12px;
    transition: border-color 0.15s;
  }
  .app-card:hover { border-color: #2a3d54; }
  .app-card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
  }
  .app-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background: linear-gradient(135deg, #1e3a5f, #0d6efd);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: white;
    flex-shrink: 0;
  }
  .app-channel { font-size: 14px; font-weight: 600; color: #c8d6e5; }
  .app-handle { font-size: 11px; color: #4a6080; font-family: 'IBM Plex Mono', monospace; }
  .app-date { font-size: 10px; color: #4a6080; font-family: 'IBM Plex Mono', monospace; margin-left: auto; }
  .app-field { margin-bottom: 8px; }
  .app-field-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    letter-spacing: 1px;
    color: #4a6080;
    text-transform: uppercase;
    margin-bottom: 3px;
  }
  .app-field-value { font-size: 12px; color: #9ab3cc; line-height: 1.5; }
  .app-actions { display: flex; gap: 10px; margin-top: 14px; }
  .app-btn {
    padding: 7px 18px;
    border-radius: 4px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    cursor: pointer;
    border: none;
    transition: all 0.15s;
    font-weight: 600;
  }
  .app-btn.approve { background: #00ff88; color: #000; }
  .app-btn.approve:hover { background: #00e87a; }
  .app-btn.reject { background: transparent; border: 1px solid #ff6b35; color: #ff6b35; }
  .app-btn.reject:hover { background: rgba(255,107,53,0.1); }
  .app-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .status-badge {
    padding: 3px 10px;
    border-radius: 10px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 1px;
  }
  .status-badge.pending { background: rgba(255,204,0,0.15); color: #ffcc00; border: 1px solid #ffcc00; }
  .status-badge.approved { background: rgba(0,255,136,0.15); color: #00ff88; border: 1px solid #00ff88; }
  .status-badge.rejected { background: rgba(255,107,53,0.15); color: #ff6b35; border: 1px solid #ff6b35; }
  .stats-row { display: flex; gap: 12px; margin-bottom: 28px; }
  .stat-box {
    flex: 1;
    background: #0d1219;
    border: 1px solid #1e2d3d;
    border-radius: 8px;
    padding: 14px 18px;
  }
  .stat-box-label { font-family: 'IBM Plex Mono', monospace; font-size: 9px; letter-spacing: 2px; color: #4a6080; margin-bottom: 6px; }
  .stat-box-val { font-family: 'IBM Plex Mono', monospace; font-size: 26px; font-weight: 700; }
  .empty-state {
    text-align: center;
    padding: 40px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px;
    color: #4a6080;
    letter-spacing: 1px;
  }
  .back-btn {
    background: transparent;
    border: 1px solid #1e2d3d;
    color: #4a6080;
    padding: 6px 14px;
    border-radius: 4px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    cursor: pointer;
    margin-left: auto;
    transition: all 0.15s;
  }
  .back-btn:hover { color: #c8d6e5; border-color: #2a3d54; }
`

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    checkAdminAndLoad()
  }, [])

  async function checkAdminAndLoad() {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!data || data.role !== 'admin') {
      navigate('/feed')
      return
    }
    setUserRole('admin')
    loadApplications()
  }

  async function loadApplications() {
    const { data, error } = await supabase
      .from('osint_applications')
      .select('*')
      .order('created_at', { ascending: false })

      console.log('Applications data:', data)
      console.log('Applications error:', error)
      if (!error) setApplications(data || [])
    setLoading(false)
  }

  async function handleApprove(app) {
    setProcessing(app.id)
    
    // Update application status
    await supabase
      .from('osint_applications')
      .update({ status: 'approved' })
      .eq('id', app.id)

    // Upgrade user role to osint
    await supabase
      .from('users')
      .update({ role: 'osint' })
      .eq('id', app.user_id)

    setApplications(prev =>
      prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a)
    )
    setProcessing(null)
  }

  async function handleReject(app) {
    setProcessing(app.id)

    await supabase
      .from('osint_applications')
      .update({ status: 'rejected' })
      .eq('id', app.id)

    setApplications(prev =>
      prev.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a)
    )
    setProcessing(null)
  }

  const pending = applications.filter(a => a.status === 'pending')
  const reviewed = applications.filter(a => a.status !== 'pending')

  if (!userRole) return null

  return (
    <>
      <style>{styles}</style>
      <div className="admin-page">
        <div className="admin-topbar">
          <span style={{ fontSize: 20, color: '#00d4ff' }}>⬡</span>
          <span className="admin-title">SIGINT — ADMIN DASHBOARD</span>
          <button className="back-btn" onClick={() => navigate('/feed')}>
            ← Back to Feed
          </button>
        </div>

        <div className="admin-body">
          {/* Stats */}
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-box-label">Total Applications</div>
              <div className="stat-box-val" style={{ color: '#00d4ff' }}>{applications.length}</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-label">Pending Review</div>
              <div className="stat-box-val" style={{ color: '#ffcc00' }}>{pending.length}</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-label">Approved Channels</div>
              <div className="stat-box-val" style={{ color: '#00ff88' }}>
                {applications.filter(a => a.status === 'approved').length}
              </div>
            </div>
            <div className="stat-box">
              <div className="stat-box-label">Rejected</div>
              <div className="stat-box-val" style={{ color: '#ff6b35' }}>
                {applications.filter(a => a.status === 'rejected').length}
              </div>
            </div>
          </div>

          {/* Pending Applications */}
          <div className="admin-section-title">
            ⚑ Pending Review ({pending.length})
          </div>

          {loading ? (
            <div className="empty-state">LOADING...</div>
          ) : pending.length === 0 ? (
            <div className="empty-state">No pending applications</div>
          ) : (
            pending.map(app => (
              <div key={app.id} className="app-card">
                <div className="app-card-header">
                  <div className="app-avatar">
                    {app.channel_name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="app-channel">{app.channel_name}</div>
                    <div className="app-handle">{app.handle}</div>
                  </div>
                  <span className="status-badge pending">PENDING</span>
                  <div className="app-date">{timeAgo(app.created_at)}</div>
                </div>

                {app.portfolio && (
                  <div className="app-field">
                    <div className="app-field-label">Portfolio</div>
                    <div className="app-field-value">{app.portfolio}</div>
                  </div>
                )}
                {app.why && (
                  <div className="app-field">
                    <div className="app-field-label">Why they should be approved</div>
                    <div className="app-field-value">{app.why}</div>
                  </div>
                )}
                <div className="app-field">
                  <div className="app-field-label">Submitted by</div>
                  <div className="app-field-value">
                    {app.user_id}
                  </div>
                </div>

                <div className="app-actions">
                  <button
                    className="app-btn approve"
                    disabled={processing === app.id}
                    onClick={() => handleApprove(app)}
                  >
                    {processing === app.id ? 'PROCESSING...' : '✓ APPROVE'}
                  </button>
                  <button
                    className="app-btn reject"
                    disabled={processing === app.id}
                    onClick={() => handleReject(app)}
                  >
                    ✕ REJECT
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Reviewed Applications */}
          {reviewed.length > 0 && (
            <>
              <div className="admin-section-title" style={{ marginTop: 32 }}>
                ◈ Previously Reviewed ({reviewed.length})
              </div>
              {reviewed.map(app => (
                <div key={app.id} className="app-card" style={{ opacity: 0.7 }}>
                  <div className="app-card-header">
                    <div className="app-avatar">
                      {app.channel_name?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div>
                      <div className="app-channel">{app.channel_name}</div>
                      <div className="app-handle">{app.handle}</div>
                    </div>
                    <span className={`status-badge ${app.status}`}>
                      {app.status.toUpperCase()}
                    </span>
                    <div className="app-date">{timeAgo(app.created_at)}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  )
}