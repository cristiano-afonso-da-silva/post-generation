import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorReason = searchParams.get('error_reason');

    if (error) {
      console.error('❌ OAuth error:', error, errorReason);
      return NextResponse.redirect(new URL('/dashboard?view=post&error=threads_auth_failed', request.url));
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return NextResponse.redirect(new URL('/dashboard?view=post&error=no_code', request.url));
    }

    if (!state) {
      console.error('❌ No state parameter received');
      return NextResponse.redirect(new URL('/dashboard?view=post&error=invalid_state', request.url));
    }

    // Decode user ID from state parameter
    let userId: string;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      userId = decoded.userId;
      console.log('[Threads Callback] Decoded state', { userId });
    } catch (decodeError) {
      console.error('❌ Failed to decode state:', decodeError);
      return NextResponse.redirect(new URL('/dashboard?view=post&error=invalid_state', request.url));
    }

    const THREADS_APP_ID = process.env.THREADS_APP_ID;
    const THREADS_APP_SECRET = process.env.THREADS_APP_SECRET;
    const META_APP_ID = process.env.META_APP_ID;
    const META_APP_SECRET = process.env.META_APP_SECRET;
    const REDIRECT_URI =
      process.env.THREADS_REDIRECT_URI ||
      process.env.META_REDIRECT_URI ||
      `${request.nextUrl.origin}/api/threads/callback`;

    const APP_ID = THREADS_APP_ID || META_APP_ID;
    const APP_SECRET = THREADS_APP_SECRET || META_APP_SECRET;

    console.log('[Threads Callback] Env check', {
      threadsAppId: THREADS_APP_ID,
      threadsAppSecret: THREADS_APP_SECRET ? '[set]' : null,
      fallbackMetaAppId: META_APP_ID,
      fallbackMetaSecret: META_APP_SECRET ? '[set]' : null,
      usingAppId: APP_ID,
      usingRedirectUri: REDIRECT_URI
    });

    if (!APP_ID || !APP_SECRET) {
      console.error('❌ Threads/META API credentials not configured');
      return NextResponse.redirect(new URL('/dashboard?view=post&error=config_missing', request.url));
    }

    // 1. Exchange code for short-lived access token (using Threads App credentials)
    console.log('🔄 Exchanging code for access token...');
    const tokenBody = new URLSearchParams({
      client_id: APP_ID,
      client_secret: APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: REDIRECT_URI,
      code
    });

    console.log('[Threads Callback] Token exchange request', {
      url: 'https://graph.threads.net/oauth/access_token',
      body: Object.fromEntries(tokenBody.entries())
    });

    const tokenResponse = await fetch('https://graph.threads.net/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenBody
    });
    console.log('[Threads Callback] Token response status', {
      status: tokenResponse.status,
      ok: tokenResponse.ok
    });

    let tokenData: any = {};
    try {
      tokenData = await tokenResponse.json();
    } catch (jsonError) {
      const textFallback = await tokenResponse.text();
      console.error('❌ Token response JSON parse failed', {
        jsonError,
        textFallback
      });
      return NextResponse.redirect(new URL('/dashboard?view=post&error=token_response_invalid', request.url));
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('❌ Token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/dashboard?view=post&error=token_exchange_failed', request.url));
    }

    console.log('[Threads Callback] Token exchange succeeded', {
      hasAccessToken: !!tokenData.access_token,
      expires_in: tokenData.expires_in
    });

    let accessToken = tokenData.access_token;

    // 2. Get Threads user ID using the access token
    console.log('🔄 Getting Threads user ID...');
    const userIdResponse = await fetch(
      `https://graph.threads.net/v1.0/me?fields=id,username&access_token=${accessToken}`,
      { method: 'GET' }
    );
    
    const userIdData = await userIdResponse.json();
    console.log('[Threads Callback] User lookup response', {
      status: userIdResponse.status,
      ok: userIdResponse.ok,
      body: userIdData
    });
    
    if (!userIdData.id) {
      console.error('❌ Failed to get Threads user ID:', userIdData);
      return NextResponse.redirect(new URL('/dashboard?view=post&error=user_id_failed', request.url));
    }
    
    const threadsUserId = userIdData.id;
    console.log('✅ Got Threads user ID:', threadsUserId);

    // 3. Exchange for long-lived token (60 days)
    console.log('🔄 Exchanging for long-lived token...');
    try {
      const longLivedResponse = await fetch(
        `https://graph.threads.net/access_token?` +
        `grant_type=th_exchange_token&` +
        `client_secret=${APP_SECRET}&` +
        `access_token=${accessToken}`,
        { method: 'GET' }
      );

      if (longLivedResponse.ok) {
        const longLivedData = await longLivedResponse.json();
        accessToken = longLivedData.access_token;
        console.log('✅ Got long-lived token (expires in', longLivedData.expires_in, 'seconds)');
      } else {
        const longTokenText = await longLivedResponse.text();
        console.warn('⚠️ Long-lived token exchange returned non-OK status', {
          status: longLivedResponse.status,
          body: longTokenText
        });
      }
    } catch (e) {
      console.warn('⚠️ Long-lived token exchange failed, using short token:', e);
    }

    // 4. Store connection using userId from state (use service role to bypass RLS)
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('[Threads Callback] Storing connection for user', { userId });

    // Calculate token expiration (60 days for long-lived)
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    // Store connection in database using userId from state (bypasses RLS with service role)
    const { error: dbError } = await supabaseAdmin
      .from('threads_connections')
      .upsert({
        user_id: userId,
        threads_user_id: threadsUserId,
        access_token: accessToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('❌ Database error storing Threads connection:', dbError);
      return NextResponse.redirect(new URL('/dashboard?view=post&error=db_error', request.url));
    }

    console.log('✅ Threads connection stored successfully', {
      userId,
      threadsUserId,
      expiresAt
    });
    return NextResponse.redirect(new URL('/dashboard?view=post&success=threads_connected', request.url));
  } catch (error: any) {
    console.error('❌ Callback error:', {
      message: error?.message,
      stack: error?.stack
    });
    return NextResponse.redirect(new URL('/dashboard?view=post&error=callback_failed', request.url));
  }
}


