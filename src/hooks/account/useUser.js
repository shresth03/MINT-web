import { useState, useEffect, useCallback } from 'react'
import { identityDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

export function useUser() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setLoading(false)
      return { data: null, error: null }
    }

    setLoading(true)

    const { data, error } = await identityDb.rpc('profile_get_by_id', {
      p_user_id: user.id,
    })

    if (!error && data?.length > 0) {
      setProfile(data[0])
    }

    setLoading(false)

    return {
      data: data?.[0] || null,
      error,
    }
  }, [user])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function updateProfile(updates) {
    if (!user?.id) {
      return {
        error: new Error('User is not authenticated'),
      }
    }

    if (!Object.prototype.hasOwnProperty.call(updates, 'username')) {
      return {
        error: new Error('profile_update only supports username'),
      }
    }

    const { data, error } = await identityDb.rpc('profile_update', {
      p_user_id: user.id,
      p_username: updates.username,
    })

    if (!error && data?.length > 0) {
      setProfile(data[0])
    }

    return {
      data: data?.[0] || null,
      error,
    }
  }

  return {
    profile,
    loading,
    updateProfile,
    refetch: fetchProfile,
  }
}