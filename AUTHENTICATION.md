# 🔐 Authentication Setup Guide

This application uses Supabase for authentication. Follow these steps to set it up.

## Prerequisites

- A Supabase account ([Sign up here](https://supabase.com))
- Email verification enabled in your email provider

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Create a new project:
   - **Name:** Post My Note (or any name)
   - **Database Password:** Choose a strong password
   - **Region:** Choose closest to you
4. Wait for the project to be created (2-3 minutes)

## Step 2: Get Your API Keys

1. In your Supabase project dashboard, go to **Settings** → **API**
2. You'll see:
   - **Project URL:** `https://your-project-id.supabase.co`
   - **Project API keys:**
     - `anon` `public` key (safe to use in the browser)
     - `service_role` key (keep this secret, don't use in frontend)

## Step 3: Configure Environment Variables

Create `.env.local` file in the root folder:

```bash
cat > .env.local << 'EOF'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF
```

Replace:
- `your-project-id` with your actual project ID
- `your-anon-key-here` with your actual anon/public key

## Step 4: Enable Email Authentication

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Make sure **Email** is enabled (it should be by default)
3. Optional: Configure email templates:
   - Go to **Authentication** → **Email Templates**
   - Customize the verification email (optional)

## Step 5: Configure Email Settings (Optional)

By default, Supabase uses their SMTP server. For production, you should configure your own:

1. Go to **Authentication** → **Settings**
2. Scroll to **SMTP Settings**
3. Configure your email provider (SendGrid, Mailgun, etc.)

For development, the default is fine.

## Step 6: Test Authentication

1. Start the application: `npm run dev`
2. Open `http://localhost:3000`
4. You should see the landing page
5. Click "Sign Up" and create an account
6. Check your email for a verification code
7. Enter the code to verify
8. You should be redirected to the main app

## Authentication Flow

### Sign Up Flow
1. User enters email and password on `/signup`
2. Supabase creates the user account
3. Verification email is sent with a 6-digit code
4. User is redirected to `/verify`
5. User enters the code
6. Account is verified and user is signed in
7. User is redirected to main app (`/`)

### Sign In Flow
1. User enters email and password on `/signin`
2. Supabase verifies credentials
3. User is signed in
4. User is redirected to main app (`/`)

### Protected Routes
- `/` (main app) - Requires authentication
- `/landing` - Public
- `/signin` - Public (redirects to `/` if already signed in)
- `/signup` - Public (redirects to `/` if already signed in)
- `/verify` - Public

## Troubleshooting

### "Invalid API key"
- Check that you copied the correct anon/public key
- Make sure you're using the anon key, not the service_role key
- Verify the key is in `.env.local` with the correct variable name

### "Email not confirmed"
- Check your email inbox (and spam folder)
- Try resending the verification code
- In development, you can check the Supabase dashboard:
  - Go to **Authentication** → **Users**
  - Find your user and manually verify them

### "Failed to send email"
- Check Supabase email settings
- Verify your email provider is configured correctly
- In development, check Supabase logs in the dashboard

### Can't sign in after verification
- Clear browser cache and cookies
- Try signing out and back in
- Check the browser console for errors

## Security Best Practices

### For Development
- The anon key is safe to use in the frontend
- Keep `.env.local` in `.gitignore` (already configured)
- Don't commit sensitive keys to git

### For Production
1. **Enable Row Level Security (RLS):**
   - Go to **Database** → **Tables**
   - Enable RLS on all tables
   - Create appropriate policies

2. **Configure Email Templates:**
   - Customize verification emails
   - Add your branding
   - Use your domain

3. **Set Up Custom SMTP:**
   - Don't rely on Supabase's default SMTP
   - Use a reliable email provider

4. **Configure Auth Settings:**
   - Set appropriate password requirements
   - Configure rate limiting
   - Set up proper redirects

## Additional Features

### Password Reset (Not implemented yet)
To add password reset:
1. Create a `/reset-password` page
2. Use `supabase.auth.resetPasswordForEmail()`
3. Handle the reset token
4. Update the password

### Social Auth (Not implemented yet)
To add OAuth providers:
1. Enable providers in Supabase dashboard
2. Configure OAuth apps (Google, GitHub, etc.)
3. Add sign-in buttons in your UI
4. Use `supabase.auth.signInWithOAuth()`

## Database Schema

Currently, the app only uses Supabase for authentication. No custom database tables are created.

If you want to store user-specific data (like saved notes), you'll need to:
1. Create tables in Supabase
2. Enable Row Level Security
3. Create policies to protect user data
4. Update the frontend to save/load data

## API Reference

### Sign Up
```typescript
const { data, error } = await supabase.auth.signUp({
  email: 'your-email@example.com',
  password: 'your-secure-password',
  options: {
    emailRedirectTo: 'http://localhost:3001/verify'
  }
})
```

### Sign In
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'your-email@example.com',
  password: 'your-secure-password'
})
```

### Verify Email
```typescript
const { data, error } = await supabase.auth.verifyOtp({
  email: 'your-email@example.com',
  token: '123456',
  type: 'signup'
})
```

### Sign Out
```typescript
const { error } = await supabase.auth.signOut()
```

### Get Current User
```typescript
const { data: { user } } = await supabase.auth.getUser()
```

## Support

For more information:
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/auth-signup)
- [Next.js App Router with Supabase](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)

---

**Your Supabase Credentials:**
- **Project ID:** drepsyokmfixpjaxchky
- **Project URL:** https://drepsyokmfixpjaxchky.supabase.co
- **Anon Key:** (stored securely in `.env.local`)

