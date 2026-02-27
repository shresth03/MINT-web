export default function StoryCard({ story, isActive, onClick }) {
    return (
      <div
        className={`story-card ${story.breaking ? "breaking" : ""} ${isActive ? "active" : ""}`}
        onClick={onClick}
      >
        <div className="story-meta">
          {story.breaking && <span className="breaking-tag">BREAKING</span>}
          <span className="story-tag">{story.tag}</span>
          <span className="story-time">{story.time}</span>
        </div>
  
        <div className="story-headline">{story.headline}</div>
  
        <div className="story-sources">
          {story.sources.map((src, i) => (
            <div key={i} className="source-chip">
              <div className="vdot" />
              {src.name}
            </div>
          ))}
          <span style={{
            fontSize: 9,
            color: story.sources.length === 1 ? "var(--warn)" : "var(--muted)",
            fontFamily: "var(--mono)"
          }}>
            {story.sources.length === 1 ? "⚠ 1 source" : `${story.sources.length} sources`}
          </span>
        </div>
      </div>
    )
  }