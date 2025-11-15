'use client'

import { useState, useEffect, Suspense } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMobile } from '../hooks/useMobile'
import { Menu } from 'lucide-react'

// Lazy load the heavy components
import dynamic from 'next/dynamic'

const CreateNewPage = dynamic(() => import('../_internal/create-page'), { ssr: false })
const HistoryPage = dynamic(() => import('../_internal/history-page'), { ssr: false })
const PostPage = dynamic(() => import('../_internal/post-page'), { ssr: false })

function DashboardView() {
  const searchParams = useSearchParams()
  const view = (searchParams.get('view') as 'create' | 'history' | 'post') || 'create'
  const [activeView, setActiveView] = useState<'create' | 'history' | 'post'>(view)
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null)
  const { user, loading } = useAuth()
  const router = useRouter()
  const [hasUnsavedWork, setHasUnsavedWork] = useState(false)
  const isMobile = useMobile()
  
  // Sidebar collapse state with localStorage persistence (desktop only)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed')
      return saved === 'true'
    }
    return false
  })
  
  // Mobile sidebar open state (separate from collapsed state)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    setActiveView(view)
    const id = searchParams.get('id')
    if (id) {
      setSelectedGenerationId(id)
    }
  }, [view, searchParams])

  const handleViewChange = (newView: 'create' | 'history' | 'post') => {
    // Check if navigating away from create with unsaved work
    if (
      activeView === 'create' &&
      newView !== 'create' &&
      hasUnsavedWork
    ) {
      const confirmed = window.confirm(
        'Warning: You have unsaved work. Your progress will not be saved if you navigate away. Do you want to continue?'
      )
      if (!confirmed) {
        return // Cancel navigation
      }
    }
    setActiveView(newView)
    router.push(`/dashboard?view=${newView}`, { scroll: false })
  }

  const handleLoadGeneration = (generationId: string) => {
    setSelectedGenerationId(generationId)
    router.push(`/dashboard?view=history&id=${generationId}`, { scroll: false })
  }

  const handleSidebarClose = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(false)
    } else {
      setIsSidebarCollapsed(true)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarCollapsed', 'true')
      }
    }
  }

  const handleSidebarOpen = () => {
    if (isMobile) {
      setIsMobileSidebarOpen(true)
    } else {
      setIsSidebarCollapsed(false)
      if (typeof window !== 'undefined') {
        localStorage.setItem('sidebarCollapsed', 'false')
      }
    }
  }
  
  // Close mobile sidebar when view changes
  useEffect(() => {
    if (isMobile) {
      setIsMobileSidebarOpen(false)
    }
  }, [activeView, isMobile])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fafafa',
      }}>
        <div className="spinner" style={{ width: '48px', height: '48px' }}></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Determine sidebar visibility
  const isSidebarVisible = isMobile ? isMobileSidebarOpen : !isSidebarCollapsed
  const sidebarWidth = isSidebarCollapsed ? '64px' : '280px'
  
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#fafafa',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <Sidebar 
        activeView={activeView} 
        onViewChange={handleViewChange}
        isCollapsed={isSidebarCollapsed}
        isMobile={isMobile}
        isMobileOpen={isMobileSidebarOpen}
        onClose={handleSidebarClose}
        onOpen={handleSidebarOpen}
      />
      
      {/* Mobile backdrop overlay */}
      {isMobile && isMobileSidebarOpen && (
        <div
          onClick={handleSidebarClose}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 99,
            transition: 'opacity 0.3s ease',
          }}
        />
      )}
      
      <div 
        className="dashboard-content"
        style={{
          marginLeft: isMobile ? '0' : (isSidebarCollapsed ? '64px' : '280px'),
          flex: 1,
          height: '100vh',
          overflow: activeView === 'create' ? 'hidden' : (isMobile ? 'hidden' : 'auto'),
          overflowX: 'hidden',
          overflowY: isMobile ? 'hidden' : (activeView === 'create' ? 'hidden' : 'auto'),
          transition: isMobile ? 'none' : 'margin-left 0.3s ease',
          marginRight: 0,
          paddingRight: 0,
          position: 'relative',
        }}
      >
        {/* Mobile hamburger menu button */}
        {isMobile && !isMobileSidebarOpen && (
          <button
            onClick={handleSidebarOpen}
            style={{
              position: 'fixed',
              top: '16px',
              left: '16px',
              zIndex: 101,
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'opacity 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
          >
            <Menu size={20} color="#000000" />
          </button>
        )}
        
        <style jsx global>{`
          .dashboard-content header {
            display: none !important;
          }
          .dashboard-content .mobile-header-wrapper {
            display: none !important;
          }
        `}</style>
        {activeView === 'create' && (
          <CreateNewPage 
            generationId={searchParams.get('id') || undefined}
            onHasUnsavedWorkChange={setHasUnsavedWork}
          />
        )}
        {activeView === 'history' && (
          <div style={{ height: '100%', overflow: isMobile ? 'hidden' : 'auto', overflowX: 'hidden', overflowY: isMobile ? 'hidden' : 'auto' }}>
            <HistoryPage 
              onLoadGeneration={handleLoadGeneration}
              onOpenSidebar={isMobile ? handleSidebarOpen : undefined}
            />
          </div>
        )}
        {activeView === 'post' && (
          <div style={{ height: '100%', overflow: 'auto' }}>
            <PostPage />
          </div>
        )}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: '#fafafa',
      }}>
        <div className="spinner" style={{ width: '48px', height: '48px' }}></div>
      </div>
    }>
      <DashboardView />
    </Suspense>
  )
}
