'use client'

import { useState } from 'react'
import './globals.css'
import SlideImageGenerator from './components/SlideImageGenerator'
import { FONT_COMBINATIONS, COLOR_THEMES } from './config/slideThemes'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

interface Idea {
  ideas: string[]
}

interface Carousel {
  ideaTitle: string
  slides: Array<{
    title: string
    content: string
    kind: 'HOOK' | 'MIDDLE' | 'CTA'
  }>
  caption: string
  formatted: string
  underlineWords?: Record<number, { underline: string; highlight: string }>
  stats: {
    totalSlides: number
    hookWords: number
    middleSlides: number
    captionWords: number
  }
}

export default function Home() {
  const [accountDescription, setAccountDescription] = useState('')
  const [ideas, setIdeas] = useState<string[]>([])
  const [selectedIdea, setSelectedIdea] = useState<string>('')
  const [carousel, setCarousel] = useState<Carousel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'input' | 'ideas' | 'carousel'>('input')
  
  // Theme settings
  const [fontCombinationId, setFontCombinationId] = useState('combination-1')
  const [colorThemeId, setColorThemeId] = useState('purple-black')

  const generateIdeas = async () => {
    if (!accountDescription.trim()) {
      setError('Please enter an account description')
      return
    }

    setLoading(true)
    setError('')
    setStep('ideas')

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
      if (err.message?.includes('fetch')) {
        setError(`Failed to connect to server at ${API_URL}. Make sure the backend is running on port 3000.`)
      } else {
        setError(err.message || 'Failed to connect to server')
      }
    } finally {
      setLoading(false)
    }
  }

  const generateCarousel = async (idea: string) => {
    setLoading(true)
    setError('')
    setSelectedIdea(idea)
    setStep('carousel')

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
        setError('')
      } else {
        setError(result.error || 'Failed to generate carousel')
      }
    } catch (err: any) {
      console.error('Error:', err)
      if (err.message?.includes('fetch')) {
        setError(`Failed to connect to server at ${API_URL}. Make sure the backend is running on port 3000.`)
      } else {
        setError(err.message || 'Failed to connect to server')
      }
    } finally {
      setLoading(false)
    }
  }

  const resetFlow = () => {
    setStep('input')
    setIdeas([])
    setSelectedIdea('')
    setCarousel(null)
    setError('')
  }

  return (
    <div className="container">
      {/* Header */}
      <header style={{ 
        textAlign: 'center', 
        marginBottom: '60px',
        paddingTop: '20px'
      }}>
        <h1 style={{ 
          fontSize: 'clamp(32px, 6vw, 64px)', 
          marginBottom: '16px', 
          fontWeight: '800',
          letterSpacing: '-0.02em'
        }}>
          <span className="gradient-text">AI Post Generator</span>
        </h1>
        <p style={{ 
          fontSize: 'clamp(16px, 2vw, 20px)', 
          opacity: 0.8,
          maxWidth: '600px',
          margin: '0 auto',
          lineHeight: '1.6'
        }}>
          Generate high-quality Instagram carousel posts powered by AI
        </p>
      </header>

      {error && (
        <div className="error">
          ❌ {error}
        </div>
      )}

      {/* Step 1: Account Description Input */}
      {step === 'input' && (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '32px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '700'
            }}>
              1
            </div>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: '700',
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Describe Your Account
            </h2>
          </div>
          
          <p style={{ 
            marginBottom: '24px', 
            color: 'rgba(255,255,255,0.6)', 
            fontSize: '16px',
            lineHeight: '1.6'
          }}>
            Tell us about your account or topic. We'll generate unique post ideas tailored to your audience.
          </p>
          
          <div style={{ marginBottom: '24px' }}>
            <input
              type="text"
              className="input"
              placeholder="e.g., productivity coach helping remote workers overcome procrastination"
              value={accountDescription}
              onChange={(e) => setAccountDescription(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && generateIdeas()}
            />
          </div>
          
          <button
            className="button"
            onClick={generateIdeas}
            disabled={loading || !accountDescription.trim()}
            style={{ width: '100%' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></span>
                Generating...
              </span>
            ) : (
              'Generate Ideas →'
            )}
          </button>
        </div>
      )}

      {/* Step 2: Ideas Selection */}
      {step === 'ideas' && !loading && ideas.length > 0 && (
        <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            marginBottom: '32px'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: '700'
            }}>
              2
            </div>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: '700',
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Choose Your Idea
            </h2>
          </div>
          
          <p style={{ 
            marginBottom: '32px', 
            color: 'rgba(255,255,255,0.6)', 
            fontSize: '16px'
          }}>
            Select an idea to generate a complete carousel post
          </p>
          
          <div style={{ display: 'grid', gap: '16px', marginBottom: '32px' }}>
            {ideas.map((idea, index) => (
              <button
                key={index}
                onClick={() => generateCarousel(idea)}
                disabled={loading}
                className="idea-button"
              >
                <span className="idea-number">{index + 1}</span>
                {idea}
              </button>
            ))}
          </div>
          
          <button
            className="button secondary"
            onClick={resetFlow}
            style={{ width: '100%' }}
          >
            ← Start Over
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="loading">
            <div className="spinner"></div>
            <span style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)' }}>
              {step === 'ideas' ? 'Generating ideas with AI...' : 'Creating your carousel...'}
            </span>
          </div>
        </div>
      )}

      {/* Step 3: Carousel Display */}
      {step === 'carousel' && !loading && carousel && (
        <div>
          {/* Stats Card */}
          <div className="card" style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: '28px', 
              marginBottom: '24px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Generated Carousel
            </h2>
            
            <div style={{ 
              marginBottom: '24px', 
              padding: '20px', 
              background: 'rgba(102, 126, 234, 0.1)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
              borderRadius: '16px'
            }}>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                Selected Idea
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#667eea' }}>
                {selectedIdea}
              </div>
            </div>
            
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{carousel.stats.totalSlides}</div>
                <div className="stat-label">Total Slides</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{carousel.stats.hookWords}</div>
                <div className="stat-label">Hook Words</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{carousel.stats.middleSlides}</div>
                <div className="stat-label">Content Slides</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{carousel.stats.captionWords}</div>
                <div className="stat-label">Caption Words</div>
              </div>
            </div>
          </div>

          {/* Slides Display */}
          <div className="card">
            <h3 style={{ 
              marginBottom: '24px', 
              fontSize: '24px',
              fontWeight: '700'
            }}>
              📱 Carousel Slides
            </h3>
            <div style={{ display: 'grid', gap: '16px' }}>
              {carousel.slides.map((slide, index) => (
                <div 
                  key={index}
                  className={`slide-card ${
                    slide.kind === 'HOOK' ? 'hook' : 
                    slide.kind === 'CTA' ? 'cta' : 
                    'middle'
                  }`}
                >
                  <div style={{ 
                    fontSize: '12px', 
                    fontWeight: '600', 
                    color: 'rgba(255,255,255,0.5)', 
                    marginBottom: '12px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    {slide.kind} • Slide {index + 1}
                  </div>
                  {slide.title && (
                    <div style={{ 
                      fontWeight: '700', 
                      marginBottom: '12px', 
                      color: '#ffffff',
                      fontSize: '18px'
                    }}>
                      {slide.title}
                    </div>
                  )}
                  {slide.content && (
                    <div style={{ 
                      color: 'rgba(255,255,255,0.8)', 
                      fontSize: '16px',
                      lineHeight: '1.6'
                    }}>
                      {slide.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Caption Display */}
          <div className="card">
            <h3 style={{ 
              marginBottom: '24px', 
              fontSize: '24px',
              fontWeight: '700'
            }}>
              📝 Instagram Caption
            </h3>
            <div style={{ 
              padding: '24px', 
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              whiteSpace: 'pre-wrap',
              fontSize: '16px',
              lineHeight: '1.8',
              color: 'rgba(255,255,255,0.9)'
            }}>
              {carousel.caption}
            </div>
          </div>

          {/* Formatted Output */}
          <div className="card">
            <h3 style={{ 
              marginBottom: '24px', 
              fontSize: '24px',
              fontWeight: '700'
            }}>
              📄 Formatted Output
            </h3>
            <pre style={{ 
              whiteSpace: 'pre-wrap',
              fontFamily: 'monospace',
              fontSize: '13px',
              lineHeight: '1.6',
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '24px',
              borderRadius: '12px',
              overflow: 'auto',
              maxHeight: '600px',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.9)'
            }}>
              {carousel.formatted}
            </pre>
          </div>

          {/* Theme Customization */}
          <div className="card" style={{ marginTop: '32px' }}>
            <h3 style={{ 
              fontSize: '24px', 
              fontWeight: '700',
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              🎨 Customize Slide Design
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px'
            }}>
              {/* Font Combination Selector */}
              <div>
                <label style={{ 
                  display: 'block',
                  marginBottom: '12px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Font Combination
                </label>
                <select
                  value={fontCombinationId}
                  onChange={(e) => setFontCombinationId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: 'white',
                    fontSize: '16px',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {FONT_COMBINATIONS.map(combo => (
                    <option key={combo.id} value={combo.id} style={{ background: '#1a1a1a' }}>
                      {combo.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label style={{ 
                  display: 'block',
                  marginBottom: '12px',
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: '14px',
                  fontWeight: '600'
                }}>
                  Color Theme
                </label>
                <select
                  value={colorThemeId}
                  onChange={(e) => setColorThemeId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '2px solid rgba(255,255,255,0.1)',
                    background: 'rgba(0, 0, 0, 0.3)',
                    color: 'white',
                    fontSize: '16px',
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {COLOR_THEMES.map(theme => (
                    <option key={theme.id} value={theme.id} style={{ background: '#1a1a1a' }}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Image Generation */}
          <SlideImageGenerator 
            slides={carousel.slides}
            ideaTitle={carousel.ideaTitle}
            underlineWords={carousel.underlineWords || {}}
            fontCombinationId={fontCombinationId}
            colorThemeId={colorThemeId}
          />

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            marginTop: '32px',
            flexWrap: 'wrap'
          }}>
            <button
              className="button secondary"
              onClick={() => setStep('ideas')}
              style={{ flex: 1, minWidth: '200px' }}
            >
              ← Choose Another Idea
            </button>
            <button
              className="button"
              onClick={resetFlow}
              style={{ flex: 1, minWidth: '200px' }}
            >
              🎨 Start Over
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
