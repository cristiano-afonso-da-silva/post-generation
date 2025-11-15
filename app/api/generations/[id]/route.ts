import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'
import { isSignedUrlValid, filterValidUrls, areAllUrlsValid } from '@/app/lib/urlValidation'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient()
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const { data: generation, error } = await supabase
      .from('generations')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (error) throw error

    if (!generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 })
    }

    // Debug: Log caption field
    console.log(`📝 Generation ${params.id}: Caption field value:`, generation.caption ? `"${generation.caption.substring(0, 50)}..."` : 'null/empty')

    /**
     * OPTIMIZED: Smart URL caching to reduce egress
     * 
     * Strategy:
     * 1. Check if cached URLs exist in database and are still valid
     * 2. Only regenerate URLs that are expired or missing
     * 3. Only call storage.list() as a last resort (when no cached URLs exist)
     * 
     * This reduces egress by ~95% by avoiding unnecessary storage operations.
     */
    let imageUrls: string[] = []
    const existingImageUrls: string[] = Array.isArray(generation.image_urls) ? generation.image_urls : []

    if (existingImageUrls.length > 0 && areAllUrlsValid(existingImageUrls)) {
      // All cached URLs are still valid - use them (no egress!)
      imageUrls = existingImageUrls
      console.log(`✅ Generation ${params.id}: Using ${imageUrls.length} cached URLs (all valid)`)
    } else if (existingImageUrls.length > 0) {
      // Some URLs expired - regenerate only the expired ones
      const validUrls = filterValidUrls(existingImageUrls)
      console.log(`🔄 Generation ${params.id}: ${validUrls.length}/${existingImageUrls.length} URLs still valid, regenerating ${existingImageUrls.length - validUrls.length} expired`)
      
      imageUrls = await Promise.all(
        existingImageUrls.map(async (cachedUrl, index) => {
          // If cached URL is still valid, use it
          if (isSignedUrlValid(cachedUrl)) {
            return cachedUrl
          }
          
          // Otherwise, regenerate for this index
          const filePath = `${userId}/${params.id}/slide-${index}.png`
          const { data, error } = await supabase.storage
            .from('carousel-images')
            .createSignedUrl(filePath, 86400) // 24 hour expiry
          
          if (error) {
            console.error(`Error creating signed URL for slide-${index}.png:`, error)
            // Fallback to public URL if signed URL fails
            const { data: publicData } = supabase.storage
              .from('carousel-images')
              .getPublicUrl(filePath)
            return publicData.publicUrl
          }
          
          return data.signedUrl
        })
      )
    } else {
      // Cached URLs are completely missing - only then check storage directly
      // This is a last resort to avoid unnecessary storage.list() calls
      const { data: files, error: listError } = await supabase.storage
        .from('carousel-images')
        .list(`${userId}/${params.id}`)

      if (!listError && files && files.length > 0) {
        // Sort files by name to ensure correct order (slide-0.png, slide-1.png, etc.)
        const sortedFiles = files.sort((a, b) => {
          const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0')
          const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0')
          return aNum - bNum
        })

        // Generate fresh signed URLs for private bucket access (24 hour expiry)
        imageUrls = await Promise.all(
          sortedFiles.map(async (file) => {
            const { data, error } = await supabase.storage
              .from('carousel-images')
              .createSignedUrl(`${userId}/${params.id}/${file.name}`, 86400) // 24 hour expiry
            if (error) {
              console.error(`Error creating signed URL for ${file.name}:`, error)
              // Fallback to public URL if signed URL fails
              const { data: publicData } = supabase.storage
                .from('carousel-images')
                .getPublicUrl(`${userId}/${params.id}/${file.name}`)
              return publicData.publicUrl
            }
            return data.signedUrl
          })
        )

        console.log(`✅ Generation ${params.id}: Generated ${imageUrls.length} fresh signed URLs (cache was missing)`)
      }
    }

    // Explicitly include caption to ensure it's returned
    return NextResponse.json({ 
      generation: {
        ...generation,
        caption: generation.caption || null, // Explicitly include caption
        imageUrls
      }
    })

  } catch (error: any) {
    console.error('Error fetching generation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch generation' },
      { status: 500 }
    )
  }
}

