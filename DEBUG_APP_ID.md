# 🔍 Debug: Invalid App ID Error

## The Problem

You're getting: **"Invalid app ID: The provided app ID does not look like a valid app ID."**

This usually means one of two things:

1. **Wrong App ID** - You're using an app ID that doesn't have Threads enabled
2. **Typo in App ID** - Extra spaces, wrong digits, etc.

---

## ✅ Step-by-Step Fix

### 1. Find Your CORRECT Threads App

Go to https://developers.facebook.com/apps/

Look for an app that has:
- ✅ **Threads** listed under "Products" or "Use Cases"
- ✅ Display name: "Post My Note" (or whatever you named it)

**Common mistake:** Using a Facebook/Instagram app ID that doesn't have Threads enabled.

---

### 2. Verify the App ID

Once you find the correct app:

1. Click on the app
2. Look at the URL - it should be: `https://developers.facebook.com/apps/YOUR_APP_ID/...`
3. Copy the App ID from the URL
4. **OR** go to **Settings → Basic** and copy the **App ID** field

**Example:**
- If URL is `https://developers.facebook.com/apps/1177132647699262/dashboard/`
- Then App ID is: `1177132647699262`

---

### 3. Check if Threads is Enabled

In your app dashboard:

1. Go to **Use Cases** (left sidebar)
2. Look for **"Threads"** in the list
3. If you DON'T see Threads:
   - Click **"Add Use Case"**
   - Select **"Threads"**
   - Click **"Get Started"**

---

### 4. Update Your .env.local

Once you have the CORRECT app ID:

```env
THREADS_APP_ID=your_actual_threads_app_id_here
THREADS_APP_SECRET=your_actual_threads_app_secret_here
THREADS_REDIRECT_URI=https://redirectmeto.com/http://localhost:3000/api/threads/callback
```

**Important:** 
- No spaces before or after the `=`
- No quotes around the values
- No extra characters

---

### 5. Get the App Secret

From the same app:

1. Go to **Settings → Basic**
2. Find **App Secret**
3. Click **"Show"** (you'll need to enter your password)
4. Copy the secret
5. Paste into `.env.local`

---

## 🧪 Quick Test

After updating `.env.local`:

1. **Restart your dev server:**
   ```bash
   # Press Ctrl+C to stop
   npm run dev
   ```

2. **Verify environment variables are loaded:**
   ```bash
   # In your terminal (while server is running)
   echo $THREADS_APP_ID
   ```
   Should show your app ID (if using bash/zsh with env loaded)

3. **Check the OAuth URL in terminal:**
   When you click "Connect Threads", look at your terminal output.
   You should see:
   ```
   🔗 Redirecting to Threads OAuth: https://www.facebook.com/v21.0/dialog/oauth?client_id=YOUR_APP_ID&...
   ```
   
   **Verify:** The `client_id` in the URL matches your app ID

---

## 🔍 Common Issues

### Issue 1: Multiple Apps
You might have created multiple apps. Make sure you're using the one with Threads enabled.

### Issue 2: App ID from Screenshot
The screenshot you showed earlier had:
- **Threads app ID:** `1177132647699262`

**Verify this is correct by:**
1. Going to https://developers.facebook.com/apps/1177132647699262
2. Checking if Threads is listed under Use Cases
3. If you see "App Not Found" or no Threads → wrong app ID

### Issue 3: Environment Variable Not Loading
```bash
# Stop server
# Delete .env.local
# Create new .env.local with correct values
# Start server again
npm run dev
```

---

## 📸 What to Check

Please verify these and let me know:

1. **What's the App ID in your Meta dashboard?**
   - Go to https://developers.facebook.com/apps/
   - Click your app
   - Settings → Basic → App ID = ?

2. **Does the app have Threads enabled?**
   - Use Cases → Do you see "Threads"?

3. **What's in your `.env.local`?**
   - `THREADS_APP_ID=?`
   - (Don't share the secret, just confirm it's there)

4. **What does the terminal show when you click "Connect Threads"?**
   - Look for the line: `🔗 Redirecting to Threads OAuth: ...`
   - What's the `client_id` parameter in that URL?

---

Let me know the answers to these questions and I can help pinpoint the exact issue!

