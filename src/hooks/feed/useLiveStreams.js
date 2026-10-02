import { useState, useEffect } from 'react'
import { supabase, identityDb, mediaDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

export function useLiveStreams() {
  const { user } = useAuth()
  const [streams, setStreams] = useState([])
  const [loading, setLoading] = useState(true)

  async function fetchStreams() {
    const { data, error } = await mediaDb.rpc('stream_get_active')

    if (error) {
      console.error('Error fetching live streams:', error)
      setLoading(false)
      return
    }

    const hostIds = [
      ...new Set(
        (data || [])
          .map(stream => stream.host_id)
          .filter(Boolean)
      ),
    ]

    let hostsById = new Map()

    if (hostIds.length) {
      const { data: hosts, error: hostError } =
        await identityDb.rpc('profile_get_by_ids', {
          p_ids: hostIds,
        })

      if (hostError) {
        console.error('Error fetching stream hosts:', hostError)
      }

      hostsById = new Map(
        (hosts || []).map(host => [
          host.id,
          {
            id: host.id,
            username: host.username,
            role: host.role,
            score: host.score,
          },
        ])
      )
    }

    setStreams(
      (data || []).map(stream => ({
        ...stream,
        users: hostsById.get(stream.host_id) || null,
      }))
    )

    setLoading(false)
  }

  useEffect(() => {
    fetchStreams()

    const sub = supabase
      .channel('live_streams_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'media',
          table: 'live_streams',
        },
        fetchStreams
      )
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function createStream(title, description = '') {
    const { data, error } = await mediaDb.rpc('stream_create', {
      p_title: title,
      p_description: description,
    })

    if (!error) {
      await fetchStreams()
    }

    return { data, error }
  }

  async function goLive(streamId) {
    const startedAt = new Date().toISOString()

    const { error } = await mediaDb
      .from('live_streams')
      .update({
        status: 'live',
        started_at: startedAt,
      })
      .eq('id', streamId)

    if (!error) {
      setStreams(prev =>
        prev.map(stream =>
          stream.id === streamId
            ? {
                ...stream,
                status: 'live',
                started_at: startedAt,
              }
            : stream
        )
      )
    }

    return { error }
  }

  async function endStream(streamId) {
    const endedAt = new Date().toISOString()

    const { error } = await mediaDb
      .from('live_streams')
      .update({
        status: 'ended',
        ended_at: endedAt,
      })
      .eq('id', streamId)

    if (!error) {
      setStreams(prev =>
        prev.filter(stream => stream.id !== streamId)
      )
    }

    return { error }
  }

  return {
    streams,
    loading,
    createStream,
    goLive,
    endStream,
    refetch: fetchStreams,
  }
}

export function useStreamViewers(streamId) {
  const { user } = useAuth()
  const [viewerCount, setViewerCount] = useState(0)

  useEffect(() => {
    if (!streamId || !user?.id) return

    const channel = supabase.channel(`stream_presence:${streamId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const count = Object.keys(state).length

        setViewerCount(count)

        mediaDb.rpc('stream_update_status', {
          p_stream_id: streamId,
          p_payload: {
            viewer_count: count,
          },
        })
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            joined_at: new Date().toISOString(),
          })
        }
      })

    return () => supabase.removeChannel(channel)
  }, [streamId, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return viewerCount
}