import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSearch } from '../hooks/useSearch'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  :root {
    --bg:#080c10; --surface:#0d1219; --surface2:#131c26;
    --border:#1e2d3d; --accent:#00d4ff; --accent2:#ff6b35;
    --verified:#00ff88; --text:#c8d6e5; --muted:#4a6080;
    --mono:'IBM Plex Mono',monospace;
  }
  .search-page { min-height:100vh; background:var(--bg); color:var(--text); font-family:'IBM Plex Sans',sans-serif; }
  .search-topbar { height:52px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 24px; gap:16px; }
  .search-title { font-family:var(--mono); font-size:12px; letter-spacing:2px; color:var(--accent); }
  .back-btn { background:transparent; border:1px solid var(--border); color:var(--muted); padding:6px 14px; border-radius:4px; font-family:var(--mono); font-size:10px; cursor:pointer; transition:all 0.15s; }
  .back-btn:hover { color:var(--text); border-color:#2a3d54; }
  .search-body { max-width:800px; margin:0 auto; padding:32px 24px; }
  .search-input-wrap { position:relative; margin-bottom:28px; }
  .search-input {
    width:100%; background:var(--surface); border:1px solid var(--border);
    border-radius:8px; padding:14px 48px 14px 20px; color:var(--text);
    font-family:'IBM Plex Sans',sans-serif; font-size:16px; outline:none;
    transition:border-color 0.15s;
  }
  .search-input:focus { border-color:var(--accent); }
  .search-input::placeholder { color:var(--muted); }
  .search-clear { position:absolute; right:14px; top:50%; transform:translateY(-50%); background:none; border:none; color:var(--muted); cursor:pointer; font-size:18px; }
  .search-hint { font-family:var(--mono); font-size:10px; color:var(--muted); margin-top:8px; letter-spacing:1px; }
  .tabs { display:flex; gap:4px; margin-bottom:24px; border-bottom:1px solid var(--border); }
  .tab-btn { padding:10px 20px; background:none; border:none; font-family:var(--mono); font-size:11px; letter-spacing:1px; color:var(--muted); cursor:pointer; border-bottom:2px solid transparent; transition:all 0.15s; margin-bottom:-1px; }
  .tab-btn.active { color:var(--accent); border-bottom-color:var(--accent); }
  .tab-btn:hover:not(.active) { color:var(--text); }
  .result-card { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; margin-bottom:10px; transition:border-color 0.15s; cursor:pointer; }
  .result-card:hover { border-color:#2a3d54; }
  .result-headline { font-size:14px; font-weight:600; margin-bottom:6px; line-height:1.4; }
  .result-meta { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
  .result-tag { font-family:var(--mono); font-size:9px; letter-spacing:1px; padding:2px 8px; border-radius:10px; border:1px solid var(--border); color:var(--muted); }
  .result-tag.breaking { border-color:var(--accent2); color:var(--accent2); }
  .result-time { font-family:var(--mono); font-size:10px; color:var(--muted); }
  .result-body { font-size:13px; line-height:1.5; color:var(--text); margin-bottom:8px; }
  .result-username { font-family:var(--mono); font-size:12px; font-weight:600; }
  .role-dot { width:8px; height:8px; border-radius:50%; display:inline-block; margin-right:6px; }
  .empty-state { text-align:center; padding:48px 24px; font-family:var(--mono); font-size:11px; color:var(--muted); letter-spacing:1px; }
  .count-badge { font-family:var(--mono); font-size:9px; padding:2px 7px; background:var(--surface2); border:1px solid var(--border); border-radius:10px; color:var(--muted); margin-left:6px; }
  .loading-bar { height:2px; background:var(--surface2); border-radius:2px; overflow:hidden; margin-bottom:24px; }
  .loading-bar-fill { height:100%; background:var(--accent); border-radius:2px; animation:loadbar 1s ease-in-out infinite; }
  @keyframes loadbar { 0%{width:0;margin-left:0} 50%{width:60%;margin-left:20%} 100%{width:0;margin-left:100%} }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
  .highlight { color:var(--accent); font-weight:600; }
`

export default function SearchPage() {
  const navigate = useNavigate()
  const { results, loading, query, setQuery, search, clear } = useSearch()
  const [tab, setTab] = useState('stories')
  const [debounceTimer, setDebounceTimer] = useState(null)
  const inputRef = useRef(null)

  // Focus on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Cmd+K shortcut from anywhere
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
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

  const totalResults = results.stories.length + results.posts.length + results.users.length
  const hasQuery = query.trim().length >= 2
  const hasResults = totalResults > 0

  function highlight(text, q) {
    if (!q || !text) return text
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi')
    return text.split(regex).map((part, i) =>
      regex.test(part)
        ? <span key={i} className="highlight">{part}</span>
        : part
    )
  }

  return (
    <>
      <style>{styles}</style>
      <div className="search-page">
        <div className="search-topbar">
          <span style={{ fontSize:20, color:'var(--accent)' }}>⬡</span>
          <span className="search-title">MINT — SEARCH</span>
          <button className="back-btn" onClick={() => navigate('/feed')}>
            ← Back to Feed
          </button>
        </div>

        <div className="search-body">
          {/* Search input */}
          <div className="search-input-wrap">
            <input
              ref={inputRef}
              className="search-input"
              value={query}
              onChange={e => handleInput(e.target.value)}
              placeholder="Search stories, posts, channels..."
            />
            {query && (
              <button className="search-clear" onClick={clear}>×</button>
            )}
          </div>
          <div className="search-hint">
            ⌘K to focus · ESC to go back · Results update as you type
          </div>

          {/* Loading bar */}
          {loading && (
            <div className="loading-bar" style={{ marginTop:16 }}>
              <div className="loading-bar-fill" />
            </div>
          )}

          {/* Results */}
          {hasQuery && !loading && (
            <>
              {/* Tabs */}
              <div className="tabs" style={{ marginTop:24 }}>
                {[
                  { id:'stories', label:'Intel Stories', count: results.stories.length },
                  { id:'posts',   label:'Posts',         count: results.posts.length },
                  { id:'users',   label:'Channels',      count: results.users.length },
                ].map(t => (
                  <button
                    key={t.id}
                    className={`tab-btn ${tab===t.id?'active':''}`}
                    onClick={() => setTab(t.id)}
                  >
                    {t.label}
                    <span className="count-badge">{t.count}</span>
                  </button>
                ))}
              </div>

              {/* Stories tab */}
              {tab === 'stories' && (
                results.stories.length === 0 ? (
                  <div className="empty-state">
                    No intel stories found for "{query}"
                  </div>
                ) : results.stories.map(s => (
                  <div
                    key={s.id}
                    className="result-card"
                    onClick={() => navigate('/feed')}
                  >
                    <div className="result-meta" style={{ marginBottom:8 }}>
                      {s.is_breaking && <span className="result-tag breaking">BREAKING</span>}
                      <span className="result-tag">{s.tag}</span>
                      <span className="result-tag">{s.region}</span>
                      <span className="result-time">{timeAgo(s.created_at)}</span>
                      <span style={{
                        fontFamily:'var(--mono)', fontSize:10,
                        color:'var(--accent)', marginLeft:'auto'
                      }}>
                        {s.confidence}% confidence
                      </span>
                    </div>
                    <div className="result-headline">
                      {highlight(s.headline, query)}
                    </div>
                  </div>
                ))
              )}

              {/* Posts tab */}
              {tab === 'posts' && (
                results.posts.length === 0 ? (
                  <div className="empty-state">
                    No posts found for "{query}"
                  </div>
                ) : results.posts.map(p => (
                  <div key={p.id} className="result-card">
                    <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
                      <div style={{
                        width:28, height:28, borderRadius:'50%',
                        background:'linear-gradient(135deg,#1e3a5f,#0d6efd)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:11, fontWeight:700, color:'white', flexShrink:0
                      }}>
                        {p.users?.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="result-username" style={{
                        color: p.users?.role==='osint' ? 'var(--verified)' :
                               p.users?.role==='admin' ? 'var(--accent)' : 'var(--text)'
                      }}>
                        {p.users?.username || 'Unknown'}
                        {p.users?.role==='osint' && <span style={{color:'var(--verified)',marginLeft:4}}>◆</span>}
                      </span>
                      <span className="result-time">{timeAgo(p.created_at)}</span>
                    </div>
                    <div className="result-body">
                      {highlight(p.body, query)}
                    </div>
                    <div style={{ display:'flex', gap:12 }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>
                        ♡ {p.likes || 0}
                      </span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>
                        ↩ {p.reply_count || 0}
                      </span>
                    </div>
                  </div>
                ))
              )}

              {/* Users tab */}
              {tab === 'users' && (
                results.users.length === 0 ? (
                  <div className="empty-state">
                    No channels found for "{query}"
                  </div>
                ) : results.users.map(u => (
                  <div key={u.id} className="result-card">
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{
                        width:40, height:40, borderRadius:'50%',
                        background:'linear-gradient(135deg,#1e3a5f,#0d6efd)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:16, fontWeight:700, color:'white', flexShrink:0
                      }}>
                        {u.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span className="result-username" style={{
                            color: u.role==='osint' ? 'var(--verified)' :
                                   u.role==='admin' ? 'var(--accent)' : 'var(--text)'
                          }}>
                            {highlight(u.username, query)}
                          </span>
                          {u.role==='osint' && <span style={{color:'var(--verified)',fontSize:10}}>◆ VERIFIED</span>}
                          {u.role==='admin' && <span style={{color:'var(--accent)',fontSize:10}}>⬡ ADMIN</span>}
                        </div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)', marginTop:2 }}>
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
            <div className="empty-state" style={{ marginTop:48 }}>
              <div style={{ fontSize:32, marginBottom:16, opacity:0.3 }}>◈</div>
              <div>Start typing to search intel stories, posts and channels</div>
              <div style={{ marginTop:8, fontSize:9 }}>Minimum 2 characters</div>
            </div>
          )}

          {/* No results */}
          {hasQuery && !loading && !hasResults && (
            <div className="empty-state" style={{ marginTop:48 }}>
              <div style={{ fontSize:32, marginBottom:16, opacity:0.3 }}>◇</div>
              <div>No results found for "{query}"</div>
              <div style={{ marginTop:8, fontSize:9 }}>Try different keywords</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}