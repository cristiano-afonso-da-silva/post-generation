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

    // Fetch generations - only fetch fields we actually need for the history view
    const { data: generations, error } = await supabase
      .from('generations')
      .select('id, project_name, idea_title, created_at, thumbnail_urls, image_urls')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching generations:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    /**
     * IMPORTANT:
     * We can’t safely use the cached `image_urls` / `thumbnail_urls` values here because
     * they are signed URLs created when the generation was originally saved.
     * Signed URLs from Supabase Storage expire (currently after 1 hour), which caused
     * history thumbnails to frequently break and show only the "Slide 1 / Slide 2" alt text.
     *
     * Instead, we use the cached arrays ONLY to know how many slides exist, and then
     * generate *fresh* signed URLs for each slide based on the known storage path
     * pattern: `${userId}/${generation.id}/slide-${index}.png`.
     */
    const generationsWithImages = await Promise.all(
      (generations || []).map(async (gen: any) => {
        const existingImageUrls: string[] = Array.isArray(gen.image_urls) ? gen.image_urls : []
        let imageUrls: string[] = []

        if (userId && existingImageUrls.length > 0) {
          imageUrls = await Promise.all(
            existingImageUrls.map(async (_url, index) => {
              const filePath = `${userId}/${gen.id}/slide-${index}.png`

              // Generate a fresh signed URL for each slide (1 hour expiry)
              const { data, error: urlError } = await supabase.storage
                .from('carousel-images')
                .createSignedUrl(filePath, 3600)

              if (urlError) {
                console.error(`Error creating signed URL for ${filePath}:`, urlError)
                // Fallback to public URL if signed URL fails (in case bucket is public)
                const { data: publicData } = supabase.storage
                  .from('carousel-images')
                  .getPublicUrl(filePath)
                return publicData.publicUrl
              }

              return data.signedUrl
            })
          )
        }

        // Use the first 2 fresh URLs as thumbnails; if for some reason we couldn't
        // regenerate fresh URLs, fall back to any cached thumbnail URLs.
        const thumbnailUrls: string[] =
          imageUrls.length > 0
            ? imageUrls.slice(0, 2)
            : Array.isArray(gen.thumbnail_urls)
            ? gen.thumbnail_urls
            : []

        return {
          id: gen.id,
          project_name: gen.project_name,
          idea_title: gen.idea_title,
          created_at: gen.created_at,
          thumbnail_urls: thumbnailUrls,
          imageUrls, // camelCase for the frontend (HistoryPage uses this)
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
