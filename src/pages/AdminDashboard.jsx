import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
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
    position: sticky;
    top: 0;
    z-index: 100;
  }
  .admin-title {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 2px;
    color: #00d4ff;
  }
  .admin-tabs {
    display: flex;
    border-bottom: 1px solid #1e2d3d;
    background: #0d1219;
    padding: 0 24px;
    gap: 0;
    position: sticky;
    top: 52px;
    z-index: 99;
  }
  .admin-tab {
    padding: 12px 20px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px;
    letter-spacing: 1px;
    color: #4a6080;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.15s;
    text-transform: uppercase;
  }
  .admin-tab:hover { color: #c8d6e5; }
  .admin-tab.active { color: #00d4ff; border-bottom-color: #00d4ff; }
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
  .app-actions { display: flex; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
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
  .app-btn.verified { background: #00ff88; color: #000; }
  .app-btn.false { background: transparent; border: 1px solid #ff4757; color: #ff4757; }
  .app-btn.false:hover { background: rgba(255,71,87,0.1); }
  .app-btn.developing { background: transparent; border: 1px solid #00d4ff; color: #00d4ff; }
  .app-btn.developing:hover { background: rgba(0,212,255,0.1); }
  .app-btn.reversed { background: transparent; border: 1px solid #ffd32a; color: #ffd32a; }
  .app-btn.reversed:hover { background: rgba(255,211,42,0.1); }
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
  .status-badge.open { background: rgba(255,159,67,0.15); color: #ff9f43; border: 1px solid #ff9f43; }
  .status-badge.verified { background: rgba(0,255,136,0.15); color: #00ff88; border: 1px solid #00ff88; }
  .status-badge.false { background: rgba(255,71,87,0.15); color: #ff4757; border: 1px solid #ff4757; }
  .status-badge.developing { background: rgba(0,212,255,0.15); color: #00d4ff; border: 1px solid #00d4ff; }
  .status-badge.reversed { background: rgba(255,211,42,0.15); color: #ffd32a; border: 1px solid #ffd32a; }
  .stats-row { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
  .stat-box {
    flex: 1;
    min-width: 120px;
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
  .form-input {
    width: 100%;
    background: #080c10;
    border: 1px solid #1e2d3d;
    border-radius: 4px;
    padding: 8px 12px;
    color: #c8d6e5;
    font-family: 'IBM Plex Sans', sans-serif;
    font-size: 12px;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .form-input:focus { border-color: #00d4ff; }
  .note-card {
    background: #080c10;
    border: 1px solid #1e2d3d;
    border-radius: 6px;
    padding: 12px 14px;
    margin-bottom: 8px;
  }
  .note-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    flex-wrap: wrap;
  }
  .rate-btn {
    padding: 4px 10px;
    border-radius: 4px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px;
    cursor: pointer;
    transition: all 0.15s;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .rate-btn.accurate { background: rgba(0,255,136,0.1); border: 1px solid #00ff88; color: #00ff88; }
  .rate-btn.accurate:hover { background: rgba(0,255,136,0.2); }
  .rate-btn.inaccurate { background: rgba(255,71,87,0.1); border: 1px solid #ff4757; color: #ff4757; }
  .rate-btn.inaccurate:hover { background: rgba(255,71,87,0.2); }
  .rate-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .score-input-row {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-top: 8px;
  }
  .osint-user-row {
    background: #0d1219;
    border: 1px solid #1e2d3d;
    border-radius: 8px;
    padding: 14px 18px;
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
`

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const CLAIM_LABELS = {
  open:       { label: 'OPEN',       color: '#ff9f43' },
  verified:   { label: 'VERIFIED',   color: '#00ff88' },
  false:      { label: 'FALSE',      color: '#ff4757' },
  developing: { label: 'DEVELOPING', color: '#00d4ff' },
  reversed:   { label: 'REVERSED',   color: '#ffd32a' },
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('applications')
  const [applications, setApplications] = useState([])
  const [claims, setClaims] = useState([])
  const [osintUsers, setOsintUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [userRole, setUserRole] = useState(null)
  // Claim resolution state
  const [resolutionNotes, setResolutionNotes] = useState({}) // claimId -> note text
  const [expandedClaim, setExpandedClaim] = useState(null)
  const [claimNotes, setClaimNotes] = useState({}) // claimId -> notes[]
  // Score override state
  const [scoreInputs, setScoreInputs] = useState({}) // userId -> score string
  const [scoreReasons, setScoreReasons] = useState({}) // userId -> reason string

  useEffect(() => { checkAdminAndLoad() }, [])

  async function checkAdminAndLoad() {
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!data || data.role !== 'admin') { navigate('/feed'); return }
    setUserRole('admin')
    await Promise.all([loadApplications(), loadClaims(), loadOsintUsers()])
    setLoading(false)
  }

  async function loadApplications() {
    const { data } = await supabase
      .from('osint_applications')
      .select('*')
      .order('created_at', { ascending: false })
    setApplications(data || [])
  }

  async function loadClaims() {
    const { data } = await supabase
      .from('claims')
      .select(`*, posts (id, body, author_id, created_at, users!posts_author_id_fkey (username, role, score))`)
      .order('created_at', { ascending: false })
    setClaims(data || [])
  }

  async function loadOsintUsers() {
    const { data } = await supabase
      .from('users')
      .select('id, username, score, role')
      .eq('role', 'osint')
      .order('score', { ascending: false })
    setOsintUsers(data || [])
  }

  async function loadClaimNotes(claimId, postId) {
    if (claimNotes[claimId]) { setExpandedClaim(expandedClaim === claimId ? null : claimId); return }
    const { data } = await supabase
      .from('community_notes')
      .select(`*, users!community_notes_author_id_fkey (username, role)`)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
    setClaimNotes(prev => ({ ...prev, [claimId]: data || [] }))
    setExpandedClaim(claimId)
  }

  // ── Applications ─────────────────────────────────────────────────────────
  async function handleApprove(app) {
    setProcessing(app.id)
    await supabase.from('osint_applications').update({ status: 'approved' }).eq('id', app.id)
    await supabase.from('users').update({ role: 'osint' }).eq('id', app.user_id)
    await supabase.from('notifications').insert({ to_user_id: app.user_id, from_user_id: user.id, type: 'application_approved', post_id: null })
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'approved' } : a))
    setProcessing(null)
  }

  async function handleReject(app) {
    setProcessing(app.id)
    await supabase.from('osint_applications').update({ status: 'rejected' }).eq('id', app.id)
    setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: 'rejected' } : a))
    setProcessing(null)
  }

  // ── Claims ────────────────────────────────────────────────────────────────
  async function handleResolveClaim(claimId, status) {
    setProcessing(claimId)
    const note = resolutionNotes[claimId] || null
    await supabase.from('claims').update({
      status,
      resolved_by: user.id,
      resolved_at: new Date().toISOString(),
      resolution_note: note
    }).eq('id', claimId)
    setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status, resolution_note: note } : c))
    setProcessing(null)
  }

  async function handleRateNote(noteId, claimId, rating) {
    setProcessing(`note-${noteId}`)
    await supabase.from('community_notes').update({ accuracy_rating: rating }).eq('id', noteId)
    setClaimNotes(prev => ({
      ...prev,
      [claimId]: (prev[claimId] || []).map(n => n.id === noteId ? { ...n, accuracy_rating: rating } : n)
    }))
    setProcessing(null)
  }

  // ── Score Override ────────────────────────────────────────────────────────
  async function handleScoreOverride(targetUser) {
    const raw = scoreInputs[targetUser.id]
    const newScore = parseInt(raw)
    if (isNaN(newScore) || newScore < -50 || newScore > 100) return alert('Score must be between -50 and 100')
    setProcessing(`score-${targetUser.id}`)
    const clamped = Math.max(-50, Math.min(100, newScore))
    await supabase.from('users').update({ score: clamped }).eq('id', targetUser.id)
    await supabase.from('notifications').insert({
      to_user_id: targetUser.id,
      from_user_id: user.id,
      type: 'score_override',
      post_id: null
    })
    setOsintUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, score: clamped } : u))
    setScoreInputs(prev => ({ ...prev, [targetUser.id]: '' }))
    setScoreReasons(prev => ({ ...prev, [targetUser.id]: '' }))
    setProcessing(null)
  }

  const pending = applications.filter(a => a.status === 'pending')
  const reviewed = applications.filter(a => a.status !== 'pending')
  const openClaims = claims.filter(c => c.status === 'open')
  const resolvedClaims = claims.filter(c => c.status !== 'open')

  function scoreColor(score) {
    if (score === null || score === undefined) return '#4a6080'
    if (score >= 75) return '#00ff88'
    if (score >= 50) return '#00d4ff'
    if (score >= 0)  return '#ffcc00'
    return '#ff4757'
  }

  if (!userRole) return null

  return (
    <>
      <style>{styles}</style>
      <div className="admin-page">
        {/* Topbar */}
        <div className="admin-topbar">
          <span style={{ fontSize: 20, color: '#00d4ff' }}>⬡</span>
          <span className="admin-title">MINT — ADMIN DASHBOARD</span>
          <button className="back-btn" onClick={() => navigate('/feed')}>← Back to Feed</button>
        </div>

        {/* Tabs */}
        <div className="admin-tabs">
          {[
            { id: 'applications', label: `Applications (${pending.length})` },
            { id: 'claims',       label: `Claims (${openClaims.length} open)` },
            { id: 'scores',       label: `Score Override` },
          ].map(t => (
            <div key={t.id} className={`admin-tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </div>
          ))}
        </div>

        <div className="admin-body">

          {/* ══ APPLICATIONS TAB ══ */}
          {activeTab === 'applications' && (
            <>
              <div className="stats-row">
                {[
                  { label: 'Total', val: applications.length, color: '#00d4ff' },
                  { label: 'Pending', val: pending.length, color: '#ffcc00' },
                  { label: 'Approved', val: applications.filter(a => a.status === 'approved').length, color: '#00ff88' },
                  { label: 'Rejected', val: applications.filter(a => a.status === 'rejected').length, color: '#ff6b35' },
                ].map(s => (
                  <div key={s.label} className="stat-box">
                    <div className="stat-box-label">{s.label}</div>
                    <div className="stat-box-val" style={{ color: s.color }}>{s.val}</div>
                  </div>
                ))}
              </div>

              <div className="admin-section-title">⚑ Pending Review ({pending.length})</div>
              {loading ? <div className="empty-state">LOADING...</div>
                : pending.length === 0 ? <div className="empty-state">No pending applications</div>
                : pending.map(app => (
                  <div key={app.id} className="app-card">
                    <div className="app-card-header">
                      <div className="app-avatar">{app.channel_name?.[0]?.toUpperCase() || 'C'}</div>
                      <div>
                        <div className="app-channel">{app.channel_name}</div>
                        <div className="app-handle">{app.handle}</div>
                      </div>
                      <span className="status-badge pending">PENDING</span>
                      <div className="app-date">{timeAgo(app.created_at)}</div>
                    </div>
                    {app.portfolio && <div className="app-field"><div className="app-field-label">Portfolio</div><div className="app-field-value">{app.portfolio}</div></div>}
                    {app.why && <div className="app-field"><div className="app-field-label">Why they should be approved</div><div className="app-field-value">{app.why}</div></div>}
                    <div className="app-field"><div className="app-field-label">User ID</div><div className="app-field-value" style={{ fontFamily: 'IBM Plex Mono', fontSize: 10 }}>{app.user_id}</div></div>
                    <div className="app-actions">
                      <button className="app-btn approve" disabled={processing === app.id} onClick={() => handleApprove(app)}>
                        {processing === app.id ? 'PROCESSING...' : '✓ APPROVE'}
                      </button>
                      <button className="app-btn reject" disabled={processing === app.id} onClick={() => handleReject(app)}>✕ REJECT</button>
                    </div>
                  </div>
                ))
              }

              {reviewed.length > 0 && (
                <>
                  <div className="admin-section-title" style={{ marginTop: 32 }}>◈ Previously Reviewed ({reviewed.length})</div>
                  {reviewed.map(app => (
                    <div key={app.id} className="app-card" style={{ opacity: 0.7 }}>
                      <div className="app-card-header">
                        <div className="app-avatar">{app.channel_name?.[0]?.toUpperCase() || 'C'}</div>
                        <div><div className="app-channel">{app.channel_name}</div><div className="app-handle">{app.handle}</div></div>
                        <span className={`status-badge ${app.status}`}>{app.status.toUpperCase()}</span>
                        <div className="app-date">{timeAgo(app.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {/* ══ CLAIMS TAB ══ */}
          {activeTab === 'claims' && (
            <>
              <div className="stats-row">
                {[
                  { label: 'Open',       val: openClaims.length,                              color: '#ff9f43' },
                  { label: 'Verified',   val: claims.filter(c => c.status === 'verified').length,   color: '#00ff88' },
                  { label: 'False',      val: claims.filter(c => c.status === 'false').length,      color: '#ff4757' },
                  { label: 'Developing', val: claims.filter(c => c.status === 'developing').length, color: '#00d4ff' },
                  { label: 'Reversed',   val: claims.filter(c => c.status === 'reversed').length,   color: '#ffd32a' },
                ].map(s => (
                  <div key={s.label} className="stat-box">
                    <div className="stat-box-label">{s.label}</div>
                    <div className="stat-box-val" style={{ color: s.color, fontSize: 20 }}>{s.val}</div>
                  </div>
                ))}
              </div>

              <div className="admin-section-title">⚑ Open Claims ({openClaims.length})</div>
              {loading ? <div className="empty-state">LOADING...</div>
                : openClaims.length === 0 ? <div className="empty-state">No open claims — all clear</div>
                : openClaims.map(claim => (
                  <div key={claim.id} className="app-card">
                    {/* Claim header */}
                    <div className="app-card-header">
                      <div className="app-avatar" style={{ background: 'linear-gradient(135deg,#3a1a1a,#8b0000)', fontSize: 16 }}>⚑</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#4a6080', marginBottom: 4 }}>
                          POST BY <span style={{ color: '#00ff88' }}>{claim.posts?.users?.username || 'Unknown'}</span>
                          {' · '}<span style={{ color: '#4a6080' }}>Score: {claim.posts?.users?.score ?? 'N/A'}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#9ab3cc', lineHeight: 1.5 }}>
                          {(claim.posts?.body || '').slice(0, 200)}{(claim.posts?.body || '').length > 200 ? '…' : ''}
                        </div>
                      </div>
                      <span className="status-badge open">OPEN</span>
                      <div className="app-date">{timeAgo(claim.created_at)}</div>
                    </div>

                    {/* Resolution note input */}
                    <div style={{ marginBottom: 12 }}>
                      <div className="app-field-label">Resolution Note (optional)</div>
                      <input
                        className="form-input"
                        placeholder="e.g. Confirmed by official source, satellite imagery..."
                        value={resolutionNotes[claim.id] || ''}
                        onChange={e => setResolutionNotes(prev => ({ ...prev, [claim.id]: e.target.value }))}
                      />
                    </div>

                    {/* Resolve buttons */}
                    <div className="app-actions">
                      {['verified', 'false', 'developing', 'reversed'].map(status => (
                        <button key={status} className={`app-btn ${status}`}
                          disabled={processing === claim.id}
                          onClick={() => handleResolveClaim(claim.id, status)}>
                          {processing === claim.id ? '...' : {
                            verified:   '✓ VERIFIED',
                            false:      '✗ FALSE',
                            developing: '◎ DEVELOPING',
                            reversed:   '⟳ REVERSED',
                          }[status]}
                        </button>
                      ))}
                      <button
                        onClick={() => loadClaimNotes(claim.id, claim.post_id)}
                        style={{ marginLeft: 'auto', padding: '7px 14px', background: 'transparent', border: '1px solid #1e2d3d', color: '#4a6080', borderRadius: 4, fontFamily: 'IBM Plex Mono', fontSize: 10, cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.color = '#c8d6e5'}
                        onMouseOut={e => e.currentTarget.style.color = '#4a6080'}
                      >
                        {expandedClaim === claim.id ? '▲ HIDE NOTES' : '▼ VIEW NOTES'}
                      </button>
                    </div>

                    {/* Community notes for this claim */}
                    {expandedClaim === claim.id && claimNotes[claim.id] && (
                      <div style={{ marginTop: 16, borderTop: '1px solid #1e2d3d', paddingTop: 14 }}>
                        <div className="app-field-label" style={{ marginBottom: 10 }}>Community Notes ({claimNotes[claim.id].length})</div>
                        {claimNotes[claim.id].length === 0
                          ? <div style={{ fontSize: 11, color: '#4a6080', fontFamily: 'IBM Plex Mono' }}>No notes yet</div>
                          : claimNotes[claim.id].map(note => (
                            <div key={note.id} className="note-card">
                              <div className="note-card-header">
                                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 11, fontWeight: 600, color: note.users?.role === 'osint' ? '#00ff88' : '#c8d6e5' }}>
                                  {note.users?.username || 'Unknown'}
                                  {note.users?.role === 'osint' && <span style={{ marginLeft: 4, fontSize: 9 }}>◆</span>}
                                </span>
                                <span style={{
                                  padding: '2px 8px', borderRadius: 3, fontFamily: 'IBM Plex Mono', fontSize: 9,
                                  background: note.stance === 'challenges' ? 'rgba(255,71,87,0.12)' : 'rgba(0,255,136,0.1)',
                                  color: note.stance === 'challenges' ? '#ff4757' : '#00ff88',
                                  border: `1px solid ${note.stance === 'challenges' ? '#ff475733' : '#00ff8833'}`
                                }}>
                                  {note.stance === 'challenges' ? '⚑ CHALLENGES' : '✓ SUPPORTS'}
                                </span>
                                <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 9, color: '#4a6080' }}>wt:{note.weight}</span>
                                {note.accuracy_rating && (
                                  <span style={{
                                    padding: '2px 8px', borderRadius: 3, fontFamily: 'IBM Plex Mono', fontSize: 9,
                                    background: note.accuracy_rating === 'accurate' ? 'rgba(0,255,136,0.1)' : 'rgba(255,71,87,0.12)',
                                    color: note.accuracy_rating === 'accurate' ? '#00ff88' : '#ff4757',
                                  }}>
                                    {note.accuracy_rating === 'accurate' ? '✓ ACCURATE' : '✗ INACCURATE'}
                                  </span>
                                )}
                                <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                                  <button className="rate-btn accurate" disabled={processing === `note-${note.id}` || note.accuracy_rating === 'accurate'}
                                    onClick={() => handleRateNote(note.id, claim.id, 'accurate')}>✓ ACCURATE</button>
                                  <button className="rate-btn inaccurate" disabled={processing === `note-${note.id}` || note.accuracy_rating === 'inaccurate'}
                                    onClick={() => handleRateNote(note.id, claim.id, 'inaccurate')}>✗ INACCURATE</button>
                                </div>
                              </div>
                              <div style={{ fontSize: 12, color: '#9ab3cc', lineHeight: 1.5 }}>{note.body}</div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                ))
              }

              {/* Resolved claims */}
              {resolvedClaims.length > 0 && (
                <>
                  <div className="admin-section-title" style={{ marginTop: 32 }}>◈ Resolved Claims ({resolvedClaims.length})</div>
                  {resolvedClaims.map(claim => {
                    const cs = CLAIM_LABELS[claim.status] || {}
                    return (
                      <div key={claim.id} className="app-card" style={{ opacity: 0.65 }}>
                        <div className="app-card-header">
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#4a6080', marginBottom: 4 }}>
                              POST BY <span style={{ color: '#7a9bbf' }}>{claim.posts?.users?.username || 'Unknown'}</span>
                            </div>
                            <div style={{ fontSize: 12, color: '#7a9bbf', lineHeight: 1.5 }}>
                              {(claim.posts?.body || '').slice(0, 120)}{(claim.posts?.body || '').length > 120 ? '…' : ''}
                            </div>
                            {claim.resolution_note && (
                              <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#4a6080', marginTop: 6 }}>
                                Note: {claim.resolution_note}
                              </div>
                            )}
                          </div>
                          <span className={`status-badge ${claim.status}`} style={{ color: cs.color }}>
                            {cs.label || claim.status.toUpperCase()}
                          </span>
                          <div className="app-date">{timeAgo(claim.created_at)}</div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </>
          )}

          {/* ══ SCORE OVERRIDE TAB ══ */}
          {activeTab === 'scores' && (
            <>
              <div style={{ background: '#0d1219', border: '1px solid #1e2d3d', borderRadius: 8, padding: '14px 18px', marginBottom: 24 }}>
                <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 10, color: '#ff9f43', marginBottom: 6, letterSpacing: 1 }}>⚠ MANUAL OVERRIDE</div>
                <div style={{ fontSize: 12, color: '#7a9bbf', lineHeight: 1.6 }}>
                  Manually setting a score bypasses the credibility formula. Use only when the algorithm produces an incorrect result due to exceptional circumstances. All overrides are logged and visible to the affected user.
                </div>
              </div>

              <div className="admin-section-title">◈ OSINT Analysts ({osintUsers.length})</div>

              {loading ? <div className="empty-state">LOADING...</div>
                : osintUsers.length === 0 ? <div className="empty-state">No OSINT analysts yet</div>
                : osintUsers.map((u, i) => (
                  <div key={u.id} className="osint-user-row">
                    {/* Rank */}
                    <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 18, fontWeight: 700, color: i === 0 ? '#ff9f43' : i === 1 ? '#4a6080' : i === 2 ? '#8a6a2a' : '#2a3d54', minWidth: 28, textAlign: 'center' }}>
                      {i + 1}
                    </div>
                    {/* Avatar */}
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1e3a5f,#0d6efd)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                      {u.username?.[0]?.toUpperCase()}
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 120 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: 'IBM Plex Mono', fontSize: 12, fontWeight: 600, color: '#00ff88' }}>{u.username}</span>
                        <span style={{ fontSize: 9, color: '#00ff88' }}>◆</span>
                      </div>
                      <div style={{ fontFamily: 'IBM Plex Mono', fontSize: 20, fontWeight: 700, color: scoreColor(u.score), marginTop: 2 }}>
                        {u.score ?? '—'}<span style={{ fontSize: 11, color: '#4a6080' }}>/100</span>
                      </div>
                    </div>
                    {/* Override inputs */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 2, flexWrap: 'wrap' }}>
                      <input
                        className="form-input"
                        type="number"
                        min="-50"
                        max="100"
                        placeholder="New score (-50–100)"
                        value={scoreInputs[u.id] || ''}
                        onChange={e => setScoreInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                        style={{ width: 160 }}
                      />
                      <button
                        disabled={!scoreInputs[u.id] || processing === `score-${u.id}`}
                        onClick={() => handleScoreOverride(u)}
                        style={{
                          padding: '8px 16px', background: scoreInputs[u.id] ? '#00d4ff' : 'transparent',
                          border: '1px solid #00d4ff', color: scoreInputs[u.id] ? '#000' : '#00d4ff',
                          borderRadius: 4, fontFamily: 'IBM Plex Mono', fontSize: 10, fontWeight: 700,
                          cursor: scoreInputs[u.id] ? 'pointer' : 'not-allowed',
                          transition: 'all 0.15s', letterSpacing: 1,
                          opacity: processing === `score-${u.id}` ? 0.5 : 1
                        }}
                      >
                        {processing === `score-${u.id}` ? '...' : 'SET SCORE'}
                      </button>
                    </div>
                  </div>
                ))
              }
            </>
          )}

        </div>
      </div>
    </>
  )
}
