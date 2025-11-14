'use client'

import { useState, useEffect, useRef } from 'react'

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
    useAIImages: false
  },
  {
    id: 'text-ai-animated',
    label: 'Text + AI Animated Image',
    credits: 2,
    includeImages: true,
    useAIImages: true,
    aiImageStyle: 'animated'
  },
  {
    id: 'text-ai-surreal',
    label: 'Text + AI Surrealism Image',
    credits: 2,
    includeImages: true,
    useAIImages: true,
    aiImageStyle: 'surreal'
  }
]

export default function ModeSelectorDropdown({
  isOpen,
  onClose,
  currentMode,
  onSelectMode,
  buttonRef
}: ModeSelectorDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Determine current mode ID
  const getCurrentModeId = () => {
    return !currentMode.includeImages
      ? 'text'
      : !currentMode.useAIImages
      ? 'text-image'
      : currentMode.aiImageStyle === 'animated'
      ? 'text-ai-animated'
      : 'text-ai-surreal'
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

  if (!isOpen) return null

  const handleSelectMode = (modeId: string) => {
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
  
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setPosition({
        top: rect.bottom + 8,
        left: rect.left
      })
    }
  }, [isOpen, buttonRef])

  return (
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

        return (
          <div
            key={mode.id}
            onClick={() => handleSelectMode(mode.id)}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: isSelected ? '#f5f5f5' : 'transparent',
              borderRadius: '6px',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
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
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: isSelected ? '600' : '500',
                    color: '#000000',
                    marginBottom: '2px'
                  }}
                >
                  {mode.label}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#666666'
                  }}
                >
                  {mode.credits} {mode.credits === 1 ? 'credit' : 'credits'}
                </div>
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
}

