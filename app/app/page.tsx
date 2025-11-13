'use client'

import { useState, useEffect, useRef, Suspense, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { History, Palette, Edit3, MessageSquare, ChevronLeft, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import '../globals.css'
import CarouselImageGenerator from '../components/CarouselImageGenerator'
import { COLOR_THEMES } from '../config/carouselThemes'
import { getTemplateOptions } from '../config/carouselTemplates'
import { useAuth } from '../context/AuthContext'
import AccountButton from '../components/AccountButton'
import UpgradePrompt from '../components/UpgradePrompt'
import SubscriptionModal from '../components/SubscriptionModal'
import TemplateSelectorModal from '../components/TemplateSelectorModal'

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
      router.replace('/app')
    } else if (canceled === 'true') {
      // Clean URL
      router.replace('/app')
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
  const [previousIdeas, setPreviousIdeas] = useState<Array<{ idea: string; timestamp: number }>>([])
  const [showPreviousIdeas, setShowPreviousIdeas] = useState(false)
  const [currentStep, setCurrentStep] = useState<'generating' | 'analysing' | 'rendering' | null>(null)
  const [error, setError] = useState('')
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [includeImages, setIncludeImages] = useState(false)
  const [useAIImages, setUseAIImages] = useState(false) // true = Pollinations.AI, false = Pexels
  const [aiImageStyle, setAiImageStyle] = useState<'animated' | 'surreal'>('animated')
  const [editedCarousels, setEditedCarousels] = useState<Note['carousels']>([])
  const [carouselsDirty, setCarouselsDirty] = useState(false)
  const [savingCarousels, setSavingCarousels] = useState(false)
  const [editedCaption, setEditedCaption] = useState<string>('')
  const [captionCopied, setCaptionCopied] = useState(false)
  const [activeLeftTab, setActiveLeftTab] = useState<'design' | 'carousels' | 'caption'>('design')
  const [expandedCarouselIndexes, setExpandedCarouselIndexes] = useState<number[]>([])
  const [showCustomisation, setShowCustomisation] = useState(false)
  // Initialize fromHistory synchronously to prevent flash
  const [fromHistory, setFromHistory] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('postGeneration_fromHistory') === 'true'
      } catch {
        return false
      }
    }
    return false
  })
const leftTabs: { id: typeof activeLeftTab; label: string; icon: LucideIcon }[] = [
  { id: 'design', label: 'Customize Design', icon: Palette },
  { id: 'carousels', label: 'Edit Carousel', icon: Edit3 },
  { id: 'caption', label: 'Post Caption', icon: MessageSquare }
]

  const showDebugPanel = false
  
  // Theme settings
  const [templateId, setTemplateId] = useState('template1')
  const [colorThemeId, setColorThemeId] = useState('purple-black')
  
  // Save theme changes to localStorage
  useEffect(() => {
    if (note) {
      try {
        localStorage.setItem('postGeneration_templateId', templateId)
        localStorage.setItem('postGeneration_colorThemeId', colorThemeId)
      } catch (error) {
        console.error('Error saving theme to localStorage:', error)
      }
    }
  }, [templateId, colorThemeId, note])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Sync editable carousels with generated note
  useEffect(() => {
    if (note) {
      setEditedCarousels(note.carousels.map(carousel => ({ ...carousel })))
      setEditedCaption(note.caption || '')
      setCarouselsDirty(false)
      setExpandedCarouselIndexes([])
      // Auto-show customisation when note exists, but NOT when coming from history
      if (!fromHistory) {
        setShowCustomisation(true)
      } else {
        // When coming from history, hide customization panel entirely
        setShowCustomisation(false)
      }
    } else {
      setEditedCarousels([])
      setEditedCaption('')
      setCarouselsDirty(false)
      setExpandedCarouselIndexes([])
      setShowCustomisation(false)
    }
  }, [note, fromHistory])

  // Warn user before leaving page if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (carouselsDirty) {
        // Standard way to trigger browser's unsaved changes warning
        e.preventDefault()
        // Modern browsers ignore custom messages and show their own
        e.returnValue = '' // Required for Chrome
        return '' // Required for some browsers
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [carouselsDirty])

  const toggleCarouselExpansion = useCallback((index: number) => {
    setExpandedCarouselIndexes(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      }
      return [...prev, index]
    })
  }, [])

  // Close previous ideas dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showPreviousIdeas) {
        const target = e.target as HTMLElement
        if (!target.closest('[data-previous-ideas-dropdown]')) {
          setShowPreviousIdeas(false)
        }
      }
    }
    
    if (showPreviousIdeas) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPreviousIdeas])

  // Load previous ideas from localStorage on mount
  useEffect(() => {
    if (user && !authLoading) {
      try {
        const stored = localStorage.getItem(`postGeneration_previousIdeas_${user.id}`)
        if (stored) {
          const parsed = JSON.parse(stored)
          setPreviousIdeas(parsed)
        }
      } catch (error) {
        console.error('Error loading previous ideas:', error)
      }
    }
  }, [user, authLoading])

  // Check if coming from history page on mount
  useEffect(() => {
    if (user && !authLoading) {
      try {
        const fromHistoryFlag = localStorage.getItem('postGeneration_fromHistory')
        if (fromHistoryFlag === 'true') {
          setFromHistory(true)
          // Clear the flag after a short delay to ensure component has rendered
          setTimeout(() => {
            localStorage.removeItem('postGeneration_fromHistory')
          }, 100)
        } else {
          setFromHistory(false)
        }
      } catch (error) {
        console.error('Error checking fromHistory flag:', error)
        setFromHistory(false)
      }
    }
  }, [user, authLoading])

  // Load ideas from localStorage on mount if they exist
  useEffect(() => {
    if (user && !authLoading) {
      try {
        const storedIdeas = localStorage.getItem('postGeneration_ideas')
        const storedAccountDescription = localStorage.getItem('postGeneration_accountDescription')
        if (storedIdeas && storedAccountDescription) {
          const parsedIdeas = JSON.parse(storedIdeas)
          if (Array.isArray(parsedIdeas) && parsedIdeas.length > 0) {
            setIdeas(parsedIdeas)
            setAccountDescription(storedAccountDescription)
          }
        }
      } catch (error) {
        console.error('Error loading ideas from localStorage:', error)
      }
    }
  }, [user, authLoading])

  // Track if we've already initialized to prevent clearing state during generation
  const hasInitializedRef = useRef(false)
  
  // Clear localStorage and reset all state on mount - /app is always a fresh/new idea page
  // Only run once on initial mount when user is authenticated
  useEffect(() => {
    if (user && !authLoading && !hasInitializedRef.current) {
      // Check if there's an active generation in progress before clearing
      // If we're generating or have generated content, don't clear state
      const hasActiveGeneration = 
        loadingNote || 
        localStorage.getItem('postGeneration_note') !== null ||
        localStorage.getItem('postGeneration_generationId') !== null
      
      if (!hasActiveGeneration) {
        hasInitializedRef.current = true
        
        // Clear all localStorage to ensure fresh state (but keep previous ideas, stored ideas, and fromHistory flag)
        try {
          localStorage.removeItem('postGeneration_note')
          localStorage.removeItem('postGeneration_templateId')
          localStorage.removeItem('postGeneration_colorThemeId')
          localStorage.removeItem('postGeneration_canvasImages')
          localStorage.removeItem('postGeneration_contentHash')
          localStorage.removeItem('postGeneration_generationId')
          localStorage.removeItem('postGeneration_fullContentHash')
          localStorage.removeItem('postGeneration_ideaTitle')
          // Don't remove fromHistory, ideas, or accountDescription here - we check/load them above
          // Keep userId for user-specific operations
          if (user?.id) {
            localStorage.setItem('postGeneration_userId', user.id)
          }
        } catch (error) {
          console.error('Error clearing localStorage:', error)
        }
        
        // Only reset state if we're not in the middle of generation
        // Check state values directly (they might be null on mount even if localStorage has data)
        if (!note && !selectedIdea && !loadingNote) {
          setNote(null)
          setSelectedIdea(null)
          setCurrentStep(null)
          setError('')
          setShowCustomisation(false)
          setEditedCarousels([])
          setEditedCaption('')
          setCarouselsDirty(false)
          setTemplateId('template1')
          setColorThemeId('purple-black')
        }
      } else {
        // If there's an active generation, mark as initialized but don't clear state
        hasInitializedRef.current = true
      }
    }
  }, [user, authLoading])

  const generateIdeas = useCallback(async () => {
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
        // Store ideas in localStorage so they persist when going back
        try {
          localStorage.setItem('postGeneration_ideas', JSON.stringify(result.data.ideas))
          localStorage.setItem('postGeneration_accountDescription', accountDescription.trim())
        } catch (error) {
          console.error('Error saving ideas to localStorage:', error)
        }
      } else {
        setError(result.error || 'Failed to generate ideas')
      }
    } catch (err: any) {
      console.error('Error:', err)
      setError('Failed to connect to server. Please try again.')
    } finally {
      setLoadingIdeas(false)
    }
  }, [accountDescription])

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
    // Text only: 1 credit, Text + Image (Pexels): 2 credits, Text + AI Image (Pollinations): 2 credits
    const requiredCredits = includeImages ? 2 : 1
    if (creditsRemaining < requiredCredits) {
      console.log(`Not enough credits. Required: ${requiredCredits}, Available: ${creditsRemaining}`)
      setShowUpgradePrompt(true)
      return
    }

    const startTime = performance.now()
    console.log('🚀 [STEP 1: GENERATING] Starting generation for idea:', idea)
    console.log('   ⏱️ Timestamp:', new Date().toISOString())
    
    setSelectedIdea(idea)
    setLoadingNote(true)
    setError('')
    setNote(null)
    setCurrentStep('generating')
    
    // Clear localStorage note temporarily to prevent it from loading during generation
    // We'll save the new note once it's generated
    try {
      localStorage.removeItem('postGeneration_note')
      localStorage.removeItem('postGeneration_canvasImages')
      localStorage.removeItem('postGeneration_fullContentHash')
      localStorage.removeItem('postGeneration_contentHash')
      console.log('   ✅ Cleared localStorage')
    } catch (error) {
      console.error('   ❌ Error clearing localStorage during generation:', error)
    }

    // Simulate step progression
    setTimeout(() => {
      console.log('📊 [STEP 2: ANALYSING] Step transition to analysing')
      console.log('   ⏱️ Elapsed:', (performance.now() - startTime).toFixed(2), 'ms')
      setCurrentStep('analysing')
    }, 1000)
    
    setTimeout(() => {
      console.log('🎨 [STEP 3: RENDERING] Step transition to rendering')
      console.log('   ⏱️ Elapsed:', (performance.now() - startTime).toFixed(2), 'ms')
      setCurrentStep('rendering')
    }, 2000)

    // Log the includeImages value being sent to API
    console.log('🖼️ Frontend: Sending includeImages =', includeImages, 'useAIImages =', useAIImages, 'aiImageStyle =', aiImageStyle)

    const apiStartTime = performance.now()
    console.log('📡 [API CALL] Starting API request to /api/social')
    console.log('   ⏱️ Timestamp:', new Date().toISOString())
    
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

      const apiEndTime = performance.now()
      const apiDuration = apiEndTime - apiStartTime
      console.log('📡 [API CALL] Response received')
      console.log('   ⏱️ API Duration:', apiDuration.toFixed(2), 'ms')
      console.log('   ⏱️ Total Elapsed:', (apiEndTime - startTime).toFixed(2), 'ms')
      
      const result = await response.json()

      if (result.success) {
        // Credit will be deducted when carousels are actually generated in CarouselImageGenerator
        // Verify result data structure before saving
        // Note: API still returns 'slides' but we map it to 'carousels' in our Note interface
        if (result.data && Array.isArray(result.data.slides) && result.data.slides.length > 0) {
          console.log('✅ [API RESPONSE] Received note with', result.data.slides.length, 'carousels from API')
          console.log('   ⏱️ Timestamp:', new Date().toISOString())
          // Map API response 'slides' to 'carousels' for our Note interface
          const noteData = {
            ...result.data,
            carousels: result.data.slides
          }
          
          const beforeSetNote = performance.now()
          console.log('📝 [SET NOTE] Setting note state, will trigger CarouselImageGenerator')
          
          // Clear fromHistory state when generating new content (before setting note)
          setFromHistory(false)
          
          // Set note - this will trigger the useEffect that sets showCustomisation to true
          setNote(noteData)
          
          // Ensure showCustomisation is set to true when note is set
          // This ensures the carousel view is shown immediately
          setShowCustomisation(true)
          
          const afterSetNote = performance.now()
          console.log('   ⏱️ setNote() call took:', (afterSetNote - beforeSetNote).toFixed(2), 'ms')
          
          // Clear generation_id to force new generation creation (new ideaTitle = new generation)
          try {
            localStorage.removeItem('postGeneration_generationId')
            localStorage.removeItem('postGeneration_contentHash')
            localStorage.removeItem('postGeneration_ideaTitle') // Clear ideaTitle for new note
            localStorage.removeItem('postGeneration_fromHistory') // Clear fromHistory when generating new content
            localStorage.setItem('postGeneration_note', JSON.stringify(noteData))
            localStorage.setItem('postGeneration_accountDescription', accountDescription.trim())
            localStorage.setItem('postGeneration_templateId', templateId)
            localStorage.setItem('postGeneration_colorThemeId', colorThemeId)
            if (user?.id) {
              localStorage.setItem('postGeneration_userId', user.id)
            }
            console.log('✅ Saved note to localStorage')
            
            // Save idea to previous ideas (keep last 10)
            const newIdea = { idea, timestamp: Date.now() }
            const updatedPreviousIdeas = [newIdea, ...previousIdeas.filter(p => p.idea !== idea)].slice(0, 10)
            setPreviousIdeas(updatedPreviousIdeas)
            localStorage.setItem(`postGeneration_previousIdeas_${user.id}`, JSON.stringify(updatedPreviousIdeas))
          } catch (error) {
            console.error('Error saving to localStorage:', error)
          }
          setError('')
          const finalTime = performance.now()
          console.log('✅ [COMPLETE] Generation flow completed')
          console.log('   ⏱️ Total Duration:', (finalTime - startTime).toFixed(2), 'ms')
          console.log('   ⏱️ Timestamp:', new Date().toISOString())
          setCurrentStep(null)
          // Keep selectedIdea set so we know which idea was selected
          // Don't clear selectedIdea after generation completes
        } else {
          console.error('❌ [ERROR] Invalid data structure received from API')
          console.error('   ⏱️ Total Duration:', (performance.now() - startTime).toFixed(2), 'ms')
          setError('Invalid data received from server')
          setCurrentStep(null)
        }
      } else {
        console.error('❌ [ERROR] API returned error:', result.error)
        console.error('   ⏱️ Total Duration:', (performance.now() - startTime).toFixed(2), 'ms')
        setError(result.error || 'Failed to generate note')
        setCurrentStep(null)
      }
    } catch (err: any) {
      console.error('❌ [ERROR] Exception during generation:', err)
      console.error('   ⏱️ Total Duration:', (performance.now() - startTime).toFixed(2), 'ms')
      setError('Failed to connect to server. Please try again.')
      setCurrentStep(null)
    } finally {
      setLoadingNote(false)
      console.log('🏁 [FINALLY] Loading state set to false')
    }
  }

  const handleCarouselFieldChange = (index: number, field: 'title' | 'content', value: string) => {
    setEditedCarousels(prev => {
      if (!prev[index]) return prev
      const next = [...prev]
      next[index] = {
        ...next[index],
        [field]: value
      }
      return next
    })
    setCarouselsDirty(true)
  }

  const resetEditedCarousels = () => {
    if (note) {
      setEditedCarousels(note.carousels.map(carousel => ({ ...carousel })))
    } else {
      setEditedCarousels([])
    }
    setCarouselsDirty(false)
  }

  const saveEditedCarousels = () => {
    if (!note || savingCarousels) return

    const cleanedCarousels = editedCarousels.map(carousel => ({
      ...carousel,
      title: (carousel.title ?? '').trim(),
      content: (carousel.content ?? '').trim()
    }))

    setSavingCarousels(true)
    setError('')

    console.log('🖼️ Frontend: Refreshing slides with includeImages =', includeImages, 'useAIImages =', useAIImages, 'aiImageStyle =', aiImageStyle)

    fetch(`${API_URL}/api/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refreshSlides',
        slides: cleanedCarousels,
        includeImages,
        useAIImages,
        aiImageStyle
      })
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to refresh carousel enhancements')
        }

        const updatedUnderline: Note['underlineWords'] = data.data?.underlineWords || {}
        const sanitizedCarousels: Note['carousels'] = (data.data?.slides || cleanedCarousels) as Note['carousels']

        const updatedNote: Note = {
          ...note,
          carousels: sanitizedCarousels,
          underlineWords: updatedUnderline
        }

        setNote(updatedNote)
        setEditedCarousels(sanitizedCarousels.map(carousel => ({ ...carousel })))
        setCarouselsDirty(false)

        try {
          localStorage.setItem('postGeneration_note', JSON.stringify(updatedNote))
          localStorage.removeItem('postGeneration_canvasImages')
          localStorage.removeItem('postGeneration_fullContentHash')
          localStorage.removeItem('postGeneration_contentHash')
        } catch (storageError) {
          console.warn('Could not persist edited carousels to localStorage:', storageError)
        }
      })
      .catch((err: any) => {
        console.error('Error refreshing carousels:', err)
        setError(err.message || 'Failed to refresh carousels. Please try again.')
      })
      .finally(() => {
        setSavingCarousels(false)
      })
  }

  const goBackToBusinessDetails = () => {
    // Go back to ideas list, keep the note and ideas
    setShowCustomisation(false)
    setSelectedIdea(null) // Clear selected idea so ideas list shows
    // Ensure ideas are loaded from localStorage if they exist
    try {
      const storedIdeas = localStorage.getItem('postGeneration_ideas')
      if (storedIdeas) {
        const parsedIdeas = JSON.parse(storedIdeas)
        if (Array.isArray(parsedIdeas) && parsedIdeas.length > 0) {
          setIdeas(parsedIdeas)
        }
      }
    } catch (error) {
      console.error('Error loading ideas when going back:', error)
    }
  }

  const goToCustomisation = () => {
    // Switch to customisation panel
    setShowCustomisation(true)
  }

  const reset = () => {
    // Reset all React state
    setAccountDescription('')
    setIdeas([])
    setNote(null)
    setSelectedIdea(null)
    setCurrentStep(null)
    setError('')
    setShowCustomisation(false)
    setEditedCarousels([])
    setEditedCaption('')
    setCarouselsDirty(false)
    setExpandedCarouselIndexes([])
    setActiveLeftTab('design')
    setTemplateId('template1')
    setColorThemeId('purple-black')
    setFromHistory(false)
    // Clear localStorage
    try {
      localStorage.removeItem('postGeneration_note')
      localStorage.removeItem('postGeneration_accountDescription')
      localStorage.removeItem('postGeneration_templateId')
      localStorage.removeItem('postGeneration_colorThemeId')
      localStorage.removeItem('postGeneration_canvasImages')
      localStorage.removeItem('postGeneration_contentHash')
      localStorage.removeItem('postGeneration_generationId')
      localStorage.removeItem('postGeneration_fullContentHash')
      localStorage.removeItem('postGeneration_fromHistory')
      localStorage.removeItem('postGeneration_ideaTitle')
      localStorage.removeItem('postGeneration_ideas')
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
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/app"
              onClick={(e) => {
                e.preventDefault()
                // Clear all state and reset to fresh /app page
                try {
                  // Clear all localStorage items
                  localStorage.removeItem('postGeneration_note')
                  localStorage.removeItem('postGeneration_canvasImages')
                  localStorage.removeItem('postGeneration_fullContentHash')
                  localStorage.removeItem('postGeneration_contentHash')
                  localStorage.removeItem('postGeneration_generationId')
                  localStorage.removeItem('postGeneration_ideaTitle')
                  localStorage.removeItem('postGeneration_fromHistory')
                  localStorage.removeItem('postGeneration_accountDescription')
                  localStorage.removeItem('postGeneration_templateId')
                  localStorage.removeItem('postGeneration_colorThemeId')
                  localStorage.removeItem('postGeneration_ideas')
                  // Reset all React state by calling the reset function
                  reset()
                } catch (error) {
                  console.error('Error clearing localStorage:', error)
                }
                // Force a full page reload to ensure fresh state
                window.location.href = '/app'
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#ffbd59',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffa929'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffbd59'
              }}
              title="Create New Idea"
            >
              <Plus size={18} color="#000000" />
            </Link>
            {user && (
              <>
                <Link 
                  href="/history"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#e5e5e5',
                    border: '2px solid #e5e5e5',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#d0d0d0'
                    e.currentTarget.style.borderColor = '#d0d0d0'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e5e5e5'
                    e.currentTarget.style.borderColor = '#e5e5e5'
                  }}
                  title="History"
                >
                  <History size={18} color="#000000" />
                </Link>
                <AccountButton
                  credits={credits?.credits_remaining ?? 0}
                  subscriptionStatus={credits?.subscription_status ?? null}
                  currentPlan={credits?.current_plan ?? null}
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
                    Idea
                  </h3>
                  
                  {/* Textarea for business description */}
                  <textarea
                    className="input mobile-prompt idea-textarea"
                    placeholder="Type your idea here..."
                    value={accountDescription}
                    onChange={(e) => setAccountDescription(e.target.value)}
                    rows={4}
                    style={{ 
                      width: '100%', 
                      resize: 'vertical',
                      maxHeight: '200px',
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
                      border: '2px solid #e5e5e5',
                      borderRadius: '12px',
                      padding: '16px',
                      background: '#ffffff'
                    }}
                  />
                  
                  {/* Button to open Template selection modal */}
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500', color: '#000000' }}>
                    Choose Template
                  </label>
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="input"
                    style={{ 
                      cursor: 'pointer', 
                      padding: '12px', 
                      marginBottom: '16px',
                      textAlign: 'left',
                      background: '#ffffff',
                      border: '2px solid #e5e5e5',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%'
                    }}
                  >
                    <span>{getTemplateOptions().find(t => t.id === templateId)?.name || 'Select Template'}</span>
                    <span style={{ fontSize: '12px', color: '#666666' }}>▼</span>
                  </button>
                  
                  {/* Dropdown for Text / Text + Image / Text + AI Image styles */}
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500', color: '#000000' }}>
                    Content Style
                  </label>
                  <select
                    value={includeImages ? (useAIImages ? (aiImageStyle === 'surreal' ? 'text-ai-surreal' : 'text-ai-animated') : 'text-image') : 'text'}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === 'text') {
                        setIncludeImages(false)
                        setUseAIImages(false)
                        setAiImageStyle('animated')
                      } else if (value === 'text-image') {
                        setIncludeImages(true)
                        setUseAIImages(false)
                        setAiImageStyle('animated')
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
                    className="input"
                    style={{ cursor: 'pointer', padding: '12px' }}
                  >
                    <option value="text">Text (1 credit)</option>
                    <option value="text-image">Text + Image (2 credits)</option>
                    <option value="text-ai-animated">Text + AI Animated Image (2 credits)</option>
                    <option value="text-ai-surreal">Text + AI Surrealism Image (2 credits)</option>
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
                    style={{ 
                      width: '100%'
                    }}
                  >
                    {loadingIdeas ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              ) : (
                <div className="card mobile-customize" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '16px' }}>
                  {/* Content area */}
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Back button - hide right after generation (when selectedIdea exists) */}
                    {/* Only show if NOT coming from history AND we don't have a selectedIdea (not right after generation) */}
                    {!fromHistory && !selectedIdea && (
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
                    )}
                    
                    {/* Customisation heading */}
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#000000' }}>
                      Customisation
                    </h3>
                  
                  {/* Tab buttons for Design / Carousels / Caption */}
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
                      Carousel Style
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#000000' }}>
                          Template
                        </label>
                        <button
                          onClick={() => setShowTemplateModal(true)}
                          disabled={!note}
                          className="input"
                          style={{ 
                            cursor: !note ? 'not-allowed' : 'pointer', 
                            padding: '12px',
                            textAlign: 'left',
                            background: '#ffffff',
                            border: '2px solid #e5e5e5',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            width: '100%',
                            opacity: !note ? 0.5 : 1
                          }}
                        >
                          <span>{getTemplateOptions().find(t => t.id === templateId)?.name || 'Select Template'}</span>
                          <span style={{ fontSize: '12px', color: '#666666' }}>▼</span>
                        </button>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#000000' }}>
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
                )}

                {activeLeftTab === 'carousels' && (
                  <div style={{ opacity: !note ? 0.5 : 1, pointerEvents: !note ? 'none' : 'auto', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#000000' }}>
                      Carousel Content
                    </h3>
                    {note && (
                      <div style={{ display: 'grid', gap: '16px' }}>
                    {editedCarousels.map((carousel, index) => {
                      const kind = note.carousels[index]?.kind ?? 'MIDDLE'
                      const isExpanded = expandedCarouselIndexes.includes(index)
                      return (
                        <div 
                          key={index}
                          className={`carousel-card ${kind === 'HOOK' ? 'hook' : kind === 'CTA' ? 'cta' : 'content'}`}
                          style={{ padding: '0px' }}
                        >
                          <button
                            onClick={() => toggleCarouselExpansion(index)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%',
                              background: 'none',
                              border: 'none',
                              padding: '6px 0',
                              margin: 0,
                              cursor: 'pointer',
                              textAlign: 'left'
                            }}
                          >
                            <div style={{ 
                              fontSize: '14px', 
                              fontWeight: '500', 
                              color: '#000000', 
                              textTransform: 'none',
                              letterSpacing: '0px'
                            }}>
                              Carousel {index + 1} • {kind === 'MIDDLE' ? 'Content' : kind === 'HOOK' ? 'Hook' : kind === 'CTA' ? 'CTA' : kind}
                            </div>
                            <span style={{ fontSize: '14px', color: '#000000', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                              ▾
                            </span>
                          </button>

                          {isExpanded && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', paddingTop: '12px' }}>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>
                                Title
                              </label>
                              <input
                                className="input"
                                value={carousel.title ?? ''}
                                onChange={(e) => handleCarouselFieldChange(index, 'title', e.target.value)}
                                placeholder="Enter carousel title"
                                style={{ width: '100%' }}
                              />
                            </div>
                            <div>
                              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>
                                Content
                              </label>
                              <textarea
                                className="input"
                                value={carousel.content ?? ''}
                                onChange={(e) => handleCarouselFieldChange(index, 'content', e.target.value)}
                                placeholder="Enter carousel content"
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
                      onClick={resetEditedCarousels}
                      disabled={!carouselsDirty || savingCarousels}
                      style={{ width: '100%' }}
                    >
                      Reset
                    </button>
                    <button
                      className="button"
                      onClick={saveEditedCarousels}
                      disabled={!carouselsDirty || savingCarousels}
                      style={{ width: '100%' }}
                    >
                      {savingCarousels ? 'Saving...' : 'Save'}
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
                            setCaptionCopied(true)
                            // Reset to "Copy" after 2 seconds
                            setTimeout(() => {
                              setCaptionCopied(false)
                            }, 2000)
                          } catch (err) {
                            console.error('Failed to copy caption:', err)
                          }
                        }}
                        style={{ width: '100%', marginTop: '12px' }}
                      >
                        {captionCopied ? 'Copied' : 'Copy'}
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
                    Post my Note is crafting 10 fresh angles for you.
                  </p>
                </div>
              )}

              {/* Show Ideas if available - show when going back from customization or when no note selected */}
              {/* Only show ideas page if: we have ideas, no note exists, not loading note, not currently generating, and no selected idea */}
              {/* During generation, selectedIdea is set, so ideas page won't show */}
              {ideas.length > 0 && !note && !loadingNote && !loadingIdeas && !selectedIdea && (
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
        {/* Show loading steps when we're generating (loadingNote is true) and we have a selected idea */}
        {loadingNote && selectedIdea && (
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

              {/* Show Generated Carousels if note exists and was generated on this page */}
        {/* Show carousel as long as we have a note with carousels, regardless of loading state or showCustomisation */}
        {note && note.carousels && note.carousels.length > 0 && (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <CarouselImageGenerator 
              carousels={carouselsDirty && editedCarousels.length > 0 ? editedCarousels : note.carousels}
              ideaTitle={note.ideaTitle}
              ideaIndex={selectedIdea ? ideas.findIndex(idea => idea === selectedIdea) + 1 : null}
              underlineWords={note.underlineWords || {}}
              templateId={templateId}
              colorThemeId={colorThemeId}
              accountDescription={accountDescription}
              caption={note.caption}
              includeImages={includeImages}
              useAIImages={useAIImages}
              aiImageStyle={aiImageStyle}
                    onGenerationComplete={() => {
                      // Generation complete - stay on current page
                      // Removed redirect to prevent flash/duplicate page issue
                    }}
                  />
                </div>
                </div>
              )}

              {/* Show Empty State if nothing to show */}
              {!ideas.length && !note && !loadingNote && !loadingIdeas && (
                <div className="card empty-state-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#999' }}>
                  <h3 style={{ 
                    marginBottom: '16px', 
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#000000'
                  }}>
                    Your carousel
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
                {note.carousels.map((carousel, index) => {
                  const emphasis = (note as any).underlineWords?.[index];
                  return (
                    <div key={index} style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: index < note.carousels.length - 1 ? '1px solid #333' : 'none' }}>
                      <div style={{ color: '#ffbd59', fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                        ━━━ CAROUSEL {index + 1}/{note.carousels.length} • {carousel.kind} ━━━
                    </div>
                      
                      <div style={{ marginLeft: '20px' }}>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#888' }}>Title:</span> <span style={{ color: '#fff' }}>{carousel.title || '(empty)'}</span>
                        </div>
                        
                        <div style={{ marginBottom: '8px' }}>
                          <span style={{ color: '#888' }}>Content:</span> <span style={{ color: '#fff' }}>{carousel.content || '(empty)'}</span>
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
                              
                              {carousel.kind === 'MIDDLE' && (
                                <>
                                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px dashed #444' }}>
                                    <div style={{ color: '#a78bfa', fontWeight: 'bold', marginBottom: '8px' }}>
                                      🖼️  Image data (content carousel only):
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
                              
                              {carousel.kind !== 'MIDDLE' && (
                                <div style={{ marginTop: '8px', color: '#888', fontSize: '12px' }}>
                                  ℹ️  Images only available for content carousels
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
                    <div>Total Carousels: {note.carousels.length}</div>
                    <div>Content carousels: {note.carousels.filter(c => c.kind === 'MIDDLE').length}</div>
                    <div>
                      Images Found: {note.carousels.filter((c, i) => c.kind === 'MIDDLE' && (note as any).underlineWords?.[i]?.imageUrl).length} / {note.carousels.filter(c => c.kind === 'MIDDLE').length}
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

      {/* Template Selector Modal */}
      <TemplateSelectorModal
        isOpen={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        selectedTemplateId={templateId}
        onSelectTemplate={(id) => setTemplateId(id)}
      />
    </div>
  )
}

