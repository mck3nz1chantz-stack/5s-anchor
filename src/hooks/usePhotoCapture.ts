import { useCallback, useRef, useState } from 'react'

/** Capture image via camera/file; returns compressed data URL (max edge 1280). */
export function usePhotoCapture() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const open = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const clear = useCallback(() => setDataUrl(null), [])

  const onFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const url = await compressImage(file, 1280, 0.82)
      setDataUrl(url)
    } finally {
      setBusy(false)
    }
  }, [])

  return { dataUrl, setDataUrl, busy, open, clear, inputRef, onFileChange }
}

function compressImage(file: File, maxEdge: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        const scale = Math.min(1, maxEdge / Math.max(width, height))
        width = Math.round(width * scale)
        height = Math.round(height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(reader.result as string)
          return
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('image decode failed'))
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
