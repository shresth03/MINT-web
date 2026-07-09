import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'

export function useLiveStreams() {
  const { user } = useAuth()
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchStreams() {
    const { data } = await supabase
      .from('live_streams')
      .select('*, users!live_streams_host_id_fkey(id, username, role, score)')
      .in('status', ['live', 'scheduled'])
      .order('status', { ascending: false }) // 'scheduled' < 'live' alphabetically, flip
      .order('created_at', { ascending: false })
    setStreams(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchStreams()
    const sub = supabase
      .channel('live_streams_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_streams' }, fetchStreams)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function createStream(title, description = '') {
    const { data, error } = await supabase
      .from('live_streams')
      .insert({ host_id: user.id, title, description, status: 'scheduled' })
      .select()
      .single()
    if (!error) setStreams(prev => [data, ...prev])
    return { data, error }
  }

  async function goLive(streamId) {
    const { error } = await supabase
      .from('live_streams')
      .update({ status: 'live', started_at: new Date().toISOString() })
      .eq('id', streamId)
    if (!error) setStreams(prev => prev.map(s => s.id === streamId ? { ...s, status: 'live', started_at: new Date().toISOString() } : s))
    return { error }
  }

  async function endStream(streamId) {
    const { error } = await supabase
      .from('live_streams')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', streamId)
    if (!error) setStreams(prev => prev.filter(s => s.id !== streamId))
    return { error }
  }

  return { streams, loading, createStream, goLive, endStream, refetch: fetchStreams }
}

export function useStreamViewers(streamId) {
  const { user } = useAuth()
  const [viewerCount, setViewerCount] = useState(0)

  useEffect(() => {
    if (!streamId || !user?.id) return

    const channel = supabase.channel(`stream_presence:${streamId}`, {
      config: { presence: { key: user.id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const count = Object.keys(state).length
        setViewerCount(count)
        supabase.from('live_streams').update({ viewer_count: count }).eq('id', streamId)
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, joined_at: new Date().toISOString() })
        }
      })

    return () => supabase.removeChannel(channel)
  }, [streamId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return viewerCount
}
