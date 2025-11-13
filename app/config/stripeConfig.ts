// Stripe configuration - supports both test and live mode
// The mode is determined by your STRIPE_SECRET_KEY environment variable
// Test mode keys start with 'sk_test_', live mode keys start with 'sk_live_'

// Free plan (not a Stripe subscription - no priceId/productId needed)
export const FREE_PLAN = {
  id: 'plan-10',
  name: 'Basic',
  price: 0,
  credits: 10,
} as const

// Test mode product/price IDs (created in Stripe test mode dashboard)
// Only includes paid subscription plans
const TEST_MODE_PLANS = {
  'plan-20': {
    id: 'plan-20',
    name: 'Plus',
    price: 20,
    credits: 50,
    priceId: 'price_1SQt09HK7zocq1deXFEv1HoP',
    productId: 'prod_TNeIuDYPWUgjHr',
  },
  'plan-50': {
    id: 'plan-50',
    name: 'Pro',
    price: 50,
    credits: 150,
    priceId: 'price_1SQt0cHK7zocq1deRCHeL6Hb',
    productId: 'prod_TNeJdtLvyHxaNx',
  },
} as const

// Live mode product/price IDs (updated to match actual Stripe products)
// Only includes paid subscription plans
const LIVE_MODE_PLANS = {
  'plan-20': {
    id: 'plan-20',
    name: 'Plus',
    price: 20,
    credits: 50,
    priceId: 'price_1ST5AhHK7zocq1de8pSI9LNR',
    productId: 'prod_TPv0lOXN2ZdR1l',
  },
  'plan-50': {
    id: 'plan-50',
    name: 'Pro',
    price: 50,
    credits: 150,
    priceId: 'price_1ST5ANHK7zocq1dejxjhNZE9',
    productId: 'prod_TPv0feydxqnouk',
  },
} as const

// Helper function to check if we're in test mode (runtime check)
// Works on both client and server side
function isTestMode(): boolean {
  // On client side, use publishable key (which is available)
  if (typeof window !== 'undefined') {
    const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!publishableKey) return true // Default to test mode for safety
    return publishableKey.startsWith('pk_test_')
  }
  
  // On server side, use secret key
  const secretKey = process.env.STRIPE_SECRET_KEY
  // Default to test mode if key is not set or starts with sk_test_
  if (!secretKey) return true // Default to test mode for safety
  return secretKey.startsWith('sk_test_')
}

// Export function that returns the appropriate plans based on current mode
export function getStripePlans() {
  return isTestMode() ? TEST_MODE_PLANS : LIVE_MODE_PLANS
}

// Export the plans - uses runtime detection
// For client components, uses NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to determine mode
// For server components/API routes, uses STRIPE_SECRET_KEY to determine mode
export const STRIPE_PLANS = getStripePlans()

export type PlanId = keyof typeof STRIPE_PLANS

export function getPlanByPriceId(priceId: string) {
  const plans = getStripePlans()
  for (const plan of Object.values(plans)) {
    if (plan.priceId === priceId) {
      return plan
    }
  }
  return null
}

export function getPlanById(planId: string) {
  // Handle free plan
  if (planId === 'plan-10') {
    return FREE_PLAN
  }
  
  const plans = getStripePlans()
  return plans[planId as PlanId] || null
}

