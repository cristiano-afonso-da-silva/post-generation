'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import '../globals.css'

export default function VerifyPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)

  useEffect(() => {
    // Get email from session storage
    const storedEmail = sessionStorage.getItem('verificationEmail')
    if (storedEmail) {
      setEmail(storedEmail)
    }
  }, [])

  useEffect(() => {
    // If user is already verified, redirect to home
    if (!loading && user && user.email_confirmed_at) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'signup',
      })

      if (error) throw error

      if (data.user) {
        setSuccess('Email verified successfully! Redirecting...')
        sessionStorage.removeItem('verificationEmail')
        setTimeout(() => {
          router.push('/')
        }, 2000)
      }
    } catch (error: any) {
      setError(error.message || 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendCode = async () => {
    if (!email) {
      setError('Email not found. Please sign up again.')
      return
    }

    setError('')
    setSuccess('')
    setIsResending(true)

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) throw error

      setSuccess('Verification code sent! Check your email.')
    } catch (error: any) {
      setError(error.message || 'Failed to resend code')
    } finally {
      setIsResending(false)
    }
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
        {/* Logo/Title */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 className="gradient-text" style={{
            fontSize: '48px',
            fontWeight: '800',
            marginBottom: '8px',
          }}>
            Verify Your Email
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: '1.5' }}>
            We sent a verification code to
            <br />
            <span style={{ color: '#ffffff', fontWeight: '600' }}>{email}</span>
          </p>
        </div>

        {/* Verification Form */}
        <div className="card">
          <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {error && (
              <div className="error">
                ❌ {error}
              </div>
            )}

            {success && (
              <div style={{
                padding: '16px',
                borderRadius: '12px',
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22c55e',
                fontSize: '14px',
              }}>
                ✅ {success}
              </div>
            )}

            <div>
              <label htmlFor="code" style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '600',
                color: 'rgba(255,255,255,0.8)',
                marginBottom: '8px',
              }}>
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.trim())}
                required
                maxLength={6}
                className="input"
                placeholder="000000"
                style={{
                  textAlign: 'center',
                  fontSize: '24px',
                  letterSpacing: '8px',
                  fontFamily: 'monospace',
                }}
              />
              <p style={{ marginTop: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                Enter the 6-digit code from your email
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || verificationCode.length !== 6}
              className="button"
              style={{ width: '100%' }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                  Verifying...
                </span>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          {/* Resend Code */}
          <div style={{ marginTop: '24px', textAlign: 'center' }}>
            <button
              onClick={handleResendCode}
              disabled={isResending}
              style={{
                background: 'none',
                border: 'none',
                color: '#667eea',
                fontSize: '14px',
                cursor: isResending ? 'not-allowed' : 'pointer',
                opacity: isResending ? 0.5 : 1,
                fontWeight: '600',
                textDecoration: 'underline',
              }}
            >
              {isResending ? 'Sending...' : "Didn't receive the code? Resend"}
            </button>
          </div>

          {/* Links */}
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
            Wrong email?{' '}
            <Link href="/signup" style={{
              color: '#667eea',
              textDecoration: 'none',
              fontWeight: '600',
            }}>
              Sign Up Again
            </Link>
          </div>
        </div>

        {/* Back to Sign In */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <Link href="/signin" style={{
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'none',
            fontSize: '14px',
          }}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
