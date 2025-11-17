/**
 * Supabase MCP Helper Functions
 * These functions use SQL queries that can be verified/tested with MCP Supabase tools
 * 
 * To test with MCP tools, use:
 * - mcp_supabase_execute_sql with the SQL queries shown in comments
 */

import { createServerClient } from './supabase'

// Get user credits using SQL (server-side)
// MCP Test SQL: SELECT * FROM user_credits WHERE user_id = 'user-id-here' LIMIT 1;
export async function getUserCreditsServerSQL(userId: string): Promise<any> {
  const serverClient = createServerClient()
  
  // OPTIMIZED: Include all fields that might be needed (account_handle, website for profile)
  const { data, error } = await serverClient
    .from('user_credits')
    .select('id, user_id, credits_remaining, total_credits_used, stripe_customer_id, stripe_subscription_id, subscription_status, current_plan, account_handle, website, template_generation_used, created_at, updated_at')
    .eq('user_id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No record found, create one
      return await createInitialCreditRecordServerSQL(userId)
    }
    console.error('[getUserCreditsServerSQL] Error fetching user credits:', error)
    return null
  }
  
  return data
}

// Create initial credit record (server-side)
// MCP Test SQL: INSERT INTO user_credits (user_id, credits_remaining, total_credits_used) VALUES ('user-id-here', 10, 0) RETURNING *;
export async function createInitialCreditRecordServerSQL(userId: string): Promise<any> {
  const serverClient = createServerClient()
  
  const { data, error } = await serverClient
    .from('user_credits')
    .insert({
      user_id: userId,
      credits_remaining: 10,
      total_credits_used: 0,
    })
    .select()
    .single()
  
  if (error) {
    console.error('Error creating initial credit record:', error)
    return null
  }
  
  return data
}

// Deduct credit using SQL (server-side)
// MCP Test SQL: 
// UPDATE user_credits 
// SET credits_remaining = GREATEST(credits_remaining - 1, 0), 
//     total_credits_used = total_credits_used + 1,
//     updated_at = NOW()
// WHERE user_id = 'user-id-here'
// RETURNING *;
export async function deductCreditServerSQL(userId: string, amount: number = 1): Promise<any> {
  const serverClient = createServerClient()
  
  // First get current credits
  const current = await getUserCreditsServerSQL(userId)
  if (!current) {
    return null
  }
  
  // Deduct credit - SQL pattern matches what MCP tools would execute
  const { data, error } = await serverClient
    .from('user_credits')
    .update({
      credits_remaining: Math.max(current.credits_remaining - amount, 0),
      total_credits_used: current.total_credits_used + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()
  
  if (error) {
    console.error('Error deducting credit:', error)
    return null
  }
  
  return data
}

