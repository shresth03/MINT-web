import { http, HttpResponse } from 'msw'

// ── Anthropic API mock ──
export const anthropicHandlers = [
  http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
    const body = await request.json()

    // Translation request (Haiku, max_tokens: 1024)
    if (body.model === 'claude-haiku-4-5-20251001') {
      const src = body.messages?.[0]?.content ?? ''
      const textLine = src.split('\n').at(-1) ?? ''
      return HttpResponse.json({
        content: [{ type: 'text', text: `[translated] ${textLine}` }]
      })
    }

    // Headline request (max_tokens: 60)
    if (body.max_tokens === 60) {
      return HttpResponse.json({
        content: [{ type: 'text', text: 'Indian Vessels Advance Toward South China Sea' }]
      })
    }

    // Summary request (max_tokens: 300)
    return HttpResponse.json({
      content: [{ type: 'text', text: 'Indian vessels INS Rajput and INS Vikrant are reportedly advancing toward Chinese positions in the South China Sea near Thailand, sources indicate.' }]
    })
  }),
]

// ── Sarvam AI mock ──
export const sarvamHandlers = [
  http.post('https://api.sarvam.ai/translate', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json({ translated_text: `[sarvam] ${body.input}` })
  }),
]

// ── Supabase mock ──
export const supabaseHandlers = [
  http.post('https://ipemqgxcjjyvrfzkcjoh.supabase.co/rest/v1/posts', () => {
    return HttpResponse.json({
      id: 'test-post-id',
      body: 'Test post body',
      tag: 'MILITARY',
      region: 'Asia Pacific',
      is_osint: true,
      author_id: 'test-user-id',
      created_at: new Date().toISOString(),
    })
  }),

  http.get('https://ipemqgxcjjyvrfzkcjoh.supabase.co/rest/v1/story_sources', () => {
    return HttpResponse.json([{ story_id: 35, post_id: 'test-post-id' }])
  }),

  http.get('https://ipemqgxcjjyvrfzkcjoh.supabase.co/rest/v1/stories', () => {
    return HttpResponse.json([{
      id: 35,
      headline: 'Indian vessels INS rajput and INS vikrant spotted in south china sea',
      summary: 'Indian vessels INS Rajput and INS Vikrant are reportedly advancing.',
      tag: 'MILITARY',
      region: 'Asia Pacific',
      confidence: 50,
      is_breaking: false,
      created_at: new Date().toISOString(),
    }])
  }),

  http.patch('https://ipemqgxcjjyvrfzkcjoh.supabase.co/rest/v1/stories', () => {
    return HttpResponse.json({ id: 35 })
  }),

  // Add to supabaseHandlers array
http.post(
    'https://ipemqgxcjjyvrfzkcjoh.supabase.co/functions/v1/regenerate-story-headline',
    async ({ request }) => {
      const body = await request.json()
      if (!body.story_id) return HttpResponse.json({ error: 'missing story_id' }, { status: 400 })
      return HttpResponse.json({ headline: 'New AI Generated Headline After 10 Sources' })
    }
  ),
http.post(
  'https://ipemqgxcjjyvrfzkcjoh.supabase.co/rest/v1/feedback',
  () => HttpResponse.json({ id: 'fb-test-id' })
),
]

export const handlers = [...anthropicHandlers, ...sarvamHandlers, ...supabaseHandlers]

