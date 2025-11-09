'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import Link from 'next/link'
import AccountButton from '../components/AccountButton'

interface Generation {
  id: string
  project_name: string
  idea_title: string
  thumbnail_urls: string[]
  created_at: string
}

export default function HistoryPage() {
  const router = useRouter()
  const { user, loading: authLoading, credits } = useAuth()
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/landing')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      fetchGenerations()
    }
  }, [user])

  const fetchGenerations = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/generations/list?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch generations')
      }
      const data = await response.json()
      setGenerations(data.generations || [])
    } catch (error) {
      console.error('Error fetching generations:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadGeneration = async (id: string) => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/generations/${id}?userId=${user.id}`)
      if (!response.ok) {
        throw new Error('Failed to load generation')
      }
      const data = await response.json()
      const gen = data.generation

      // Store in localStorage to load in main page
      // Note: API returns 'slides' but we map to 'carousels' for our Note interface
      localStorage.setItem('postGeneration_note', JSON.stringify({
        ideaTitle: gen.idea_title,
        carousels: gen.slides,
        caption: gen.caption,
        underlineWords: gen.underline_words
      }))
      localStorage.setItem('postGeneration_accountDescription', gen.account_description || '')
      localStorage.setItem('postGeneration_fontCombinationId', gen.font_combination_id)
      localStorage.setItem('postGeneration_colorThemeId', gen.color_theme_id)
      
      // Store generation_id and content hash (ideaTitle + carousels only, excludes theme/font)
      localStorage.setItem('postGeneration_generationId', gen.id)
      const contentHash = JSON.stringify({
        ideaTitle: gen.idea_title,
        carousels: gen.slides
      })
      localStorage.setItem('postGeneration_contentHash', contentHash)
      // Store ideaTitle to track that credits were already deducted for this idea
      localStorage.setItem('postGeneration_ideaTitle', gen.idea_title)
      
      // Store images
      if (gen.imageUrls && gen.imageUrls.length > 0) {
        localStorage.setItem('postGeneration_canvasImages', JSON.stringify(gen.imageUrls))
        // Also store full content hash for image matching (includes theme/font)
        const fullContentHash = JSON.stringify({
          ideaTitle: gen.idea_title,
          carousels: gen.slides,
          underlineWords: gen.underline_words,
          fontCombinationId: gen.font_combination_id,
          colorThemeId: gen.color_theme_id
        })
        localStorage.setItem('postGeneration_fullContentHash', fullContentHash)
      }

      // Navigate to main page
      router.push('/')
    } catch (error) {
      console.error('Error loading generation:', error)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>Loading history...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      {/* Header */}
      <header style={{
        borderBottom: '2px solid #e5e5e5',
        padding: '24px 0',
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Link 
            href="/" 
            style={{ 
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#000000', 
              letterSpacing: '-0.5px',
              textDecoration: 'none'
            }}
          >
            Post My Note
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {credits && (
              <AccountButton
                credits={credits.credits_remaining}
                subscriptionStatus={credits.subscription_status}
                currentPlan={credits.current_plan}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container">
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            History
          </h1>
        </div>

        {generations.length === 0 ? (
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
            <Link href="/" className="button" style={{ marginTop: '24px', display: 'inline-block' }}>
              Create Note
            </Link>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px',
          }}>
            {generations.map((gen) => (
              <div
                key={gen.id}
                onClick={() => loadGeneration(gen.id)}
                className="card"
                style={{
                  cursor: 'pointer',
                  padding: '0',
                  overflow: 'hidden',
                }}
              >
                {/* Thumbnail Images */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '2px',
                  background: '#e5e5e5',
                  aspectRatio: '2/1',
                }}>
                  {gen.thumbnail_urls && gen.thumbnail_urls.length > 0 ? (
                    gen.thumbnail_urls.map((url, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: `url(${url}) center/cover`,
                          width: '100%',
                          height: '100%',
                        }}
                      />
                    ))
                  ) : (
                    <div style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: '#f5f5f5',
                      color: '#999999',
                      fontSize: '14px',
                    }}>
                      No preview
                    </div>
                  )}
                </div>

                {/* Project Info */}
                <div style={{ padding: '20px' }}>
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {gen.project_name}
                  </h3>
                  <p style={{
                    fontSize: '13px',
                    color: '#666666',
                  }}>
                    {new Date(gen.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

