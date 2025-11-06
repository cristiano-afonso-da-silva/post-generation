'use client'

import { useEffect, useRef, useState } from 'react'

interface Slide {
  title: string
  content: string
  kind: 'HOOK' | 'MIDDLE' | 'CTA'
}

interface Props {
  slides: Slide[]
  ideaTitle: string
}

export default function SlideImageGenerator({ slides, ideaTitle }: Props) {
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (slides.length > 0) {
      generateAllSlides()
    }
  }, [slides])

  const generateAllSlides = async () => {
    setGenerating(true)
    
    for (let i = 0; i < slides.length; i++) {
      await generateSlideImage(i)
    }
    
    setGenerating(false)
  }

  const generateSlideImage = async (index: number) => {
    const canvas = canvasRefs.current[index]
    if (!canvas) return

    const slide = slides[index]
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Instagram carousel dimensions (4:5 ratio)
    const width = 1080
    const height = 1350
    canvas.width = width
    canvas.height = height

    // White background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, width, height)

    // Safe area (avoiding Instagram UI elements)
    const safeMarginTop = 150
    const safeMarginBottom = 150
    const safeMarginSides = 100
    const safeWidth = width - (safeMarginSides * 2)
    const safeHeight = height - safeMarginTop - safeMarginBottom

    // Slide number indicator (top right)
    ctx.fillStyle = '#000000'
    ctx.font = '32px Inter, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`${index + 1}/${slides.length}`, width - safeMarginSides, 80)

    // Arrow indicator (top right corner if not last slide)
    if (index < slides.length - 1) {
      ctx.font = 'bold 40px sans-serif'
      ctx.fillText('→', width - 50, 80)
    }

    // Center content area
    const centerY = safeMarginTop + (safeHeight / 2)

    // For HOOK slide - just show the hook text, large and centered
    if (slide.kind === 'HOOK') {
      const hookText = slide.title || slide.content
      
      // Draw hook text - large, bold, centered
      ctx.font = 'bold 80px Inter, sans-serif'
      ctx.fillStyle = '#000000'
      ctx.textAlign = 'center'
      
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
      
      // Calculate vertical centering
      const lineHeight = 100
      const totalHeight = lines.length * lineHeight
      let y = centerY - (totalHeight / 2) + 40
      
      // Draw each line with optional purple background on first line
      lines.forEach((line, i) => {
        if (i === 0 && lines.length > 1) {
          // Add purple background to first line for emphasis
          const lineMetrics = ctx.measureText(line)
          const bgPadding = 20
          const bgX = (width / 2) - (lineMetrics.width / 2) - bgPadding
          const bgY = y - 70
          const bgWidth = lineMetrics.width + (bgPadding * 2)
          const bgHeight = 90
          
          ctx.fillStyle = '#A78BFA'
          ctx.fillRect(bgX, bgY, bgWidth, bgHeight)
        }
        
        // Draw text
        ctx.fillStyle = '#000000'
        ctx.fillText(line, width / 2, y)
        y += lineHeight
      })
      
    } else if (slide.kind === 'CTA') {
      // CTA slide - centered, bold
      ctx.font = 'bold 70px Inter, sans-serif'
      ctx.fillStyle = '#000000'
      ctx.textAlign = 'center'
      
      const words = slide.content.split(' ')
      const lines: string[] = []
      let currentLine = ''
      
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
      
      const lineHeight = 90
      const totalHeight = lines.length * lineHeight
      let y = centerY - (totalHeight / 2) + 35
      
      lines.forEach(line => {
        ctx.fillText(line, width / 2, y)
        y += lineHeight
      })
      
    } else {
      // MIDDLE slide - title + content
      ctx.textAlign = 'center'
      
      // Title
      if (slide.title) {
        ctx.font = 'bold 60px Inter, sans-serif'
        ctx.fillStyle = '#000000'
        
        const titleWords = slide.title.split(' ')
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
        
        // Content
        ctx.font = '42px Inter, sans-serif'
        const contentWords = slide.content.split(' ')
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
        const titleLineHeight = 75
        const contentLineHeight = 55
        const gap = 60
        const totalHeight = (titleLines.length * titleLineHeight) + gap + (contentLines.length * contentLineHeight)
        
        let y = centerY - (totalHeight / 2) + 30
        
        // Draw title
        ctx.font = 'bold 60px Inter, sans-serif'
        titleLines.forEach(line => {
          ctx.fillText(line, width / 2, y)
          y += titleLineHeight
        })
        
        y += gap
        
        // Draw content - simple centered text without highlighting
        ctx.font = '42px Inter, sans-serif'
        ctx.fillStyle = '#000000'
        contentLines.forEach(line => {
          ctx.fillText(line, width / 2, y)
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

