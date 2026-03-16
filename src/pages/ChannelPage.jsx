import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChannel } from '../hooks/useChannel'
import { useAuth } from '../hooks/useAuth'
import { useFollow } from '../hooks/useFollow'
import { useMessages } from '../hooks/useMessages'
import { useCredibility } from '../hooks/useCredibility'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
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
  .ch-page { min-height:100vh; background:var(--bg); color:var(--text); font-family:'IBM Plex Sans',sans-serif; }
  .ch-topbar { height:52px; background:var(--surface); border-bottom:1px solid var(--border); display:flex; align-items:center; padding:0 24px; gap:16px; }
  .ch-title { font-family:var(--mono); font-size:12px; letter-spacing:2px; color:var(--accent); }
  .back-btn { background:transparent; border:1px solid var(--border); color:var(--muted); padding:6px 14px; border-radius:4px; font-family:var(--mono); font-size:10px; cursor:pointer; transition:all 0.15s; }
  .back-btn:hover { color:var(--text); border-color:#2a3d54; }
  .ch-body { max-width:800px; margin:0 auto; padding:32px 24px; }
  .ch-header { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:28px; margin-bottom:20px; }
  .ch-avatar-row { display:flex; align-items:center; gap:20px; margin-bottom:20px; }
  .ch-avatar { width:72px; height:72px; border-radius:50%; background:linear-gradient(135deg,#1e3a5f,#0d6efd); display:flex; align-items:center; justify-content:center; font-size:28px; font-weight:700; color:white; border:2px solid var(--border); flex-shrink:0; }
  .ch-name { font-size:22px; font-weight:700; margin-bottom:4px; }
  .ch-handle { font-family:var(--mono); font-size:11px; color:var(--muted); margin-bottom:8px; }
  .ch-role-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:10px; font-family:var(--mono); font-size:9px; font-weight:600; letter-spacing:1px; }
  .ch-role-badge.osint { background:rgba(0,255,136,0.1); color:var(--verified); border:1px solid var(--verified); }
  .ch-role-badge.admin { background:rgba(0,212,255,0.1); color:var(--accent); border:1px solid var(--accent); }
  .ch-role-badge.public { background:rgba(74,96,128,0.2); color:var(--muted); border:1px solid var(--border); }
  .follow-btn { padding:8px 24px; border-radius:6px; font-family:var(--mono); font-size:11px; font-weight:700; letter-spacing:1px; cursor:pointer; transition:all 0.15s; border:1px solid var(--accent); color:var(--accent); background:transparent; }
  .follow-btn:hover { background:var(--accent); color:#000; }
  .follow-btn.following { background:var(--accent); color:#000; border-color:var(--accent); }
  .follow-btn.following:hover { background:transparent; color:var(--accent2); border-color:var(--accent2); }
  .stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
  .stat-box { background:var(--surface2); border:1px solid var(--border); border-radius:8px; padding:14px; text-align:center; }
  .stat-num { font-family:var(--mono); font-size:22px; font-weight:700; color:var(--accent); }
  .stat-lbl { font-size:10px; color:var(--muted); margin-top:4px; font-family:var(--mono); letter-spacing:1px; }
  .score-section { margin-top:20px; }
  .score-bar-wrap { margin-bottom:10px; }
  .score-bar-label { display:flex; justify-content:space-between; font-family:var(--mono); font-size:10px; color:var(--muted); margin-bottom:4px; }
  .score-bar-bg { height:6px; background:var(--surface2); border-radius:3px; overflow:hidden; }
  .score-bar-fill { height:100%; border-radius:3px; transition:width 1s ease; }
  .section-label { font-family:var(--mono); font-size:9px; letter-spacing:2px; color:var(--muted); text-transform:uppercase; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
  .section-label::after { content:''; flex:1; height:1px; background:var(--border); }
  .ch-card { background:var(--surface); border:1px solid var(--border); border-radius:8px; padding:16px; margin-bottom:12px; transition:border-color 0.15s; }
  .ch-card:hover { border-color:#2a3d54; }
  .post-body { font-size:13px; line-height:1.6; margin-bottom:10px; }
  .post-meta { display:flex; gap:12px; font-family:var(--mono); font-size:10px; color:var(--muted); }
  .story-tag { font-family:var(--mono); font-size:9px; letter-spacing:1px; padding:2px 8px; border-radius:10px; border:1px solid var(--border); color:var(--muted); }
  .story-tag.breaking { border-color:var(--accent2); color:var(--accent2); }
  .tabs { display:flex; gap:4px; margin-bottom:20px; border-bottom:1px solid var(--border); }
  .tab-btn { padding:10px 20px; background:none; border:none; font-family:var(--mono); font-size:11px; letter-spacing:1px; color:var(--muted); cursor:pointer; border-bottom:2px solid transparent; transition:all 0.15s; margin-bottom:-1px; }
  .tab-btn.active { color:var(--accent); border-bottom-color:var(--accent); }
  .empty { text-align:center; padding:32px; font-family:var(--mono); font-size:11px; color:var(--muted); }
  .not-found { text-align:center; padding:80px 24px; }
`

export default function ChannelPage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { channel, posts, stories, loading } = useChannel(username)
  const { breakdown, loading: credLoading } = useCredibility(channel?.id)
  const [tab, setTab] = useState('posts')
  const { following, followerCount, followingCount, loading: followLoading, toggleFollow } = useFollow(channel?.id)
  const { getOrCreateConversation } = useMessages()

  if (loading) return (
    <>
      <style>{styles}</style>
      <div className="ch-page">
        <div className="ch-topbar">
          <span style={{ fontSize:20, color:'#00d4ff' }}>⬡</span>
          <span className="ch-title">MINT — CHANNEL</span>
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
        <div style={{ padding:40, textAlign:'center', fontFamily:'var(--mono)', fontSize:11, color:'var(--muted)' }}>
          LOADING CHANNEL...
        </div>
      </div>
    </>
  )

  if (!channel) return (
    <>
      <style>{styles}</style>
      <div className="ch-page">
        <div className="ch-topbar">
          <span style={{ fontSize:20, color:'#00d4ff' }}>⬡</span>
          <span className="ch-title">MINT — CHANNEL</span>
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>
        <div className="not-found">
          <div style={{ fontSize:32, marginBottom:16, color:'var(--border)' }}>◇</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)', letterSpacing:2 }}>
            CHANNEL NOT FOUND
          </div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:8 }}>
            @{username} does not exist
          </div>
        </div>
      </div>
    </>
  )

  const isOwnProfile = user?.id === channel.id
  const score = channel.score || 0

  // Score breakdown (mock weights for now)

  return (
    <>
      <style>{styles}</style>
      <div className="ch-page">
        <div className="ch-topbar">
          <span style={{ fontSize:20, color:'#00d4ff' }}>⬡</span>
          <span className="ch-title">MINT — CHANNEL</span>
          <button className="back-btn" onClick={() => navigate(-1)}>← Back</button>
        </div>

        <div className="ch-body">
          {/* Header Card */}
          <div className="ch-header">
          <div className="ch-avatar-row">
            <div className="ch-avatar">
                {channel.username?.[0]?.toUpperCase() || 'C'}
            </div>
            <div style={{ flex:1 }}>
                <div className="ch-name">
                {channel.username}
                {channel.role === 'osint' && (
                    <span style={{ color:'var(--verified)', fontSize:16, marginLeft:8 }}>◆</span>
                )}
                </div>
                <div className="ch-handle">@{channel.username}</div>
                <span className={`ch-role-badge ${channel.role}`}>
                {channel.role === 'osint' ? '◆ VERIFIED OSINT' :
                channel.role === 'admin' ? '⬡ ADMIN' : '○ PUBLIC USER'}
                </span>
            </div>
            </div>

            {/* Buttons — own row, below header, above stats */}
            {!isOwnProfile && (
            <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', justifyContent:'center'  }}>
                <button
                className={`follow-btn ${following ? 'following' : ''}`}
                onClick={toggleFollow}
                >
                {following ? '✓ FOLLOWING' : '+ FOLLOW'}
                </button>
                <button
                className="follow-btn"
                style={{ borderColor:'var(--muted)', color:'var(--muted)' }}
                onClick={async () => {
                    const conv = await getOrCreateConversation(channel.id)
                    if (conv) navigate(`/messages?user=${channel.id}`)
                }}
                >
                ✉ MESSAGE
                </button>
            </div>
            )}
            {isOwnProfile && (
            <div style={{ marginBottom:20 }}>
                <button className="follow-btn" onClick={() => navigate('/profile')}>
                EDIT PROFILE
                </button>
            </div>
            )}
            {/* Stats */}
            <div className="stats-row" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
            <div className="stat-box">
                <div className="stat-num">{followerCount}</div>
                <div className="stat-lbl">Followers</div>
            </div>
            <div className="stat-box">
                <div className="stat-num">{followingCount}</div>
                <div className="stat-lbl">Following</div>
            </div>
            <div className="stat-box">
                <div className="stat-num">{score}</div>
                <div className="stat-lbl">Score</div>
            </div>
            </div>
            <div className="stats-row" style={{ gridTemplateColumns:'repeat(3,1fr)', marginTop:12 }}>
            <div className="stat-box">
                <div className="stat-num">{posts.length}</div>
                <div className="stat-lbl">Posts</div>
            </div>
            <div className="stat-box">
                <div className="stat-num">{stories.length}</div>
                <div className="stat-lbl">Stories</div>
            </div>
            <div className="stat-box">
                <div className="stat-num">
                {posts.reduce((a, p) => a + (p.likes || 0), 0)}
                </div>
                <div className="stat-lbl">Total Likes</div>
            </div>
            </div>

            {/* Score breakdown — only for osint/admin */}
            {channel.role === 'osint' && (
              <div className="score-section">
                <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:2, color:'var(--muted)', marginBottom:12, marginTop:20 }}>
                  CREDIBILITY BREAKDOWN
                </div>
                {credLoading ? (
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>LOADING...</div>
                ) : breakdown ? (
                  [
                    { label: 'Claim Accuracy',         value: breakdown.claimAccuracy,   max: 35, color: '#00ff88' },
                    { label: 'Corroboration Rate',     value: breakdown.corroboration,   max: 25, color: '#00d4ff' },
                    { label: 'Multi-Source Agreement', value: breakdown.multiSource,     max: 20, color: '#ffcc00' },
                    { label: 'Note Accuracy',          value: breakdown.noteAccuracy,    max: 15, color: '#ff9f43' },
                    { label: 'Consistency',            value: breakdown.consistency,     max: 10, color: '#ff6b35' },
                    ].map(s => {
                      const pct = Math.min(100, Math.round(((s.value ?? 0) / s.max) * 100))
                      return (
                        <div key={s.label} className="score-bar-wrap">
                          <div className="score-bar-label">
                            <span>{s.label}</span>
                            <span style={{ color: s.color }}>{pct}%</span>
                          </div>
                          <div className="score-bar-bg">
                            <div className="score-bar-fill" style={{
                              width: `${pct}%`,
                              background: s.color
                            }} />
                          </div>
                        </div>
                      )
                    })
                ) : (
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)' }}>
                    No credibility data yet — score builds as claims are resolved.
                  </div>
                )}
                {/* False claim penalties */}
                {breakdown?.falsePenalty > 0 && (
                  <div style={{ marginTop:8, padding:'6px 10px', background:'rgba(255,71,87,0.08)', border:'1px solid rgba(255,71,87,0.2)', borderRadius:4, fontFamily:'var(--mono)', fontSize:10, color:'#ff4757' }}>
                    ⚠ False claim penalties: −{breakdown.falsePenalty.toFixed(1)} pts
                  </div>
                )}
                {breakdown?.reversalBonus > 0 && (
                  <div style={{ marginTop:6, padding:'6px 10px', background:'rgba(255,211,42,0.08)', border:'1px solid rgba(255,211,42,0.2)', borderRadius:4, fontFamily:'var(--mono)', fontSize:10, color:'#ffd32a' }}>
                    ⟳ Reversal bonuses: +{breakdown.reversalBonus.toFixed(1)} pts
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="tabs">
            {[
              { id:'posts', label:`Posts (${posts.length})` },
              { id:'stories', label:`Intel Stories (${stories.length})` },
            ].map(t => (
              <button
                key={t.id}
                className={`tab-btn ${tab===t.id?'active':''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Posts tab */}
          {tab === 'posts' && (
            posts.length === 0 ? (
              <div className="empty">No posts yet.</div>
            ) : posts.map(post => (
              <div key={post.id} className="ch-card">
                <div className="post-body">{post.body}</div>
                <div className="post-meta">
                  <span>{timeAgo(post.created_at)}</span>
                  <span>♡ {post.likes || 0}</span>
                  <span>↩ {post.reply_count || 0}</span>
                  <span>⟳ {post.repost_count || 0}</span>
                  {post.tag && <span className="story-tag">{post.tag}</span>}
                </div>
              </div>
            ))
          )}

          {/* Stories tab */}
          {tab === 'stories' && (
            stories.length === 0 ? (
              <div className="empty">No intel stories contributed yet.</div>
            ) : stories.map(story => (
              <div
                key={story.id}
                className="ch-card"
                onClick={() => navigate('/feed')}
              >
                <div style={{ display:'flex', gap:8, marginBottom:8, flexWrap:'wrap' }}>
                  {story.is_breaking && (
                    <span className="story-tag breaking">BREAKING</span>
                  )}
                  <span className="story-tag">{story.tag}</span>
                  <span className="story-tag">{story.region}</span>
                  <span style={{
                    marginLeft:'auto', fontFamily:'var(--mono)',
                    fontSize:10, color:'var(--accent)'
                  }}>
                    {story.confidence}% confidence
                  </span>
                </div>
                <div style={{ fontSize:14, fontWeight:600, lineHeight:1.4 }}>
                  {story.headline}
                </div>
                <div style={{
                  fontFamily:'var(--mono)', fontSize:10,
                  color:'var(--muted)', marginTop:8
                }}>
                  {timeAgo(story.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}