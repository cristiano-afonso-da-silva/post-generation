'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { useGenerations } from '../hooks/useGenerations'
import Link from 'next/link'
import { Plus, History, ChevronLeft, ChevronRight } from 'lucide-react'
import AccountButton from '../components/AccountButton'
import { useEffect, useState } from 'react'

const normalizeImages = (rawImages: any[]): string[] =>
  (rawImages || [])
    .map((img: any) => {
      if (!img) return ''
      if (typeof img === 'string') return img.replace(/^"+|"+$/g, '').trim()
      if (typeof img === 'object') {
        if (img.publicUrl) return String(img.publicUrl)
        if (img.url) return String(img.url)
      }
      return String(img)
    })
    .filter((img: string) => img.length > 0)

function HistoryThumbnail({ images }: { images: string[] }) {
  const [thumbs, setThumbs] = useState<string[]>([])

  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    async function loadThumbnails() {
      const targets = images.slice(0, 2)
      if (targets.length === 0) {
        setThumbs([])
        return
      }

      try {
        const loaded = await Promise.all(
          targets.map(async (url) => {
            try {
              const res = await fetch(url, {
                mode: 'cors',
                referrerPolicy: 'no-referrer',
                signal: controller.signal
              })
              if (!res.ok) {
                console.error('Thumbnail fetch failed', url, res.status)
                return ''
              }
              const blob = await res.blob()
              return URL.createObjectURL(blob)
            } catch (err) {
              console.error('Thumbnail fetch error', url, err)
              return ''
            }
          })
        )

        if (mounted) {
          setThumbs(loaded.filter(Boolean))
        }
      } catch (err) {
        console.error('Thumbnail load error', err)
      }
    }

    loadThumbnails()

    return () => {
      mounted = false
      controller.abort()
      setThumbs((prev) => {
        prev.forEach((url) => URL.revokeObjectURL(url))
        return []
      })
    }
  }, [images])

  if (thumbs.length === 0) {
    return (
      <div
        style={{
          gridColumn: '1 / -1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
          color: '#999999',
          fontSize: '14px'
        }}
      >
        No preview
      </div>
    )
  }

  return (
    <>
      {thumbs[0] && (
        <img
          src={thumbs[0]}
          alt="Slide 1"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      )}
      {thumbs[1] ? (
        <img
          src={thumbs[1]}
          alt="Slide 2"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        thumbs[0] && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
              color: '#999999'
            }}
          >
            Slide 2 unavailable
          </div>
        )
      )}
    </>
  )
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

  const loadGeneration = (id: string) => {
    try {
      localStorage.setItem('postGeneration_fromHistory', 'true')
    } catch (error) {
      console.error('Error setting fromHistory flag:', error)
    }
    router.push(`/app/${id}`)
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
              textDecoration: 'none'
            }}
          >
            Post My Note
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
                cursor: 'pointer',
                textDecoration: 'none',
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
                    background: '#f5f5f5',
                    textDecoration: 'none',
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
            {generations.map((gen: any) => {
              // EXACT SAME as generation page: use image_urls directly (line 169 in [id]/page.tsx)
              const imageUrls = gen.image_urls || []

              return (
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
                  {/* Images Grid - Show first 2 slides */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '2px',
                    background: '#e5e5e5',
                    aspectRatio: '2/1',
                  }}>
                    {imageUrls.length >= 2 ? (
                      <>
                        <img
                          src={imageUrls[0]}
                          alt="Slide 1"
                          crossOrigin="anonymous"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                          onError={(e) => {
                            console.error('Failed to load image 1:', imageUrls[0])
                            e.currentTarget.style.display = 'none'
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.style.background = '#f5f5f5'
                              parent.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 12px;">Preview unavailable</div>'
                            }
                          }}
                        />
                        <img
                          src={imageUrls[1]}
                          alt="Slide 2"
                          crossOrigin="anonymous"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                          onError={(e) => {
                            console.error('Failed to load image 2:', imageUrls[1])
                            e.currentTarget.style.display = 'none'
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.style.background = '#f5f5f5'
                              parent.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 12px;">Preview unavailable</div>'
                            }
                          }}
                        />
                      </>
                    ) : imageUrls.length === 1 ? (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <img
                          src={imageUrls[0]}
                          alt="Slide 1"
                          crossOrigin="anonymous"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            display: 'block',
                          }}
                          onError={(e) => {
                            console.error('Failed to load image:', imageUrls[0])
                            e.currentTarget.style.display = 'none'
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.style.background = '#f5f5f5'
                              parent.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999; font-size: 14px;">No preview</div>'
                            }
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
                      {gen.project_name || gen.idea_title}
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
    </div>
  )
}
