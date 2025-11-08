# Vercel CLI Deployment Guide

## Quick Deploy

### First Time Setup (One-time)

1. **Login to Vercel:**

   ```bash
   vercel login
   ```

   This will open your browser to authenticate.

2. **Link your project:**
   ```bash
   vercel link
   ```
   - Choose "Set up and deploy" for a new project
   - Or "Link to existing project" if you already have one

### Deploy Commands

**Deploy to Preview:**

```bash
vercel
```

This creates a preview deployment (great for testing).

**Deploy to Production:**

```bash
vercel --prod
```

This deploys to your production domain.

**Deploy with Environment Variables:**
If you need to set environment variables:

```bash
vercel env add STRIPE_SECRET_KEY production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

**Or use the dashboard:**

- Go to your project on vercel.com
- Settings → Environment Variables
- Add them there (easier for multiple variables)

## Common Commands

- `vercel` - Deploy to preview
- `vercel --prod` - Deploy to production
- `vercel env ls` - List environment variables
- `vercel env pull .env.local` - Pull environment variables to local file
- `vercel logs` - View deployment logs
- `vercel domains add postmynote.app` - Add custom domain

## Workflow

1. **First time:** `vercel login` → `vercel link`
2. **Set environment variables** (via CLI or dashboard)
3. **Deploy:** `vercel --prod`
4. **Add domain:** `vercel domains add postmynote.app` (or via dashboard)
5. **Configure DNS** in GoDaddy
6. **Set up Stripe webhook** with your domain

## Tips

- Preview deployments are great for testing before production
- Environment variables set via CLI are automatically available
- You can deploy multiple times - each gets a unique URL
- Production deployments use your custom domain (once configured)
