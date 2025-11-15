'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false
  
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
  
  // Check if it's a mobile device by user agent (most reliable)
  const isMobileByUserAgent = mobileRegex.test(userAgent)
  
  // Check screen width - consider mobile if very small screen
  // Use a lower threshold to avoid catching small desktop windows
  const isMobileByWidth = window.innerWidth <= 640
  
  // Check for tablet devices (iPad, Android tablets) which might have larger screens
  const isTablet = /iPad|Android/i.test(userAgent) && !/Mobile/i.test(userAgent)
  
  // Consider it mobile if:
  // 1. User agent indicates mobile device, OR
  // 2. Very small screen (likely phone), OR
  // 3. Tablet device
  return isMobileByUserAgent || isMobileByWidth || isTablet
}

export default function DesktopOnlyPage() {
  const router = useRouter()
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    // Check if mobile on client side
    const mobile = isMobileDevice()
    setIsMobile(mobile)
    setIsChecking(false)

    if (!mobile) {
      // If desktop, redirect to signup
      router.replace('/signup')
      return
    }

    // If mobile, prevent scrolling on body
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    
    // Prevent any interaction
    document.body.style.pointerEvents = 'none'
    
    return () => {
      // Restore scrolling when component unmounts
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
      document.body.style.pointerEvents = ''
    }
  }, [router])

  // Don't render anything while checking or if desktop
  if (isChecking || !isMobile) {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        overflow: 'hidden',
        userSelect: 'none',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      <Image 
        src="/logo.svg" 
        alt="Post My Note logo" 
        width={80} 
        height={80} 
        priority 
        style={{
          width: 'clamp(60px, 12vw, 80px)',
          height: 'clamp(60px, 12vw, 80px)',
          marginBottom: '32px',
        }}
      />
      <h1
        style={{
          fontSize: 'clamp(24px, 4vw, 48px)',
          fontWeight: '700',
          color: '#000000',
          marginBottom: '16px',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        Post My Note is desktop only for now
      </h1>
      <p
        style={{
          fontSize: 'clamp(16px, 2vw, 24px)',
          color: '#666666',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        Please switch to a computer to continue
      </p>
    </div>
  )
}

