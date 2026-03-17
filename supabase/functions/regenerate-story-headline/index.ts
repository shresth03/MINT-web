import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const { story_id } = await req.json()
  if (!story_id) return new Response('missing story_id', { status: 400 })

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: story } = await supabase
    .from('stories')
    .select('id, headline')
    .eq('id', story_id)
    .single()

  if (!story) return new Response('story not found', { status: 404 })

  const { data: sources } = await supabase
    .from('story_sources')
    .select('post_id, posts(body, users(username))')
    .eq('story_id', story_id)

  if (!sources || sources.length === 0) return new Response('no sources', { status: 200 })

  const sourceContext = sources
    .map((s, i) => `Source #${i + 1} (@${s.posts.users?.username}): ${s.posts.body}`)
    .join('\n')

  const hlRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 60,
      messages: [{
        role: 'user',
        content: `You are an OSINT intelligence analyst writing breaking news headlines.

Sources:
${sourceContext}

Extract the primary ACTION and LOCATION from these sources, then write a single headline that:
- Leads with the action (verb-forward)
- Includes specific location and named entities
- Is 8-12 words max
- Is factual and neutral

Output only the headline text. No punctuation at the end. No preamble.`
      }]
    })
  })

  const hlData = await hlRes.json()
  const newHeadline = hlData?.content?.[0]?.text?.trim() || story.headline

  await supabase
    .from('stories')
    .update({ headline: newHeadline })
    .eq('id', story_id)

  return new Response(JSON.stringify({ headline: newHeadline }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
