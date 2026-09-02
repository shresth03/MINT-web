import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useChannel } from '../../hooks/social/useChannel'
import { useAuth } from '../../hooks/core/useAuth'
import { useFollow } from '../../hooks/social/useFollow'
import { Inbox, BadgeCheck, ShieldAlert, CircleDot, Check, Heart, MessageCircle, Repeat2, UserCheck, UserPlus } from 'lucide-react'
import { useMessages } from '../../hooks/social/useMessages'
import { useCredibility } from '../../hooks/social/useCredibility'
import PageShell from '../../components/PageShell'

function timeAgo(dateStr) {
  const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function ChannelPage() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { channel, posts, stories, loading } = useChannel(username)
  const { breakdown, loading: credLoading } = useCredibility(channel?.id)
  const [tab, setTab] = useState('posts')
  const { following, followerCount, followingCount, toggleFollow } = useFollow(channel?.id)
  const { getOrCreateConversation } = useMessages()

  if (loading) return (
    <PageShell title="MINT — CHANNEL">
      <div style={{
        padding: 40, textAlign: 'center',
        fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)'
      }}>
        LOADING CHANNEL...
      </div>
    </PageShell>
  )

  if (!channel) return (
    <PageShell title="MINT — CHANNEL">
      <div style={{ textAlign: 'center', padding: '80px 24px' }}>
        <Inbox size={32} style={{ marginBottom: 16, color: 'var(--border)' }} />
        <div style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)', letterSpacing: 2 }}>
          CHANNEL NOT FOUND
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8, fontFamily: 'var(--sans)' }}>
          @{username} does not exist
        </div>
      </div>
    </PageShell>
  )

  const isOwnProfile = user?.id === channel.id
  const score = channel.score || 0

  return (
    <PageShell title="MINT — CHANNEL">
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header Card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 28, marginBottom: 20
        }}>
          {/* Avatar row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'var(--accent)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 700, color: 'var(--bg)',
              border: '2px solid var(--border)', flexShrink: 0,
              fontFamily: 'var(--mono)'
            }}>
              {channel.username?.[0]?.toUpperCase() || 'C'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4, color: 'var(--text)', fontFamily: 'var(--sans)' }}>
                {channel.username}
                {channel.role === 'osint' && (
                  <BadgeCheck size={18} style={{ color: 'var(--verified)', marginLeft: 8 }} />
                )}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
                @{channel.username}
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px', borderRadius: 10,
                fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 600, letterSpacing: 1,
                background: channel.role === 'osint' ? 'rgba(48,216,128,0.1)'
                  : channel.role === 'admin' ? 'rgba(77,200,232,0.1)'
                  : 'rgba(64,72,88,0.2)',
                color: channel.role === 'osint' ? 'var(--verified)'
                  : channel.role === 'admin' ? 'var(--accent)'
                  : 'var(--muted)',
                border: `1px solid ${channel.role === 'osint' ? 'var(--verified)'
                  : channel.role === 'admin' ? 'var(--accent)'
                  : 'var(--border)'}`
              }}>
                {channel.role === 'osint'
                  ? <><BadgeCheck size={11} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />VERIFIED OSINT</>
                  : channel.role === 'admin'
                  ? <><ShieldAlert size={11} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />ADMIN</>
                  : <><CircleDot size={11} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />PUBLIC USER</>
                }
              </span>
            </div>
          </div>

          {/* Action buttons */}
          {!isOwnProfile && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                onClick={toggleFollow}
                style={{
                  padding: '8px 24px', borderRadius: 6,
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                  letterSpacing: 1, cursor: 'pointer', transition: 'all 0.15s',
                  border: '1px solid var(--accent)',
                  background: following ? 'var(--accent)' : 'transparent',
                  color: following ? 'var(--bg)' : 'var(--accent)',
                }}
              >
                {following
                  ? <><UserCheck size={12} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />FOLLOWING</>
                  : <><UserPlus size={12} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />FOLLOW</>
                }
              </button>
              <button
                onClick={async () => {
                  const conv = await getOrCreateConversation(channel.id)
                  if (conv) navigate(`/messages?user=${channel.id}`)
                }}
                style={{
                  padding: '8px 24px', borderRadius: 6,
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                  letterSpacing: 1, cursor: 'pointer', transition: 'all 0.15s',
                  border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--muted)',
                }}
              >
                ✉ MESSAGE
              </button>
            </div>
          )}
          {isOwnProfile && (
            <div style={{ marginBottom: 20 }}>
              <button
                onClick={() => navigate('/profile')}
                style={{
                  padding: '8px 24px', borderRadius: 6,
                  fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
                  letterSpacing: 1, cursor: 'pointer', transition: 'all 0.15s',
                  border: '1px solid var(--accent)',
                  background: 'transparent', color: 'var(--accent)',
                }}
              >
                EDIT PROFILE
              </button>
            </div>
          )}

          {/* Stats */}
          {[
            [
              { num: followerCount, lbl: 'Followers' },
              { num: followingCount, lbl: 'Following' },
              { num: score, lbl: 'Score' },
            ],
            [
              { num: posts.length, lbl: 'Posts' },
              { num: stories.length, lbl: 'Stories' },
              { num: posts.reduce((a, p) => a + (p.likes || 0), 0), lbl: 'Total Likes' },
            ]
          ].map((row, ri) => (
            <div key={ri} style={{
              display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
              gap: 12, marginTop: ri === 0 ? 0 : 12
            }}>
              {row.map(s => (
                <div key={s.lbl} style={{
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderRadius: 8, padding: 14, textAlign: 'center'
                }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 22, fontWeight: 700, color: 'var(--accent)' }}>
                    {s.num}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--mono)', letterSpacing: 1 }}>
                    {s.lbl}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Credibility breakdown */}
          {channel.role === 'osint' && (
            <div style={{ marginTop: 20 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 2, color: 'var(--muted)', marginBottom: 12 }}>
                CREDIBILITY BREAKDOWN
              </div>
              {credLoading ? (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>LOADING...</div>
              ) : breakdown ? (
                <>
                  {[
                    {
                      label: 'Avg Post Score',
                      value: breakdown.avgPostScore ?? 0,
                      max: 100,
                      color: 'var(--verified)',
                      display: `${breakdown.avgPostScore ?? 0}/100`,
                    },
                    {
                      label: 'Corroboration',
                      value: breakdown.totalPosts > 0 ? Math.round((breakdown.totalPeerCorr / breakdown.totalPosts) * 100) : 0,
                      max: 100,
                      color: 'var(--accent)',
                      display: `${breakdown.totalPeerCorr}/${breakdown.totalPosts} posts`,
                    },
                    {
                      label: 'Source Citations',
                      value: breakdown.totalPosts > 0 ? Math.round((breakdown.totalCited / breakdown.totalPosts) * 100) : 0,
                      max: 100,
                      color: 'var(--warn)',
                      display: `${breakdown.totalCited} cited`,
                    },
                    {
                      label: 'Note Accuracy',
                      value: breakdown.noteBoost != null ? Math.round((breakdown.noteBoost / 5) * 100) : 0,
                      max: 100,
                      color: '#ff9f43',
                      display: `+${breakdown.noteBoost ?? 0} pts`,
                    },
                    {
                      label: 'Consistency',
                      value: breakdown.consistencyBoost != null ? Math.round((breakdown.consistencyBoost / 5) * 100) : 0,
                      max: 100,
                      color: 'var(--accent2)',
                      display: `${breakdown.activeDays ?? 0} active days`,
                    },
                  ].map(s => (
                    <div key={s.label} style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 4 }}>
                        <span>{s.label}</span>
                        <span style={{ color: s.color }}>{s.display}</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 3, background: s.color, width: `${s.value}%`, transition: 'width 1s ease' }} />
                      </div>
                    </div>
                  ))}
                  {(breakdown.falseClaims ?? 0) > 0 && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(232,72,72,0.08)', border: '1px solid rgba(232,72,72,0.2)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent2)' }}>
                      ⚠ {breakdown.falseClaims} false claim{breakdown.falseClaims !== 1 ? 's' : ''} on record
                    </div>
                  )}
                  {(breakdown.positiveReactions ?? 0) > 0 && (
                    <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(48,216,128,0.06)', border: '1px solid rgba(48,216,128,0.2)', borderRadius: 4, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--verified)' }}>
                      <Check size={10} style={{display:'inline',verticalAlign:'middle',marginRight:4}} />{breakdown.positiveReactions} verified/confirmed reaction{breakdown.positiveReactions !== 1 ? 's' : ''}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                  No credibility data yet — score builds as claims are resolved.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {[
            { id: 'posts',   label: `Posts (${posts.length})` },
            { id: 'stories', label: `Intel Stories (${stories.length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 20px', background: 'none', border: 'none',
                fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1,
                color: tab === t.id ? 'var(--accent)' : 'var(--muted)',
                cursor: 'pointer', transition: 'all 0.15s',
                borderBottom: `2px solid ${tab === t.id ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Posts tab */}
        {tab === 'posts' && (
          posts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
              No posts yet.
            </div>
          ) : posts.map(post => (
            <div key={post.id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, padding: 16, marginBottom: 12,
              transition: 'border-color 0.15s',
            }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 10, color: 'var(--text)', fontFamily: 'var(--sans)' }}>
                {post.body}
              </div>
              <div style={{ display: 'flex', gap: 12, fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)' }}>
                <span>{timeAgo(post.created_at)}</span>
                <span style={{display:'flex',alignItems:'center',gap:3}}><Heart size={11} /> {post.likes || 0}</span>
                <span style={{display:'flex',alignItems:'center',gap:3}}><MessageCircle size={11} /> {post.reply_count || 0}</span>
                <span style={{display:'flex',alignItems:'center',gap:3}}><Repeat2 size={11} /> {post.repost_count || 0}</span>
                {post.tag && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--muted)' }}>
                    {post.tag}
                  </span>
                )}
              </div>
            </div>
          ))
        )}

        {/* Stories tab */}
        {tab === 'stories' && (
          stories.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--muted)' }}>
              No intel stories contributed yet.
            </div>
          ) : stories.map(story => (
            <div
              key={story.id}
              onClick={() => navigate('/feed')}
              style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 8, padding: 16, marginBottom: 12,
                cursor: 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
              onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                {story.is_breaking && (
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 10, border: '1px solid var(--accent2)', color: 'var(--accent2)' }}>
                    BREAKING
                  </span>
                )}
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  {story.tag}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1, padding: '2px 8px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--muted)' }}>
                  {story.region}
                </span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--accent)' }}>
                  {story.confidence}% confidence
                </span>
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: 'var(--text)', fontFamily: 'var(--sans)' }}>
                {story.headline}
              </div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginTop: 8 }}>
                {timeAgo(story.created_at)}
              </div>
            </div>
          ))
        )}
      </div>
    </PageShell>
  )
}