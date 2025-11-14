'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import '../globals.css'

export default function SignUpPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/verify`,
        },
      })

      if (error) throw error

      if (data) {
        sessionStorage.setItem('verificationEmail', email)
        router.push('/verify')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to sign up')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    setError('')
    setIsLoading(true)

    try {
      // Use custom domain for production, fallback to current origin for development
      const isProduction = typeof window !== 'undefined' && 
        (window.location.hostname === 'postmynote.app' || 
         window.location.hostname === 'www.postmynote.app')
      const redirectUrl = isProduction 
        ? 'https://postmynote.app/dashboard' 
        : `${window.location.origin}/dashboard`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || 'Failed to sign up with Google')
      setIsLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading">
          <div className="spinner"></div>
          <span style={{ color: '#000000' }}>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#ffffff' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <h3 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#000000', textAlign: 'left' }}>
          Log in
        </h3>
        <p style={{ color: '#666666', marginBottom: '32px', fontSize: '15px', textAlign: 'left' }}>
          Start creating on Post My Note today
        </p>

        {error && <div className="error" style={{ marginBottom: '20px' }}>{error}</div>}

        {!showEmailForm && (
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
            className="button"
            style={{
              width: '100%',
              background: '#ffffff',
              color: '#000000',
              border: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#f5f5f5'
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#ffffff'
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z"
                fill="#4285F4"
              />
              <path
                d="M9 18C11.43 18 13.467 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65455 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z"
                fill="#34A853"
              />
              <path
                d="M3.96409 10.71C3.78409 10.17 3.68182 9.59317 3.68182 9C3.68182 8.40683 3.78409 7.83 3.96409 7.29V4.95817H0.957273C0.347727 6.17317 0 7.54772 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z"
                fill="#FBBC05"
              />
              <path
                d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65455 3.57955 9 3.57955Z"
                fill="#EA4335"
              />
            </svg>
            {isLoading ? 'Signing Up...' : 'Continue with Google'}
          </button>
        )}

        {!showEmailForm ? (
          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            disabled={isLoading}
            className="button"
            style={{
              width: '100%',
              marginTop: '20px',
              background: '#ffffff',
              color: '#000000',
              border: '1px solid #e0e0e0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#f5f5f5'
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = '#ffffff'
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 3H3C2.175 3 1.5 3.675 1.5 4.5V13.5C1.5 14.325 2.175 15 3 15H15C15.825 15 16.5 14.325 16.5 13.5V4.5C16.5 3.675 15.825 3 15 3ZM15 5.25L9 9.75L3 5.25V4.5L9 9L15 4.5V5.25Z"
                fill="#000000"
              />
            </svg>
            Continue with Email
          </button>
        ) : (
          <form onSubmit={handleSignUp} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
            <div>
              <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000000', marginBottom: '8px', textAlign: 'left' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="you@example.com"
                autoComplete="off"
                data-lpignore="true"
                data-1p-ignore="true"
              />
            </div>

            <button type="submit" disabled={isLoading} className="button" style={{ width: '100%', marginTop: '8px' }}>
              {isLoading ? 'Creating Account...' : 'Continue'}
            </button>
          </form>
        )}

        <div style={{ marginTop: '32px', textAlign: 'left', fontSize: '13px', color: '#666666', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            By continuing, you agree to Post My Note's{' '}
            <Link href="/terms" style={{ color: '#999999', textDecoration: 'none' }}>
              Terms of Service
            </Link>
            .
          </p>
          <p style={{ margin: '0' }}>
            Read our{' '}
            <Link href="/privacy" style={{ color: '#999999', textDecoration: 'none' }}>
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
