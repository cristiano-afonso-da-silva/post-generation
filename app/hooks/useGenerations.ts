import useSWR from 'swr'
import { getCachedGenerations, setCachedGenerations, getCachedGeneration, setCachedGeneration } from '../lib/cache'
import { cacheImageUrls, getCachedImageDataUrl } from '../lib/imageCache'

interface Generation {
  id: string
  project_name: string
  idea_title: string
  thumbnail_urls: string[]
  created_at: string
  slides: any[]
  caption: string
  underline_words: any
  account_description: string
  account_name?: string
  website?: string
  template_id: string
  color_theme_id: string
  image_urls: string[]
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) {
    const error: any = new Error('An error occurred while fetching the data.')
    error.status = res.status
    throw error
  }
  return res.json()
}

// Helper to replace image URLs with cached data URLs
// OPTIMIZED: Don't replace thumbnails - they use original URLs for faster loading
function replaceWithCachedImageUrls(generations: any[]): any[] {
  return generations.map(gen => {
    const updated = { ...gen }
    
    // Only replace full images (imageUrls/image_urls), not thumbnails
    // Thumbnails use original URLs directly for better performance
    if (gen.imageUrls && Array.isArray(gen.imageUrls)) {
      updated.imageUrls = gen.imageUrls.map((url: string) => {
        // Skip if already a data URL
        if (url && url.startsWith('data:image/')) return url
        const cached = getCachedImageDataUrl(url)
        return cached || url
      })
    }
    if (gen.image_urls && Array.isArray(gen.image_urls)) {
      updated.image_urls = gen.image_urls.map((url: string) => {
        // Skip if already a data URL
        if (url && url.startsWith('data:image/')) return url
        const cached = getCachedImageDataUrl(url)
        return cached || url
      })
    }
    // Keep thumbnail_urls as original URLs (no conversion needed)
    // This makes thumbnails load faster and uses less storage
    
    return updated
  })
}

// Custom fetcher for generations list with localStorage caching
// OPTIMIZED: Reduced duplicate calls and better caching strategy
const cachedListFetcher = async (url: string, userId: string, limit: number, offset: number) => {
  // Check cache first
  const cached = getCachedGenerations(userId, limit, offset)
  if (cached) {
    // Replace image URLs with cached data URLs (only for full images, not thumbnails)
    const cachedWithImages = {
      ...cached,
      generations: replaceWithCachedImageUrls(cached.generations || [])
    }
    
    // Return cached data immediately, but also refresh in background
    // Only log in development to reduce console spam
    if (process.env.NODE_ENV === 'development') {
      console.log('[useGenerations] Using cached data, refreshing in background')
    }
    
    // Background refresh (non-blocking)
    fetch(url)
      .then(res => res.json())
      .then(data => {
        // Cache the fresh data
        if (data.generations && data.totalCount !== undefined) {
          setCachedGenerations(userId, data, limit, offset)
          // Only cache images for first few generations (optimized)
          convertAndCacheImages(data.generations)
        }
      })
      .catch(err => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[useGenerations] Background refresh failed:', err)
        }
      })
    
    return cachedWithImages
  }
  
  // Cache miss - fetch from API
  if (process.env.NODE_ENV === 'development') {
    console.log('[useGenerations] Cache miss, fetching from API')
  }
  const data = await fetcher(url)
  
  // Cache the response
  if (data.generations && data.totalCount !== undefined) {
    setCachedGenerations(userId, data, limit, offset)
    // Only cache images for first few generations (optimized, non-blocking)
    convertAndCacheImages(data.generations).catch(err => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[useGenerations] Error caching images:', err)
      }
    })
  }
  
  // Replace with cached image URLs if available (only for full images)
  if (data.generations) {
    data.generations = replaceWithCachedImageUrls(data.generations)
  }
  
  return data
}

// Helper to replace image URLs with cached data URLs for single generation
function replaceGenerationImageUrls(generation: any): any {
  if (!generation) return generation
  
  const updated = { ...generation }
  
  // Replace imageUrls with cached data URLs if available
  if (generation.imageUrls && Array.isArray(generation.imageUrls)) {
    updated.imageUrls = generation.imageUrls.map((url: string) => {
      const cached = getCachedImageDataUrl(url)
      return cached || url
    })
  }
  if (generation.image_urls && Array.isArray(generation.image_urls)) {
    updated.image_urls = generation.image_urls.map((url: string) => {
      const cached = getCachedImageDataUrl(url)
      return cached || url
    })
  }
  if (generation.thumbnail_urls && Array.isArray(generation.thumbnail_urls)) {
    updated.thumbnail_urls = generation.thumbnail_urls.map((url: string) => {
      const cached = getCachedImageDataUrl(url)
      return cached || url
    })
  }
  
  return updated
}

// Custom fetcher for single generation with localStorage caching
const cachedGenerationFetcher = async (url: string, id: string, userId: string) => {
  // Check cache first
  const cached = getCachedGeneration(id, userId)
  if (cached) {
    // Replace image URLs with cached data URLs
    const cachedWithImages = replaceGenerationImageUrls(cached)
    
    // Return cached data immediately, but also refresh in background
    console.log(`[useGeneration] Using cached data for ${id}, refreshing in background`)
    fetch(url)
      .then(res => res.json())
      .then(data => {
        // Cache the fresh data
        if (data.generation) {
          setCachedGeneration(id, userId, data.generation)
          // Convert image URLs to data URLs in background
          if (data.generation.imageUrls || data.generation.image_urls) {
            const urls = data.generation.imageUrls || data.generation.image_urls || []
            cacheImageUrls(urls).catch(err => 
              console.error('[useGeneration] Error caching images:', err)
            )
          }
        }
      })
      .catch(err => console.error(`[useGeneration] Background refresh failed for ${id}:`, err))
    
    return { generation: cachedWithImages }
  }
  
  // Cache miss - fetch from API
  console.log(`[useGeneration] Cache miss for ${id}, fetching from API`)
  const data = await fetcher(url)
  
  // Cache the response
  if (data.generation) {
    setCachedGeneration(id, userId, data.generation)
    // Convert image URLs to data URLs in background (don't block)
    if (data.generation.imageUrls || data.generation.image_urls) {
      const urls = data.generation.imageUrls || data.generation.image_urls || []
      cacheImageUrls(urls).catch(err => 
        console.error('[useGeneration] Error caching images:', err)
      )
    }
  }
  
  // Replace with cached image URLs if available
  if (data.generation) {
    data.generation = replaceGenerationImageUrls(data.generation)
  }
  
  return data
}

// Helper to convert and cache images for multiple generations
// OPTIMIZED: Only cache full images, not thumbnails (thumbnails use original URLs)
// Only cache images for the first few generations to avoid overwhelming localStorage
async function convertAndCacheImages(generations: any[]): Promise<void> {
  // Only process first 3 generations to avoid caching too many images at once
  const generationsToProcess = generations.slice(0, 3)
  const allImageUrls: string[] = []
  
  for (const gen of generationsToProcess) {
    // Only cache full images, not thumbnails
    // Thumbnails will use original URLs directly (faster, less storage)
    const imageUrls = gen.imageUrls || gen.image_urls || []
    // Filter out data URLs (already cached) and only cache signed URLs
    const urlsToCache = imageUrls.filter((url: string) => 
      url && 
      typeof url === 'string' && 
      !url.startsWith('data:image/') && 
      url.trim().length > 0
    )
    allImageUrls.push(...urlsToCache)
  }
  
  // Only cache if we have a reasonable number of images (max 15)
  if (allImageUrls.length > 0 && allImageUrls.length <= 15) {
    // Cache in background without blocking
    cacheImageUrls(allImageUrls).catch(err => 
      console.error('[useGenerations] Error caching images:', err)
    )
  }
}

// Hook to fetch all generations with caching and pagination
export function useGenerations(userId: string | undefined, limit: number = 6, offset: number = 0) {
  // Check cache synchronously before SWR runs
  const getInitialData = () => {
    if (!userId) return undefined
    const cached = getCachedGenerations(userId, limit, offset)
    if (cached) {
      // Replace image URLs with cached data URLs
      return {
        ...cached,
        generations: replaceWithCachedImageUrls(cached.generations || [])
      }
    }
    return undefined
  }
  
  const { data, error, isLoading, mutate } = useSWR(
    userId ? [`/api/generations/list?userId=${userId}&limit=${limit}&offset=${offset}`, userId, limit, offset] : null,
    ([url, userId, limit, offset]) => cachedListFetcher(url, userId, limit, offset),
    {
      revalidateOnFocus: false, // Don't refetch when window regains focus
      revalidateOnReconnect: false, // Don't refetch on reconnect (use cache)
      dedupingInterval: 10000, // Dedupe requests within 10 seconds (increased to reduce duplicate calls)
      fallbackData: getInitialData(), // Use cached data as fallback
      // Prevent unnecessary revalidation
      revalidateIfStale: false,
    }
  )

  return {
    generations: data?.generations as Generation[] | undefined,
    totalCount: data?.totalCount as number | undefined,
    isLoading,
    isError: error,
    mutate, // Function to manually revalidate
  }
}

// Hook to fetch a single generation with caching
export function useGeneration(id: string | undefined, userId: string | undefined) {
  // Check cache synchronously before SWR runs
  const getInitialData = () => {
    if (!id || !userId) return undefined
    const cached = getCachedGeneration(id, userId)
    if (cached) {
      // Replace image URLs with cached data URLs
      return {
        generation: replaceGenerationImageUrls(cached)
      }
    }
    return undefined
  }
  
  const { data, error, isLoading, mutate } = useSWR(
    id && userId ? [`/api/generations/${id}?userId=${userId}`, id, userId] : null,
    ([url, id, userId]) => cachedGenerationFetcher(url, id, userId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false, // Don't refetch on reconnect (use cache)
      dedupingInterval: 5000,
      fallbackData: getInitialData(), // Use cached data as fallback
      // When the key (id) changes, SWR will automatically treat it as a new request
      // and clear the previous data, so we don't need keepPreviousData
    }
  )

  return {
    generation: data?.generation as Generation | undefined,
    isLoading,
    isError: error,
    mutate,
  }
}

