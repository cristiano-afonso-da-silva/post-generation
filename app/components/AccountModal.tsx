'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import SubscriptionModal from './SubscriptionModal'
import { getPlanById } from '../config/stripeConfig'
import { TEMPLATE_STYLE_OPTIONS, COPY_TONE_OPTIONS, TOPIC_OPTIONS, BRAND_INTENTION_EXAMPLES } from '../config/onboardingConfig'
import { User, Settings, CreditCard, LogOut, X, ChevronRight, Loader2 } from 'lucide-react'

interface AccountModalProps {
  isOpen: boolean
  onClose: () => void
  credits: number
  subscriptionStatus: 'active' | 'canceled' | 'past_due' | null
  currentPlan: string | null
}

type Tab = 'profile' | 'preferences' | 'billing'

export default function AccountModal({ 
  isOpen, 
  onClose, 
  credits, 
  subscriptionStatus, 
  currentPlan 
}: AccountModalProps) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false)
  
  // User Preferences State
  const [firstName, setFirstName] = useState<string | null>(null)
  const [brandName, setBrandName] = useState<string | null>(null)
  const [brandHandle, setBrandHandle] = useState<string | null>(null)
  const [brandIntention, setBrandIntention] = useState<string | null>(null)
  const [topics, setTopics] = useState<string[]>([])
  const [templateStyle, setTemplateStyle] = useState<string | null>(null)
  const [copyTone, setCopyTone] = useState<string[]>([])
  
  // Editing State (Directly bound to inputs for "Save" action)
  const [editingFirstName, setEditingFirstName] = useState<string>('')
  const [editingBrandName, setEditingBrandName] = useState<string>('')
  const [editingBrandHandle, setEditingBrandHandle] = useState<string>('')
  const [editingBrandIntention, setEditingBrandIntention] = useState<string>('')
  const [editingTopics, setEditingTopics] = useState<string[]>([])
  const [editingTemplateStyle, setEditingTemplateStyle] = useState<string>('')
  const [editingCopyTone, setEditingCopyTone] = useState<string[]>([])
  
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch preferences when modal opens
  useEffect(() => {
    if (isOpen && user?.id) {
      fetchPreferences()
    }
  }, [isOpen, user?.id])

  // Initialize editing state when data is loaded
  useEffect(() => {
    setEditingFirstName(firstName || '')
    setEditingBrandName(brandName || '')
    setEditingBrandHandle(brandHandle || '')
    setEditingBrandIntention(brandIntention || '')
    setEditingTopics([...topics])
    setEditingTemplateStyle(templateStyle || '')
    setEditingCopyTone([...copyTone])
  }, [firstName, brandName, brandHandle, brandIntention, topics, templateStyle, copyTone])

  // Check for changes
  useEffect(() => {
    const isChanged = 
      editingFirstName !== (firstName || '') ||
      editingBrandName !== (brandName || '') ||
      editingBrandHandle !== (brandHandle || '') ||
      editingBrandIntention !== (brandIntention || '') ||
      JSON.stringify(editingTopics) !== JSON.stringify(topics) ||
      editingTemplateStyle !== (templateStyle || '') ||
      JSON.stringify(editingCopyTone) !== JSON.stringify(copyTone)
    
    setHasChanges(isChanged)
  }, [
    editingFirstName, firstName,
    editingBrandName, brandName,
    editingBrandHandle, brandHandle,
    editingBrandIntention, brandIntention,
    editingTopics, topics,
    editingTemplateStyle, templateStyle,
    editingCopyTone, copyTone
  ])

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

  const handleSavePreferences = async () => {
    if (!user?.id) return
    
    setIsSavingPreferences(true)
    try {
      // Validate required fields
      if (!editingFirstName.trim() || !editingBrandIntention.trim() || editingTopics.length === 0 || !editingTemplateStyle || editingCopyTone.length === 0) {
        alert('Please fill in all required fields.')
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
          setHasChanges(false)
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

  const handleManageSubscription = async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch('/api/stripe/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })

      if (!response.ok) throw new Error('Failed to open portal')
      const data = await response.json()
      if (data.url) window.location.href = data.url
    } catch (error) {
      console.error('Subscription portal error:', error)
      alert('Failed to open subscription management.')
    }
  }

  const handleSignOut = async () => {
    await signOut()
    onClose()
    router.push('/')
  }

  // Helper to get initials
  const getInitial = (email: string | undefined) => {
    if (!email) return 'U'
    return email.charAt(0).toUpperCase()
  }

  if (!isOpen) return null

  // Plan calculations
  const plan = currentPlan ? getPlanById(currentPlan) : null
  const totalCredits = plan?.credits || 0
  const creditsValue = typeof credits === 'number' && !isNaN(credits) ? credits : 0
  const creditsPercentage = totalCredits > 0 ? (creditsValue / totalCredits) * 100 : 0

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          width: '80vw',
          height: '80vh',
          maxWidth: 'none',
          maxHeight: 'none',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          overflow: 'hidden',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button Mobile/Desktop */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '50%',
            color: '#666',
            zIndex: 10,
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <X size={24} />
        </button>

        {/* Sidebar */}
        <div style={{
          width: '280px',
          background: '#fafafa',
          borderRight: '1px solid #eee',
          padding: '32px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
        }} className="modal-sidebar">
          <div style={{ marginBottom: '32px', paddingLeft: '12px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>Settings</h2>
            <p style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>Manage your account</p>
          </div>

          <SidebarItem 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            icon={User} 
            label="Profile" 
          />
          <SidebarItem 
            active={activeTab === 'preferences'} 
            onClick={() => setActiveTab('preferences')} 
            icon={Settings} 
            label="Preferences" 
          />
          <SidebarItem 
            active={activeTab === 'billing'} 
            onClick={() => setActiveTab('billing')} 
            icon={CreditCard} 
            label="Billing & Credits" 
          />

          <div style={{ marginTop: 'auto' }}>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                width: '100%',
                padding: '12px',
                background: 'transparent',
                border: 'none',
                borderRadius: '8px',
                color: '#ef4444',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          padding: '40px 48px',
          overflowY: 'auto',
        }}>
          {activeTab === 'profile' && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Profile</h3>
              <p style={{ color: '#666', marginBottom: '40px' }}>Manage your personal information.</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '40px' }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: '#ffbd59',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: '700',
                  border: '4px solid #fff8e6',
                }}>
                  {getInitial(user?.email)}
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: '600' }}>{firstName || 'User'}</div>
                  <div style={{ color: '#666' }}>{user?.email}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '24px' }}>
                <FormGroup label="Email Address">
                  <input 
                    type="email" 
                    value={user?.email || ''} 
                    disabled 
                    className="input"
                    style={{ background: '#f5f5f5', cursor: 'not-allowed' }} 
                  />
                </FormGroup>
                <FormGroup label="Display Name">
                  <input 
                    type="text" 
                    value={editingFirstName} 
                    onChange={(e) => setEditingFirstName(e.target.value)}
                    className="input"
                    placeholder="Enter your name"
                  />
                </FormGroup>
              </div>
              
              {hasChanges && activeTab === 'profile' && (
                 <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
                    <SaveButton onClick={handleSavePreferences} loading={isSavingPreferences} />
                 </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 style={{ fontSize: '24px', fontWeight: '700', margin: 0 }}>Preferences</h3>
                {hasChanges && (
                   <SaveButton onClick={handleSavePreferences} loading={isSavingPreferences} />
                )}
              </div>
              <p style={{ color: '#666', marginBottom: '40px' }}>Customize how we generate content for you.</p>
              
              {isLoadingPreferences ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                  <Loader2 className="animate-spin" />
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '32px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    <FormGroup label="Brand Name">
                      <input 
                        value={editingBrandName}
                        onChange={(e) => setEditingBrandName(e.target.value)}
                        className="input"
                        placeholder="e.g. Bright Studio"
                      />
                    </FormGroup>
                    <FormGroup label="Handle / Website">
                      <input 
                        value={editingBrandHandle}
                        onChange={(e) => setEditingBrandHandle(e.target.value)}
                        className="input"
                        placeholder="e.g. @brightstudio"
                      />
                    </FormGroup>
                  </div>

                  <FormGroup label="What are you working on?" description="Helps us tailor content to your niche.">
                    <textarea 
                      value={editingBrandIntention}
                      onChange={(e) => setEditingBrandIntention(e.target.value)}
                      className="input"
                      rows={3}
                      placeholder="I run an online store and share what works..."
                      style={{ fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      {BRAND_INTENTION_EXAMPLES.slice(0, 3).map((ex, i) => (
                        <button
                          key={i}
                          onClick={() => setEditingBrandIntention(ex)}
                          style={{
                            fontSize: '12px',
                            padding: '6px 12px',
                            background: '#f5f5f5',
                            border: '1px solid #e5e5e5',
                            borderRadius: '12px',
                            cursor: 'pointer'
                          }}
                        >
                          Example {i + 1}
                        </button>
                      ))}
                    </div>
                  </FormGroup>

                  <FormGroup label="Topics (max 3)" description="Select the main topics you post about.">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {TOPIC_OPTIONS.map(topic => (
                        <SelectionPill
                          key={topic}
                          label={topic}
                          selected={editingTopics.includes(topic)}
                          onClick={() => handleTopicToggle(topic)}
                          disabled={!editingTopics.includes(topic) && editingTopics.length >= 3}
                        />
                      ))}
                    </div>
                  </FormGroup>

                  <FormGroup label="Template Style" description="Choose your preferred visual style.">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '12px' }}>
                      {TEMPLATE_STYLE_OPTIONS.map(style => (
                        <SelectionCard
                          key={style}
                          label={style}
                          selected={editingTemplateStyle === style}
                          onClick={() => setEditingTemplateStyle(style)}
                        />
                      ))}
                    </div>
                  </FormGroup>

                  <FormGroup label="Tone of Voice (max 2)" description="How should your content sound?">
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {COPY_TONE_OPTIONS.map(tone => (
                        <SelectionPill
                          key={tone}
                          label={tone}
                          selected={editingCopyTone.includes(tone)}
                          onClick={() => handleCopyToneToggle(tone)}
                          disabled={!editingCopyTone.includes(tone) && editingCopyTone.length >= 2}
                        />
                      ))}
                    </div>
                  </FormGroup>
                </div>
              )}
            </div>
          )}

          {activeTab === 'billing' && (
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h3 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Billing & Credits</h3>
              <p style={{ color: '#666', marginBottom: '40px' }}>Manage your subscription and view usage.</p>

              {/* Plan Card */}
              <div style={{
                border: '1px solid #e5e5e5',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '32px',
                background: '#fafafa'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                  <div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Current Plan</div>
                    <div style={{ fontSize: '24px', fontWeight: '700' }}>
                      {subscriptionStatus === 'active' && plan ? plan.name : 'Free Plan'}
                    </div>
                  </div>
                  {subscriptionStatus === 'active' ? (
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' }}>Active</span>
                  ) : (
                    <button 
                      onClick={() => setShowSubscriptionModal(true)}
                      className="button"
                      style={{ padding: '10px 20px', fontSize: '14px' }}
                    >
                      Upgrade Now
                    </button>
                  )}
                </div>

                {subscriptionStatus === 'active' && (
                  <button
                    onClick={handleManageSubscription}
                    style={{
                      background: 'white',
                      border: '1px solid #e5e5e5',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    Manage Subscription <ChevronRight size={16} />
                  </button>
                )}
              </div>

              {/* Credits Card */}
              <div style={{
                border: '1px solid #e5e5e5',
                borderRadius: '16px',
                padding: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>Credits Remaining</div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#ffbd59' }}>
                    {Math.round(creditsValue)} <span style={{ fontSize: '16px', color: '#999' }}>/ {totalCredits || '∞'}</span>
                  </div>
                </div>
                
                <div style={{ width: '100%', height: '8px', background: '#f5f5f5', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${Math.min(Math.max(creditsPercentage, 0), 100)}%`,
                    height: '100%',
                    background: '#ffbd59',
                    borderRadius: '4px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>
                <p style={{ fontSize: '13px', color: '#666', marginTop: '12px' }}>
                  Credits reset at the beginning of your billing cycle.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        @media (max-width: 768px) {
          .modal-sidebar {
            width: 80px !important;
            padding: 20px 12px !important;
            align-items: center;
          }
          .sidebar-label {
            display: none;
          }
          .sidebar-title {
            display: none;
          }
        }
      `}</style>
    </div>
  )

  if (typeof window !== 'undefined') {
    return (
      <>
        {createPortal(modalContent, document.body)}
        {showSubscriptionModal && (
          <SubscriptionModal
            isOpen={showSubscriptionModal}
            onClose={() => setShowSubscriptionModal(false)}
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

// Sub-components for cleaner code

function SidebarItem({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '12px',
        background: active ? '#fff' : 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: active ? '#000' : '#666',
        fontWeight: active ? '600' : '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: active ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
      }}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 2} color={active ? '#ffbd59' : 'currentColor'} />
      <span className="sidebar-label">{label}</span>
    </button>
  )
}

function FormGroup({ label, description, children }: { label: string, description?: string, children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ fontSize: '14px', fontWeight: '600', color: '#000' }}>{label}</label>
      {description && <p style={{ fontSize: '13px', color: '#666', margin: 0, marginBottom: '4px' }}>{description}</p>}
      {children}
    </div>
  )
}

function SelectionPill({ label, selected, onClick, disabled }: { label: string, selected: boolean, onClick: () => void, disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 16px',
        borderRadius: '20px',
        border: `1px solid ${selected ? '#ffbd59' : '#e5e5e5'}`,
        background: selected ? '#fff9ed' : '#fff',
        color: selected ? '#000' : '#666',
        fontSize: '14px',
        fontWeight: selected ? '600' : '500',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.2s'
      }}
    >
      {label}
    </button>
  )
}

function SelectionCard({ label, selected, onClick }: { label: string, selected: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '16px',
        borderRadius: '12px',
        border: `2px solid ${selected ? '#ffbd59' : '#e5e5e5'}`,
        background: selected ? '#fff9ed' : '#fff',
        color: selected ? '#000' : '#666',
        fontSize: '14px',
        fontWeight: selected ? '600' : '500',
        cursor: 'pointer',
        textAlign: 'center',
        transition: 'all 0.2s'
      }}
    >
      {label}
    </button>
  )
}

function SaveButton({ onClick, loading }: { onClick: () => void, loading: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="button"
      style={{
        padding: '10px 24px',
        fontSize: '14px',
        minWidth: '100px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
    </button>
  )
}
