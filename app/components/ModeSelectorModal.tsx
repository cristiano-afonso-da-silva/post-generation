'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface ModeOption {
  id: string
  label: string
  credits: number
  includeImages: boolean
  useAIImages: boolean
  aiImageStyle?: 'animated' | 'surreal'
}

interface ModeSelectorDropdownProps {
  isOpen: boolean
  onClose: () => void
  currentMode: {
    includeImages: boolean
    useAIImages: boolean
    aiImageStyle: 'animated' | 'surreal'
  }
  onSelectMode: (mode: {
    includeImages: boolean
    useAIImages: boolean
    aiImageStyle: 'animated' | 'surreal'
  }) => void
  buttonRef: React.RefObject<HTMLButtonElement>
  isTextOnly?: boolean
}

const MODE_OPTIONS: ModeOption[] = [
  {
    id: 'text',
    label: 'Text',
    credits: 1,
    includeImages: false,
    useAIImages: false
  },
  {
    id: 'text-image',
    label: 'Text + Image',
    credits: 2,
    includeImages: true,
    useAIImages: true,  // Use AI images, style determined by template
    aiImageStyle: 'animated'  // Default, but template imagePrompt overrides this
  }
]

export default function ModeSelectorDropdown({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  buttonRef,
  isTextOnly = false
}: ModeSelectorDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Determine current mode ID
  const getCurrentModeId = () => {
    return !currentMode.includeImages
      ? 'text'
      : 'text-image'
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen, onClose, buttonRef])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen, onClose])

  const handleSelectMode = (modeId: string) => {
    // Prevent selecting "Text + Image" if template is text-only
    if (isTextOnly && modeId === 'text-image') {
      return
    }
    
    const mode = MODE_OPTIONS.find(m => m.id === modeId)
    if (mode) {
      onSelectMode({
        includeImages: mode.includeImages,
        useAIImages: mode.useAIImages,
        aiImageStyle: mode.aiImageStyle || 'animated'
      })
      onClose()
    }
  }

  const currentModeId = getCurrentModeId()

  // Calculate position
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
  }, [])
  
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      // Use requestAnimationFrame to ensure layout is settled
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect()
          // Ensure we have valid viewport coordinates
          if (rect && rect.bottom > 0 && rect.left >= 0) {
            setPosition({
              top: rect.bottom + 8,
              left: rect.left
            })
          }
        }
      }
      
      // Small delay to ensure layout is settled, then calculate
      const timeoutId = setTimeout(() => {
        updatePosition()
        // Also update on next frame to catch any layout changes
        requestAnimationFrame(updatePosition)
      }, 0)
      
      // Update on window resize and scroll
      const handleResize = () => updatePosition()
      const handleScroll = () => updatePosition()
      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true)
      
      return () => {
        clearTimeout(timeoutId)
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [isOpen, buttonRef])

  if (!isOpen || !mounted || typeof document === 'undefined') return null

  const dropdownContent = (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        background: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e5e5',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        minWidth: '240px',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}
    >
      {MODE_OPTIONS.map((mode) => {
        const isSelected = mode.id === currentModeId
        const isDisabled = isTextOnly && mode.id === 'text-image'

        return (
          <div
            key={mode.id}
            onClick={() => !isDisabled && handleSelectMode(mode.id)}
            style={{
              padding: '12px 16px',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              background: isSelected ? '#f5f5f5' : 'transparent',
              borderRadius: '6px',
              border: 'none',
              opacity: isDisabled ? 0.5 : 1
            }}
            onMouseEnter={(e) => {
              if (!isSelected && !isDisabled) {
                e.currentTarget.style.background = '#f5f5f5'
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = 'transparent'
              } else {
                e.currentTarget.style.background = '#f5f5f5'
              }
            }}
            title={isDisabled ? 'This template does not support images' : undefined}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: isDisabled ? '#999999' : '#000000'
                  }}
                >
                  {mode.label}
                </span>
                <span
                  style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#999999'
                  }}
                >
                  {mode.credits} {mode.credits === 1 ? 'credit' : 'credits'}
                </span>
              </div>
              {isSelected && (
                <div
                  style={{
                    color: '#000000',
                    fontSize: '16px',
                    fontWeight: '600'
                  }}
                >
                  ✓
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(dropdownContent, document.body) : null
}

