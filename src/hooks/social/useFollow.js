import { useState, useEffect } from 'react'
import { identityDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

export function useFollow(targetUserId) {
  const { user } = useAuth()
  const [following, setFollowing] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!targetUserId) return
    fetchFollowData()
  }, [targetUserId, user])

  async function fetchFollowData() {
    setLoading(true)

    const { data, error } = await identityDb.rpc('profile_get_stats', {
      p_profile_id: targetUserId
    })

    if (error) {
      setLoading(false)
      return
    }

    setFollowerCount(data?.followers || 0)
    setFollowingCount(data?.following || 0)
    setFollowing(data?.is_following || false)
    setLoading(false)
  }

  async function toggleFollow() {
    if (!user || !targetUserId) return

    const { data: newFollowing, error } = await identityDb.rpc('social_toggle_follow', {
      p_target_user_id: targetUserId
    })

    if (error) return { error }

    setFollowing(newFollowing)
    setFollowerCount(c =>
      newFollowing ? c + 1 : Math.max(0, c - 1)
    )

    return { data: newFollowing, error: null }
  }

  async function getFollowedUserIds() {
    if (!user) return []
    const { data } = await identityDb
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    return (data || []).map(f => f.following_id)
  }

  return { following, followerCount, followingCount, loading, toggleFollow, getFollowedUserIds }
}