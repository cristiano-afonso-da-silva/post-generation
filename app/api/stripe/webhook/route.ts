import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient, updateUserSubscription, addCredits, getUserCreditsByStripeCustomerId } from '@/app/lib/supabase'
import { getPlanByPriceId } from '@/app/config/stripeConfig'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message)
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    )
  }

  const serverClient = createServerClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.mode === 'subscription') {
          const userId = session.client_reference_id || session.metadata?.userId
          const customerId = session.customer as string
          const subscriptionId = session.subscription as string

          if (!userId) {
            console.error('No userId in checkout session')
            break
          }

          // Get subscription details to find the plan
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          const priceId = subscription.items.data[0]?.price.id
          
          if (!priceId) {
            console.error('No price ID in subscription')
            break
          }

          const plan = getPlanByPriceId(priceId)
          if (!plan) {
            console.error('Plan not found for price ID:', priceId)
            break
          }

          // Update user credits with subscription info and grant credits
          await updateUserSubscription(userId, {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_status: 'active',
            current_plan: plan.id as any,
            credits_remaining: plan.credits, // Grant monthly credits
          })

          console.log(`Subscription created for user ${userId}, granted ${plan.credits} credits`)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID
        const userCredits = await getUserCreditsByStripeCustomerId(customerId)
        if (!userCredits) {
          console.error('User not found for customer ID:', customerId)
          break
        }

        const priceId = subscription.items.data[0]?.price.id
        if (!priceId) {
          console.error('No price ID in subscription')
          break
        }

        const plan = getPlanByPriceId(priceId)
        if (!plan) {
          console.error('Plan not found for price ID:', priceId)
          break
        }

        // Update subscription status and plan
        await updateUserSubscription(userCredits.user_id, {
          stripe_subscription_id: subscription.id,
          subscription_status: subscription.status === 'active' ? 'active' : 
                               subscription.status === 'past_due' ? 'past_due' : 'canceled',
          current_plan: plan.id as any,
        })

        console.log(`Subscription updated for user ${userCredits.user_id}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID
        const userCredits = await getUserCreditsByStripeCustomerId(customerId)
        if (!userCredits) {
          console.error('User not found for customer ID:', customerId)
          break
        }

        // Cancel subscription
        await updateUserSubscription(userCredits.user_id, {
          subscription_status: 'canceled',
          current_plan: null,
        })

        console.log(`Subscription canceled for user ${userCredits.user_id}`)
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const subscriptionId = invoice.subscription as string

        if (!subscriptionId) {
          break
        }

        // Find user by Stripe customer ID
        const userCredits = await getUserCreditsByStripeCustomerId(customerId)
        if (!userCredits) {
          console.error('User not found for customer ID:', customerId)
          break
        }

        // Get subscription to find the plan
        const subscription = await stripe.subscriptions.retrieve(subscriptionId as string)
        const priceId = subscription.items.data[0]?.price.id
        
        if (!priceId) {
          console.error('No price ID in subscription')
          break
        }

        const plan = getPlanByPriceId(priceId)
        if (!plan) {
          console.error('Plan not found for price ID:', priceId)
          break
        }

        // Grant monthly credits (this happens on successful payment each month)
        await addCredits(userCredits.user_id, plan.credits)

        console.log(`Monthly credits granted: ${plan.credits} credits for user ${userCredits.user_id}`)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Find user by Stripe customer ID
        const userCredits = await getUserCreditsByStripeCustomerId(customerId)
        if (!userCredits) {
          console.error('User not found for customer ID:', customerId)
          break
        }

        // Mark subscription as past_due
        await updateUserSubscription(userCredits.user_id, {
          subscription_status: 'past_due',
        })

        console.log(`Payment failed for user ${userCredits.user_id}`)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

