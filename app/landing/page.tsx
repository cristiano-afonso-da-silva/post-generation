'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import AccountButton from '../components/AccountButton'
import '../globals.css'

const platforms = ['Instagram', 'LinkedIn', 'Threads', 'X']

export default function LandingPage() {
  const router = useRouter()
  const { user, loading, credits } = useAuth()
  const [currentPlatform, setCurrentPlatform] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlatform((prev) => (prev + 1) % platforms.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  // Allow authenticated users to view the landing page if they navigate here explicitly
  // No auto-redirect - let users stay on landing page if they want

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
          <Link 
            href="/" 
            style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#000000', 
              letterSpacing: '-0.5px',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            Post My Note
          </Link>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {user ? (
              <AccountButton
                credits={credits?.credits_remaining ?? 0}
                subscriptionStatus={credits?.subscription_status ?? null}
                currentPlan={credits?.current_plan ?? null}
              />
            ) : (
              <Link
                href="/signup"
                className="nav-button"
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
            )}
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
          fontSize: 'clamp(36px, 6vw, 72px)',
          fontWeight: '700',
          marginBottom: '24px',
          lineHeight: '1.1',
          letterSpacing: '-2px',
          color: '#000000',
        }}>
          Generate <span style={{ color: '#ffbd59' }}>{platforms[currentPlatform]} Posts</span> in Seconds
        </h1>
        <p style={{
          fontSize: 'clamp(18px, 2vw, 24px)',
          color: '#666666',
          marginBottom: '48px',
          maxWidth: '600px',
          margin: '0 auto 48px',
          lineHeight: '1.6',
        }}>
          AI-powered content generation for social media. Create engaging posts that capture your audience.
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
          Start →
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
          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#ffbd59',
              transform: 'rotate(45deg)',
              marginBottom: '20px',
            }}>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#000000' }}>
              AI-Powered
            </h3>
            <p style={{ color: '#666666', lineHeight: '1.6', fontSize: '15px', marginBottom: '0', flexGrow: 1 }}>
              Our AI creates professional, engaging posts from a single line of text.
            </p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#ffbd59',
              marginBottom: '20px',
            }}>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#000000' }}>
              Customizable
            </h3>
            <p style={{ color: '#666666', lineHeight: '1.6', fontSize: '15px', marginBottom: '0', flexGrow: 1 }}>
              Edit themes, fonts, and colors to fit your brand style.
            </p>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
              width: '60px',
              height: '60px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="60" height="60" viewBox="0 0 62 62" style={{ display: 'block' }}>
                <path
                  d="M 10 10 Q 10 5 15 5 L 46 26 Q 52 31 46 36 L 15 57 Q 10 57 10 52 L 10 10 Z"
                  fill="#ffbd59"
                  rx="12"
                  ry="12"
                />
              </svg>
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#000000' }}>
              Instant Export
            </h3>
            <p style={{ color: '#666666', lineHeight: '1.6', fontSize: '15px', marginBottom: '0', flexGrow: 1 }}>
              Download ready-to-share images instantly — no design skills needed.
            </p>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 24px',
      }}>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '48px',
          color: '#000000',
          letterSpacing: '-1px',
        }}>
          See It In Action
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
        }}>
          <div className="card" style={{
            padding: '24px',
          }}>
            <div style={{
              width: '100%',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'center',
              background: '#f5f5f5',
            }}>
              <img
                src="/assets/examples/example1.png"
                alt="LeBron's UNSTOPPABLE workout example"
                style={{ width: '100%', height: 'auto', borderRadius: '12px', display: 'block' }}
              />
            </div>
            <div style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: '1.6',
            }}>
              <strong style={{ color: '#000000' }}>Example:</strong> Engaging headline with highlighted keywords and bold typography.
            </div>
          </div>

          <div className="card" style={{
            padding: '24px',
          }}>
            <div style={{
              width: '100%',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'center',
              background: '#f5f5f5',
            }}>
              <img
                src="/assets/examples/example2.png"
                alt="Core Strength Focus example"
                style={{ width: '100%', height: 'auto', borderRadius: '12px', display: 'block' }}
              />
            </div>
            <div style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: '1.6',
            }}>
              <strong style={{ color: '#000000' }}>Example:</strong> Educational content with underlined key phrases and highlighted terms.
            </div>
          </div>

          <div className="card" style={{
            padding: '24px',
          }}>
            <div style={{
              width: '100%',
              borderRadius: '12px',
              marginBottom: '16px',
              display: 'flex',
              justifyContent: 'center',
              background: '#f5f5f5',
            }}>
              <img
                src="/assets/examples/example3.png"
                alt="Mind Over Matter example"
                style={{ width: '100%', height: 'auto', borderRadius: '12px', display: 'block' }}
              />
            </div>
            <div style={{
              fontSize: '14px',
              color: '#666666',
              lineHeight: '1.6',
            }}>
              <strong style={{ color: '#000000' }}>Example:</strong> Mental wellness content with strategic text formatting and emphasis.
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '80px 24px',
      }}>
        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: '700',
          textAlign: 'center',
          marginBottom: '48px',
          color: '#000000',
          letterSpacing: '-1px',
        }}>
          What Our Users Say
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
        }}>
          <div className="card">
            <p style={{
              color: '#666666',
              lineHeight: '1.8',
              fontSize: '15px',
              marginBottom: '24px',
              fontStyle: 'italic',
            }}>
              "This tool has completely transformed how I create content for Instagram. I can generate professional notes in minutes instead of hours!"
            </p>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#000000',
            }}>
              Sarah Chen
            </div>
          </div>

          <div className="card">
            <p style={{
              color: '#666666',
              lineHeight: '1.8',
              fontSize: '15px',
              marginBottom: '24px',
              fontStyle: 'italic',
            }}>
              "The AI understands my brand voice perfectly. Every post feels authentic and engaging. Highly recommend!"
            </p>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#000000',
            }}>
              Marcus Johnson
            </div>
          </div>

          <div className="card">
            <p style={{
              color: '#666666',
              lineHeight: '1.8',
              fontSize: '15px',
              marginBottom: '24px',
              fontStyle: 'italic',
            }}>
              "As a small business owner, this saves me so much time and money. The quality is incredible and the customization options are perfect."
            </p>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#000000',
            }}>
              Emily Rodriguez
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{
        borderTop: '2px solid #e5e5e5',
        padding: '32px 24px',
        textAlign: 'center',
        color: '#999999',
        fontSize: '14px',
      }}>
        © 2025 Post My Note. All rights reserved.
      </footer>
    </div>
  )
}
