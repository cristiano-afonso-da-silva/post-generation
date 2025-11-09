'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { History, Palette, Edit3, MessageSquare, ChevronLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './globals.css'
import SlideImageGenerator from './components/SlideImageGenerator'
import { FONT_COMBINATIONS, COLOR_THEMES } from './config/slideThemes'
import { useAuth } from './context/AuthContext'
import AccountButton from './components/AccountButton'
import UpgradePrompt from './components/UpgradePrompt'
import SubscriptionModal from './components/SubscriptionModal'

const API_URL = ''

type BackgroundOption = {
  id: string
  label: string
  src: string
}

interface Note {
  ideaTitle: string
  slides: Array<{
    title: string
    content: string
    kind: 'HOOK' | 'MIDDLE' | 'CTA'
  }>
  caption: string
  underlineWords?: Record<number, { underline: string; highlight: string; imageSearch?: string; imageUrl?: string | null }>
}

// Component to handle search params with Suspense
function SearchParamsHandler({ refreshCredits, router }: { refreshCredits: () => void; router: ReturnType<typeof useRouter> }) {
  const searchParams = useSearchParams()
  
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
  
  return null
}

export default function Home() {
  const router = useRouter()
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
  const [includeImages, setIncludeImages] = useState(false)
  const [editedSlides, setEditedSlides] = useState<Note['slides']>([])
  const [slidesDirty, setSlidesDirty] = useState(false)
  const [savingSlides, setSavingSlides] = useState(false)
  const [editedCaption, setEditedCaption] = useState<string>('')
  const [activeLeftTab, setActiveLeftTab] = useState<'design' | 'slides' | 'caption'>('design')
  const [expandedSlideIndexes, setExpandedSlideIndexes] = useState<number[]>([])
  const [showCustomisation, setShowCustomisation] = useState(false)
const leftTabs: { id: typeof activeLeftTab; label: string; icon: LucideIcon }[] = [
  { id: 'design', label: 'Customize Design', icon: Palette },
  { id: 'slides', label: 'Edit Slides', icon: Edit3 },
  { id: 'caption', label: 'Post Caption', icon: MessageSquare }
]

  const showDebugPanel = false
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOption[]>([])
  const [backgroundId, setBackgroundId] = useState<string>('')
  
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

  // Sync editable slides with generated note
  useEffect(() => {
    if (note) {
      setEditedSlides(note.slides.map(slide => ({ ...slide })))
      setEditedCaption(note.caption || '')
      setSlidesDirty(false)
      setExpandedSlideIndexes([])
      // Auto-show customisation when note exists
      setShowCustomisation(true)
    } else {
      setEditedSlides([])
      setEditedCaption('')
      setSlidesDirty(false)
      setExpandedSlideIndexes([])
      setShowCustomisation(false)
    }
  }, [note])

  const toggleSlideExpansion = (index: number) => {
    setExpandedSlideIndexes(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      }
      return [...prev, index]
    })
  }

  // Detect available background images (bg1.jpg, bg2.jpg, ...)
  useEffect(() => {
    let isMounted = true
    const loadBackgrounds = async () => {
      const detected: BackgroundOption[] = []
      const maxBackgrounds = 10

      await Promise.all(
        Array.from({ length: maxBackgrounds }, (_, i) => i + 1).map(async (num) => {
          const id = `bg${num}`
          const src = `/backgrounds/${id}.jpg`
          try {
            const res = await fetch(src, { method: 'HEAD' })
            if (res.ok) {
              detected.push({
                id,
                label: `Background ${num}`,
                src
              })
            }
          } catch {
            // Ignore missing files
          }
        })
      )

      if (isMounted) {
        setBackgroundOptions(detected)

        try {
          const savedId = localStorage.getItem('postGeneration_backgroundId')
          if (savedId && detected.some(option => option.id === savedId)) {
            setBackgroundId(savedId)
          } else if (detected.length > 0) {
            setBackgroundId(detected[0].id)
          } else {
            setBackgroundId('')
          }
        } catch (error) {
          console.warn('Unable to read background preference from localStorage:', error)
          setBackgroundId(detected[0]?.id ?? '')
        }
      }
    }

    loadBackgrounds()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!backgroundId) return
    try {
      localStorage.setItem('postGeneration_backgroundId', backgroundId)
      // If note exists, trigger regeneration by updating a dependency
      // The SlideImageGenerator will detect the backgroundImageUrl change
    } catch (error) {
      console.warn('Unable to persist background preference to localStorage:', error)
    }
  }, [backgroundId])

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
          // Verify note structure and slides array integrity
          if (parsedNote && Array.isArray(parsedNote.slides) && parsedNote.slides.length > 0) {
            console.log('✅ Loaded note with', parsedNote.slides.length, 'slides from localStorage')
            setNote(parsedNote)
          } else {
            console.warn('⚠️ Invalid note structure in localStorage, skipping')
          }
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
        // Clear corrupted localStorage data
        localStorage.removeItem('postGeneration_note')
        localStorage.removeItem('postGeneration_canvasImages')
        localStorage.removeItem('postGeneration_fullContentHash')
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

    // Check if user has enough credits based on whether images are included
    // Text only: 1 credit, Text + Image: 2 credits
    const requiredCredits = includeImages ? 2 : 1
    if (creditsRemaining < requiredCredits) {
      console.log(`Not enough credits. Required: ${requiredCredits}, Available: ${creditsRemaining}`)
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
          accountDescription: accountDescription.trim(),
          includeImages: includeImages
        })
      })

      const result = await response.json()

      if (result.success) {
        // Credit will be deducted when slides are actually generated in SlideImageGenerator
        // Verify result data structure before saving
        if (result.data && Array.isArray(result.data.slides) && result.data.slides.length > 0) {
          console.log('✅ Received note with', result.data.slides.length, 'slides from API')
          setNote(result.data)
          // Clear generation_id to force new generation creation (new ideaTitle = new generation)
          try {
            localStorage.removeItem('postGeneration_generationId')
            localStorage.removeItem('postGeneration_contentHash')
            localStorage.setItem('postGeneration_note', JSON.stringify(result.data))
            localStorage.setItem('postGeneration_accountDescription', accountDescription.trim())
            localStorage.setItem('postGeneration_fontCombinationId', fontCombinationId)
            localStorage.setItem('postGeneration_colorThemeId', colorThemeId)
            console.log('✅ Saved note to localStorage')
          } catch (error) {
            console.error('Error saving to localStorage:', error)
          }
          setError('')
          setCurrentStep(null)
        } else {
          console.error('❌ Invalid data structure received from API')
          setError('Invalid data received from server')
          setCurrentStep(null)
        }
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

  const handleSlideFieldChange = (index: number, field: 'title' | 'content', value: string) => {
    setEditedSlides(prev => {
      if (!prev[index]) return prev
      const next = [...prev]
      next[index] = {
        ...next[index],
        [field]: value
      }
      return next
    })
    setSlidesDirty(true)
  }

  const resetEditedSlides = () => {
    if (note) {
      setEditedSlides(note.slides.map(slide => ({ ...slide })))
    } else {
      setEditedSlides([])
    }
    setSlidesDirty(false)
  }

  const saveEditedSlides = () => {
    if (!note || savingSlides) return

    const cleanedSlides = editedSlides.map(slide => ({
      ...slide,
      title: (slide.title ?? '').trim(),
      content: (slide.content ?? '').trim()
    }))

    setSavingSlides(true)
    setError('')

    fetch(`${API_URL}/api/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refreshSlides',
        slides: cleanedSlides,
        includeImages
      })
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to refresh slide enhancements')
        }

        const updatedUnderline: Note['underlineWords'] = data.data?.underlineWords || {}
        const sanitizedSlides: Note['slides'] = (data.data?.slides || cleanedSlides) as Note['slides']

        const updatedNote: Note = {
          ...note,
          slides: sanitizedSlides,
          underlineWords: updatedUnderline
        }

        setNote(updatedNote)
        setEditedSlides(sanitizedSlides.map(slide => ({ ...slide })))
        setSlidesDirty(false)

        try {
          localStorage.setItem('postGeneration_note', JSON.stringify(updatedNote))
          localStorage.removeItem('postGeneration_canvasImages')
          localStorage.removeItem('postGeneration_fullContentHash')
          localStorage.removeItem('postGeneration_contentHash')
        } catch (storageError) {
          console.warn('Could not persist edited slides to localStorage:', storageError)
        }
      })
      .catch((err: any) => {
        console.error('Error refreshing slides:', err)
        setError(err.message || 'Failed to refresh slides. Please try again.')
      })
      .finally(() => {
        setSavingSlides(false)
      })
  }

  const goBackToBusinessDetails = () => {
    // Just switch to business details panel, keep the note
    setShowCustomisation(false)
  }

  const goToCustomisation = () => {
    // Switch to customisation panel
    setShowCustomisation(true)
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
      {/* Handle search params with Suspense */}
      <Suspense fallback={null}>
        <SearchParamsHandler refreshCredits={refreshCredits} router={router} />
      </Suspense>
      
      {/* Header */}
      <header style={{
        borderBottom: '2px solid #e5e5e5',
        padding: '24px 0',
        background: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div className="header-inner" style={{
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

      <div
        className="container"
        style={{
          height: 'calc(100vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Mobile Stack Wrapper */}
        <div className="mobile-stack" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {error && (
            <div className="error" style={{ margin: '0 0 24px', flex: '0 0 auto' }}>
              {error}
            </div>
          )}

          {/* Two-Column Layout - Responsive Grid */}
          <div 
            className="responsive-grid"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'minmax(260px, 0.3fr) minmax(0, 0.7fr)', 
              gap: '32px',
              alignItems: 'stretch',
              flex: 1,
              overflow: 'hidden'
            }}
          >
            {/* LEFT COLUMN - Control Panel with Input, Tab Group, Buttons, and Customize Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', overflow: 'hidden', alignSelf: 'stretch' }}>
              {!showCustomisation ? (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Business details heading */}
                  <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#000000' }}>
                    Business details
                  </h3>
                  
                  {/* Textarea for business description */}
                  <textarea
                    className="input mobile-prompt"
                    placeholder="Describe your business: e.g., productivity coach helping remote workers overcome procrastination"
                    value={accountDescription}
                    onChange={(e) => setAccountDescription(e.target.value)}
                    rows={4}
                    style={{ 
                      width: '100%', 
                      resize: 'vertical',
                      maxHeight: '200px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif'
                    }}
                  />
                  
                  {/* Dropdown for Text / Text + Image */}
                  <select
                    value={includeImages ? 'text-image' : 'text'}
                    onChange={(e) => setIncludeImages(e.target.value === 'text-image')}
                    className="input"
                    style={{ cursor: 'pointer', padding: '12px' }}
                  >
                    <option value="text">Text (1 credit)</option>
                    <option value="text-image">Text + Image (2 credits)</option>
                  </select>

                  {/* Show Customisation button if note exists */}
                  {note && (
                    <button
                      className="button secondary"
                      onClick={goToCustomisation}
                      style={{ width: '100%' }}
                    >
                      Customise
                    </button>
                  )}

                  {/* Generate button */}
                  <button
                    className="button mobile-generate"
                    onClick={generateIdeas}
                    disabled={loadingIdeas || !accountDescription.trim()}
                    style={{ width: '100%' }}
                  >
                    {loadingIdeas ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              ) : (
                <div className="card mobile-customize" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '16px' }}>
                  {/* Content area */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Back button */}
                    <button
                      onClick={goBackToBusinessDetails}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'none',
                        border: 'none',
                        padding: '8px 0',
                        cursor: 'pointer',
                        marginBottom: '24px',
                        color: '#000000',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}
                    >
                      <ChevronLeft size={20} />
                      <span>Back</span>
                    </button>
                    
                    {/* Customisation heading */}
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#000000' }}>
                      Customisation
                    </h3>
                  
                  {/* Tab buttons for Design / Slides / Caption */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      gap: '0',
                      alignItems: 'stretch',
                      border: '2px solid #e5e5e5',
                      borderRadius: '12px',
                      padding: '2px',
                      background: '#ededed',
                      height: 'fit-content',
                      opacity: !note ? 0.5 : 1,
                      pointerEvents: !note ? 'none' : 'auto',
                      marginBottom: '24px'
                    }}
                  >
                    {leftTabs.map(tab => {
                      const TabIcon = tab.icon
                      const isActive = activeLeftTab === tab.id
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveLeftTab(tab.id)}
                          disabled={!note}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '8px 16px',
                            flex: 1,
                            border: 'none',
                            borderRadius: '10px',
                            background: isActive ? '#d8d8d8' : '#ededed',
                            cursor: !note ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          title={tab.label}
                          aria-label={tab.label}
                        >
                          <TabIcon size={20} color="#000000" />
                        </button>
                      )
                    })}
                  </div>

                {activeLeftTab === 'design' && (
                  <div style={{ opacity: !note ? 0.5 : 1, pointerEvents: !note ? 'none' : 'auto', marginBottom: '24px' }}>
                    <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#000000' }}>
                      Slides Style
                    </h4>
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
                      {backgroundOptions.length > 0 && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#000000' }}>
                            Background Texture
                          </label>
                          <select
                            value={backgroundId}
                            onChange={(e) => setBackgroundId(e.target.value)}
                            className="input"
                            style={{ cursor: 'pointer', padding: '12px' }}
                          >
                            {backgroundOptions.map(option => (
                              <option key={option.id} value={option.id}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeLeftTab === 'slides' && (
                  <div style={{ opacity: !note ? 0.5 : 1, pointerEvents: !note ? 'none' : 'auto', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#000000' }}>
                      Slides Content
                    </h3>
                    <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '16px' }}>
                      {!note ? 'Generate a post to edit slides here' : 'Edit any slide text below. Save to refresh the preview and generated assets.'}
                    </p>
                    {note && (
                      <div style={{ display: 'grid', gap: '12px' }}>
                    {editedSlides.map((slide, index) => {
                      const kind = note.slides[index]?.kind ?? 'MIDDLE'
                      const isExpanded = expandedSlideIndexes.includes(index)
                      return (
                        <div 
                          key={index}
                          className={`slide-card ${kind === 'HOOK' ? 'hook' : kind === 'CTA' ? 'cta' : 'middle'}`}
                          style={{ padding: '16px' }}
                        >
                          <button
                            onClick={() => toggleSlideExpansion(index)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              margin: 0,
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ 
                              fontSize: '11px', 
                              fontWeight: '700', 
                              color: '#999999', 
                              textTransform: 'uppercase',
                              letterSpacing: '1px'
                            }}>
                              Slide {index + 1} • {kind}
                            </div>
                            <span style={{ fontSize: '18px', color: '#999999', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                              ▾
                            </span>
                          </button>

                          {isExpanded && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>
                                Title
                              </label>
                              <input
                                className="input"
                                value={slide.title ?? ''}
                                onChange={(e) => handleSlideFieldChange(index, 'title', e.target.value)}
                                placeholder="Enter slide title"
                                style={{ width: '100%' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>
                                Content
                              </label>
                              <textarea
                                className="input"
                                value={slide.content ?? ''}
                                onChange={(e) => handleSlideFieldChange(index, 'content', e.target.value)}
                                placeholder="Enter slide content"
                                rows={kind === 'CTA' ? 5 : 6}
                                style={{ width: '100%', resize: 'vertical', minHeight: '120px' }}
                              />
                            </div>
                          </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  )}
                  {note && (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    gap: '12px',
                    marginTop: '24px'
                  }}>
                    <button
                      className="button secondary"
                      onClick={resetEditedSlides}
                      disabled={!slidesDirty || savingSlides}
                      style={{ width: '100%' }}
                    >
                      Reset
                    </button>
                    <button
                      className="button"
                      onClick={saveEditedSlides}
                      disabled={!slidesDirty || savingSlides}
                      style={{ width: '100%' }}
                    >
                      {savingSlides ? 'Saving...' : 'Save'}
                    </button>
                      </div>
                    )}
                  </div>
                )}

                {activeLeftTab === 'caption' && (
                  <div style={{ opacity: !note ? 0.5 : 1, pointerEvents: !note ? 'none' : 'auto', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#000000' }}>
                      Instagram Caption
                    </h3>
                    <textarea
                      className="input"
                      value={editedCaption}
                      onChange={(e) => setEditedCaption(e.target.value)}
                      placeholder="Generate a post to see the caption here"
                      disabled={!note}
                      style={{ 
                        width: '100%',
                        minHeight: '300px',
                        padding: '20px', 
                        background: '#fafafa',
                        border: '2px solid #e5e5e5',
                        borderRadius: '12px',
                        fontSize: '15px',
                        lineHeight: '1.8',
                        color: '#000000',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                        resize: 'vertical'
                      }}
                    />
                    {note && (
                      <button
                        className="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(editedCaption)
                            // You could add a toast notification here if desired
                          } catch (err) {
                            console.error('Failed to copy caption:', err)
                          }
                        }}
                        style={{ width: '100%', marginTop: '12px' }}
                      >
                        Copy
                      </button>
                    )}
                  </div>
                )}
                </div>
              </div>
              )}
            </div>

            {/* RIGHT COLUMN - Output Section - Mobile Order 4 */}
            <div className="mobile-output" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0, alignSelf: 'stretch' }}>
              {/* Show loading state while generating ideas */}
              {loadingIdeas && (
                <div className="card" style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div className="spinner" style={{ margin: '0 auto 20px', width: '48px', height: '48px' }}></div>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#000000' }}>
                    Generating ideas...
                  </h3>
                  <p style={{ fontSize: '15px', color: '#666666' }}>
                    Sit tight—Gemini is crafting 10 fresh angles for you.
                  </p>
                </div>
              )}

              {/* Show Ideas if available and no note selected */}
              {ideas.length > 0 && !selectedIdea && !note && !loadingIdeas && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#000000' }}>
                    Choose an Idea
                  </h3>
                  <div style={{ display: 'grid', gap: '12px', flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: '6px' }}>
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
              )}

              {/* Show Loading Steps if generating */}
        {selectedIdea && loadingNote && (
                <div className="card">
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
        )}

              {/* Show Generated Slides if note exists */}
        {note && !loadingNote && (
                <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <SlideImageGenerator 
              slides={note.slides}
              ideaTitle={note.ideaTitle}
              underlineWords={note.underlineWords || {}}
              fontCombinationId={fontCombinationId}
              colorThemeId={colorThemeId}
              accountDescription={accountDescription}
              caption={note.caption}
                    backgroundImageUrl={
                      backgroundId
                        ? backgroundOptions.find(option => option.id === backgroundId)?.src ?? null
                        : null
                    }
                  />
                </div>
              )}

              {/* Show Empty State if nothing to show */}
              {!ideas.length && !note && !loadingNote && !loadingIdeas && (
                <div className="card" style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                  <h3 style={{ 
                    marginBottom: '16px', 
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#000000'
                  }}>
                    Your slides
              </h3>
                  <p style={{ fontSize: '15px', color: '#666' }}>
                    Generate ideas to get started
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Debug Panel - Full Width Below */}
        {note && !loadingNote && (
          <div>

            {/* DEBUG: Gemini Output & Pexels Integration */}
            {showDebugPanel && (
            <div className="card" style={{ maxWidth: '900px', margin: '32px auto', background: '#1a1a1a', border: '2px solid #333' }}>
              <h3 style={{ fontSize: '20px', fontWeight: '700', marginBottom: '20px', color: '#ffbd59' }}>
                🐛 DEBUG: Gemini Output & Pexels Integration
              </h3>
              
                    <div style={{ 
                padding: '20px', 
                background: '#0a0a0a',
                border: '1px solid #333',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '13px',
                color: '#00ff00',
                whiteSpace: 'pre-wrap',
                overflowX: 'auto'
              }}>
                {note.slides.map((slide, index) => {
                  const emphasis = (note as any).underlineWords?.[index];
                  return (
                    <div key={index} style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: index < note.slides.length - 1 ? '1px solid #333' : 'none' }}>
                      <div style={{ color: '#ffbd59', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                        ━━━ SLIDE {index + 1}/{note.slides.length} • {slide.kind} ━━━
                    </div>
                      
                      <div style={{ marginLeft: '20px' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#888' }}>Title:</span> <span style={{ color: '#fff' }}>{slide.title || '(empty)'}</span>
                        </div>
                        
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#888' }}>Content:</span> <span style={{ color: '#fff' }}>{slide.content || '(empty)'}</span>
                        </div>
                        
                        {emphasis && (
                          <div style={{ marginTop: '15px', padding: '15px', background: '#1a1a2e', border: '1px solid #444', borderRadius: '6px' }}>
                            <div style={{ color: '#00d4ff', fontWeight: 'bold', marginBottom: '10px' }}>
                              🎨 GEMINI EXTRACTION:
                            </div>
                            
                            <div style={{ marginLeft: '15px' }}>
                              {emphasis.underline && (
                                <div style={{ marginBottom: '6px' }}>
                                  <span style={{ color: '#ff6b6b' }}>━ Underline:</span> <span style={{ color: '#fff' }}>{emphasis.underline}</span>
                                </div>
                              )}
                              
                              {emphasis.highlight && (
                                <div style={{ marginBottom: '6px' }}>
                                  <span style={{ color: '#ffd93d' }}>✨ Highlight:</span> <span style={{ color: '#fff' }}>{emphasis.highlight}</span>
                                </div>
                              )}
                              
                              {slide.kind === 'MIDDLE' && (
                                <>
                                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #444' }}>
                                    <div style={{ color: '#a78bfa', fontWeight: 'bold', marginBottom: '8px' }}>
                                      🖼️  IMAGE DATA (MIDDLE SLIDE ONLY):
                                    </div>
                                    
                                    <div style={{ marginLeft: '15px' }}>
                                      <div style={{ marginBottom: '6px' }}>
                                        <span style={{ color: '#888' }}>🔍 Image Search Keywords:</span>{' '}
                                        <span style={{ color: emphasis.imageSearch ? '#00ff00' : '#ff4444' }}>
                                          {emphasis.imageSearch || '❌ NO KEYWORDS EXTRACTED'}
                                        </span>
                                      </div>
                                      
                                      <div style={{ marginBottom: '6px' }}>
                                        <span style={{ color: '#888' }}>🌐 Pexels API Call:</span>{' '}
                                        <span style={{ color: emphasis.imageSearch ? '#00ff00' : '#ff4444' }}>
                                          {emphasis.imageSearch ? '✅ SHOULD HAVE BEEN CALLED' : '❌ SKIPPED (no keywords)'}
                                        </span>
                                      </div>
                                      
                                      <div style={{ marginBottom: '6px' }}>
                                        <span style={{ color: '#888' }}>📸 Image URL:</span>{' '}
                                        {emphasis.imageUrl ? (
                                          <div style={{ marginTop: '4px' }}>
                                            <span style={{ color: '#00ff00' }}>✅ SUCCESS!</span>
                      <div style={{ 
                                              marginTop: '6px', 
                                              padding: '8px', 
                                              background: '#0a0a0a', 
                                              border: '1px solid #00ff00',
                                              borderRadius: '4px',
                                              wordBreak: 'break-all'
                                            }}>
                                              {emphasis.imageUrl}
                      </div>
                                            <img 
                                              src={emphasis.imageUrl} 
                                              alt="Preview" 
                                              style={{ 
                                                marginTop: '10px', 
                                                maxWidth: '200px', 
                                                border: '2px solid #00ff00',
                                                borderRadius: '6px'
                                              }}
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).style.border = '2px solid #ff4444';
                                                (e.target as HTMLImageElement).alt = '❌ Image failed to load';
                                              }}
                                            />
                                          </div>
                                        ) : (
                                          <span style={{ color: '#ff4444' }}>
                                            ❌ NO IMAGE URL (Pexels returned null or failed)
                                          </span>
                                        )}
                                      </div>
                                      
                                      {!emphasis.imageUrl && emphasis.imageSearch && (
                      <div style={{ 
                                          marginTop: '10px', 
                                          padding: '10px', 
                                          background: '#2a1a1a', 
                                          border: '1px solid #ff4444',
                                          borderRadius: '4px',
                                          color: '#ff9999'
                                        }}>
                                          ⚠️  PROBLEM: Gemini provided keywords but Pexels returned no image.
                                          <br />Possible causes:
                                          <br />• PEXELS_API_KEY not set or invalid
                                          <br />• Rate limit exceeded (200/hour)
                                          <br />• Network error
                                          <br />• No matching images for these keywords
                      </div>
                    )}
                  </div>
              </div>
                                </>
                              )}
                              
                              {slide.kind !== 'MIDDLE' && (
                                <div style={{ marginTop: '8px', color: '#888', fontSize: '12px' }}>
                                  ℹ️  Images only available for MIDDLE slides
            </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {!emphasis && (
              <div style={{ 
                            marginTop: '10px', 
                            padding: '10px', 
                            background: '#2a1a1a', 
                            border: '1px solid #ff4444',
                            borderRadius: '4px',
                            color: '#ff9999'
                          }}>
                            ❌ NO GEMINI EXTRACTION DATA - This is a problem!
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                <div style={{ 
                  marginTop: '30px', 
                  paddingTop: '20px', 
                  borderTop: '2px solid #333',
                  color: '#888'
                }}>
                  <div style={{ color: '#ffbd59', fontWeight: 'bold', marginBottom: '10px' }}>
                    📊 SUMMARY:
                  </div>
                  <div style={{ marginLeft: '15px' }}>
                    <div>Total Slides: {note.slides.length}</div>
                    <div>Middle Slides: {note.slides.filter(s => s.kind === 'MIDDLE').length}</div>
                    <div>
                      Images Found: {note.slides.filter((s, i) => s.kind === 'MIDDLE' && (note as any).underlineWords?.[i]?.imageUrl).length} / {note.slides.filter(s => s.kind === 'MIDDLE').length}
                    </div>
                    <div style={{ marginTop: '10px', color: '#fff' }}>
                      Raw underlineWords data:
                      <pre style={{ 
                        marginTop: '6px', 
                        padding: '10px', 
                        background: '#0a0a0a', 
                        border: '1px solid #333',
                        borderRadius: '4px',
                        fontSize: '11px',
                        overflowX: 'auto'
                      }}>
                        {JSON.stringify((note as any).underlineWords, null, 2)}
                      </pre>
                    </div>
                  </div>
              </div>
            </div>
            </div>
            )}
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
