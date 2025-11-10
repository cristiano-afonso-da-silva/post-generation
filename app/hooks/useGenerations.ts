import useSWR from 'swr'

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
  font_combination_id: string
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

// Hook to fetch all generations with caching and pagination
export function useGenerations(userId: string | undefined, limit: number = 6, offset: number = 0) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `/api/generations/list?userId=${userId}&limit=${limit}&offset=${offset}` : null,
    fetcher,
    {
      revalidateOnFocus: false, // Don't refetch when window regains focus
      revalidateOnReconnect: true, // Refetch when reconnecting
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
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
  const { data, error, isLoading, mutate } = useSWR(
    id && userId ? `/api/generations/${id}?userId=${userId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
    }
  )

  return {
    generation: data?.generation as Generation | undefined,
    isLoading,
    isError: error,
    mutate,
  }
}

