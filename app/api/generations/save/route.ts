import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    const body = await request.json()
    const { 
      userId,
      generationId: providedGenerationId, // Optional: if provided, update existing generation
      ideaTitle, 
      accountDescription,
      slides, 
      caption,
      underlineWords, 
      fontCombinationId, 
      colorThemeId,
      images // base64 image data array
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    let generation: any
    let isUpdate = false
    let generationId = providedGenerationId // Use let so we can reassign if needed

    // First, check if a generation with the same ideaTitle already exists for this user
    // This ensures that updates to the same idea replace the existing entry instead of creating duplicates
    const { data: existingByTitle, error: titleCheckError } = await supabase
      .from('generations')
      .select('*')
      .eq('user_id', userId)
      .eq('idea_title', ideaTitle)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!titleCheckError && existingByTitle) {
      // Found an existing generation with the same ideaTitle - we'll update it
      generationId = existingByTitle.id
      generation = existingByTitle
      isUpdate = true
      console.log(`Found existing generation for ideaTitle "${ideaTitle}", will update instead of creating new`)
    } else if (generationId) {
      // If no match by title, but generationId was provided, verify it exists and belongs to the user
      const { data: existingGen, error: fetchError } = await supabase
        .from('generations')
        .select('*')
        .eq('id', generationId)
        .eq('user_id', userId)
        .single()

      if (!fetchError && existingGen) {
        generation = existingGen
        isUpdate = true
      } else {
        // Generation doesn't exist or doesn't belong to user, will create new one
        generationId = undefined
      }
    }

    // Generate project name from idea title + timestamp
    const timestamp = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const projectName = `${ideaTitle.substring(0, 50)} - ${timestamp}`

    if (isUpdate) {
      // UPDATE existing generation
      const { data: updatedGen, error: updateError } = await supabase
        .from('generations')
        .update({
          project_name: projectName,
          idea_title: ideaTitle,
          account_description: accountDescription || null,
          slides,
          caption: caption || null,
          underline_words: underlineWords || null,
          font_combination_id: fontCombinationId || 'combination-1',
          color_theme_id: colorThemeId || 'purple-black',
          updated_at: new Date().toISOString()
        })
        .eq('id', generationId)
        .select()
        .single()

      if (updateError) throw updateError
      generation = updatedGen
    } else {
      // CREATE new generation
      const { data: newGen, error: genError } = await supabase
        .from('generations')
        .insert({
          user_id: userId,
          project_name: projectName,
          idea_title: ideaTitle,
          account_description: accountDescription || null,
          slides,
          caption: caption || null,
          underline_words: underlineWords || null,
          font_combination_id: fontCombinationId || 'combination-1',
          color_theme_id: colorThemeId || 'purple-black',
        })
        .select()
        .single()

      if (genError) throw genError
      generation = newGen
    }

    // Delete old images if updating (to replace with new ones)
    if (isUpdate) {
      const { data: oldFiles } = await supabase.storage
        .from('carousel-images')
        .list(`${userId}/${generation.id}`)
      
      if (oldFiles && oldFiles.length > 0) {
        const filesToDelete = oldFiles.map(file => `${userId}/${generation.id}/${file.name}`)
        await supabase.storage
          .from('carousel-images')
          .remove(filesToDelete)
      }
    }

    // Upload images to Supabase Storage IN PARALLEL (much faster!)
    console.log(`⚡ Starting parallel upload of ${images.length} images...`)
    const uploadStartTime = Date.now()
    
    const uploadPromises = images.map(async (imageData: string, i: number) => {
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')
      
      const filePath = `${userId}/${generation.id}/slide-${i}.png`
      
      const { error: uploadError } = await supabase.storage
        .from('carousel-images')
        .upload(filePath, buffer, {
          contentType: 'image/png',
          upsert: true
        })

      if (uploadError) {
        console.error(`Error uploading slide ${i}:`, uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('carousel-images')
        .getPublicUrl(filePath)

      return urlData.publicUrl
    })

    // Wait for all uploads to complete in parallel
    const imageUrls = await Promise.all(uploadPromises)
    const thumbnailUrls = imageUrls.slice(0, 2) // First 2 as thumbnails
    
    const uploadTime = Date.now() - uploadStartTime
    console.log(`✅ Uploaded ${images.length} images in ${uploadTime}ms (parallel)`)

    // Update generation with thumbnail URLs and all image URLs for caching
    const { error: urlUpdateError } = await supabase
      .from('generations')
      .update({ 
        thumbnail_urls: thumbnailUrls,
        image_urls: imageUrls 
      })
      .eq('id', generation.id)

    if (urlUpdateError) throw urlUpdateError

    return NextResponse.json({ 
      success: true, 
      generationId: generation.id,
      isUpdate
    })

  } catch (error: any) {
    console.error('Error saving generation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to save generation' },
      { status: 500 }
    )
  }
}

