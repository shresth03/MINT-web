import { describe, it, expect } from 'vitest'
import { postTime, compactTime, fullTimestamp } from '../../lib/postTime'

// A fixed "now" in the afternoon, local time, so "earlier today" cases exist
const NOW = new Date(2026, 8, 24, 15, 0, 0) // 24 Sep 2026, 15:00 local
const before = ms => new Date(NOW.getTime() - ms)
const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR

describe('postTime()', () => {
  it('says "Just now" for under a minute, including slightly-future server times', () => {
    expect(postTime(before(40 * 1000), NOW)).toBe('Just now')
    expect(postTime(new Date(NOW.getTime() + 5000), NOW)).toBe('Just now')
  })

  it('uses minutes, then hours, for the last few hours', () => {
    expect(postTime(before(12 * MIN), NOW)).toBe('12m ago')
    expect(postTime(before(5 * HOUR), NOW)).toBe('5h ago')
  })

  it('switches to "Today · time" after 6 hours on the same day', () => {
    expect(postTime(before(7 * HOUR), NOW)).toMatch(/^Today · \d{1,2}:\d{2}/)
  })

  it('shows "Yesterday · time"', () => {
    expect(postTime(before(26 * HOUR), NOW)).toMatch(/^Yesterday · \d{1,2}:\d{2}/)
  })

  it('shows day, month and time within this year, with no year', () => {
    const out = postTime(before(32 * DAY), NOW)
    expect(out).toMatch(/Aug/)
    expect(out).toMatch(/· \d{1,2}:\d{2}/)
    expect(out).not.toMatch(/2026/)
  })

  it('shows the full date with year for earlier years, without a time', () => {
    const out = postTime(new Date(2025, 7, 20, 21, 57), NOW)
    expect(out).toMatch(/2025/)
    expect(out).not.toMatch(/·/)
  })

  it('returns an empty string for bad input', () => {
    expect(postTime('not a date', NOW)).toBe('')
  })
})

describe('fullTimestamp()', () => {
  it('includes the local date and time plus UTC', () => {
    const out = fullTimestamp(new Date(Date.UTC(2026, 7, 24, 2, 57)))
    expect(out).toMatch(/2026/)
    expect(out).toMatch(/\(24 Aug, 02:57 UTC\)$/)
  })
})

describe('compactTime()', () => {
  it('reads like a messaging app', () => {
    expect(compactTime(before(40 * 1000), NOW)).toBe('now')
    expect(compactTime(before(12 * MIN), NOW)).toBe('12m')
    expect(compactTime(before(5 * HOUR), NOW)).toBe('5h')
    expect(compactTime(before(7 * HOUR), NOW)).toMatch(/^\d{1,2}:\d{2}/)   // earlier today: clock time
    expect(compactTime(before(26 * HOUR), NOW)).toBe('Yesterday')
    expect(compactTime(before(32 * DAY), NOW)).toMatch(/Aug/)
    expect(compactTime(before(32 * DAY), NOW)).not.toMatch(/\d{1,2}:\d{2}/)
    expect(compactTime(new Date(2025, 7, 20), NOW)).toMatch(/2025/)
  })
})
