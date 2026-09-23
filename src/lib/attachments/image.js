// Photos from phones often carry GPS coordinates and device details in their
// EXIF data. Redrawing the pixels onto a canvas and exporting a new file
// keeps only the image, so that metadata never leaves the browser.

const DEFAULT_MAX_DIMENSION = 2560
const JPEG_QUALITY = 0.9

async function decode(file) {
  // createImageBitmap applies the EXIF rotation, so portrait photos stay upright
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function fitWithin(width, height, max) {
  if (width <= max && height <= max) return { width, height }
  const scale = max / Math.max(width, height)
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

// PNG keeps transparency; everything else becomes the same type re-encoded
function outputType(type) {
  return type === 'image/png' || type === 'image/webp' ? type : 'image/jpeg'
}

function renamed(name, type) {
  const base = name.replace(/\.[^.]+$/, '') || 'photo'
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'
  return `${base}.${ext}`
}

/**
 * Re-encode a photo without its metadata, scaled down to fit maxDimension.
 * Resolves to { file, width, height }; the file is a new File with no EXIF.
 */
export async function stripImageMetadata(file, { maxDimension = DEFAULT_MAX_DIMENSION } = {}) {
  const source = await decode(file)
  const { width, height } = fitWithin(source.width, source.height, maxDimension)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser can\'t prepare photos for upload.')
  ctx.drawImage(source, 0, 0, width, height)
  source.close?.()

  const type = outputType(file.type)
  const blob = await new Promise(resolve => canvas.toBlob(resolve, type, JPEG_QUALITY))
  if (!blob) throw new Error('This photo couldn\'t be prepared for upload.')

  return {
    file: new File([blob], renamed(file.name, type), { type, lastModified: Date.now() }),
    width,
    height,
  }
}
