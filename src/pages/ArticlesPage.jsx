import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'
import { useStories } from '../hooks/useStories'
import { useAuth } from '../hooks/useAuth'
import { MapPin, X, Cpu, BadgeCheck, PenSquare, Newspaper } from 'lucide-react'
import { supabase } from '../api/supabase'
import { STORY_TAGS as TAGS, REGIONS_LIST as REGIONS } from '../constants'

const TAG_COLORS = {
  CONFLICT: '#e84848', CYBER: '#00d4ff', GEOPOLITICS: '#ff9f43',
  MILITARY: '#8a6a2a', HUMANITARIAN: '#30d880', NUCLEAR: '#a855f7',
  MARITIME: '#3b82f6', INTELLIGENCE: '#f59e0b', BREAKING: '#e84848',
  SECURITY: '#6366f1', OTHER: 'var(--muted)',
}

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function ArticleCard({ story, onClick }) {
  const authors = [...new Set(
    (story.story_sources || []).map(s => s.posts?.users?.username).filter(Boolean)
  )]
  const tagColor = TAG_COLORS[story.tag] || TAG_COLORS.OTHER

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 8, padding: 20, cursor: 'pointer',
        transition: 'border-color 0.15s, transform 0.1s',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}
      onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Tag + region */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {story.tag && (
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
            padding: '2px 7px', borderRadius: 3,
            background: `${tagColor}18`, border: `1px solid ${tagColor}60`,
            color: tagColor,
          }}>{story.tag}</span>
        )}
        {story.region && (
          <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>
            <MapPin size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />{story.region.toUpperCase()}
          </span>
        )}
        {story.confidence != null && (
          <span style={{
            marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9,
            color: story.confidence >= 70 ? 'var(--verified)' : story.confidence >= 40 ? '#ff9f43' : 'var(--accent2)',
          }}>
            {story.confidence}% CONF
          </span>
        )}
      </div>

      {/* Headline */}
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--sans)', lineHeight: 1.4 }}>
        {story.headline}
      </div>

      {/* Summary */}
      {story.summary && (
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, fontFamily: 'var(--sans)',
          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {story.summary}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {authors.slice(0, 3).map(a => (
            <span key={a} style={{
              fontFamily: 'var(--mono)', fontSize: 9, padding: '2px 6px',
              background: 'rgba(0,212,255,0.07)', border: '1px solid var(--border)',
              borderRadius: 3, color: 'var(--accent)',
            }}>@{a}</span>
          ))}
          {authors.length > 3 && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>+{authors.length - 3}</span>
          )}
        </div>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
          {timeAgo(story.created_at)} · {(story.story_sources || []).length} source{(story.story_sources || []).length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  )
}

function ArticleDetail({ story, onClose }) {
  const navigate = useNavigate()
  const authors = [...new Set(
    (story.story_sources || []).map(s => s.posts?.users?.username).filter(Boolean)
  )]
  const tagColor = TAG_COLORS[story.tag] || TAG_COLORS.OTHER

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      overflowY: 'auto', padding: '40px 16px',
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 10, width: '100%', maxWidth: 760, padding: '36px 40px',
        position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', color: 'var(--muted)',
          cursor: 'pointer', display: 'flex', alignItems: 'center',
        }}><X size={16} /></button>

        {/* Tag + meta */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
          {story.tag && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
              padding: '3px 8px', borderRadius: 3,
              background: `${tagColor}18`, border: `1px solid ${tagColor}60`,
              color: tagColor,
            }}>{story.tag}</span>
          )}
          {story.region && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>
              <MapPin size={9} style={{display:'inline',verticalAlign:'middle',marginRight:3}} />{story.region.toUpperCase()}
            </span>
          )}
          {story.confidence != null && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 9,
              color: story.confidence >= 70 ? 'var(--verified)' : '#ff9f43',
            }}>
              {story.confidence}% CONFIDENCE
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
            {new Date(story.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--sans)', fontSize: 26, fontWeight: 800,
          color: 'var(--text)', lineHeight: 1.3, margin: '0 0 12px',
        }}>
          {story.headline}
        </h1>

        {/* Byline */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>By</span>
          {authors.map(a => (
            <span
              key={a}
              onClick={() => { onClose(); navigate(`/channel/${a}`) }}
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)',
                cursor: 'pointer',
              }}
              onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
            >@{a}</span>
          ))}
        </div>

        {/* Summary / body */}
        {story.summary && (
          <div style={{
            fontSize: 15, lineHeight: 1.8, color: 'var(--text)',
            fontFamily: 'var(--sans)', marginBottom: 32,
          }}>
            {story.summary}
          </div>
        )}

        {/* Source posts */}
        {(story.story_sources || []).length > 0 && (
          <div>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
              color: 'var(--muted)', marginBottom: 14, textTransform: 'uppercase',
            }}>
              <Cpu size={11} style={{display:'inline',verticalAlign:'middle',marginRight:5}} />Intel sources ({story.story_sources.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {story.story_sources.map((src, i) => src.posts && (
                <div key={i} style={{
                  padding: '12px 14px', background: 'var(--surface)',
                  border: '1px solid var(--border)', borderRadius: 6,
                  borderLeft: `3px solid ${tagColor}`,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span
                      onClick={() => { onClose(); navigate(`/channel/${src.posts.users?.username}`) }}
                      style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)', cursor: 'pointer' }}
                      onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                    >
                      @{src.posts.users?.username || 'unknown'}
                      {src.posts.users?.role === 'osint' && <BadgeCheck size={10} style={{ color: 'var(--verified)', marginLeft: 4 }} />}
                    </span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)' }}>
                      {timeAgo(src.posts.created_at)}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, fontFamily: 'var(--sans)' }}>
                    {src.posts.body}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


function ArticleComposer({ onClose, onPublished }) {
  const { user } = useAuth()
  const [headline, setHeadline] = useState('')
  const [summary, setSummary] = useState('')
  const [tag, setTag] = useState('GEOPOLITICS')
  const [region, setRegion] = useState('Global')
  const [confidence, setConfidence] = useState(60)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  const handlePublish = async () => {
    if (!headline.trim() || !summary.trim()) { setError('Headline and summary are required'); return }
    setPublishing(true)
    const { error: err } = await supabase.from('stories').insert({
      headline: headline.trim(),
      summary: summary.trim(),
      tag,
      region,
      confidence,
      author_id: user.id,
      is_breaking: false,
    })
    setPublishing(false)
    if (err) { setError(err.message); return }
    onPublished()
    onClose()
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '10px 14px', color: 'var(--text)',
    fontFamily: 'var(--sans)', fontSize: 13, outline: 'none',
    marginBottom: 12, boxSizing: 'border-box',
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 10, padding: 28, width: 520, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, letterSpacing: 1, color: 'var(--text)' }}>
            <PenSquare size={11} style={{display:'inline',verticalAlign:'middle',marginRight:5}} />WRITE ARTICLE
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><X size={16} /></button>
        </div>

        {error && (
          <div style={{ background: 'rgba(232,72,72,0.1)', border: '1px solid var(--accent2)', borderRadius: 4, padding: '8px 12px', color: 'var(--accent2)', fontSize: 11, marginBottom: 12, fontFamily: 'var(--sans)' }}>
            {error}
          </div>
        )}

        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'var(--muted)', marginBottom: 4 }}>HEADLINE *</div>
        <input value={headline} onChange={e => setHeadline(e.target.value)} placeholder="Article headline..." style={inputStyle}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'} />

        <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'var(--muted)', marginBottom: 4 }}>SUMMARY *</div>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Intel summary and analysis..." rows={5}
          style={{ ...inputStyle, resize: 'vertical', fontFamily: 'var(--sans)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'var(--muted)', marginBottom: 4 }}>TAG</div>
            <select value={tag} onChange={e => setTag(e.target.value)} style={{ ...inputStyle, marginBottom: 0, cursor: 'pointer' }}>
              {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'var(--muted)', marginBottom: 4 }}>REGION</div>
            <select value={region} onChange={e => setRegion(e.target.value)} style={{ ...inputStyle, marginBottom: 0, cursor: 'pointer' }}>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, color: 'var(--muted)' }}>CONFIDENCE</div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: confidence >= 70 ? 'var(--verified)' : confidence >= 40 ? '#ff9f43' : 'var(--accent2)' }}>
              {confidence}%
            </div>
          </div>
          <input type="range" min={0} max={100} value={confidence} onChange={e => setConfidence(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }} />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px 0', background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', cursor: 'pointer' }}>
            CANCEL
          </button>
          <button onClick={handlePublish} disabled={publishing || !headline.trim() || !summary.trim()} style={{
            flex: 2, padding: '9px 0', background: 'var(--accent)', color: 'var(--bg)',
            border: 'none', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, cursor: 'pointer',
            opacity: (!headline.trim() || !summary.trim()) ? 0.5 : 1,
          }}>
            {publishing ? 'PUBLISHING...' : 'PUBLISH ARTICLE'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ArticlesPage() {
  const { user } = useAuth()
  const { stories, loading, refetch } = useStories()
  const [selected, setSelected] = useState(null)
  const [tagFilter, setTagFilter] = useState(null)
  const [showComposer, setShowComposer] = useState(false)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    if (!user?.id) return
    supabase.from('users').select('role').eq('id', user.id).single()
      .then(({ data }) => setUserRole(data?.role || null))
  }, [user?.id])

  const canWrite = ['osint', 'reporter', 'admin'].includes(userRole)
  const filtered = tagFilter ? stories.filter(s => s.tag === tagFilter) : stories
  const allTags = [...new Set(stories.map(s => s.tag).filter(Boolean))]

  return (
    <PageShell>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: 2, marginBottom: 6 }}>
              <Newspaper size={13} style={{display:'inline',verticalAlign:'middle',marginRight:6}} />INTEL ARTICLES
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', letterSpacing: 1 }}>
              OSINT intelligence compiled into verified reports
            </div>
          </div>
          {canWrite && (
            <button
              onClick={() => setShowComposer(true)}
              style={{
                marginLeft: 'auto', padding: '9px 18px',
                background: 'var(--accent)', color: 'var(--bg)',
                border: 'none', borderRadius: 4,
                fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
                letterSpacing: 1, cursor: 'pointer',
              }}
            >
              + WRITE ARTICLE
            </button>
          )}
        </div>

        {/* Tag filter chips */}
        {allTags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 24 }}>
            <button
              onClick={() => setTagFilter(null)}
              style={{
                padding: '4px 12px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
                border: `1px solid ${!tagFilter ? 'var(--accent)' : 'var(--border)'}`,
                background: !tagFilter ? 'rgba(0,212,255,0.1)' : 'transparent',
                color: !tagFilter ? 'var(--accent)' : 'var(--muted)',
              }}
            >ALL</button>
            {allTags.map(tag => {
              const c = TAG_COLORS[tag] || TAG_COLORS.OTHER
              return (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  style={{
                    padding: '4px 12px', borderRadius: 12, cursor: 'pointer',
                    fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
                    border: `1px solid ${tagFilter === tag ? c : 'var(--border)'}`,
                    background: tagFilter === tag ? `${c}18` : 'transparent',
                    color: tagFilter === tag ? c : 'var(--muted)',
                  }}
                >{tag}</button>
              )
            })}
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', padding: 40, textAlign: 'center' }}>
            LOADING ARTICLES...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', padding: 40, textAlign: 'center' }}>
            No articles yet — intel stories will appear here once OSINT analysts publish.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 16,
          }}>
            {filtered.map(story => (
              <ArticleCard key={story.id} story={story} onClick={() => setSelected(story)} />
            ))}
          </div>
        )}
      </div>

      {selected && <ArticleDetail story={selected} onClose={() => setSelected(null)} />}
      {showComposer && (
        <ArticleComposer
          onClose={() => setShowComposer(false)}
          onPublished={() => { setShowComposer(false); refetch?.() }}
        />
      )}
    </PageShell>
  )
}
