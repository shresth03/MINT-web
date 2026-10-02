import { useState, useEffect } from 'react'
import { supabase, identityDb, mediaDb } from '../../api/supabase'
import { useAuth } from '../core/useAuth'

async function attachAuthors(rows) {
  const ids = [...new Set(rows.map(r => r.author_id).filter(Boolean))]

  if (ids.length === 0) return rows

  const { data } = await identityDb
    .from('profiles')
    .select('id, username, role, score')
    .in('id', ids)

  const byId = new Map((data || []).map(p => [p.id, p]))

  return rows.map(r => ({
    ...r,
    users: byId.get(r.author_id) || null,
  }))
}

export function useVideos(type = null) {
  const { user } = useAuth()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  async function fetchVideos() {
    let q = mediaDb
      .from('videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (type) q = q.eq('type', type)

    const { data } = await q

    const likedResult = user?.id
      ? await mediaDb.rpc('engagement_get_liked_video_ids')
      : { data: [] }

    const likedIds = new Set(likedResult.data || [])

    const enriched = await attachAuthors(data || [])

    setVideos(
      enriched.map(video => ({
        ...video,
        _liked: likedIds.has(video.id),
      }))
    )

    setLoading(false)
  }

  useEffect(() => {
    fetchVideos()

    const sub = supabase
      .channel('videos_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'media',
          table: 'videos',
        },
        payload => {
          fetchSingleVideo(payload.new.id)
        }
      )
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [type, user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSingleVideo(id) {
    const { data } = await mediaDb
      .from('videos')
      .select('*')
      .eq('id', id)
      .single()

    if (data) {
      const [enriched] = await attachAuthors([data])

      const { data: likedIds } = user?.id
        ? await mediaDb.rpc('engagement_get_liked_video_ids')
        : { data: [] }

      setVideos(prev => [
        {
          ...enriched,
          _liked: (likedIds || []).includes(id),
        },
        ...prev,
      ])
    }
  }

  async function uploadVideo(file, meta = {}) {
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(path, file, { contentType: file.type })

    if (uploadError) {
      setUploading(false)
      return { error: uploadError }
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from('videos')
      .getPublicUrl(path)

    const { data, error } = await mediaDb
      .from('videos')
      .insert({
        author_id: user.id,
        title: meta.title || '',
        body: meta.body || '',
        video_url: publicUrl,
        type: meta.type || 'reel',
        stream_id: meta.stream_id || null,
      })
      .select()
      .single()

    setUploading(false)

    if (!error) {
      const [enriched] = await attachAuthors([data])

      setVideos(prev => [
        {
          ...enriched,
          _liked: false,
        },
        ...prev,
      ])
    }

    return { data, error }
  }

  async function likeVideo(videoId) {
    const video = videos.find(v => v.id === videoId)

    if (!video) {
      return { error: 'Video not found' }
    }

    if (video._liked) {
      const { error } = await mediaDb.rpc(
        'engagement_unlike_video',
        {
          p_video_id: videoId,
        }
      )

      if (error) return { error }

      const newLikes = Math.max(
        0,
        (video.likes || 1) - 1
      )

      const { error: counterError } = await mediaDb.rpc(
        'engagement_update_video_counter',
        {
          p_video_id: videoId,
          p_column: 'likes',
          p_value: newLikes,
        }
      )

      if (counterError) return { error: counterError }

      setVideos(prev =>
        prev.map(v =>
          v.id === videoId
            ? {
                ...v,
                likes: newLikes,
                _liked: false,
              }
            : v
        )
      )

      return { error: null }
    }

    const { error } = await mediaDb.rpc(
      'engagement_like_video',
      {
        p_video_id: videoId,
      }
    )

    if (error) return { error }

    const newLikes = (video.likes || 0) + 1

    const { error: counterError } = await mediaDb.rpc(
      'engagement_update_video_counter',
      {
        p_video_id: videoId,
        p_column: 'likes',
        p_value: newLikes,
      }
    )

    if (counterError) return { error: counterError }

    setVideos(prev =>
      prev.map(v =>
        v.id === videoId
          ? {
              ...v,
              likes: newLikes,
              _liked: true,
            }
          : v
      )
    )

    return { error: null }
  }

  async function incrementView(videoId) {
    await mediaDb
      .from('videos')
      .update({
        view_count: supabase.rpc('increment', { x: 1 }),
      })
      .eq('id', videoId)
  }

  return {
    videos,
    loading,
    uploading,
    uploadVideo,
    likeVideo,
    incrementView,
    refetch: fetchVideos,
  }
}