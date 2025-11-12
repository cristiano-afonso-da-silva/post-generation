'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'
import { getTemplateOptions } from '../config/carouselTemplates'

interface TemplateSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  selectedTemplateId: string
  onSelectTemplate: (templateId: string) => void
}

export default function TemplateSelectorModal({
  isOpen,
  onClose,
  selectedTemplateId,
  onSelectTemplate
}: TemplateSelectorModalProps) {
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0)
  const [localSelectedId, setLocalSelectedId] = useState(selectedTemplateId)
  const templates = getTemplateOptions()

  // Reset preview index and sync local selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPreviewIndex(0)
      setLocalSelectedId(selectedTemplateId)
    }
  }, [isOpen, selectedTemplateId])

  if (!isOpen) return null

  const handleSelectTemplate = (templateId: string) => {
    onSelectTemplate(templateId)
    onClose()
  }

  const handleTemplateClick = (templateId: string) => {
    setLocalSelectedId(templateId)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          padding: '0',
          maxWidth: '95vw',
          width: '95vw',
          maxHeight: '95vh',
          height: '95vh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e5e5e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#ffffff'
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#000000',
              margin: 0
            }}
          >
            Choose Template
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px',
              transition: 'background 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
            aria-label="Close"
          >
            <X size={20} color="#666666" />
          </button>
        </div>

        {/* Template grid - scrollable */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 32px',
            minHeight: 0
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(500px, 1fr))',
              gap: '32px'
            }}
          >
            {templates.map((template) => {
              const isSelected = template.id === localSelectedId
              
              // Get all preview images (t1-t5.png)
              const previewImages = []
              for (let i = 1; i <= 5; i++) {
                previewImages.push(`/templates/${template.id}/t${i}.png`)
              }

              return (
                <div
                  key={template.id}
                  onClick={() => handleTemplateClick(template.id)}
                  style={{
                    border: isSelected ? '2px solid #4a90e2' : '1px solid #e5e5e5',
                    borderRadius: '8px',
                    padding: '0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    background: '#ffffff',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: isSelected ? '0 4px 12px rgba(74, 144, 226, 0.15)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#4a90e2'
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(74, 144, 226, 0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.borderColor = '#e5e5e5'
                      e.currentTarget.style.boxShadow = 'none'
                    }
                  }}
                >
                  {/* Template name - at the top */}
                  <div
                    style={{
                      padding: '12px 16px',
                      background: isSelected ? '#f0f7ff' : '#fafafa',
                      borderBottom: '1px solid #e5e5e5',
                      fontSize: '13px',
                      fontWeight: '500',
                      color: '#000000'
                    }}
                  >
                    {template.name}
                  </div>

                  {/* 5 preview images in a horizontal row - no gaps, fills container */}
                  <div
                    style={{
                      display: 'flex',
                      gap: 0,
                      padding: 0,
                      background: '#fafafa',
                      borderRadius: '0 0 8px 8px',
                      overflow: 'hidden',
                      position: 'relative',
                      width: '100%',
                      paddingBottom: '25%' // 20:5 aspect ratio (5/20 = 0.25)
                    }}
                  >
                    {previewImages.map((imagePath, index) => (
                      <div
                        key={index}
                        style={{
                          position: 'absolute',
                          left: `${(index / 5) * 100}%`,
                          width: '20%', // Each image takes 1/5 of width
                          height: '100%',
                          background: '#ffffff',
                          borderRadius: 0,
                          overflow: 'hidden',
                          border: 'none'
                        }}
                      >
                        <Image
                          src={imagePath}
                          alt={`${template.name} slide ${index + 1}`}
                          fill
                          style={{
                            objectFit: 'cover',
                            width: '100%',
                            height: '100%'
                          }}
                          sizes="(max-width: 768px) 20vw, 15vw"
                          onError={(e) => {
                            // Show slide number if image doesn't exist
                            e.currentTarget.style.display = 'none'
                            const parent = e.currentTarget.parentElement
                            if (parent) {
                              parent.style.background = '#f5f5f5'
                              parent.innerHTML = `
                                <div style="
                                  position: absolute;
                                  top: 50%;
                                  left: 50%;
                                  transform: translate(-50%, -50%);
                                  color: #999;
                                  font-size: 12px;
                                  text-align: center;
                                  font-weight: 500;
                                ">
                                  ${index + 1}
                                </div>
                              `
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer with action buttons */}
        <div
          style={{
            padding: '20px 32px',
            borderTop: '1px solid #e5e5e5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            background: '#fafafa'
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: '#ffffff',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '500',
              color: '#666666',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f5f5f5'
              e.currentTarget.style.borderColor = '#d0d0d0'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff'
              e.currentTarget.style.borderColor = '#e5e5e5'
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => handleSelectTemplate(localSelectedId)}
            disabled={!localSelectedId}
            style={{
              background: localSelectedId ? '#ffbd59' : '#e5e5e5',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '500',
              color: localSelectedId ? '#000000' : '#999999',
              cursor: localSelectedId ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (localSelectedId) {
                e.currentTarget.style.background = '#ffa929'
              }
            }}
            onMouseLeave={(e) => {
              if (localSelectedId) {
                e.currentTarget.style.background = '#ffbd59'
              }
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

