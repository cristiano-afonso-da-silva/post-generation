'use client'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Check, ArrowRight, Zap, Palette, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AccountButton from '../components/AccountButton'
import { useState } from 'react'
import '../globals.css'

const exampleSlides = [
  { src: '/slide1.png', alt: 'Example carousel slide 1' },
  { src: '/slide2.png', alt: 'Example carousel slide 2' },
  { src: '/slide3.png', alt: 'Example carousel slide 3' },
  { src: '/slide4.png', alt: 'Example carousel slide 4' },
  { src: '/slide5.png', alt: 'Example carousel slide 5' },
]

const features = [
  {
    icon: Zap,
    title: 'AI-Powered Generation',
    description: 'Transform a single idea into a complete carousel post with AI-generated content, hooks, and CTAs in seconds.',
  },
  {
    icon: Palette,
    title: 'Beautiful Design Templates',
    description: 'Choose from professionally designed themes, fonts, and color combinations that match your brand perfectly.',
  },
  {
    icon: Download,
    title: 'Export & Share Instantly',
    description: 'Download high-quality images ready to post on Instagram, LinkedIn, or any social platform immediately.',
  },
]

const workflowPreview = [
  { title: 'Drop your idea', subtitle: '' },
  { title: 'Choose your style', subtitle: '' },
  { title: 'Publish instantly', subtitle: '' },
]

const comparisonData = [
  { metric: 'Time per post', manual: '15–30 min', postMyNote: '~2 min' },
  { metric: 'Design skill', manual: 'Needed', postMyNote: 'None' },
  { metric: 'Workflow', manual: 'Manual', postMyNote: 'Automated' },
  { metric: 'Output', manual: '1 post', postMyNote: 'Batch ready' },
  { metric: 'Revisions', manual: 'Manual edits', postMyNote: '1-click regenerate' },
]

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Content Creator',
    quote: 'I used to spend hours in Canva trying to make carousel posts look good. Now Post My Note help me do it in two minutes.',
  },
  {
    name: 'Marcus Johnson',
    role: 'Marketing Director',
    quote: 'Our engagement jumped 40% after switching to carousel posts. It\'s never been this easy to create professional, on-brand content.',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Founder, Studio Bloom',
    quote: 'With zero design experience, I finally create posts that look like a big brand\'s. Total game-changer for small businesses.',
  },
  {
    name: 'Daniel Lee',
    role: 'Growth Strategist',
    quote: 'What surprised me most is how good the ideas are. I just type a topic, and it gives me hooks, structure, and design — it\'s like an AI creative partner.',
  },
]

const pricingPlans = [
  {
    name: 'Starter',
    price: '$9',
    period: '/month',
    features: ['10 carousel posts/month', 'All design themes', 'HD export quality', 'Email support'],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    features: ['50 carousel posts/month', 'All design themes', '4K export quality', 'Priority support', 'Custom branding', 'Advanced AI features'],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Agency',
    price: '$99',
    period: '/month',
    features: ['Unlimited carousel posts', 'All design themes', '4K export quality', 'Dedicated support', 'White-label options', 'Team collaboration', 'API access'],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

const steps = [
  {
    number: '01',
    title: 'Describe Your Idea',
    description: 'Simply type what you want to share. Our AI understands your message and creates engaging content.',
  },
  {
    number: '02',
    title: 'Customize Your Design',
    description: 'Choose from beautiful themes, adjust colors, and select fonts that match your brand identity.',
  },
  {
    number: '03',
    title: 'Export & Post',
    description: 'Download your carousel in seconds and share it across all your social media platforms.',
  },
]

export default function LandingPage() {
  const router = useRouter()
  const { user, loading, credits } = useAuth()
  const [card1Expanded, setCard1Expanded] = useState(false)

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
      {/* Hero Section */}
      <section
        className="hero-split-section"
        style={{
          minHeight: '100vh',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'stretch',
          padding: '0 0 80px',
          paddingTop: '0',
          position: 'relative',
          overflow: 'hidden',
          background: '#ffffff',
        }}
      >
        {/* Navigation - Floating on top */}
        <nav
          style={{
            position: 'absolute',
            top: '24px',
            left: '0',
            right: '0',
            zIndex: 100,
            padding: '0 48px',
          }}
        >
          <div
            style={{
              maxWidth: '100%',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.98)',
              borderRadius: '999px',
              border: '1px solid #e5e5e5',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Link 
              href="/" 
              style={{ 
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '20px',
                fontWeight: '700', 
                color: '#000000', 
                textDecoration: 'none',
              }}
            >
              <Image src="/logo.svg" alt="Post My Note" width={40} height={40} priority style={{ width: '40px', height: '40px' }} />
              <span>Post My Note</span>
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
                  style={{
                    padding: '10px 24px',
                    borderRadius: '999px',
                    background: 'transparent',
                    border: '1px solid #e5e5e5',
                    color: '#000000',
                    fontSize: '14px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Log In
                </Link>
              )}
            </div>
          </div>
        </nav>
        {/* Left Column - Content */}
        <div style={{ position: 'relative', zIndex: 10, paddingRight: '64px', paddingLeft: '48px', paddingTop: '120px', paddingBottom: '120px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 18px',
              background: '#fff9ed',
              border: '1px solid #ffbd59',
              borderRadius: '999px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#000000',
              marginBottom: '32px',
            }}
          >
            <span aria-hidden="true" style={{ color: '#ffbd59', letterSpacing: '2px' }}>★★★★★</span>
            <span>Trusted by creators with 99 drafts.</span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(36px, 6vw, 64px)',
              fontWeight: '800',
              lineHeight: '1.3',
              letterSpacing: '-1px',
              color: '#000000',
              marginBottom: '24px',
              fontFamily: 'var(--font-playfair-display), serif',
              textAlign: 'left',
            }}
          >
            Turn Ideas Into Content That <em>Sells</em>
          </h1>
          <p
            style={{
              fontSize: 'clamp(18px, 2.5vw, 22px)',
              color: '#666666',
              marginBottom: '48px',
              lineHeight: '1.6',
              maxWidth: '600px',
              textAlign: 'left',
            }}
          >
            Post My Note is a next-gen content system that helps creators and small brands publish authentic, on-brand carousels, 10× faster, without a designer.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href={user ? "/" : "/signup"}
              className="cta-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '20px 32px',
                borderRadius: '999px',
                background: '#ffbd59',
                color: '#000000',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              {user ? "Go to app" : "Get Started Free"}
              <ArrowRight size={18} />
            </Link>
          </div>
        </div>

        {/* Right Column - Carousel */}
        <div
          className="hero-carousel-wrapper"
          style={{
            position: 'relative',
            height: '100vh',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            className="hero-carousel-container"
            style={{
              position: 'relative',
              height: '100vh',
              width: '100%',
              overflow: 'hidden',
              paddingLeft: '64px',
              paddingTop: '250px',
              paddingBottom: '250px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-evenly',
            }}
          >
          {/* Row 1 - 15° diagonal */}
          <div
            className="scroll-row-diagonal-1"
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '24px',
              width: 'fit-content',
              animation: 'scrollHorizontal15 30s linear infinite',
            }}
          >
            {[...exampleSlides, ...exampleSlides, ...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag1-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Row 2 - 15° diagonal */}
          <div
            className="scroll-row-diagonal-2"
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '24px',
              width: 'fit-content',
              animation: 'scrollHorizontal15 35s linear infinite',
            }}
          >
            {[...exampleSlides, ...exampleSlides, ...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag2-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Row 3 - 15° diagonal */}
          <div
            className="scroll-row-diagonal-3"
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '24px',
              width: 'fit-content',
              animation: 'scrollHorizontal15 40s linear infinite reverse',
            }}
          >
            {[...exampleSlides, ...exampleSlides, ...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag3-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Row 4 - 15° diagonal */}
          <div
            className="scroll-row-diagonal-4"
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '24px',
              width: 'fit-content',
              animation: 'scrollHorizontal15 45s linear infinite',
            }}
          >
            {[...exampleSlides, ...exampleSlides, ...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag4-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Row 5 - 15° diagonal */}
          <div
            className="scroll-row-diagonal-5"
            style={{
              display: 'flex',
              gap: '24px',
              width: 'fit-content',
              animation: 'scrollHorizontal15 50s linear infinite',
            }}
          >
            {[...exampleSlides, ...exampleSlides, ...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag5-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                  }}
                />
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        style={{
          padding: '120px 24px',
          background: '#faf8f5',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2
              style={{
                fontSize: 'clamp(36px, 6vw, 64px)',
                fontWeight: '800',
                color: '#000000',
                letterSpacing: '-2px',
                marginBottom: '24px',
                fontFamily: 'var(--font-playfair-display), serif',
              }}
            >
              Your content, created on autopilot
            </h2>
            <p
              style={{
                fontSize: 'clamp(18px, 2.5vw, 22px)',
                color: '#666666',
                lineHeight: '1.6',
                maxWidth: '800px',
                margin: '0 auto',
              }}
            >
              Post My Note plans and designs your carousels — so you can focus on your products, clients, and growth.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '32px',
            }}
          >
            {/* Card 1: Turn ideas into visuals */}
            <div
              style={{
                padding: '32px 24px',
                borderRadius: '20px',
                background: 'rgb(209,195,251)',
                border: 'none',
              }}
            >
              <div
                className="card1-animation-container"
                onMouseEnter={() => setCard1Expanded(true)}
                onMouseLeave={() => setCard1Expanded(false)}
                onClick={() => setCard1Expanded(!card1Expanded)}
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  marginBottom: '16px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {card1Expanded ? (
                  <Image
                    src={exampleSlides[0].src}
                    alt={exampleSlides[0].alt}
                    width={360}
                    height={460}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '24px',
                      objectFit: 'cover',
                      boxShadow: '0 20px 40px rgba(17, 24, 39, 0.1)',
                      border: '5px solid #ffffff',
                      background: '#ffffff',
                      transform: 'scale(1)',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#ffffff',
                      border: '2px dashed rgba(0, 0, 0, 0.2)',
                      borderRadius: '12px',
                      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <div
                      style={{
                        color: 'rgba(0, 0, 0, 0.4)',
                        fontSize: '14px',
                        fontWeight: '500',
                        textAlign: 'center',
                        padding: '0 16px',
                      }}
                    >
                      Type your idea here...
                    </div>
                  </div>
                )}
              </div>
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#000000',
                }}
              >
                Start with a thought
              </h3>
            </div>

            {/* Card 2: Stay on-brand */}
            <div
              style={{
                padding: '32px 24px',
                borderRadius: '20px',
                background: 'rgb(176,232,226)',
                border: 'none',
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  marginBottom: '16px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: 'rgba(0, 0, 0, 0.05)',
                }}
              />
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#000000',
                }}
              >
                Choose your inspiration
              </h3>
            </div>

            {/* Card 3: Ready to share */}
            <div
              style={{
                padding: '32px 24px',
                borderRadius: '20px',
                background: 'rgb(244,182,171)',
                border: 'none',
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  marginBottom: '16px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: 'rgba(0, 0, 0, 0.05)',
                }}
              />
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#000000',
                }}
              >
                Make it yours
              </h3>
            </div>

            {/* Card 4: New card with brand yellow */}
            <div
              style={{
                padding: '32px 24px',
                borderRadius: '20px',
                background: '#ffbd59',
                border: 'none',
              }}
            >
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  marginBottom: '16px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: 'rgba(0, 0, 0, 0.05)',
                }}
              />
              <h3
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#000000',
                }}
              >
                Ready to share
              </h3>
            </div>
          </div>
        </div>
      </section>
      {/* Comparison Table */}
      <section
        style={{
          padding: '120px 24px',
          background: '#fafafa',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2
              style={{
                fontSize: 'clamp(36px, 6vw, 56px)',
                fontWeight: '800',
          color: '#000000',
                letterSpacing: '-2px',
                marginBottom: '16px',
              }}
            >
              Create professional content instantly
        </h2>
            <p
              style={{
                fontSize: 'clamp(18px, 2.5vw, 22px)',
                color: '#666666',
                margin: '0 auto 48px',
                lineHeight: '1.6',
                maxWidth: '700px',
              }}
            >
              Cut your content creation time by 90%, keep every post perfectly on-brand, and scale your output without ever hiring a team.
            </p>
          </div>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              border: '1px solid #e5e5e5',
              overflow: 'hidden',
            }}
          >
            {/* Header Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                padding: '0',
                background: '#fafafa',
                fontWeight: '700',
                fontSize: 'clamp(12px, 2vw, 18px)',
                color: '#000000',
                letterSpacing: '0.5px',
              }}
            >
              <div style={{ padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderBottom: '1px solid #f0f0f0' }}></div>
              <div style={{ textAlign: 'center', padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderBottom: '1px solid #f0f0f0', wordWrap: 'break-word', overflowWrap: 'break-word' }}>Canva</div>
              <div style={{ textAlign: 'center', background: '#ffbd59', padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderBottom: '0.5px solid rgba(240, 240, 240, 0.5)', wordWrap: 'break-word', overflowWrap: 'break-word' }}>Post My Note</div>
            </div>
            {/* Data Rows */}
            {comparisonData.map((row, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  padding: '0',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: '600', color: '#000000', fontSize: 'clamp(13px, 2vw, 19px)', padding: 'clamp(16px, 3vw, 24px) 0 clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderTop: '1px solid #f0f0f0', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{row.metric}</div>
                <div style={{ textAlign: 'center', color: '#999999', fontSize: 'clamp(12px, 2vw, 17px)', padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderTop: '1px solid #f0f0f0', wordWrap: 'break-word', overflowWrap: 'break-word' }}>{row.manual}</div>
                <div style={{ textAlign: 'center', color: '#000000', fontWeight: '600', fontSize: 'clamp(12px, 2vw, 17px)', background: '#ffbd59', padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', borderTop: '0.5px solid rgba(240, 240, 240, 0.5)', wordWrap: 'break-word', overflowWrap: 'break-word' }}>
                  {row.postMyNote}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {/* <section
        style={{
          padding: '120px 24px',
          background: '#fafafa',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2
              style={{
                fontSize: 'clamp(36px, 6vw, 56px)',
                fontWeight: '800',
                color: '#000000',
                letterSpacing: '-2px',
                marginBottom: '16px',
              }}
            >
              Why creators love Post My Note
            </h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                style={{
                  padding: '32px',
                  background: '#ffffff',
                  borderRadius: '20px',
                  border: '1px solid #e5e5e5',
                }}
              >
                <p style={{ color: '#333333', lineHeight: '1.7', fontSize: '15px', marginBottom: '24px' }}>
                  {testimonial.quote}
                </p>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: '#000000', marginBottom: '4px' }}>
                    {testimonial.name}
                  </div>
                  <div style={{ fontSize: '13px', color: '#999999' }}>{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* Pricing */}
      {/* <section
        style={{
          padding: '120px 24px',
          background: '#ffffff',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2
              style={{
                fontSize: 'clamp(36px, 6vw, 56px)',
                fontWeight: '800',
          color: '#000000',
                letterSpacing: '-2px',
                marginBottom: '16px',
              }}
            >
              Pricing
        </h2>
            <p style={{ fontSize: '18px', color: '#666666' }}>
              Choose the plan that fits your content creation needs
            </p>
          </div>
          <div
            style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
              maxWidth: '1100px',
              margin: '0 auto',
            }}
          >
            {pricingPlans.map((plan, index) => (
              <div
                key={index}
                style={{
                  padding: '48px 32px',
                  background: plan.highlighted ? '#ffbd59' : '#fafafa',
                  borderRadius: '24px',
                  border: plan.highlighted ? '2px solid #ffbd59' : '1px solid #e5e5e5',
                  position: 'relative',
                  transform: plan.highlighted ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.3s ease',
                }}
              >
                {plan.highlighted && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      padding: '4px 12px',
                      background: '#000000',
                      color: '#ffffff',
                      borderRadius: '999px',
                      fontSize: '11px',
                      fontWeight: '700',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    POPULAR
                  </div>
                )}
                <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#000000' }}>{plan.name}</h3>
                <div style={{ marginBottom: '32px' }}>
                  <span style={{ fontSize: '48px', fontWeight: '800', color: '#000000' }}>{plan.price}</span>
                  <span style={{ fontSize: '16px', color: '#666666' }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: 'none', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <Check size={18} color={plan.highlighted ? '#000000' : '#ffbd59'} strokeWidth={3} />
                      <span style={{ color: '#333333', fontSize: '14px' }}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '14px',
                    borderRadius: '12px',
                    background: plan.highlighted ? '#000000' : '#ffffff',
                    color: plan.highlighted ? '#ffffff' : '#000000',
              fontSize: '15px',
              fontWeight: '600',
                    textDecoration: 'none',
                    border: plan.highlighted ? 'none' : '1px solid #e5e5e5',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {plan.cta}
                </Link>
            </div>
            ))}
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <section
        style={{
          padding: '120px 24px',
          background: '#000000',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(36px, 6vw, 56px)',
              fontWeight: '800',
              color: '#ffffff',
              letterSpacing: '-2px',
              marginBottom: '24px',
            }}
          >
            Your ideas deserve to move <span style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>faster</span>
          </h2>
          <p
            style={{
              fontSize: 'clamp(18px, 2.5vw, 22px)',
              color: '#ffffff',
              marginBottom: '48px',
              lineHeight: '1.6',
              opacity: 0.9,
            }}
          >
            Your ideas deserve to move faster.
          </p>
          <Link
            href={user ? "/" : "/signup"}
            className="cta-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '20px 40px',
              borderRadius: '999px',
              background: '#ffbd59',
              color: '#000000',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {user ? "Go to app" : "Get Started Free"}
            <ArrowRight size={18} />
          </Link>
            </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: '48px 24px',
          background: '#000000',
          borderTop: '1px solid #222222',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          <div style={{ color: '#666666', fontSize: '14px' }}>© 2025 Post My Note. All rights reserved.</div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <Link href="/landing" style={{ color: '#999999', fontSize: '14px', textDecoration: 'none' }}>
              Home
            </Link>
            <Link href="/signup" style={{ color: '#999999', fontSize: '14px', textDecoration: 'none' }}>
              Get Started
            </Link>
          </div>
        </div>
      </footer>
      <style jsx global>{`
        @keyframes ringSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes ringCounterSpin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(-360deg);
          }
        }

        @keyframes scrollHorizontal15 {
          from {
            transform: rotate(15deg) translateX(0);
          }
          to {
            transform: rotate(15deg) translateX(calc(-100% / 5));
          }
        }


        .scroll-row-diagonal-1:hover,
        .scroll-row-diagonal-2:hover,
        .scroll-row-diagonal-3:hover,
        .scroll-row-diagonal-4:hover,
        .scroll-row-diagonal-5:hover {
          animation-play-state: paused;
        }

        .hero-carousel-container:hover .scroll-row-diagonal-1,
        .hero-carousel-container:hover .scroll-row-diagonal-2,
        .hero-carousel-container:hover .scroll-row-diagonal-3,
        .hero-carousel-container:hover .scroll-row-diagonal-4,
        .hero-carousel-container:hover .scroll-row-diagonal-5 {
          animation-play-state: paused;
        }

        .carousel-card:hover {
          /* Animation disabled for performance */
        }

        .carousel-card:active {
          /* Animation disabled for performance */
        }

        .carousel-card:hover ~ *,
        .carousel-card:active ~ * {
          animation-play-state: paused;
        }

        .scroll-row-left:has(.carousel-card:hover),
        .scroll-row-right:has(.carousel-card:hover) {
          animation-play-state: paused;
        }

        .scroll-row-left:has(.carousel-card:active),
        .scroll-row-right:has(.carousel-card:active) {
          animation-play-state: paused;
        }

        .features-heading {
          text-align: center;
        }

        @media (min-width: 768px) {
          .features-heading {
            text-align: left;
          }
        }

        .cta-button:hover {
          background: #ffa929 !important;
        }

        @media (max-width: 1024px) {
          .hero-split-section {
            grid-template-columns: 1fr !important;
            padding: 0 0 60px !important;
            min-height: 100vh !important;
          }

          .hero-split-section nav {
            padding: 0 24px !important;
          }

          .hero-split-section > div:nth-child(2) {
            padding-right: 24px !important;
            padding-left: 24px !important;
            padding-top: 200px !important;
            padding-bottom: 80px !important;
            margin-bottom: 48px;
            text-align: center !important;
            position: relative !important;
          }

          .hero-split-section > div:nth-child(2) h1,
          .hero-split-section > div:nth-child(2) p {
            text-align: center !important;
          }

          .hero-split-section > div:nth-child(2) > div:first-child {
            margin: 0 auto 32px !important;
          }

          .hero-split-section > div:nth-child(2) > div:last-child {
            justify-content: center !important;
          }

          .hero-carousel-wrapper {
            position: relative !important;
            width: 100% !important;
            height: 100vh !important;
          }

          .hero-carousel-container {
            position: relative !important;
            width: 100% !important;
            height: 100vh !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 200px !important;
            padding-bottom: 200px !important;
            top: auto !important;
            right: auto !important;
          }
        }
      `}</style>
    </div>
  )
}


