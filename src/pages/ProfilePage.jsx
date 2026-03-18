import { useEffect, useState } from 'react'
import { useUser } from '../hooks/useUser'
import { useAuth } from '../hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../api/supabase'
import { usePosts } from '../hooks/usePosts'
import PageShell from '../components/PageShell'

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
      setTimeout(() => window.location.reload(), 1000)
    }
    setSaving(false)
  }

  const card = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, padding: 28, marginBottom: 20,
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg)',
    border: '1px solid var(--border)', borderRadius: 4,
    padding: '9px 12px', color: 'var(--text)',
    fontFamily: 'var(--sans)', fontSize: 13,
    outline: 'none', transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }

  const sectionLabel = {
    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
    color: 'var(--muted)', textTransform: 'uppercase',
    marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8,
  }

  if (loading) return (
    <PageShell title="MY PROFILE">
      <div style={{ padding: 40, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
        LOADING...
      </div>
    </PageShell>
  )

  return (
    <PageShell title="MY PROFILE">
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>

        {/* Profile Header Card */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 700, color: 'var(--bg)',
              border: '2px solid var(--border)', flexShrink: 0,
              fontFamily: 'var(--mono)',
            }}>
              {profile?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 4, color: 'var(--text)', fontFamily: 'var(--sans)' }}>
                {profile?.username || 'Unknown'}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                @{profile?.username || 'unknown'}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 10,
                fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, letterSpacing: 1,
                background: profile?.role === 'osint' ? 'rgba(48,216,128,0.1)'
                  : profile?.role === 'admin' ? 'rgba(77,200,232,0.1)'
                  : 'rgba(64,72,88,0.2)',
                color: profile?.role === 'osint' ? 'var(--verified)'
                  : profile?.role === 'admin' ? 'var(--accent)'
                  : 'var(--muted)',
                border: `1px solid ${profile?.role === 'osint' ? 'var(--verified)'
                  : profile?.role === 'admin' ? 'var(--accent)'
                  : 'var(--border)'}`,
              }}>
                {profile?.role === 'osint' ? '◆ VERIFIED OSINT'
                  : profile?.role === 'admin' ? '⬡ ADMIN'
                  : '○ PUBLIC USER'}
              </span>
            </div>
          </div>

          {/* OSINT banner */}
          {profile?.role === 'osint' && (
            <div style={{
              background: 'rgba(48,216,128,0.05)',
              border: '1px solid rgba(48,216,128,0.2)',
              borderRadius: 8, padding: '16px 20px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ fontSize: 24, color: 'var(--verified)' }}>◆</div>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--verified)', fontWeight: 600, marginBottom: 3 }}>
                  VERIFIED OSINT CHANNEL
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--sans)' }}>
                  You have access to post in Intel Stories. Credibility score: {profile?.score || 0}/100
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={card}>
          <div style={sectionLabel}>
            Activity
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { num: postCount, lbl: 'Posts' },
              { num: profile?.score || 0, lbl: 'Score' },
              { num: profile?.role?.toUpperCase() || 'PUBLIC', lbl: 'Role', small: true },
            ].map(s => (
              <div key={s.lbl} style={{
                background: 'var(--surface2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 14, textAlign: 'center',
              }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)',
                  fontSize: s.small ? 14 : 24, paddingTop: s.small ? 4 : 0,
                }}>
                  {s.num}
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--mono)', letterSpacing: 1 }}>
                  {s.lbl}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Posts */}
        <div style={card}>
          <div style={sectionLabel}>
            Saved Posts
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          {savesLoading ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>LOADING...</div>
          ) : savedPosts.length === 0 ? (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', padding: '8px 0' }}>
              No saved posts yet. Bookmark posts to see them here.
            </div>
          ) : savedPosts.map(s => (
            <div key={s.id} style={{ borderBottom: '1px solid var(--border)', padding: '12px 0' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>
                {s.posts?.users?.username || 'Unknown'} · ◈ saved
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
                {s.posts?.body || ''}
              </div>
            </div>
          ))}
        </div>

        {/* Edit Profile */}
        <div style={card}>
          <div style={sectionLabel}>
            Edit Profile
            <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>
              USERNAME
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="your username"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 1, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>
              EMAIL
            </label>
            <input
              value={user?.email || ''}
              disabled
              style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '9px 22px', background: 'var(--accent)',
                color: 'var(--bg)', border: 'none', borderRadius: 4,
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.5 : 1, letterSpacing: 1,
                transition: 'all 0.15s',
              }}
            >
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
            {saved && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--verified)' }}>
                ✓ Saved! Refreshing...
              </span>
            )}
          </div>
        </div>

        <div style={{ height: 40 }} />
      </div>
    </PageShell>
  )
}