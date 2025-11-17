/**
 * Upload images directly to Supabase Storage from the client
 * This bypasses API route body size limits by uploading directly
 */
import { supabase } from './supabase'

export interface UploadImagesResult {
  imageUrls: string[]
  thumbnailUrls: string[]
}

/**
 * Converts a base64 data URL to a Blob
 */
function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',')
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'image/png'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * Upload images directly to Supabase Storage
 * @param userId - User ID for organizing storage
 * @param generationId - Generation ID for organizing storage
 * @param imageDataUrls - Array of base64 data URLs
 * @returns Object with imageUrls and thumbnailUrls
 */
export async function uploadImagesToStorage(
  userId: string,
  generationId: string,
  imageDataUrls: string[]
): Promise<UploadImagesResult> {
  // Verify user is authenticated and matches the userId
  // Uses the same Supabase client as the rest of the app (AuthContext), so sessions work in production
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error(`Authentication required: ${authError?.message || 'Not authenticated'}`)
  }

  if (user.id !== userId) {
    throw new Error(`User ID mismatch: authenticated as ${user.id}, but trying to upload for ${userId}`)
  }

  console.log(`⚡ Starting direct upload of ${imageDataUrls.length} images to Supabase Storage...`)
  console.log(`   👤 Authenticated as: ${user.id}`)
  console.log(`   📁 Path prefix: ${userId}/${generationId}`)
  const uploadStartTime = Date.now()
  
  // Upload all images in parallel
  const uploadPromises = imageDataUrls.map(async (imageDataUrl, i) => {
    try {
      // Convert base64 to Blob
      const blob = dataURLtoBlob(imageDataUrl)
      
      const filePath = `${userId}/${generationId}/slide-${i}.png`
      
      console.log(`📤 Uploading ${filePath}...`)
      
      // Upload to Supabase Storage
      // OPTIMIZED: Increased cacheControl to 7 days (604800 seconds) since images are immutable
      // This enables better CDN caching and reduces egress costs
      const { error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true,
          cacheControl: '604800' // 7 days - images are immutable once created
        })

      if (uploadError) {
        console.error(`Error uploading slide ${i}:`, uploadError)
        console.error(`   File path: ${filePath}`)
        console.error(`   Authenticated user: ${user.id}`)
        console.error(`   Expected user in path: ${userId}`)
        throw uploadError
      }

      // Get signed URL for private bucket access (24 hour expiry)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('carousel-images')
        .createSignedUrl(filePath, 86400)
      
      if (urlError) {
        console.error(`Error creating signed URL for slide ${i}:`, urlError)
        // Fallback to public URL if signed URL fails
        const { data: publicData } = supabase.storage
          .from('carousel-images')
          .getPublicUrl(filePath)
        return publicData.publicUrl
      }
      
      return urlData.signedUrl
    } catch (error) {
      console.error(`Failed to upload image ${i}:`, error)
      throw error
    }
  })

  // Wait for all uploads to complete
  const imageUrls = await Promise.all(uploadPromises)
  const thumbnailUrls = imageUrls.slice(0, 2) // First 2 as thumbnails
  
  const uploadTime = Date.now() - uploadStartTime
  console.log(`✅ Uploaded ${imageDataUrls.length} images in ${uploadTime}ms (parallel, client-side)`)
  
  return {
    imageUrls,
    thumbnailUrls
  }
}

/**
 * Check if images already exist for a generation
 * FIXED: Check database first, then try known file paths - avoid storage.list() which causes egress
 * @param userId - User ID
 * @param generationId - Generation ID
 * @param expectedCount - Expected number of images
 * @returns Object with exists flag and existing URLs if they exist
 */
export async function checkImagesExist(
  userId: string,
  generationId: string,
  expectedCount: number
): Promise<{ exists: boolean; imageUrls?: string[]; thumbnailUrls?: string[] }> {
  
  // First, check database for cached URLs (no egress!)
  const { data: generation, error: dbError } = await supabase
    .from('generations')
    .select('image_urls')
    .eq('id', generationId)
    .eq('user_id', userId)
    .single()
  
  if (!dbError && generation?.image_urls && Array.isArray(generation.image_urls)) {
    const cachedUrls = generation.image_urls.filter((url): url is string => 
      url && typeof url === 'string'
    )
    
    if (cachedUrls.length === expectedCount) {
      // Check if URLs are still valid
      const { isSignedUrlValid } = await import('./urlValidation')
      const validUrls = cachedUrls.filter(url => isSignedUrlValid(url))
      
      if (validUrls.length === expectedCount) {
        console.log(`✅ Found ${validUrls.length} existing images in database cache, skipping upload`)
        return {
          exists: true,
          imageUrls: validUrls,
          thumbnailUrls: validUrls.slice(0, 2)
        }
      }
    }
  }
  
  // If database doesn't have URLs, try known file paths (no storage.list() - avoids egress)
  // We know images follow the pattern: slide-0.png, slide-1.png, etc.
  console.log(`⚠️ No cached URLs in database, checking known file paths for ${expectedCount} images`)
  
  const pathPromises: Promise<string | null>[] = []
  
  for (let i = 0; i < expectedCount; i++) {
    const filePath = `${userId}/${generationId}/slide-${i}.png`
    pathPromises.push(
      supabase.storage
        .from('carousel-images')
        .createSignedUrl(filePath, 86400)
        .then(({ data, error }) => {
          if (error) {
            // File doesn't exist at this index
            return null
          }
          return data.signedUrl
        })
        .catch(() => null)
    )
  }
  
  const results = await Promise.all(pathPromises)
  const imageUrls = results.filter((url): url is string => url !== null)
  
  if (imageUrls.length === expectedCount) {
    console.log(`✅ Found ${imageUrls.length} existing images via path check, skipping upload`)
    // Save URLs to database for future use
    await supabase
      .from('generations')
      .update({ image_urls: imageUrls })
      .eq('id', generationId)
      .eq('user_id', userId)
    
    return {
      exists: true,
      imageUrls,
      thumbnailUrls: imageUrls.slice(0, 2)
    }
  }
  
  return { exists: false }
}

/**
 * Delete old images for a generation
 * FIXED: Use known file pattern instead of storage.list() to avoid egress
 */
export async function deleteOldImages(
  userId: string,
  generationId: string
): Promise<void> {
  
  // FIXED: Avoid storage.list() which causes egress
  // Try to delete up to 10 old slides (most carousels have 3-5 slides)
  // We know the pattern: slide-0.png, slide-1.png, etc.
  const maxOldSlides = 10
  const filesToDelete: string[] = []
  
  // Check which files exist by trying to create signed URLs
  // If URL creation succeeds, file exists and should be deleted
  // Note: 400 errors are expected for non-existent files, we ignore them
  for (let i = 0; i < maxOldSlides; i++) {
    const filePath = `${userId}/${generationId}/slide-${i}.png`
    try {
      const { error } = await supabase.storage
        .from('carousel-images')
        .createSignedUrl(filePath, 86400)
      
      if (!error) {
        // File exists, add to deletion list
        filesToDelete.push(filePath)
      }
      // If error is 400, file doesn't exist - this is expected, ignore it
      // Other errors are also ignored to prevent breaking the upload flow
    } catch (err: any) {
      // Silently ignore errors when checking for file existence
      // 400 errors are expected for non-existent files
      // This prevents console spam and doesn't affect functionality
    }
  }
  
  if (filesToDelete.length > 0) {
    await supabase.storage
      .from('carousel-images')
      .remove(filesToDelete)
    console.log(`🗑️ Deleted ${filesToDelete.length} old image files`)
  }
}

