import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'

export function useStoryComposer() {
  const { user } = useAuth()

  async function publishStory({ headline, summary, tag, region, confidence, is_breaking, sourcePostIds }) {
    const { data: story, error } = await supabase
      .from('stories')
      .insert({
        headline: headline.trim(),
        summary: summary.trim(),
        tag, region,
        confidence: parseInt(confidence),
        is_breaking
      })
      .select()
      .single()

    if (error) return { error }

    // Always fetch author's most recent osint post — auto-linked as primary source
    const { data: ownPost } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', user.id)
      .eq('is_osint', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const ownPostId = ownPost?.id || null

    // Merge: author's post first, then manually selected (deduped)
    const allSourceIds = [
      ...(ownPostId ? [ownPostId] : []),
      ...(sourcePostIds || []).filter(id => id !== ownPostId)
    ]

    if (allSourceIds.length > 0) {
      await supabase.from('story_sources').insert(
        allSourceIds.map(postId => ({ story_id: story.id, post_id: postId }))
      )
    }

    return { story, error: null }
  }

  // Manual keyword search (Search tab)
  async function searchPosts(query) {
    // Try FTS first
    const { data: ftsData } = await supabase
      .from('posts')
      .select('id, body, created_at, region, tag, users(id, username, role, score)')
      .textSearch('fts', query)
      .eq('is_osint', true)
      .limit(15)

    if (ftsData && ftsData.length > 0) return ftsData

    // Fallback to ilike
    const { data: likeData } = await supabase
      .from('posts')
      .select('id, body, created_at, region, tag, users(id, username, role, score)')
      .eq('is_osint', true)
      .ilike('body', `%${query}%`)
      .limit(15)

    return likeData || []
  }

  // Recent tab — author's own posts first, then all recent
  async function getRecentOsintPosts() {
    const { data: ownPosts } = await supabase
      .from('posts')
      .select('id, body, created_at, region, tag, users(id, username, role, score)')
      .eq('author_id', user.id)
      .eq('is_osint', true)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: allPosts } = await supabase
      .from('posts')
      .select('id, body, created_at, region, tag, users(id, username, role, score)')
      .eq('is_osint', true)
      .order('created_at', { ascending: false })
      .limit(20)

    // Merge deduped, author's posts first
    const seen = new Set()
    return [...(ownPosts || []), ...(allPosts || [])].filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }

  // MATCHES tab — PostgreSQL hybrid search (DocArrange algorithm via RPC)
  // Scoring: 40% keyword overlap + 25% tag + 15% region + 20% recency + credibility boost
  // Post-launch: replace with Python backend semantic embeddings
  async function getSuggestedPosts(headline, region, tag) {
    // Always show author's own posts first
    const { data: ownPosts } = await supabase
      .from('posts')
      .select('id, body, created_at, region, tag, users(id, username, role, score)')
      .eq('author_id', user.id)
      .eq('is_osint', true)
      .order('created_at', { ascending: false })
      .limit(3)

    // Backend hybrid search via RPC
    const { data: similar, error } = await supabase.rpc('find_similar_posts', {
      p_headline: headline,
      p_tag: tag || 'GEOPOLITICAL',
      p_region: region || 'Global',
      p_limit: 15
    })

    if (error) {
      console.error('find_similar_posts RPC error:', error)
      // Fallback to own posts if RPC fails
      return ownPosts || []
    }

    // Map RPC results to post shape
    const similarPosts = (similar || []).map(row => ({
      id: row.post_id,
      body: row.body,
      author_id: row.author_id,
      region: row.region,
      tag: row.tag,
      created_at: row.created_at,
      _similarity: row.similarity_score,
      _match_reason: row.match_reason,
      users: {
        id: row.author_id,
        username: row.username,
        role: row.role,
        score: row.score
      }
    }))

    // Merge: own posts first, then similar (deduped) — DocArrange RRF fusion
    const seen = new Set()
    return [...(ownPosts || []), ...similarPosts].filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }

  return { publishStory, searchPosts, getRecentOsintPosts, getSuggestedPosts }
}