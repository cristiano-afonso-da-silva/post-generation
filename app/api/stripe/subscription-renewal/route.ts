import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getUserCreditsServerSQL } from '@/app/lib/supabase-mcp'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

export async function GET(request: NextRequest) {
  console.log('[SUBSCRIPTION-RENEWAL] Starting renewal date fetch...')
  
  try {
    // Check for required environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[SUBSCRIPTION-RENEWAL] ERROR: STRIPE_SECRET_KEY is not set')
      return NextResponse.json(
        { error: 'Stripe configuration error: STRIPE_SECRET_KEY missing' },
        { status: 500 }
      )
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[SUBSCRIPTION-RENEWAL] ERROR: SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json(
        { error: 'Supabase configuration error: SUPABASE_SERVICE_ROLE_KEY missing' },
        { status: 500 }
      )
    }

    console.log('[SUBSCRIPTION-RENEWAL] Environment variables check passed')

    const userId = request.nextUrl.searchParams.get('userId')
    console.log('[SUBSCRIPTION-RENEWAL] User ID from query params:', userId)

    if (!userId) {
      console.error('[SUBSCRIPTION-RENEWAL] ERROR: Missing userId')
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Get user credits to find subscription ID
    console.log('[SUBSCRIPTION-RENEWAL] Fetching user credits...', { userId })
    let userCredits
    try {
      userCredits = await getUserCreditsServerSQL(userId)
      console.log('[SUBSCRIPTION-RENEWAL] User credits fetched:', {
        hasCredits: !!userCredits,
        hasSubscriptionId: !!userCredits?.stripe_subscription_id,
        subscriptionId: userCredits?.stripe_subscription_id
      })
    } catch (error: any) {
      console.error('[SUBSCRIPTION-RENEWAL] ERROR fetching user credits:', {
        message: error.message,
        stack: error.stack
      })
      return NextResponse.json(
        { error: 'Failed to fetch user credits', details: error.message },
        { status: 500 }
      )
    }

    if (!userCredits || !userCredits.stripe_subscription_id) {
      console.log('[SUBSCRIPTION-RENEWAL] No subscription found for user')
      return NextResponse.json(
        { renewalDate: null },
        { status: 200 }
      )
    }

    // Fetch subscription from Stripe
    console.log('[SUBSCRIPTION-RENEWAL] Fetching subscription from Stripe...', {
      subscriptionId: userCredits.stripe_subscription_id
    })
    let subscription
    try {
      subscription = await stripe.subscriptions.retrieve(
        userCredits.stripe_subscription_id
      ) as Stripe.Subscription
      console.log('[SUBSCRIPTION-RENEWAL] Subscription fetched:', {
        id: subscription.id,
        status: subscription.status,
        currentPeriodEnd: (subscription as any).current_period_end
      })
    } catch (error: any) {
      // Handle mode mismatch gracefully (test mode key accessing live subscription or vice versa)
      if (error.code === 'resource_missing' && error.message?.includes('similar object exists')) {
        console.warn('[SUBSCRIPTION-RENEWAL] Mode mismatch detected (test/live mode). Returning null renewal date.')
        return NextResponse.json(
          { renewalDate: null },
          { status: 200 }
        )
      }
      
      console.error('[SUBSCRIPTION-RENEWAL] ERROR fetching subscription from Stripe:', {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack
      })
      return NextResponse.json(
        { error: 'Failed to fetch subscription from Stripe', details: error.message },
        { status: 500 }
      )
    }

    // Return current_period_end as renewal date
    const renewalDate = (subscription as any).current_period_end
    console.log('[SUBSCRIPTION-RENEWAL] Success! Returning renewal date:', renewalDate)
    return NextResponse.json({
      renewalDate: renewalDate
    })
  } catch (error: any) {
    console.error('[SUBSCRIPTION-RENEWAL] UNEXPECTED ERROR:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      type: error.type,
      code: error.code
    })
    return NextResponse.json(
      { error: error.message || 'Failed to fetch renewal date', details: error.toString() },
      { status: 500 }
    )
  }
}


