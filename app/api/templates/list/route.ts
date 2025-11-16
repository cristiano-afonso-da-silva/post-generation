import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Get userId from query params
    const userId = request.nextUrl.searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Fetch user's custom templates
    const supabase = createServerClient()
    const { data: templates, error: templatesError } = await supabase
      .from('custom_templates')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (templatesError) {
      console.error('Error fetching templates:', templatesError)
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      )
    }

    // Transform database records to template format
    const customTemplates = templates.map(t => ({
      ...t.config,
      id: t.id,
      name: t.name,
      isCustom: true
    }))

    return NextResponse.json({
      success: true,
      templates: customTemplates
    })

  } catch (error: any) {
    console.error('Error in templates list:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

