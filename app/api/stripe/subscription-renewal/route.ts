import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getUserCreditsServerSQL } from '@/app/lib/supabase-mcp'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function GET(request: NextRequest) {
  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY is not set')
      return NextResponse.json(
        { error: 'Stripe configuration error' },
        { status: 500 }
      )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json(
        { error: 'Supabase configuration error' },
        { status: 500 }
      )
    }

    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Get user credits to find subscription ID
    let userCredits
    try {
      userCredits = await getUserCreditsServerSQL(userId)
    } catch (error: any) {
      console.error('Error fetching user credits:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user credits', details: error.message },
        { status: 500 }
      )
    }

    if (!userCredits || !userCredits.stripe_subscription_id) {
      return NextResponse.json(
        { renewalDate: null },
        { status: 200 }
      )
    }

    // Fetch subscription from Stripe
    let subscription
    try {
      subscription = await stripe.subscriptions.retrieve(
        userCredits.stripe_subscription_id
      ) as Stripe.Subscription
    } catch (error: any) {
      console.error('Error fetching subscription from Stripe:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscription from Stripe', details: error.message },
        { status: 500 }
      )
    }

    // Return current_period_end as renewal date
    return NextResponse.json({
      renewalDate: (subscription as any).current_period_end
    })
  } catch (error: any) {
    console.error('Error fetching subscription renewal date:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch renewal date' },
      { status: 500 }
    )
  }
}


