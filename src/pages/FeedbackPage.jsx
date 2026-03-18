import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useUser } from '../hooks/useUser'
import { supabase } from '../api/supabase'
import { useNavigate } from 'react-router-dom'
import PageShell from '../components/PageShell'

const FEATURES = [
  { id: 'intel_feed',        label: 'Intel Feed',              desc: 'Main OSINT story feed with multi-source stories' },
  { id: 'general_feed',      label: 'General Feed',            desc: 'Public discussion feed separate from Intel' },
  { id: 'following_feed',    label: 'Following Feed',          desc: 'Filtered feed showing only analysts you follow' },
  { id: 'posting',           label: 'Posting',                 desc: 'Writing and publishing posts in the feed' },
  { id: 'replies',           label: 'Replies',                 desc: 'Replying to posts and threaded discussions' },
  { id: 'reposts',           label: 'Reposts & Quote Posts',   desc: 'Reposting or quoting other analysts\'s posts' },
  { id: 'likes',             label: 'Likes',                   desc: 'Liking posts in the feed' },
  { id: 'media_upload',      label: 'Media Upload',            desc: 'Attaching images to posts' },
  { id: 'saved_posts',       label: 'Saved Posts',             desc: 'Bookmarking posts for later reference' },
  { id: 'story_composer',    label: 'Story Composer',          desc: '3-step intel story publisher' },
  { id: 'story_threading',   label: 'Story Threading',         desc: 'Attaching posts to existing story threads' },
  { id: 'ai_headline',       label: 'AI Headline Generation',  desc: 'Auto-generated headlines from source posts' },
  { id: 'ai_summary',        label: 'AI Summary',              desc: 'AI-synthesised summary from all sources' },
  { id: 'auto_clustering',   label: 'Auto Story Clustering',   desc: 'System auto-groups similar posts into stories' },
  { id: 'confidence_score',  label: 'Confidence Score',        desc: 'Story confidence percentage based on sources' },
  { id: 'community_notes',   label: 'Community Notes',         desc: 'Challenging or supporting intel posts' },
  { id: 'claims',            label: 'Claims System',           desc: 'Auto-flagged claims when challenge weight hits threshold' },
  { id: 'credibility',       label: 'Credibility Scores',      desc: 'OSINT analyst scoring (0-100)' },
  { id: 'leaderboard',       label: 'Analyst Leaderboard',     desc: 'Ranked list of verified OSINT analysts' },
  { id: 'search',            label: 'Search',                  desc: 'Searching posts, stories, and analysts' },
  { id: 'trending',          label: 'Trending',                desc: 'Trending stories sorted by source count' },
  { id: 'event_map',         label: 'Event Map',               desc: 'Interactive globe with hotspot regions' },
  { id: 'channel_page',      label: 'Channel / Profile Pages', desc: 'Analyst profiles with credibility breakdown' },
  { id: 'following',         label: 'Follow System',           desc: 'Following and unfollowing analysts' },
  { id: 'messages',          label: 'Direct Messages',         desc: 'Private messaging between analysts' },
  { id: 'notifications',     label: 'Notifications',           desc: 'Alerts for likes, replies, follows, mentions' },
  { id: 'osint_application', label: 'OSINT Application',       desc: 'Applying to become a verified analyst' },
  { id: 'auth',              label: 'Login / Signup',          desc: 'Authentication and account creation' },
  { id: 'settings',          label: 'Settings',                desc: 'Profile settings and preferences' },
  { id: 'mobile',            label: 'Mobile Experience',       desc: 'Using MINT on a phone or tablet' },
  { id: 'performance',       label: 'Speed & Performance',     desc: 'Load times, lag, responsiveness' },
  { id: 'design',            label: 'Design & UI',             desc: 'Visual design, layout, readability' },
  { id: 'dark_theme',        label: 'Dark / Light Theme',      desc: 'Ghost and Void theme switching' },
  { id: 'overall',           label: 'Overall Experience',      desc: 'MINT as a whole — usefulness, uniqueness, trust' },
]

const RATINGS = [
  { value: 'very_bad',  label: 'Very Bad',  color: '#e84848' },
  { value: 'bad',       label: 'Bad',       color: 'var(--accent2)' },
  { value: 'okay',      label: 'Okay',      color: 'var(--warn)' },
  { value: 'good',      label: 'Good',      color: 'var(--accent)' },
  { value: 'very_good', label: 'Very Good', color: 'var(--verified)' },
]

export default function FeedbackPage() {
  const { user } = useAuth()
  const { profile } = useUser()
  const navigate = useNavigate()

  const [ratings, setRatings] = useState({})
  const [inlineComments, setInlineComments] = useState({})
  const [overallComment, setOverallComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (Object.keys(ratings).length === 0) {
      setError('Please rate at least one feature.')
      return
    }
    setSubmitting(true)
    setError('')

    const payload = {}
    FEATURES.forEach(f => {
      if (ratings[f.id] || inlineComments[f.id]) {
        payload[f.id] = {
          rating: ratings[f.id] || null,
          comment: inlineComments[f.id]?.trim() || null,
        }
      }
    })

    const { error: err } = await supabase.from('feedback').insert({
      user_id: user?.id || null,
      username: profile?.username || null,
      ratings: payload,
      overall_comment: overallComment.trim() || null,
    })

    setSubmitting(false)
    if (err) { setError(err.message); return }
    setSubmitted(true)
  }

  if (submitted) return (
    <PageShell title="◆ Feedback Terminal">
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, minHeight: 'calc(100vh - 52px)',
        fontFamily: 'var(--mono)'
      }}>
        <div style={{ fontSize: 40, color: 'var(--verified)' }}>◆</div>
        <div style={{ fontSize: 14, letterSpacing: 2, color: 'var(--verified)' }}>REPORT SUBMITTED</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 320, textAlign: 'center', lineHeight: 1.7 }}>
          Your feedback has been logged and will directly shape what gets built next.
        </div>
        <button
          onClick={() => navigate('/feed')}
          style={{
            marginTop: 16, padding: '10px 24px',
            background: 'transparent', border: '1px solid var(--border)',
            color: 'var(--muted)', borderRadius: 6, fontFamily: 'var(--mono)',
            fontSize: 11, cursor: 'pointer', letterSpacing: 1
          }}
        >
          ← RETURN TO FEED
        </button>
      </div>
    </PageShell>
  )

  return (
    <PageShell title="◆ Feedback Terminal">
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

        {/* Intro */}
        <div style={{
          padding: '14px 18px', marginBottom: 28,
          background: 'rgba(128,128,128,0.06)',
          border: '1px solid var(--border)',
          borderRadius: 6, fontFamily: 'var(--mono)',
          fontSize: 10, color: 'var(--muted)',
          lineHeight: 1.8, letterSpacing: 0.5
        }}>
          ◈ Rate each feature you've used. You don't need to rate everything — skip what you haven't tried.
          Use the field next to each rating to add specific feedback.
        </div>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr 200px',
          gap: 16, alignItems: 'center',
          padding: '6px 18px', marginBottom: 6
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)', letterSpacing: 2, opacity: 0.5 }}>FEATURE</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)', letterSpacing: 2, opacity: 0.5 }}>RATING</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)', letterSpacing: 2, opacity: 0.5 }}>SPECIFIC FEEDBACK</div>
        </div>

        {/* Feature rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {FEATURES.map((feature) => {
            const selected = ratings[feature.id]
            const selectedRating = RATINGS.find(r => r.value === selected)

            return (
              <div key={feature.id} style={{
                display: 'grid',
                gridTemplateColumns: '220px 1fr 200px',
                gap: 16, alignItems: 'center',
                padding: '14px 18px',
                background: selected ? 'rgba(128,128,128,0.04)' : 'var(--surface)',
                border: `1px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: 6, transition: 'all 0.15s',
              }}>

                {/* Feature name + desc */}
                <div>
                  <div style={{
                    fontFamily: 'var(--mono)', fontSize: 10,
                    color: selected ? selectedRating.color : 'var(--text)',
                    letterSpacing: 0.5, marginBottom: 3,
                    transition: 'color 0.15s'
                  }}>
                    {feature.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4, fontFamily: 'var(--sans)' }}>
                    {feature.desc}
                  </div>
                </div>

                {/* Rating checkboxes */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {RATINGS.map(r => {
                    const isSelected = selected === r.value
                    return (
                      <label
                        key={r.value}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', userSelect: 'none' }}
                      >
                        <div
                          onClick={() => setRatings(prev => ({
                            ...prev,
                            [feature.id]: isSelected ? undefined : r.value
                          }))}
                          style={{
                            width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                            border: `1.5px solid ${isSelected ? r.color : 'var(--border)'}`,
                            background: isSelected ? r.color : 'transparent',
                            cursor: 'pointer', transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}
                        >
                          {isSelected && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1 4L3 6L7 2" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span style={{
                          fontFamily: 'var(--mono)', fontSize: 9,
                          color: isSelected ? r.color : 'var(--muted)',
                          letterSpacing: 0.5, transition: 'color 0.15s'
                        }}>
                          {r.label}
                        </span>
                      </label>
                    )
                  })}
                </div>

                {/* Inline comment */}
                <input
                  type="text"
                  value={inlineComments[feature.id] || ''}
                  onChange={e => setInlineComments(prev => ({ ...prev, [feature.id]: e.target.value }))}
                  placeholder="Anything specific..."
                  maxLength={200}
                  style={{
                    width: '100%', background: 'var(--bg)',
                    border: '1px solid var(--border)', borderRadius: 4,
                    padding: '7px 10px', color: 'var(--text)',
                    fontFamily: 'var(--sans)', fontSize: 12,
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.15s'
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            )
          })}
        </div>

        {/* Overall comment */}
        <div style={{
          marginTop: 24, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 8, padding: '20px'
        }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2,
            color: 'var(--accent)', marginBottom: 6
          }}>
            OVERALL COMMENTS
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12, lineHeight: 1.5, fontFamily: 'var(--sans)' }}>
            Anything else — bugs you found, features you'd love to see, or general impressions.
          </div>
          <textarea
            value={overallComment}
            onChange={e => setOverallComment(e.target.value)}
            placeholder="Share your thoughts on MINT as a whole — what's working, what's missing, what would make you use it daily..."
            maxLength={1000}
            rows={6}
            style={{
              width: '100%', background: 'var(--bg)',
              border: '1px solid var(--border)', borderRadius: 6,
              padding: '12px 14px', color: 'var(--text)',
              fontFamily: 'var(--sans)', fontSize: 13,
              resize: 'vertical', outline: 'none',
              boxSizing: 'border-box', lineHeight: 1.7
            }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 8, color: 'var(--muted)',
            textAlign: 'right', marginTop: 4, opacity: 0.5
          }}>
            {overallComment.length}/1000
          </div>
        </div>

        {/* Summary bar */}
        <div style={{
          marginTop: 16, padding: '12px 16px',
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 6, display: 'flex',
          alignItems: 'center', gap: 16, flexWrap: 'wrap'
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)', letterSpacing: 1 }}>
            {Object.keys(ratings).length} OF {FEATURES.length} FEATURES RATED
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {RATINGS.map(r => {
              const count = Object.values(ratings).filter(v => v === r.value).length
              if (count === 0) return null
              return (
                <div key={r.value} style={{
                  fontFamily: 'var(--mono)', fontSize: 9, color: r.color,
                  padding: '2px 8px', border: `1px solid ${r.color}44`,
                  borderRadius: 3
                }}>
                  {r.label} × {count}
                </div>
              )
            })}
          </div>
        </div>

        {error && (
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: 'rgba(232,72,72,0.08)', border: '1px solid var(--accent2)',
            borderRadius: 6, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent2)'
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || Object.keys(ratings).length === 0}
          style={{
            marginTop: 12, width: '100%', padding: '14px',
            background: submitting || Object.keys(ratings).length === 0
              ? 'var(--border)' : 'var(--accent)',
            color: submitting || Object.keys(ratings).length === 0
              ? 'var(--muted)' : 'var(--bg)',
            border: 'none', borderRadius: 6, fontFamily: 'var(--mono)',
            fontSize: 12, fontWeight: 700, letterSpacing: 1,
            cursor: submitting || Object.keys(ratings).length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s'
          }}
        >
          {submitting ? '⟳ SUBMITTING...' : '◆ SUBMIT INTELLIGENCE REPORT'}
        </button>

        <div style={{ height: 40 }} />
      </div>
    </PageShell>
  )
}