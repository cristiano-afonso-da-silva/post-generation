import { NextRequest, NextResponse } from 'next/server'
import { getUserCreditsServerSQL } from '@/app/lib/supabase-mcp'

// OPTIMIZED: Add caching headers to reduce redundant Supabase calls
// Cache for 10 seconds - credits change frequently but short cache helps reduce egress
export const revalidate = 10

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    const credits = await getUserCreditsServerSQL(userId)

    if (!credits) {
      return NextResponse.json(
        { error: 'Failed to fetch credits' },
        { status: 500 }
      )
    }

    // OPTIMIZED: Add cache headers to reduce redundant Supabase calls
    const response = NextResponse.json({
      hasCredits: credits.credits_remaining > 0,
      creditsRemaining: credits.credits_remaining,
      subscriptionStatus: credits.subscription_status,
      currentPlan: credits.current_plan,
    })
    
    // Cache for 10 seconds - user-specific but reduces redundant Supabase calls
    response.headers.set('Cache-Control', 'private, s-maxage=10, stale-while-revalidate=20')
    
    return response
  } catch (error: any) {
    console.error('Error checking credits:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check credits' },
      { status: 500 }
    )
  }
}

