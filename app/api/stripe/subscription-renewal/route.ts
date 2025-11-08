import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getUserCreditsServerSQL } from '@/app/lib/supabase-mcp'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Get user credits to find subscription ID
    const userCredits = await getUserCreditsServerSQL(userId)
    if (!userCredits || !userCredits.stripe_subscription_id) {
      return NextResponse.json(
        { renewalDate: null },
        { status: 200 }
      )
    }

    // Fetch subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(
      userCredits.stripe_subscription_id
    )

    // Return current_period_end as renewal date
    return NextResponse.json({
      renewalDate: subscription.current_period_end
    })
  } catch (error: any) {
    console.error('Error fetching subscription renewal date:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch renewal date' },
      { status: 500 }
    )
  }
}


