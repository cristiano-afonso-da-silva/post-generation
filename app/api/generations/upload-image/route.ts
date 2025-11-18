import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

/**
 * Upload a single image to Supabase Storage
 * This endpoint handles one image at a time to avoid Vercel's body size limits
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { 
      userId,
      generationId,
      imageIndex,
      imageData // base64 image data
    } = body

    if (!userId || !generationId || imageIndex === undefined || !imageData) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Convert base64 to buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    const filePath = `${userId}/${generationId}/slide-${imageIndex}.webp`
    
    // Upload to Supabase Storage
    // OPTIMIZED: Increased cacheControl to 7 days (604800 seconds) since images are immutable
    // Using WebP format for 25-35% smaller file size and reduced egress costs
    const { error: uploadError } = await supabase.storage
      .from('carousel-images')
      .upload(filePath, buffer, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '604800' // 7 days - images are immutable once created
      })

    if (uploadError) {
      console.error(`Error uploading slide ${imageIndex}:`, uploadError)
      return NextResponse.json(
        { error: `Failed to upload image: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get signed URL for private bucket access (24 hour expiry)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('carousel-images')
      .createSignedUrl(filePath, 86400)
    
    let imageUrl: string
    if (urlError) {
      console.error(`Error creating signed URL for slide ${imageIndex}:`, urlError)
      // Fallback to public URL if signed URL fails
      const { data: publicData } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(filePath)
      imageUrl = publicData.publicUrl
    } else {
      imageUrl = urlData.signedUrl
    }

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      imageIndex
    })

  } catch (error: any) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    )
  }
}

