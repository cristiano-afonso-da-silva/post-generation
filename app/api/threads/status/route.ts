import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/app/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Get userId from query params
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get user's Threads connection - use maybeSingle() to avoid error when no row exists
    console.log('[Threads Status] Querying for connection', {
      userId,
      userIdType: typeof userId,
      userIdLength: userId.length
    });
    
    // Query all connections first to debug
    // OPTIMIZED: Only select fields needed for debugging/logging
    const { data: allConnections, error: allError } = await supabaseAdmin
      .from('threads_connections')
      .select('id, user_id');
      
    console.log('[Threads Status] All connections query returned:', {
      count: allConnections?.length || 0,
      error: allError
    });
    
    // Now try the filtered query - only select fields we actually use
    const { data: filteredConnections, error: filteredError } = await supabaseAdmin
      .from('threads_connections')
      .select('id, user_id, threads_user_id, threads_username, token_expires_at, created_at')
      .eq('user_id', userId);
      
    console.log('[Threads Status] Filtered query with .eq() returned:', {
      count: filteredConnections?.length || 0,
      matches: filteredConnections,
      error: filteredError
    });
    
    // If filtered query fails, try finding it manually from all connections
    let connection = filteredConnections?.[0] || null;
    
    if (!connection && allConnections) {
      // Fallback: manually filter in JavaScript
      // If we found a match, fetch the full connection data
      const matchedConnection = allConnections.find((conn: any) => conn.user_id === userId);
      if (matchedConnection) {
        const { data: fullConnection } = await supabaseAdmin
          .from('threads_connections')
          .select('id, user_id, threads_user_id, threads_username, token_expires_at, created_at')
          .eq('id', matchedConnection.id)
          .single();
        connection = fullConnection;
        console.log('[Threads Status] Found connection via manual filter:', !!connection);
      }
    }
    
    const connError = filteredError;

    // Check for actual errors (not just "no rows found")
    if (connError && connError.code !== 'PGRST116') {
      console.error('❌ Error checking Threads connection:', connError);
      return NextResponse.json({ 
        connected: false,
        error: 'Failed to check connection status'
      }, { status: 500 });
    }

    // No connection found
    if (!connection) {
      console.log('[Threads Status] No connection found for user', { 
        userId,
        allConnectionsCount: allConnections?.length || 0,
        filteredConnectionsCount: filteredConnections?.length || 0
      });
      
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
      threadsUsername: connection.threads_username,
      isExpired
    });

    return NextResponse.json({ 
      connected: true,
      isExpired,
      expiresAt: connection.token_expires_at,
      threadsUserId: connection.threads_user_id,
      threadsUsername: connection.threads_username,
      connectedAt: connection.created_at
    });

  } catch (error: any) {
    console.error('❌ Status check error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to check connection status' 
    }, { status: 500 });
  }
}
