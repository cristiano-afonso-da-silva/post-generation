import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

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

    // Use cached image URLs from database if available
    let imageUrls = generation.image_urls || []

    // If image_urls doesn't exist or is empty, fetch from storage and cache in DB
    if (!imageUrls || imageUrls.length === 0) {
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

        imageUrls = sortedFiles.map(file => {
          const { data } = supabase.storage
            .from('carousel-images')
            .getPublicUrl(`${userId}/${params.id}/${file.name}`)
          return data.publicUrl
        })

        // Cache image URLs in database for future requests
        await supabase
          .from('generations')
          .update({ image_urls: imageUrls })
          .eq('id', params.id)
      }
    }

    return NextResponse.json({ 
      generation: {
        ...generation,
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

