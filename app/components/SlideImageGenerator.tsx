'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getFontCombination, getColorTheme } from '../config/slideThemes'
import { useAuth } from '../context/AuthContext'
import JSZip from 'jszip'

interface Slide {
  title: string
  content: string
  kind: 'HOOK' | 'MIDDLE' | 'CTA'
}

interface Props {
  slides: Slide[]
  ideaTitle: string
  underlineWords?: Record<number, { underline: string; highlight: string }>
  fontCombinationId?: string
  colorThemeId?: string
  accountDescription?: string
  caption?: string
  onGenerationComplete?: () => void
}

export default function SlideImageGenerator({ 
  slides, 
  ideaTitle, 
  underlineWords = {},
  fontCombinationId = 'combination-1',
  colorThemeId = 'black',
  accountDescription = '',
  caption = '',
  onGenerationComplete
}: Props) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const [generating, setGenerating] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const { user, refreshCredits } = useAuth()
  const hasDeductedCredit = useRef(false)
  const hasAutoSaved = useRef(false)

  // Get selected font combination and color theme
  const FONT_CONFIG = getFontCombination(fontCombinationId)
  const COLOR_THEME = getColorTheme(colorThemeId)

  const loadImagesFromStorage = useCallback(async () => {
    try {
      const savedImages = localStorage.getItem('postGeneration_canvasImages')
      // Use full content hash (includes theme/font) for image matching, fallback to content hash if not available
      const savedFullContentHash = localStorage.getItem('postGeneration_fullContentHash')
      const savedContentHash = localStorage.getItem('postGeneration_contentHash')
      const savedHash = savedFullContentHash || savedContentHash
      
      // Create current full content hash (includes theme/font for image matching)
      const currentFullContentHash = JSON.stringify({ ideaTitle, slides, underlineWords, fontCombinationId, colorThemeId })
      
      if (savedImages && savedHash && savedHash === currentFullContentHash) {
        const imageDataUrls = JSON.parse(savedImages)
        // Check if we have the same number of slides
        if (imageDataUrls.length === slides.length) {
          // Wait for all canvas refs to be available
          let allCanvasesReady = true
          for (let i = 0; i < slides.length; i++) {
            if (!canvasRefs.current[i]) {
              allCanvasesReady = false
              break
            }
          }
          
          if (allCanvasesReady) {
            // Load images onto canvases
            for (let i = 0; i < slides.length; i++) {
              const canvas = canvasRefs.current[i]
              if (canvas && imageDataUrls[i]) {
                const img = new Image()
                await new Promise<void>((resolve) => {
                  img.onload = () => {
                    canvas.width = img.width
                    canvas.height = img.height
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                      ctx.drawImage(img, 0, 0)
                    }
                    resolve()
                  }
                  img.onerror = () => resolve()
                  img.src = imageDataUrls[i]
                })
              }
            }
            setImagesLoaded(true)
            setGenerating(false)
            return true
          }
        }
      }
    } catch (error) {
      console.error('Error loading images from localStorage:', error)
    }
    // If no saved images or content doesn't match, return false to trigger generation
    return false
  }, [slides, ideaTitle, underlineWords, fontCombinationId, colorThemeId])

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
          accountDescription,
          slides,
          caption,
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
  }, [ideaTitle, accountDescription, slides, caption, underlineWords, fontCombinationId, colorThemeId, user?.id])

  const generateAllSlides = useCallback(async () => {
    setGenerating(true)
    
    const imageDataUrls: string[] = []
    
    for (let i = 0; i < slides.length; i++) {
      await generateSlideImage(i)
      // Save canvas to data URL
      const canvas = canvasRefs.current[i]
      if (canvas) {
        imageDataUrls.push(canvas.toDataURL('image/png'))
      }
    }
    
    // Create full content hash (includes theme/font) for image matching
    const fullContentHash = JSON.stringify({ ideaTitle, slides, underlineWords, fontCombinationId, colorThemeId })
    // Create content hash (only ideaTitle + slides) for generation update detection
    const contentHash = JSON.stringify({ ideaTitle, slides })
    
    // Save all images to localStorage with content hashes
    try {
      localStorage.setItem('postGeneration_canvasImages', JSON.stringify(imageDataUrls))
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
    setImagesLoaded(true)
    
    // Auto-save to database after successful generation
    // Only save if images are data URLs (newly generated), not URLs (from history)
    if (user?.id && !hasAutoSaved.current && imageDataUrls.length > 0) {
      const isNewGeneration = imageDataUrls[0]?.startsWith('data:image/')
      if (isNewGeneration) {
        // Check if we should skip auto-save (already saved with matching content)
        const storedGenerationId = localStorage.getItem('postGeneration_generationId')
        const storedContentHash = localStorage.getItem('postGeneration_contentHash')
        const currentContentHash = JSON.stringify({ ideaTitle, slides })
        
        // Only skip if generation_id exists AND content hash matches (prevent duplicate on reload)
        const shouldSkipSave = storedGenerationId && storedContentHash === currentContentHash
        
        if (!shouldSkipSave) {
          hasAutoSaved.current = true
          // Don't await - let it save in background
          saveToDatabase(imageDataUrls).catch(err => {
            console.error('Auto-save failed:', err)
            // Reset flag so it can try again if needed
            hasAutoSaved.current = false
          })
        } else {
          // Already saved with matching content, skip auto-save
          console.log('⏭️ Skipping auto-save: generation already exists with matching content')
          hasAutoSaved.current = true
        }
      } else {
        // Images are URLs from history, already saved
        hasAutoSaved.current = true
      }
    }
    
    // Notify parent component that generation is complete
    if (onGenerationComplete) {
      onGenerationComplete()
    }
  }, [slides, ideaTitle, underlineWords, fontCombinationId, colorThemeId, user?.id, refreshCredits, onGenerationComplete, saveToDatabase])

  // Load images from localStorage or generate new ones
  useEffect(() => {
    if (slides.length > 0) {
      // Wait a bit for canvas refs to be set
      const timer = setTimeout(async () => {
        const loaded = await loadImagesFromStorage()
        if (!loaded) {
          // If images weren't loaded from storage, generate new ones (will deduct credit)
          generateAllSlides()
        } else {
          // Images loaded from cache - don't deduct credit, but reset flag for next generation
          hasDeductedCredit.current = true
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [slides.length, loadImagesFromStorage, generateAllSlides])

  // Regenerate if theme, fonts, or underline words change (but only if images were already loaded)
  useEffect(() => {
    if (slides.length > 0 && imagesLoaded) {
      // Don't deduct credit for theme/font changes - only for new note generation
      // Temporarily set flag to prevent deduction
      const wasDeducted = hasDeductedCredit.current
      hasDeductedCredit.current = true
      const regenerate = async () => {
        await generateAllSlides()
        // Restore flag after generation
        hasDeductedCredit.current = wasDeducted
      }
      regenerate()
    }
  }, [fontCombinationId, colorThemeId, imagesLoaded, slides.length, generateAllSlides])
  
  // Reset credit deduction flag when slides change (new note)
  useEffect(() => {
    hasDeductedCredit.current = false
  }, [ideaTitle, slides.length])

  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
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

  const generateSlideImage = async (index: number) => {
    const canvas = canvasRefs.current[index]
    if (!canvas) return

    const slide = slides[index]
    const ctx = canvas.getContext('2d')
    if (!ctx) return

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

    // Load background.jpg for all slides - NO OVERLAY
    try {
      const bgImage = await loadImage('/backgrounds/background.jpg')
      
      // Draw background image covering entire canvas - no overlay
      ctx.drawImage(bgImage, 0, 0, width, height)
    } catch (error) {
      // Fallback to white background if background.jpg not found
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

    // For HOOK slide - just show the hook text with word highlighting
    if (cleanSlide.kind === 'HOOK') {
      const hookText = cleanSlide.title || cleanSlide.content
      
      // Style 1: Hook text
      ctx.font = FONT_CONFIG.hook.font
      ctx.fillStyle = COLOR_THEME.textColor
      ctx.textAlign = 'left'
      
      const words = hookText.split(' ')
      const lines: string[] = []
      let currentLine = ''
      
      // Wrap text to fit width
      for (const word of words) {
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
      
      // Get highlight word for hook slide
      const emphasisData = underlineWords[index] || { underline: '', highlight: '' }
      const highlightWord = emphasisData.highlight.toLowerCase().replace(/[.,!?;:–—\-'"]/g, '').trim()
      
      // Find the last occurrence of highlight word across all lines
      let lastHighlightLineIndex = -1
      let lastHighlightWordIndex = -1
      
      if (highlightWord) {
        for (let lineIdx = lines.length - 1; lineIdx >= 0; lineIdx--) {
          const lineWords = lines[lineIdx].split(' ')
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
      
      // Calculate vertical centering
      const lineHeight = FONT_CONFIG.hook.lineHeight
      const totalHeight = lines.length * lineHeight
      let y = centerY - (totalHeight / 2) + 40
      const x = safeMarginSides
      
      // Draw each line with word-level highlighting
      lines.forEach((line, lineIndex) => {
        const lineWords = line.split(' ')
        let currentX = x
        
        // First pass: Draw highlight backgrounds (only for last occurrence)
        let tempX = x
        lineWords.forEach((word, wordIndex) => {
          const cleanWord = word.toLowerCase().replace(/[.,!?;:–—\-'"]/g, '').trim()
          const wordMetrics = ctx.measureText(word)
          
          // Only highlight if this is the last occurrence
          if (cleanWord === highlightWord && lineIndex === lastHighlightLineIndex && wordIndex === lastHighlightWordIndex) {
            // Strip punctuation for accurate highlight
            const cleanedWord = word.replace(/^[.,!?;:–—\-'"]+|[.,!?;:–—\-'"]+$/g, '')
            const cleanedMetrics = ctx.measureText(cleanedWord)
            const leadingPuncMatch = word.match(/^[.,!?;:–—\-'"]+/)
            const leadingPuncWidth = leadingPuncMatch ? ctx.measureText(leadingPuncMatch[0]).width : 0
            
            const bgX = tempX + leadingPuncWidth
            const bgY = y - 100
            const bgWidth = cleanedMetrics.width
            const bgHeight = 120
            
            ctx.fillStyle = COLOR_THEME.highlightColor
            ctx.fillRect(bgX, bgY, bgWidth, bgHeight)
          }
          
          const spaceWidth = ctx.measureText(' ').width
          tempX += wordMetrics.width + spaceWidth
        })
        
        // Second pass: Draw text
        lineWords.forEach((word, wordIndex) => {
          ctx.fillStyle = COLOR_THEME.textColor
          ctx.fillText(word, currentX, y)
          
          const wordMetrics = ctx.measureText(word)
          currentX += wordMetrics.width
          if (wordIndex < lineWords.length - 1) {
            currentX += ctx.measureText(' ').width
          }
        })
        
        y += lineHeight
      })
      
    } else if (cleanSlide.kind === 'CTA') {
      // Style 3: CTA content with underlines and line breaks after ! ? and .
      ctx.font = FONT_CONFIG.content.font
      ctx.fillStyle = COLOR_THEME.textColor
      ctx.textAlign = 'left'
      const x = safeMarginSides
      
      // Split by periods, exclamation marks, and question marks
      const sentences = cleanSlide.content.split(/([.!?])\s+/).filter(s => s.trim())
      const lines: string[] = []
      
      // Process sentences and add empty lines between them
      for (let i = 0; i < sentences.length; i += 2) {
        const sentence = sentences[i]
        const punctuation = i + 1 < sentences.length ? sentences[i + 1] : ''
        
        if (!sentence) continue
        
        // Add punctuation back to sentence
        const fullSentence = sentence + punctuation
        
        // Wrap each sentence
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
        
        // Add empty line after sentence (except for last sentence)
        if (i + 2 < sentences.length || (i + 1 < sentences.length && punctuation)) {
          lines.push('') // Empty line
        }
      }
      
      // Get underline words for CTA
      const emphasisData = underlineWords[index] || { underline: '', highlight: '' }
      const underlinePhrases = emphasisData.underline.split(',').map(p => p.trim()).filter(p => p)
      
      const lineHeight = FONT_CONFIG.content.lineHeight
      const totalHeight = lines.length * lineHeight
      let y = centerY - (totalHeight / 2) + 35
      
      // Draw CTA text with underlines
      lines.forEach(line => {
        // Skip empty lines (just add spacing)
        if (!line.trim()) {
          y += lineHeight
          return
        }
        
        const words = line.split(' ')
        
        // Build underline map for this line
        const underlineMap: boolean[] = new Array(words.length).fill(false)
        
        // Mark words that should be underlined
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
              for (let j = 0; j < phraseWords.length; j++) {
                underlineMap[i + j] = true
              }
            }
          }
        }
        
        // Draw text
        let currentX = x
        words.forEach((word, wordIndex) => {
          const wordMetrics = ctx.measureText(word)
          
          ctx.fillStyle = COLOR_THEME.textColor
          ctx.fillText(word, currentX, y)
          
          currentX += wordMetrics.width
          if (wordIndex < words.length - 1) {
            currentX += ctx.measureText(' ').width
          }
        })
        
        // Draw continuous underlines
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
              ctx.strokeStyle = COLOR_THEME.underlineColor
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
        
        // Draw final underline if line ends with underlined word
        if (underlineStart !== -1) {
          const underlineY = y + 8
          ctx.strokeStyle = COLOR_THEME.underlineColor
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
      
      // Style 2: Title
      if (cleanSlide.title) {
        ctx.font = FONT_CONFIG.title.font
        ctx.fillStyle = COLOR_THEME.textColor
        
        const titleWords = cleanSlide.title.split(' ')
        const titleLines: string[] = []
        let currentLine = ''
        
        for (const word of titleWords) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const metrics = ctx.measureText(testLine)
          
          if (metrics.width > safeWidth && currentLine) {
            titleLines.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) titleLines.push(currentLine)
        
        // Style 3: Content
        ctx.font = FONT_CONFIG.content.font
        const contentWords = cleanSlide.content.split(' ')
        const contentLines: string[] = []
        currentLine = ''
        
        for (const word of contentWords) {
          const testLine = currentLine ? `${currentLine} ${word}` : word
          const metrics = ctx.measureText(testLine)
          
          if (metrics.width > safeWidth && currentLine) {
            contentLines.push(currentLine)
            currentLine = word
          } else {
            currentLine = testLine
          }
        }
        if (currentLine) contentLines.push(currentLine)
        
        // Calculate total height
        const titleLineHeight = FONT_CONFIG.title.lineHeight
        const contentLineHeight = FONT_CONFIG.content.lineHeight
        const gap = 70
        const totalHeight = (titleLines.length * titleLineHeight) + gap + (contentLines.length * contentLineHeight)
        
        let y = centerY - (totalHeight / 2) + 30
        
        // Draw title - Style 2
        ctx.font = FONT_CONFIG.title.font
        titleLines.forEach(line => {
          ctx.fillText(line, x, y)
          y += titleLineHeight
        })
        
        y += gap
        
        // Draw content with underlines and highlights - Style 3
        ctx.font = FONT_CONFIG.content.font
        ctx.fillStyle = COLOR_THEME.textColor
        
        // Parse emphasis words for this slide
        const emphasisData = underlineWords[index] || { underline: '', highlight: '' }
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
              
              // No padding - highlight only the word, not punctuation
              const bgX = tempX + leadingPuncWidth
              const bgY = y - 50
              const bgWidth = cleanedMetrics.width
              const bgHeight = 60
              
              ctx.fillStyle = COLOR_THEME.highlightColor
              ctx.fillRect(bgX, bgY, bgWidth, bgHeight)
              console.log(`  ✨ Highlighting word: "${cleanedWord}" (stripped from "${word}")`)
            }
            
            const spaceWidth = ctx.measureText(' ').width
            tempX += wordMetrics.width + (wordIndex < words.length - 1 ? spaceWidth : 0)
          })
          
          // Second pass: Draw text
          currentX = x
          words.forEach((word, wordIndex) => {
            const wordMetrics = ctx.measureText(word)
            
            ctx.fillStyle = COLOR_THEME.textColor
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
                ctx.strokeStyle = COLOR_THEME.underlineColor
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
            ctx.strokeStyle = COLOR_THEME.underlineColor
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(underlineX, underlineY)
            ctx.lineTo(currentXPos, underlineY)
            ctx.stroke()
            console.log(`  ━ Underlining words ${underlineStart + 1}-${words.length}`)
          }
          
          y += contentLineHeight
        })
      }
    }
  }

  const downloadSlide = (index: number) => {
    const canvas = canvasRefs.current[index]
    if (!canvas) return

    const link = document.createElement('a')
    const slide = slides[index]
    const fileName = `slide-${index + 1}-${slide.kind.toLowerCase()}.png`
    
    link.download = fileName
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const downloadAllSlides = async () => {
    try {
      const zip = new JSZip()
      
      // Process all slides and add them to the zip
      for (let i = 0; i < slides.length; i++) {
        const canvas = canvasRefs.current[i]
        if (!canvas) continue
        
        const slide = slides[i]
        const fileName = `slide-${i + 1}-${slide.kind.toLowerCase()}.png`
        
        // Convert canvas to blob
        const dataUrl = canvas.toDataURL('image/png')
        const base64Data = dataUrl.split(',')[1]
        
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
    <div className="card" style={{ marginTop: '32px' }}>
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

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '24px'
      }}>
        {slides.map((slide, index) => (
          <div key={index} style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px',
            padding: '16px',
            transition: 'all 0.3s ease'
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
              <canvas
                ref={el => { canvasRefs.current[index] = el }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
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

