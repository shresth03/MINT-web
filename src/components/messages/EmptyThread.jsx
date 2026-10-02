import { useNavigate } from 'react-router-dom'
import { Inbox, Search } from 'lucide-react'

// Thread area when no conversation is open
export default function EmptyThread({ noConversations }) {
  const navigate = useNavigate()
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'var(--muted)', gap: 12,
    }}>
      <Inbox size={32} style={{ opacity: 0.3 }} />
      {noConversations ? (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, textAlign: 'center' }}>
          <div>No messages yet</div>
          <div style={{ marginTop: 8, fontSize: 10.5 }}>Visit a channel profile and click Message</div>
        </div>
      ) : (
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1, textAlign: 'center' }}>
          <div>Select a conversation</div>
          <div style={{ marginTop: 8, fontSize: 10.5 }}>or find a channel to start a new one</div>
        </div>
      )}
      <button
        onClick={() => navigate('/search')}
        style={{
          display: 'flex', alignItems: 'center', gap: 7, marginTop: 6,
          padding: '8px 18px', background: 'transparent',
          color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 4,
          fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: 1,
          cursor: 'pointer', transition: 'background 0.15s',
        }}
        onMouseOver={e => { e.currentTarget.style.background = 'var(--topbar-hover)' }}
        onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
      >
        <Search size={12} /> FIND CHANNELS
      </button>
    </div>
  )
}
