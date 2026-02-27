export default function StoryDetail({ story, onViewMap }) {
    if (!story) {
      return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--muted)", gap: 12 }}>
          <div style={{ fontSize: 40, opacity: 0.25 }}>◈</div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: 1 }}>Select a story</div>
        </div>
      )
    }
  
    return (
      <div className="detail-panel">
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {story.breaking && <span className="breaking-tag">BREAKING</span>}
          <span className="story-tag">{story.tag}</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted)" }}>
            First reported {story.time}
          </span>
          <button
            onClick={onViewMap}
            style={{ marginLeft: "auto", background: "transparent", border: "1px solid var(--border)", borderRadius: 3, padding: "3px 9px", fontFamily: "var(--mono)", fontSize: 8, color: "var(--muted)", cursor: "pointer", letterSpacing: 1 }}
          >
            ◉ VIEW ON MAP
          </button>
        </div>
  
        <div className="detail-headline">{story.headline}</div>
  
        <div className="conf-bar">
          <span className="conf-label">CONFIDENCE</span>
          <div className="conf-track">
            <div className="conf-fill" style={{ width: `${story.confidence}%` }} />
          </div>
          <span className="conf-val">{story.confidence}%</span>
        </div>
  
        <div className="tl-bar">
          {story.sources.map((s, i) => (
            <span key={i} style={{ display: "contents" }}>
              {i > 0 && <span className="tl-arrow">→</span>}
              <div className={`tl-event ${i === 0 ? "first" : ""}`}>
                {i === 0 ? "⚑ FIRST: " : `+${s.t.replace("T+", "")}: `}{s.name}
              </div>
            </span>
          ))}
        </div>
  
        <div className="detail-summary" style={{ marginTop: 16 }}>
          <div className="detail-summary-label">◈ AI-SYNTHESISED SUMMARY</div>
          {story.summary}
        </div>
  
        <div className="src-title">
          {story.sources.length} Verified Source{story.sources.length !== 1 ? "s" : ""}
        </div>
  
        {story.sources.map((s, i) => (
          <div key={i} className="source-post">
            <div className="source-post-hd">
              <div className="post-avatar" style={{ background: s.av, width: 36, height: 36, fontSize: 12 }}>
                {s.ini}
              </div>
              <div>
                <div className="source-name">{s.name}</div>
                <div className="source-handle">{s.handle}</div>
              </div>
              <div className="score-badge">◆ {s.score} / 100</div>
            </div>
            <div className="source-post-body">{s.body}</div>
            <div className="source-post-time">
              {s.first && <span className="first-report">⚑ First to report</span>}
              <span>{s.t === "T+0" ? "First post" : `Posted ${s.t} after breaking`}</span>
            </div>
          </div>
        ))}
  
        <div style={{ height: 32 }} />
      </div>
    )
  }