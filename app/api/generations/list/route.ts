import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const userId = request.nextUrl.searchParams.get('userId')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '6')
    const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0')
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Get total count
    const { count } = await supabase
      .from('generations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    // Fetch generations - get ALL fields like the [id] endpoint does
    const { data: generations, error } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching generations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Process each generation EXACTLY like [id] endpoint does
    const generationsWithImages = await Promise.all(
      (generations || []).map(async (gen) => {
        // Use cached image URLs from database if available (SAME AS [id] ENDPOINT)
        let imageUrls = gen.image_urls || []

        // If image_urls doesn't exist or is empty, fetch from storage and cache in DB
        if (!imageUrls || imageUrls.length === 0) {
          console.log(`⚠️ Generation ${gen.id}: Fetching from storage...`)
          const { data: files, error: listError } = await supabase.storage
            .from('carousel-images')
            .list(`${userId}/${gen.id}`)

          if (!listError && files && files.length > 0) {
            // Sort files by name to ensure correct order (slide-0.png, slide-1.png, etc.)
            const sortedFiles = files.sort((a, b) => {
              const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0')
              const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0')
              return aNum - bNum
            })

            imageUrls = sortedFiles.map(file => {
              const { data } = supabase.storage
                .from('carousel-images')
                .getPublicUrl(`${userId}/${gen.id}/${file.name}`)
              return data.publicUrl
            })

            console.log(`✅ Generation ${gen.id}: Fetched ${imageUrls.length} URLs from storage`)

            // Cache image URLs in database for future requests
            await supabase
              .from('generations')
              .update({ image_urls: imageUrls })
              .eq('id', gen.id)
          } else {
            console.log(`❌ Generation ${gen.id}: No files in storage`)
          }
        } else {
          console.log(`✅ Generation ${gen.id}: Using ${imageUrls.length} cached URLs from database`)
        }

        return {
          id: gen.id,
          project_name: gen.project_name,
          idea_title: gen.idea_title,
          created_at: gen.created_at,
          thumbnail_urls: imageUrls.slice(0, 4), // First 4 for thumbnails
          imageUrls: imageUrls // Include all images like [id] endpoint
        }
      })
    )

    return NextResponse.json({ 
      generations: generationsWithImages,
      totalCount: count || 0
    })

  } catch (error: any) {
    console.error('Error fetching generations:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch generations' },
      { status: 500 }
    )
  }
}
