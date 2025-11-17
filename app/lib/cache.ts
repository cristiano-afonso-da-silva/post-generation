/**
 * LocalStorage cache utilities for generation data
 * Reduces egress by caching generation data and images locally
 */

const CACHE_PREFIX = 'postGeneration_cache'
const DEFAULT_MAX_AGE_HOURS = 1 // 1 hour for generation data

interface CachedData<T> {
  data: T
  timestamp: number
  userId: string
}

/**
 * Check if cache is stale based on timestamp
 */
export function isCacheStale(timestamp: number, maxAgeHours: number = DEFAULT_MAX_AGE_HOURS): boolean {
  const now = Date.now()
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000
  return (now - timestamp) > maxAgeMs
}

/**
 * Get cached generations list
 */
export function getCachedGenerations(
  userId: string,
  limit: number,
  offset: number
): { generations: any[]; totalCount: number } | null {
  try {
    const cacheKey = `${CACHE_PREFIX}_list_${userId}_${limit}_${offset}`
    const cached = localStorage.getItem(cacheKey)
    
    if (!cached) return null
    
    const parsed: CachedData<{ generations: any[]; totalCount: number }> = JSON.parse(cached)
    
    // Check if cache is stale
    if (isCacheStale(parsed.timestamp)) {
      console.log(`[Cache] List cache expired for user ${userId}`)
      localStorage.removeItem(cacheKey)
      return null
    }
    
    // Verify userId matches (security check)
    if (parsed.userId !== userId) {
      console.warn(`[Cache] UserId mismatch in cache, clearing`)
      localStorage.removeItem(cacheKey)
      return null
    }
    
    // Only log in development mode to reduce console spam
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache] Hit for generations list (user: ${userId}, limit: ${limit}, offset: ${offset})`)
    }
    return parsed.data
  } catch (error) {
    console.error('[Cache] Error reading cached generations list:', error)
    return null
  }
}

/**
 * Set cached generations list
 */
export function setCachedGenerations(
  userId: string,
  data: { generations: any[]; totalCount: number },
  limit: number,
  offset: number
): void {
  const cacheKey = `${CACHE_PREFIX}_list_${userId}_${limit}_${offset}`
  const cached: CachedData<{ generations: any[]; totalCount: number }> = {
    data,
    timestamp: Date.now(),
    userId
  }
  try {
    localStorage.setItem(cacheKey, JSON.stringify(cached))
    console.log(`[Cache] Stored generations list (user: ${userId}, limit: ${limit}, offset: ${offset})`)
  } catch (error) {
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[Cache] LocalStorage quota exceeded, clearing old caches')
      clearOldCaches()
      // Retry once
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cached))
      } catch (retryError) {
        console.error('[Cache] Failed to store after clearing old caches:', retryError)
      }
    } else {
      console.error('[Cache] Error storing cached generations list:', error)
    }
  }
}

/**
 * Get cached single generation
 */
export function getCachedGeneration(id: string, userId: string): any | null {
  try {
    const cacheKey = `${CACHE_PREFIX}_gen_${id}_${userId}`
    const cached = localStorage.getItem(cacheKey)
    
    if (!cached) return null
    
    const parsed: CachedData<any> = JSON.parse(cached)
    
    // Check if cache is stale
    if (isCacheStale(parsed.timestamp)) {
      console.log(`[Cache] Generation cache expired for ${id}`)
      localStorage.removeItem(cacheKey)
      return null
    }
    
    // Verify userId matches (security check)
    if (parsed.userId !== userId) {
      console.warn(`[Cache] UserId mismatch in cache, clearing`)
      localStorage.removeItem(cacheKey)
      return null
    }
    
    // Only log in development mode to reduce console spam
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Cache] Hit for generation ${id}`)
    }
    return parsed.data
  } catch (error) {
    console.error('[Cache] Error reading cached generation:', error)
    return null
  }
}

/**
 * Set cached single generation
 */
export function setCachedGeneration(id: string, userId: string, data: any): void {
  const cacheKey = `${CACHE_PREFIX}_gen_${id}_${userId}`
  const cached: CachedData<any> = {
    data,
    timestamp: Date.now(),
    userId
  }
  try {
    localStorage.setItem(cacheKey, JSON.stringify(cached))
    console.log(`[Cache] Stored generation ${id}`)
  } catch (error) {
    // Handle quota exceeded error
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.warn('[Cache] LocalStorage quota exceeded, clearing old caches')
      clearOldCaches()
      // Retry once
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cached))
      } catch (retryError) {
        console.error('[Cache] Failed to store after clearing old caches:', retryError)
      }
    } else {
      console.error('[Cache] Error storing cached generation:', error)
    }
  }
}

/**
 * Clear all generation caches for a specific user (or all users if userId not provided)
 */
export function clearGenerationCache(userId?: string): void {
  try {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        if (userId) {
          // Only clear caches for specific user
          if (key.includes(`_${userId}_`) || key.endsWith(`_${userId}`)) {
            keysToRemove.push(key)
          }
        } else {
          // Clear all generation caches
          keysToRemove.push(key)
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log(`[Cache] Cleared ${keysToRemove.length} cache entries${userId ? ` for user ${userId}` : ''}`)
  } catch (error) {
    console.error('[Cache] Error clearing generation cache:', error)
  }
}

/**
 * Clear old caches to free up space
 * Removes caches older than 24 hours
 */
function clearOldCaches(): void {
  try {
    const keysToRemove: string[] = []
    const now = Date.now()
    const maxAgeMs = 24 * 60 * 60 * 1000 // 24 hours
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const parsed: CachedData<any> = JSON.parse(cached)
            if ((now - parsed.timestamp) > maxAgeMs) {
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
      console.log(`[Cache] Cleared ${keysToRemove.length} old cache entries`)
    }
  } catch (error) {
    console.error('[Cache] Error clearing old caches:', error)
  }
}

