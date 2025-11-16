'use client'

import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Upload, X, Sparkles, Check, Loader2 } from 'lucide-react'

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

  const handleGenerate = async () => {
    console.log('[GENERATE-TEMPLATE-PAGE] Generate button clicked')
    
    if (images.length === 0) {
      setError('Please upload at least 1 image')
      return
    }

    if (!description.trim()) {
      setError('Please provide a description for your template')
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
      const requestPayload = {
        images: imageBase64Array,
        description: description.trim(),
        userId: user?.id
      }
      
      console.log('[GENERATE-TEMPLATE-PAGE] Sending request to API:', {
        imageCount: requestPayload.images.length,
        descriptionLength: requestPayload.description.length,
        userId: requestPayload.userId,
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
        throw new Error(errorData.error || errorData.details || 'Failed to generate template')
      }

      const data = await response.json()
      console.log('[GENERATE-TEMPLATE-PAGE] Success:', {
        templateId: data.templateId,
        templateName: data.templateName
      })
      
      setGeneratedTemplateName(data.templateName)
      setSuccess(true)
      
      // Clear form after 3 seconds
      setTimeout(() => {
        setImages([])
        setDescription('')
        setSuccess(false)
        setGeneratedTemplateName('')
      }, 3000)

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
        </p>
      </div>

      {/* Image Upload Section */}
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

      {/* Description Section */}
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
          Description
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
            placeholder="Describe the style, mood, and aesthetic you want for your template. For example: 'Modern and minimalist with clean lines, bright colors, and lots of white space' or 'Elegant and sophisticated with serif fonts and muted tones'"
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

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || images.length === 0 || !description.trim()}
        style={{
          padding: '16px 32px',
          fontSize: '16px',
          fontWeight: '600',
          color: '#ffffff',
          background: isGenerating || images.length === 0 || !description.trim() ? '#cccccc' : '#000000',
          border: 'none',
          borderRadius: '12px',
          cursor: isGenerating || images.length === 0 || !description.trim() ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        onMouseEnter={(e) => {
          if (!isGenerating && images.length > 0 && description.trim()) {
            e.currentTarget.style.background = '#333333'
          }
        }}
        onMouseLeave={(e) => {
          if (!isGenerating && images.length > 0 && description.trim()) {
            e.currentTarget.style.background = '#000000'
          }
        }}
      >
        {isGenerating ? (
          <>
            <Loader2 size={20} className="spinner" />
            Generating Template...
          </>
        ) : (
          <>
            <Sparkles size={20} />
            Generate Template
          </>
        )}
      </button>

      {/* Instructions */}
      <div style={{
        marginTop: '48px',
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

      <style jsx>{`
        .spinner {
          animation: spin 1s linear infinite;
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

