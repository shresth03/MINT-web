import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '../hooks/useSearch'
import PageShell from '../components/PageShell'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function SearchPage() {
  const navigate = useNavigate()
  const { results, loading, query, setQuery, search, clear } = useSearch()
  const [tab, setTab] = useState('stories')
  const [debounceTimer, setDebounceTimer] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus() }
      if (e.key === 'Escape') navigate('/feed')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  function handleInput(val) {
    setQuery(val)
    if (debounceTimer) clearTimeout(debounceTimer)
    const t = setTimeout(() => search(val), 350)
    setDebounceTimer(t)
  }

  function highlight(text, q) {
    if (!q || !text) return text
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.split(regex).map((part, i) =>
      regex.test(part)
        ? <span key={i} style={{ color: 'var(--accent)', fontWeight: 600 }}>{part}</span>
        : part
    )
  }

  const totalResults = results.stories.length + results.posts.length + results.users.length
  const hasQuery = query.trim().length >= 2
  const hasResults = totalResults > 0

  const avatarStyle = (size = 28) => ({
    width: size, height: size, borderRadius: '50%',
    background: 'var(--accent)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: size === 28 ? 11 : 16, fontWeight: 700,
    color: 'var(--bg)', flexShrink: 0, fontFamily: 'var(--mono)',
  })

  const resultCard = {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 8, padding: 16, marginBottom: 10,
    transition: 'border-color 0.15s', cursor: 'pointer',
  }

  const tagStyle = (breaking = false) => ({
    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
    padding: '2px 8px', borderRadius: 10,
    border: `1px solid ${breaking ? 'var(--accent2)' : 'var(--border)'}`,
    color: breaking ? 'var(--accent2)' : 'var(--muted)',
  })

  const emptyState = {
    textAlign: 'center', padding: '48px 24px',
    fontFamily: 'var(--mono)', fontSize: 11,
    color: 'var(--muted)', letterSpacing: 1,
  }

  return (
    <PageShell title="MINT — SEARCH">
      {/* Inject keyframe animation */}
      <style>{`
        @keyframes loadbar { 0%{width:0;margin-left:0} 50%{width:60%;margin-left:20%} 100%{width:0;margin-left:100%} }
      `}</style>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* Search input */}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input
            ref={inputRef}
            value={query}
            onChange={e => handleInput(e.target.value)}
            placeholder="Search stories, posts, channels..."
            style={{
              width: '100%', background: 'var(--surface)',
              border: '1px solid var(--border)', borderRadius: 8,
              padding: '14px 48px 14px 20px', color: 'var(--text)',
              fontFamily: 'var(--sans)', fontSize: 16,
              outline: 'none', transition: 'border-color 0.15s',
              boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          {query && (
            <button
              onClick={clear}
              style={{
                position: 'absolute', right: 14, top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'var(--muted)', cursor: 'pointer', fontSize: 18,
              }}
            >×</button>
          )}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 1, marginBottom: 24 }}>
          ⌘K to focus · ESC to go back · Results update as you type
        </div>

        {/* Loading bar */}
        {loading && (
          <div style={{ height: 2, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden', marginBottom: 24 }}>
            <div style={{
              height: '100%', background: 'var(--accent)', borderRadius: 2,
              animation: 'loadbar 1s ease-in-out infinite',
            }} />
          </div>
        )}

        {/* Results */}
        {hasQuery && !loading && (
          <>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>
              {[
                { id: 'stories', label: 'Intel Stories', count: results.stories.length },
                { id: 'posts',   label: 'Posts',         count: results.posts.length },
                { id: 'users',   label: 'Channels',      count: results.users.length },
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '10px 20px', background: 'none', border: 'none',
                    fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1,
                    color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
                    marginBottom: -1,
                  }}
                >
                  {t.label}
                  <span style={{
                    fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 7px',
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                    borderRadius: 10, color: 'var(--muted)', marginLeft: 6,
                  }}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Stories */}
            {tab === 'stories' && (
              results.stories.length === 0 ? (
                <div style={emptyState}>No intel stories found for "{query}"</div>
              ) : results.stories.map(s => (
                <div
                  key={s.id} style={resultCard}
                  onClick={() => navigate('/feed')}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 8 }}>
                    {s.is_breaking && <span style={tagStyle(true)}>BREAKING</span>}
                    <span style={tagStyle()}>{s.tag}</span>
                    <span style={tagStyle()}>{s.region}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>{timeAgo(s.created_at)}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', marginLeft: 'auto' }}>
                      {s.confidence}% confidence
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: 'var(--text)', fontFamily: 'var(--sans)' }}>
                    {highlight(s.headline, query)}
                  </div>
                </div>
              ))
            )}

            {/* Posts */}
            {tab === 'posts' && (
              results.posts.length === 0 ? (
                <div style={emptyState}>No posts found for "{query}"</div>
              ) : results.posts.map(p => (
                <div
                  key={p.id} style={resultCard}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div style={avatarStyle(28)}>
                      {p.users?.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <span style={{
                      fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                      color: p.users?.role === 'osint' ? 'var(--verified)'
                        : p.users?.role === 'admin' ? 'var(--accent)' : 'var(--text)'
                    }}>
                      {p.users?.username || 'Unknown'}
                      {p.users?.role === 'osint' && <span style={{ color: 'var(--verified)', marginLeft: 4 }}>◆</span>}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                      {timeAgo(p.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text)', marginBottom: 8, fontFamily: 'var(--sans)' }}>
                    {highlight(p.body, query)}
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>♡ {p.likes || 0}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>↩ {p.reply_count || 0}</span>
                  </div>
                </div>
              ))
            )}

            {/* Users */}
            {tab === 'users' && (
              results.users.length === 0 ? (
                <div style={emptyState}>No channels found for "{query}"</div>
              ) : results.users.map(u => (
                <div
                  key={u.id} style={resultCard}
                  onClick={() => navigate(`/channel/${u.username}`)}
                  onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={avatarStyle(40)}>
                      {u.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                          color: u.role === 'osint' ? 'var(--verified)'
                            : u.role === 'admin' ? 'var(--accent)' : 'var(--text)'
                        }}>
                          {highlight(u.username, query)}
                        </span>
                        {u.role === 'osint' && <span style={{ color: 'var(--verified)', fontSize: 10, fontFamily: 'var(--mono)' }}>◆ VERIFIED</span>}
                        {u.role === 'admin' && <span style={{ color: 'var(--accent)', fontSize: 10, fontFamily: 'var(--mono)' }}>⬡ ADMIN</span>}
                      </div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>
                        @{u.username} · Score: {u.score || 0}/100
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Initial state */}
        {!hasQuery && (
          <div style={{ ...emptyState, marginTop: 48 }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>◈</div>
            <div>Start typing to search intel stories, posts and channels</div>
            <div style={{ marginTop: 8, fontSize: 9 }}>Minimum 2 characters</div>
          </div>
        )}

        {/* No results */}
        {hasQuery && !loading && !hasResults && (
          <div style={{ ...emptyState, marginTop: 48 }}>
            <div style={{ fontSize: 32, marginBottom: 16, opacity: 0.3 }}>◇</div>
            <div>No results found for "{query}"</div>
            <div style={{ marginTop: 8, fontSize: 9 }}>Try different keywords</div>
          </div>
        )}
      </div>
    </PageShell>
  )
}