'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { useGenerations } from '../hooks/useGenerations'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, History, ChevronLeft, ChevronRight } from 'lucide-react'
import AccountButton from '../components/AccountButton'
import { useEffect, useState } from 'react'

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
  const [page, setPage] = useState(1)
  const itemsPerPage = 6
  const offset = (page - 1) * itemsPerPage
  
  const { generations, totalCount, isLoading, isError } = useGenerations(user?.id, itemsPerPage, offset)
  const totalPages = totalCount ? Math.ceil(totalCount / itemsPerPage) : 0

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Clear any generation-specific localStorage when viewing history
  // This prevents auto-loading content from previous sessions
  useEffect(() => {
    if (user) {
      try {
        // Only clear generation-specific data, keep user preferences
        localStorage.removeItem('postGeneration_note')
        localStorage.removeItem('postGeneration_canvasImages')
        localStorage.removeItem('postGeneration_fullContentHash')
        localStorage.removeItem('postGeneration_contentHash')
        localStorage.removeItem('postGeneration_generationId')
        localStorage.removeItem('postGeneration_ideaTitle')
        localStorage.removeItem('postGeneration_fromHistory')
        localStorage.removeItem('postGeneration_accountDescription')
      } catch (error) {
        console.error('Error clearing localStorage:', error)
      }
    }
  }, [user])

  // Debug: Log generations and thumbnail URLs
  useEffect(() => {
    if (generations && generations.length > 0) {
      console.log('📸 History page - Generations loaded:', generations.length)
      generations.forEach((gen, idx) => {
        console.log(`  Generation ${idx + 1}:`, {
          id: gen.id,
          idea_title: gen.idea_title,
          thumbnail_urls: gen.thumbnail_urls,
          thumbnail_count: gen.thumbnail_urls?.length || 0,
          thumbnail_urls_detail: gen.thumbnail_urls
        })
      })
    }
  }, [generations])

  const loadGeneration = (id: string) => {
    // Set flag to indicate we're coming from history page
    try {
      localStorage.setItem('postGeneration_fromHistory', 'true')
    } catch (error) {
      console.error('Error setting fromHistory flag:', error)
    }
    // Simply navigate to the generation page - let it handle data fetching
    // This is much faster and cleaner
    router.push(`/app/${id}`)
  }

  // Show loading state only on initial auth check
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
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '24px', 
              fontWeight: '700', 
              color: '#000000', 
              letterSpacing: '-0.5px',
              textDecoration: 'none'
            }}
          >
            <Image src="/logo.svg" alt="Post My Note" width={40} height={40} priority style={{ width: '40px', height: '40px' }} />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Link
              href="/app"
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
            {credits && (
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
                    background: '#f5f5f5',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e5e5e5'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f5f5f5'
                  }}
                  title="History"
                >
                  <History size={18} color="#000000" />
                </Link>
                <AccountButton
                  credits={credits.credits_remaining}
                  subscriptionStatus={credits.subscription_status}
                  currentPlan={credits.current_plan}
                />
              </>
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

        {isLoading ? (
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
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
            <Link href="/app" className="button" style={{ marginTop: '24px', display: 'inline-block' }}>
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
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          overflow: 'hidden',
                          background: '#f5f5f5',
                        }}
                      >
                        <img
                          src={url}
                          alt={`Thumbnail ${idx + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          onLoad={() => {
                            console.log(`✅ Thumbnail ${idx + 1} loaded successfully for generation ${gen.id}:`, url)
                          }}
                          onError={(e) => {
                            console.error(`❌ Failed to load thumbnail ${idx + 1} for generation ${gen.id}:`, url)
                            // If image fails to load, show placeholder
                            const target = e.target as HTMLImageElement
                            target.style.display = 'none'
                            const parent = target.parentElement
                            if (parent) {
                              parent.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; background: #f5f5f5; color: #999999; font-size: 12px;">No image</div>'
                            }
                          }}
                        />
                      </div>
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

        {/* Pagination */}
        {!isLoading && !isError && generations && generations.length > 0 && totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginTop: '48px',
            paddingBottom: '24px'
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
                transition: 'all 0.2s ease',
              }}
              className="pagination-button"
            >
              <ChevronLeft size={20} color="#000000" />
            </button>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                // Show first page, last page, current page, and pages around current
                const showPage = pageNum === 1 || 
                                 pageNum === totalPages || 
                                 Math.abs(pageNum - page) <= 1

                if (!showPage && pageNum === 2 && page > 3) {
                  return <span key={pageNum} style={{ color: '#999999' }}>...</span>
                }
                if (!showPage && pageNum === totalPages - 1 && page < totalPages - 2) {
                  return <span key={pageNum} style={{ color: '#999999' }}>...</span>
                }
                if (!showPage) return null

                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '40px',
                      height: '40px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: pageNum === page ? '2px solid #ffbd59' : '2px solid #e5e5e5',
                      background: pageNum === page ? '#ffbd59' : '#ffffff',
                      color: pageNum === page ? '#000000' : '#666666',
                      cursor: 'pointer',
                      fontWeight: pageNum === page ? '600' : '400',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                    }}
                    className="pagination-button"
                  >
                    {pageNum}
                  </button>
                )
              })}
            </div>

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
                transition: 'all 0.2s ease',
              }}
              className="pagination-button"
            >
              <ChevronRight size={20} color="#000000" />
            </button>

            <span style={{
              fontSize: '14px',
              color: '#666666',
              marginLeft: '12px'
            }}>
              Page {page} of {totalPages}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

