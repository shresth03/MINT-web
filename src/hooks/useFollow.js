import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'

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

    const [followersRes, followingRes, isFollowingRes] = await Promise.all([
      // How many people follow this user
      supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('following_id', targetUserId),

      // How many people this user follows
      supabase
        .from('follows')
        .select('id', { count: 'exact' })
        .eq('follower_id', targetUserId),

      // Does current user follow this user
      user ? supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
        .single() : Promise.resolve({ data: null })
    ])

    setFollowerCount(followersRes.count || 0)
    setFollowingCount(followingRes.count || 0)
    setFollowing(!!isFollowingRes.data)
    setLoading(false)
  }

  async function toggleFollow() {
    if (!user || !targetUserId) return
    if (following) {
      await supabase.from('follows').delete()
        .eq('follower_id', user.id)
        .eq('following_id', targetUserId)
      setFollowing(false)
      setFollowerCount(c => Math.max(0, c - 1))
    } else {
      await supabase.from('follows').insert({
        follower_id: user.id,
        following_id: targetUserId
      })
      setFollowing(true)
      setFollowerCount(c => c + 1)
    }
  }

  async function getFollowedUserIds() {
    if (!user) return []
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
    return (data || []).map(f => f.following_id)
  }

  return { following, followerCount, followingCount, loading, toggleFollow, getFollowedUserIds }
}