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

    // Fetch generations - try with new columns first, fallback to old schema
    let generations: any[] = []
    let error: any = null

    try {
      // Try to fetch with new columns (image_urls, thumbnail_urls)
      const result = await supabase
        .from('generations')
        .select('id, project_name, idea_title, thumbnail_urls, created_at, image_urls')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (result.error) throw result.error
      generations = result.data || []
    } catch (columnError: any) {
      // If columns don't exist, fetch without them
      console.warn('New columns not found, fetching with fallback:', columnError.message)
      const result = await supabase
        .from('generations')
        .select('id, project_name, idea_title, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (result.error) throw result.error
      generations = result.data || []
    }

    // If thumbnail_urls don't exist in DB, fetch from storage and update DB (one-time migration)
    const generationsWithThumbnails = await Promise.all(
      generations.map(async (gen) => {
        // If thumbnail_urls already exists and has values, use it
        if (gen.thumbnail_urls && gen.thumbnail_urls.length > 0) {
          return gen
        }

        // Otherwise, fetch first 2 images from storage and cache in DB
        try {
          const { data: files, error: listError } = await supabase.storage
            .from('carousel-images')
            .list(`${userId}/${gen.id}`)

          if (listError || !files || files.length === 0) {
            return gen
          }

          // Sort files by name to ensure correct order (slide-0.png, slide-1.png, etc.)
          const sortedFiles = files.sort((a, b) => {
            const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0')
            const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0')
            return aNum - bNum
          })

          // Get first 2 images as thumbnails (slide-0.png and slide-1.png)
          const thumbnailUrls: string[] = []
          for (let i = 0; i < Math.min(2, sortedFiles.length); i++) {
            const { data } = supabase.storage
              .from('carousel-images')
              .getPublicUrl(`${userId}/${gen.id}/${sortedFiles[i].name}`)
            thumbnailUrls.push(data.publicUrl)
          }

          // Try to update database with thumbnail URLs for future requests
          try {
            await supabase
              .from('generations')
              .update({ thumbnail_urls: thumbnailUrls })
              .eq('id', gen.id)
          } catch (updateError) {
            // Silently fail if column doesn't exist
            console.warn('Could not update thumbnail_urls:', updateError)
          }

          return {
            ...gen,
            thumbnail_urls: thumbnailUrls
          }
        } catch (error) {
          console.error(`Error fetching thumbnails for generation ${gen.id}:`, error)
          return gen
        }
      })
    )

    return NextResponse.json({ 
      generations: generationsWithThumbnails,
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
