import { createClient } from '@supabase/supabase-js'

const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKeyRaw = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

if (!supabaseUrlRaw || !supabaseAnonKeyRaw) {
  throw new Error(
    'Missing Supabase configuration: add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local in the project root, then restart `npm run dev`. Copy values from Supabase → Project Settings → API.'
  )
}

// Explicit `string` so nested functions (e.g. createServerClient) see `string`, not `string | undefined`
const supabaseUrl: string = supabaseUrlRaw
const supabaseAnonKey: string = supabaseAnonKeyRaw

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client with service role (for admin operations)
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Credit management types
export interface UserCredits {
  id: string
  user_id: string
  credits_remaining: number
  total_credits_used: number
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: 'active' | 'canceled' | 'past_due' | null
  current_plan: 'plan-10' | 'plan-20' | 'plan-50' | null
  account_handle: string | null
  website: string | null
  template_generation_used: boolean | null
  first_name: string | null
  brand_name: string | null
  brand_handle: string | null
  brand_intention: string | null
  topics: string[] | null
  template_style: string | null
  copy_tone: string[] | null
  created_at: string
  updated_at: string
}

// Get user credits (client-side)
export async function getUserCredits(userId: string): Promise<UserCredits | null> {
  const { data, error } = await supabase
    .from('user_credits')
    .select('id, user_id, credits_remaining, total_credits_used, stripe_customer_id, stripe_subscription_id, subscription_status, current_plan, account_handle, website, template_generation_used, first_name, brand_name, brand_handle, brand_intention, topics, template_style, copy_tone, created_at, updated_at')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No record found, create one with default 10 credits
      return await createInitialCreditRecord(userId)
    }
    console.error('Error fetching user credits:', error)
    return null
  }

  return data
}

// Create initial credit record for new user (client-side)
export async function createInitialCreditRecord(userId: string): Promise<UserCredits | null> {
  const { data, error } = await supabase
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

// Deduct credit (client-side)
export async function deductCredit(userId: string): Promise<UserCredits | null> {
  // First get current credits - only need the fields we'll use
  const current = await getUserCredits(userId)
  if (!current) {
    return null
  }

  const { data, error } = await supabase
    .from('user_credits')
    .update({
      credits_remaining: Math.max(current.credits_remaining - 1, 0),
      total_credits_used: current.total_credits_used + 1,
    })
    .eq('user_id', userId)
    .select('id, user_id, credits_remaining, total_credits_used, stripe_customer_id, stripe_subscription_id, subscription_status, current_plan, account_handle, website, template_generation_used, first_name, brand_name, brand_handle, brand_intention, topics, template_style, copy_tone, created_at, updated_at')
    .single()

  if (error) {
    console.error('Error deducting credit:', error)
    return null
  }

  return data
}

// Update user subscription (server-side only, used by webhooks)
export async function updateUserSubscription(
  userId: string,
  subscriptionData: {
    stripe_customer_id?: string
    stripe_subscription_id?: string
    subscription_status?: 'active' | 'canceled' | 'past_due' | null
    current_plan?: 'plan-10' | 'plan-20' | 'plan-50' | null
    credits_remaining?: number
  }
): Promise<UserCredits | null> {
  const serverClient = createServerClient()
  
  const { data, error } = await serverClient
    .from('user_credits')
    .update(subscriptionData)
    .eq('user_id', userId)
    .select('id, user_id, credits_remaining, total_credits_used, stripe_customer_id, stripe_subscription_id, subscription_status, current_plan, account_handle, website, template_generation_used, first_name, brand_name, brand_handle, brand_intention, topics, template_style, copy_tone, created_at, updated_at')
    .single()

  if (error) {
    console.error('Error updating user subscription:', error)
    return null
  }

  return data
}

// Add credits to user (server-side only, used by webhooks)
export async function addCredits(
  userId: string,
  creditsToAdd: number
): Promise<UserCredits | null> {
  const serverClient = createServerClient()
  
  // Get current credits by user_id - only need credits_remaining for calculation
  const { data: currentData } = await serverClient
    .from('user_credits')
    .select('credits_remaining')
    .eq('user_id', userId)
    .single()
  
  if (!currentData) {
    return null
  }
  
  const { data, error } = await serverClient
    .from('user_credits')
    .update({
      credits_remaining: currentData.credits_remaining + creditsToAdd,
    })
    .eq('user_id', userId)
    .select('id, user_id, credits_remaining, total_credits_used, stripe_customer_id, stripe_subscription_id, subscription_status, current_plan, account_handle, website, template_generation_used, first_name, brand_name, brand_handle, brand_intention, topics, template_style, copy_tone, created_at, updated_at')
    .single()

  if (error) {
    console.error('Error adding credits:', error)
    return null
  }

  return data
}

// Get user credits by Stripe customer ID (server-side only)
export async function getUserCreditsByStripeCustomerId(
  stripeCustomerId: string
): Promise<UserCredits | null> {
  const serverClient = createServerClient()
  
  const { data, error } = await serverClient
    .from('user_credits')
    .select('id, user_id, credits_remaining, total_credits_used, stripe_customer_id, stripe_subscription_id, subscription_status, current_plan, account_handle, website, template_generation_used, first_name, brand_name, brand_handle, brand_intention, topics, template_style, copy_tone, created_at, updated_at')
    .eq('stripe_customer_id', stripeCustomerId)
    .single()

  if (error) {
    console.error('Error fetching user credits by Stripe customer ID:', error)
    return null
  }

  return data
}

// Get user credits (server-side)
export async function getUserCreditsServer(userId: string): Promise<UserCredits | null> {
  const serverClient = createServerClient()
  
  const { data, error } = await serverClient
    .from('user_credits')
    .select('id, user_id, credits_remaining, total_credits_used, stripe_customer_id, stripe_subscription_id, subscription_status, current_plan, account_handle, website, template_generation_used, first_name, brand_name, brand_handle, brand_intention, topics, template_style, copy_tone, created_at, updated_at')
    .eq('user_id', userId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No record found, create one with default 10 credits
      return await createInitialCreditRecordServer(userId)
    }
    console.error('Error fetching user credits:', error)
    return null
  }

  return data
}

// Create initial credit record for new user (server-side)
export async function createInitialCreditRecordServer(userId: string): Promise<UserCredits | null> {
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

// Deduct credit (server-side)
export async function deductCreditServer(userId: string): Promise<UserCredits | null> {
  const serverClient = createServerClient()
  
  // First get current credits - only need the fields we'll use
  const current = await getUserCreditsServer(userId)
  if (!current) {
    return null
  }

  const { data, error } = await serverClient
    .from('user_credits')
    .update({
      credits_remaining: Math.max(current.credits_remaining - 1, 0),
      total_credits_used: current.total_credits_used + 1,
    })
    .eq('user_id', userId)
    .select('id, user_id, credits_remaining, total_credits_used, stripe_customer_id, stripe_subscription_id, subscription_status, current_plan, account_handle, website, template_generation_used, first_name, brand_name, brand_handle, brand_intention, topics, template_style, copy_tone, created_at, updated_at')
    .single()

  if (error) {
    console.error('Error deducting credit:', error)
    return null
  }

  return data
}

// Update user profile fields (server-side only)
export async function updateUserProfile(
  userId: string,
  profileData: {
    account_handle?: string | null
    website?: string | null
    first_name?: string | null
    brand_name?: string | null
    brand_handle?: string | null
    brand_intention?: string | null
    topics?: string[] | null
    template_style?: string | null
    copy_tone?: string[] | null
  }
): Promise<UserCredits | null> {
  const serverClient = createServerClient()
  
  const { data, error } = await serverClient
    .from('user_credits')
    .update(profileData)
    .eq('user_id', userId)
    .select('id, user_id, credits_remaining, total_credits_used, stripe_customer_id, stripe_subscription_id, subscription_status, current_plan, account_handle, website, template_generation_used, first_name, brand_name, brand_handle, brand_intention, topics, template_style, copy_tone, created_at, updated_at')
    .single()

  if (error) {
    console.error('Error updating user profile:', error)
    return null
  }

  return data
}

