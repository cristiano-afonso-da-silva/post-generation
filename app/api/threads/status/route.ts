import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Use service role to check connection (bypasses RLS)
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

    // Get user's Threads connection
    const { data: connection, error: connError } = await supabaseAdmin
      .from('threads_connections')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ 
        connected: false,
        message: 'Threads account not connected'
      });
    }

    // Check if token is expired
    const isExpired = connection.token_expires_at 
      ? new Date(connection.token_expires_at) < new Date()
      : false;

    console.log('[Threads Status] Connection found', {
      userId,
      threadsUserId: connection.threads_user_id,
      isExpired
    });

    return NextResponse.json({ 
      connected: true,
      isExpired,
      expiresAt: connection.token_expires_at,
      threadsUserId: connection.threads_user_id,
      connectedAt: connection.created_at
    });

  } catch (error: any) {
    console.error('❌ Status check error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to check connection status' 
    }, { status: 500 });
  }
}
