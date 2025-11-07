import { NextRequest, NextResponse } from 'next/server'
import { getUserCreditsServerSQL } from '@/app/lib/supabase-mcp'

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

    return NextResponse.json({
      hasCredits: credits.credits_remaining > 0,
      creditsRemaining: credits.credits_remaining,
      subscriptionStatus: credits.subscription_status,
      currentPlan: credits.current_plan,
    })
  } catch (error: any) {
    console.error('Error checking credits:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check credits' },
      { status: 500 }
    )
  }
}

