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

    // Debug: Log caption field
    console.log(`📝 Generation ${params.id}: Caption field value:`, generation.caption ? `"${generation.caption.substring(0, 50)}..."` : 'null/empty')

    // Always generate fresh signed URLs (they expire after 1 hour)
    // Check if files exist in storage first
    let imageUrls: string[] = []
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

      // Generate fresh signed URLs for private bucket access (1 hour expiry)
      imageUrls = await Promise.all(
        sortedFiles.map(async (file) => {
          const { data, error } = await supabase.storage
            .from('carousel-images')
            .createSignedUrl(`${userId}/${params.id}/${file.name}`, 3600) // 1 hour expiry
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

      console.log(`✅ Generation ${params.id}: Generated ${imageUrls.length} fresh signed URLs`)
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

