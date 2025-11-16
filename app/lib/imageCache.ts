/**
 * Image caching utilities
 * Converts signed URLs to data URLs and caches them locally to reduce egress
 */

const IMAGE_CACHE_PREFIX = 'postGeneration_cache_image'
const IMAGE_CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days for images

interface CachedImage {
  dataUrl: string
  timestamp: number
  originalUrl: string
}

/**
 * Simple hash function for URL to create cache key
 */
function hashUrl(url: string): string {
  let hash = 0
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Get cached image data URL
 */
export function getCachedImageDataUrl(originalUrl: string): string | null {
  try {
    if (!originalUrl || typeof originalUrl !== 'string') return null
    
    const cacheKey = `${IMAGE_CACHE_PREFIX}_${hashUrl(originalUrl)}`
    const cached = localStorage.getItem(cacheKey)
    
    if (!cached) return null
    
    const parsed: CachedImage = JSON.parse(cached)
    
    // Check if cache is stale
    const now = Date.now()
    if ((now - parsed.timestamp) > IMAGE_CACHE_MAX_AGE_MS) {
      console.log(`[ImageCache] Cache expired for image`)
      localStorage.removeItem(cacheKey)
      return null
    }
    
    // Verify original URL matches (in case of hash collision)
    if (parsed.originalUrl !== originalUrl) {
      console.warn(`[ImageCache] URL mismatch, clearing cache`)
      localStorage.removeItem(cacheKey)
      return null
    }
    
    console.log(`[ImageCache] Hit for image`)
    return parsed.dataUrl
  } catch (error) {
    console.error('[ImageCache] Error reading cached image:', error)
    return null
  }
}

/**
 * Set cached image data URL
 */
export function setCachedImageDataUrl(originalUrl: string, dataUrl: string): void {
  if (!originalUrl || !dataUrl) return
  
  const cacheKey = `${IMAGE_CACHE_PREFIX}_${hashUrl(originalUrl)}`
  const cached: CachedImage = {
    dataUrl,
    timestamp: Date.now(),
    originalUrl
  }
  
  try {
    localStorage.setItem(cacheKey, JSON.stringify(cached))
    console.log(`[ImageCache] Stored image data URL`)
  } catch (error) {
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[ImageCache] LocalStorage quota exceeded, clearing old image caches')
      clearOldImageCaches()
      // Retry once
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cached))
        console.log(`[ImageCache] Stored image data URL after clearing old caches`)
      } catch (retryError) {
        console.error('[ImageCache] Failed to store after clearing old caches:', retryError)
        // If still failing, try to clear more aggressively
        try {
          clearImageCache() // Clear all image caches as last resort
          // Don't retry again - we've done our best
        } catch (clearError) {
          console.error('[ImageCache] Failed to clear image cache:', clearError)
        }
      }
    } else {
      console.error('[ImageCache] Error storing cached image:', error)
    }
  }
}

/**
 * Convert URL to data URL by fetching and converting to base64
 */
export async function convertUrlToDataUrl(url: string): Promise<string | null> {
  try {
    // Check cache first
    const cached = getCachedImageDataUrl(url)
    if (cached) {
      return cached
    }
    
    console.log(`[ImageCache] Converting URL to data URL: ${url.substring(0, 50)}...`)
    
    // Fetch image
    const response = await fetch(url)
    if (!response.ok) {
      console.error(`[ImageCache] Failed to fetch image: ${response.status}`)
      return null
    }
    
    const blob = await response.blob()
    
    // Convert to data URL
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => {
        const dataUrl = reader.result as string
        if (dataUrl) {
          // Cache the data URL
          setCachedImageDataUrl(url, dataUrl)
          resolve(dataUrl)
        } else {
          reject(new Error('Failed to convert blob to data URL'))
        }
      }
      reader.onerror = () => {
        reject(new Error('Error reading blob'))
      }
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('[ImageCache] Error converting URL to data URL:', error)
    return null
  }
}

/**
 * Batch convert and cache multiple image URLs
 * Returns array of data URLs (or original URLs if conversion fails)
 * Limits concurrent conversions to prevent quota issues
 */
export async function cacheImageUrls(urls: string[]): Promise<string[]> {
  if (!urls || urls.length === 0) return []
  
  console.log(`[ImageCache] Caching ${urls.length} image URLs`)
  
  // Limit to first 50 images to prevent quota issues
  const urlsToCache = urls.slice(0, 50)
  const remainingUrls = urls.slice(50)
  
  // Process in batches of 5 to avoid overwhelming localStorage
  const batchSize = 5
  const results: string[] = []
  
  for (let i = 0; i < urlsToCache.length; i += batchSize) {
    const batch = urlsToCache.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(async (url) => {
        if (!url || typeof url !== 'string') return url
        
        // Check cache first
        const cached = getCachedImageDataUrl(url)
        if (cached) {
          return cached
        }
        
        // Convert to data URL
        try {
          const dataUrl = await convertUrlToDataUrl(url)
          return dataUrl || url // Fallback to original URL if conversion fails
        } catch (error) {
          console.error('[ImageCache] Error converting URL:', error)
          return url // Fallback to original URL on error
        }
      })
    )
    results.push(...batchResults)
    
    // Small delay between batches to avoid overwhelming the browser
    if (i + batchSize < urlsToCache.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  // Add remaining URLs without conversion
  results.push(...remainingUrls)
  
  return results
}

/**
 * Clear all cached images
 */
export function clearImageCache(): void {
  try {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`[ImageCache] Cleared ${keysToRemove.length} cached images`)
  } catch (error) {
    console.error('[ImageCache] Error clearing image cache:', error)
  }
}

/**
 * Clear old image caches to free up space
 * Removes images older than 7 days
 */
function clearOldImageCaches(): void {
  try {
    const keysToRemove: string[] = []
    const now = Date.now()
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const parsed: CachedImage = JSON.parse(cached)
            if ((now - parsed.timestamp) > IMAGE_CACHE_MAX_AGE_MS) {
              keysToRemove.push(key)
            }
          }
        } catch {
          // If we can't parse it, remove it
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    if (keysToRemove.length > 0) {
      console.log(`[ImageCache] Cleared ${keysToRemove.length} old image cache entries`)
    }
  } catch (error) {
    console.error('[ImageCache] Error clearing old image caches:', error)
  }
}

/**
 * Get estimated cache size (for monitoring)
 */
export function getImageCacheSize(): number {
  try {
    let size = 0
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
        const value = localStorage.getItem(key)
        if (value) {
          size += value.length
        }
      }
    }
    return size
  } catch (error) {
    console.error('[ImageCache] Error calculating cache size:', error)
    return 0
  }
}

