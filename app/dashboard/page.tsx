'use client'

import { useState, useEffect, Suspense } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'

// Lazy load the heavy components
import dynamic from 'next/dynamic'

const CreateNewPage = dynamic(() => import('../_internal/create-page'), { ssr: false })
const HistoryPage = dynamic(() => import('../_internal/history-page'), { ssr: false })

function DashboardView() {
  const searchParams = useSearchParams()
  const view = (searchParams.get('view') as 'create' | 'history') || 'create'
  const [activeView, setActiveView] = useState<'create' | 'history'>(view)
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null)
  const { user, loading } = useAuth()
  const router = useRouter()
  
  // Sidebar collapse state with localStorage persistence
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed')
      return saved === 'true'
    }
    return false
  })

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

  const handleViewChange = (newView: 'create' | 'history') => {
    setActiveView(newView)
    router.push(`/dashboard?view=${newView}`, { scroll: false })
  }

  const handleLoadGeneration = (generationId: string) => {
    setSelectedGenerationId(generationId)
    router.push(`/dashboard?view=history&id=${generationId}`, { scroll: false })
  }

  const handleSidebarClose = () => {
    setIsSidebarCollapsed(true)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', 'true')
    }
  }

  const handleSidebarOpen = () => {
    setIsSidebarCollapsed(false)
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', 'false')
    }
  }

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

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#fafafa',
      overflow: 'hidden',
    }}>
      <Sidebar 
        activeView={activeView} 
        onViewChange={handleViewChange}
        isCollapsed={isSidebarCollapsed}
        onClose={handleSidebarClose}
        onOpen={handleSidebarOpen}
      />
      
      <div 
        className="dashboard-content"
        style={{
          marginLeft: isSidebarCollapsed ? '64px' : '280px',
          flex: 1,
          height: '100vh',
          overflow: activeView === 'create' ? 'hidden' : 'auto',
          transition: 'margin-left 0.3s ease',
          marginRight: 0,
          paddingRight: 0,
        }}
      >
        <style jsx global>{`
          .dashboard-content header {
            display: none !important;
          }
          .dashboard-content .mobile-header-wrapper {
            display: none !important;
          }
        `}</style>
        {activeView === 'create' && <CreateNewPage generationId={searchParams.get('id') || undefined} />}
        {activeView === 'history' && (
          <div style={{ height: '100%', overflow: 'auto' }}>
            <HistoryPage onLoadGeneration={handleLoadGeneration} />
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
