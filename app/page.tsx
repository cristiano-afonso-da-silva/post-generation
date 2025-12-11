'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowDown, Linkedin, Instagram } from 'lucide-react'

// Facebook Icon Component
const FacebookIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
)

// TikTok Icon Component
const TikTokIcon = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
)
import { EB_Garamond } from 'next/font/google'
import { submitLead } from './agencyonboarding/actions'

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-eb-garamond',
  display: 'swap',
})

interface ProjectImages {
  [key: string]: string[]
}

export default function Home() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<{ error?: string; success?: boolean; message?: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [projectImages, setProjectImages] = useState<ProjectImages>({})
  const [currentImageIndex, setCurrentImageIndex] = useState<{ [key: string]: number }>({})
  const [isMounted, setIsMounted] = useState(false)
  const touchStartX = useRef<{ [key: string]: number }>({})
  const isDragging = useRef<{ [key: string]: boolean }>({})

  useEffect(() => {
    setIsMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setStatus(null)
    
    const formData = new FormData()
    formData.append('email', email)
    
    const result = await submitLead(formData)
    setStatus(result)
    setIsSubmitting(false)
    if (result.success) {
      setEmail('')
    }
  }

  const projects = [
    {
      name: 'Vista Dourada',
      stats: {
        startDate: '2025-11-28',
        followers: 2127,
        views: 149200,
      },
      description: [
        'A wine delivery brand built on clarity and education. We create precise, approachable breakdowns of tasting fundamentals, common misconceptions, and thoughtful pairings — helping people understand what they\'re drinking, not just buying it.',
      ],
      folder: 'vistadourada',
      instagramUrl: 'https://www.instagram.com/vistadourda/',
      threadsUrl: 'https://www.threads.com/@vistadourda',
      facebookUrl: '',
      linkedinUrl: '',
      tiktokUrl: '',
    },
    {
      name: 'Post My Note',
      description: [
        'Our flagship account distills proven marketing, content strategy, and productivity principles into clear, practical lessons.',
        'These are the same frameworks we use to help brands communicate with consistency, build trust, and grow with intention.',
      ],
      folder: 'postmynote',
      instagramUrl: 'https://www.instagram.com/postmynote/',
      threadsUrl: 'https://www.threads.com/@postmynote',
      facebookUrl: 'https://www.facebook.com/profile.php?id=61584678028847',
      linkedinUrl: 'https://www.linkedin.com/company/post-my-note',
      tiktokUrl: '',
    },
    {
      name: 'Hoop Tale',
      description: [
        'A storytelling-driven basketball channel dedicated to showcasing players with accuracy and respect.',
        'We highlight journeys, career milestones, and defining moments — crafted to inspire fans and honour the integrity of the sport.',
      ],
      folder: 'hooptale',
      instagramUrl: 'https://www.instagram.com/hoop.tale/',
      threadsUrl: 'https://www.threads.com/@hoop.tale',
      facebookUrl: '',
      linkedinUrl: '',
      tiktokUrl: 'https://www.tiktok.com/@hoop.tale',
    },
    {
      name: 'Selvra',
      description: [
        'Selvra is an iOS app designed to help people reset in under a minute.',
        'Our content reflects this purpose: minimal, grounded, and restorative.',
        'Every insight and line is created to offer calm, emotional clarity, and genuine support.',
      ],
      folder: 'selvra',
      instagramUrl: '',
      threadsUrl: '',
      facebookUrl: '',
      linkedinUrl: '',
      tiktokUrl: '',
    },
    {
      name: 'Doit',
      description: [
        'Doit is a minimalist to-do app built for disciplined simplicity.',
        'We share evidence-backed habits, streamlined workflows, and small systems that help people stay organised with clarity and intent.',
      ],
      folder: 'doit',
      instagramUrl: '',
      threadsUrl: 'https://www.threads.com/@cristiano_a.silva/post/DQdN1rADiXT',
      facebookUrl: '',
      linkedinUrl: '',
      tiktokUrl: '',
    },
  ]

  const teamMembers = [
    {
      name: 'Cristiano Afonso da Silva',
      image: '/founders/cristiano.jpg',
      quote: 'Consistency beats hype',
      linkedinUrl: 'https://www.linkedin.com/in/cristianoafonsodasilva/',
      instagramUrl: 'https://www.instagram.com/cristiano_a.silva?igsh=dHl1eHRseWp2ZmQ%3D&utm_source=qr',
      threadsUrl: 'https://www.threads.com/@cristiano_a.silva?igshid=NTc4MTIwNjQ2YQ==',
    },
    {
      name: 'Joshua Lei',
      image: '/founders/joshua.jpg',
      quote: 'Less is more.',
      linkedinUrl: 'https://www.linkedin.com/in/joshua-l-41766813b/',
      instagramUrl: 'https://www.instagram.com/joshua_lih?igsh=MXYycW5odmZvazFncw==',
      threadsUrl: 'https://www.threads.com/@joshua_lih?igshid=NTc4MTIwNjQ2YQ==',
    },
  ]

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M'
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K'
    }
    return num.toString()
  }

  const getDaysActive = (startDate: string): number => {
    const start = new Date(startDate)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getCurrentImageIndex = (folder: string) => {
    return currentImageIndex[folder] || 0
  }

  const setCurrentImageIndexForFolder = (folder: string, index: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [folder]: index
    }))
  }

  const goToNextImage = (folder: string) => {
    const images = projectImages[folder] || []
    if (images.length === 0) return
    
    const currentIndex = getCurrentImageIndex(folder)
    const newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0
    setCurrentImageIndexForFolder(folder, newIndex)
  }

  const goToPrevImage = (folder: string) => {
    const images = projectImages[folder] || []
    if (images.length === 0) return
    
    const currentIndex = getCurrentImageIndex(folder)
    const newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1
    setCurrentImageIndexForFolder(folder, newIndex)
  }

  const handleTouchStart = (folder: string, e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    touchStartX.current[folder] = clientX
    isDragging.current[folder] = true
  }

  const handleTouchMove = (folder: string, e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current[folder]) return
    e.preventDefault()
  }

  const handleTouchEnd = (folder: string, e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current[folder]) return
    
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX
    const touchEndX = clientX
    const startX = touchStartX.current[folder]
    
    if (startX !== undefined) {
      const swipeDistance = Math.abs(touchEndX - startX)
      const minSwipeDistance = 50

      if (swipeDistance >= minSwipeDistance) {
        if (touchEndX < startX) {
          goToNextImage(folder)
        } else {
          goToPrevImage(folder)
        }
      }
    }

    isDragging.current[folder] = false
  }


  useEffect(() => {
    // Fetch images for each project folder
    const fetchImages = async () => {
      const imagesMap: ProjectImages = {}
      
      const projectFolders = ['postmynote', 'vistadourada', 'selvra', 'doit', 'hooptale']
      
      for (const folder of projectFolders) {
        try {
          const response = await fetch(`/api/sections/images?folder=${folder}`)
          const data = await response.json()
          
          if (data.success && Array.isArray(data.images)) {
            imagesMap[folder] = data.images
          } else {
            imagesMap[folder] = []
          }
        } catch (error) {
          console.error(`Error fetching images for ${folder}:`, error)
          imagesMap[folder] = []
        }
      }
      
      setProjectImages(imagesMap)
    }

    fetchImages()
  }, [])

  if (!isMounted) {
    return null
  }

  return (
    <div className={`agency-onboarding-page ${ebGaramond.variable}`}>
      {/* Hero Section */}
      <section className="hero-section">
        {/* Header */}
        <header className="agency-header">
          <div className="header-brand">
            <Link href="/">
              <Image
                src="/logo_copy.svg"
                alt="Post My Note logo"
                width={36}
                height={36}
                priority
                className="header-logo"
                style={{ cursor: 'pointer' }}
              />
            </Link>
          </div>
          <a href="#contact" className="header-button">Contact</a>
        </header>

        <div className="hero-container">
          <div className="hero-content-wrapper">
            <h1 className="hero-title">
              <span className="hero-line hero-line-post">Marketing that Earns <span className="hero-line-trust">Trust</span></span>
            </h1>
          </div>
          
          <div className="hero-footer-wrapper">
            <div className="hero-footer-item hero-footer-center">
              <span>Scroll down</span>
              <ArrowDown size={20} />
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="projects-section">
        <div className="projects-block">
          <h2 className="projects-heading">Our work</h2>
        </div>
        <div className="projects-container">
          {projects.map((project, index) => {
            const images = projectImages[project.folder] || []
            const currentIndex = getCurrentImageIndex(project.folder)
            const currentImage = images[currentIndex]
            
            return (
              <Link key={index} href={`/project/${project.folder}`} className="project-item">
                <div className="project-header">
                  <img
                    src={`/sections/${project.folder}/logo.svg`}
                    alt={`${project.name} icon`}
                    width={project.folder === 'vistadourada' ? 48 : 32}
                    height={project.folder === 'vistadourada' ? 48 : 32}
                    className={`project-icon ${project.folder === 'vistadourada' ? 'project-icon-large' : ''}`}
                  />
                  <h2 className="project-title">{project.name}</h2>
                </div>
                <div className="project-images-wrapper">
                  {images.length > 0 ? (
                    <div className="project-image-container">
                      <Image 
                        src={images[0]} 
                        alt={`${project.name}`}
                        width={1200}
                        height={1200}
                        className="project-image"
                        unoptimized
                        style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '50vh' }}
                      />
                    </div>
                  ) : (
                    <div className="project-image-placeholder">
                      No images available
                    </div>
                  )}
                </div>
                {project.stats && project.folder !== 'vistadourada' && (
                  <div className="project-stats">
                    <div className="project-stat">
                      <div className="project-stat-value">
                        {formatNumber(project.stats.views)}
                      </div>
                      <div className="project-stat-label">Views</div>
                    </div>
                    <div className="project-stat">
                      <div className="project-stat-value">
                        {formatNumber(project.stats.followers)}
                      </div>
                      <div className="project-stat-label">Followers</div>
                    </div>
                    <div className="project-stat">
                      <div className="project-stat-value">
                        {getDaysActive(project.stats.startDate)}
                      </div>
                      <div className="project-stat-label">Days</div>
                    </div>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </section>

      {/* Team Section */}
      <section className="team-section">
        <div className="team-container">
          <div className="team-block">
            <h2 className="team-heading">Our Team</h2>
            <div className="team-grid">
              {teamMembers.map((member) => (
                <div key={member.name} className="team-card">
                <div className="team-avatar">
                  <Image
                    src={member.image}
                    alt={`${member.name} portrait`}
                    fill
                    sizes="220px"
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className="team-name">{member.name}</div>
                {member.quote && <p className="team-quote">"{member.quote}"</p>}
                {(member.instagramUrl || member.threadsUrl || member.linkedinUrl) && (
                  <div className="team-social">
                    {member.instagramUrl && (
                      <a
                        href={member.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="team-social-link"
                        aria-label={`${member.name} Instagram`}
                      >
                        <Instagram size={24} />
                      </a>
                    )}
                    {member.threadsUrl && (
                      <a
                        href={member.threadsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="team-social-link"
                        aria-label={`${member.name} Threads`}
                      >
                        <div className="threads-icon">
                          <Image
                            src="/icon/threads.png"
                            alt="Threads icon"
                            width={24}
                            height={24}
                          />
                        </div>
                      </a>
                    )}
                    {member.linkedinUrl && (
                      <a
                        href={member.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="team-social-link"
                        aria-label={`${member.name} LinkedIn`}
                      >
                        <Linkedin size={24} />
                      </a>
                    )}
                  </div>
                )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="contact-container">
          <h2 className="contact-title">Work with us</h2>
          <p className="contact-subtitle">
            Let's make something that lasts.
          </p>
          
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-input-wrapper">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="form-input"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="form-button"
            >
              {isSubmitting ? 'Sending...' : 'Contact'}
            </button>

            {status && (
              <div className={`form-message ${status.success ? 'form-message-success' : 'form-message-error'}`}>
                {status.message || status.error}
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="agency-footer">
        <div className="footer-content">
          <div>© 2025 Post My Note. All rights reserved.</div>
        </div>
      </footer>

      <style jsx>{`
        .agency-onboarding-page {
          font-family: var(--font-eb-garamond), 'EB Garamond', serif;
          color: #000;
          background: #fff;
          min-height: 100vh;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          overflow-x: hidden;
          opacity: 1;
          visibility: visible;
        }

        /* Header */
        .agency-header {
          padding: 24px 24px;
          margin: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 10;
          color: #000;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          width: 100%;
          box-sizing: border-box;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 0;
          padding: 0;
          margin: 0;
        }

        .header-brand a {
          padding: 0;
          margin: 0;
          display: block;
        }

        .header-logo {
          width: auto;
          height: 36px;
          object-fit: contain;
          display: block;
          background: transparent;
          border-radius: 0;
          padding: 0;
          box-sizing: content-box;
        }

        .header-link {
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          color: inherit;
        }

        .header-button {
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          background: #000000 !important;
          color: #ffffff !important;
          padding: 10px 24px;
          border-radius: 999px;
          transition: all 0.2s ease;
          border: 1px solid #000000 !important;
          cursor: pointer;
          display: inline-block;
          mix-blend-mode: normal !important;
          isolation: isolate;
        }

        .header-button:hover {
          background: #333333 !important;
          border-color: #333333 !important;
        }

        /* Hero Section */
        .hero-section {
          height: 100vh;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 120px 40px 80px;
          box-sizing: border-box;
          justify-content: space-between;
          background-image: url('/sky.png');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          border-radius: 0;
          margin: 0;
          position: relative;
        }

        .hero-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          flex: 1;
        }

        .hero-content-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding-top: 0;
          margin-top: 0;
        }

        .hero-title {
          font-size: clamp(52px, 10vw, 90px);
          line-height: 1.1;
          font-weight: 400;
          letter-spacing: -0.02em;
          max-width: 1000px;
          text-align: center;
          margin: 0 auto;
          padding: 0;
        }

        .hero-line {
          display: block;
          color: #000;
        }

        .hero-line-post {
          font-family: var(--font-eb-garamond), 'EB Garamond', serif;
          font-size: clamp(48px, 8vw, 72px);
        }

        .hero-line-trust {
          font-style: normal;
          font-weight: 700;
          display: inline;
        }

        .hero-line-next {
          font-family: 'Niteclub', var(--font-eb-garamond), serif;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-size: clamp(64px, 11vw, 140px);
        }

        .hero-line-choice {
          font-family: 'Amoresa', var(--font-eb-garamond), serif;
          letter-spacing: 0.02em;
          font-size: clamp(52px, 8vw, 96px);
          text-shadow: -5px -5px 0 #fff, 5px -5px 0 #fff, -5px 5px 0 #fff, 5px 5px 0 #fff,
                       -4px -4px 0 #fff, 4px -4px 0 #fff, -4px 4px 0 #fff, 4px 4px 0 #fff,
                       -3px -3px 0 #fff, 3px -3px 0 #fff, -3px 3px 0 #fff, 3px 3px 0 #fff,
                       -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff,
                       -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;
          margin-top: 8px;
        }

        .hero-line-that {
          font-family: var(--font-eb-garamond), 'EB Garamond', serif;
          font-size: clamp(14px, 2vw, 20px);
          font-weight: 400;
          display: inline-block;
          margin: 0 8px;
        }

        .hero-line-earns-trust {
          font-family: var(--font-eb-garamond), 'EB Garamond', serif;
          font-size: clamp(56px, 9vw, 110px);
          font-weight: 700;
          font-style: italic;
          letter-spacing: 0.02em;
          display: inline-block;
        }

        .hero-footer-wrapper {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          width: 100%;
          margin-top: auto;
        }

        .hero-footer-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 18px;
          font-weight: 500;
        }

        .hero-footer-center {
          justify-content: center;
        }

        /* Projects Section */
        .projects-section {
          padding: 80px 0;
          box-sizing: border-box;
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
        }

        .projects-block {
          width: 100%;
          max-width: 1400px;
          margin: 0 auto;
          padding: 0;
          text-align: center;
          margin-bottom: 60px;
        }

        .projects-heading {
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 0;
        }

        .projects-container {
          width: 100%;
          max-width: 1600px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          margin: 0 auto;
          padding: 0 80px;
          box-sizing: border-box;
        }

        .projects-divider {
          display: none;
        }

        .project-item {
          padding: 0;
          margin-bottom: 100px;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 32px;
          box-sizing: border-box;
          text-decoration: none;
          color: inherit;
          cursor: pointer;
          transition: opacity 0.2s ease;
        }

        .project-item:hover {
          opacity: 0.7;
        }

        .project-header {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          gap: 16px;
          order: 1;
        }

        .project-title {
          font-size: 20px;
          font-weight: 500;
          margin: 0;
          text-align: center;
          letter-spacing: -0.01em;
        }

        .project-icon {
          width: 28px;
          height: 28px;
          display: block;
          object-fit: contain;
          image-rendering: auto;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          opacity: 0.8;
        }

        .project-icon-large {
          width: 36px !important;
          height: 36px !important;
        }


        .project-stats {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 32px;
          margin: 0;
          max-width: 100%;
          width: 100%;
          padding: 0;
          box-sizing: border-box;
        }

        .project-stat {
          text-align: center;
          flex: 0 0 auto;
          min-width: 0;
          overflow: hidden;
        }

        .project-stat-label {
          font-size: 10px;
          letter-spacing: 0.08em;
          color: #999;
          margin-top: 6px;
          font-weight: 400;
          text-transform: uppercase;
        }

        .project-stat-value {
          font-size: 18px;
          font-weight: 600;
          color: #000;
          line-height: 1.2;
          white-space: nowrap;
          letter-spacing: -0.02em;
        }

        @media (max-width: 768px) {
          .project-stats {
            gap: 24px;
          }

          .project-stat-value {
            font-size: 16px;
          }

          .project-stat-label {
            font-size: 9px;
          }
        }

        @media (max-width: 480px) {
          .project-stats {
            gap: 20px;
          }

          .project-stat-value {
            font-size: 15px;
          }

          .project-stat-label {
            font-size: 8px;
          }
        }

        .project-description {
          font-size: 14px;
          line-height: 1.6;
          color: #333;
          margin: 0;
          max-width: 100%;
          text-align: left;
        }

        .project-description + .project-description {
          margin-top: 12px;
        }

        .project-social {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 10px;
          margin-top: 8px;
        }

        .project-social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          text-decoration: none;
          transition: color 0.2s ease, opacity 0.2s ease;
        }

        .project-social-link:hover {
          color: #0077b5;
          opacity: 0.9;
        }

        .project-social-link img {
          width: 24px;
          height: 24px;
          display: block;
        }

        /* Team Section */
        .team-section {
          padding: 80px 400px;
          box-sizing: border-box;
        }

        .team-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .team-block {
          padding: 0;
          text-align: center;
        }

        .team-heading {
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 40px;
        }

        .team-grid {
          display: grid;
          grid-template-columns: repeat(2, 200px);
          gap: 32px 169px;
          margin-bottom: 60px;
          justify-content: center;
        }

        .team-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-bottom: 8px;
        }

        .team-avatar {
          width: 200px;
          height: 200px;
          border-radius: 999px;
          border: 2px solid #000;
          overflow: hidden;
          position: relative;
        }

        .team-name {
          font-size: 18px;
          font-weight: 600;
          text-align: center;
        }

        .team-quote {
          font-size: 15px;
          color: #555;
          font-style: italic;
          text-align: center;
          max-width: 240px;
        }

        .team-social {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-top: 10px;
        }

        .team-social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          text-decoration: none;
          transition: color 0.2s ease, opacity 0.2s ease;
        }

        .team-social-link:hover {
          color: #0077b5;
          opacity: 0.9;
        }

        .team-social-link img {
          width: 24px;
          height: 24px;
          display: block;
        }

        .threads-icon {
          background: #ffffff;
          border-radius: 999px;
          padding: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
        }


        .project-images-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0;
          padding: 20px 0;
          order: 2;
        }

        .project-image-container {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: transparent;
          padding: 20px;
          margin: 0;
        }

        .project-image {
          display: block;
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 140px;
          object-fit: contain;
          margin: 0;
        }

        .project-image-placeholder {
          color: #999;
          font-size: 14px;
          text-align: center;
          padding: 100px 20px;
        }

        /* Contact Section */
        .contact-section {
          min-height: 80vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 120px 400px;
          background: #fff;
          color: #000;
        }

        .contact-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          text-align: center;
        }

        .contact-title {
          font-size: 32px;
          margin: 0 0 24px 0;
          font-weight: 600;
        }

        .contact-subtitle {
          font-size: 18px;
          color: #333;
          margin: 0 0 48px 0;
          line-height: 1.6;
        }

        .contact-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          align-items: center;
        }

        .form-input-wrapper {
          width: 100%;
          max-width: 400px;
          position: relative;
        }

        .form-input {
          width: 100%;
          padding: 16px 24px;
          border-radius: 999px;
          border: 1px solid #ddd;
          background: transparent;
          color: #000;
          font-size: 16px;
          font-family: var(--font-eb-garamond), 'EB Garamond', serif;
          outline: none;
          text-align: center;
          box-sizing: border-box;
        }

        .form-input::placeholder {
          font-family: var(--font-eb-garamond), 'EB Garamond', serif;
          color: #777;
        }

        .form-button {
          padding: 16px 48px;
          border-radius: 999px;
          background: #000;
          color: #fff;
          font-size: 16px;
          font-weight: 600;
          font-family: var(--font-eb-garamond), 'EB Garamond', serif;
          border: none;
          cursor: pointer;
          opacity: 1;
          transition: opacity 0.2s;
        }

        .form-button:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .form-message {
          margin-top: 16px;
          padding: 12px;
          border-radius: 8px;
          font-size: 14px;
        }

        .form-message-success {
          background: rgba(0, 255, 0, 0.1);
          color: #4ade80;
        }

        .form-message-error {
          background: rgba(255, 0, 0, 0.1);
          color: #ef4444;
        }

        /* Footer */
        .agency-footer {
          padding: 48px 24px;
          background: #fff;
          border-top: 1px solid #f0f0f0;
        }

        .footer-content {
          max-width: 1400px;
          margin: 0 auto;
          text-align: center;
          color: #666;
          font-size: 14px;
        }

        /* Responsive Design */
        @media (max-width: 767px) {
          .agency-header {
            padding: 24px 24px !important;
            margin: 0 !important;
          }

          .hero-section {
            height: 100vh;
            min-height: 100vh;
            padding: 100px 20px 60px;
            margin: 0;
            border-radius: 0;
            background-size: cover;
          }

          .hero-title {
            font-size: clamp(56px, 12vw, 90px) !important;
          }

          .hero-line-post {
            font-size: clamp(52px, 10vw, 72px) !important;
          }

          .projects-section {
            padding: 0;
            padding-top: 40px;
          }

          .team-section {
            padding: 60px 24px;
          }

          .projects-section {
            padding: 60px 0;
          }

          .projects-container {
            grid-template-columns: 1fr;
            padding: 0 24px;
            gap: 0;
          }

          .project-item {
            gap: 20px;
            margin-bottom: 80px;
            align-items: center;
          }

          .project-item:last-child {
            margin-bottom: 0;
          }

          .project-header {
            flex-direction: row;
            gap: 12px;
            justify-content: center;
            order: 1 !important;
            margin-bottom: 0;
          }

          .project-images-wrapper {
            order: 2 !important;
            padding: 0;
            margin: 0;
          }

          .project-stats {
            order: 3 !important;
          }

          .project-title {
            text-align: center;
          }

          .team-grid {
            grid-template-columns: 1fr;
          }

          .team-avatar {
            width: 160px;
            height: 160px;
          }

          .team-quote {
            max-width: 220px;
          }

          .contact-section {
            padding: 120px 24px;
          }

          .agency-footer {
            padding: 48px 24px;
          }

          .project-image {
            max-width: 100%;
            max-height: 120px;
            width: auto;
            height: auto;
          }

          .project-icon {
            width: 32px;
            height: 32px;
          }

          .project-icon-large {
            width: 40px !important;
            height: 40px !important;
          }

          .project-description-wrapper {
            margin: 24px auto 0;
            padding: 0 16px;
          }

          .project-images-wrapper {
            margin: 20px 0;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .projects-container {
            grid-template-columns: repeat(2, 1fr);
            padding: 0 40px;
            gap: 20px;
          }

          .project-item {
            margin-bottom: 90px;
          }
        }

        @media (min-width: 1024px) and (max-width: 1399px) {
          .projects-container {
            grid-template-columns: repeat(3, 1fr);
            padding: 0 60px;
            gap: 22px;
          }

          .project-item {
            margin-bottom: 95px;
          }
        }

        @media (min-width: 768px) and (max-width: 1399px) {
          .agency-header {
            padding: 24px 60px !important;
            margin: 0 !important;
          }

          .hero-section {
            height: 100vh !important;
            min-height: 100vh !important;
            padding: 110px 40px 70px !important;
            margin: 0 !important;
            border-radius: 0 !important;
            background-size: cover !important;
          }

          .projects-section {
            padding: 80px 0 !important;
          }

          .projects-container {
            padding: 0 80px !important;
          }

          .team-section {
            padding: 80px 200px !important;
          }

          .contact-section {
            padding: 120px 200px !important;
          }

          .agency-footer {
            padding: 48px 200px !important;
          }
        }

        @media (min-width: 1400px) {
          .agency-header {
            padding: 24px 80px 12px 0 !important;
            margin: 0 !important;
          }

          .hero-section {
            height: 100vh !important;
            min-height: 100vh !important;
            padding: 120px 40px 80px !important;
            margin: 0 !important;
            border-radius: 0 !important;
            background-size: cover !important;
          }

          .projects-section {
            padding: 80px 0 !important;
          }

          .projects-container {
            padding: 0 80px !important;
          }

          .team-section {
            padding: 80px 400px !important;
          }

          .contact-section {
            padding: 120px 400px !important;
          }

          .agency-footer {
            padding: 48px 400px !important;
          }
        }
      `}</style>
    </div>
  )
}
