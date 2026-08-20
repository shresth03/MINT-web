import { useState, useEffect } from 'react'
import { supabase } from '../../api/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import PageShell from '../../components/PageShell'
import { Check, X, Cpu, ChevronUp, ChevronDown, BadgeCheck, Flag, Clock, RefreshCw, CircleDot } from 'lucide-react'
import { computeScore } from '../../hooks/useCredibility'

const FEATURES_META = {
  intel_feed: 'Intel Feed', general_feed: 'General Feed', following_feed: 'Following Feed',
  posting: 'Posting', replies: 'Replies', reposts: 'Reposts & Quote Posts',
  likes: 'Likes', media_upload: 'Media Upload', saved_posts: 'Saved Posts',
  story_composer: 'Story Composer', story_threading: 'Story Threading',
  ai_headline: 'AI Headline', ai_summary: 'AI Summary', auto_clustering: 'Auto Clustering',
  confidence_score: 'Confidence Score', community_notes: 'Community Notes',
  claims: 'Claims System', credibility: 'Credibility Scores', leaderboard: 'Leaderboard',
  search: 'Search', trending: 'Trending', event_map: 'Event Map',
  channel_page: 'Channel Pages', following: 'Follow System', messages: 'Direct Messages',
  notifications: 'Notifications', osint_application: 'OSINT Application',
  auth: 'Login / Signup', settings: 'Settings', mobile: 'Mobile Experience',
  performance: 'Performance', design: 'Design & UI', dark_theme: 'Theme', overall: 'Overall'
}

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

const CLAIM_LABELS = {
  open:       { label: 'OPEN',       color: '#ff9f43' },
  verified:   { label: 'VERIFIED',   color: 'var(--verified)' },
  false:      { label: 'FALSE',      color: '#ff4757' },
  developing: { label: 'DEVELOPING', color: 'var(--accent)' },
  reversed:   { label: 'REVERSED',   color: 'var(--warn)' },
}

function scoreColor(score) {
  if (score === null || score === undefined) return 'var(--muted)'
  if (score >= 75) return 'var(--verified)'
  if (score >= 50) return 'var(--accent)'
  if (score >= 0)  return 'var(--warn)'
  return '#ff4757'
}

function StatusBadge({ status }) {
  const colors = {
    pending:    { bg: 'rgba(232,160,32,0.15)',  color: 'var(--warn)',      border: 'var(--warn)' },
    approved:   { bg: 'rgba(48,216,128,0.15)',  color: 'var(--verified)', border: 'var(--verified)' },
    rejected:   { bg: 'rgba(232,72,72,0.15)',   color: 'var(--accent2)',  border: 'var(--accent2)' },
    open:       { bg: 'rgba(255,159,67,0.15)',  color: '#ff9f43',         border: '#ff9f43' },
    verified:   { bg: 'rgba(48,216,128,0.15)',  color: 'var(--verified)', border: 'var(--verified)' },
    false:      { bg: 'rgba(255,71,87,0.15)',   color: '#ff4757',         border: '#ff4757' },
    developing: { bg: 'rgba(77,200,232,0.15)',  color: 'var(--accent)',   border: 'var(--accent)' },
    reversed:   { bg: 'rgba(232,160,32,0.15)',  color: 'var(--warn)',     border: 'var(--warn)' },
  }
  const s = colors[status] || colors.pending
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 10,
      fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, letterSpacing: 1,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {status.toUpperCase()}
    </span>
  )
}

function StartingScoreChip({ userId }) {
  const [score, setScore] = useState(null)
  const [postCount, setPostCount] = useState(null)

  useEffect(() => {
    if (!userId) return
    computeScore(userId).then(({ score: s, breakdown }) => {
      setScore(s)
      setPostCount(breakdown?.totalPosts ?? 0)
    })
  }, [userId])

  if (score === null) {
    return (
      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
        computing…
      </span>
    )
  }

  const color = score >= 80 ? 'var(--verified)' : score >= 60 ? '#ff9f43' : 'var(--accent2)'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
      <span style={{
        fontFamily: 'var(--mono)', fontSize: 16, fontWeight: 700, color,
      }}>
        {score}
      </span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>
        {postCount} NEWS POST{postCount !== 1 ? 'S' : ''}
      </span>
    </div>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('applications')
  const [applications, setApplications] = useState([])
  const [claims, setClaims] = useState([])
  const [osintUsers, setOsintUsers] = useState([])
  const [reporters, setReporters] = useState([])
  const [publicUsers, setPublicUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState({})
  const [expandedClaim, setExpandedClaim] = useState(null)
  const [claimNotes, setClaimNotes] = useState({})
  const [scoreInputs, setScoreInputs] = useState({})
  const [feedback, setFeedback] = useState([])

  async function loadApplications() {
    const { data } = await supabase.from('osint_applications').select('*').order('created_at', { ascending: false })
    setApplications(data || [])
  }

  async function loadFeedback() {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
    setFeedback(data || [])
  }

  async function loadClaims() {
    const { data } = await supabase
      .from('claims')
      .select(`*, posts (id, body, author_id, created_at, users!posts_author_id_fkey (username, role, score))`)
      .order('created_at', { ascending: false })
    setClaims(data || [])
  }

  async function loadOsintUsers() {
    const { data } = await supabase.from('users').select('id, username, score, role').eq('role', 'osint').order('score', { ascending: false })
    setOsintUsers(data || [])
  }

  async function loadReportersAndPublic() {
    const { data: rData } = await supabase.from('users').select('id, username, role, created_at').eq('role', 'reporter').order('created_at', { ascending: false })
    const { data: pData } = await supabase.from('users').select('id, username, role, created_at').eq('role', 'public').order('created_at', { ascending: false }).limit(50)
    setReporters(rData || [])
    setPublicUsers(pData || [])
  }

  async function assignRole(userId, newRole) {
    await supabase.from('users').update({ role: newRole }).eq('id', userId)
    await loadReportersAndPublic()
  }

  async function checkAdminAndLoad() {
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (!data || data.role !== 'admin') { navigate('/feed'); return }
    setUserRole('admin')
    await Promise.all([loadApplications(), loadClaims(), loadOsintUsers(), loadFeedback(), loadReportersAndPublic()])
    setLoading(false)
  }

  useEffect(() => { checkAdminAndLoad() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function loadClaimNotes(claimId, postId) {
    if (claimNotes[claimId]) { setExpandedClaim(expandedClaim === claimId ? null : claimId); return }
    const { data } = await supabase
      .from('community_notes')
      .select(`*, users!community_notes_author_id_fkey (username, role)`)
      .eq('post_id', postId).order('created_at', { ascending: false })
    setClaimNotes(prev => ({ ...prev, [claimId]: data || [] }))
    setExpandedClaim(claimId)
  }

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

  async function handleResolveClaim(claimId, status) {
    setProcessing(claimId)
    const note = resolutionNotes[claimId] || null
    await supabase.from('claims').update({ status, resolved_by: user.id, resolved_at: new Date().toISOString(), resolution_note: note }).eq('id', claimId)
    setClaims(prev => prev.map(c => c.id === claimId ? { ...c, status, resolution_note: note } : c))
    setProcessing(null)
  }

  async function handleRateNote(noteId, claimId, rating) {
    setProcessing(`note-${noteId}`)
    await supabase.from('community_notes').update({ accuracy_rating: rating }).eq('id', noteId)
    setClaimNotes(prev => ({ ...prev, [claimId]: (prev[claimId] || []).map(n => n.id === noteId ? { ...n, accuracy_rating: rating } : n) }))
    setProcessing(null)
  }

  async function handleScoreOverride(targetUser) {
    const newScore = parseInt(scoreInputs[targetUser.id])
    if (isNaN(newScore) || newScore < -50 || newScore > 100) { alert('Score must be between -50 and 100'); return }
    setProcessing(`score-${targetUser.id}`)
    const clamped = Math.max(-50, Math.min(100, newScore))
    await supabase.from('users').update({ score: clamped }).eq('id', targetUser.id)
    await supabase.from('notifications').insert({ to_user_id: targetUser.id, from_user_id: user.id, type: 'score_override', post_id: null })
    setOsintUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, score: clamped } : u))
    setScoreInputs(prev => ({ ...prev, [targetUser.id]: '' }))
    setProcessing(null)
  }

  const pending = applications.filter(a => a.status === 'pending')
  const reviewed = applications.filter(a => a.status !== 'pending')
  const openClaims = claims.filter(c => c.status === 'open')
  const resolvedClaims = claims.filter(c => c.status !== 'open')

  // shared styles
  const card = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '18px 20px', marginBottom: 12, transition: 'border-color 0.15s' }
  const fieldLabel = { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 3 }
  const fieldValue = { fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, fontFamily: 'var(--sans)' }
  const sectionTitle = { fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 2, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }
  const emptyState = { textAlign: 'center', padding: 40, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', letterSpacing: 1 }
  const avatarStyle = { width: 38, height: 38, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--bg)', flexShrink: 0, fontFamily: 'var(--mono)' }

  function actionBtn(variant) {
    const map = {
      approve:    { bg: 'var(--verified)',  color: '#000',            border: 'var(--verified)' },
      reject:     { bg: 'transparent',      color: 'var(--accent2)',  border: 'var(--accent2)' },
      verified:   { bg: 'var(--verified)',  color: '#000',            border: 'var(--verified)' },
      false:      { bg: 'transparent',      color: '#ff4757',         border: '#ff4757' },
      developing: { bg: 'transparent',      color: 'var(--accent)',   border: 'var(--accent)' },
      reversed:   { bg: 'transparent',      color: 'var(--warn)',     border: 'var(--warn)' },
    }
    const s = map[variant] || map.reject
    return {
      padding: '7px 18px', borderRadius: 4, fontFamily: 'var(--mono)',
      fontSize: 10, letterSpacing: 1, cursor: 'pointer',
      border: `1px solid ${s.border}`, background: s.bg, color: s.color,
      transition: 'all 0.15s', fontWeight: 600,
    }
  }

  if (!userRole) return null

  return (
    <PageShell title="MINT — ADMIN DASHBOARD" showBack={false}>

      {/* Sticky tab bar */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', padding: '0 24px',
        position: 'sticky', top: 52, zIndex: 99,
      }}>
        {[
          { id: 'applications', label: `Applications (${pending.length})` },
          { id: 'claims',       label: `Claims (${openClaims.length} open)` },
          { id: 'scores',       label: 'Score Override' },
          { id: 'reporters',    label: 'Reporters' },
          { id: 'feedback',     label: `Feedback (${feedback.length})` },
        ].map(t => (
          <div
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '12px 20px', fontFamily: 'var(--mono)', fontSize: 10,
              letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer',
              color: activeTab === t.id ? 'var(--accent)' : 'var(--muted)',
              borderBottom: `2px solid ${activeTab === t.id ? 'var(--accent)' : 'transparent'}`,
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>

        {/* ══ APPLICATIONS ══ */}
        {activeTab === 'applications' && (
          <>
            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
              {[
                { label: 'Total',    val: applications.length,                                    color: 'var(--accent)' },
                { label: 'Pending',  val: pending.length,                                         color: 'var(--warn)' },
                { label: 'Approved', val: applications.filter(a => a.status === 'approved').length, color: 'var(--verified)' },
                { label: 'Rejected', val: applications.filter(a => a.status === 'rejected').length, color: 'var(--accent2)' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, minWidth: 120, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'var(--muted)', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 26, fontWeight: 700, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            <div style={sectionTitle}>⚑ Pending Review ({pending.length})<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>

            {loading ? <div style={emptyState}>LOADING...</div>
              : pending.length === 0 ? <div style={emptyState}>No pending applications</div>
              : pending.map(app => (
                <div key={app.id} style={card}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                    <div style={avatarStyle}>{app.channel_name?.[0]?.toUpperCase() || 'C'}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{app.channel_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{app.handle}</div>
                    </div>
                    <StatusBadge status="pending" />
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{timeAgo(app.created_at)}</div>
                    <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1, marginBottom: 2 }}>STARTING SCORE</div>
                      <StartingScoreChip userId={app.user_id} />
                    </div>
                  </div>
                  {app.portfolio && <div style={{ marginBottom: 8 }}><div style={fieldLabel}>Portfolio</div><div style={fieldValue}>{app.portfolio}</div></div>}
                  {app.why && <div style={{ marginBottom: 8 }}><div style={fieldLabel}>Why they should be approved</div><div style={fieldValue}>{app.why}</div></div>}
                  <div style={{ marginBottom: 8 }}><div style={fieldLabel}>User ID</div><div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{app.user_id}</div></div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    <button style={actionBtn('approve')} disabled={processing === app.id} onClick={() => handleApprove(app)}>
                      {processing === app.id ? 'PROCESSING...' : <><Check size={10} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />APPROVE</>}
                    </button>
                    <button style={actionBtn('reject')} disabled={processing === app.id} onClick={() => handleReject(app)}><X size={10} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />REJECT</button>
                  </div>
                </div>
              ))
            }

            {reviewed.length > 0 && (
              <>
                <div style={{ ...sectionTitle, marginTop: 32 }}><Cpu size={12} style={{display:'inline',verticalAlign:'middle',marginRight:6}} />Previously Reviewed ({reviewed.length})<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>
                {reviewed.map(app => (
                  <div key={app.id} style={{ ...card, opacity: 0.7 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={avatarStyle}>{app.channel_name?.[0]?.toUpperCase() || 'C'}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{app.channel_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{app.handle}</div>
                      </div>
                      <StatusBadge status={app.status} />
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginLeft: 'auto' }}>{timeAgo(app.created_at)}</div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* ══ CLAIMS ══ */}
        {activeTab === 'claims' && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
              {[
                { label: 'Open',       val: openClaims.length,                                    color: '#ff9f43' },
                { label: 'Verified',   val: claims.filter(c => c.status === 'verified').length,   color: 'var(--verified)' },
                { label: 'False',      val: claims.filter(c => c.status === 'false').length,      color: '#ff4757' },
                { label: 'Developing', val: claims.filter(c => c.status === 'developing').length, color: 'var(--accent)' },
                { label: 'Reversed',   val: claims.filter(c => c.status === 'reversed').length,   color: 'var(--warn)' },
              ].map(s => (
                <div key={s.label} style={{ flex: 1, minWidth: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'var(--muted)', marginBottom: 6 }}>{s.label}</div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            <div style={sectionTitle}>⚑ Open Claims ({openClaims.length})<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>

            {loading ? <div style={emptyState}>LOADING...</div>
              : openClaims.length === 0 ? <div style={emptyState}>No open claims — all clear</div>
              : openClaims.map(claim => (
                <div key={claim.id} style={card}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div style={{ ...avatarStyle, background: 'rgba(232,72,72,0.2)', fontSize: 16 }}>⚑</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
                        POST BY <span style={{ color: 'var(--verified)' }}>{claim.posts?.users?.username || 'Unknown'}</span>
                        {' · '}<span>Score: {claim.posts?.users?.score ?? 'N/A'}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
                        {(claim.posts?.body || '').slice(0, 200)}{(claim.posts?.body || '').length > 200 ? '…' : ''}
                      </div>
                    </div>
                    <StatusBadge status="open" />
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{timeAgo(claim.created_at)}</div>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={fieldLabel}>Resolution Note (optional)</div>
                    <input
                      placeholder="e.g. Confirmed by official source..."
                      value={resolutionNotes[claim.id] || ''}
                      onChange={e => setResolutionNotes(prev => ({ ...prev, [claim.id]: e.target.value }))}
                      style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['verified', 'false', 'developing', 'reversed'].map(status => (
                      <button key={status} style={actionBtn(status)} disabled={processing === claim.id} onClick={() => handleResolveClaim(claim.id, status)}>
                        {processing === claim.id ? '...' : {
                          verified:   <><Check size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />VERIFIED</>,
                          false:      <><X size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />FALSE</>,
                          developing: <><Clock size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />DEVELOPING</>,
                          reversed:   <><RefreshCw size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />REVERSED</>,
                        }[status]}
                      </button>
                    ))}
                    <button
                      onClick={() => loadClaimNotes(claim.id, claim.post_id)}
                      style={{ marginLeft: 'auto', padding: '7px 14px', background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, cursor: 'pointer' }}
                    >
                      {expandedClaim === claim.id
                        ? <><ChevronUp size={10} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />HIDE NOTES</>
                        : <><ChevronDown size={10} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />VIEW NOTES</>
                      }
                    </button>
                  </div>

                  {expandedClaim === claim.id && claimNotes[claim.id] && (
                    <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                      <div style={{ ...fieldLabel, marginBottom: 10 }}>Community Notes ({claimNotes[claim.id].length})</div>
                      {claimNotes[claim.id].length === 0 ? (
                        <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>No notes yet</div>
                      ) : claimNotes[claim.id].map(note => (
                        <div key={note.id} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: note.users?.role === 'osint' ? 'var(--verified)' : 'var(--text)' }}>
                              {note.users?.username || 'Unknown'}
                              {note.users?.role === 'osint' && <BadgeCheck size={10} style={{ marginLeft: 4, display:'inline', verticalAlign:'middle' }} />}
                            </span>
                            <span style={{
                              padding: '2px 8px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 9,
                              background: note.stance === 'challenges' ? 'rgba(255,71,87,0.12)' : 'rgba(48,216,128,0.1)',
                              color: note.stance === 'challenges' ? '#ff4757' : 'var(--verified)',
                              border: `1px solid ${note.stance === 'challenges' ? '#ff475733' : 'rgba(48,216,128,0.2)'}`,
                            }}>
                              {note.stance === 'challenges'
                                ? <><Flag size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />CHALLENGES</>
                                : <><Check size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />SUPPORTS</>
                              }
                            </span>
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>wt:{note.weight}</span>
                            {note.accuracy_rating && (
                              <span style={{
                                padding: '2px 8px', borderRadius: 3, fontFamily: 'var(--mono)', fontSize: 9,
                                background: note.accuracy_rating === 'accurate' ? 'rgba(48,216,128,0.1)' : 'rgba(255,71,87,0.12)',
                                color: note.accuracy_rating === 'accurate' ? 'var(--verified)' : '#ff4757',
                              }}>
                                {note.accuracy_rating === 'accurate'
                                  ? <><Check size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />ACCURATE</>
                                  : <><X size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />INACCURATE</>
                                }
                              </span>
                            )}
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                              {[
                                { rating: 'accurate',   label: 'ACCURATE',   color: 'var(--verified)' },
                                { rating: 'inaccurate', label: 'INACCURATE', color: '#ff4757' },
                              ].map(r => (
                                <button key={r.rating}
                                  disabled={processing === `note-${note.id}` || note.accuracy_rating === r.rating}
                                  onClick={() => handleRateNote(note.id, claim.id, r.rating)}
                                  style={{
                                    padding: '4px 10px', borderRadius: 4,
                                    fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600,
                                    cursor: note.accuracy_rating === r.rating ? 'not-allowed' : 'pointer',
                                    background: `${r.color}18`, border: `1px solid ${r.color}`,
                                    color: r.color, opacity: note.accuracy_rating === r.rating ? 0.4 : 1,
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  {r.label}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>{note.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            }

            {resolvedClaims.length > 0 && (
              <>
                <div style={{ ...sectionTitle, marginTop: 32 }}><Cpu size={12} style={{display:'inline',verticalAlign:'middle',marginRight:6}} />Resolved Claims ({resolvedClaims.length})<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>
                {resolvedClaims.map(claim => {
                  const cs = CLAIM_LABELS[claim.status] || {}
                  return (
                    <div key={claim.id} style={{ ...card, opacity: 0.65 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
                            POST BY <span style={{ color: 'var(--muted)' }}>{claim.posts?.users?.username || 'Unknown'}</span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
                            {(claim.posts?.body || '').slice(0, 120)}{(claim.posts?.body || '').length > 120 ? '…' : ''}
                          </div>
                          {claim.resolution_note && (
                            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 6 }}>
                              Note: {claim.resolution_note}
                            </div>
                          )}
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, letterSpacing: 1, color: cs.color, padding: '3px 10px', borderRadius: 10, border: `1px solid ${cs.color}44`, background: `${cs.color}18` }}>
                          {cs.label || claim.status.toUpperCase()}
                        </span>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{timeAgo(claim.created_at)}</div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </>
        )}

        {/* ══ SCORE OVERRIDE ══ */}
        {activeTab === 'scores' && (
          <>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', marginBottom: 24 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: '#ff9f43', marginBottom: 6, letterSpacing: 1 }}>⚠ MANUAL OVERRIDE</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, fontFamily: 'var(--sans)' }}>
                Manually setting a score bypasses the credibility formula. Use only when the algorithm produces an incorrect result. All overrides are logged and visible to the affected user.
              </div>
            </div>

            <div style={sectionTitle}><BadgeCheck size={12} style={{display:'inline',verticalAlign:'middle',marginRight:6}} />OSINT Analysts ({osintUsers.length})<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>

            {loading ? <div style={emptyState}>LOADING...</div>
              : osintUsers.length === 0 ? <div style={emptyState}>No OSINT analysts yet</div>
              : osintUsers.map((u, i) => (
                <div key={u.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, minWidth: 28, textAlign: 'center', color: i === 0 ? '#ff9f43' : i === 1 ? 'var(--muted)' : i === 2 ? '#8a6a2a' : 'var(--border)' }}>
                    {i + 1}
                  </div>
                  <div style={{ ...avatarStyle, width: 36, height: 36, fontSize: 13 }}>
                    {u.username?.[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--verified)' }}>{u.username}</span>
                      <BadgeCheck size={10} style={{ color: 'var(--verified)' }} />
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: scoreColor(u.score), marginTop: 2 }}>
                      {u.score ?? '—'}<span style={{ fontSize: 11, color: 'var(--muted)' }}>/100</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 2, flexWrap: 'wrap' }}>
                    <input
                      type="number" min="-50" max="100"
                      placeholder="New score (-50–100)"
                      value={scoreInputs[u.id] || ''}
                      onChange={e => setScoreInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                      style={{ width: 160, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 4, padding: '8px 12px', color: 'var(--text)', fontFamily: 'var(--sans)', fontSize: 12, outline: 'none', boxSizing: 'border-box' }}
                      onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                    <button
                      disabled={!scoreInputs[u.id] || processing === `score-${u.id}`}
                      onClick={() => handleScoreOverride(u)}
                      style={{
                        padding: '8px 16px', borderRadius: 4,
                        fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                        letterSpacing: 1, transition: 'all 0.15s',
                        background: scoreInputs[u.id] ? 'var(--accent)' : 'transparent',
                        border: '1px solid var(--accent)',
                        color: scoreInputs[u.id] ? 'var(--bg)' : 'var(--accent)',
                        cursor: scoreInputs[u.id] ? 'pointer' : 'not-allowed',
                        opacity: processing === `score-${u.id}` ? 0.5 : 1,
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
        {/* ══ REPORTERS ══ */}
        {activeTab === 'reporters' && (
          <>
            <div style={sectionTitle}><Cpu size={12} style={{display:'inline',verticalAlign:'middle',marginRight:6}} />Active Reporters ({reporters.length})<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>
            {reporters.length === 0
              ? <div style={emptyState}>No reporters yet</div>
              : reporters.map(u => (
                <div key={u.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ ...avatarStyle, width: 32, height: 32, fontSize: 12 }}>{u.username?.[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{u.username}</span>
                    <span style={{ marginLeft: 6, fontSize: 9, color: 'var(--accent)', display:'flex', alignItems:'center', gap:3 }}><Cpu size={9} />REPORTER</span>
                  </div>
                  <button onClick={() => assignRole(u.id, 'public')} disabled={processing === u.id} style={{ padding: '5px 12px', background: 'transparent', border: '1px solid var(--accent2)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--accent2)', cursor: 'pointer' }}>
                    REVOKE
                  </button>
                </div>
              ))
            }

            <div style={{ ...sectionTitle, marginTop: 28 }}><CircleDot size={12} style={{display:'inline',verticalAlign:'middle',marginRight:6}} />Public Users — Assign Reporter ({publicUsers.length})<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>
            {publicUsers.length === 0
              ? <div style={emptyState}>No public users</div>
              : publicUsers.map(u => (
                <div key={u.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ ...avatarStyle, width: 32, height: 32, fontSize: 12, background: 'var(--surface2)' }}>{u.username?.[0]?.toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>{u.username}</span>
                  </div>
                  <button onClick={() => assignRole(u.id, 'reporter')} disabled={processing === u.id} style={{ padding: '5px 12px', background: 'rgba(0,212,255,0.08)', border: '1px solid var(--accent)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--accent)', cursor: 'pointer' }}>
                    MAKE REPORTER
                  </button>
                </div>
              ))
            }
          </>
        )}

        {/* ══ FEEDBACK ══ */}
        {activeTab === 'feedback' && (
          <>
            {/* Stats */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
              {['very_bad', 'bad', 'okay', 'good', 'very_good'].map(r => {
                const color = { very_bad: '#e84848', bad: 'var(--accent2)', okay: 'var(--warn)', good: 'var(--accent)', very_good: 'var(--verified)' }[r]
                const label = { very_bad: 'Very Bad', bad: 'Bad', okay: 'Okay', good: 'Good', very_good: 'Very Good' }[r]
                const count = feedback.reduce((acc, f) => {
                  return acc + Object.values(f.ratings || {}).filter(v => v?.rating === r).length
                }, 0)
                return (
                  <div key={r} style={{ flex: 1, minWidth: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px' }}>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color }}>{count}</div>
                  </div>
                )
              })}
            </div>

            <div style={sectionTitle}><Cpu size={12} style={{display:'inline',verticalAlign:'middle',marginRight:6}} />Submissions ({feedback.length})<span style={{ flex: 1, height: 1, background: 'var(--border)' }} /></div>

            {loading ? <div style={emptyState}>LOADING...</div>
              : feedback.length === 0 ? <div style={emptyState}>No feedback submitted yet</div>
              : feedback.map(f => (
                <div key={f.id} style={{ ...card, marginBottom: 16 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ ...avatarStyle, background: 'var(--surface2)' }}>
                      {(f.username || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', fontWeight: 600 }}>
                        {f.username || 'Anonymous'}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
                        {timeAgo(f.created_at)}
                      </div>
                    </div>
                    {/* Rating summary */}
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {['very_bad', 'bad', 'okay', 'good', 'very_good'].map(r => {
                        const color = { very_bad: '#e84848', bad: 'var(--accent2)', okay: 'var(--warn)', good: 'var(--accent)', very_good: 'var(--verified)' }[r]
                        const label = { very_bad: 'Very Bad', bad: 'Bad', okay: 'Okay', good: 'Good', very_good: 'Very Good' }[r]
                        const count = Object.values(f.ratings || {}).filter(v => v?.rating === r).length
                        if (count === 0) return null
                        return (
                          <span key={r} style={{ fontFamily: 'var(--mono)', fontSize: 9, color, padding: '2px 8px', border: `1px solid ${color}44`, borderRadius: 3 }}>
                            {label} × {count}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  {/* Feature ratings */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: f.overall_comment ? 14 : 0 }}>
                    {Object.entries(f.ratings || {}).map(([featureId, val]) => {
                      if (!val?.rating && !val?.comment) return null
                      const feature = FEATURES_META[featureId] || featureId.replace(/_/g, ' ')
                      const ratingColor = { very_bad: '#e84848', bad: 'var(--accent2)', okay: 'var(--warn)', good: 'var(--accent)', very_good: 'var(--verified)' }[val.rating] || 'var(--muted)'
                      const ratingLabel = { very_bad: 'Very Bad', bad: 'Bad', okay: 'Okay', good: 'Good', very_good: 'Very Good' }[val.rating] || '—'
                      return (
                        <div key={featureId} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 10px', background: 'var(--bg)', borderRadius: 4 }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', minWidth: 160 }}>{feature}</div>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: ratingColor, padding: '2px 6px', border: `1px solid ${ratingColor}44`, borderRadius: 3, flexShrink: 0 }}>
                            {ratingLabel}
                          </span>
                          {val.comment && (
                            <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
                              {val.comment}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Overall comment */}
                  {f.overall_comment && (
                    <div style={{ padding: '10px 14px', background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)', borderRadius: 6 }}>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--accent)', marginBottom: 6, letterSpacing: 1 }}>OVERALL COMMENTS</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, fontFamily: 'var(--sans)' }}>{f.overall_comment}</div>
                    </div>
                  )}
                </div>
              ))
            }
          </>
        )}
      </div>
    </PageShell>
  )
}