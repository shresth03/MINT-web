import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useStoryComposer } from '../hooks/feed/useStoryComposer'
import { X, Check, MapPin } from 'lucide-react'
import { COMPOSER_TAGS as TAGS } from '../constants'

export default function StoryComposer({ onClose, onPublished }) {
  const { publishStory, searchThreads, getRecentThreads, generateHeadline, generateSummary } = useStoryComposer()

  const [step, setStep] = useState(1)
  const [body, setBody] = useState('')
  const [tag, setTag] = useState('GEOPOLITICAL')
  const [regionQuery, setRegionQuery]       = useState('')
  const [regionPlace, setRegionPlace]       = useState(null)  // { label, lat, lng }
  const [regionResults, setRegionResults]   = useState([])
  const [regionLoading, setRegionLoading]   = useState(false)
  const regionDebounce                      = useRef(null)
  const regionDropdownRef                   = useRef(null)
  const [threadId, setThreadId] = useState(null)
  const [threadObj, setThreadObj] = useState(null)
  const [availableThreads, setAvailableThreads] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [threadTab, setThreadTab] = useState('recent')
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  // AI state
  const [headline, setHeadline] = useState('')
  const [headlineGenerated, setHeadlineGenerated] = useState(false)
  const [headlineLoading, setHeadlineLoading] = useState(false)
  const [summary, setSummary] = useState('')
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryGenerated, setSummaryGenerated] = useState(false)

  // Treat the author's own post as the first source
  const authorSource = useMemo(
    () => body.trim() ? [{ users: { username: 'you' }, body: body.trim() }] : [],
    [body]
  )

  const runAIGeneration = useCallback(async () => {
    const sources = authorSource

    // Headline: generate once, lock after
    if (!headlineGenerated) {
      setHeadlineLoading(true)
      const hl = await generateHeadline(sources)
      if (hl) {
        setHeadline(hl)
        setHeadlineGenerated(true)
      }
      setHeadlineLoading(false)
    }

    // Summary: always regenerate
    setSummaryLoading(true)
    const sum = await generateSummary(headline || body, sources)
    if (sum) {
      setSummary(sum)
      setSummaryGenerated(true)
    }
    setSummaryLoading(false)
  }, [authorSource, headlineGenerated, headline, body, generateHeadline, generateSummary])

  useEffect(() => {
    getRecentThreads().then(setAvailableThreads)
  }, [])

  // Nominatim place search — debounced 350ms
  useEffect(() => {
    if (regionDebounce.current) clearTimeout(regionDebounce.current)
    if (!regionQuery.trim() || regionQuery.length < 2) { setRegionResults([]); return }
    regionDebounce.current = setTimeout(async () => {
      setRegionLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(regionQuery)}&format=json&limit=6&addressdetails=1`,
          { headers: { 'User-Agent': 'MINT-OSINT-App/1.0' } }
        )
        const data = await res.json()
        setRegionResults(data.map(r => ({
          label: r.display_name,
          short: [r.address?.city || r.address?.town || r.address?.village || r.address?.county || r.address?.state, r.address?.country].filter(Boolean).join(', '),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          type: r.type,
        })))
      } catch { setRegionResults([]) }
      setRegionLoading(false)
    }, 350)
    return () => clearTimeout(regionDebounce.current)
  }, [regionQuery])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => { if (regionDropdownRef.current && !regionDropdownRef.current.contains(e.target)) setRegionResults([]) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (step === 2) {
      setLoadingThreads(true)
      getRecentThreads().then(data => {
        setAvailableThreads(data)
        setLoadingThreads(false)
      })
    }

    // When entering Step 2 or 3, trigger AI generation
    if ((step === 2 || step === 3) && authorSource.length > 0) {
      runAIGeneration()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, runAIGeneration])

  async function handleSearch(q) {
    setSearchQuery(q)
    if (q.length < 2) {
      getRecentThreads().then(setAvailableThreads)
      return
    }
    setLoadingThreads(true)
    const results = await searchThreads(q)
    setAvailableThreads(results)
    setLoadingThreads(false)
  }

  function selectThread(thread) {
    if (threadId === thread.id) {
      setThreadId(null)
      setThreadObj(null)
    } else {
      setThreadId(thread.id)
      setThreadObj(thread)
    }
  }

  async function handlePublish() {
    if (!body.trim()) { setError('Post body is required.'); return }
    setPublishing(true)
    setError('')
    const { post, error: err } = await publishStory({
      body, tag,
      region: regionPlace?.short ?? 'global',
      regionLat: regionPlace?.lat ?? null,
      regionLng: regionPlace?.lng ?? null,
      threadId,
    })
    setPublishing(false)
    if (err) { setError(err.message); return }
    onPublished?.(post)
    onClose()
  }

  function confidenceColor(c) {
    if (c >= 80) return 'var(--verified)'
    if (c >= 60) return 'var(--warn)'
    return 'var(--warn)'
  }

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'var(--modal-overlay)',
    zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)'
  }
  const modalStyle = {
    width: 720, maxWidth: '95vw', maxHeight: '90vh',
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: 12, display: 'flex', flexDirection: 'column',
    overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.4)'
  }
  const inputStyle = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 6, padding: '10px 14px', color: 'var(--text)',
    fontFamily: 'var(--sans)', fontSize: 13,
    outline: 'none', transition: 'border-color 0.15s', boxSizing: 'border-box'
  }
  const labelStyle = {
    fontFamily: 'var(--mono)', fontSize: 9,
    letterSpacing: 2, color: 'var(--muted)', marginBottom: 6, display: 'block'
  }
  const aiLabelStyle = {
    fontFamily: 'var(--mono)', fontSize: 9,
    letterSpacing: 2, color: 'var(--accent)', marginBottom: 6, display: 'block'
  }
  const btnPrimary = {
    padding: '10px 24px', background: 'var(--accent)', color: 'var(--bg)',
    border: 'none', borderRadius: 6, fontFamily: 'var(--mono)',
    fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: 1
  }
  const btnSecondary = {
    padding: '10px 24px', background: 'transparent', color: 'var(--muted)',
    border: '1px solid var(--border)', borderRadius: 6, fontFamily: 'var(--mono)',
    fontSize: 11, cursor: 'pointer', letterSpacing: 1
  }
  const regenBtn = {
    fontFamily: 'var(--mono)', fontSize: 9,
    color: 'var(--muted)', background: 'none',
    border: '1px solid var(--border)', borderRadius: 4,
    padding: '2px 8px', cursor: 'pointer', letterSpacing: 1
  }

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={modalStyle}>

        {/* Header */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 2, color: 'var(--accent)' }}>
              ◆ WRITE INTEL
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>
              STEP {step} OF 3 — {['', 'YOUR STORY', 'ATTACH TO THREAD', 'PREVIEW & PUBLISH'][step]}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={18} /></button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {[1, 2, 3].map(s => (
            <div key={s} onClick={() => step > s && setStep(s)} style={{
              flex: 1, padding: '10px', textAlign: 'center',
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
              color: step === s ? 'var(--accent)' : step > s ? 'var(--verified)' : 'var(--muted)',
              borderBottom: step === s ? '2px solid #00d4ff' : '2px solid transparent',
              cursor: step > s ? 'pointer' : 'default'
            }}>
              {step > s ? <Check size={11} style={{ display:'inline', verticalAlign:'middle', marginRight:3 }} /> : `${s}. `}
              {['YOUR STORY', 'THREAD', 'PREVIEW'][s - 1]}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>

          {/* ── STEP 1 — Write Story ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={labelStyle}>INTEL POST *</label>
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 140 }}
                  value={body}
                  onChange={e => { setBody(e.target.value); setHeadlineGenerated(false) }}
                  placeholder="Write your intelligence report, observation or analysis..."
                  maxLength={1000}
                  autoFocus
                />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: body.length > 900 ? 'var(--warn)' : 'var(--muted)', marginTop: 4, textAlign: 'right' }}>
                  {body.length}/1000
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>TAG</label>
                  <select style={{ ...inputStyle, cursor: 'pointer' }} value={tag} onChange={e => setTag(e.target.value)}>
                    {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{ position: 'relative' }} ref={regionDropdownRef}>
                  <label style={labelStyle}>LOCATION</label>
                  {regionPlace ? (
                    <div style={{
                      ...inputStyle, display: 'flex', alignItems: 'center',
                      gap: 8, cursor: 'default', color: 'var(--text)',
                    }}>
                      <MapPin size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{regionPlace.short}</span>
                      <button onClick={() => { setRegionPlace(null); setRegionQuery('') }}
                        style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 0, display: 'flex' }}>
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <input
                      style={{ ...inputStyle }}
                      value={regionQuery}
                      onChange={e => setRegionQuery(e.target.value)}
                      placeholder={regionLoading ? 'Searching...' : 'Search any place on earth…'}
                    />
                  )}
                  {regionResults.length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 6, marginTop: 4, overflow: 'hidden',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    }}>
                      {regionResults.map((r, i) => (
                        <button key={i} type="button" onClick={() => { setRegionPlace(r); setRegionQuery(''); setRegionResults([]) }}
                          style={{
                            width: '100%', textAlign: 'left', background: 'none', border: 'none',
                            padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                            borderBottom: i < regionResults.length - 1 ? '1px solid var(--border)' : 'none',
                            transition: 'background 0.1s',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'none'}
                        >
                          <MapPin size={11} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                          <div>
                            <div style={{ fontSize: 12, color: 'var(--text)', fontFamily: 'var(--sans)' }}>{r.short}</div>
                            <div style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 2, letterSpacing: 0.5 }}>{r.type?.toUpperCase()}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                padding: '10px 14px', borderRadius: 6,
                background: 'var(--story-active-bg)', border: '1px solid var(--topbar-hover)',
                fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', lineHeight: 1.7
              }}>
                ◈ Your post will be auto-grouped into a relevant thread by the system.<br />
                In the next step you can manually attach it to a specific thread.
              </div>
            </div>
          )}

          {/* ── STEP 2 — Attach to Thread (optional) ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* AI generation status banner */}
              {(headlineLoading || summaryLoading) && (
                <div style={{
                  padding: '10px 14px', borderRadius: 6,
                  background: 'var(--story-active-bg)', border: '1px solid var(--mf-active-bg)',
                  fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--accent)',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                  SYNTHESISING INTEL — AI is generating your headline and summary...
                </div>
              )}

              {/* Selected thread */}
              {threadObj && (
                <div style={{
                  padding: '12px 16px', borderRadius: 8,
                  border: '1px solid #00d4ff', background: 'var(--active-bg)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--accent)', marginBottom: 4 }}>
                      ATTACHED TO THREAD
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                      {threadObj.headline}
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', marginTop: 4 }}>
                      {threadObj.tag} · {threadObj.region}
                    </div>
                  </div>
                  <button onClick={() => { setThreadId(null); setThreadObj(null) }}
                    aria-label="Remove thread"
                    style={{ background: 'none', border: 'none', color: 'var(--warn)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
                </div>
              )}

              <div style={{
                padding: '8px 12px', borderRadius: 6,
                background: 'var(--tl-bg)', border: '1px solid var(--tl-bg)',
                fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', lineHeight: 1.7
              }}>
                ⚡ OPTIONAL — Skip this step and the system will auto-group your story.
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
                {[
                  { id: 'recent', label: '◎ RECENT THREADS' },
                  { id: 'search', label: '⌕ SEARCH THREADS' },
                ].map(t => (
                  <button key={t.id} onClick={() => { setThreadTab(t.id); if (t.id === 'recent') getRecentThreads().then(setAvailableThreads) }} style={{
                    padding: '8px 16px', background: 'none', border: 'none',
                    borderBottom: threadTab === t.id ? '2px solid #00d4ff' : '2px solid transparent',
                    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
                    color: threadTab === t.id ? 'var(--accent)' : 'var(--muted)',
                    cursor: 'pointer', transition: 'all 0.15s'
                  }}>{t.label}</button>
                ))}
              </div>

              {threadTab === 'search' && (
                <input
                  style={inputStyle}
                  value={searchQuery}
                  onChange={e => handleSearch(e.target.value)}
                  placeholder="Search thread headlines..."
                  autoFocus
                />
              )}

              {/* Thread list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loadingThreads ? (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', padding: 20, textAlign: 'center' }}>
                    LOADING...
                  </div>
                ) : availableThreads.length === 0 ? (
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', padding: 20, textAlign: 'center' }}>
                    No threads found
                  </div>
                ) : availableThreads.map(thread => {
                  const selected = threadId === thread.id
                  return (
                    <div key={thread.id} onClick={() => selectThread(thread)} style={{
                      padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                      border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                      background: selected ? 'var(--active-bg)' : 'transparent',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      transition: 'all 0.15s'
                    }}>
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                        border: `2px solid ${selected ? 'var(--accent)' : 'var(--muted)'}`,
                        background: selected ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 9, color: 'var(--bg)', fontWeight: 700
                      }}>
                        {selected ? <Check size={9} /> : ''}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600, marginBottom: 4, lineHeight: 1.4 }}>
                          {thread.headline}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--accent)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 3 }}>
                            {thread.tag}
                          </span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 3 }}>
                            {thread.region}
                          </span>
                          {thread.confidence && (
                            <span style={{ fontFamily: 'var(--mono)', fontSize: 8, color: confidenceColor(thread.confidence), marginLeft: 'auto' }}>
                              {thread.confidence}% CONF
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3 — Preview & Publish ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* AI HEADLINE */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <label style={{
                    ...aiLabelStyle, marginBottom: 0,
                    color: headlineLoading ? 'var(--muted)' : headlineGenerated ? 'var(--accent)' : 'var(--muted)'
                  }}>
                    {headlineLoading ? '⟳ GENERATING HEADLINE...' : headlineGenerated ? '✦ AI HEADLINE — EDIT IF NEEDED' : 'HEADLINE'}
                  </label>
                  {headlineGenerated && !headlineLoading && (
                    <button
                      style={regenBtn}
                      onClick={async () => {
                        setHeadlineLoading(true)
                        const hl = await generateHeadline(authorSource)
                        if (hl) setHeadline(hl)
                        setHeadlineLoading(false)
                      }}
                    >
                      ↺ REGENERATE
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={headlineLoading ? 'Analysing sources...' : headline}
                  onChange={e => setHeadline(e.target.value)}
                  disabled={headlineLoading}
                  placeholder="Add your post in Step 1 to auto-generate headline..."
                  style={{
                    ...inputStyle,
                    fontWeight: 700, fontSize: 15,
                    color: headlineLoading ? 'var(--muted)' : 'var(--text)',
                    opacity: headlineLoading ? 0.6 : 1,
                    borderColor: headlineGenerated && !headlineLoading ? 'var(--mf-active-bg)' : 'var(--border)'
                  }}
                />
              </div>

              {/* AI SUMMARY */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <label style={{
                    ...aiLabelStyle, marginBottom: 0,
                    color: summaryLoading ? 'var(--muted)' : summaryGenerated ? 'var(--accent)' : 'var(--muted)'
                  }}>
                    {summaryLoading ? '⟳ SYNTHESISING SOURCES...' : summaryGenerated ? '✦ AI DRAFT — EDIT BEFORE PUBLISHING' : 'SUMMARY'}
                  </label>
                  {summaryGenerated && !summaryLoading && (
                    <button
                      style={regenBtn}
                      onClick={async () => {
                        setSummaryLoading(true)
                        const sum = await generateSummary(headline, authorSource)
                        if (sum) setSummary(sum)
                        setSummaryLoading(false)
                      }}
                    >
                      ↺ REGENERATE
                    </button>
                  )}
                </div>
                <textarea
                  value={summaryLoading ? 'Synthesising intelligence from sources...' : summary}
                  onChange={e => setSummary(e.target.value)}
                  disabled={summaryLoading}
                  placeholder="Write your post in Step 1 to auto-generate summary..."
                  rows={5}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    color: summaryLoading ? 'var(--muted)' : 'var(--text)',
                    opacity: summaryLoading ? 0.6 : 1,
                    borderColor: summaryGenerated && !summaryLoading ? 'var(--mf-active-bg)' : 'var(--border)'
                  }}
                />
              </div>

              {/* Post preview card */}
              <div style={{
                border: '1px solid var(--border)', borderRadius: 10,
                background: 'var(--bg)', overflow: 'hidden'
              }}>
                <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)', letterSpacing: 1 }}>
                  SOURCE POST PREVIEW
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--accent)', letterSpacing: 1 }}>{tag}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 8px', borderRadius: 4, border: '1px solid var(--border)', color: 'var(--muted)', letterSpacing: 1 }}>{regionPlace ? regionPlace.short : 'No location'}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, padding: '3px 8px', borderRadius: 4, border: '1px solid color-mix(in srgb, var(--verified) 27%, transparent)', color: 'var(--verified)', letterSpacing: 1 }}>◆ OSINT</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 12 }}>
                    {body}
                  </div>
                  {threadObj ? (
                    <div style={{
                      padding: '8px 12px', borderRadius: 6,
                      background: 'var(--story-active-bg)', border: '1px solid var(--topbar-hover)',
                      fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--accent)'
                    }}>
                      ◈ THREAD: {threadObj.headline}
                    </div>
                  ) : (
                    <div style={{
                      padding: '8px 12px', borderRadius: 6,
                      background: 'var(--tl-bg)', border: '1px solid var(--tl-bg)',
                      fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--warn)'
                    }}>
                      ⚡ Will be auto-grouped into a thread by the system
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div style={{
                  padding: '10px 14px', borderRadius: 6,
                  background: 'color-mix(in srgb, var(--accent2) 10%, transparent)', border: '1px solid var(--accent2)',
                  fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)'
                }}>
                  {error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexShrink: 0, background: 'var(--surface)'
        }}>
          <button style={btnSecondary} onClick={step === 1 ? onClose : () => setStep(s => s - 1)}>
            {step === 1 ? 'CANCEL' : '← BACK'}
          </button>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {step === 2 && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
                {threadId ? '1 thread selected' : 'no thread selected — auto-group'}
              </span>
            )}
            {step < 3 ? (
              <button
                disabled={step === 1 && !body.trim()}
                style={{ ...btnPrimary, opacity: step === 1 && !body.trim() ? 0.4 : 1, cursor: step === 1 && !body.trim() ? 'not-allowed' : 'pointer' }}
                onClick={() => setStep(s => s + 1)}
              >
                {step === 2 ? 'PREVIEW →' : 'NEXT →'}
              </button>
            ) : (
              <button
                style={{ ...btnPrimary, background: publishing ? 'var(--muted)' : 'var(--verified)', color: 'var(--bg)' }}
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