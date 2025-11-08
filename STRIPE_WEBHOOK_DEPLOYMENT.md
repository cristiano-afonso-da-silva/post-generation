# Stripe Webhook Deployment Guide

This guide will help you deploy your Stripe webhook from local development to production.

## Prerequisites

- Your production app is deployed and accessible via a public URL (e.g., `https://yourdomain.com`)
- You have access to your Stripe Dashboard
- You have access to your production environment variables (Vercel, Netlify, etc.)

## Step 1: Create Webhook Endpoint in Stripe Dashboard

1. **Go to Stripe Dashboard**

   - Navigate to [https://dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
   - Make sure you're in **Live mode** (toggle in the top right)

2. **Add New Endpoint**

   - Click **"Add endpoint"** button
   - Enter your production webhook URL:
     ```
     https://yourdomain.com/api/stripe/webhook
     ```
     Replace `yourdomain.com` with your actual production domain

3. **Select Events to Listen For**
   Your webhook needs to listen for these events:

   - ✅ `checkout.session.completed`
   - ✅ `customer.subscription.updated`
   - ✅ `customer.subscription.deleted`
   - ✅ `invoice.payment_succeeded`
   - ✅ `invoice.payment_failed`

4. **Save the Endpoint**
   - Click **"Add endpoint"** to create it

## Step 2: Get Your Production Webhook Secret

1. **After creating the endpoint**, you'll see it in your webhooks list
2. **Click on the endpoint** you just created
3. **Click "Reveal"** next to "Signing secret"
4. **Copy the webhook secret** - it will look like: `whsec_xxxxxxxxxxxxx`

⚠️ **Important**: This is different from your local CLI webhook secret. Each webhook endpoint has its own unique secret.

## Step 3: Set Environment Variable in Production

Add the production webhook secret to your production environment variables:

### For Vercel:

1. Go to your project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add or update:
   - **Name**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: `whsec_xxxxxxxxxxxxx` (the secret from Step 2)
   - **Environment**: Select **Production** (and optionally Preview/Development if needed)
4. Click **Save**
5. **Redeploy** your application for the changes to take effect

### For Netlify:

1. Go to your site dashboard
2. Navigate to **Site configuration** → **Environment variables**
3. Add or update:
   - **Key**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: `whsec_xxxxxxxxxxxxx`
   - **Scopes**: Select **Production**
4. Click **Save**
5. **Redeploy** your application

### For Other Platforms:

- Add `STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx` to your production environment variables
- Restart/redeploy your application

## Step 4: Verify Your Webhook is Working

1. **Test the Endpoint**

   - In Stripe Dashboard, go to your webhook endpoint
   - Click **"Send test webhook"**
   - Select an event type (e.g., `checkout.session.completed`)
   - Click **"Send test webhook"**
   - Check the **"Recent deliveries"** section to see if it succeeded

2. **Check Your Logs**

   - Check your production application logs
   - You should see webhook events being processed
   - Look for any errors in webhook processing

3. **Test with Real Transaction** (Optional)
   - Make a test purchase in production (if using test mode)
   - Or wait for a real customer transaction
   - Verify that credits are being granted correctly

## Step 5: Keep Local Development Separate

For local development, continue using:

- Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- Local webhook secret in `.env.local` (from CLI output)

Your production webhook secret should **only** be in your production environment variables, not in `.env.local`.

## Troubleshooting

### Webhook Signature Verification Failed

- **Cause**: Wrong webhook secret or secret not set
- **Fix**: Double-check that `STRIPE_WEBHOOK_SECRET` in production matches the secret from Stripe Dashboard

### 404 Not Found

- **Cause**: Webhook URL is incorrect or route doesn't exist
- **Fix**: Verify your production URL is correct and the route `/api/stripe/webhook` exists

### Webhook Not Receiving Events

- **Cause**: Wrong events selected or endpoint not active
- **Fix**: Check that all required events are selected in Stripe Dashboard

### Test Mode vs Live Mode

- **Important**: Make sure you're using the correct mode:
  - **Test mode webhook secret** for test mode (`sk_test_...`)
  - **Live mode webhook secret** for live mode (`sk_live_...`)
- You can have separate webhook endpoints for test and live modes

## Security Best Practices

1. ✅ **Never commit webhook secrets to git**
2. ✅ **Use different secrets for test and production**
3. ✅ **Keep local and production secrets separate**
4. ✅ **Regularly rotate webhook secrets if compromised**
5. ✅ **Monitor webhook delivery logs in Stripe Dashboard**

## Summary Checklist

- [ ] Created webhook endpoint in Stripe Dashboard (Live mode)
- [ ] Set endpoint URL to `https://yourdomain.com/api/stripe/webhook`
- [ ] Selected all required events
- [ ] Copied production webhook secret from Stripe Dashboard
- [ ] Added `STRIPE_WEBHOOK_SECRET` to production environment variables
- [ ] Redeployed application
- [ ] Tested webhook with test event
- [ ] Verified webhook is receiving and processing events correctly

## Need Help?

- Check Stripe webhook logs in Dashboard → Webhooks → Your endpoint → Recent deliveries
- Check your application logs for webhook processing errors
- Verify all environment variables are set correctly
- Ensure your production URL is publicly accessible
