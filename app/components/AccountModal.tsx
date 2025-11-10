'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import SubscriptionModal from './SubscriptionModal'
import { getPlanById } from '../config/stripeConfig'

interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  credits: number
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | null
  currentPlan: string | null
}

export default function AccountModal({ 
  isOpen, 
  onClose, 
  credits, 
  subscriptionStatus, 
  currentPlan 
}: AccountModalProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  if (!isOpen) return null

  // Get user initial from email
  const getInitial = (email: string | undefined) => {
    if (!email) return 'U'
    const parts = email.split('@')[0]
    return parts.substring(0, 1).toUpperCase()
  }

  // Get user name from email (first part before @)
  const getUserName = (email: string | undefined) => {
    if (!email) return 'User'
    const parts = email.split('@')[0]
    // Capitalize first letter and format nicely
    return parts.charAt(0).toUpperCase() + parts.slice(1) + "'s Account"
  }

  // Get total credits from plan
  const plan = currentPlan ? getPlanById(currentPlan) : null
  const totalCredits = plan?.credits || 0
  // Ensure credits is a number, default to 0
  const creditsValue = typeof credits === 'number' && !isNaN(credits) ? credits : 0
  const creditsUsed = totalCredits > 0 ? totalCredits - creditsValue : 0
  const creditsPercentage = totalCredits > 0 ? (creditsValue / totalCredits) * 100 : 0

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

  const handleSignOut = async () => {
    await signOut()
    onClose()
    router.push('/')
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
        zIndex: 9999,
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
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '2px solid #e5e5e5',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#000000', margin: 0 }}>
              Account
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

          {/* User Info Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: subscriptionStatus === 'active' ? '#ffbd59' : '#e5e5e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '2px solid',
                borderColor: subscriptionStatus === 'active' ? '#ffbd59' : '#e5e5e5',
              }}
            >
              <span style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                color: subscriptionStatus === 'active' ? '#000000' : '#000000',
                userSelect: 'none'
              }}>
                {getInitial(user?.email)}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: '700', 
                color: '#000000',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {getUserName(user?.email)}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '400', 
                color: '#666666',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user?.email}
              </div>
            </div>
            {subscriptionStatus === 'active' && plan && (
              <div style={{ 
                fontSize: '11px', 
                padding: '4px 10px',
                background: '#ffbd59',
                color: '#000000',
                borderRadius: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                flexShrink: 0,
              }}>
                {plan.name.toUpperCase()}
              </div>
            )}
          </div>

          {/* Credits Section */}
          <div 
            onClick={() => setShowSubscriptionModal(true)}
            style={{ 
              marginBottom: '24px',
              cursor: 'pointer',
            }}
          >
            {totalCredits > 0 ? (
              <div 
                style={{
                  background: subscriptionStatus === 'active' ? '#fff8e6' : '#f5f5f5',
                  borderRadius: '12px',
                  padding: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = subscriptionStatus === 'active' ? '#ffe8b3' : '#e5e5e5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = subscriptionStatus === 'active' ? '#fff8e6' : '#f5f5f5'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: '#666666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px'
                    }}>
                      Credits Remaining
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'baseline', 
                      gap: '8px'
                    }}>
                      <span style={{ 
                        fontSize: '32px', 
                        fontWeight: '700', 
                        color: subscriptionStatus === 'active' ? '#ffbd59' : '#000000',
                        lineHeight: '1'
                      }}>
                        {Math.round(creditsValue)}
                      </span>
                      <span style={{ 
                        fontSize: '16px', 
                        fontWeight: '500', 
                        color: '#666666'
                      }}>
                        / {totalCredits}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#666666',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}>
                    <span>View details</span>
                    <span style={{ fontSize: '12px' }}>→</span>
                  </div>
                </div>
                
                <div style={{ 
                  width: '100%',
                  height: '10px',
                  background: '#e5e5e5',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                <div style={{ 
                  width: `${Math.min(Math.max(creditsPercentage, 0), 100)}%`,
                  height: '100%',
                  background: subscriptionStatus === 'active' ? '#ffbd59' : '#666666',
                  borderRadius: '5px',
                  transition: 'width 0.3s ease',
                }} />
                </div>
              </div>
            ) : (
              <div 
                style={{ 
                  padding: '24px',
                  background: '#f5f5f5',
                  borderRadius: '12px',
                  textAlign: 'center',
                  position: 'relative',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e5e5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f5f5f5'
                }}
              >
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#666666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Free Credits
                </div>
                <div style={{ 
                  fontSize: '36px', 
                  fontWeight: '700', 
                  color: '#000000',
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {creditsValue}
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#666666',
                }}>
                  remaining
                </div>
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#666666',
                  fontSize: '14px',
                  fontWeight: '500',
                }}>
                  <span>Upgrade</span>
                  <span style={{ fontSize: '12px' }}>→</span>
                </div>
              </div>
            )}
          </div>

          {/* Feedback Section */}
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => window.location.href = 'mailto:hello@postmynote.app?subject=Feedback'}
              className="button secondary"
              style={{ 
                width: '100%',
                padding: '12px 24px', 
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Feedback
            </button>
          </div>

          {/* Sign Out Section */}
          <div>
            <button
              onClick={handleSignOut}
              className="button secondary"
              style={{ 
                width: '100%',
                padding: '12px 24px', 
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
    </div>
  )

  // Use portal to render modal at document body level
  if (typeof window !== 'undefined') {
    return (
      <>
        {createPortal(modalContent, document.body)}
        {showSubscriptionModal && (
          <SubscriptionModal
            isOpen={showSubscriptionModal}
            onClose={() => {
              setShowSubscriptionModal(false)
            }}
            currentPlan={currentPlan}
            credits={credits}
            subscriptionStatus={subscriptionStatus}
          />
        )}
      </>
    )
  }
  
  return null
}

