'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { STRIPE_PLANS, getPlanById } from '../config/stripeConfig'
import { loadStripe } from '@stripe/stripe-js'

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: string | null
  credits?: number
  subscriptionStatus?: 'active' | 'canceled' | 'past_due' | null
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function SubscriptionModal({ 
  isOpen, 
  onClose, 
  currentPlan, 
  credits: creditsProp,
  subscriptionStatus: subscriptionStatusProp
}: SubscriptionModalProps) {
  const { user, credits: creditsFromContext } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)
  const [renewalDate, setRenewalDate] = useState<number | null>(null)

  // Use props if provided, otherwise fall back to context
  const credits = creditsProp ?? creditsFromContext?.credits_remaining ?? 0
  const subscriptionStatus = subscriptionStatusProp ?? creditsFromContext?.subscription_status ?? null

  // Fetch renewal date from Stripe
  useEffect(() => {
    if (isOpen && user?.id && subscriptionStatus === 'active') {
      fetch(`/api/stripe/subscription-renewal?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.renewalDate) {
            setRenewalDate(data.renewalDate)
          }
        })
        .catch(err => console.error('Error fetching renewal date:', err))
    }
  }, [isOpen, user?.id, subscriptionStatus])

  if (!isOpen) return null

  // Get current plan details
  const plan = currentPlan ? getPlanById(currentPlan) : null
  const totalCredits = plan?.credits || 0
  // Ensure credits is a number, default to 0
  const creditsValue = typeof credits === 'number' && !isNaN(credits) ? credits : 0
  const creditsPercentage = totalCredits > 0 ? (creditsValue / totalCredits) * 100 : 0

  // Format renewal date from Stripe timestamp
  const getRenewalDate = () => {
    if (renewalDate) {
      const date = new Date(renewalDate * 1000)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    return null
  }

  const handleManageSubscription = async () => {
    if (!user?.id) {
      console.error('[Manage Subscription] Error: No user ID found', { user })
      return
    }
    
    try {
      console.log('[Manage Subscription] Starting request', { userId: user.id })
      
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      console.log('[Manage Subscription] Response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { raw: errorText }
        }
        
        console.error('[Manage Subscription] API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: response.url,
        })
        
        alert(`Failed to open customer portal: ${errorData.error || response.statusText || 'Unknown error'}`)
        return
      }

      const data = await response.json()
      console.log('[Manage Subscription] Success response:', { data })
      
      if (data.url) {
        console.log('[Manage Subscription] Redirecting to:', data.url)
        window.location.href = data.url
      } else {
        console.error('[Manage Subscription] No URL in response:', { data })
        alert('Failed to open customer portal: No URL returned')
      }
    } catch (error: any) {
      console.error('[Manage Subscription] Network/Parse Error:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        cause: error?.cause,
        error: error,
      })
      alert(`Failed to open customer portal: ${error?.message || 'Network error'}`)
    }
  }

  const handleSubscribe = async (planId: keyof typeof STRIPE_PLANS) => {
    if (!user) return

    setLoading(planId)

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: STRIPE_PLANS[planId].priceId,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Checkout error:', errorData)
        alert(`Failed to start checkout: ${errorData.error || 'Please try again'}`)
        setLoading(null)
        return
      }

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned:', data)
        alert('Failed to start checkout. Please try again.')
        setLoading(null)
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      alert(`Failed to start checkout: ${error.message || 'Please try again'}`)
      setLoading(null)
    }
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px',
        overflow: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '32px',
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          border: '2px solid #e5e5e5',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#000000', margin: 0 }}>
            Manage Your Plan
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666666',
              padding: '0',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            ×
          </button>
        </div>

        {/* Top Row - Two Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '20px', 
          marginBottom: '32px' 
        }}>
          {/* Left Card: Current Plan */}
          {subscriptionStatus === 'active' && plan ? (
            <div style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              border: '2px solid #e5e5e5',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#000000', marginBottom: '4px' }}>
                  You're on {plan.name} Plan
                </div>
                {getRenewalDate() && (
                  <div style={{ fontSize: '14px', color: '#666666' }}>
                    Renews {getRenewalDate()}
                  </div>
                )}
              </div>
              <button
                onClick={handleManageSubscription}
                className="button secondary"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Manage
              </button>
            </div>
          ) : (
            <div style={{
              background: '#f5f5f5',
              borderRadius: '12px',
              padding: '24px',
              border: '2px solid #e5e5e5',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#666666' }}>
                No active subscription
              </div>
            </div>
          )}

          {/* Right Card: Credits Remaining */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '24px',
            border: '2px solid #e5e5e5',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}>
            {totalCredits > 0 ? (
              <>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000000', margin: 0 }}>
                  Credits remaining
                </h3>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{
                    fontSize: '32px',
                    fontWeight: '700',
                    color: '#ffbd59',
                    lineHeight: '1',
                  }}>
                    {Math.round(creditsValue)}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: '500', color: '#666666' }}>
                    / {totalCredits}
                  </span>
                </div>
                <div style={{
                  width: '100%',
                  height: '10px',
                  background: '#e5e5e5',
                  borderRadius: '5px',
                  overflow: 'hidden',
                }}>
                <div style={{
                  width: `${Math.min(Math.max(creditsPercentage, 0), 100)}%`,
                  height: '100%',
                  background: '#ffbd59',
                  borderRadius: '5px',
                  transition: 'width 0.3s ease',
                }} />
                </div>
                {subscriptionStatus === 'active' && getRenewalDate() && (
                  <div style={{ fontSize: '13px', color: '#666666', marginTop: '4px' }}>
                    Credits renew on {getRenewalDate()}
                  </div>
                )}
              </>
            ) : (
              <>
                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000000', margin: 0 }}>
                  Credits remaining
                </h3>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#000000', textAlign: 'center' }}>
                  {creditsValue}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Bottom Row - Plan Cards */}
        <div className="plans-grid" style={{ marginTop: '32px' }}>
          {Object.values(STRIPE_PLANS).map((planItem) => {
            const isCurrentPlan = currentPlan === planItem.id
            const isLoading = loading === planItem.id

            // Determine button text based on plan comparison
            const getButtonText = () => {
              if (isLoading) return 'Loading...'
              if (!currentPlan) return 'Subscribe'
              
              const currentPlanDetails = getPlanById(currentPlan)
              if (!currentPlanDetails) return 'Subscribe'
              
              // Compare prices to determine if it's an upgrade or downgrade
              if (planItem.price > currentPlanDetails.price) {
                return 'Upgrade'
              } else if (planItem.price < currentPlanDetails.price) {
                return 'Downgrade'
              } else {
                return 'Subscribe'
              }
            }

            // Determine if this is a downgrade
            const isDowngrade = () => {
              if (!currentPlan) return false
              const currentPlanDetails = getPlanById(currentPlan)
              if (!currentPlanDetails) return false
              return planItem.price < currentPlanDetails.price
            }

            return (
              <div
                key={planItem.id}
                style={{
                  border: isCurrentPlan ? '2px solid #ffbd59' : '2px solid #e5e5e5',
                  borderRadius: '12px',
                  padding: '24px',
                  background: isCurrentPlan ? '#fff8e6' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '4px' }}>
                    {planItem.name}
                  </h3>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#000000' }}>
                    ${planItem.price}
                    <span style={{ fontSize: '16px', fontWeight: '400', color: '#666666' }}>/mo</span>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: '#666666', marginBottom: '8px' }}>
                    {planItem.credits} credits per month
                  </div>
                </div>

                {isCurrentPlan ? (
                  <div
                    style={{
                      padding: '12px',
                      color: '#000000',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '14px',
                    }}
                  >
                    Current Plan
                  </div>
                ) : isDowngrade() ? (
                  // Don't show button for downgrade options
                  null
                ) : (
                  <button
                    onClick={() => handleSubscribe(planItem.id)}
                    disabled={isLoading}
                    className="button"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    {getButtonText()}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  // Use portal to render modal at document body level
  if (typeof window !== 'undefined') {
    return createPortal(modalContent, document.body)
  }
  
  return null
}

