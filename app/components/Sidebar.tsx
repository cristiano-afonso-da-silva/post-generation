'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { SquarePen, ChevronLeft, Menu, Send, Sparkle } from 'lucide-react'
import Image from 'next/image'
import AccountModal from './AccountModal'

interface SidebarProps {
  activeView: 'create' | 'post' | 'generate-template'
  onViewChange: (view: 'create' | 'post' | 'generate-template') => void
  isCollapsed?: boolean
  isMobile?: boolean
  isMobileOpen?: boolean
  onClose?: () => void
  onOpen?: () => void
}

export default function Sidebar({ activeView, onViewChange, isCollapsed = false, isMobile = false, isMobileOpen = false, onClose, onOpen }: SidebarProps) {
  const router = useRouter()
  const { user, credits } = useAuth()
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [isLogoHovered, setIsLogoHovered] = useState(false)

  const menuItems = [
    { id: 'create' as const, label: 'Create', icon: SquarePen },
    { id: 'post' as const, label: 'Post', icon: Send },
    { id: 'generate-template' as const, label: 'Generate Template', icon: Sparkle },
  ]

  // On mobile, always show full width sidebar (never collapsed)
  const sidebarWidth = isMobile ? '280px' : (isCollapsed ? '64px' : '280px')
  
  // On mobile, hide sidebar when closed, show as overlay when open
  const mobileTransform = isMobile && !isMobileOpen ? 'translateX(-100%)' : 'translateX(0)'
  const mobileVisibility = isMobile && !isMobileOpen ? 'hidden' : 'visible'
  
  // On mobile, always show full sidebar (not collapsed view)
  const shouldShowCollapsed = isMobile ? false : isCollapsed

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
      // Ensure sidebar always sits above page content and headers,
      // especially on mobile where it becomes an overlay.
      zIndex: isMobile ? 2000 : 100,
      transition: isMobile ? 'transform 0.3s ease' : 'width 0.3s ease',
      transform: isMobile ? mobileTransform : 'none',
      visibility: isMobile ? mobileVisibility : 'visible',
      boxShadow: isMobile && isMobileOpen ? '2px 0 8px rgba(0, 0, 0, 0.1)' : 'none',
    }}>
      {/* Logo */}
      {!shouldShowCollapsed ? (
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
              <ChevronLeft size={20} />
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
        padding: shouldShowCollapsed ? '24px 8px' : '24px',
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
                // Close mobile sidebar when item is clicked
                if (isMobile && onClose) {
                  onClose()
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: shouldShowCollapsed ? 'center' : 'flex-start',
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
                textAlign: shouldShowCollapsed ? 'center' : 'left',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isActive ? '#f5f5f5' : 'transparent'
              }}
            >
              <Icon size={20} />
              {!shouldShowCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}

      </div>

      {/* User Info */}
      {user && (
        <button
          onClick={() => setShowAccountModal(true)}
          style={{
            padding: shouldShowCollapsed ? '16px 8px' : '16px',
            background: '#ffffff',
            border: 'none',
            borderTop: 'none',
            width: '100%',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: shouldShowCollapsed ? 'center' : 'flex-start',
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
          {!shouldShowCollapsed && (
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

