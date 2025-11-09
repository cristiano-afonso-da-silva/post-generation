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

    // Get all image URLs from storage
    const { data: files, error: listError } = await supabase.storage
      .from('carousel-images')
      .list(`${userId}/${params.id}`)

    // Sort files by name to ensure correct order (carousel-0.png, carousel-1.png, etc.)
    const sortedFiles = files?.sort((a, b) => {
      const aNum = parseInt(a.name.match(/\d+/)?.[0] || '0')
      const bNum = parseInt(b.name.match(/\d+/)?.[0] || '0')
      return aNum - bNum
    }) || []

    const imageUrls = sortedFiles.map(file => {
      const { data } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(`${userId}/${params.id}/${file.name}`)
      return data.publicUrl
    })

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

