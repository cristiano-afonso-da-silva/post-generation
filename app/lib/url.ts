/**
 * Get the base URL for the application
 * 
 * In development: http://localhost:3000 (or whatever port you're using)
 * In production: https://postmynote.app (or your Vercel URL)
 */
export function getBaseUrl(): string {
  // Browser environment
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  // Server environment
  // Check if we're in development
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  // Production - use environment variable or Vercel URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Final fallback
  return 'https://postmynote.app'
}

/**
 * Get callback URL for authentication
 * Always uses the current origin to ensure localhost stays localhost
 */
export function getAuthCallbackUrl(path: string = '/'): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${path}`
  }
  return `${getBaseUrl()}${path}`
}

