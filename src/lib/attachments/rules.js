// What each kind of attachment accepts. Mirrors the dm-attachments bucket's
// allowed_mime_types in the attachments plan; the bucket itself only enforces
// the 50 MB ceiling, so the per-kind caps below are checked here.
const MB = 1024 * 1024

export const ATTACHMENT_RULES = {
  photo: {
    label: 'photo',
    maxBytes: 10 * MB,
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    extensions: ['jpg', 'jpeg', 'png', 'webp'],
  },
  file: {
    label: 'file',
    maxBytes: 10 * MB,
    mimeTypes: [
      'application/pdf',
      'text/plain',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: ['pdf', 'txt', 'csv', 'docx', 'xlsx'],
  },
  voice: {
    label: 'voice note',
    maxBytes: 10 * MB,
    maxSeconds: 120,
    mimeTypes: ['audio/webm', 'audio/mp4', 'audio/ogg'],
    extensions: ['webm', 'm4a', 'mp4', 'ogg'],
  },
  video: {
    label: 'video',
    maxBytes: 50 * MB,
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    extensions: ['mp4', 'mov', 'webm'],
  },
}

// Value for an <input type="file" accept="…">
export function acceptFor(kind) {
  const rule = ATTACHMENT_RULES[kind]
  return [...rule.mimeTypes, ...rule.extensions.map(e => `.${e}`)].join(',')
}

export function fileExtension(name = '') {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

// Some systems report CSV or DOCX with an empty or generic type, so fall
// back to the extension. Codec suffixes ("audio/webm;codecs=opus") are ignored.
function typeAllowed(file, rule) {
  const type = (file.type || '').split(';')[0].trim().toLowerCase()
  if (type && rule.mimeTypes.includes(type)) return true
  const generic = !type || type === 'application/octet-stream'
  return generic && rule.extensions.includes(fileExtension(file.name))
}

// Returns null when the file is fine, or a message to show the user
export function validateAttachment(file, kind) {
  const rule = ATTACHMENT_RULES[kind]
  if (!rule) return 'That kind of attachment isn\'t supported.'
  if (!file || !file.size) return 'That file is empty.'
  if (!typeAllowed(file, rule)) {
    const list = rule.extensions.map(e => e.toUpperCase()).join(', ')
    return `${file.name} can't be sent as a ${rule.label}. Use ${list}.`
  }
  if (file.size > rule.maxBytes) {
    return `${file.name} is larger than ${rule.maxBytes / MB} MB. Try a smaller ${rule.label}.`
  }
  return null
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / MB).toFixed(1)} MB`
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
