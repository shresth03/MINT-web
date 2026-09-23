import { ATTACHMENT_RULES } from './rules'

const SAMPLE_MS = 100
export const WAVEFORM_BARS = 36

// Chrome and Firefox record Opus in WebM; Safari only records AAC in MP4
const CANDIDATE_TYPES = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']

export function pickAudioMimeType(isSupported = t => window.MediaRecorder?.isTypeSupported?.(t)) {
  return CANDIDATE_TYPES.find(t => isSupported(t)) || ''
}

export function canRecordVoice() {
  return typeof window !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof window.MediaRecorder === 'function'
}

/**
 * Squash raw loudness samples (0–1) into `bars` values from 0–100 for the
 * waveform shown on a voice note. Each bar takes the loudest sample in its slice.
 */
export function downsampleWaveform(levels, bars = WAVEFORM_BARS) {
  if (!levels.length) return Array(bars).fill(0)
  return Array.from({ length: bars }, (_, i) => {
    const from = Math.floor((i * levels.length) / bars)
    const to = Math.max(from + 1, Math.floor(((i + 1) * levels.length) / bars))
    const peak = Math.max(...levels.slice(from, to))
    return Math.round(Math.min(1, Math.max(0, peak)) * 100)
  })
}

export function recordingErrorMessage(err) {
  if (err?.name === 'NotAllowedError') return 'Microphone access is blocked. Allow it in your browser\'s site settings to record voice notes.'
  if (err?.name === 'NotFoundError') return 'No microphone was found.'
  return 'Voice notes can\'t be recorded in this browser.'
}

/**
 * Record a voice note from the microphone.
 *
 *   const rec = await startVoiceRecording({ onTick })
 *   const note = await rec.stop()   // { file, mimeType, duration, waveform }
 *   rec.cancel()                    // discard
 *
 * onTick({ seconds, level }) fires every 100 ms for the live timer and
 * waveform. Recording stops by itself at the voice-note limit and calls
 * onLimit with the finished note. Throws with a user-facing message if the
 * microphone can't be used.
 */
export async function startVoiceRecording({ onTick, onLimit, maxSeconds = ATTACHMENT_RULES.voice.maxSeconds } = {}) {
  if (!canRecordVoice()) throw new Error(recordingErrorMessage())

  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (err) {
    throw new Error(recordingErrorMessage(err))
  }

  const mimeType = pickAudioMimeType()
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
  const chunks = []
  recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }

  const AudioCtx = window.AudioContext || window.webkitAudioContext
  const audioCtx = AudioCtx ? new AudioCtx() : null
  const analyser = audioCtx?.createAnalyser()
  if (analyser) {
    analyser.fftSize = 256
    audioCtx.createMediaStreamSource(stream).connect(analyser)
  }

  const levels = []
  const startedAt = Date.now()
  let done = false
  let ticker = null

  function level() {
    if (!analyser) return 0
    const data = new Uint8Array(analyser.frequencyBinCount)
    analyser.getByteTimeDomainData(data)
    let peak = 0
    for (const v of data) peak = Math.max(peak, Math.abs(v - 128))
    return Math.min(1, peak / 64)
  }

  function cleanup() {
    clearInterval(ticker)
    stream.getTracks().forEach(t => t.stop())
    audioCtx?.close()
  }

  function stop() {
    if (done) return Promise.resolve(null)
    done = true
    return new Promise(resolve => {
      recorder.onstop = () => {
        cleanup()
        const type = recorder.mimeType || mimeType || 'audio/webm'
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
        const blob = new Blob(chunks, { type })
        resolve({
          file: new File([blob], `voice-note.${ext}`, { type: type.split(';')[0] }),
          mimeType: type,
          duration: Math.min(maxSeconds, (Date.now() - startedAt) / 1000),
          waveform: downsampleWaveform(levels),
        })
      }
      recorder.stop()
    })
  }

  function cancel() {
    if (done) return
    done = true
    recorder.onstop = cleanup
    recorder.stop()
  }

  ticker = setInterval(() => {
    const seconds = (Date.now() - startedAt) / 1000
    const l = level()
    levels.push(l)
    onTick?.({ seconds, level: l })
    if (seconds >= maxSeconds) stop().then(note => note && onLimit?.(note))
  }, SAMPLE_MS)

  recorder.start()
  return { stop, cancel, mimeType }
}
