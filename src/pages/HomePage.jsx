// FILE: src/pages/HomePage.jsx
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import ThemeToggle from '../components/ThemeToggle'
import { Cpu, Globe2, BadgeCheck, Radio, MessageSquareText, TrendingUp } from 'lucide-react'

const FEATURES = [
  { Icon: Cpu,              title: 'Intel Stories',    desc: 'Multi-source OSINT reports compiled by verified analysts. Track unfolding events with confidence scores.' },
  { Icon: Globe2,           title: 'Global Event Map', desc: 'Interactive globe showing active conflict zones, cyber incidents and geopolitical flashpoints in real time.' },
  { Icon: BadgeCheck,       title: 'Verified Channels',desc: 'Follow verified OSINT analysts. Every analyst has a credibility score based on accuracy and peer corroboration.' },
  { Icon: Radio,            title: 'Live Broadcasts',  desc: 'Real-time live streams from the field. Go live directly from your verified channel.' },
  { Icon: MessageSquareText,title: 'Community Notes',  desc: 'Challenge or support claims with sourced notes. The community decides what holds up.' },
  { Icon: TrendingUp,       title: 'Trending & Reels', desc: 'Short-form intel clips and trending analysis. Fast takes on fast-moving events.' },
]

const STEPS = [
  {
    num: '01',
    title: 'Create or follow a verified channel',
    desc: 'Set up your analyst profile or follow trusted OSINT sources to build your intel feed.',
  },
  {
    num: '02',
    title: 'Monitor breaking intel stories as they compile',
    desc: 'Watch real-time stories form from multiple sources, each scored for confidence.',
  },
  {
    num: '03',
    title: 'Add community notes to challenge or support claims',
    desc: 'Source-backed annotations keep the network honest and verifiable.',
  },
]

export default function HomePage() {
  const { user } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const btnBase = {
    fontFamily: 'var(--mono)',
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1,
    padding: '12px 28px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }

  const btnAccent = {
    ...btnBase,
    background: 'var(--accent)',
    color: 'var(--bg)',
    border: '1px solid var(--accent)',
  }

  const btnOutline = {
    ...btnBase,
    background: 'transparent',
    color: 'var(--accent)',
    border: '1px solid var(--accent)',
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: 'var(--sans)' }}>

      {/* ── HERO ── */}
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

        {/* Top bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 28px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, zIndex: 10,
          background: 'var(--bg)',
        }}>
          {/* Logo */}
          <div onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <img
              src={theme === 'dark' ? '/logo-dark.png' : '/logo-light.png'}
              alt="MINT"
              style={{ height: 44, width: 'auto', display: 'block' }}
            />
          </div>

          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>

        {/* Hero center */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '64px 24px',
          textAlign: 'center',
        }}>
          {/* Label */}
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: 3,
            color: 'var(--muted)', marginBottom: 28, textTransform: 'uppercase',
          }}>
            Open Source Intelligence Network
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--mono)',
            fontSize: 'clamp(32px, 5vw, 64px)',
            fontWeight: 700,
            color: 'var(--text)',
            lineHeight: 1.15,
            marginBottom: 28,
          }}>
            INTELLIGENCE THAT<br />
            MOVES FASTER<br />
            THAN THE NEWS.
          </h1>

          {/* Subtitle */}
          <p style={{
            fontFamily: 'var(--sans)', fontSize: 16,
            color: 'var(--muted)', maxWidth: 480,
            margin: '0 auto 36px', lineHeight: 1.7,
          }}>
            Verified OSINT. Real-time analysis. Community fact-checking.
          </p>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
            {user ? (
              <button
                onClick={() => navigate('/feed')}
                style={btnAccent}
                onMouseOver={e => { e.currentTarget.style.opacity = '0.85' }}
                onMouseOut={e => { e.currentTarget.style.opacity = '1' }}
              >
                ◈ ENTER FEED →
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  style={btnOutline}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(77,200,232,0.07)'
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  SIGN IN
                </button>
                <button
                  onClick={() => navigate('/register')}
                  style={btnAccent}
                  onMouseOver={e => { e.currentTarget.style.opacity = '0.85' }}
                  onMouseOut={e => { e.currentTarget.style.opacity = '1' }}
                >
                  CREATE ACCOUNT
                </button>
              </>
            )}
          </div>

          {/* Stats strip */}
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 1,
            color: 'var(--muted)',
          }}>
            ◉ 247 intel stories &nbsp;·&nbsp; ◆ 89 verified analysts &nbsp;·&nbsp; ⚑ 12 active events
          </div>
        </div>
      </div>

      {/* ── FEATURES GRID ── */}
      <div style={{ background: 'var(--surface)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3,
            color: 'var(--muted)', textAlign: 'center',
            textTransform: 'uppercase', marginBottom: 48,
          }}>
            What MINT Offers
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}>
            {FEATURES.map(f => (
              <div
                key={f.title}
                style={{
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: '24px 20px',
                  transition: 'border-color 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ color: 'var(--accent)', marginBottom: 12 }}>
                  <f.Icon size={24} />
                </div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
                  letterSpacing: 1, color: 'var(--text)', marginBottom: 8,
                  textTransform: 'uppercase',
                }}>
                  {f.title}
                </div>
                <div style={{
                  fontFamily: 'var(--sans)', fontSize: 13,
                  color: 'var(--muted)', lineHeight: 1.6,
                }}>
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ background: 'var(--bg)', padding: '64px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: 3,
            color: 'var(--muted)', textAlign: 'center',
            textTransform: 'uppercase', marginBottom: 48,
          }}>
            How It Works
          </div>

          <div style={{
            display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center',
          }}>
            {STEPS.map(s => (
              <div key={s.num} style={{ flex: '1 1 200px', maxWidth: 240, textAlign: 'center' }}>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 48, fontWeight: 700,
                  color: 'var(--accent)', opacity: 0.3, lineHeight: 1, marginBottom: 12,
                }}>
                  {s.num}
                </div>
                <div style={{
                  fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 600,
                  color: 'var(--text)', marginBottom: 8, lineHeight: 1.4,
                  textTransform: 'uppercase', letterSpacing: 0.5,
                }}>
                  {s.title}
                </div>
                <div style={{
                  fontFamily: 'var(--sans)', fontSize: 12,
                  color: 'var(--muted)', lineHeight: 1.6,
                }}>
                  {s.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '24px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12,
        color: 'var(--muted)', fontSize: 10, fontFamily: 'var(--mono)',
      }}>
        <span>⬡ MINT · OPEN SOURCE INTEL NETWORK</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link
            to="/login"
            style={{ color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseOver={e => { e.currentTarget.style.color = 'var(--accent)' }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--muted)' }}
          >
            SIGN IN
          </Link>
          <Link
            to="/register"
            style={{ color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseOver={e => { e.currentTarget.style.color = 'var(--accent)' }}
            onMouseOut={e => { e.currentTarget.style.color = 'var(--muted)' }}
          >
            REGISTER
          </Link>
        </div>
      </div>

    </div>
  )
}
