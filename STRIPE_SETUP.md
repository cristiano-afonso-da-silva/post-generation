# Stripe Integration Setup Guide

## Environment Variables Required

Add these to your `.env.local` file:

```bash
# Stripe Keys (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase Service Role Key (for webhooks - get from Supabase Dashboard > Settings > API)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

## Stripe Products Created

The following products and prices have been created in your Stripe account:

1. **Basic Plan** - $10/month

   - Product ID: `prod_TNW6s5tgNWdads`
   - Price ID: `price_1SQl4rHK7zocq1deIIFdiAHb`
   - Credits: 10 per month

2. **Pro Plan** - $20/month

   - Product ID: `prod_TNW6g9hABzsSRb`
   - Price ID: `price_1SQl4tHK7zocq1deDUeN8h4c`
   - Credits: 20 per month

3. **Business Plan** - $50/month

   - Product ID: `prod_TNW6K7MnAsF78B`
   - Price ID: `price_1SQl4uHK7zocq1decjSxbUMB`
   - Credits: 50 per month

4. **Enterprise Plan** - $100/month
   - Product ID: `prod_TNW6m6NXaBCtCj`
   - Price ID: `price_1SQl4vHK7zocq1de36HgckbG`
   - Credits: 100 per month

## Webhook Setup

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/stripe/webhook`
   - For local development, use [Stripe CLI](https://stripe.com/docs/stripe-cli) to forward webhooks:
     ```bash
     stripe listen --forward-to localhost:3000/api/stripe/webhook
     ```
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`

## Database Setup

The `user_credits` table has been created in Supabase with:

- Automatic credit record creation for new users (1 free credit)
- Row Level Security (RLS) policies
- Automatic timestamp updates

## Testing

1. **Test Free User Flow:**

   - Sign up a new user
   - User should have 1 credit
   - Generate 1 carousel (credit deducted)
   - Try to generate again → should show upgrade prompt

2. **Test Subscription Flow:**

   - Click "Upgrade" button
   - Select a plan
   - Complete Stripe Checkout (use test card: `4242 4242 4242 4242`)
   - User should receive monthly credits
   - Credits should refresh in header

3. **Test Webhook:**
   - Use Stripe CLI to forward webhooks locally
   - Or use Stripe Dashboard to send test events
   - Verify credits are granted correctly

## Features Implemented

✅ Credit-based system (1 free credit for new users)
✅ 4 subscription tiers ($10, $20, $50, $100/month)
✅ Stripe Checkout integration
✅ Stripe Customer Portal for subscription management
✅ Webhook handling for subscription events
✅ Credit display in header
✅ Upgrade prompt when credits run out
✅ Automatic credit deduction on carousel generation
✅ Monthly credit renewal via webhooks

## Important Notes

- Credits do NOT roll over to the next month
- Users start with 1 free credit
- Subscription grants credits immediately on signup
- Monthly credits are granted when invoice payment succeeds
- Subscription status is tracked (active, canceled, past_due)
