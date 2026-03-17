import { useEffect, useState } from 'react'
import { useUser } from '../hooks/useUser'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabase'
import { usePosts } from '../hooks/usePosts'

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #080c10; }
  :root {
    --bg: #080c10; --surface: #0d1219; --surface2: #131c26;
    --border: #1e2d3d; --accent: #00d4ff; --accent2: #ff6b35;
    --verified: #00ff88; --text: #c8d6e5; --muted: #4a6080;
    --mono: 'IBM Plex Mono', monospace;
  }
  .profile-page { min-height: 100vh; background: var(--bg); color: var(--text); font-family: 'IBM Plex Sans', sans-serif; }
  .profile-topbar { height: 52px; background: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 24px; gap: 16px; }
  .profile-title { font-family: var(--mono); font-size: 12px; letter-spacing: 2px; color: var(--accent); }
  .back-btn { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 6px 14px; border-radius: 4px; font-family: var(--mono); font-size: 10px; cursor: pointer; margin-left: auto; transition: all 0.15s; }
  .back-btn:hover { color: var(--text); border-color: #2a3d54; }
  .profile-body { max-width: 700px; margin: 0 auto; padding: 32px 24px; }
  .profile-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 28px; margin-bottom: 20px; }
  .profile-header { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; }
  .profile-avatar { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #1e3a5f, #0d6efd); display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 700; color: white; border: 2px solid var(--border); flex-shrink: 0; }
  .profile-name { font-size: 20px; font-weight: 600; margin-bottom: 4px; }
  .profile-handle { font-family: var(--mono); font-size: 11px; color: var(--muted); margin-bottom: 8px; }
  .role-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 10px; font-family: var(--mono); font-size: 9px; font-weight: 600; letter-spacing: 1px; }
  .role-badge.public { background: rgba(74,96,128,0.2); color: var(--muted); border: 1px solid var(--border); }
  .role-badge.osint { background: rgba(0,255,136,0.1); color: var(--verified); border: 1px solid var(--verified); }
  .role-badge.admin { background: rgba(0,212,255,0.1); color: var(--accent); border: 1px solid var(--accent); }
  .section-label { font-family: var(--mono); font-size: 9px; letter-spacing: 2px; color: var(--muted); text-transform: uppercase; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .stat-item { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 14px; text-align: center; }
  .stat-num { font-family: var(--mono); font-size: 24px; font-weight: 700; color: var(--accent); }
  .stat-lbl { font-size: 10px; color: var(--muted); margin-top: 4px; font-family: var(--mono); letter-spacing: 1px; }
  .form-group { margin-bottom: 16px; }
  .form-label { font-family: var(--mono); font-size: 10px; letter-spacing: 1px; color: var(--muted); margin-bottom: 6px; display: block; }
  .form-input { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 4px; padding: 9px 12px; color: var(--text); font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; outline: none; transition: border-color 0.15s; }
  .form-input:focus { border-color: var(--accent); }
  .save-btn { padding: 9px 22px; background: var(--accent); color: #000; border: none; border-radius: 4px; font-family: var(--mono); font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s; letter-spacing: 1px; }
  .save-btn:hover { background: #00bde8; }
  .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .success-msg { font-family: var(--mono); font-size: 10px; color: var(--verified); margin-left: 12px; }
  .osint-banner { background: rgba(0,255,136,0.05); border: 1px solid rgba(0,255,136,0.2); border-radius: 8px; padding: 16px 20px; display: flex; align-items: center; gap: 12px; }
  .osint-banner-icon { font-size: 24px; color: var(--verified); }
  .osint-banner-title { font-family: var(--mono); font-size: 12px; color: var(--verified); font-weight: 600; margin-bottom: 3px; }
  .osint-banner-sub { font-size: 11px; color: #4a8060; }
`

export default function ProfilePage() {
  const { user } = useAuth()
  const { profile, loading, updateProfile } = useUser()
  const { fetchSavedPosts } = usePosts()
  const [savedPosts, setSavedPosts] = useState([])
  const [savesLoading, setSavesLoading] = useState(true)
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [postCount, setPostCount] = useState(0)

  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '')
      supabase
        .from('posts')
        .select('id', { count: 'exact' })
        .eq('author_id', user.id)
        .then(({ count }) => setPostCount(count || 0))
    }
  }, [profile])

  useEffect(() => {
    async function loadSaved() {
      const { data } = await fetchSavedPosts()
      setSavedPosts(data)
      setSavesLoading(false)
    }
    loadSaved()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const { error } = await updateProfile({ username })
    if (!error) {
      setSaved(true)
      // Reload after short delay so user sees success message
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    }
    setSaving(false)
  }

  if (loading) return (
    <>
      <style>{styles}</style>
      <div className="profile-page">
        <div className="profile-topbar">
          <span style={{ fontSize: 20, color: '#00d4ff' }}>⬡</span>
          <span className="profile-title">MY PROFILE</span>
          <button className="back-btn" onClick={() => navigate('/feed')}>← Back to Feed</button>
        </div>
        <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
          LOADING...
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{styles}</style>
      <div className="profile-page">
        <div className="profile-topbar">
          <span style={{ fontSize: 20, color: '#00d4ff' }}>⬡</span>
          <span className="profile-title">MY PROFILE</span>
          <button className="back-btn" onClick={() => navigate('/feed')}>← Back to Feed</button>
        </div>

        <div className="profile-body">
          {/* Profile Header Card */}
          <div className="profile-card">
            <div className="profile-header">
              <div className="profile-avatar">
                {profile?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div className="profile-name">{profile?.username || 'Unknown'}</div>
                <div className="profile-handle">@{profile?.username || 'unknown'}</div>
                <span className={`role-badge ${profile?.role || 'public'}`}>
                  {profile?.role === 'osint' ? '◆ VERIFIED OSINT' :
                   profile?.role === 'admin' ? '⬡ ADMIN' : '○ PUBLIC USER'}
                </span>
              </div>
            </div>

            {/* Verified OSINT Banner */}
            {profile?.role === 'osint' && (
              <div className="osint-banner">
                <div className="osint-banner-icon">◆</div>
                <div>
                  <div className="osint-banner-title">VERIFIED OSINT CHANNEL</div>
                  <div className="osint-banner-sub">
                    You have access to post in Intel Stories. Credibility score: {profile?.score || 0}/100
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="profile-card">
            <div className="section-label">Activity</div>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-num">{postCount}</div>
                <div className="stat-lbl">Posts</div>
              </div>
              <div className="stat-item">
                <div className="stat-num">{profile?.score || 0}</div>
                <div className="stat-lbl">Score</div>
              </div>
              <div className="stat-item">
                <div className="stat-num" style={{ fontSize: 14, paddingTop: 4 }}>
                  {profile?.role?.toUpperCase() || 'PUBLIC'}
                </div>
                <div className="stat-lbl">Role</div>
              </div>
            </div>
          </div>

          {/* Saved Posts */}
          <div className="profile-card">
            <div className="section-label">Saved Posts</div>
            {savesLoading ? (
              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>
                LOADING...
              </div>
            ) : savedPosts.length === 0 ? (
              <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)', padding:'8px 0' }}>
                No saved posts yet. Bookmark posts to see them here.
              </div>
            ) : (
              savedPosts.map(s => (
                <div key={s.id} style={{
                  borderBottom:'1px solid var(--border)',
                  padding:'12px 0'
                }}>
                  <div style={{
                    fontFamily:'var(--mono)', fontSize:11,
                    color:'var(--muted)', marginBottom:4
                  }}>
                    {s.posts?.users?.username || 'Unknown'} · ◈ saved
                  </div>
                  <div style={{ fontSize:13, color:'var(--text)', lineHeight:1.5 }}>
                    {s.posts?.body || ''}
                  </div>
                </div>
              ))
            )}
          </div>
          
          {/* Edit Profile */}
          <div className="profile-card">
            <div className="section-label">Edit Profile</div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input
                className="form-input"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="your username"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className="form-input"
                value={user?.email || ''}
                disabled
                style={{ opacity: 0.5 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'SAVING...' : 'SAVE CHANGES'}
              </button>
              {saved && <span className="success-msg">✓ Saved! Refreshing...</span>}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}