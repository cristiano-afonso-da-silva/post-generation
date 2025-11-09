'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getFontCombination, getColorTheme } from '../config/slideThemes'
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

interface Slide {
  title: string
  content: string
  kind: 'HOOK' | 'MIDDLE' | 'CTA'
}

interface Props {
  slides: Slide[]
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
const getInitialImages = (slides: Slide[], ideaTitle: string, underlineWords: Record<number, any>, fontCombinationId: string, colorThemeId: string, backgroundImageUrl: string | null): string[] => {
  try {
    const savedImages = localStorage.getItem('postGeneration_canvasImages')
    const savedFullContentHash = localStorage.getItem('postGeneration_fullContentHash')
    const savedContentHash = localStorage.getItem('postGeneration_contentHash')
    const savedHash = savedFullContentHash || savedContentHash
    
    // Create deterministic hash with consistent property order
    const currentFullContentHash = JSON.stringify({ 
      ideaTitle, 
      slides, 
      underlineWords, 
      fontCombinationId, 
      colorThemeId, 
      backgroundImageUrl: backgroundImageUrl || null 
    })
    
    if (savedImages && savedHash && savedHash === currentFullContentHash) {
      const imageDataUrls = JSON.parse(savedImages)
      // Verify all images are present and valid data URLs
      if (imageDataUrls.length === slides.length && 
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

export default function SlideImageGenerator({ 
  slides, 
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
  const [slideImages, setSlideImages] = useState<string[]>(() => 
    getInitialImages(slides, ideaTitle, underlineWords, fontCombinationId, colorThemeId, backgroundImageUrl)
  )
  const { user, refreshCredits } = useAuth()
  const hasDeductedCredit = useRef(false)
  const isInitialMount = useRef(true)
  // Initialize prevDesignSettings immediately with initial prop values
  const prevDesignSettings = useRef<{ fontCombinationId: string; colorThemeId: string; backgroundImageUrl: string | null }>({
    fontCombinationId,
    colorThemeId,
    backgroundImageUrl
  })
  const hasInitialized = useRef(false)
  
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
      // Calculate content hash (only ideaTitle + slides, excludes theme/font)
      const currentContentHash = JSON.stringify({ ideaTitle, slides })
      
      // Check localStorage for existing generation_id and content hash
      const storedGenerationId = localStorage.getItem('postGeneration_generationId')
      const storedContentHash = localStorage.getItem('postGeneration_contentHash')
      
      // Determine if we should update or create new
      let generationIdToSend: string | undefined = undefined
      const shouldUpdate = storedGenerationId && storedContentHash === currentContentHash
      
      if (shouldUpdate) {
        generationIdToSend = storedGenerationId
        console.log('💾 Updating existing generation in database...', {
          generationId: generationIdToSend,
          ideaTitle,
          slidesCount: slides.length,
          imagesCount: imageDataUrls.length
        })
      } else {
        console.log('💾 Creating new generation in database...', {
          ideaTitle,
          slidesCount: slides.length,
          imagesCount: imageDataUrls.length
        })
      }

      const response = await fetch('/api/generations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          generationId: generationIdToSend,
          ideaTitle,
          accountDescription: accountDescriptionRef.current,
          slides,
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
        
        // Store generation_id and content hash in localStorage
        localStorage.setItem('postGeneration_generationId', returnedGenerationId)
        localStorage.setItem('postGeneration_contentHash', currentContentHash)
        
        if (result.isUpdate) {
          console.log('✅ Generation updated in history:', returnedGenerationId)
        } else {
          console.log('✅ Generation auto-saved to history:', returnedGenerationId)
        }
      }
    } catch (error: any) {
      console.error('❌ Error auto-saving generation:', error.message || error)
    }
  }, [ideaTitle, slides, underlineWords, fontCombinationId, colorThemeId, backgroundImageUrl, user?.id])

  const generateAllSlides = useCallback(async (overrideFontId?: string, overrideColorId?: string, overrideBgUrl?: string | null) => {
    setGenerating(true)
    
    // Use override values if provided (for design changes), otherwise use current props
    const currentFontId = overrideFontId ?? fontCombinationId
    const currentColorId = overrideColorId ?? colorThemeId
    const currentBgUrl = overrideBgUrl !== undefined ? overrideBgUrl : backgroundImageUrl
    
    // Compute configs with current values
    const currentFontConfig = getFontCombination(currentFontId)
    const currentColorTheme = getColorTheme(currentColorId)
    
    // Ensure canvasRefs array has correct length
    if (canvasRefs.current.length !== slides.length) {
      canvasRefs.current = new Array(slides.length).fill(null)
    }
    
    // Initialize array with correct length to maintain order
    const imageDataUrls: string[] = new Array(slides.length).fill('')
    
    for (let i = 0; i < slides.length; i++) {
      await generateSlideImage(i, currentFontConfig, currentColorTheme, currentBgUrl)
      // Save canvas to data URL at the specific index to maintain order
      const canvas = canvasRefs.current[i]
      if (canvas) {
        const dataUrl = canvas.toDataURL('image/png')
        imageDataUrls[i] = dataUrl
        console.log(`✅ Generated slide ${i + 1}/${slides.length}`)
        // Incrementally update UI for instant feedback
        setSlideImages(prev => {
          const next = prev.length === slides.length ? [...prev] : Array.from({ length: slides.length }, (_, idx) => prev[idx] || '')
          next[i] = dataUrl
          return next
        })
      } else {
        console.warn(`⚠️ Canvas not found for slide ${i + 1}`)
      }
    }
    
    // Verify all images were generated
    const allImagesValid = imageDataUrls.every(img => img && img.startsWith('data:image/'))
    if (!allImagesValid) {
      console.error('❌ Some images failed to generate')
    } else {
      console.log('✅ All', imageDataUrls.length, 'slides generated successfully')
    }
    
    // Set images immediately for display
    setSlideImages(imageDataUrls)
    
    // Create full content hash (includes theme/font) for image matching - deterministic order
    const fullContentHash = JSON.stringify({ 
      ideaTitle, 
      slides, 
      underlineWords, 
      fontCombinationId: currentFontId, 
      colorThemeId: currentColorId, 
      backgroundImageUrl: currentBgUrl || null 
    })
    // Create content hash (only ideaTitle + slides) for generation update detection
    const contentHash = JSON.stringify({ ideaTitle, slides })
    
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
    
    // Deduct credit when slides are generated (only once per note generation)
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
  }, [slides, ideaTitle, underlineWords, fontCombinationId, colorThemeId, backgroundImageUrl, user?.id, refreshCredits, onGenerationComplete, saveToDatabase])

  // Generate slides if not loaded from storage
  useEffect(() => {
    if (slides.length > 0 && slideImages.length === 0) {
      // Only generate if we don't have cached images
      console.log('Initial generation triggered')
      generateAllSlides().then(() => {
        // Mark as not initial mount after first generation completes
        isInitialMount.current = false
        console.log('Initial mount flag set to false')
      })
    } else if (slides.length > 0 && slideImages.length > 0 && isInitialMount.current) {
      // If we have images from cache, mark as not initial mount
      isInitialMount.current = false
      console.log('Initial mount flag set to false (cached images)')
    }
  }, [slides.length, slideImages.length, generateAllSlides])

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
          slides,
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
        await generateAllSlides(currentFontId, currentColorId, currentBgUrl)
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
  
  // Reset credit deduction flag when slides change (new note)
  useEffect(() => {
    hasDeductedCredit.current = false
    isInitialMount.current = true
    hasInitialized.current = false
    // Reset design settings tracking with current values
    prevDesignSettings.current = { fontCombinationId, colorThemeId, backgroundImageUrl }
    console.log('🔄 Reset for new note, prevDesignSettings:', prevDesignSettings.current)
  }, [ideaTitle, slides.length, fontCombinationId, colorThemeId, backgroundImageUrl])

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

  const generateSlideImage = async (
    index: number, 
    fontConfig = FONT_CONFIG, 
    colorTheme = COLOR_THEME, 
    bgImageUrl = backgroundImageUrl
  ) => {
    const canvas = canvasRefs.current[index]
    if (!canvas) return

    const slide = slides[index]
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Ensure global alpha reset before drawing
    ctx.globalAlpha = 1

    // Remove asterisks from slide content
    const cleanSlide = {
      ...slide,
      title: slide.title ? slide.title.replace(/\*/g, '') : slide.title,
      content: slide.content ? slide.content.replace(/\*/g, '') : slide.content
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

    // For HOOK slide - just show the hook text with word highlighting
    if (cleanSlide.kind === 'HOOK') {
      const hookText = cleanSlide.title || cleanSlide.content
      
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
      
    } else if (cleanSlide.kind === 'CTA') {
      // CTA content with underlines and line breaks
      ctx.font = fontConfig.content.font
      ctx.fillStyle = colorTheme.textColor
      ctx.textAlign = 'left'
      const x = safeMarginSides
      
      // Split by sentences
      const sentences = cleanSlide.content.split(/([.!?])\s+/).filter(s => s.trim())
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
      // MIDDLE slide - title + content, left-aligned
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
        const titleWords = cleanSlide.title ? cleanSlide.title.split(' ') : []
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
        const contentWords = cleanSlide.content.split(' ')
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
        if (cleanSlide.kind === 'MIDDLE') {
          console.log(`\n━━━ Slide ${index + 1} Debug ━━━`)
          console.log('Emphasis data:', emphasisData)
          console.log('Underline phrases:', underlinePhrases)
          console.log('Highlight word:', highlightWord)
          console.log('Slide content:', cleanSlide.content)
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
        
        // Draw image for MIDDLE slides if available (using pre-loaded image)
        if (loadedImage && imageWidth > 0 && imageHeight > 0) {
          try {
            console.log(`🖼️  Rendering pre-loaded image for slide ${index + 1}`)
            
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
            
            console.log(`✅ Image rendered for slide ${index + 1} (${imageWidth}x${imageHeight}, 16:9 crop from ${Math.round(sx)},${Math.round(sy)} ${Math.round(sWidth)}x${Math.round(sHeight)})`)
          } catch (error) {
            console.error(`❌ Failed to render image for slide ${index + 1}:`, error)
          }
        }
    }  // Close else (MIDDLE slide)
  }  // Close generateSlideImage function

  const downloadSlide = (index: number) => {
    const imageDataUrl = slideImages[index]
    if (!imageDataUrl) return

    const link = document.createElement('a')
    const slide = slides[index]
    const fileName = `slide-${index + 1}-${slide.kind.toLowerCase()}.png`
    
    link.download = fileName
    link.href = imageDataUrl
    link.click()
  }

  const downloadAllSlides = async () => {
    try {
      const zip = new JSZip()
      
      // Process all slides and add them to the zip
      for (let i = 0; i < slides.length; i++) {
        const imageDataUrl = slideImages[i]
        if (!imageDataUrl) continue
        
        const slide = slides[i]
        const fileName = `slide-${i + 1}-${slide.kind.toLowerCase()}.png`
        
        // Convert data URL to base64
        const base64Data = imageDataUrl.split(',')[1]
        
        // Add image to zip
        zip.file(fileName, base64Data, { base64: true })
      }
      
      // Generate zip file and trigger download
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = 'all-slides.zip'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the object URL
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Error creating zip file:', error)
      // Fallback to individual downloads if zip fails
      slides.forEach((_, index) => {
        setTimeout(() => downloadSlide(index), index * 200)
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
        marginBottom: '24px', 
        fontSize: '24px',
        fontWeight: '700'
      }}>
        Your slides
      </h3>
      
      {generating && (
        <div style={{ 
          textAlign: 'center', 
          padding: '20px',
          color: 'rgba(255,255,255,0.6)'
        }}>
          Generating images...
        </div>
      )}

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
        {slides.map((slide, index) => (
          <div key={`slide-${index}-${slide.kind}-${slide.title?.substring(0, 20)}`} style={{
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
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {slide.kind} • Slide {index + 1}
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
              {slideImages[index] && (
                <img
                  src={slideImages[index]}
                  alt={`Slide ${index + 1}`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    zIndex: 1
                  }}
                />
              )}
            </div>
            
            <button
              onClick={() => downloadSlide(index)}
              className="button"
              style={{ 
                width: '100%',
                padding: '12px',
                fontSize: '14px'
              }}
            >
              Download Slide {index + 1}
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={downloadAllSlides}
        className="button"
        style={{ width: '100%' }}
      >
        Download All Slides
      </button>
    </div>
  )
}

