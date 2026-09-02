import { useState, useEffect } from 'react'
import { contentDb, identityDb, moderationDb, socialDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

async function fetchProfilesByIds(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map()
  const { data } = await identityDb.from('profiles').select('id, username, role, score').in('id', uniqueIds)
  return new Map((data || []).map(p => [p.id, p]))
}

export function useClaims(postId = null) {
  const { user } = useAuth()
  const [claim, setClaim]           = useState(null)   // claim on this post (if any)
  const [notes, setNotes]           = useState([])      // community notes on this post
  const [userNote, setUserNote]     = useState(null)    // current user's note
  const [openClaims, setOpenClaims] = useState([])      // all open claims (admin view)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    if (!postId) return
    fetchPostClaims()
  }, [postId, user])

  // Admin: fetch all open claims across platform
  async function fetchAllOpenClaims() {
    const { data: claims } = await moderationDb
      .from('claims')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })

    const postIds = [...new Set((claims || []).map(c => c.post_id).filter(Boolean))]
    const { data: postsData } = postIds.length
      ? await contentDb.from('posts').select('id, body, author_id, created_at').in('id', postIds)
      : { data: [] }
    const postsById = new Map((postsData || []).map(p => [p.id, p]))
    const profilesById = await fetchProfilesByIds((postsData || []).map(p => p.author_id))

    const enriched = (claims || []).map(c => {
      const post = postsById.get(c.post_id)
      return {
        ...c,
        posts: post ? { ...post, users: profilesById.get(post.author_id) || null } : null,
      }
    })

    setOpenClaims(enriched)
    return enriched
  }

  async function fetchPostClaims() {
    setLoading(true)

    // Get claim on this post
    const { data: claimData } = await moderationDb
      .from('claims')
      .select('*')
      .eq('post_id', postId)
      .maybeSingle()

    setClaim(claimData || null)

    // Get all community notes on this post with author info
    const { data: notesRaw } = await moderationDb
      .from('community_notes')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })

    const profilesById = await fetchProfilesByIds((notesRaw || []).map(n => n.author_id))
    const notesData = (notesRaw || []).map(n => ({ ...n, users: profilesById.get(n.author_id) || null }))

    setNotes(notesData)

    // Check if current user already wrote a note
    if (user?.id) {
      const existing = notesData.find(n => n.author_id === user.id)
      setUserNote(existing || null)
    }

    setLoading(false)
  }

  // Submit a community note
  async function submitNote(body, stance) {
    if (!user?.id || !postId) return { error: 'Not authenticated' }
    if (userNote) return { error: 'You have already written a note on this post' }

    const { data, error } = await moderationDb
      .from('community_notes')
      .insert({ post_id: postId, author_id: user.id, body, stance })
      .select()
      .single()

    if (!error) {
      setUserNote(data)
      await fetchPostClaims() // refresh — may trigger claim creation
    }
    return { data, error }
  }

  async function updateNote(noteId, body, stance) {
    const { data, error } = await moderationDb
      .from('community_notes')
      .update({ body, stance })
      .eq('id', noteId)
      .select()
      .single()

    if (!error) await fetchPostClaims()
    return { data, error }
  }

  async function deleteNote(noteId) {
    const { error } = await moderationDb
      .from('community_notes')
      .delete()
      .eq('id', noteId)

    if (!error) {
      setUserNote(null)
      await fetchPostClaims()
    }
    return { error }
  }

  // Admin: resolve a claim
  async function resolveClaim(claimId, status, resolutionNote) {
    const { error } = await moderationDb
      .from('claims')
      .update({
        status,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        resolution_note: resolutionNote || null
      })
      .eq('id', claimId)

    if (!error && postId) await fetchPostClaims()
    return { error }
  }

  // Admin: rate a community note's accuracy
  async function rateNote(noteId, accuracyRating) {
    const { error } = await moderationDb
      .from('community_notes')
      .update({ accuracy_rating: accuracyRating })
      .eq('id', noteId)

    if (!error && postId) await fetchPostClaims()
    return { error }
  }

  // Admin: manual score override
  async function overrideScore(targetUserId, newScore, reason) {
    const { error } = await identityDb
      .from('profiles')
      .update({ score: Math.max(-50, Math.min(100, newScore)) })
      .eq('id', targetUserId)

    // Log the override in a notification so there's an audit trail
    if (!error) {
      await socialDb.from('notifications').insert({
        to_user_id: targetUserId,
        from_user_id: user.id,
        type: 'score_override',
        post_id: null
      })
    }
    return { error }
  }

  // Computed helpers
  const challengeWeight = notes
    .filter(n => n.stance === 'challenges')
    .reduce((sum, n) => sum + (n.weight || 1), 0)

  const supportWeight = notes
    .filter(n => n.stance === 'supports')
    .reduce((sum, n) => sum + (n.weight || 1), 0)

  const claimVisible = challengeWeight >= 5 || !!claim

  return {
    claim,
    notes,
    userNote,
    openClaims,
    loading,
    challengeWeight,
    supportWeight,
    claimVisible,
    submitNote,
    updateNote,
    deleteNote,
    resolveClaim,
    rateNote,
    overrideScore,
    fetchAllOpenClaims,
    refetch: fetchPostClaims,
  }
}
