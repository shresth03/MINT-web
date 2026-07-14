// FILE: src/pages/SettingsPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUser } from '../hooks/useUser'
import { useTheme } from '../hooks/useTheme'
import PageShell from '../components/PageShell'
import ThemeToggle from '../components/ThemeToggle'

export default function SettingsPage() {
  const { user, signOut, resetPassword } = useAuth()
  const { profile, updateProfile } = useUser()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  // Account
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Security
  const [resetSent, setResetSent] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  // Notifications
  const [notifMentions, setNotifMentions] = useState(true)
  const [notifFollows, setNotifFollows] = useState(true)
  const [notifBreaking, setNotifBreaking] = useState(true)

  // Danger zone
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (profile) setUsername(profile.username || '')
  }, [profile])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('mint_notif_prefs')
      if (raw) {
        const prefs = JSON.parse(raw)
        if (typeof prefs.mentions === 'boolean') setNotifMentions(prefs.mentions)
        if (typeof prefs.follows === 'boolean') setNotifFollows(prefs.follows)
        if (typeof prefs.breaking === 'boolean') setNotifBreaking(prefs.breaking)
      }
    } catch (_) { /* ignore */ }
  }, [])

  function saveNotifPrefs(overrides) {
    const prefs = {
      mentions: notifMentions,
      follows: notifFollows,
      breaking: notifBreaking,
      ...overrides,
    }
    localStorage.setItem('mint_notif_prefs', JSON.stringify(prefs))
  }

  function toggleMentions() {
    const next = !notifMentions
    setNotifMentions(next)
    saveNotifPrefs({ mentions: next })
  }
  function toggleFollows() {
    const next = !notifFollows
    setNotifFollows(next)
    saveNotifPrefs({ follows: next })
  }
  function toggleBreaking() {
    const next = !notifBreaking
    setNotifBreaking(next)
    saveNotifPrefs({ breaking: next })
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    const { error } = await updateProfile({ username })
    if (!error) setSaved(true)
    setSaving(false)
  }

  async function handleResetPassword() {
    if (!user?.email) return
    setResetLoading(true)
    setResetError('')
    setResetSent(false)
    const { error } = await resetPassword(user.email)
    setResetLoading(false)
    if (error) setResetError(error.message)
    else setResetSent(true)
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  // ── shared style objects ──

  const card = {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: '24px 28px',
    marginBottom: 20,
  }

  const dangerCard = {
    ...card,
    borderColor: 'rgba(255,71,87,0.3)',
  }

  const inputStyle = {
    width: '100%',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    padding: '9px 12px',
    color: 'var(--text)',
    fontFamily: 'var(--sans)',
    fontSize: 13,
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  }

  const labelStyle = {
    fontFamily: 'var(--mono)',
    fontSize: 10,
    letterSpacing: 1,
    color: 'var(--muted)',
    marginBottom: 6,
    display: 'block',
    textTransform: 'uppercase',
  }

  function SectionLabel({ children, danger }) {
    return (
      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: 9,
        letterSpacing: 2,
        color: danger ? 'var(--accent2)' : 'var(--muted)',
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        textTransform: 'uppercase',
      }}>
        {children}
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
    )
  }

  function NotifRow({ label, desc, enabled, onToggle }) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 0', borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', marginBottom: 3 }}>
            {label}
          </div>
          <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)' }}>
            {desc}
          </div>
        </div>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--mono)',
            fontSize: 18,
            color: enabled ? 'var(--accent)' : 'var(--muted)',
            transition: 'color 0.15s',
            flexShrink: 0,
            marginLeft: 16,
            lineHeight: 1,
            padding: 0,
          }}
          title={enabled ? 'Click to disable' : 'Click to enable'}
        >
          {enabled ? '●' : '○'}
        </button>
      </div>
    )
  }

  const roleBadgeStyle = {
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
  }

  return (
    <PageShell title="SETTINGS">
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── ACCOUNT ── */}
        <div style={card}>
          <SectionLabel>Account</SectionLabel>

          {/* Avatar + role */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700,
              color: 'var(--bg)', flexShrink: 0,
            }}>
              {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 5 }}>
                {profile?.username || user?.email || '—'}
              </div>
              <span style={roleBadgeStyle}>
                {profile?.role === 'osint' ? '◆ VERIFIED OSINT'
                  : profile?.role === 'admin' ? '⬡ ADMIN'
                  : '○ PUBLIC USER'}
              </span>
            </div>
          </div>

          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Username</label>
            <input
              value={username}
              onChange={e => { setUsername(e.target.value); setSaved(false) }}
              placeholder="your username"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Email (read-only) */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Email</label>
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
                padding: '9px 22px',
                background: saving ? 'var(--border)' : 'var(--accent)',
                color: saving ? 'var(--muted)' : 'var(--bg)',
                border: 'none', borderRadius: 4,
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: 1, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1, transition: 'all 0.15s',
              }}
            >
              {saving ? 'SAVING...' : 'SAVE CHANGES'}
            </button>
            {saved && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--verified)' }}>
                ✓ Saved!
              </span>
            )}
          </div>
        </div>

        {/* ── SECURITY ── */}
        <div style={card}>
          <SectionLabel>Security</SectionLabel>

          <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Send a password reset link to your email address.
          </p>

          {resetError && (
            <div style={{
              background: 'rgba(232,72,72,0.1)', border: '1px solid var(--accent2)',
              borderRadius: 4, padding: '10px 14px', color: 'var(--accent2)',
              fontSize: 12, marginBottom: 14, fontFamily: 'var(--sans)',
            }}>
              {resetError}
            </div>
          )}

          {resetSent ? (
            <div style={{
              background: 'rgba(48,216,128,0.08)', border: '1px solid var(--verified)',
              borderRadius: 4, padding: '10px 14px', color: 'var(--verified)',
              fontSize: 12, fontFamily: 'var(--sans)',
            }}>
              ✓ Reset link sent to your inbox.
            </div>
          ) : (
            <button
              onClick={handleResetPassword}
              disabled={resetLoading}
              style={{
                padding: '9px 22px',
                background: 'transparent',
                color: resetLoading ? 'var(--muted)' : 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 4,
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: 1, cursor: resetLoading ? 'not-allowed' : 'pointer',
                opacity: resetLoading ? 0.6 : 1, transition: 'all 0.15s',
              }}
              onMouseOver={e => { if (!resetLoading) e.currentTarget.style.background = 'rgba(77,200,232,0.07)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
            >
              {resetLoading ? 'SENDING...' : 'SEND RESET LINK'}
            </button>
          )}
        </div>

        {/* ── APPEARANCE ── */}
        <div style={card}>
          <SectionLabel>Appearance</SectionLabel>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10,
          }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text)', marginBottom: 3 }}>
                Theme
              </div>
              <div style={{ fontFamily: 'var(--sans)', fontSize: 12, color: 'var(--muted)' }}>
                Toggle between Ghost (light) and Void (dark) themes.
              </div>
            </div>
            <ThemeToggle theme={theme} onToggle={toggleTheme} />
          </div>
        </div>

        {/* ── NOTIFICATIONS ── */}
        <div style={card}>
          <SectionLabel>Notifications</SectionLabel>

          <NotifRow
            label="Mentions"
            desc="Notify when someone @mentions you"
            enabled={notifMentions}
            onToggle={toggleMentions}
          />
          <NotifRow
            label="Follows"
            desc="Notify when a new analyst follows you"
            enabled={notifFollows}
            onToggle={toggleFollows}
          />
          <div style={{ borderBottom: 'none' }}>
            <NotifRow
              label="Breaking events"
              desc="Notify when a breaking intel event is flagged"
              enabled={notifBreaking}
              onToggle={toggleBreaking}
            />
          </div>
        </div>

        {/* ── DANGER ZONE ── */}
        <div style={dangerCard}>
          <SectionLabel danger>Danger Zone</SectionLabel>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: showDeleteConfirm ? 20 : 0 }}>
            {/* Sign out */}
            <button
              onClick={handleSignOut}
              style={{
                padding: '9px 20px',
                background: 'transparent',
                color: 'var(--accent2)',
                border: '1px solid var(--accent2)',
                borderRadius: 4,
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                letterSpacing: 1, cursor: 'pointer',
                transition: 'all 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'rgba(232,72,72,0.08)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
            >
              SIGN OUT
            </button>

            {/* Delete account */}
            {!showDeleteConfirm && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '9px 20px',
                  background: 'var(--accent2)',
                  color: '#fff',
                  border: '1px solid var(--accent2)',
                  borderRadius: 4,
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                  letterSpacing: 1, cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseOver={e => { e.currentTarget.style.opacity = '0.85' }}
                onMouseOut={e => { e.currentTarget.style.opacity = '1' }}
              >
                DELETE ACCOUNT
              </button>
            )}
          </div>

          {/* Inline delete confirmation */}
          {showDeleteConfirm && (
            <div style={{
              background: 'rgba(232,72,72,0.06)',
              border: '1px solid rgba(232,72,72,0.25)',
              borderRadius: 8, padding: '16px 18px',
            }}>
              <p style={{
                fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--text)',
                marginBottom: 16, lineHeight: 1.6,
              }}>
                This will permanently delete your account and all your data. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    padding: '8px 18px',
                    background: 'transparent',
                    color: 'var(--muted)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                    letterSpacing: 1, cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--muted)' }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                >
                  CANCEL
                </button>
                <button
                  disabled
                  title="Contact support to delete your account"
                  style={{
                    padding: '8px 18px',
                    background: 'rgba(232,72,72,0.3)',
                    color: 'rgba(255,255,255,0.4)',
                    border: '1px solid rgba(232,72,72,0.2)',
                    borderRadius: 4,
                    fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                    letterSpacing: 1, cursor: 'not-allowed',
                  }}
                >
                  YES, DELETE MY ACCOUNT
                </button>
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>
                To delete your account, email{' '}
                <a
                  href="mailto:support@mintintel.com"
                  style={{ color: 'var(--accent)', textDecoration: 'none' }}
                >
                  support@mintintel.com
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div style={{
          textAlign: 'center',
          fontFamily: 'var(--mono)', fontSize: 9,
          color: 'var(--muted)', letterSpacing: 1,
          marginTop: 8, paddingBottom: 32,
        }}>
          ◈ MINT · Account Settings · v0.1.0
        </div>

      </div>
    </PageShell>
  )
}
