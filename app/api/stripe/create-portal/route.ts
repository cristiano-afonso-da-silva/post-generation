import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/app/lib/supabase'
import { getStripePlans } from '@/app/config/stripeConfig'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

export async function POST(request: NextRequest) {
  let requestBody: any = null
  try {
    requestBody = await request.json()
    const { userId } = requestBody

    if (!userId) {
      console.error('[Create Portal API] Missing userId in request:', { requestBody })
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Get Stripe customer ID from user_credits
    console.log('[Create Portal API] Fetching user credits for userId:', userId)
    const serverClient = createServerClient()
    const { data: creditData, error: creditError } = await serverClient
      .from('user_credits')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (creditError) {
      console.error('[Create Portal API] Error fetching user credits:', {
        error: creditError,
        userId,
      })
      return NextResponse.json(
        { error: 'Error fetching user data', details: creditError.message },
        { status: 500 }
      )
    }

    if (!creditData?.stripe_customer_id) {
      console.error('[Create Portal API] No Stripe customer ID found:', {
        userId,
        creditData,
      })
      return NextResponse.json(
        { error: 'No Stripe customer found' },
        { status: 404 }
      )
    }

    console.log('[Create Portal API] Found Stripe customer ID:', creditData.stripe_customer_id)

    // Verify customer exists in current Stripe mode
    try {
      console.log('[Create Portal API] Verifying Stripe customer exists:', creditData.stripe_customer_id)
      await stripe.customers.retrieve(creditData.stripe_customer_id)
      console.log('[Create Portal API] Stripe customer verified successfully')
    } catch (error: any) {
      console.error('[Create Portal API] Stripe customer verification failed:', {
        customerId: creditData.stripe_customer_id,
        error: error?.message,
        type: error?.type,
        code: error?.code,
      })
      return NextResponse.json(
        { error: 'Customer not found in current Stripe mode. Please subscribe to a plan first.' },
        { status: 404 }
      )
    }

    // Create or get billing portal configuration
    // Stripe requires a configuration in live mode
    let configurationId: string | undefined
    try {
      console.log('[Create Portal API] Listing existing portal configurations...')
      const configurations = await stripe.billingPortal.configurations.list({ limit: 10 })
      
      if (configurations.data.length > 0) {
        // Use the first available configuration (prefer active/default)
        configurationId = configurations.data[0].id
        console.log('[Create Portal API] Found existing configuration:', configurationId)
      } else {
        // Create a default configuration if none exists
        console.log('[Create Portal API] No configurations found, creating default...')
        try {
          // Get all product IDs from the current Stripe mode configuration
          const plans = getStripePlans()
          const productIds = Object.values(plans).map(plan => plan.productId).filter(Boolean) as string[]
          
          console.log('[Create Portal API] Product IDs for subscription_update:', productIds)
          
          const configParams: Stripe.BillingPortal.ConfigurationCreateParams = {
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
              subscription_update: {
                enabled: true,
                default_allowed_updates: ['price', 'promotion_code', 'quantity'],
                proration_behavior: 'create_prorations',
              },
            },
            business_profile: {
              headline: 'Manage your subscription',
            },
          }
          
          // Only add products if we have product IDs (required for subscription_update)
          if (productIds.length > 0) {
            configParams.features.subscription_update!.products = productIds.map(productId => ({
              product: productId,
              prices: Object.values(plans)
                .filter(plan => plan.productId === productId)
                .map(plan => plan.priceId),
            }))
            console.log('[Create Portal API] Added products to subscription_update:', configParams.features.subscription_update!.products)
          } else {
            // If no products found, disable subscription_update to avoid the error
            console.warn('[Create Portal API] No product IDs found, disabling subscription_update')
            configParams.features.subscription_update = {
              enabled: false,
            }
          }
          
          const config = await stripe.billingPortal.configurations.create(configParams)
          configurationId = config.id
          console.log('[Create Portal API] Created new portal configuration:', configurationId)
        } catch (createError: any) {
          console.error('[Create Portal API] Failed to create portal configuration:', {
            message: createError?.message,
            type: createError?.type,
            code: createError?.code,
            statusCode: createError?.statusCode,
          })
          
          // If we're in live mode and can't create config, provide helpful error
          const isLiveMode = !process.env.STRIPE_SECRET_KEY?.includes('sk_test')
          if (isLiveMode) {
            return NextResponse.json(
              { 
                error: 'Billing portal configuration is required. Please create a default configuration in your Stripe Dashboard at https://dashboard.stripe.com/settings/billing/portal, or contact support.',
                details: createError?.message,
              },
              { status: 500 }
            )
          }
          
          // In test mode, we can continue without config (Stripe might have a default)
          console.warn('[Create Portal API] Continuing without explicit configuration (test mode)')
        }
      }
    } catch (configError: any) {
      console.error('[Create Portal API] Error managing portal configuration:', {
        message: configError?.message,
        type: configError?.type,
        code: configError?.code,
        statusCode: configError?.statusCode,
      })
      
      // Check if we're in live mode
      const isLiveMode = !process.env.STRIPE_SECRET_KEY?.includes('sk_test')
      if (isLiveMode && !configurationId) {
        return NextResponse.json(
          { 
            error: 'Unable to access billing portal configuration. Please ensure your Stripe account has a default billing portal configuration set up at https://dashboard.stripe.com/settings/billing/portal',
            details: configError?.message,
          },
          { status: 500 }
        )
      }
      
      // In test mode, continue without configuration
      console.warn('[Create Portal API] Continuing without explicit configuration due to error')
    }

    // Get origin dynamically - try multiple methods
    const getOrigin = () => {
      // Try origin header first
      const origin = request.headers.get('origin')
      if (origin) return origin
      
      // Try host header with protocol
      const host = request.headers.get('host')
      if (host) {
        const protocol = request.headers.get('x-forwarded-proto') || 'https'
        return `${protocol}://${host}`
      }
      
      // Try to extract from request URL
      try {
        const url = new URL(request.url)
        return `${url.protocol}//${url.host}`
      } catch {
        // Fallback to environment variable or default
        if (process.env.NEXT_PUBLIC_APP_URL) {
          return process.env.NEXT_PUBLIC_APP_URL
        }
        if (process.env.VERCEL_URL) {
          return `https://${process.env.VERCEL_URL}`
        }
        return 'http://localhost:3000'
      }
    }
    
    const baseUrl = getOrigin()
    console.log('[Create Portal API] Base URL determined:', baseUrl)

    // Create Customer Portal session
    const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: creditData.stripe_customer_id,
      return_url: `${baseUrl}/`,
    }

    // Add configuration if we have one
    if (configurationId) {
      sessionParams.configuration = configurationId
      console.log('[Create Portal API] Using portal configuration:', configurationId)
    } else {
      // Check if we're in live mode - configuration is required
      const isLiveMode = !process.env.STRIPE_SECRET_KEY?.includes('sk_test')
      if (isLiveMode) {
        console.error('[Create Portal API] No configuration available in live mode')
        return NextResponse.json(
          { 
            error: 'Billing portal configuration is required in live mode. Please create a default configuration in your Stripe Dashboard at https://dashboard.stripe.com/settings/billing/portal and save your settings.',
          },
          { status: 500 }
        )
      }
      console.log('[Create Portal API] No portal configuration, using default (test mode)')
    }

    console.log('[Create Portal API] Creating portal session with params:', {
      customer: sessionParams.customer,
      return_url: sessionParams.return_url,
      configuration: sessionParams.configuration,
    })

    let session
    try {
      session = await stripe.billingPortal.sessions.create(sessionParams)
    } catch (sessionError: any) {
      console.error('[Create Portal API] Failed to create portal session:', {
        message: sessionError?.message,
        type: sessionError?.type,
        code: sessionError?.code,
        statusCode: sessionError?.statusCode,
        params: sessionParams,
      })
      
      // Check if it's a configuration error
      if (sessionError?.message?.includes('configuration')) {
        const isLiveMode = !process.env.STRIPE_SECRET_KEY?.includes('sk_test')
        return NextResponse.json(
          { 
            error: 'Billing portal configuration is required. Please create a default configuration in your Stripe Dashboard at https://dashboard.stripe.com/settings/billing/portal and save your settings.',
            details: sessionError?.message,
          },
          { status: 500 }
        )
      }
      
      throw sessionError
    }

    console.log('[Create Portal API] Portal session created successfully:', {
      sessionId: session.id,
      url: session.url,
    })

    return NextResponse.json({
      url: session.url,
    })
  } catch (error: any) {
    console.error('[Create Portal API] Detailed Error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      type: error?.type,
      code: error?.code,
      statusCode: error?.statusCode,
      rawError: error,
      requestBody: requestBody,
      url: request.url,
      method: request.method,
    })
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to create portal session',
        details: process.env.NODE_ENV === 'development' ? {
          type: error?.type,
          code: error?.code,
          statusCode: error?.statusCode,
        } : undefined,
      },
      { status: 500 }
    )
  }
}

