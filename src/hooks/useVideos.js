import { useState, useEffect } from 'react'
import { supabase } from '../api/supabase'
import { useAuth } from './useAuth'

export function useVideos(type = null) {
  const { user } = useAuth()
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  async function fetchVideos() {
    let q = supabase
      .from('videos')
      .select('*, users!videos_author_id_fkey(id, username, role, score)')
      .order('created_at', { ascending: false })
      .limit(50)
    if (type) q = q.eq('type', type)

    const { data } = await q
    setVideos(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchVideos()
    const sub = supabase
      .channel('videos_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'videos' }, payload => {
        fetchSingleVideo(payload.new.id)
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [type]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchSingleVideo(id) {
    const { data } = await supabase
      .from('videos')
      .select('*, users!videos_author_id_fkey(id, username, role, score)')
      .eq('id', id)
      .single()
    if (data) setVideos(prev => [data, ...prev])
  }

  async function uploadVideo(file, meta = {}) {
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('videos')
      .upload(path, file, { contentType: file.type })

    if (uploadError) { setUploading(false); return { error: uploadError } }

    const { data: { publicUrl } } = supabase.storage.from('videos').getPublicUrl(path)

    const { data, error } = await supabase
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
    if (!error) setVideos(prev => [data, ...prev])
    return { data, error }
  }

  async function likeVideo(videoId) {
    const video = videos.find(v => v.id === videoId)
    const liked = video?._liked

    if (liked) {
      await supabase.from('video_likes').delete().eq('user_id', user.id).eq('video_id', videoId)
      await supabase.from('videos').update({ likes: Math.max(0, (video.likes || 1) - 1) }).eq('id', videoId)
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: Math.max(0, (v.likes || 1) - 1), _liked: false } : v))
    } else {
      await supabase.from('video_likes').insert({ user_id: user.id, video_id: videoId })
      await supabase.from('videos').update({ likes: (video?.likes || 0) + 1 }).eq('id', videoId)
      setVideos(prev => prev.map(v => v.id === videoId ? { ...v, likes: (v.likes || 0) + 1, _liked: true } : v))
    }
  }

  async function incrementView(videoId) {
    await supabase.from('videos').update({ view_count: supabase.rpc('increment', { x: 1 }) }).eq('id', videoId)
  }

  return { videos, loading, uploading, uploadVideo, likeVideo, incrementView, refetch: fetchVideos }
}
