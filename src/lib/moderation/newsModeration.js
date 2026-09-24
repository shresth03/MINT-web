import { supabase } from '../../api/supabase'

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-proxy`

function buildPrompt(text) {
  return `You are a content moderator for a news platform. Decide whether the post below is safe to publish as a News item.

Flag it if it contains any of:
- Sexually explicit or pornographic content
- Abusive, hateful, or harassing language toward a person or group
- Blocked slurs or profanity, including disguised variants (leetspeak, spacing, symbol substitution, deliberate misspellings meant to evade filters)

Respond with ONLY a JSON object, no other text: {"blocked": true|false, "reason": "<one short sentence if blocked, else empty string>"}

Post text:
"""${text}"""`
}

// Fails closed: any error, missing auth, or unparsable response blocks the
// post. A moderation gate that lets content through when it can't verify is
// not actually a gate.
export async function moderateNewsPost(text) {
  const { data: { session } } = await supabase.auth.getSession()
  const jwt = session?.access_token
  if (!jwt) return { blocked: true, reason: '', checked: false }

  try {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: buildPrompt(text),
        }],
      }),
    })

    if (!res.ok) return { blocked: true, reason: '', checked: false }

    const data = await res.json()
    const raw = data?.content?.[0]?.text?.trim() ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return { blocked: true, reason: '', checked: false }

    const parsed = JSON.parse(match[0])
    return { blocked: !!parsed.blocked, reason: parsed.reason || '', checked: true }
  } catch {
    return { blocked: true, reason: '', checked: false }
  }
}
