# 🔒 Security Warning: HTTPS Required for Production

## The Problem You're Seeing

Facebook is showing this error:
> "Facebook 偵測到 Post My Note 傳遞資訊所使用的網路連線並不安全。"
> 
> Translation: "Facebook detected that the network connection used by Post My Note to transmit information is not secure."

**This happens because you're using `http://postmynote.app` instead of `https://postmynote.app`**

---

## ⚠️ Critical Issue: HTTP vs HTTPS

### Current Setup (INSECURE)
```
http://postmynote.app/api/threads/callback
```
❌ Facebook blocks HTTP connections for security reasons

### Required Setup (SECURE)
```
https://postmynote.app/api/threads/callback
```
✅ Facebook allows HTTPS connections

---

## 🛠️ Solutions

### Option 1: Test Locally (Recommended for Development)

There are two ways:

#### 1A. Plain localhost (if the form accepts it)

**1. Update `.env.local`:**
```env
THREADS_APP_ID=1177132647699262
THREADS_APP_SECRET=your_threads_app_secret_here
THREADS_REDIRECT_URI=https://redirectmeto.com/http://localhost:3000/api/threads/callback
```

**⚠️ IMPORTANT:** Use your **Threads app** credentials (ID: 1177132647699262), NOT your Meta/Facebook app credentials!

**2. Update Meta Developer Console:**
- Go to your app settings
- Find "Valid OAuth Redirect URIs"
- Add: `http://localhost:3000/api/threads/callback`
- Save changes

#### 1B. HTTPS shim (works even if Facebook rejects plain HTTP)

Facebook accepts `https://redirectmeto.com/...` because the initial hop is HTTPS.

**1. Update `.env.local`:**
```env
THREADS_APP_ID=1177132647699262
THREADS_APP_SECRET=your_threads_app_secret_here
THREADS_REDIRECT_URI=https://redirectmeto.com/http://localhost:3000/api/threads/callback
```

**2. Update Meta Developer Console:**
- Add exactly: `https://redirectmeto.com/http://localhost:3000/api/threads/callback`
- Save changes (no trailing slash)

**3. Test locally:**
```bash
npm run dev
# Visit: http://localhost:3000/dashboard?view=post
```

**Why this works:** Meta redirects to `redirectmeto.com` (HTTPS), which then forwards to your HTTP localhost.

---

### Option 2: Enable HTTPS on Your Domain (Required for Production)

You need to set up SSL/TLS certificate for `postmynote.app`:

#### If using Vercel:
1. Deploy your app to Vercel
2. Add custom domain `postmynote.app`
3. Vercel automatically provisions SSL certificate
4. Update redirect URI to: `https://postmynote.app/api/threads/callback`

#### If using your own server:
1. Get SSL certificate (free from Let's Encrypt)
2. Install certificate on your server
3. Configure HTTPS
4. Update redirect URI to: `https://postmynote.app/api/threads/callback`

#### If using Cloudflare:
1. Add your domain to Cloudflare
2. Enable "Full (strict)" SSL/TLS encryption
3. Cloudflare provides free SSL certificate
4. Update redirect URI to: `https://postmynote.app/api/threads/callback`

---

## 📋 Step-by-Step: Switch to Localhost Testing

### 1. Stop your current server
```bash
# Press Ctrl+C in terminal
```

### 2. Update environment variables
Edit `.env.local`:
```env
THREADS_APP_ID=1177132647699262
THREADS_APP_SECRET=your_threads_app_secret_here
THREADS_REDIRECT_URI=https://redirectmeto.com/http://localhost:3000/api/threads/callback
```

### 3. Update Threads App Settings
1. Go to https://developers.facebook.com/apps/1177132647699262
2. Navigate to **Use cases** > **Customize** > **Settings**
3. Find **Valid OAuth Redirect URIs**
4. Add: `http://localhost:3000/api/threads/callback`
5. Click **Save changes**

### 4. Restart server
```bash
npm run dev
```

### 5. Test the flow
1. Open: `http://localhost:3000/dashboard?view=post`
2. Click "Connect Threads"
3. Should work without security warning! ✅

---

## 🎯 Quick Decision Guide

**Are you testing/developing?**
→ Use `http://localhost:3000` (Option 1)

**Are you deploying to production?**
→ Use `https://postmynote.app` (Option 2)

**Can't set up HTTPS right now?**
→ Test with localhost first, deploy to Vercel later (easiest)

---

## 🚀 Recommended: Deploy to Vercel (Easiest Solution)

1. Push your code to GitHub
2. Import to Vercel (https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Add custom domain `postmynote.app`
5. Vercel auto-configures HTTPS ✅
6. Update Meta redirect URI to: `https://postmynote.app/api/threads/callback`

**Total time: ~10 minutes**
**Cost: Free**

---

## ❓ FAQ

**Q: Why does Facebook require HTTPS?**
A: To protect user data and OAuth tokens from being intercepted.

**Q: Can I bypass this for testing?**
A: Yes, use `localhost` instead of your domain name.

**Q: Is localhost really secure?**
A: For local testing, yes. Facebook makes an exception for `localhost` and `127.0.0.1`.

**Q: What if I already have HTTPS but still see this error?**
A: Make sure your redirect URI in `.env.local` starts with `https://` not `http://`.

---

Need help setting up HTTPS? Let me know which hosting platform you're using!

