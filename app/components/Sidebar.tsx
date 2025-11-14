'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { SquarePen, History, PanelRightOpen, Menu } from 'lucide-react'
import Image from 'next/image'
import AccountModal from './AccountModal'

interface SidebarProps {
  activeView: 'create' | 'history'
  onViewChange: (view: 'create' | 'history') => void
  isCollapsed?: boolean
  onClose?: () => void
  onOpen?: () => void
}

export default function Sidebar({ activeView, onViewChange, isCollapsed = false, onClose, onOpen }: SidebarProps) {
  const router = useRouter()
  const { user, credits } = useAuth()
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [isLogoHovered, setIsLogoHovered] = useState(false)

  const menuItems = [
    { id: 'create' as const, label: 'Create', icon: SquarePen },
    { id: 'history' as const, label: 'History', icon: History },
  ]

  const sidebarWidth = isCollapsed ? '64px' : '280px'

  return (
    <div style={{
      width: sidebarWidth,
      height: '100vh',
      background: '#ffffff',
      borderRight: '1px solid #e5e5e5',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 100,
      transition: 'width 0.3s ease',
    }}>
      {/* Logo */}
      {!isCollapsed ? (
        <div style={{
          padding: '24px',
          flexShrink: 0,
          height: '65px',
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <button
            onClick={() => router.push('/')}
            style={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              padding: '6px',
            }}
          >
            <Image 
              src="/logo.svg" 
              alt="Post My Note logo" 
              width={32} 
              height={32} 
              priority 
            />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666666',
                transition: 'background 0.2s ease',
                borderRadius: '8px',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <PanelRightOpen size={20} />
            </button>
          )}
        </div>
      ) : (
        <div style={{
          padding: '8px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          height: '65px',
          boxSizing: 'border-box',
        }}>
          <button
            onClick={() => onOpen?.()}
            onMouseEnter={() => setIsLogoHovered(true)}
            onMouseLeave={() => setIsLogoHovered(false)}
            style={{
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              background: isLogoHovered ? '#f5f5f5' : 'transparent',
              border: 'none',
              width: '44px',
              height: '44px',
            }}
          >
            {isLogoHovered ? (
              <Menu size={20} color="#000000" />
            ) : (
              <Image 
                src="/logo.svg" 
                alt="Post My Note logo" 
                width={36} 
                height={36} 
                priority 
                style={{
                  opacity: 1,
                  transition: 'opacity 0.2s ease',
                }}
              />
            )}
          </button>
        </div>
      )}

      {/* Menu Section */}
      <div style={{
        flex: 1,
        padding: isCollapsed ? '24px 8px' : '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        overflowY: 'auto',
      }}>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeView === item.id

          return (
            <button
              key={item.id}
              onClick={() => {
                // Delegate view changes to parent so state + URL stay in sync
                onViewChange(item.id)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: isCollapsed ? 'center' : 'flex-start',
                gap: '12px',
                padding: '12px',
                borderRadius: '8px',
                background: isActive ? '#f5f5f5' : 'transparent',
                color: isActive ? '#000000' : '#666666',
                fontSize: '15px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                width: '100%',
                textAlign: isCollapsed ? 'center' : 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive ? '#f5f5f5' : 'transparent'
              }}
            >
              <Icon size={20} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}

      </div>

      {/* User Info */}
      {user && (
        <button
          onClick={() => setShowAccountModal(true)}
          style={{
            padding: isCollapsed ? '16px 8px' : '16px',
            background: '#ffffff',
            border: 'none',
            borderTop: 'none',
            width: '100%',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: '12px',
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#ffffff'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#ffffff'
          }}
        >
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
            flexShrink: 0,
          }}>
            {user.email?.charAt(0).toUpperCase() || 'C'}
          </div>
          {!isCollapsed && (
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
          )}
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

