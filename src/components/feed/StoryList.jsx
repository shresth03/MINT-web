import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

export default function StoryList({ stories, activeStory, onSelect, loading }) {
  const navigate = useNavigate()
  const [expandedThreads, setExpandedThreads] = useState(new Set())

  function toggleThread(e, id) {
    e.stopPropagation()
    setExpandedThreads(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <>
        {[1,2,3].map(i => (
          <div key={i} style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', gap:8, marginBottom:8 }}>
              <div style={{ width:60, height:14, background:'var(--surface2)', borderRadius:3, animation:'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ width:80, height:14, background:'var(--surface2)', borderRadius:3, animation:'pulse 1.5s ease-in-out infinite' }} />
            </div>
            <div style={{ width:'90%', height:16, background:'var(--surface2)', borderRadius:3, marginBottom:6, animation:'pulse 1.5s ease-in-out infinite' }} />
            <div style={{ width:'70%', height:16, background:'var(--surface2)', borderRadius:3, animation:'pulse 1.5s ease-in-out infinite' }} />
          </div>
        ))}
      </>
    )
  }

  return (
    <>
      {stories.map(s => {
        const sources = s.sources || s.story_sources || []
        const isExpanded = expandedThreads.has(s.id)
        const isActive = activeStory?.id === s.id
        const isBreaking = s.breaking || s.is_breaking

        return (
          <div key={s.id} style={{ borderBottom:'1px solid var(--border)' }}>

            {/* Thread header row */}
            <div
              className={`story-card ${isBreaking ? 'breaking' : ''} ${isActive ? 'active' : ''}`}
              onClick={() => onSelect(s)}
              style={{ borderBottom: 'none' }}
            >
              <div className="story-meta">
                {isBreaking && <span className="breaking-tag">BREAKING</span>}
                <span className="story-tag">{s.tag}</span>
                <span className="story-time">{s.time || timeAgo(s.created_at) || 'recent'}</span>
              </div>

              <div className="story-headline">{s.headline}</div>

              {/* Sources + expand toggle */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:6 }}>
                <div className="story-sources">
                  {sources.slice(0, 3).map((src, i) => (
                    <div key={i} className="source-chip">
                      <div className="vdot"/>
                      <span
                        onClick={e => {
                          e.stopPropagation()
                          const un = src.posts?.users?.username
                          if (un) navigate(`/channel/${un}`)
                        }}
                        style={{ cursor: src.posts?.users?.username ? 'pointer' : 'default' }}
                        onMouseOver={e => { if (src.posts?.users?.username) e.currentTarget.style.textDecoration='underline' }}
                        onMouseOut={e => e.currentTarget.style.textDecoration='none'}
                      >
                        {src.name || src.posts?.users?.username || 'Source'}
                      </span>
                      {(src.posts?.users?.role === 'osint' || src.score) &&
                        <span style={{ color:'var(--verified)', fontSize:8, marginLeft:2 }}>◆</span>
                      }
                    </div>
                  ))}
                  <span style={{ fontSize:9, color: sources.length === 1 ? 'var(--warn)' : 'var(--muted)' }}>
                    {sources.length === 1 ? '△ 1 source' : `${sources.length} sources`}
                  </span>
                </div>

                {/* Expand toggle — only if there are stories to show */}
                {sources.length > 0 && (
                  <button
                    onClick={e => toggleThread(e, s.id)}
                    style={{
                      background:'none', border:'none', cursor:'pointer',
                      fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)',
                      padding:'2px 6px', letterSpacing:1, flexShrink:0
                    }}
                  >
                    {isExpanded ? 'HIDE ▲' : `STORIES ▼`}
                  </button>
                )}
              </div>
            </div>

            {/* Expanded stories list */}
            {isExpanded && sources.length > 0 && (
              <div style={{ background:'var(--bg)', borderTop:'1px solid var(--border)' }}>
                {sources.map((src, i) => {
                  const post = src.posts
                  if (!post) return null
                  return (
                    <div key={i} style={{
                      padding:'10px 16px 10px 28px',
                      borderBottom: i < sources.length - 1 ? '1px solid var(--border)' : 'none',
                      display:'flex', gap:10
                    }}>
                      {/* Thread line */}
                      <div style={{
                        width:2, background:'var(--border)', borderRadius:2,
                        flexShrink:0, alignSelf:'stretch'
                      }} />
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:4 }}>
                          <span
                            onClick={() => post.users?.username && navigate(`/channel/${post.users.username}`)}
                            style={{
                              fontFamily:'var(--mono)', fontSize:10, fontWeight:600,
                              color: post.users?.role === 'osint' ? 'var(--verified)' :
                                     post.users?.role === 'admin' ? 'var(--accent)' : 'var(--text)',
                              cursor: post.users?.username ? 'pointer' : 'default'
                            }}
                          >
                            @{post.users?.username || 'Unknown'}
                            {post.users?.role === 'osint' && <span style={{ color:'var(--verified)', marginLeft:3, fontSize:8 }}>◆</span>}
                          </span>
                          {post.users?.score != null && (
                            <span style={{
                              fontFamily:'var(--mono)', fontSize:8,
                              color: post.users.score >= 75 ? 'var(--verified)' : post.users.score >= 50 ? 'var(--accent)' : 'var(--warn)',
                              padding:'1px 5px', border:'1px solid var(--border)', borderRadius:3
                            }}>
                              ◈ {post.users.score}
                            </span>
                          )}
                          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--muted)', marginLeft:'auto' }}>
                            {timeAgo(post.created_at)}
                          </span>
                        </div>
                        <div style={{ fontSize:12, color:'var(--text)', lineHeight:1.5 }}>
                          {post.body?.substring(0, 160)}{post.body?.length > 160 ? '...' : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}