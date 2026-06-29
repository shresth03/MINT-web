import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'

export const REACTION_TYPES = [
  { type: 'verified',  icon: '✓', label: 'Verified',  color: 'var(--verified)' },
  { type: 'confirmed', icon: '★', label: 'Confirmed', color: '#ff9f43' },
  { type: 'disputed',  icon: '⚠', label: 'Disputed',  color: 'var(--accent2)' },
  { type: 'breaking',  icon: '⚡', label: 'Breaking',  color: 'var(--accent)' },
]

export function useReactions(postId) {
  const { user } = useAuth()
  const [counts, setCounts] = useState({ verified: 0, confirmed: 0, disputed: 0, breaking: 0 })
  const [userReaction, setUserReaction] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!postId) return
    load()
  }, [postId, user?.id])

  async function load() {
    const [allRes, userRes] = await Promise.all([
      supabase.from('reactions').select('type').eq('post_id', postId),
      user?.id
        ? supabase.from('reactions').select('type').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    const c = { verified: 0, confirmed: 0, disputed: 0, breaking: 0 }
    allRes.data?.forEach(r => { if (c[r.type] !== undefined) c[r.type]++ })
    setCounts(c)
    setUserReaction(userRes.data?.type || null)
    setLoading(false)
  }

  async function toggle(type) {
    if (!user?.id) return

    if (userReaction === type) {
      await supabase.from('reactions').delete()
        .eq('post_id', postId).eq('user_id', user.id)
      setCounts(c => ({ ...c, [type]: Math.max(0, c[type] - 1) }))
      setUserReaction(null)
    } else if (userReaction) {
      await supabase.from('reactions').update({ type })
        .eq('post_id', postId).eq('user_id', user.id)
      setCounts(c => ({ ...c, [userReaction]: Math.max(0, c[userReaction] - 1), [type]: c[type] + 1 }))
      setUserReaction(type)
    } else {
      await supabase.from('reactions').insert({ post_id: postId, user_id: user.id, type })
      setCounts(c => ({ ...c, [type]: c[type] + 1 }))
      setUserReaction(type)
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return { counts, userReaction, total, loading, toggle }
}
