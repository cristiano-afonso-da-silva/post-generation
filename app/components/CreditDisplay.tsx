'use client'

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import SubscriptionModal from './SubscriptionModal'

interface CreditDisplayProps {
  credits: number
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | null
  currentPlan: string | null
}

export default function CreditDisplay({ credits, subscriptionStatus, currentPlan }: CreditDisplayProps) {
  const [showModal, setShowModal] = useState(false)

  const { user } = useAuth()

  const handleManageSubscription = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error opening customer portal:', error)
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px 16px',
          background: subscriptionStatus === 'active' ? '#f0f9ff' : '#f5f5f5',
          borderRadius: '8px',
          border: subscriptionStatus === 'active' ? '1px solid #3b82f6' : '1px solid #e5e5e5'
        }}>
          <span style={{ 
            fontSize: '14px', 
            fontWeight: '600', 
            color: subscriptionStatus === 'active' ? '#3b82f6' : '#666666' 
          }}>
            {credits} {credits === 1 ? 'Credit' : 'Credits'}
          </span>
          {subscriptionStatus === 'active' && (
            <span style={{ 
              fontSize: '11px', 
              padding: '2px 6px',
              background: '#3b82f6',
              color: '#ffffff',
              borderRadius: '4px',
              fontWeight: '600',
              textTransform: 'uppercase'
            }}>
              Pro
            </span>
          )}
        </div>
        
        {subscriptionStatus === 'active' ? (
          <button
            onClick={handleManageSubscription}
            className="button secondary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Manage
          </button>
        ) : (
          <button
            onClick={() => setShowModal(true)}
            className="button"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Upgrade
          </button>
        )}
      </div>

      {showModal && (
        <SubscriptionModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          currentPlan={currentPlan}
        />
      )}
    </>
  )
}

