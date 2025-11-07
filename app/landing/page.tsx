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
    <div style={{ minHeight: '100vh', color: '#ffffff' }}>
      {/* Navigation */}
      <nav style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div className="gradient-text" style={{ fontSize: '28px', fontWeight: '800' }}>
          AI Post Generator
        </div>
        <div style={{ display: 'flex', gap: '16px' }}>
          <Link
            href="/signin"
            style={{
              padding: '12px 24px',
              borderRadius: '12px',
              border: '2px solid rgba(102, 126, 234, 0.5)',
              background: 'transparent',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              display: 'inline-block',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(102, 126, 234, 0.1)'
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.8)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.borderColor = 'rgba(102, 126, 234, 0.5)'
            }}
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="button"
            style={{
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container" style={{ textAlign: 'center', paddingTop: '60px', paddingBottom: '60px' }}>
        <h1 className="gradient-text" style={{
          fontSize: 'clamp(48px, 8vw, 96px)',
          fontWeight: '800',
          marginBottom: '24px',
          lineHeight: '1.1',
        }}>
          Create Stunning Carousel Posts
        </h1>
        <p style={{
          fontSize: 'clamp(18px, 2.5vw, 28px)',
          color: 'rgba(255,255,255,0.8)',
          marginBottom: '48px',
          maxWidth: '800px',
          margin: '0 auto 48px auto',
          lineHeight: '1.6',
        }}>
          Generate engaging social media carousels with AI-powered content and beautiful designs
        </p>
        <Link
          href="/signup"
          className="button"
          style={{
            textDecoration: 'none',
            display: 'inline-block',
            padding: '20px 48px',
            fontSize: '18px',
          }}
        >
          Start Creating Free
        </Link>
      </div>

      {/* Features */}
      <div className="container" style={{ paddingTop: '60px', paddingBottom: '60px' }}>
        <h2 className="gradient-text" style={{
          fontSize: 'clamp(36px, 5vw, 48px)',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '64px',
        }}>
          Why Choose Our Platform?
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
        }}>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🤖</div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: '#ffffff' }}>
              AI-Powered
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', lineHeight: '1.6' }}>
              Generate compelling content ideas and carousel posts using advanced AI technology
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎨</div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: '#ffffff' }}>
              Beautiful Designs
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', lineHeight: '1.6' }}>
              Choose from multiple font combinations and color themes to match your brand
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>⚡</div>
            <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: '#ffffff' }}>
              Instant Download
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '16px', lineHeight: '1.6' }}>
              Generate and download your carousel slides in seconds, ready to post
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="container" style={{ paddingTop: '60px', paddingBottom: '60px', textAlign: 'center' }}>
        <div className="card" style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '64px 32px',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)',
        }}>
          <h2 className="gradient-text" style={{
            fontSize: 'clamp(32px, 4vw, 48px)',
            fontWeight: '700',
            marginBottom: '16px',
          }}>
            Ready to Get Started?
          </h2>
          <p style={{
            fontSize: '20px',
            color: 'rgba(255,255,255,0.8)',
            marginBottom: '32px',
          }}>
            Join thousands of creators making amazing content
          </p>
          <Link
            href="/signup"
            className="button"
            style={{
              textDecoration: 'none',
              display: 'inline-block',
              padding: '20px 48px',
              fontSize: '18px',
            }}
          >
            Sign Up Now
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '32px 20px',
        textAlign: 'center',
        color: 'rgba(255,255,255,0.5)',
      }}>
        <p>© 2025 AI Post Generator. All rights reserved.</p>
      </footer>
    </div>
  )
}
