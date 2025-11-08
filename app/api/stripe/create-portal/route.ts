import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/app/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Get Stripe customer ID from user_credits
    const serverClient = createServerClient()
    const { data: creditData } = await serverClient
      .from('user_credits')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (!creditData?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 404 }
      )
    }

    // Verify customer exists in current Stripe mode
    try {
      await stripe.customers.retrieve(creditData.stripe_customer_id)
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Customer not found in current Stripe mode. Please subscribe to a plan first.' },
        { status: 404 }
      )
    }

    // Create or get billing portal configuration
    // First, try to list existing configurations
    let configurationId: string | undefined
    try {
      const configurations = await stripe.billingPortal.configurations.list({ limit: 1 })
      if (configurations.data.length > 0) {
        configurationId = configurations.data[0].id
      } else {
        // Create a default configuration if none exists
        const config = await stripe.billingPortal.configurations.create({
          features: {
            customer_update: {
              enabled: true,
              allowed_updates: ['email', 'address', 'phone', 'tax_id'],
            },
            payment_method_update: {
              enabled: true,
            },
            subscription_cancel: {
              enabled: true,
              mode: 'at_period_end',
              cancellation_reason: {
                enabled: true,
                options: [
                  'too_expensive',
                  'missing_features',
                  'switched_service',
                  'too_complex',
                  'low_quality',
                  'other',
                ],
              },
            },
            subscription_pause: {
              enabled: false,
            },
            subscription_update: {
              enabled: true,
              default_allowed_updates: ['price', 'promotion_code', 'quantity'],
              proration_behavior: 'create_prorations',
            },
          },
          business_profile: {
            headline: 'Manage your subscription',
          },
        })
        configurationId = config.id
      }
    } catch (configError: any) {
      console.error('Error managing portal configuration:', configError)
      // Continue without configuration - Stripe will use default if available
    }

    // Create Customer Portal session
    const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: creditData.stripe_customer_id,
      return_url: `${request.headers.get('origin') || 'http://localhost:3000'}/`,
    }

    // Add configuration if we have one
    if (configurationId) {
      sessionParams.configuration = configurationId
    }

    const session = await stripe.billingPortal.sessions.create(sessionParams)

    return NextResponse.json({
      url: session.url,
    })
  } catch (error: any) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}

