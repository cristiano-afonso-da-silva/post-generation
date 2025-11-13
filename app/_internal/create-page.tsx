'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, ChevronDown } from 'lucide-react'
import '../globals.css'
import CarouselImageGenerator from '../components/CarouselImageGenerator'
import { COLOR_THEMES } from '../config/carouselThemes'
import { getTemplateOptions } from '../config/carouselTemplates'
import { useAuth } from '../context/AuthContext'
import { useGeneration } from '../hooks/useGenerations'
import UpgradePrompt from '../components/UpgradePrompt'
import SubscriptionModal from '../components/SubscriptionModal'

const API_URL = ''

interface Note {
  ideaTitle: string
  carousels: Array<{
    title: string
    content: string
    kind: 'HOOK' | 'MIDDLE' | 'CTA'
    topic?: string
    subtitle?: string
    cta?: string
  }>
  caption: string
  underlineWords?: Record<number, { underline: string; highlight: string; imageSearch?: string; imageUrl?: string | null; originalImageUrl?: string | null }>
}

interface CreatePageProps {
  generationId?: string
}

export default function CreatePage({ generationId }: CreatePageProps = {}) {
  const router = useRouter()
  const { user, loading: authLoading, credits, refreshCredits } = useAuth()
  const redirectingRef = useRef(false) // Prevent multiple redirects
  const pendingGenerationRef = useRef<Note | null>(null) // Store generation data temporarily for redirect
  
  // Load generation if generationId is provided
  const { generation, isLoading: isLoadingGeneration } = useGeneration(
    generationId || undefined,
    user?.id
  )
  
  // Core state
  const [accountDescription, setAccountDescription] = useState('')
  const [ideas, setIdeas] = useState<string[]>([])
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null)
  const [note, setNote] = useState<Note | null>(null) // Only used for loading existing generations
  
  // Loading states
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [loadingNote, setLoadingNote] = useState(false)
  const [currentStep, setCurrentStep] = useState<'generating' | 'analysing' | 'rendering' | null>(null)
  
  // Configuration
  const [templateId, setTemplateId] = useState('template1')
  const [colorThemeId, setColorThemeId] = useState('purple-black')
  const [includeImages, setIncludeImages] = useState(false)
  const [useAIImages, setUseAIImages] = useState(false)
  const [aiImageStyle, setAiImageStyle] = useState<'animated' | 'surreal'>('animated')
  
  // UI states
  const [error, setError] = useState('')
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  
  // Template options
  const templateOptions = getTemplateOptions()
  const colorThemes = Object.entries(COLOR_THEMES)

  const hasInitializedRef = useRef(false)
  const prevColorThemeIdRef = useRef(colorThemeId)

  useEffect(() => {
    if (!user || authLoading || hasInitializedRef.current) return
    hasInitializedRef.current = true
    setColorThemeId('purple-black')
  }, [user, authLoading])

  // Clear canvas images cache when color theme changes to force regeneration
  useEffect(() => {
    if (prevColorThemeIdRef.current !== colorThemeId) {
      try {
        localStorage.removeItem('postGeneration_canvasImages')
        console.log('🎨 Color theme changed, clearing canvas cache')
      } catch (error) {
        console.error('Error clearing canvas cache:', error)
      }
      prevColorThemeIdRef.current = colorThemeId
    }
  }, [colorThemeId])

  // Load generation data when generationId is provided
  useEffect(() => {
    if (!generation || !user) return

    // Map API response to Note interface
    const noteData: Note = {
      ideaTitle: generation.idea_title,
      carousels: generation.slides,
      caption: generation.caption,
      underlineWords: generation.underline_words
    }
    
    setNote(noteData)
    setAccountDescription(generation.account_description || '')
    setTemplateId(generation.template_id || 'template1')
    setColorThemeId(generation.color_theme_id || 'purple-black')
    
    // Store minimal data in localStorage for CarouselImageGenerator
    try {
      localStorage.setItem('postGeneration_generationId', generation.id)
      localStorage.setItem('postGeneration_userId', user.id)
      localStorage.setItem('postGeneration_ideaTitle', generation.idea_title)
      localStorage.setItem('postGeneration_fromHistory', 'true')
      
      // Store images if available
      if (generation.image_urls && generation.image_urls.length > 0) {
        localStorage.setItem('postGeneration_canvasImages', JSON.stringify(generation.image_urls))
      }
    } catch (error) {
      console.error('Error storing in localStorage:', error)
    }
  }, [generation, user])

  // Generate ideas
  const generateIdeas = async () => {
    if (!accountDescription.trim()) {
      setError('Please enter your business description or idea')
      return
    }

    setLoadingIdeas(true)
    setError('')
    setIdeas([])
    setNote(null)
    setSelectedIdea(null)

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

  // Generate note - EXACT ORIGINAL WORKING CODE
  const generateNote = async (idea: string) => {
    if (!user?.id) {
      setError('User not authenticated')
      return
    }

    // Check credits
    let creditsRemaining = 0
    if (credits && credits.credits_remaining !== undefined && credits.credits_remaining !== null) {
      creditsRemaining = credits.credits_remaining
    } else {
      try {
        const checkResponse = await fetch(`/api/credits/check?userId=${user.id}`)
        if (checkResponse.ok) {
          const checkData = await checkResponse.json()
          creditsRemaining = checkData.creditsRemaining ?? 0
          if (checkData.creditsRemaining !== undefined) {
            await refreshCredits()
          }
        } else {
          creditsRemaining = credits?.credits_remaining ?? 0
        }
      } catch (error) {
        console.error('Error checking credits:', error)
        creditsRemaining = credits?.credits_remaining ?? 0
      }
    }

    const requiredCredits = includeImages ? 2 : 1
    if (creditsRemaining < requiredCredits) {
      setShowUpgradePrompt(true)
      return
    }

    setSelectedIdea(idea)
    setLoadingNote(true)
    setError('')
    setNote(null)
    setCurrentStep('generating')
    
    // Clear localStorage
    try {
      localStorage.removeItem('postGeneration_note')
      localStorage.removeItem('postGeneration_canvasImages')
      localStorage.removeItem('postGeneration_fullContentHash')
      localStorage.removeItem('postGeneration_contentHash')
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }

    // Step progression
    setTimeout(() => setCurrentStep('analysing'), 1000)
    setTimeout(() => setCurrentStep('rendering'), 2000)

    try {
      const response = await fetch(`${API_URL}/api/social`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'note',
          ideaTitle: idea,
          accountDescription: accountDescription.trim(),
          includeImages: includeImages,
          useAIImages: useAIImages,
          aiImageStyle: aiImageStyle
        })
      })

      const result = await response.json()

      if (result.success) {
        // API returns 'slides' not 'note' - map it to carousels
        if (result.data && Array.isArray(result.data.slides) && result.data.slides.length > 0) {
          const noteData = {
            ...result.data,
            carousels: result.data.slides
          }
          
          setError('')
          setCurrentStep(null)
          
          // Refresh credits after successful generation
          try {
            await refreshCredits()
          } catch (creditError) {
            console.error('Failed to refresh credits:', creditError)
          }
          
          // Store data temporarily for CarouselImageGenerator
          try {
            localStorage.removeItem('postGeneration_generationId')
            localStorage.removeItem('postGeneration_contentHash')
            localStorage.setItem('postGeneration_note', JSON.stringify(noteData))
            localStorage.setItem('postGeneration_accountDescription', accountDescription.trim())
            localStorage.setItem('postGeneration_templateId', templateId)
            localStorage.setItem('postGeneration_colorThemeId', colorThemeId)
            if (user?.id) {
              localStorage.setItem('postGeneration_userId', user.id)
            }
          } catch (error) {
            console.error('Error saving to localStorage:', error)
          }
          
          // Store in ref and immediately redirect - no state updates
          pendingGenerationRef.current = noteData
          // Clear loading state
          setLoadingNote(false)
          setCurrentStep(null)
        } else {
          setError('Invalid response from server')
          setSelectedIdea(null)
          setCurrentStep(null)
        }
      } else {
        setError(result.error || 'Failed to generate note')
        setSelectedIdea(null)
        setCurrentStep(null)
      }
    } catch (err: any) {
      console.error('Error during generation:', err)
      setError('Failed to connect to server. Please try again.')
      setSelectedIdea(null)
      setCurrentStep(null)
    } finally {
      setLoadingNote(false)
    }
  }

  if (authLoading || (generationId && isLoadingGeneration)) {
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

  // If we have pending generation data, render hidden generator and redirect immediately
  const pendingNote = pendingGenerationRef.current
  if (pendingNote && !generationId && !redirectingRef.current) {
    return (
      <div style={{ display: 'none' }}>
        <CarouselImageGenerator
          key={`${colorThemeId}-${templateId}`}
          carousels={pendingNote.carousels}
          underlineWords={pendingNote.underlineWords || {}}
          colorThemeId={colorThemeId}
          templateId={templateId}
          ideaTitle={pendingNote.ideaTitle}
          ideaIndex={selectedIdea ? ideas.findIndex(idea => idea === selectedIdea) + 1 : null}
          includeImages={includeImages}
          useAIImages={useAIImages}
          aiImageStyle={aiImageStyle}
          onGenerationComplete={(generationId) => {
            if (redirectingRef.current) return
            
            let finalGenerationId = generationId
            if (!finalGenerationId) {
              try {
                const storedId = localStorage.getItem('postGeneration_generationId')
                if (storedId) finalGenerationId = storedId
              } catch (err) {
                console.error('Error reading generationId from localStorage:', err)
              }
            }
            
            if (finalGenerationId) {
              redirectingRef.current = true
              pendingGenerationRef.current = null // Clear ref
              window.location.href = `/dashboard?view=history&id=${finalGenerationId}`
            }
          }}
        />
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: '#fafafa',
      overflow: 'hidden',
    }}>
      {/* Top Content Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '48px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        {/* Empty State */}
        {!ideas.length && !loadingIdeas && !note && !pendingGenerationRef.current && !loadingNote && (
          <div style={{
            maxWidth: '800px',
            width: '100%',
            marginTop: '10vh',
            textAlign: 'center',
          }}>
            <Sparkles size={48} color="#ffbd59" style={{ marginBottom: '24px' }} />
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#000000',
              marginBottom: '16px',
            }}>
              Create Your Carousel
            </h1>
            <p style={{
              fontSize: '16px',
              color: '#666666',
              marginBottom: '48px',
            }}>
              Enter your business description or idea below to get started
            </p>
          </div>
        )}

        {/* Loading Ideas */}
        {loadingIdeas && (
          <div style={{
            maxWidth: '600px',
            width: '100%',
            marginTop: '20vh',
            textAlign: 'center',
          }}>
            <div className="loading">
              <div className="spinner"></div>
              <span style={{ color: '#000000', fontSize: '18px', marginTop: '16px', display: 'block' }}>
                Generating ideas...
              </span>
            </div>
          </div>
        )}

        {/* Ideas Grid */}
        {ideas.length > 0 && !note && !pendingGenerationRef.current && !loadingNote && !selectedIdea && (
          <div style={{
            maxWidth: '1000px',
            width: '100%',
            animation: 'slideUp 0.6s ease-out',
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#000000',
              marginBottom: '24px',
              textAlign: 'center',
            }}>
              Choose an Idea
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '16px',
            }}>
              {ideas.map((idea, index) => (
                <button
                  key={index}
                  onClick={() => generateNote(idea)}
                  style={{
                    padding: '20px',
                    background: '#ffffff',
                    border: '2px solid #e5e5e5',
                    borderRadius: '12px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: '15px',
                    color: '#333333',
                    lineHeight: '1.6',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#ffbd59'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 189, 89, 0.2)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e5e5e5'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading Steps */}
        {loadingNote && selectedIdea && (
          <div style={{
            maxWidth: '600px',
            width: '100%',
            marginTop: '15vh',
            animation: 'slideUp 0.6s ease-out',
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '32px',
              color: '#000000',
              textAlign: 'center',
            }}>
              {selectedIdea}
            </h2>
            
            {/* Step Progress Indicators - Only show during generation, hide when note is set for new generations */}
            {!note && !pendingGenerationRef.current && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Generating */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                padding: '16px',
                borderRadius: '8px',
                background: currentStep === 'generating' ? '#fff9e6' : 'transparent',
              }}>
                <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

              {/* Analysing */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                padding: '16px',
                borderRadius: '8px',
                background: currentStep === 'analysing' ? '#fff9e6' : 'transparent',
              }}>
                <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

              {/* Rendering */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                padding: '16px',
                borderRadius: '8px',
                background: currentStep === 'rendering' ? '#fff9e6' : 'transparent',
              }}>
                <div style={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
          )}
          </div>
        )}

        {/* Carousel Generator for existing generations only */}
        {note && !loadingNote && generationId && (
          <div style={{ display: 'none' }}>
            <CarouselImageGenerator
              key={`${colorThemeId}-${templateId}`}
              carousels={note.carousels}
              underlineWords={note.underlineWords || {}}
              colorThemeId={colorThemeId}
              templateId={templateId}
              ideaTitle={note.ideaTitle}
              ideaIndex={selectedIdea ? ideas.findIndex(idea => idea === selectedIdea) + 1 : null}
              includeImages={includeImages}
              useAIImages={useAIImages}
              aiImageStyle={aiImageStyle}
              onGenerationComplete={() => {
                // Do nothing for existing generations
              }}
            />
          </div>
        )}
      </div>

      {/* Bottom Input Bar - Hide for new generations, only show when loading existing or before generation */}
      {((!note && !pendingGenerationRef.current) || generationId) && (
      <div style={{
        background: '#ffffff',
        borderTop: '1px solid #e5e5e5',
        padding: '24px',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
        }}>
          {/* Template Selector (always show) */}
            <div style={{ position: 'relative' }}>
              <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              disabled={loadingIdeas || loadingNote}
                style={{
                  padding: '14px 40px 14px 16px',
                  borderRadius: '8px',
                  border: '2px solid #e5e5e5',
                  fontSize: '15px',
                  fontWeight: '500',
                  color: '#333333',
                  background: '#fafafa',
                  cursor: 'pointer',
                  appearance: 'none',
                  minWidth: '150px',
                }}
              >
                {templateOptions.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            <ChevronDown size={20} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666666' }} />
            </div>

          {/* Image Option Selector (only before generation) */}
          {!note && !pendingGenerationRef.current && (
            <div style={{ position: 'relative' }}>
              <select
                value={
                  !includeImages
                    ? 'text'
                    : !useAIImages
                    ? 'text-image'
                    : aiImageStyle === 'animated'
                    ? 'text-ai-animated'
                    : 'text-ai-surreal'
                }
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'text') {
                    setIncludeImages(false)
                    setUseAIImages(false)
                  } else if (value === 'text-image') {
                    setIncludeImages(true)
                    setUseAIImages(false)
                  } else if (value === 'text-ai-animated') {
                    setIncludeImages(true)
                    setUseAIImages(true)
                    setAiImageStyle('animated')
                  } else if (value === 'text-ai-surreal') {
                    setIncludeImages(true)
                    setUseAIImages(true)
                    setAiImageStyle('surreal')
                  }
                }}
                disabled={loadingIdeas || loadingNote}
                style={{
                  padding: '14px 40px 14px 16px',
                  borderRadius: '8px',
                  border: '2px solid #e5e5e5',
                  fontSize: '15px',
                  fontWeight: '500',
                  color: '#333333',
                  background: '#fafafa',
                  cursor: 'pointer',
                  appearance: 'none',
                  minWidth: '280px',
                }}
              >
                <option value="text">Text (1 credit)</option>
                <option value="text-image">Text + Image (2 credits)</option>
                <option value="text-ai-animated">Text + AI Animated Image (2 credits)</option>
                <option value="text-ai-surreal">Text + AI Surrealism Image (2 credits)</option>
              </select>
              <ChevronDown size={20} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666666' }} />
            </div>
          )}

          {/* Color Theme Selector (only after generation) */}
          {note && (
            <div style={{ position: 'relative' }}>
              <select
                value={colorThemeId}
                onChange={(e) => setColorThemeId(e.target.value)}
                style={{
                  padding: '14px 40px 14px 16px',
                  borderRadius: '8px',
                  border: '2px solid #e5e5e5',
                  fontSize: '15px',
                  fontWeight: '500',
                  color: '#333333',
                  background: '#fafafa',
                  cursor: 'pointer',
                  appearance: 'none',
                  minWidth: '150px',
                }}
              >
                {colorThemes.map(([id, theme]) => (
                  <option key={id} value={id}>
                    {theme.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={20} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#666666' }} />
            </div>
          )}

          {/* Text Input (only before generation) */}
          {!note && !pendingGenerationRef.current && (
          <input
            type="text"
              value={accountDescription}
              onChange={(e) => setAccountDescription(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !loadingIdeas && !loadingNote) {
                generateIdeas()
              }
            }}
              placeholder="Describe your business or enter an idea..."
            disabled={loadingIdeas || loadingNote}
            style={{
              flex: 1,
              padding: '14px 20px',
              borderRadius: '8px',
              border: '2px solid #e5e5e5',
              fontSize: '15px',
              color: '#333333',
              background: '#fafafa',
              outline: 'none',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#ffbd59'
              e.currentTarget.style.background = '#ffffff'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e5e5'
              e.currentTarget.style.background = '#fafafa'
            }}
          />
          )}

          {/* Generate Button (only before generation) */}
          {!note && !pendingGenerationRef.current && (
            <button
              onClick={generateIdeas}
              disabled={loadingIdeas || loadingNote || !accountDescription.trim()}
              style={{
                padding: '14px 32px',
                borderRadius: '8px',
                background: loadingIdeas || loadingNote || !accountDescription.trim() ? '#e5e5e5' : '#ffbd59',
                color: loadingIdeas || loadingNote || !accountDescription.trim() ? '#999999' : '#000000',
                border: 'none',
                fontSize: '15px',
                fontWeight: '600',
                cursor: loadingIdeas || loadingNote || !accountDescription.trim() ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {loadingIdeas ? 'Generating...' : 'Generate'}
            </button>
          )}

          {/* New Post Button (only after generation) */}
          {note && (
            <button
              onClick={() => {
                setNote(null)
                setIdeas([])
                setSelectedIdea(null)
                setAccountDescription('')
                setError('')
                setCurrentStep(null)
              }}
              style={{
                padding: '14px 32px',
                borderRadius: '8px',
                background: '#ffbd59',
                color: '#000000',
                border: 'none',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              New Post
            </button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            maxWidth: '1200px',
            margin: '12px auto 0',
            padding: '12px 16px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c00',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}
      </div>
      )}

      {/* Modals */}
      {showUpgradePrompt && (
        <UpgradePrompt
          isOpen={showUpgradePrompt}
          onClose={() => setShowUpgradePrompt(false)}
          currentPlan={credits?.current_plan || null}
        />
      )}

      {showSubscriptionModal && (
        <SubscriptionModal
          isOpen={showSubscriptionModal}
          onClose={() => setShowSubscriptionModal(false)}
          currentPlan={credits?.current_plan || null}
          credits={credits?.credits_remaining}
          subscriptionStatus={credits?.subscription_status || null}
        />
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  )
}
