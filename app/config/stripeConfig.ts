// Stripe configuration - supports both test and live mode
// The mode is determined by your STRIPE_SECRET_KEY environment variable
// Test mode keys start with 'sk_test_', live mode keys start with 'sk_live_'

// Test mode product/price IDs (created in Stripe test mode dashboard)
const TEST_MODE_PLANS = {
  'plan-10': {
    id: 'plan-10',
    name: 'Basic',
    price: 10,
    credits: 10,
    description: 'For exploring AI-generated content',
    priceId: 'price_1SQsy5HK7zocq1del54yVslU',
    productId: 'prod_TNeGSMzAWDRkPI',
  },
  'plan-20': {
    id: 'plan-20',
    name: 'Pro',
    price: 20,
    credits: 20,
    description: 'For professionals building consistency',
    priceId: 'price_1SQt09HK7zocq1deXFEv1HoP',
    productId: 'prod_TNeIuDYPWUgjHr',
  },
  'plan-50': {
    id: 'plan-50',
    name: 'Business',
    price: 50,
    credits: 50,
    description: 'For teams growing their brand presence',
    priceId: 'price_1SQt0cHK7zocq1deRCHeL6Hb',
    productId: 'prod_TNeJdtLvyHxaNx',
  },
  'plan-100': {
    id: 'plan-100',
    name: 'Enterprise',
    price: 100,
    credits: 100,
    description: 'For agencies producing at scale',
    priceId: 'price_1SQt16HK7zocq1deLxS44hMe',
    productId: 'prod_TNeJlwIVYe67Hw',
  },
} as const

// Live mode product/price IDs (updated to match actual Stripe products)
const LIVE_MODE_PLANS = {
  'plan-10': {
    id: 'plan-10',
    name: 'Basic',
    price: 10,
    credits: 10,
    description: 'For exploring AI-generated content',
    priceId: 'price_1SQl4rHK7zocq1deIIFdiAHb',
    productId: 'prod_TNW6s5tgNWdads',
  },
  'plan-20': {
    id: 'plan-20',
    name: 'Pro',
    price: 20,
    credits: 20,
    description: 'For professionals building consistency',
    priceId: 'price_1SQl4tHK7zocq1deDUeN8h4c',
    productId: 'prod_TNW6g9hABzsSRb',
  },
  'plan-50': {
    id: 'plan-50',
    name: 'Business',
    price: 50,
    credits: 50,
    description: 'For teams growing their brand presence',
    priceId: 'price_1SQl4uHK7zocq1decjSxbUMB',
    productId: 'prod_TNW6K7MnAsF78B',
  },
  'plan-100': {
    id: 'plan-100',
    name: 'Enterprise',
    price: 100,
    credits: 100,
    description: 'For agencies producing at scale',
    priceId: 'price_1SQl4vHK7zocq1de36HgckbG',
    productId: 'prod_TNW6m6NXaBCtCj',
  },
} as const

// Helper function to check if we're in test mode (runtime check)
function isTestMode(): boolean {
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
// For client components, this will default to test mode
// For server components/API routes, this will use the actual STRIPE_SECRET_KEY
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
  const plans = getStripePlans()
  return plans[planId as PlanId] || null
}

