'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { History } from 'lucide-react'
import './globals.css'
import SlideImageGenerator from './components/SlideImageGenerator'
import { FONT_COMBINATIONS, COLOR_THEMES } from './config/slideThemes'
import { useAuth } from './context/AuthContext'
import AccountButton from './components/AccountButton'
import UpgradePrompt from './components/UpgradePrompt'
import SubscriptionModal from './components/SubscriptionModal'

const API_URL = ''

interface Note {
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
  const searchParams = useSearchParams()
  const { user, loading: authLoading, credits, refreshCredits } = useAuth()
  
  const [accountDescription, setAccountDescription] = useState('')
  const [ideas, setIdeas] = useState<string[]>([])
  const [note, setNote] = useState<Note | null>(null)
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [loadingNote, setLoadingNote] = useState(false)
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState<'generating' | 'analysing' | 'rendering' | null>(null)
  const [error, setError] = useState('')
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  
  // Theme settings
  const [fontCombinationId, setFontCombinationId] = useState('combination-1')
  const [colorThemeId, setColorThemeId] = useState('purple-black')

  // Save theme changes to localStorage
  useEffect(() => {
    if (note) {
      try {
        localStorage.setItem('postGeneration_fontCombinationId', fontCombinationId)
        localStorage.setItem('postGeneration_colorThemeId', colorThemeId)
      } catch (error) {
        console.error('Error saving theme to localStorage:', error)
      }
    }
  }, [fontCombinationId, colorThemeId, note])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/landing')
    }
  }, [user, authLoading, router])

  // Handle Stripe checkout success/cancel
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    if (success === 'true') {
      // Refresh credits after successful subscription
      refreshCredits()
      // Clean URL
      router.replace('/')
    } else if (canceled === 'true') {
      // Clean URL
      router.replace('/')
    }
  }, [searchParams, refreshCredits, router])

  // Load note from localStorage on mount
  useEffect(() => {
    if (user && !authLoading) {
      try {
        const savedNote = localStorage.getItem('postGeneration_note')
        const savedAccountDescription = localStorage.getItem('postGeneration_accountDescription')
        const savedFontCombination = localStorage.getItem('postGeneration_fontCombinationId')
        const savedColorTheme = localStorage.getItem('postGeneration_colorThemeId')
        
        if (savedNote) {
          const parsedNote = JSON.parse(savedNote)
          setNote(parsedNote)
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
    setNote(null)

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

  const generateNote = async (idea: string) => {
    if (!user?.id) {
      setError('User not authenticated')
      return
    }

    // Check credits - use context first (already loaded), then API as fallback
    let hasCredits = false
    let creditsRemaining = 0

    // First, check context credits (fastest, already loaded)
    if (credits && credits.credits_remaining !== undefined && credits.credits_remaining !== null) {
      creditsRemaining = credits.credits_remaining
      hasCredits = creditsRemaining > 0
    } else {
      // If context doesn't have credits, check via API
      try {
        const checkResponse = await fetch(`/api/credits/check?userId=${user.id}`)
        if (checkResponse.ok) {
          const checkData = await checkResponse.json()
          creditsRemaining = checkData.creditsRemaining ?? 0
          hasCredits = creditsRemaining > 0
          
          // Update context with fresh data
          if (checkData.creditsRemaining !== undefined) {
            await refreshCredits()
          }
        } else {
          // If API fails, use context as fallback
          creditsRemaining = credits?.credits_remaining ?? 0
          hasCredits = creditsRemaining > 0
        }
      } catch (error) {
        console.error('Error checking credits:', error)
        // If check fails, use context credits as fallback
        creditsRemaining = credits?.credits_remaining ?? 0
        hasCredits = creditsRemaining > 0
      }
    }

    // Check if user has credits (only deduct credit for note generation, not ideas)
    // Generating ideas is FREE - only note generation costs credits
    // Allow generation if user has at least 1 credit (creditsRemaining > 0)
    if (creditsRemaining <= 0) {
      console.log('No credits available. Credits remaining:', creditsRemaining, 'Context credits:', credits)
      setShowUpgradePrompt(true)
      return
    }

    setSelectedIdea(idea)
    setLoadingNote(true)
    setError('')
    setNote(null)
    setCurrentStep('generating')

    // Simulate step progression
    setTimeout(() => setCurrentStep('analysing'), 1000)
    setTimeout(() => setCurrentStep('rendering'), 2000)

    try {
      const response = await fetch(`${API_URL}/api/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'note',
          ideaTitle: idea,
          accountDescription: accountDescription.trim()
        })
      })

      const result = await response.json()

      if (result.success) {
        // Credit will be deducted when slides are actually generated in SlideImageGenerator
        setNote(result.data)
        // Clear generation_id to force new generation creation (new ideaTitle = new generation)
        try {
          localStorage.removeItem('postGeneration_generationId')
          localStorage.removeItem('postGeneration_contentHash')
          localStorage.setItem('postGeneration_note', JSON.stringify(result.data))
          localStorage.setItem('postGeneration_accountDescription', accountDescription.trim())
          localStorage.setItem('postGeneration_fontCombinationId', fontCombinationId)
          localStorage.setItem('postGeneration_colorThemeId', colorThemeId)
        } catch (error) {
          console.error('Error saving to localStorage:', error)
        }
        setError('')
        setCurrentStep(null)
      } else {
        setError(result.error || 'Failed to generate note')
        setCurrentStep(null)
      }
    } catch (err: any) {
      console.error('Error:', err)
      setError('Failed to connect to server. Please try again.')
      setCurrentStep(null)
    } finally {
      setLoadingNote(false)
    }
  }

  const reset = () => {
    setAccountDescription('')
    setIdeas([])
    setNote(null)
    setSelectedIdea(null)
    setCurrentStep(null)
    setError('')
    // Clear localStorage
    try {
      localStorage.removeItem('postGeneration_note')
      localStorage.removeItem('postGeneration_accountDescription')
      localStorage.removeItem('postGeneration_fontCombinationId')
      localStorage.removeItem('postGeneration_colorThemeId')
      localStorage.removeItem('postGeneration_canvasImages')
      localStorage.removeItem('postGeneration_contentHash')
      localStorage.removeItem('postGeneration_generationId')
      localStorage.removeItem('postGeneration_fullContentHash')
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
            {credits && (
              <>
                <Link 
                  href="/history"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: '#f5f5f5',
                    border: '2px solid #e5e5e5',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textDecoration: 'none',
                  }}
                  title="History"
                >
                  <History size={20} color="#000000" />
                </Link>
                <AccountButton
                  credits={credits.credits_remaining}
                  subscriptionStatus={credits.subscription_status}
                  currentPlan={credits.current_plan}
                />
              </>
            )}
          </div>
        </div>
      </header>

      <div className="container">
        {/* Input Section - Always Visible */}
        <div style={{ marginBottom: '40px' }}>
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
            {(ideas.length > 0 || note) && (
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
                    onClick={() => generateNote(idea)}
                    disabled={loadingNote}
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
        {selectedIdea && loadingNote && (
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

        {/* Note Results */}
        {note && !loadingNote && (
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
              slides={note.slides}
              ideaTitle={note.ideaTitle}
              underlineWords={note.underlineWords || {}}
              fontCombinationId={fontCombinationId}
              colorThemeId={colorThemeId}
              accountDescription={accountDescription}
              caption={note.caption}
            />

            {/* Slides Content */}
            <div className="card" style={{ maxWidth: '900px', margin: '32px auto' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px', color: '#000000' }}>
                Slides Content
              </h3>
              <div style={{ display: 'grid', gap: '16px' }}>
                {note.slides.map((slide, index) => (
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
                {note.caption}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        currentPlan={credits?.current_plan || null}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        currentPlan={credits?.current_plan || null}
        credits={credits?.credits_remaining}
        subscriptionStatus={credits?.subscription_status || null}
      />
    </div>
  )
}
