'use client'

import { useEffect } from 'react'

export default function DesktopOnlyPage() {
  useEffect(() => {
    // Prevent scrolling on body
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
  }, [])

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

