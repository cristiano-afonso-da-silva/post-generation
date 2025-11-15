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
      images, // base64 image data array (legacy approach)
      imageUrls: providedImageUrls, // Already uploaded URLs (new efficient approach)
      thumbnailUrls: providedThumbnailUrls // Already uploaded thumbnail URLs
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    let generation: any
    let isUpdate = false
    let generationId = providedGenerationId // Use let so we can reassign if needed

    // First, check if a generation with the same ideaTitle already exists for this user
    // This ensures that updates to the same idea replace the existing entry instead of creating duplicates
    // Use a single query to find the most recent generation with this ideaTitle
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

    // Use UPSERT pattern to prevent race conditions
    // First, try to insert. If it fails due to unique constraint, update instead
    if (!isUpdate) {
      // Try to insert first
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

      if (genError) {
        // If insert fails due to unique constraint violation, try to update instead
        // This handles race conditions where two requests try to create at the same time
        if (genError.code === '23505' || genError.message?.includes('duplicate') || genError.message?.includes('unique')) {
          console.log(`Insert failed due to duplicate, attempting update for ideaTitle "${ideaTitle}"`)
          
          // Fetch the existing generation
          const { data: existingGen, error: fetchError } = await supabase
            .from('generations')
            .select('*')
            .eq('user_id', userId)
            .eq('idea_title', ideaTitle)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          if (!fetchError && existingGen) {
            generationId = existingGen.id
            isUpdate = true
            // Fall through to update logic below
          } else {
            throw genError // Re-throw if we can't find the existing record
          }
        } else {
          throw genError // Re-throw if it's a different error
        }
      } else {
        // Insert succeeded
        generation = newGen
      }
    }

    // If we need to update (either found existing or insert failed due to duplicate)
    if (isUpdate && generationId) {
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
    }

    let imageUrls: string[]
    let thumbnailUrls: string[]

    // Check if images were already uploaded (new efficient approach)
    if (providedImageUrls && providedImageUrls.length > 0) {
      // Images already uploaded directly to storage from client
      console.log(`✅ Using pre-uploaded images (${providedImageUrls.length} URLs provided)`)
      imageUrls = providedImageUrls
      thumbnailUrls = providedThumbnailUrls || providedImageUrls.slice(0, 2)
    } else if (images && images.length > 0) {
      // Legacy approach: Upload base64 images from API route
      console.log(`⚡ Starting parallel upload of ${images.length} images from API route...`)
      
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

        // Get signed URL for private bucket access (24 hour expiry)
        const { data: urlData, error: urlError } = await supabase.storage
          .from('carousel-images')
          .createSignedUrl(filePath, 86400)
        
        if (urlError) {
          console.error(`Error creating signed URL for slide ${i}:`, urlError)
          const { data: publicData } = supabase.storage
            .from('carousel-images')
            .getPublicUrl(filePath)
          return publicData.publicUrl
        }
        
        return urlData.signedUrl
      })

      imageUrls = await Promise.all(uploadPromises)
      thumbnailUrls = imageUrls.slice(0, 2)
      
      const uploadTime = Date.now() - uploadStartTime
      console.log(`✅ Uploaded ${images.length} images in ${uploadTime}ms (parallel, server-side)`)
    } else {
      // No images provided - this is allowed for initial generation creation
      // Images will be uploaded separately and URLs updated later
      console.log('⚠️ No images or imageUrls provided - creating generation without images')
      imageUrls = []
      thumbnailUrls = []
    }

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

