import { useCallback } from 'react'
import { supabase, contentDb, identityDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'
import { ingest } from '../../lib/ingestion/index.js'

const PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/anthropic-proxy`

async function callClaude(model, messages, max_tokens) {
  const { data: { session } } = await supabase.auth.getSession()
  const jwt = session?.access_token

  if (!jwt) return null

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
    },
    body: JSON.stringify({ model, messages, max_tokens }),
  })

  return res.json()
}

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

    if (headline.length > 100) {
      headline = headline.substring(0, 97) + '...'
    }

    return {
      headline,
      summary: body.trim(),
      tag: tag || 'OTHER',
      region: region || 'Global'
    }
  }

  const generateHeadline = useCallback(async (sourcePosts) => {
    if (!sourcePosts || sourcePosts.length === 0) return null

    const sourceContext = sourcePosts
      .map((p, i) => `Source #${i + 1} (@${p.users?.username}): ${p.body}`)
      .join('\n')

    try {
      const data = await callClaude(
        'claude-sonnet-4-6',
        [{
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
        60
      )

      return data?.content?.[0]?.text?.trim() ?? null
    } catch {
      return null
    }
  }, [])

  const generateSummary = useCallback(async (headline, sourcePosts) => {
    if (!sourcePosts || sourcePosts.length === 0) return null

    const sourceContext = sourcePosts
      .map((p, i) => `Source #${i + 1} (@${p.users?.username}): ${p.body}`)
      .join('\n')

    try {
      const data = await callClaude(
        'claude-sonnet-4-6',
        [{
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
        300
      )

      return data?.content?.[0]?.text?.trim() ?? null
    } catch {
      return null
    }
  }, [])

  async function refreshStorySummary(storyId, currentHeadline) {
    const { data: sources } = await contentDb
      .from('story_sources')
      .select('post_id, posts(body, author_id)')
      .eq('story_id', storyId)

    if (!sources || sources.length === 0) return

    // posts.author_id points into identity, a separate schema —
    // fetch profiles separately and merge them back in.
    const authorIds = [
      ...new Set(
        sources
          .map(s => s.posts?.author_id)
          .filter(Boolean)
      )
    ]

    const { data: authors } = authorIds.length
      ? await identityDb.rpc('profile_get_by_ids', {
          p_ids: authorIds
        })
      : { data: [] }

    const authorsById = new Map(
      (authors || []).map(a => [a.id, a])
    )

    const sourcePosts = sources.map(s => ({
      body: s.posts.body,
      users: authorsById.get(s.posts?.author_id) || null,
    }))

    const newSummary = await generateSummary(
      currentHeadline,
      sourcePosts
    )

    if (newSummary) {
      await supabase.rpc('story_update', {
        p_story_id: storyId,
        p_payload: {
          summary: newSummary
        }
      })
    }
  }

  async function publishStory({
    body,
    tag,
    region,
    regionLat,
    regionLng,
    threadId,
    headline,
    summary
  }) {
    const {
      data: { session }
    } = await supabase.auth.getSession()

    const jwt = session?.access_token

    // Normalise to English for the AI pipeline;
    // original body is stored in the DB.
    const { text: normalizedBody } = await ingest(body, jwt)

    // Insert the OSINT post directly.
    // There is no existing RPC that reproduces this operation:
    // social_create_post creates a non-OSINT standard post.
    const { data: post, error } = await contentDb
      .from('posts')
      .insert({
        author_id: user.id,
        body: body.trim(),
        tag,
        region,
        region_lat: regionLat ?? null,
        region_lng: regionLng ?? null,
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
      // Trigger already inserted story_sources via manual_story_id.
      // Refresh the story summary with all sources including new post.
      const { data: storyRows } = await supabase.rpc(
        'story_get_by_id',
        {
          p_story_id: threadId
        }
      )

      const story = Array.isArray(storyRows)
        ? storyRows[0]
        : storyRows

      await refreshStorySummary(
        threadId,
        story?.headline || headline || ''
      )

      return { post, error: null }
    }

    // ── Auto-cluster path ──
    // Poll until the Postgres trigger links the post to a story
    // (max 5 × 400ms = 2s).
    let newSources = null

    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 400))

      const { data } = await supabase.rpc(
        'story_get_ids_for_post',
        {
          p_post_id: post.id
        }
      )

      if (data && data.length > 0) {
        newSources = data.map(storyId => ({
          story_id: storyId
        }))
        break
      }
    }

    if (!newSources || newSources.length === 0) {
      return { post, error: null }
    }

    // Clean up duplicates if trigger somehow linked to multiple stories.
    if (newSources.length > 1) {
      const removeIds = newSources
        .slice(0, -1)
        .map(s => s.story_id)

      await supabase.rpc('story_unlink_sources', {
        p_post_id: post.id,
        p_story_ids: removeIds
      })
    }

    const storyId = newSources[newSources.length - 1].story_id

    // Use AI headline/summary if available,
    // fall back to keyword-based metadata.
    let finalHeadline = headline
    let finalSummary = summary

    if (!finalHeadline || !finalSummary) {
      // Try Claude first.
      const aiHeadline = !finalHeadline
        ? await generateHeadline([
            {
              users: {
                username:
                  user?.email?.split('@')[0] || 'analyst'
              },
              body: normalizedBody
            }
          ])
        : null

      const aiSummary = !finalSummary
        ? await generateSummary(
            finalHeadline || aiHeadline || normalizedBody,
            [
              {
                users: {
                  username:
                    user?.email?.split('@')[0] || 'analyst'
                },
                body: normalizedBody
              }
            ]
          )
        : null

      if (aiHeadline) {
        finalHeadline = aiHeadline
      }

      if (aiSummary) {
        finalSummary = aiSummary
      }

      // Last resort fallback.
      if (!finalHeadline || !finalSummary) {
        const meta = await generateThreadMeta(
          normalizedBody,
          tag,
          region
        )

        finalHeadline = finalHeadline || meta.headline
        finalSummary = finalSummary || meta.summary
      }
    }

    // story_update cannot update tag, region, or coordinates,
    // so this final multi-field update remains a direct DB operation.
    await contentDb
      .from('stories')
      .update({
        headline: finalHeadline,
        summary: finalSummary,
        tag,
        region,
        region_lat: regionLat ?? null,
        region_lng: regionLng ?? null
      })
      .eq('id', storyId)

    return { post, error: null }
  }

  async function searchThreads(query) {
    const { data } = await supabase.rpc(
      'story_search_fallback',
      {
        p_query: query,
        p_limit: 15
      }
    )

    return data || []
  }

  async function getRecentThreads() {
    const { data } = await supabase.rpc(
      'story_get_all',
      {
        p_limit: 20
      }
    )

    return data || []
  }

  return {
    publishStory,
    searchThreads,
    getRecentThreads,
    generateHeadline,
    generateSummary
  }
}