import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'

export function useUser() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    fetchProfile()
  }, [user?.id])

  async function fetchProfile() {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    if (!error && data) setProfile(data)
    setLoading(false)
  }

  async function updateProfile(updates) {
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)

    if (!error) setProfile(prev => ({ ...prev, ...updates }))
    return { error }
  }

  return { profile, loading, updateProfile, refetch: fetchProfile }
}