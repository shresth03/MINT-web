// Browser-side helpers for message attachments (photos, files, voice notes,
// videos). Nothing here talks to Supabase yet; see the attachments plan for
// the dm-attachments bucket and social.send_message these feed into.
export {
  ATTACHMENT_RULES, acceptFor, validateAttachment, fileExtension, formatBytes, formatDuration,
} from './rules'
export { stripImageMetadata, fitWithin } from './image'
export { readVideoInfo } from './video'
export {
  startVoiceRecording, canRecordVoice, pickAudioMimeType, downsampleWaveform, recordingErrorMessage, WAVEFORM_BARS,
} from './voice'
export { buildStoragePath, toAttachmentRecord, attachmentPreview } from './records'
