import { useMemo, useState } from 'react'

export const TRENDING_WINDOWS = [
  { id: '1h',  label: 'Past Hour',  ms: 60 * 60 * 1000 },
  { id: '24h', label: 'Past 24h',   ms: 24 * 60 * 60 * 1000 },
  { id: '7d',  label: 'Past Week',  ms: 7  * 24 * 60 * 60 * 1000 },
  { id: 'all', label: 'All Time',   ms: Infinity },
]

// HackerNews-style time-decay: score = signals / (hours_since_activity + 2)^gravity
// updated_at used so new sources bump a story back up the ranking
function trendScore(story) {
  const sources   = (story.story_sources || []).length
  const timestamp = story.updated_at || story.created_at
  const hoursOld  = timestamp
    ? (Date.now() - new Date(timestamp).getTime()) / 3_600_000
    : 48

  const base         = (sources + 1) / Math.pow(hoursOld + 2, 1.5)
  const breakBoost   = (story.is_breaking || story.breaking) ? 2.0 : 1.0
  const confFactor   = story.confidence != null
    ? (story.confidence / 100) * 0.5 + 0.5   // 100% conf → 1.0×, 0% → 0.5×
    : 0.75

  return base * breakBoost * confFactor
}

export function useTrending(stories) {
  const [windowId, setWindowId] = useState('24h')
  const window = TRENDING_WINDOWS.find(w => w.id === windowId)

  const trending = useMemo(() => {
    const cutoff = window.ms === Infinity
      ? null
      : Date.now() - window.ms

    return stories
      .filter(s => {
        if (!cutoff) return true
        const ts = s.updated_at || s.created_at
        return ts ? new Date(ts).getTime() >= cutoff : false
      })
      .map(s => ({ ...s, _score: trendScore(s) }))
      .sort((a, b) => b._score - a._score)
  }, [stories, windowId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { trending, windowId, setWindowId, windows: TRENDING_WINDOWS }
}
