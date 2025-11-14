'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getCarouselTemplate } from '../config/carouselTemplates'
import { getColorTheme } from '../config/carouselThemes'
import { useAuth } from '../context/AuthContext'
import JSZip from 'jszip'
import { uploadImagesToStorage } from '../lib/uploadImages'

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
  caption?: string
  includeImages?: boolean
  useAIImages?: boolean
  aiImageStyle?: 'animated' | 'surreal'
  onGenerationComplete?: (generationId?: string) => void
  onCarouselsReorder?: (reorderedCarousels: Carousel[]) => void
}

// Initialize images from localStorage before rendering
const getInitialImages = (carousels: Carousel[], ideaTitle: string, underlineWords: Record<number, any>, templateId: string, colorThemeId: string): string[] => {
  try {
    // Check if cache should be skipped (e.g., when color theme changes)
    const skipCache = localStorage.getItem('postGeneration_skipCache') === 'true'
    if (skipCache) {
      console.log('⏭️ Skip cache flag detected - forcing regeneration')
      return []
    }
    
    // If there's no generationId in localStorage, we're on a fresh /app page - don't load from cache
    const storedGenerationId = localStorage.getItem('postGeneration_generationId')
    if (!storedGenerationId) {
      console.log('🆕 Fresh page detected (no generationId) - skipping localStorage cache')
      return []
    }
    
    const savedImages = localStorage.getItem('postGeneration_canvasImages')
    const savedFullContentHash = localStorage.getItem('postGeneration_fullContentHash')
    const savedContentHash = localStorage.getItem('postGeneration_contentHash')
    const savedHash = savedFullContentHash || savedContentHash
    
    // Create deterministic hash with consistent property order
    const currentFullContentHash = JSON.stringify({ 
      ideaTitle, 
      carousels, 
      underlineWords, 
      templateId, 
      colorThemeId
    })
    
    console.log('🔍 Cache check:', {
      hasSavedImages: !!savedImages,
      savedHash,
      currentHash: currentFullContentHash,
      hashMatch: savedHash === currentFullContentHash,
      colorThemeId
    })
    
    if (savedImages && savedHash && savedHash === currentFullContentHash) {
      const imageDataUrls = JSON.parse(savedImages)
      // Verify all images are present and valid data URLs
      if (imageDataUrls.length === carousels.length && 
          imageDataUrls.every((img: string) => img && typeof img === 'string' && img.startsWith('data:image/'))) {
        console.log('✅ Loaded all', imageDataUrls.length, 'images from cache')
        return imageDataUrls
      } else {
        console.warn('⚠️ Cached images incomplete or invalid, will regenerate')
      }
    } else if (savedHash && savedHash !== currentFullContentHash) {
      console.log('🔄 Hash mismatch - cache invalid, will regenerate')
    }
  } catch (error) {
    console.error('Error loading images from localStorage:', error)
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

export default function CarouselImageGenerator({ 
  carousels, 
  ideaTitle,
  ideaIndex = null,
  underlineWords = {},
  templateId = 'template1',
  colorThemeId = 'purple-black',
  accountDescription = '',
  caption = '',
  includeImages = false,
  useAIImages = false,
  aiImageStyle = 'animated',
  onGenerationComplete,
  onCarouselsReorder
}: Props) {
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
  const [carouselImages, setCarouselImages] = useState<string[]>(() => 
    getInitialImages(carousels, ideaTitle, underlineWords, templateId, colorThemeId)
  )
  // Keep previous images visible during regeneration to prevent layout shifts
  const initialImages = getInitialImages(carousels, ideaTitle, underlineWords, templateId, colorThemeId)
  const previousImagesRef = useRef<string[]>(initialImages)
  
  // Local state for reordered carousels (allows drag-and-drop reordering)
  const [orderedCarousels, setOrderedCarousels] = useState<Carousel[]>(carousels)
  const [orderedCarouselImages, setOrderedCarouselImages] = useState<string[]>(() => 
    getInitialImages(carousels, ideaTitle, underlineWords, templateId, colorThemeId)
  )
  const [orderedUnderlineWords, setOrderedUnderlineWords] = useState<Record<number, any>>(underlineWords)
  
  // Update local state when props change
  useEffect(() => {
    setOrderedCarousels(carousels)
    setOrderedCarouselImages(getInitialImages(carousels, ideaTitle, underlineWords, templateId, colorThemeId))
    setOrderedUnderlineWords(underlineWords)
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
  // Initialize hasDeductedCredit from localStorage - check by ideaTitle, not content hash
  // Credits should be deducted once per ideaTitle, not once per content version
  const getInitialCreditDeductionStatus = (): boolean => {
    try {
      const storedGenerationId = localStorage.getItem('postGeneration_generationId')
      const storedIdeaTitle = localStorage.getItem('postGeneration_ideaTitle')
      // If generationId exists and ideaTitle matches, credits were already deducted for this idea
      // (regardless of content edits)
      if (storedGenerationId && storedIdeaTitle === ideaTitle) {
        console.log('✅ Credits already deducted for this ideaTitle (found generationId)', ideaTitle)
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
  // Track if a save is in progress to prevent duplicate saves
  const isSavingRef = useRef<boolean>(false)
  
  // Use refs for values that should not trigger re-renders when changed
  const accountDescriptionRef = useRef(accountDescription)
  const captionRef = useRef(caption)
  
  // Update refs when props change
  useEffect(() => {
    accountDescriptionRef.current = accountDescription
    captionRef.current = caption
  }, [accountDescription, caption])

  // Get selected template and color theme
  const TEMPLATE = getCarouselTemplate(templateId)
  const COLOR_THEME = getColorTheme(colorThemeId)


  // Auto-save function
  const saveToDatabase = useCallback(async (imageDataUrls: string[]): Promise<string | undefined> => {
    if (!user?.id) {
      console.warn('Cannot save: user not authenticated')
      return undefined
    }

    if (imageDataUrls.length === 0) {
      console.warn('Cannot save: no images to save')
      return undefined
    }

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
          slides: orderedCarousels,
          caption: captionRef.current,
          underlineWords: orderedUnderlineWords,
          templateId,
          colorThemeId,
          // No images or imageUrls - will upload separately
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
      console.log('📤 [STEP 2] Uploading images directly to Supabase Storage (client-side)...')

      // Step 2: Upload images directly to Supabase Storage (bypasses API body size limits)
      // This avoids Vercel's 4.5MB/6MB request body size limits
      let imageUrls: string[]
      let thumbnailUrls: string[]
      
      try {
        // If updating an existing generation, delete old images first
        if (createResult.isUpdate) {
          console.log('🗑️  Deleting old images for update...')
          const { deleteOldImages } = await import('../lib/uploadImages')
          try {
            await deleteOldImages(user.id, generationId)
          } catch (deleteError) {
            // Non-fatal - upsert will overwrite anyway
            console.warn('⚠️ Failed to delete old images (non-fatal):', deleteError)
          }
        }
        
        const uploadResult = await uploadImagesToStorage(
          user.id,
          generationId,
          imageDataUrls
        )
        imageUrls = uploadResult.imageUrls
        thumbnailUrls = uploadResult.thumbnailUrls
        console.log('✅ Images uploaded successfully:', imageUrls.length)
      } catch (uploadError: any) {
        console.error('❌ Failed to upload images:', uploadError)
        throw new Error(`Failed to upload images: ${uploadError.message || uploadError}`)
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

      const updateResult = await updateResponse.json()
      
      // Store generation_id, content hash, and ideaTitle in localStorage
      localStorage.setItem('postGeneration_generationId', generationId)
      localStorage.setItem('postGeneration_contentHash', currentContentHash)
      localStorage.setItem('postGeneration_ideaTitle', ideaTitle)
      if (user?.id) {
        localStorage.setItem('postGeneration_userId', user.id)
      }
      
      if (updateResult.isUpdate) {
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

  const generateAllCarousels = useCallback(async (overrideTemplateId?: string, overrideColorId?: string) => {
    const renderStartTime = performance.now()
    console.log('🎨 [RENDERING START] CarouselImageGenerator.generateAllCarousels() called')
    console.log('   ⏱️ Timestamp:', new Date().toISOString())
    console.log('   📊 Carousels to render:', orderedCarousels.length)
    console.log('   🎨 Template:', overrideTemplateId ?? templateId)
    console.log('   🎨 Color Theme:', overrideColorId ?? colorThemeId)
    
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
    if (canvasRefs.current.length !== orderedCarousels.length) {
      canvasRefs.current = new Array(orderedCarousels.length).fill(null)
    }
    
    // Initialize array with correct length to maintain order
    const imageDataUrls: string[] = new Array(orderedCarousels.length).fill('')
    
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
      await generateCarouselImage(i, currentTemplate, currentColorTheme)
      
      const carouselEndTime = performance.now()
      const carouselDuration = carouselEndTime - carouselStartTime
      console.log(`   ✅ [CAROUSEL ${i + 1}/${orderedCarousels.length}] Generated in ${carouselDuration.toFixed(2)}ms`)
      
      // Save canvas to data URL at the specific index to maintain order
      const canvas = canvasRefs.current[i]
      if (canvas) {
        const dataUrlStartTime = performance.now()
        const dataUrl = canvas.toDataURL('image/png')
        const dataUrlDuration = performance.now() - dataUrlStartTime
        imageDataUrls[i] = dataUrl
        console.log(`      📸 Canvas toDataURL took: ${dataUrlDuration.toFixed(2)}ms`)
      } else {
        console.warn(`   ⚠️ Canvas not found for carousel ${i + 1}`)
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
    
    // Verify all images were generated
    const allImagesValid = imageDataUrls.every(img => img && img.startsWith('data:image/'))
    if (!allImagesValid) {
      console.error('❌ [RENDERING ERROR] Some images failed to generate')
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
    
    // Create full content hash (includes template/theme) for image matching - deterministic order
    const fullContentHash = JSON.stringify({ 
      ideaTitle, 
      carousels: orderedCarousels, 
      underlineWords: orderedUnderlineWords, 
      templateId: currentTemplateId, 
      colorThemeId: currentColorId
    })
    // Create content hash (only ideaTitle + carousels) for generation update detection
    const contentHash = JSON.stringify({ ideaTitle, carousels: orderedCarousels })
    
    // Save all images to localStorage with content hashes
    try {
      const imagesJson = JSON.stringify(imageDataUrls)
      const imagesSizeMB = (new Blob([imagesJson]).size / (1024 * 1024)).toFixed(2)
      console.log(`💾 Attempting to save ${imagesSizeMB}MB of image data to localStorage...`)
      
      localStorage.setItem('postGeneration_canvasImages', imagesJson)
      // Always update fullContentHash (includes design settings)
      localStorage.setItem('postGeneration_fullContentHash', fullContentHash)
      // Only update contentHash if generation_id doesn't exist (new generation)
      // If generation_id exists, keep the existing contentHash to allow updates
      if (!localStorage.getItem('postGeneration_generationId')) {
        localStorage.setItem('postGeneration_contentHash', contentHash)
      }
      // Store user ID to ensure localStorage is user-specific
      if (user?.id) {
        localStorage.setItem('postGeneration_userId', user.id)
      }
      console.log(`✅ Successfully saved ${imagesSizeMB}MB to localStorage`)
    } catch (error: any) {
      if (error.name === 'QuotaExceededError' || error.code === 22) {
        console.warn('⚠️ localStorage quota exceeded - images too large to cache locally')
        console.warn('   Images will still be displayed, but won\'t be cached for next visit')
        console.warn('   Consider clearing old localStorage data or using fewer carousels')
        
        // Try to save just the hash (for validation) without the images
        try {
          localStorage.setItem('postGeneration_fullContentHash', fullContentHash)
          if (!localStorage.getItem('postGeneration_generationId')) {
            localStorage.setItem('postGeneration_contentHash', contentHash)
          }
          if (user?.id) {
            localStorage.setItem('postGeneration_userId', user.id)
          }
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
    
    // Save to Supabase immediately after generation (always save, including design updates)
    let savedGenerationId: string | undefined
    if (user?.id && imageDataUrls.length > 0) {
      const isDataUrl = imageDataUrls[0]?.startsWith('data:image/')
      if (isDataUrl) {
        // Database save is part of rendering - don't notify parent
        // The rendering step will stay active until save completes
        const saveStartTime = performance.now()
        console.log('💾 [SAVE] Saving images to Supabase (design update or new generation)...')
        console.log('   ⏱️ Timestamp:', new Date().toISOString())
        try {
          savedGenerationId = await saveToDatabase(imageDataUrls)
          const saveEndTime = performance.now()
          console.log('✅ [SAVE] Images saved to Supabase successfully')
          console.log('   ⏱️ Save duration:', (saveEndTime - saveStartTime).toFixed(2), 'ms')
          console.log('   📝 Saved generationId:', savedGenerationId)
        } catch (err) {
          console.error('❌ [SAVE ERROR] Failed to save to Supabase:', err)
          savedGenerationId = undefined
        }
      }
    }
    
    const finalTime = performance.now()
    console.log('🎨 [RENDERING COMPLETE] Total end-to-end time:', (finalTime - renderStartTime).toFixed(2), 'ms')
    console.log('   ⏱️ Final timestamp:', new Date().toISOString())
    
    // Notify parent component that generation is complete with the generation ID
    // Only call if we have a valid generationId from database save
    // Don't navigate if save failed or didn't happen
    if (onGenerationComplete && savedGenerationId) {
      console.log('📞 Calling onGenerationComplete with generationId:', savedGenerationId)
      onGenerationComplete(savedGenerationId)
    } else if (onGenerationComplete && !savedGenerationId) {
      console.warn('⚠️ Database save did not return generationId - not calling onGenerationComplete')
      console.warn('   This prevents navigation to wrong page')
    } else if (!onGenerationComplete) {
      console.warn('⚠️ onGenerationComplete callback not provided')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carousels, ideaTitle, underlineWords, templateId, colorThemeId, user?.id])

  // Generate carousels if not loaded from storage
  useEffect(() => {
    // Check if cache should be skipped (e.g., when color theme changes)
    const skipCache = localStorage.getItem('postGeneration_skipCache') === 'true'
    
    if (orderedCarousels.length > 0 && (orderedCarouselImages.length === 0 || skipCache)) {
      // Generate if we don't have cached images OR if skipCache flag is set
      if (skipCache) {
        console.log('⏭️ Skip cache flag detected - forcing regeneration on mount')
      } else {
        console.log('Initial generation triggered')
      }
      generateAllCarousels().then(() => {
        // Mark as not initial mount after first generation completes
        isInitialMount.current = false
        // Update prevDesignSettings to current values so future changes are detected
        prevDesignSettings.current = { templateId, colorThemeId }
        console.log('Initial mount flag set to false, prevDesignSettings updated:', prevDesignSettings.current)
      })
    } else if (orderedCarousels.length > 0 && orderedCarouselImages.length > 0 && isInitialMount.current) {
      // If we have images from cache, mark as not initial mount
      isInitialMount.current = false
      // Update prevDesignSettings to current values so future changes are detected
      prevDesignSettings.current = { templateId, colorThemeId }
      console.log('Initial mount flag set to false (cached images), prevDesignSettings updated:', prevDesignSettings.current)
    }
  }, [orderedCarousels.length, orderedCarouselImages.length, generateAllCarousels])

  // Regenerate when design settings change (post initial mount)
  useEffect(() => {
    // Skip during initial mount; initial generation handles first render
    if (isInitialMount.current) return

    const prev = prevDesignSettings.current
    const hasChanged =
      prev.templateId !== templateId ||
      prev.colorThemeId !== colorThemeId

    if (!hasChanged) return

    console.log('🎨 Design change detected → regenerating', {
      from: prev,
      to: { templateId, colorThemeId }
    })

    const currentTemplateId = templateId
    const currentColorId = colorThemeId

    const wasDeducted = hasDeductedCredit.current
    hasDeductedCredit.current = true

    // Persist new full-content hash immediately
    try {
      localStorage.setItem(
        'postGeneration_fullContentHash',
        JSON.stringify({
          ideaTitle,
          carousels,
          underlineWords,
          templateId: currentTemplateId,
          colorThemeId: currentColorId
        })
      )
      // Store user ID to ensure localStorage is user-specific
      if (user?.id) {
        localStorage.setItem('postGeneration_userId', user.id)
      }
    } catch (error) {
      console.error('Error updating localStorage hash:', error)
    }

    const run = async () => {
      try {
        await generateAllCarousels(currentTemplateId, currentColorId)
        prevDesignSettings.current = {
          templateId: currentTemplateId,
          colorThemeId: currentColorId
        }
      } catch (error) {
        console.error('❌ Regeneration failed:', error)
      } finally {
        hasDeductedCredit.current = wasDeducted
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, colorThemeId])
  
  // Regenerate when carousel content changes (edits) - without deducting credits
  useEffect(() => {
    // Skip during initial mount; initial generation handles first render
    if (isInitialMount.current) {
      prevCarouselsContent.current = JSON.stringify(carousels)
      return
    }

    const currentCarouselsContent = JSON.stringify(carousels)
    const prevContent = prevCarouselsContent.current
    
    // Only regenerate if content changed but ideaTitle and length are the same (meaning it's an edit, not new note)
    if (currentCarouselsContent !== prevContent && carousels.length > 0) {
      // Check if this is a content edit (same ideaTitle, same length) vs new note
      const prevCarousels = JSON.parse(prevContent)
      const isContentEdit = prevCarousels.length === carousels.length && prevCarousels.length > 0
      
      if (isContentEdit) {
        console.log('📝 Carousel content edit detected → regenerating without deducting credits')
        
        // Preserve credit deduction state (don't deduct for edits)
        const wasDeducted = hasDeductedCredit.current
        hasDeductedCredit.current = true
        
        // Update hash for new content
        try {
          const fullContentHash = JSON.stringify({ 
            ideaTitle, 
            carousels, 
            underlineWords, 
            templateId, 
            colorThemeId
          })
          localStorage.setItem('postGeneration_fullContentHash', fullContentHash)
          // Store user ID to ensure localStorage is user-specific
          if (user?.id) {
            localStorage.setItem('postGeneration_userId', user.id)
          }
        } catch (error) {
          console.error('Error updating localStorage hash:', error)
        }
        
        // Debounce regeneration to avoid regenerating on every keystroke
        const timeoutId = setTimeout(async () => {
          try {
            await generateAllCarousels()
            // Only update prevCarouselsContent after successful regeneration
            prevCarouselsContent.current = JSON.stringify(carousels)
          } catch (error) {
            console.error('❌ Regeneration failed:', error)
          } finally {
            hasDeductedCredit.current = wasDeducted
          }
        }, 500) // 500ms debounce
        
        return () => clearTimeout(timeoutId)
      } else {
        // Not a content edit (length changed or new note) - update immediately
        prevCarouselsContent.current = currentCarouselsContent
      }
    } else {
      // No content change - keep prevCarouselsContent in sync
      prevCarouselsContent.current = currentCarouselsContent
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carousels, ideaTitle, underlineWords, templateId, colorThemeId])
  
  // Reset credit deduction flag when carousels change (new note)
  // Note: Design settings (templateId, colorThemeId) are NOT in dependencies
  // because changing styles should NOT reset credits - credits should only reset for new content
  useEffect(() => {
    // Check if credits were already deducted for this ideaTitle (not content hash)
    // Credits should be deducted once per ideaTitle, not once per content version
    try {
      const storedGenerationId = localStorage.getItem('postGeneration_generationId')
      const storedIdeaTitle = localStorage.getItem('postGeneration_ideaTitle')
      // If generationId exists and ideaTitle matches, credits were already deducted for this idea
      // (regardless of content edits)
      if (storedGenerationId && storedIdeaTitle === ideaTitle) {
        console.log('✅ Credits already deducted for this ideaTitle (found generationId on reset)', ideaTitle)
        hasDeductedCredit.current = true
      } else {
        // New ideaTitle - reset credit deduction flag
        hasDeductedCredit.current = false
        // Clear stored ideaTitle if it's a new idea
        if (storedIdeaTitle !== ideaTitle) {
          try {
            localStorage.removeItem('postGeneration_ideaTitle')
          } catch (error) {
            console.error('Error clearing ideaTitle:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error checking credit deduction status on reset:', error)
      hasDeductedCredit.current = false
    }
    isInitialMount.current = true
    hasInitialized.current = false
    // Reset design settings tracking with current values
    prevDesignSettings.current = { templateId, colorThemeId }
    // Reset carousel content tracking
    prevCarouselsContent.current = JSON.stringify(carousels)
    console.log('🔄 Reset for new note, prevDesignSettings:', prevDesignSettings.current)
  }, [ideaTitle, carousels.length])

  const loadImage = (src: string, timeout = 30000): Promise<HTMLImageElement> => {
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

  const loadFonts = async (template: typeof TEMPLATE, timeout = 30000) => {
    try {
      // Load fonts from template with timeout to prevent indefinite waiting
      // Use display: 'swap' to ensure fonts load even in background tabs
      const fontFaces: FontFace[] = []
      const fontPromises: Promise<FontFace>[] = []
      
      const hookFont = new FontFace(template.fonts.hook.family, `url(${template.fonts.hook.file})`, {
        weight: template.fonts.hook.weight,
        style: template.fonts.hook.style,
        display: 'swap' // Ensure fonts load even in background tabs
      })
      fontFaces.push(hookFont)
      fontPromises.push(hookFont.load())
      
      const titleFont = new FontFace(template.fonts.title.family, `url(${template.fonts.title.file})`, {
        weight: template.fonts.title.weight,
        style: template.fonts.title.style,
        display: 'swap'
      })
      fontFaces.push(titleFont)
      fontPromises.push(titleFont.load())
      
      const contentFont = new FontFace(template.fonts.content.family, `url(${template.fonts.content.file})`, {
        weight: template.fonts.content.weight,
        style: template.fonts.content.style,
        display: 'swap'
      })
      fontFaces.push(contentFont)
      fontPromises.push(contentFont.load())
      
      // Load additional fonts for template 3 (hookTopic, hookSubtitle, hookCTA)
      if (template.fonts.hookTopic) {
        const hookTopicFont = new FontFace(template.fonts.hookTopic.family, `url(${template.fonts.hookTopic.file})`, {
          weight: template.fonts.hookTopic.weight,
          style: template.fonts.hookTopic.style,
          display: 'swap'
        })
        fontFaces.push(hookTopicFont)
        fontPromises.push(hookTopicFont.load())
      }
      
      if (template.fonts.hookSubtitle) {
        const hookSubtitleFont = new FontFace(template.fonts.hookSubtitle.family, `url(${template.fonts.hookSubtitle.file})`, {
          weight: template.fonts.hookSubtitle.weight,
          style: template.fonts.hookSubtitle.style,
          display: 'swap'
        })
        fontFaces.push(hookSubtitleFont)
        fontPromises.push(hookSubtitleFont.load())
      }
      
      if (template.fonts.hookCTA) {
        const hookCTAFont = new FontFace(template.fonts.hookCTA.family, `url(${template.fonts.hookCTA.file})`, {
          weight: template.fonts.hookCTA.weight,
          style: template.fonts.hookCTA.style,
          display: 'swap'
        })
        fontFaces.push(hookCTAFont)
        fontPromises.push(hookCTAFont.load())
      }
      
      // Load all fonts in parallel
      // In background tabs, browsers may throttle this, but it will still complete (just slower)
      // Use Promise.allSettled to continue even if some fonts fail to load
      const loadResults = await Promise.allSettled(fontPromises)
      
      // Add successfully loaded fonts to document
      let loadedCount = 0
      loadResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          try {
            document.fonts.add(result.value)
            loadedCount++
          } catch (error) {
            console.warn('⚠️ Failed to add font to document:', fontFaces[index]?.family, error)
          }
        } else {
          console.warn('⚠️ Font failed to load:', fontFaces[index]?.family, result.reason)
        }
      })
      
      if (loadedCount === fontFaces.length) {
        console.log('✅ All fonts loaded successfully')
      } else {
        console.log(`⚠️ ${loadedCount}/${fontFaces.length} fonts loaded, continuing with available fonts`)
      }
      
      console.log('✓ Template fonts loaded successfully')
    } catch (error) {
      console.warn('⚠️  Failed to load template fonts, using fallback:', error)
      // Continue rendering even if fonts fail to load (browser will use fallback fonts)
    }
  }

  const generateCarouselImage = async (
    index: number, 
    template = TEMPLATE, 
    colorTheme = COLOR_THEME
  ) => {
    const carouselImageStartTime = performance.now()
    const canvas = canvasRefs.current[index]
    if (!canvas) {
      console.warn(`      ⚠️ Canvas not found for carousel ${index + 1}`)
      return
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

    // Load fonts before rendering
    if (index === 0) {
      const fontLoadStart = performance.now()
      console.log(`      🔤 Loading fonts for template ${template.id}...`)
      await loadFonts(template)
      console.log(`      ⏱️ Font loading took: ${(performance.now() - fontLoadStart).toFixed(2)}ms`)
    }

    // Instagram note dimensions (4:5 ratio)
    const width = 1080
    const height = 1350
    canvas.width = width
    canvas.height = height

    // Draw template background or fallback to white
    const backgroundConfig = template.background
    if (backgroundConfig?.type === 'image') {
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

    // Safe area (avoiding Instagram UI elements)
    const originalSafeMarginTop = 150
    const originalSafeMarginBottom = 150
    const safeMarginSides = 100
    
    let safeMarginTop = originalSafeMarginTop
    let safeMarginBottom = originalSafeMarginBottom
    
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
      safeMarginBottom = originalSafeMarginBottom + 150 // 150 + 150 = 300px total safe margin at bottom
    }
    
    const safeWidth = width - (safeMarginSides * 2)
    const safeHeight = height - safeMarginTop - safeMarginBottom

    const getLineStartX = (align: CanvasTextAlign, lineWidth: number): number => {
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

    const highlightFillStyle = ensureColorAlpha(colorTheme.highlightColor, 0.5)

    if (cleanCarousel.kind === 'HOOK') {
      // Check if this template uses the new hook layout (template 3)
      if (template.hookLayout?.showTopic || template.hookLayout?.showSubtitle || template.hookLayout?.showCTA) {
        // NEW TEMPLATE 3 LAYOUT: topic (at top), title (centered), subtitle, CTA with colored box and arrow
        const topicText = cleanCarousel.topic || ''
        const titleText = cleanCarousel.title || ''
        const subtitleText = cleanCarousel.subtitle || ''
        const ctaText = cleanCarousel.cta || ''

        const hookLetterSpacing = getLetterSpacingFor('hook')
        
        // 1. Render TOPIC at the very top middle (all caps) - using topic from JSON
        if (template.hookLayout.showTopic && topicText && template.fonts.hookTopic) {
          ctx.font = template.fonts.hookTopic.cssFont
          ctx.fillStyle = colorTheme.primaryColor
          ctx.textAlign = 'left'
          const topicLetterSpacing = getLetterSpacingFor('hookTopic')
          const topicValue = topicText.toUpperCase()
          const topicWidth = measureTextWithLetterSpacing(ctx, topicValue, topicLetterSpacing)
          const topicX = (width - topicWidth) / 2
          // Use ORIGINAL safe margin for consistent positioning across all slides
          const topicY = originalSafeMarginTop + template.fonts.hookTopic.size
          drawTextWithLetterSpacing(ctx, topicValue, topicX, topicY, topicLetterSpacing)
        }

        // 2. Calculate and render HOOK TITLE (entirely vertically and horizontally middle)
        let hookWrappedLines: string[] = []
        if (titleText) {
          ctx.font = template.fonts.hook.cssFont
          const words = titleText.split(' ')
          let currentLine = ''

          for (const word of words) {
            const testLine = currentLine ? `${currentLine} ${word}` : word
            const lineWidth = measureTextWithLetterSpacing(ctx, testLine, hookLetterSpacing)

            if (lineWidth > safeWidth && currentLine) {
              hookWrappedLines.push(currentLine)
              currentLine = word
            } else {
              currentLine = testLine
            }
          }
          if (currentLine) hookWrappedLines.push(currentLine)

          // Calculate total hook height
          const hookTotalHeight = hookWrappedLines.length * template.fonts.hook.lineHeight
          
          // Start Y position to center the hook title vertically
          let hookY = safeMarginTop + (safeHeight / 2) - (hookTotalHeight / 2) + template.fonts.hook.size

          ctx.font = template.fonts.hook.cssFont
          ctx.fillStyle = colorTheme.textColor
          ctx.textAlign = 'left'

          hookWrappedLines.forEach(line => {
            const lineWidth = measureTextWithLetterSpacing(ctx, line, hookLetterSpacing)
            const lineX = (width - lineWidth) / 2
            drawTextWithLetterSpacing(ctx, line, lineX, hookY, hookLetterSpacing)
            hookY += template.fonts.hook.lineHeight
          })
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
          ctx.fillStyle = boxConfig.useThemeColor ? colorTheme.primaryColor : colorTheme.textColor
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
          ctx.fillStyle = colorTheme.textColor
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
        // ORIGINAL HOOK LAYOUT (templates 1 & 2): Simple centered hook with highlight
      const hookText = cleanCarousel.title || cleanCarousel.content
        const hookLetterSpacing = getLetterSpacingFor('hook')
        const hookAlign = getTextAlignFor('hook')
      
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

      for (let i = 0; i < 8; i++) {
        if (hookLayout.maxWidth <= safeWidth && hookLayout.totalHeight <= safeHeight) {
          break
        }

        const widthScale = safeWidth / hookLayout.maxWidth
        const heightScale = safeHeight / hookLayout.totalHeight
        const scale = Math.max(0.5, Math.min(0.95, Math.min(widthScale, heightScale)))

        const nextSize = Math.max(hookBaseFontSize * 0.5, Math.floor(hookFontSize * scale))
        if (Math.abs(nextSize - hookFontSize) < 1) {
          hookFontSize = Math.max(hookBaseFontSize * 0.5, hookFontSize - 2)
        } else {
          hookFontSize = nextSize
        }

        hookLayout = wrapHookText(hookFontSize)
      }

      const hookLineHeight = hookLayout.lineHeight
      const hookLines = hookLayout.lines
      const hookTotalHeight = hookLayout.totalHeight
      const highlightOffset = hookFontSize * highlightOffsetRatio
      const highlightHeight = hookFontSize * highlightHeightRatio

      ctx.font = buildHookFont(hookFontSize)
      ctx.fillStyle = colorTheme.textColor
      ctx.textAlign = 'left'

      // Get highlight word
      const emphasisData = orderedUnderlineWords[index] || { underline: '', highlight: '' }
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
      
      // Start Y position - center the entire text block
      let y = centerY - (hookTotalHeight / 2) + (hookLines.length > 0 ? hookFontSize : 0)
      const spaceWidth = ctx.measureText(' ').width
      
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
            ctx.fillStyle = highlightFillStyle
            ctx.fillRect(bgX, bgY, cleanedWidth, highlightHeight)
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
          ctx.fillStyle = colorTheme.textColor
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

      ctx.font = template.fonts.content.cssFont
      ctx.fillStyle = colorTheme.textColor
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
      
      const emphasisData = orderedUnderlineWords[index] || { underline: '', highlight: '' }
      const underlinePhrases = emphasisData.underline.split(',').map((p: string) => p.trim()).filter((p: string) => p)
      
      const spaceWidth = ctx.measureText(' ').width
      const lineHeight = template.fonts.content.lineHeight
      const totalHeight = (lines.length - 1) * lineHeight
      let y = centerY - (totalHeight / 2)
      
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
      if (template.id === 'template3' && template.fonts.hookSubtitle) {
        const subtitleText = carousels[0]?.subtitle || '' // Get subtitle from HOOK slide
        if (subtitleText) {
          ctx.font = template.fonts.hookSubtitle.cssFont
          ctx.fillStyle = colorTheme.textColor
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
      
      const emphasisData = orderedUnderlineWords[index] || { underline: '', highlight: '', imageUrl: null, originalImageUrl: null }
      
      if (cleanCarousel.kind === 'MIDDLE') {
        console.log(`\n🖼️ Carousel ${index + 1} Image Check:`)
        console.log('  Emphasis data:', emphasisData)
        console.log('  imageUrl present?', !!emphasisData.imageUrl)
        console.log('  originalImageUrl present?', !!emphasisData.originalImageUrl)
        console.log('  imageUrl value:', emphasisData.imageUrl)
        console.log('  originalImageUrl value:', emphasisData.originalImageUrl)
      }
      
      let rawImageUrl = emphasisData.imageUrl || emphasisData.originalImageUrl || null
      
      // Route pollinations.ai images through proxy to avoid CORS issues
      // The proxy fetches the image server-side and serves it with proper CORS headers
      let imageSourceUrl: string | null = null
      if (rawImageUrl) {
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
          // Make photo container 30% smaller for template 3
          const sizeMultiplier = template.id === 'template3' ? 0.7 : 1.0
          imageWidth = Math.round(safeWidth * sizeMultiplier)
          imageHeight = Math.round(imageWidth * 9 / 16)
          console.log(`      ✅ Image loaded! Dimensions: ${loadedImage.width}x${loadedImage.height}`)
        } catch (error) {
          console.error(`❌ Carousel ${index + 1}: Failed to pre-load image:`, error)
          console.error(`   Image URL was:`, imageSourceUrl)
        }
      } else if (cleanCarousel.kind === 'MIDDLE') {
        console.warn(`⚠️ Carousel ${index + 1}: No imageUrl in emphasisData for MIDDLE carousel!`)
        console.warn(`   This might mean images weren't fetched from Pexels or includeImages was false`)
      }
      
      // Dynamic spacing with minimums - template 3 needs much tighter spacing
      const minTitleContentGap = template.id === 'template3' ? 20 : 20
      const minImageGap = template.id === 'template3' ? 20 : 20
      const maxTitleContentGap = template.id === 'template3' ? 40 : 70
      const maxImageGap = template.id === 'template3' ? 30 : 40
      
      const buildTitleFont = (size: number) => template.fonts.title.cssFont.replace(/(\d+\.?\d*)px/, `${size}px`)
      const buildContentFont = (size: number) => template.fonts.content.cssFont.replace(/(\d+\.?\d*)px/, `${size}px`)

      let titleFontSize = template.fonts.title.size
      let titleLineHeight = template.fonts.title.lineHeight
      let contentFontSize = template.fonts.content.size
      let contentLineHeight = template.fonts.content.lineHeight
      let titleContentGap = Math.max(maxTitleContentGap, minTitleContentGap)
      let imageGap = imageHeight > 0 ? Math.max(maxImageGap, minImageGap) : 0
      
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
        
        const titleLH = titleSize * 1.2
        const contentLH = contentSize * 1.27
        
        const titleH = wrappedTitle.length > 0 
          ? titleSize + (wrappedTitle.length - 1) * titleLH + (titleSize * 0.2)
          : 0
        const contentH = wrappedContent.length > 0
          ? contentSize + (wrappedContent.length - 1) * contentLH + (contentSize * 0.2)
          : 0
        const total = titleH + titleContentGap + contentH + imageGap + imageHeight
        
        return {
          titleLines: wrappedTitle,
          contentLines: wrappedContent,
          titleLineHeight: titleLH,
          contentLineHeight: contentLH,
          totalHeight: total
        }
      }
      
      let layout = calculateLayout(titleFontSize, contentFontSize)
      
      // For template 3 MIDDLE slides, calculate actual available space between topic and page number
      let effectiveSafeHeight = safeHeight
      if (template.id === 'template3' && cleanCarousel.kind === 'MIDDLE') {
        // Topic bottom: originalSafeMarginTop + topicFontSize + 100px spacing
        const topicBottomY = originalSafeMarginTop + (template.fonts.hookTopic ? template.fonts.hookTopic.size + 100 : 0)
        // Page number box: at Y=1140 (height 1350 - 150 - 60)
        // Content MUST end by Y=1050 to have 90px buffer above page number
        const pageNumberTopY = height - originalSafeMarginBottom - 60 - 90 // 90px spacing above box
        effectiveSafeHeight = pageNumberTopY - topicBottomY
        console.log(`   Template 3 MIDDLE: Available height=${effectiveSafeHeight}px (topic ends at ${topicBottomY}, page number starts at ${pageNumberTopY})`)
      }
      
      if (layout.totalHeight > effectiveSafeHeight) {
        console.log(`⚠️  Content too long (${layout.totalHeight}px > ${effectiveSafeHeight}px), scaling down...`)
        
        // Step 1: Reduce spacing to minimums
        titleContentGap = minTitleContentGap
        imageGap = imageHeight > 0 ? minImageGap : 0
        
        layout = calculateLayout(titleFontSize, contentFontSize)
        
        if (layout.totalHeight > effectiveSafeHeight) {
          // Step 2: For template 3, aggressively reduce image size first
          if (template.id === 'template3' && imageHeight > 0) {
            // Calculate how much we need to reduce
            const excessHeight = layout.totalHeight - effectiveSafeHeight
            const imageContribution = imageHeight + imageGap
            
            // Reduce image by proportion of excess, but at least 50%
            const reductionNeeded = Math.min(0.5, excessHeight / imageContribution)
            const imageReductionFactor = Math.max(0.4, 1 - reductionNeeded) // Keep at least 40% of image
            
            imageHeight = Math.floor(imageHeight * imageReductionFactor)
            imageWidth = Math.floor(imageWidth * imageReductionFactor)
            console.log(`   Reducing image size by ${Math.round((1 - imageReductionFactor) * 100)}%: ${imageWidth}x${imageHeight}`)
            
            layout = calculateLayout(titleFontSize, contentFontSize)
          }
          
          // Step 3: Scale fonts dynamically if still too large
          if (layout.totalHeight > effectiveSafeHeight) {
            scaleFactor = effectiveSafeHeight / layout.totalHeight
            scaleFactor = Math.max(0.35, Math.min(0.95, scaleFactor)) // Allow very aggressive scaling down to 35%
            
            titleFontSize = Math.floor(template.fonts.title.size * scaleFactor)
            contentFontSize = Math.floor(template.fonts.content.size * scaleFactor)
            
            console.log(`   Scaling fonts: title ${titleFontSize}px, content ${contentFontSize}px (${Math.round(scaleFactor * 100)}%)`)
            
            layout = calculateLayout(titleFontSize, contentFontSize)
            
            // Step 4: If STILL too large for template 3, reduce image more
            if (layout.totalHeight > effectiveSafeHeight && template.id === 'template3' && imageHeight > 0) {
              const secondReductionFactor = 0.5 // Cut image in half again
              imageHeight = Math.floor(imageHeight * secondReductionFactor)
              imageWidth = Math.floor(imageWidth * secondReductionFactor)
              console.log(`   Further reducing image size: ${imageWidth}x${imageHeight}`)
              
              layout = calculateLayout(titleFontSize, contentFontSize)
            }
          }
          
          if (layout.totalHeight > effectiveSafeHeight) {
            console.warn(`⚠️  WARNING: Content still exceeds safe height even at minimum scale!`)
            console.warn(`   Total: ${Math.round(layout.totalHeight)}px, Safe: ${effectiveSafeHeight}px`)
            console.warn(`   Consider reducing content length`)
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
      
      // For template 3 MIDDLE slides, center the title+content+image vertically (between topic and page number)
      let y: number
      
      if (template.id === 'template3' && cleanCarousel.kind === 'MIDDLE') {
        // Calculate available vertical space (between topic and page number)
        const topicBottomY = originalSafeMarginTop + (template.fonts.hookTopic ? template.fonts.hookTopic.size + 100 : 0)
        // Page number box: at height - 150 - 60, with 90px spacing above it
        const pageNumberTopY = height - originalSafeMarginBottom - 60 - 90
        const availableHeight = pageNumberTopY - topicBottomY
        
        // Calculate total content height (title + content + image)
        const titleH = titleLines.length > 0 
          ? titleFontSize + (titleLines.length - 1) * titleLineHeight + (titleFontSize * 0.2)
          : 0
        const contentH = contentLines.length > 0
          ? contentFontSize + (contentLines.length - 1) * contentLineHeight + (contentFontSize * 0.2)
          : 0
        const totalContentHeight = titleH + titleContentGap + contentH + imageGap + imageHeight
        
        // Center everything vertically within available space
        y = topicBottomY + (availableHeight - totalContentHeight) / 2 + titleFontSize
        
        console.log(`   Centering: topicBottom=${topicBottomY}, pageNumberTop=${pageNumberTopY}, contentHeight=${Math.round(totalContentHeight)}, startY=${Math.round(y)}, endY=${Math.round(y + totalContentHeight - titleFontSize)}`)
      } else {
        y = centerY - (totalHeight / 2) + firstLineFontSize
      }
        
      ctx.font = buildTitleFont(titleFontSize)
        ctx.fillStyle = colorTheme.textColor

        titleLines.forEach(line => {
        const lineWidth = measureTextWithLetterSpacing(ctx, line, titleLetterSpacing)
        const startX = getLineStartX(titleAlign, lineWidth)
        drawTextWithLetterSpacing(ctx, line, startX, y, titleLetterSpacing)
          y += titleLineHeight
        })
        
        y += titleContentGap
        
      ctx.font = buildContentFont(contentFontSize)
        ctx.fillStyle = colorTheme.textColor
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
              
              ctx.fillStyle = highlightFillStyle
            ctx.fillRect(tempX + leadingWidth, y - contentFontSize * 0.91, cleanedWidth, contentFontSize * 1.09)
          }

          const wordWidth = measureTextWithLetterSpacing(ctx, word, contentLetterSpacing)
          tempX += wordWidth
          if (wordIndex < words.length - 1) {
            tempX += spaceWidth
          }
        })

        let currentX = startX
          words.forEach((word, wordIndex) => {
            ctx.fillStyle = colorTheme.textColor
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
        
        if (loadedImage && imageWidth > 0 && imageHeight > 0) {
          try {
            console.log(`\n🖼️  Rendering pre-loaded image for carousel ${index + 1}`)
            console.log(`   Image dimensions: ${loadedImage.width}x${loadedImage.height}`)
            console.log(`   Target size: ${imageWidth}x${imageHeight}`)
            console.log(`   Y position: ${y}`)
            
            y += imageGap
            
            // Center the image horizontally for template 3
            const imageX = template.id === 'template3' ? (width - imageWidth) / 2 : safeMarginSides
            
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
            ctx.moveTo(imageX + borderRadius, y)
            ctx.lineTo(imageX + imageWidth - borderRadius, y)
            ctx.quadraticCurveTo(imageX + imageWidth, y, imageX + imageWidth, y + borderRadius)
            ctx.lineTo(imageX + imageWidth, y + imageHeight - borderRadius)
            ctx.quadraticCurveTo(imageX + imageWidth, y + imageHeight, imageX + imageWidth - borderRadius, y + imageHeight)
            ctx.lineTo(imageX + borderRadius, y + imageHeight)
            ctx.quadraticCurveTo(imageX, y + imageHeight, imageX, y + imageHeight - borderRadius)
            ctx.lineTo(imageX, y + borderRadius)
            ctx.quadraticCurveTo(imageX, y, imageX + borderRadius, y)
            ctx.closePath()
            ctx.clip()
            
            ctx.drawImage(
              loadedImage,
            sx, sy, sWidth, sHeight,
            imageX, y, imageWidth, imageHeight
            )
            ctx.restore()
            
            console.log(`✅ Image successfully drawn on canvas for carousel ${index + 1}!`)
            console.log(`   Final position: (${imageX}, ${y}), Size: ${imageWidth}x${imageHeight}`)
          } catch (error) {
            console.error(`❌ Failed to render image for carousel ${index + 1}:`, error)
            console.error(`   Error details:`, error)
          }
        } else if (cleanCarousel.kind === 'MIDDLE') {
          console.warn(`⚠️ Carousel ${index + 1}: Image not drawn - loadedImage=${!!loadedImage}, imageWidth=${imageWidth}, imageHeight=${imageHeight}`)
          if (!loadedImage && imageSourceUrl) {
            console.warn(`   Image URL exists but failed to load:`, imageSourceUrl)
          }
        }
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
    
    const carouselImageEndTime = performance.now()
    const carouselImageDuration = carouselImageEndTime - carouselImageStartTime
    console.log(`      ✅ Carousel ${index + 1} complete! Total time: ${carouselImageDuration.toFixed(2)}ms`)
  }  // Close generateCarouselImage function

  const downloadCarousel = (index: number) => {
    const imageDataUrl = orderedCarouselImages[index]
    if (!imageDataUrl) return

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
          setTimeout(() => {
            downloadCarousel(i)
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
        const imageDataUrl = orderedCarouselImages[i]
        if (!imageDataUrl) continue
        
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
                minWidth: '400px',
                maxWidth: '400px',
                flex: '0 0 400px',
                flexShrink: 0
              }}>
              <div style={{ 
                position: 'relative',
                paddingBottom: '125%', // 4:5 aspect ratio
                background: '#ffffff',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '12px'
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
                      background: 'rgba(229, 229, 229, 0.9)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      color: '#4a4a4a',
                      fontSize: '13px',
                      fontWeight: 500,
                      zIndex: 2
                    }}
                  >
                    <span className="spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
                    <span>Preparing slide...</span>
                  </div>
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
          gap: '12px',
          padding: '16px 0 16px 0',
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
                width: '64px',
                height: '80px',
                borderRadius: '12px',
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
                    fontSize: '24px',
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


