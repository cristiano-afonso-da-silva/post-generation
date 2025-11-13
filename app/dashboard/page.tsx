'use client'

import { useState, useEffect, Suspense } from 'react'
import Sidebar from '../components/Sidebar'
import { useAuth } from '../context/AuthContext'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardContent from '../components/DashboardContent'

// Lazy load the heavy components
import dynamic from 'next/dynamic'

const CreateNewPage = dynamic(() => import('../_internal/create-page'), { ssr: false })
const HistoryPage = dynamic(() => import('../_internal/history-page'), { ssr: false })

function DashboardView() {
  const searchParams = useSearchParams()
  const view = (searchParams.get('view') as 'dashboard' | 'create' | 'history') || 'dashboard'
  const [activeView, setActiveView] = useState<'dashboard' | 'create' | 'history'>(view)
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null)
  const { user, loading } = useAuth()
  const router = useRouter()

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

  const handleViewChange = (newView: 'dashboard' | 'create' | 'history') => {
    setActiveView(newView)
    router.push(`/dashboard?view=${newView}`, { scroll: false })
  }

  const handleLoadGeneration = (generationId: string) => {
    setSelectedGenerationId(generationId)
    router.push(`/dashboard?view=history&id=${generationId}`, { scroll: false })
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
      <Sidebar activeView={activeView} onViewChange={handleViewChange} />
      
      <div 
        className="dashboard-content"
        style={{
          marginLeft: '280px',
          flex: 1,
          height: '100vh',
          overflow: activeView === 'create' ? 'hidden' : 'auto',
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
        {activeView === 'dashboard' && <DashboardContent />}
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
