import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@/app/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-10-29.clover',
})

export async function POST(request: NextRequest) {
  try {
    const { priceId, userId } = await request.json()

    if (!priceId || !userId) {
      return NextResponse.json(
        { error: 'Missing priceId or userId' },
        { status: 400 }
      )
    }

    // Get user email from Supabase
    const serverClient = createServerClient()
    const { data: userData, error: userError } = await serverClient.auth.admin.getUserById(userId)
    
    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get or create Stripe customer
    const { data: creditData } = await serverClient
      .from('user_credits')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

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

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${request.headers.get('origin') || 'http://localhost:3000'}/?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin') || 'http://localhost:3000'}/?canceled=true`,
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
    })

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

