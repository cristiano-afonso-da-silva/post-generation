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
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: '#e5e5e5',
          border: '2px solid #e5e5e5',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          padding: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = '0.9'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = '1'
        }}
        aria-label="Account menu"
      >
        <span style={{ 
          fontSize: '16px', 
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

