'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HistoryRedirect() {
  const router = useRouter()
  
  useEffect(() => {
    router.replace('/dashboard?view=history')
  }, [router])
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
    }}>
      <div className="spinner" style={{ width: '48px', height: '48px' }}></div>
    </div>
  )
}
