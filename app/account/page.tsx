'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { getPlanById, STRIPE_PLANS } from '../config/stripeConfig'
import { TEMPLATE_STYLE_OPTIONS, COPY_TONE_OPTIONS, TOPIC_OPTIONS, BRAND_INTENTION_EXAMPLES } from '../config/onboardingConfig'
import { User, Settings, CreditCard, LogOut, ArrowLeft, Loader2, Check } from 'lucide-react'
import Link from 'next/link'

type Tab = 'profile' | 'preferences' | 'billing'

export default function AccountPage() {
  const { user, signOut, credits, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [loading, setLoading] = useState<string | null>(null)
  const [renewalDate, setRenewalDate] = useState<number | null>(null)
  
  // User Preferences State
  const [firstName, setFirstName] = useState<string | null>(null)
  const [brandName, setBrandName] = useState<string | null>(null)
  const [brandHandle, setBrandHandle] = useState<string | null>(null)
  const [brandIntention, setBrandIntention] = useState<string | null>(null)
  const [topics, setTopics] = useState<string[]>([])
  const [templateStyle, setTemplateStyle] = useState<string | null>(null)
  const [copyTone, setCopyTone] = useState<string[]>([])
  
  // Editing State
  const [editingFirstName, setEditingFirstName] = useState<string>('')
  const [editingBrandName, setEditingBrandName] = useState<string>('')
  const [editingBrandHandle, setEditingBrandHandle] = useState<string>('')
  const [editingBrandIntention, setEditingBrandIntention] = useState<string>('')
  const [editingTopics, setEditingTopics] = useState<string[]>([])
  const [editingTemplateStyle, setEditingTemplateStyle] = useState<string>('')
  const [editingCopyTone, setEditingCopyTone] = useState<string[]>([])
  
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [hasProfileChanges, setHasProfileChanges] = useState(false)
  const [hasPreferencesChanges, setHasPreferencesChanges] = useState(false)

  // Get subscription info from credits
  const subscriptionStatus = credits?.subscription_status ?? null
  const currentPlan = credits?.current_plan ?? null
  const creditsValue = credits?.credits_remaining ?? 0

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/signin')
    }
  }, [user, authLoading, router])

  // Fetch preferences when page loads
  useEffect(() => {
    if (user?.id) {
      fetchPreferences()
    }
  }, [user?.id])

  // Fetch renewal date from Stripe
  useEffect(() => {
    if (user?.id && subscriptionStatus === 'active') {
      fetch(`/api/stripe/subscription-renewal?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.renewalDate) {
            setRenewalDate(data.renewalDate)
          }
        })
        .catch(err => console.error('Error fetching renewal date:', err))
    }
  }, [user?.id, subscriptionStatus])

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

  // Check for profile changes (Display Name only)
  useEffect(() => {
    const isChanged = editingFirstName !== (firstName || '')
    setHasProfileChanges(isChanged)
  }, [editingFirstName, firstName])

  // Check for preferences changes
  useEffect(() => {
    const isChanged = 
      editingBrandName !== (brandName || '') ||
      editingBrandHandle !== (brandHandle || '') ||
      editingBrandIntention !== (brandIntention || '') ||
      JSON.stringify(editingTopics) !== JSON.stringify(topics) ||
      editingTemplateStyle !== (templateStyle || '') ||
      JSON.stringify(editingCopyTone) !== JSON.stringify(copyTone)
    
    setHasPreferencesChanges(isChanged)
  }, [
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

  const handleSaveProfile = async () => {
    if (!user?.id) return
    
    setIsSavingProfile(true)
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          firstName: editingFirstName.trim() || null,
          // Keep existing preference values
          brandName: brandName || null,
          brandHandle: brandHandle || null,
          brandIntention: brandIntention || null,
          topics: topics.length > 0 ? topics : null,
          templateStyle: templateStyle || null,
          copyTone: copyTone.length > 0 ? copyTone : null,
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setFirstName(data.firstName || null)
          setHasProfileChanges(false)
        }
      } else {
        alert('Failed to save profile. Please try again.')
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Failed to save profile. Please try again.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSavePreferences = async () => {
    if (!user?.id) return
    
    setIsSavingPreferences(true)
    try {
      if (!editingBrandIntention.trim() || editingTopics.length === 0 || !editingTemplateStyle || editingCopyTone.length === 0) {
        alert('Please fill in all required fields.')
        return
      }

      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          // Keep existing profile values
          firstName: firstName || null,
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
          setBrandName(data.brandName || null)
          setBrandHandle(data.brandHandle || null)
          setBrandIntention(data.brandIntention || null)
          setTopics(data.topics || [])
          setTemplateStyle(data.templateStyle || null)
          setCopyTone(data.copyTone || [])
          setHasPreferencesChanges(false)
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

  const handleSubscribe = async (planId: keyof typeof STRIPE_PLANS) => {
    if (!user) return

    setLoading(planId)

    try {
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: STRIPE_PLANS[planId].priceId,
          userId: user.id,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Checkout error:', errorData)
        alert(`Failed to start checkout: ${errorData.error || 'Please try again'}`)
        setLoading(null)
        return
      }

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned:', data)
        alert('Failed to start checkout. Please try again.')
        setLoading(null)
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      alert(`Failed to start checkout: ${error.message || 'Please try again'}`)
      setLoading(null)
    }
  }

  // Format renewal date from Stripe timestamp
  const getRenewalDate = () => {
    if (renewalDate) {
      const date = new Date(renewalDate * 1000)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const getInitial = (email: string | undefined) => {
    if (!email) return 'U'
    return email.charAt(0).toUpperCase()
  }

  // Plan calculations
  const plan = currentPlan ? getPlanById(currentPlan) : null
  const totalCredits = plan?.credits || 0
  const creditsPercentage = totalCredits > 0 ? (creditsValue / totalCredits) * 100 : 0

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#666' }} />
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa' }}>
      {/* Header */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e5e5',
        padding: '16px 0',
      }}>
        <div className="account-header" style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 120px',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
        }}>
          <Link 
            href="/dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#666',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#000'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#666'}
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </Link>
          <div style={{ height: '20px', width: '1px', background: '#e5e5e5' }} />
          <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Account Settings</h1>
        </div>
      </header>

      <div className="account-container" style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '0 120px',
        display: 'flex',
        minHeight: 'calc(100vh - 57px)',
      }}>
        {/* Sidebar */}
        <aside className="account-sidebar" style={{
          width: '240px',
          background: 'transparent',
          padding: '32px 0',
          flexShrink: 0,
        }}>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', height: '100%' }}>
            <div style={{ flex: 1 }}>
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
            </div>
            <div style={{ paddingTop: '16px', borderTop: '1px solid #e5e5e5' }}>
              <button
                onClick={handleSignOut}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={18} />
                Sign Out
              </button>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="account-main" style={{
          flex: 1,
          padding: '32px 0 32px 48px',
          width: '100%',
        }}>
          {activeTab === 'profile' && (
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', marginTop: 0 }}>Profile</h2>
              <p style={{ color: '#666', marginBottom: '40px', fontSize: '15px' }}>Manage your personal information.</p>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '48px' }}>
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
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>{firstName || 'User'}</div>
                  <div style={{ color: '#666', fontSize: '14px' }}>{user?.email}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '32px' }}>
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
              
              {hasProfileChanges && (
                <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'flex-end' }}>
                  <SaveButton onClick={handleSaveProfile} loading={isSavingProfile} />
                </div>
              )}
            </div>
          )}

          {activeTab === 'preferences' && (
            <div style={{ maxWidth: '800px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '28px', fontWeight: '700', margin: 0, marginTop: 0 }}>Preferences</h2>
                {hasPreferencesChanges && (
                  <SaveButton onClick={handleSavePreferences} loading={isSavingPreferences} />
                )}
              </div>
              <p style={{ color: '#666', marginBottom: '40px', fontSize: '15px' }}>Customize how we generate content for you.</p>
              
              {isLoadingPreferences ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: '#666' }} />
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '40px' }}>
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
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#e5e5e5'
                            e.currentTarget.style.borderColor = '#ffbd59'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#f5f5f5'
                            e.currentTarget.style.borderColor = '#e5e5e5'
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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
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
            <div style={{ maxWidth: '800px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px', marginTop: 0 }}>Billing & Credits</h2>
              <p style={{ color: '#666', marginBottom: '40px', fontSize: '15px' }}>Manage your subscription and view usage.</p>

              {/* Top Row - Two Cards */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px', 
                marginBottom: '32px' 
              }}>
                {/* Left Card: Current Plan */}
                {subscriptionStatus === 'active' && plan ? (
                  <div style={{
                    background: '#f5f5f5',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '1px solid #e5e5e5',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                  }}>
                    <div>
                      <div style={{ fontSize: '18px', fontWeight: '700', color: '#000000', marginBottom: '4px' }}>
                        You're on {plan.name} Plan
                      </div>
                      {getRenewalDate() && (
                        <div style={{ fontSize: '14px', color: '#666666' }}>
                          Renews {getRenewalDate()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleManageSubscription}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e5e5e5',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#f5f5f5'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff'
                      }}
                    >
                      Manage
                    </button>
                  </div>
                ) : (
                  <div style={{
                    background: '#f5f5f5',
                    borderRadius: '12px',
                    padding: '24px',
                    border: '1px solid #e5e5e5',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    minHeight: '120px',
                  }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#666666' }}>
                      No active subscription
                    </div>
                  </div>
                )}

                {/* Right Card: Credits Remaining */}
                <div style={{
                  background: '#f5f5f5',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '1px solid #e5e5e5',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#000000', margin: 0 }}>
                    Credits remaining
                  </h3>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#000000' }}>
                    {Math.round(creditsValue)}
                  </div>
                </div>
              </div>

              {/* Bottom Row - Plan Cards */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '20px' 
              }}>
                {Object.values(STRIPE_PLANS).map((planItem) => {
                  const isCurrentPlan = currentPlan === planItem.id
                  const isLoading = loading === planItem.id

                  const getButtonText = () => {
                    if (isLoading) return 'Loading...'
                    if (!currentPlan) return 'Subscribe'
                    
                    const currentPlanDetails = getPlanById(currentPlan)
                    if (!currentPlanDetails) return 'Subscribe'
                    
                    if (planItem.price > currentPlanDetails.price) {
                      return 'Upgrade'
                    } else if (planItem.price < currentPlanDetails.price) {
                      return 'Downgrade'
                    } else {
                      return 'Subscribe'
                    }
                  }

                  const isDowngrade = () => {
                    if (!currentPlan) return false
                    const currentPlanDetails = getPlanById(currentPlan)
                    if (!currentPlanDetails) return false
                    return planItem.price < currentPlanDetails.price
                  }

                  return (
                    <div
                      key={planItem.id}
                      style={{
                        border: '1px solid #e5e5e5',
                        borderRadius: '12px',
                        padding: '24px',
                        background: '#f5f5f5',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                      }}
                    >
                      <div>
                        <h3 style={{ fontSize: '20px', fontWeight: '700', color: '#000000', marginBottom: '4px' }}>
                          {planItem.name}
                        </h3>
                        <div style={{ fontSize: '32px', fontWeight: '700', color: '#000000' }}>
                          ${planItem.price}
                          <span style={{ fontSize: '16px', fontWeight: '400', color: '#666666' }}>/mo</span>
                        </div>
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', color: '#666666', marginBottom: '8px' }}>
                          {planItem.credits} credits per month
                        </div>
                      </div>

                      {isCurrentPlan ? (
                        <div
                          style={{
                            padding: '12px',
                            color: '#000000',
                            borderRadius: '8px',
                            textAlign: 'center',
                            fontWeight: '600',
                            fontSize: '14px',
                            background: '#ffffff',
                            border: '1px solid #e5e5e5',
                          }}
                        >
                          Current Plan
                        </div>
                      ) : isDowngrade() ? (
                        null
                      ) : (
                        <button
                          onClick={() => handleSubscribe(planItem.id)}
                          disabled={isLoading}
                          className="button"
                          style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '14px',
                            opacity: isLoading ? 0.6 : 1,
                          }}
                        >
                          {getButtonText()}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </main>
      </div>


      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        
        @media (max-width: 1400px) {
          .account-container {
            padding: 0 80px !important;
          }
          .account-header {
            padding: 0 80px !important;
          }
        }
        
        @media (max-width: 1024px) {
          .account-container {
            padding: 0 48px !important;
          }
          .account-header {
            padding: 0 48px !important;
          }
          .account-sidebar {
            width: 200px !important;
          }
          .account-main {
            padding-left: 32px !important;
          }
        }
        
        @media (max-width: 768px) {
          .account-container {
            padding: 0 24px !important;
            flex-direction: column !important;
          }
          .account-header {
            padding: 0 24px !important;
          }
          .account-sidebar {
            width: 100% !important;
            padding: 24px 0 !important;
            border-right: none !important;
            border-bottom: 1px solid #e5e5e5 !important;
          }
          .account-main {
            padding: 24px 0 !important;
            padding-left: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}

// Sub-components

function SidebarItem({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '100%',
        padding: '10px 12px',
        background: active ? '#fff9ed' : 'transparent',
        border: 'none',
        borderRadius: '8px',
        color: active ? '#000' : '#666',
        fontWeight: active ? '600' : '500',
        cursor: 'pointer',
        transition: 'all 0.2s',
        textAlign: 'left',
        fontSize: '14px',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = '#f5f5f5'
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent'
      }}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 2} color={active ? '#ffbd59' : 'currentColor'} />
      {label}
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
      onMouseEnter={(e) => {
        if (!disabled && !selected) {
          e.currentTarget.style.borderColor = '#ffbd59'
          e.currentTarget.style.background = '#fff9ed'
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !selected) {
          e.currentTarget.style.borderColor = '#e5e5e5'
          e.currentTarget.style.background = '#fff'
        }
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
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = '#ffbd59'
          e.currentTarget.style.background = '#fff9ed'
        }
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.borderColor = '#e5e5e5'
          e.currentTarget.style.background = '#fff'
        }
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
        minWidth: '120px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px'
      }}
    >
      {loading ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          Saving...
        </>
      ) : (
        <>
          <Check size={16} />
          Save Changes
        </>
      )}
    </button>
  )
}

