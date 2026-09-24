import { useState, useEffect, useCallback } from 'react'
import { identityDb, socialDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

export function useFollow(targetUserId) {
  const { user } = useAuth()
  const userId = user?.id
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchFollowData = useCallback(async () => {
    setLoading(true)

    const [followersRes, followingRes, isFollowingRes] = await Promise.all([
      // How many people follow this user
      identityDb
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('following_id', targetUserId),

      // How many people this user follows
      identityDb
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', targetUserId),

      // Does current user follow this user
      userId ? identityDb
        .from('follows')
        .select('id')
        .eq('follower_id', userId)
        .eq('following_id', targetUserId)
        .maybeSingle() : Promise.resolve({ data: null })  // no row = not following, not an error
    ])

    setFollowerCount(followersRes.count || 0)
    setFollowingCount(followingRes.count || 0)
    setFollowing(!!isFollowingRes.data)
    setLoading(false)
  }, [targetUserId, userId])

  useEffect(() => {
    if (!targetUserId) return
    fetchFollowData()
  }, [targetUserId, fetchFollowData])

  async function toggleFollow() {
    if (!user || !targetUserId) return
    if (following) {
      await identityDb.from('follows').delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
      setFollowing(false)
      setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await identityDb.from('follows').insert({
        follower_id: user.id,
        following_id: targetUserId,
      })
      await socialDb.from('notifications').insert({
        to_user_id: targetUserId,
        from_user_id: user.id,
        type: 'follow',
        post_id: null,
      })
      setFollowing(true)
      setFollowerCount(c => c + 1)
    }
  }

  const getFollowedUserIds = useCallback(async () => {
    if (!userId) return []
    const { data } = await identityDb
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
    return (data || []).map(f => f.following_id)
  }, [userId])

  return { following, followerCount, followingCount, loading, toggleFollow, getFollowedUserIds }
}