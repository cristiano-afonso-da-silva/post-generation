import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url);

    // Try to read Supabase-authenticated user from cookies
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    let userId: string | null = null;
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.warn('[Threads Auth] Supabase auth warning', authError);
      }
      userId = user?.id ?? null;
    } catch (supabaseError) {
      console.warn('[Threads Auth] Supabase getUser failed', supabaseError);
    }

    // Fallback to userId passed from client query
    const queryUserId = requestUrl.searchParams.get('userId');
    if (!userId && queryUserId) {
      userId = queryUserId;
      console.log('[Threads Auth] Using userId from query param', { userId });
    }

    if (!userId) {
      console.error('❌ Unable to determine user ID before Threads auth');
      return NextResponse.redirect(new URL('/signin?error=auth_required', request.url));
    }

    const THREADS_APP_ID = process.env.THREADS_APP_ID;
    const FALLBACK_META_APP_ID = process.env.META_APP_ID;
    const REDIRECT_URI =
      process.env.THREADS_REDIRECT_URI ||
      process.env.META_REDIRECT_URI ||
      `${request.nextUrl.origin}/api/threads/callback`;

    const APP_ID = THREADS_APP_ID || FALLBACK_META_APP_ID;

    console.log('[Threads Auth] Env check', {
      threadsAppId: THREADS_APP_ID,
      fallbackMetaAppId: FALLBACK_META_APP_ID,
      usingAppId: APP_ID,
      redirectUri: REDIRECT_URI,
      userId
    });

    if (!APP_ID) {
      console.error('❌ THREADS_APP_ID not configured');
      return NextResponse.json({ error: 'Threads App ID not configured' }, { status: 500 });
    }

    // Encode user ID in state parameter (so callback can identify the user)
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

    const authUrl = new URL('https://threads.net/oauth/authorize');
    authUrl.searchParams.set('client_id', APP_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', 'threads_basic,threads_content_publish');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state);

    console.log('[Threads Auth] Redirecting to Threads OAuth', {
      client_id: APP_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'threads_basic,threads_content_publish',
      response_type: 'code',
      state,
      authUrl: authUrl.toString()
    });
    return NextResponse.redirect(authUrl.toString());
  } catch (error: any) {
    console.error('❌ Threads auth error:', {
      message: error?.message,
      stack: error?.stack
    });
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}


