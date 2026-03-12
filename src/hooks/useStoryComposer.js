import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'

export function useStoryComposer() {
  const { user } = useAuth()

  async function publishStory({ headline, summary, tag, region, confidence, is_breaking, sourcePostIds }) {
    // Insert story
    const { data: story, error } = await supabase
      .from('stories')
      .insert({
        headline: headline.trim(),
        summary: summary.trim(),
        tag,
        region,
        confidence: parseInt(confidence),
        is_breaking
      })
      .select()
      .single()

    if (error) return { error }

    // Link source posts
    if (sourcePostIds?.length > 0) {
      await supabase.from('story_sources').insert(
        sourcePostIds.map(postId => ({
          story_id: story.id,
          post_id: postId
        }))
      )
    }

    return { story, error: null }
  }

  async function searchPosts(query) {
    const { data } = await supabase
      .from('posts')
      .select('id, body, created_at, users(username, role)')
      .textSearch('fts', query)
      .eq('is_osint', true)
      .limit(10)
    return data || []
  }

  async function getRecentOsintPosts() {
    const { data } = await supabase
      .from('posts')
      .select('id, body, created_at, users(username, role)')
      .eq('is_osint', true)
      .order('created_at', { ascending: false })
      .limit(20)
    return data || []
  }

  return { publishStory, searchPosts, getRecentOsintPosts }
}