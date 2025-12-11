'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Linkedin, Instagram } from 'lucide-react'
import { EB_Garamond } from 'next/font/google'

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-eb-garamond',
  display: 'swap',
})

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

const projects = [
  {
    name: 'Vista Dourada',
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

export default function ProjectDetailPage({ params }: { params: { folder: string } }) {
  const [images, setImages] = useState<string[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isMounted, setIsMounted] = useState(false)
  const autoPlayInterval = useRef<NodeJS.Timeout | null>(null)
  const touchStartX = useRef<number>(0)
  const isDragging = useRef<boolean>(false)

  const project = projects.find(p => p.folder === params.folder)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await fetch(`/api/sections/images?folder=${params.folder}`)
        const data = await response.json()
        
        if (data.success && Array.isArray(data.images)) {
          setImages(data.images)
        }
      } catch (error) {
        console.error(`Error fetching images for ${params.folder}:`, error)
      }
    }

    fetchImages()
  }, [params.folder])

  const goToNextImage = () => {
    if (images.length === 0) return
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))
  }

  const goToPrevImage = () => {
    if (images.length === 0) return
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))
  }

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    touchStartX.current = clientX
    isDragging.current = true
  }

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current) return
    e.preventDefault()
  }

  const handleTouchEnd = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current) return
    
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : e.clientX
    const touchEndX = clientX
    const startX = touchStartX.current
    
    const swipeDistance = Math.abs(touchEndX - startX)
    const minSwipeDistance = 50

    if (swipeDistance >= minSwipeDistance) {
      if (touchEndX < startX) {
        goToNextImage()
      } else {
        goToPrevImage()
      }
    }

    isDragging.current = false
  }

  if (!isMounted || !project) {
    return null
  }

  return (
    <div className={`project-detail-page ${ebGaramond.variable}`}>
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
        <a href="/#contact" className="header-button">Contact</a>
      </header>

      <div className="project-detail-container">
        <div className="project-detail-left">
          <div className="project-detail-header-content">
            <img
              src={`/sections/${project.folder}/logo.svg`}
              alt={`${project.name} icon`}
              width={project.folder === 'vistadourada' ? 48 : 32}
              height={project.folder === 'vistadourada' ? 48 : 32}
              className={`project-detail-icon ${project.folder === 'vistadourada' ? 'project-detail-icon-large' : ''}`}
            />
            <h1 className="project-detail-title">{project.name}</h1>
          </div>

          {project.description && project.description.length > 0 && (
            <div className="project-detail-description">
              {project.description.map((paragraph, idx) => (
                <p key={idx} className="project-detail-description-text">
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {(project.instagramUrl || project.threadsUrl || project.facebookUrl || project.linkedinUrl || project.tiktokUrl) && (
            <div className="project-detail-social">
              {project.instagramUrl && (
                <a
                  href={project.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-detail-social-link"
                  aria-label={`${project.name} Instagram`}
                >
                  <Instagram size={24} />
                </a>
              )}
              {project.threadsUrl && (
                <a
                  href={project.threadsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-detail-social-link"
                  aria-label={`${project.name} Threads`}
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
              {project.facebookUrl && (
                <a
                  href={project.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-detail-social-link"
                  aria-label={`${project.name} Facebook`}
                >
                  <FacebookIcon size={24} />
                </a>
              )}
              {project.linkedinUrl && (
                <a
                  href={project.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-detail-social-link"
                  aria-label={`${project.name} LinkedIn`}
                >
                  <Linkedin size={24} />
                </a>
              )}
              {project.tiktokUrl && (
                <a
                  href={project.tiktokUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="project-detail-social-link"
                  aria-label={`${project.name} TikTok`}
                >
                  <TikTokIcon size={24} />
                </a>
              )}
            </div>
          )}
        </div>

        <div className="project-detail-right">
          {images.length > 0 ? (
            <div className="project-detail-images-stack">
              {images.map((image, index) => (
                <div key={index} className="project-detail-image-wrapper">
                  <img 
                    src={image} 
                    alt={`${project.name} - Image ${index + 1}`}
                    className="project-detail-image"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="project-detail-placeholder">
              No images available
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .project-detail-page {
          font-family: var(--font-eb-garamond), 'EB Garamond', serif;
          color: #000;
          background: #fff;
          height: 100vh;
          overflow: hidden;
          padding-top: 72px;
          box-sizing: border-box;
        }

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
          gap: 12px;
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

        .project-detail-container {
          max-width: 100%;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: row;
          gap: 0;
          height: calc(100vh - 72px);
          overflow: hidden;
        }

        .project-detail-left {
          width: 50%;
          padding: 80px;
          display: flex;
          flex-direction: column;
          gap: 40px;
          box-sizing: border-box;
          position: fixed;
          left: 0;
          top: 72px;
          height: calc(100vh - 72px);
          overflow-y: auto;
        }

        .project-detail-right {
          width: 50%;
          margin-left: 50%;
          padding: 80px 80px 80px 0;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          height: calc(100vh - 72px);
          overflow-y: auto;
          overflow-x: hidden;
        }

        .project-detail-images-stack {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .project-detail-image-wrapper {
          width: 100%;
          display: flex;
          justify-content: flex-start;
          align-items: flex-start;
        }

        .project-detail-image {
          max-width: 100%;
          width: auto;
          height: auto;
          display: block;
        }

        .project-detail-placeholder {
          color: #999;
          font-size: 14px;
          text-align: center;
          padding: 100px 20px;
        }

        .project-detail-header-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          text-align: center;
        }

        .project-detail-icon {
          width: 32px;
          height: 32px;
          display: block;
          object-fit: contain;
        }

        .project-detail-icon-large {
          width: 48px !important;
          height: 48px !important;
        }

        .project-detail-title {
          font-size: 36px;
          font-weight: 600;
          margin: 0;
          line-height: 1.2;
        }

        .project-detail-description {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .project-detail-description-text {
          font-size: 24px;
          line-height: 1.7;
          color: #333;
          margin: 0;
        }

        .project-detail-social {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 20px;
        }

        .project-detail-social-link {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #000;
          text-decoration: none;
          transition: opacity 0.2s ease;
        }

        .project-detail-social-link:hover {
          opacity: 0.7;
        }

        .threads-icon {
          background: #ffffff;
          border-radius: 999px;
          padding: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 767px) {
          .project-detail-page {
            min-height: 100vh;
            height: auto;
            overflow: visible;
          }

          .agency-header {
            padding: 24px 24px !important;
            margin: 0 !important;
          }

          .project-detail-container {
            flex-direction: column;
            height: auto;
            min-height: auto;
            overflow: visible;
          }

          .project-detail-left {
            width: 100%;
            padding: 40px 24px;
            position: static;
            left: auto;
            top: auto;
            height: auto;
            max-height: none;
            overflow: visible;
          }

          .project-detail-right {
            width: 100%;
            margin-left: 0;
            padding: 0 24px 40px 24px;
            height: auto;
            overflow: visible;
          }

          .project-detail-images-stack {
            gap: 32px;
          }

          .project-detail-header-content {
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 12px;
            text-align: center;
          }

          .project-detail-title {
            font-size: 28px;
            margin: 0;
          }

          .project-detail-description-text {
            font-size: 20px;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .project-detail-page {
            min-height: 100vh;
            height: auto;
            overflow: visible;
          }

          .agency-header {
            padding: 24px 60px !important;
            margin: 0 !important;
          }

          .project-detail-container {
            flex-direction: column;
            height: auto;
            min-height: auto;
            overflow: visible;
          }

          .project-detail-left {
            width: 100%;
            padding: 60px 40px;
            position: static;
            left: auto;
            top: auto;
            height: auto;
            max-height: none;
            overflow: visible;
          }

          .project-detail-right {
            width: 100%;
            margin-left: 0;
            padding: 0 40px 60px 40px;
            height: auto;
            overflow: visible;
          }

          .project-detail-images-stack {
            gap: 36px;
          }
        }

        @media (min-width: 1024px) and (max-width: 1399px) {
          .agency-header {
            padding: 24px 60px !important;
            margin: 0 !important;
          }

          .project-detail-left {
            width: 50%;
            padding: 80px 60px;
          }

          .project-detail-right {
            width: 50%;
            margin-left: 50%;
            padding: 80px 60px 80px 0;
          }

          .project-detail-images-stack {
            gap: 36px;
          }
        }

        @media (min-width: 1400px) and (max-width: 1599px) {
          .agency-header {
            padding: 24px 80px !important;
            margin: 0 !important;
          }

          .project-detail-left {
            padding: 80px 100px;
          }

          .project-detail-right {
            padding: 80px 100px 80px 0;
          }
        }

        @media (min-width: 1600px) and (max-width: 1799px) {
          .agency-header {
            padding: 24px 100px !important;
            margin: 0 !important;
          }

          .project-detail-left {
            padding: 80px 120px;
          }

          .project-detail-right {
            padding: 80px 120px 80px 0;
          }
        }

        @media (min-width: 1800px) {
          .agency-header {
            padding: 24px 120px !important;
            margin: 0 !important;
          }

          .project-detail-left {
            padding: 80px 140px;
          }

          .project-detail-right {
            padding: 80px 140px 80px 0;
          }

          .project-detail-images-stack {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 40px;
          }

          .project-detail-image-wrapper {
            width: 100%;
          }
        }

        @media (min-width: 2000px) {
          .agency-header {
            padding: 24px 160px !important;
            margin: 0 !important;
          }

          .project-detail-left {
            padding: 80px 180px;
          }

          .project-detail-right {
            padding: 80px 180px 80px 0;
          }
        }
      `}</style>
    </div>
  )
}

