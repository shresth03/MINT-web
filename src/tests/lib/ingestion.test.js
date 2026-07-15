import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'
import { detect } from '../../lib/ingestion/detect.js'
import { ingest } from '../../lib/ingestion/index.js'

// ── detect() ─────────────────────────────────────────────────────────────────

describe('detect()', () => {
  it('returns en for Latin/ASCII text', () => {
    expect(detect('Indian vessels advance toward disputed waters')).toBe('en')
  })

  it('returns en for empty string', () => {
    expect(detect('')).toBe('en')
  })

  it('detects Hindi (Devanagari)', () => {
    expect(detect('भारतीय सेना ने सीमा पर तैनाती बढ़ाई')).toBe('hi')
  })

  it('detects Tamil', () => {
    expect(detect('இந்திய கப்பல்கள் சர்ச்சைக்குரிய நீரில் நகர்கின்றன')).toBe('ta')
  })

  it('detects Bengali', () => {
    expect(detect('ভারতীয় জাহাজ বিতর্কিত জলে এগিয়ে যাচ্ছে')).toBe('bn')
  })

  it('detects Telugu', () => {
    expect(detect('భారత నావికాదళం సరిహద్దు వద్ద మోహరించింది')).toBe('te')
  })

  it('detects Kannada', () => {
    expect(detect('ಭಾರತೀಯ ಹಡಗುಗಳು ವಿವಾದಾಸ್ಪದ ನೀರಿನ ಕಡೆ ಸಾಗುತ್ತಿವೆ')).toBe('kn')
  })

  it('detects Malayalam', () => {
    expect(detect('ഇന്ത്യൻ കപ്പലുകൾ തർക്ക ജലത്തിലേക്ക് നീങ്ങുന്നു')).toBe('ml')
  })

  it('detects Urdu (Arabic script)', () => {
    expect(detect('پاکستانی فوجیں سرحد پر تعینات')).toBe('ur')
  })

  it('detects Chinese (CJK)', () => {
    expect(detect('印度船只向有争议的水域推进')).toBe('zh')
  })

  it('detects Japanese (Katakana/Hiragana)', () => {
    expect(detect('インドの船舶が係争水域に前進')).toBe('ja')
  })

  it('detects Korean (Hangul)', () => {
    expect(detect('인도 선박이 분쟁 수역으로 전진')).toBe('ko')
  })

  it('detects Cyrillic as ru', () => {
    expect(detect('Индийские суда продвигаются в спорные воды')).toBe('ru')
  })

  it('uses only the first 200 chars for detection', () => {
    // First 200 chars are all Latin; Devanagari appears after
    const latinPrefix = 'a'.repeat(200)
    const mixed = latinPrefix + 'भारत'
    expect(detect(mixed)).toBe('en')
  })
})

// ── ingest() ──────────────────────────────────────────────────────────────────

describe('ingest()', () => {
  beforeEach(() => {
    import.meta.env.VITE_SARVAM_API_KEY = 'test-sarvam-key'
    import.meta.env.VITE_ANTHROPIC_API_KEY = 'test-anthropic-key'
  })

  afterEach(() => {
    import.meta.env.VITE_SARVAM_API_KEY = ''
    import.meta.env.VITE_ANTHROPIC_API_KEY = ''
  })

  // ── English passthrough ────────────────────────────────────────────────────

  it('passthrough for English — provider is null', async () => {
    const result = await ingest('Missile strike reported in northern Syria')
    expect(result).toEqual({
      text: 'Missile strike reported in northern Syria',
      lang: 'en',
      provider: null,
    })
  })

  it('passthrough for empty string — no network call', async () => {
    const result = await ingest('   ')
    expect(result).toEqual({ text: '', lang: 'en', provider: null })
  })

  it('passthrough for null/undefined', async () => {
    expect((await ingest(null)).provider).toBeNull()
    expect((await ingest(undefined)).provider).toBeNull()
  })

  // ── Indic → Sarvam ────────────────────────────────────────────────────────

  it('routes Hindi to Sarvam', async () => {
    const result = await ingest('भारतीय सेना ने सीमा पर तैनाती बढ़ाई')
    expect(result.provider).toBe('sarvam')
    expect(result.lang).toBe('hi')
    expect(result.text).toContain('[sarvam]')
  })

  it('routes Tamil to Sarvam', async () => {
    const result = await ingest('இந்திய கப்பல்கள் சர்ச்சைக்குரிய நீரில் நகர்கின்றன')
    expect(result.provider).toBe('sarvam')
    expect(result.lang).toBe('ta')
  })

  it('routes Urdu to Sarvam', async () => {
    const result = await ingest('پاکستانی فوجیں سرحد پر تعینات')
    expect(result.provider).toBe('sarvam')
    expect(result.lang).toBe('ur')
  })

  it('falls back to Claude when Sarvam key is absent', async () => {
    import.meta.env.VITE_SARVAM_API_KEY = ''
    const result = await ingest('भारतीय सेना ने सीमा पर तैनाती बढ़ाई')
    expect(result.provider).toBe('claude')
  })

  it('falls back to Claude when Sarvam returns a server error', async () => {
    server.use(
      http.post('https://api.sarvam.ai/translate', () =>
        new HttpResponse(null, { status: 500 })
      )
    )
    const result = await ingest('भारतीय सेना')
    expect(result.provider).toBe('claude')
  })

  // ── Non-Indic → Claude fallback ───────────────────────────────────────────

  it('routes Chinese directly to Claude (not Sarvam)', async () => {
    const result = await ingest('印度船只向有争议的水域推进')
    expect(result.provider).toBe('claude')
    expect(result.lang).toBe('zh')
    expect(result.text).toContain('[translated]')
  })

  it('routes Russian directly to Claude', async () => {
    const result = await ingest('Индийские суда продвигаются в спорные воды')
    expect(result.provider).toBe('claude')
    expect(result.lang).toBe('ru')
  })

  it('degrades to original text when Claude key is also absent', async () => {
    import.meta.env.VITE_SARVAM_API_KEY = ''
    import.meta.env.VITE_ANTHROPIC_API_KEY = ''
    const src = '印度船只'
    const result = await ingest(src)
    expect(result.text).toBe(src)
    expect(result.provider).toBeNull()
  })

  // ── Result shape ──────────────────────────────────────────────────────────

  it('always returns { text, lang, provider }', async () => {
    const cases = [
      'English text',
      'भारतीय सेना',
      '印度船只',
    ]
    for (const text of cases) {
      const result = await ingest(text)
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('lang')
      expect(result).toHaveProperty('provider')
    }
  })
})
