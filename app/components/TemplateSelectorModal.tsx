'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Sparkles } from 'lucide-react'
import { getTemplateOptions, fetchCustomTemplates, getCarouselTemplate } from '../config/carouselTemplates'
import { useMobile } from '../hooks/useMobile'
import { useAuth } from '../context/AuthContext'

interface TemplateSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  selectedTemplateId: string
  onSelectTemplate: (templateId: string) => void
}

interface TemplateOption {
  id: string
  name: string
  isCustom?: boolean
}

// Helper function to check if a template is text-only (doesn't support images)
function isTextOnlyTemplate(templateId: string): boolean {
  try {
    const template = getCarouselTemplate(templateId)
    return template.imageLayout?.maxHeightRatio === 0
  } catch (error) {
    console.error('Error checking if template is text-only:', error)
    return false
  }
}

// Helper function to extract style tags from template configuration
function getTemplateTags(templateId: string): string[] {
  try {
    const template = getCarouselTemplate(templateId)
    if (!template || !template.writingStyle) {
      return []
    }

    const tags: string[] = []
    const { tone, structure } = template.writingStyle

    // Extract meaningful words from tone description
    if (tone) {
      // Split by common separators and extract meaningful adjectives
      const stopWords = new Set([
        'like', 'with', 'the', 'and', 'for', 'from', 'that', 'this', 'are', 'was', 'been',
        'to', 'a', 'an', 'in', 'on', 'at', 'by', 'of', 'as', 'is', 'it', 'be', 'have',
        'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may',
        'might', 'can', 'must', 'shall', 'talking', 'touch', 'sense'
      ])
      
      // Split by commas, "and", and spaces, then clean
      const words = tone
        .toLowerCase()
        .replace(/[.,]/g, '')
        .split(/\s+and\s+|[,\s]+/)
        .map(word => word.trim())
        .filter(word => {
          // Keep words that are 4+ characters and not stop words
          return word.length >= 4 && !stopWords.has(word)
        })
      
      tags.push(...words)
    }

    // Add structure-based tags (only if they add value)
    if (structure) {
      // Map sentenceStyle to more descriptive tags
      if (structure.sentenceStyle && structure.sentenceStyle !== 'mixed') {
        const styleMap: Record<string, string> = {
          'short': 'concise',
          'medium': 'balanced',
          'long': 'detailed'
        }
        const styleTag = styleMap[structure.sentenceStyle] || structure.sentenceStyle
        if (!tags.includes(styleTag)) {
          tags.push(styleTag)
        }
      }
    }

    // Remove duplicates, prioritize distinctive words, limit to 3
    const uniqueTags = Array.from(new Set(tags))
      .slice(0, 3)
      .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)) // Capitalize first letter

    return uniqueTags
  } catch (error) {
    console.error('Error extracting template tags:', error)
    return []
  }
}

export default function TemplateSelectorModal({
  isOpen,
  onClose,
  selectedTemplateId,
  onSelectTemplate
}: TemplateSelectorModalProps) {
  const isMobile = useMobile()
  const { user } = useAuth()
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0)
  const [localSelectedId, setLocalSelectedId] = useState(selectedTemplateId)
  const [templates, setTemplates] = useState<TemplateOption[]>(getTemplateOptions())
  const [isLoadingCustom, setIsLoadingCustom] = useState(false)

  // Reset preview index and sync local selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedPreviewIndex(0)
      setLocalSelectedId(selectedTemplateId)
    }
  }, [isOpen, selectedTemplateId])

  // Fetch custom templates when modal opens
  useEffect(() => {
    if (isOpen && user?.id) {
      const loadCustomTemplates = async () => {
        setIsLoadingCustom(true)
        try {
          const customTemplates = await fetchCustomTemplates(user.id)
          const customOptions = customTemplates.map(t => ({
            id: t.id,
            name: t.name,
            isCustom: true
          }))
          setTemplates([...getTemplateOptions(), ...customOptions])
        } catch (error) {
          console.error('Error loading custom templates:', error)
        } finally {
          setIsLoadingCustom(false)
        }
      }
      loadCustomTemplates()
    } else if (isOpen) {
      // If no user, just show default templates
      setTemplates(getTemplateOptions())
    }
  }, [isOpen, user?.id])

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
          border: '1px solid #e5e5e5',
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
              fontSize: isMobile ? '18px' : '24px',
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
              const isCustom = template.isCustom || false
              
              // Get only first, middle, and last preview images (t1, t3, t5.png)
              // For 5 images, show indices 0, 2, 4 (1st, 3rd, 5th)
              const previewIndices = [0, 2, 4] // For 5 images: 1st, 3rd, 5th
              const previewImages = previewIndices.map(i => `/templates/${template.id}/t${i + 1}.png`)
              
              // Get tags for this template
              const tags = getTemplateTags(template.id)
              const isTextOnly = isTextOnlyTemplate(template.id)

              return (
                <div
                  key={template.id}
                  onClick={() => handleTemplateClick(template.id)}
                  style={{
                    border: isSelected ? '2px solid #666666' : '2px solid #e5e5e5',
                    borderRadius: '8px',
                    padding: '0',
                    cursor: 'pointer',
                    background: '#ffffff',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.border = '2px solid #e5e5e5'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.border = '2px solid #e5e5e5'
                    }
                  }}
                >
                  {/* Preview images - at the top */}
                  {isCustom ? (
                    // Show placeholder for custom templates
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '48px',
                        background: 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)',
                        minHeight: '240px'
                      }}
                    >
                      <div style={{
                        textAlign: 'center',
                        color: '#999999'
                      }}>
                        <Sparkles size={32} color="#ffbd59" style={{ marginBottom: '8px' }} />
                        <div style={{
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          Custom Template
                        </div>
                        <div style={{
                          fontSize: '11px',
                          marginTop: '4px'
                        }}>
                          AI Generated
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        gap: 0,
                        padding: 0,
                        background: '#fafafa',
                        overflow: 'hidden',
                        position: 'relative',
                        width: '100%',
                        paddingBottom: '50%' // Maintain aspect ratio - increased height
                      }}
                    >
                      {previewImages.map((imagePath, index) => (
                        <div
                          key={index}
                          style={{
                            position: 'absolute',
                            left: `${(index / 3) * 100}%`,
                            width: '33.33%', // Each image takes 1/3 of width
                            height: '100%',
                            background: '#ffffff',
                            borderRadius: 0,
                            overflow: 'hidden',
                            border: 'none'
                          }}
                        >
                          <Image
                            src={imagePath}
                            alt={`${template.name} slide ${previewIndices[index] + 1}`}
                            fill
                            style={{
                              objectFit: 'cover',
                              width: '100%',
                              height: '100%'
                            }}
                            sizes="(max-width: 768px) 33vw, 25vw"
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
                                    ${previewIndices[index] + 1}
                                  </div>
                                `
                              }
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Template name and tags - at the bottom */}
                  <div
                    style={{
                      padding: '12px 16px',
                      background: isSelected ? '#fafafa' : '#ffffff',
                      borderTop: '1px solid #e5e5e5'
                    }}
                  >
                    {/* Template name */}
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '500',
                        color: '#000000',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: (tags.length > 0 || isTextOnly) ? '8px' : '0'
                      }}
                    >
                      {isCustom && <Sparkles size={14} color="#ffbd59" />}
                      {template.name}
                    </div>
                    
                    {/* Text Only badge and Tags */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        marginTop: '4px'
                      }}
                    >
                      {/* Text Only badge - show first if template is text-only */}
                      {isTextOnly && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            color: '#666666',
                            background: '#e8e8e8',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            lineHeight: '1',
                            border: '1px solid #d0d0d0'
                          }}
                        >
                          Text Only
                        </span>
                      )}
                      
                      {/* Style tags */}
                      {tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          style={{
                            fontSize: '11px',
                            fontWeight: '500',
                            color: '#666666',
                            background: '#f0f0f0',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            lineHeight: '1'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
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
            background: '#ffffff'
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

