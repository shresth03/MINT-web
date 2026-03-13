import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'

export function useCredibility(targetUserId) {
  const [score, setScore] = useState(null)
  const [breakdown, setBreakdown] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!targetUserId) return
    fetchCredibility()
  }, [targetUserId])

  async function fetchCredibility() {
    setLoading(true)

    // Get user role + score
    const { data: userData } = await supabase
      .from('users')
      .select('score, role')
      .eq('id', targetUserId)
      .single()

    if (!userData || userData.role !== 'osint') {
      setScore(null)
      setBreakdown(null)
      setLoading(false)
      return
    }

    setScore(userData.score)

    // --- Claim accuracy breakdown ---
    const { data: claimData } = await supabase
      .from('claims')
      .select('status, posts!inner(author_id)')
      .eq('posts.author_id', targetUserId)
      .in('status', ['verified', 'false', 'reversed'])

    const verified  = claimData?.filter(c => c.status === 'verified').length  || 0
    const falseCl   = claimData?.filter(c => c.status === 'false').length     || 0
    const reversed  = claimData?.filter(c => c.status === 'reversed').length  || 0
    const totalResolved = verified + falseCl + reversed

    const claimAccuracyPts = totalResolved > 0
      ? Math.round((verified / totalResolved) * 35)
      : 0
    const falsePenalty  = falseCl * 20
    const reversalBonus = reversed * 25

    // --- Corroboration rate ---
    const { count: totalPosts } = await supabase
      .from('posts')
      .select('id', { count: 'exact' })
      .eq('author_id', targetUserId)

    const { data: citedData } = await supabase
      .from('story_sources')
      .select('post_id, posts!inner(author_id)')
      .eq('posts.author_id', targetUserId)

    const citedPosts = new Set(citedData?.map(r => r.post_id) || []).size
    const corroborationPts = totalPosts > 0
      ? Math.round((citedPosts / totalPosts) * 25)
      : 0

    // --- Multi-source stories ---
    const { data: storySourceData } = await supabase
      .from('story_sources')
      .select('story_id, posts!inner(author_id)')
      .eq('posts.author_id', targetUserId)

    // Count stories where this analyst contributed AND story has 3+ sources total
    const analystStoryIds = [...new Set(storySourceData?.map(r => r.story_id) || [])]
    let multiSourceCount = 0
    if (analystStoryIds.length > 0) {
      const { data: allSources } = await supabase
        .from('story_sources')
        .select('story_id')
        .in('story_id', analystStoryIds)

      const countPerStory = {}
      allSources?.forEach(r => {
        countPerStory[r.story_id] = (countPerStory[r.story_id] || 0) + 1
      })
      multiSourceCount = Object.values(countPerStory).filter(n => n >= 3).length
    }
    const multiSourcePts = Math.min(20, multiSourceCount * 5)

    // --- Note accuracy rate ---
    const { data: noteData } = await supabase
      .from('community_notes')
      .select('accuracy_rating')
      .eq('author_id', targetUserId)
      .not('accuracy_rating', 'is', null)

    const accurateNotes   = noteData?.filter(n => n.accuracy_rating === 'accurate').length  || 0
    const totalRatedNotes = noteData?.length || 0
    const notePts = totalRatedNotes > 0
      ? Math.round((accurateNotes / totalRatedNotes) * 15)
      : 0

    // --- Consistency ---
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentPosts } = await supabase
      .from('posts')
      .select('created_at')
      .eq('author_id', targetUserId)
      .gte('created_at', thirtyDaysAgo)

    const activeDays = new Set(
      recentPosts?.map(p => p.created_at.slice(0, 10)) || []
    ).size
    const consistencyPts = Math.min(10, Math.round((activeDays / 30) * 10))

    setBreakdown({
      score: userData.score,
      base: 50,
      claimAccuracyPts,
      falsePenalty,
      reversalBonus,
      corroborationPts,
      multiSourcePts,
      notePts,
      consistencyPts,
      // raw counts for display
      verified,
      falseClaims: falseCl,
      reversed,
      totalResolved,
      totalPosts,
      citedPosts,
      multiSourceCount,
      accurateNotes,
      totalRatedNotes,
      activeDays,
    })

    setLoading(false)
  }

  return { score, breakdown, loading, refetch: fetchCredibility }
}