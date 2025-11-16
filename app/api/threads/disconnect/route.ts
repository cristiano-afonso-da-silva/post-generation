import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/app/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabaseAdmin = getSupabaseAdmin();

    console.log('[Threads Disconnect] Starting disconnect for user:', { userId });

    // Query all connections first (to work around potential UUID filtering issue)
    // OPTIMIZED: Only select id and user_id for filtering
    const { data: allConnections, error: allError } = await supabaseAdmin
      .from('threads_connections')
      .select('id, user_id');

    console.log('[Threads Disconnect] All connections:', {
      count: allConnections?.length || 0,
      error: allError
    });

    // Find the connection for this user
    const existingConnection = allConnections?.find(
      (conn: any) => conn.user_id === userId
    );

    console.log('[Threads Disconnect] Existing connection check:', {
      found: !!existingConnection,
      connection: existingConnection ? { id: existingConnection.id, user_id: existingConnection.user_id } : null
    });

    if (!existingConnection) {
      // Already disconnected
      console.log('[Threads Disconnect] Already disconnected');
      return NextResponse.json({ success: true, message: 'Already disconnected' });
    }

    // Delete the connection by ID using raw SQL (more reliable)
    console.log('[Threads Disconnect] Attempting to delete connection by ID...', {
      connectionId: existingConnection.id
    });
    
    // Try deletion using the Supabase client first
    const { data: deletedData, error: deleteError } = await supabaseAdmin
      .from('threads_connections')
      .delete()
      .eq('id', existingConnection.id)
      .select();

    console.log('[Threads Disconnect] Delete attempt result:', {
      success: !deleteError,
      deletedCount: deletedData?.length || 0,
      deletedData,
      error: deleteError
    });

    if (deleteError) {
      console.error('❌ Failed to disconnect Threads account:', deleteError);
      // Try raw SQL as fallback
      console.log('[Threads Disconnect] Trying raw SQL deletion...');
      const { data: sqlResult, error: sqlError } = await supabaseAdmin.rpc('exec_sql', {
        query: `DELETE FROM threads_connections WHERE id = '${existingConnection.id}' RETURNING id`
      });
      
      if (sqlError) {
        console.error('❌ Raw SQL deletion also failed:', sqlError);
        return NextResponse.json(
          { error: 'Failed to disconnect Threads account' },
          { status: 500 }
        );
      }
      
      console.log('✅ Raw SQL deletion succeeded:', sqlResult);
    } else {
      console.log('✅ Threads connection deleted via client:', { 
        userId, 
        deletedCount: deletedData?.length || 0,
        deletedData 
      });
    }

    // Verify deletion by checking if connection still exists
    console.log('[Threads Disconnect] Verifying deletion...');
    // OPTIMIZED: Only select id and user_id for verification
    const { data: allConnectionsAfter, error: verifyError } = await supabaseAdmin
      .from('threads_connections')
      .select('id, user_id');

    const stillExists = allConnectionsAfter?.find((conn: any) => conn.user_id === userId);

    if (stillExists) {
      console.error('⚠️ WARNING: Connection still exists after deletion!', {
        userId,
        remainingConnection: stillExists,
        allConnectionsCount: allConnectionsAfter?.length || 0
      });
      return NextResponse.json(
        { error: 'Connection deletion failed - connection still exists' },
        { status: 500 }
      );
    }

    console.log('✅ Connection deletion verified - no connection found', {
      allConnectionsAfter: allConnectionsAfter?.length || 0
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Disconnect error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

