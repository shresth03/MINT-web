export default function ThemeToggle({ theme, onToggle }) {
    return (
      <button
        onClick={onToggle}
        title={theme === 'dark' ? 'Switch to Ghost (light)' : 'Switch to Void (dark)'}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '5px 11px',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 4, cursor: 'pointer',
          fontFamily: 'var(--mono)', fontSize: 9,
          color: 'var(--muted)', letterSpacing: 1,
          transition: 'all 0.2s', flexShrink: 0,
        }}
        onMouseOver={e => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.color = 'var(--accent)'
        }}
        onMouseOut={e => {
          e.currentTarget.style.borderColor = 'var(--border)'
          e.currentTarget.style.color = 'var(--muted)'
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          {theme === 'dark' ? (
            <>
              <circle cx="6" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.1"/>
              <line x1="6" y1="0.5" x2="6" y2="2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              <line x1="6" y1="10" x2="6" y2="11.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              <line x1="0.5" y1="6" x2="2" y2="6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              <line x1="10" y1="6" x2="11.5" y2="6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              <line x1="2.05" y1="2.05" x2="3.1" y2="3.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              <line x1="8.9" y1="8.9" x2="9.95" y2="9.95" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              <line x1="9.95" y1="2.05" x2="8.9" y2="3.1" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
              <line x1="3.1" y1="8.9" x2="2.05" y2="9.95" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
            </>
          ) : (
            <>
              <path d="M2.5 9.5C2.5 9.5 1 8 1 6C1 3.5 3 1.5 6 1.5C4.5 1.5 3 3 3 5C3 7.5 5 9.5 7.5 9.5C6.5 10.5 5 11 3.5 10.5"
                stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" fill="none"/>
              <circle cx="8" cy="4" r="1" fill="currentColor"/>
              <line x1="8" y1="4" x2="10.5" y2="7" stroke="currentColor" strokeWidth="1"
                strokeLinecap="round" strokeDasharray="1 1.5"/>
            </>
          )}
        </svg>
        {theme === 'dark' ? 'GHOST' : 'VOID'}
      </button>
    )
  }