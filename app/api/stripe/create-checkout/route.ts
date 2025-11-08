import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/app/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

export async function POST(request: NextRequest) {
  console.log('[CREATE-CHECKOUT] Starting checkout session creation...')
  
  try {
    // Check environment variables
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('[CREATE-CHECKOUT] ERROR: STRIPE_SECRET_KEY is not set')
      return NextResponse.json(
        { error: 'Stripe configuration error: STRIPE_SECRET_KEY missing' },
        { status: 500 }
      )
    }
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('[CREATE-CHECKOUT] ERROR: SUPABASE_SERVICE_ROLE_KEY is not set')
      return NextResponse.json(
        { error: 'Supabase configuration error: SUPABASE_SERVICE_ROLE_KEY missing' },
        { status: 500 }
      )
    }
    
    console.log('[CREATE-CHECKOUT] Environment variables check passed')

    // Parse request body
    let requestBody
    try {
      requestBody = await request.json()
      console.log('[CREATE-CHECKOUT] Request body parsed:', { priceId: requestBody.priceId, userId: requestBody.userId })
    } catch (error: any) {
      console.error('[CREATE-CHECKOUT] ERROR parsing request body:', error)
      return NextResponse.json(
        { error: 'Invalid request body', details: error.message },
        { status: 400 }
      )
    }

    const { priceId, userId } = requestBody

    if (!priceId || !userId) {
      console.error('[CREATE-CHECKOUT] ERROR: Missing required fields', { priceId: !!priceId, userId: !!userId })
      return NextResponse.json(
        { error: 'Missing priceId or userId' },
        { status: 400 }
      )
    }

    // Get user email from Supabase
    console.log('[CREATE-CHECKOUT] Creating Supabase server client...')
    let serverClient
    try {
      serverClient = createServerClient()
      console.log('[CREATE-CHECKOUT] Supabase server client created successfully')
    } catch (error: any) {
      console.error('[CREATE-CHECKOUT] ERROR creating Supabase server client:', error)
      return NextResponse.json(
        { error: 'Failed to initialize Supabase client', details: error.message },
        { status: 500 }
      )
    }

    console.log('[CREATE-CHECKOUT] Fetching user from Supabase...', { userId })
    let userData, userError
    try {
      const result = await serverClient.auth.admin.getUserById(userId)
      userData = result.data
      userError = result.error
      console.log('[CREATE-CHECKOUT] User fetch result:', { 
        hasUser: !!userData, 
        hasError: !!userError,
        errorCode: userError?.code,
        errorMessage: userError?.message 
      })
    } catch (error: any) {
      console.error('[CREATE-CHECKOUT] ERROR fetching user:', error)
      return NextResponse.json(
        { error: 'Failed to fetch user data', details: error.message },
        { status: 500 }
      )
    }
    
    if (userError || !userData) {
      console.error('[CREATE-CHECKOUT] ERROR: User not found', { 
        error: userError?.message,
        errorCode: userError?.code 
      })
      return NextResponse.json(
        { error: 'User not found', details: userError?.message },
        { status: 404 }
      )
    }

    console.log('[CREATE-CHECKOUT] User found:', { email: userData.user.email })

    // Get or create Stripe customer
    console.log('[CREATE-CHECKOUT] Fetching user credits...')
    let creditData
    try {
      const result = await serverClient
        .from('user_credits')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single()
      creditData = result.data
      console.log('[CREATE-CHECKOUT] Credit data fetched:', { 
        hasCreditData: !!creditData,
        hasCustomerId: !!creditData?.stripe_customer_id,
        error: result.error?.message 
      })
    } catch (error: any) {
      console.error('[CREATE-CHECKOUT] ERROR fetching credit data:', error)
      return NextResponse.json(
        { error: 'Failed to fetch credit data', details: error.message },
        { status: 500 }
      )
    }

    let customerId = creditData?.stripe_customer_id
    console.log('[CREATE-CHECKOUT] Current customer ID:', customerId || 'none')

    // Verify customer exists in current Stripe mode (test/live)
    let customerExists = false
    if (customerId) {
      try {
        console.log('[CREATE-CHECKOUT] Verifying customer exists in Stripe...', { customerId })
        await stripe.customers.retrieve(customerId)
        customerExists = true
        console.log('[CREATE-CHECKOUT] Customer verified in Stripe')
      } catch (error: any) {
        // Customer doesn't exist in current mode (e.g., switching from live to test mode)
        console.log('[CREATE-CHECKOUT] Customer not found in current Stripe mode, will create new:', error.message)
        customerExists = false
      }
    }

    if (!customerId || !customerExists) {
      // Create new Stripe customer
      console.log('[CREATE-CHECKOUT] Creating new Stripe customer...', { email: userData.user.email })
      try {
        const customer = await stripe.customers.create({
          email: userData.user.email,
          metadata: {
            userId: userId,
          },
        })
        customerId = customer.id
        console.log('[CREATE-CHECKOUT] Stripe customer created:', { customerId })

        // Update user_credits with customer ID
        console.log('[CREATE-CHECKOUT] Updating user_credits with customer ID...')
        const updateResult = await serverClient
          .from('user_credits')
          .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
          }, {
            onConflict: 'user_id'
          })
        console.log('[CREATE-CHECKOUT] User credits updated:', { 
          hasError: !!updateResult.error,
          error: updateResult.error?.message 
        })
      } catch (error: any) {
        console.error('[CREATE-CHECKOUT] ERROR creating Stripe customer:', error)
        return NextResponse.json(
          { error: 'Failed to create Stripe customer', details: error.message },
          { status: 500 }
        )
      }
    }

    // Get origin dynamically - try multiple methods
    const getOrigin = () => {
      // Try origin header first
      const origin = request.headers.get('origin')
      if (origin) {
        console.log('[CREATE-CHECKOUT] Using origin header:', origin)
        return origin
      }
      
      // Try host header with protocol
      const host = request.headers.get('host')
      if (host) {
        const protocol = request.headers.get('x-forwarded-proto') || 'https'
        const url = `${protocol}://${host}`
        console.log('[CREATE-CHECKOUT] Using host header:', url)
        return url
      }
      
      // Try to extract from request URL
      try {
        const url = new URL(request.url)
        const fullUrl = `${url.protocol}//${url.host}`
        console.log('[CREATE-CHECKOUT] Using request URL:', fullUrl)
        return fullUrl
      } catch {
        // Fallback to environment variable or default
        if (process.env.NEXT_PUBLIC_APP_URL) {
          console.log('[CREATE-CHECKOUT] Using NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL)
          return process.env.NEXT_PUBLIC_APP_URL
        }
        if (process.env.VERCEL_URL) {
          const url = `https://${process.env.VERCEL_URL}`
          console.log('[CREATE-CHECKOUT] Using VERCEL_URL:', url)
          return url
        }
        console.log('[CREATE-CHECKOUT] Using localhost fallback')
        return 'http://localhost:3000'
      }
    }
    
    const baseUrl = getOrigin()
    console.log('[CREATE-CHECKOUT] Base URL determined:', baseUrl)

    // Create Checkout Session
    console.log('[CREATE-CHECKOUT] Creating Stripe checkout session...', {
      customerId,
      priceId,
      baseUrl
    })
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
      console.log('[CREATE-CHECKOUT] Checkout session created:', { 
        sessionId: session.id,
        hasUrl: !!session.url 
      })
    } catch (error: any) {
      console.error('[CREATE-CHECKOUT] ERROR creating Stripe checkout session:', {
        message: error.message,
        type: error.type,
        code: error.code,
        statusCode: error.statusCode,
        stack: error.stack
      })
      return NextResponse.json(
        { error: 'Failed to create checkout session', details: error.message },
        { status: 500 }
      )
    }

    if (!session.url) {
      console.error('[CREATE-CHECKOUT] ERROR: Session created but no URL returned:', session)
      return NextResponse.json(
        { error: 'Checkout session created but no URL available' },
        { status: 500 }
      )
    }

    console.log('[CREATE-CHECKOUT] Success! Returning checkout URL')
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error: any) {
    console.error('[CREATE-CHECKOUT] UNEXPECTED ERROR:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      type: error.type,
      code: error.code
    })
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session', details: error.toString() },
      { status: 500 }
    )
  }
}

