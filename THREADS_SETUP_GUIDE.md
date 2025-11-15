# Threads Auto-Posting Setup Guide

## Overview
This guide will help you set up automatic posting to Threads from your Post My Note application.

## ✅ Pre-Flight Checklist

### 1. Database Setup
Run these SQL migrations in your Supabase SQL Editor:

#### Migration 1: Threads Connections Table
```sql
-- File: supabase_migration_threads_connections.sql
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.threads_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  threads_user_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_threads_connections_user_id ON public.threads_connections(user_id);

ALTER TABLE public.threads_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own Threads connections" ON public.threads_connections;

CREATE POLICY "Users can manage their own Threads connections"
  ON public.threads_connections
  FOR ALL
  USING (auth.uid() = user_id);
```

#### Migration 2: Threads Post Status Columns
```sql
-- File: supabase_migration_generations_threads.sql
-- Run this in Supabase SQL Editor

ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS threads_post_id TEXT,
ADD COLUMN IF NOT EXISTS threads_posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS threads_post_status TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_generations_threads_status 
ON public.generations(user_id, threads_post_status);
```

**✅ Verification:** Run `SELECT * FROM threads_connections LIMIT 1;` - should return no rows but no error.

---

### 2. Meta Developer Portal Setup

#### Step 1: Create/Configure Your Meta App
1. Go to https://developers.facebook.com/apps
2. Select your app "Post My Note" (or create a new one)
3. Note your **App ID** and **App Secret** (click "Show" button)

#### Step 2: Add Threads Product
1. In left sidebar, find **Products** or **Add Product**
2. Add **Threads API** product
3. Enable permissions:
   - `threads_basic` (read user info)
   - `threads_content_publish` (publish posts)

#### Step 3: Configure OAuth Redirect URI
1. Go to **Facebook Login** → **Settings** (in left sidebar)
2. Find "Valid OAuth Redirect URIs" section
3. Add these URIs (one per line):
   ```
   http://localhost:3000/api/threads/callback
   https://postmynote.app/api/threads/callback
   ```
4. **IMPORTANT:** Set "Enforce HTTPS" to **NO** for localhost testing
5. Click **Save Changes**

#### Step 4: Verify Configuration
- **App Mode:** Development (for testing) or Live (for production)
- **Test Users:** Add test users if in Development mode
- **App Review:** Required for public/production use

**✅ Verification:** The redirect URI validator should show your URIs as valid.

---

### 3. Environment Variables

Add these to your `.env.local` file:

```bash
# Existing variables (keep these)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
PEXELS_API_KEY=your_pexels_key
# ... other existing vars ...

# NEW: Threads API Configuration (use Threads app credentials, NOT Meta/Facebook)
THREADS_APP_ID=1177132647699262
THREADS_APP_SECRET=your_threads_app_secret_here
THREADS_REDIRECT_URI=https://redirectmeto.com/http://localhost:3000/api/threads/callback
```

**Important Notes:**
- Replace `THREADS_APP_SECRET` with your actual secret from Threads App settings
- Use `https://redirectmeto.com/...` for localhost development (or ngrok for HTTPS tunnel)
- For production, update `THREADS_REDIRECT_URI` to your production domain with HTTPS
- **RESTART your dev server** after adding these variables

**✅ Verification:** Run `echo $THREADS_APP_ID` in terminal (after sourcing .env) - should show: 1177132647699262

---

### 4. Test the Complete Flow

#### Step 1: Start Development Server
```bash
npm run dev
```

#### Step 2: Navigate to Post Tab
1. Log into your app
2. Go to **Dashboard**
3. Click **Post** tab in sidebar

#### Step 3: Connect Threads Account
1. Click **"Connect Threads"** button
2. You should be redirected to Meta OAuth login (NOT to /signin)
3. Log in with your Threads/Meta account
4. Authorize the permissions
5. You should be redirected back to the Post page
6. Should see green banner: **"Threads Account Connected"**

**❌ If redirected to /signin instead:**
- Check that `THREADS_APP_ID` is set in `.env.local`
- Restart dev server after adding env vars
- Check browser console for errors

#### Step 4: Test Posting
1. Select a generation from the list (checkbox)
2. Click **"Post Selected to Threads"**
3. Wait for posting to complete
4. Check generation shows **"Posted"** status
5. Verify post appears on Threads

**✅ Verification:** Post appears on your Threads profile with images and caption.

---

## 🔧 Troubleshooting

### Issue: "Connect Threads" redirects to /signin
**Cause:** Auth cookies not being read properly or THREADS_APP_ID not set

**Solutions:**
1. Restart dev server after adding env variables
2. Clear browser cookies for localhost:3000
3. Check `.env.local` has `THREADS_APP_ID`, `THREADS_APP_SECRET`, and `THREADS_REDIRECT_URI`
4. Verify you're logged into the app first (Supabase auth)

### Issue: "Invalid OAuth redirect URI"
**Cause:** Redirect URI not added to Meta app or doesn't match exactly

**Solutions:**
1. Go to Meta Developer Portal → Facebook Login → Settings
2. Add `http://localhost:3000/api/threads/callback` (exact match)
3. Set "Enforce HTTPS" to NO for localhost
4. Click Save Changes
5. Wait a few seconds for changes to propagate

### Issue: "Threads account not connected" when posting
**Cause:** OAuth flow didn't complete or token wasn't stored

**Solutions:**
1. Check Supabase `threads_connections` table has a row for your user
2. Re-run the "Connect Threads" flow
3. Check browser console for errors during OAuth callback
4. Verify database RLS policies allow your user to insert/update

### Issue: Images not uploading to Threads
**Cause:** Facebook Graph API image upload issues or CORS errors

**Solutions:**
1. Check images are accessible (Supabase signed URLs not expired)
2. Verify Threads API permissions include `threads_content_publish`
3. Check API route logs for specific error messages
4. Images must be in supported format (PNG, JPEG)

### Issue: Posts showing "Failed" status
**Cause:** Various API errors (token expired, permissions, rate limit)

**Solutions:**
1. Check server logs for specific error message
2. Reconnect Threads account (token may be expired)
3. Verify all permissions are granted in Meta app
4. Check if hitting rate limits (wait and retry)

---

## 📋 Production Deployment Checklist

Before deploying to production:

- [ ] Database migrations run on production Supabase
- [ ] Production environment variables set (Vercel/hosting platform)
- [ ] Meta app redirect URI includes production domain
- [ ] Meta app moved from Development to Live mode (if needed)
- [ ] Meta app review completed (if posting for external users)
- [ ] Tested OAuth flow on production URL
- [ ] Tested posting from production
- [ ] Error logging/monitoring set up
- [ ] HTTPS enforced on production redirect URI

---

## 🎯 Testing Scenarios

### Test 1: First-Time Connection
1. User with no Threads connection
2. Click "Connect Threads"
3. Complete OAuth
4. Verify connection stored in database
5. Verify green "Connected" banner appears

### Test 2: Post Single Generation
1. User with connected Threads account
2. Select one generation
3. Click "Post Selected to Threads"
4. Verify status changes to "Posting" then "Posted"
5. Verify post appears on Threads

### Test 3: Post Multiple Generations
1. Select 3+ generations
2. Click "Post Selected to Threads"
3. Verify all post sequentially
4. Verify all show "Posted" status

### Test 4: Expired Token
1. Manually set `token_expires_at` to past date in database
2. Try to post
3. Verify error: "Access token expired"
4. Reconnect account
5. Verify posting works again

### Test 5: Disconnected State
1. User without Threads connection
2. Try to post
3. Verify yellow banner: "Threads account not connected"
4. Verify "Connect Threads" button shown
5. Connect and retry posting

---

## 📱 User Flow Summary

```
1. User generates carousel posts in Create tab
   ↓
2. User navigates to Post tab
   ↓
3. [First time] User clicks "Connect Threads"
   ↓
4. User authorizes app via Meta OAuth
   ↓
5. User returns to Post tab (connected)
   ↓
6. User selects post(s) to publish
   ↓
7. User clicks "Post Selected to Threads"
   ↓
8. Posts upload to Threads automatically
   ↓
9. User sees "Posted" status on each
   ↓
10. Posts visible on Threads profile
```

---

## 🔐 Security Notes

- **Access tokens** are stored encrypted in Supabase
- **RLS policies** ensure users can only access their own tokens
- **State parameter** in OAuth prevents CSRF attacks
- **Token expiration** is tracked and checked before posting
- **Service role key** used only on server-side (never exposed to client)

---

## 📞 Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review server logs for specific error messages
3. Verify all checklist items are completed
4. Check Meta Developer Portal for app status/errors
5. Ensure database migrations ran successfully

---

## ✨ Features

- ✅ OAuth 2.0 authentication with Threads/Meta
- ✅ Secure token storage with expiration tracking
- ✅ Single and batch posting
- ✅ Real-time posting status updates
- ✅ Automatic image upload (up to 10 per post)
- ✅ Post history tracking
- ✅ Error handling and retry logic
- ✅ Token expiration detection

---

**Last Updated:** 2025-01-15
**Version:** 1.0.0

