const CLAUDE_URL = 'https://api.anthropic.com/v1/messages'

// Haiku: fast and cheap for translation workloads.
// Degrades gracefully — returns original text if the key is absent or the call fails.
export async function claudeTranslate(text, lang) {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!key) return { text, lang, provider: null }

  const res = await fetch(CLAUDE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Translate to English. Output only the translation, no preamble.\n\n${text}`,
      }],
    }),
  })

  if (!res.ok) return { text, lang, provider: null }
  const data = await res.json()
  const translated = data?.content?.[0]?.text?.trim() ?? text
  return { text: translated, lang, provider: 'claude' }
}
