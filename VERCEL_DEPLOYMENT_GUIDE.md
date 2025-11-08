# Vercel Deployment Guide for PostMyNote

This guide will help you deploy your app to Vercel and connect your GoDaddy domain `postmynote.app`.

## Step 1: Deploy to Vercel

### 1.1 Prepare Your Code

1. Make sure all your changes are committed:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

### 1.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click **"Add New Project"**
3. Import your GitHub repository (or connect your Git provider)
4. Vercel will auto-detect Next.js settings
5. **Important**: Add your environment variables before deploying:

   - Click **"Environment Variables"** section
   - Add all these variables (use your production values):

   ```
   STRIPE_SECRET_KEY=sk_live_... (or sk_test_... for testing)
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (or pk_test_... for testing)
   STRIPE_WEBHOOK_SECRET=whsec_... (we'll get this after domain setup)
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

6. Click **"Deploy"**
7. Wait for deployment to complete (usually 2-3 minutes)

### 1.3 Get Your Vercel URL

- After deployment, you'll get a URL like: `your-project.vercel.app`
- This is your temporary Vercel URL

## Step 2: Connect Your GoDaddy Domain to Vercel

### 2.1 Add Domain in Vercel

1. In your Vercel project dashboard, go to **Settings** → **Domains**
2. Enter your domain: `postmynote.app`
3. Also add `www.postmynote.app` (optional but recommended)
4. Click **"Add"**

### 2.2 Configure DNS in GoDaddy

Vercel will show you DNS records to add. You need to add these in GoDaddy:

1. **Go to GoDaddy**

   - Log in to [godaddy.com](https://godaddy.com)
   - Go to **My Products** → **Domains** → **postmynote.app**
   - Click **"DNS"** or **"Manage DNS"**

2. **Add DNS Records** (Vercel will show you the exact values):

   - **Type A Record** (for root domain):

     - Name: `@` (or leave blank)
     - Value: `76.76.21.21` (Vercel's IP - check Vercel dashboard for exact value)
     - TTL: 600 (or default)

   - **Type CNAME Record** (for www subdomain):
     - Name: `www`
     - Value: `cname.vercel-dns.com` (or what Vercel shows)
     - TTL: 600 (or default)

3. **Alternative: Use Nameservers** (Easier method):

   - In GoDaddy DNS settings, change nameservers to:
     - `ns1.vercel-dns.com`
     - `ns2.vercel-dns.com`
   - (Vercel will show you the exact nameservers)

4. **Save** the DNS changes

### 2.3 Wait for DNS Propagation

- DNS changes can take 24-48 hours, but usually work within 1-2 hours
- Vercel will show "Valid Configuration" when it's ready
- You can check status at: [whatsmydns.net](https://www.whatsmydns.net)

## Step 3: Set Up Stripe Webhook (After Domain is Live)

### 3.1 Wait for Domain to be Active

- Make sure `postmynote.app` is accessible in your browser
- Vercel dashboard should show domain as "Valid Configuration"

### 3.2 Create Stripe Webhook Endpoint

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Make sure you're in **Live mode** (top right toggle)
3. Click **"+ Add destination"** or **"Add endpoint"**
4. Configure:
   - **Endpoint URL**: `https://postmynote.app/api/stripe/webhook`
   - **Events to listen to**:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - **API Version**: `2025-10-29.clover` (latest)
5. Click **"Add endpoint"** or **"Save"**

### 3.3 Get Webhook Secret

1. Click on the webhook endpoint you just created
2. Click **"Reveal"** next to "Signing secret"
3. Copy the `whsec_...` value

### 3.4 Add Webhook Secret to Vercel

1. Go to your Vercel project → **Settings** → **Environment Variables**
2. Add or update:
   - **Name**: `STRIPE_WEBHOOK_SECRET`
   - **Value**: `whsec_...` (the secret you just copied)
   - **Environment**: Select **Production** (and Preview if you want)
3. Click **"Save"**
4. **Redeploy** your application:
   - Go to **Deployments** tab
   - Click the three dots (⋯) on latest deployment
   - Click **"Redeploy"**

## Step 4: Verify Everything Works

### 4.1 Test Your Domain

- Visit `https://postmynote.app` - should show your app
- Visit `https://www.postmynote.app` - should also work (if you set it up)

### 4.2 Test Stripe Webhook

1. In Stripe Dashboard → Webhooks → Your endpoint
2. Click **"Send test webhook"**
3. Select event: `checkout.session.completed`
4. Click **"Send test webhook"**
5. Check **"Recent deliveries"** - should show success ✅

### 4.3 Check Application Logs

- In Vercel dashboard → **Deployments** → Click on deployment → **Functions** tab
- Look for webhook processing logs
- Should see successful webhook processing

## Step 5: Update Environment Variables (If Needed)

Make sure all these are set in Vercel:

### Required Variables:

```
STRIPE_SECRET_KEY=sk_live_... (for production) or sk_test_... (for testing)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (for production) or pk_test_... (for testing)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Dashboard)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### To Add/Update in Vercel:

1. Go to **Settings** → **Environment Variables**
2. Add each variable
3. Select **Production** environment
4. Click **"Save"**
5. **Redeploy** after adding new variables

## Troubleshooting

### Domain Not Working

- Wait 24-48 hours for DNS propagation
- Check DNS records in GoDaddy match Vercel's requirements
- Verify domain is added in Vercel dashboard
- Check SSL certificate status in Vercel (should auto-generate)

### Webhook Not Receiving Events

- Verify `STRIPE_WEBHOOK_SECRET` is set in Vercel environment variables
- Check webhook URL in Stripe: `https://postmynote.app/api/stripe/webhook`
- Make sure you're testing in the correct mode (Live vs Test)
- Check Vercel function logs for errors

### 404 on Webhook Endpoint

- Verify the route exists: `/app/api/stripe/webhook/route.ts`
- Check deployment logs in Vercel
- Make sure you redeployed after adding environment variables

## Summary Checklist

- [ ] Deployed app to Vercel
- [ ] Added all environment variables to Vercel
- [ ] Connected `postmynote.app` domain in Vercel
- [ ] Configured DNS in GoDaddy (A record or nameservers)
- [ ] Waited for DNS propagation (up to 48 hours)
- [ ] Verified domain is accessible at `https://postmynote.app`
- [ ] Created Stripe webhook endpoint with URL: `https://postmynote.app/api/stripe/webhook`
- [ ] Selected all 5 required events
- [ ] Copied webhook secret from Stripe Dashboard
- [ ] Added `STRIPE_WEBHOOK_SECRET` to Vercel environment variables
- [ ] Redeployed application in Vercel
- [ ] Tested webhook with test event in Stripe Dashboard
- [ ] Verified webhook is working in Vercel logs

## Next Steps

Once everything is set up:

1. Test a real subscription flow
2. Monitor webhook deliveries in Stripe Dashboard
3. Check Vercel logs regularly for any issues
4. Set up monitoring/alerts if needed

## Need Help?

- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- GoDaddy DNS Help: [godaddy.com/help](https://www.godaddy.com/help)
- Stripe Webhooks: [stripe.com/docs/webhooks](https://stripe.com/docs/webhooks)
