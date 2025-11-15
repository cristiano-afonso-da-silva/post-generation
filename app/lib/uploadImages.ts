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
      const { error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(filePath, blob, {
          contentType: 'image/png',
          upsert: true,
          cacheControl: '3600'
        })

      if (uploadError) {
        console.error(`Error uploading slide ${i}:`, uploadError)
        console.error(`   File path: ${filePath}`)
        console.error(`   Authenticated user: ${user.id}`)
        console.error(`   Expected user in path: ${userId}`)
        throw uploadError
      }

      // Get signed URL for private bucket access (1 hour expiry)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('carousel-images')
        .createSignedUrl(filePath, 3600)
      
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
  const supabase = createClientComponentClient()
  
  const { data: existingFiles, error } = await supabase.storage
    .from('carousel-images')
    .list(`${userId}/${generationId}`)
  
  if (error) {
    console.warn('Error checking for existing images:', error)
    return { exists: false }
  }
  
  // Check if we have the expected number of images
  const imageFiles = existingFiles?.filter(file => file.name.startsWith('slide-')) || []
  if (imageFiles.length === expectedCount) {
    console.log(`✅ Found ${imageFiles.length} existing images, skipping upload`)
    
    // Get URLs for existing images
    const urlPromises = imageFiles
      .sort((a, b) => {
        // Sort by slide number (slide-0.png, slide-1.png, etc.)
        const aNum = parseInt(a.name.match(/slide-(\d+)\.png/)?.[1] || '0')
        const bNum = parseInt(b.name.match(/slide-(\d+)\.png/)?.[1] || '0')
        return aNum - bNum
      })
      .map(async (file) => {
        const filePath = `${userId}/${generationId}/${file.name}`
        const { data: urlData, error: urlError } = await supabase.storage
          .from('carousel-images')
          .createSignedUrl(filePath, 3600)
        
        if (urlError) {
          console.error(`Error creating signed URL for ${file.name}:`, urlError)
          const { data: publicData } = supabase.storage
            .from('carousel-images')
            .getPublicUrl(filePath)
          return publicData.publicUrl
        }
        
        return urlData.signedUrl
      })
    
    const imageUrls = await Promise.all(urlPromises)
    const thumbnailUrls = imageUrls.slice(0, 2)
    
    return {
      exists: true,
      imageUrls,
      thumbnailUrls
    }
  }
  
  return { exists: false }
}

/**
 * Delete old images for a generation
 */
export async function deleteOldImages(
  userId: string,
  generationId: string
): Promise<void> {
  const supabase = createClientComponentClient()
  
  const { data: oldFiles } = await supabase.storage
    .from('carousel-images')
    .list(`${userId}/${generationId}`)
  
  if (oldFiles && oldFiles.length > 0) {
    const filesToDelete = oldFiles.map(file => `${userId}/${generationId}/${file.name}`)
    await supabase.storage
      .from('carousel-images')
      .remove(filesToDelete)
  }
}

