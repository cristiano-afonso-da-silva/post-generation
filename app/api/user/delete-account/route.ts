import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'

export const dynamic = 'force-dynamic'

export async function DELETE(request: NextRequest) {
  try {
    // Get userId from request body
    const body = await request.json().catch(() => ({}))
    const userId = body.userId

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId' },
        { status: 400 }
      )
    }

    // Use service role client for admin operations
    const adminClient = createServerClient()

    // Verify the user exists before deletion
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId)
    
    if (userError || !userData?.user) {
      console.error('[DELETE-ACCOUNT] User not found:', userError)
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log(`[DELETE-ACCOUNT] Verified user exists: ${userId}`)
    console.log(`[DELETE-ACCOUNT] Starting account deletion for user: ${userId}`)

    // Step 1: Delete all generations for this user (ONLY this user's generations)
    console.log(`[DELETE-ACCOUNT] Step 1: Deleting generations for user ${userId}`)
    const { error: generationsError } = await adminClient
      .from('generations')
      .delete()
      .eq('user_id', userId)

    if (generationsError) {
      console.error('[DELETE-ACCOUNT] Error deleting generations:', generationsError)
      return NextResponse.json(
        { error: `Failed to delete generations: ${generationsError.message}` },
        { status: 500 }
      )
    }
    console.log(`[DELETE-ACCOUNT] Successfully deleted generations for user ${userId}`)

    // Step 2: Delete scheduled_posts for this user (they reference generations)
    console.log(`[DELETE-ACCOUNT] Step 2: Deleting scheduled_posts for user ${userId}`)
    const { error: scheduledPostsError } = await adminClient
      .from('scheduled_posts')
      .delete()
      .eq('user_id', userId)

    if (scheduledPostsError) {
      console.error('[DELETE-ACCOUNT] Error deleting scheduled_posts:', scheduledPostsError)
      return NextResponse.json(
        { error: `Failed to delete scheduled posts: ${scheduledPostsError.message}` },
        { status: 500 }
      )
    }
    console.log(`[DELETE-ACCOUNT] Successfully deleted scheduled_posts for user ${userId}`)

    // Step 3: Delete custom_templates for this user
    console.log(`[DELETE-ACCOUNT] Step 3: Deleting custom_templates for user ${userId}`)
    const { error: customTemplatesError } = await adminClient
      .from('custom_templates')
      .delete()
      .eq('user_id', userId)

    if (customTemplatesError) {
      console.error('[DELETE-ACCOUNT] Error deleting custom_templates:', customTemplatesError)
      return NextResponse.json(
        { error: `Failed to delete custom templates: ${customTemplatesError.message}` },
        { status: 500 }
      )
    }
    console.log(`[DELETE-ACCOUNT] Successfully deleted custom_templates for user ${userId}`)

    // Step 4: Delete threads_connections for this user
    console.log(`[DELETE-ACCOUNT] Step 4: Deleting threads_connections for user ${userId}`)
    const { error: threadsConnectionsError } = await adminClient
      .from('threads_connections')
      .delete()
      .eq('user_id', userId)

    if (threadsConnectionsError) {
      console.error('[DELETE-ACCOUNT] Error deleting threads_connections:', threadsConnectionsError)
      return NextResponse.json(
        { error: `Failed to delete threads connections: ${threadsConnectionsError.message}` },
        { status: 500 }
      )
    }
    console.log(`[DELETE-ACCOUNT] Successfully deleted threads_connections for user ${userId}`)

    // Step 5: Delete user_credits (user profile) for this user
    console.log(`[DELETE-ACCOUNT] Step 5: Deleting user_credits for user ${userId}`)
    const { error: userCreditsError } = await adminClient
      .from('user_credits')
      .delete()
      .eq('user_id', userId)

    if (userCreditsError) {
      console.error('[DELETE-ACCOUNT] Error deleting user_credits:', userCreditsError)
      return NextResponse.json(
        { error: `Failed to delete user profile: ${userCreditsError.message}` },
        { status: 500 }
      )
    }
    console.log(`[DELETE-ACCOUNT] Successfully deleted user_credits for user ${userId}`)

    // Step 6: Delete the auth user (must use admin client)
    console.log(`[DELETE-ACCOUNT] Step 6: Deleting auth user ${userId}`)
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteUserError) {
      console.error('[DELETE-ACCOUNT] Error deleting auth user:', deleteUserError)
      return NextResponse.json(
        { error: `Failed to delete user account: ${deleteUserError.message}` },
        { status: 500 }
      )
    }
    console.log(`[DELETE-ACCOUNT] Successfully deleted auth user ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'Account and all associated data deleted successfully'
    })
  } catch (error: any) {
    console.error('[DELETE-ACCOUNT] Unexpected error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete account' },
      { status: 500 }
    )
  }
}

