'use client'

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { getCarouselTemplate } from '../config/carouselTemplates'
import { getColorTheme } from '../config/carouselThemes'
import { useAuth } from '../context/AuthContext'
import { useMobile } from '../hooks/useMobile'
import { loadGoogleFont } from '../lib/googleFonts'
import JSZip from 'jszip'

function ensureColorAlpha(color: string, alpha = 0.5): string {
  const clamped = Math.max(0, Math.min(1, alpha))
  if (!color) return `rgba(0, 0, 0, ${clamped})`
  const trimmed = color.trim()

  if (trimmed.startsWith('rgba')) {
    const parts = trimmed.slice(5, -1).split(',').map(part => part.trim())
    const [r = '0', g = '0', b = '0'] = parts
    return `rgba(${r}, ${g}, ${b}, ${clamped})`
  }

  if (trimmed.startsWith('rgb(')) {
    const parts = trimmed.slice(4, -1).split(',').map(part => part.trim())
    const [r = '0', g = '0', b = '0'] = parts
    return `rgba(${r}, ${g}, ${b}, ${clamped})`
  }

  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1)
    if (hex.length === 3) {
      hex = hex.split('').map(ch => `${ch}${ch}`).join('')
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16)
      const g = parseInt(hex.slice(2, 4), 16)
      const b = parseInt(hex.slice(4, 6), 16)
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) {
        return `rgba(${r}, ${g}, ${b}, ${clamped})`
      }
    }
  }

  // Fallback: return original color (browser will handle)
  return trimmed
}

const isWhitespace = (char: string): boolean => /\s/.test(char)

const measureTextWithLetterSpacing = (
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number
): number => {
  if (!text) return 0
  let width = 0
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    width += ctx.measureText(char).width
    if (i < text.length - 1) {
      const nextChar = text[i + 1]
      if (!isWhitespace(char) && !isWhitespace(nextChar)) {
        width += letterSpacing
      }
    }
  }
  return width
}

const drawTextWithLetterSpacing = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number
): number => {
  if (!text) return 0
  let currentX = x
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    ctx.fillText(char, currentX, y)
    currentX += ctx.measureText(char).width
    if (i < text.length - 1) {
      const nextChar = text[i + 1]
      if (!isWhitespace(char) && !isWhitespace(nextChar)) {
        currentX += letterSpacing
      }
    }
  }
  return currentX - x
}

interface Carousel {
  title: string
  content: string
  kind: 'HOOK' | 'MIDDLE' | 'CTA'
  topic?: string
  subtitle?: string
  cta?: string
}

interface Props {
  carousels: Carousel[]
  ideaTitle: string
  ideaIndex?: number | null
  underlineWords?: Record<number, { underline: string; highlight: string; imageUrl?: string | null; originalImageUrl?: string | null }>
  templateId?: string
  colorThemeId?: string
  accountDescription?: string
  accountName?: string  // For footer (e.g., '@postmynote')
  website?: string  // For footer (e.g., 'postmynote.app')
  caption?: string
  includeImages?: boolean
  useAIImages?: boolean
  aiImageStyle?: 'animated' | 'surreal'
  onGenerationComplete?: (generationId?: string) => void
  onCarouselsReorder?: (reorderedCarousels: Carousel[]) => void
}

export interface CarouselImageGeneratorHandle {
  regenerateAndSave: (updatedUnderlineWords?: Record<number, { underline: string; highlight: string; imageUrl?: string | null; originalImageUrl?: string | null }>) => Promise<void>
  getImages: () => string[]
}

// Helper: Create content hash for cache matching
const createContentHash = (ideaTitle: string, carousels: Carousel[], underlineWords: Record<number, any>, templateId: string, colorThemeId: string): string => {
  return JSON.stringify({ ideaTitle, carousels, underlineWords, templateId, colorThemeId })
}

// Helper: Check if cache is valid
const isCacheValid = (carousels: Carousel[], ideaTitle: string, underlineWords: Record<number, any>, templateId: string, colorThemeId: string): { valid: boolean; images?: string[] } => {
  try {
    // Check if cache should be skipped
    const skipCache = localStorage.getItem('postGeneration_skipCache') === 'true'
    if (skipCache) {
      return { valid: false }
    }
    
    const currentHash = createContentHash(ideaTitle, carousels, underlineWords, templateId, colorThemeId)
    const savedImages = localStorage.getItem('postGeneration_canvasImages')
    const savedHash = localStorage.getItem('postGeneration_fullContentHash')
    
    if (!savedImages) {
      return { valid: false }
    }
    
    // FIXED: Always check hash match (even on post page)
    // This ensures theme/template changes trigger regeneration
    // Hash includes templateId and colorThemeId, so any change invalidates cache
    if (!savedHash || savedHash !== currentHash) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 Cache invalid - hash mismatch:', {
          savedHash: savedHash?.substring(0, 50) + '...',
          currentHash: currentHash.substring(0, 50) + '...',
          templateId,
          colorThemeId
        })
      }
      return { valid: false } // Hash mismatch = cache invalid, must regenerate
    }
    
    // Hash matches - load images from cache
    try {
      const imageDataUrls = JSON.parse(savedImages)
      const { getCachedImageDataUrl } = require('../lib/imageCache')
      const convertedUrls = imageDataUrls.map((url: string) => {
        if (url && typeof url === 'string' && (url.startsWith('data:image/webp') || url.startsWith('data:image/png'))) {
          return url
        }
        const cached = getCachedImageDataUrl(url)
        return cached || url
      })
      const allValid = convertedUrls.every((img: string) => 
        img && typeof img === 'string' && (img.startsWith('data:image/webp') || img.startsWith('data:image/png') || img.startsWith('http'))
      )
      if (convertedUrls.length === carousels.length && allValid) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Cache valid - hash matches, loading from cache')
        }
        return { valid: true, images: convertedUrls }
      }
    } catch (error) {
      console.error('Error parsing cached images:', error)
    }
    
    return { valid: false }
  } catch (error) {
    console.error('Error checking cache:', error)
    return { valid: false }
  }
}

// Helper: Batch write to localStorage
const saveToLocalStorage = (data: {
  note?: any
  canvasImages?: string[]
  fullContentHash?: string
  contentHash?: string
  generationId?: string
  ideaTitle?: string
  templateId?: string
  colorThemeId?: string
  accountDescription?: string
  userId?: string
  fromHistory?: boolean
}) => {
  try {
    if (data.note !== undefined) {
      localStorage.setItem('postGeneration_note', JSON.stringify(data.note))
    }
    if (data.canvasImages !== undefined) {
      localStorage.setItem('postGeneration_canvasImages', JSON.stringify(data.canvasImages))
    }
    if (data.fullContentHash !== undefined) {
      localStorage.setItem('postGeneration_fullContentHash', data.fullContentHash)
    }
    if (data.contentHash !== undefined) {
      localStorage.setItem('postGeneration_contentHash', data.contentHash)
    }
    if (data.generationId !== undefined) {
      localStorage.setItem('postGeneration_generationId', data.generationId)
    }
    if (data.ideaTitle !== undefined) {
      localStorage.setItem('postGeneration_ideaTitle', data.ideaTitle)
    }
    if (data.templateId !== undefined) {
      localStorage.setItem('postGeneration_templateId', data.templateId)
    }
    if (data.colorThemeId !== undefined) {
      localStorage.setItem('postGeneration_colorThemeId', data.colorThemeId)
    }
    if (data.accountDescription !== undefined) {
      localStorage.setItem('postGeneration_accountDescription', data.accountDescription)
    }
    if (data.userId !== undefined) {
      localStorage.setItem('postGeneration_userId', data.userId)
    }
    if (data.fromHistory !== undefined) {
      localStorage.setItem('postGeneration_fromHistory', data.fromHistory ? 'true' : 'false')
    }
  } catch (error) {
    console.error('Error saving to localStorage:', error)
  }
}

// Initialize images from localStorage before rendering (simplified - uses isCacheValid helper)
const getInitialImages = (carousels: Carousel[], ideaTitle: string, underlineWords: Record<number, any>, templateId: string, colorThemeId: string): string[] => {
  const cacheCheck = isCacheValid(carousels, ideaTitle, underlineWords, templateId, colorThemeId)
  if (cacheCheck.valid && cacheCheck.images) {
    console.log('✅ Loading images from localStorage cache')
    return cacheCheck.images
  }
  return []
}

// Helper function to yield control without relying on timers (works in background tabs)
// This is defined outside the component so it's available before useCallback is called
const yieldToEventLoop = (): Promise<void> => {
  return new Promise(resolve => {
    // Use MessageChannel for yielding - less likely to be throttled in background tabs
    // Fallback to queueMicrotask if MessageChannel is not available
    if (typeof MessageChannel !== 'undefined') {
      const channel = new MessageChannel()
      channel.port1.onmessage = () => resolve()
      channel.port2.postMessage(null)
    } else {
      // Fallback to queueMicrotask (works in all modern browsers)
      queueMicrotask(() => resolve())
    }
  })
}

import { forwardRef, useImperativeHandle } from 'react'

function CarouselImageGeneratorComponent({ 
  carousels, 
  ideaTitle,
  ideaIndex = null,
  underlineWords = {},
  templateId = 'template1',
  colorThemeId = 'purple-black',
  accountDescription = '',
  accountName = '',
  website = '',
  caption = '',
  includeImages = false,
  useAIImages = false,
  aiImageStyle = 'animated',
  onGenerationComplete,
  onCarouselsReorder
}: Props, ref: React.Ref<CarouselImageGeneratorHandle>) {
  const isMobile = useMobile()
  
  // Debug: Log underlineWords on component mount/update
  useEffect(() => {
    console.log('\n📦 CarouselImageGenerator: Received underlineWords:')
    console.log(JSON.stringify(underlineWords, null, 2))
    
    // Check for image URLs in MIDDLE carousels
    carousels.forEach((carousel, index) => {
      if (carousel.kind === 'MIDDLE') {
        const emphasis = underlineWords[index]
        const hasImage = !!(emphasis?.imageUrl || emphasis?.originalImageUrl)
        if (hasImage) {
          console.log(`✅ Carousel ${index + 1} (MIDDLE): Has imageUrl =`, emphasis?.imageUrl || '(proxied not set)')
          if (emphasis?.originalImageUrl) {
            console.log(`   Original image URL:`, emphasis.originalImageUrl)
          }
        } else {
          console.warn(`⚠️ Carousel ${index + 1} (MIDDLE): No imageUrl found!`)
          console.warn(`   Emphasis data:`, emphasis)
        }
      }
    })
  }, [underlineWords, carousels])
  
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const [generating, setGenerating] = useState(false)
  // Cache to track which fonts have been loaded for which template
  const loadedFontsCache = useRef<Map<string, Set<string>>>(new Map())
  
  // Memoize initial images to avoid calling getInitialImages multiple times
  const initialImagesMemo = useMemo(() => 
    getInitialImages(carousels, ideaTitle, underlineWords, templateId, colorThemeId),
    [carousels, ideaTitle, underlineWords, templateId, colorThemeId]
  )
  
  const [carouselImages, setCarouselImages] = useState<string[]>(initialImagesMemo)
  // Keep previous images visible during regeneration to prevent layout shifts
  const previousImagesRef = useRef<string[]>(initialImagesMemo)
  
  // Local state for reordered carousels (allows drag-and-drop reordering)
  const [orderedCarousels, setOrderedCarousels] = useState<Carousel[]>(carousels)
  const [orderedCarouselImages, setOrderedCarouselImages] = useState<string[]>(initialImagesMemo)
  const [orderedUnderlineWords, setOrderedUnderlineWords] = useState<Record<number, any>>(underlineWords)
  
  // Update local state when props change
  // IMPORTANT: Preserve existing images to prevent them from disappearing on Reset
  // BUT when regenerating from a text edit, we want to show the NEW images
  useEffect(() => {
    setOrderedCarousels(carousels)
    setOrderedUnderlineWords(underlineWords)
    // Keep ref in sync with state (unless we're regenerating from edit, in which case ref is set separately)
    if (!isRegeneratingFromEditRef.current) {
      underlineWordsForGenerationRef.current = underlineWords
    }
    
    // Check if colorThemeId or templateId changed - if so, clear cached images
    const prevSettings = prevDesignSettings.current
    const designChanged = prevSettings.templateId !== templateId || prevSettings.colorThemeId !== colorThemeId
    
    // Load images from cache if we don't have them AND design hasn't changed
    // If design changed, the regeneration useEffect will handle it
    setOrderedCarouselImages(prev => {
      if (prev.length === 0 && !designChanged) {
        return getInitialImages(carousels, ideaTitle, underlineWords, templateId, colorThemeId)
      }
      // If design changed, clear images to trigger regeneration
      if (designChanged && prev.length > 0) {
        return []
      }
      return prev
    })
  }, [carousels, ideaTitle, underlineWords, templateId, colorThemeId])
  
  // Sync orderedCarouselImages with carouselImages when they update
  useEffect(() => {
    if (carouselImages.length > 0 && carouselImages.length === orderedCarousels.length) {
      setOrderedCarouselImages(carouselImages)
    }
  }, [carouselImages])
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  // Handle reordering carousels
  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    
    setOrderedCarousels(prev => {
      const newCarousels = [...prev]
      const [moved] = newCarousels.splice(fromIndex, 1)
      newCarousels.splice(toIndex, 0, moved)
      
      // Notify parent if callback provided
      if (onCarouselsReorder) {
        onCarouselsReorder(newCarousels)
      }
      
      return newCarousels
    })
    
    setOrderedCarouselImages(prev => {
      const newImages = [...prev]
      const [moved] = newImages.splice(fromIndex, 1)
      newImages.splice(toIndex, 0, moved)
      return newImages
    })
    
    setOrderedUnderlineWords(prev => {
      // Create a temporary array to reorder underlineWords
      const tempArray: any[] = []
      const maxIndex = Math.max(...Object.keys(prev).map(Number), -1)
      
      // Fill array with existing values
      for (let i = 0; i <= maxIndex; i++) {
        tempArray[i] = prev[i]
      }
      
      // Reorder the array
      const [moved] = tempArray.splice(fromIndex, 1)
      tempArray.splice(toIndex, 0, moved)
      
      // Convert back to object with new indices
      const newUnderlineWords: Record<number, any> = {}
      tempArray.forEach((value, newIndex) => {
        if (value !== undefined) {
          newUnderlineWords[newIndex] = value
        }
      })
      
      return newUnderlineWords
    })
    
    // Update canvas refs order
    const newCanvasRefs = [...canvasRefs.current]
    const [movedCanvas] = newCanvasRefs.splice(fromIndex, 1)
    newCanvasRefs.splice(toIndex, 0, movedCanvas)
    canvasRefs.current = newCanvasRefs
    
    // Update previous images ref
    const newPreviousImages = [...previousImagesRef.current]
    const [movedImage] = newPreviousImages.splice(fromIndex, 1)
    newPreviousImages.splice(toIndex, 0, movedImage)
    previousImagesRef.current = newPreviousImages
  }, [onCarouselsReorder])
  
  const { user, refreshCredits } = useAuth()
  
  // Track when we're regenerating from a text edit so we can show new images
  const isRegeneratingFromEditRef = useRef(false)
  
  // Ref to store underlineWords during regeneration (so generateAllCarousels can access latest values)
  const underlineWordsForGenerationRef = useRef<Record<number, any>>(orderedUnderlineWords)
  
  // Track previous underlineWords to detect when images are added
  const prevUnderlineWordsRef = useRef<Record<number, any>>(underlineWords)
  
  // ✅ Expose regenerateAndSave method for parent component to call after text edits
  useImperativeHandle(ref, () => ({
    getImages: () => {
      return orderedCarouselImages
    },
    regenerateAndSave: async (updatedUnderlineWords?: Record<number, { underline: string; highlight: string; imageUrl?: string | null; originalImageUrl?: string | null }>) => {
      console.log('📤 regenerateAndSave called - triggering full carousel regeneration with new text...')
      
      // If updated underlineWords are provided (from Gemini API), use them
      // Otherwise use the current props (for backward compatibility)
      const underlineWordsToUse = updatedUnderlineWords || orderedUnderlineWords
      
      if (updatedUnderlineWords) {
        console.log('✨ Using newly extracted underline/highlight words from Gemini API')
        console.log('   Updated underlineWords:', JSON.stringify(updatedUnderlineWords, null, 2))
        // Update the state with new underlineWords
        setOrderedUnderlineWords(underlineWordsToUse)
        // Also update the ref so generateAllCarousels can access the latest values immediately
        underlineWordsForGenerationRef.current = underlineWordsToUse
      } else {
        // Update ref to current state
        underlineWordsForGenerationRef.current = orderedUnderlineWords
      }
      
      // This will regenerate all canvases with the new text and save to database
      try {
        // Mark that we're regenerating from an edit so we show the new images
        isRegeneratingFromEditRef.current = true
        
        // Clear cached images AND canvas refs so new ones are generated from scratch
        setCarouselImages([])
        setOrderedCarouselImages([])
        
        // Clear previous images ref to prevent old images from showing
        previousImagesRef.current = []
        
        // Clear canvas refs to ensure fresh canvases are used (not reused with old content)
        // This prevents the "two images layered on top of each other" bug
        canvasRefs.current = new Array(orderedCarousels.length).fill(null)
        
        console.log('🧹 Cleared canvas refs - fresh canvases will be created')
        
        // Temporarily disable credit deduction for this regeneration (it's not a new generation)
        const wasDeducted = hasDeductedCredit.current
        hasDeductedCredit.current = true
        
        await generateAllCarousels()
        
        console.log('✅ Regeneration complete and images saved!')
        
        hasDeductedCredit.current = wasDeducted
        isRegeneratingFromEditRef.current = false
      } catch (error) {
        console.error('❌ Error during regenerateAndSave:', error)
        isRegeneratingFromEditRef.current = false
        throw error
      }
    }
  }), [orderedCarousels.length, orderedUnderlineWords])
  
  // Initialize hasDeductedCredit from localStorage - check by ideaTitle, not content hash
  // Credits should be deducted once per ideaTitle, not once per content version
  const getInitialCreditDeductionStatus = (): boolean => {
    try {
      const storedGenerationId = localStorage.getItem('postGeneration_generationId')
      const storedIdeaTitle = localStorage.getItem('postGeneration_ideaTitle')
      // If generationId exists and ideaTitle matches, credits were already deducted for this idea
      // (regardless of content edits)
      if (storedGenerationId && storedIdeaTitle === ideaTitle) {
        // Only log in development mode to reduce console spam
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Credits already deducted for this ideaTitle (found generationId)', ideaTitle)
        }
        return true
      }
    } catch (error) {
      console.error('Error checking credit deduction status:', error)
    }
    return false
  }
  const hasDeductedCredit = useRef<boolean>(getInitialCreditDeductionStatus())
  const isInitialMount = useRef(true)
  // Initialize prevDesignSettings immediately with initial prop values
  const prevDesignSettings = useRef<{ templateId: string; colorThemeId: string }>({
    templateId,
    colorThemeId
  })
  const hasInitialized = useRef(false)
  // Track previous carousel content for detecting edits
  const prevCarouselsContent = useRef<string>(JSON.stringify(carousels))
  // Track previous ideaTitle to only reset credits when it actually changes
  const prevIdeaTitleRef = useRef<string>(ideaTitle)
  // Track if a save is in progress to prevent duplicate saves
  const isSavingRef = useRef<boolean>(false)
  
  // Use refs for values that should not trigger re-renders when changed
  const accountDescriptionRef = useRef(accountDescription)
  const accountNameRef = useRef(accountName)
  const websiteRef = useRef(website)
  const captionRef = useRef(caption)
  
  // Update refs when props change
  useEffect(() => {
    accountDescriptionRef.current = accountDescription
    accountNameRef.current = accountName
    websiteRef.current = website
    captionRef.current = caption
  }, [accountDescription, accountName, website, caption])

  // Get selected template and color theme
  const TEMPLATE = getCarouselTemplate(templateId)
  const COLOR_THEME = getColorTheme(colorThemeId)
  
  // Validate template structure
  if (!TEMPLATE || !TEMPLATE.fonts || !TEMPLATE.fonts.hook || !TEMPLATE.fonts.title || !TEMPLATE.fonts.content) {
    console.error('❌ Invalid template structure detected:', {
      templateId,
      hasTemplate: !!TEMPLATE,
      hasFonts: !!TEMPLATE?.fonts,
      hasHook: !!TEMPLATE?.fonts?.hook,
      hasTitle: !!TEMPLATE?.fonts?.title,
      hasContent: !!TEMPLATE?.fonts?.content
    })
  }


  // Auto-save function
  const saveToDatabase = useCallback(async (imageDataUrls: string[]): Promise<string | undefined> => {
    if (!user?.id) {
      console.warn('Cannot save: user not authenticated')
      return undefined
    }

    // Allow saving text-only generations (when imageDataUrls.length === 0)
    // This is needed for includeImages=false mode

    // Prevent multiple simultaneous saves
    if (isSavingRef.current) {
      console.warn('⚠️ Save already in progress, skipping duplicate save request')
      return undefined
    }

    isSavingRef.current = true

    try {
      // Calculate content hash (only ideaTitle + carousels, excludes theme/font)
      // Used for localStorage caching, but backend handles deduplication by ideaTitle
      const currentContentHash = JSON.stringify({ ideaTitle, carousels })
      
      // Check localStorage for existing generation_id
      // Backend will automatically find and update existing generation by ideaTitle if it exists
      const storedGenerationId = localStorage.getItem('postGeneration_generationId')
      const storedIdeaTitle = localStorage.getItem('postGeneration_ideaTitle')
      
      // Send generationId if we have it and it's for the same ideaTitle
      // Backend will verify and use ideaTitle matching as the primary deduplication method
      let generationIdToSend: string | undefined = undefined
      if (storedGenerationId && storedIdeaTitle === ideaTitle) {
        generationIdToSend = storedGenerationId
      }
      
      console.log('💾 [SAVE] Saving generation to database...')
      console.log('   📝 Idea:', ideaTitle)
      console.log('   🖼️  Images:', imageDataUrls.length)

      // Step 1: Create/get generation first (small payload, metadata only)
      // This avoids Vercel's 4.5MB/6MB body size limits
      console.log('📤 [STEP 1] Creating/getting generation (metadata only)...')
      
      const createResponse = await fetch('/api/generations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          generationId: generationIdToSend,
          ideaTitle,
          accountDescription: accountDescriptionRef.current,
          accountName: accountNameRef.current,
          website: websiteRef.current,
          slides: orderedCarousels,
          caption: captionRef.current,
          underlineWords: orderedUnderlineWords,
          templateId,
          colorThemeId,
          // No images or imageUrls - will upload separately if images exist
        })
      })

      if (!createResponse.ok) {
        let errorMessage = `Failed to create generation (${createResponse.status})`
        try {
          const errorData = await createResponse.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          errorMessage = createResponse.statusText || errorMessage
        }
        console.error('❌ Failed to create generation:', errorMessage)
        throw new Error(errorMessage)
      }

      const createResult = await createResponse.json()
      const generationId = createResult.generationId
      
      console.log('✅ Generation created/retrieved:', generationId)
      
      // Step 2: Upload images if we have any valid image data URLs
      let imageUrls: string[] = []
      let thumbnailUrls: string[] = []
      
      // Filter to only valid data URLs and ensure we have all expected images
      const validImageUrls = imageDataUrls.filter((url, idx) => {
        const isValid = url && url.startsWith('data:image/') && url.length > 100
        if (!isValid) {
          console.error(`⚠️ Image ${idx + 1} is invalid and will be skipped:`, {
            hasData: !!url,
            isDataUrl: url?.startsWith('data:image/'),
            length: url?.length || 0
          })
        }
        return isValid
      })
      
      // Ensure we have all expected images - if not, log warning but continue
      if (validImageUrls.length !== imageDataUrls.length) {
        console.warn(`⚠️ Expected ${imageDataUrls.length} images but only ${validImageUrls.length} are valid. Missing indices: ${imageDataUrls.map((url, idx) => (!url || !url.startsWith('data:image/') || url.length <= 100) ? idx + 1 : -1).filter(i => i !== -1).join(', ')}`)
      }
      
      if (validImageUrls.length > 0) {
        console.log('📤 [STEP 2] Uploading images to Supabase Storage...')
        
        try {
          const { checkImagesExist, deleteOldImages, uploadImagesToStorage } = await import('../lib/uploadImages')
          
          // If updating an existing generation, delete old images first
          if (createResult.isUpdate) {
            console.log('🗑️  Deleting old images for update...')
            try {
              await deleteOldImages(user.id, generationId)
            } catch (deleteError) {
              // Non-fatal - upsert will overwrite anyway
              console.warn('⚠️ Failed to delete old images (non-fatal):', deleteError)
            }
            // After deleting, we always need to upload new images
            console.log('📤 Uploading new images after deleting old ones...')
            const uploadResult = await uploadImagesToStorage(user.id, generationId, validImageUrls)
            imageUrls = uploadResult.imageUrls
            thumbnailUrls = uploadResult.thumbnailUrls
            console.log('✅ Images uploaded successfully:', imageUrls.length)
          } else {
            // Check if images already exist (deduplication - prevents unnecessary uploads)
            console.log('🔍 Checking if images already exist in storage...')
            const existingImages = await checkImagesExist(user.id, generationId, validImageUrls.length)
            
            if (existingImages.exists && existingImages.imageUrls) {
              console.log('✅ Using existing images (skipping upload to save bandwidth)')
              imageUrls = existingImages.imageUrls
              thumbnailUrls = existingImages.thumbnailUrls || existingImages.imageUrls.slice(0, 2)
            } else {
              // Upload images directly to Supabase Storage (bypasses Vercel, eliminates Fast Origin Transfer)
              console.log('📤 Uploading images directly to Supabase Storage (client-side)...')
              const uploadResult = await uploadImagesToStorage(user.id, generationId, validImageUrls)
              imageUrls = uploadResult.imageUrls
              thumbnailUrls = uploadResult.thumbnailUrls
              console.log('✅ Images uploaded successfully:', imageUrls.length)
            }
          }
        } catch (uploadError: any) {
          console.error('❌ Failed to upload images:', uploadError)
          // If client-side upload fails, fall back to per-image server-side upload
          // This avoids sending a huge array of base64 images to /api/generations/save (which caused 413 errors)
          console.warn('⚠️ Falling back to server-side upload (per-image)...')
          try {
            const uploadPromises = validImageUrls.map(async (imageData, imageIndex) => {
              const response = await fetch('/api/generations/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: user.id,
                  generationId,
                  imageIndex,
                  imageData,
                }),
              })

              if (!response.ok) {
                let errorMessage = `Failed to upload image ${imageIndex} via server (${response.status})`
                try {
                  const errorData = await response.json()
                  errorMessage = errorData.error || errorMessage
                } catch {
                  errorMessage = response.statusText || errorMessage
                }
                console.error('❌ Server-side image upload error:', errorMessage)
                throw new Error(errorMessage)
              }

              const result = await response.json()
              return result.imageUrl as string
            })

            imageUrls = await Promise.all(uploadPromises)
            thumbnailUrls = imageUrls.slice(0, 2)
            console.log('✅ Fallback server-side per-image upload completed')
          } catch (fallbackError) {
            console.error('❌ Fallback server-side upload failed:', fallbackError)
            throw new Error('Failed to upload images (both client and server methods failed)')
          }
        }

        // Step 3: Update generation with image URLs (small payload, just URLs)
        console.log('📤 [STEP 3] Updating generation with image URLs...')
        
        const updateResponse = await fetch('/api/generations/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            generationId: generationId,
            ideaTitle,
            accountDescription: accountDescriptionRef.current,
            accountName: accountNameRef.current,
            website: websiteRef.current,
            slides: orderedCarousels,
            caption: captionRef.current,
            underlineWords: orderedUnderlineWords,
            templateId,
            colorThemeId,
            imageUrls: imageUrls,
            thumbnailUrls: thumbnailUrls,
          })
        })

        if (!updateResponse.ok) {
          let errorMessage = `Failed to update generation with images (${updateResponse.status})`
          try {
            const errorData = await updateResponse.json()
            errorMessage = errorData.error || errorMessage
          } catch (e) {
            errorMessage = updateResponse.statusText || errorMessage
          }
          console.error('❌ Failed to update generation:', errorMessage)
          throw new Error(errorMessage)
        }

        await updateResponse.json()
        console.log('✅ Generation updated with image URLs')
      } else {
        console.log('📝 No images to upload (text-only generation)')
      }
      
      // Store generation_id, content hash, and ideaTitle in localStorage
      localStorage.setItem('postGeneration_generationId', generationId)
      localStorage.setItem('postGeneration_contentHash', currentContentHash)
      localStorage.setItem('postGeneration_ideaTitle', ideaTitle)
      if (user?.id) {
        localStorage.setItem('postGeneration_userId', user.id)
      }
      
      if (createResult.isUpdate) {
        console.log('✅ Generation updated in history (same ideaTitle):', generationId)
      } else {
        console.log('✅ Generation auto-saved to history (new ideaTitle):', generationId)
      }
      
      return generationId
    } catch (error: any) {
      console.error('❌ Error auto-saving generation:', error.message || error)
      return undefined
    } finally {
      // Always reset the saving flag, even if there was an error
      isSavingRef.current = false
    }
  }, [ideaTitle, carousels, underlineWords, templateId, colorThemeId, user?.id])

  // Helper: Determine if generation should happen
  const shouldGenerate = useCallback((skipCacheCheck = false): boolean => {
    if (skipCacheCheck) {
      return true // Force generation (e.g., theme change)
    }
    
    // Check cache first
    const cacheCheck = isCacheValid(orderedCarousels, ideaTitle, orderedUnderlineWords, templateId, colorThemeId)
    if (cacheCheck.valid && cacheCheck.images) {
      console.log('✅ Cache valid, skipping generation')
      return false
    }
    
    // Check if we have carousels but no images
    if (orderedCarousels.length > 0 && carouselImages.length === 0) {
      return true
    }
    
    return false
  }, [orderedCarousels, ideaTitle, orderedUnderlineWords, templateId, colorThemeId, carouselImages.length])

  const generateAllCarousels = useCallback(async (overrideTemplateId?: string, overrideColorId?: string, skipFontLoading = false, forceRegenerate = false) => {
    const renderStartTime = performance.now()
    console.log('🎨 [RENDERING START] CarouselImageGenerator.generateAllCarousels() called')
    console.log('   ⏱️ Timestamp:', new Date().toISOString())
    console.log('   📊 Carousels to render:', orderedCarousels.length)
    console.log('   🎨 Template:', overrideTemplateId ?? templateId)
    console.log('   🎨 Color Theme:', overrideColorId ?? colorThemeId)
    console.log('   👤 User ID:', user?.id)
    console.log('   📝 Idea Title:', ideaTitle)
    if (skipFontLoading) {
      console.log('   ⏭️ Skipping font loading (optimization for color-only change)')
    }
    
    // Early exit: Check cache if not forcing regeneration
    if (!forceRegenerate) {
      const cacheCheck = isCacheValid(orderedCarousels, ideaTitle, orderedUnderlineWords, overrideTemplateId ?? templateId, overrideColorId ?? colorThemeId)
      if (cacheCheck.valid && cacheCheck.images) {
        console.log('✅ Cache valid, loading from cache instead of regenerating')
        setCarouselImages(cacheCheck.images)
        setOrderedCarouselImages(cacheCheck.images)
        setGenerating(false)
        return // Exit early, don't regenerate
      }
    }
    
    setGenerating(true)
    
    // Use override values if provided (for design changes), otherwise use current props
    const currentTemplateId = overrideTemplateId ?? templateId
    const currentColorId = overrideColorId ?? colorThemeId
    
    // Compute configs with current values
    const templateStartTime = performance.now()
    const currentTemplate = getCarouselTemplate(currentTemplateId)
    const currentColorTheme = getColorTheme(currentColorId)
    console.log('   ⏱️ Template/Theme loading took:', (performance.now() - templateStartTime).toFixed(2), 'ms')
    
    // Ensure canvasRefs array has correct length
    // Preserve existing refs when resizing to avoid losing canvas references
    if (canvasRefs.current.length !== orderedCarousels.length) {
      const oldRefs = canvasRefs.current
      canvasRefs.current = new Array(orderedCarousels.length).fill(null)
      // Copy existing refs to preserve them
      for (let i = 0; i < Math.min(oldRefs.length, orderedCarousels.length); i++) {
        if (oldRefs[i]) {
          canvasRefs.current[i] = oldRefs[i]
        }
      }
    }
    
    // Initialize array with correct length to maintain order
    const imageDataUrls: string[] = new Array(orderedCarousels.length).fill('')
    
    // Wait for all canvas refs to be set before starting generation
    // This ensures the first canvas (index 0) is ready
    const waitForCanvasRefs = async (maxWaitMs = 2000): Promise<void> => {
      const startTime = Date.now()
      while (Date.now() - startTime < maxWaitMs) {
        const allRefsSet = canvasRefs.current.every((ref, idx) => {
          if (idx < orderedCarousels.length) {
            return ref !== null && ref !== undefined
          }
          return true
        })
        if (allRefsSet) {
          console.log('✅ All canvas refs are ready')
          return
        }
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      console.warn('⚠️ Some canvas refs may not be ready, but proceeding anyway')
    }
    
    await waitForCanvasRefs()
    
    // When includeImages is true, verify that all expected images are present in underlineWords
    // before starting generation - this ensures we wait for images to be generated by the API
    if (includeImages) {
      const template = getCarouselTemplate(currentTemplateId)
      const templateDisablesImages = template.imageLayout?.maxHeightRatio === 0
      
      const expectedImageCount = orderedCarousels.filter(c => {
        // If template explicitly disables images (maxHeightRatio: 0), don't expect any
        if (templateDisablesImages) {
          return false
        }
        
        const defaultImagePlacement = { hook: false, content: true, cta: false }
        const imagePlacement = template?.imagePlacement || defaultImagePlacement
        const slideType = c.kind === 'HOOK' ? 'hook' : c.kind === 'MIDDLE' ? 'content' : 'cta'
        const templateAllowsImage = slideType === 'hook' ? imagePlacement.hook : 
                                   slideType === 'content' ? imagePlacement.content : false
        return templateAllowsImage
      }).length
      
      const actualImageCount = Object.values(underlineWordsForGenerationRef.current || orderedUnderlineWords).filter(
        (data: any) => data?.imageUrl || data?.originalImageUrl
      ).length
      
      console.log(`🖼️ [IMAGE CHECK] Expected ${expectedImageCount} images, found ${actualImageCount} in underlineWords`)
      
      // If we expect images but don't have them yet, wait a bit and check again
      if (expectedImageCount > 0 && actualImageCount === 0) {
        console.log('⏳ Waiting for images to be generated...')
        // Wait up to 30 seconds for images to appear
        for (let waitAttempt = 0; waitAttempt < 30; waitAttempt++) {
          await new Promise(resolve => setTimeout(resolve, 1000))
          const currentImageCount = Object.values(underlineWordsForGenerationRef.current || orderedUnderlineWords).filter(
            (data: any) => data?.imageUrl || data?.originalImageUrl
          ).length
          if (currentImageCount > 0) {
            console.log(`✅ Images detected after ${waitAttempt + 1} seconds`)
            break
          }
          if (waitAttempt === 29) {
            console.warn('⚠️ Images not found after 30 seconds - proceeding anyway')
          }
        }
      }
    }
    
    // Generate all carousels first without updating state (prevents layout shifts)
    // Use yield mechanism that works in background tabs
    const carouselGenerationStart = performance.now()
    for (let i = 0; i < orderedCarousels.length; i++) {
      const carouselStartTime = performance.now()
      console.log(`   🖼️ [CAROUSEL ${i + 1}/${orderedCarousels.length}] Starting generation...`)
      console.log(`      Type: ${orderedCarousels[i].kind}, Title: ${orderedCarousels[i].title?.substring(0, 30)}...`)
      
      // Save progress to localStorage (so rendering can resume if interrupted)
      try {
        localStorage.setItem('postGeneration_renderingProgress', JSON.stringify({
          currentIndex: i,
          totalCarousels: orderedCarousels.length,
          ideaTitle,
          timestamp: Date.now()
        }))
      } catch (error) {
        // Ignore localStorage errors (quota exceeded, etc.)
      }
      
      // Generate carousel - this will continue even in background tabs
      await generateCarouselImage(i, currentTemplate, currentColorTheme, skipFontLoading)
      
      // Wait for canvas to finish rendering all images before converting to blob
      // This ensures images are fully drawn on the canvas before we extract it
      await new Promise(resolve => requestAnimationFrame(resolve))
      await new Promise(resolve => requestAnimationFrame(resolve)) // Wait for 2 frames to ensure rendering is complete
      
      const carouselEndTime = performance.now()
      const carouselDuration = carouselEndTime - carouselStartTime
      console.log(`   ✅ [CAROUSEL ${i + 1}/${orderedCarousels.length}] Generated in ${carouselDuration.toFixed(2)}ms`)
      
      // Save canvas to data URL at the specific index to maintain order
      // Retry logic to ensure canvas is available
      let canvas = canvasRefs.current[i]
      let retries = 0
      const maxRetries = 5
      
      while (!canvas && retries < maxRetries) {
        console.warn(`   ⚠️ Canvas not found for carousel ${i + 1}, retrying... (${retries + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 100))
        canvas = canvasRefs.current[i]
        retries++
      }
      
      if (canvas) {
        try {
          const dataUrlStartTime = performance.now()
          // Generate WebP directly from canvas for better compression and reduced egress
          const dataUrl = await new Promise<string>((resolve, reject) => {
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const reader = new FileReader()
                  reader.onloadend = () => {
                    const webpDataUrl = reader.result as string
                    resolve(webpDataUrl)
                  }
                  reader.onerror = () => reject(new Error('Failed to read WebP blob'))
                  reader.readAsDataURL(blob)
                } else {
                  // Fallback to PNG if WebP not supported
                  const pngDataUrl = canvas.toDataURL('image/png')
                  resolve(pngDataUrl)
                }
              },
              'image/webp',
              0.85 // Quality: 0.85 provides good balance between size and quality
            )
          })
          const dataUrlDuration = performance.now() - dataUrlStartTime
          
          // Validate data URL is not empty and is a valid image (WebP or PNG fallback)
          if (dataUrl && (dataUrl.startsWith('data:image/webp') || dataUrl.startsWith('data:image/png')) && dataUrl.length > 100) {
            imageDataUrls[i] = dataUrl
            console.log(`      📸 Canvas to WebP took: ${dataUrlDuration.toFixed(2)}ms`)
          } else {
            console.error(`   ❌ Invalid data URL for carousel ${i + 1} (length: ${dataUrl?.length || 0})`)
            throw new Error(`Invalid data URL generated for carousel ${i + 1}`)
          }
        } catch (error: any) {
          console.error(`   ❌ Failed to convert canvas ${i + 1} to data URL:`, error.message)
          throw new Error(`Failed to generate image for carousel ${i + 1}: ${error.message}`)
        }
      } else {
        const errorMsg = `Canvas not found for carousel ${i + 1} after ${maxRetries} retries. Canvas refs: ${canvasRefs.current.map((c, idx) => `${idx}:${c ? '✓' : '✗'}`).join(', ')}`
        console.error(`   ❌ ${errorMsg}`)
        throw new Error(errorMsg)
      }
      
      // Yield control between carousels to prevent blocking, but continue rendering
      // This ensures rendering continues even in background tabs
      if (i < orderedCarousels.length - 1) {
        await yieldToEventLoop()
      }
    }
    
    // Clear rendering progress after completion
    try {
      localStorage.removeItem('postGeneration_renderingProgress')
    } catch (error) {
      // Ignore localStorage errors
    }
    
    const carouselGenerationEnd = performance.now()
    console.log(`   ⏱️ Total carousel generation time: ${(carouselGenerationEnd - carouselGenerationStart).toFixed(2)}ms`)
    
    // Verify all images were generated and are valid
    const allImagesValid = imageDataUrls.every((img, idx) => {
      const isValid = img && img.startsWith('data:image/') && img.length > 100
      if (!isValid) {
        console.error(`   ❌ Image ${idx + 1} is invalid:`, {
          hasData: !!img,
          isDataUrl: img?.startsWith('data:image/'),
          length: img?.length || 0
        })
      }
      return isValid
    })
    
    if (!allImagesValid) {
      const missingIndices = imageDataUrls
        .map((img, idx) => (!img || !img.startsWith('data:image/') || img.length <= 100) ? idx : -1)
        .filter(idx => idx !== -1)
      console.error('❌ [RENDERING ERROR] Some images failed to generate:', {
        missingIndices: missingIndices.map(i => i + 1),
        totalExpected: orderedCarousels.length,
        totalGenerated: imageDataUrls.filter(img => img && img.startsWith('data:image/')).length
      })
      throw new Error(`Failed to generate all carousel images. Missing indices: ${missingIndices.map(i => i + 1).join(', ')}`)
    } else {
      console.log('✅ [RENDERING] All', imageDataUrls.length, 'carousels generated successfully')
      console.log('   ⏱️ Total rendering time so far:', (performance.now() - renderStartTime).toFixed(2), 'ms')
    }
    
    // Batch update all images at once to prevent layout shifts
    // Preserve old images in ref before updating
    const setStateStartTime = performance.now()
    setCarouselImages(prev => {
      previousImagesRef.current = prev.length > 0 ? [...prev] : []
      return imageDataUrls
    })
    // Also update orderedCarouselImages to keep them in sync
    setOrderedCarouselImages(imageDataUrls)
    console.log('   ⏱️ setCarouselImages() call took:', (performance.now() - setStateStartTime).toFixed(2), 'ms')
    
    // Save to localStorage immediately (non-blocking, uses batch helper)
    const fullContentHash = createContentHash(ideaTitle, orderedCarousels, orderedUnderlineWords, currentTemplateId, currentColorId)
    const contentHash = JSON.stringify({ ideaTitle, carousels: orderedCarousels })
    
    try {
      const imagesSizeMB = (new Blob([JSON.stringify(imageDataUrls)]).size / (1024 * 1024)).toFixed(2)
      console.log(`💾 Attempting to save ${imagesSizeMB}MB of image data to localStorage...`)
      
      // Use batch helper for all localStorage writes
      saveToLocalStorage({
        canvasImages: imageDataUrls,
        fullContentHash: fullContentHash,
        contentHash: !localStorage.getItem('postGeneration_generationId') ? contentHash : undefined,
        ideaTitle: ideaTitle,
        templateId: currentTemplateId,
        colorThemeId: currentColorId,
        userId: user?.id
      })
      
      console.log(`✅ Successfully saved ${imagesSizeMB}MB to localStorage`)
    } catch (error: any) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn('⚠️ localStorage quota exceeded - images too large to cache locally')
        console.warn('   Images will still be displayed, but won\'t be cached for next visit')
        console.warn('   Consider clearing old localStorage data or using fewer carousels')
        
        // Try to save just the hash (for validation) without the images
        try {
          saveToLocalStorage({
            fullContentHash: fullContentHash,
            contentHash: !localStorage.getItem('postGeneration_generationId') ? contentHash : undefined,
            userId: user?.id
          })
          console.log('✅ Saved content hashes (without images) to localStorage')
        } catch (hashError) {
          console.error('❌ Could not save even content hashes:', hashError)
        }
      } else {
        console.error('❌ Error saving images to localStorage:', error)
      }
    }
    
    // Deduct credit when carousels are generated (only once per note generation)
    // Calculate credit amount based on content style:
    // Text only: 1 credit
    // Text + Image (Pexels or AI): 2 credits
    if (user?.id && !hasDeductedCredit.current) {
      const creditAmount = includeImages ? 2 : 1
      try {
        const deductResponse = await fetch('/api/credits/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, amount: creditAmount }),
        })

        if (deductResponse.ok) {
          // Refresh credits in context to update UI immediately
          await refreshCredits()
          hasDeductedCredit.current = true
          // Store ideaTitle in localStorage to track that credits were deducted for this idea
          try {
            localStorage.setItem('postGeneration_ideaTitle', ideaTitle)
          } catch (error) {
            console.error('Error storing ideaTitle:', error)
          }
        } else {
          // If deduction fails, log the error but don't block generation
          const errorData = await deductResponse.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Failed to deduct credit:', errorData.error || 'Unknown error')
          // Still mark as deducted to prevent retry loops, but generation continues
          hasDeductedCredit.current = true
        }
      } catch (creditError) {
        console.error('Error deducting credit:', creditError)
        // Still mark as deducted to prevent retry loops
        hasDeductedCredit.current = true
      }
    }
    
    setGenerating(false)
    const beforeSaveTime = performance.now()
    console.log('   ⏱️ Rendering complete, total time:', (beforeSaveTime - renderStartTime).toFixed(2), 'ms')
    
    // Save to database (non-blocking - start immediately, but await before onGenerationComplete)
    let savedGenerationId: string | undefined
    if (user?.id) {
      const saveStartTime = performance.now()
      console.log('💾 [SAVE] Saving generation to Supabase (non-blocking)...')
      // Start save in background, but we'll await it before calling onGenerationComplete
      const savePromise = saveToDatabase(imageDataUrls).then((id) => {
        const saveEndTime = performance.now()
        console.log('✅ [SAVE] Generation saved successfully')
        console.log('   ⏱️ Save duration:', (saveEndTime - saveStartTime).toFixed(2), 'ms')
        console.log('   📝 Saved generationId:', id)
        return id
      }).catch((err) => {
        console.error('❌ [SAVE ERROR] Failed to save:', err)
        return undefined
      })
      
      // Await save before continuing (needed for generationId in onGenerationComplete)
      savedGenerationId = await savePromise
    }
    
    const finalTime = performance.now()
    console.log('🎨 [RENDERING COMPLETE] Total time:', (finalTime - renderStartTime).toFixed(2), 'ms')
    
    // When includeImages is true, verify that all expected images were actually rendered
    if (includeImages) {
      const template = getCarouselTemplate(currentTemplateId)
      const templateDisablesImages = template.imageLayout?.maxHeightRatio === 0
      
      const expectedImageCount = orderedCarousels.filter(c => {
        // If template explicitly disables images (maxHeightRatio: 0), don't expect any
        if (templateDisablesImages) {
          return false
        }
        
        const defaultImagePlacement = { hook: false, content: true, cta: false }
        const imagePlacement = template?.imagePlacement || defaultImagePlacement
        const slideType = c.kind === 'HOOK' ? 'hook' : c.kind === 'MIDDLE' ? 'content' : 'cta'
        const templateAllowsImage = slideType === 'hook' ? imagePlacement.hook : 
                                   slideType === 'content' ? imagePlacement.content : false
        return templateAllowsImage
      }).length
      
      const actualImageCount = Object.values(underlineWordsForGenerationRef.current || orderedUnderlineWords).filter(
        (data: any) => data?.imageUrl || data?.originalImageUrl
      ).length
      
      console.log(`🖼️ [FINAL IMAGE CHECK] Expected ${expectedImageCount} images, found ${actualImageCount} in underlineWords`)
      
      if (expectedImageCount > 0 && actualImageCount === 0) {
        console.warn('⚠️ Expected images but none found in underlineWords - images may not have been generated')
      } else if (expectedImageCount > actualImageCount) {
        console.warn(`⚠️ Expected ${expectedImageCount} images but only found ${actualImageCount} - some images may be missing`)
      } else {
        console.log(`✅ All expected images are present (${actualImageCount}/${expectedImageCount})`)
      }
    }
    
    // Always notify parent when complete
    if (onGenerationComplete) {
      if (savedGenerationId) {
        console.log('📞 Calling onGenerationComplete with generationId:', savedGenerationId)
        onGenerationComplete(savedGenerationId)
      } else {
        console.warn('⚠️ No generationId - save may have failed')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carousels, ideaTitle, underlineWords, templateId, colorThemeId, user?.id])

  // Unified generation effect: handles initial generation and design changes
  useEffect(() => {
    console.log('🔄 [UNIFIED EFFECT] Running...', {
      fromHistory: localStorage.getItem('postGeneration_fromHistory') === 'true',
      hasGenerationId: !!localStorage.getItem('postGeneration_generationId'),
      templateId,
      colorThemeId,
      carouselImagesLength: carouselImages.length,
      orderedCarouselsLength: orderedCarousels.length,
      isInitialMount: isInitialMount.current
    })
    
    const fromHistory = localStorage.getItem('postGeneration_fromHistory') === 'true'
    const hasGenerationId = localStorage.getItem('postGeneration_generationId')
    
    // Clear stale fromHistory flag
    if (fromHistory && !hasGenerationId) {
      localStorage.removeItem('postGeneration_fromHistory')
    }
    
    // Check for design changes FIRST (before early return)
    const prev = prevDesignSettings.current
    const templateChanged = prev.templateId !== templateId
    const themeChanged = prev.colorThemeId !== colorThemeId
    const designChanged = templateChanged || themeChanged
    
    console.log('🔍 [DESIGN CHECK]', {
      prevTemplate: prev.templateId,
      currentTemplate: templateId,
      prevTheme: prev.colorThemeId,
      currentTheme: colorThemeId,
      templateChanged,
      themeChanged,
      designChanged
    })
    
    // On post page: handle carefully - check design changes and cache
    if (fromHistory && hasGenerationId) {
      console.log('📄 [POST PAGE] Detected post page load')
      
      // If design changed, MUST regenerate (don't skip)
      if (designChanged) {
        console.log('🎨 [POST PAGE] Design changed - will regenerate')
        // Fall through to regeneration logic below
      } else if (carouselImages.length > 0 && carouselImages.length === orderedCarousels.length) {
        // Images already loaded and no design change - skip
        console.log('✅ [POST PAGE] Images already loaded, skipping regeneration')
        isInitialMount.current = false
        if (!designChanged) {
          prevDesignSettings.current = { templateId, colorThemeId }
        }
        return
      } else {
        // No images loaded - check cache
        console.log('🔍 [POST PAGE] No images loaded, checking cache...')
        const cacheCheck = isCacheValid(orderedCarousels, ideaTitle, orderedUnderlineWords, templateId, colorThemeId)
        if (cacheCheck.valid && cacheCheck.images) {
          console.log('✅ [POST PAGE] Cache valid, loading images from cache')
          setCarouselImages(cacheCheck.images)
          setOrderedCarouselImages(cacheCheck.images)
          isInitialMount.current = false
          prevDesignSettings.current = { templateId, colorThemeId }
          return
        } else {
          console.log('🔄 [POST PAGE] Cache invalid or missing, will regenerate')
          // Cache invalid - fall through to regeneration
        }
      }
    }
    
    // Update prevDesignSettings on initial mount if no change
    if (!designChanged && isInitialMount.current) {
      prevDesignSettings.current = { templateId, colorThemeId }
    }
    
    // Determine if we should generate
    const shouldGen = designChanged || (isInitialMount.current && orderedCarousels.length > 0 && carouselImages.length === 0)
    
    console.log('🤔 [SHOULD GENERATE]', {
      designChanged,
      isInitialMount: isInitialMount.current,
      hasCarousels: orderedCarousels.length > 0,
      hasImages: carouselImages.length > 0,
      shouldGen
    })
    
    if (!shouldGen) {
      if (carouselImages.length > 0) {
        isInitialMount.current = false
      }
      return
    }
    
    // Design changed - regenerate with new theme/template
    if (designChanged) {
      console.log('🎨 [REGENERATION] Design changed - starting regeneration...', {
        templateChanged,
        themeChanged,
        newTemplate: templateId,
        newTheme: colorThemeId
      })
      
      const currentTemplateId = templateId
      const currentColorId = colorThemeId
      const skipFontLoading = !templateChanged && themeChanged
      
      // Clear old images to show loading state
      setCarouselImages([])
      setOrderedCarouselImages([])
      previousImagesRef.current = []
      
      // Preserve credit deduction status
      const wasDeducted = hasDeductedCredit.current
      hasDeductedCredit.current = true
      
      // Update hash using batch helper
      const fullContentHash = createContentHash(ideaTitle, orderedCarousels, orderedUnderlineWords, currentTemplateId, currentColorId)
      saveToLocalStorage({
        fullContentHash: fullContentHash,
        userId: user?.id
      })
      
      console.log('💾 [REGENERATION] Hash updated:', fullContentHash.substring(0, 50) + '...')
      
      // Regenerate with force flag
      const run = async () => {
        try {
          console.log('🚀 [REGENERATION] Starting generateAllCarousels...')
          await new Promise(resolve => setTimeout(resolve, 0))
          await generateAllCarousels(currentTemplateId, currentColorId, skipFontLoading, true)
          console.log('✅ [REGENERATION] Complete')
          prevDesignSettings.current = { templateId: currentTemplateId, colorThemeId: currentColorId }
          if (isInitialMount.current) {
            isInitialMount.current = false
          }
        } catch (error) {
          console.error('❌ [REGENERATION] Failed:', error)
          setGenerating(false)
        } finally {
          hasDeductedCredit.current = wasDeducted
        }
      }
      run()
      return
    }
    
    // Initial generation - check cache first
    if (isInitialMount.current && orderedCarousels.length > 0) {
      console.log('🆕 [INITIAL GENERATION] Starting initial generation...')
      isInitialMount.current = false
      generateAllCarousels().then(() => {
        console.log('✅ [INITIAL GENERATION] Complete')
        prevDesignSettings.current = { templateId, colorThemeId }
      }).catch((err) => {
        console.error('❌ [INITIAL GENERATION] Failed:', err)
      })
    }
  }, [orderedCarousels.length, carouselImages.length, templateId, colorThemeId, generateAllCarousels, ideaTitle, orderedUnderlineWords, user?.id])
  
  // Regenerate when underlineWords gains image URLs (e.g., after initial generation with images)
  // This handles the case where images are generated after the initial carousel generation
  useEffect(() => {
    // Check if underlineWords now has images that weren't there before
    const prevHasImages = Object.values(prevUnderlineWordsRef.current).some(
      (data: any) => data?.imageUrl || data?.originalImageUrl
    )
    const currentHasImages = Object.values(underlineWords).some(
      (data: any) => data?.imageUrl || data?.originalImageUrl
    )
    
    // Count images in MIDDLE carousels specifically
    const prevImageCount = orderedCarousels.reduce((count, carousel, index) => {
      if (carousel.kind === 'MIDDLE') {
        const data = prevUnderlineWordsRef.current[index]
        return count + (data?.imageUrl || data?.originalImageUrl ? 1 : 0)
      }
      return count
    }, 0)
    
    const currentImageCount = orderedCarousels.reduce((count, carousel, index) => {
      if (carousel.kind === 'MIDDLE') {
        const data = underlineWords[index]
        return count + (data?.imageUrl || data?.originalImageUrl ? 1 : 0)
      }
      return count
    }, 0)
    
    // If we now have images but didn't before, and carousels are already generated, regenerate
    // Also check if image count increased (handles case where some images were added)
    const imagesWereAdded = currentImageCount > prevImageCount
    const hadNoImagesNowHasImages = !prevHasImages && currentHasImages
    
    if ((hadNoImagesNowHasImages || imagesWereAdded) && orderedCarouselImages.length > 0) {
      console.log('🖼️ Detected new images in underlineWords - regenerating carousels to show images')
      console.log(`   Previous image count: ${prevImageCount}, Current image count: ${currentImageCount}`)
      console.log(`   Had no images before: ${!prevHasImages}, Has images now: ${currentHasImages}`)
      
      // Update ref to use new underlineWords
      underlineWordsForGenerationRef.current = underlineWords
      
      // Trigger regeneration with force flag
      generateAllCarousels(undefined, undefined, false, true).catch((err) => {
        console.error('❌ Failed to regenerate carousels with new images:', err)
      })
    }
    
    // Update ref for next comparison (only update if underlineWords actually changed)
    if (JSON.stringify(prevUnderlineWordsRef.current) !== JSON.stringify(underlineWords)) {
      prevUnderlineWordsRef.current = { ...underlineWords }
    }
  }, [underlineWords, orderedCarousels, orderedCarouselImages.length, generateAllCarousels])

  // DISABLED: Auto-regeneration on content changes removed to preserve AI images
  // When text is edited, only underline/highlight words should be updated (handled by the API)
  // Images should remain unchanged
  // NOTE: This effect only tracks CONTENT changes, not design changes (templateId/colorThemeId)
  useEffect(() => {
    // Just keep track of carousel content changes for reference
    // But DO NOT regenerate images
    if (isInitialMount.current) {
      prevCarouselsContent.current = JSON.stringify(carousels)
      return
    }

    const currentCarouselsContent = JSON.stringify(carousels)
    const prevContent = prevCarouselsContent.current
    
    // Only update the tracking ref if CONTENT actually changed (not design)
    if (currentCarouselsContent !== prevContent && carousels.length > 0) {
      prevCarouselsContent.current = currentCarouselsContent
      // Don't update hash here - design change effect handles that
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carousels, ideaTitle, underlineWords])
  
  // Reset credit deduction flag ONLY when ideaTitle changes (new note)
  // This should NOT run on every render or when design changes
  useEffect(() => {
    // Only run if ideaTitle actually changed
    if (prevIdeaTitleRef.current === ideaTitle) {
      return
    }
    
    prevIdeaTitleRef.current = ideaTitle
    
    // Don't reset during active generation to avoid interrupting
    if (generating) {
      return
    }
    
    // Check if credits were already deducted for this ideaTitle
    try {
      const storedGenerationId = localStorage.getItem('postGeneration_generationId')
      const storedIdeaTitle = localStorage.getItem('postGeneration_ideaTitle')
      if (storedGenerationId && storedIdeaTitle === ideaTitle) {
        hasDeductedCredit.current = true
      } else {
        hasDeductedCredit.current = false
        if (storedIdeaTitle !== ideaTitle) {
          try {
            localStorage.removeItem('postGeneration_ideaTitle')
          } catch (error) {
            // Ignore errors
          }
        }
      }
    } catch (error) {
      hasDeductedCredit.current = false
    }
    
    // Reset tracking refs only when ideaTitle changes
    isInitialMount.current = true
    hasInitialized.current = false
    prevCarouselsContent.current = JSON.stringify(carousels)
  }, [ideaTitle, generating])

  const loadImage = (src: string, timeout = 45000): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      // Set crossOrigin for all images to allow canvas drawing
      // This is needed for both external images and proxied images
      img.crossOrigin = 'anonymous'
      
      // Set loading priority to high to ensure it loads even in background tabs
      if ('fetchPriority' in img) {
        (img as any).fetchPriority = 'high'
      }
      
      let timeoutId: NodeJS.Timeout | null = null
      let resolved = false
      
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
      }
      
      img.onload = () => {
        if (resolved) return
        resolved = true
        cleanup()
        console.log(`✅ Image loaded successfully: ${src}`)
        resolve(img)
      }
      
      img.onerror = (error) => {
        if (resolved) return
        resolved = true
        cleanup()
        console.error(`❌ Failed to load image: ${src}`, error)
        reject(error)
      }
      
      // Set timeout to prevent indefinite waiting (especially in background tabs)
      timeoutId = setTimeout(() => {
        if (resolved) return
        resolved = true
        cleanup()
        console.error(`❌ Image load timeout: ${src}`)
        reject(new Error(`Image load timeout after ${timeout}ms`))
      }, timeout)
      
      // Start loading - this will continue even in background tabs
      img.src = src
    })
  }

  const loadFonts = async (template: typeof TEMPLATE, timeout = 5000) => {
    try {
      // Validate template structure before loading fonts
      if (!template || !template.fonts) {
        console.error('❌ Invalid template structure: missing fonts', template)
        throw new Error('Template is missing required fonts property')
      }
      
      if (!template.fonts.hook || !template.fonts.title || !template.fonts.content) {
        console.error('❌ Invalid template structure: missing required font roles', {
          hasHook: !!template.fonts.hook,
          hasTitle: !!template.fonts.title,
          hasContent: !!template.fonts.content,
          templateId: template.id
        })
        throw new Error('Template is missing required font roles (hook, title, or content)')
      }
      
      // Check if fonts are already loaded for this template
      const templateCacheKey = template.id
      const cachedFonts = loadedFontsCache.current.get(templateCacheKey) || new Set<string>()
      
      // Helper to create font key for caching
      const getFontKey = (family: string, weight: string, style: string) => 
        `${family}:${weight}:${style}`
      
      // Helper to check if font is already loaded in document.fonts
      const isFontLoaded = (family: string, weight: string, style: string): boolean => {
        const fontKey = getFontKey(family, weight, style)
        if (cachedFonts.has(fontKey)) {
          // Check if font is actually available in document.fonts
          try {
            // Use document.fonts.check() to verify font is loaded
            // Format: "weight style family" (e.g., "400 normal Roboto")
            const normalizedWeight = weight === 'bold' ? '700' : weight === 'normal' ? '400' : weight
            const checkString = `${normalizedWeight} ${style} ${family}`
            if (document.fonts.check(checkString)) {
              return true
            }
          } catch (e) {
            // If check fails, assume not loaded
            cachedFonts.delete(fontKey)
            return false
          }
        }
        return false
      }
      
      // Load Google Fonts from template with timeout to prevent indefinite waiting
      // Use display: 'swap' to ensure fonts load even in background tabs
      const fontFaces: FontFace[] = []
      const fontPromises: Promise<FontFace | null>[] = []
      let skippedFontsCount = 0
      
      // Load hook font from Google Fonts (only if not already loaded)
      const hookFontKey = getFontKey(template.fonts.hook.family, template.fonts.hook.weight, template.fonts.hook.style)
      const hookFontPromise = isFontLoaded(template.fonts.hook.family, template.fonts.hook.weight, template.fonts.hook.style)
        ? (skippedFontsCount++, Promise.resolve(null as FontFace | null))
        : loadGoogleFont(
            template.fonts.hook.family,
            template.fonts.hook.weight,
            template.fonts.hook.style
          ).catch(error => {
            console.warn(`⚠️ Failed to load hook font ${template.fonts.hook.family}:`, error)
            return null
          })
      fontPromises.push(hookFontPromise)
      
      // Load title font from Google Fonts (only if not already loaded)
      const titleFontKey = getFontKey(template.fonts.title.family, template.fonts.title.weight, template.fonts.title.style)
      const titleFontPromise = isFontLoaded(template.fonts.title.family, template.fonts.title.weight, template.fonts.title.style)
        ? (skippedFontsCount++, Promise.resolve(null as FontFace | null))
        : loadGoogleFont(
            template.fonts.title.family,
            template.fonts.title.weight,
            template.fonts.title.style
          ).catch(error => {
            console.warn(`⚠️ Failed to load title font ${template.fonts.title.family}:`, error)
            return null
          })
      fontPromises.push(titleFontPromise)
      
      // Load content font from Google Fonts (only if not already loaded)
      const contentFontKey = getFontKey(template.fonts.content.family, template.fonts.content.weight, template.fonts.content.style)
      const contentFontPromise = isFontLoaded(template.fonts.content.family, template.fonts.content.weight, template.fonts.content.style)
        ? (skippedFontsCount++, Promise.resolve(null as FontFace | null))
        : loadGoogleFont(
            template.fonts.content.family,
            template.fonts.content.weight,
            template.fonts.content.style
          ).catch(error => {
            console.warn(`⚠️ Failed to load content font ${template.fonts.content.family}:`, error)
            return null
          })
      fontPromises.push(contentFontPromise)
      
      // Load additional fonts for template 3 (hookTopic, hookSubtitle, hookCTA)
      if (template.fonts.hookTopic) {
        const hookTopicFontKey = getFontKey(template.fonts.hookTopic.family, template.fonts.hookTopic.weight, template.fonts.hookTopic.style)
        const hookTopicFontPromise = isFontLoaded(template.fonts.hookTopic.family, template.fonts.hookTopic.weight, template.fonts.hookTopic.style)
          ? (skippedFontsCount++, Promise.resolve(null as FontFace | null))
          : loadGoogleFont(
              template.fonts.hookTopic.family,
              template.fonts.hookTopic.weight,
              template.fonts.hookTopic.style
            ).catch(error => {
              console.warn(`⚠️ Failed to load hookTopic font ${template.fonts.hookTopic?.family}:`, error)
              return null
            })
        fontPromises.push(hookTopicFontPromise)
      }
      
      if (template.fonts.hookSubtitle) {
        const hookSubtitleFontKey = getFontKey(template.fonts.hookSubtitle.family, template.fonts.hookSubtitle.weight, template.fonts.hookSubtitle.style)
        const hookSubtitleFontPromise = isFontLoaded(template.fonts.hookSubtitle.family, template.fonts.hookSubtitle.weight, template.fonts.hookSubtitle.style)
          ? (skippedFontsCount++, Promise.resolve(null as FontFace | null))
          : loadGoogleFont(
              template.fonts.hookSubtitle.family,
              template.fonts.hookSubtitle.weight,
              template.fonts.hookSubtitle.style
            ).catch(error => {
              console.warn(`⚠️ Failed to load hookSubtitle font ${template.fonts.hookSubtitle?.family}:`, error)
              return null
            })
        fontPromises.push(hookSubtitleFontPromise)
      }
      
      if (template.fonts.hookCTA) {
        const hookCTAFontKey = getFontKey(template.fonts.hookCTA.family, template.fonts.hookCTA.weight, template.fonts.hookCTA.style)
        const hookCTAFontPromise = isFontLoaded(template.fonts.hookCTA.family, template.fonts.hookCTA.weight, template.fonts.hookCTA.style)
          ? (skippedFontsCount++, Promise.resolve(null as FontFace | null))
          : loadGoogleFont(
              template.fonts.hookCTA.family,
              template.fonts.hookCTA.weight,
              template.fonts.hookCTA.style
            ).catch(error => {
              console.warn(`⚠️ Failed to load hookCTA font ${template.fonts.hookCTA?.family}:`, error)
              return null
            })
        fontPromises.push(hookCTAFontPromise)
      }
      
      // Load all fonts in parallel with timeout
      // In background tabs, browsers may throttle this, but it will still complete (just slower)
      // Use Promise.allSettled to continue even if some fonts fail to load
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), timeout)
      })
      
      const loadResults = await Promise.allSettled([
        ...fontPromises,
        timeoutPromise
      ])
      
      // Filter out timeout and null results, add successfully loaded fonts to document
      let loadedCount = 0
      loadResults.forEach((result, index) => {
        // Skip timeout promise result
        if (index >= fontPromises.length) return
        
        if (result.status === 'fulfilled' && result.value !== null) {
          try {
            const font = result.value
            const fontKey = getFontKey(font.family, font.weight, font.style)
            
            // Only add to document if not already cached
            if (!cachedFonts.has(fontKey)) {
              document.fonts.add(font)
              cachedFonts.add(fontKey)
              fontFaces.push(font)
              loadedCount++
            } else {
              // Font already loaded, just count it
              loadedCount++
            }
          } catch (error) {
            console.warn('⚠️ Failed to add font to document:', result.value?.family, error)
          }
        } else if (result.status === 'rejected') {
          console.warn('⚠️ Font failed to load:', result.reason)
        }
      })
      
      // Update cache for this template
      loadedFontsCache.current.set(templateCacheKey, cachedFonts)
      
      const totalFonts = fontPromises.length
      const newlyLoadedCount = loadedCount - skippedFontsCount
      
      if (loadedCount === totalFonts) {
        if (skippedFontsCount > 0) {
          console.log(`✅ All fonts ready (${skippedFontsCount} from cache, ${newlyLoadedCount} newly loaded)`)
        } else {
          console.log('✅ All fonts loaded successfully')
        }
      } else {
        console.log(`⚠️ ${loadedCount}/${totalFonts} fonts loaded, continuing with available fonts`)
      }
      
      console.log('✓ Template fonts ready')
    } catch (error) {
      console.warn('⚠️  Failed to load template fonts, using fallback:', error)
      // Continue rendering even if fonts fail to load (browser will use fallback fonts)
    }
  }

  const generateCarouselImage = async (
    index: number, 
    template = TEMPLATE, 
    colorTheme = COLOR_THEME,
    skipFontLoading = false
  ) => {
    const carouselImageStartTime = performance.now()
    const canvas = canvasRefs.current[index]
    if (!canvas) {
      const errorMsg = `Canvas not found for carousel ${index + 1}. Canvas refs: ${canvasRefs.current.map((c, i) => `${i}:${c ? '✓' : '✗'}`).join(', ')}`
      console.error(`      ❌ ${errorMsg}`)
      throw new Error(errorMsg)
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.warn(`      ⚠️ Canvas context not available for carousel ${index + 1}`)
      return
    }

    const carousel = orderedCarousels[index]
    console.log(`      📝 Processing carousel ${index + 1}: ${carousel.kind}`)

    const getLetterSpacingFor = (section: 'hook' | 'hookTopic' | 'hookSubtitle' | 'hookCTA' | 'title' | 'content' | 'cta'): number => {
      return template.styles?.letterSpacing?.[section] ?? 0
    }

    const getTextAlignFor = (section: 'hook' | 'hookTopic' | 'hookSubtitle' | 'hookCTA' | 'title' | 'content' | 'cta'): CanvasTextAlign => {
      return template.styles?.textAlign?.[section] ?? 'left'
    }

    // Ensure global alpha reset before drawing
    ctx.globalAlpha = 1

    // Remove asterisks from carousel content
    const cleanCarousel = {
      ...carousel,
      title: carousel.title ? carousel.title.replace(/\*/g, '') : carousel.title,
      content: carousel.content ? carousel.content.replace(/\*/g, '') : carousel.content
    }

    // Load fonts before rendering (only for first carousel, and only if not skipped)
    if (index === 0 && !skipFontLoading) {
      const fontLoadStart = performance.now()
      console.log(`      🔤 Loading fonts for template ${template.id}...`)
      try {
        // Use 5 second timeout for faster generation (loadFonts already has timeout built-in)
        await loadFonts(template, 5000)
        console.log(`      ⏱️ Font loading took: ${(performance.now() - fontLoadStart).toFixed(2)}ms`)
      } catch (error) {
        console.warn(`      ⚠️ Font loading failed or timed out, continuing with fallback fonts:`, error)
        // Continue rendering even if fonts fail - browser will use fallback fonts
      }
    } else if (index === 0 && skipFontLoading) {
      console.log(`      ⏭️ Skipping font loading (fonts already loaded for template ${template.id})`)
    }

    // Canvas dimensions - use template layout or defaults
    const width = template.layout?.canvasWidth || 1080
    const height = template.layout?.canvasHeight || 1350
    canvas.width = width
    canvas.height = height

    // Draw template background or fallback to white
    const backgroundConfig = template.background
    if (backgroundConfig?.type === 'image') {
      // Only load image if src is provided (prompt-based backgrounds need to be generated separately)
      if (backgroundConfig.src) {
        try {
          const bgLoadStart = performance.now()
          console.log(`      🖼️ Loading background image: ${backgroundConfig.src}`)
          const bgImage = await loadImage(backgroundConfig.src)
          console.log(`      ⏱️ Background image load took: ${(performance.now() - bgLoadStart).toFixed(2)}ms`)
          const scale = Math.max(width / bgImage.width, height / bgImage.height)
          const scaledWidth = bgImage.width * scale
          const scaledHeight = bgImage.height * scale
          const offsetX = (width - scaledWidth) / 2
          const offsetY = (height - scaledHeight) / 2
          ctx.drawImage(bgImage, offsetX, offsetY, scaledWidth, scaledHeight)
        } catch (error) {
          console.error(`Unable to load template background ${backgroundConfig.src}:`, error)
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, width, height)
        }
      } else {
        // Image background with prompt but no src - fallback to white (will be generated later)
        console.log(`      ⚠️ Background image prompt provided but no src: ${backgroundConfig.prompt || 'N/A'}`)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
      }
    } else if (backgroundConfig?.type === 'color') {
      ctx.fillStyle = backgroundConfig.value
      ctx.fillRect(0, 0, width, height)
    } else {
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
    }

    // Draw hook-specific background image with transparency (for HOOK slides only)
    if (cleanCarousel.kind === 'HOOK' && template.hookBackground?.type === 'image') {
      try {
        const hookBgLoadStart = performance.now()
        console.log(`      🖼️ Loading hook background image: ${template.hookBackground.src}`)
        const hookBgImage = await loadImage(template.hookBackground.src)
        console.log(`      ⏱️ Hook background image load took: ${(performance.now() - hookBgLoadStart).toFixed(2)}ms`)
        const scale = Math.max(width / hookBgImage.width, height / hookBgImage.height)
        const scaledWidth = hookBgImage.width * scale
        const scaledHeight = hookBgImage.height * scale
        const offsetX = (width - scaledWidth) / 2
        const offsetY = (height - scaledHeight) / 2
        
        // Set opacity for the hook background image
        ctx.globalAlpha = template.hookBackground.opacity
        ctx.drawImage(hookBgImage, offsetX, offsetY, scaledWidth, scaledHeight)
        // Reset alpha back to 1 for other elements
        ctx.globalAlpha = 1
      } catch (error) {
        console.error(`Unable to load hook background ${template.hookBackground.src}:`, error)
      }
    }

    // Safe area (avoiding Instagram UI elements and footer)
    const originalSafeMarginTop = 150
    const originalSafeMarginBottom = 150
    let safeMarginSides = 100
    
    // Account for footer height if enabled
    const footerHeight = template.footer?.enabled && template.footer.height ? template.footer.height : 0
    
    let safeMarginTop = originalSafeMarginTop
    let safeMarginBottom = originalSafeMarginBottom + footerHeight  // Add footer height to bottom margin
    
    // For template 5, use its specific safe area if enabled
    if (template.id === 'template5' && template.safeArea?.enabled) {
      safeMarginTop = template.safeArea.top
      safeMarginBottom = template.safeArea.bottom + footerHeight
      safeMarginSides = template.safeArea.left
      console.log(`   Template 5 safe area: top=${safeMarginTop}, bottom=${safeMarginBottom}, sides=${safeMarginSides}`)
    }
    
    // For template 4, use larger safe area margins to ensure footer stays within bounds
    if (template.id === 'template4') {
      safeMarginTop = 120  // Larger top margin
      // Large bottom margin: 250px buffer + footer height to ensure footer is well within safe area
      safeMarginBottom = 250 + footerHeight
    }
    
    // For template 3 MIDDLE slides, EXCLUDE topic and page number from safe area completely
    if (template.id === 'template3' && cleanCarousel.kind === 'MIDDLE') {
      // Topic takes: originalSafeMarginTop + font size + spacing
      if (template.fonts.hookTopic) {
        safeMarginTop = originalSafeMarginTop + template.fonts.hookTopic.size + 100 // Extra 100px spacing
      }
      // Page number box: height - 150 - 60 = 1140
      // Content must NOT go below Y=1090 (50px above page number)
      // So safe margin from bottom needs to be: 1350 - 1090 = 260
      // But we need MORE space, so increase to 300px total
      safeMarginBottom = originalSafeMarginBottom + 150 + footerHeight // 150 + 150 = 300px total safe margin at bottom + footer
    }
    
    // Use layout.contentMaxWidth if provided, otherwise calculate from safe margins
    const safeWidth = template.layout?.contentMaxWidth || (width - (safeMarginSides * 2))
    const safeHeight = height - safeMarginTop - safeMarginBottom

    const getLineStartX = (align: CanvasTextAlign, lineWidth: number): number => {
      // If contentMaxWidth is set, center the content column
      const contentMaxWidth = template.layout?.contentMaxWidth
      if (contentMaxWidth && lineWidth <= contentMaxWidth) {
        if (align === 'center') {
          return (width / 2) - (lineWidth / 2)
        }
        if (align === 'right') {
          return (width / 2) + (contentMaxWidth / 2) - lineWidth
        }
        // left align within centered column
        return (width / 2) - (contentMaxWidth / 2)
      }
      
      // Fallback to original behavior
      if (align === 'center') {
        return (width / 2) - (lineWidth / 2)
      }
      if (align === 'right') {
        return width - safeMarginSides - lineWidth
      }
      return safeMarginSides
    }

    // Center content area
    const centerY = safeMarginTop + (safeHeight / 2)

    const isTransparentHighlight = colorTheme.highlightColor === 'transparent'
    const highlightFillStyle = isTransparentHighlight ? 'transparent' : ensureColorAlpha(colorTheme.highlightColor, 0.5)
    
    // Helper to get text color for a specific role (roleColors > textColor > colorTheme.textColor)
    const getTextColor = (role: 'hook' | 'title' | 'content' | 'cta'): string => {
      const color = template.roleColors?.[role] || template.textColor || colorTheme.textColor
      if (template.id === 'template5' && role === 'title') {
        console.log(`🎨 Template 5 title color: roleColors.title=${template.roleColors?.title}, textColor=${template.textColor}, final=${color}`)
      }
      return color
    }

    if (cleanCarousel.kind === 'HOOK') {
      // Check if this template uses the new hook layout (template 3)
      if (template.hookLayout?.showTopic || template.hookLayout?.showSubtitle || template.hookLayout?.showCTA) {
        // NEW TEMPLATE 3 LAYOUT: topic (at top), title (centered), subtitle, CTA with colored box and arrow
        const topicText = cleanCarousel.topic || ''
        const titleText = ideaTitle?.trim() || cleanCarousel.title || ''
        const subtitleText = cleanCarousel.subtitle || ''
        const ctaText = cleanCarousel.cta || ''

        const hookLetterSpacing = getLetterSpacingFor('hook')
        
        // Load hook image if available (always load when imageUrl is present, regardless of template setting)
        let hookImageHeight = 0
        let hookImageWidth = 0
        let loadedHookImage: HTMLImageElement | null = null
        let hookImageY = 0
        
        // Check template's imagePlacement configuration for hook slides
        // Default to { hook: false, content: true, cta: false } if not specified
        const defaultImagePlacement = { hook: false, content: true, cta: false };
        const imagePlacement = template.imagePlacement || defaultImagePlacement;
        const shouldShowHookImage = imagePlacement.hook === true;
        
        const emphasisData = underlineWordsForGenerationRef.current[index] || orderedUnderlineWords[index] || { underline: '', highlight: '', imageUrl: null, originalImageUrl: null }
        let rawImageUrl = emphasisData.imageUrl || emphasisData.originalImageUrl || null
          
        let imageSourceUrl: string | null = null
        // Only process image URL if template allows images for hook slides
        if (rawImageUrl && shouldShowHookImage) {
          try {
            const url = new URL(rawImageUrl)
            if (url.hostname === 'image.pollinations.ai') {
              imageSourceUrl = `/api/image/proxy?url=${encodeURIComponent(rawImageUrl)}`
              console.log(`      🔄 Routing hook pollinations.ai image through proxy`)
            } else {
              imageSourceUrl = rawImageUrl
            }
          } catch (e) {
            imageSourceUrl = rawImageUrl
          }
        } else if (rawImageUrl && !shouldShowHookImage) {
          console.log(`      📝 Hook image URL present but imagePlacement.hook=false - skipping image display`)
        }
        
        if (imageSourceUrl) {
          try {
            const imageLoadStart = performance.now()
            console.log(`      🖼️ Loading hook image from: ${imageSourceUrl.substring(0, 50)}...`)
            loadedHookImage = await loadImage(imageSourceUrl)
            const imageLoadDuration = performance.now() - imageLoadStart
            console.log(`      ⏱️ Hook image load took: ${imageLoadDuration.toFixed(2)}ms`)
            
            // Use imageLayout.maxHeightRatio if provided, otherwise use 60% of safe width
            if (template.imageLayout?.maxHeightRatio) {
              const maxHeight = Math.round(height * template.imageLayout.maxHeightRatio)
              hookImageHeight = maxHeight
              hookImageWidth = Math.round(hookImageHeight * 16 / 9)  // Maintain 16:9 aspect ratio
              // Ensure image doesn't exceed safeWidth
              if (hookImageWidth > safeWidth) {
                hookImageWidth = safeWidth
                hookImageHeight = Math.round(hookImageWidth * 9 / 16)
              }
            } else {
              // Fallback: use 60% of safe width
              hookImageWidth = Math.round(safeWidth * 0.6)
              hookImageHeight = Math.round(hookImageWidth * 9 / 16)
            }
            console.log(`      ✅ Hook image loaded! Dimensions: ${loadedHookImage.width}x${loadedHookImage.height}, Display: ${hookImageWidth}x${hookImageHeight}`)
          } catch (error) {
            console.error(`❌ Hook slide: Failed to load image:`, error)
          }
        }
        
        // Calculate initial positions and heights for safety area check
        let topicHeight = 0
        let topicY = 0
        let currentY = originalSafeMarginTop
        
        // 1. Calculate TOPIC height
        if (template.hookLayout.showTopic && topicText && template.fonts.hookTopic) {
          ctx.font = template.fonts.hookTopic.cssFont
          topicHeight = template.fonts.hookTopic.size + 40 // text + gap
          topicY = currentY + template.fonts.hookTopic.size
          currentY = topicY + 40
        }
        
        // Calculate image space
        const imageSpace = (loadedHookImage && hookImageHeight > 0) ? hookImageHeight + 40 : 0
        
        // 2. Calculate HOOK TITLE with dynamic sizing
        let hookFontSize = template.fonts.hook.size
        let hookWrappedLines: string[] = []
        let hookTotalHeight = 0
        
        const wrapHookTitle = (fontSize: number) => {
          ctx.font = template.fonts.hook.cssFont.replace(/(\d+\.?\d*)px/, `${fontSize}px`)
          const words = titleText.split(' ')
          const lines: string[] = []
          let currentLine = ''
          
          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const lineWidth = measureTextWithLetterSpacing(ctx, testLine, hookLetterSpacing)
            
            if (lineWidth > safeWidth && currentLine) {
              lines.push(currentLine)
              currentLine = word
            } else {
              currentLine = testLine
            }
          }
          if (currentLine) lines.push(currentLine)
          
          return {
            lines,
            height: lines.length * template.fonts.hook.lineHeight
          }
        }
        
        if (titleText) {
          let hookLayout = wrapHookTitle(hookFontSize)
          hookWrappedLines = hookLayout.lines
          hookTotalHeight = hookLayout.height
          
          // Calculate CTA and subtitle heights
          let ctaHeight = 0
          let subtitleHeight = 0
          
          if (template.hookLayout.showCTA && ctaText && template.fonts.hookCTA && template.styles?.ctaBox) {
            ctx.font = template.fonts.hookCTA.cssFont
            ctaHeight = template.fonts.hookCTA.size + (template.styles.ctaBox.paddingY || 0) * 2 + 60 // box + gap
          }
          
          if (template.hookLayout.showSubtitle && subtitleText && template.fonts.hookSubtitle) {
            ctx.font = template.fonts.hookSubtitle.cssFont
            const subtitleWords = subtitleText.split(' ')
            const subtitleLines: string[] = []
            let currentLine = ''
            for (const word of subtitleWords) {
              const testLine = currentLine ? `${currentLine} ${word}` : word
              const lineWidth = measureTextWithLetterSpacing(ctx, testLine, getLetterSpacingFor('hookSubtitle'))
              if (lineWidth > safeWidth && currentLine) {
                subtitleLines.push(currentLine)
                currentLine = word
              } else {
                currentLine = testLine
              }
            }
            if (currentLine) subtitleLines.push(currentLine)
            subtitleHeight = subtitleLines.length * template.fonts.hookSubtitle.lineHeight + 150 // bottom margin
          }
          
          // Calculate total height
          const totalContentHeight = topicHeight + imageSpace + hookTotalHeight + ctaHeight + subtitleHeight
          const effectiveSafeHeight = safeHeight
          
          // Dynamic sizing to fit within safe area
          if (totalContentHeight > effectiveSafeHeight) {
            console.log(`⚠️  Template 3 Hook: Content too tall (${totalContentHeight}px > ${effectiveSafeHeight}px), scaling down...`)
            
            // Scale hook title font
            const scaleFactor = Math.max(0.3, Math.min(0.95, effectiveSafeHeight / totalContentHeight))
            hookFontSize = Math.floor(template.fonts.hook.size * scaleFactor)
            
            hookLayout = wrapHookTitle(hookFontSize)
            hookWrappedLines = hookLayout.lines
            hookTotalHeight = hookLayout.height
            
            // Recalculate total
            const newTotalHeight = topicHeight + imageSpace + hookTotalHeight + ctaHeight + subtitleHeight
            
            // If still too tall, reduce image
            if (newTotalHeight > effectiveSafeHeight && loadedHookImage && hookImageHeight > 0) {
              const excessHeight = newTotalHeight - effectiveSafeHeight
              const imageReductionFactor = Math.max(0.3, 1 - (excessHeight / (hookImageHeight + 40)))
              hookImageHeight = Math.floor(hookImageHeight * imageReductionFactor)
              hookImageWidth = Math.floor(hookImageWidth * imageReductionFactor)
            }
          }
        }
        
        // 1. Render TOPIC at the very top middle (all caps)
        if (template.hookLayout.showTopic && topicText && template.fonts.hookTopic) {
          ctx.font = template.fonts.hookTopic.cssFont
          ctx.fillStyle = colorTheme.primaryColor
          ctx.textAlign = 'left'
          const topicLetterSpacing = getLetterSpacingFor('hookTopic')
          const topicValue = topicText.toUpperCase()
          const topicWidth = measureTextWithLetterSpacing(ctx, topicValue, topicLetterSpacing)
          const topicX = (width - topicWidth) / 2
          drawTextWithLetterSpacing(ctx, topicValue, topicX, topicY, topicLetterSpacing)
        }

        // 1.5. Render HOOK IMAGE above title (if enabled)
        if (loadedHookImage && hookImageWidth > 0 && hookImageHeight > 0) {
          hookImageY = currentY
          currentY = hookImageY + hookImageHeight + 40
        }

        // 2. Render HOOK TITLE (below image, centered)
        if (titleText && hookWrappedLines.length > 0) {
          // Start Y position - below image (or centered if no image)
          let hookY: number
          if (loadedHookImage && hookImageHeight > 0) {
            hookY = currentY + hookFontSize
          } else {
            hookY = safeMarginTop + (safeHeight / 2) - (hookTotalHeight / 2) + hookFontSize
          }
          
          ctx.font = template.fonts.hook.cssFont.replace(/(\d+\.?\d*)px/, `${hookFontSize}px`)
          ctx.fillStyle = getTextColor('hook')
          ctx.textAlign = 'left'

          hookWrappedLines.forEach(line => {
            const lineWidth = measureTextWithLetterSpacing(ctx, line, hookLetterSpacing)
            const lineX = (width - lineWidth) / 2
            drawTextWithLetterSpacing(ctx, line, lineX, hookY, hookLetterSpacing)
            hookY += template.fonts.hook.lineHeight
          })
        }
        
        // 1.5.5. Actually draw the hook image (after calculating title position)
        if (loadedHookImage && hookImageWidth > 0 && hookImageHeight > 0) {
          try {
            const imageX = (width - hookImageWidth) / 2 // Center horizontally
            const sourceAspect = loadedHookImage.width / loadedHookImage.height
            const targetAspect = 16 / 9
            
            let sx = 0, sy = 0, sWidth = loadedHookImage.width, sHeight = loadedHookImage.height
            
            if (sourceAspect > targetAspect) {
              sWidth = loadedHookImage.height * targetAspect
              sx = (loadedHookImage.width - sWidth) / 2
            } else {
              sHeight = loadedHookImage.width / targetAspect
              sy = (loadedHookImage.height - sHeight) / 2
            }
            
            ctx.drawImage(
              loadedHookImage,
              sx, sy, sWidth, sHeight,
              imageX, hookImageY, hookImageWidth, hookImageHeight
            )
            console.log(`✅ Hook image successfully drawn at (${imageX}, ${hookImageY}), Size: ${hookImageWidth}x${hookImageHeight}`)
          } catch (error) {
            console.error(`❌ Failed to render hook image:`, error)
          }
        }

        // 3. Calculate CTA box dimensions
        let ctaBoxHeight = 0
        let ctaBoxWidth = 0
        if (template.hookLayout.showCTA && ctaText && template.fonts.hookCTA && template.styles?.ctaBox) {
          ctx.font = template.fonts.hookCTA.cssFont
          const ctaLetterSpacing = getLetterSpacingFor('hookCTA')
          const ctaTextWidth = measureTextWithLetterSpacing(ctx, ctaText, ctaLetterSpacing)
          const boxConfig = template.styles.ctaBox
          ctaBoxWidth = ctaTextWidth + boxConfig.paddingX * 2
          ctaBoxHeight = template.fonts.hookCTA.size + boxConfig.paddingY * 2
        }

        // 4. Render CTA box & arrow below the centered hook title
        if (template.hookLayout.showCTA && ctaText && template.fonts.hookCTA && template.styles?.ctaBox) {
          const boxConfig = template.styles.ctaBox
          ctx.font = template.fonts.hookCTA.cssFont
          ctx.fillStyle = boxConfig.useThemeColor ? colorTheme.primaryColor : getTextColor('cta')
          ctx.textAlign = 'left'
          const ctaLetterSpacing = getLetterSpacingFor('hookCTA')

          // Position CTA box below the centered hook
          const hookTotalHeight = hookWrappedLines.length * template.fonts.hook.lineHeight
          const hookBottomY = safeMarginTop + (safeHeight / 2) + (hookTotalHeight / 2)
          const boxX = (width - ctaBoxWidth) / 2
          const boxY = hookBottomY + 60 // 60px gap below hook

          ctx.beginPath()
          const radius = Math.min(boxConfig.borderRadius, ctaBoxHeight / 2, ctaBoxWidth / 2)
          ctx.moveTo(boxX + radius, boxY)
          ctx.lineTo(boxX + ctaBoxWidth - radius, boxY)
          ctx.quadraticCurveTo(boxX + ctaBoxWidth, boxY, boxX + ctaBoxWidth, boxY + radius)
          ctx.lineTo(boxX + ctaBoxWidth, boxY + ctaBoxHeight - radius)
          ctx.quadraticCurveTo(boxX + ctaBoxWidth, boxY + ctaBoxHeight, boxX + ctaBoxWidth - radius, boxY + ctaBoxHeight)
          ctx.lineTo(boxX + radius, boxY + ctaBoxHeight)
          ctx.quadraticCurveTo(boxX, boxY + ctaBoxHeight, boxX, boxY + ctaBoxHeight - radius)
          ctx.lineTo(boxX, boxY + radius)
          ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY)
          ctx.closePath()
          ctx.fill()

          ctx.fillStyle = '#FFFFFF'
          const textX = boxX + boxConfig.paddingX
          const textY = boxY + boxConfig.paddingY + template.fonts.hookCTA!.size
          drawTextWithLetterSpacing(ctx, ctaText, textX, textY, ctaLetterSpacing)

          // Render arrow next to CTA box
          if (template.styles.arrow) {
            const arrowConfig = template.styles.arrow
            const arrowColor = arrowConfig.color === 'theme' ? colorTheme.primaryColor : arrowConfig.color
            const arrowStartX = boxX + ctaBoxWidth + 24
            const arrowEndX = Math.min(width - safeMarginSides, arrowStartX + arrowConfig.width)
            const arrowY = boxY + ctaBoxHeight / 2

            if (arrowEndX - arrowStartX > 8) {
              const adjustedWidth = arrowEndX - arrowStartX

              ctx.strokeStyle = arrowColor
              ctx.lineWidth = arrowConfig.lineWidth
              ctx.lineCap = 'round'
              ctx.beginPath()
              ctx.moveTo(arrowStartX, arrowY)
              ctx.lineTo(arrowStartX + adjustedWidth, arrowY)
              ctx.stroke()

              ctx.beginPath()
              ctx.moveTo(arrowStartX + adjustedWidth, arrowY)
              ctx.lineTo(arrowStartX + adjustedWidth - arrowConfig.height / 2, arrowY - arrowConfig.height / 2)
              ctx.moveTo(arrowStartX + adjustedWidth, arrowY)
              ctx.lineTo(arrowStartX + adjustedWidth - arrowConfig.height / 2, arrowY + arrowConfig.height / 2)
              ctx.stroke()
            }
          }
        }

        // 5. Render SUBTITLE at the very bottom middle
        if (template.hookLayout.showSubtitle && subtitleText && template.fonts.hookSubtitle) {
          ctx.font = template.fonts.hookSubtitle.cssFont
          ctx.fillStyle = getTextColor('hook')
          ctx.textAlign = 'left'
          const subtitleLetterSpacing = getLetterSpacingFor('hookSubtitle')

          const words = subtitleText.split(' ')
          const wrappedLines: string[] = []
          let currentLine = ''

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const lineWidth = measureTextWithLetterSpacing(ctx, testLine, subtitleLetterSpacing)

            if (lineWidth > safeWidth && currentLine) {
              wrappedLines.push(currentLine)
              currentLine = word
            } else {
              currentLine = testLine
            }
          }
          if (currentLine) wrappedLines.push(currentLine)

          const subtitleLineHeight = template.fonts.hookSubtitle!.lineHeight
          const subtitleTotalHeight = wrappedLines.length * subtitleLineHeight
          let subtitleY = height - safeMarginBottom - subtitleTotalHeight + template.fonts.hookSubtitle!.size

          wrappedLines.forEach(line => {
            const lineWidth = measureTextWithLetterSpacing(ctx, line, subtitleLetterSpacing)
            const lineX = (width - lineWidth) / 2
            drawTextWithLetterSpacing(ctx, line, lineX, subtitleY, subtitleLetterSpacing)
            subtitleY += subtitleLineHeight
          })
        }

      } else {
        // ORIGINAL HOOK LAYOUT (templates 1, 2, 4): Simple centered hook with highlight
      const hookText = ideaTitle?.trim() || cleanCarousel.title || cleanCarousel.content
        const hookLetterSpacing = getLetterSpacingFor('hook')
        const hookAlign = getTextAlignFor('hook')
      
        // Load hook image if template uses images for hook slides
        let hookImageHeight = 0
        let hookImageWidth = 0
        let loadedHookImage: HTMLImageElement | null = null
        let hookImageY = 0
        
        // Check template's imagePlacement configuration for hook slides
        // Default to { hook: false, content: true, cta: false } if not specified
        const defaultImagePlacement = { hook: false, content: true, cta: false };
        const imagePlacement = template.imagePlacement || defaultImagePlacement;
        const shouldShowHookImage = imagePlacement.hook === true;
        
        if (shouldShowHookImage) {
          const emphasisData = underlineWordsForGenerationRef.current[index] || orderedUnderlineWords[index] || { underline: '', highlight: '', imageUrl: null, originalImageUrl: null }
          let rawImageUrl = emphasisData.imageUrl || emphasisData.originalImageUrl || null
          
          let imageSourceUrl: string | null = null
          if (rawImageUrl) {
            try {
              const url = new URL(rawImageUrl)
              if (url.hostname === 'image.pollinations.ai') {
                imageSourceUrl = `/api/image/proxy?url=${encodeURIComponent(rawImageUrl)}`
                console.log(`      🔄 Routing hook pollinations.ai image through proxy`)
              } else {
                imageSourceUrl = rawImageUrl
              }
            } catch (e) {
              imageSourceUrl = rawImageUrl
            }
          }
          
          if (imageSourceUrl) {
            try {
              const imageLoadStart = performance.now()
              console.log(`      🖼️ Loading hook image from: ${imageSourceUrl.substring(0, 50)}...`)
              loadedHookImage = await loadImage(imageSourceUrl)
              const imageLoadDuration = performance.now() - imageLoadStart
              console.log(`      ⏱️ Hook image load took: ${imageLoadDuration.toFixed(2)}ms`)
              
              // Use imageLayout.maxHeightRatio if provided, otherwise use 60% of safe width
              if (template.imageLayout?.maxHeightRatio) {
                const maxHeight = Math.round(height * template.imageLayout.maxHeightRatio)
                hookImageHeight = maxHeight
                hookImageWidth = Math.round(hookImageHeight * 16 / 9)  // Maintain 16:9 aspect ratio
                // Ensure image doesn't exceed safeWidth
                if (hookImageWidth > safeWidth) {
                  hookImageWidth = safeWidth
                  hookImageHeight = Math.round(hookImageWidth * 9 / 16)
                }
              } else {
                // Fallback: use 60% of safe width
                hookImageWidth = Math.round(safeWidth * 0.6)
                hookImageHeight = Math.round(hookImageWidth * 9 / 16)
              }
              console.log(`      ✅ Hook image loaded! Dimensions: ${loadedHookImage.width}x${loadedHookImage.height}, Display: ${hookImageWidth}x${hookImageHeight}`)
            } catch (error) {
              console.error(`❌ Hook slide: Failed to load image:`, error)
            }
          }
        }
      
        const hookBaseFontSize = template.fonts.hook.size
        const hookLineHeightRatio = template.fonts.hook.lineHeight / Math.max(1, hookBaseFontSize)
      const highlightOffsetRatio = 100 / Math.max(1, hookBaseFontSize)
      const highlightHeightRatio = 120 / Math.max(1, hookBaseFontSize)

      const buildHookFont = (size: number) =>
          template.fonts.hook.cssFont.replace(/(\d+\.?\d*)px/, `${size}px`)

      const wrapHookText = (fontSize: number) => {
        ctx.font = buildHookFont(fontSize)
      const words = hookText.split(' ')
        const wrappedLines: string[] = []
      let currentLine = ''
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
          const lineWidth = measureTextWithLetterSpacing(ctx, testLine, hookLetterSpacing)
        
          if (lineWidth > safeWidth && currentLine) {
            wrappedLines.push(currentLine)
          currentLine = word
        } else {
          currentLine = testLine
        }
      }
        if (currentLine) wrappedLines.push(currentLine)

        const lineHeight = fontSize * hookLineHeightRatio
        const totalHeight =
          (wrappedLines.length > 0 ? fontSize : 0) +
          Math.max(0, wrappedLines.length - 1) * lineHeight +
          (wrappedLines.length > 0 ? fontSize * 0.2 : 0)

        let maxWidth = 0
        wrappedLines.forEach(line => {
          const width = measureTextWithLetterSpacing(ctx, line, hookLetterSpacing)
          if (width > maxWidth) maxWidth = width
        })

        return {
          lines: wrappedLines,
          lineHeight,
          totalHeight,
          maxWidth
        }
      }

      let hookFontSize = hookBaseFontSize
      let hookLayout = wrapHookText(hookFontSize)
      
      // Calculate total height including image if present
      const getTotalHookHeight = (layout: typeof hookLayout) => {
        const imageSpace = loadedHookImage && hookImageHeight > 0 
          ? hookImageHeight + 40 // image + gap
          : 0
        return imageSpace + layout.totalHeight
      }
      
      let totalHookHeight = getTotalHookHeight(hookLayout)
      const effectiveHookSafeHeight = safeHeight

      // Dynamic sizing loop - account for image + text
      for (let i = 0; i < 12; i++) {
        const fitsWidth = hookLayout.maxWidth <= safeWidth
        const fitsHeight = totalHookHeight <= effectiveHookSafeHeight
        
        if (fitsWidth && fitsHeight) {
          break
        }

        // Calculate scale based on what's overflowing
        let scale = 1.0
        
        if (!fitsWidth) {
          const widthScale = safeWidth / hookLayout.maxWidth
          scale = Math.min(scale, widthScale)
        }
        
        if (!fitsHeight) {
          const heightScale = effectiveHookSafeHeight / totalHookHeight
          scale = Math.min(scale, heightScale)
        }
        
        // Apply minimum scale limit (down to 25% for hook slides)
        scale = Math.max(0.25, Math.min(0.95, scale))

        const nextSize = Math.max(hookBaseFontSize * 0.25, Math.floor(hookFontSize * scale))
        if (Math.abs(nextSize - hookFontSize) < 1) {
          hookFontSize = Math.max(hookBaseFontSize * 0.25, hookFontSize - 2)
        } else {
          hookFontSize = nextSize
        }

        hookLayout = wrapHookText(hookFontSize)
        totalHookHeight = getTotalHookHeight(hookLayout)
        
        // If we have an image and still too tall, reduce image size
        if (totalHookHeight > effectiveHookSafeHeight && loadedHookImage && hookImageHeight > 0) {
          const excessHeight = totalHookHeight - effectiveHookSafeHeight
          const imageContribution = hookImageHeight + 40
          
          if (excessHeight > 0 && imageContribution > 0) {
            const imageReductionFactor = Math.max(0.3, 1 - (excessHeight / imageContribution))
            hookImageHeight = Math.floor(hookImageHeight * imageReductionFactor)
            hookImageWidth = Math.floor(hookImageWidth * imageReductionFactor)
            totalHookHeight = getTotalHookHeight(hookLayout)
          }
        }
      }
      
      // Final safety check - ensure no overflow
      totalHookHeight = getTotalHookHeight(hookLayout)
      if (totalHookHeight > effectiveHookSafeHeight) {
        const finalScale = effectiveHookSafeHeight / totalHookHeight
        hookFontSize = Math.max(hookBaseFontSize * 0.2, Math.floor(hookFontSize * finalScale))
        hookLayout = wrapHookText(hookFontSize)
        
        // Reduce image one more time if needed
        if (loadedHookImage && hookImageHeight > 0) {
          totalHookHeight = getTotalHookHeight(hookLayout)
          if (totalHookHeight > effectiveHookSafeHeight) {
            const excessHeight = totalHookHeight - effectiveHookSafeHeight
            hookImageHeight = Math.max(0, Math.floor(hookImageHeight - excessHeight))
            hookImageWidth = Math.floor(hookImageWidth * (hookImageHeight / (hookImageHeight + excessHeight)))
          }
        }
      }

      const hookLineHeight = hookLayout.lineHeight
      const hookLines = hookLayout.lines
      const hookTotalHeight = hookLayout.totalHeight
      const highlightOffset = hookFontSize * highlightOffsetRatio
      const highlightHeight = hookFontSize * highlightHeightRatio

      ctx.font = buildHookFont(hookFontSize)
      ctx.fillStyle = getTextColor('hook')
      ctx.textAlign = 'left'

      // Get highlight word - use ref first (for regeneration from edit), then fall back to state
      const emphasisData = underlineWordsForGenerationRef.current[index] || orderedUnderlineWords[index] || { underline: '', highlight: '' }
      const highlightWord = emphasisData.highlight.toLowerCase().replace(/[.,!?;:–—\-'"`]/g, '').trim()
      
      // Find last occurrence of highlight word
      let lastHighlightLineIndex = -1
      let lastHighlightWordIndex = -1
      
      if (highlightWord) {
        for (let lineIdx = hookLines.length - 1; lineIdx >= 0; lineIdx--) {
          const lineWords = hookLines[lineIdx].split(' ')
          for (let wordIdx = lineWords.length - 1; wordIdx >= 0; wordIdx--) {
            const cleanWord = lineWords[wordIdx].toLowerCase().replace(/[.,!?;:–—\-'"`]/g, '').trim()
            if (cleanWord === highlightWord) {
              lastHighlightLineIndex = lineIdx
              lastHighlightWordIndex = wordIdx
              break
            }
          }
          if (lastHighlightLineIndex !== -1) break
        }
      }
      
      // Calculate image position and adjust text position
      let y: number
      const hookPadding = template.layout?.hookPadding
      const hookTopPadding = hookPadding?.top || 60
      const imageMarginBottom = template.imageLayout?.marginBottom || 60
      
      if (loadedHookImage && hookImageHeight > 0) {
        // Position image at top with padding
        hookImageY = safeMarginTop + hookTopPadding
        const imageBottomY = hookImageY + hookImageHeight + imageMarginBottom
        // Position text below image
        y = imageBottomY + hookFontSize
      } else {
        // Use verticalAlign to determine positioning
        if (template.layout?.verticalAlign === 'top') {
          y = safeMarginTop + hookTopPadding + hookFontSize
        } else {
          // Center the entire text block vertically
          y = centerY - (hookTotalHeight / 2) + (hookLines.length > 0 ? hookFontSize : 0)
        }
      }
      
      const spaceWidth = ctx.measureText(' ').width
      
      // Draw hook image first (if exists)
      if (loadedHookImage && hookImageWidth > 0 && hookImageHeight > 0) {
        try {
          const imageX = (width - hookImageWidth) / 2 // Center horizontally
          const sourceAspect = loadedHookImage.width / loadedHookImage.height
          const targetAspect = 16 / 9
          
          let sx = 0, sy = 0, sWidth = loadedHookImage.width, sHeight = loadedHookImage.height
          
          if (sourceAspect > targetAspect) {
            sWidth = loadedHookImage.height * targetAspect
            sx = (loadedHookImage.width - sWidth) / 2
          } else {
            sHeight = loadedHookImage.width / targetAspect
            sy = (loadedHookImage.height - sHeight) / 2
          }
          
          ctx.drawImage(
            loadedHookImage,
            sx, sy, sWidth, sHeight,
            imageX, hookImageY, hookImageWidth, hookImageHeight
          )
          console.log(`✅ Hook image successfully drawn at (${imageX}, ${hookImageY}), Size: ${hookImageWidth}x${hookImageHeight}`)
        } catch (error) {
          console.error(`❌ Failed to render hook image:`, error)
        }
      }
      
      // Draw each line
      hookLines.forEach((line, lineIndex) => {
        const lineWidth = measureTextWithLetterSpacing(ctx, line, hookLetterSpacing)
        const startX = hookAlign === 'center'
          ? (width / 2) - (lineWidth / 2)
          : safeMarginSides
        const lineWords = line.split(' ')
        
        // First pass: Draw highlight backgrounds
        let tempX = startX
        lineWords.forEach((word, wordIndex) => {
          const cleanWord = word.toLowerCase().replace(/[.,!?;:–—\-'"`]/g, '').trim()
          if (cleanWord === highlightWord && lineIndex === lastHighlightLineIndex && wordIndex === lastHighlightWordIndex) {
            const cleanedWord = word.replace(/^[.,!?;:–—\-'"`]+|[.,!?;:–—\-'"`]+$/g, '')
            const leadingPuncMatch = word.match(/^[.,!?;:–—\-'"`]+/)
            const leadingPunc = leadingPuncMatch ? leadingPuncMatch[0] : ''

            const leadingWidth = measureTextWithLetterSpacing(ctx, leadingPunc, hookLetterSpacing)
            const cleanedWidth = measureTextWithLetterSpacing(ctx, cleanedWord, hookLetterSpacing)

            const bgX = tempX + leadingWidth
            const bgY = y - highlightOffset
            if (!isTransparentHighlight) {
              ctx.fillStyle = highlightFillStyle
              ctx.fillRect(bgX, bgY, cleanedWidth, highlightHeight)
            }
          }

          const wordWidth = measureTextWithLetterSpacing(ctx, word, hookLetterSpacing)
          tempX += wordWidth
          if (wordIndex < lineWords.length - 1) {
            tempX += spaceWidth
          }
        })
        
        // Second pass: Draw text
        let currentX = startX
        lineWords.forEach((word, wordIndex) => {
          ctx.fillStyle = getTextColor('hook')
          const drawnWidth = drawTextWithLetterSpacing(ctx, word, currentX, y, hookLetterSpacing)
          currentX += drawnWidth
          if (wordIndex < lineWords.length - 1) {
            currentX += spaceWidth
          }
        })
        
        y += hookLineHeight
      })
      }  // End of else block for original HOOK layout
      
    } else if (cleanCarousel.kind === 'CTA') {
      // Render topic at the top for template 3 (using topic from HOOK slide)
      if (template.id === 'template3' && template.fonts.hookTopic) {
        const topicText = carousels[0]?.topic || '' // Get topic from HOOK slide
        if (topicText) {
          ctx.font = template.fonts.hookTopic.cssFont
          ctx.fillStyle = colorTheme.primaryColor
          ctx.textAlign = 'left'
          const topicLetterSpacing = getLetterSpacingFor('hookTopic')
          const topicValue = topicText.toUpperCase()
          const topicWidth = measureTextWithLetterSpacing(ctx, topicValue, topicLetterSpacing)
          const topicX = (width - topicWidth) / 2
          // Use ORIGINAL safe margin for consistent positioning
          const topicY = originalSafeMarginTop + template.fonts.hookTopic.size
          drawTextWithLetterSpacing(ctx, topicValue, topicX, topicY, topicLetterSpacing)
        }
      }

      const ctaLetterSpacing = getLetterSpacingFor('cta')
      const ctaAlign = getTextAlignFor('cta')

      // Use ref first (for regeneration from edit), then fall back to state
      const emphasisData = underlineWordsForGenerationRef.current[index] || orderedUnderlineWords[index] || { underline: '', highlight: '', imageUrl: null, originalImageUrl: null }
      
      // CTA slides should NEVER show images, regardless of template configuration
      // Always skip image loading for CTA slides
      let rawImageUrl = null
      let imageSourceUrl: string | null = null
      
      let ctaImageHeight = 0
      let ctaImageWidth = 0
      let loadedCtaImage: HTMLImageElement | null = null
      let ctaImageY = 0
      
      // Always skip images for CTA slides - do not load even if imageUrl exists
      if (false) { // Hardcoded to never execute
        try {
          const imageLoadStart = performance.now()
          console.log(`      🖼️ Loading CTA image from: ${imageSourceUrl?.substring(0, 50) || 'null'}...`)
          if (imageSourceUrl !== null) {
            loadedCtaImage = await loadImage(imageSourceUrl as string)
            const imageLoadDuration = performance.now() - imageLoadStart
            console.log(`      ⏱️ CTA image load took: ${imageLoadDuration.toFixed(2)}ms`)
            
            // Use imageLayout.maxHeightRatio if provided, otherwise use 60% of safe width
            const maxHeightRatio = template.imageLayout?.maxHeightRatio
            if (maxHeightRatio !== undefined && maxHeightRatio !== null) {
              const maxHeight = Math.round(height * (maxHeightRatio as number))
              ctaImageHeight = maxHeight
              ctaImageWidth = Math.round(ctaImageHeight * 16 / 9)  // Maintain 16:9 aspect ratio
              // Ensure image doesn't exceed safeWidth
              if (ctaImageWidth > safeWidth) {
                ctaImageWidth = safeWidth
                ctaImageHeight = Math.round(ctaImageWidth * 9 / 16)
              }
            } else {
              // Fallback: use 60% of safe width
              ctaImageWidth = Math.round(safeWidth * 0.6)
              ctaImageHeight = Math.round(ctaImageWidth * 9 / 16)
            }
            if (loadedCtaImage !== null) {
              const image = loadedCtaImage as HTMLImageElement
              console.log(`      ✅ CTA image loaded! Dimensions: ${image.width}x${image.height}, Display: ${ctaImageWidth}x${ctaImageHeight}`)
            }
          }
        } catch (error) {
          console.error(`❌ CTA slide: Failed to load image:`, error)
        }
      }
      
      ctx.font = template.fonts.content.cssFont
      ctx.fillStyle = getTextColor('cta')
      ctx.textAlign = 'left'
      
      const sentences = cleanCarousel.content.split(/([.!?])\s+/).filter(s => s.trim())
      const lines: string[] = []
      
      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = sentences[i]
        const punctuation = i + 1 < sentences.length ? sentences[i + 1] : ''
        
        if (!sentence) continue
        
        const fullSentence = sentence + punctuation
        const sentenceWords = fullSentence.split(' ')
        let currentLine = ''
        
        for (const word of sentenceWords) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const lineWidth = measureTextWithLetterSpacing(ctx, testLine, ctaLetterSpacing)
          
          if (lineWidth > safeWidth && currentLine) {
            lines.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) lines.push(currentLine)
        
        if (i + 2 < sentences.length || (i + 1 < sentences.length && punctuation)) {
          lines.push('')
        }
      }
      
      const underlinePhrases = emphasisData.underline.split(',').map((p: string) => p.trim()).filter((p: string) => p)
      
      const spaceWidth = ctx.measureText(' ').width
      const lineHeight = template.fonts.content.lineHeight
      const totalHeight = (lines.length - 1) * lineHeight
      
      // Adjust y position based on image presence
      let y: number
      if (loadedCtaImage && ctaImageHeight > 0) {
        // Position image at top, then text below
        const imageMarginBottom = template.imageLayout?.marginBottom || 40
        ctaImageY = safeMarginTop + 60
        y = ctaImageY + ctaImageHeight + imageMarginBottom + lineHeight
      } else {
        // Center text vertically
        y = centerY - (totalHeight / 2)
      }
      
      // Draw CTA image first (if exists)
      if (loadedCtaImage !== null && ctaImageWidth > 0 && ctaImageHeight > 0) {
        const image = loadedCtaImage as HTMLImageElement
        try {
          const imageX = (width - ctaImageWidth) / 2 // Center horizontally
          const sourceAspect = image.width / image.height
          const targetAspect = 16 / 9
          
          let sx = 0, sy = 0, sWidth = image.width, sHeight = image.height
          
          if (sourceAspect > targetAspect) {
            sWidth = image.height * targetAspect
            sx = (image.width - sWidth) / 2
          } else {
            sHeight = image.width / targetAspect
            sy = (image.height - sHeight) / 2
          }
          
          ctx.drawImage(
            image,
            sx, sy, sWidth, sHeight,
            imageX, ctaImageY, ctaImageWidth, ctaImageHeight
          )
          console.log(`✅ CTA image successfully drawn at (${imageX}, ${ctaImageY}), Size: ${ctaImageWidth}x${ctaImageHeight}`)
        } catch (error) {
          console.error(`❌ Failed to render CTA image:`, error)
        }
      }
      
      lines.forEach(line => {
        if (!line.trim()) {
          y += lineHeight
          return
        }
        
        const words = line.split(' ')
        const underlineMap: boolean[] = new Array(words.length).fill(false)
        
        for (const phrase of underlinePhrases) {
          const phraseWords = phrase.toLowerCase().split(/\s+/).map((w: string) => w.replace(/[.,!?;:–—\-'"`]/g, '').trim())
          const cleanLineWords = words.map((w: string) => w.toLowerCase().replace(/[.,!?;:–—\-'"`]/g, '').trim())
          
          for (let i = 0; i <= cleanLineWords.length - phraseWords.length; i++) {
            let matches = true
            for (let j = 0; j < phraseWords.length; j++) {
              if (cleanLineWords[i + j] !== phraseWords[j]) {
                matches = false
                break
              }
            }
            if (matches) {
              for (let j = 0; j < phraseWords.length; j++) {
                underlineMap[i + j] = true
              }
            }
          }
        }
        
        const lineWidth = measureTextWithLetterSpacing(ctx, line, ctaLetterSpacing)
        const startX = ctaAlign === 'center'
          ? (width / 2) - (lineWidth / 2)
          : safeMarginSides
        const wordPositions: Array<{ start: number; end: number }> = []

        let currentX = startX
        words.forEach((word, wordIndex) => {
          const startPos = currentX
          const drawnWidth = drawTextWithLetterSpacing(ctx, word, currentX, y, ctaLetterSpacing)
          const endPos = startPos + drawnWidth
          wordPositions.push({ start: startPos, end: endPos })
          currentX = endPos
          if (wordIndex < words.length - 1) {
            currentX += spaceWidth
          }
        })
        
        let underlineStart = -1
        const segments: Array<{ start: number; end: number }> = []

        underlineMap.forEach((shouldUnderline, wordIndex) => {
          if (shouldUnderline) {
            if (underlineStart === -1) {
              underlineStart = wordIndex
            }
          } else if (underlineStart !== -1) {
            const startPos = wordPositions[underlineStart]?.start ?? 0
            const endPos = wordPositions[wordIndex - 1]?.end ?? startPos
            segments.push({ start: startPos, end: endPos })
              underlineStart = -1
            }
        })
        
        if (underlineStart !== -1) {
          const startPos = wordPositions[underlineStart]?.start ?? 0
          const endPos = wordPositions[wordPositions.length - 1]?.end ?? startPos
          segments.push({ start: startPos, end: endPos })
        }

          const underlineY = y + 8
        segments.forEach(segment => {
          ctx.strokeStyle = colorTheme.underlineColor
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(segment.start, underlineY)
          ctx.lineTo(segment.end, underlineY)
          ctx.stroke()
        })
        
        y += lineHeight
      })
      
      // Render subtitle at the bottom for template 3 CTA page
      if (template.id === 'template3' && template.hookLayout?.showSubtitle && template.fonts.hookSubtitle) {
        const subtitleText = carousels[0]?.subtitle || '' // Get subtitle from HOOK slide
        if (subtitleText) {
          ctx.font = template.fonts.hookSubtitle.cssFont
          ctx.fillStyle = getTextColor('hook')
          ctx.textAlign = 'left'
          const subtitleLetterSpacing = getLetterSpacingFor('hookSubtitle')

          const words = subtitleText.split(' ')
          const wrappedLines: string[] = []
          let currentLine = ''

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const lineWidth = measureTextWithLetterSpacing(ctx, testLine, subtitleLetterSpacing)

            if (lineWidth > safeWidth && currentLine) {
              wrappedLines.push(currentLine)
              currentLine = word
            } else {
              currentLine = testLine
            }
          }
          if (currentLine) wrappedLines.push(currentLine)

          const subtitleLineHeight = template.fonts.hookSubtitle!.lineHeight
          const subtitleTotalHeight = wrappedLines.length * subtitleLineHeight
          let subtitleY = height - 150 - subtitleTotalHeight + template.fonts.hookSubtitle!.size

          wrappedLines.forEach(line => {
            const lineWidth = measureTextWithLetterSpacing(ctx, line, subtitleLetterSpacing)
            const lineX = (width - lineWidth) / 2
            drawTextWithLetterSpacing(ctx, line, lineX, subtitleY, subtitleLetterSpacing)
            subtitleY += subtitleLineHeight
          })
        }
      }
      
    } else {
      const titleLetterSpacing = getLetterSpacingFor('title')
      const contentLetterSpacing = getLetterSpacingFor('content')
      const titleAlign = getTextAlignFor('title')
      const contentAlign = getTextAlignFor('content')

      ctx.textAlign = 'left'
      
      // Use ref first (for regeneration from edit), then fall back to state
      // CRITICAL: Check both ref and state to ensure we get image URLs
      const emphasisDataFromRef = underlineWordsForGenerationRef.current[index]
      const emphasisDataFromState = orderedUnderlineWords[index]
      const emphasisData = emphasisDataFromRef || emphasisDataFromState || { underline: '', highlight: '', imageUrl: null, originalImageUrl: null }
      
      if (cleanCarousel.kind === 'MIDDLE') {
        console.log(`\n🖼️ Carousel ${index + 1} (MIDDLE) Image Check:`)
        console.log('  Emphasis data from ref:', emphasisDataFromRef)
        console.log('  Emphasis data from state:', emphasisDataFromState)
        console.log('  Final emphasis data:', emphasisData)
        console.log('  imageUrl present?', !!emphasisData.imageUrl)
        console.log('  originalImageUrl present?', !!emphasisData.originalImageUrl)
        console.log('  imageUrl value:', emphasisData.imageUrl)
        console.log('  originalImageUrl value:', emphasisData.originalImageUrl)
        
        // Warn if no image data found
        if (!emphasisData.imageUrl && !emphasisData.originalImageUrl) {
          console.warn(`   ⚠️  WARNING: No image URL found for MIDDLE carousel ${index + 1}!`)
          console.warn(`   This carousel will render without an image.`)
          console.warn(`   Check if image was fetched during generation.`)
        }
      }
      
      // Check template's imagePlacement configuration for content/middle slides
      // Default to { hook: false, content: true, cta: false } if not specified
      const defaultImagePlacement = { hook: false, content: true, cta: false };
      const imagePlacement = template.imagePlacement || defaultImagePlacement;
      const shouldShowContentImage = imagePlacement.content === true;
      
      let rawImageUrl = emphasisData.imageUrl || emphasisData.originalImageUrl || null
      
      // Check if template explicitly disables images via maxHeightRatio: 0
      // Templates with maxHeightRatio: 0 are text-only (no images)
      // Template 5 supports images (maxHeightRatio: 0.3), Template 6 supports images (maxHeightRatio: 0.35)
      const templateDisablesImages = template.imageLayout?.maxHeightRatio === 0
      
      // Route pollinations.ai images through proxy to avoid CORS issues
      // The proxy fetches the image server-side and serves it with proper CORS headers
      let imageSourceUrl: string | null = null
      // Only process image URL if template allows images for content slides AND doesn't explicitly disable them
      if (rawImageUrl && shouldShowContentImage && !templateDisablesImages) {
        try {
          const url = new URL(rawImageUrl)
          if (url.hostname === 'image.pollinations.ai') {
            // Use proxy for pollinations.ai images to avoid CORS issues
            imageSourceUrl = `/api/image/proxy?url=${encodeURIComponent(rawImageUrl)}`
            console.log(`      🔄 Routing pollinations.ai image through proxy`)
          } else {
            // Use direct URL for other sources (e.g., Pexels, which supports CORS)
            imageSourceUrl = rawImageUrl
          }
        } catch (e) {
          // If URL parsing fails, use the raw URL as-is
          imageSourceUrl = rawImageUrl
        }
      } else if (rawImageUrl && !shouldShowContentImage) {
        console.log(`      📝 Content image URL present but imagePlacement.content=false - skipping image display`)
      } else if (rawImageUrl && templateDisablesImages) {
        console.log(`      📝 Content image URL present but template ${template.id} has maxHeightRatio: 0 - images disabled for this template`)
      }
      
      let imageHeight = 0
      let imageWidth = 0
      let loadedImage: HTMLImageElement | null = null
      
      if (imageSourceUrl) {
        try {
          const imageLoadStart = performance.now()
          console.log(`      🖼️ Loading content image from: ${imageSourceUrl.substring(0, 50)}...`)
          loadedImage = await loadImage(imageSourceUrl)
          const imageLoadDuration = performance.now() - imageLoadStart
          console.log(`      ⏱️ Content image load took: ${imageLoadDuration.toFixed(2)}ms`)
          
          // Use imageLayout.maxHeightRatio if provided and > 0, otherwise use template-specific defaults
          // Note: maxHeightRatio: 0 check is handled above, so we won't reach here if images are disabled
          if (template.imageLayout?.maxHeightRatio && template.imageLayout.maxHeightRatio > 0) {
            const maxHeight = Math.round(height * template.imageLayout.maxHeightRatio)
            imageHeight = maxHeight
            imageWidth = Math.round(imageHeight * 16 / 9)  // Maintain 16:9 aspect ratio
            // Ensure image doesn't exceed safeWidth
            if (imageWidth > safeWidth) {
              imageWidth = safeWidth
              imageHeight = Math.round(imageWidth * 9 / 16)
            }
          } else {
            // Fallback to template-specific sizing when maxHeightRatio is not specified
            const sizeMultiplier = template.id === 'template3' ? 0.7 : 1.0
            imageWidth = Math.round(safeWidth * sizeMultiplier)
            imageHeight = Math.round(imageWidth * 9 / 16)
          }
          console.log(`      ✅ Image loaded! Dimensions: ${loadedImage.width}x${loadedImage.height}, Display: ${imageWidth}x${imageHeight}`)
        } catch (error) {
          console.error(`❌ Carousel ${index + 1}: Failed to pre-load image:`, error)
          console.error(`   Image URL was:`, imageSourceUrl)
        }
      } else if (cleanCarousel.kind === 'MIDDLE') {
        // Provide detailed diagnostics for missing images
        console.warn(`⚠️ Carousel ${index + 1} (MIDDLE): No imageUrl in emphasisData!`)
        console.warn(`   rawImageUrl: ${rawImageUrl || 'null'}`)
        console.warn(`   shouldShowContentImage: ${shouldShowContentImage}`)
        console.warn(`   imagePlacement.content: ${imagePlacement.content}`)
        console.warn(`   template.imagePlacement:`, template.imagePlacement)
        if (!rawImageUrl) {
          console.warn(`   This might mean:`)
          console.warn(`   - Images weren't fetched during generation (includeImages=false)`)
          console.warn(`   - Image fetch failed for this slide`)
          console.warn(`   - Image URL was not stored in underlineWords`)
        } else if (!shouldShowContentImage) {
          console.warn(`   Image URL exists but template has imagePlacement.content=false`)
        }
      }
      
      // Dynamic spacing - use layout values if provided
      const minTitleContentGap = template.id === 'template3' ? 20 : 20
      const minImageGap = template.id === 'template3' ? 20 : 20
      const maxTitleContentGap = template.layout?.gapTitleToContent || (template.id === 'template3' ? 40 : 70)
      const maxImageGap = template.imageLayout?.marginBottom || (template.id === 'template3' ? 30 : 40)
      
      const buildTitleFont = (size: number) => template.fonts.title.cssFont.replace(/(\d+\.?\d*)px/, `${size}px`)
      const buildContentFont = (size: number) => template.fonts.content.cssFont.replace(/(\d+\.?\d*)px/, `${size}px`)

      let titleFontSize = template.fonts.title.size
      let titleLineHeight = template.fonts.title.lineHeight
      let contentFontSize = template.fonts.content.size
      let contentLineHeight = template.fonts.content.lineHeight
      let titleContentGap = template.layout?.gapTitleToContent || Math.max(maxTitleContentGap, minTitleContentGap)
      let imageGap = imageHeight > 0 ? (template.imageLayout?.marginBottom || Math.max(maxImageGap, minImageGap)) : 0
      
      let titleLines: string[] = []
      let contentLines: string[] = []
      let totalHeight = 0
      let scaleFactor = 1.0
      
      const calculateLayout = (titleSize: number, contentSize: number) => {
        ctx.font = buildTitleFont(titleSize)
        const titleWords = cleanCarousel.title ? cleanCarousel.title.split(' ') : []
        const wrappedTitle: string[] = []
        let currentLine = ''
        
        for (const word of titleWords) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const lineWidth = measureTextWithLetterSpacing(ctx, testLine, titleLetterSpacing)
          
          if (lineWidth > safeWidth && currentLine) {
            wrappedTitle.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) wrappedTitle.push(currentLine)
        
        ctx.font = buildContentFont(contentSize)
        const contentWords = cleanCarousel.content.split(' ')
        const wrappedContent: string[] = []
        currentLine = ''
        
        for (const word of contentWords) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const lineWidth = measureTextWithLetterSpacing(ctx, testLine, contentLetterSpacing)
          
          if (lineWidth > safeWidth && currentLine) {
            wrappedContent.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) wrappedContent.push(currentLine)
        
        // Use template's actual lineHeight values instead of hardcoded multipliers
        const titleLineHeightRatio = template.fonts.title.lineHeight / template.fonts.title.size
        const contentLineHeightRatio = template.fonts.content.lineHeight / template.fonts.content.size
        const titleLH = titleSize * titleLineHeightRatio
        const contentLH = contentSize * contentLineHeightRatio
        
        const titleH = wrappedTitle.length > 0 
          ? titleSize + (wrappedTitle.length - 1) * titleLH + (titleSize * 0.2)
          : 0
        const contentH = wrappedContent.length > 0
          ? contentSize + (wrappedContent.length - 1) * contentLH + (contentSize * 0.2)
          : 0
        // Image first, then title, then content
        const total = imageHeight + (imageHeight > 0 ? imageGap : 0) + titleH + titleContentGap + contentH
        
        return {
          titleLines: wrappedTitle,
          contentLines: wrappedContent,
          titleLineHeight: titleLH,
          contentLineHeight: contentLH,
          totalHeight: total
        }
      }
      
      let layout = calculateLayout(titleFontSize, contentFontSize)
      
      // Calculate effective safe height for ALL templates
      let effectiveSafeHeight = safeHeight
      
      // For template 5, use its specific safe area if enabled
      if (template.id === 'template5' && template.safeArea?.enabled) {
        const template5SafeTop = template.safeArea.top
        const template5SafeBottom = template.safeArea.bottom
        effectiveSafeHeight = height - template5SafeTop - template5SafeBottom
        console.log(`   Template 5: Using safe area (top: ${template5SafeTop}, bottom: ${template5SafeBottom}), available height=${effectiveSafeHeight}px`)
      }
      
      // For template 3 MIDDLE slides, account for topic and page number
      if (template.id === 'template3' && cleanCarousel.kind === 'MIDDLE') {
        const topicBottomY = originalSafeMarginTop + (template.fonts.hookTopic ? template.fonts.hookTopic.size + 100 : 0)
        const pageNumberTopY = height - originalSafeMarginBottom - 60 - 90
        effectiveSafeHeight = pageNumberTopY - topicBottomY
        console.log(`   Template 3 MIDDLE: Available height=${effectiveSafeHeight}px`)
      }
      
      // Apply safety area check and dynamic sizing for ALL templates
      if (layout.totalHeight > effectiveSafeHeight) {
        console.log(`⚠️  Content too long (${layout.totalHeight}px > ${effectiveSafeHeight}px), scaling down...`)
        
        // Step 1: Reduce spacing to minimums
        titleContentGap = minTitleContentGap
        imageGap = imageHeight > 0 ? minImageGap : 0
        
        layout = calculateLayout(titleFontSize, contentFontSize)
        
        if (layout.totalHeight > effectiveSafeHeight) {
          // Step 2: Reduce image size if present (for ALL templates)
          if (imageHeight > 0) {
            const excessHeight = layout.totalHeight - effectiveSafeHeight
            const imageContribution = imageHeight + imageGap
            
            // Reduce image by proportion of excess, but keep at least 30% of original
            const reductionNeeded = Math.min(0.7, excessHeight / imageContribution)
            const imageReductionFactor = Math.max(0.3, 1 - reductionNeeded)
            
            imageHeight = Math.floor(imageHeight * imageReductionFactor)
            imageWidth = Math.floor(imageWidth * imageReductionFactor)
            console.log(`   Reducing image size by ${Math.round((1 - imageReductionFactor) * 100)}%: ${imageWidth}x${imageHeight}`)
            
            layout = calculateLayout(titleFontSize, contentFontSize)
          }
          
          // Step 3: Scale fonts dynamically if still too large (for ALL templates)
          if (layout.totalHeight > effectiveSafeHeight) {
            scaleFactor = effectiveSafeHeight / layout.totalHeight
            scaleFactor = Math.max(0.3, Math.min(0.95, scaleFactor)) // Allow down to 30% for all templates
            
            titleFontSize = Math.floor(template.fonts.title.size * scaleFactor)
            contentFontSize = Math.floor(template.fonts.content.size * scaleFactor)
            
            console.log(`   Scaling fonts: title ${titleFontSize}px, content ${contentFontSize}px (${Math.round(scaleFactor * 100)}%)`)
            
            layout = calculateLayout(titleFontSize, contentFontSize)
            
            // Step 4: If STILL too large, reduce image more aggressively
            if (layout.totalHeight > effectiveSafeHeight && imageHeight > 0) {
              const secondReductionFactor = 0.5
              imageHeight = Math.floor(imageHeight * secondReductionFactor)
              imageWidth = Math.floor(imageWidth * secondReductionFactor)
              console.log(`   Further reducing image size: ${imageWidth}x${imageHeight}`)
              
              layout = calculateLayout(titleFontSize, contentFontSize)
            }
          }
          
          // Final check - if still too large, force fit by scaling more aggressively
          if (layout.totalHeight > effectiveSafeHeight) {
            const finalScaleFactor = effectiveSafeHeight / layout.totalHeight
            scaleFactor = Math.max(0.25, Math.min(scaleFactor, finalScaleFactor)) // Allow down to 25% minimum
            
            titleFontSize = Math.floor(template.fonts.title.size * scaleFactor)
            contentFontSize = Math.floor(template.fonts.content.size * scaleFactor)
            
            console.log(`   Final aggressive scaling: title ${titleFontSize}px, content ${contentFontSize}px (${Math.round(scaleFactor * 100)}%)`)
            
            layout = calculateLayout(titleFontSize, contentFontSize)
            
            if (layout.totalHeight > effectiveSafeHeight) {
              console.warn(`⚠️  WARNING: Content still exceeds safe height even at minimum scale!`)
              console.warn(`   Total: ${Math.round(layout.totalHeight)}px, Safe: ${effectiveSafeHeight}px`)
              console.warn(`   Consider reducing content length`)
            }
          }
        }
      }
      
      titleLines = layout.titleLines
      contentLines = layout.contentLines
      titleLineHeight = layout.titleLineHeight
      contentLineHeight = layout.contentLineHeight
      totalHeight = layout.totalHeight
      
      console.log(`📏 Layout: ${titleLines.length} title lines, ${contentLines.length} content lines, total: ${Math.round(totalHeight)}px, safe: ${safeHeight}px`)
      
      // Render topic at the top for template 3 MIDDLE slides (using topic from HOOK slide)
      if (template.id === 'template3' && cleanCarousel.kind === 'MIDDLE' && template.fonts.hookTopic) {
        const topicText = carousels[0]?.topic || '' // Get topic from HOOK slide
        if (topicText) {
          ctx.font = template.fonts.hookTopic.cssFont
          ctx.fillStyle = colorTheme.primaryColor
          ctx.textAlign = 'left'
          const topicLetterSpacing = getLetterSpacingFor('hookTopic')
          const topicValue = topicText.toUpperCase()
          const topicWidth = measureTextWithLetterSpacing(ctx, topicValue, topicLetterSpacing)
          const topicX = (width - topicWidth) / 2
          // Use ORIGINAL safe margin, not adjusted
          const topicY = originalSafeMarginTop + template.fonts.hookTopic.size
          drawTextWithLetterSpacing(ctx, topicValue, topicX, topicY, topicLetterSpacing)
        }
      }

      const firstLineFontSize = titleLines.length > 0 ? titleFontSize : contentFontSize
      
      // For template 3 MIDDLE slides, center the image+title+content vertically (between topic and page number)
      let y: number
      let imageY: number | null = null
      
      if (template.id === 'template3' && cleanCarousel.kind === 'MIDDLE') {
        // Calculate available vertical space (between topic and page number)
        const topicBottomY = originalSafeMarginTop + (template.fonts.hookTopic ? template.fonts.hookTopic.size + 100 : 0)
        // Page number box: at height - 150 - 60, with 90px spacing above it
        const pageNumberTopY = height - originalSafeMarginBottom - 60 - 90
        const availableHeight = pageNumberTopY - topicBottomY
        
        // Calculate total content height (image first, then title, then content)
        const titleH = titleLines.length > 0 
          ? titleFontSize + (titleLines.length - 1) * titleLineHeight + (titleFontSize * 0.2)
          : 0
        const contentH = contentLines.length > 0
          ? contentFontSize + (contentLines.length - 1) * contentLineHeight + (contentFontSize * 0.2)
          : 0
        const totalContentHeight = imageHeight + (imageHeight > 0 ? imageGap : 0) + titleH + titleContentGap + contentH
        
        // Center everything vertically within available space
        const startY = topicBottomY + (availableHeight - totalContentHeight) / 2
        
        // Image at the top
        if (imageHeight > 0) {
          imageY = startY
          y = startY + imageHeight + imageGap + titleFontSize
        } else {
          y = startY + titleFontSize
        }
        
        console.log(`   Centering: topicBottom=${topicBottomY}, pageNumberTop=${pageNumberTopY}, contentHeight=${Math.round(totalContentHeight)}, imageY=${imageY}, startY=${Math.round(y)}`)
      } else {
        // For other templates, use verticalAlign or center everything
        const titlePadding = template.layout?.titlePadding
        const topPadding = titlePadding?.top || 0
        
        if (template.layout?.verticalAlign === 'top') {
          // Start from top with padding
          const startY = safeMarginTop + topPadding
          if (imageHeight > 0) {
            imageY = startY
            y = startY + imageHeight + imageGap + titleFontSize
          } else {
            y = startY + titleFontSize
          }
        } else {
          // Center everything
          const startY = centerY - (totalHeight / 2)
          if (imageHeight > 0) {
            imageY = startY
            y = startY + imageHeight + imageGap + titleFontSize
          } else {
            y = startY + titleFontSize
          }
        }
      }
      
      // Render image FIRST (if exists)
      if (loadedImage && imageWidth > 0 && imageHeight > 0 && imageY !== null) {
        try {
          console.log(`\n🖼️  Rendering image FIRST for carousel ${index + 1}`)
          console.log(`   Image dimensions: ${loadedImage.width}x${loadedImage.height}`)
          console.log(`   Target size: ${imageWidth}x${imageHeight}`)
          console.log(`   Y position: ${imageY}`)
          
          // Center the image horizontally for all templates
          const imageX = (width - imageWidth) / 2
          
          const sourceAspect = loadedImage.width / loadedImage.height
          const targetAspect = 16 / 9
          
          let sx = 0, sy = 0, sWidth = loadedImage.width, sHeight = loadedImage.height
          
          if (sourceAspect > targetAspect) {
            sWidth = loadedImage.height * targetAspect
            sx = (loadedImage.width - sWidth) / 2
          } else {
            sHeight = loadedImage.width / targetAspect
            sy = (loadedImage.height - sHeight) / 2
          }
          
          const borderRadius = 56
          ctx.save()
          ctx.beginPath()
          ctx.moveTo(imageX + borderRadius, imageY)
          ctx.lineTo(imageX + imageWidth - borderRadius, imageY)
          ctx.quadraticCurveTo(imageX + imageWidth, imageY, imageX + imageWidth, imageY + borderRadius)
          ctx.lineTo(imageX + imageWidth, imageY + imageHeight - borderRadius)
          ctx.quadraticCurveTo(imageX + imageWidth, imageY + imageHeight, imageX + imageWidth - borderRadius, imageY + imageHeight)
          ctx.lineTo(imageX + borderRadius, imageY + imageHeight)
          ctx.quadraticCurveTo(imageX, imageY + imageHeight, imageX, imageY + imageHeight - borderRadius)
          ctx.lineTo(imageX, imageY + borderRadius)
          ctx.quadraticCurveTo(imageX, imageY, imageX + borderRadius, imageY)
          ctx.closePath()
          ctx.clip()
          
          ctx.drawImage(
            loadedImage,
            sx, sy, sWidth, sHeight,
            imageX, imageY, imageWidth, imageHeight
          )
          ctx.restore()
          
          console.log(`✅ Image successfully drawn at (${imageX}, ${imageY}), Size: ${imageWidth}x${imageHeight}`)
        } catch (error) {
          console.error(`❌ Failed to render image for carousel ${index + 1}:`, error)
        }
      }
        
      ctx.font = buildTitleFont(titleFontSize)
        ctx.fillStyle = getTextColor('title')

        titleLines.forEach(line => {
        const lineWidth = measureTextWithLetterSpacing(ctx, line, titleLetterSpacing)
        const startX = getLineStartX(titleAlign, lineWidth)
        drawTextWithLetterSpacing(ctx, line, startX, y, titleLetterSpacing)
          y += titleLineHeight
        })
        
        y += titleContentGap
        
      ctx.font = buildContentFont(contentFontSize)
        ctx.fillStyle = getTextColor('content')
      const spaceWidth = ctx.measureText(' ').width
        
        const underlinePhrases = emphasisData.underline.split(',').map((p: string) => p.trim()).filter((p: string) => p)
      const highlightWord = emphasisData.highlight.toLowerCase().replace(/[.,!?;:–—\-'"`]/g, '').trim()

        let lastHighlightLineIndex = -1
        let lastHighlightWordIndex = -1
        
        if (highlightWord) {
          for (let lineIdx = contentLines.length - 1; lineIdx >= 0; lineIdx--) {
            const lineWords = contentLines[lineIdx].split(' ')
          const cleanLineWords = lineWords.map((w: string) => w.toLowerCase().replace(/[.,!?;:–—\-'"`]/g, '').trim())
            for (let wordIdx = cleanLineWords.length - 1; wordIdx >= 0; wordIdx--) {
              if (cleanLineWords[wordIdx] === highlightWord) {
                lastHighlightLineIndex = lineIdx
                lastHighlightWordIndex = wordIdx
                break
              }
            }
            if (lastHighlightLineIndex !== -1) break
          }
        }
        
        contentLines.forEach((line, lineIndex) => {
          const words = line.split(' ')
          const underlineMap: boolean[] = new Array(words.length).fill(false)
          
          for (const phrase of underlinePhrases) {
          const phraseWords = phrase.toLowerCase().split(/\s+/).map((w: string) => w.replace(/[.,!?;:–—\-'"`]/g, '').trim())
          const cleanLineWords = words.map((w: string) => w.toLowerCase().replace(/[.,!?;:–—\-'"`]/g, '').trim())
            
            for (let i = 0; i <= cleanLineWords.length - phraseWords.length; i++) {
              let matches = true
              for (let j = 0; j < phraseWords.length; j++) {
                if (cleanLineWords[i + j] !== phraseWords[j]) {
                  matches = false
                  break
                }
              }
              if (matches) {
                for (let j = 0; j < phraseWords.length; j++) {
                  underlineMap[i + j] = true
                }
              }
            }
          }
          
        if (lineIndex === lastHighlightLineIndex && lastHighlightWordIndex !== -1) {
            underlineMap[lastHighlightWordIndex] = false
          }
          
        const lineWidth = measureTextWithLetterSpacing(ctx, line, contentLetterSpacing)
        const startX = getLineStartX(contentAlign, lineWidth)
        const wordPositions: Array<{ start: number; end: number }> = []

        let tempX = startX
          words.forEach((word, wordIndex) => {
          if (lineIndex === lastHighlightLineIndex && wordIndex === lastHighlightWordIndex) {
            const cleanedWord = word.replace(/^[.,!?;:–—\-'"`]+|[.,!?;:–—\-'"`]+$/g, '')
            const leadingPuncMatch = word.match(/^[.,!?;:–—\-'"`]+/)
            const leadingPunc = leadingPuncMatch ? leadingPuncMatch[0] : ''

            const leadingWidth = measureTextWithLetterSpacing(ctx, leadingPunc, contentLetterSpacing)
            const cleanedWidth = measureTextWithLetterSpacing(ctx, cleanedWord, contentLetterSpacing)
              
            if (!isTransparentHighlight) {
              ctx.fillStyle = highlightFillStyle
              ctx.fillRect(tempX + leadingWidth, y - contentFontSize * 0.91, cleanedWidth, contentFontSize * 1.09)
            }
          }

          const wordWidth = measureTextWithLetterSpacing(ctx, word, contentLetterSpacing)
          tempX += wordWidth
          if (wordIndex < words.length - 1) {
            tempX += spaceWidth
          }
        })

        let currentX = startX
          words.forEach((word, wordIndex) => {
            ctx.fillStyle = getTextColor('content')
          const startPos = currentX
          const drawnWidth = drawTextWithLetterSpacing(ctx, word, currentX, y, contentLetterSpacing)
          const endPos = startPos + drawnWidth
          wordPositions.push({ start: startPos, end: endPos })
          currentX = endPos
            if (wordIndex < words.length - 1) {
            currentX += spaceWidth
            }
          })
          
          let underlineStart = -1
        const segments: Array<{ start: number; end: number }> = []

        underlineMap.forEach((shouldUnderline, wordIndex) => {
          if (shouldUnderline) {
              if (underlineStart === -1) {
                underlineStart = wordIndex
            }
          } else if (underlineStart !== -1) {
            const startPos = wordPositions[underlineStart]?.start ?? 0
            const endPos = wordPositions[wordIndex - 1]?.end ?? startPos
            segments.push({ start: startPos, end: endPos })
                underlineStart = -1
              }
          })
          
          if (underlineStart !== -1) {
          const startPos = wordPositions[underlineStart]?.start ?? 0
          const endPos = wordPositions[wordPositions.length - 1]?.end ?? startPos
          segments.push({ start: startPos, end: endPos })
        }

            const underlineY = y + 8
        segments.forEach(segment => {
            ctx.strokeStyle = colorTheme.underlineColor
            ctx.lineWidth = 2
            ctx.beginPath()
          ctx.moveTo(segment.start, underlineY)
          ctx.lineTo(segment.end, underlineY)
            ctx.stroke()
        })
          
          y += contentLineHeight
        })
    }

    // Render page number for MIDDLE slides in template 3 (same position as subtitle on hook slide)
    if (template.id === 'template3' && cleanCarousel.kind === 'MIDDLE') {
      // Calculate page number (excluding HOOK which is index 0)
      const pageNumber = index // This will be 1, 2, 3, etc. for MIDDLE slides
      const pageText = `${pageNumber}` // Just the number
      
      // Set font for page number - use Mansalva
      const pageNumberFontSize = 36
      ctx.font = `${pageNumberFontSize}px Mansalva, cursive`
      const pageTextWidth = ctx.measureText(pageText).width
      
      // Box dimensions
      const boxPaddingX = 24
      const boxPaddingY = 12
      const boxWidth = pageTextWidth + boxPaddingX * 2
      const boxHeight = pageNumberFontSize + boxPaddingY * 2
      const boxRadius = 8
      
      // Position at bottom middle - using original safeMarginBottom (150) to match subtitle position
      const boxX = (width - boxWidth) / 2
      const boxY = height - 150 - boxHeight
      
      // Draw colored box with theme primary color
      ctx.fillStyle = colorTheme.primaryColor
      ctx.beginPath()
      ctx.moveTo(boxX + boxRadius, boxY)
      ctx.lineTo(boxX + boxWidth - boxRadius, boxY)
      ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + boxRadius)
      ctx.lineTo(boxX + boxWidth, boxY + boxHeight - boxRadius)
      ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - boxRadius, boxY + boxHeight)
      ctx.lineTo(boxX + boxRadius, boxY + boxHeight)
      ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - boxRadius)
      ctx.lineTo(boxX, boxY + boxRadius)
      ctx.quadraticCurveTo(boxX, boxY, boxX + boxRadius, boxY)
      ctx.closePath()
      ctx.fill()
      
      // Draw page number text in white
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'left'
      const textX = boxX + boxPaddingX
      const textY = boxY + boxPaddingY + pageNumberFontSize * 0.75
      ctx.fillText(pageText, textX, textY)
    }

    const arrowConfig = template.styles?.arrow
    if (arrowConfig?.type === 'right' && cleanCarousel.kind !== 'CTA' && !template.hookLayout?.showCTA) {
      const arrowEndX = width - safeMarginSides - arrowConfig.offsetRight
      const arrowStartX = Math.max(safeMarginSides, arrowEndX - arrowConfig.width)
      const arrowY = height - safeMarginBottom - arrowConfig.offsetBottom

      // Use theme color if arrow.color is 'theme', otherwise use the specified color
      const arrowColor = arrowConfig.color === 'theme' ? colorTheme.primaryColor : arrowConfig.color
      ctx.strokeStyle = arrowColor
      ctx.lineWidth = arrowConfig.lineWidth
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(arrowStartX, arrowY)
      ctx.lineTo(arrowEndX, arrowY)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(arrowEndX, arrowY)
      ctx.lineTo(arrowEndX - arrowConfig.height / 2, arrowY - arrowConfig.height / 2)
      ctx.moveTo(arrowEndX, arrowY)
      ctx.lineTo(arrowEndX - arrowConfig.height / 2, arrowY + arrowConfig.height / 2)
      ctx.stroke()
    }
    
    // Render footer if enabled
    if (template.footer?.enabled && template.footer.height) {
      const footerHeight = template.footer.height
      const paddingX = template.footer.paddingX || 48
      const paddingY = template.footer.paddingY || paddingX
      
      // Position footer at the very bottom of canvas
      const footerY = height - footerHeight
      
      // Draw footer text (left and right) - positioned at bottom of footer
      const footerFontRole = template.footer.fontRole || 'content'
      const footerFont = template.fonts[footerFontRole]
      if (footerFont) {
        const footerFontSize = template.footer.fontSize || footerFont.size
        const footerCssFont = footerFont.cssFont.replace(/(\d+\.?\d*)px/, `${footerFontSize}px`)
        
        ctx.font = footerCssFont
        ctx.fillStyle = getTextColor(footerFontRole as 'hook' | 'title' | 'content' | 'cta')
        ctx.textAlign = 'left'
        
        // Position text at bottom of footer with paddingY from bottom
        const footerTextY = footerY + footerHeight - paddingY
        
        // Left text (account name)
        const leftText = accountName || template.footer.leftText || ''
        if (leftText) {
          ctx.fillText(leftText, paddingX, footerTextY)
        }
        
        // Right text (website/handle)
        const rightText = website || template.footer.rightText || ''
        if (rightText) {
          ctx.textAlign = 'right'
          ctx.fillText(rightText, width - paddingX, footerTextY)
        }
      }
    }
    
    const carouselImageEndTime = performance.now()
    const carouselImageDuration = carouselImageEndTime - carouselImageStartTime
    console.log(`      ✅ Carousel ${index + 1} complete! Total time: ${carouselImageDuration.toFixed(2)}ms`)
  }  // Close generateCarouselImage function

  /**
   * Convert WebP data URL to PNG data URL for user downloads
   * Users expect PNG format when downloading images
   */
  const convertWebPDataUrlToPng = async (webpDataUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      // If it's already PNG, return as-is
      if (webpDataUrl.startsWith('data:image/png')) {
        resolve(webpDataUrl)
        return
      }

      // If it's not WebP, return as-is (fallback for other formats)
      if (!webpDataUrl.startsWith('data:image/webp')) {
        resolve(webpDataUrl)
        return
      }

      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Failed to get canvas context'))
          return
        }
        ctx.drawImage(img, 0, 0)
        // Convert to PNG data URL
        const pngDataUrl = canvas.toDataURL('image/png')
        resolve(pngDataUrl)
      }
      img.onerror = () => reject(new Error('Failed to load WebP image'))
      img.src = webpDataUrl
    })
  }

  const downloadCarousel = async (index: number) => {
    let imageDataUrl = orderedCarouselImages[index]
    if (!imageDataUrl) return

    // Convert WebP to PNG for download if needed
    if (imageDataUrl.startsWith('data:image/webp')) {
      try {
        imageDataUrl = await convertWebPDataUrlToPng(imageDataUrl)
      } catch (error) {
        console.error('Error converting WebP to PNG for download:', error)
        // Continue with original if conversion fails
      }
    }

    const link = document.createElement('a')
    const carousel = orderedCarousels[index]
    const fileName = `carousel-${index + 1}-${carousel.kind.toLowerCase()}.png`
    
    link.download = fileName
    link.href = imageDataUrl
    link.click()
  }

  const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (typeof window !== 'undefined' && window.innerWidth <= 768)
  }

  const downloadAllCarousels = async () => {
    const isMobile = isMobileDevice()
    
      // On mobile devices, download images individually to save to photo album
      if (isMobile) {
        try {
          // Download each image individually with a small delay between downloads
          // This allows mobile browsers to save each image to the photo album
          for (let i = 0; i < orderedCarousels.length; i++) {
            const imageDataUrl = orderedCarouselImages[i]
            if (!imageDataUrl) continue
            
            // Use setTimeout to stagger downloads and avoid browser blocking
            // downloadCarousel is now async, so we need to handle it properly
            setTimeout(async () => {
              await downloadCarousel(i)
            }, i * 300) // 300ms delay between each download
          }
      } catch (error) {
        console.error('Error downloading images on mobile:', error)
      }
      return
    }
    
    // On desktop, use ZIP file (original behavior)
    try {
      const zip = new JSZip()
      
      // Process all carousels and add them to the zip
      for (let i = 0; i < orderedCarousels.length; i++) {
        let imageDataUrl = orderedCarouselImages[i]
        if (!imageDataUrl) continue
        
        // Convert WebP to PNG for download if needed
        if (imageDataUrl.startsWith('data:image/webp')) {
          try {
            imageDataUrl = await convertWebPDataUrlToPng(imageDataUrl)
          } catch (error) {
            console.error(`Error converting WebP to PNG for carousel ${i + 1}:`, error)
            // Continue with original if conversion fails
          }
        }
        
        const carousel = orderedCarousels[i]
        const fileName = `carousel-${i + 1}-${carousel.kind.toLowerCase()}.png`
        
        // Convert data URL to base64
        const base64Data = imageDataUrl.split(',')[1]
        
        // Add image to zip
        zip.file(fileName, base64Data, { base64: true })
      }
      
      // Generate zip file and trigger download
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = 'all-carousels.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the object URL
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Error creating zip file:', error)
      // Fallback to individual downloads if zip fails
      orderedCarousels.forEach((_, index) => {
        setTimeout(() => downloadCarousel(index), index * 200)
      })
    }
  }

  return (
    <div
      className="card"
      style={{
        marginTop: 0,
        height: '100%',
        maxHeight: '100%',
        width: '100%',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        overflow: 'hidden',
        cursor: 'default',
        border: 'none',
        borderRadius: 0,
        minWidth: 0,
        minHeight: 0
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          minHeight: 0,
          minWidth: 0,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: '24px',
            overflowX: 'auto',
            overflowY: 'hidden',
            paddingBottom: '16px',
            width: '100%',
            minHeight: 0,
            minWidth: 0,
            flexShrink: 1
          }}
        >
        {orderedCarousels.map((carousel, index) => {
          const hasCurrentImage = !!orderedCarouselImages[index]
          const hasPreviousImage = !!previousImagesRef.current[index]
          const isImageReady = hasCurrentImage || hasPreviousImage

          return (
            <div 
              key={`carousel-${index}-${carousel.kind}-${carousel.title?.substring(0, 20)}`}
              data-carousel-index={index}
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                padding: '16px',
                transition: 'all 0.3s ease',
                minWidth: isMobile ? '280px' : '400px',
                maxWidth: isMobile ? '280px' : '400px',
                flex: isMobile ? '0 0 280px' : '0 0 400px'
              }}>
              <div style={{ 
                position: 'relative',
                paddingBottom: '125%', // 4:5 aspect ratio
                background: '#ffffff',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '12px',
                border: '1px solid #e5e5e5'
              }}>
                {/* Placeholder while images are generating */}
                {!isImageReady && (
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
                      zIndex: 2
                    }}
                  />
                )}

                {/* Always render an offscreen canvas so we can regenerate at any time */}
                <canvas
                  ref={el => { canvasRefs.current[index] = el }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: 0
                  }}
                />
                {/* If we already have an image, show it above the canvas */}
                {/* Use current image if available, otherwise fall back to previous to prevent layout shifts */}
                {(orderedCarouselImages[index] || previousImagesRef.current[index]) && (
                  <img
                    key={`carousel-img-${index}-${orderedCarouselImages[index] ? 'current' : 'prev'}`}
                    src={orderedCarouselImages[index] || previousImagesRef.current[index]}
                    alt={`Carousel ${index + 1}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      zIndex: 1,
                      transition: 'opacity 0.2s ease'
                    }}
                  />
                )}
              </div>
            </div>
          )})}
        </div>
      </div>
      
      {/* Thumbnail strip at the bottom */}
      <div
        style={{
          display: 'flex',
          gap: isMobile ? '8px' : '12px',
          padding: isMobile ? '12px 0' : '16px 0',
          overflowX: 'auto',
          overflowY: 'hidden',
          marginTop: 'auto',
          flexShrink: 0,
          justifyContent: 'center',
          minWidth: 0,
          width: '100%'
        }}
      >
        {orderedCarousels.map((carousel, index) => {
          const hasCurrentImage = !!orderedCarouselImages[index]
          const hasPreviousImage = !!previousImagesRef.current[index]
          const imageUrl = orderedCarouselImages[index] || previousImagesRef.current[index]
          const isDragging = draggedIndex === index
          const isDragOver = dragOverIndex === index
          
          return (
            <div
              key={`thumbnail-${index}`}
              draggable
              onDragStart={(e) => {
                setDraggedIndex(index)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/html', index.toString())
                // Add visual feedback
                if (e.currentTarget) {
                  e.currentTarget.style.opacity = '0.5'
                }
              }}
              onDragEnd={(e) => {
                setDraggedIndex(null)
                setDragOverIndex(null)
                // Reset visual feedback
                if (e.currentTarget) {
                  e.currentTarget.style.opacity = '1'
                }
              }}
              onDragOver={(e) => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (draggedIndex !== null && draggedIndex !== index) {
                  setDragOverIndex(index)
                }
              }}
              onDragLeave={(e) => {
                // Only clear dragOver if we're actually leaving the element
                const rect = e.currentTarget.getBoundingClientRect()
                const x = e.clientX
                const y = e.clientY
                if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
                  setDragOverIndex(null)
                }
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (draggedIndex !== null && draggedIndex !== index) {
                  handleReorder(draggedIndex, index)
                }
                setDraggedIndex(null)
                setDragOverIndex(null)
              }}
              style={{
                flexShrink: 0,
                width: isMobile ? '48px' : '64px',
                height: isMobile ? '60px' : '80px',
                borderRadius: isMobile ? '8px' : '12px',
                overflow: 'hidden',
                background: isDragOver ? '#fff9ed' : '#f5f5f5',
                border: isDragOver ? '2px solid #ffbd59' : isDragging ? '2px dashed #ffbd59' : '1px solid #e5e5e5',
                position: 'relative',
                cursor: isDragging ? 'grabbing' : 'grab',
                transition: draggedIndex === null ? 'all 0.2s ease' : 'none',
                transform: isDragOver ? 'scale(1.1)' : isDragging ? 'scale(0.95)' : 'scale(1)',
                opacity: isDragging ? 0.5 : 1,
                zIndex: isDragging ? 1000 : isDragOver ? 100 : 1
              }}
              onMouseEnter={(e) => {
                if (draggedIndex === null) {
                  e.currentTarget.style.transform = 'scale(1.05)'
                  e.currentTarget.style.borderColor = '#ffbd59'
                }
              }}
              onMouseLeave={(e) => {
                if (draggedIndex === null) {
                  e.currentTarget.style.transform = 'scale(1)'
                  e.currentTarget.style.borderColor = '#e5e5e5'
                }
              }}
              onClick={(e) => {
                // Only scroll if not dragging
                if (draggedIndex === null) {
                  const carouselElement = document.querySelector(`[data-carousel-index="${index}"]`)
                  if (carouselElement) {
                    carouselElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
                  }
                }
              }}
            >
              {!hasCurrentImage && !hasPreviousImage ? (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f5f5f5',
                    color: '#999999',
                    fontSize: isMobile ? '18px' : '24px',
                    fontWeight: '300'
                  }}
                >
                  {index + 1}
                </div>
              ) : (
                <img
                  src={imageUrl}
                  alt={`Carousel ${index + 1} thumbnail`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Export with forwardRef to allow parent components to call regenerateAndSave
export default forwardRef(CarouselImageGeneratorComponent)
