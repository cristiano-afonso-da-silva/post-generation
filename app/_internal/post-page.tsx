'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { useGenerations, useGeneration } from '../hooks/useGenerations'
import { useMobile } from '../hooks/useMobile'
import { CheckCircle, XCircle, Loader2, Palette, Edit3, MessageSquare, Download, Menu, ChevronLeft, ChevronRight, Send } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import CarouselImageGenerator from '../components/CarouselImageGenerator'
import type { CarouselImageGeneratorHandle } from '../components/CarouselImageGenerator'
import { COLOR_THEMES } from '../config/carouselThemes'
import { getTemplateOptions, getCarouselTemplate } from '../config/carouselTemplates'
import TemplateSelectorModal from '../components/TemplateSelectorModal'
import { createPortal } from 'react-dom'
import JSZip from 'jszip'

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

interface ThreadsConnectionStatus {
  connected: boolean
  isExpired?: boolean
  expiresAt?: string
  threadsUserId?: string
  threadsUsername?: string
  connectedAt?: string
}

interface PostingStatus {
  [generationId: string]: 'idle' | 'posting' | 'posted' | 'failed'
}

interface PostCardProps {
  generation: any
  thumbnailUrl: string | null
  status: string
  connectionStatus: ThreadsConnectionStatus | null
  postingStatus: PostingStatus
  onCardClick: () => void
  onPostClick: (e: React.MouseEvent) => void
  getStatusIcon: (generation: any) => React.ReactNode
  getStatusText: (generation: any) => string
  getButtonText: (generation: any) => React.ReactNode
}

function PostCard({ 
  generation, 
  thumbnailUrl, 
  status, 
  connectionStatus, 
  onCardClick, 
  onPostClick,
  getStatusIcon,
  getStatusText,
  getButtonText
}: PostCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  // Reset image state when thumbnailUrl changes
  useEffect(() => {
    setImageLoaded(false)
    setImageError(false)
    setShouldLoad(false)
  }, [thumbnailUrl])

  // Lazy load: only load image when it's about to be visible
  useEffect(() => {
    if (!thumbnailUrl || shouldLoad) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldLoad(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before it's visible
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [thumbnailUrl, shouldLoad])

  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(true) // Mark as "loaded" to hide skeleton
  }

  const isImageLoading = !imageLoaded && !imageError

  return (
    <div
      className="post-card"
      onClick={onCardClick}
      style={{
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #cccccc',
        overflow: 'hidden',
        transition: '0.2s',
        cursor: 'pointer',
      }}
    >
      {/* Thumbnail */}
      <div style={{
        width: '100%',
        aspectRatio: '4/5',
        background: '#f5f5f5',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {isImageLoading && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
              backgroundSize: '200% 100%',
              animation: 'skeleton-loading 1.5s ease-in-out infinite',
              zIndex: 1,
            }}
          />
        )}
        {thumbnailUrl ? (
          <img
            ref={imgRef}
            key={thumbnailUrl}
            src={shouldLoad ? thumbnailUrl : undefined}
            alt={generation.idea_title}
            onLoad={handleImageLoad}
            onError={handleImageError}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              position: 'relative',
              zIndex: imageLoaded ? 2 : 0,
              opacity: imageLoaded ? 1 : 0,
              transition: 'opacity 0.3s ease-in-out',
            }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999999',
            fontSize: '14px',
            position: 'relative',
            zIndex: 2,
          }}>
            No preview
          </div>
        )}
        {/* Status badge - show for failed or posted status */}
        {status === 'failed' && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '6px 10px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            fontWeight: '500',
            zIndex: 3,
          }}>
            {getStatusIcon(generation)}
            <span>{getStatusText(generation)}</span>
          </div>
        )}
        {status === 'posted' && (
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 3,
          }}>
            <CheckCircle size={20} color="rgb(0, 0, 0)" />
          </div>
        )}
      </div>
      
      {/* Info */}
      <div style={{ padding: '16px' }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: '700',
          color: '#000000',
          marginBottom: '8px',
          wordWrap: 'break-word',
          overflowWrap: 'break-word',
        }}>
          {generation.idea_title}
        </h3>
        <p style={{
          fontSize: '13px',
          color: '#666666',
          marginBottom: '12px',
        }}>
          {new Date(generation.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </p>
        {connectionStatus?.connected && (status === 'idle' || status === 'posting' || status === 'pending' || status === 'posted') && (
          <button
            onClick={onPostClick}
            disabled={status === 'posting' || status === 'pending'}
            className="button secondary"
            style={{
              width: '100%',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
          >
            {getButtonText(generation)}
          </button>
        )}
      </div>
    </div>
  )
}

function PostPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const generationId = searchParams.get('id')
  const urlTemplate = searchParams.get('template')
  const urlTheme = searchParams.get('theme')
  const { user, loading: authLoading } = useAuth()
  const isMobile = useMobile()
  const [page, setPage] = useState(1)
  const itemsPerPage = 12
  const offset = (page - 1) * itemsPerPage
  const [postFilter, setPostFilter] = useState<'all' | 'posted' | 'not_posted'>('all')
  
  const { generations, totalCount, isLoading, isError, mutate: mutateGenerations } = useGenerations(user?.id, itemsPerPage, offset)
  const totalPages = totalCount ? Math.ceil(totalCount / itemsPerPage) : 0

  // Load generation if generationId is in URL
  const { generation, isLoading: isLoadingGeneration, mutate: mutateGeneration } = useGeneration(
    generationId || undefined,
    user?.id
  )

  const [connectionStatus, setConnectionStatus] = useState<ThreadsConnectionStatus | null>(null)
  const [loadingConnection, setLoadingConnection] = useState(true)
  const [postingStatus, setPostingStatus] = useState<PostingStatus>({})
  const [error, setError] = useState('')
  const [disconnecting, setDisconnecting] = useState(false)
  const [repostGenerationId, setRepostGenerationId] = useState<string | null>(null)

  // State for detail view
  const [note, setNote] = useState<Note | null>(null)
  const [templateId, setTemplateId] = useState('template1')
  const [colorThemeId, setColorThemeId] = useState('purple-black')
  const [accountName, setAccountName] = useState('')
  const [website, setWebsite] = useState('')
  const [hasUserChangedTemplate, setHasUserChangedTemplate] = useState(false)
  const [hasUserChangedTheme, setHasUserChangedTheme] = useState(false)
  const [hasInitializedFromUrl, setHasInitializedFromUrl] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [activeLeftTab, setActiveLeftTab] = useState<'design' | 'carousels' | 'caption'>('design')
  const [editedCarousels, setEditedCarousels] = useState<Note['carousels']>([])
  const [carouselsDirty, setCarouselsDirty] = useState(false)
  const [savingCarousels, setSavingCarousels] = useState(false)
  const [editedCaption, setEditedCaption] = useState<string>('')
  const [captionCopied, setCaptionCopied] = useState(false)
  const [expandedCarouselIndexes, setExpandedCarouselIndexes] = useState<number[]>([])
  const [downloading, setDownloading] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const colorChangeStartTimeRef = useRef<number | null>(null)
  const carouselGeneratorRef = useRef<CarouselImageGeneratorHandle>(null)

  const leftTabs: { id: typeof activeLeftTab; label: string; icon: LucideIcon }[] = [
    { id: 'design', label: 'Customize Design', icon: Palette },
    { id: 'carousels', label: 'Edit Carousel', icon: Edit3 },
    { id: 'caption', label: 'Post Caption', icon: MessageSquare }
  ]

  // Check for URL params (error from OAuth callback)
  useEffect(() => {
    const successParam = searchParams.get('success')
    const errorParam = searchParams.get('error')
    
    if (successParam === 'threads_connected') {
      // Clear the param from URL
      router.replace('/dashboard?view=post', { scroll: false })
      // Refresh connection status
      checkConnectionStatus()
    }
    
    if (errorParam) {
      // Don't show connection errors if user is already disconnected
      if (errorParam === 'threads_auth_failed') {
        // Clear the param from URL without showing error
        router.replace('/dashboard?view=post', { scroll: false })
        return
      }
      
      const errorMessages: Record<string, string> = {
        no_code: 'Authorization failed. Please try again.',
        token_exchange_failed: 'Failed to authenticate with Threads. Please try again.',
        db_error: 'Failed to save connection. Please try again.',
        callback_failed: 'Connection process failed. Please try again.',
      }
      setError(errorMessages[errorParam] || 'An error occurred. Please try again.')
      // Clear the param from URL
      router.replace('/dashboard?view=post', { scroll: false })
    }
  }, [searchParams, router])

  // Check Threads connection status
  const checkConnectionStatus = async () => {
    if (!user?.id) return
    
    setLoadingConnection(true)
    try {
      // Add timestamp to bust any caching
      const timestamp = new Date().getTime()
      const response = await fetch(`/api/threads/status?userId=${user.id}&t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      const data = await response.json()
      console.log('[PostPage] Connection status check:', { responseOk: response.ok, data })
      
      // Always set the status based on the data, even if response.ok is false
      // The status endpoint returns connected: false when not connected
      if (data.connected === false || !response.ok) {
        setConnectionStatus({ connected: false })
      } else {
        setConnectionStatus(data)
      }
    } catch (err) {
      console.error('Error checking connection status:', err)
      setConnectionStatus({ connected: false })
    } finally {
      setLoadingConnection(false)
    }
  }

  useEffect(() => {
    if (user && !authLoading) {
      checkConnectionStatus()
      mutateGenerations()
    }
  }, [user?.id, authLoading])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin')
    }
  }, [user, authLoading, router])

  // Clear note state when generationId changes
  useEffect(() => {
    setNote(null)
    setEditedCarousels([])
    setEditedCaption('')
    setCarouselsDirty(false)
    setExpandedCarouselIndexes([])
    setHasInitializedFromUrl(false) // Reset URL initialization flag when generationId changes
    setHasUserChangedTemplate(false)
    setHasUserChangedTheme(false)
  }, [generationId])

  // Function to save template and theme to database and update URL
  // OPTIMIZED: Uses lightweight endpoint that only updates template_id and color_theme_id
  const saveTemplateAndThemeToDatabase = async (newTemplateId: string, newColorThemeId: string) => {
    if (!generationId || !user?.id) return
    
    const saveStartTime = colorChangeStartTimeRef.current || performance.now()
    
    try {
      // Use lightweight endpoint that only updates template/theme fields
      const response = await fetch('/api/generations/update-template-theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          generationId: generationId,
          templateId: newTemplateId,
          colorThemeId: newColorThemeId
        })
      })

      if (!response.ok) {
        let errorMessage = `Failed to save template and theme (${response.status})`
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage
        }
        throw new Error(errorMessage)
      }

      // Calculate save duration and update UI immediately when database save completes
      const saveDuration = performance.now() - saveStartTime
      setLastSaveTime(saveDuration)
      setIsSaving(false)
      colorChangeStartTimeRef.current = null
      console.log(`💾 Database save completed in ${(saveDuration / 1000).toFixed(2)} seconds`)

      // Update URL params to reflect the new template and theme (without page reload)
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.set('template', newTemplateId)
      newUrl.searchParams.set('theme', newColorThemeId)
      window.history.replaceState({}, '', newUrl.toString())

      // Refresh generation data to get updated values (but don't override user changes)
      if (mutateGeneration) {
        mutateGeneration()
      }
    } catch (err: any) {
      console.error('Error saving template and theme to database:', err)
      // Only show error if it's not a network error (network errors are usually temporary)
      // Network errors will be retried on next color change
      if (err.message && !err.message.includes('fetch failed') && !err.message.includes('NetworkError')) {
        setError(err.message || 'Failed to save template and theme changes')
      } else {
        // For network errors, just log and continue - the save will retry on next change
        console.warn('Network error saving template/theme (will retry on next change):', err.message)
      }
      setIsSaving(false)
      colorChangeStartTimeRef.current = null
    }
  }

  // Load generation data when generation is available
  useEffect(() => {
    if (!generation || !user || !generationId) return
    
    if (generation.id !== generationId) {
      return
    }

    const noteData: Note = {
      ideaTitle: generation.idea_title,
      carousels: generation.slides,
      caption: generation.caption || '',
      underlineWords: generation.underline_words
    }
    
    setNote(noteData)
    // Sync HOOK carousel title with ideaTitle when initializing
    const syncedCarousels = generation.slides.map((slide: any, index: number) => {
      if (index === 0 && noteData.carousels[0]?.kind === 'HOOK') {
        return { ...slide, title: noteData.ideaTitle }
      }
      return { ...slide }
    })
    setEditedCarousels(syncedCarousels)
    setEditedCaption(generation.caption || '')
    
    // Load accountName and website from generation data or localStorage
    const savedAccountName = generation.account_name || localStorage.getItem('postGeneration_accountName') || ''
    const savedWebsite = generation.website || localStorage.getItem('postGeneration_website') || ''
    setAccountName(savedAccountName)
    setWebsite(savedWebsite)
    
    // Only initialize from URL params on first load (when hasInitializedFromUrl is false)
    // After user makes changes, don't override with URL params
    if (!hasInitializedFromUrl) {
      const templateOptions = getTemplateOptions()
      let finalTemplateId = 'template1'
      let finalColorThemeId = 'purple-black'
      
      if (urlTemplate && templateOptions.find(t => t.id === urlTemplate)) {
        // Use template from URL (first load only)
        finalTemplateId = urlTemplate
        // If URL has theme, use it; otherwise use template's default theme
        if (urlTheme) {
          finalColorThemeId = urlTheme
        } else {
          const template = getCarouselTemplate(urlTemplate)
          finalColorThemeId = template.defaultColorThemeId || 'purple-black'
        }
      } else if (generation.template_id) {
        // Fall back to database
        const validTemplateId = templateOptions.find(t => t.id === generation.template_id)?.id || 'template1'
        finalTemplateId = validTemplateId
        finalColorThemeId = generation.color_theme_id || 'purple-black'
      }
      
      setTemplateId(finalTemplateId)
      setColorThemeId(finalColorThemeId)
      setHasInitializedFromUrl(true)
    } else if (generation.template_id && !hasUserChangedTemplate && !hasUserChangedTheme) {
      // If user hasn't made changes and database has values, use them
      // This handles the case where generation data is refreshed
      const templateOptions = getTemplateOptions()
      const validTemplateId = templateOptions.find(t => t.id === generation.template_id)?.id || templateId
      const dbThemeId = generation.color_theme_id || colorThemeId
      
      // Only update if different from current state
      if (validTemplateId !== templateId) {
        setTemplateId(validTemplateId)
      }
      if (dbThemeId !== colorThemeId) {
        setColorThemeId(dbThemeId)
      }
    }
    
    setCarouselsDirty(false)
    setExpandedCarouselIndexes([])
    
    try {
      localStorage.setItem('postGeneration_generationId', generation.id)
      localStorage.setItem('postGeneration_userId', user.id)
      localStorage.setItem('postGeneration_ideaTitle', generation.idea_title)
      localStorage.setItem('postGeneration_fromHistory', 'true')
      
      if (generation.image_urls && generation.image_urls.length > 0) {
        // Check if we have cached data URLs for these images
        const { getCachedImageDataUrl, cacheImageUrls } = require('../lib/imageCache')
        const imageUrls = generation.image_urls.map((url: string) => {
          const cached = getCachedImageDataUrl(url)
          return cached || url
        })
        
        // Validate that we have all expected images (should match number of carousels)
        const expectedCount = generation.slides?.length || 0
        if (imageUrls.length !== expectedCount) {
          console.warn(`⚠️ Image count mismatch: expected ${expectedCount} images but found ${imageUrls.length} in database. Missing indices: ${Array.from({length: expectedCount}, (_, i) => i).filter(i => !imageUrls[i]).map(i => i + 1).join(', ')}`)
          // Log which specific images are missing for debugging
          if (imageUrls.length < expectedCount) {
            const missingIndices = Array.from({length: expectedCount}, (_, i) => i).filter(i => !imageUrls[i])
            console.warn(`   Missing image indices: ${missingIndices.map(i => i + 1).join(', ')}`)
          }
        }
        
        localStorage.setItem('postGeneration_canvasImages', JSON.stringify(imageUrls))
        
        // Update hash to match current state so getInitialImages can find cached images
        const currentHash = JSON.stringify({
          ideaTitle: generation.idea_title,
          carousels: generation.slides,
          underlineWords: generation.underline_words || {},
          templateId: templateId,
          colorThemeId: colorThemeId
        })
        localStorage.setItem('postGeneration_fullContentHash', currentHash)
        
        // Convert signed URLs to data URLs in background (if not already cached)
        const signedUrls = generation.image_urls.filter((url: string) => 
          url && !url.startsWith('data:image/') && !getCachedImageDataUrl(url)
        )
        if (signedUrls.length > 0) {
          // Convert in background without blocking
          cacheImageUrls(signedUrls).catch((err: unknown) => 
            console.error('[post-page] Error caching images in background:', err)
          )
        }
      }
    } catch (error) {
      console.error('Error storing in localStorage:', error)
    }
  }, [generation, user, generationId, isLoadingGeneration, urlTemplate, urlTheme, hasInitializedFromUrl, hasUserChangedTemplate, hasUserChangedTheme, templateId, colorThemeId])

  // Sync editable carousels with note
  useEffect(() => {
    if (note) {
      // Sync HOOK carousel title with ideaTitle
      const syncedCarousels = note.carousels.map((carousel, index) => {
        if (index === 0 && carousel.kind === 'HOOK') {
          return { ...carousel, title: note.ideaTitle }
        }
        return { ...carousel }
      })
      setEditedCarousels(syncedCarousels)
      setEditedCaption(note.caption || '')
      setCarouselsDirty(false)
      setExpandedCarouselIndexes([])
    }
  }, [note])

  const toggleCarouselExpansion = (index: number) => {
    setExpandedCarouselIndexes(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      }
      return [...prev, index]
    })
  }

  const handleCarouselFieldChange = (index: number, field: 'title' | 'content', value: string) => {
    // If this is the HOOK carousel and we're changing the title, also update ideaTitle
    if (field === 'title' && note && note.carousels[index]?.kind === 'HOOK') {
      setNote(prev => {
        if (!prev) return prev
        return {
          ...prev,
          ideaTitle: value
        }
      })
    }
    
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
      // Sync HOOK carousel title with ideaTitle when resetting
      const syncedCarousels = note.carousels.map((carousel, index) => {
        if (index === 0 && carousel.kind === 'HOOK') {
          return { ...carousel, title: note.ideaTitle }
        }
        return { ...carousel }
      })
      setEditedCarousels(syncedCarousels)
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

    fetch(`${API_URL}/api/social`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'refreshSlides',
        slides: cleanedCarousels,
        includeImages: false,
        useAIImages: false,
        aiImageStyle: 'animated'
      })
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to refresh carousel enhancements')
        }

        const updatedUnderline: Record<number, { underline: string; highlight: string; imageSearch?: string; imageUrl?: string | null; originalImageUrl?: string | null }> = data.data?.underlineWords || {}
        const sanitizedCarousels: Note['carousels'] = (data.data?.slides || cleanedCarousels) as Note['carousels']

        const preservedUnderlineWords: Note['underlineWords'] = {}
        const existingUnderlineWords = note.underlineWords || {}
        
        Object.keys(updatedUnderline || {}).forEach((key) => {
          const index = parseInt(key, 10)
          const newWords = updatedUnderline[index]
          const existingWords = existingUnderlineWords[index]
          
          preservedUnderlineWords[index] = {
            underline: newWords?.underline || '',
            highlight: newWords?.highlight || '',
            imageSearch: newWords?.imageSearch || '',
            imageUrl: existingWords?.imageUrl || newWords?.imageUrl || null,
            originalImageUrl: existingWords?.originalImageUrl || newWords?.originalImageUrl || null,
          }
        })

        const updatedNote: Note = {
          ...note,
          carousels: sanitizedCarousels,
          underlineWords: preservedUnderlineWords
        }

        setNote(updatedNote)
        // Sync HOOK carousel title with ideaTitle after saving
        const syncedCarousels = sanitizedCarousels.map((carousel, index) => {
          if (index === 0 && carousel.kind === 'HOOK') {
            return { ...carousel, title: note.ideaTitle }
          }
          return { ...carousel }
        })
        setEditedCarousels(syncedCarousels)
        setCarouselsDirty(false)

        try {
          const fullContentHash = JSON.stringify({ 
            ideaTitle: note.ideaTitle, 
            carousels: sanitizedCarousels, 
            underlineWords: preservedUnderlineWords, 
            templateId: templateId, 
            colorThemeId: colorThemeId
          })
          localStorage.setItem('postGeneration_fullContentHash', fullContentHash)
        } catch (storageError) {
          console.warn('Could not update content hash:', storageError)
        }

        if (carouselGeneratorRef.current && carouselGeneratorRef.current.regenerateAndSave) {
          carouselGeneratorRef.current.regenerateAndSave(preservedUnderlineWords).then(() => {
            console.log('✅ Carousels re-rendered with new text + new underline/highlight words + preserved AI images!')
          }).catch((err: any) => {
            console.error('⚠️ Failed to regenerate carousels for download:', err)
          })
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

  const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (typeof window !== 'undefined' && window.innerWidth <= 768)
  }

  const downloadAllCarousels = async () => {
    const imageUrls = (generation as any)?.imageUrls || generation?.image_urls || []
    
    if (!generation || imageUrls.length === 0) {
      console.error('No images available to download')
      return
    }

    setDownloading(true)
    try {
      const isMobile = isMobileDevice()
      
      if (isMobile) {
        try {
          for (let i = 0; i < imageUrls.length; i++) {
            const imageUrl = imageUrls[i]
            if (!imageUrl) continue
            
            const index = i
            const currentUrl = imageUrl
            
            setTimeout(async () => {
              try {
                const response = await fetch(currentUrl)
                if (!response.ok) {
                  console.error(`Failed to fetch image ${index + 1}: HTTP ${response.status}`)
                  return
                }
                const blob = await response.blob()
                
                const carousel = note?.carousels[index] || generation.slides[index]
                const kind = carousel?.kind || 'MIDDLE'
                const fileName = `carousel-${index + 1}-${kind.toLowerCase()}.png`
                
                const link = document.createElement('a')
                link.href = URL.createObjectURL(blob)
                link.download = fileName
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                
                URL.revokeObjectURL(link.href)
              } catch (error) {
                console.error(`Failed to download image ${index + 1}:`, error)
              }
            }, index * 400)
          }
        } catch (error) {
          console.error('Error downloading images on mobile:', error)
          setDownloading(false)
          return
        }
        setTimeout(() => {
          setDownloading(false)
        }, imageUrls.length * 400 + 500)
        return
      }
      
      const zip = new JSZip()
      
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i]
        if (!imageUrl) continue
        
        try {
          const response = await fetch(imageUrl)
          if (!response.ok) {
            console.error(`Failed to fetch image ${i + 1}: HTTP ${response.status}`)
            continue
          }
          const blob = await response.blob()
          
          const carousel = note?.carousels[i] || generation.slides[i]
          const kind = carousel?.kind || 'MIDDLE'
          const fileName = `carousel-${i + 1}-${kind.toLowerCase()}.png`
          
          zip.file(fileName, blob)
        } catch (error) {
          console.error(`Failed to fetch image ${i + 1}:`, error)
        }
      }
      
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `${note?.ideaTitle || generation.idea_title || 'carousels'}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Error creating zip file:', error)
    } finally {
      setDownloading(false)
    }
  }

  const handleConnectThreads = () => {
    if (!user?.id) {
      router.push('/signin')
      return
    }

    const params = new URLSearchParams({ userId: user.id })
    window.location.href = `/api/threads/auth?${params.toString()}`
  }

  const handleDisconnectThreads = async () => {
    if (!user?.id) return
    setDisconnecting(true)
    setError('')
    try {
      console.log('[PostPage] Disconnecting Threads for user:', user.id)
      const response = await fetch('/api/threads/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const data = await response.json()
      console.log('[PostPage] Disconnect response:', { responseOk: response.ok, data })
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect Threads')
      }
      
      // Immediately set to disconnected state optimistically
      setConnectionStatus({ connected: false })
      
      // Refresh connection status to verify (but don't show error if verification fails)
      // The disconnect API call succeeded, so we trust it worked
      checkConnectionStatus().catch(() => {
        // Silently handle verification errors - disconnect already succeeded
      })
    } catch (err: any) {
      console.error('Disconnect error:', err)
      setError(err.message || 'Failed to disconnect Threads')
      // On error, still check the actual status
      await checkConnectionStatus()
    } finally {
      setDisconnecting(false)
    }
  }

  const postToThreads = async (generationId: string) => {
    if (!connectionStatus?.connected) {
      setError('Please connect your Threads account first')
      return
    }

    // Find the generation - check detail view first, then list view
    let targetGeneration = generationId && generation?.id === generationId ? generation : null
    if (!targetGeneration) {
      targetGeneration = generations?.find(g => g.id === generationId) || null
    }
    if (!targetGeneration) {
      setError('Generation not found')
      return
    }

    setPostingStatus(prev => ({ ...prev, [generationId]: 'posting' }))
    setError('')

    try {
      console.log('Posting generation to Threads', generationId)
      const imageUrls = (targetGeneration as any).imageUrls || targetGeneration?.image_urls || []
      const response = await fetch('/api/threads/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId: targetGeneration.id,
          imageUrls: imageUrls,
          caption: targetGeneration.caption || '',
          userId: user?.id
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to post to Threads')
      }

      setPostingStatus(prev => ({ ...prev, [generationId]: 'posted' }))
      
      // Refresh generations to get updated status
      mutateGenerations()
      // Also refresh the single generation if we're viewing it
      if (generationId && mutateGeneration) {
        mutateGeneration()
      }
    } catch (err: any) {
      console.error('Posting error:', err)
      setPostingStatus(prev => ({ ...prev, [generationId]: 'failed' }))
      setError(err.message || 'Failed to post to Threads')
    }
  }

  const getStatusIcon = (generation: any) => {
    const status = generation.threads_post_status || postingStatus[generation.id] || 'idle'
    
    switch (status) {
      case 'posted':
        return <CheckCircle size={16} color="#10b981" />
      case 'failed':
        return <XCircle size={16} color="#ef4444" />
      case 'posting':
      case 'pending':
        return <Loader2 size={16} className="animate-spin" color="#ffbd59" />
      default:
        return null
    }
  }

  const getStatusText = (generation: any) => {
    const status = generation.threads_post_status || postingStatus[generation.id] || 'idle'
    
    switch (status) {
      case 'posted':
        return generation.threads_posted_at 
          ? `Posted ${new Date(generation.threads_posted_at).toLocaleDateString()}`
          : 'Posted'
      case 'failed':
        return 'Failed'
      case 'posting':
      case 'pending':
        return 'Posting...'
      default:
        return 'Not posted'
    }
  }

  const getButtonText = (generation: any) => {
    const status = generation.threads_post_status || postingStatus[generation.id] || 'idle'
    
    if (status === 'posted') {
      return 'Posted'
    }
    if (status === 'posting' || status === 'pending') {
      return (
        <>
          Posting
          <span className="posting-dots">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </>
      )
    }
    return 'Post'
  }

  if (authLoading || loadingConnection) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fafafa',
      }}>
        <img 
          src="/logo.svg" 
          alt="Loading" 
          style={{ 
            width: '48px', 
            height: '48px',
            animation: 'spin 0.8s linear infinite'
          }} 
        />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const templateOptions = getTemplateOptions()

  // Show detail view when generationId is present
  if (generationId && (generation || isLoadingGeneration)) {
    const showLoading = isLoadingGeneration || (generation && !note)
    const imageUrls = generation ? ((generation as any)?.imageUrls || generation?.image_urls || []) : []
    const hasImages = imageUrls.length > 0
    const isDownloadDisabled = downloading || !generation || !hasImages

    return (
      <div
        style={{
          background: '#ffffff',
          height: '100vh',
          width: '100%',
          animation: 'slideUp 0.6s ease-out',
          paddingBottom: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          overflowX: 'hidden',
          overflowY: 'hidden'
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 1000,
            background: '#ffffff',
            borderBottom: '1px solid #e5e5e5',
            borderRight: isMobile ? 'none' : '1px solid rgb(229, 229, 229)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxSizing: 'border-box',
            minWidth: 0,
            height: '65px',
            flexShrink: 0,
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <button
              onClick={() => router.push('/dashboard?view=post')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                if (!isMobile && window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.background = '#f5f5f5'
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile && window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <ChevronLeft size={20} color="#000000" />
            </button>
            <h1
              style={{
                fontSize: isMobile ? '16px' : '18px',
                fontWeight: '700',
                color: '#000000',
                margin: 0,
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {generation?.idea_title || note?.ideaTitle || 'Carousel'}
            </h1>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: '12px',
            flexShrink: 0
          }}>
            <button
              onClick={downloadAllCarousels}
              disabled={isDownloadDisabled}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: isDownloadDisabled ? 'not-allowed' : 'pointer',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                flexShrink: 0,
                color: isDownloadDisabled ? '#999999' : '#000000',
                transition: 'background-color 0.2s, opacity 0.2s',
                opacity: isDownloadDisabled ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!isDownloadDisabled && !isMobile && window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.background = 'rgb(245, 245, 245)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isDownloadDisabled && !isMobile && window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <Download size={20} />
            </button>
            {generationId && generation && (() => {
              // Prioritize database status over local postingStatus
              const dbStatus = (generation as any).threads_post_status
              const currentStatus = dbStatus || postingStatus[generationId] || 'idle'
              const isPosting = currentStatus === 'posting' || currentStatus === 'pending'
              const isPosted = currentStatus === 'posted'
              const isFailed = currentStatus === 'failed'
              
              return (
                <button
                  onClick={() => {
                    if (!isPosting && connectionStatus?.connected) {
                      if (isPosted) {
                        // Show repost modal
                        setRepostGenerationId(generationId)
                      } else {
                        // Show initial post modal
                        setShowShareModal(true)
                      }
                    }
                  }}
                  disabled={isPosting || !connectionStatus?.connected}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: (isPosting || !connectionStatus?.connected) ? 'not-allowed' : 'pointer',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '8px',
                    flexShrink: 0,
                    color: isFailed ? '#ef4444' : (!connectionStatus?.connected ? '#999999' : 'rgb(0, 0, 0)'),
                    transition: 'background-color 0.2s, opacity 0.2s',
                    opacity: (isPosting || !connectionStatus?.connected) ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!isPosting && connectionStatus?.connected && !isMobile && window.matchMedia('(hover: hover)').matches) {
                      e.currentTarget.style.background = 'rgb(245, 245, 245)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isPosting && connectionStatus?.connected && !isMobile && window.matchMedia('(hover: hover)').matches) {
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                  title={
                    isPosting ? 'Publishing...' :
                    isPosted ? 'Post again to Threads' :
                    isFailed ? 'Failed to post' :
                    !connectionStatus?.connected ? 'Connect Threads to post' :
                    'Post to Threads'
                  }
                >
                  {isPosting ? (
                    <Loader2 
                      size={20} 
                      color="rgb(0, 0, 0)" 
                      style={{ 
                        animation: 'spin 0.8s linear infinite',
                        display: 'inline-block'
                      }} 
                    />
                  ) : isPosted ? (
                    <CheckCircle size={20} color="rgb(0, 0, 0)" />
                  ) : isFailed ? (
                    <XCircle size={20} color="#ef4444" />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              )
            })()}
          </div>
        </div>

        <div
          className="container"
          style={{
            flex: 1,
            width: '100%',
            maxWidth: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            overflowX: 'hidden',
            overflowY: 'hidden',
            padding: '0',
            margin: '0',
            minHeight: 0
          }}
        >
          <div style={{ flex: 1, overflow: 'hidden', overflowX: 'hidden', overflowY: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {error && (
              <div className="error" style={{ margin: '0 0 24px', flex: '0 0 auto' }}>
                {error}
              </div>
            )}

            <div 
              className="responsive-grid"
              style={{ 
                display: isMobile ? 'flex' : 'grid', 
                flexDirection: isMobile ? 'column' : undefined,
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 0.22fr) minmax(0, 0.78fr)', 
                gap: isMobile ? '24px' : '0px',
                alignItems: 'stretch',
                flex: 1,
                overflow: 'hidden',
                overflowX: 'hidden',
                overflowY: 'hidden',
                minWidth: 0,
                padding: '0'
              }}
            >
              {/* LEFT COLUMN - Customisation */}
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0', 
                height: '100%', 
                overflow: 'hidden',
                overflowX: 'hidden',
                overflowY: 'hidden',
                alignSelf: 'stretch',
                order: isMobile ? 1 : 1,
                flex: isMobile ? '0 0 30%' : undefined,
                maxHeight: isMobile ? '30vh' : undefined
              }}>
                <div className="card mobile-customize" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: '220px', overflow: 'hidden', padding: '0', border: 'none', background: 'transparent', borderRadius: 0 }}>
                  {showLoading ? (
                    <div style={{ 
                      flex: 1, 
                      minHeight: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden'
                    }}>
                      {/* Tab buttons skeleton */}
                      <div style={{
                        display: 'flex',
                        gap: '0',
                        borderBottom: '1px solid rgb(229, 229, 229)',
                        padding: 0
                      }}>
                        {[1, 2].map((i) => (
                          <div
                            key={i}
                            style={{
                              flex: 1,
                              height: '40px',
                              background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
                              backgroundSize: '200% 100%',
                              animation: 'skeleton-loading 1.5s ease-in-out infinite'
                            }}
                          />
                        ))}
                      </div>
                      
                      {/* Content skeleton */}
                      <div style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                      }}>
                        {/* Heading skeleton */}
                        <div style={{
                          height: '20px',
                          width: '60%',
                          borderRadius: '4px',
                          background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
                          backgroundSize: '200% 100%',
                          animation: 'skeleton-loading 1.5s ease-in-out infinite'
                        }} />
                        
                        {/* Form elements skeleton */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Label skeleton */}
                          <div style={{
                            height: '14px',
                            width: '40%',
                            borderRadius: '4px',
                            background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'skeleton-loading 1.5s ease-in-out infinite'
                          }} />
                          
                          {/* Input skeleton */}
                          <div style={{
                            height: '48px',
                            width: '100%',
                            borderRadius: '12px',
                            background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'skeleton-loading 1.5s ease-in-out infinite'
                          }} />
                          
                          {/* Label skeleton */}
                          <div style={{
                            height: '14px',
                            width: '35%',
                            borderRadius: '4px',
                            marginTop: '8px',
                            background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
                            backgroundSize: '200% 100%',
                            animation: 'skeleton-loading 1.5s ease-in-out infinite'
                          }} />
                          
                          {/* Color swatches skeleton */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            gap: '8px'
                          }}>
                            {[1, 2, 3, 4, 5].map((i) => (
                              <div
                                key={i}
                                style={{
                                  aspectRatio: '1',
                                  borderRadius: '8px',
                                  background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
                                  backgroundSize: '200% 100%',
                                  animation: 'skeleton-loading 1.5s ease-in-out infinite'
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : note ? (
                    <>
                    {/* Sticky Tab buttons */}
                    <div 
                      style={{ 
                        position: 'sticky',
                        top: 0,
                        zIndex: 100,
                        display: 'flex', 
                        gap: '0',
                        alignItems: 'stretch',
                        border: 'none',
                        borderRight: isMobile ? 'none' : '1px solid rgb(229, 229, 229)',
                        padding: 0,
                        height: 'fit-content',
                        margin: '0',
                        flexShrink: 0,
                        borderRadius: 0,
                        overflow: 'hidden'
                      }}
                    >
                      {leftTabs.map(tab => {
                        const TabIcon = tab.icon
                        const isActive = activeLeftTab === tab.id
                        return (
                          <button
                            key={tab.id}
                            onClick={() => setActiveLeftTab(tab.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '10px 10px',
                              paddingRight: '12px',
                              flex: 1,
                              border: 'none',
                              background: isActive ? '#f5f5f5' : 'transparent',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                              borderRadius: 0,
                            }}
                            title={tab.label}
                            aria-label={tab.label}
                          >
                            <TabIcon size={18} color="#000000" />
                          </button>
                        )
                      })}
                    </div>

                    {/* Tab content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingTop: '20px', paddingLeft: '20px', paddingRight: '24px', borderRight: isMobile ? 'none' : '1px solid rgb(229, 229, 229)', minHeight: 0 }}>
                    {activeLeftTab === 'design' && (
                      <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '600', marginBottom: '16px', color: '#000000' }}>
                          Carousel Style
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          {/* Template selector commented out - users cannot change template after generation */}
                          {/* <div style={{ minWidth: 0 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: isMobile ? '11px' : '13px', fontWeight: '500', color: '#000000' }}>
                              Template
                            </label>
                            <button
                              onClick={() => setShowTemplateModal(true)}
                              className="input"
                              style={isMobile ? {
                                cursor: 'pointer',
                                padding: '10px',
                                textAlign: 'left',
                                background: '#ffffff',
                                border: '2px solid #e5e5e5',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                minWidth: 0
                              } : {
                                cursor: 'pointer',
                                padding: '12px',
                                textAlign: 'left',
                                background: '#ffffff',
                                border: '2px solid #e5e5e5',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                width: '100%',
                                minWidth: 0
                              }}
                            >
                              <span style={{ 
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                flex: 1,
                                minWidth: 0,
                                fontSize: isMobile ? '12px' : undefined
                              }}>
                                {templateOptions.find(t => t.id === templateId)?.name || templateOptions[0]?.name || 'Select Template'}
                              </span>
                              <span style={{ fontSize: '12px', color: '#666666', flexShrink: 0, marginLeft: '8px' }}>▼</span>
                            </button>
                          </div> */}
                          <div style={{ minWidth: 0 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: isMobile ? '11px' : '13px', fontWeight: '500', color: '#000000' }}>
                              Color Theme
                            </label>
                            <div>
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: isMobile ? 'repeat(auto-fit, minmax(24px, 1fr))' : 'repeat(auto-fit, minmax(32px, 1fr))',
                                gap: isMobile ? '6px' : '8px',
                                maxWidth: '100%'
                              }}>
                                {COLOR_THEMES.map(theme => {
                                  const isSelected = colorThemeId === theme.id
                                  const isTransparent = theme.highlightColor === 'transparent'
                                  return (
                                    <button
                                      key={theme.id}
                                      onClick={() => {
                                        colorChangeStartTimeRef.current = performance.now()
                                        setIsSaving(true)
                                        setLastSaveTime(null)
                                        setColorThemeId(theme.id)
                                        setHasUserChangedTheme(true)
                                        // Save to database when user changes theme
                                        saveTemplateAndThemeToDatabase(templateId, theme.id)
                                      }}
                                      style={{
                                        aspectRatio: '1',
                                        borderRadius: isMobile ? '6px' : '8px',
                                        border: isSelected ? '2px solid rgb(229, 229, 229)' : (isTransparent ? '1px solid #e5e5e5' : 'none'),
                                        background: isTransparent 
                                          ? 'repeating-conic-gradient(#f0f0f0 0% 25%, #ffffff 0% 50%) 50% / 8px 8px'
                                          : theme.highlightColor,
                                        cursor: 'pointer',
                                        padding: 0,
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                        minWidth: isMobile ? '24px' : '32px',
                                        minHeight: isMobile ? '24px' : '32px',
                                        width: '100%',
                                        maxWidth: '100%'
                                      }}
                                      title={theme.name}
                                      aria-label={theme.name}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeLeftTab === 'carousels' && (
                      <div style={{ marginBottom: '24px' }}>
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
                                      fontSize: isMobile ? '12px' : '14px', 
                                      fontWeight: '500', 
                                      color: '#000000', 
                                      textTransform: 'none',
                                      letterSpacing: '0px'
                                    }}>
                                      Carousel {index + 1} • {kind === 'MIDDLE' ? 'Content' : kind === 'HOOK' ? 'Hook' : kind === 'CTA' ? 'CTA' : kind}
                                    </div>
                                    <span style={{ fontSize: isMobile ? '12px' : '14px', color: '#000000', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                                      ▾
                                    </span>
                                  </button>

                                  {isExpanded && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px', paddingTop: '12px' }}>
                                      <div>
                                        <label style={{ display: 'block', fontSize: isMobile ? '11px' : '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>
                                          Title
                                        </label>
                                        <input
                                          className="input"
                                          value={kind === 'HOOK' && note ? (note.ideaTitle ?? '') : (carousel.title ?? '')}
                                          onChange={(e) => handleCarouselFieldChange(index, 'title', e.target.value)}
                                          placeholder="Enter carousel title"
                                          style={{ width: '100%', fontSize: isMobile ? '13px' : undefined }}
                                        />
                                      </div>
                                      <div>
                                        <label style={{ display: 'block', fontSize: isMobile ? '11px' : '12px', fontWeight: 600, color: '#6b7280', marginBottom: '6px' }}>
                                          Content
                                        </label>
                                        <textarea
                                          className="input"
                                          value={carousel.content ?? ''}
                                          onChange={(e) => handleCarouselFieldChange(index, 'content', e.target.value)}
                                          placeholder="Enter carousel content"
                                          rows={kind === 'CTA' ? 5 : 6}
                                          style={{ width: '100%', resize: 'vertical', minHeight: '120px', fontSize: isMobile ? '13px' : undefined }}
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
                            flexDirection: isMobile ? 'row' : 'column',
                            gap: '12px',
                            marginTop: '24px'
                          }}>
                            <button
                              className="button secondary"
                              onClick={resetEditedCarousels}
                              disabled={!carouselsDirty || savingCarousels}
                              style={isMobile ? { 
                                width: '48%',
                                fontSize: '14px',
                                padding: '10px 16px'
                              } : { 
                                width: '100%'
                              }}
                            >
                              Reset
                            </button>
                            <button
                              className="button"
                              onClick={saveEditedCarousels}
                              disabled={!carouselsDirty || savingCarousels}
                              style={isMobile ? { 
                                width: '48%',
                                fontSize: '14px',
                                padding: '10px 16px'
                              } : { 
                                width: '100%'
                              }}
                            >
                              {savingCarousels ? 'Saving...' : 'Save'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {activeLeftTab === 'caption' && (
                      <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#000000' }}>
                          Carousel Caption
                        </h3>
                        <textarea
                          className="input"
                          value={editedCaption}
                          onChange={(e) => setEditedCaption(e.target.value)}
                          placeholder="Caption will appear here"
                          style={{ 
                            width: '100%',
                            minHeight: '300px',
                            padding: '20px', 
                            background: '#fafafa',
                            border: '2px solid #e5e5e5',
                            borderRadius: '12px',
                            fontSize: isMobile ? '13px' : '15px',
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
                                setTimeout(() => {
                                  setCaptionCopied(false)
                                }, 2000)
                              } catch (err) {
                                console.error('Failed to copy caption:', err)
                              }
                            }}
                            style={isMobile ? { 
                              width: '100%', 
                              marginTop: '12px',
                              fontSize: '14px',
                              padding: '10px 16px'
                            } : { 
                              width: '100%', 
                              marginTop: '12px'
                            }}
                          >
                            {captionCopied ? 'Copied' : 'Copy'}
                          </button>
                        )}
                      </div>
                    )}
                    </div>
                    </>
                  ) : null}
                </div>
              </div>

              {/* RIGHT COLUMN - Output */}
              <div className="mobile-output" style={{ 
                height: '100%', 
                overflowX: 'hidden',
                overflowY: 'hidden',
                display: 'flex', 
                flexDirection: 'column', 
                gap: isMobile ? '16px' : '24px', 
                minHeight: 0, 
                minWidth: 0, 
                alignSelf: 'stretch',
                order: isMobile ? 2 : 2,
                flex: isMobile ? '1 1 70%' : undefined,
                marginBottom: isMobile ? '0' : '0'
              }}>
                {showLoading ? (
                  <div style={{ 
                    flex: 1, 
                    minHeight: 0,
                    display: 'flex',
                    alignItems: 'center',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      display: 'flex',
                      gap: '24px',
                      paddingBottom: '16px',
                      width: '100%',
                      overflowX: 'auto',
                      overflowY: 'hidden'
                    }}>
                      {/* Carousel card skeletons */}
                      {[1, 2].map((i) => (
                        <div
                          key={i}
                          style={{
                            flexShrink: 0,
                            minWidth: isMobile ? '280px' : '400px',
                            maxWidth: isMobile ? '280px' : '400px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            padding: '16px'
                          }}
                        >
                          {/* Image skeleton with 4:5 aspect ratio */}
                          <div style={{
                            position: 'relative',
                            paddingBottom: '125%', // 4:5 aspect ratio
                            background: '#ffffff',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            marginBottom: '12px'
                          }}>
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
                              backgroundSize: '200% 100%',
                              animation: 'skeleton-loading 1.5s ease-in-out infinite'
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : note ? (
                  <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', overflow: 'hidden' }}>
                    <CarouselImageGenerator 
                      ref={carouselGeneratorRef}
                      carousels={carouselsDirty && editedCarousels.length > 0 ? editedCarousels : note.carousels}
                      ideaTitle={note.ideaTitle}
                      ideaIndex={null}
                      underlineWords={note.underlineWords || {}}
                      templateId={templateId}
                      colorThemeId={colorThemeId}
                      accountDescription=""
                      accountName={accountName}
                      website={website}
                      caption={note.caption}
                      includeImages={false}
                      useAIImages={false}
                      aiImageStyle="animated"
                      onGenerationComplete={() => {
                        console.log('✅ Generation rendering complete')
                        // Note: Database save completion is now handled in saveTemplateAndThemeToDatabase
                        // This callback is only for carousel generation completion
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Template Selector Modal - Commented out: users cannot change template after generation */}
        {/* <TemplateSelectorModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          selectedTemplateId={templateId}
          onSelectTemplate={(id) => {
            setTemplateId(id)
            setHasUserChangedTemplate(true)
            // Get default theme for the new template
            const newTemplate = getCarouselTemplate(id)
            const newDefaultTheme = newTemplate.defaultColorThemeId || colorThemeId || 'purple-black'
            setColorThemeId(newDefaultTheme)
            // Save to database when user changes template
            saveTemplateAndThemeToDatabase(id, newDefaultTheme)
          }}
        /> */}

        {/* Share to Threads Modal */}
        {showShareModal && generationId && typeof window !== 'undefined' && createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
            onClick={() => setShowShareModal(false)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '400px',
                width: '100%',
                border: '2px solid #e5e5e5',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#000000',
                marginBottom: '16px',
                marginTop: 0,
                width: '100%',
              }}>
                Post to Threads
              </h2>
              <p style={{
                fontSize: '16px',
                color: '#666666',
                marginBottom: '24px',
                lineHeight: '1.5',
                marginTop: 0,
                width: '100%',
              }}>
                Do you want to post on Threads now?
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                width: '100%',
              }}>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="button secondary"
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (generationId) {
                      postToThreads(generationId)
                      setShowShareModal(false)
                    }
                  }}
                  className="button"
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Post Now
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Repost Confirmation Modal - Detail View */}
        {repostGenerationId && generationId && typeof window !== 'undefined' && createPortal(
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
            onClick={() => setRepostGenerationId(null)}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                padding: '32px',
                maxWidth: '400px',
                width: '100%',
                border: '2px solid #e5e5e5',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: '#000000',
                marginBottom: '16px',
                marginTop: 0,
                width: '100%',
              }}>
                Post Again
              </h2>
              <p style={{
                fontSize: '16px',
                color: '#666666',
                marginBottom: '24px',
                lineHeight: '1.5',
                marginTop: 0,
                width: '100%',
              }}>
                Do you want to post this content again?
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                width: '100%',
              }}>
                <button
                  onClick={() => setRepostGenerationId(null)}
                  className="button secondary"
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (repostGenerationId) {
                      postToThreads(repostGenerationId)
                      setRepostGenerationId(null)
                    }
                  }}
                  className="button"
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: '600',
                  }}
                >
                  Post Again
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    )
  }

  // Show list view
  return (
    <div style={{
      padding: isMobile ? '40px 24px 40px 24px' : '40px 32px 40px 32px',
      maxWidth: '1400px',
      margin: '0 auto',
      background: '#fafafa',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#000000',
          marginBottom: '8px',
        }}>
          Publish
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#666666',
        }}>
          Automatically post your content to Threads
        </p>
      </div>

      {/* Connection Status Banner */}
        <div 
          className="connection-status-banner"
          style={{
            padding: '16px 20px',
            background: '#ffffff',
            border: '1px solid #e5e5e5',
            borderRadius: '8px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img 
              src="/icon/threads.png" 
              alt="Threads" 
              style={{ width: '24px', height: '24px', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontWeight: '600', color: '#000000' }}>
                Threads
              </div>
              {connectionStatus?.connected && connectionStatus.threadsUsername && (
                <div style={{ 
                  fontSize: '14px', 
                  color: '#333333',
                  marginTop: '2px'
                }}>
                  @{connectionStatus.threadsUsername}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={connectionStatus?.connected ? handleDisconnectThreads : handleConnectThreads}
            disabled={connectionStatus?.connected ? disconnecting : false}
            className="button secondary"
            style={{
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            {connectionStatus?.connected
              ? (disconnecting ? 'Disconnecting...' : 'Disconnect')
              : 'Connect'}
          </button>
        </div>
      

      {/* Error Messages */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          marginBottom: '24px',
          color: '#991b1b',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* Generations Grid */}
      {isLoading ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '48px',
          marginBottom: '32px',
        }}>
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="post-card"
              style={{
                background: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #cccccc',
                overflow: 'hidden',
              }}
            >
              {/* Thumbnail Skeleton */}
              <div style={{
                width: '100%',
                aspectRatio: '4/5',
                background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-loading 1.5s ease-in-out infinite',
              }} />
              
              {/* Info Skeleton */}
              <div style={{ padding: '16px' }}>
                <div style={{
                  height: '16px',
                  background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'skeleton-loading 1.5s ease-in-out infinite',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  width: '80%',
                }} />
                <div style={{
                  height: '14px',
                  background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'skeleton-loading 1.5s ease-in-out infinite',
                  borderRadius: '4px',
                  marginBottom: '12px',
                  width: '60%',
                }} />
                <div style={{
                  height: '44px',
                  background: 'linear-gradient(90deg, #e5e5e5 25%, #f0f0f0 50%, #e5e5e5 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'skeleton-loading 1.5s ease-in-out infinite',
                  borderRadius: '8px',
                  width: '100%',
                }} />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: '#ef4444',
        }}>
          Failed to load generations. Please try again.
        </div>
      ) : !generations || generations.length === 0 ? (
        <div style={{
          padding: '64px',
          textAlign: 'center',
          color: '#666666',
        }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>No carousels yet</p>
          <p style={{ fontSize: '14px' }}>Create yours</p>
        </div>
      ) : (
        <>
          {/* Filter Buttons */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '24px',
            flexWrap: 'wrap'
          }}>
            <button
              onClick={() => {
                setPostFilter('all')
                setPage(1)
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '8px',
                border: '1px solid #e5e5e5',
                background: postFilter === 'all' ? '#f5f5f5' : '#ffffff',
                color: '#000000',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (postFilter !== 'all' && !isMobile && window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.background = '#f5f5f5'
                }
              }}
              onMouseLeave={(e) => {
                if (postFilter !== 'all' && !isMobile && window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.background = '#ffffff'
                }
              }}
            >
              All
            </button>
            <button
              onClick={() => {
                setPostFilter('posted')
                setPage(1)
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '8px',
                border: '1px solid #e5e5e5',
                background: postFilter === 'posted' ? '#f5f5f5' : '#ffffff',
                color: '#000000',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (postFilter !== 'posted' && !isMobile && window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.background = '#f5f5f5'
                }
              }}
              onMouseLeave={(e) => {
                if (postFilter !== 'posted' && !isMobile && window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.background = '#ffffff'
                }
              }}
            >
              Posted
            </button>
            <button
              onClick={() => {
                setPostFilter('not_posted')
                setPage(1)
              }}
              style={{
                padding: '8px 16px',
                fontSize: '14px',
                fontWeight: '500',
                borderRadius: '8px',
                border: '1px solid #e5e5e5',
                background: postFilter === 'not_posted' ? '#f5f5f5' : '#ffffff',
                color: '#000000',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                if (postFilter !== 'not_posted' && !isMobile && window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.background = '#f5f5f5'
                }
              }}
              onMouseLeave={(e) => {
                if (postFilter !== 'not_posted' && !isMobile && window.matchMedia('(hover: hover)').matches) {
                  e.currentTarget.style.background = '#ffffff'
                }
              }}
            >
              Not Posted
            </button>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '48px',
            marginBottom: '32px',
          }}>
            {generations
              .filter((generation: any) => {
                const status = generation.threads_post_status || postingStatus[generation.id] || 'idle'
                if (postFilter === 'all') return true
                if (postFilter === 'posted') return status === 'posted'
                if (postFilter === 'not_posted') return status !== 'posted' && status !== 'posting' && status !== 'pending'
                return true
              })
              .map((generation: any) => {
              const status = generation.threads_post_status || postingStatus[generation.id] || 'idle'
              const isPosting = status === 'posting' || status === 'pending'
              
              // Get thumbnail URL - check all possible sources
              // Priority: imageUrls (camelCase) > image_urls (snake_case) > thumbnail_urls
              const imageUrls = generation.imageUrls || generation.image_urls || []
              const thumbnailUrls = generation.thumbnail_urls || []
              
              // Find first valid URL (non-empty string)
              let thumbnailUrl: string | null = null
              
              if (imageUrls.length > 0) {
                thumbnailUrl = imageUrls.find((url: string) => url && typeof url === 'string' && url.trim().length > 0) || null
              }
              
              if (!thumbnailUrl && thumbnailUrls.length > 0) {
                thumbnailUrl = thumbnailUrls.find((url: string) => url && typeof url === 'string' && url.trim().length > 0) || null
              }
              
              return (
                <PostCard
                  key={generation.id}
                  generation={generation}
                  thumbnailUrl={thumbnailUrl}
                  status={status}
                  connectionStatus={connectionStatus}
                  postingStatus={postingStatus}
                  onCardClick={() => {
                    // Include template and theme in URL if available from database
                    // This ensures the detail view shows the correct template/theme
                    const urlParams = new URLSearchParams({
                      view: 'post',
                      id: generation.id
                    })
                    if (generation.template_id) {
                      urlParams.set('template', generation.template_id)
                    }
                    if (generation.color_theme_id) {
                      urlParams.set('theme', generation.color_theme_id)
                    }
                    router.push(`/dashboard?${urlParams.toString()}`)
                  }}
                  onPostClick={(e: React.MouseEvent) => {
                    e.stopPropagation()
                    if (status === 'idle') {
                      postToThreads(generation.id)
                    } else if (status === 'posted') {
                      setRepostGenerationId(generation.id)
                    }
                  }}
                  getStatusIcon={getStatusIcon}
                  getStatusText={getStatusText}
                  getButtonText={getButtonText}
                />
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: '2px solid #e5e5e5',
                  background: page === 1 ? '#f5f5f5' : '#ffffff',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={20} color="#000000" />
              </button>
              <span style={{ fontSize: '14px', color: '#666666' }}>
                {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  border: '2px solid #e5e5e5',
                  background: page === totalPages ? '#f5f5f5' : '#ffffff',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  opacity: page === totalPages ? 0.5 : 1,
                }}
              >
                <ChevronRight size={20} color="#000000" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Repost Confirmation Modal */}
      {repostGenerationId && typeof window !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setRepostGenerationId(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%',
              border: '2px solid #e5e5e5',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#000000',
              marginBottom: '16px',
              marginTop: 0,
              width: '100%',
            }}>
              Post Again
            </h2>
            <p style={{
              fontSize: '16px',
              color: '#666666',
              marginBottom: '24px',
              lineHeight: '1.5',
              marginTop: 0,
              width: '100%',
            }}>
              Do you want to post this content again?
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center',
              width: '100%',
            }}>
              <button
                onClick={() => setRepostGenerationId(null)}
                className="button secondary"
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (repostGenerationId) {
                    postToThreads(repostGenerationId)
                    setRepostGenerationId(null)
                  }
                }}
                className="button primary"
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Post Again
              </button>
            </div>
          </div>
        </div>,
        document.body
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
        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @keyframes flash {
          0%, 100% {
            background-color: rgb(245, 245, 245);
            opacity: 1;
          }
          50% {
            background-color: rgb(230, 230, 230);
            opacity: 0.8;
          }
        }
      `}</style>
    </div>
  )
}

export default function PostPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fafafa',
      }}>
        <Loader2 size={48} className="animate-spin" color="#ffbd59" />
      </div>
    }>
      <PostPageContent />
    </Suspense>
  )
}


