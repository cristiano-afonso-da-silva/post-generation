'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Upload, X, Sparkle, Check, AlertCircle } from 'lucide-react'
import CarouselImageGenerator from '../components/CarouselImageGenerator'
import { CarouselTemplate, addTemplateToCache } from '../config/carouselTemplates'
import { getUserCredits } from '../lib/supabase'

interface UploadedImage {
  file: File
  preview: string
}

export default function GenerateTemplatePage() {
  const { user } = useAuth()
  const [images, setImages] = useState<UploadedImage[]>([])
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [generatedTemplateName, setGeneratedTemplateName] = useState('')
  const [generatedTemplate, setGeneratedTemplate] = useState<CarouselTemplate | null>(null)
  const [previewImages, setPreviewImages] = useState<string[]>([])
  const [hasGenerated, setHasGenerated] = useState(false)
  const [hasUsedFeature, setHasUsedFeature] = useState<boolean | null>(null)
  const [isCheckingUsage, setIsCheckingUsage] = useState(true)
  const [isFreeUser, setIsFreeUser] = useState(false)
  const carouselGeneratorRef = useRef<any>(null)

  // Check if user has already used the feature
  useEffect(() => {
    const checkUsage = async () => {
      if (!user?.id) {
        setIsCheckingUsage(false)
        return
      }

      try {
        const credits = await getUserCredits(user.id)
        if (credits) {
          setHasUsedFeature(credits.template_generation_used === true)
          // Check if user is on free plan (plan-10 or no active subscription)
          const isFree = credits.current_plan === 'plan-10' || 
                        credits.subscription_status !== 'active' ||
                        !credits.subscription_status
          setIsFreeUser(isFree)
        } else {
          setHasUsedFeature(false)
          setIsFreeUser(true) // Default to free if no credits record
        }
      } catch (err) {
        console.error('Error checking template generation usage:', err)
        setHasUsedFeature(false) // Default to allowing if check fails
        setIsFreeUser(true) // Default to free if check fails
      } finally {
        setIsCheckingUsage(false)
      }
    }

    checkUsage()
  }, [user?.id])

  // Warn user before leaving page during generation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isGenerating) {
        e.preventDefault()
        // Modern browsers ignore custom messages, but we still need to set returnValue
        e.returnValue = 'Template generation is in progress. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    if (isGenerating) {
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isGenerating])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    
    if (images.length + files.length > 3) {
      setError('You can only upload up to 3 images')
      return
    }

    const newImages = files.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))

    setImages([...images, ...newImages])
    setError('')
  }

  const removeImage = (index: number) => {
    const newImages = [...images]
    URL.revokeObjectURL(newImages[index].preview)
    newImages.splice(index, 1)
    setImages(newImages)
  }

  const generatePreviewImages = async (template: CarouselTemplate) => {
    // Create placeholder carousel data for preview
    const placeholderCarousels = [
      {
        title: 'Sample Hook Text',
        content: '',
        kind: 'HOOK' as const,
        topic: 'Sample Topic',
        subtitle: 'Sample Subtitle',
        cta: 'Swipe to learn more'
      },
      {
        title: 'Sample Title',
        content: 'This is sample content text that demonstrates how the template will look with actual content. The layout, fonts, and spacing are all shown here.',
        kind: 'MIDDLE' as const
      },
      {
        title: 'Sample Outro',
        content: 'This is the final slide with a call to action or summary content.',
        kind: 'CTA' as const
      }
    ]

    // Use CarouselImageGenerator to render preview
    // We'll trigger generation by setting up the component
    // For now, we'll generate preview images on the client side
    // This will be handled by the CarouselImageGenerator component
    console.log('[GENERATE-TEMPLATE-PAGE] Generating preview images for template:', template.id)
  }

  const handleGenerate = async () => {
    console.log('[GENERATE-TEMPLATE-PAGE] Generate button clicked')
    
    const isRegeneration = hasGenerated && generatedTemplate !== null
    
    if (!isRegeneration && images.length === 0) {
      setError('Please upload at least 1 image')
      return
    }

    if (!description.trim()) {
      setError(isRegeneration ? 'Please describe what you want to change' : 'Please provide a description for your template')
      return
    }

    console.log('[GENERATE-TEMPLATE-PAGE] Validation passed:', {
      imageCount: images.length,
      descriptionLength: description.trim().length,
      userId: user?.id,
      userEmail: user?.email
    })

    setIsGenerating(true)
    setError('')
    setSuccess(false)

    try {
      // Convert images to base64
      console.log('[GENERATE-TEMPLATE-PAGE] Converting images to base64...')
      const imagePromises = images.map(img => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(img.file)
        })
      })

      const imageBase64Array = await Promise.all(imagePromises)
      console.log('[GENERATE-TEMPLATE-PAGE] Images converted:', imageBase64Array.length)

      // Prepare request payload
      const isRegeneration = hasGenerated && generatedTemplate !== null
      const requestPayload = {
        images: isRegeneration ? previewImages : imageBase64Array,
        description: description.trim(),
        userId: user?.id,
        isRegeneration: isRegeneration,
        existingTemplate: isRegeneration ? generatedTemplate : undefined
      }
      
      console.log('[GENERATE-TEMPLATE-PAGE] Sending request to API:', {
        imageCount: requestPayload.images.length,
        descriptionLength: requestPayload.description.length,
        userId: requestPayload.userId,
        isRegeneration: isRegeneration,
        url: '/api/templates/generate'
      })

      // Call API to generate template
      const response = await fetch('/api/templates/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      })

      console.log('[GENERATE-TEMPLATE-PAGE] Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('[GENERATE-TEMPLATE-PAGE] API error:', errorData)
        
        // If user has reached the limit, update local state
        if (errorData.code === 'TEMPLATE_GENERATION_LIMIT_REACHED') {
          setHasUsedFeature(true)
        }
        
        throw new Error(errorData.error || errorData.details || 'Failed to generate template')
      }

      const data = await response.json()
      console.log('[GENERATE-TEMPLATE-PAGE] Success:', {
        templateId: data.templateId,
        templateName: data.templateName,
        hasPreviewImages: !!data.previewImages
      })
      
      // Add template to cache so CarouselImageGenerator can find it
      if (data.template) {
        addTemplateToCache(data.template)
        console.log('[GENERATE-TEMPLATE-PAGE] Template added to cache:', data.templateId)
      }
      
      setGeneratedTemplateName(data.templateName)
      setGeneratedTemplate(data.template)
      setSuccess(true)
      setHasGenerated(true)
      setHasUsedFeature(true) // Mark as used after successful generation
      
      // Generate preview images if provided
      if (data.previewImages && data.previewImages.length > 0) {
        setPreviewImages(data.previewImages)
      } else {
        // Generate preview images using CarouselImageGenerator
        generatePreviewImages(data.template)
      }

    } catch (err: any) {
      console.error('[GENERATE-TEMPLATE-PAGE] Error generating template:', {
        message: err.message,
        name: err.name,
        stack: err.stack
      })
      setError(err.message || 'Failed to generate template')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div style={{
      padding: '48px 24px',
      maxWidth: '1200px',
      margin: '0 auto',
    }}>
      <div style={{
        marginBottom: '48px',
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: '700',
          color: '#000000',
          marginBottom: '12px',
        }}>
          Generate Template (Beta)
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#666666',
          lineHeight: '1.5',
        }}>
          Upload 1–3 images and add a short description. Our AI will scan your images and build a template that matches your style.
          {isFreeUser && !hasUsedFeature && (
            <> <strong>Free users get one template generation.</strong></>
          )}
        </p>
        {hasUsedFeature === true && (
          <div style={{
            marginTop: '16px',
            padding: '16px',
            background: '#f5f5f5',
            border: '1px solid #d0d0d0',
            borderRadius: '8px',
            color: '#666666',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={18} />
            <span>
              <strong>Template Generation Limit Reached</strong>
              <br />
              This feature is limited to one use per account. You've already used your available template generation.
            </span>
          </div>
        )}
      </div>

      {/* Image Upload Section */}
      {!hasUsedFeature && (
        <div style={{
          marginBottom: '32px',
        }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: '600',
            color: '#000000',
            marginBottom: '12px',
          }}>
            Upload Images (1-3 images)
          </label>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '16px',
        }}>
          {images.map((img, index) => (
            <div key={index} style={{
              position: 'relative',
              aspectRatio: '1',
              borderRadius: '12px',
              overflow: 'hidden',
              border: '2px solid #e5e5e5',
            }}>
              <img 
                src={img.preview} 
                alt={`Upload ${index + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <button
                onClick={() => removeImage(index)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)'
                }}
              >
                <X size={18} color="#ffffff" />
              </button>
            </div>
          ))}
          
          {images.length < 3 && (
            <label style={{
              aspectRatio: '1',
              border: '2px dashed #cccccc',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: '#fafafa',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#999999'
              e.currentTarget.style.background = '#f5f5f5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#cccccc'
              e.currentTarget.style.background = '#fafafa'
            }}
            >
              <Upload size={32} color="#999999" />
              <span style={{
                marginTop: '8px',
                fontSize: '14px',
                color: '#999999',
                fontWeight: '500',
              }}>
                Upload Image
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>
        </div>
      )}

      {/* Generated Template Preview Section */}
      {hasGenerated && generatedTemplate && (
        <div style={{
          marginBottom: '32px',
          padding: '24px',
          background: '#f9f9f9',
          borderRadius: '12px',
          border: '1px solid #e5e5e5',
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#000000',
            marginBottom: '16px',
          }}>
            Generated Template
          </h2>
          <p style={{
            fontSize: '14px',
            color: '#666666',
            marginBottom: '16px',
          }}>
            Preview of your template with sample content:
          </p>
          <div style={{
            display: 'flex',
            gap: '16px',
            overflowX: 'auto',
            paddingBottom: '8px',
          }}>
            {previewImages.length > 0 ? (
              previewImages.map((img, index) => (
                <div key={index} style={{
                  minWidth: '300px',
                  aspectRatio: '4/5',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  border: '2px solid #e5e5e5',
                  background: '#ffffff',
                }}>
                  <img 
                    src={img} 
                    alt={`Preview slide ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                </div>
              ))
            ) : generatedTemplate ? (
              <div style={{ width: '100%', minHeight: '400px' }}>
                <CarouselImageGenerator
                  ref={carouselGeneratorRef}
                  carousels={[
                    {
                      title: 'Sample Hook Text',
                      content: '',
                      kind: 'HOOK',
                      topic: 'Sample Topic',
                      subtitle: 'Sample Subtitle',
                      cta: 'Swipe to learn more'
                    },
                    {
                      title: 'Sample Title',
                      content: 'This is sample content text that demonstrates how the template will look with actual content. The layout, fonts, and spacing are all shown here.',
                      kind: 'MIDDLE'
                    },
                    {
                      title: 'Sample Outro',
                      content: 'This is the final slide with a call to action or summary content.',
                      kind: 'CTA'
                    }
                  ]}
                  ideaTitle="Sample Hook Text"
                  ideaIndex={null}
                  underlineWords={{}}
                  templateId={generatedTemplate.id}
                  colorThemeId={generatedTemplate.defaultColorThemeId || 'purple-black'}
                  accountDescription=""
                  accountName=""
                  website=""
                  caption=""
                  includeImages={false}
                  useAIImages={false}
                  aiImageStyle="animated"
                  onGenerationComplete={() => {
                    // Extract images from CarouselImageGenerator after generation
                    setTimeout(() => {
                      if (carouselGeneratorRef.current) {
                        const images = carouselGeneratorRef.current.getImages?.() || []
                        if (images.length > 0) {
                          console.log('[GENERATE-TEMPLATE-PAGE] Extracted preview images:', images.length)
                          setPreviewImages(images)
                        }
                      }
                    }, 500) // Small delay to ensure images are ready
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Description Section */}
      {!hasUsedFeature && (
        <div style={{
          marginBottom: '32px',
        }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: '600',
            color: '#000000',
            marginBottom: '12px',
          }}>
            {hasGenerated ? 'Edit Description' : 'Description'}
          </label>
        <div style={{
          width: '100%',
          background: '#f5f5f5',
          borderRadius: '12px',
          border: '2px solid #e5e5e5',
          overflow: 'hidden',
        }}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={hasGenerated 
              ? "Describe what you want to change or improve in the template. For example: 'Make the fonts bolder', 'Use darker colors', 'Add more spacing between elements'"
              : "Describe the style, mood, and aesthetic you want for your template. For example: 'Modern and minimalist with clean lines, bright colors, and lots of white space' or 'Elegant and sophisticated with serif fonts and muted tones'"
            }
            style={{
              width: '100%',
              minHeight: '150px',
              padding: '20px',
              fontSize: '15px',
              border: 'none',
              borderRadius: '12px',
              resize: 'vertical',
              fontFamily: 'inherit',
              color: '#333333',
              background: 'transparent',
              outline: 'none',
              lineHeight: '1.5',
            }}
            onFocus={(e) => {
              e.currentTarget.closest('div')!.style.borderColor = '#cccccc'
            }}
            onBlur={(e) => {
              e.currentTarget.closest('div')!.style.borderColor = '#e5e5e5'
            }}
          />
        </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '16px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          color: '#c00',
          marginBottom: '24px',
          fontSize: '14px',
        }}>
          {error}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div style={{
          padding: '16px',
          background: '#efe',
          border: '1px solid #cfc',
          borderRadius: '8px',
          color: '#060',
          marginBottom: '24px',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <Check size={18} />
          Template "{generatedTemplateName}" generated successfully! You can now use it in the Create page.
        </div>
      )}

      {/* Instructions */}
      <div style={{
        marginTop: '0',
        marginBottom: '32px',
        padding: '24px',
        background: '#f9f9f9',
        borderRadius: '12px',
        border: '1px solid #e5e5e5',
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#000000',
          marginBottom: '12px',
        }}>
          Tips for Best Results
        </h3>
        <ul style={{
          fontSize: '14px',
          color: '#666666',
          lineHeight: '1.8',
          paddingLeft: '20px',
        }}>
          <li>Upload high-quality images that represent the style you want</li>
          <li>Be specific in your description about fonts, colors, and layout preferences</li>
          <li>Include examples of similar styles or designs you like</li>
          <li>Mention if you want a specific mood (professional, playful, elegant, etc.)</li>
        </ul>
      </div>

      {/* Generate Button */}
      {!hasUsedFeature && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating || isCheckingUsage || (!hasGenerated && images.length === 0) || !description.trim()}
          style={{
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#ffffff',
            background: isGenerating || isCheckingUsage || (!hasGenerated && images.length === 0) || !description.trim() ? '#cccccc' : '#000000',
            border: 'none',
            borderRadius: '12px',
            cursor: isGenerating || isCheckingUsage || (!hasGenerated && images.length === 0) || !description.trim() ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            if (!isGenerating && !isCheckingUsage && (hasGenerated || images.length > 0) && description.trim()) {
              e.currentTarget.style.background = '#333333'
            }
          }}
          onMouseLeave={(e) => {
            if (!isGenerating && !isCheckingUsage && (hasGenerated || images.length > 0) && description.trim()) {
              e.currentTarget.style.background = '#000000'
            }
          }}
        >
          {isGenerating ? (
            <>
              <div className="loader-circle" />
              {hasGenerated ? 'Regenerating Template...' : 'Generating Template...'}
            </>
          ) : isCheckingUsage ? (
            <>
              <div className="loader-circle" />
              Checking...
            </>
          ) : (
            <>
              <Sparkle size={20} />
              {hasGenerated ? 'Regenerate Template' : 'Generate Template'}
            </>
          )}
        </button>
      )}

      <style jsx>{`
        .loader-circle {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}

