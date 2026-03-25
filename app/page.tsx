'use client'
import Link from 'next/link'
import Image from 'next/image'
import { Check, ArrowRight, Zap, Palette, Download } from 'lucide-react'
import { useAuth } from './context/AuthContext'
import AccountButton from './components/AccountButton'

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
  { metric: 'Speed', manual: '15–30 min', postMyNote: '~2 min' },
  { metric: 'Workflow', manual: 'Manual design', postMyNote: 'Automated' },
  { metric: 'Skill', manual: 'Design needed', postMyNote: 'None needed' },
  { metric: 'Volume', manual: 'One post', postMyNote: 'Batch create' },
  { metric: 'Revisions', manual: 'Manual edits', postMyNote: '1-click regenerate' },
  { metric: 'Purpose', manual: 'General design', postMyNote: 'Made for creators and founders' },
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
  const { user, loading, credits } = useAuth()

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff' }}>
        <div className="loading">
          <div className="spinner"></div>
          <span style={{ color: '#000000' }}>Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', opacity: 1 }}>
      {/* Navigation */}
      <nav
        style={{
          position: 'sticky',
          top: '16px',
          zIndex: 100,
          padding: '0 24px',
          marginBottom: '0',
        }}
      >
        <div
          style={{
            maxWidth: '960px',
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
              <AccountButton />
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

      {/* Hero Section */}
      <section
        style={{
          minHeight: '85vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        padding: '20px 24px 80px',
        textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '900px', position: 'relative', zIndex: 10 }}>
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
            <span>Trusted by 2,500+ creators</span>
          </div>
          <h1
            style={{
              fontSize: 'clamp(48px, 8vw, 84px)',
              fontWeight: '800',
          lineHeight: '1.1',
              letterSpacing: '-1px',
          color: '#000000',
              marginBottom: '24px',
            }}
          >
            Create better content, faster.
        </h1>
          <p
            style={{
              fontSize: 'clamp(18px, 2.5vw, 22px)',
          color: '#666666',
          marginBottom: '48px',
              lineHeight: '1.6',
              maxWidth: '700px',
          margin: '0 auto 48px',
            }}
          >
            Turn your ideas into post-ready content in minutes. No design skills or marketing team needed.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
        <Link
          href={user ? "/dashboard?view=create" : "/signup"}
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
            <a
              href="https://discord.gg/tcbedyah"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: '#666666',
                fontSize: '14px',
                fontWeight: '500',
                textDecoration: 'underline',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ffbd59'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#666666'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.007-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928-1.793 8.018-1.793 11.886 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              Give us feedback to gain lifetime usage
            </a>
          </div>
        </div>
      </section>

      {/* Scrolling Images Section */}
      <section
        className="scrolling-carousel-section"
        style={{
          padding: '60px 0',
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '40px', padding: '0 24px' }}>
          <h2
            style={{
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: '800',
              color: '#000000',
              letterSpacing: '-2px',
              marginBottom: '16px',
            }}
          >
            Create a full carousel from one idea
          </h2>
        </div>
        {/* First Row - Scroll Left */}
        <div
          className="scroll-row-left"
          style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '24px',
            width: 'fit-content',
            animation: 'scrollLeft 30s linear infinite',
          }}
        >
          {[...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
            <div
              key={`left-${index}`}
              className="carousel-card"
              style={{
                flexShrink: 0,
                width: 'clamp(200px, 25vw, 300px)',
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

        {/* Second Row - Scroll Right */}
        <div
          className="scroll-row-right"
          style={{
            display: 'flex',
            gap: '24px',
            width: 'fit-content',
            animation: 'scrollRight 30s linear infinite',
          }}
        >
          {[...exampleSlides, ...exampleSlides, ...exampleSlides].map((slide, index) => (
            <div
              key={`right-${index}`}
              className="carousel-card"
              style={{
                flexShrink: 0,
                width: 'clamp(200px, 25vw, 300px)',
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
      </section>

      {/* Features */}
      <section
        style={{
          padding: '120px 24px',
          background: '#ffffff',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '64px',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="features-heading" style={{ flex: '1 1 400px', maxWidth: '520px', display: 'flex', flexDirection: 'column' }}>
            <h2
              style={{
                fontSize: 'clamp(36px, 6vw, 60px)',
                fontWeight: '800',
                color: '#000000',
                letterSpacing: '-2px',
              }}
            >
              Create content in 3 simple steps
            </h2>
            <p
              style={{
                fontSize: 'clamp(18px, 2.5vw, 22px)',
                color: '#666666',
                marginTop: '16px',
                lineHeight: '1.6',
                maxWidth: '700px',
              }}
            >
              From idea to post in under two minutes, no design, no overthinking.
            </p>
          </div>
          <div style={{ flex: '1 1 400px', maxWidth: '520px', display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                width: '100%',
                maxWidth: '420px',
                borderRadius: '36px',
                padding: '36px',
                background: 'radial-gradient(140% 140% at 0% 0%, rgba(255,189,89,0.25), rgba(255,255,255,0.95))',
                border: '1px solid #ffe3ad',
                boxShadow: '0 40px 80px rgba(255, 189, 89, 0.25)',
              }}
            >
              {workflowPreview.map((step, index) => (
                <div key={step.title} style={{ textAlign: 'left' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      padding: '16px',
                      borderRadius: '20px',
                      background: '#ffffff',
                      boxShadow: '0 10px 30px rgba(17, 24, 39, 0.08)',
                    }}
                  >
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '12px',
                        background: '#ffbd59',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        color: '#000000',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#0b0b0b' }}>{step.title}</div>
                      {step.subtitle && <div style={{ fontSize: '13px', color: '#6b6b6b' }}>{step.subtitle}</div>}
                    </div>
                  </div>
                  {index < workflowPreview.length - 1 && (
                    <div
                      style={{
                        width: '2px',
                        height: '40px',
                        background: 'rgba(255, 189, 89, 0.45)',
                        margin: '12px auto',
                      }}
                    />
                  )}
                </div>
              ))}
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
              Post My Note turns your thoughts into clean, on-brand carousels so you can share faster and stay consistent.
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
            Ready to create smarter?
          </h2>
          <Link
            href={user ? "/dashboard?view=create" : "/signup"}
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

        @keyframes scrollLeft {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(calc(-100% / 3));
          }
        }

        @keyframes scrollRight {
          from {
            transform: translateX(calc(-100% / 3));
          }
          to {
            transform: translateX(0);
          }
        }

        .scroll-row-left:hover,
        .scroll-row-right:hover {
          animation-play-state: paused;
        }

        .scrolling-carousel-section:hover .scroll-row-left,
        .scrolling-carousel-section:hover .scroll-row-right {
          animation-play-state: paused;
        }

        .carousel-card:hover {
          transform: scale(1.02);
          transition: transform 0.2s ease;
        }

        .carousel-card:active {
          transform: scale(0.98);
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
      `}</style>
    </div>
  )
}

