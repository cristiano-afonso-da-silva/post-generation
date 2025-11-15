'use client'

import { createPortal } from 'react-dom'

interface UpgradePromptProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: string | null
  onViewPlans?: () => void
}

export default function UpgradePrompt({ isOpen, onClose, currentPlan, onViewPlans }: UpgradePromptProps) {
  if (!isOpen) return null

  const handleViewPlans = () => {
    onClose() // Close the UpgradePrompt first
    if (onViewPlans) {
      onViewPlans() // Then open the SubscriptionModal in the parent
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
        zIndex: 9998,
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
            textAlign: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#000000', marginBottom: '8px' }}>
              Out of Credits
            </h2>
            <p style={{ fontSize: '15px', color: '#666666', lineHeight: '1.6' }}>
              You've used all your free credits. Subscribe to a plan to continue generating notes!
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <button
              onClick={handleViewPlans}
              className="button"
              style={{ padding: '18px 36px', fontSize: '18px' }}
            >
              View Plans
            </button>
            <a
              onClick={onClose}
              style={{
                color: '#666666',
                fontSize: '14px',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'color 0.3s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#000000'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#666666'}
            >
              Maybe Later
            </a>
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

