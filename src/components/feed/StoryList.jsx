import { useNavigate } from 'react-router-dom'

export default function StoryList({ stories, activeStory, onSelect, loading }) {
  const navigate = useNavigate()

  if (loading) {
    return (
      <>
        {[1,2,3].map(i => (
          <div key={i} style={{ padding:"14px 16px", borderBottom:"1px solid var(--border)" }}>
            <div style={{ display:"flex", gap:8, marginBottom:8 }}>
              <div style={{ width:60, height:14, background:"var(--surface2)", borderRadius:3, animation:"pulse 1.5s ease-in-out infinite" }} />
              <div style={{ width:80, height:14, background:"var(--surface2)", borderRadius:3, animation:"pulse 1.5s ease-in-out infinite" }} />
            </div>
            <div style={{ width:"90%", height:16, background:"var(--surface2)", borderRadius:3, marginBottom:6, animation:"pulse 1.5s ease-in-out infinite" }} />
            <div style={{ width:"70%", height:16, background:"var(--surface2)", borderRadius:3, animation:"pulse 1.5s ease-in-out infinite" }} />
          </div>
        ))}
      </>
    )
  }

  return (
    <>
      {stories.map(s => (
        <div
          key={s.id}
          className={`story-card ${(s.breaking || s.is_breaking) ? "breaking" : ""} ${activeStory?.id === s.id ? "active" : ""}`}
          onClick={() => onSelect(s)}
        >
          <div className="story-meta">
            {(s.breaking || s.is_breaking) && <span className="breaking-tag">BREAKING</span>}
            <span className="story-tag">{s.tag}</span>
            <span className="story-time">{s.time || 'recent'}</span>
          </div>
          <div className="story-headline">{s.headline}</div>
          <div className="story-sources">
            {(s.sources || s.story_sources || []).map((src, i) => (
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
                  <span style={{color:'var(--verified)',fontSize:8,marginLeft:2}}>◆</span>
                }
              </div>
            ))}
            <span style={{ fontSize: 9, color: (s.sources || s.story_sources || []).length === 1 ? "var(--warn)" : "var(--muted)"}}>
              {(s.sources || s.story_sources || []).length === 1 ? "△ 1 source" : `${(s.sources || s.story_sources || []).length} sources`}
            </span>
          </div>
        </div>
      ))}
    </>
  )
}