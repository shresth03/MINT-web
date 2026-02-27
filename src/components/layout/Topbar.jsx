export default function Topbar({ navItem, totalEvents, regions, stories, setShowApply }) {
    const titles = {
      feed: "Live Intel Feed",
      trending: "Trending",
      map: "Event Map",
      verified: "Verified Channels",
      pending: "Under Review",
      profile: "My Profile",
      settings: "Settings",
    }
  
    const totalSources = stories.reduce((a, s) => a + s.sources.length, 0)
  
    return (
      <div className="topbar">
        <span className="topbar-title">{titles[navItem] || "SIGINT"}</span>
  
        <div className="live-indicator">
          <div className="live-dot" />
          LIVE
        </div>
  
        <span style={{ fontSize: 10, color: "var(--muted)", fontFamily: "var(--mono)" }}>
          {navItem === "map"
            ? `${regions.length} regions · ${totalEvents} tracked events`
            : `${stories.length} stories · ${totalSources} verified posts`}
        </span>
  
        <div className="ml-auto">
          <button className="topbar-btn" onClick={() => setShowApply(true)}>
            Apply as OSINT Channel
          </button>
        </div>
      </div>
    )
  }