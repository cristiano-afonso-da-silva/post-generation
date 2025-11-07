'use client'

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { STRIPE_PLANS } from '../config/stripeConfig'
import { loadStripe } from '@stripe/stripe-js'

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: string | null
}

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export default function SubscriptionModal({ isOpen, onClose, currentPlan }: SubscriptionModalProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState<string | null>(null)

  if (!isOpen) return null

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

      const { url } = await response.json()

      if (url) {
        const stripe = await stripePromise
        if (stripe) {
          window.location.href = url
        }
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
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
        zIndex: 1000,
        padding: '20px',
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
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#000000' }}>
            Choose Your Plan
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
            }}
          >
            ×
          </button>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px' 
        }}>
          {Object.values(STRIPE_PLANS).map((plan) => {
            const isCurrentPlan = currentPlan === plan.id
            const isLoading = loading === plan.id

            return (
              <div
                key={plan.id}
                style={{
                  border: isCurrentPlan ? '2px solid #3b82f6' : '2px solid #e5e5e5',
                  borderRadius: '12px',
                  padding: '24px',
                  background: isCurrentPlan ? '#f0f9ff' : '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}
              >
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '4px' }}>
                    {plan.name}
                  </h3>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#000000' }}>
                    ${plan.price}
                    <span style={{ fontSize: '16px', fontWeight: '400', color: '#666666' }}>/mo</span>
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: '#666666', marginBottom: '8px' }}>
                    {plan.credits} credits per month
                  </div>
                </div>

                {isCurrentPlan ? (
                  <div
                    style={{
                      padding: '12px',
                      background: '#3b82f6',
                      color: '#ffffff',
                      borderRadius: '8px',
                      textAlign: 'center',
                      fontWeight: '600',
                      fontSize: '14px',
                    }}
                  >
                    Current Plan
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={isLoading}
                    className="button"
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontSize: '14px',
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    {isLoading ? 'Loading...' : 'Subscribe'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: '24px', padding: '16px', background: '#f5f5f5', borderRadius: '8px' }}>
          <p style={{ fontSize: '13px', color: '#666666', margin: 0, lineHeight: '1.6' }}>
            All plans include monthly credits that renew automatically. Credits do not roll over to the next month.
            Cancel anytime from your account settings.
          </p>
        </div>
      </div>
    </div>
  )
}

