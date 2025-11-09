'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getFontCombination, getColorTheme } from '../config/carouselThemes'
import { useAuth } from '../context/AuthContext'
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

interface Carousel {
  title: string
  content: string
  kind: 'HOOK' | 'MIDDLE' | 'CTA'
}

interface Props {
  carousels: Carousel[]
  ideaTitle: string
  underlineWords?: Record<number, { underline: string; highlight: string; imageUrl?: string | null }>
  fontCombinationId?: string
  colorThemeId?: string
  accountDescription?: string
  caption?: string
  backgroundImageUrl?: string | null
  onGenerationComplete?: () => void
}

// Initialize images from localStorage before rendering
const getInitialImages = (carousels: Carousel[], ideaTitle: string, underlineWords: Record<number, any>, fontCombinationId: string, colorThemeId: string, backgroundImageUrl: string | null): string[] => {
  try {
    const savedImages = localStorage.getItem('postGeneration_canvasImages')
    const savedFullContentHash = localStorage.getItem('postGeneration_fullContentHash')
    const savedContentHash = localStorage.getItem('postGeneration_contentHash')
    const savedHash = savedFullContentHash || savedContentHash
    
    // Create deterministic hash with consistent property order
    const currentFullContentHash = JSON.stringify({ 
      ideaTitle, 
      carousels, 
      underlineWords, 
      fontCombinationId, 
      colorThemeId, 
      backgroundImageUrl: backgroundImageUrl || null 
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
    }
  } catch (error) {
    console.error('Error loading images from localStorage:', error)
  }
  return []
}

export default function CarouselImageGenerator({ 
  carousels, 
  ideaTitle, 
  underlineWords = {},
  fontCombinationId = 'combination-1',
  colorThemeId = 'black',
  accountDescription = '',
  caption = '',
  backgroundImageUrl = null,
  onGenerationComplete
}: Props) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const [generating, setGenerating] = useState(false)
  const [carouselImages, setCarouselImages] = useState<string[]>(() => 
    getInitialImages(carousels, ideaTitle, underlineWords, fontCombinationId, colorThemeId, backgroundImageUrl)
  )
  // Keep previous images visible during regeneration to prevent layout shifts
  const initialImages = getInitialImages(carousels, ideaTitle, underlineWords, fontCombinationId, colorThemeId, backgroundImageUrl)
  const previousImagesRef = useRef<string[]>(initialImages)
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
  const prevDesignSettings = useRef<{ fontCombinationId: string; colorThemeId: string; backgroundImageUrl: string | null }>({
    fontCombinationId,
    colorThemeId,
    backgroundImageUrl
  })
  const hasInitialized = useRef(false)
  // Track previous carousel content for detecting edits
  const prevCarouselsContent = useRef<string>(JSON.stringify(carousels))
  
  // Debug: Log background image URL
  useEffect(() => {
    console.log('Background image URL prop changed:', backgroundImageUrl)
  }, [backgroundImageUrl])
  
  // Use refs for values that should not trigger re-renders when changed
  const accountDescriptionRef = useRef(accountDescription)
  const captionRef = useRef(caption)
  
  // Update refs when props change
  useEffect(() => {
    accountDescriptionRef.current = accountDescription
    captionRef.current = caption
  }, [accountDescription, caption])

  // Get selected font combination and color theme
  const FONT_CONFIG = getFontCombination(fontCombinationId)
  const COLOR_THEME = getColorTheme(colorThemeId)


  // Auto-save function
  const saveToDatabase = useCallback(async (imageDataUrls: string[]) => {
    if (!user?.id) {
      console.warn('Cannot save: user not authenticated')
      return
    }

    if (imageDataUrls.length === 0) {
      console.warn('Cannot save: no images to save')
      return
    }

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
      
      console.log('💾 Saving generation to database...', {
        ideaTitle,
        generationId: generationIdToSend || 'new',
        carouselsCount: carousels.length,
        imagesCount: imageDataUrls.length,
        note: 'Backend will update existing entry if same ideaTitle exists'
      })

      const response = await fetch('/api/generations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          generationId: generationIdToSend,
          ideaTitle,
          accountDescription: accountDescriptionRef.current,
          slides: carousels,
          caption: captionRef.current,
          underlineWords,
          fontCombinationId,
          colorThemeId,
          images: imageDataUrls
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('❌ Failed to auto-save generation:', errorData.error)
        throw new Error(errorData.error || 'Failed to save generation')
      } else {
        const result = await response.json()
        const returnedGenerationId = result.generationId
        
        // Store generation_id, content hash, and ideaTitle in localStorage
        localStorage.setItem('postGeneration_generationId', returnedGenerationId)
        localStorage.setItem('postGeneration_contentHash', currentContentHash)
        localStorage.setItem('postGeneration_ideaTitle', ideaTitle)
        
        if (result.isUpdate) {
          console.log('✅ Generation updated in history (same ideaTitle):', returnedGenerationId)
        } else {
          console.log('✅ Generation auto-saved to history (new ideaTitle):', returnedGenerationId)
        }
      }
    } catch (error: any) {
      console.error('❌ Error auto-saving generation:', error.message || error)
    }
  }, [ideaTitle, carousels, underlineWords, fontCombinationId, colorThemeId, backgroundImageUrl, user?.id])

  const generateAllCarousels = useCallback(async (overrideFontId?: string, overrideColorId?: string, overrideBgUrl?: string | null) => {
    setGenerating(true)
    
    // Use override values if provided (for design changes), otherwise use current props
    const currentFontId = overrideFontId ?? fontCombinationId
    const currentColorId = overrideColorId ?? colorThemeId
    const currentBgUrl = overrideBgUrl !== undefined ? overrideBgUrl : backgroundImageUrl
    
    // Compute configs with current values
    const currentFontConfig = getFontCombination(currentFontId)
    const currentColorTheme = getColorTheme(currentColorId)
    
    // Ensure canvasRefs array has correct length
    if (canvasRefs.current.length !== carousels.length) {
      canvasRefs.current = new Array(carousels.length).fill(null)
    }
    
    // Initialize array with correct length to maintain order
    const imageDataUrls: string[] = new Array(carousels.length).fill('')
    
    // Generate all carousels first without updating state (prevents layout shifts)
    for (let i = 0; i < carousels.length; i++) {
      await generateCarouselImage(i, currentFontConfig, currentColorTheme, currentBgUrl)
      // Save canvas to data URL at the specific index to maintain order
      const canvas = canvasRefs.current[i]
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png')
        imageDataUrls[i] = dataUrl
        console.log(`✅ Generated carousel ${i + 1}/${carousels.length}`)
      } else {
        console.warn(`⚠️ Canvas not found for carousel ${i + 1}`)
      }
    }
    
    // Verify all images were generated
    const allImagesValid = imageDataUrls.every(img => img && img.startsWith('data:image/'))
    if (!allImagesValid) {
      console.error('❌ Some images failed to generate')
    } else {
      console.log('✅ All', imageDataUrls.length, 'carousels generated successfully')
    }
    
    // Batch update all images at once to prevent layout shifts
    // Preserve old images in ref before updating
    setCarouselImages(prev => {
      previousImagesRef.current = prev.length > 0 ? [...prev] : []
      return imageDataUrls
    })
    
    // Create full content hash (includes theme/font) for image matching - deterministic order
    const fullContentHash = JSON.stringify({ 
      ideaTitle, 
      carousels, 
      underlineWords, 
      fontCombinationId: currentFontId, 
      colorThemeId: currentColorId, 
      backgroundImageUrl: currentBgUrl || null 
    })
    // Create content hash (only ideaTitle + carousels) for generation update detection
    const contentHash = JSON.stringify({ ideaTitle, carousels })
    
    // Save all images to localStorage with content hashes
    try {
      localStorage.setItem('postGeneration_canvasImages', JSON.stringify(imageDataUrls))
      // Always update fullContentHash (includes design settings)
      localStorage.setItem('postGeneration_fullContentHash', fullContentHash)
      // Only update contentHash if generation_id doesn't exist (new generation)
      // If generation_id exists, keep the existing contentHash to allow updates
      if (!localStorage.getItem('postGeneration_generationId')) {
        localStorage.setItem('postGeneration_contentHash', contentHash)
      }
    } catch (error) {
      console.error('Error saving images to localStorage:', error)
    }
    
    // Deduct credit when carousels are generated (only once per note generation)
    if (user?.id && !hasDeductedCredit.current) {
      try {
        const deductResponse = await fetch('/api/credits/deduct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
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
    
    // Save to Supabase immediately after generation (always save, including design updates)
    if (user?.id && imageDataUrls.length > 0) {
      const isDataUrl = imageDataUrls[0]?.startsWith('data:image/')
      if (isDataUrl) {
        console.log('💾 Saving images to Supabase (design update or new generation)...')
        try {
          await saveToDatabase(imageDataUrls)
          console.log('✅ Images saved to Supabase successfully')
        } catch (err) {
          console.error('❌ Failed to save to Supabase:', err)
        }
      }
    }
    
    // Notify parent component that generation is complete
    if (onGenerationComplete) {
      onGenerationComplete()
    }
  }, [carousels, ideaTitle, underlineWords, fontCombinationId, colorThemeId, backgroundImageUrl, user?.id, refreshCredits, onGenerationComplete, saveToDatabase])

  // Generate carousels if not loaded from storage
  useEffect(() => {
    if (carousels.length > 0 && carouselImages.length === 0) {
      // Only generate if we don't have cached images
      console.log('Initial generation triggered')
      generateAllCarousels().then(() => {
        // Mark as not initial mount after first generation completes
        isInitialMount.current = false
        console.log('Initial mount flag set to false')
      })
    } else if (carousels.length > 0 && carouselImages.length > 0 && isInitialMount.current) {
      // If we have images from cache, mark as not initial mount
      isInitialMount.current = false
      console.log('Initial mount flag set to false (cached images)')
    }
  }, [carousels.length, carouselImages.length, generateAllCarousels])

  // Regenerate when design settings change (post initial mount)
  useEffect(() => {
    // Skip during initial mount; initial generation handles first render
    if (isInitialMount.current) return

    const prev = prevDesignSettings.current
    const hasChanged =
      prev.fontCombinationId !== fontCombinationId ||
      prev.colorThemeId !== colorThemeId ||
      prev.backgroundImageUrl !== backgroundImageUrl

    if (!hasChanged) return

    console.log('🎨 Design change detected → regenerating', {
      from: prev,
      to: { fontCombinationId, colorThemeId, backgroundImageUrl }
    })

    const currentFontId = fontCombinationId
    const currentColorId = colorThemeId
    const currentBgUrl = backgroundImageUrl

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
          fontCombinationId: currentFontId,
          colorThemeId: currentColorId,
          backgroundImageUrl: currentBgUrl || null
        })
      )
    } catch (error) {
      console.error('Error updating localStorage hash:', error)
    }

    const run = async () => {
      try {
        await generateAllCarousels(currentFontId, currentColorId, currentBgUrl)
        prevDesignSettings.current = {
          fontCombinationId: currentFontId,
          colorThemeId: currentColorId,
          backgroundImageUrl: currentBgUrl
        }
      } catch (error) {
        console.error('❌ Regeneration failed:', error)
      } finally {
        hasDeductedCredit.current = wasDeducted
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fontCombinationId, colorThemeId, backgroundImageUrl])
  
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
            fontCombinationId, 
            colorThemeId, 
            backgroundImageUrl: backgroundImageUrl || null 
          })
          localStorage.setItem('postGeneration_fullContentHash', fullContentHash)
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
  }, [carousels, ideaTitle, underlineWords, fontCombinationId, colorThemeId, backgroundImageUrl, generateAllCarousels])
  
  // Reset credit deduction flag when carousels change (new note)
  // Note: Design settings (fontCombinationId, colorThemeId, backgroundImageUrl) are NOT in dependencies
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
    prevDesignSettings.current = { fontCombinationId, colorThemeId, backgroundImageUrl }
    // Reset carousel content tracking
    prevCarouselsContent.current = JSON.stringify(carousels)
    console.log('🔄 Reset for new note, prevDesignSettings:', prevDesignSettings.current)
  }, [ideaTitle, carousels.length])

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      // Don't set crossOrigin for local images (same origin)
      // Only set it for external images if needed
      if (src.startsWith('http://') || src.startsWith('https://')) {
        img.crossOrigin = 'anonymous'
      }
      img.onload = () => resolve(img)
      img.onerror = (error) => {
        console.error(`Failed to load image: ${src}`, error)
        reject(error)
      }
      img.src = src
    })
  }

  const loadFonts = async () => {
    try {
      // Load Poppins Bold for titles
      const poppinsBold = new FontFace('Poppins', 'url(/fonts/Poppins-Bold.ttf)', {
        weight: 'bold',
        style: 'normal'
      })
      
      // Load Dreaming Outloud Sans for content
      const dreamingSans = new FontFace('DreamingOutloudSans', 'url(/fonts/DreamingOutloudSans-Regular.otf)', {
        weight: 'normal',
        style: 'normal'
      })
      
      const loadedPoppins = await poppinsBold.load()
      const loadedDreaming = await dreamingSans.load()
      
      document.fonts.add(loadedPoppins)
      document.fonts.add(loadedDreaming)
      
      console.log('✓ Custom fonts loaded successfully')
    } catch (error) {
      console.warn('⚠️  Failed to load custom fonts, using fallback:', error)
    }
  }

  const generateCarouselImage = async (
    index: number, 
    fontConfig = FONT_CONFIG, 
    colorTheme = COLOR_THEME, 
    bgImageUrl = backgroundImageUrl
  ) => {
    const canvas = canvasRefs.current[index]
    if (!canvas) return

    const carousel = carousels[index]
    const ctx = canvas.getContext('2d')
    if (!ctx) return

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
      await loadFonts()
    }

    // Instagram note dimensions (4:5 ratio)
    const width = 1080
    const height = 1350
    canvas.width = width
    canvas.height = height

    // Draw background image or white background
    if (bgImageUrl) {
      try {
        console.log(`Loading background image: ${bgImageUrl}`)
        const bgImage = await loadImage(bgImageUrl)
        console.log(`Background image loaded: ${bgImage.width}x${bgImage.height}`)
        
        // Fill entire canvas with background (cover mode - fill entire area)
        const scale = Math.max(width / bgImage.width, height / bgImage.height)
        const scaledWidth = bgImage.width * scale
        const scaledHeight = bgImage.height * scale
        const offsetX = (width - scaledWidth) / 2
        const offsetY = (height - scaledHeight) / 2

        // Draw background image covering entire canvas
        ctx.drawImage(bgImage, offsetX, offsetY, scaledWidth, scaledHeight)
        console.log(`Background image drawn at ${offsetX}, ${offsetY} with size ${scaledWidth}x${scaledHeight}`)
      } catch (error) {
        console.error(`Unable to load background ${backgroundImageUrl}:`, error)
        // Fallback to white background
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, width, height)
      }
    } else {
      // No background image - use white
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, width, height)
    }

    // Safe area (avoiding Instagram UI elements)
    const safeMarginTop = 150
    const safeMarginBottom = 150
    const safeMarginSides = 100
    const safeWidth = width - (safeMarginSides * 2)
    const safeHeight = height - safeMarginTop - safeMarginBottom

    // Center content area
    const centerY = safeMarginTop + (safeHeight / 2)

    const highlightFillStyle = ensureColorAlpha(colorTheme.highlightColor, 0.5)

    // For HOOK carousel - just show the hook text with word highlighting
    if (cleanCarousel.kind === 'HOOK') {
      const hookText = cleanCarousel.title || cleanCarousel.content
      
      const hookFontMatch = fontConfig.hook.font.match(/(\d+\.?\d*)px/)
      const hookBaseFontSize = hookFontMatch ? parseFloat(hookFontMatch[1]) : 130
      const hookLineHeightRatio = fontConfig.hook.lineHeight / Math.max(1, hookBaseFontSize)
      const highlightOffsetRatio = 100 / Math.max(1, hookBaseFontSize)
      const highlightHeightRatio = 120 / Math.max(1, hookBaseFontSize)

      const buildHookFont = (size: number) =>
        fontConfig.hook.font.replace(/(\d+\.?\d*)px/, `${size}px`)

      const wrapHookText = (fontSize: number) => {
        ctx.font = buildHookFont(fontSize)
      const words = hookText.split(' ')
        const wrappedLines: string[] = []
      let currentLine = ''
      
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        const metrics = ctx.measureText(testLine)
        
        if (metrics.width > safeWidth && currentLine) {
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
          const metrics = ctx.measureText(line)
          if (metrics.width > maxWidth) maxWidth = metrics.width
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
      const emphasisData = underlineWords[index] || { underline: '', highlight: '' }
      const highlightWord = emphasisData.highlight.toLowerCase().replace(/[.,!?;:–—\-'"]/g, '').trim()
      
      // Find last occurrence of highlight word
      let lastHighlightLineIndex = -1
      let lastHighlightWordIndex = -1
      
      if (highlightWord) {
        for (let lineIdx = hookLines.length - 1; lineIdx >= 0; lineIdx--) {
          const lineWords = hookLines[lineIdx].split(' ')
          for (let wordIdx = lineWords.length - 1; wordIdx >= 0; wordIdx--) {
            const cleanWord = lineWords[wordIdx].toLowerCase().replace(/[.,!?;:–—\-'"]/g, '').trim()
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
      const x = safeMarginSides
      
      // Draw each line
      hookLines.forEach((line, lineIndex) => {
        const lineWords = line.split(' ')
        
        // First pass: Draw highlight backgrounds
        let tempX = x
        lineWords.forEach((word, wordIndex) => {
          const cleanWord = word.toLowerCase().replace(/[.,!?;:–—\-'"]/g, '').trim()
          const wordMetrics = ctx.measureText(word)
          
          if (cleanWord === highlightWord && lineIndex === lastHighlightLineIndex && wordIndex === lastHighlightWordIndex) {
            const cleanedWord = word.replace(/^[.,!?;:–—\-'"]+|[.,!?;:–—\-'"]+$/g, '')
            const cleanedMetrics = ctx.measureText(cleanedWord)
            const leadingPuncMatch = word.match(/^[.,!?;:–—\-'"]+/)
            const leadingPuncWidth = leadingPuncMatch ? ctx.measureText(leadingPuncMatch[0]).width : 0
            
            const bgX = tempX + leadingPuncWidth
            const bgY = y - highlightOffset
            const bgWidth = cleanedMetrics.width
            
            ctx.fillStyle = highlightFillStyle
            ctx.fillRect(bgX, bgY, bgWidth, highlightHeight)
          }
          
          const spaceWidth = ctx.measureText(' ').width
          tempX += wordMetrics.width + spaceWidth
        })
        
        // Second pass: Draw text
        let currentX = x
        lineWords.forEach((word, wordIndex) => {
          ctx.fillStyle = colorTheme.textColor
          ctx.fillText(word, currentX, y)
          
          const wordMetrics = ctx.measureText(word)
          currentX += wordMetrics.width
          if (wordIndex < lineWords.length - 1) {
            currentX += ctx.measureText(' ').width
          }
        })
        
        y += hookLineHeight
      })
      
    } else if (cleanCarousel.kind === 'CTA') {
      // CTA content with underlines and line breaks
      ctx.font = fontConfig.content.font
      ctx.fillStyle = colorTheme.textColor
      ctx.textAlign = 'left'
      const x = safeMarginSides
      
      // Split by sentences
      const sentences = cleanCarousel.content.split(/([.!?])\s+/).filter(s => s.trim())
      const lines: string[] = []
      
      // Process sentences and add empty lines between them
      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = sentences[i]
        const punctuation = i + 1 < sentences.length ? sentences[i + 1] : ''
        
        if (!sentence) continue
        
        const fullSentence = sentence + punctuation
        const sentenceWords = fullSentence.split(' ')
        let currentLine = ''
        
        for (const word of sentenceWords) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const metrics = ctx.measureText(testLine)
          
          if (metrics.width > safeWidth && currentLine) {
            lines.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) lines.push(currentLine)
        
        // Add empty line after sentence (except for last)
        if (i + 2 < sentences.length || (i + 1 < sentences.length && punctuation)) {
          lines.push('')
        }
      }
      
      // Get underline words
      const emphasisData = underlineWords[index] || { underline: '', highlight: '' }
      const underlinePhrases = emphasisData.underline.split(',').map(p => p.trim()).filter(p => p)
      
      // Calculate true vertical center
      const lineHeight = fontConfig.content.lineHeight
      const totalHeight = (lines.length - 1) * lineHeight  // Height between lines
      let y = centerY - (totalHeight / 2)
      
      // Draw CTA text with underlines
      lines.forEach(line => {
        // Skip empty lines (just add spacing)
        if (!line.trim()) {
          y += lineHeight
          return
        }
        
        const words = line.split(' ')
        
        // Build underline map
        const underlineMap: boolean[] = new Array(words.length).fill(false)
        
        for (const phrase of underlinePhrases) {
          const phraseWords = phrase.toLowerCase().split(/\s+/).map(w => w.replace(/[.,!?;:–—\-'"]/g, '').trim())
          const cleanLineWords = words.map(w => w.toLowerCase().replace(/[.,!?;:–—\-'"]/g, '').trim())
          
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
        
        // Draw text
        let currentX = x
        words.forEach((word, wordIndex) => {
          ctx.fillStyle = colorTheme.textColor
          ctx.fillText(word, currentX, y)
          
          const wordMetrics = ctx.measureText(word)
          currentX += wordMetrics.width
          if (wordIndex < words.length - 1) {
            currentX += ctx.measureText(' ').width
          }
        })
        
        // Draw underlines
        let underlineStart = -1
        let underlineX = x
        let currentXPos = x
        
        words.forEach((word, wordIndex) => {
          const wordMetrics = ctx.measureText(word)
          const spaceWidth = ctx.measureText(' ').width
          
          if (underlineMap[wordIndex]) {
            if (underlineStart === -1) {
              underlineStart = wordIndex
              underlineX = currentXPos
            }
          } else {
            if (underlineStart !== -1) {
              const underlineY = y + 8
              ctx.strokeStyle = colorTheme.underlineColor
              ctx.lineWidth = 2
              ctx.beginPath()
              ctx.moveTo(underlineX, underlineY)
              ctx.lineTo(currentXPos - spaceWidth, underlineY)
              ctx.stroke()
              underlineStart = -1
            }
          }
          
          currentXPos += wordMetrics.width + (wordIndex < words.length - 1 ? spaceWidth : 0)
        })
        
        // Draw final underline
        if (underlineStart !== -1) {
          const underlineY = y + 8
          ctx.strokeStyle = colorTheme.underlineColor
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(underlineX, underlineY)
          ctx.lineTo(currentXPos, underlineY)
          ctx.stroke()
        }
        
        y += lineHeight
      })
      
    } else {
      // MIDDLE carousel - title + content, left-aligned
      ctx.textAlign = 'left'
      const x = safeMarginSides
      
      // Parse emphasis words to check for image
      const emphasisData = underlineWords[index] || { underline: '', highlight: '', imageUrl: null }
      
      // Pre-load image if available to include in height calculation
      let imageHeight = 0
      let imageWidth = 0
      let loadedImage: HTMLImageElement | null = null
      
      if (emphasisData.imageUrl) {
        try {
          loadedImage = await loadImage(emphasisData.imageUrl)
          imageWidth = safeWidth
          imageHeight = Math.round(safeWidth * 9 / 16)
        } catch (error) {
          console.error(`Failed to pre-load image for centering:`, error)
        }
      }
      
      // Minimum spacing requirements (20px minimum)
      const minTitleContentGap = 20
      const minImageGap = 20
      
      // Try to fit content with flexible sizing
      let titleFontSize = 75  // From FONT_CONFIG
      let titleLineHeight = 90
      let contentFontSize = 55
      let contentLineHeight = 70
      let titleContentGap = Math.max(70, minTitleContentGap)
      let imageGap = imageHeight > 0 ? Math.max(40, minImageGap) : 0
      
      let titleLines: string[] = []
      let contentLines: string[] = []
      let totalHeight = 0
      let scaleFactor = 1.0
      
      // Function to calculate layout with given font sizes
      const calculateLayout = (titleSize: number, contentSize: number) => {
        // Title wrapping
        ctx.font = `bold ${titleSize}px Poppins, sans-serif`
        const titleWords = cleanCarousel.title ? cleanCarousel.title.split(' ') : []
        const wrappedTitle: string[] = []
        let currentLine = ''
        
        for (const word of titleWords) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const metrics = ctx.measureText(testLine)
          
          if (metrics.width > safeWidth && currentLine) {
            wrappedTitle.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) wrappedTitle.push(currentLine)
        
        // Content wrapping
        ctx.font = `${contentSize}px DreamingOutloudSans, sans-serif`
        const contentWords = cleanCarousel.content.split(' ')
        const wrappedContent: string[] = []
        currentLine = ''
        
        for (const word of contentWords) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const metrics = ctx.measureText(testLine)
          
          if (metrics.width > safeWidth && currentLine) {
            wrappedContent.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) wrappedContent.push(currentLine)
        
        // Calculate heights based on baseline-to-baseline distance
        // Plus add font size for the visual height of text
        const titleLH = titleSize * 1.2  // Proportional line height
        const contentLH = contentSize * 1.27
        
        // Height = first line font size + spacing between lines + last line descender space
        const titleH = wrappedTitle.length > 0 
          ? titleSize + (wrappedTitle.length - 1) * titleLH + (titleSize * 0.2)  // font + spacing + descender
          : 0
        const contentH = wrappedContent.length > 0
          ? contentSize + (wrappedContent.length - 1) * contentLH + (contentSize * 0.2)  // font + spacing + descender  
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
      
      // Calculate initial layout
      let layout = calculateLayout(titleFontSize, contentFontSize)
      
      // If content exceeds safe height, scale down
      if (layout.totalHeight > safeHeight) {
        console.log(`⚠️  Content too long (${layout.totalHeight}px > ${safeHeight}px), scaling down...`)
        
        // Reduce gaps to minimum first
        titleContentGap = minTitleContentGap
        imageGap = imageHeight > 0 ? minImageGap : 0
        
        // Recalculate with minimum gaps
        layout = calculateLayout(titleFontSize, contentFontSize)
        
        // If still too long, scale down font sizes
        if (layout.totalHeight > safeHeight) {
          scaleFactor = safeHeight / layout.totalHeight
          scaleFactor = Math.max(0.5, Math.min(0.95, scaleFactor))  // Between 50% and 95%
          
          titleFontSize = Math.floor(75 * scaleFactor)  // Always scale from original
          contentFontSize = Math.floor(55 * scaleFactor)
          
          console.log(`   Scaling fonts: title ${titleFontSize}px, content ${contentFontSize}px (${Math.round(scaleFactor * 100)}%)`)
          
          layout = calculateLayout(titleFontSize, contentFontSize)
          
          // Final warning if still doesn't fit after scaling
          if (layout.totalHeight > safeHeight) {
            console.warn(`⚠️  WARNING: Content still exceeds safe height even at minimum scale!`)
            console.warn(`   Total: ${Math.round(layout.totalHeight)}px, Safe: ${safeHeight}px`)
            console.warn(`   Consider reducing content length or removing image`)
          }
        }
      }
      
      titleLines = layout.titleLines
      contentLines = layout.contentLines
      titleLineHeight = layout.titleLineHeight
      contentLineHeight = layout.contentLineHeight
      totalHeight = layout.totalHeight
      
      console.log(`📏 Layout: ${titleLines.length} title lines, ${contentLines.length} content lines, total: ${Math.round(totalHeight)}px, safe: ${safeHeight}px`)
      
      // Start Y at center minus half total height, plus first line's font size (for baseline)
      const firstLineFontSize = titleLines.length > 0 ? titleFontSize : contentFontSize
      let y = centerY - (totalHeight / 2) + firstLineFontSize
        
        // Draw title with calculated font size
        ctx.font = `bold ${titleFontSize}px Poppins, sans-serif`
        ctx.fillStyle = colorTheme.textColor
        titleLines.forEach(line => {
          ctx.fillText(line, x, y)
          y += titleLineHeight
        })
        
        y += titleContentGap
        
        // Draw content with calculated font size
        ctx.font = `${contentFontSize}px DreamingOutloudSans, sans-serif`
        ctx.fillStyle = colorTheme.textColor
        
        // Use emphasisData already parsed above (no need to re-parse)
        const underlinePhrases = emphasisData.underline.split(',').map(p => p.trim()).filter(p => p)
        const highlightWord = emphasisData.highlight.toLowerCase().replace(/[.,!?;:–—\-'"]/g, '').trim()
        
        // Debug logging
        if (cleanCarousel.kind === 'MIDDLE') {
          console.log(`\n━━━ Carousel ${index + 1} Debug ━━━`)
          console.log('Emphasis data:', emphasisData)
          console.log('Underline phrases:', underlinePhrases)
          console.log('Highlight word:', highlightWord)
          console.log('Carousel content:', cleanCarousel.content)
        }
        
        // Find the last occurrence of highlight word across ALL content lines
        let lastHighlightLineIndex = -1
        let lastHighlightWordIndex = -1
        
        if (highlightWord) {
          for (let lineIdx = contentLines.length - 1; lineIdx >= 0; lineIdx--) {
            const lineWords = contentLines[lineIdx].split(' ')
            const cleanLineWords = lineWords.map(w => w.toLowerCase().replace(/[.,!?;:–—\-'"]/g, '').trim())
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
          let currentX = x
          
          // Build underline map for this line
          const underlineMap: boolean[] = new Array(words.length).fill(false)
          const highlightMap: boolean[] = new Array(words.length).fill(false)
          
          // Mark words that should be underlined (check for phrases)
          for (const phrase of underlinePhrases) {
            const phraseWords = phrase.toLowerCase().split(/\s+/).map(w => w.replace(/[.,!?;:–—\-'"]/g, '').trim())
            const cleanLineWords = words.map(w => w.toLowerCase().replace(/[.,!?;:–—\-'"]/g, '').trim())
            
            // Find consecutive matching sequences
            for (let i = 0; i <= cleanLineWords.length - phraseWords.length; i++) {
              let matches = true
              for (let j = 0; j < phraseWords.length; j++) {
                if (cleanLineWords[i + j] !== phraseWords[j]) {
                  matches = false
                  break
                }
              }
              if (matches) {
                // Mark all words in this phrase for underlining
                for (let j = 0; j < phraseWords.length; j++) {
                  underlineMap[i + j] = true
                }
              }
            }
          }
          
          // Mark word that should be highlighted (only the last occurrence across all lines)
          if (highlightWord && lineIndex === lastHighlightLineIndex && lastHighlightWordIndex !== -1) {
            highlightMap[lastHighlightWordIndex] = true
            // Remove underline from highlighted word
            underlineMap[lastHighlightWordIndex] = false
          }
          
          // First pass: Draw highlight backgrounds
          let tempX = x
          words.forEach((word, wordIndex) => {
            const wordMetrics = ctx.measureText(word)
            
            if (highlightMap[wordIndex]) {
              // Strip punctuation from word for accurate highlight width
              const cleanedWord = word.replace(/^[.,!?;:–—\-'"]+|[.,!?;:–—\-'"]+$/g, '')
              const cleanedMetrics = ctx.measureText(cleanedWord)
              
              // Calculate offset if word starts with punctuation
              const leadingPuncMatch = word.match(/^[.,!?;:–—\-'"]+/)
              const leadingPuncWidth = leadingPuncMatch ? ctx.measureText(leadingPuncMatch[0]).width : 0
              
              // Scale highlight background proportionally to font size
              const bgOffsetY = contentFontSize * 0.91  // ~91% of font size above baseline
              const bgHeight = contentFontSize * 1.09  // ~109% of font size for height
              
              const bgX = tempX + leadingPuncWidth
              const bgY = y - bgOffsetY
              const bgWidth = cleanedMetrics.width
              
              ctx.fillStyle = highlightFillStyle
              ctx.fillRect(bgX, bgY, bgWidth, bgHeight)
              console.log(`  ✨ Highlighting word: "${cleanedWord}" (font: ${contentFontSize}px)`)
            }
            
            const spaceWidth = ctx.measureText(' ').width
            tempX += wordMetrics.width + (wordIndex < words.length - 1 ? spaceWidth : 0)
          })
          
          // Second pass: Draw text
          currentX = x
          words.forEach((word, wordIndex) => {
            const wordMetrics = ctx.measureText(word)
            
            ctx.fillStyle = colorTheme.textColor
            ctx.fillText(word, currentX, y)
            
            currentX += wordMetrics.width
            if (wordIndex < words.length - 1) {
              currentX += ctx.measureText(' ').width
            }
          })
          
          // Third pass: Draw continuous underlines for consecutive words
          let underlineStart = -1
          let underlineX = x
          let currentXPos = x
          
          words.forEach((word, wordIndex) => {
            const wordMetrics = ctx.measureText(word)
            const spaceWidth = ctx.measureText(' ').width
            
            if (underlineMap[wordIndex]) {
              if (underlineStart === -1) {
                // Start new underline
                underlineStart = wordIndex
                underlineX = currentXPos
              }
            } else {
              if (underlineStart !== -1) {
                // End underline
                const underlineY = y + 8
                ctx.strokeStyle = colorTheme.underlineColor
                ctx.lineWidth = 2
                ctx.beginPath()
                ctx.moveTo(underlineX, underlineY)
                ctx.lineTo(currentXPos - spaceWidth, underlineY)
                ctx.stroke()
                console.log(`  ━ Underlining words ${underlineStart + 1}-${wordIndex}`)
                underlineStart = -1
              }
            }
            
            currentXPos += wordMetrics.width + (wordIndex < words.length - 1 ? spaceWidth : 0)
          })
          
          // Draw final underline if line ends with underlined word
          if (underlineStart !== -1) {
            const underlineY = y + 8
            ctx.strokeStyle = colorTheme.underlineColor
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(underlineX, underlineY)
            ctx.lineTo(currentXPos, underlineY)
            ctx.stroke()
            console.log(`  ━ Underlining words ${underlineStart + 1}-${words.length}`)
          }
          
          y += contentLineHeight
        })
        
        // Draw image for MIDDLE carousels if available (using pre-loaded image)
        if (loadedImage && imageWidth > 0 && imageHeight > 0) {
          try {
            console.log(`🖼️  Rendering pre-loaded image for carousel ${index + 1}`)
            
            // Add spacing between content and image
            y += imageGap
            
            // Position image at left margin (same as content)
            const imageX = safeMarginSides
            
            // Calculate source rectangle for 16:9 crop (center crop)
            const sourceAspect = loadedImage.width / loadedImage.height
            const targetAspect = 16 / 9
            
            let sx = 0, sy = 0, sWidth = loadedImage.width, sHeight = loadedImage.height
            
            if (sourceAspect > targetAspect) {
              // Image is wider than 16:9 - crop width
              sWidth = loadedImage.height * targetAspect
              sx = (loadedImage.width - sWidth) / 2  // Center horizontally
            } else {
              // Image is taller than 16:9 - crop height
              sHeight = loadedImage.width / targetAspect
              sy = (loadedImage.height - sHeight) / 2  // Center vertically
            }
            
            // Draw image with rounded corners and 16:9 crop
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
            
            // Draw cropped image using source rectangle
            ctx.drawImage(
              loadedImage,
              sx, sy, sWidth, sHeight,  // Source rectangle (crop)
              imageX, y, imageWidth, imageHeight  // Destination rectangle (16:9)
            )
            ctx.restore()
            
            console.log(`✅ Image rendered for carousel ${index + 1} (${imageWidth}x${imageHeight}, 16:9 crop from ${Math.round(sx)},${Math.round(sy)} ${Math.round(sWidth)}x${Math.round(sHeight)})`)
          } catch (error) {
            console.error(`❌ Failed to render image for carousel ${index + 1}:`, error)
          }
        }
    }  // Close else (MIDDLE carousel)
  }  // Close generateCarouselImage function

  const downloadCarousel = (index: number) => {
    const imageDataUrl = carouselImages[index]
    if (!imageDataUrl) return

    const link = document.createElement('a')
    const carousel = carousels[index]
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
        for (let i = 0; i < carousels.length; i++) {
          const imageDataUrl = carouselImages[i]
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
      for (let i = 0; i < carousels.length; i++) {
        const imageDataUrl = carouselImages[i]
        if (!imageDataUrl) continue
        
        const carousel = carousels[i]
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
      carousels.forEach((_, index) => {
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
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '16px',
        overflow: 'hidden'
      }}
    >
      <h3 style={{ 
        marginBottom: '0px', 
        fontSize: '24px',
        fontWeight: '700'
      }}>
        Your carousel
      </h3>

      <div
        style={{
          display: 'flex',
        gap: '24px',
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: '16px',
          marginBottom: '24px',
          flex: 1,
          minHeight: 0
        }}
      >
        {carousels.map((carousel, index) => (
          <div key={`carousel-${index}-${carousel.kind}-${carousel.title?.substring(0, 20)}`} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '16px',
            transition: 'all 0.3s ease',
            minWidth: '320px',
            flex: '0 0 320px'
          }}>
            <div style={{ 
              marginBottom: '12px',
              fontSize: '12px',
              fontWeight: '600',
              color: 'rgba(255,255,255,0.5)',
              textTransform: 'none',
              letterSpacing: '0px'
            }}>
              {carousel.kind === 'MIDDLE' ? 'Content' : carousel.kind === 'HOOK' ? 'Hook' : carousel.kind === 'CTA' ? 'CTA' : carousel.kind} • Carousel {index + 1}
            </div>
            
            <div style={{ 
              position: 'relative',
              paddingBottom: '125%', // 4:5 aspect ratio
              background: '#ffffff',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '12px'
            }}>
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
              {(carouselImages[index] || previousImagesRef.current[index]) && (
                <img
                  key={`carousel-img-${index}-${carouselImages[index] ? 'current' : 'prev'}`}
                  src={carouselImages[index] || previousImagesRef.current[index]}
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
            
            <button
              onClick={() => downloadCarousel(index)}
              className="button"
              style={{ 
                width: '100%',
                padding: '12px',
                fontSize: '14px'
              }}
            >
              Download Carousel {index + 1}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={downloadAllCarousels}
        className="button"
        style={{ width: '100%' }}
      >
        Download All Carousels
      </button>
    </div>
  )
}


