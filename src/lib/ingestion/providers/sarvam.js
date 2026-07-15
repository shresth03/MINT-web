const SARVAM_URL = 'https://api.sarvam.ai/translate'

// ISO 639-1 → BCP-47 with region suffix expected by Sarvam's API
const TO_BCP47 = {
  hi: 'hi-IN', bn: 'bn-IN', pa: 'pa-IN', gu: 'gu-IN',
  or: 'od-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN',
  ml: 'ml-IN', ur: 'ur-IN',
}

// Throws on key-absent or API error so the router can fall back to Claude.
export async function sarvamTranslate(text, lang) {
  const key = import.meta.env.VITE_SARVAM_API_KEY
  if (!key) throw new Error('VITE_SARVAM_API_KEY not set')

  const res = await fetch(SARVAM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-subscription-key': key,
    },
    body: JSON.stringify({
      input: text,
      source_language_code: TO_BCP47[lang] ?? lang,
      target_language_code: 'en-IN',
      mode: 'formal',
      model: 'mayura:v1',
      enable_preprocessing: true,
    }),
  })

  if (!res.ok) throw new Error(`Sarvam ${res.status}`)

  const data = await res.json()
  return { text: data.translated_text ?? text, lang, provider: 'sarvam' }
}
