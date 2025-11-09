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

