import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  validateAttachment, acceptFor, formatBytes, formatDuration,
  fitWithin, stripImageMetadata,
  downsampleWaveform, pickAudioMimeType, recordingErrorMessage, startVoiceRecording, canRecordVoice,
  buildStoragePath, toAttachmentRecord, attachmentPreview,
} from '../../lib/attachments'

const MB = 1024 * 1024
// A File whose reported size we control without allocating megabytes
const fakeFile = (name, type, size = 1000) => {
  const f = new File(['x'], name, { type })
  Object.defineProperty(f, 'size', { value: size })
  return f
}

// ── validateAttachment() ────────────────────────────────────────────────────

describe('validateAttachment()', () => {
  it('accepts an allowed photo', () => {
    expect(validateAttachment(fakeFile('pass.jpg', 'image/jpeg'), 'photo')).toBeNull()
  })

  it('rejects a type that is not allowed for the kind', () => {
    expect(validateAttachment(fakeFile('scan.gif', 'image/gif'), 'photo'))
      .toBe("scan.gif can't be sent as a photo. Use JPG, JPEG, PNG, WEBP.")
  })

  it('rejects files over the per-kind limit', () => {
    expect(validateAttachment(fakeFile('big.pdf', 'application/pdf', 11 * MB), 'file'))
      .toBe('big.pdf is larger than 10 MB. Try a smaller file.')
    expect(validateAttachment(fakeFile('clip.mp4', 'video/mp4', 40 * MB), 'video')).toBeNull()
    expect(validateAttachment(fakeFile('clip.mp4', 'video/mp4', 51 * MB), 'video'))
      .toBe('clip.mp4 is larger than 50 MB. Try a smaller video.')
  })

  it('rejects empty files', () => {
    expect(validateAttachment(fakeFile('empty.txt', 'text/plain', 0), 'file')).toBe('That file is empty.')
  })

  it('falls back to the extension when the browser reports no type', () => {
    expect(validateAttachment(fakeFile('ais.csv', ''), 'file')).toBeNull()
    expect(validateAttachment(fakeFile('notes.docx', 'application/octet-stream'), 'file')).toBeNull()
  })

  it('never accepts executables, whatever the reported type', () => {
    expect(validateAttachment(fakeFile('tool.exe', 'application/octet-stream'), 'file')).not.toBeNull()
    expect(validateAttachment(fakeFile('page.html', 'text/html'), 'file')).not.toBeNull()
  })

  it('ignores codec suffixes on recorded audio', () => {
    expect(validateAttachment(fakeFile('voice-note.webm', 'audio/webm;codecs=opus'), 'voice')).toBeNull()
  })
})

describe('acceptFor()', () => {
  it('lists mime types and extensions for a file input', () => {
    expect(acceptFor('photo')).toBe('image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp')
  })
})

describe('formatting', () => {
  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(48210)).toBe('47 KB')
    expect(formatBytes(1843200)).toBe('1.8 MB')
  })

  it('formats durations as m:ss', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(42.4)).toBe('0:42')
    expect(formatDuration(120)).toBe('2:00')
  })
})

// ── Photos ──────────────────────────────────────────────────────────────────

describe('fitWithin()', () => {
  it('leaves small images alone and scales large ones to the longest side', () => {
    expect(fitWithin(800, 600, 2560)).toEqual({ width: 800, height: 600 })
    expect(fitWithin(4000, 3000, 2560)).toEqual({ width: 2560, height: 1920 })
    expect(fitWithin(3000, 4000, 2560)).toEqual({ width: 1920, height: 2560 })
  })
})

describe('stripImageMetadata()', () => {
  afterEach(() => { vi.restoreAllMocks(); delete globalThis.createImageBitmap })

  function stubCanvas() {
    const ctx = { drawImage: vi.fn() }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx)
    const toBlob = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob')
      .mockImplementation((cb, type) => cb(new Blob(['pixels'], { type })))
    return { ctx, toBlob }
  }

  it('redraws the photo into a new, scaled-down JPEG', async () => {
    const bitmap = { width: 4000, height: 3000, close: vi.fn() }
    globalThis.createImageBitmap = vi.fn().mockResolvedValue(bitmap)
    const { ctx, toBlob } = stubCanvas()

    const original = fakeFile('IMG_2231.jpeg', 'image/jpeg', 3 * MB)
    const out = await stripImageMetadata(original)

    expect(createImageBitmap).toHaveBeenCalledWith(original, { imageOrientation: 'from-image' })
    expect(ctx.drawImage).toHaveBeenCalledWith(bitmap, 0, 0, 2560, 1920)
    expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9)
    expect(out).toMatchObject({ width: 2560, height: 1920 })
    expect(out.file).not.toBe(original)
    expect(out.file.name).toBe('IMG_2231.jpg')
    expect(out.file.type).toBe('image/jpeg')
    expect(bitmap.close).toHaveBeenCalled()
  })

  it('keeps PNGs as PNG', async () => {
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({ width: 100, height: 50 })
    stubCanvas()
    const out = await stripImageMetadata(fakeFile('chart.png', 'image/png'))
    expect(out.file.type).toBe('image/png')
    expect(out.file.name).toBe('chart.png')
  })

  it('fails with a readable message when the canvas is unavailable', async () => {
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({ width: 10, height: 10 })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
    await expect(stripImageMetadata(fakeFile('a.jpg', 'image/jpeg')))
      .rejects.toThrow("This browser can't prepare photos for upload.")
  })
})

// ── Voice notes ─────────────────────────────────────────────────────────────

describe('downsampleWaveform()', () => {
  it('returns flat bars for silence or no samples', () => {
    expect(downsampleWaveform([], 4)).toEqual([0, 0, 0, 0])
  })

  it('takes the loudest sample in each slice and scales to 0-100', () => {
    expect(downsampleWaveform([0.1, 0.5, 0.2, 0.9, 0.3, 0.4, 0, 1], 4)).toEqual([50, 90, 40, 100])
  })

  it('stretches short recordings across all bars', () => {
    expect(downsampleWaveform([0.2, 0.8], 4)).toEqual([20, 20, 80, 80])
  })

  it('clamps out-of-range levels', () => {
    expect(downsampleWaveform([1.7, -0.3], 2)).toEqual([100, 0])
  })
})

describe('pickAudioMimeType()', () => {
  it('prefers Opus in WebM when supported (Chrome, Firefox)', () => {
    expect(pickAudioMimeType(() => true)).toBe('audio/webm;codecs=opus')
  })

  it('falls back to MP4 where only that is supported (Safari)', () => {
    expect(pickAudioMimeType(t => t === 'audio/mp4')).toBe('audio/mp4')
  })

  it('returns an empty string when nothing is supported', () => {
    expect(pickAudioMimeType(() => false)).toBe('')
  })
})

describe('recording errors', () => {
  it('explains a blocked microphone', () => {
    expect(recordingErrorMessage({ name: 'NotAllowedError' })).toMatch(/Microphone access is blocked/)
    expect(recordingErrorMessage({ name: 'NotFoundError' })).toBe('No microphone was found.')
  })

  it('refuses to start where recording is unsupported', async () => {
    expect(canRecordVoice()).toBe(false) // jsdom has no MediaRecorder
    await expect(startVoiceRecording()).rejects.toThrow("Voice notes can't be recorded in this browser.")
  })
})

// ── Records for the database ────────────────────────────────────────────────

describe('buildStoragePath()', () => {
  it('puts the file under its conversation with a fresh id', () => {
    expect(buildStoragePath('conv-1', 'Report.PDF', 'abc')).toBe('conv-1/abc.pdf')
    expect(buildStoragePath('conv-1', 'README', 'abc')).toBe('conv-1/abc')
  })

  it('generates a unique id by default', () => {
    const a = buildStoragePath('c', 'a.jpg')
    const b = buildStoragePath('c', 'a.jpg')
    expect(a).toMatch(/^c\/[0-9a-f-]{36}\.jpg$/)
    expect(a).not.toBe(b)
  })
})

describe('toAttachmentRecord()', () => {
  it('maps a voice note to the send_message shape', () => {
    const file = fakeFile('voice-note.webm', 'audio/webm;codecs=opus', 52000)
    expect(toAttachmentRecord({
      kind: 'voice', storagePath: 'c/1.webm', file,
      meta: { duration: 42.37, waveform: [10, 90] },
    })).toEqual({
      kind: 'voice', storage_path: 'c/1.webm', file_name: 'voice-note.webm',
      mime_type: 'audio/webm', size_bytes: 52000,
      width: null, height: null, duration_seconds: 42.4, waveform: [10, 90], poster_path: null,
    })
  })
})

describe('attachmentPreview()', () => {
  const a = (kind, extra = {}) => ({ kind, ...extra })

  it('prefers the message text', () => {
    expect(attachmentPreview('  look at this ', [a('photo')])).toBe('look at this')
  })

  it('describes attachment-only messages', () => {
    expect(attachmentPreview('', [a('photo')])).toBe('Photo')
    expect(attachmentPreview('', [a('photo'), a('photo')])).toBe('2 photos')
    expect(attachmentPreview('', [a('video')])).toBe('Video')
    expect(attachmentPreview('', [a('file', { file_name: 'report.pdf' })])).toBe('File · report.pdf')
    expect(attachmentPreview('', [a('voice', { duration_seconds: 42 })])).toBe('Voice note · 0:42')
    expect(attachmentPreview('', [a('photo'), a('file', { file_name: 'x.csv' })])).toBe('2 attachments')
    expect(attachmentPreview('', [])).toBe('')
  })
})
