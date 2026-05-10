/* Shared vision card image with signed-URL fallback and src reset on selection changes. */
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const VISION_CARD_BUCKET = 'vision-cards'
const VISION_CARD_PUBLIC_PATH = `/storage/v1/object/public/${VISION_CARD_BUCKET}/`

function getVisionCardPathFromUrl(url: string) {
  try {
    if (url.startsWith(VISION_CARD_PUBLIC_PATH)) {
      return url.slice(VISION_CARD_PUBLIC_PATH.length)
    }
    const parsed = new URL(url)
    const marker = `/storage/v1/object/public/${VISION_CARD_BUCKET}/`
    const index = parsed.pathname.indexOf(marker)
    if (index !== -1) {
      return parsed.pathname.slice(index + marker.length)
    }
  } catch {
    // Ignore invalid URLs during fallback resolution.
  }
  return null
}

export function VisionCardImage({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className?: string
}) {
  const [imageSrc, setImageSrc] = useState(src)
  const [triedFallback, setTriedFallback] = useState(false)

  useEffect(() => {
    setImageSrc(src)
    setTriedFallback(false)
  }, [src])

  const handleImageError = async () => {
    if (triedFallback) return
    const storagePath = getVisionCardPathFromUrl(imageSrc) ?? (imageSrc.startsWith('/') ? imageSrc : null)
    if (!storagePath) return

    setTriedFallback(true)
    const { data, error } = await supabase.storage.from(VISION_CARD_BUCKET).createSignedUrl(storagePath, 3600)
    if (data?.signedUrl) {
      setImageSrc(data.signedUrl)
    } else if (error) {
      console.warn('Vision card image fallback failed:', error.message)
    }
  }

  return <img src={imageSrc} alt={alt} className={className} onError={handleImageError} />
}
