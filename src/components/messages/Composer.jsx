import { useEffect, useRef } from 'react'
import { ArrowUp } from 'lucide-react'

// Rounded message box that grows with its text, plus the round send button
export default function Composer({ value, onChange, onSend, sending, isMobile, conversationId }) {
  const inputRef = useRef(null)
  const canSend = !!value.trim() && !sending

  // Grow with the content, up to ~5 lines
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value, conversationId])

  return (
    <div style={{
      padding: isMobile ? '12px 16px' : '12px 16px 8px',
      borderTop: '1px solid var(--border)',
      background: 'var(--surface)', flexShrink: 0,
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8,
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 22, padding: '6px 6px 6px 16px',
        transition: 'border-color 0.15s',
      }}>
        <textarea
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Message…"
          aria-label="Message"
          rows={1}
          maxLength={1000}
          onKeyDown={e => {
            // Desktop: Enter sends, Shift+Enter adds a line. Mobile keyboards
            // have no Shift+Enter, so Enter stays a newline there.
            if (!isMobile && e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              onSend()
            }
          }}
          style={{
            flex: 1, background: 'transparent', border: 'none',
            padding: '6px 0', color: 'var(--text)',
            fontFamily: 'var(--sans)', fontSize: 13, lineHeight: 1.5,
            outline: 'none', resize: 'none', maxHeight: 120, overflowY: 'auto',
          }}
          onFocus={e => { e.target.parentElement.style.borderColor = 'var(--accent)' }}
          onBlur={e => { e.target.parentElement.style.borderColor = 'var(--border)' }}
        />
        <button
          onClick={onSend}
          disabled={!canSend}
          aria-label="Send message"
          style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent)', color: 'var(--bg)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: canSend ? 'pointer' : 'not-allowed',
            opacity: canSend ? 1 : 0.35,
            transition: 'opacity 0.15s',
          }}
        >
          <ArrowUp size={15} strokeWidth={2.4} />
        </button>
      </div>
      {!isMobile && (
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--muted)',
          letterSpacing: 0.5, marginTop: 6, paddingLeft: 16,
        }}>
          Enter to send · Shift+Enter for a new line
        </div>
      )}
    </div>
  )
}
