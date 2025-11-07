'use client'

import SubscriptionModal from './SubscriptionModal'
import { useState } from 'react'

interface UpgradePromptProps {
  isOpen: boolean
  onClose: () => void
  currentPlan: string | null
}

export default function UpgradePrompt({ isOpen, onClose, currentPlan }: UpgradePromptProps) {
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)

  if (!isOpen) return null

  return (
    <>
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
              You've used all your free credits. Subscribe to a plan to continue generating carousels!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={onClose}
              className="button secondary"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              Maybe Later
            </button>
            <button
              onClick={() => {
                setShowSubscriptionModal(true)
                onClose()
              }}
              className="button"
              style={{ padding: '12px 24px', fontSize: '14px' }}
            >
              View Plans
            </button>
          </div>
        </div>
      </div>

      {showSubscriptionModal && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          currentPlan={currentPlan}
        />
      )}
    </>
  )
}

