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
    const storedEmail = sessionStorage.getItem('verificationEmail')
    if (storedEmail) {
      setEmail(storedEmail)
    }
  }, [])

  useEffect(() => {
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
        setSuccess('Email verified! Redirecting...')
        sessionStorage.removeItem('verificationEmail')
        setTimeout(() => router.push('/'), 2000)
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
        <Link href="/" style={{ display: 'inline-block', marginBottom: '32px' }}>
          <span style={{ fontSize: '24px', fontWeight: '700', color: '#000000' }}>← Post My Note</span>
        </Link>

        <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#000000' }}>
          Verify your email
        </h1>
        <p style={{ color: '#666666', marginBottom: '32px', fontSize: '15px', lineHeight: '1.6' }}>
          We sent a verification code to<br />
          <span style={{ color: '#000000', fontWeight: '600' }}>{email}</span>
        </p>

        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <div>
            <label htmlFor="code" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000000', marginBottom: '8px' }}>
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
            <p style={{ marginTop: '8px', fontSize: '12px', color: '#999999', textAlign: 'center' }}>
              Enter the 6-digit code from your email
            </p>
          </div>

          <button type="submit" disabled={isLoading || verificationCode.length !== 6} className="button" style={{ width: '100%', marginTop: '8px' }}>
            {isLoading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={handleResendCode}
            disabled={isResending}
            style={{
              background: 'none',
              border: 'none',
              color: '#666666',
              fontSize: '14px',
              cursor: isResending ? 'not-allowed' : 'pointer',
              opacity: isResending ? 0.5 : 1,
              textDecoration: 'underline',
            }}
          >
            {isResending ? 'Sending...' : "Didn't receive code? Resend"}
          </button>
        </div>
      </div>
    </div>
  )
}
