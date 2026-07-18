const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-proxy`

// Haiku: fast and cheap for translation workloads.
// Degrades gracefully — returns original text if the call fails.
export async function claudeTranslate(text, lang) {
  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
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
  } catch {
    return { text, lang, provider: null }
  }
}
