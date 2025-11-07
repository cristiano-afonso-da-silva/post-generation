'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import './globals.css'
import SlideImageGenerator from './components/SlideImageGenerator'
import { FONT_COMBINATIONS, COLOR_THEMES } from './config/slideThemes'
import { useAuth } from './context/AuthContext'

const API_URL = ''

interface Carousel {
  ideaTitle: string
  slides: Array<{
    title: string
    content: string
    kind: 'HOOK' | 'MIDDLE' | 'CTA'
  }>
  caption: string
  underlineWords?: Record<number, { underline: string; highlight: string }>
}

export default function Home() {
  const router = useRouter()
  const { user, loading: authLoading, signOut } = useAuth()
  
  const [accountDescription, setAccountDescription] = useState('')
  const [ideas, setIdeas] = useState<string[]>([])
  const [carousel, setCarousel] = useState<Carousel | null>(null)
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [loadingCarousel, setLoadingCarousel] = useState(false)
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'generating' | 'analysing' | 'rendering' | null>(null)
  const [error, setError] = useState('')
  
  // Theme settings
  const [fontCombinationId, setFontCombinationId] = useState('combination-1')
  const [colorThemeId, setColorThemeId] = useState('purple-black')

  // Save theme changes to localStorage
  useEffect(() => {
    if (carousel) {
      try {
        localStorage.setItem('postGeneration_fontCombinationId', fontCombinationId)
        localStorage.setItem('postGeneration_colorThemeId', colorThemeId)
      } catch (error) {
        console.error('Error saving theme to localStorage:', error)
      }
    }
  }, [fontCombinationId, colorThemeId, carousel])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/landing')
    }
  }, [user, authLoading, router])

  // Load carousel from localStorage on mount
  useEffect(() => {
    if (user && !authLoading) {
      try {
        const savedCarousel = localStorage.getItem('postGeneration_carousel')
        const savedAccountDescription = localStorage.getItem('postGeneration_accountDescription')
        const savedFontCombination = localStorage.getItem('postGeneration_fontCombinationId')
        const savedColorTheme = localStorage.getItem('postGeneration_colorThemeId')
        
        if (savedCarousel) {
          const parsedCarousel = JSON.parse(savedCarousel)
          setCarousel(parsedCarousel)
        }
        
        if (savedAccountDescription) {
          setAccountDescription(savedAccountDescription)
        }
        
        if (savedFontCombination) {
          setFontCombinationId(savedFontCombination)
        }
        
        if (savedColorTheme) {
          setColorThemeId(savedColorTheme)
        }
      } catch (error) {
        console.error('Error loading from localStorage:', error)
      }
    }
  }, [user, authLoading])

  const handleSignOut = async () => {
    await signOut()
    router.push('/landing')
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading">
          <div className="spinner"></div>
          <span style={{ color: '#000000' }}>Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const generateIdeas = async () => {
    if (!accountDescription.trim()) {
      setError('Please enter a business description')
      return
    }

    setLoadingIdeas(true)
    setError('')
    setIdeas([])
    setCarousel(null)

    try {
      const response = await fetch(`${API_URL}/api/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ideas',
          accountDescription: accountDescription.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        setIdeas(result.data.ideas)
        setError('')
      } else {
        setError(result.error || 'Failed to generate ideas')
      }
    } catch (err: any) {
      console.error('Error:', err)
      setError('Failed to connect to server. Please try again.')
    } finally {
      setLoadingIdeas(false)
    }
  }

  const generateCarousel = async (idea: string) => {
    setSelectedIdea(idea)
    setLoadingCarousel(true)
    setError('')
    setCarousel(null)
    setCurrentStep('generating')

    // Simulate step progression
    setTimeout(() => setCurrentStep('analysing'), 1000)
    setTimeout(() => setCurrentStep('rendering'), 2000)

    try {
      const response = await fetch(`${API_URL}/api/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'carousel',
          ideaTitle: idea,
          accountDescription: accountDescription.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        setCarousel(result.data)
        // Save to localStorage
        try {
          localStorage.setItem('postGeneration_carousel', JSON.stringify(result.data))
          localStorage.setItem('postGeneration_accountDescription', accountDescription.trim())
          localStorage.setItem('postGeneration_fontCombinationId', fontCombinationId)
          localStorage.setItem('postGeneration_colorThemeId', colorThemeId)
        } catch (error) {
          console.error('Error saving to localStorage:', error)
        }
        setError('')
        setCurrentStep(null)
      } else {
        setError(result.error || 'Failed to generate carousel')
        setCurrentStep(null)
      }
    } catch (err: any) {
      console.error('Error:', err)
      setError('Failed to connect to server. Please try again.')
      setCurrentStep(null)
    } finally {
      setLoadingCarousel(false)
    }
  }

  const reset = () => {
    setAccountDescription('')
    setIdeas([])
    setCarousel(null)
    setSelectedIdea(null)
    setCurrentStep(null)
    setError('')
    // Clear localStorage
    try {
      localStorage.removeItem('postGeneration_carousel')
      localStorage.removeItem('postGeneration_accountDescription')
      localStorage.removeItem('postGeneration_fontCombinationId')
      localStorage.removeItem('postGeneration_colorThemeId')
      localStorage.removeItem('postGeneration_canvasImages')
      localStorage.removeItem('postGeneration_contentHash')
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{
        borderBottom: '2px solid #e5e5e5',
        padding: '24px 0',
        background: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Link 
            href="/landing" 
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: '#666666', fontWeight: '500' }}>{user.email}</span>
            <button
              onClick={handleSignOut}
              className="button secondary"
              style={{ padding: '10px 20px', fontSize: '14px' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {/* Input Section - Always Visible */}
        <div style={{ marginBottom: '40px' }}>
          <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', color: '#000000' }}>
              Describe Your Business
            </h2>
            <p style={{ color: '#666666', marginBottom: '24px', fontSize: '15px' }}>
              Tell us about your business to generate post ideas
            </p>
            
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                className="input"
                placeholder="e.g., productivity coach helping remote workers overcome procrastination"
                value={accountDescription}
                onChange={(e) => setAccountDescription(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && generateIdeas()}
                style={{ flex: 1, minWidth: '300px' }}
              />
              <button
                className="button"
                onClick={generateIdeas}
                disabled={loadingIdeas || !accountDescription.trim()}
                style={{ minWidth: '150px' }}
              >
                {loadingIdeas ? 'Generating...' : 'Generate Ideas'}
              </button>
              {(ideas.length > 0 || carousel) && (
                <button
                  className="button secondary"
                  onClick={reset}
                  style={{ minWidth: '120px' }}
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="error" style={{ maxWidth: '900px', margin: '0 auto 32px' }}>
            {error}
          </div>
        )}

        {/* Ideas Section */}
        {ideas.length > 0 && !selectedIdea && (
          <div style={{ marginBottom: '40px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#000000' }}>
                Choose an Idea
              </h3>
              <div style={{ display: 'grid', gap: '12px' }}>
                {ideas.map((idea, index) => (
                  <button
                    key={index}
                    onClick={() => generateCarousel(idea)}
                    disabled={loadingCarousel}
                    className="idea-button"
                  >
                    <span className="idea-number">{index + 1}</span>
                    <span style={{ flex: 1 }}>{idea}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Loading Steps Section */}
        {selectedIdea && loadingCarousel && (
          <div style={{ marginBottom: '40px' }}>
            <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '32px', color: '#000000' }}>
                {selectedIdea}
              </h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Generating Step */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '8px',
                  background: currentStep === 'generating' ? '#f5f5f5' : 'transparent',
                  transition: 'background 0.2s'
                }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {currentStep === 'generating' ? (
                      <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                    ) : currentStep && ['analysing', 'rendering'].includes(currentStep) ? (
                      <span style={{ color: '#ffbd59', fontSize: '20px' }}>✓</span>
                    ) : (
                      <span style={{ color: '#999999', fontSize: '20px' }}>○</span>
                    )}
                  </div>
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: currentStep === 'generating' ? '600' : '400',
                    color: currentStep === 'generating' ? '#000000' : currentStep && ['analysing', 'rendering'].includes(currentStep) ? '#ffbd59' : '#999999'
                  }}>
                    Generating
                  </span>
                </div>

                {/* Analysing Step */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '8px',
                  background: currentStep === 'analysing' ? '#f5f5f5' : 'transparent',
                  transition: 'background 0.2s'
                }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {currentStep === 'analysing' ? (
                      <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                    ) : currentStep === 'rendering' ? (
                      <span style={{ color: '#ffbd59', fontSize: '20px' }}>✓</span>
                    ) : (
                      <span style={{ color: '#999999', fontSize: '20px' }}>○</span>
                    )}
                  </div>
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: currentStep === 'analysing' ? '600' : '400',
                    color: currentStep === 'analysing' ? '#000000' : currentStep === 'rendering' ? '#ffbd59' : '#999999'
                  }}>
                    Analysing
                  </span>
                </div>

                {/* Rendering Step */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '16px',
                  padding: '16px',
                  borderRadius: '8px',
                  background: currentStep === 'rendering' ? '#f5f5f5' : 'transparent',
                  transition: 'background 0.2s'
                }}>
                  <div style={{ 
                    width: '24px', 
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {currentStep === 'rendering' ? (
                      <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                    ) : (
                      <span style={{ color: '#999999', fontSize: '20px' }}>○</span>
                    )}
                  </div>
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: currentStep === 'rendering' ? '600' : '400',
                    color: currentStep === 'rendering' ? '#000000' : '#999999'
                  }}>
                    Rendering
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Carousel Results */}
        {carousel && !loadingCarousel && (
          <div>
            {/* Theme Customization */}
            <div className="card" style={{ maxWidth: '900px', margin: '0 auto 32px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#000000' }}>
                Customize Design
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000000' }}>
                    Font Combination
                  </label>
                  <select
                    value={fontCombinationId}
                    onChange={(e) => setFontCombinationId(e.target.value)}
                    className="input"
                    style={{ cursor: 'pointer', padding: '12px' }}
                  >
                    {FONT_COMBINATIONS.map(combo => (
                      <option key={combo.id} value={combo.id}>
                        {combo.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000000' }}>
                    Color Theme
                  </label>
                  <select
                    value={colorThemeId}
                    onChange={(e) => setColorThemeId(e.target.value)}
                    className="input"
                    style={{ cursor: 'pointer', padding: '12px' }}
                  >
                    {COLOR_THEMES.map(theme => (
                      <option key={theme.id} value={theme.id}>
                        {theme.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Generated Slides */}
            <SlideImageGenerator 
              slides={carousel.slides}
              ideaTitle={carousel.ideaTitle}
              underlineWords={carousel.underlineWords || {}}
              fontCombinationId={fontCombinationId}
              colorThemeId={colorThemeId}
            />

            {/* Slides Content */}
            <div className="card" style={{ maxWidth: '900px', margin: '32px auto' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#000000' }}>
                Slides Content
              </h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                {carousel.slides.map((slide, index) => (
                  <div 
                    key={index}
                    className={`slide-card ${slide.kind === 'HOOK' ? 'hook' : slide.kind === 'CTA' ? 'cta' : 'middle'}`}
                  >
                    <div style={{ 
                      fontSize: '11px', 
                      fontWeight: '700', 
                      color: '#999999', 
                      marginBottom: '12px',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}>
                      Slide {index + 1} • {slide.kind}
                    </div>
                    {slide.title && (
                      <div style={{ 
                        fontWeight: '700', 
                        marginBottom: '8px', 
                        color: '#000000', 
                        fontSize: '17px',
                        lineHeight: '1.4'
                      }}>
                        {slide.title}
                      </div>
                    )}
                    {slide.content && (
                      <div style={{ 
                        color: '#333333', 
                        fontSize: '15px',
                        lineHeight: '1.6'
                      }}>
                        {slide.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Caption */}
            <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#000000' }}>
                Instagram Caption
              </h3>
              <div style={{ 
                padding: '20px', 
                background: '#fafafa',
                border: '2px solid #e5e5e5',
                borderRadius: '12px',
                whiteSpace: 'pre-wrap',
                fontSize: '15px',
                lineHeight: '1.8',
                color: '#000000'
              }}>
                {carousel.caption}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
