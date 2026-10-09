import { supabase, contentDb } from '../../api/supabase'

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-proxy`

function buildPrompt(text) {
  return `You are a content moderator for a news platform. Decide whether the post below is safe to publish as a News item.

Respond with ONLY a JSON object, no other text:
{"decision": "allow" | "block" | "review", "reason": "<one short sentence, empty string if allow>"}

- "block": clearly contains sexually explicit/pornographic content, abusive/hateful/harassing language, or blocked slurs/profanity — including disguised variants (leetspeak, spacing, symbol substitution, deliberate misspellings meant to evade filters).
- "review": you're not confident either way — ambiguous context, reclaimed language, satire, or a borderline case that deserves a human judgment call.
- "allow": none of the above. Merely mentioning a protected trait (e.g. someone's sexual orientation, race, religion) is not itself abusive — only flag language that is hateful, harassing, or explicit.

Post text:
"""${text}"""`
}

// Layer 1 — known-bad text database. Free, no AI call. Skips silently if the
// check_blocked_text RPC hasn't been provisioned yet, rather than blocking
// every post until it exists.
async function checkBlockedTexts(text) {
  try {
    const { data, error } = await contentDb.rpc('check_blocked_text', { p_text: text })
    if (error || !data || data.length === 0) return null
    return data[0]
  } catch {
    return null
  }
}

// Layer 2 — AI classification via the existing Anthropic proxy.
// Fails closed: any error, missing auth, or unparsable response blocks the
// post — a moderation gate that lets content through when it can't verify
// is not actually a gate.
async function checkWithAI(text) {
  const { data: { session } } = await supabase.auth.getSession()
  const jwt = session?.access_token
  if (!jwt) return { decision: 'block', reason: '', checked: false }

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
        messages: [{ role: 'user', content: buildPrompt(text) }],
      }),
    })

    if (!res.ok) return { decision: 'block', reason: '', checked: false }

    const data = await res.json()
    const raw = data?.content?.[0]?.text?.trim() ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return { decision: 'block', reason: '', checked: false }

    const parsed = JSON.parse(match[0])
    const decision = ['allow', 'block', 'review'].includes(parsed.decision) ? parsed.decision : 'block'
    return { decision, reason: parsed.reason || '', checked: true }
  } catch {
    return { decision: 'block', reason: '', checked: false }
  }
}

// Layer 3 (manual review) is handled by the caller: a "review" decision
// means the post is created with moderation_status='pending' and held out
// of the public feed until an admin approves or rejects it.
export async function moderateNewsPost(text) {
  const blockedMatch = await checkBlockedTexts(text)
  if (blockedMatch) {
    return { decision: 'block', reason: blockedMatch.reason || 'Contains blocked content.', checked: true, layer: 'blocklist' }
  }

  const result = await checkWithAI(text)
  return { ...result, layer: 'ai' }
}
