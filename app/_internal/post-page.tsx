'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { useGenerations } from '../hooks/useGenerations'
import { Send, CheckCircle, XCircle, Loader2, AlertCircle, Link2 } from 'lucide-react'

interface ThreadsConnectionStatus {
  connected: boolean
  isExpired?: boolean
  expiresAt?: string
  threadsUserId?: string
  connectedAt?: string
}

interface PostingStatus {
  [generationId: string]: 'idle' | 'posting' | 'posted' | 'failed'
}

function PostPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const [page, setPage] = useState(1)
  const itemsPerPage = 12
  const offset = (page - 1) * itemsPerPage
  
  const { generations, totalCount, isLoading, isError, mutate: mutateGenerations } = useGenerations(user?.id, itemsPerPage, offset)
  const totalPages = totalCount ? Math.ceil(totalCount / itemsPerPage) : 0

  const [connectionStatus, setConnectionStatus] = useState<ThreadsConnectionStatus | null>(null)
  const [loadingConnection, setLoadingConnection] = useState(true)
  const [selectedGenerations, setSelectedGenerations] = useState<Set<string>>(new Set())
  const [postingStatus, setPostingStatus] = useState<PostingStatus>({})
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [disconnecting, setDisconnecting] = useState(false)

  // Check for URL params (success/error from OAuth callback)
  useEffect(() => {
    const successParam = searchParams.get('success')
    const errorParam = searchParams.get('error')
    
    if (successParam === 'threads_connected') {
      setSuccess('Successfully connected to Threads!')
      // Clear the param from URL
      router.replace('/dashboard?view=post', { scroll: false })
      // Refresh connection status
      checkConnectionStatus()
    }
    
    if (errorParam) {
      const errorMessages: Record<string, string> = {
        threads_auth_failed: 'Failed to connect to Threads. Please try again.',
        no_code: 'Authorization failed. Please try again.',
        token_exchange_failed: 'Failed to authenticate with Threads. Please try again.',
        db_error: 'Failed to save connection. Please try again.',
        callback_failed: 'Connection process failed. Please try again.',
      }
      setError(errorMessages[errorParam] || 'An error occurred. Please try again.')
      // Clear the param from URL
      router.replace('/dashboard?view=post', { scroll: false })
    }
  }, [searchParams, router])

  // Check Threads connection status
  const checkConnectionStatus = async () => {
    if (!user?.id) return
    
    setLoadingConnection(true)
    try {
      const response = await fetch(`/api/threads/status?userId=${user.id}`, {
        method: 'GET',
        cache: 'no-store'
      })
      const data = await response.json()
      if (!response.ok) {
        console.error('Threads status response not OK', data)
        setConnectionStatus({ connected: false })
      } else {
        setConnectionStatus(data)
      }
    } catch (err) {
      console.error('Error checking connection status:', err)
      setConnectionStatus({ connected: false })
    } finally {
      setLoadingConnection(false)
    }
  }

  useEffect(() => {
    if (user && !authLoading) {
      checkConnectionStatus()
      mutateGenerations()
    }
  }, [user?.id, authLoading])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin')
    }
  }, [user, authLoading, router])

  const handleConnectThreads = () => {
    if (!user?.id) {
      router.push('/signin')
      return
    }

    const params = new URLSearchParams({ userId: user.id })
    window.location.href = `/api/threads/auth?${params.toString()}`
  }

  const handleDisconnectThreads = async () => {
    if (!user?.id) return
    setDisconnecting(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/threads/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to disconnect Threads')
      }
      console.log('Threads disconnected', data)
      setConnectionStatus({ connected: false })
      setSuccess('Disconnected from Threads.')
      setSelectedGenerations(new Set())
    } catch (err: any) {
      console.error('Disconnect error:', err)
      setError(err.message || 'Failed to disconnect Threads')
    } finally {
      setDisconnecting(false)
    }
  }

  const toggleSelection = (generationId: string) => {
    setSelectedGenerations(prev => {
      const next = new Set(prev)
      if (next.has(generationId)) {
        next.delete(generationId)
      } else {
        next.add(generationId)
      }
      return next
    })
  }

  const selectAll = () => {
    if (!generations) return
    if (selectedGenerations.size === generations.length) {
      setSelectedGenerations(new Set())
    } else {
      setSelectedGenerations(new Set(generations.map(g => g.id)))
    }
  }

  const postToThreads = async (generationId: string) => {
    if (!connectionStatus?.connected) {
      setError('Please connect your Threads account first')
      return
    }

    // Find the generation
    const generation = generations?.find(g => g.id === generationId)
    if (!generation) {
      setError('Generation not found')
      return
    }

    setPostingStatus(prev => ({ ...prev, [generationId]: 'posting' }))
    setError('')
    setSuccess('')

    try {
      console.log('Posting generation to Threads', generationId)
      const response = await fetch('/api/threads/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generationId: generation.id,
          imageUrls: (generation as any).imageUrls || [],
          caption: generation.caption || '',
          userId: user?.id
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to post to Threads')
      }

      setPostingStatus(prev => ({ ...prev, [generationId]: 'posted' }))
      setSuccess(`Successfully posted "${generation.idea_title}" to Threads!`)
      
      // Remove from selection
      setSelectedGenerations(prev => {
        const next = new Set(prev)
        next.delete(generationId)
        return next
      })

      // Refresh generations to get updated status
      mutateGenerations()
    } catch (err: any) {
      console.error('Posting error:', err)
      setPostingStatus(prev => ({ ...prev, [generationId]: 'failed' }))
      setError(err.message || 'Failed to post to Threads')
    }
  }

  const postSelected = async () => {
    if (selectedGenerations.size === 0) {
      setError('Please select at least one post to publish')
      return
    }

    if (!connectionStatus?.connected) {
      setError('Please connect your Threads account first')
      return
    }

    setError('')
    setSuccess('')

    // Post each selected generation sequentially
    const selectedArray = Array.from(selectedGenerations)
    for (const generationId of selectedArray) {
      await postToThreads(generationId)
      // Small delay between posts to avoid rate limiting
      if (selectedArray.indexOf(generationId) < selectedArray.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
  }

  const getStatusIcon = (generation: any) => {
    const status = generation.threads_post_status || postingStatus[generation.id] || 'idle'
    
    switch (status) {
      case 'posted':
        return <CheckCircle size={16} color="#10b981" />
      case 'failed':
        return <XCircle size={16} color="#ef4444" />
      case 'posting':
      case 'pending':
        return <Loader2 size={16} className="animate-spin" color="#3b82f6" />
      default:
        return null
    }
  }

  const getStatusText = (generation: any) => {
    const status = generation.threads_post_status || postingStatus[generation.id] || 'idle'
    
    switch (status) {
      case 'posted':
        return generation.threads_posted_at 
          ? `Posted ${new Date(generation.threads_posted_at).toLocaleDateString()}`
          : 'Posted'
      case 'failed':
        return 'Failed'
      case 'posting':
      case 'pending':
        return 'Posting...'
      default:
        return 'Not posted'
    }
  }

  if (authLoading || loadingConnection) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fafafa',
      }}>
        <Loader2 size={48} className="animate-spin" color="#3b82f6" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div style={{
      padding: '32px',
      maxWidth: '1400px',
      margin: '0 auto',
      background: '#fafafa',
      minHeight: '100vh',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#000000',
          marginBottom: '8px',
        }}>
          Post to Threads
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#666666',
        }}>
          Select and automatically post your generated content to Threads
        </p>
      </div>

      {/* Connection Status Banner */}
      {!connectionStatus?.connected && (
        <div style={{
          padding: '16px 20px',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={20} color="#f59e0b" />
            <div>
              <div style={{ fontWeight: '600', color: '#92400e', marginBottom: '4px' }}>
                Threads Account Not Connected
              </div>
              <div style={{ fontSize: '14px', color: '#78350f' }}>
                Connect your Threads account to automatically post your content
              </div>
            </div>
          </div>
          <button
            onClick={handleConnectThreads}
            style={{
              padding: '10px 20px',
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#333333'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#000000'
            }}
          >
            Connect Threads
          </button>
        </div>
      )}

      {connectionStatus?.connected && (
        <div style={{
          padding: '16px 20px',
          background: '#d1fae5',
          border: '1px solid #10b981',
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle size={20} color="#10b981" />
            <div>
              <div style={{ fontWeight: '600', color: '#065f46', marginBottom: '4px' }}>
                Threads Account Connected
              </div>
              <div style={{ fontSize: '14px', color: '#047857' }}>
                Your posts will be automatically published to Threads
              </div>
            </div>
          </div>
          <button
            onClick={handleDisconnectThreads}
            disabled={disconnecting}
            style={{
              padding: '10px 20px',
              background: '#f87171',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: disconnecting ? 'not-allowed' : 'pointer',
              opacity: disconnecting ? 0.7 : 1,
              transition: 'background 0.2s ease',
            }}
          >
            {disconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      )}

      {/* Error/Success Messages */}
      {error && (
        <div style={{
          padding: '12px 16px',
          background: '#fee2e2',
          border: '1px solid #ef4444',
          borderRadius: '6px',
          marginBottom: '24px',
          color: '#991b1b',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '12px 16px',
          background: '#d1fae5',
          border: '1px solid #10b981',
          borderRadius: '6px',
          marginBottom: '24px',
          color: '#065f46',
          fontSize: '14px',
        }}>
          {success}
        </div>
      )}

      {/* Actions Bar */}
      {connectionStatus?.connected && generations && generations.length > 0 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          padding: '16px',
          background: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e5e5',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}>
              <input
                type="checkbox"
                checked={selectedGenerations.size === generations.length && generations.length > 0}
                onChange={selectAll}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              Select All ({selectedGenerations.size} selected)
            </label>
          </div>
          <button
            onClick={postSelected}
            disabled={selectedGenerations.size === 0 || Object.values(postingStatus).some(s => s === 'posting')}
            style={{
              padding: '12px 24px',
              background: selectedGenerations.size === 0 ? '#e5e5e5' : '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: selectedGenerations.size === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              if (selectedGenerations.size > 0) {
                e.currentTarget.style.background = '#333333'
              }
            }}
            onMouseLeave={(e) => {
              if (selectedGenerations.size > 0) {
                e.currentTarget.style.background = '#000000'
              }
            }}
          >
            <Send size={16} />
            Post Selected to Threads
          </button>
        </div>
      )}

      {/* Generations Grid */}
      {isLoading ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '64px',
        }}>
          <Loader2 size={32} className="animate-spin" color="#3b82f6" />
        </div>
      ) : isError ? (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: '#ef4444',
        }}>
          Failed to load generations. Please try again.
        </div>
      ) : !generations || generations.length === 0 ? (
        <div style={{
          padding: '64px',
          textAlign: 'center',
          color: '#666666',
        }}>
          <p style={{ fontSize: '18px', marginBottom: '8px' }}>No generations yet</p>
          <p style={{ fontSize: '14px' }}>Create some posts first to post them to Threads</p>
        </div>
      ) : (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '32px',
          }}>
            {generations.map((generation: any) => {
              const isSelected = selectedGenerations.has(generation.id)
              const status = generation.threads_post_status || postingStatus[generation.id] || 'idle'
              const isPosting = status === 'posting' || status === 'pending'
              
              return (
                <div
                  key={generation.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #000000' : '1px solid #e5e5e5',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onClick={() => !isPosting && toggleSelection(generation.id)}
                >
                  {/* Thumbnail */}
                  <div style={{
                    width: '100%',
                    aspectRatio: '4/5',
                    background: '#f5f5f5',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {generation.thumbnail_urls && generation.thumbnail_urls.length > 0 ? (
                      <img
                        src={generation.thumbnail_urls[0]}
                        alt={generation.idea_title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#999999',
                        fontSize: '14px',
                      }}>
                        No preview
                      </div>
                    )}
                    {/* Checkbox overlay */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: isSelected ? '#000000' : 'rgba(255, 255, 255, 0.9)',
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: isSelected ? 'none' : '2px solid #e5e5e5',
                    }}>
                      {isSelected && (
                        <CheckCircle size={16} color="#ffffff" />
                      )}
                    </div>
                    {/* Status badge */}
                    {status !== 'idle' && (
                      <div style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                      }}>
                        {getStatusIcon(generation)}
                        <span>{getStatusText(generation)}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Info */}
                  <div style={{ padding: '16px' }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#000000',
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {generation.idea_title}
                    </h3>
                    <p style={{
                      fontSize: '12px',
                      color: '#666666',
                      marginBottom: '12px',
                    }}>
                      {new Date(generation.created_at).toLocaleDateString()}
                    </p>
                    {connectionStatus?.connected && status === 'idle' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          postToThreads(generation.id)
                        }}
                        style={{
                          width: '100%',
                          padding: '8px',
                          background: '#f5f5f5',
                          border: '1px solid #e5e5e5',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#e5e5e5'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f5f5f5'
                        }}
                      >
                        Post Now
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
            }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '8px 16px',
                  background: page === 1 ? '#f5f5f5' : '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  color: page === 1 ? '#999999' : '#000000',
                }}
              >
                Previous
              </button>
              <span style={{ fontSize: '14px', color: '#666666' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{
                  padding: '8px 16px',
                  background: page === totalPages ? '#f5f5f5' : '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: page === totalPages ? 'not-allowed' : 'pointer',
                  color: page === totalPages ? '#999999' : '#000000',
                }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function PostPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fafafa',
      }}>
        <Loader2 size={48} className="animate-spin" color="#3b82f6" />
      </div>
    }>
      <PostPageContent />
    </Suspense>
  )
}


