import { useState, useEffect, useCallback } from 'react'
import { identityDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

export function useUser() {
  const { user } = useAuth()
  const userId = user?.id
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    const { data, error } = await identityDb
      .from('profiles')
      .select('id, username, role, score')
      .eq('id', userId)
      .single()
    if (!error && data) setProfile(data)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    fetchProfile()
  }, [userId, fetchProfile])

  async function updateProfile(updates) {
    const { error } = await identityDb
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (!error) setProfile(prev => ({ ...prev, ...updates }))
    return { error }
  }

  return { profile, loading, updateProfile, refetch: fetchProfile }
}