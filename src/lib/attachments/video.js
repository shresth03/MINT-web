// Reads a video's length and size and grabs a frame for its thumbnail, all in
// the browser. Location data inside videos can't be removed this way, which is
// why the app warns before sending one.

const POSTER_WIDTH = 480
const TIMEOUT_MS = 8000

/**
 * Resolves to { duration, width, height, poster } where poster is a JPEG Blob,
 * or null when the browser can't decode this format (e.g. HEVC in Chrome).
 * duration/width/height fall back to 0 in that case.
 */
export function readVideoInfo(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'

    let settled = false
    const finish = poster => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      const info = {
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        poster,
      }
      video.removeAttribute('src')
      video.load()
      URL.revokeObjectURL(url)
      resolve(info)
    }
    const timer = setTimeout(() => finish(null), TIMEOUT_MS)

    video.onloadeddata = () => {
      // A frame slightly in avoids the black first frame many phones record
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2)
    }
    video.onseeked = () => {
      const w = video.videoWidth, h = video.videoHeight
      if (!w || !h) return finish(null)
      const canvas = document.createElement('canvas')
      canvas.width = POSTER_WIDTH
      canvas.height = Math.round(POSTER_WIDTH * (h / w))
      const ctx = canvas.getContext('2d')
      if (!ctx) return finish(null)
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => finish(blob), 'image/jpeg', 0.8)
    }
    video.onerror = () => finish(null)
    video.src = url
  })
}
