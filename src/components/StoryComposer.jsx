import { useState, useEffect } from 'react'
import { useStoryComposer } from '../hooks/useStoryComposer'

const TAGS = ['MILITARY', 'CYBER', 'MARITIME', 'GEOPOLITICAL', 'HUMANITARIAN', 'ECONOMIC', 'ENERGY', 'OTHER']
const REGIONS = ['Global', 'Middle East', 'Europe', 'Asia Pacific', 'North America', 'South America', 'Africa', 'Arctic']

function scoreColor(score) {
  if (score === null || score === undefined) return '#4a6080'
  if (score >= 75) return '#00ff88'
  if (score >= 50) return '#00d4ff'
  if (score >= 0)  return '#ffcc00'
  return '#ff4757'
}

export default function StoryComposer({ onClose, onPublished }) {
  const { publishStory, searchPosts, getRecentOsintPosts, getSuggestedPosts } = useStoryComposer()

  const [step, setStep] = useState(1)
  const [headline, setHeadline] = useState('')
  const [summary, setSummary] = useState('')
  const [tag, setTag] = useState('GEOPOLITICAL')
  const [region, setRegion] = useState('Global')
  const [confidence, setConfidence] = useState(75)
  const [isBreaking, setIsBreaking] = useState(false)
  const [sourcePostIds, setSourcePostIds] = useState([])
  const [sourcePosts, setSourcePosts] = useState([])
  const [availablePosts, setAvailablePosts] = useState([])
  const [suggestedPosts, setSuggestedPosts] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')
  const [sourceTab, setSourceTab] = useState('suggested') // 'suggested' | 'search' | 'recent'

  // Load recent posts on mount
  useEffect(() => {
    getRecentOsintPosts().then(setAvailablePosts)
  }, [])

  // When entering step 2, load smart suggestions
  useEffect(() => {
    if (step === 2 && headline.trim().length > 3) {
      setLoadingSuggestions(true)
      getSuggestedPosts(headline, region, tag).then(results => {
        setSuggestedPosts(results)
        setLoadingSuggestions(false)
      })
    }
  }, [step])

  async function handleSearch(q) {
    setSearchQuery(q)
    if (q.length < 2) {
      getRecentOsintPosts().then(setAvailablePosts)
      return
    }
    const results = await searchPosts(q)
    setAvailablePosts(results)
  }

  function toggleSource(post) {
    if (sourcePostIds.includes(post.id)) {
      setSourcePostIds(prev => prev.filter(id => id !== post.id))
      setSourcePosts(prev => prev.filter(p => p.id !== post.id))
    } else {
      setSourcePostIds(prev => [...prev, post.id])
      setSourcePosts(prev => [...prev, post])
    }
  }

  async function handlePublish() {
    if (!headline.trim() || !summary.trim()) {
      setError('Headline and summary are required.')
      return
    }
    setPublishing(true)
    setError('')
    const { story, error: err } = await publishStory({
      headline, summary, tag, region, confidence, is_breaking: isBreaking, sourcePostIds
    })
    setPublishing(false)
    if (err) { setError(err.message); return }
    onPublished?.(story)
    onClose()
  }

  function confidenceColor(c) {
    if (c >= 80) return '#00ff88'
    if (c >= 60) return '#ffcc00'
    return '#ff6b35'
  }

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)'
  }
  const modalStyle = {
    width: 720, maxWidth: '95vw', maxHeight: '90vh',
    background: '#0d1219', border: '1px solid #1e2d3d',
    borderRadius: 12, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
  }
  const inputStyle = {
    width: '100%', background: '#080c10', border: '1px solid #1e2d3d',
    borderRadius: 6, padding: '10px 14px', color: '#c8d6e5',
    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: 13,
    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box'
  }
  const labelStyle = {
    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
    letterSpacing: 2, color: '#4a6080', marginBottom: 6, display: 'block'
  }
  const btnPrimary = {
    padding: '10px 24px', background: '#00d4ff', color: '#000',
    border: 'none', borderRadius: 6, fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 1
  }
  const btnSecondary = {
    padding: '10px 24px', background: 'transparent', color: '#4a6080',
    border: '1px solid #1e2d3d', borderRadius: 6, fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11, cursor: 'pointer', letterSpacing: 1
  }

  // Which list to show in step 2
  const displayPosts = sourceTab === 'suggested' ? suggestedPosts
    : sourceTab === 'search' ? availablePosts
    : availablePosts

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>

        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #1e2d3d',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, letterSpacing: 2, color: '#00d4ff' }}>
              ◆ PUBLISH INTEL STORY
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#4a6080', marginTop: 4 }}>
              STEP {step} OF 3 — {['', 'STORY DETAILS', 'LINK SOURCES', 'PREVIEW & PUBLISH'][step]}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4a6080', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1e2d3d', flexShrink: 0 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{
              flex: 1, padding: '10px', textAlign: 'center',
              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 1,
              color: step === s ? '#00d4ff' : step > s ? '#00ff88' : '#4a6080',
              borderBottom: step === s ? '2px solid #00d4ff' : '2px solid transparent',
              cursor: step > s ? 'pointer' : 'default'
            }} onClick={() => step > s && setStep(s)}>
              {step > s ? '✓ ' : `${s}. `}
              {['DETAILS', 'SOURCES', 'PREVIEW'][s - 1]}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ── STEP 1 — Details ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>HEADLINE *</label>
                <input
                  style={inputStyle}
                  value={headline}
                  onChange={e => setHeadline(e.target.value)}
                  placeholder="e.g. Russian naval exercises detected in Baltic Sea"
                  maxLength={200}
                />
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#4a6080', marginTop: 4, textAlign: 'right' }}>
                  {headline.length}/200
                </div>
              </div>

              <div>
                <label style={labelStyle}>SUMMARY *</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
                  value={summary}
                  onChange={e => setSummary(e.target.value)}
                  placeholder="Provide a detailed summary of the intelligence..."
                  maxLength={1000}
                />
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#4a6080', marginTop: 4, textAlign: 'right' }}>
                  {summary.length}/1000
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>TAG</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={tag} onChange={e => setTag(e.target.value)}>
                    {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>REGION</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={region} onChange={e => setRegion(e.target.value)}>
                    {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>CONFIDENCE LEVEL — {confidence}%</label>
                <input
                  type="range" min={10} max={99} value={confidence}
                  onChange={e => setConfidence(e.target.value)}
                  style={{ width: '100%', accentColor: confidenceColor(confidence) }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#4a6080', marginTop: 4 }}>
                  <span>LOW</span>
                  <span style={{ color: confidenceColor(confidence), fontWeight: 700 }}>{confidence}% CONFIDENCE</span>
                  <span>HIGH</span>
                </div>
              </div>

              <div
                onClick={() => setIsBreaking(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${isBreaking ? '#ff6b35' : '#1e2d3d'}`,
                  background: isBreaking ? 'rgba(255,107,53,0.08)' : 'transparent',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 4,
                  border: `2px solid ${isBreaking ? '#ff6b35' : '#4a6080'}`,
                  background: isBreaking ? '#ff6b35' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#000', fontWeight: 700, flexShrink: 0
                }}>
                  {isBreaking ? '✓' : ''}
                </div>
                <div>
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: isBreaking ? '#ff6b35' : '#c8d6e5' }}>
                    MARK AS BREAKING
                  </div>
                  <div style={{ fontSize: 11, color: '#4a6080', marginTop: 2 }}>
                    Highlights this story with a breaking indicator in the feed
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2 — Sources ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Selected sources */}
              {sourcePosts.length > 0 && (
                <div>
                  <label style={labelStyle}>LINKED SOURCES ({sourcePosts.length})</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {sourcePosts.map(post => (
                      <div key={post.id} style={{
                        padding: '10px 14px', borderRadius: 8,
                        border: '1px solid #00d4ff', background: 'rgba(0,212,255,0.06)',
                        display: 'flex', gap: 10, alignItems: 'flex-start'
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#00ff88' }}>
                              @{post.users?.username} ◆
                            </span>
                            {post.users?.score != null && (
                              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: scoreColor(post.users.score), padding: '1px 5px', border: `1px solid ${scoreColor(post.users.score)}44`, borderRadius: 3 }}>
                                ◈ {post.users.score}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#c8d6e5', lineHeight: 1.4 }}>
                            {post.body?.substring(0, 120)}{post.body?.length > 120 ? '...' : ''}
                          </div>
                        </div>
                        <button onClick={() => toggleSource(post)} style={{ background: 'none', border: 'none', color: '#ff6b35', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Source tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #1e2d3d', gap: 0 }}>
                {[
                  { id: 'suggested', label: `◈ MATCHES (${suggestedPosts.length})` },
                  { id: 'search',    label: '⌕ SEARCH' },
                  { id: 'recent',    label: '◎ RECENT' },
                ].map(t => (
                  <button key={t.id} onClick={() => setSourceTab(t.id)} style={{
                    padding: '8px 16px', background: 'none',
                    border: 'none', borderBottom: sourceTab === t.id ? '2px solid #00d4ff' : '2px solid transparent',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: 1,
                    color: sourceTab === t.id ? '#00d4ff' : '#4a6080',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}>{t.label}</button>
                ))}
              </div>

              {/* Search input — only on search tab */}
              {sourceTab === 'search' && (
                <div>
                  <input
                    style={inputStyle}
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    placeholder="Search by keyword..."
                    autoFocus
                  />
                </div>
              )}

              {/* Smart suggestion banner */}
              {sourceTab === 'suggested' && (
                <div style={{
                  padding: '8px 12px', borderRadius: 6,
                  background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.15)',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#4a6080', lineHeight: 1.6
                }}>
                  ◈ Showing posts matching your headline keywords
                  {region !== 'Global' && ` and region "${region}"`}.
                  {loadingSuggestions && ' Searching...'}
                </div>
              )}

              {/* Posts list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loadingSuggestions && sourceTab === 'suggested' ? (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#4a6080', padding: 20, textAlign: 'center' }}>
                    SEARCHING...
                  </div>
                ) : displayPosts.length === 0 ? (
                  <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: '#4a6080', padding: 20, textAlign: 'center' }}>
                    {sourceTab === 'suggested' ? 'No matching posts found — try Search or Recent' : 'No OSINT posts found'}
                  </div>
                ) : displayPosts.map(post => {
                  const selected = sourcePostIds.includes(post.id)
                  return (
                    <div
                      key={post.id}
                      onClick={() => toggleSource(post)}
                      style={{
                        padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                        border: `1px solid ${selected ? '#00d4ff' : '#1e2d3d'}`,
                        background: selected ? 'rgba(0,212,255,0.06)' : 'transparent',
                        display: 'flex', gap: 10, alignItems: 'flex-start',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{
                        width: 16, height: 16, borderRadius: 3, flexShrink: 0, marginTop: 2,
                        border: `2px solid ${selected ? '#00d4ff' : '#4a6080'}`,
                        background: selected ? '#00d4ff' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 10, color: '#000', fontWeight: 700
                      }}>
                        {selected ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#00ff88' }}>
                            @{post.users?.username} ◆
                          </span>
                          {post.users?.score != null && (
                            <span style={{
                              fontFamily: "'IBM Plex Mono', monospace", fontSize: 9,
                              color: scoreColor(post.users.score),
                              padding: '1px 5px', borderRadius: 3,
                              border: `1px solid ${scoreColor(post.users.score)}44`
                            }}>
                              ◈ {post.users.score}
                            </span>
                          )}
                          {post.region && (
                            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#4a6080', marginLeft: 'auto' }}>
                              {post.region}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#c8d6e5', lineHeight: 1.4 }}>
                          {post.body?.substring(0, 140)}{post.body?.length > 140 ? '...' : ''}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3 — Preview ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{
                border: `1px solid ${isBreaking ? '#ff6b35' : '#1e2d3d'}`,
                borderRadius: 10, overflow: 'hidden',
                background: isBreaking ? 'rgba(255,107,53,0.04)' : '#080c10'
              }}>
                {isBreaking && (
                  <div style={{
                    padding: '6px 16px', background: '#ff6b35',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                    fontWeight: 700, color: '#000', letterSpacing: 2
                  }}>
                    ◉ BREAKING
                  </div>
                )}
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '3px 8px', borderRadius: 4, border: '1px solid #1e2d3d', color: '#00d4ff', letterSpacing: 1 }}>{tag}</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '3px 8px', borderRadius: 4, border: '1px solid #1e2d3d', color: '#4a6080', letterSpacing: 1 }}>{region}</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, lineHeight: 1.4, color: '#c8d6e5' }}>
                    {headline || 'Your headline will appear here'}
                  </div>
                  <div style={{ fontSize: 13, color: '#8899aa', lineHeight: 1.6, marginBottom: 16 }}>
                    {summary || 'Your summary will appear here'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, height: 4, background: '#1e2d3d', borderRadius: 2 }}>
                      <div style={{ height: '100%', borderRadius: 2, width: `${confidence}%`, background: confidenceColor(confidence) }} />
                    </div>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: confidenceColor(confidence) }}>{confidence}% CONFIDENCE</span>
                  </div>
                  {sourcePosts.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {sourcePosts.map(p => (
                        <span key={p.id} style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, padding: '3px 8px', borderRadius: 4, border: '1px solid #00ff8844', color: '#00ff88' }}>
                          ◆ @{p.users?.username}
                          {p.users?.score != null && <span style={{ color: scoreColor(p.users.score), marginLeft: 4 }}>◈{p.users.score}</span>}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ marginTop: 12, fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#4a6080' }}>
                    ℹ You will be auto-added as a source when published.
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(255,107,53,0.1)', border: '1px solid #ff6b35', fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: '#ff6b35' }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid #1e2d3d',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: '#0d1219'
        }}>
          <button style={btnSecondary} onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? 'CANCEL' : '← BACK'}
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {step === 2 && (
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, color: '#4a6080' }}>
                {sourcePosts.length} source{sourcePosts.length !== 1 ? 's' : ''} linked
              </span>
            )}
            {step < 3 ? (
              <button
                style={{ ...btnPrimary, opacity: step === 1 && !headline.trim() ? 0.4 : 1 }}
                onClick={() => { if (step === 1 && !headline.trim()) return; setStep(s => s + 1) }}
              >
                NEXT →
              </button>
            ) : (
              <button
                style={{ ...btnPrimary, background: publishing ? '#4a6080' : '#00ff88' }}
                onClick={handlePublish}
                disabled={publishing}
              >
                {publishing ? 'PUBLISHING...' : '◆ PUBLISH STORY'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
