import { useState, useEffect } from 'react'
import { contentDb, identityDb, moderationDb, socialDb, supabase } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

async function fetchProfilesByIds(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))]

  if (uniqueIds.length === 0) return new Map()

  const { data } = await identityDb
    .from('profiles')
    .select('id, username, role, score')
    .in('id', uniqueIds)

  return new Map((data || []).map(p => [p.id, p]))
}

export function useClaims(postId = null) {
  const { user } = useAuth()

  const [claim, setClaim] = useState(null)
  const [notes, setNotes] = useState([])
  const [userNote, setUserNote] = useState(null)
  const [openClaims, setOpenClaims] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!postId) return
    fetchPostClaims()
  }, [postId, user])

  async function fetchAllOpenClaims() {
    const { data: claims } = await supabase.rpc('mod_get_open_claims')

    const postIds = [
      ...new Set((claims || []).map(c => c.post_id).filter(Boolean)),
    ]

    const { data: postsData } = postIds.length
      ? await contentDb
          .from('posts')
          .select('id, body, author_id, created_at')
          .in('id', postIds)
      : { data: [] }

    const postsById = new Map(
      (postsData || []).map(p => [p.id, p])
    )

    const profilesById = await fetchProfilesByIds(
      (postsData || []).map(p => p.author_id)
    )

    const enriched = (claims || []).map(c => {
      const post = postsById.get(c.post_id)

      return {
        ...c,
        posts: post
          ? {
              ...post,
              users: profilesById.get(post.author_id) || null,
            }
          : null,
      }
    })

    setOpenClaims(enriched)

    return enriched
  }

  async function fetchPostClaims() {
    setLoading(true)

    const { data: claimRows } = await supabase.rpc(
      'mod_get_claim_for_post',
      {
        p_post_id: postId,
      }
    )

    const claimData = Array.isArray(claimRows)
      ? claimRows[0] || null
      : claimRows

    setClaim(claimData)

    const { data: notesRaw } = await supabase.rpc(
      'mod_get_notes_for_post',
      {
        p_post_id: postId,
      }
    )

    const profilesById = await fetchProfilesByIds(
      (notesRaw || []).map(n => n.author_id)
    )

    const notesData = (notesRaw || []).map(n => ({
      ...n,
      users: profilesById.get(n.author_id) || null,
    }))

    setNotes(notesData)

    if (user?.id) {
      const existing = notesData.find(
        n => n.author_id === user.id
      )

      setUserNote(existing || null)
    }

    setLoading(false)
  }

  async function submitNote(body, stance) {
    if (!user?.id || !postId) {
      return { error: 'Not authenticated' }
    }

    if (userNote) {
      return {
        error: 'You have already written a note on this post',
      }
    }

    const { data: noteRows, error } = await supabase.rpc(
      'mod_create_note',
      {
        p_payload: {
          post_id: postId,
          body,
          stance,
        },
      }
    )

    const data = Array.isArray(noteRows)
      ? noteRows[0] || null
      : noteRows

    if (!error) {
      setUserNote(data)
      await fetchPostClaims()
    }

    return { data, error }
  }

  async function updateNote(noteId, body, stance) {
    // Kept as a direct update because the current RPC
    // mod_update_note does not support updating stance.
    const { data, error } = await moderationDb
      .from('community_notes')
      .update({ body, stance })
      .eq('id', noteId)
      .select()
      .single()

    if (!error) {
      await fetchPostClaims()
    }

    return { data, error }
  }

  async function deleteNote(noteId) {
    const { error } = await supabase.rpc(
      'mod_delete_note',
      {
        p_note_id: noteId,
      }
    )

    if (!error) {
      setUserNote(null)
      await fetchPostClaims()
    }

    return { error }
  }

  async function resolveClaim(
    claimId,
    status,
    resolutionNote
  ) {
    const { error } = await supabase.rpc(
      'mod_resolve_claim',
      {
        p_claim_id: claimId,
        p_payload: {
          status,
          resolution_note: resolutionNote || null,
        },
      }
    )

    if (!error && postId) {
      await fetchPostClaims()
    }

    return { error }
  }

  async function rateNote(noteId, accuracyRating) {
    const { error } = await supabase.rpc(
      'mod_update_note',
      {
        p_note_id: noteId,
        p_payload: {
          accuracy_rating: accuracyRating,
        },
      }
    )

    if (!error && postId) {
      await fetchPostClaims()
    }

    return { error }
  }

  async function overrideScore(
    targetUserId,
    newScore,
    reason
  ) {
    const { error } = await identityDb
      .from('profiles')
      .update({
        score: Math.max(
          -50,
          Math.min(100, newScore)
        ),
      })
      .eq('id', targetUserId)

    if (!error) {
      await socialDb
        .from('notifications')
        .insert({
          to_user_id: targetUserId,
          from_user_id: user.id,
          type: 'score_override',
          post_id: null,
        })
    }

    return { error }
  }

  const challengeWeight = notes
    .filter(n => n.stance === 'challenges')
    .reduce(
      (sum, n) => sum + (n.weight || 1),
      0
    )

  const supportWeight = notes
    .filter(n => n.stance === 'supports')
    .reduce(
      (sum, n) => sum + (n.weight || 1),
      0
    )

  const claimVisible =
    challengeWeight >= 5 || !!claim

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