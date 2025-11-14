'use client'

import { useRouter } from 'next/navigation'
import { useGenerations } from '../hooks/useGenerations'
import { useAuth } from '../context/AuthContext'
import { History, Clock, Sparkles } from 'lucide-react'

export default function DashboardContent() {
  const router = useRouter()
  const { user } = useAuth()
  const { generations, isLoading } = useGenerations(user?.id)

  const sortedGenerations = [...(generations || [])].sort((a: any, b: any) => {
    const aDate = a?.created_at ? new Date(a.created_at).getTime() : 0
    const bDate = b?.created_at ? new Date(b.created_at).getTime() : 0
    return bDate - aDate
  })

  const totalGenerations = sortedGenerations.length

  const now = new Date()
  const weekAgo = new Date()
  weekAgo.setDate(now.getDate() - 7)

  const totalThisWeek = sortedGenerations.filter((gen: any) => {
    if (!gen?.created_at) return false
    const created = new Date(gen.created_at)
    if (Number.isNaN(created.getTime())) return false
    return created >= weekAgo && created <= now
  }).length

  return (
    <div style={{
      padding: '48px',
      maxWidth: '1400px',
      margin: '0 auto',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '48px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#000000',
          marginBottom: '8px',
        }}>
          Welcome back, {user?.email?.split('@')[0] || 'there'}!
        </h1>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px',
        marginBottom: '48px',
      }}>
        <div style={{
          padding: '24px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e5e5',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}>
            <History size={20} color="#666666" />
            <span style={{ fontSize: '14px', color: '#666666', fontWeight: '500' }}>
              Total Posts
            </span>
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#000000',
          }}>
            {totalGenerations}
          </div>
        </div>

        <div style={{
          padding: '24px',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e5e5',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '8px',
          }}>
            <Clock size={20} color="#666666" />
            <span style={{ fontSize: '14px', color: '#666666', fontWeight: '500' }}>
              This Week
            </span>
          </div>
          <div style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#000000',
          }}>
            {totalThisWeek}
          </div>
        </div>
      </div>


      {totalGenerations === 0 && !isLoading && (
        <div style={{
          padding: '80px 24px',
          textAlign: 'center',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e5e5e5',
        }}>
          <Sparkles size={48} color="#cccccc" style={{ marginBottom: '16px' }} />
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#000000',
            marginBottom: '8px',
          }}>
            Start Creating
          </h3>
          <p style={{
            fontSize: '16px',
            color: '#666666',
            marginBottom: '24px',
          }}>
            You haven't created any posts yet. Click Create New to get started!
          </p>
          <button
            onClick={() => router.push('/dashboard?view=create')}
            style={{
              padding: '12px 32px',
              background: '#ededed',
              color: '#000000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e5e5'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ededed'}
          >
            Create Your First Post
          </button>
        </div>
      )}
    </div>
  )
}

