import { fileExtension, formatDuration } from './rules'

// Files live at {conversation_id}/{uuid}.{ext} in the private dm-attachments
// bucket; the storage access rules read the conversation id from the first folder.
export function buildStoragePath(conversationId, fileName, id = crypto.randomUUID()) {
  const ext = fileExtension(fileName)
  return `${conversationId}/${id}${ext ? `.${ext}` : ''}`
}

/**
 * Shape one uploaded attachment for the social.send_message function
 * (see the attachments plan). meta may carry width, height, duration,
 * waveform and posterPath depending on the kind.
 */
export function toAttachmentRecord({ kind, storagePath, file, meta = {} }) {
  return {
    kind,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: (file.type || 'application/octet-stream').split(';')[0],
    size_bytes: file.size,
    width: meta.width ?? null,
    height: meta.height ?? null,
    duration_seconds: meta.duration != null ? Math.round(meta.duration * 10) / 10 : null,
    waveform: meta.waveform ?? null,
    poster_path: meta.posterPath ?? null,
  }
}

/**
 * Conversation-list preview for a message, e.g. "2 photos",
 * "File · report.pdf", "Voice note · 0:42". Text wins when there is some.
 */
export function attachmentPreview(body, attachments = []) {
  if (body?.trim()) return body.trim()
  if (!attachments.length) return ''
  const kinds = attachments.map(a => a.kind)
  const count = kind => kinds.filter(k => k === kind).length
  const [first] = attachments

  if (kinds.every(k => k === 'photo')) return count('photo') === 1 ? 'Photo' : `${count('photo')} photos`
  if (kinds.every(k => k === 'video')) return count('video') === 1 ? 'Video' : `${count('video')} videos`
  if (attachments.length === 1 && first.kind === 'file') return `File · ${first.file_name}`
  if (attachments.length === 1 && first.kind === 'voice') return `Voice note · ${formatDuration(first.duration_seconds)}`
  return `${attachments.length} attachments`
}
