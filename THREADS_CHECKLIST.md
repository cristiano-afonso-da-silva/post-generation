# Threads Integration Setup Checklist

## ✅ Before You Test

### 1. Environment Variables (.env.local)
Make sure you have these three variables set:

```env
THREADS_APP_ID=1177132647699262
THREADS_APP_SECRET=your_threads_app_secret_here
THREADS_REDIRECT_URI=https://redirectmeto.com/http://localhost:3000/api/threads/callback
```

**IMPORTANT: Use your THREADS app credentials, NOT Meta/Facebook app!**

**Where to get these:**
- Go to https://developers.facebook.com/apps/
- Look for your **Threads app** (Post My Note - ID: 1177132647699262)
- Get `THREADS_APP_ID` from the Threads app dashboard
- Get `THREADS_APP_SECRET` from Settings > Basic > App Secret (click "Show")
- These are DIFFERENT from your Meta/Facebook app credentials!

---

### 2. Meta Developer Console Setup

#### A. Add Redirect URI
1. Go to your Meta App Dashboard
2. Navigate to **Use cases** > **Customize** > **Settings** (under "Threads Use Case")
3. Find **Valid OAuth Redirect URIs**
4. Add: `http://localhost:3000/api/threads/callback`
5. Save changes

#### B. Configure Threads API
1. Make sure "Threads Use Case" is added to your app
2. Permissions needed: `threads_basic`, `threads_content_publish`

#### C. Add Test Users (Important!)
1. Go to **App Roles** in left sidebar
2. Add your Threads/Instagram account as:
   - **Admin**, **Developer**, or **Tester**
3. Only these accounts can connect during development!

---

### 3. Database Migrations
Run these SQL scripts in your Supabase SQL Editor:

```bash
# 1. Create threads_connections table
# Run: supabase_migration_threads_connections.sql

# 2. Add threads columns to generations table  
# Run: supabase_migration_generations_threads.sql
```

---

### 4. Restart Your Dev Server
```bash
npm run dev
```

---

## 🧪 Testing Flow

### Step 1: Navigate to Post Tab
1. Open `http://localhost:3000/dashboard`
2. Click the **"Post"** tab in the sidebar (Send icon)

### Step 2: Connect Threads
1. Click **"Connect Threads"** button
2. You should be redirected to `https://www.facebook.com/v18.0/dialog/oauth` (Facebook OAuth for Threads)
3. Log in with your Facebook/Instagram account (must be Admin/Developer/Tester)
4. Authorize the app to access Threads
5. You'll be redirected back to `/dashboard?view=post&success=threads_connected`

### Step 3: Post to Threads
1. Select one or more generated posts with checkboxes
2. Click **"Post Selected to Threads"**
3. Wait for the status to change to "Posted"
4. Check your Threads profile - the post should appear!

---

## 🐛 Troubleshooting

### "Redirect URI is not valid"
- Make sure the redirect URI in .env.local **exactly matches** what's in Meta Developer Console
- Use `http://localhost:3000/api/threads/callback` (not https, not 127.0.0.1)

### "User not authorized"
- Add your account as Admin/Developer/Tester in App Roles

### Still redirecting to /signin
- Make sure you're logged into the app first (Supabase auth)
- Check browser console for errors
- Check terminal logs for API route errors

### Token exchange failed
- Verify `THREADS_APP_SECRET` is correct
- Check Threads App is in "Development" or "Live" mode

---

## 📝 What Changed

The key fixes:

1. `/api/threads/auth` - **Directly redirects** to Facebook OAuth (no auth check blocking)
2. `/api/threads/callback` - Uses **correct API flow**:
   - Exchange code via Facebook Graph API
   - Get Threads user ID via Threads Graph API
   - Exchange for long-lived token (60 days)
   - Store in Supabase after OAuth succeeds
3. **Important**: Threads uses **Facebook OAuth** (`facebook.com/dialog/oauth`) but **Threads Graph API** (`graph.threads.net`) for data

---

## 🎯 Quick Start Command

```bash
# 1. Set environment variables
# 2. Run migrations
# 3. Add yourself as tester in Meta console
# 4. Start server
npm run dev

# 5. Test the flow:
# http://localhost:3000/dashboard?view=post
```

---

Good luck! 🚀

