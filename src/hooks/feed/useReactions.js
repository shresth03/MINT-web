import { useState, useEffect } from 'react'
import { socialDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'
import { ShieldCheck, Star, AlertTriangle, Zap } from 'lucide-react'

export const REACTION_TYPES = [
  { type: 'verified',  Icon: ShieldCheck,   label: 'Verified',  color: 'var(--verified)' },
  { type: 'confirmed', Icon: Star,          label: 'Confirmed', color: '#ff9f43' },
  { type: 'disputed',  Icon: AlertTriangle, label: 'Disputed',  color: 'var(--accent2)' },
  { type: 'breaking',  Icon: Zap,           label: 'Breaking',  color: 'var(--accent)' },
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
      socialDb.from('reactions').select('type').eq('post_id', postId),
      user?.id
        ? socialDb.from('reactions').select('type').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
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
      await socialDb.from('reactions').delete()
        .eq('post_id', postId).eq('user_id', user.id)
      setCounts(c => ({ ...c, [type]: Math.max(0, c[type] - 1) }))
      setUserReaction(null)
    } else if (userReaction) {
      await socialDb.from('reactions').update({ type })
        .eq('post_id', postId).eq('user_id', user.id)
      setCounts(c => ({ ...c, [userReaction]: Math.max(0, c[userReaction] - 1), [type]: c[type] + 1 }))
      setUserReaction(type)
    } else {
      await socialDb.from('reactions').insert({ post_id: postId, user_id: user.id, type })
      setCounts(c => ({ ...c, [type]: c[type] + 1 }))
      setUserReaction(type)
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  return { counts, userReaction, total, loading, toggle }
}
