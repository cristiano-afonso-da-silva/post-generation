# ✅ Final Setup Instructions for Threads Integration

## 🎯 Quick Start (3 Steps)

### Step 1: Update `.env.local`

Add these three variables (use your **Threads app** credentials):

```env
THREADS_APP_ID=1177132647699262
THREADS_APP_SECRET=your_threads_app_secret_here
THREADS_REDIRECT_URI=https://redirectmeto.com/http://localhost:3000/api/threads/callback
```

**Where to get `THREADS_APP_SECRET`:**
1. Go to https://developers.facebook.com/apps/1177132647699262
2. Click **Settings → Basic**
3. Find **App Secret** → Click **Show**
4. Copy and paste into `.env.local`

---

### Step 2: Configure Threads App in Meta Console

1. Go to https://developers.facebook.com/apps/1177132647699262
2. Navigate to **Use Cases → Threads → Settings**
3. In **Valid OAuth Redirect URIs**, add:
   ```
   https://redirectmeto.com/http://localhost:3000/api/threads/callback
   ```
4. Click **Save Changes**

5. Go to **App Review → Permissions and Features**
6. Find and enable:
   - `threads_basic` → **Get Advanced Access**
   - `threads_content_publish` → **Get Advanced Access**

7. Go to **App Roles → Roles**
8. Add your Facebook/Threads account as **Admin**, **Developer**, or **Tester**

---

### Step 3: Run Database Migrations

In your Supabase SQL Editor, run these two files:

**File 1: `supabase_migration_threads_connections.sql`**
```sql
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

CREATE POLICY "Users can manage their own Threads connections"
  ON public.threads_connections
  FOR ALL
  USING (auth.uid() = user_id);
```

**File 2: `supabase_migration_generations_threads.sql`**
```sql
ALTER TABLE public.generations
ADD COLUMN IF NOT EXISTS threads_post_id TEXT,
ADD COLUMN IF NOT EXISTS threads_posted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS threads_post_status TEXT DEFAULT 'idle';
```

---

## 🧪 Test the Flow

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Open the Post tab:**
   ```
   http://localhost:3000/dashboard?view=post
   ```

3. **Connect Threads:**
   - Click **"Connect Threads"** button
   - Should redirect to Facebook OAuth
   - Log in with your Facebook account (must be Admin/Developer/Tester)
   - Authorize Threads permissions
   - Redirect back to dashboard with success message

4. **Post to Threads:**
   - Select a generated post (checkbox)
   - Click **"Post Selected to Threads"**
   - Wait for status to change to "Posted"
   - Check your Threads profile!

---

## ⚠️ Important Notes

### Use THREADS App Credentials (NOT Meta/Facebook App)

Your screenshot shows:
- **Threads app ID:** `1177132647699262`
- **Threads app secret:** (hidden, get from app settings)

These are **different** from any Meta/Facebook app you might have. Always use the Threads app credentials.

### Why RedirectMeTo?

Facebook requires HTTPS for OAuth redirect URIs. Since `http://localhost:3000` is HTTP, we use `https://redirectmeto.com/...` as a proxy:

1. Facebook redirects to `https://redirectmeto.com/...` (HTTPS ✅)
2. RedirectMeTo bounces to `http://localhost:3000/api/threads/callback`
3. Your local app receives the OAuth code

**For production:** Replace with your actual HTTPS domain:
```env
THREADS_REDIRECT_URI=https://postmynote.app/api/threads/callback
```

---

## ✅ Verification Checklist

- [ ] `.env.local` has `THREADS_APP_ID`, `THREADS_APP_SECRET`, `THREADS_REDIRECT_URI`
- [ ] Redirect URI added to Threads app settings in Meta console
- [ ] Both permissions (`threads_basic`, `threads_content_publish`) have **Advanced Access**
- [ ] Your account is added as Admin/Developer/Tester
- [ ] Database migrations executed successfully
- [ ] Dev server restarted after adding env variables
- [ ] You're logged into your app (Supabase auth)

---

## 🐛 Common Issues

### "Invalid Scopes" error
→ Enable **Advanced Access** for both permissions in App Review

### "Redirect URI not valid" error
→ Make sure the URI in Meta console **exactly matches** `.env.local` (including `https://redirectmeto.com/...`)

### Redirects to /signin instead of OAuth
→ Make sure you're logged into your app first (Supabase auth)

### "User not authorized" error
→ Add your account to App Roles (Admin/Developer/Tester)

---

## 📝 Code Summary

All code files are already updated to use `THREADS_` variables:

- ✅ `app/api/threads/auth/route.ts` - OAuth initiation
- ✅ `app/api/threads/callback/route.ts` - OAuth callback & token exchange
- ✅ `app/api/threads/post/route.ts` - Post to Threads
- ✅ `app/api/threads/status/route.ts` - Check connection status
- ✅ `app/_internal/post-page.tsx` - UI for posting
- ✅ `app/components/Sidebar.tsx` - Post tab in sidebar
- ✅ `app/dashboard/page.tsx` - Dashboard routing

**No code changes needed** - just configure environment variables and Meta app settings!

---

## 🚀 Ready to Test?

```bash
# 1. Update .env.local with your Threads app secret
# 2. Configure Meta console (redirect URI + permissions)
# 3. Run migrations in Supabase
# 4. Start server
npm run dev

# 5. Open browser
open http://localhost:3000/dashboard?view=post
```

Good luck! 🎉

