import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'

export function useStoryComposer() {
  const { user } = useAuth()

  async function publishStory({ headline, summary, tag, region, confidence, is_breaking, sourcePostIds }) {
    // Insert story
    const { data: story, error } = await supabase
      .from('stories')
      .insert({ headline: headline.trim(), summary: summary.trim(), tag, region, confidence: parseInt(confidence), is_breaking })
      .select()
      .single()
  
    if (error) return { error }
  
    // Find author's most recent osint post
    const { data: authorPost } = await supabase
      .from('posts')
      .select('id')
      .eq('author_id', user.id)
      .eq('is_osint', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  
    let authorPostId = authorPost?.id || null
  
    // If no existing post, create one automatically from the story
    if (!authorPostId) {
      const { data: newPost } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          body: headline.trim(),
          is_osint: true,
          tag,
          region
        })
        .select('id')
        .single()
      authorPostId = newPost?.id || null
    }
  
    // Build final source list: author first, then manually selected (deduped)
    const allSourceIds = authorPostId
      ? [authorPostId, ...(sourcePostIds || []).filter(id => id !== authorPostId)]
      : (sourcePostIds || [])
  
    if (allSourceIds.length > 0) {
      await supabase.from('story_sources').insert(
        allSourceIds.map(postId => ({ story_id: story.id, post_id: postId }))
      )
    }
  
    return { story, error: null }
  }

  async function searchPosts(query) {
    // Try FTS first
    const { data: ftsData } = await supabase
      .from('posts')
      .select('id, body, created_at, region, users(id, username, role, score)')
      .textSearch('fts', query)
      .eq('is_osint', true)
      .limit(15)
  
    if (ftsData && ftsData.length > 0) return ftsData
  
    // Fallback to ilike
    const { data: likeData } = await supabase
      .from('posts')
      .select('id, body, created_at, region, users(id, username, role, score)')
      .eq('is_osint', true)
      .ilike('body', `%${query}%`)
      .limit(15)
  
    return likeData || []
  }

  async function getRecentOsintPosts() {
    const { data } = await supabase
      .from('posts')
      .select('id, body, created_at, region, users(id, username, role, score)')
      .eq('is_osint', true)
      .order('created_at', { ascending: false })
      .limit(20)
    return data || []
  }

  // Smart suggestions: match by headline keywords + region
  async function getSuggestedPosts(headline, region) {
    const results = []

    // Keyword search from headline
    const words = headline.trim().split(/\s+/).filter(w => w.length > 3)
    if (words.length > 0) {
      const query = words.slice(0, 5).join(' | ')
      const { data: keywordMatches } = await supabase
        .from('posts')
        .select('id, body, created_at, region, users(id, username, role, score)')
        .textSearch('fts', query)
        .eq('is_osint', true)
        .limit(10)
      if (keywordMatches) results.push(...keywordMatches)
    }

    // Region match
    if (region && region !== 'Global') {
      const { data: regionMatches } = await supabase
        .from('posts')
        .select('id, body, created_at, region, users(id, username, role, score)')
        .eq('is_osint', true)
        .ilike('body', `%${region}%`)
        .limit(10)
      if (regionMatches) results.push(...regionMatches)
    }

    // Dedupe by id
    const seen = new Set()
    return results.filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  }

  return { publishStory, searchPosts, getRecentOsintPosts, getSuggestedPosts }
}