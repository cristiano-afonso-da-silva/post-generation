'use client'

import { useState, useEffect, useRef, Suspense, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { History, Palette, Edit3, MessageSquare, ChevronLeft, Plus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import '../../globals.css'
import CarouselImageGenerator from '../../components/CarouselImageGenerator'
import { COLOR_THEMES } from '../../config/carouselThemes'
import { getTemplateOptions } from '../../config/carouselTemplates'
import { useAuth } from '../../context/AuthContext'
import { useGeneration } from '../../hooks/useGenerations'
import AccountButton from '../../components/AccountButton'
import UpgradePrompt from '../../components/UpgradePrompt'
import SubscriptionModal from '../../components/SubscriptionModal'
import TemplateSelectorModal from '../../components/TemplateSelectorModal'

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

// Component to handle search params with Suspense
function SearchParamsHandler({ refreshCredits, router }: { refreshCredits: () => void; router: ReturnType<typeof useRouter> }) {
  const searchParams = useSearchParams()
  const processedKeyRef = useRef<string | null>(null)
  
  useEffect(() => {
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    
    // Create a unique key for these params
    const paramsKey = success === 'true' ? 'success' : canceled === 'true' ? 'canceled' : null
    
    // Skip if no params or if we've already processed this exact param
    if (!paramsKey || processedKeyRef.current === paramsKey) {
      return
    }
    
    // Mark as processed before doing anything to prevent re-execution
    processedKeyRef.current = paramsKey
    
    if (success === 'true') {
      refreshCredits()
    }
    
    // Remove query params from URL
    const currentPath = window.location.pathname
    
    // Use replaceState first to update URL immediately without navigation
    if (window.location.search) {
      window.history.replaceState({}, '', currentPath)
    }
    
    // Then sync with Next.js router (this shouldn't cause a reload since URL is already updated)
    router.replace(currentPath)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]) // Only depend on searchParams - refreshCredits and router are stable
  
  return null
}

export default function GenerationPage() {
  const router = useRouter()
  const params = useParams()
  const generationId = params.id as string
  const { user, loading: authLoading, credits, refreshCredits } = useAuth()
  const { generation, isLoading, isError } = useGeneration(generationId, user?.id)
  
  const [accountDescription, setAccountDescription] = useState('')
  const [note, setNote] = useState<Note | null>(null)
  const [error, setError] = useState('')
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false)
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [editedCarousels, setEditedCarousels] = useState<Note['carousels']>([])
  const [carouselsDirty, setCarouselsDirty] = useState(false)
  const [savingCarousels, setSavingCarousels] = useState(false)
  const [editedCaption, setEditedCaption] = useState<string>('')
  const [captionCopied, setCaptionCopied] = useState(false)
  const [activeLeftTab, setActiveLeftTab] = useState<'design' | 'carousels' | 'caption'>('design')
  const [expandedCarouselIndexes, setExpandedCarouselIndexes] = useState<number[]>([])
  const [showCustomisation, setShowCustomisation] = useState(true)
  // Initialize fromHistory synchronously to prevent flash
  const [fromHistory, setFromHistory] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('postGeneration_fromHistory') === 'true'
      } catch {
        return false
      }
    }
    return false
  })
  
  // Theme settings
  const [templateId, setTemplateId] = useState('template1')
  const [colorThemeId, setColorThemeId] = useState('purple-black')

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

  // Check if coming from history page on mount
  useEffect(() => {
    if (user && !authLoading) {
      try {
        const fromHistoryFlag = localStorage.getItem('postGeneration_fromHistory')
        if (fromHistoryFlag === 'true') {
          setFromHistory(true)
          // Clear the flag after a short delay to ensure component has rendered
          setTimeout(() => {
            localStorage.removeItem('postGeneration_fromHistory')
          }, 100)
        } else {
          setFromHistory(false)
        }
      } catch (error) {
        console.error('Error checking fromHistory flag:', error)
        setFromHistory(false)
      }
    }
  }, [user, authLoading])

  // Load generation data from SWR hook
  useEffect(() => {
    if (!generation) return

      // Map API response to Note interface
      const noteData: Note = {
      ideaTitle: generation.idea_title,
      carousels: generation.slides,
      caption: generation.caption,
      underlineWords: generation.underline_words
      }
      
      setNote(noteData)
    setEditedCarousels(generation.slides.map((slide: any) => ({ ...slide })))
    setEditedCaption(generation.caption || '')
    setAccountDescription(generation.account_description || '')
    setTemplateId(generation.template_id || 'template1')
    setColorThemeId(generation.color_theme_id || 'purple-black')
      
    // Store minimal data in localStorage for CarouselImageGenerator
    if (user?.id) {
      try {
        localStorage.setItem('postGeneration_generationId', generation.id)
      localStorage.setItem('postGeneration_userId', user.id)
        localStorage.setItem('postGeneration_ideaTitle', generation.idea_title)
      
      // Store images if available
        if (generation.image_urls && generation.image_urls.length > 0) {
          localStorage.setItem('postGeneration_canvasImages', JSON.stringify(generation.image_urls))
      }
    } catch (error) {
        console.error('Error storing in localStorage:', error)
      }
    }
  }, [generation, user])

  // Sync editable carousels with generated note
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

        const updatedNote: Note = {
          ...note,
          carousels: sanitizedCarousels,
          underlineWords: updatedUnderline
        }

        setNote(updatedNote)
        setEditedCarousels(sanitizedCarousels.map(carousel => ({ ...carousel })))
        setCarouselsDirty(false)

        try {
          localStorage.setItem('postGeneration_note', JSON.stringify(updatedNote))
          localStorage.removeItem('postGeneration_canvasImages')
          localStorage.removeItem('postGeneration_fullContentHash')
        } catch (storageError) {
          console.warn('Could not persist edited carousels to localStorage:', storageError)
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

  if (authLoading || isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading">
          <div className="spinner"></div>
          <span style={{ color: '#000000' }}>Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (isError || (error && !note)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '18px', marginBottom: '16px', color: '#000000' }}>
            {error || 'Failed to load generation'}
          </p>
          <Link href="/app" className="button">Go to New Idea</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: '#ffffff', minHeight: '100vh' }}>
      <Suspense fallback={null}>
        <SearchParamsHandler refreshCredits={refreshCredits} router={router} />
      </Suspense>
      
      {/* Header */}
      <header style={{
        borderBottom: '2px solid #e5e5e5',
        padding: '24px 0',
        background: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div className="header-inner" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Link 
            href="/" 
            style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#000000', 
              letterSpacing: '-0.5px',
              cursor: 'pointer',
              textDecoration: 'none'
            }}
          >
            <Image src="/logo.svg" alt="Post My Note" width={40} height={40} priority style={{ width: '40px', height: '40px' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/app"
              onClick={(e) => {
                e.preventDefault()
                // Clear all state and navigate to fresh /app
                try {
                  localStorage.removeItem('postGeneration_note')
                  localStorage.removeItem('postGeneration_canvasImages')
                  localStorage.removeItem('postGeneration_fullContentHash')
                  localStorage.removeItem('postGeneration_contentHash')
                  localStorage.removeItem('postGeneration_generationId')
                  localStorage.removeItem('postGeneration_ideaTitle')
                  localStorage.removeItem('postGeneration_fromHistory')
                  localStorage.removeItem('postGeneration_accountDescription')
                  localStorage.removeItem('postGeneration_fontCombinationId')
                  localStorage.removeItem('postGeneration_colorThemeId')
                } catch (error) {
                  console.error('Error clearing localStorage:', error)
                }
                // Force a full page reload to ensure fresh state
                window.location.href = '/app'
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: '#ffbd59',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textDecoration: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#ffa929'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#ffbd59'
              }}
              title="Create New Idea"
            >
              <Plus size={18} color="#000000" />
            </Link>
            {user && (
              <>
                <Link 
                  href="/history"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#e5e5e5',
                    border: '2px solid #e5e5e5',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#d0d0d0'
                    e.currentTarget.style.borderColor = '#d0d0d0'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#e5e5e5'
                    e.currentTarget.style.borderColor = '#e5e5e5'
                  }}
                  title="History"
                >
                  <History size={18} color="#000000" />
                </Link>
                <AccountButton
                  credits={credits?.credits_remaining ?? 0}
                  subscriptionStatus={credits?.subscription_status ?? null}
                  currentPlan={credits?.current_plan ?? null}
                />
              </>
            )}
          </div>
        </div>
      </header>

      <div
        className="container"
        style={{
          height: 'calc(100vh - 120px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div className="mobile-stack" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {error && (
            <div className="error" style={{ margin: '0 0 24px', flex: '0 0 auto' }}>
              {error}
            </div>
          )}

          <div 
            className="responsive-grid"
            style={{ 
              display: 'grid', 
              gridTemplateColumns: 'minmax(260px, 0.3fr) minmax(0, 0.7fr)', 
              gap: '32px',
              alignItems: 'stretch',
              flex: 1,
              overflow: 'hidden'
            }}
          >
            {/* LEFT COLUMN - Customisation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', overflow: 'hidden', alignSelf: 'stretch' }}>
              <div className="card mobile-customize" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflowY: 'auto', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {!fromHistory && (
                    <button
                      onClick={() => router.push('/app')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'none',
                        border: 'none',
                        padding: '8px 0',
                        cursor: 'pointer',
                        marginBottom: '24px',
                        color: '#000000',
                        fontSize: '16px',
                        fontWeight: '600'
                      }}
                    >
                      <ChevronLeft size={20} />
                      <span>Back</span>
                    </button>
                  )}
                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '24px', color: '#000000' }}>
                      Customisation
                    </h3>
                  
                  {/* Tab buttons */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      gap: '0',
                      alignItems: 'stretch',
                      border: '2px solid #e5e5e5',
                      borderRadius: '12px',
                      padding: '2px',
                      background: '#ededed',
                      height: 'fit-content',
                      marginBottom: '24px'
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
                            padding: '8px 16px',
                            flex: 1,
                            border: 'none',
                            borderRadius: '10px',
                            background: isActive ? '#d8d8d8' : '#ededed',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          title={tab.label}
                          aria-label={tab.label}
                        >
                          <TabIcon size={20} color="#000000" />
                        </button>
                      )
                    })}
                  </div>

                  {/* Tab content - same as app/page.tsx */}
                  {activeLeftTab === 'design' && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#000000' }}>
                        Carousel Style
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#000000' }}>
                            Template
                          </label>
                          <button
                            onClick={() => setShowTemplateModal(true)}
                            className="input"
                            style={{ 
                              cursor: 'pointer', 
                              padding: '12px',
                              textAlign: 'left',
                              background: '#ffffff',
                              border: '2px solid #e5e5e5',
                              borderRadius: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              width: '100%'
                            }}
                          >
                            <span>{getTemplateOptions().find(t => t.id === templateId)?.name || 'Select Template'}</span>
                            <span style={{ fontSize: '12px', color: '#666666' }}>▼</span>
                          </button>
                        </div>
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '500', color: '#000000' }}>
                            Color Theme
                          </label>
                          <select
                            value={colorThemeId}
                            onChange={(e) => setColorThemeId(e.target.value)}
                            className="input"
                            style={{ cursor: 'pointer', padding: '12px' }}
                          >
                            {COLOR_THEMES.map(theme => (
                              <option key={theme.id} value={theme.id}>
                                {theme.name}
                              </option>
                            ))}
                          </select>
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
                                    fontSize: '14px', 
                                    fontWeight: '500', 
                                    color: '#000000', 
                                    textTransform: 'none',
                                    letterSpacing: '0px'
                                  }}>
                                    Carousel {index + 1} • {kind === 'MIDDLE' ? 'Content' : kind === 'HOOK' ? 'Hook' : kind === 'CTA' ? 'CTA' : kind}
                                  </div>
                                  <span style={{ fontSize: '14px', color: '#000000', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
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
                          flexDirection: 'column',
                          gap: '12px',
                          marginTop: '24px'
                        }}>
                          <button
                            className="button secondary"
                            onClick={resetEditedCarousels}
                            disabled={!carouselsDirty || savingCarousels}
                            style={{ width: '100%' }}
                          >
                            Reset
                          </button>
                          <button
                            className="button"
                            onClick={saveEditedCarousels}
                            disabled={!carouselsDirty || savingCarousels}
                            style={{ width: '100%' }}
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
                        Instagram Caption
                      </h3>
                      <textarea
                        className="input"
                        value={editedCaption}
                        onChange={(e) => setEditedCaption(e.target.value)}
                        placeholder="Generate a post to see the caption here"
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
                          style={{ width: '100%', marginTop: '12px' }}
                        >
                          {captionCopied ? 'Copied' : 'Copy'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - Output */}
            <div className="mobile-output" style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 0, alignSelf: 'stretch' }}>
              {note && (
                <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                  <CarouselImageGenerator 
                    carousels={carouselsDirty && editedCarousels.length > 0 ? editedCarousels : note.carousels}
                    ideaTitle={note.ideaTitle}
                    ideaIndex={null}
                    underlineWords={note.underlineWords || {}}
                    templateId={templateId}
                    colorThemeId={colorThemeId}
                    accountDescription={accountDescription}
                    caption={note.caption}
                    onGenerationComplete={() => {
                      // Navigate to /app/{generationId} after saving
                      const savedGenerationId = localStorage.getItem('postGeneration_generationId')
                      if (savedGenerationId) {
                        router.push(`/app/${savedGenerationId}`)
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        currentPlan={credits?.current_plan || null}
      />

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        currentPlan={credits?.current_plan || null}
        credits={credits?.credits_remaining}
        subscriptionStatus={credits?.subscription_status || null}
      />

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

