# Supabase OTP Configuration

## Ensure OTP Codes (Not Magic Links) Are Sent

To make sure sign-in uses 6-digit OTP codes instead of magic links:

1. **Go to Supabase Dashboard**
   - Navigate to your project
   - Go to **Authentication** → **Settings**

2. **Configure Email Auth**
   - Under **Email Auth**, make sure:
     - ✅ **Enable email confirmations** is ON
     - ✅ **Confirm email** is set to your preference
   
3. **Check Email Templates**
   - Go to **Authentication** → **Email Templates**
   - Make sure the **Magic Link** template is configured to send OTP codes
   - Or use the **OTP** template if available

4. **Alternative: Use Custom SMTP**
   - If using custom SMTP, ensure your email provider supports OTP codes
   - Configure the email template to send 6-digit codes

## Code Changes Made

- ✅ Sign-in page now uses `shouldCreateUser: false` to prevent creating new users on sign-in
- ✅ Both sign-in and sign-up redirect to `/verify` page for OTP code entry
- ✅ Both use the same `signInWithOtp` method

## Testing

1. Try signing in with an existing account
2. You should receive a 6-digit code in your email
3. Enter the code on the verify page
4. You should be signed in successfully

If you're still receiving magic links instead of OTP codes, check your Supabase email template configuration.


