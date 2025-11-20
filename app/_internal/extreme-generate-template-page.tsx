'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Sparkle, Check, Globe, Loader } from 'lucide-react'
import { CarouselTemplate, CAROUSEL_TEMPLATES } from '../config/carouselTemplates'
import { addColorThemeToCache, ColorTheme, COLOR_THEMES } from '../config/carouselThemes'
export default function ExtremeGenerateTemplatePage() {
  const { user } = useAuth()
  
  // Color extraction state
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [extractedColors, setExtractedColors] = useState<string[]>([])
  const [extractedColorsWithPercentages, setExtractedColorsWithPercentages] = useState<Array<{ color: string; percentage: number }>>([])
  const [extractedImages, setExtractedImages] = useState<string[]>([])
  const [extractedText, setExtractedText] = useState<string>('')
  const [isExtractingColors, setIsExtractingColors] = useState(false)
  const [colorExtractionError, setColorExtractionError] = useState('')
  
  // Generated content state
  const [generatedContent, setGeneratedContent] = useState<Array<{
    kind: 'HOOK' | 'MIDDLE' | 'CTA'
    topic?: string
    title: string
    subtitle?: string
    cta?: string
    content: string
  }> | null>(null)
  const [generatedUnderlineWords, setGeneratedUnderlineWords] = useState<Record<number, {
    underline: string
    highlight: string
    imageSearch: string
  }>>({})
  const [isGeneratingContent, setIsGeneratingContent] = useState(false)
  
  // Theme color selection
  const [selectedThemeColor, setSelectedThemeColor] = useState<string | null>(null)
  
  // Template generation state
  const [generatedTemplates, setGeneratedTemplates] = useState<Array<{
    type: string
    template: CarouselTemplate
    colorTheme?: ColorTheme
    previewSlides: Array<{
      kind: 'HOOK' | 'MIDDLE' | 'CTA'
      title: string
      content: string
      topic?: string
      subtitle?: string
      cta?: string
    }>
  }>>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')
  const [currentSlideIndexes, setCurrentSlideIndexes] = useState<Record<number, number>>({})


  const handleExtractColors = async () => {
    if (!websiteUrl.trim()) return

    setIsExtractingColors(true)
    setColorExtractionError('')
    setExtractedColors([])
    setExtractedColorsWithPercentages([])
    setExtractedImages([])
    setExtractedText('')
    setSelectedThemeColor(null)
    setGeneratedContent(null)
    setGeneratedTemplates([])

    try {
      const response = await fetch('/api/extract-colors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl })
      })

      if (!response.ok) throw new Error('Failed to extract colors')

      const data = await response.json()
      setExtractedColors(data.colors)
      setExtractedColorsWithPercentages(data.colorsWithPercentages || data.colors.map((c: string) => ({ color: c, percentage: 0 })))
      setExtractedImages(data.images || [])
      setExtractedText(data.text || data.extractedText || '')
    } catch (err: any) {
      setColorExtractionError(err.message || 'Failed to extract colors')
    } finally {
      setIsExtractingColors(false)
    }
  }

  const handleGenerateContent = async () => {
    if (!extractedText || !extractedText.trim()) {
      setGenerationError('No website text available.')
      return
    }

    setIsGeneratingContent(true)
    setGenerationError('')

    try {
      const response = await fetch('/api/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteText: extractedText })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate content')
      }

      const data = await response.json()
      if (data.success && data.slides && data.slides.length === 3) {
        setGeneratedContent(data.slides)
        setGeneratedUnderlineWords(data.underlineWords || {})
        console.log('[GENERATE-CONTENT] Successfully generated carousel content:', data.slides)
        console.log('[GENERATE-CONTENT] Underline words:', data.underlineWords)
        setGenerationError('')
      } else {
        throw new Error('Invalid response format')
      }
    } catch (err: any) {
      console.error('Error generating content:', err)
      setGenerationError(err.message || 'Failed to generate content')
    } finally {
      setIsGeneratingContent(false)
    }
  }

  const handleGenerateTemplates = async () => {
    if (!selectedThemeColor) return

    console.log('[GENERATE-TEMPLATES] Generating 4 types of templates with color:', selectedThemeColor)
    setIsGenerating(true)
    setGenerationError('')
    setGeneratedTemplates([])

    try {
      const normalizedColor = selectedThemeColor.startsWith('#') ? selectedThemeColor : `#${selectedThemeColor}`
      
      // Helper to convert hex to rgba
      const hexToRgba = (hex: string, alpha: number = 0.5): string => {
        const r = parseInt(hex.slice(1, 3), 16)
        const g = parseInt(hex.slice(3, 5), 16)
        const b = parseInt(hex.slice(5, 7), 16)
        return `rgba(${r}, ${g}, ${b}, ${alpha})`
      }

      // 1. Generate mesh gradient backgrounds via API
      const gradientResponse = await fetch('/api/generate-gradient', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedColor: normalizedColor })
      })

      if (!gradientResponse.ok) throw new Error('Failed to generate gradients')
      
      const gradientData = await gradientResponse.json()
      
      // TEMPLATE 1: Modern Mesh Gradient Type
      const meshTemplate: CarouselTemplate = {
        id: `mesh-gradient-${normalizedColor.replace('#', '')}`,
        name: `Mesh Gradient (${normalizedColor})`,
        fonts: {
          hook: {
            family: 'Poppins',
            weight: 'bold',
            style: 'normal',
            cssFont: 'bold 120px Poppins, sans-serif',
            lineHeight: 140,
            size: 120
          },
          title: {
            family: 'Poppins',
            weight: 'bold',
            style: 'normal',
            cssFont: 'bold 70px Poppins, sans-serif',
            lineHeight: 85,
            size: 70
          },
          content: {
            family: 'Inter',
            weight: 'normal',
            style: 'normal',
            cssFont: '52px Inter, sans-serif',
            lineHeight: 68,
            size: 52
          }
        },
        background: {
          type: 'image',
          src: gradientData.images.find((g: any) => g.slideType === 'Middle')?.imageUrl || gradientData.images[0]?.imageUrl
        },
        hookBackground: {
          type: 'image',
          src: gradientData.images.find((g: any) => g.slideType === 'Hook')?.imageUrl || gradientData.images[0]?.imageUrl,
          opacity: 1.0
        },
        textColor: '#FFFFFF',
        roleColors: {
          hook: '#FFFFFF',
          title: '#FFFFFF',
          content: '#FFFFFF',
          cta: '#FFFFFF'
        },
        styles: {
          letterSpacing: { hook: 0, title: 0, content: 0, cta: 0 },
          textAlign: { hook: 'left', title: 'left', content: 'left', cta: 'left' }
        },
        layout: {
          contentMaxWidth: 850,
          verticalAlign: 'center',
          gapTitleToContent: 40
        },
        imageLayout: {
          position: 'center',
          maxHeightRatio: 0.3,
          marginBottom: 40,
          marginTop: 40
        },
        imagePrompt: 'modern clean photography of {input}, professional lighting, vibrant colors, high quality, 4:5 aspect ratio',
        footer: { enabled: false },
        imagePlacement: {
          hook: false,
          content: false,
          cta: false
        },
        safeArea: {
          enabled: true,
          top: 80,
          bottom: 80,
          left: 80,
          right: 80
        }
      }

      // TEMPLATE 2: Note Type - STRICTLY USE TEMPLATE 1
      const template1 = CAROUSEL_TEMPLATES.find(t => t.id === 'template1')
      if (!template1) throw new Error('Template1 not found')
      
      const noteColorThemeId = `custom-note-${normalizedColor.replace('#', '')}`
      const noteTemplate: CarouselTemplate = {
        ...template1, // Use ALL properties from template1
        id: `note-${normalizedColor.replace('#', '')}`,
        name: `Note Type (${normalizedColor})`,
        defaultColorThemeId: noteColorThemeId,
        hookLayout: {
          showTopic: false,
          showSubtitle: false,
          showCTA: false
        }
      }
      
      const noteColorTheme: ColorTheme = {
        id: noteColorThemeId,
        name: `Note (${normalizedColor})`,
        textColor: '#000000',
        highlightColor: hexToRgba(normalizedColor, 0.5),
        underlineColor: '#000000',
        primaryColor: normalizedColor
      }

      // TEMPLATE 3: Basic Type - STRICTLY USE TEMPLATE 5
      const template5 = CAROUSEL_TEMPLATES.find(t => t.id === 'template5')
      if (!template5) throw new Error('Template5 not found')
      
      const basicTemplate: CarouselTemplate = {
        ...template5, // Use ALL properties from template5
        id: `basic-${normalizedColor.replace('#', '')}`,
        name: `Basic Type (${normalizedColor})`,
        textColor: normalizedColor,
        roleColors: {
          hook: normalizedColor,
          title: normalizedColor,
          content: normalizedColor,
          cta: normalizedColor
        }
      }

      // TEMPLATE 4: Image Type (using extracted images)
      const selectedImages = extractedImages.slice(0, 3)
      const imageTemplate: CarouselTemplate = {
        id: `image-${normalizedColor.replace('#', '')}`,
        name: `Image Type (${normalizedColor})`,
        fonts: {
          hook: {
            family: 'Poppins',
            weight: 'bold',
            style: 'normal',
            cssFont: 'bold 120px Poppins, sans-serif',
            lineHeight: 140,
            size: 120
          },
          title: {
            family: 'Poppins',
            weight: 'bold',
            style: 'normal',
            cssFont: 'bold 70px Poppins, sans-serif',
            lineHeight: 85,
            size: 70
          },
          content: {
            family: 'Inter',
            weight: 'normal',
            style: 'normal',
            cssFont: '52px Inter, sans-serif',
            lineHeight: 68,
            size: 52
          }
        },
        background: {
          type: 'image',
          src: selectedImages[1] || selectedImages[0] || '/backgrounds/bg1.jpg'
        },
        hookBackground: {
          type: 'image',
          src: selectedImages[0] || '/backgrounds/bg1.jpg',
          opacity: 1.0
        },
        textColor: '#FFFFFF',
        roleColors: {
          hook: '#FFFFFF',
          title: '#FFFFFF',
          content: '#FFFFFF',
          cta: '#FFFFFF'
        },
        styles: {
          letterSpacing: { hook: 0, title: 0, content: 0, cta: 0 },
          textAlign: { hook: 'left', title: 'left', content: 'left', cta: 'left' }
        },
        layout: {
          contentMaxWidth: 850,
          verticalAlign: 'center',
          gapTitleToContent: 40
        },
        imageLayout: {
          position: 'center',
          maxHeightRatio: 0.3,
          marginBottom: 40,
          marginTop: 40
        },
        imagePrompt: 'modern clean photography of {input}, professional lighting, vibrant colors, high quality, 4:5 aspect ratio',
        footer: { enabled: false },
        imagePlacement: {
          hook: false,
          content: false,
          cta: false
        },
        safeArea: {
          enabled: true,
          top: 80,
          bottom: 80,
          left: 80,
          right: 80
        }
      }

      // Add color theme to cache
      addColorThemeToCache(noteColorTheme)

      // Use generated content if available, otherwise use sample content
      const contentToUse = generatedContent
      const previewSlides = contentToUse ? contentToUse.map(slide => ({
        title: slide.title,
        content: slide.content,
        kind: slide.kind as 'HOOK' | 'MIDDLE' | 'CTA',
        topic: slide.topic,
        subtitle: slide.subtitle,
        cta: slide.cta
      })) : [
        {
          title: 'Sample Hook',
          content: '',
          kind: 'HOOK' as const
        },
        {
          title: 'Sample Middle',
          content: 'This is sample content that shows how your template will look.',
          kind: 'MIDDLE' as const
        },
        {
          title: 'Sample CTA',
          content: 'Final slide with call to action.',
          kind: 'CTA' as const
        }
      ]

      setGeneratedTemplates([
        {
          type: 'Modern Mesh Gradient',
          template: meshTemplate,
          previewSlides
        },
        {
          type: 'Note Type',
          template: noteTemplate,
          colorTheme: noteColorTheme,
          previewSlides
        },
        {
          type: 'Basic Type',
          template: basicTemplate,
          previewSlides
        },
        {
          type: 'Image Type',
          template: imageTemplate,
          previewSlides
        }
      ])

      console.log('[GENERATE-TEMPLATES] Successfully generated 4 templates')

    } catch (err: any) {
      console.error('Error generating templates:', err)
      setGenerationError(err.message || 'Failed to generate templates')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh',
      background: '#ffffff',
    }}>
      <div style={{
        padding: '60px 40px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '48px',
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: '700',
            color: '#000000',
            marginBottom: '12px',
          }}>
            Extreme Template Generator
          </h1>
          <p style={{
            fontSize: '16px',
            color: '#666666',
            lineHeight: '1.5',
          }}>
            Extract colors and images from a website, choose a theme color, and generate 4 different template types.
          </p>
        </div>

        {/* Step 1: Extract Colors */}
        <div style={{
          marginBottom: '32px',
          padding: '24px',
          background: '#f9f9f9',
          borderRadius: '12px',
          border: '1px solid #e5e5e5',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#000000',
            marginBottom: '16px',
          }}>
            Step 1: Extract Website Data
          </h2>
          <div style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '16px',
          }}>
            <input
              type="text"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="Enter website URL (e.g., https://example.com)"
              style={{
                flex: 1,
                padding: '12px 16px',
                fontSize: '15px',
                border: '2px solid #e5e5e5',
                borderRadius: '8px',
                outline: 'none',
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleExtractColors()
              }}
            />
            <button
              onClick={handleExtractColors}
              disabled={isExtractingColors || !websiteUrl.trim()}
              style={{
                padding: '12px 24px',
                fontSize: '15px',
                fontWeight: '600',
                color: '#ffffff',
                background: isExtractingColors || !websiteUrl.trim() ? '#cccccc' : '#000000',
                border: 'none',
                borderRadius: '8px',
                cursor: isExtractingColors || !websiteUrl.trim() ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isExtractingColors ? (
                <>
                  <Loader size={16} className="spinning" />
                  Extracting...
                </>
              ) : (
                <>
                  <Globe size={16} />
                  Extract
                </>
              )}
            </button>
          </div>
          {colorExtractionError && (
            <div style={{
              padding: '12px',
              background: '#fee',
              border: '1px solid #fcc',
              borderRadius: '8px',
              color: '#c00',
              fontSize: '14px',
            }}>
              {colorExtractionError}
            </div>
          )}
        </div>

        {/* Step 2: Choose Theme Color */}
        {extractedColorsWithPercentages.length > 0 && (
          <div style={{
            marginBottom: '32px',
            padding: '24px',
            background: '#f9f9f9',
            borderRadius: '12px',
            border: '1px solid #e5e5e5',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#000000',
              marginBottom: '16px',
            }}>
              Step 2: Choose Theme Color
            </h2>
            <div style={{
              display: 'flex',
              gap: '16px',
              flexWrap: 'wrap',
            }}>
              {extractedColorsWithPercentages.map((item, index) => {
                const isSelected = selectedThemeColor === item.color
                return (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                    }}
                    onClick={() => setSelectedThemeColor(item.color)}
                  >
                    <div
                      style={{
                        width: '80px',
                        height: '80px',
                        borderRadius: '8px',
                        background: item.color,
                        border: isSelected ? '4px solid #000000' : '2px solid #e5e5e5',
                        boxShadow: isSelected ? '0 4px 8px rgba(0, 0, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                        transition: 'all 0.2s ease',
                        transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                        position: 'relative',
                      }}
                    >
                      {isSelected && (
                        <div style={{
                          position: 'absolute',
                          top: '-8px',
                          right: '-8px',
                          background: '#000000',
                          color: '#ffffff',
                          borderRadius: '50%',
                          width: '24px',
                          height: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 'bold',
                        }}>
                          ✓
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize: '12px',
                      color: '#666666',
                      fontWeight: '500',
                      fontFamily: 'monospace',
                    }}>
                      {item.color}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3: Generate Content (if text available) */}
        {selectedThemeColor && extractedText && extractedText.trim() && (!generatedContent || generatedContent.length === 0) && (
          <div style={{
            marginBottom: '32px',
            padding: '24px',
            background: '#f9f9f9',
            borderRadius: '12px',
            border: '1px solid #e5e5e5',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#000000',
              marginBottom: '16px',
            }}>
              Step 3: Generate Sample Content
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#666666',
              marginBottom: '16px',
            }}>
              Generate authentic carousel content based on the website text (Hook, Middle, CTA slides).
            </p>
            <button
              onClick={handleGenerateContent}
              disabled={isGeneratingContent}
              style={{
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                background: isGeneratingContent ? '#cccccc' : '#000000',
                border: 'none',
                borderRadius: '12px',
                cursor: isGeneratingContent ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isGeneratingContent ? (
                <>
                  <Loader size={20} className="spinning" />
                  Generating Content...
                </>
              ) : (
                <>
                  <Sparkle size={20} />
                  Generate Content
                </>
              )}
            </button>

            {generationError && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '8px',
                color: '#c00',
                fontSize: '14px',
              }}>
                {generationError}
              </div>
            )}
          </div>
        )}

        {/* Success message after content generation */}
        {generatedContent && generatedContent.length > 0 && (
          <div style={{
            marginBottom: '32px',
            padding: '16px',
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <Check size={18} color="#0369a1" />
            <span style={{
              fontSize: '14px',
              color: '#0369a1',
              fontWeight: '500',
            }}>
              Content generated successfully! {generatedContent.length} slides ready.
            </span>
          </div>
        )}

        {/* Step 4: Generate Templates */}
        {selectedThemeColor && (generatedContent && generatedContent.length > 0 || !extractedText || !extractedText.trim()) && (
          <div style={{
            marginBottom: '32px',
            padding: '24px',
            background: '#f9f9f9',
            borderRadius: '12px',
            border: '1px solid #e5e5e5',
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#000000',
              marginBottom: '16px',
            }}>
              {extractedText && extractedText.trim() ? 'Step 4' : 'Step 3'}: Generate Templates
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#666666',
              marginBottom: '16px',
            }}>
              Click to generate 4 different template types with your selected theme color.
            </p>
            <button
              onClick={handleGenerateTemplates}
              disabled={isGenerating}
              style={{
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: '600',
                color: '#ffffff',
                background: isGenerating ? '#cccccc' : '#000000',
                border: 'none',
                borderRadius: '12px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              {isGenerating ? (
                <>
                  <Loader size={20} className="spinning" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkle size={20} />
                  Generate Templates
                </>
              )}
            </button>

            {generationError && (
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: '#fee',
                border: '1px solid #fcc',
                borderRadius: '8px',
                color: '#c00',
                fontSize: '14px',
              }}>
                {generationError}
              </div>
            )}
          </div>
        )}

        {/* Step 5: Generated Templates Preview */}
        {generatedTemplates.length > 0 && (
          <div style={{
            marginBottom: '32px',
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#000000',
              marginBottom: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <Check size={24} color="#00aa00" />
              Generated Templates
            </h2>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}>
              {generatedTemplates.map((item, templateIndex) => {
                const currentSlideIndex = currentSlideIndexes[templateIndex] || 0
                const currentSlide = item.previewSlides[currentSlideIndex]
                const template = item.template
                
                // Get background
                let previewBackground = '#f5f5f5'
                if (currentSlide.kind === 'HOOK' && template.hookBackground) {
                  previewBackground = `url(${template.hookBackground.src})`
                } else if (template.background?.type === 'image' && template.background.src) {
                  previewBackground = `url(${template.background.src})`
                } else if (template.background?.type === 'color') {
                  previewBackground = template.background.value
                }
                
                // Get text properties from template
                const textColor = template.textColor || '#000000'
                const textAlign = template.styles?.textAlign?.hook || 'left'
                const hookLayout = template.hookLayout || { showTopic: true, showSubtitle: true, showCTA: true }
                
                // Calculate scaled font sizes for preview
                const scaleHook = 0.16
                const scaleTitle = 0.22
                const scaleContent = 0.20
                
                return (
                  <div
                    key={templateIndex}
                    style={{
                      background: '#ffffff',
                      borderRadius: '16px',
                      border: '2px solid #e5e5e5',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                      overflow: 'hidden',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    {/* Visual Preview */}
                    <div style={{
                      width: '100%',
                      aspectRatio: '4/5',
                      background: previewBackground,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      padding: '50px 30px',
                      overflow: 'hidden',
                    }}>
                      {/* Render slide content using exact template properties */}
                      {currentSlide.kind === 'HOOK' ? (
                        <div style={{ textAlign: textAlign, width: '100%' }}>
                          {hookLayout.showTopic && currentSlide.topic && template.fonts.hookTopic && (
                            <div style={{
                              fontFamily: template.fonts.hookTopic.family,
                              fontSize: `${template.fonts.hookTopic.size * 0.08}px`,
                              fontWeight: template.fonts.hookTopic.weight,
                              color: template.roleColors?.hook || textColor,
                              marginBottom: '8px',
                              textTransform: 'uppercase',
                              letterSpacing: `${(template.styles?.letterSpacing?.hookTopic ?? 0) * 0.08}px`,
                            }}>
                              {currentSlide.topic}
                            </div>
                          )}
                          <div style={{
                            fontFamily: template.fonts.hook.family,
                            fontSize: `${template.fonts.hook.size * scaleHook}px`,
                            fontWeight: template.fonts.hook.weight,
                            color: template.roleColors?.hook || textColor,
                            lineHeight: template.fonts.hook.lineHeight / template.fonts.hook.size,
                            letterSpacing: `${(template.styles?.letterSpacing?.hook ?? 0) * scaleHook}px`,
                            marginBottom: hookLayout.showSubtitle && currentSlide.subtitle ? '12px' : '0',
                            textShadow: textColor === '#FFFFFF' ? '2px 2px 4px rgba(0, 0, 0, 0.6)' : 'none',
                          }}>
                            {currentSlide.title}
                          </div>
                          {hookLayout.showSubtitle && currentSlide.subtitle && template.fonts.hookSubtitle && (
                            <div style={{
                              fontFamily: template.fonts.hookSubtitle.family,
                              fontSize: `${template.fonts.hookSubtitle.size * 0.11}px`,
                              fontWeight: template.fonts.hookSubtitle.weight,
                              color: template.roleColors?.hook || textColor,
                              marginBottom: hookLayout.showCTA && currentSlide.cta ? '12px' : '0',
                              letterSpacing: `${(template.styles?.letterSpacing?.hookSubtitle ?? 0) * 0.11}px`,
                              textShadow: textColor === '#FFFFFF' ? '2px 2px 4px rgba(0, 0, 0, 0.6)' : 'none',
                            }}>
                              {currentSlide.subtitle}
                            </div>
                          )}
                          {hookLayout.showCTA && currentSlide.cta && template.fonts.hookCTA && (
                            <div style={{
                              fontFamily: template.fonts.hookCTA.family,
                              fontSize: `${template.fonts.hookCTA.size * 0.09}px`,
                              fontWeight: template.fonts.hookCTA.weight,
                              color: template.roleColors?.hook || textColor,
                              letterSpacing: `${(template.styles?.letterSpacing?.hookCTA ?? 0) * 0.09}px`,
                              textShadow: textColor === '#FFFFFF' ? '2px 2px 4px rgba(0, 0, 0, 0.6)' : 'none',
                            }}>
                              {currentSlide.cta}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: template.styles?.textAlign?.title || 'left', width: '100%' }}>
                          {currentSlide.kind !== 'CTA' && currentSlide.title && (
                            <div style={{
                              fontFamily: template.fonts.title.family,
                              fontSize: `${template.fonts.title.size * scaleTitle}px`,
                              fontWeight: template.fonts.title.weight,
                              color: template.roleColors?.title || textColor,
                              lineHeight: template.fonts.title.lineHeight / template.fonts.title.size,
                              letterSpacing: `${(template.styles?.letterSpacing?.title ?? 0) * scaleTitle}px`,
                              marginBottom: currentSlide.content ? '16px' : '0',
                              textShadow: textColor === '#FFFFFF' ? '2px 2px 4px rgba(0, 0, 0, 0.6)' : 'none',
                            }}>
                              {currentSlide.title}
                            </div>
                          )}
                          {currentSlide.content && (
                            <div style={{
                              fontFamily: template.fonts.content.family,
                              fontSize: `${template.fonts.content.size * scaleContent}px`,
                              fontWeight: template.fonts.content.weight,
                              color: template.roleColors?.content || textColor,
                              lineHeight: template.fonts.content.lineHeight / template.fonts.content.size,
                              letterSpacing: `${(template.styles?.letterSpacing?.content ?? 0) * scaleContent}px`,
                              textShadow: textColor === '#FFFFFF' ? '2px 2px 4px rgba(0, 0, 0, 0.6)' : 'none',
                            }}>
                              {currentSlide.content}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Slide indicator */}
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        padding: '6px 12px',
                        background: 'rgba(0, 0, 0, 0.7)',
                        color: '#ffffff',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}>
                        {currentSlide.kind}
                      </div>

                      {/* Color indicator */}
                      {item.colorTheme && (
                        <div style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: item.colorTheme.primaryColor,
                          border: '3px solid #ffffff',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                        }} />
                      )}

                      {/* Navigation */}
                      <div style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '12px',
                      }}>
                        <button
                          onClick={() => {
                            const newIndex = Math.max(0, currentSlideIndex - 1)
                            setCurrentSlideIndexes(prev => ({ ...prev, [templateIndex]: newIndex }))
                          }}
                          disabled={currentSlideIndex === 0}
                          style={{
                            padding: '8px 16px',
                            background: currentSlideIndex === 0 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.9)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          ← Prev
                        </button>
                        <div style={{
                          padding: '8px 16px',
                          background: 'rgba(255, 255, 255, 0.9)',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}>
                          {currentSlideIndex + 1} / {item.previewSlides.length}
                        </div>
                        <button
                          onClick={() => {
                            const newIndex = Math.min(item.previewSlides.length - 1, currentSlideIndex + 1)
                            setCurrentSlideIndexes(prev => ({ ...prev, [templateIndex]: newIndex }))
                          }}
                          disabled={currentSlideIndex === item.previewSlides.length - 1}
                          style={{
                            padding: '8px 16px',
                            background: currentSlideIndex === item.previewSlides.length - 1 ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.9)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: currentSlideIndex === item.previewSlides.length - 1 ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          Next →
                        </button>
                      </div>
                    </div>

                    {/* Template Info */}
                    <div style={{
                      padding: '20px',
                    }}>
                      <div style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#000000',
                        marginBottom: '8px',
                      }}>
                        {item.type}
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#666666',
                        marginBottom: '12px',
                      }}>
                        {template.name}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#0369a1',
                        fontWeight: '500',
                      }}>
                        ✓ Ready to use
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
