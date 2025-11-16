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
function replaceWithCachedImageUrls(generations: any[]): any[] {
  return generations.map(gen => {
    const updated = { ...gen }
    
    // Replace imageUrls with cached data URLs if available
    if (gen.imageUrls && Array.isArray(gen.imageUrls)) {
      updated.imageUrls = gen.imageUrls.map((url: string) => {
        const cached = getCachedImageDataUrl(url)
        return cached || url
      })
    }
    if (gen.image_urls && Array.isArray(gen.image_urls)) {
      updated.image_urls = gen.image_urls.map((url: string) => {
        const cached = getCachedImageDataUrl(url)
        return cached || url
      })
    }
    if (gen.thumbnail_urls && Array.isArray(gen.thumbnail_urls)) {
      updated.thumbnail_urls = gen.thumbnail_urls.map((url: string) => {
        const cached = getCachedImageDataUrl(url)
        return cached || url
      })
    }
    
    return updated
  })
}

// Custom fetcher for generations list with localStorage caching
const cachedListFetcher = async (url: string, userId: string, limit: number, offset: number) => {
  // Check cache first
  const cached = getCachedGenerations(userId, limit, offset)
  if (cached) {
    // Replace image URLs with cached data URLs
    const cachedWithImages = {
      ...cached,
      generations: replaceWithCachedImageUrls(cached.generations || [])
    }
    
    // Return cached data immediately, but also refresh in background
    console.log('[useGenerations] Using cached data, refreshing in background')
    fetch(url)
      .then(res => res.json())
      .then(data => {
        // Cache the fresh data
        if (data.generations && data.totalCount !== undefined) {
          setCachedGenerations(userId, data, limit, offset)
          // Convert image URLs to data URLs in background
          convertAndCacheImages(data.generations)
        }
      })
      .catch(err => console.error('[useGenerations] Background refresh failed:', err))
    
    return cachedWithImages
  }
  
  // Cache miss - fetch from API
  console.log('[useGenerations] Cache miss, fetching from API')
  const data = await fetcher(url)
  
  // Cache the response
  if (data.generations && data.totalCount !== undefined) {
    setCachedGenerations(userId, data, limit, offset)
    // Convert image URLs to data URLs in background (don't block)
    convertAndCacheImages(data.generations).catch(err => 
      console.error('[useGenerations] Error caching images:', err)
    )
  }
  
  // Replace with cached image URLs if available
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
async function convertAndCacheImages(generations: any[]): Promise<void> {
  const allImageUrls: string[] = []
  
  for (const gen of generations) {
    const imageUrls = gen.imageUrls || gen.image_urls || []
    const thumbnailUrls = gen.thumbnail_urls || []
    allImageUrls.push(...imageUrls, ...thumbnailUrls)
  }
  
  if (allImageUrls.length > 0) {
    await cacheImageUrls(allImageUrls)
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
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      fallbackData: getInitialData(), // Use cached data as fallback
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

