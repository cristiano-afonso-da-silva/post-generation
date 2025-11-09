'use client'
import type { CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Check, ArrowRight, Zap, Palette, Download } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AccountButton from '../components/AccountButton'
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
  { title: 'Drop an idea prompt', subtitle: 'Describe what you want to teach' },
  { title: 'AI drafts your slides', subtitle: 'Hooks, talking points, captions' },
  { title: 'Pick a theme', subtitle: 'Match fonts, colors, and layout' },
  { title: 'Export & share', subtitle: 'High-res images in seconds' },
]

const comparisonData = [
  { metric: 'Content Creation Time', manual: 'Several hours', postMyNote: '2 minutes' },
  { metric: 'Design Skills Required', manual: 'Professional level', postMyNote: 'None needed' },
  { metric: 'Cost per Post', manual: '$50-200', postMyNote: 'From $0.90' },
  { metric: 'Customization Options', manual: 'Limited by skills', postMyNote: 'Unlimited themes' },
  { metric: 'Consistency', manual: 'Varies', postMyNote: 'Always on-brand' },
]

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Content Creator',
    quote: 'I used to spend 3-4 hours designing carousel posts. Now it takes me 2 minutes. This tool has completely transformed my workflow.',
  },
  {
    name: 'Marcus Johnson',
    role: 'Marketing Director',
    quote: 'Our engagement rate increased by 40% after switching to carousel posts. Post My Note makes it effortless to create professional content.',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Small Business Owner',
    quote: 'As someone with zero design skills, this is a game-changer. I can finally compete with bigger brands on social media.',
  },
  {
    name: 'David Kim',
    role: 'Social Media Manager',
    quote: 'The AI understands context perfectly. Every carousel feels authentic and engaging. My clients love the results.',
  },
  {
    name: 'Lisa Thompson',
    role: 'Entrepreneur',
    quote: 'Best investment for my business. The time I save on content creation goes straight into growing my company.',
  },
  {
    name: 'James Wilson',
    role: 'Digital Marketer',
    quote: 'Clean, professional, and incredibly fast. This tool has become essential to our content strategy.',
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
              gap: '12px',
              fontSize: '20px',
              fontWeight: '700', 
              color: '#000000', 
              textDecoration: 'none',
            }}
          >
            <Image src="/logo.svg" alt="Post My Note" width={32} height={32} priority style={{ width: '32px', height: '32px' }} />
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
                  background: '#ffbd59',
                  color: '#000000',
                  fontSize: '14px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                Get Started Free
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          minHeight: '95vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        padding: '120px 24px 80px',
        textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Rings */}
        <div
          style={{
            position: 'absolute',
            inset: '0',
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {/* Left Ring */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '0',
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              style={
                {
                  width: 'min(92vw, 736px)',
                  aspectRatio: '1 / 1',
                  '--ring-radius': 'clamp(220px, 32vw, 300px)',
                  animation: 'ringSpin 40s linear infinite',
                } as CSSProperties
              }
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 'calc(var(--ring-radius) * 2 + 184px)',
                  height: 'calc(var(--ring-radius) * 2 + 184px)',
                  borderRadius: '50%',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  zIndex: 0,
                }}
              />

              {exampleSlides.map((slide, index) => {
                const angle = (index / exampleSlides.length) * 360
                return (
                  <div
                    key={`hero-left-${slide.src}`}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(var(--ring-radius) * -1)) rotate(${-angle}deg)`,
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        animation: 'ringCounterSpin 40s linear infinite',
                      }}
                    >
                      <Image
                        src={slide.src}
                        alt={slide.alt}
                        width={360}
                        height={460}
                        style={{
                          width: 'clamp(150px, 20vw, 200px)',
                          height: 'auto',
                          borderRadius: '24px',
                          objectFit: 'cover',
                          boxShadow: '0 28px 54px rgba(17, 24, 39, 0.14)',
                          border: '5px solid #ffffff',
                          background: '#ffffff',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Ring */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              right: '0',
              transform: 'translate(50%, -50%)',
            }}
          >
            <div
              style={
                {
                  width: 'min(92vw, 736px)',
                  aspectRatio: '1 / 1',
                  '--ring-radius': 'clamp(220px, 32vw, 300px)',
                  animation: 'ringSpin -40s linear infinite',
                } as CSSProperties
              }
            >
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 'calc(var(--ring-radius) * 2 + 184px)',
                  height: 'calc(var(--ring-radius) * 2 + 184px)',
                  borderRadius: '50%',
                  border: '1px solid rgba(255, 255, 255, 0.4)',
                  zIndex: 0,
                }}
              />

              {exampleSlides.map((slide, index) => {
                const angle = (index / exampleSlides.length) * 360
                return (
                  <div
                    key={`hero-right-${slide.src}`}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateY(calc(var(--ring-radius) * -1)) rotate(${-angle}deg)`,
                      zIndex: 1,
                    }}
                  >
                    <div
                      style={{
                        animation: 'ringCounterSpin -40s linear infinite',
                      }}
                    >
                      <Image
                        src={slide.src}
                        alt={slide.alt}
                        width={360}
                        height={460}
                        style={{
                          width: 'clamp(150px, 20vw, 200px)',
                          height: 'auto',
                          borderRadius: '24px',
                          objectFit: 'cover',
                          boxShadow: '0 28px 54px rgba(17, 24, 39, 0.14)',
                          border: '5px solid #ffffff',
                          background: '#ffffff',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

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
              letterSpacing: '-3px',
          color: '#000000',
              marginBottom: '24px',
            }}
          >
            Content creation made simple with AI
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
            Post My Note plugs into your workflow, so you can ditch the boring design work and focus on growing your audience.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <Link
          href="/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 32px',
                borderRadius: '999px',
                background: '#ffbd59',
                color: '#000000',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>
          </div>
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
            justifyContent: 'space-between',
          }}
        >
          <div style={{ flex: '1 1 380px', maxWidth: '520px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                borderRadius: '999px',
                background: '#fff5e6',
                color: '#cc8800',
                fontSize: '12px',
                fontWeight: '600',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                marginBottom: '24px',
              }}
            >
              Automate workflows
            </div>
            <h2
              style={{
                fontSize: 'clamp(36px, 6vw, 60px)',
                fontWeight: '800',
                color: '#000000',
                letterSpacing: '-2px',
                marginBottom: '20px',
              }}
            >
              Save 4+ hours every day
            </h2>
            <p
              style={{
                fontSize: '18px',
                color: '#666666',
                lineHeight: '1.7',
                marginBottom: '32px',
              }}
            >
              Let our intelligent automation handle the repetitive design work so you can stay focused on strategy and growth.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '36px' }}>
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      gap: '16px',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '14px',
                        background: '#fff1cc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon size={22} color="#000000" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#000000', marginBottom: '6px' }}>
                        {feature.title}
                      </h3>
                      <p style={{ color: '#666666', fontSize: '15px', lineHeight: '1.6' }}>{feature.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <Link
              href="/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 32px',
                borderRadius: '999px',
                background: '#ffbd59',
                color: '#000000',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
            >
              Get Started Free
              <ArrowRight size={18} />
            </Link>
          </div>
          <div style={{ flex: '1 1 320px', display: 'flex', justifyContent: 'center' }}>
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
                      <div style={{ fontSize: '13px', color: '#6b6b6b' }}>{step.subtitle}</div>
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
              Your competitors are using AI for a reason
        </h2>
            <p style={{ fontSize: '18px', color: '#666666' }}>
              Compare how your workflow transforms with automation and efficiency.
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
            <div
              style={{
          display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr',
                padding: '24px 32px',
                background: '#fafafa',
                fontWeight: '700',
                fontSize: '14px',
                color: '#000000',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              <div></div>
              <div style={{ textAlign: 'center' }}>Manual Work</div>
              <div style={{ textAlign: 'center', color: '#ffbd59' }}>Post My Note</div>
            </div>
            {comparisonData.map((row, index) => (
              <div
                key={index}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr 1fr',
                  padding: '24px 32px',
                  borderTop: '1px solid #f0f0f0',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontWeight: '600', color: '#000000', fontSize: '15px' }}>{row.metric}</div>
                <div style={{ textAlign: 'center', color: '#999999', fontSize: '14px' }}>{row.manual}</div>
                <div style={{ textAlign: 'center', color: '#000000', fontWeight: '600', fontSize: '14px' }}>
                  {row.postMyNote}
                </div>
            </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section
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
              Don't take it from us, hear it from our users
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
      </section>

      {/* Pricing */}
      <section
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
              Simple, transparent pricing
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
      </section>

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
          <p style={{ fontSize: '18px', color: '#999999', marginBottom: '48px', lineHeight: '1.6' }}>
            If you're looking to save time and focus on what really matters, Post My Note is here for you.
          </p>
          <Link
            href="/signup"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 40px',
              borderRadius: '999px',
              background: '#ffbd59',
              color: '#000000',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            Get Started Free
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
      `}</style>
    </div>
  )
}
