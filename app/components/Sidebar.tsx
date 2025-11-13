'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { LayoutGrid, Plus, History } from 'lucide-react'
import Image from 'next/image'
import AccountModal from './AccountModal'

interface SidebarProps {
  activeView: 'dashboard' | 'create' | 'history'
  onViewChange: (view: 'dashboard' | 'create' | 'history') => void
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const router = useRouter()
  const { user, credits } = useAuth()
  const [showAccountModal, setShowAccountModal] = useState(false)

  const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutGrid },
    { id: 'create' as const, label: 'Create New', icon: Plus },
    { id: 'history' as const, label: 'History', icon: History },
  ]

  return (
    <div style={{
      width: '280px',
      height: '100vh',
      background: '#ffffff',
      borderRight: '1px solid #e5e5e5',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid #e5e5e5',
      }}>
        <div 
          onClick={() => router.push('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.7'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1'
          }}
        >
          <Image src="/logo.svg" alt="Post My Note logo" width={32} height={32} priority />
          <span style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#000000',
          }}>
            Post My Note
          </span>
        </div>
      </div>

      {/* Menu Section */}
      <div style={{
        flex: 1,
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        overflowY: 'auto',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: '600',
          color: '#999999',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          padding: '0 12px',
          marginBottom: '8px',
        }}>
          MENU
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                background: isActive ? '#fff9e6' : 'transparent',
                color: isActive ? '#000000' : '#666666',
                fontSize: '15px',
                fontWeight: isActive ? '600' : '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f5f5f5'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent'
                }
              }}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          )
        })}

      </div>

      {/* User Info */}
      {user && (
        <button
          onClick={() => setShowAccountModal(true)}
          style={{
            padding: '16px',
            borderTop: '1px solid #e5e5e5',
            background: '#fafafa',
            border: 'none',
            width: '100%',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f0f0f0'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#fafafa'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: '#e5e5e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: '600',
              color: '#666666',
            }}>
              {user.email?.charAt(0).toUpperCase() || 'C'}
            </div>
            <div style={{
              flex: 1,
              minWidth: 0,
              textAlign: 'left',
            }}>
              <div style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#000000',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.email?.split('@')[0] || 'User'}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#666666',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.email}
              </div>
            </div>
          </div>
        </button>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <AccountModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          credits={credits?.credits_remaining ?? 0}
          subscriptionStatus={credits?.subscription_status ?? null}
          currentPlan={credits?.current_plan ?? null}
        />
      )}
    </div>
  )
}

