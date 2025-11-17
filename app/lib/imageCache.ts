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
    
    // Only log in development mode to reduce console spam
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ImageCache] Hit for image`)
    }
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
    // Only log in development mode to reduce console spam
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ImageCache] Stored image data URL`)
    }
  } catch (error) {
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[ImageCache] LocalStorage quota exceeded, clearing old image caches')
      clearOldImageCaches()
      // Retry once
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cached))
        if (process.env.NODE_ENV === 'development') {
          console.log(`[ImageCache] Successfully stored after clearing old caches`)
        }
      } catch (retryError) {
        console.error('[ImageCache] Failed to store after clearing old caches:', retryError)
        // If still failing, try to clear even more aggressively
        try {
          // Clear all image caches if we still can't store
          clearImageCache()
          // Try one more time with a smaller data URL (compressed)
          // But for now, just log the error and continue
          console.warn('[ImageCache] Could not store image cache - localStorage may be full')
        } catch (finalError) {
          console.error('[ImageCache] Final attempt to clear cache failed:', finalError)
        }
      }
    } else {
      console.error('[ImageCache] Error storing cached image:', error)
    }
  }
}

/**
 * Convert URL to data URL by fetching and converting to base64
 * OPTIMIZED: Only log in development mode to reduce console spam
 */
export async function convertUrlToDataUrl(url: string): Promise<string | null> {
  try {
    // Check cache first
    const cached = getCachedImageDataUrl(url)
    if (cached) {
      return cached
    }
    
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`[ImageCache] Converting URL to data URL: ${url.substring(0, 50)}...`)
    }
    
    // Fetch image
    const response = await fetch(url)
    if (!response.ok) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[ImageCache] Failed to fetch image: ${response.status}`)
      }
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
    if (process.env.NODE_ENV === 'development') {
      console.error('[ImageCache] Error converting URL to data URL:', error)
    }
    return null
  }
}

/**
 * Batch convert and cache multiple image URLs
 * Returns array of data URLs (or original URLs if conversion fails)
 * OPTIMIZED: Processes in smaller batches and limits total images to avoid overwhelming localStorage
 */
export async function cacheImageUrls(urls: string[]): Promise<string[]> {
  if (!urls || urls.length === 0) return []
  
  // Limit to max 15 images to avoid overwhelming localStorage
  const maxImages = 15
  const limitedUrls = urls.slice(0, maxImages)
  
  // Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log(`[ImageCache] Caching ${limitedUrls.length} image URLs (limited from ${urls.length})`)
  }
  
  // Process in smaller batches of 2 to avoid overwhelming localStorage
  const batchSize = 2
  const results: string[] = []
  
  for (let i = 0; i < limitedUrls.length; i += batchSize) {
    const batch = limitedUrls.slice(i, i + batchSize)
    
    try {
      const batchResults = await Promise.all(
        batch.map(async (url) => {
          if (!url || typeof url !== 'string') return url
          
          // Skip if already a data URL
          if (url.startsWith('data:image/')) return url
          
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
            if (process.env.NODE_ENV === 'development') {
              console.error(`[ImageCache] Error converting URL ${url.substring(0, 50)}...:`, error)
            }
            return url // Fallback to original URL on error
          }
        })
      )
      
      results.push(...batchResults)
      
      // Small delay between batches to avoid overwhelming the browser
      if (i + batchSize < limitedUrls.length) {
        await new Promise(resolve => setTimeout(resolve, 150))
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`[ImageCache] Error processing batch ${i / batchSize + 1}:`, error)
      }
      // If batch fails, add original URLs as fallback
      results.push(...batch.map(url => url || ''))
    }
  }
  
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
 * Removes images older than 7 days, or if still full, removes oldest 50% of images
 */
function clearOldImageCaches(): void {
  try {
    const keysToRemove: string[] = []
    const now = Date.now()
    const allImageKeys: Array<{ key: string; timestamp: number }> = []
    
    // First pass: collect all image cache keys with timestamps
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(IMAGE_CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const parsed: CachedImage = JSON.parse(cached)
            const age = now - parsed.timestamp
            
            // Remove if older than max age
            if (age > IMAGE_CACHE_MAX_AGE_MS) {
              keysToRemove.push(key)
            } else {
              // Keep track for potential further clearing
              allImageKeys.push({ key, timestamp: parsed.timestamp })
            }
          }
        } catch {
          // If we can't parse it, remove it
          keysToRemove.push(key)
        }
      }
    }
    
    // Remove expired entries
    keysToRemove.forEach(key => localStorage.removeItem(key))
    
    // If we still need more space, remove oldest 50% of remaining images
    if (allImageKeys.length > 0) {
      // Sort by timestamp (oldest first)
      allImageKeys.sort((a, b) => a.timestamp - b.timestamp)
      
      // Remove oldest 50%
      const toRemove = Math.floor(allImageKeys.length / 2)
      for (let i = 0; i < toRemove; i++) {
        keysToRemove.push(allImageKeys[i].key)
        localStorage.removeItem(allImageKeys[i].key)
      }
    }
    
    if (keysToRemove.length > 0) {
      console.log(`[ImageCache] Cleared ${keysToRemove.length} image cache entries`)
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

