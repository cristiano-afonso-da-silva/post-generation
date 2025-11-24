'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'

export default function AccountButton() {
  const router = useRouter()
  const { user } = useAuth()

  // Get user initial from email
  const getInitial = (email: string | undefined) => {
    if (!email) return 'U'
    const parts = email.split('@')[0]
    return parts.substring(0, 1).toUpperCase()
  }

  return (
    <button
      onClick={() => router.push('/account')}
      className="account-button"
      aria-label="Account settings"
    >
      <span style={{ 
        fontSize: '12px', 
        fontWeight: '600', 
        color: '#000000',
        userSelect: 'none'
      }}>
        {getInitial(user?.email)}
      </span>
    </button>
  )
}

