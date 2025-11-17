import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

/**
 * Lightweight endpoint to update only template_id and/or color_theme_id
 * This is much faster than the full save endpoint since it skips all unnecessary checks and processing
 */
export async function POST(request: NextRequest) {
  try {
    let supabase
    try {
      supabase = createServerClient()
    } catch (clientError: any) {
      console.error('Failed to create Supabase client:', clientError)
      return NextResponse.json(
        { error: 'Server configuration error: ' + (clientError.message || 'Missing Supabase credentials') },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { 
      userId,
      generationId,
      templateId,
      colorThemeId
    } = body

    if (!userId || !generationId) {
      return NextResponse.json({ 
        error: 'Missing userId or generationId' 
      }, { status: 400 })
    }

    if (!templateId && !colorThemeId) {
      return NextResponse.json({ 
        error: 'Must provide at least templateId or colorThemeId' 
      }, { status: 400 })
    }

    // Build update object with only provided fields
    const updateData: {
      template_id?: string
      color_theme_id?: string
      updated_at: string
    } = {
      updated_at: new Date().toISOString()
    }

    if (templateId) {
      updateData.template_id = templateId
    }

    if (colorThemeId) {
      updateData.color_theme_id = colorThemeId
    }

    // Direct update - no unnecessary checks since we have the generationId
    const { data, error: updateError } = await supabase
      .from('generations')
      .update(updateData)
      .eq('id', generationId)
      .eq('user_id', userId) // Security: ensure user owns this generation
      .select('id')
      .single()

    if (updateError) {
      console.error('Error updating template/theme:', updateError)
      // Check if it's a "not found" error (generation doesn't exist or user doesn't own it)
      if (updateError.code === 'PGRST116' || updateError.message?.includes('No rows')) {
        return NextResponse.json(
          { error: 'Generation not found or access denied' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { error: updateError.message || 'Failed to update template and theme' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Generation not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({ 
      success: true,
      generationId: data.id
    })

  } catch (error: any) {
    console.error('Error updating template and theme:', error)
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error.message || 'Failed to update template and theme' },
      { status: 500 }
    )
  }
}


