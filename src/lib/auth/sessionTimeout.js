// Idle session timeout, shared by every open tab.
//
// The last-activity time lives in localStorage, so activity in any tab keeps
// all of them signed in, and a laptop that wakes up after hours finds the
// stale timestamp and signs out before anything else happens.

export const IDLE_LIMIT_MS = 10 * 60 * 1000 // 10 minutes
export const EXPIRED_FLAG = 'mint_session_expired'

const KEY = 'mint_last_activity'

export function readLastActivity() {
  try { return Number(localStorage.getItem(KEY)) || 0 } catch { return 0 }
}

export function markActivity(now = Date.now()) {
  try { localStorage.setItem(KEY, String(now)) } catch { /* storage blocked */ }
}

export function clearActivity() {
  try { localStorage.removeItem(KEY) } catch { /* storage blocked */ }
}

// No timestamp yet means "just signed in", not "idle".
export function isIdle(now = Date.now(), last = readLastActivity(), limit = IDLE_LIMIT_MS) {
  return last > 0 && now - last >= limit
}

// Login reads this once to explain why the person is back at sign-in.
export function takeExpiredNotice() {
  try {
    const was = sessionStorage.getItem(EXPIRED_FLAG) === '1'
    sessionStorage.removeItem(EXPIRED_FLAG)
    return was
  } catch { return false }
}

export function setExpiredNotice() {
  try { sessionStorage.setItem(EXPIRED_FLAG, '1') } catch { /* storage blocked */ }
}
