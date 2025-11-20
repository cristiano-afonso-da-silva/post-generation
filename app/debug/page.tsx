'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import type { CarouselTemplate } from '../config/carouselTemplates'

type SlideKind = 'HOOK' | 'MIDDLE' | 'CTA'

type SampleSlide = {
  kind: SlideKind
  title: string
  content?: string
  topic?: string
  subtitle?: string
  cta?: string
}

const SAMPLE_SLIDES: SampleSlide[] = [
  {
    kind: 'HOOK',
    title: 'Stop guessing content.',
    topic: 'Creator OS',
    subtitle: 'Start shipping strategic carousels.'
  },
  {
    kind: 'MIDDLE',
    title: 'Build once, reuse everywhere',
    content: 'Plug website data, auto-generate scripts, and preview with the exact template styles. No more rebuilding layouts in Figma just to validate an idea.'
  },
  {
    kind: 'CTA',
    title: 'Ready to publish?',
    content: 'Ship the carousel, post it straight from PostMyNote, or export the assets and keep iterating.'
  }
]

const DEFAULT_TEMPLATE: CarouselTemplate = {
  id: 'debug-template',
  name: 'Playground Template',
  fonts: {
    hook: {
      family: 'Poppins',
      weight: 'bold',
      style: 'normal',
      cssFont: 'bold 120px Poppins, sans-serif',
      lineHeight: 140,
      size: 120
    },
    title: {
      family: 'Sora',
      weight: '600',
      style: 'normal',
      cssFont: '600 70px Sora, sans-serif',
      lineHeight: 90,
      size: 70
    },
    content: {
      family: 'Inter',
      weight: '400',
      style: 'normal',
      cssFont: '400 48px Inter, sans-serif',
      lineHeight: 64,
      size: 48
    }
  },
  textColor: '#FFFFFF',
  roleColors: {
    hook: '#FFFFFF',
    title: '#FB923C',
    content: '#FDE68A',
    cta: '#FFFFFF'
  },
  background: {
    type: 'color',
    value: '#050816'
  },
  styles: {
    letterSpacing: {
      hook: 0,
      title: 0,
      content: -2,
      cta: 0
    },
    textAlign: {
      hook: 'left',
      title: 'left',
      content: 'left',
      cta: 'left'
    }
  },
  hookLayout: {
    showTopic: true,
    showSubtitle: true,
    showCTA: false,
    useImage: false
  },
  layout: {
    contentMaxWidth: 860,
    verticalAlign: 'center',
    gapTitleToContent: 48,
    hookPadding: { top: 120, right: 90, bottom: 120, left: 90 },
    titlePadding: { top: 120, right: 90, bottom: 120, left: 90 },
    contentPadding: { top: 160, right: 90, bottom: 120, left: 90 }
  },
  safeArea: {
    enabled: true,
    top: 80,
    bottom: 80,
    left: 80,
    right: 80
  },
  footer: {
    enabled: false
  }
}

export default function DebugPage() {
  const [templateSource, setTemplateSource] = useState<string>(JSON.stringify(DEFAULT_TEMPLATE, null, 2))
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)

  const { parsedTemplate, error } = useMemo(() => {
    try {
      const parsed = JSON.parse(templateSource) as CarouselTemplate
      return { parsedTemplate: parsed, error: null }
    } catch (err: any) {
      return { parsedTemplate: null, error: err.message || 'Invalid JSON' }
    }
  }, [templateSource])

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f8', padding: '40px 32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <header style={{ marginBottom: '32px' }}>
          <p style={{ fontSize: '13px', color: '#888888', textTransform: 'uppercase', fontWeight: 600 }}>
            Developer Tool
          </p>
          <h1 style={{ fontSize: '36px', fontWeight: 700, marginTop: '8px', marginBottom: '12px', color: '#111111' }}>
            Debug Template Playground
          </h1>
          <p style={{ maxWidth: '720px', fontSize: '16px', color: '#555555', lineHeight: 1.6 }}>
            Inspect any carousel template with sample data instantly. Use this sandbox when you tweak template configs,
            fonts, or layout logic—you will see the output immediately without going through the full generation flow.
          </p>
        </header>

        <section style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #ececec',
            padding: '24px',
            minHeight: '420px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Template JSON</h2>
            <p style={{ fontSize: '14px', color: '#666666', marginBottom: '16px' }}>
              Paste any <code>CarouselTemplate</code> object here. The preview updates as you type.
            </p>
            <textarea
              value={templateSource}
              onChange={(event) => setTemplateSource(event.target.value)}
              spellCheck={false}
              style={{
                flex: 1,
                width: '100%',
                borderRadius: '12px',
                border: '1px solid #d8d8d8',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '13px',
                lineHeight: 1.5,
                resize: 'vertical',
                minHeight: '250px'
              }}
            />
            <button
              onClick={() => setTemplateSource(JSON.stringify(DEFAULT_TEMPLATE, null, 2))}
              style={{
                marginTop: '12px',
                padding: '10px 16px',
                borderRadius: '10px',
                border: '1px solid #111111',
                background: '#111111',
                color: '#ffffff',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Reset to default
            </button>
            {error && (
              <div style={{
                marginTop: '12px',
                padding: '10px 12px',
                borderRadius: '10px',
                background: '#FEF2F2',
                color: '#B91C1C',
                fontSize: '13px',
                border: '1px solid #FCA5A5'
              }}>
                JSON error: {error}
              </div>
            )}
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #ececec',
            padding: '24px'
          }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px' }}>Sample Content</h2>
            <p style={{ fontSize: '14px', color: '#666666', marginBottom: '16px' }}>
              Hook + middle + CTA copy we reuse to validate typography, spacing, and color roles.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SAMPLE_SLIDES.map((slide, index) => (
                <div key={slide.kind} style={{
                  border: '1px solid #f0f0f0',
                  borderRadius: '12px',
                  padding: '12px',
                  background: currentSlideIndex === index ? '#f8fbff' : '#ffffff'
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0062ff', letterSpacing: '0.08em' }}>
                    {slide.kind}
                  </div>
                  <div style={{ fontWeight: 600, marginTop: '4px', fontSize: '15px' }}>
                    {slide.title || '(no title)'}
                  </div>
                  {slide.content && (
                    <p style={{ marginTop: '6px', fontSize: '13px', color: '#555555', lineHeight: 1.5 }}>
                      {slide.content}
                    </p>
                  )}
                  {slide.topic && (
                    <p style={{ marginTop: '6px', fontSize: '12px', color: '#888888' }}>
                      Topic: {slide.topic}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section style={{ background: '#ffffff', borderRadius: '18px', border: '1px solid #e6e6e6', padding: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Live Preview</h2>
              <p style={{ fontSize: '14px', color: '#666666' }}>
                Renders the selected template using the exact font sizes, spacing, and letter spacing from config.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentSlideIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentSlideIndex === 0}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #d0d0d0',
                  background: currentSlideIndex === 0 ? '#f5f5f5' : '#ffffff',
                  cursor: currentSlideIndex === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                ← Prev
              </button>
              <button
                onClick={() => setCurrentSlideIndex((prev) => Math.min(SAMPLE_SLIDES.length - 1, prev + 1))}
                disabled={currentSlideIndex === SAMPLE_SLIDES.length - 1}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #d0d0d0',
                  background: currentSlideIndex === SAMPLE_SLIDES.length - 1 ? '#f5f5f5' : '#ffffff',
                  cursor: currentSlideIndex === SAMPLE_SLIDES.length - 1 ? 'not-allowed' : 'pointer',
                  fontWeight: 600
                }}
              >
                Next →
              </button>
            </div>
          </div>

          {parsedTemplate ? (
            <TemplatePreview
              template={parsedTemplate}
              slides={SAMPLE_SLIDES}
              currentIndex={currentSlideIndex}
            />
          ) : (
            <div style={{
              padding: '40px',
              border: '2px dashed #e5e7eb',
              borderRadius: '16px',
              textAlign: 'center',
              color: '#9ca3af',
              fontWeight: 500
            }}>
              Fix the JSON to see a live preview.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

type TemplatePreviewProps = {
  template: CarouselTemplate
  slides: SampleSlide[]
  currentIndex: number
}

function TemplatePreview({ template, slides, currentIndex }: TemplatePreviewProps) {
  const slide = slides[currentIndex]

  const backgroundStyle: CSSProperties = {
    width: '100%',
    aspectRatio: '4 / 5',
    borderRadius: '20px',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px 40px',
    overflow: 'hidden',
    backgroundColor: '#f2f2f2'
  }

  if (slide.kind === 'HOOK' && template.hookBackground?.src) {
    backgroundStyle.backgroundImage = `url(${template.hookBackground.src})`
    backgroundStyle.backgroundSize = 'cover'
    backgroundStyle.backgroundPosition = 'center'
  } else if (template.background?.type === 'image' && template.background.src) {
    backgroundStyle.backgroundImage = `url(${template.background.src})`
    backgroundStyle.backgroundSize = 'cover'
    backgroundStyle.backgroundPosition = 'center'
  } else if (template.background?.type === 'color' && template.background.value) {
    backgroundStyle.backgroundColor = template.background.value
  }

  const textColor = template.textColor || '#000000'
  const hookLayout = template.hookLayout || { showTopic: true, showSubtitle: true, showCTA: true }

  const hookFont = template.fonts?.hook ?? DEFAULT_TEMPLATE.fonts.hook
  const titleFont = template.fonts?.title ?? DEFAULT_TEMPLATE.fonts.title
  const contentFont = template.fonts?.content ?? DEFAULT_TEMPLATE.fonts.content

  const scale = {
    hook: 0.16,
    title: 0.22,
    content: 0.20
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 520px) 1fr', gap: '32px', alignItems: 'center' }}>
      <div style={backgroundStyle}>
        {slide.kind === 'HOOK' ? (
          <div style={{ textAlign: template.styles?.textAlign?.hook || 'left' }}>
            {hookLayout.showTopic && slide.topic && template.fonts?.hookTopic && (
              <div style={{
                fontFamily: template.fonts.hookTopic.family,
                fontSize: `${template.fonts.hookTopic.size * 0.08}px`,
                fontWeight: template.fonts.hookTopic.weight,
                color: template.roleColors?.hook || textColor,
                letterSpacing: `${(template.styles?.letterSpacing?.hookTopic ?? 0) * 0.08}px`,
                textTransform: 'uppercase',
                marginBottom: '8px'
              }}>
                {slide.topic}
              </div>
            )}
            <div style={{
              fontFamily: hookFont.family,
              fontSize: `${hookFont.size * scale.hook}px`,
              fontWeight: hookFont.weight,
              color: template.roleColors?.hook || textColor,
              lineHeight: hookFont.lineHeight / hookFont.size,
              letterSpacing: `${(template.styles?.letterSpacing?.hook ?? 0) * scale.hook}px`,
              marginBottom: hookLayout.showSubtitle && slide.subtitle ? '16px' : '0',
              textShadow: textColor === '#FFFFFF' ? '2px 2px 4px rgba(0,0,0,0.55)' : 'none'
            }}>
              {slide.title}
            </div>
            {hookLayout.showSubtitle && slide.subtitle && template.fonts?.hookSubtitle && (
              <div style={{
                fontFamily: template.fonts.hookSubtitle.family,
                fontSize: `${template.fonts.hookSubtitle.size * 0.11}px`,
                fontWeight: template.fonts.hookSubtitle.weight,
                color: template.roleColors?.hook || textColor,
                letterSpacing: `${(template.styles?.letterSpacing?.hookSubtitle ?? 0) * 0.11}px`,
                marginBottom: hookLayout.showCTA && slide.cta ? '12px' : '0',
                textShadow: textColor === '#FFFFFF' ? '2px 2px 4px rgba(0,0,0,0.55)' : 'none'
              }}>
                {slide.subtitle}
              </div>
            )}
            {hookLayout.showCTA && slide.cta && template.fonts?.hookCTA && (
              <div style={{
                fontFamily: template.fonts.hookCTA.family,
                fontSize: `${template.fonts.hookCTA.size * 0.1}px`,
                fontWeight: template.fonts.hookCTA.weight,
                color: template.roleColors?.hook || textColor,
                letterSpacing: `${(template.styles?.letterSpacing?.hookCTA ?? 0) * 0.1}px`,
                textShadow: textColor === '#FFFFFF' ? '2px 2px 4px rgba(0,0,0,0.55)' : 'none'
              }}>
                {slide.cta}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: template.styles?.textAlign?.title || 'left' }}>
            {slide.kind !== 'CTA' && slide.title && (
              <div style={{
                fontFamily: titleFont.family,
                fontSize: `${titleFont.size * scale.title}px`,
                fontWeight: titleFont.weight,
                color: template.roleColors?.title || textColor,
                lineHeight: titleFont.lineHeight / titleFont.size,
                letterSpacing: `${(template.styles?.letterSpacing?.title ?? 0) * scale.title}px`,
                marginBottom: slide.content ? '20px' : '0',
                textShadow: textColor === '#FFFFFF' ? '2px 2px 4px rgba(0,0,0,0.55)' : 'none'
              }}>
                {slide.title}
              </div>
            )}
            {slide.content && (
              <div style={{
                fontFamily: contentFont.family,
                fontSize: `${contentFont.size * scale.content}px`,
                fontWeight: contentFont.weight,
                color: template.roleColors?.content || textColor,
                lineHeight: contentFont.lineHeight / contentFont.size,
                letterSpacing: `${(template.styles?.letterSpacing?.content ?? 0) * scale.content}px`,
                textShadow: textColor === '#FFFFFF' ? '2px 2px 4px rgba(0,0,0,0.55)' : 'none'
              }}>
                {slide.content}
              </div>
            )}
          </div>
        )}

        <div style={{
          position: 'absolute',
          top: '18px',
          left: '18px',
          padding: '6px 12px',
          borderRadius: '999px',
          background: 'rgba(0,0,0,0.65)',
          color: '#ffffff',
          fontSize: '11px',
          fontWeight: 600
        }}>
          {slide.kind}
        </div>
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          padding: '8px 16px',
          borderRadius: '999px',
          background: 'rgba(255,255,255,0.9)',
          fontSize: '12px',
          fontWeight: 600
        }}>
          {currentIndex + 1} / {slides.length}
        </div>
      </div>

      <div style={{ fontSize: '14px', color: '#444444' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Template Snapshot</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '12px' }}>
          <li>
            <strong>Fonts:</strong> Hook {template.fonts?.hook?.family ?? '—'}, Title {template.fonts?.title?.family ?? '—'}, Content {template.fonts?.content?.family ?? '—'}
          </li>
          <li>
            <strong>Safe Area:</strong> {template.safeArea?.enabled ? `${template.safeArea.top}px top / ${template.safeArea.bottom}px bottom` : 'disabled'}
          </li>
          <li>
            <strong>Hook layout:</strong> Topic {template.hookLayout?.showTopic ? 'on' : 'off'}, Subtitle {template.hookLayout?.showSubtitle ? 'on' : 'off'}, CTA {template.hookLayout?.showCTA ? 'on' : 'off'}
          </li>
        </ul>
      </div>
    </div>
  )
}

