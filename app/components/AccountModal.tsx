'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import SubscriptionModal from './SubscriptionModal'
import { getPlanById } from '../config/stripeConfig'
import { TEMPLATE_STYLE_OPTIONS, COPY_TONE_OPTIONS, TOPIC_OPTIONS, BRAND_INTENTION_EXAMPLES } from '../config/onboardingConfig'

interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  credits: number
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | null
  currentPlan: string | null
}

export default function AccountModal({ 
  isOpen, 
  onClose, 
  credits, 
  subscriptionStatus, 
  currentPlan 
}: AccountModalProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  const [firstName, setFirstName] = useState<string | null>(null)
  const [brandName, setBrandName] = useState<string | null>(null)
  const [brandHandle, setBrandHandle] = useState<string | null>(null)
  const [brandIntention, setBrandIntention] = useState<string | null>(null)
  const [topics, setTopics] = useState<string[]>([])
  const [templateStyle, setTemplateStyle] = useState<string | null>(null)
  const [copyTone, setCopyTone] = useState<string[]>([])
  const [isEditingPreferences, setIsEditingPreferences] = useState(false)
  const [editingFirstName, setEditingFirstName] = useState<string>('')
  const [editingBrandName, setEditingBrandName] = useState<string>('')
  const [editingBrandHandle, setEditingBrandHandle] = useState<string>('')
  const [editingBrandIntention, setEditingBrandIntention] = useState<string>('')
  const [editingTopics, setEditingTopics] = useState<string[]>([])
  const [editingTemplateStyle, setEditingTemplateStyle] = useState<string>('')
  const [editingCopyTone, setEditingCopyTone] = useState<string[]>([])
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)

  // Fetch preferences when modal opens
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchPreferences()
    }
  }, [isOpen, user?.id])

  const fetchPreferences = async () => {
    if (!user?.id) return
    
    setIsLoadingPreferences(true)
    try {
      const response = await fetch(`/api/user/profile?userId=${user.id}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setFirstName(data.firstName || null)
          setBrandName(data.brandName || null)
          setBrandHandle(data.brandHandle || null)
          setBrandIntention(data.brandIntention || null)
          setTopics(data.topics || [])
          setTemplateStyle(data.templateStyle || null)
          setCopyTone(data.copyTone || [])
        }
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setIsLoadingPreferences(false)
    }
  }

  const handleStartEditPreferences = () => {
    setEditingFirstName(firstName || '')
    setEditingBrandName(brandName || '')
    setEditingBrandHandle(brandHandle || '')
    setEditingBrandIntention(brandIntention || '')
    setEditingTopics([...topics])
    setEditingTemplateStyle(templateStyle || '')
    setEditingCopyTone([...copyTone])
    setIsEditingPreferences(true)
  }

  const handleCancelEditPreferences = () => {
    setEditingFirstName(firstName || '')
    setEditingBrandName(brandName || '')
    setEditingBrandHandle(brandHandle || '')
    setEditingBrandIntention(brandIntention || '')
    setEditingTopics([...topics])
    setEditingTemplateStyle(templateStyle || '')
    setEditingCopyTone([...copyTone])
    setIsEditingPreferences(false)
  }

  const handleSavePreferences = async () => {
    if (!user?.id) return
    
    setIsSavingPreferences(true)
    try {
      // Validate required fields
      if (!editingFirstName.trim() || !editingBrandIntention.trim() || editingTopics.length === 0 || !editingTemplateStyle || editingCopyTone.length === 0) {
        alert('Please fill in all required fields: Name, Brand Intention, Topics, Template Style, and Copy Tone.')
        return
      }

      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          firstName: editingFirstName.trim() || null,
          brandName: editingBrandName.trim() || null,
          brandHandle: editingBrandHandle.trim() || null,
          brandIntention: editingBrandIntention.trim() || null,
          topics: editingTopics.length > 0 ? editingTopics : null,
          templateStyle: editingTemplateStyle || null,
          copyTone: editingCopyTone.length > 0 ? editingCopyTone : null,
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setFirstName(data.firstName || null)
          setBrandName(data.brandName || null)
          setBrandHandle(data.brandHandle || null)
          setBrandIntention(data.brandIntention || null)
          setTopics(data.topics || [])
          setTemplateStyle(data.templateStyle || null)
          setCopyTone(data.copyTone || [])
          setIsEditingPreferences(false)
        }
      } else {
        alert('Failed to save preferences. Please try again.')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert('Failed to save preferences. Please try again.')
    } finally {
      setIsSavingPreferences(false)
    }
  }

  const handleTemplateStyleSelect = (style: string) => {
    setEditingTemplateStyle(style)
  }

  const handleTopicToggle = (topic: string) => {
    const isSelected = editingTopics.includes(topic)
    if (isSelected) {
      setEditingTopics(editingTopics.filter(t => t !== topic))
    } else if (editingTopics.length < 3) {
      setEditingTopics([...editingTopics, topic])
    }
  }

  const handleCopyToneToggle = (tone: string) => {
    const isSelected = editingCopyTone.includes(tone)
    if (isSelected) {
      setEditingCopyTone(editingCopyTone.filter(t => t !== tone))
    } else if (editingCopyTone.length < 2) {
      setEditingCopyTone([...editingCopyTone, tone])
    }
  }

  if (!isOpen) return null

  // Get user initial from email
  const getInitial = (email: string | undefined) => {
    if (!email) return 'U'
    const parts = email.split('@')[0]
    return parts.substring(0, 1).toUpperCase()
  }

  // Get user name from email (first part before @)
  const getUserName = (email: string | undefined) => {
    if (!email) return 'User'
    const parts = email.split('@')[0]
    // Capitalize first letter and format nicely
    return parts.charAt(0).toUpperCase() + parts.slice(1) + "'s Account"
  }

  // Get total credits from plan
  const plan = currentPlan ? getPlanById(currentPlan) : null
  const totalCredits = plan?.credits || 0
  // Ensure credits is a number, default to 0
  const creditsValue = typeof credits === 'number' && !isNaN(credits) ? credits : 0
  const creditsUsed = totalCredits > 0 ? totalCredits - creditsValue : 0
  const creditsPercentage = totalCredits > 0 ? (creditsValue / totalCredits) * 100 : 0

  const handleManageSubscription = async () => {
    if (!user?.id) {
      console.error('[Manage Subscription] Error: No user ID found', { user })
      return
    }
    
    try {
      console.log('[Manage Subscription] Starting request', { userId: user.id })
      
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      console.log('[Manage Subscription] Response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { raw: errorText }
        }
        
        console.error('[Manage Subscription] API Error Response:', {
          status: response.status,
          statusText: response.statusText,
          errorData,
          url: response.url,
        })
        
        alert(`Failed to open customer portal: ${errorData.error || response.statusText || 'Unknown error'}`)
        return
      }

      const data = await response.json()
      console.log('[Manage Subscription] Success response:', { data })
      
      if (data.url) {
        console.log('[Manage Subscription] Redirecting to:', data.url)
        window.location.href = data.url
      } else {
        console.error('[Manage Subscription] No URL in response:', { data })
        alert('Failed to open customer portal: No URL returned')
      }
    } catch (error: any) {
      console.error('[Manage Subscription] Network/Parse Error:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        cause: error?.cause,
        error: error,
      })
      alert(`Failed to open customer portal: ${error?.message || 'Network error'}`)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
    router.push('/')
  }

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        overflow: 'auto',
      }}
      onClick={onClose}
    >
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '2px solid #e5e5e5',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header with close button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#000000', margin: 0 }}>
              Account
            </h2>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#666666',
                padding: '0',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              ×
            </button>
          </div>

          {/* User Info Section */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '8px',
                background: subscriptionStatus === 'active' ? '#ffbd59' : '#e5e5e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                border: '2px solid',
                borderColor: subscriptionStatus === 'active' ? '#ffbd59' : '#e5e5e5',
              }}
            >
              <span style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                color: subscriptionStatus === 'active' ? '#000000' : '#000000',
                userSelect: 'none'
              }}>
                {getInitial(user?.email)}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: '18px', 
                fontWeight: '700', 
                color: '#000000',
                marginBottom: '4px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {getUserName(user?.email)}
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '400', 
                color: '#666666',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {user?.email}
              </div>
            </div>
            {subscriptionStatus === 'active' && plan && (
              <div style={{ 
                fontSize: '11px', 
                padding: '4px 10px',
                background: '#ffbd59',
                color: '#000000',
                borderRadius: '12px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                flexShrink: 0,
              }}>
                {plan.name.toUpperCase()}
              </div>
            )}
          </div>

          {/* Credits Section */}
          <div 
            onClick={() => setShowSubscriptionModal(true)}
            style={{ 
              marginBottom: '24px',
              cursor: 'pointer',
            }}
          >
            {totalCredits > 0 ? (
              <div 
                style={{
                  background: subscriptionStatus === 'active' ? '#fff8e6' : '#f5f5f5',
                  borderRadius: '12px',
                  padding: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = subscriptionStatus === 'active' ? '#ffe8b3' : '#e5e5e5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = subscriptionStatus === 'active' ? '#fff8e6' : '#f5f5f5'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}>
                  <div>
                    <div style={{ 
                      fontSize: '12px', 
                      fontWeight: '600', 
                      color: '#666666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '4px'
                    }}>
                      Credits Remaining
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'baseline', 
                      gap: '8px'
                    }}>
                      <span style={{ 
                        fontSize: '32px', 
                        fontWeight: '700', 
                        color: subscriptionStatus === 'active' ? '#ffbd59' : '#000000',
                        lineHeight: '1'
                      }}>
                        {Math.round(creditsValue)}
                      </span>
                      <span style={{ 
                        fontSize: '16px', 
                        fontWeight: '500', 
                        color: '#666666'
                      }}>
                        / {totalCredits}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    color: '#666666',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}>
                    <span>View details</span>
                    <span style={{ fontSize: '12px' }}>→</span>
                  </div>
                </div>
                
                <div style={{ 
                  width: '100%',
                  height: '10px',
                  background: '#e5e5e5',
                  borderRadius: '5px',
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                <div style={{ 
                  width: `${Math.min(Math.max(creditsPercentage, 0), 100)}%`,
                  height: '100%',
                  background: subscriptionStatus === 'active' ? '#ffbd59' : '#666666',
                  borderRadius: '5px',
                  transition: 'width 0.3s ease',
                }} />
                </div>
              </div>
            ) : (
              <div 
                style={{ 
                  padding: '24px',
                  background: '#f5f5f5',
                  borderRadius: '12px',
                  textAlign: 'center',
                  position: 'relative',
                  transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e5e5'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f5f5f5'
                }}
              >
                <div style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#666666',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  marginBottom: '8px'
                }}>
                  Free Credits
                </div>
                <div style={{ 
                  fontSize: '36px', 
                  fontWeight: '700', 
                  color: '#000000',
                  marginBottom: '4px',
                  lineHeight: '1'
                }}>
                  {creditsValue}
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#666666',
                }}>
                  remaining
                </div>
                <div style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: '#666666',
                  fontSize: '14px',
                  fontWeight: '500',
                }}>
                  <span>Upgrade</span>
                  <span style={{ fontSize: '12px' }}>→</span>
                </div>
              </div>
            )}
          </div>

          {/* Preferences Section */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '700', 
                color: '#000000',
                margin: 0
              }}>
                Preferences
              </h3>
              {!isEditingPreferences && (
                <button
                  onClick={handleStartEditPreferences}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#ffbd59',
                    cursor: 'pointer',
                    padding: '4px 8px',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none'
                  }}
                >
                  Edit
                </button>
              )}
            </div>

            {isLoadingPreferences ? (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                color: '#666666',
                fontSize: '14px'
              }}>
                Loading preferences...
              </div>
            ) : isEditingPreferences ? (
              <div style={{
                background: '#f5f5f5',
                borderRadius: '12px',
                padding: '20px',
                maxHeight: '60vh',
                overflowY: 'auto',
              }}>
                {/* First Name */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: '8px'
                  }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={editingFirstName}
                    onChange={(e) => setEditingFirstName(e.target.value)}
                    className="input"
                    placeholder="Emma"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Brand Name */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: '8px'
                  }}>
                    Brand or Account Name
                  </label>
                  <input
                    type="text"
                    value={editingBrandName}
                    onChange={(e) => setEditingBrandName(e.target.value)}
                    className="input"
                    placeholder="Bright Studio"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Brand Handle */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: '8px'
                  }}>
                    Handle or Website
                  </label>
                  <input
                    type="text"
                    value={editingBrandHandle}
                    onChange={(e) => setEditingBrandHandle(e.target.value)}
                    className="input"
                    placeholder="@brightstudio or brightstudio.com"
                    style={{ width: '100%' }}
                  />
                </div>

                {/* Brand Intention */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: '8px'
                  }}>
                    What are you working on? *
                  </label>
                  <textarea
                    value={editingBrandIntention}
                    onChange={(e) => setEditingBrandIntention(e.target.value)}
                    className="input"
                    placeholder="I run an online store and share what works."
                    rows={3}
                    style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                    {BRAND_INTENTION_EXAMPLES.map((example, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setEditingBrandIntention(example)}
                        style={{
                          padding: '8px 12px',
                          background: '#ffffff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '6px',
                          fontSize: '12px',
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

                {/* Topics */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: '12px'
                  }}>
                    Topics (select up to 3) *
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {TOPIC_OPTIONS.map((topic) => {
                      const isSelected = editingTopics.includes(topic)
                      const isDisabled = !isSelected && editingTopics.length >= 3
                      return (
                        <button
                          key={topic}
                          type="button"
                          onClick={() => handleTopicToggle(topic)}
                          disabled={isDisabled}
                          style={{
                            padding: '10px 16px',
                            background: isSelected ? '#ffbd59' : '#ffffff',
                            border: `2px solid ${isSelected ? '#ffbd59' : '#e5e5e5'}`,
                            borderRadius: '20px',
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
                </div>

                {/* Template Style Selection */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: '12px'
                  }}>
                    Template Style *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {TEMPLATE_STYLE_OPTIONS.map((style) => {
                      const isSelected = editingTemplateStyle === style
                      return (
                        <button
                          key={style}
                          type="button"
                          onClick={() => handleTemplateStyleSelect(style)}
                          style={{
                            padding: '12px 16px',
                            background: isSelected ? '#ffbd59' : '#ffffff',
                            border: `2px solid ${isSelected ? '#ffbd59' : '#e5e5e5'}`,
                            borderRadius: '8px',
                            fontSize: '14px',
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
                </div>

                {/* Copy Tone Selection */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#000000',
                    marginBottom: '12px'
                  }}>
                    Copy Tone (select up to 2) *
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {COPY_TONE_OPTIONS.map((tone) => {
                      const isSelected = editingCopyTone.includes(tone)
                      const isDisabled = !isSelected && editingCopyTone.length >= 2
                      return (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => handleCopyToneToggle(tone)}
                          disabled={isDisabled}
                          style={{
                            padding: '10px 16px',
                            background: isSelected ? '#ffbd59' : '#ffffff',
                            border: `2px solid ${isSelected ? '#ffbd59' : '#e5e5e5'}`,
                            borderRadius: '20px',
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
                </div>

                {/* Save/Cancel Buttons */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleSavePreferences}
                    disabled={isSavingPreferences || !editingFirstName.trim() || !editingBrandIntention.trim() || editingTopics.length === 0 || !editingTemplateStyle || editingCopyTone.length === 0}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      background: isSavingPreferences || !editingFirstName.trim() || !editingBrandIntention.trim() || editingTopics.length === 0 || !editingTemplateStyle || editingCopyTone.length === 0 ? '#e5e5e5' : '#ffbd59',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: isSavingPreferences || !editingFirstName.trim() || !editingBrandIntention.trim() || editingTopics.length === 0 || !editingTemplateStyle || editingCopyTone.length === 0 ? '#999999' : '#000000',
                      cursor: isSavingPreferences || !editingFirstName.trim() || !editingBrandIntention.trim() || editingTopics.length === 0 || !editingTemplateStyle || editingCopyTone.length === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {isSavingPreferences ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={handleCancelEditPreferences}
                    disabled={isSavingPreferences}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      background: '#ffffff',
                      border: '2px solid #e5e5e5',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#666666',
                      cursor: isSavingPreferences ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSavingPreferences) {
                        e.currentTarget.style.borderColor = '#ffbd59'
                        e.currentTarget.style.background = '#fff9ed'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSavingPreferences) {
                        e.currentTarget.style.borderColor = '#e5e5e5'
                        e.currentTarget.style.background = '#ffffff'
                      }
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                background: '#f5f5f5',
                borderRadius: '12px',
                padding: '20px',
              }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#666666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px'
                  }}>
                    Name
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#000000'
                  }}>
                    {firstName || 'Not set'}
                  </div>
                </div>
                {brandName && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '8px'
                    }}>
                      Brand Name
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#000000'
                    }}>
                      {brandName}
                    </div>
                  </div>
                )}
                {brandHandle && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '8px'
                    }}>
                      Handle/Website
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#000000'
                    }}>
                      {brandHandle}
                    </div>
                  </div>
                )}
                {brandIntention && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '8px'
                    }}>
                      What You're Working On
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#000000'
                    }}>
                      {brandIntention}
                    </div>
                  </div>
                )}
                {topics.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#666666',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      marginBottom: '8px'
                    }}>
                      Topics
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#000000'
                    }}>
                      {topics.join(', ')}
                    </div>
                  </div>
                )}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#666666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px'
                  }}>
                    Template Style
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#000000'
                  }}>
                    {templateStyle || 'Not set'}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#666666',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    marginBottom: '8px'
                  }}>
                    Copy Tone
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#000000'
                  }}>
                    {copyTone.length > 0 ? copyTone.join(', ') : 'Not set'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Feedback Section */}
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => window.location.href = 'mailto:hello@postmynote.app?subject=Feedback'}
              className="button secondary"
              style={{ 
                width: '100%',
                padding: '12px 24px', 
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Feedback
            </button>
          </div>

          {/* Sign Out Section */}
          <div>
            <button
              onClick={handleSignOut}
              className="button secondary"
              style={{ 
                width: '100%',
                padding: '12px 24px', 
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
    </div>
  )

  // Use portal to render modal at document body level
  if (typeof window !== 'undefined') {
    return (
      <>
        {createPortal(modalContent, document.body)}
        {showSubscriptionModal && (
          <SubscriptionModal
            isOpen={showSubscriptionModal}
            onClose={() => {
              setShowSubscriptionModal(false)
            }}
            currentPlan={currentPlan}
            credits={credits}
            subscriptionStatus={subscriptionStatus}
          />
        )}
      </>
    )
  }
  
  return null
}

