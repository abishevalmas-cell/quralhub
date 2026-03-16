/**
 * Remove background from image (stamp/signature extraction)
 * Works by making white/light pixels transparent
 * Perfect for extracting stamps and signatures from photos
 */

export interface RemoveBgOptions {
  /** Threshold 0-255 — pixels lighter than this become transparent (default 230) */
  threshold: number
  /** Feather edge in pixels (default 2) */
  feather: number
  /** Also remove near-white colors (default true) */
  removeNearWhite: boolean
}

const DEFAULT_OPTIONS: RemoveBgOptions = {
  threshold: 230,
  feather: 2,
  removeNearWhite: true,
}

/** Load image from File into ImageData */
function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    const url = URL.createObjectURL(file)
    img.src = url
  })
}

/** Remove white/light background from image, return transparent PNG as Blob */
export async function removeBackground(
  file: File,
  options: Partial<RemoveBgOptions> = {},
): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const img = await loadImageFromFile(file)

  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    // Check if pixel is white/light
    const brightness = (r + g + b) / 3

    if (brightness >= opts.threshold) {
      // Fully transparent
      data[i + 3] = 0
    } else if (opts.removeNearWhite && brightness >= opts.threshold - 30) {
      // Gradual fade for near-white (feathering)
      const factor = (brightness - (opts.threshold - 30)) / 30
      data[i + 3] = Math.round(255 * (1 - factor))
    }
    // else: keep pixel as-is
  }

  // Apply feathering pass (soften edges)
  if (opts.feather > 0) {
    applyFeather(imageData, opts.feather)
  }

  ctx.putImageData(imageData, 0, 0)

  const dataUrl = canvas.toDataURL('image/png')
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(b => resolve(b!), 'image/png')
  })

  // Cleanup
  URL.revokeObjectURL(img.src)

  return { blob, dataUrl, width: canvas.width, height: canvas.height }
}

/** Simple feather by averaging alpha with neighbors */
function applyFeather(imageData: ImageData, radius: number) {
  const { width, height, data } = imageData
  const alphaOrig = new Uint8Array(width * height)

  // Copy original alpha
  for (let i = 0; i < alphaOrig.length; i++) {
    alphaOrig[i] = data[i * 4 + 3]
  }

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      const idx = y * width + x
      if (alphaOrig[idx] === 0 || alphaOrig[idx] === 255) continue

      // Average alpha in neighborhood
      let sum = 0
      let count = 0
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ni = (y + dy) * width + (x + dx)
          sum += alphaOrig[ni]
          count++
        }
      }
      data[idx * 4 + 3] = Math.round(sum / count)
    }
  }
}

/** Auto-crop transparent areas */
export function autoCropTransparent(
  canvas: HTMLCanvasElement,
): { blob: Blob; dataUrl: string } | null {
  const ctx = canvas.getContext('2d')!
  const { width, height } = canvas
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data

  let top = height, bottom = 0, left = width, right = 0

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const alpha = data[(y * width + x) * 4 + 3]
      if (alpha > 10) {
        if (y < top) top = y
        if (y > bottom) bottom = y
        if (x < left) left = x
        if (x > right) right = x
      }
    }
  }

  if (bottom <= top || right <= left) return null

  const padding = 4
  const cropX = Math.max(0, left - padding)
  const cropY = Math.max(0, top - padding)
  const cropW = Math.min(width - cropX, right - left + padding * 2)
  const cropH = Math.min(height - cropY, bottom - top + padding * 2)

  const cropCanvas = document.createElement('canvas')
  cropCanvas.width = cropW
  cropCanvas.height = cropH
  const cropCtx = cropCanvas.getContext('2d')!
  cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)

  const dataUrl = cropCanvas.toDataURL('image/png')
  let blob: Blob | null = null
  cropCanvas.toBlob(b => { blob = b })

  return { blob: blob!, dataUrl }
}
