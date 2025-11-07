# Local Testing Setup Guide

## Step 1: Get Your Stripe API Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. You'll see two keys:
   - **Publishable key** (starts with `pk_test_...`) → This is your `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
   - **Secret key** (starts with `sk_test_...`) → Click "Reveal test key" to see it → This is your `STRIPE_SECRET_KEY`

## Step 2: Get Your Webhook Secret

The Stripe CLI is already running and forwarding webhooks. Look at the terminal where you ran `stripe listen` - you should see output like:

```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx
```

Copy that `whsec_...` value - this is your `STRIPE_WEBHOOK_SECRET`

## Step 3: Get Your Supabase Service Role Key

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Scroll down to **Project API keys**
5. Find the **service_role** key (starts with `eyJ...`)
6. **⚠️ WARNING:** This key bypasses Row Level Security - keep it secret!
7. Copy this value - this is your `SUPABASE_SERVICE_ROLE_KEY`

## Step 4: Create/Update .env.local

Create or update `.env.local` in your project root with:

```bash
# Stripe Keys (from Step 1)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Stripe Webhook Secret (from Step 2 - the whsec_... value)
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase Service Role Key (from Step 3)
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Your existing Supabase keys (should already be there)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

## Step 5: Start Your Development Server

Make sure:

1. ✅ Stripe CLI webhook listener is running (`stripe listen --forward-to localhost:3000/api/stripe/webhook`)
2. ✅ All environment variables are in `.env.local`
3. ✅ Your Next.js dev server is running (`npm run dev`)

## Step 6: Test the Flow

1. **Sign up** a new user → Should get 1 free credit
2. **Generate a note** → Credit should be deducted
3. **Try to generate again** → Should show upgrade prompt
4. **Click "Upgrade"** → Should open Stripe Checkout
5. **Use test card:** `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/34`)
   - CVC: Any 3 digits (e.g., `123`)
   - ZIP: Any 5 digits (e.g., `12345`)
6. **Complete checkout** → Should redirect back and grant credits
7. **Check header** → Should show updated credit count

## Troubleshooting

### Webhook not working?

- Make sure `stripe listen` is running
- Check that the webhook secret in `.env.local` matches what Stripe CLI shows
- Restart your Next.js server after adding env variables

### Can't see credits?

- Check browser console for errors
- Verify Supabase service role key is correct
- Make sure user_credits table exists in Supabase

### Checkout not working?

- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is set correctly
- Check browser console for errors
- Make sure you're using test mode keys (not live keys)

## Test Cards

Use these Stripe test cards:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **Requires authentication:** `4000 0025 0000 3155`
