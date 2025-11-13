'use client'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Check, ArrowRight, Zap, Palette, Download, Gauge, MessageSquare, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import AccountButton from './components/AccountButton'
import { useState, useEffect, useCallback } from 'react'

const exampleSlides = [
  { src: '/slide1.png', alt: 'Example carousel slide 1' },
  { src: '/slide2.png', alt: 'Example carousel slide 2' },
  { src: '/slide3.png', alt: 'Example carousel slide 3' },
  { src: '/slide4.png', alt: 'Example carousel slide 4' },
  { src: '/slide5.png', alt: 'Example carousel slide 5' },
  { src: '/slide6.png', alt: 'Example carousel slide 6' },
  { src: '/slide7.png', alt: 'Example carousel slide 7' },
  { src: '/slide8.png', alt: 'Example carousel slide 8' },
  { src: '/slide9.png', alt: 'Example carousel slide 9' },
  { src: '/slide10.png', alt: 'Example carousel slide 10' },
  { src: '/slide11.png', alt: 'Example carousel slide 11' },
  { src: '/slide12.png', alt: 'Example carousel slide 12' },
]

const exampleFolderSlides = [
  { src: '/example/1.png', alt: 'Example carousel slide 1' },
  { src: '/example/2.png', alt: 'Example carousel slide 2' },
  { src: '/example/3.png', alt: 'Example carousel slide 3' },
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
    name: 'Basic',
    price: '$0',
    period: '/month',
    features: ['10 carousel posts/month', 'All design themes', 'HD export quality', 'Email support'],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Plus',
    price: '$20',
    period: '/month',
    features: ['50 carousel posts/month', 'All design themes', '4K export quality', 'Priority support', 'Custom branding', 'Advanced AI features'],
    cta: 'Get Started',
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '$50',
    period: '/month',
    features: ['150 carousel posts/month', 'All design themes', '4K export quality', 'Dedicated support', 'White-label options', 'Team collaboration', 'API access'],
    cta: 'Get Started',
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

// Color and background options for card customization
const colorOptions = [
  { name: 'Purple', value: 'rgb(209,195,251)' },
  { name: 'Coral', value: 'rgb(235, 185, 173)' },
  { name: 'Teal', value: 'rgb(176,232,226)' },
]

const backgroundOptions = [
  { name: 'Coral', value: 'rgb(235, 185, 173)' },
  { name: 'Gradient 1', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { name: 'Gradient 2', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
]

// Slide Carousel Component - Continuous horizontal scrolling animation
function SlideCarousel() {
  const slides = exampleSlides.slice(0, 9)
  
  // Duplicate slides multiple times for seamless infinite loop
  const duplicatedSlides = [...slides, ...slides, ...slides, ...slides]
  
  // Calculate total width for animation
  const slideWidth = 320
  const slideGap = 24
  const slideTotalWidth = slideWidth + slideGap
  const totalWidth = duplicatedSlides.length * slideTotalWidth
  const animationDuration = 60 // seconds for full cycle (slower animation)

  return (
    <div
      style={{
        width: '100%',
        padding: '80px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Edge Fade Gradients */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '200px',
          background: 'linear-gradient(90deg, #F5F5F5 0%, transparent 100%)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          bottom: 0,
          width: '200px',
          background: 'linear-gradient(270deg, #F5F5F5 0%, transparent 100%)',
          zIndex: 10,
          pointerEvents: 'none',
        }}
      />

      {/* Scrolling Slides Container */}
      <div
        style={{
          display: 'flex',
          gap: `${slideGap}px`,
          width: `${totalWidth}px`,
          animation: `slideCarouselScroll ${animationDuration}s linear infinite`,
        }}
      >
        {duplicatedSlides.map((slide, idx) => (
          <div
            key={`slide-${idx}`}
            style={{
              flexShrink: 0,
              width: `${slideWidth}px`,
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '10 / 13',
                borderRadius: '20px',
                overflow: 'hidden',
                boxShadow: '0 15px 35px -10px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0, 0, 0, 0.05)',
              }}
            >
              <Image
                src={slide.src}
                alt={slide.alt}
                width={400}
                height={520}
                unoptimized
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const { user, loading, credits } = useAuth()
  const [card1Expanded, setCard1Expanded] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [card1CopyExpanded, setCard1CopyExpanded] = useState(false)
  const [currentSlideCopy, setCurrentSlideCopy] = useState(0)
  const [tealCardDownloaded, setTealCardDownloaded] = useState(false)
  const [selectedColor, setSelectedColor] = useState(colorOptions[1].value)
  const [selectedBackground, setSelectedBackground] = useState('rgb(235, 185, 173)')
  const [selectedStyle, setSelectedStyle] = useState(1) // Style 1 or 2

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
      {/* Header */}
      <header style={{
        borderBottom: '1px solid #e5e5e5',
        padding: '12px 0',
        background: '#ffffff',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
      }}>
        <div className="header-inner" style={{
          maxWidth: '1000px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Link 
            href="/" 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#000000', 
              letterSpacing: '-0.5px',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            <Image src="/logo.svg" alt="Post My Note" width={40} height={40} priority style={{ width: '40px', height: '40px' }} />
            <span>Post My Note</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              <AccountButton
                credits={credits?.credits_remaining ?? 0}
                subscriptionStatus={credits?.subscription_status ?? null}
                currentPlan={credits?.current_plan ?? null}
              />
            ) : (
              <Link
                href="/signup"
                className="login-button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  background: '#e5e5e5',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  border: 'none',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#d1d5db'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#e5e5e5'
                }}
              >
                Log In
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="hero-section"
        style={{
          minHeight: '110vh',
          display: 'none !important', // Hidden for now
          gridTemplateColumns: '1fr 1fr',
          alignItems: 'center',
          padding: '0',
          position: 'relative',
          overflow: 'hidden',
          background: '#ffffff',
          visibility: 'hidden',
        }}
      >
        {/* Left Column - Content */}
        <div className="hero-content" style={{ position: 'relative', zIndex: 10, paddingRight: '64px', paddingLeft: '48px', paddingTop: '120px', paddingBottom: '120px' }}>
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
            <span>Trusted by creators with 99 drafts</span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(36px, 6vw, 64px)',
              fontWeight: '800',
              lineHeight: '1.1',
              letterSpacing: '-1px',
              color: '#000000',
              marginBottom: '24px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
              textAlign: 'left',
            }}
          >
            Turn Ideas Into Content That <span style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>Sells</span>
          </h1>
          <p
            className="hero-description"
            style={{
              fontSize: 'clamp(18px, 2.5vw, 22px)',
              color: '#666666',
              marginBottom: '48px',
              lineHeight: '1.6',
              maxWidth: '600px',
              textAlign: 'left',
            }}
          >
            Make clean, on-brand posts instantly with zero design work.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href={user ? "/app" : "/signup"}
              className="cta-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                borderRadius: '12px',
                background: '#ffbd59',
                color: '#000000',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                border: '1px solid rgba(0, 0, 0, 0.1)',
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
          className="hero-carousel-container"
          style={{
            position: 'absolute',
            top: '0',
            right: '0',
            width: '50%',
            height: '100%',
            overflow: 'hidden',
            paddingLeft: '64px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-evenly',
          }}
        >
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
            {[...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag2-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  unoptimized
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
            {[...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag3-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  unoptimized
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
            {[...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag4-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  unoptimized
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
              marginBottom: '24px',
              width: 'fit-content',
              animation: 'scrollHorizontal15 50s linear infinite reverse',
            }}
          >
            {[...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag5-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  unoptimized
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Row 6 - 15° diagonal */}
          <div
            className="scroll-row-diagonal-6"
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '24px',
              width: 'fit-content',
              animation: 'scrollHorizontal15 55s linear infinite',
            }}
          >
            {[...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag6-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  unoptimized
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Row 7 - 15° diagonal */}
          <div
            className="scroll-row-diagonal-7"
            style={{
              display: 'flex',
              gap: '24px',
              marginBottom: '24px',
              width: 'fit-content',
              animation: 'scrollHorizontal15 60s linear infinite reverse',
            }}
          >
            {[...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag7-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  unoptimized
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Row 8 - 15° diagonal */}
          <div
            className="scroll-row-diagonal-8"
            style={{
              display: 'flex',
              gap: '24px',
              width: 'fit-content',
              animation: 'scrollHorizontal15 65s linear infinite',
            }}
          >
            {[...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
              <div
                key={`diag8-${index}`}
                className="carousel-card"
                style={{
                  flexShrink: 0,
                  width: 'clamp(180px, 25vw, 320px)',
                  height: 'auto',
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  width={360}
                  height={460}
                  unoptimized
                  style={{
                    width: '100%',
                    height: 'auto',
                    borderRadius: '24px',
                    objectFit: 'cover',
                    boxShadow: '0 20px 40px rgba(17, 24, 39, 0.15), 0 8px 16px rgba(0, 0, 0, 0.1)',
                    border: '5px solid #ffffff',
                    background: '#ffffff',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hero Section - Centered Copy (No Animation) */}
      <section
        style={{
          minHeight: '80vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '120px 24px',
          background: '#F5F5F5',
        }}
      >
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          textAlign: 'center',
          maxWidth: '800px',
          width: '100%',
        }}>
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
              marginTop: '80px',
              marginBottom: '32px',
            }}
          >
            <span aria-hidden="true" style={{ color: '#ffbd59', letterSpacing: '2px' }}>★★★★★</span>
            <span>Trusted by creators with 99 drafts</span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(36px, 6vw, 64px)',
              fontWeight: '800',
              lineHeight: '1.1',
              letterSpacing: '-1px',
              color: '#000000',
              marginBottom: '24px',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
              textAlign: 'center',
            }}
          >
            Create Carousel Posts in <span style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>Seconds</span>
          </h1>
          <p
            style={{
              fontSize: 'clamp(14px, 1.8vw, 18px)',
              color: '#666666',
              marginBottom: '24px',
              lineHeight: '1.6',
              maxWidth: '600px',
              textAlign: 'center',
            }}
          >
            Make clean, on-brand posts instantly with zero design work.
          </p>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '64px' }}>
            <Link
              href={user ? "/app" : "/signup"}
              className="cta-button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                padding: '16px 32px',
                borderRadius: '12px',
                background: '#ffbd59',
                color: '#000000',
                fontSize: '18px',
                fontWeight: '600',
                textDecoration: 'none',
                border: 'none',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 20px rgba(255, 189, 89, 0.4), 0 4px 12px rgba(255, 189, 89, 0.2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffa929'
                e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 189, 89, 0.6), 0 6px 16px rgba(255, 189, 89, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffbd59'
                e.currentTarget.style.boxShadow = '0 0 20px rgba(255, 189, 89, 0.4), 0 4px 12px rgba(255, 189, 89, 0.2)'
              }}
            >
              {user ? "Go to App" : "Get Started for Free"}
              <ArrowRight size={18} />
            </Link>
          </div>

          {/* Slide Carousel */}
          <SlideCarousel />
        </div>
      </section>

      {/* Features - Copy 1 */}
      <section
        style={{
          padding: '100px 24px',
          background: '#F5F5F5',
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
          }}
        >
          <div
            className="features-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '64px',
              alignItems: 'center',
            }}
          >
            {/* Left side: Content */}
            <div
              className="features-content"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '48px 0',
              }}
            >
              <h2
                style={{
                  fontSize: 'clamp(36px, 6vw, 56px)',
                  fontWeight: '800',
                  color: '#000000',
                  letterSpacing: '-2px',
                  marginBottom: '16px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                }}
              >
                From text to visuals in seconds
              </h2>
              <p
                style={{
                  fontSize: 'clamp(18px, 2vw, 22px)',
                  fontWeight: '400',
                  color: '#666666',
                  lineHeight: '1.6',
                }}
              >
                Write one line and get a finished post that looks like you spent hours designing it.
              </p>
            </div>

            {/* Right side: Purple card */}
            <div
              className="features-card-container"
              style={{
                minHeight: '533px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                className="card1-animation-container"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  aspectRatio: card1CopyExpanded ? '3 / 4' : 'auto',
                  maxHeight: card1CopyExpanded ? 'none' : '350px',
                  border: '1px solid rgb(229, 229, 229)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgb(209,195,251)',
                  cursor: 'pointer',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'visible',
                  position: 'relative',
                  transform: 'rotate(5deg)',
                  boxShadow: '0 8px 24px rgba(209, 195, 251, 0.6), 0 4px 12px rgba(209, 195, 251, 0.4)',
                }}
              >
                {card1CopyExpanded ? (
                  <>
                    <div
                      style={{
                        width: '100%',
                        flex: '1 1 0%',
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'stretch',
                        justifyContent: 'flex-start',
                        background: '#ffffff',
                        border: '1px solid rgb(229, 229, 229)',
                        borderRadius: '12px',
                        position: 'relative',
                        padding: '0',
                        boxSizing: 'border-box',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        overflow: 'hidden',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          flex: 1,
                          position: 'relative',
                          overflow: 'hidden',
                          cursor: 'pointer',
                          border: '1px solid rgb(229, 229, 229)',
                          borderRadius: '4px',
                        }}
                        onClick={() => {
                          setCurrentSlideCopy((prev) => (prev + 1) % 3)
                        }}
                      >
                        {exampleFolderSlides.map((slide, index) => (
                          <div
                            key={index}
                            style={{
                              position: 'absolute',
                              width: '100%',
                              height: '100%',
                              opacity: currentSlideCopy === index ? 1 : 0,
                              transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
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
                                height: '100%',
                                borderRadius: '4px',
                                objectFit: 'cover',
                              }}
                            />
                          </div>
                        ))}
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '16px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '8px',
                            zIndex: 10,
                          }}
                        >
                          {exampleFolderSlides.map((_, index) => (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation()
                                setCurrentSlideCopy(index)
                              }}
                              style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                border: 'none',
                                background: currentSlideCopy === index ? '#666666' : 'rgba(0, 0, 0, 0.3)',
                                cursor: 'pointer',
                                transition: 'background 0.2s ease',
                                padding: 0,
                              }}
                              aria-label={`Go to slide ${index + 1}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCard1CopyExpanded(false)
                        setCurrentSlideCopy(0)
                      }}
                      style={{
                        padding: '16px 32px',
                        borderRadius: '12px',
                        background: '#ededed',
                        border: '1px solid rgb(229, 229, 229)',
                        color: '#000000',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s ease',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#e5e5e5'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ededed'
                      }}
                      onMouseDown={(e) => {
                        e.currentTarget.style.background = '#d4d4d4'
                      }}
                      onMouseUp={(e) => {
                        e.currentTarget.style.background = '#e5e5e5'
                      }}
                    >
                      Reset
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        width: '100%',
                        flex: '1 1 0%',
                        minHeight: 0,
                        display: 'flex',
                        alignItems: 'stretch',
                        justifyContent: 'flex-start',
                        background: '#ffffff',
                        border: '1px solid rgb(229, 229, 229)',
                        borderRadius: '12px',
                        position: 'relative',
                        padding: '16px',
                        boxSizing: 'border-box',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          fontSize: '16px',
                          fontWeight: '400',
                          color: '#000000',
                          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                          lineHeight: '1.5',
                          display: 'flex',
                          alignItems: 'flex-start',
                          position: 'relative',
                        }}
                      >
                        <span style={{ fontSize: '18px', fontWeight: '400', color: 'rgb(102, 102, 102)' }}>Make a morning routine for focus</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setCard1CopyExpanded(true)}
                      style={{
                        padding: '16px 32px',
                        borderRadius: '12px',
                        background: 'rgb(242, 242, 242)',
                        color: '#000000',
                        border: '1px solid rgb(229, 229, 229)',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        width: '100%',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgb(230, 230, 230)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgb(242, 242, 242)'
                      }}
                    >
                      Generate
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features - Reversed */}
      <section
        style={{
          padding: '100px 24px',
          background: '#F5F5F5',
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
          }}
        >
          <div
            className="features-grid-reversed"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '64px',
              alignItems: 'center',
            }}
          >
            {/* Left side: Content */}
            <div
              className="features-content-reversed"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '48px 0',
                gridColumn: '1',
                textAlign: 'left',
              }}
            >
              <h2
                style={{
                  fontSize: 'clamp(36px, 6vw, 56px)',
                  fontWeight: '800',
                  color: '#000000',
                  letterSpacing: '-2px',
                  marginBottom: '16px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                  textAlign: 'left',
                }}
              >
                Design that matches your brand
              </h2>
              <p
                style={{
                  fontSize: 'clamp(18px, 2vw, 22px)',
                  fontWeight: '400',
                  color: '#666666',
                  lineHeight: '1.6',
                  textAlign: 'left',
                }}
              >
                Pick a theme, font, and tone that fits your brand, make every post feel yours.
              </p>
            </div>

            {/* Right side: Interactive card */}
            <div
              className="features-card-container-reversed"
              style={{
                minHeight: '533px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gridColumn: '2',
              }}
            >
              <div
                className="card2-animation-container"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  aspectRatio: '3 / 4',
                  maxHeight: 'none',
                  border: '1px solid rgb(229, 229, 229)',
                  borderRadius: '12px',
                  padding: '24px',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'rgb(235, 185, 173)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'visible',
                  position: 'relative',
                  transform: 'rotate(-5deg)',
                  boxShadow: '0 8px 24px rgba(235, 185, 173, 0.6), 0 4px 12px rgba(235, 185, 173, 0.4)',
                }}
              >
                {/* Image container with white background panel */}
                <div
                  style={{
                    width: '100%',
                    flex: '1 1 0%',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'flex-start',
                    background: '#ffffff',
                    border: '1px solid rgb(229, 229, 229)',
                    borderRadius: '12px',
                    position: 'relative',
                    padding: '0',
                    boxSizing: 'border-box',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    overflow: 'hidden',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      flex: 1,
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <Image
                      src={selectedStyle === 1 ? '/example2/before.png' : '/example2/after.png'}
                      alt={selectedStyle === 1 ? 'Style 1' : 'Style 2'}
                      fill
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                </div>

                {/* Style selection buttons */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setSelectedStyle(1)}
                    style={{
                      flex: 1,
                      padding: '16px 32px',
                      borderRadius: '12px',
                      background: selectedStyle === 1 ? 'rgb(242, 242, 242)' : 'rgb(230, 230, 230)',
                      color: '#000000',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedStyle !== 1) {
                        e.currentTarget.style.background = 'rgb(220, 220, 220)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedStyle !== 1) {
                        e.currentTarget.style.background = 'rgb(230, 230, 230)'
                      }
                    }}
                  >
                    Style 1
                  </button>
                  <button
                    onClick={() => setSelectedStyle(2)}
                    style={{
                      flex: 1,
                      padding: '16px 32px',
                      borderRadius: '12px',
                      background: selectedStyle === 2 ? 'rgb(242, 242, 242)' : 'rgb(230, 230, 230)',
                      color: '#000000',
                      border: '1px solid rgba(0, 0, 0, 0.1)',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      if (selectedStyle !== 2) {
                        e.currentTarget.style.background = 'rgb(220, 220, 220)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedStyle !== 2) {
                        e.currentTarget.style.background = 'rgb(230, 230, 230)'
                      }
                    }}
                  >
                    Style 2
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        className="features-section-scale"
        style={{
          padding: '100px 24px',
          background: '#F5F5F5',
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
          }}
        >
          <div
            className="features-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '64px',
              alignItems: 'center',
            }}
          >
            {/* Left side: Content */}
            <div
              className="features-content-scale"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '48px 64px 48px 0',
              }}
            >
              <h2
                style={{
                  fontSize: 'clamp(36px, 6vw, 56px)',
                  fontWeight: '800',
                  color: '#000000',
                  letterSpacing: '-2px',
                  marginBottom: '16px',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                }}
              >
                Create at scale
              </h2>
              <p
                style={{
                  fontSize: 'clamp(18px, 2vw, 22px)',
                  fontWeight: '400',
                  color: '#666666',
                  lineHeight: '1.6',
                }}
              >
                Batch, edit, and export carousels at once to your social media.
              </p>
            </div>

            {/* Right side: Teal card */}
            <div
              style={{
                height: '533px',
                minHeight: '533px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: tealCardDownloaded ? 'flex-start' : 'center',
                gap: tealCardDownloaded ? '32px' : '0',
                width: '100%',
                padding: tealCardDownloaded ? '0 20px 40px' : '0',
              }}
            >
              {/* After state - Three smaller cards in a grid on top */}
              {tealCardDownloaded && (
                <>
                  <div
                    className="teal-card-after-state"
                    style={{
                      position: 'relative',
                      width: 'fit-content',
                      height: 'fit-content',
                      minWidth: '480px',
                      minHeight: '660px',
                      paddingBottom: '120px',
                      marginBottom: '20px',
                      animation: 'fadeInUp 0.5s ease-out',
                      margin: '0 auto',
                    }}
                  >
                  {[
                    { src: '/example3/after1.jpg', alt: 'Platform 1', icon: '/example3/after1icon.png', left: '0', top: '0' },
                    { src: '/example3/after2.jpg', alt: 'Platform 2', icon: '/example3/after2icon.png', left: '252px', top: '66px' },
                    { src: '/example3/after3.jpg', alt: 'Platform 3', icon: '/example3/after3icon.png', left: '-24px', top: '264px' },
                  ].map((image, index) => (
                    <div
                      key={index}
                      className="teal-card-small"
                      onClick={() => {
                        setTealCardDownloaded(false)
                      }}
                      style={{
                        position: 'absolute',
                        left: image.left,
                        top: image.top,
                        width: 'fit-content',
                        height: 'fit-content',
                        border: '8px solid rgba(0, 0, 0, 0.05)',
                        borderRadius: '12px',
                        padding: '0',
                        boxSizing: 'border-box',
                        display: 'block',
                        background: 'rgb(180, 230, 226)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                        overflow: 'visible',
                        transform: 'rotate(5deg)',
                        boxShadow: '0 8px 24px rgba(180, 230, 226, 0.6), 0 4px 12px rgba(180, 230, 226, 0.4)',
                        animation: `fadeInUpCard 0.5s ease-out ${index * 0.1}s both`,
                        cursor: 'pointer',
                      }}
                    >
                      {/* Icon in top right corner */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          width: '30px',
                          height: '30px',
                          zIndex: 10,
                          pointerEvents: 'none',
                        }}
                      >
                        <Image
                          src={image.icon}
                          alt="Icon"
                          width={30}
                          height={30}
                          unoptimized
                          style={{
                            width: '30px',
                            height: '30px',
                            display: 'block',
                          }}
                        />
                      </div>
                      <div
                        style={{
                          position: 'relative',
                          overflow: 'hidden',
                          display: 'block',
                          width: 'fit-content',
                          height: 'fit-content',
                        }}
                      >
                        <Image
                          src={image.src}
                          alt={image.alt}
                          width={360}
                          height={460}
                          unoptimized
                          className="teal-card-small-image"
                          style={{
                            width: 'auto',
                            height: 'auto',
                            display: 'block',
                            maxWidth: '216px',
                            maxHeight: 'none',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  </div>
                </>
              )}

              {/* Before state - Main card (hidden when downloaded) */}
              {!tealCardDownloaded && (
                <div
                  className="teal-card"
                  style={{
                    width: '100%',
                    maxWidth: '400px',
                    aspectRatio: '3 / 4',
                    maxHeight: 'none',
                    minHeight: '533px',
                    border: '1px solid rgb(229, 229, 229)',
                    borderRadius: '12px',
                    padding: '24px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgb(180, 230, 226)',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'visible',
                    position: 'relative',
                    transform: 'rotate(5deg)',
                    boxShadow: '0 8px 24px rgba(180, 230, 226, 0.6), 0 4px 12px rgba(180, 230, 226, 0.4)',
                    animation: 'fadeInUpCard 0.5s ease-out',
                  }}
                >
                <div
                  style={{
                    width: '100%',
                    flex: '1 1 0%',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    justifyContent: 'flex-start',
                    background: '#ffffff',
                    border: '1px solid rgb(229, 229, 229)',
                    borderRadius: '12px',
                    position: 'relative',
                    padding: '0',
                    boxSizing: 'border-box',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    overflow: 'hidden',
                    marginBottom: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      flex: 1,
                      minHeight: '200px',
                      position: 'relative',
                      overflow: 'hidden',
                      border: '2px solid rgba(0, 0, 0, 0.1)',
                      borderRadius: '4px',
                    }}
                  >
                    <Image
                      src="/example3/before.png"
                      alt="Example carousel"
                      width={360}
                      height={460}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: '4px',
                        objectFit: 'cover',
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    setTealCardDownloaded(true)
                  }}
                  style={{
                    padding: '16px 32px',
                    borderRadius: '12px',
                    background: 'rgb(242, 242, 242)',
                    color: '#000000',
                    border: '1px solid rgba(0, 0, 0, 0.1)',
                    fontSize: '16px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease',
                    width: '100%',
                    cursor: 'pointer',
                  }}
                >
                  Download
                </button>
              </div>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* Built for creators section */}
      {/* <section
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
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
              }}
            >
              For creators who value <span style={{ color: '#000000', fontStyle: 'italic' }}>speed</span> and <span style={{ color: '#000000', fontStyle: 'italic' }}>soul</span>
            </h2>
          </div>
          <div
            className="creators-cards-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '64px',
              alignItems: 'stretch',
              justifyContent: 'center',
            }}
          >
            {/* Card 1 - Purple */}
            {/* <div
              style={{
                width: '100%',
                maxWidth: '280px',
                margin: '0 auto',
                aspectRatio: '3 / 4',
                    border: '1px solid rgb(229, 229, 229)',
                borderRadius: '12px',
                padding: '24px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                background: 'rgb(209,195,251)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 8px 24px rgba(209, 195, 251, 0.6), 0 4px 12px rgba(209, 195, 251, 0.4)',
              }}
            >
              {/* Icon in the middle */}
              {/* <div 
                className="speed-icon-animating"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1,
                }}
              >
                <Zap 
                  size={80} 
                  color="#ffffff"
                  fill="#ffffff"
                  strokeWidth={2.5}
                />
              </div>

              {/* Speed rings animation */}
              {/* <>
                <div className="speed-ring speed-ring-1" />
                <div className="speed-ring speed-ring-2" />
                <div className="speed-ring speed-ring-3" />
              </>

              {/* Speed particles */}
              {/* <>
                <div className="speed-particle speed-particle-1" />
                <div className="speed-particle speed-particle-2" />
                <div className="speed-particle speed-particle-3" />
                <div className="speed-particle speed-particle-4" />
                <div className="speed-particle speed-particle-5" />
                <div className="speed-particle speed-particle-6" />
              </>
              
              <p style={{ 
                fontSize: 'clamp(24px, 3vw, 32px)', 
                fontWeight: '400', 
                color: 'rgb(102, 102, 102)', 
                lineHeight: '1.6',
                margin: 0,
                textAlign: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                position: 'relative',
                zIndex: 2,
              }}>
                Create faster
              </p>
            </div>

            {/* Card 2 - Coral */}
            {/* <div
              style={{
                width: '100%',
                maxWidth: '280px',
                margin: '0 auto',
                aspectRatio: '3 / 4',
                    border: '1px solid rgb(229, 229, 229)',
                borderRadius: '12px',
                padding: '24px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                background: 'rgb(235, 185, 173)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 8px 24px rgba(235, 185, 173, 0.6), 0 4px 12px rgba(235, 185, 173, 0.4)',
              }}
            >
              {/* Icon in the middle */}
              {/* <div 
                className="sound-icon-animating"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1,
                }}
              >
                <MessageSquare 
                  size={80} 
                  color="#ffffff"
                  fill="#ffffff"
                  strokeWidth={2.5}
                />
              </div>

              {/* Sound waves animation */}
              {/* <>
                <div className="sound-wave sound-wave-1" />
                <div className="sound-wave sound-wave-2" />
                <div className="sound-wave sound-wave-3" />
              </>
              
              <p style={{ 
                fontSize: 'clamp(24px, 3vw, 32px)', 
                fontWeight: '400', 
                color: 'rgb(102, 102, 102)', 
                lineHeight: '1.6',
                margin: 0,
                textAlign: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                position: 'relative',
                zIndex: 2,
              }}>
                Sound human
              </p>
            </div>

            {/* Card 3 - Teal */}
            {/* <div
              style={{
                width: '100%',
                maxWidth: '280px',
                margin: '0 auto',
                aspectRatio: '3 / 4',
                    border: '1px solid rgb(229, 229, 229)',
                borderRadius: '12px',
                padding: '24px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                background: 'rgb(188,230,226)',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 8px 24px rgba(188, 230, 226, 0.6), 0 4px 12px rgba(188, 230, 226, 0.4)',
              }}
            >
              {/* Icon in the middle */}
              {/* <div 
                className="consistent-icon-animating"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1,
                }}
              >
                <CheckCircle 
                  size={80} 
                  color="#ffffff"
                  fill="#ffffff"
                  strokeWidth={2.5}
                />
              </div>

              {/* Consistency rings animation */}
              {/* <>
                <div className="consistent-ring consistent-ring-1" />
                <div className="consistent-ring consistent-ring-2" />
                <div className="consistent-ring consistent-ring-3" />
              </>
              
              <p style={{ 
                fontSize: 'clamp(24px, 3vw, 32px)', 
                fontWeight: '400', 
                color: 'rgb(102, 102, 102)', 
                lineHeight: '1.6',
                margin: 0,
                textAlign: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                position: 'relative',
                zIndex: 2,
              }}>
                Stay consistent
              </p>
            </div>
          </div>
        </div>
      </section> */}

      {/* Comparison Table */}
      <section
        style={{
          padding: '120px 24px',
          background: '#F5F5F5',
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
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
              }}
            >
              Speed. Consistency. <span style={{ fontFamily: 'var(--font-playfair-display), serif', fontStyle: 'italic' }}>Conversion.</span>
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
              Cut your content creation time by 90% and scale your output without ever hiring a team.
            </p>
          </div>
          <div
            style={{
              background: '#ffffff',
              borderRadius: '24px',
                    border: '1px solid rgb(229, 229, 229)',
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
              <div style={{ 
                padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', 
                borderBottom: '1px solid rgb(229, 229, 229)',
                wordWrap: 'break-word', 
                overflowWrap: 'break-word' 
              }}></div>
              <div style={{ 
                textAlign: 'center', 
                padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', 
                borderBottom: '1px solid rgb(229, 229, 229)', 
                wordWrap: 'break-word', 
                overflowWrap: 'break-word' 
              }}>Canva</div>
              <div style={{ 
                textAlign: 'center', 
                background: '#ffbd59', 
                padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', 
                borderBottom: '1px solid rgb(229, 229, 229)', 
                wordWrap: 'break-word', 
                overflowWrap: 'break-word' 
              }}>Post My Note</div>
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
                <div style={{ 
                  fontWeight: '600', 
                  color: '#000000', 
                  fontSize: 'clamp(13px, 2vw, 19px)', 
                  padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', 
                  borderTop: index === 0 ? 'none' : '1px solid rgb(229, 229, 229)', 
                  wordWrap: 'break-word', 
                  overflowWrap: 'break-word' 
                }}>{row.metric}</div>
                <div style={{ 
                  textAlign: 'center', 
                  color: '#999999', 
                  fontSize: 'clamp(13px, 2vw, 19px)', 
                  padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', 
                  borderTop: index === 0 ? 'none' : '1px solid rgb(229, 229, 229)', 
                  wordWrap: 'break-word', 
                  overflowWrap: 'break-word' 
                }}>{row.manual}</div>
                <div style={{ 
                  textAlign: 'center', 
                  color: '#000000', 
                  fontWeight: '600', 
                  fontSize: 'clamp(13px, 2vw, 19px)', 
                  background: '#ffbd59', 
                  padding: 'clamp(16px, 3vw, 24px) clamp(16px, 4vw, 32px)', 
                  borderTop: index === 0 ? 'none' : '1px solid rgb(229, 229, 229)', 
                  wordWrap: 'break-word', 
                  overflowWrap: 'break-word' 
                }}>
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
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
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
          <Link
            href={user ? "/app" : "/signup"}
            className="cta-button"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              borderRadius: '12px',
              background: '#ffbd59',
              color: '#000000',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              border: '1px solid rgba(0, 0, 0, 0.1)',
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
            maxWidth: '1000px',
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
            <Link href="/" style={{ color: '#999999', fontSize: '14px', textDecoration: 'none' }}>
              Home
            </Link>
            <Link href="/signup" style={{ color: '#999999', fontSize: '14px', textDecoration: 'none' }}>
              Get Started
            </Link>
          </div>
        </div>
      </footer>
      <style jsx global>{`
        .hero-section {
          display: none !important;
        }

        @media (max-width: 768px) {
          .hero-section {
            display: none !important;
          }
        }

        @media (max-width: 1024px) {
          .hero-section {
            display: none !important;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUpCard {
          from {
            opacity: 0;
            transform: rotate(5deg) translateY(30px);
          }
          to {
            opacity: 1;
            transform: rotate(5deg) translateY(0);
          }
        }

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

        @keyframes slideCarouselScroll {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .scroll-row-diagonal-2:hover,
        .scroll-row-diagonal-3:hover,
        .scroll-row-diagonal-4:hover,
        .scroll-row-diagonal-5:hover,
        .scroll-row-diagonal-6:hover,
        .scroll-row-diagonal-7:hover,
        .scroll-row-diagonal-8:hover {
          animation-play-state: paused;
        }

        .hero-carousel-container:hover .scroll-row-diagonal-2,
        .hero-carousel-container:hover .scroll-row-diagonal-3,
        .hero-carousel-container:hover .scroll-row-diagonal-4,
        .hero-carousel-container:hover .scroll-row-diagonal-5,
        .hero-carousel-container:hover .scroll-row-diagonal-6,
        .hero-carousel-container:hover .scroll-row-diagonal-7,
        .hero-carousel-container:hover .scroll-row-diagonal-8 {
          animation-play-state: paused;
        }

        @keyframes carouselPop {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(0.95);
          }
          100% {
            transform: scale(1);
          }
        }

        .carousel-card {
          transition: none;
        }

        .carousel-card:hover {
          transition: none;
        }

        .carousel-card:hover img,
        .carousel-card:hover [style*="border-radius"] {
          /* Animation disabled for performance */
        }

        .carousel-card:active {
          /* Animation disabled for performance */
        }

        .carousel-card:active img,
        .carousel-card:active [style*="border-radius"] {
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

        @keyframes blink {
          0%, 50% {
            opacity: 1;
          }
          51%, 100% {
            opacity: 0;
          }
        }

        /* Create Faster Animation - Icon Based */
        .speed-icon {
          transition: all 0.3s ease;
        }

        .speed-icon-animating {
          animation: speedIconPulse 1.5s ease-in-out infinite, speedIconRotate 2s ease-in-out infinite;
        }

        @keyframes speedIconPulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.3);
          }
          100% {
            transform: translate(-50%, -50%) scale(1.1);
          }
        }

        @keyframes speedIconRotate {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          25% {
            transform: translate(-50%, -50%) rotate(-15deg);
          }
          75% {
            transform: translate(-50%, -50%) rotate(15deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(0deg);
          }
        }

        @keyframes speedRingExpand {
          0% {
            width: 0;
            height: 0;
            opacity: 0.8;
            border-width: 3px;
          }
          100% {
            width: 200px;
            height: 200px;
            opacity: 0;
            border-width: 1px;
          }
        }

        .speed-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 3px solid rgba(255, 189, 89, 0.6);
          border-radius: 50%;
          z-index: 0;
        }

        .speed-ring-1 {
          animation: speedRingExpand 1.5s ease-out infinite;
        }

        .speed-ring-2 {
          animation: speedRingExpand 1.5s ease-out 0.5s infinite;
        }

        .speed-ring-3 {
          animation: speedRingExpand 1.5s ease-out 1s infinite;
        }

        @keyframes speedParticleMove {
          0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        .speed-particle {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 8px;
          height: 8px;
          background: #ffbd59;
          border-radius: 50%;
          z-index: 0;
        }

        .speed-particle-1 {
          animation: speedParticleMove 0.8s ease-out;
          transform: translate(-50%, -50%);
          animation-fill-mode: forwards;
        }
        .speed-particle-1::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          animation: speedParticleMove 0.8s ease-out;
          transform: translate(60px, -40px);
        }

        .speed-particle-2 {
          animation: speedParticleMove 0.8s ease-out 0.1s;
          transform: translate(-50%, -50%);
          animation-fill-mode: forwards;
        }
        .speed-particle-2::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          animation: speedParticleMove 0.8s ease-out 0.1s;
          transform: translate(-60px, -40px);
        }

        .speed-particle-3 {
          animation: speedParticleMove 0.8s ease-out 0.2s;
          transform: translate(-50%, -50%);
          animation-fill-mode: forwards;
        }
        .speed-particle-3::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          animation: speedParticleMove 0.8s ease-out 0.2s;
          transform: translate(40px, 60px);
        }

        .speed-particle-4 {
          animation: speedParticleMove 0.8s ease-out 0.15s;
          transform: translate(-50%, -50%);
          animation-fill-mode: forwards;
        }
        .speed-particle-4::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          animation: speedParticleMove 0.8s ease-out 0.15s;
          transform: translate(-40px, 60px);
        }

        .speed-particle-5 {
          animation: speedParticleMove 0.8s ease-out 0.05s;
          transform: translate(-50%, -50%);
          animation-fill-mode: forwards;
        }
        .speed-particle-5::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          animation: speedParticleMove 0.8s ease-out 0.05s;
          transform: translate(0px, -80px);
        }

        .speed-particle-6 {
          animation: speedParticleMove 0.8s ease-out 0.25s;
          transform: translate(-50%, -50%);
          animation-fill-mode: forwards;
        }
        .speed-particle-6::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          animation: speedParticleMove 0.8s ease-out 0.25s;
          transform: translate(0px, 80px);
        }

        @keyframes speedParticleMove1 {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(60px, -40px) scale(1);
            opacity: 0;
          }
        }

        @keyframes speedParticleMove2 {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(-60px, -40px) scale(1);
            opacity: 0;
          }
        }

        @keyframes speedParticleMove3 {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(40px, 60px) scale(1);
            opacity: 0;
          }
        }

        @keyframes speedParticleMove4 {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(-40px, 60px) scale(1);
            opacity: 0;
          }
        }

        @keyframes speedParticleMove5 {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(0, -80px) scale(1);
            opacity: 0;
          }
        }

        @keyframes speedParticleMove6 {
          0% {
            transform: translate(-50%, -50%) translate(0, 0) scale(0);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) translate(0, 80px) scale(1);
            opacity: 0;
          }
        }

        .speed-particle-1 {
          animation: speedParticleMove1 1.2s ease-out infinite;
        }

        .speed-particle-2 {
          animation: speedParticleMove2 1.2s ease-out 0.2s infinite;
        }

        .speed-particle-3 {
          animation: speedParticleMove3 1.2s ease-out 0.4s infinite;
        }

        .speed-particle-4 {
          animation: speedParticleMove4 1.2s ease-out 0.3s infinite;
        }

        .speed-particle-5 {
          animation: speedParticleMove5 1.2s ease-out 0.1s infinite;
        }

        .speed-particle-6 {
          animation: speedParticleMove6 1.2s ease-out 0.5s infinite;
        }

        /* Sound Human Animation */
        .sound-icon {
          transition: all 0.3s ease;
        }

        .sound-icon-animating {
          animation: soundIconPulse 1.5s ease-in-out infinite, soundIconBounce 2s ease-in-out infinite;
        }

        @keyframes soundIconPulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.2);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes soundIconBounce {
          0%, 100% {
            transform: translate(-50%, -50%) translateY(0);
          }
          25% {
            transform: translate(-50%, -50%) translateY(-8px);
          }
          75% {
            transform: translate(-50%, -50%) translateY(8px);
          }
        }

        @keyframes soundWaveExpand {
          0% {
            width: 40px;
            height: 40px;
            opacity: 0.6;
            border-width: 2px;
          }
          100% {
            width: 180px;
            height: 180px;
            opacity: 0;
            border-width: 1px;
          }
        }

        .sound-wave {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid rgba(255, 189, 89, 0.5);
          border-radius: 50%;
          z-index: 0;
        }

        .sound-wave-1 {
          animation: soundWaveExpand 1.5s ease-out infinite;
        }

        .sound-wave-2 {
          animation: soundWaveExpand 1.5s ease-out 0.5s infinite;
        }

        .sound-wave-3 {
          animation: soundWaveExpand 1.5s ease-out 1s infinite;
        }

        /* Stay Consistent Animation */
        .consistent-icon {
          transition: all 0.3s ease;
        }

        .consistent-icon-animating {
          animation: consistentIconPulse 1.5s ease-in-out infinite, consistentIconRotate 3s linear infinite;
        }

        @keyframes consistentIconPulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          50% {
            transform: translate(-50%, -50%) scale(1.25);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
        }

        @keyframes consistentIconRotate {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
          }
          50% {
            transform: translate(-50%, -50%) rotate(180deg);
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }

        @keyframes consistentRingExpand {
          0% {
            width: 0;
            height: 0;
            opacity: 0.7;
            border-width: 2px;
          }
          100% {
            width: 180px;
            height: 180px;
            opacity: 0;
            border-width: 1px;
          }
        }

        .consistent-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          border: 2px solid rgba(255, 189, 89, 0.6);
          border-radius: 50%;
          z-index: 0;
        }

        .consistent-ring-1 {
          animation: consistentRingExpand 1.5s ease-out infinite;
        }

        .consistent-ring-2 {
          animation: consistentRingExpand 1.5s ease-out 0.5s infinite;
        }

        .consistent-ring-3 {
          animation: consistentRingExpand 1.5s ease-out 1s infinite;
        }

        @media (max-width: 1024px) {
          .hero-split-section {
            grid-template-columns: 1fr !important;
            padding: 0 !important;
            min-height: 110vh !important;
          }

          .header-inner {
            padding: 0 24px !important;
          }

          /* Cards grid responsive */
          .creators-cards-grid {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }

          /* Hero section mobile layout - Hidden */
          .hero-section {
            display: none !important;
          }

          .hero-content {
            padding: 80px 24px !important;
            padding-top: 80px !important;
            padding-bottom: 160px !important;
            order: 1;
            width: 100% !important;
            text-align: center !important;
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
          }

          .hero-content h1 {
            text-align: center !important;
          }

          .hero-content p,
          .hero-content .hero-description {
            text-align: center !important;
            margin-left: auto !important;
            margin-right: auto !important;
            font-size: clamp(16px, 2vw, 18px) !important;
          }

          .hero-content > div:first-of-type {
            margin-left: auto !important;
            margin-right: auto !important;
          }

          .hero-content > div:last-of-type {
            justify-content: center !important;
            width: 100% !important;
          }

          .hero-carousel-container {
            position: relative !important;
            width: 100% !important;
            height: 500px !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
            padding-top: 24px !important;
            padding-bottom: 48px !important;
            top: auto !important;
            right: auto !important;
            order: 2;
          }

          /* Features section mobile layout */
          section[style*="background: rgb(250, 248, 245)"],
          section[style*="background: #faf8f5"] {
            padding: 48px 24px !important;
          }

          .features-grid {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }

          .features-card-container {
            order: 2 !important;
            min-height: auto !important;
            padding: 24px 0 !important;
          }

          .features-content {
            order: 1 !important;
            padding: 24px 0 !important;
            text-align: center !important;
          }

          .features-content h2 {
            text-align: center !important;
          }

          .features-content p {
            text-align: center !important;
          }

          /* Features reversed section mobile layout */
          .features-grid-reversed {
            grid-template-columns: 1fr !important;
            gap: 32px !important;
          }

          .features-card-container-reversed {
            order: 2 !important;
            min-height: auto !important;
            padding: 24px 0 !important;
            grid-column: auto !important;
          }

          .features-content-reversed {
            order: 1 !important;
            padding: 24px 0 !important;
            text-align: center !important;
            grid-column: auto !important;
          }

          .features-content-reversed h2 {
            text-align: center !important;
          }

          .features-content-reversed p {
            text-align: center !important;
          }

          /* Teal card mobile sizing */
          .teal-card {
            max-width: 90% !important;
            min-height: 350px !important;
            padding: 16px !important;
          }

          /* Teal card after state mobile sizing */
          .teal-card-after-state {
            min-width: 90% !important;
            min-height: auto !important;
            padding-bottom: 60px !important;
          }

          /* Create at scale content mobile centering */
          .features-content-scale {
            text-align: center !important;
            padding: 24px 0 !important;
            align-items: center !important;
          }

          .features-content-scale h2 {
            text-align: center !important;
          }

          .features-content-scale p {
            text-align: center !important;
          }

          /* Small teal cards mobile sizing */
          .teal-card-small {
            transform: rotate(5deg) scale(1) !important;
            border-width: 4px !important;
          }

          .teal-card-small:nth-child(1) {
            left: 0 !important;
            top: 0 !important;
          }

          .teal-card-small:nth-child(2) {
            left: 85% !important;
            top: 150% !important;
            transform: translateX(-50%) rotate(5deg) scale(1) !important;
          }

          .teal-card-small:nth-child(3) {
            left: 0 !important;
            top: 250% !important;
          }

          .teal-card-small-image {
            max-width: 130px !important;
          }

          .teal-card-small > div:first-child {
            width: 20px !important;
            height: 20px !important;
          }

          .teal-card-small > div:first-child img {
            width: 20px !important;
            height: 20px !important;
          }
        }
      `}</style>
    </div>
  )
}



