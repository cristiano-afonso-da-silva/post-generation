export const STRIPE_PLANS = {
  'plan-10': {
    id: 'plan-10',
    name: 'Basic Plan',
    price: 10,
    credits: 10,
    priceId: 'price_1SQl4rHK7zocq1deIIFdiAHb',
    productId: 'prod_TNW6s5tgNWdads',
  },
  'plan-20': {
    id: 'plan-20',
    name: 'Pro Plan',
    price: 20,
    credits: 20,
    priceId: 'price_1SQl4tHK7zocq1deDUeN8h4c',
    productId: 'prod_TNW6g9hABzsSRb',
  },
  'plan-50': {
    id: 'plan-50',
    name: 'Business Plan',
    price: 50,
    credits: 50,
    priceId: 'price_1SQl4uHK7zocq1decjSxbUMB',
    productId: 'prod_TNW6K7MnAsF78B',
  },
  'plan-100': {
    id: 'plan-100',
    name: 'Enterprise Plan',
    price: 100,
    credits: 100,
    priceId: 'price_1SQl4vHK7zocq1de36HgckbG',
    productId: 'prod_TNW6m6NXaBCtCj',
  },
} as const

export type PlanId = keyof typeof STRIPE_PLANS

export function getPlanByPriceId(priceId: string): typeof STRIPE_PLANS[PlanId] | null {
  for (const plan of Object.values(STRIPE_PLANS)) {
    if (plan.priceId === priceId) {
      return plan
    }
  }
  return null
}

export function getPlanById(planId: string): typeof STRIPE_PLANS[PlanId] | null {
  return STRIPE_PLANS[planId as PlanId] || null
}

