'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { TEMPLATE_STYLE_OPTIONS, COPY_TONE_OPTIONS, TOPIC_OPTIONS, BRAND_INTENTION_EXAMPLES, getTemplateStyleMapping, mapCopyToneToUserVoice } from '../config/onboardingConfig'
import '../globals.css'

interface OnboardingData {
  firstName: string
  brandName?: string
  brandHandle?: string
  brandIntention: string
  topics: string[]
  templateStyle: string
  copyTone: string[] // Can select up to 2
  completed: boolean
  completedAt?: string
  userId?: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [generationStep, setGenerationStep] = useState<'idle' | 'generating-idea' | 'creating-carousel' | 'rendering'>('idle')
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState<OnboardingData>({
    firstName: '',
    brandName: '',
    brandHandle: '',
    brandIntention: '',
    topics: [],
    templateStyle: '',
    copyTone: [],
    completed: false
  })

  // Check if onboarding already completed
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/signin')
        return
      }

      // Check if onboarding already completed
      // Also verify it belongs to the current user by checking userId
      const stored = localStorage.getItem('onboarding_data')
      if (stored) {
        try {
          const data = JSON.parse(stored)
          // If onboarding data has a userId and it doesn't match current user, clear it
          if (data.userId && data.userId !== user.id) {
            localStorage.removeItem('onboarding_data')
            // Reset form data
            setFormData({
              firstName: '',
              brandName: '',
              brandHandle: '',
              brandIntention: '',
              topics: [],
              templateStyle: '',
              copyTone: [],
              completed: false
            })
            return
          }
          // If onboarding is completed and belongs to current user, redirect
          if (data.completed) {
            router.push('/dashboard?view=create')
            return
          }
          // Load existing data if incomplete
          setFormData(data)
        } catch (e) {
          console.error('Error parsing onboarding data:', e)
          // Clear corrupted data
          localStorage.removeItem('onboarding_data')
        }
      }
    }
  }, [user, loading, router])

  // Load saved progress
  useEffect(() => {
    const stored = localStorage.getItem('onboarding_data')
    if (stored) {
      try {
        const data = JSON.parse(stored)
        setFormData(data)
        // Determine current step based on what's filled
        if (!data.firstName) setCurrentStep(1)
        else if (!data.brandName) setCurrentStep(2)
        else if (!data.brandIntention) setCurrentStep(3)
        else if (data.topics.length === 0) setCurrentStep(4)
        else if (!data.templateStyle) setCurrentStep(5)
        else if (!data.copyTone || data.copyTone.length === 0) setCurrentStep(6)
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [])

  const saveProgress = (data: Partial<OnboardingData>) => {
    const updated = { ...formData, ...data, userId: user?.id }
    setFormData(updated)
    localStorage.setItem('onboarding_data', JSON.stringify(updated))
  }

  const handleNext = () => {
    if (currentStep === 1) {
      if (!formData.firstName.trim()) return
      saveProgress({ firstName: formData.firstName })
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (!formData.brandName || !formData.brandName.trim()) return
      saveProgress({ brandName: formData.brandName, brandHandle: formData.brandHandle })
      setCurrentStep(3)
    } else if (currentStep === 3) {
      if (!formData.brandIntention.trim()) return
      saveProgress({ brandIntention: formData.brandIntention })
      setCurrentStep(4)
    } else if (currentStep === 4) {
      if (formData.topics.length === 0) return
      saveProgress({ topics: formData.topics })
      setCurrentStep(5)
    } else if (currentStep === 5) {
      if (!formData.templateStyle) return
      saveProgress({ templateStyle: formData.templateStyle })
      setCurrentStep(6)
    } else if (currentStep === 6) {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    if (!formData.templateStyle || !formData.copyTone || formData.copyTone.length === 0) return
    
    setIsLoading(true)
    setError('')
    setGenerationStep('generating-idea')
    
    const completedData: OnboardingData = {
      ...formData,
      completed: true,
      completedAt: new Date().toISOString()
    }
    
    localStorage.setItem('onboarding_data', JSON.stringify(completedData))
    
    try {
      // Step 1: Generate personalized idea
      setGenerationStep('generating-idea')
      const ideaResponse = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'onboarding-idea',
          projectDescription: formData.brandIntention,
          topics: formData.topics,
          vibe: formData.templateStyle // Using templateStyle for now, will be updated later
        })
      })
      
      const ideaResult = await ideaResponse.json()
      
      if (!ideaResult.success || !ideaResult.data?.idea) {
        throw new Error(ideaResult.error || 'Failed to generate idea')
      }
      
      const generatedIdea = ideaResult.data.idea
      
      // Step 2: Get template style mapping for template/theme
      const templateMapping = getTemplateStyleMapping(formData.templateStyle)
      
      // Step 3: Map copy tone to user voice
      const userVoice = mapCopyToneToUserVoice(formData.copyTone)
      
      // Step 4: Generate carousel
      setGenerationStep('creating-carousel')
      const noteResponse = await fetch('/api/social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'note',
          ideaTitle: generatedIdea,
          accountDescription: formData.brandIntention,
          templateId: templateMapping.templateId,
          includeImages: false,
          useAIImages: false,
          aiImageStyle: 'animated',
          userVoice: userVoice
        })
      })
      
      const noteResult = await noteResponse.json()
      
      if (!noteResult.success || !noteResult.data) {
        throw new Error(noteResult.error || 'Failed to generate carousel')
      }
      
      // Step 4: Save to localStorage (same structure as create-page)
      const noteData = {
        ...noteResult.data,
        carousels: noteResult.data.slides
      }
      
      // Map data: brandName goes to accountName (footer left), brandHandle goes to website (footer right)
      const accountName = formData.brandName || formData.firstName || null
      const website = formData.brandHandle || null
      
      try {
        localStorage.removeItem('postGeneration_contentHash')
        localStorage.setItem('postGeneration_note', JSON.stringify(noteData))
        localStorage.setItem('postGeneration_accountDescription', formData.brandIntention)
        localStorage.setItem('postGeneration_templateId', templateMapping.templateId)
        localStorage.setItem('postGeneration_colorThemeId', templateMapping.colorThemeId)
        localStorage.setItem('postGeneration_ideaTitle', generatedIdea)
        localStorage.setItem('postGeneration_userId', user?.id || '')
        if (accountName) {
          localStorage.setItem('postGeneration_accountName', accountName)
        }
        if (website) {
          localStorage.setItem('postGeneration_website', website)
        }
      } catch (storageError) {
        console.error('Error saving to localStorage:', storageError)
      }
      
      // Step 5: Create generation in database and get generationId
      setGenerationStep('rendering')
      const saveResponse = await fetch('/api/generations/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          ideaTitle: generatedIdea,
          accountDescription: formData.brandIntention,
          accountName: accountName,
          website: website,
          slides: noteData.slides,
          caption: noteData.caption,
          underlineWords: noteResult.data.underlineWords || {},
          fontCombinationId: templateMapping.fontCombinationId,
          colorThemeId: templateMapping.colorThemeId,
          templateId: templateMapping.templateId,
          imageUrls: [], // Will be populated when images are rendered
          thumbnailUrls: []
        })
      })
      
      const saveResult = await saveResponse.json()
      
      if (!saveResult.success || !saveResult.generationId) {
        throw new Error(saveResult.error || 'Failed to save generation')
      }
      
      // Store generationId for redirect
      localStorage.setItem('postGeneration_generationId', saveResult.generationId)
      
      // Step 6: Redirect to post page
      // Use window.location for a hard redirect to ensure URL parameters are properly set
      const redirectUrl = `/dashboard?view=post&id=${saveResult.generationId}`
      console.log('🚀 Redirecting to:', redirectUrl)
      window.location.href = redirectUrl
      
    } catch (err: any) {
      console.error('Error during onboarding generation:', err)
      setError(err.message || 'Something went wrong. Please try again.')
      setGenerationStep('idle')
      setIsLoading(false)
    }
  }

  const handleTopicToggle = (topic: string) => {
    const topics = formData.topics.includes(topic)
      ? formData.topics.filter(t => t !== topic)
      : formData.topics.length < 3
      ? [...formData.topics, topic]
      : formData.topics
    
    saveProgress({ topics })
  }

  const handleTemplateStyleSelect = (templateStyle: string) => {
    saveProgress({ templateStyle })
  }

  const handleCopyToneSelect = (tone: string) => {
    const tones = formData.copyTone.includes(tone)
      ? formData.copyTone.filter(t => t !== tone)
      : formData.copyTone.length < 2
      ? [...formData.copyTone, tone]
      : formData.copyTone
    
    saveProgress({ copyTone: tones })
  }

  const handleExampleClick = (example: string) => {
    saveProgress({ brandIntention: example })
  }

  const canProceed = () => {
    if (currentStep === 1) return formData.firstName.trim().length > 0
    if (currentStep === 2) return formData.brandName && formData.brandName.trim().length > 0
    if (currentStep === 3) return formData.brandIntention.trim().length > 0
    if (currentStep === 4) return formData.topics.length > 0
    if (currentStep === 5) return formData.templateStyle.length > 0
    if (currentStep === 6) return formData.copyTone.length > 0 && formData.copyTone.length <= 2
    return false
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading">
          <div className="spinner"></div>
          <span style={{ color: '#000000' }}>Loading...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  // Show generation progress UI
  if (generationStep !== 'idle') {
    const stepLabels = {
      'generating-idea': 'Generating your personalized idea...',
      'creating-carousel': 'Creating your carousel...',
      'rendering': 'Rendering your carousel...'
    }
    
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#ffffff' }}>
        <div style={{ width: '100%', maxWidth: '440px', textAlign: 'center' }}>
          <div className="loading" style={{ marginBottom: '24px' }}>
            <div className="spinner"></div>
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#000000' }}>
            {stepLabels[generationStep]}
          </h2>
          <p style={{ color: '#666666', fontSize: '15px' }}>
            {generationStep === 'generating-idea' && 'Creating the perfect idea for you...'}
            {generationStep === 'creating-carousel' && 'This will take a moment...'}
            {generationStep === 'rendering' && 'Almost there!'}
          </p>
          {error && (
            <div className="error" style={{ marginTop: '24px' }}>
              {error}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#ffffff' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Step Indicator */}
        <div style={{ marginBottom: '32px', textAlign: 'left' }}>
          <div style={{ fontSize: '14px', color: '#666666', marginBottom: '8px' }}>
            Step {currentStep} of 6
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div
                key={step}
                style={{
                  flex: 1,
                  height: '4px',
                  background: step <= currentStep ? '#ffbd59' : '#e5e5e5',
                  borderRadius: '2px',
                  transition: 'background 0.2s ease'
                }}
              />
            ))}
          </div>
        </div>

        {/* Step 1: Personal Name */}
        {currentStep === 1 && (
          <>
            <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#000000', textAlign: 'left' }}>
              What's your name?
            </h1>
            <p style={{ color: '#666666', marginBottom: '8px', fontSize: '15px', textAlign: 'left' }}>
              We'll use this in your profile.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
              <div>
                <label htmlFor="firstName" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000000', marginBottom: '8px', textAlign: 'left' }}>
                  Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="input"
                  placeholder="Emma"
                  autoComplete="off"
                />
              </div>
            </div>
          </>
        )}

        {/* Step 2: Brand Identity */}
        {currentStep === 2 && (
          <>
            <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#000000', textAlign: 'left' }}>
              Your brand
            </h1>
            <p style={{ color: '#666666', marginBottom: '8px', fontSize: '15px', textAlign: 'left' }}>
              This can be you, your company, or a project.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
              <div>
                <label htmlFor="brandName" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000000', marginBottom: '8px', textAlign: 'left' }}>
                  Brand or account name
                </label>
                <input
                  id="brandName"
                  type="text"
                  value={formData.brandName || ''}
                  onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                  required
                  className="input"
                  placeholder="Bright Studio"
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="brandHandle" style={{ display: 'block', fontSize: '14px', fontWeight: '600', color: '#000000', marginBottom: '8px', textAlign: 'left' }}>
                  Handle or website (optional)
                </label>
                <input
                  id="brandHandle"
                  type="text"
                  value={formData.brandHandle || ''}
                  onChange={(e) => setFormData({ ...formData, brandHandle: e.target.value })}
                  className="input"
                  placeholder="@brightstudio or brightstudio.com"
                  autoComplete="off"
                />
              </div>
            </div>
          </>
        )}

        {/* Step 3: Brand Intention */}
        {currentStep === 3 && (
          <>
            <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#000000', textAlign: 'left' }}>
              What are you working on?
            </h1>
            <p style={{ color: '#666666', marginBottom: '8px', fontSize: '15px', textAlign: 'left' }}>
              One short sentence.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '24px' }}>
              <div>
                <textarea
                  value={formData.brandIntention}
                  onChange={(e) => setFormData({ ...formData, brandIntention: e.target.value })}
                  className="input"
                  placeholder="I run an online store and share what works."
                  rows={4}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {BRAND_INTENTION_EXAMPLES.map((example, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleExampleClick(example)}
                    style={{
                      padding: '12px 16px',
                      background: '#ffffff',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      color: '#666666',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f5f5f5'
                      e.currentTarget.style.borderColor = '#ffbd59'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#ffffff'
                      e.currentTarget.style.borderColor = '#e0e0e0'
                    }}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Step 4: Topics */}
        {currentStep === 4 && (
          <>
            <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#000000', textAlign: 'left' }}>
              What do you post about?
            </h1>
            <p style={{ color: '#666666', marginBottom: '24px', fontSize: '15px', textAlign: 'left' }}>
              Pick up to 3.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px' }}>
              {TOPIC_OPTIONS.map((topic) => {
                const isSelected = formData.topics.includes(topic)
                const isDisabled = !isSelected && formData.topics.length >= 3
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => handleTopicToggle(topic)}
                    disabled={isDisabled}
                    style={{
                      padding: '12px 20px',
                      background: isSelected ? '#ffbd59' : '#ffffff',
                      border: `2px solid ${isSelected ? '#ffbd59' : '#e5e5e5'}`,
                      borderRadius: '24px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: isSelected ? '#000000' : '#666666',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isDisabled && !isSelected) {
                        e.currentTarget.style.borderColor = '#ffbd59'
                        e.currentTarget.style.background = '#fff9ed'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDisabled && !isSelected) {
                        e.currentTarget.style.borderColor = '#e5e5e5'
                        e.currentTarget.style.background = '#ffffff'
                      }
                    }}
                  >
                    {topic}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Step 5: Template Style */}
        {currentStep === 5 && (
          <>
            <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#000000', textAlign: 'left' }}>
              Pick your look
            </h1>
            <p style={{ color: '#666666', marginBottom: '24px', fontSize: '15px', textAlign: 'left' }}>
              We'll use this to choose a template.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
              {TEMPLATE_STYLE_OPTIONS.map((style) => {
                const isSelected = formData.templateStyle === style
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => handleTemplateStyleSelect(style)}
                    style={{
                      padding: '16px 20px',
                      background: isSelected ? '#ffbd59' : '#ffffff',
                      border: `2px solid ${isSelected ? '#ffbd59' : '#e5e5e5'}`,
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '500',
                      color: isSelected ? '#000000' : '#666666',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#ffbd59'
                        e.currentTarget.style.background = '#fff9ed'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#e5e5e5'
                        e.currentTarget.style.background = '#ffffff'
                      }
                    }}
                  >
                    {style}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Step 6: Copy Tone */}
        {currentStep === 6 && (
          <>
            <h1 style={{ fontSize: '36px', fontWeight: '700', marginBottom: '8px', color: '#000000', textAlign: 'left' }}>
              How should your writing sound?
            </h1>
            <p style={{ color: '#666666', marginBottom: '24px', fontSize: '15px', textAlign: 'left' }}>
              This sets the tone of your copy.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginTop: '24px' }}>
              {COPY_TONE_OPTIONS.map((tone) => {
                const isSelected = formData.copyTone.includes(tone)
                const isDisabled = !isSelected && formData.copyTone.length >= 2
                return (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => handleCopyToneSelect(tone)}
                    disabled={isDisabled}
                    style={{
                      padding: '12px 20px',
                      background: isSelected ? '#ffbd59' : '#ffffff',
                      border: `2px solid ${isSelected ? '#ffbd59' : '#e5e5e5'}`,
                      borderRadius: '24px',
                      fontSize: '14px',
                      fontWeight: '500',
                      color: isSelected ? '#000000' : '#666666',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      opacity: isDisabled ? 0.5 : 1,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isDisabled && !isSelected) {
                        e.currentTarget.style.borderColor = '#ffbd59'
                        e.currentTarget.style.background = '#fff9ed'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isDisabled && !isSelected) {
                        e.currentTarget.style.borderColor = '#e5e5e5'
                        e.currentTarget.style.background = '#ffffff'
                      }
                    }}
                  >
                    {tone}
                  </button>
                )
              })}
            </div>
          </>
        )}

        {/* Error Display */}
        {error && (
          <div className="error" style={{ marginTop: '24px' }}>
            {error}
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="button secondary"
              style={{ flex: 1 }}
              disabled={isLoading}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
            className="button"
            style={{ flex: 1 }}
          >
            {isLoading ? 'Loading...' : currentStep === 6 ? 'Generate' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}

