'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import '../globals.css'

export default function LandingPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

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
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      {/* Navigation */}
      <nav style={{
        borderBottom: '2px solid #e5e5e5',
        padding: '24px 0',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#000000', letterSpacing: '-0.5px' }}>
            Post Generator
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link
              href="/signin"
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: '2px solid #e5e5e5',
                background: '#ffffff',
                color: '#000000',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
              }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                background: '#ffbd59',
                color: '#000000',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '120px 24px 80px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 96px)',
          fontWeight: '700',
          marginBottom: '24px',
          lineHeight: '1.1',
          letterSpacing: '-2px',
          color: '#000000',
        }}>
          Generate Carousels
          <br />
          <span style={{ color: '#ffbd59' }}>Instantly</span>
        </h1>
        <p style={{
          fontSize: 'clamp(18px, 2vw, 24px)',
          color: '#666666',
          marginBottom: '48px',
          maxWidth: '600px',
          margin: '0 auto 48px',
          lineHeight: '1.6',
        }}>
          AI-powered carousel generation for Instagram. Create engaging posts in seconds.
        </p>
        <Link
          href="/signup"
          className="button"
          style={{
            textDecoration: 'none',
            display: 'inline-block',
            fontSize: '18px',
            padding: '20px 48px',
          }}
        >
          Start Creating →
        </Link>
      </div>

      {/* Features */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 24px',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
        }}>
          <div className="card">
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ffbd59',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              fontSize: '24px',
            }}>
              ✨
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#000000' }}>
              AI-Powered
            </h3>
            <p style={{ color: '#666666', lineHeight: '1.6', fontSize: '15px' }}>
              Advanced AI generates compelling content tailored to your audience
            </p>
          </div>

          <div className="card">
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ffbd59',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              fontSize: '24px',
            }}>
              🎨
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#000000' }}>
              Customizable
            </h3>
            <p style={{ color: '#666666', lineHeight: '1.6', fontSize: '15px' }}>
              Multiple themes and fonts to match your brand perfectly
            </p>
          </div>

          <div className="card">
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: '#ffbd59',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              fontSize: '24px',
            }}>
              ⚡
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#000000' }}>
              Instant Export
            </h3>
            <p style={{ color: '#666666', lineHeight: '1.6', fontSize: '15px' }}>
              Download ready-to-post images in seconds
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: '80px 24px',
        textAlign: 'center',
      }}>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: '700',
          marginBottom: '16px',
          color: '#000000',
        }}>
          Ready to create?
        </h2>
        <p style={{ fontSize: '18px', color: '#666666', marginBottom: '32px' }}>
          Join thousands of creators making amazing content
        </p>
        <Link
          href="/signup"
          className="button"
          style={{
            textDecoration: 'none',
            display: 'inline-block',
            fontSize: '18px',
            padding: '20px 48px',
          }}
        >
          Sign Up Free
        </Link>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '2px solid #e5e5e5',
        padding: '32px 24px',
        textAlign: 'center',
        color: '#999999',
        fontSize: '14px',
      }}>
        © 2025 Post Generator. All rights reserved.
      </footer>
    </div>
  )
}
