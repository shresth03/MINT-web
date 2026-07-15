import { useCallback } from 'react'
import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'
import { ingest } from '../lib/ingestion/index.js'

export function useStoryComposer() {
  const { user } = useAuth()

  async function generateThreadMeta(body, tag, region) {
    const { data: keywords } = await supabase.rpc('extract_keywords', {
      p_text: body
    })

    let headline = body.trim()
    if (keywords && keywords.length > 0) {
      const topKeywords = keywords.slice(0, 8)
      const candidate = topKeywords
        .map(k => k.charAt(0).toUpperCase() + k.slice(1))
        .join(' ')
      headline = candidate.length > 10 ? candidate : headline
    }

    if (headline.length > 100) headline = headline.substring(0, 97) + '...'

    return {
      headline,
      summary: body.trim(),
      tag: tag || 'OTHER',
      region: region || 'Global'
    }
  }

  const generateHeadline = useCallback(async (sourcePosts) => {
    if (!sourcePosts || sourcePosts.length === 0) return null
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) return null

    const sourceContext = sourcePosts
      .map((p, i) => `Source #${i + 1} (@${p.users?.username}): ${p.body}`)
      .join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
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
- Leads with the action (verb-forward: "Indian Vessels Advance Toward...", "Explosion Reported at...", "Chinese Forces Mass Near...")
- Includes specific location if known
- Includes specific named entities (vessel names, unit designations, country names)
- Is 8-12 words max
- Is factual and neutral — no speculation, no sensationalism
- Does NOT start with "Breaking:" or similar prefixes

Output only the headline text. No punctuation at the end. No preamble.`
        }],
      }),
    })

    const data = await response.json()
    return data?.content?.[0]?.text?.trim() ?? null
  }, [])

  const generateSummary = useCallback(async (headline, sourcePosts) => {
    if (!sourcePosts || sourcePosts.length === 0) return null
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) return null
    
    const sourceContext = sourcePosts
      .map((p, i) => `Source #${i + 1} (@${p.users?.username}): ${p.body}`)
      .join('\n')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `You are an OSINT intelligence analyst writing a developing situation report.

Headline: "${headline}"

Sources (in chronological order):
${sourceContext}

Write a concise, neutral, intelligence-style summary that:
- Synthesises ALL sources into a single coherent narrative
- Preserves specific details (vessel names, locations, unit names)
- Reflects the LATEST state of the situation (sources added later may update earlier ones)
- Uses hedged language where appropriate (e.g. "reportedly", "sources indicate")
- Is 2-4 sentences max
- Does NOT include a headline — just the summary body

Output only the summary text. No preamble, no labels.`
        }],
      }),
    })
    
    const data = await response.json()
    return data?.content?.[0]?.text?.trim() ?? null
  }, [])

  // Fetches all source posts for a story and regenerates summary via Claude
  async function refreshStorySummary(storyId, currentHeadline) {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
    if (!apiKey) return

    const { data: sources } = await supabase
      .from('story_sources')
      .select('post_id, posts(body, users(username))')
      .eq('story_id', storyId)

    if (!sources || sources.length === 0) return

    const sourcePosts = sources.map(s => ({
      body: s.posts.body,
      users: s.posts.users
    }))

    const newSummary = await generateSummary(currentHeadline, sourcePosts)

    if (newSummary) {
      await supabase
        .from('stories')
        .update({ summary: newSummary })
        .eq('id', storyId)
    }
  }

  async function publishStory({ body, tag, region, threadId, headline, summary }) {
    // Normalise to English for the AI pipeline; original body is stored in the DB.
    const { text: normalizedBody } = await ingest(body)

    // Insert the post, carrying manual_story_id so the trigger skips auto-clustering
    const { data: post, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        body: body.trim(),
        tag,
        region,
        is_osint: true,
        post_type: 'news',
        likes: 0,
        reply_count: 0,
        repost_count: 0,
        manual_story_id: threadId || null,
      })
      .select()
      .single()

    if (error) return { error }

    // ── Manual thread attach path ──
    if (threadId) {
      // Trigger already inserted story_sources via manual_story_id
      // Just refresh the story summary with all sources including new post
      const { data: story } = await supabase
        .from('stories')
        .select('headline')
        .eq('id', threadId)
        .single()

      await refreshStorySummary(threadId, story?.headline || headline || '')
      return { post, error: null }
    }

    // ── Auto-cluster path ──
    // Poll until the Postgres trigger links the post to a story (max 5 × 400ms = 2s)
    let newSources = null
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 400))
      const { data } = await supabase
        .from('story_sources')
        .select('story_id')
        .eq('post_id', post.id)
      if (data && data.length > 0) { newSources = data; break }
    }

    if (!newSources || newSources.length === 0) return { post, error: null }

    // Clean up duplicates if trigger somehow linked to multiple stories
    if (newSources.length > 1) {
      const removeIds = newSources.slice(0, -1).map(s => s.story_id)
      await supabase
        .from('story_sources')
        .delete()
        .eq('post_id', post.id)
        .in('story_id', removeIds)
    }

    const storyId = newSources[newSources.length - 1].story_id

    // Use AI headline/summary if available, fall back to DocArrange
    let finalHeadline = headline
    let finalSummary = summary

    if (!finalHeadline || !finalSummary) {
      // Try Claude first, fall back to DocArrange only if Claude fails
      const aiHeadline = !finalHeadline ? await generateHeadline([{ users: { username: user?.email?.split('@')[0] || 'analyst' }, body: normalizedBody }]) : null
      const aiSummary = !finalSummary ? await generateSummary(finalHeadline || aiHeadline || normalizedBody, [{ users: { username: user?.email?.split('@')[0] || 'analyst' }, body: normalizedBody }]) : null

      if (aiHeadline) finalHeadline = aiHeadline
      if (aiSummary) finalSummary = aiSummary

      // Last resort fallback
      if (!finalHeadline || !finalSummary) {
        const meta = await generateThreadMeta(normalizedBody, tag, region)
        finalHeadline = finalHeadline || meta.headline
        finalSummary = finalSummary || meta.summary
      }
    }

    await supabase
      .from('stories')
      .update({ headline: finalHeadline, summary: finalSummary, tag, region })
      .eq('id', storyId)

    return { post, error: null }
  }

  async function searchThreads(query) {
    const { data: ftsData } = await supabase
      .from('stories')
      .select('id, headline, tag, region, confidence, created_at')
      .textSearch('fts', query)
      .order('created_at', { ascending: false })
      .limit(15)

    if (ftsData && ftsData.length > 0) return ftsData

    const { data: likeData } = await supabase
      .from('stories')
      .select('id, headline, tag, region, confidence, created_at')
      .ilike('headline', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(15)

    return likeData || []
  }

  async function getRecentThreads() {
    const { data } = await supabase
      .from('stories')
      .select('id, headline, tag, region, confidence, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    return data || []
  }

  return { publishStory, searchThreads, getRecentThreads, generateHeadline, generateSummary }
}