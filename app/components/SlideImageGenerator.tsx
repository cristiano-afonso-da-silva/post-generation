'use client'

import { useEffect, useRef, useState } from 'react'
import { getFontCombination, getColorTheme } from '../config/slideThemes'

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
}

export default function SlideImageGenerator({ 
  slides, 
  ideaTitle, 
  underlineWords = {},
  fontCombinationId = 'combination-1',
  colorThemeId = 'black'
}: Props) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const [generating, setGenerating] = useState(false)

  // Get selected font combination and color theme
  const FONT_CONFIG = getFontCombination(fontCombinationId)
  const COLOR_THEME = getColorTheme(colorThemeId)

  useEffect(() => {
    if (slides.length > 0) {
      generateAllSlides()
    }
  }, [slides, underlineWords, fontCombinationId, colorThemeId])

  const generateAllSlides = async () => {
    setGenerating(true)
    
    for (let i = 0; i < slides.length; i++) {
      await generateSlideImage(i)
    }
    
    setGenerating(false)
  }

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

    // Instagram carousel dimensions (4:5 ratio)
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

  const downloadAllSlides = () => {
    slides.forEach((_, index) => {
      setTimeout(() => downloadSlide(index), index * 200)
    })
  }

  return (
    <div className="card" style={{ marginTop: '32px' }}>
      <h3 style={{ 
        marginBottom: '24px', 
        fontSize: '24px',
        fontWeight: '700'
      }}>
        📸 Downloadable Slide Images
      </h3>
      
      <p style={{ 
        marginBottom: '24px', 
        color: 'rgba(255,255,255,0.6)', 
        fontSize: '16px'
      }}>
        Preview and download your carousel slides as images (1080x1350px, 4:5 ratio)
      </p>
      
      <div style={{
        marginBottom: '24px',
        padding: '16px',
        background: 'rgba(102, 126, 234, 0.1)',
        border: '1px solid rgba(102, 126, 234, 0.3)',
        borderRadius: '12px',
        fontSize: '14px',
        color: 'rgba(255,255,255,0.8)'
      }}>
        <strong>📁 Background Image:</strong> Place <code style={{background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px'}}>background.jpg</code> in the <code style={{background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px'}}>mobile/public/backgrounds/</code> folder.
        <br />
        <br />
        This single image will be used for <strong>all slides</strong>.
        <br />
        <br />
        If <code>background.jpg</code> is not found, slides will use a white background.
      </div>

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
                ref={el => canvasRefs.current[index] = el}
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
        📥 Download All Slides
      </button>
    </div>
  )
}

