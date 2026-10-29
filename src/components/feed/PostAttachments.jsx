import { FileText } from 'lucide-react'

function formatBytes(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const frame = {
  borderRadius: 6, border: '1px solid var(--border)', display: 'block',
}

// Renders a post's attachments (up to 4, from content.post_attachments):
// photos in a grid, then videos, audio and files in posting order.
export default function PostAttachments({ attachments }) {
  const images = attachments.filter(a => a.kind === 'image')
  const others = attachments.filter(a => a.kind !== 'image')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
      {images.length > 0 && (
        <div style={{
          display: 'grid', gap: 4,
          gridTemplateColumns: images.length === 1 ? '1fr' : '1fr 1fr',
        }}>
          {images.map(a => (
            <img
              key={a.id}
              src={a.url}
              alt={a.file_name || 'attachment'}
              loading="lazy"
              style={{
                ...frame, width: '100%', objectFit: 'cover', cursor: 'pointer',
                height: images.length === 1 ? 'auto' : 160,
                maxHeight: images.length === 1 ? 300 : undefined,
              }}
              onClick={() => window.open(a.url, '_blank')}
            />
          ))}
        </div>
      )}

      {others.map(a => {
        if (a.kind === 'video') {
          return (
            <video
              key={a.id}
              src={a.url}
              poster={a.thumbnail_url || undefined}
              controls
              preload="metadata"
              style={{ ...frame, width: '100%', maxHeight: 360, background: '#000' }}
            />
          )
        }
        if (a.kind === 'audio') {
          return (
            <div key={a.id} style={{ ...frame, padding: '8px 10px', background: 'var(--surface2)' }}>
              {a.file_name && (
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', marginBottom: 6 }}>
                  {a.file_name}
                </div>
              )}
              <audio src={a.url} controls preload="none" style={{ width: '100%' }} />
            </div>
          )
        }
        return (
          <a
            key={a.id}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            download={a.file_name || true}
            style={{
              ...frame, display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', background: 'var(--surface2)',
              color: 'var(--text)', textDecoration: 'none',
            }}
          >
            <FileText size={18} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontFamily: 'var(--sans)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
              {a.file_name || 'File'}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)', flexShrink: 0 }}>
              {formatBytes(a.size_bytes)}
            </span>
          </a>
        )
      })}
    </div>
  )
}
