import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const EXIT_MS = 260

// Icon-only, filled-accent-circle back control. Default action is
// navigate(-1), falling back to /feed when there's no in-app history
// (page opened from a link or a fresh tab); pass `to` for a specific
// route or `onClick` for local state (e.g. closing a mobile detail view
// instead of changing routes). `variant="outline"` swaps the fill for an
// accent ring, used in top bars so the logo stays the dominant mark.
export default function BackButton({ to, onClick, size = 30, style, ariaLabel = 'Go back', variant = 'filled' }) {
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)

  function handleClick() {
    if (exiting) return
    const go = () => {
      if (onClick) onClick()
      else if (to) navigate(to)
      else if (window.history.state?.idx > 0) navigate(-1)
      else navigate('/feed')
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reducedMotion) { go(); return }
    setExiting(true)
    setTimeout(go, EXIT_MS)
  }

  return (
    <>
      <style>{`
        .mint-backbtn-wrap { position: relative; width: ${size}px; height: ${size}px; flex-shrink: 0; }
        .mint-backbtn {
          position: absolute; left: 0; top: 0;
          width: ${size}px; height: ${size}px; border-radius: 50%;
          background: var(--accent); border: none; color: var(--bg);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: filter 0.12s ease;
        }
        .mint-backbtn:hover { filter: brightness(1.1); }
        .mint-backbtn.mint-backbtn-outline { background: transparent; border: 1px solid var(--accent); color: var(--accent); transition: background 0.12s ease; }
        .mint-backbtn.mint-backbtn-outline:hover { background: var(--topbar-hover); filter: none; }
        .mint-backbtn.mint-backbtn-exiting {
          animation: mint-backbtn-exit ${EXIT_MS}ms cubic-bezier(.55,0,.85,.15) forwards;
          pointer-events: none;
        }
        @keyframes mint-backbtn-exit {
          0%   { transform: translateX(0); opacity: 1; }
          70%  { opacity: 1; }
          100% { transform: translateX(-64px); opacity: 0; }
        }
        .mint-backbtn-streak {
          position: absolute; top: ${size / 2 - 1}px; left: 6px; height: 2px;
          background: var(--accent); border-radius: 1px; opacity: 0; width: 0;
        }
        .mint-backbtn.mint-backbtn-exiting ~ .mint-backbtn-streak-1 { animation: mint-backbtn-streak ${EXIT_MS}ms ease-out 30ms forwards; }
        .mint-backbtn.mint-backbtn-exiting ~ .mint-backbtn-streak-2 { animation: mint-backbtn-streak ${EXIT_MS}ms ease-out 100ms forwards; }
        @keyframes mint-backbtn-streak {
          0%   { opacity: 0; width: 0; }
          30%  { opacity: 0.8; width: 20px; }
          100% { opacity: 0; width: 30px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .mint-backbtn.mint-backbtn-exiting { animation: none; }
          .mint-backbtn-streak { display: none; }
        }
      `}</style>
      <span className="mint-backbtn-wrap" style={style}>
        <button
          type="button"
          aria-label={ariaLabel}
          onClick={handleClick}
          className={`mint-backbtn${variant === 'outline' ? ' mint-backbtn-outline' : ''}${exiting ? ' mint-backbtn-exiting' : ''}`}
        >
          <svg width={Math.round(size * 0.45)} height={Math.round(size * 0.45)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="mint-backbtn-streak mint-backbtn-streak-1" />
        <span className="mint-backbtn-streak mint-backbtn-streak-2" />
      </span>
    </>
  )
}
