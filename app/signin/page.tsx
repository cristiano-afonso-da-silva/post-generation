'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import '../globals.css'

export default function SignInPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        router.push('/')
      }
    } catch (error: any) {
      setError(error.message || 'Failed to sign in')
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
        <Link href="/landing" style={{ display: 'inline-block', marginBottom: '32px' }}>
          <span style={{ fontSize: '24px', fontWeight: '700', color: '#000000' }}>← Post Generator</span>
        </Link>

        <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#000000' }}>
          Welcome back
        </h1>
        <p style={{ color: '#666666', marginBottom: '32px', fontSize: '15px' }}>
          Sign in to your account to continue
        </p>

        <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            />
          </div>

          <button type="submit" disabled={isLoading} className="button" style={{ width: '100%', marginTop: '8px' }}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <p style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#666666' }}>
          Don't have an account?{' '}
          <Link href="/signup" style={{ color: '#ffbd59', fontWeight: '600' }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  )
}
