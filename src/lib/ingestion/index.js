import { detect } from './detect.js'
import { sarvamTranslate } from './providers/sarvam.js'
import { claudeTranslate } from './providers/claude.js'

// BCP-47 codes that route to Sarvam (best-quality Indic translation).
const INDIC = new Set(['hi', 'bn', 'pa', 'gu', 'or', 'ta', 'te', 'kn', 'ml', 'ur'])

/**
 * Normalise arbitrary-language text to English before the intelligence pipeline.
 *
 * English    → passthrough  (no API call)
 * Indic lang → Sarvam       (falls back to Claude if key absent / request fails)
 * Other      → Claude Haiku (degrades to original text if key absent)
 *
 * @param {string} text
 * @returns {Promise<{ text: string, lang: string, provider: 'sarvam'|'claude'|null }>}
 */
export async function ingest(text) {
  if (!text?.trim()) return { text: '', lang: 'en', provider: null }

  const lang = detect(text)

  if (lang === 'en') return { text, lang, provider: null }

  if (INDIC.has(lang)) {
    try {
      return await sarvamTranslate(text, lang)
    } catch {
      // Key absent or API error — fall through to Claude
    }
  }

  return claudeTranslate(text, lang)
}
