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
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify`,
        },
      })

      if (error) throw error

      if (data.user) {
        sessionStorage.setItem('verificationEmail', email)
        router.push('/verify')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to sign up')
    } finally {
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
        <Link href="/" style={{ display: 'inline-block', marginBottom: '32px' }}>
          <span style={{ fontSize: '24px', fontWeight: '700', color: '#000000' }}>← Post My Note</span>
        </Link>

        <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#000000' }}>
          Create account
        </h1>
        <p style={{ color: '#666666', marginBottom: '32px', fontSize: '15px' }}>
          Start creating amazing content today
        </p>

        <form onSubmit={handleSignUp} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && <div className="error">{error}</div>}

          <div>
            <label htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000000', marginBottom: '8px' }}>
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

          <div>
            <label htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000000', marginBottom: '8px' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
              placeholder="••••••••"
              autoComplete="new-password"
            />
            <p style={{ marginTop: '4px', fontSize: '12px', color: '#999999' }}>
              Must be at least 6 characters
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000000', marginBottom: '8px' }}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="input"
              placeholder="••••••••"
              autoComplete="new-password"
            />
          </div>

          <button type="submit" disabled={isLoading} className="button" style={{ width: '100%', marginTop: '8px' }}>
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#666666' }}>
          Already have an account?{' '}
          <Link href="/signin" style={{ color: '#ffbd59', fontWeight: '600' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
