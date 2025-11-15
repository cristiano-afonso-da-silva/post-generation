/**
 * Utility functions for validating Supabase signed URLs
 * to avoid unnecessary regeneration and reduce egress
 */

/**
 * Checks if a Supabase signed URL is still valid (not expired)
 * Supabase signed URLs contain an 'expires' query parameter with a Unix timestamp
 * 
 * @param signedUrl - The signed URL to validate
 * @param bufferSeconds - Buffer time in seconds before expiry to consider URL invalid (default: 300 = 5 minutes)
 * @returns true if URL is valid, false if expired or invalid
 */
export function isSignedUrlValid(signedUrl: string | null | undefined, bufferSeconds: number = 300): boolean {
  if (!signedUrl || typeof signedUrl !== 'string') {
    return false
  }

  // Check if it's a public URL (no expiry needed)
  if (signedUrl.includes('/storage/v1/object/public/')) {
    return true
  }

  try {
    const url = new URL(signedUrl)
    const expiresParam = url.searchParams.get('expires')
    
    if (!expiresParam) {
      // If no expires param, assume it's a public URL or invalid
      return false
    }

    const expiresTimestamp = parseInt(expiresParam, 10)
    if (isNaN(expiresTimestamp)) {
      return false
    }

    // Get current timestamp in seconds
    const currentTimestamp = Math.floor(Date.now() / 1000)
    
    // Check if URL expires within the buffer time (default 5 minutes)
    // This ensures we regenerate URLs before they actually expire
    const expiresAt = expiresTimestamp - bufferSeconds
    
    return currentTimestamp < expiresAt
  } catch (error) {
    // If URL parsing fails, assume invalid
    console.warn('Failed to parse signed URL for validation:', error)
    return false
  }
}

/**
 * Filters an array of signed URLs, returning only those that are still valid
 * 
 * @param urls - Array of signed URLs to validate
 * @param bufferSeconds - Buffer time in seconds before expiry
 * @returns Array of valid URLs
 */
export function filterValidUrls(urls: (string | null | undefined)[], bufferSeconds: number = 300): string[] {
  return urls.filter((url): url is string => isSignedUrlValid(url, bufferSeconds))
}

/**
 * Checks if all URLs in an array are valid
 * 
 * @param urls - Array of signed URLs to validate
 * @param bufferSeconds - Buffer time in seconds before expiry
 * @returns true if all URLs are valid, false otherwise
 */
export function areAllUrlsValid(urls: (string | null | undefined)[], bufferSeconds: number = 300): boolean {
  if (!urls || urls.length === 0) {
    return false
  }
  
  return urls.every(url => isSignedUrlValid(url, bufferSeconds))
}

