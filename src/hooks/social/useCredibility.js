import { useState, useEffect } from 'react'
import { contentDb, identityDb, moderationDb, socialDb } from '../../api/supabase'

// Score each news post on a 0–100 scale then average across all posts.
// New OSINT user with no posts = 80.
async function scoreNewsPosts(targetUserId) {
  const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch all news posts by this analyst
  const { data: ownPosts } = await contentDb
    .from('posts')
    .select('id, tag, region, created_at')
    .eq('author_id', targetUserId)
    .eq('post_type', 'news')
    .gte('created_at', sixMonthsAgo)

  if (!ownPosts || ownPosts.length === 0) return {
    avgPostScore: null,
    totalPosts: 0,
    breakdown: {
      avgPostScore: 0, totalPosts: 0, totalCited: 0, totalPeerCorr: 0,
      totalReactions: 0, positiveReactions: 0, negativeReactions: 0,
      falseClaims: 0, verifiedClaims: 0,
    },
  }

  const postIds = ownPosts.map(p => p.id)

  // Which accounts hold the 'osint' role — used to scope peer-corroboration
  // to other analysts (posts.author_id lives in a different schema than
  // profiles.role, so this can't be done as an embedded-relation filter).
  const { data: osintProfiles } = await identityDb.from('profiles').select('id').eq('role', 'osint')
  const osintIds = (osintProfiles || []).map(p => p.id).filter(id => id !== targetUserId)

  // Parallel fetches for all signal data
  const [citedRes, peerPostsRes, reactionsRes, claimsRes, storiesRes] = await Promise.all([
    // Which of this analyst's posts were cited in stories?
    contentDb.from('story_sources').select('post_id').in('post_id', postIds),

    // All news posts from OTHER osint analysts for peer-corroboration check
    osintIds.length
      ? contentDb
          .from('posts')
          .select('id, author_id, tag, region, created_at')
          .eq('post_type', 'news')
          .in('author_id', osintIds)
          .gte('created_at', sixMonthsAgo)
      : Promise.resolve({ data: [] }),

    // All reactions on this analyst's news posts
    socialDb.from('reactions').select('post_id, type').in('post_id', postIds),

    // Claims on this analyst's news posts
    moderationDb.from('claims').select('post_id, status').in('post_id', postIds),

    // Stories to check timing (when was the story first compiled?)
    contentDb
      .from('story_sources')
      .select('post_id, story_id, stories!inner(created_at, tag, region)')
      .in('post_id', postIds),
  ])

  const citedSet = new Set((citedRes.data || []).map(r => r.post_id))
  const allPeerPosts = peerPostsRes.data || []

  // Build lookup maps for reactions and claims keyed by post_id
  const reactionsByPost = {}
  ;(reactionsRes.data || []).forEach(r => {
    if (!reactionsByPost[r.post_id]) reactionsByPost[r.post_id] = []
    reactionsByPost[r.post_id].push(r.type)
  })

  const claimsByPost = {}
  ;(claimsRes.data || []).forEach(c => { claimsByPost[c.post_id] = c.status })

  // Map post_id → story created_at for timing bonus
  const storyTimeByPost = {}
  ;(storiesRes.data || []).forEach(s => {
    storyTimeByPost[s.post_id] = s.stories?.created_at
  })

  // Score each post
  const postScores = ownPosts.map(post => {
    let score = 50 // base

    // +20 if cited in a story
    if (citedSet.has(post.id)) score += 20

    // +10 timing bonus: posted ≥30 min before the story was compiled
    const storyTime = storyTimeByPost[post.id]
    if (storyTime) {
      const minutesBefore = (new Date(storyTime) - new Date(post.created_at)) / 60000
      if (minutesBefore >= 30) score += 10
    }

    // Peer corroboration: 2+ other OSINT analysts posted similar within 24h → +15
    const window24h = 24 * 60 * 60 * 1000
    const postTime = new Date(post.created_at).getTime()
    const similar = allPeerPosts.filter(p =>
      Math.abs(new Date(p.created_at).getTime() - postTime) <= window24h &&
      (p.tag === post.tag || p.region === post.region)
    )
    if (new Set(similar.map(p => p.author_id)).size >= 2) score += 15

    // Reactions: +3 per verified/confirmed, -5 per disputed (capped ±15)
    const reactions = reactionsByPost[post.id] || []
    const positiveR = reactions.filter(r => r === 'verified' || r === 'confirmed').length
    const negativeR = reactions.filter(r => r === 'disputed').length
    score += Math.max(-15, Math.min(15, positiveR * 3 - negativeR * 5))

    // Claim outcome
    const claimStatus = claimsByPost[post.id]
    if (claimStatus === 'verified')  score += 15
    if (claimStatus === 'false')     score -= 30
    if (claimStatus === 'reversed')  score += 5

    return Math.max(0, Math.min(100, score))
  })

  const avgPostScore = postScores.reduce((a, b) => a + b, 0) / postScores.length

  // Aggregate counts for breakdown display
  const totalCited       = [...citedSet].filter(id => postIds.includes(id)).length
  const totalPeerCorr    = ownPosts.filter(post => {
    const postTime = new Date(post.created_at).getTime()
    const similar = allPeerPosts.filter(p =>
      Math.abs(new Date(p.created_at).getTime() - postTime) <= 24 * 60 * 60 * 1000 &&
      (p.tag === post.tag || p.region === post.region)
    )
    return new Set(similar.map(p => p.author_id)).size >= 2
  }).length

  const totalReactions   = (reactionsRes.data || []).length
  const positiveRTotal   = (reactionsRes.data || []).filter(r => r.type === 'verified' || r.type === 'confirmed').length
  const negativeRTotal   = (reactionsRes.data || []).filter(r => r.type === 'disputed').length
  const falseClaims      = (claimsRes.data || []).filter(c => c.status === 'false').length
  const verifiedClaims   = (claimsRes.data || []).filter(c => c.status === 'verified').length

  return {
    avgPostScore: Math.round(avgPostScore),
    totalPosts: ownPosts.length,
    breakdown: {
      avgPostScore: Math.round(avgPostScore),
      totalPosts: ownPosts.length,
      totalCited,
      totalPeerCorr,
      totalReactions,
      positiveReactions: positiveRTotal,
      negativeReactions: negativeRTotal,
      falseClaims,
      verifiedClaims,
    },
  }
}

// Compute final analyst score including consistency + note accuracy modifiers
export async function computeScore(targetUserId) {
  const [postResult, noteRes, consistencyRes] = await Promise.all([
    scoreNewsPosts(targetUserId),
    moderationDb.from('community_notes').select('accuracy_rating').eq('author_id', targetUserId).not('accuracy_rating', 'is', null),
    contentDb.from('posts')
      .select('created_at')
      .eq('author_id', targetUserId)
      .eq('post_type', 'news')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ])

  const { avgPostScore, breakdown } = postResult

  // Note accuracy modifier (0–5 pts)
  const accurateNotes   = noteRes.data?.filter(n => n.accuracy_rating === 'accurate').length || 0
  const totalRatedNotes = noteRes.data?.length || 0
  const noteBoost = totalRatedNotes > 0 ? Math.round((accurateNotes / totalRatedNotes) * 5) : 0

  // Consistency modifier (0–5 pts)
  const activeDays = new Set(consistencyRes.data?.map(p => p.created_at.slice(0, 10)) || []).size
  const consistencyBoost = Math.round((activeDays / 30) * 5)

  // No news posts yet = 80 (new analyst baseline)
  const base = avgPostScore === null ? 80 : avgPostScore
  const finalScore = Math.min(100, Math.max(0, base + noteBoost + consistencyBoost))

  const extra = { noteBoost, consistencyBoost, activeDays, accurateNotes, totalRatedNotes, finalScore }
  return {
    score: finalScore,
    breakdown: breakdown
      ? { ...breakdown, ...extra }
      : { avgPostScore: 0, totalPosts: 0, totalCited: 0, totalPeerCorr: 0, totalReactions: 0, positiveReactions: 0, negativeReactions: 0, falseClaims: 0, verifiedClaims: 0, ...extra },
  }
}

export function useCredibility(targetUserId) {
  const [score, setScore] = useState(null)
  const [breakdown, setBreakdown] = useState(null)
  const [loading, setLoading] = useState(true)

  async function fetchCredibility() {
    setLoading(true)

    const { data: userData } = await identityDb
      .from('profiles')
      .select('score, role')
      .eq('id', targetUserId)
      .single()

    if (!userData || userData.role !== 'osint') {
      setScore(null)
      setBreakdown(null)
      setLoading(false)
      return
    }

    const { score: computed, breakdown: bd } = await computeScore(targetUserId)

    // Write back so leaderboard stays current
    await identityDb.from('profiles').update({ score: computed }).eq('id', targetUserId)

    setScore(computed)
    setBreakdown(bd)
    setLoading(false)
  }

  useEffect(() => {
    if (!targetUserId) return
    fetchCredibility()
  }, [targetUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  return { score, breakdown, loading, refetch: fetchCredibility }
}
