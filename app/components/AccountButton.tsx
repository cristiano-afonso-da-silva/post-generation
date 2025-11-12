'use client'

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import AccountModal from './AccountModal'

interface AccountButtonProps {
  credits: number
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | null
  currentPlan: string | null
}

export default function AccountButton({ credits, subscriptionStatus, currentPlan }: AccountButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const { user } = useAuth()

  // Get user initial from email
  const getInitial = (email: string | undefined) => {
    if (!email) return 'U'
    const parts = email.split('@')[0]
    return parts.substring(0, 1).toUpperCase()
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="account-button"
        aria-label="Account menu"
      >
        <span style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          color: '#000000',
          userSelect: 'none'
        }}>
          {getInitial(user?.email)}
        </span>
      </button>

      {showModal && (
        <AccountModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          credits={credits}
          subscriptionStatus={subscriptionStatus}
          currentPlan={currentPlan}
        />
      )}
    </>
  )
}

