import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/app/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

export async function POST(request: NextRequest) {
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

    const { priceId, userId } = await request.json()

    if (!priceId || !userId) {
      return NextResponse.json(
        { error: 'Missing priceId or userId' },
        { status: 400 }
      )
    }

    // Get user email from Supabase
    let serverClient
    try {
      serverClient = createServerClient()
    } catch (error: any) {
      console.error('Error creating Supabase server client:', error)
      return NextResponse.json(
        { error: 'Failed to initialize Supabase client' },
        { status: 500 }
      )
    }

    let userData, userError
    try {
      const result = await serverClient.auth.admin.getUserById(userId)
      userData = result.data
      userError = result.error
    } catch (error: any) {
      console.error('Error fetching user from Supabase:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user data', details: error.message },
        { status: 500 }
      )
    }
    
    if (userError || !userData) {
      console.error('User not found:', userError)
      return NextResponse.json(
        { error: 'User not found', details: userError?.message },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    let creditData
    try {
      const result = await serverClient
        .from('user_credits')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single()
      creditData = result.data
      if (result.error && result.error.code !== 'PGRST116') {
        console.error('Error fetching credit data:', result.error)
      }
    } catch (error: any) {
      console.error('Error querying user_credits:', error)
      return NextResponse.json(
        { error: 'Failed to fetch credit data', details: error.message },
        { status: 500 }
      )
    }

    let customerId = creditData?.stripe_customer_id

    // Verify customer exists in current Stripe mode (test/live)
    let customerExists = false
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId)
        customerExists = true
      } catch (error: any) {
        // Customer doesn't exist in current mode (e.g., switching from live to test mode)
        console.log(`Customer ${customerId} not found in current Stripe mode, creating new customer`)
        customerExists = false
      }
    }

    if (!customerId || !customerExists) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: {
          userId: userId,
        },
      })
      customerId = customer.id

      // Update user_credits with customer ID
      await serverClient
        .from('user_credits')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
        }, {
          onConflict: 'user_id'
        })
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

    // Create Checkout Session
    let session
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/?canceled=true`,
        client_reference_id: userId,
        metadata: {
          userId: userId,
        },
      })
    } catch (error: any) {
      console.error('Error creating Stripe checkout session:', error)
      return NextResponse.json(
        { error: 'Failed to create checkout session', details: error.message },
        { status: 500 }
      )
    }

    if (!session.url) {
      console.error('Stripe session created but no URL returned:', session)
      return NextResponse.json(
        { error: 'Checkout session created but no URL available' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

