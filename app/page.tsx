'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { ArrowRight, ArrowLeft, ArrowDown } from 'lucide-react'
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
      name: 'Post My Note',
      tagline: 'Our own social media playground.',
      description: [
        'We use @postmynote as our main testing ground — experimenting with hooks, layouts, and posting rhythms before applying what works to our clients.',
        'Every strategy we use for others is battle-tested on our own account first.',
      ],
      folder: 'postmynote',
      accountUrl: '',
    },
    {
      name: 'Vista Dourada',
      tagline: 'Educating before selling the wine.',
      description: [
        'Vista Dourada is a wine delivery brand that doesn’t just want to sell bottles — they want to teach people how to enjoy them.',
        'We built educational carousels around tasting basics, wine myths, and pairing tips so their audience learns, saves, and naturally discovers the offer.',
      ],
      folder: 'vistadourada',
      accountUrl: '',
    },
    {
      name: 'Selvra',
      tagline: '60 seconds to calm — and a community around it.',
      description: [
        'Selvra is a meditation app that helps users calm down in 60 seconds and wants to attract people who crave peace in a busy day.',
        'We created soft, simple carousels that walk through quick calming practices, paired with gentle CTAs to join a community of people seeking quiet, not hustle.',
      ],
      folder: 'selvra',
      accountUrl: '',
    },
    {
      name: 'Doit',
      tagline: 'Minimalist productivity, visualised.',
      description: [
        'Doit is a minimalist to-do list app for people who care about productivity without clutter.',
        'We designed clean, focused carousels that share tiny productivity rituals, real workflows, and before/after use cases — helping Doit attract users who love both structure and simplicity.',
      ],
      folder: 'doit',
      accountUrl: '',
    },
  ]

  const getCurrentImageIndex = (folder: string) => {
    return currentImageIndex[folder] || 0
  }

  const setCurrentImageIndexForFolder = (folder: string, index: number) => {
    setCurrentImageIndex(prev => ({
      ...prev,
      [folder]: index
    }))
  }

  const navigateImage = (folder: string, direction: 'prev' | 'next') => {
    const images = projectImages[folder] || []
    if (images.length === 0) return

    const currentIndex = getCurrentImageIndex(folder)
    let newIndex: number

    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : images.length - 1
    } else {
      newIndex = currentIndex < images.length - 1 ? currentIndex + 1 : 0
    }

    setCurrentImageIndexForFolder(folder, newIndex)
  }

  useEffect(() => {
    // Fetch images for each project folder
    const fetchImages = async () => {
      const imagesMap: ProjectImages = {}
      
      const projectFolders = ['postmynote', 'vistadourada', 'selvra', 'doit']
      
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
      {/* Header */}
      <header className="agency-header">
        <div className="header-brand">
          <Image
            src="/logo.png"
            alt="Post My Note logo"
            width={120}
            height={36}
            priority
            className="header-logo"
            style={{ height: '36px', width: 'auto' }}
          />
        </div>
        <a href="#contact" className="header-button">Contact us</a>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-container">
          <div className="hero-content-wrapper">
            <h1 className="hero-title">
              <span className="hero-line hero-line-post">Post My Note</span>
              <span className="hero-line hero-line-next">Is Your Next</span>
              <span className="hero-line hero-line-choice">Marketing Choice</span>
            </h1>
          </div>
          
          <div className="hero-footer-wrapper">
            <div className="hero-footer-item hero-footer-center">
              <span>Scroll down</span>
              <ArrowDown size={16} />
            </div>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section className="projects-section">
        <div className="projects-container">
          <div className="projects-divider"></div>
          
          {projects.map((project, index) => {
            const images = projectImages[project.folder] || []
            const currentIndex = getCurrentImageIndex(project.folder)
            const currentImage = images[currentIndex]
            
            return (
              <div key={index} className="project-item">
                <div className="project-header">
                  <h2 className="project-title">{project.name}</h2>
                </div>
                {project.tagline && (
                  <p className="project-tagline">{project.tagline}</p>
                )}
                

                <div className="project-images-wrapper">
                  {images.length > 0 ? (
                    <div className="project-carousel">
                      {images.length > 1 && (
                        <button
                          className="carousel-arrow carousel-arrow-left"
                          onClick={() => navigateImage(project.folder, 'prev')}
                          aria-label="Previous image"
                        >
                          <ArrowLeft size={24} />
                        </button>
                      )}
                      
                      <div className="project-image-container">
                        <Image 
                          src={currentImage} 
                          alt={`${project.name} - Image ${currentIndex + 1}`}
                          width={1200}
                          height={1200}
                          className="project-image"
                          unoptimized
                          style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '50vh' }}
                        />
                      </div>
                      
                      {images.length > 1 && (
                        <button
                          className="carousel-arrow carousel-arrow-right"
                          onClick={() => navigateImage(project.folder, 'next')}
                          aria-label="Next image"
                        >
                          <ArrowRight size={24} />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="project-image-placeholder">
                      No images available
                    </div>
                  )}
                </div>

                {project.description?.map((paragraph, idx) => (
                  <p key={idx} className="project-description">
                    {paragraph}
                  </p>
                ))}
              </div>
            )
          })}
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="contact-container">
          <h2 className="contact-title">Work with us</h2>
          <p className="contact-subtitle">
            Have a project in mind? Let's build something great together.
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
              {isSubmitting ? 'Sending...' : 'Get in touch'}
            </button>

            {status && (
              <div className={`form-message ${status.success ? 'form-message-success' : 'form-message-error'}`}>
                {status.message || status.error}
              </div>
            )}
          </form>
          
          <div className="contact-footer">
            <div>© 2025 Post My Note. All rights reserved.</div>
          </div>
        </div>
      </section>

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
          padding: 24px 400px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          color: #000;
          background: rgba(255, 255, 255, 0.95);
          mix-blend-mode: normal;
          backdrop-filter: blur(10px);
          height: 72px;
          box-sizing: border-box;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-logo {
          height: 36px;
          width: auto;
          object-fit: contain;
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
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 120px 400px 40px;
          padding-top: calc(120px + 72px);
          box-sizing: border-box;
          justify-content: space-between;
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
          margin-top: -80px;
        }

        .hero-title {
          font-size: clamp(40px, 8vw, 90px);
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
          font-size: clamp(36px, 6vw, 72px);
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
          text-shadow: -3px -3px 0 #fff, 3px -3px 0 #fff, -3px 3px 0 #fff, 3px 3px 0 #fff,
                       -2px -2px 0 #fff, 2px -2px 0 #fff, -2px 2px 0 #fff, 2px 2px 0 #fff,
                       -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff;
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
          font-size: 14px;
          font-weight: 500;
        }

        .hero-footer-center {
          justify-content: center;
        }

        /* Projects Section */
        .projects-section {
          padding: 0 400px;
          padding-top: 40px;
          box-sizing: border-box;
        }

        .projects-container {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
        }

        .projects-divider {
          border-top: 1px solid #eee;
          width: 100%;
        }

        .project-item {
          padding: 100px 0;
          border-bottom: 1px solid #eee;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          gap: 40px;
        }

        .project-header {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
        }

        .project-title {
          font-size: 32px;
          font-weight: 600;
          margin: 0;
          text-align: center;
        }


        .project-tagline {
          font-size: 18px;
          line-height: 1.6;
          color: #555;
          font-style: italic;
          margin: 8px auto 0;
          max-width: 600px;
          text-align: center;
        }

        .project-description {
          font-size: 18px;
          line-height: 1.6;
          color: #333;
          margin: 16px auto 0;
          max-width: 400px;
          text-align: center;
        }

        .project-description + .project-description {
          margin-top: 12px;
        }

        .project-images-wrapper {
          width: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .project-carousel {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 1200px;
          gap: 24px;
          box-sizing: border-box;
        }

        .carousel-arrow {
          background: transparent;
          border: 1px solid #ddd;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
          flex-shrink: 0;
          color: #000;
        }

        .carousel-arrow:hover {
          background: #f5f5f5;
          border-color: #000;
        }

        .carousel-arrow:active {
          transform: scale(0.95);
        }

        .project-image-container {
          display: inline-flex;
          justify-content: center;
          align-items: center;
          background: transparent;
          padding: 0;
          max-width: 100%;
          overflow: visible;
          width: fit-content;
          height: fit-content;
        }

        .project-image {
          display: block;
          width: auto;
          height: auto;
          max-width: 120px;
          max-height: 120px;
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
          font-size: clamp(32px, 5vw, 64px);
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

        .contact-footer {
          margin-top: 120px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          color: #333;
          font-size: 14px;
        }

        /* Responsive Design */
        @media (max-width: 767px) {
          .agency-header {
            padding: 24px;
          }

          .hero-section {
            padding: 120px 24px 40px;
            padding-top: calc(120px + 72px);
          }

          .projects-section {
            padding: 0 24px;
            padding-top: 40px;
          }

          .contact-section {
            padding: 120px 24px;
          }

          .project-item {
            gap: 32px;
            padding: 60px 0;
          }

          .project-header {
            flex-direction: column;
            gap: 16px;
          }

          .project-carousel {
            flex-direction: row;
            gap: 8px;
            align-items: center;
            justify-content: center;
            width: 100%;
            max-width: 100%;
            position: relative;
            padding: 0 8px;
            box-sizing: border-box;
          }

          .carousel-arrow {
            width: 36px;
            height: 36px;
            flex-shrink: 0;
            position: static;
            min-width: 36px;
          }

          .carousel-arrow-left {
            order: 1;
          }

          .project-image-container {
            order: 2;
            min-height: auto;
            flex: 0 1 auto;
            max-width: calc(100% - 88px);
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .carousel-arrow-right {
            order: 3;
          }

          .project-image {
            max-width: 100%;
            max-height: 120px;
            width: auto;
            height: auto;
          }
        }

        @media (min-width: 768px) and (max-width: 1399px) {
          .agency-header {
            padding: 24px 200px !important;
          }

          .hero-section {
            padding: 120px 200px 40px !important;
          }

          .projects-section {
            padding: 0 200px !important;
          }

          .contact-section {
            padding: 120px 200px !important;
          }
        }

        @media (min-width: 1400px) {
          .agency-header {
            padding: 24px 400px !important;
          }

          .hero-section {
            padding: 120px 400px 40px !important;
          }

          .projects-section {
            padding: 0 400px !important;
          }

          .contact-section {
            padding: 120px 400px !important;
          }
        }
      `}</style>
    </div>
  )
}
