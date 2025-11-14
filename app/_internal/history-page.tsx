'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { useGenerations, useGeneration } from '../hooks/useGenerations'
import { useMobile } from '../hooks/useMobile'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Palette, Edit3, MessageSquare, Download, Menu } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import CarouselImageGenerator from '../components/CarouselImageGenerator'
import type { CarouselImageGeneratorHandle } from '../components/CarouselImageGenerator'
import { COLOR_THEMES } from '../config/carouselThemes'
import { getTemplateOptions } from '../config/carouselTemplates'
import TemplateSelectorModal from '../components/TemplateSelectorModal'
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

interface HistoryPageProps {
  onLoadGeneration?: (generationId: string) => void
  onOpenSidebar?: () => void
}

interface HistoryCardProps {
  generation: any
  imageUrls: string[]
  onLoadGeneration: (id: string) => void
}

function HistoryCard({ generation, imageUrls, onLoadGeneration }: HistoryCardProps) {
  const [imageLoadedStates, setImageLoadedStates] = useState<Record<number, boolean>>({})
  const [imageErrorStates, setImageErrorStates] = useState<Record<number, boolean>>({})

  const handleImageLoad = (index: number) => {
    setImageLoadedStates(prev => ({ ...prev, [index]: true }))
  }

  const handleImageError = (index: number) => {
    setImageErrorStates(prev => ({ ...prev, [index]: true }))
    setImageLoadedStates(prev => ({ ...prev, [index]: true })) // Mark as "loaded" to hide skeleton
  }

  const isImageLoading = (index: number) => {
    return !imageLoadedStates[index] && !imageErrorStates[index]
  }

  return (
    <div
      onClick={() => onLoadGeneration(generation.id)}
      className="card"
      style={{
        cursor: 'pointer',
        padding: '0',
        overflow: 'hidden',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Images Grid - Show first 2 slides */}
      <div style={{
        position: 'relative',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '2px',
        background: '#e5e5e5',
        aspectRatio: '2/1',
        minHeight: '200px',
        width: '100%',
      }}>
        {imageUrls.length >= 2 ? (
          <>
            {/* First Image */}
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {isImageLoading(0) && (
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
              <img
                src={imageUrls[0]}
                alt="Slide 1"
                crossOrigin="anonymous"
                onLoad={() => handleImageLoad(0)}
                onError={() => handleImageError(0)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  position: 'relative',
                  zIndex: imageLoadedStates[0] ? 2 : 0,
                  opacity: imageLoadedStates[0] ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out',
                }}
              />
            </div>
            {/* Second Image */}
            <div style={{ position: 'relative', width: '100%', height: '100%' }}>
              {isImageLoading(1) && (
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
              <img
                src={imageUrls[1]}
                alt="Slide 2"
                crossOrigin="anonymous"
                onLoad={() => handleImageLoad(1)}
                onError={() => handleImageError(1)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  position: 'relative',
                  zIndex: imageLoadedStates[1] ? 2 : 0,
                  opacity: imageLoadedStates[1] ? 1 : 0,
                  transition: 'opacity 0.3s ease-in-out',
                }}
              />
            </div>
          </>
        ) : imageUrls.length === 1 ? (
          <div style={{ gridColumn: '1 / -1', position: 'relative', width: '100%', height: '100%' }}>
            {isImageLoading(0) && (
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
            <img
              src={imageUrls[0]}
              alt="Slide 1"
              crossOrigin="anonymous"
              onLoad={() => handleImageLoad(0)}
              onError={() => handleImageError(0)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                position: 'relative',
                zIndex: imageLoadedStates[0] ? 2 : 0,
                opacity: imageLoadedStates[0] ? 1 : 0,
                transition: 'opacity 0.3s ease-in-out',
              }}
            />
          </div>
        ) : (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            color: '#999999',
            fontSize: '14px',
            height: '100%',
          }}>
            No preview
          </div>
        )}
      </div>

      {/* Project Info */}
      <div style={{ padding: '20px', flexShrink: 0 }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '700',
          marginBottom: '8px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {generation.project_name || generation.idea_title}
        </h3>
        <p style={{
          fontSize: '13px',
          color: '#666666',
        }}>
          {new Date(generation.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  )
}

function HistoryPageContent({ onLoadGeneration, onOpenSidebar }: HistoryPageProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const generationId = searchParams.get('id')
  const { user, loading: authLoading } = useAuth()
  const isMobile = useMobile()
  const [page, setPage] = useState(1)
  const itemsPerPage = 8
  const offset = (page - 1) * itemsPerPage
  
  const { generations, totalCount, isLoading, isError, mutate: mutateGenerations } = useGenerations(user?.id, itemsPerPage, offset)
  const totalPages = totalCount ? Math.ceil(totalCount / itemsPerPage) : 0

  // Load generation if generationId is in URL
  const { generation, isLoading: isLoadingGeneration, mutate: mutateGeneration } = useGeneration(
    generationId || undefined,
    user?.id
  )

  // State for customization view
  const [note, setNote] = useState<Note | null>(null)
  const [templateId, setTemplateId] = useState('template1')
  const [colorThemeId, setColorThemeId] = useState('purple-black')
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [activeLeftTab, setActiveLeftTab] = useState<'design' | 'carousels' | 'caption'>('design')
  const [editedCarousels, setEditedCarousels] = useState<Note['carousels']>([])
  const [carouselsDirty, setCarouselsDirty] = useState(false)
  const [savingCarousels, setSavingCarousels] = useState(false)
  const [editedCaption, setEditedCaption] = useState<string>('')
  const [captionCopied, setCaptionCopied] = useState(false)
  const [expandedCarouselIndexes, setExpandedCarouselIndexes] = useState<number[]>([])
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const carouselGeneratorRef = useRef<CarouselImageGeneratorHandle>(null)

  const leftTabs: { id: typeof activeLeftTab; label: string; icon: LucideIcon }[] = [
    { id: 'design', label: 'Customize Design', icon: Palette },
    { id: 'carousels', label: 'Edit Carousel', icon: Edit3 },
    { id: 'caption', label: 'Post Caption', icon: MessageSquare }
  ]

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Refetch data whenever the history page is accessed or generationId changes
  useEffect(() => {
    if (user && !authLoading) {
      // Refetch the generations list every time the history page is accessed
      if (mutateGenerations) {
        mutateGenerations()
      }
      
      // If viewing a specific generation, refetch that generation too
      if (generationId && mutateGeneration) {
        mutateGeneration()
      }
    }
  }, [user, authLoading, generationId, mutateGenerations, mutateGeneration])

  // Clear note state when generationId changes (before new generation loads)
  useEffect(() => {
    // Clear the note state immediately when generationId changes
    // This prevents showing the old post while the new one is loading
    setNote(null)
    setEditedCarousels([])
    setEditedCaption('')
    setCarouselsDirty(false)
    setExpandedCarouselIndexes([])
  }, [generationId])

  // Load generation data when generation is available
  useEffect(() => {
    if (!generation || !user || !generationId) return
    
    // CRITICAL: Only set the note if the generation ID matches the current generationId
    // This prevents showing stale cached data from SWR, especially important in production
    // where network latency can cause the old cached generation to briefly appear
    if (generation.id !== generationId) {
      console.log('🚫 Ignoring stale generation data:', {
        generationId: generation.id,
        expectedId: generationId,
        isLoading: isLoadingGeneration
      })
      return
    }

    // Debug: Log what we're getting from the API
    console.log('📝 Loading generation data:', {
      id: generation.id,
      hasCaption: !!generation.caption,
      captionLength: generation.caption?.length || 0,
      captionPreview: generation.caption ? generation.caption.substring(0, 100) : 'null/empty',
      allKeys: Object.keys(generation)
    })

    const noteData: Note = {
      ideaTitle: generation.idea_title,
      carousels: generation.slides,
      caption: generation.caption || '', // Ensure caption is always a string
      underlineWords: generation.underline_words
    }
    
    setNote(noteData)
    setEditedCarousels(generation.slides.map((slide: any) => ({ ...slide })))
    setEditedCaption(generation.caption || '') // Ensure we set an empty string if caption is null/undefined
    const templateOptions = getTemplateOptions()
    const validTemplateId = templateOptions.find(t => t.id === generation.template_id)?.id || 'template1'
    setTemplateId(validTemplateId)
    setColorThemeId(generation.color_theme_id || 'purple-black')
    setCarouselsDirty(false)
    setExpandedCarouselIndexes([])
    
    try {
      localStorage.setItem('postGeneration_generationId', generation.id)
      localStorage.setItem('postGeneration_userId', user.id)
      localStorage.setItem('postGeneration_ideaTitle', generation.idea_title)
      localStorage.setItem('postGeneration_fromHistory', 'true')
      
      if (generation.image_urls && generation.image_urls.length > 0) {
        localStorage.setItem('postGeneration_canvasImages', JSON.stringify(generation.image_urls))
      }
    } catch (error) {
      console.error('Error storing in localStorage:', error)
    }
  }, [generation, user, generationId, isLoadingGeneration])

  // Sync editable carousels with note
  useEffect(() => {
    if (note) {
      setEditedCarousels(note.carousels.map(carousel => ({ ...carousel })))
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

        const updatedUnderline: Note['underlineWords'] = data.data?.underlineWords || {}
        const sanitizedCarousels: Note['carousels'] = (data.data?.slides || cleanedCarousels) as Note['carousels']

        // ✅ CRITICAL: Preserve existing AI image URLs when updating underline/highlight words
        // The API sets imageUrl: null when extracting words, but we want to keep the existing AI images
        const preservedUnderlineWords: Note['underlineWords'] = {}
        const existingUnderlineWords = note.underlineWords || {}
        
        Object.keys(updatedUnderline).forEach((key) => {
          const index = parseInt(key, 10)
          const newWords = updatedUnderline[index]
          const existingWords = existingUnderlineWords[index]
          
          // Merge: Use new underline/highlight words from Gemini, but preserve existing image URLs
          preservedUnderlineWords[index] = {
            underline: newWords?.underline || '',
            highlight: newWords?.highlight || '',
            imageSearch: newWords?.imageSearch || '',
            // ✅ PRESERVE existing AI image URLs (don't overwrite with null)
            imageUrl: existingWords?.imageUrl || newWords?.imageUrl || null,
            originalImageUrl: existingWords?.originalImageUrl || newWords?.originalImageUrl || null,
          }
          
          console.log(`🖼️ Carousel ${index + 1}: Preserved imageUrl =`, preservedUnderlineWords[index].imageUrl || '(none)')
        })
        
        console.log('✅ Preserved AI image URLs in underlineWords:', Object.keys(preservedUnderlineWords).length, 'carousels')

        const updatedNote: Note = {
          ...note,
          carousels: sanitizedCarousels,
          underlineWords: preservedUnderlineWords
        }

        setNote(updatedNote)
        setEditedCarousels(sanitizedCarousels.map(carousel => ({ ...carousel })))
        setCarouselsDirty(false)

        // DON'T remove cached images - we want to preserve them when editing text
        // Only update the content hash to reflect the new underline words
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

        // ✅ IMPORTANT: Re-render carousels with new text and NEW underline/highlight words from Gemini
        // After text is edited, we need to regenerate the canvas images with:
        // 1. The new text content
        // 2. The newly extracted underline/highlight words from Gemini API
        // 3. The PRESERVED AI image URLs (so images don't disappear)
        // This ensures that downloads include the edited text + updated styling + AI images
        console.log('🔄 Text saved - triggering carousel re-render with new underline/highlight words from Gemini...')
        console.log('   Updated underlineWords (with preserved AI images):', JSON.stringify(preservedUnderlineWords, null, 2))
        
        if (carouselGeneratorRef.current && carouselGeneratorRef.current.regenerateAndSave) {
          // Pass the merged underlineWords (new words + preserved image URLs) to the regeneration
          // This ensures the carousels are drawn with:
          // - Correct highlight/underline words (from Gemini)
          // - Existing AI image URLs (preserved)
          carouselGeneratorRef.current.regenerateAndSave(preservedUnderlineWords).then(() => {
            console.log('✅ Carousels re-rendered with new text + new underline/highlight words + preserved AI images!')
          }).catch((err: any) => {
            console.error('⚠️ Failed to regenerate carousels for download:', err)
            // Don't fail the save operation, just warn the user
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

  const loadGeneration = (id: string) => {
    if (onLoadGeneration) {
      try {
        localStorage.setItem('postGeneration_fromHistory', 'true')
      } catch (error) {
        console.error('Error setting fromHistory flag:', error)
      }
      onLoadGeneration(id)
    } else {
      try {
        localStorage.setItem('postGeneration_fromHistory', 'true')
      } catch (error) {
        console.error('Error setting fromHistory flag:', error)
      }
      router.push(`/app/${id}`)
    }
  }

  const templateOptions = getTemplateOptions()

  const downloadAllCarousels = async () => {
    // Check for both imageUrls (camelCase) and image_urls (snake_case)
    const imageUrls = (generation as any)?.imageUrls || generation?.image_urls || []
    
    if (!generation || imageUrls.length === 0) {
      console.error('No images available to download')
      return
    }

    setDownloading(true)
    try {
      const zip = new JSZip()
      
      // Process all carousel images
      for (let i = 0; i < imageUrls.length; i++) {
        const imageUrl = imageUrls[i]
        if (!imageUrl) continue
        
        try {
          // Fetch the image
          const response = await fetch(imageUrl)
          if (!response.ok) {
            console.error(`Failed to fetch image ${i + 1}: HTTP ${response.status}`)
            continue
          }
          const blob = await response.blob()
          
          // Determine file name based on carousel kind
          const carousel = note?.carousels[i] || generation.slides[i]
          const kind = carousel?.kind || 'MIDDLE'
          const fileName = `carousel-${i + 1}-${kind.toLowerCase()}.png`
          
          // Add to zip
          zip.file(fileName, blob)
        } catch (error) {
          console.error(`Failed to fetch image ${i + 1}:`, error)
        }
      }
      
      // Generate zip file and trigger download
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(zipBlob)
      link.download = `${note?.ideaTitle || generation.idea_title || 'carousels'}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the object URL
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Error creating zip file:', error)
    } finally {
      setDownloading(false)
    }
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  // Show customization view when generation is loaded or loading
  if (generationId && (generation || isLoadingGeneration)) {
    // Show loading state in right column while generation is loading or note is being set
    const showLoading = isLoadingGeneration || (generation && !note)
    
    // Get image URLs (handle both camelCase and snake_case)
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
          overflow: 'hidden'
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
            // Show right border only on desktop to visually separate from sidebar
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
          {/* Mobile hamburger menu button */}
          {isMobile && onOpenSidebar && (
            <button
              onClick={onOpenSidebar}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'background 0.2s ease',
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <Menu size={20} color="#000000" />
            </button>
          )}
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
              whiteSpace: 'nowrap'
            }}
          >
            {generation?.idea_title || note?.ideaTitle || 'Carousel'}
          </h1>
          <button
            onClick={downloadAllCarousels}
            disabled={isDownloadDisabled}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px',
              background: 'transparent',
              color: isDownloadDisabled ? '#999999' : '#000000',
              border: 'none',
              borderRadius: '8px',
              cursor: isDownloadDisabled ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.2s, opacity 0.2s',
              opacity: isDownloadDisabled ? 0.5 : 1,
              flexShrink: 0,
              marginLeft: '12px'
            }}
            onMouseEnter={(e) => {
              if (!isDownloadDisabled) {
                e.currentTarget.style.background = '#f5f5f5'
              }
            }}
            onMouseLeave={(e) => {
              if (!isDownloadDisabled) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <Download size={20} />
          </button>
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
            padding: '0',
            margin: '0',
            minHeight: 0
          }}
        >
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {error && (
              <div className="error" style={{ margin: '0 0 24px', flex: '0 0 auto' }}>
                {error}
              </div>
            )}

            <div 
              className="responsive-grid"
              style={{ 
                // On desktop, use a two-column grid. On mobile, use a
                // vertical flex layout so we can control height ratios.
                display: isMobile ? 'flex' : 'grid', 
                flexDirection: isMobile ? 'column' : undefined,
                gridTemplateColumns: isMobile ? '1fr' : 'minmax(220px, 0.22fr) minmax(0, 0.78fr)', 
                gap: isMobile ? '24px' : '0px',
                alignItems: 'stretch',
                flex: 1,
                overflow: 'hidden',
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
                alignSelf: 'stretch',
                // On mobile, show the customization controls (style/content/caption)
                // above the carousel preview and constrain them to ~30% of the
                // vertical space so the post itself remains the focus.
                order: isMobile ? 1 : 1,
                flex: isMobile ? '0 0 30%' : undefined,
                maxHeight: isMobile ? '30vh' : undefined
              }}>
                <div className="card mobile-customize" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: '220px', overflow: 'hidden', padding: '0', border: 'none', background: 'transparent', borderRadius: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
                  {showLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '200px', padding: '24px' }}>
                      <div className="spinner"></div>
                      <p style={{ marginTop: '16px', color: '#666666' }}>Loading...</p>
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
                        // Desktop-only right border for the left control column
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
                              borderTopLeftRadius: 0,
                              borderTopRightRadius: 0,
                              borderBottomLeftRadius: 0,
                              borderBottomRightRadius: 0
                            }}
                            title={tab.label}
                            aria-label={tab.label}
                          >
                            <TabIcon size={18} color="#000000" />
                          </button>
                        )
                      })}
                    </div>

                    {/* Tab content - scrollable with horizontal padding */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px', paddingTop: '20px', paddingLeft: '20px', borderRight: isMobile ? 'none' : '1px solid rgb(229, 229, 229)', minHeight: 0 }}>
                    {/* Tab content */}
                    {activeLeftTab === 'design' && (
                      <div style={{ marginBottom: '24px' }}>
                        <h4 style={{ fontSize: isMobile ? '14px' : '16px', fontWeight: '600', marginBottom: '16px', color: '#000000' }}>
                          Carousel Style
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          <div style={{ minWidth: 0 }}>
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
                                minWidth: 0
                              }}>
                                {templateOptions.find(t => t.id === templateId)?.name || templateOptions[0]?.name || 'Select Template'}
                              </span>
                              <span style={{ fontSize: '12px', color: '#666666', flexShrink: 0, marginLeft: '8px' }}>▼</span>
                            </button>
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: isMobile ? '11px' : '13px', fontWeight: '500', color: '#000000' }}>
                              Color Theme
                            </label>
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(32px, 1fr))',
                              gap: '8px',
                              maxWidth: '100%'
                            }}>
                              {COLOR_THEMES.map(theme => {
                                const isSelected = colorThemeId === theme.id
                                return (
                                  <button
                                    key={theme.id}
                                    onClick={() => setColorThemeId(theme.id)}
                                    style={{
                                      aspectRatio: '1',
                                      borderRadius: '8px',
                                      border: isSelected ? '2px solid rgb(229, 229, 229)' : 'none',
                                      background: theme.highlightColor,
                                      cursor: 'pointer',
                                      padding: 0,
                                      position: 'relative',
                                      transition: 'all 0.2s ease',
                                      minWidth: '32px',
                                      minHeight: '32px',
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
                // On mobile, allow vertical scrolling and let the inner thumbnail
                // strip manage its own horizontal scrolling so it isn't clipped.
                overflowX: isMobile ? 'visible' : 'hidden',
                overflowY: isMobile ? 'auto' : 'hidden',
                display: 'flex', 
                flexDirection: 'column', 
                gap: isMobile ? '16px' : '24px', 
                minHeight: 0, 
                minWidth: 0, 
                alignSelf: 'stretch',
                // On mobile, place the carousel preview below the controls
                // and let it take the remaining vertical space.
                order: isMobile ? 2 : 2,
                flex: isMobile ? '1 1 70%' : undefined,
                marginBottom: isMobile ? '0' : '0'
              }}>
                {showLoading ? (
                  <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: '12px' }}>
                    <div className="loading">
                      <div className="spinner"></div>
                      <p style={{ marginTop: '16px', color: '#666666' }}>Loading carousel...</p>
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
                      caption={note.caption}
                      includeImages={false}
                      useAIImages={false}
                      aiImageStyle="animated"
                      onGenerationComplete={() => {
                        console.log('✅ Generation rendering complete')
                      }}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

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

  // Show history list view
  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', padding: isMobile ? '48px 16px 0 16px' : '48px 24px 0 24px' }}>
      {/* Main Content */}
      <div className="container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            History
          </h1>
        </div>

        {isLoading ? (
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(auto-fit, minmax(150px, 1fr))' : 'repeat(4, 1fr)',
            gap: '24px',
          }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="card"
                style={{
                  padding: '0',
                  overflow: 'hidden',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                }}
              >
                <div style={{
                  aspectRatio: '2/1',
                  background: '#e5e5e5',
                }} />
                <div style={{ padding: '20px' }}>
                  <div style={{
                    height: '20px',
                    background: '#e5e5e5',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    width: '70%',
                  }} />
                  <div style={{
                    height: '16px',
                    background: '#e5e5e5',
                    borderRadius: '4px',
                    width: '40%',
                  }} />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px',
            color: '#666666' 
          }}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>
              Error loading history
            </p>
            <p style={{ fontSize: '14px' }}>
              Please try refreshing the page
            </p>
          </div>
        ) : !generations || generations.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px',
            color: '#666666' 
          }}>
            <p style={{ fontSize: '18px', marginBottom: '16px' }}>
              No generations yet
            </p>
            <p style={{ fontSize: '14px' }}>
              Create your first note to see it here
            </p>
            <Link href="/dashboard?view=create" className="button" style={{ marginTop: '24px', display: 'inline-block' }}>
              Create Note
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(auto-fit, minmax(150px, 1fr))' : 'repeat(4, 1fr)',
            gap: '24px',
            alignItems: 'stretch',
          }}>
            {generations.map((gen: any) => {
              // API returns imageUrls (camelCase), not image_urls (snake_case)
              const imageUrls = gen.imageUrls || gen.image_urls || []
              
              // Debug: Log the URLs being used
              if (imageUrls.length === 0) {
                console.warn(`⚠️ Generation ${gen.id}: No image URLs found. Available keys:`, Object.keys(gen))
                console.warn(`   gen.imageUrls:`, gen.imageUrls)
                console.warn(`   gen.image_urls:`, gen.image_urls)
              } else {
                console.log(`✅ Generation ${gen.id}: Using ${imageUrls.length} image URLs`)
                console.log(`   First URL:`, imageUrls[0])
              }

              return (
                <HistoryCard
                  key={gen.id}
                  generation={gen}
                  imageUrls={imageUrls}
                  onLoadGeneration={loadGeneration}
                />
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && generations && generations.length > 0 && totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginTop: '48px'
          }}>
            <button
              onClick={() => setPage(page - 1)}
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
              Page {page} of {totalPages}
            </span>

            <button
              onClick={() => setPage(page + 1)}
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
      </div>

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
      `}</style>
    </div>
  )
}

export default function HistoryPage(props: HistoryPageProps) {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <HistoryPageContent {...props} />
    </Suspense>
  )
}
