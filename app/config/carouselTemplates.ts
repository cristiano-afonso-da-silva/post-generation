// ═══════════════════════════════════════════════════════════════════════════
// CAROUSEL TEMPLATE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// Each template defines the complete styling for carousel rendering

import type { TemplateLayout } from './prompts'

export interface CarouselTemplate {
  id: string
  name: string
  fonts: {
    hook: {
      family: string  // Google Font family name (e.g., "Poppins", "Roboto", "Montserrat")
      weight: string
      style: string
      cssFont: string
      lineHeight: number
      size: number
    }
    hookTopic?: {
      family: string  // Google Font family name
      weight: string
      style: string
      cssFont: string
      lineHeight: number
      size: number
    }
    hookSubtitle?: {
      family: string  // Google Font family name
      weight: string
      style: string
      cssFont: string
      lineHeight: number
      size: number
    }
    hookCTA?: {
      family: string  // Google Font family name
      weight: string
      style: string
      cssFont: string
      lineHeight: number
      size: number
    }
    title: {
      family: string  // Google Font family name
      weight: string
      style: string
      cssFont: string
      lineHeight: number
      size: number
    }
    content: {
      family: string  // Google Font family name
      weight: string
      style: string
      cssFont: string
      lineHeight: number
      size: number
    }
  }
  background?:
    | {
        type: 'image'
        src?: string
        prompt?: string  // DALL-E prompt for generating background image
      }
    | {
        type: 'color'
        value: string
      }
  hookBackground?: {
    type: 'image'
    src: string
    opacity: number
  }
  styles?: {
    letterSpacing?: {
      hook?: number
      hookTopic?: number
      hookSubtitle?: number
      hookCTA?: number
      title?: number
      content?: number
      cta?: number
    }
    textAlign?: {
      hook?: CanvasTextAlign
      hookTopic?: CanvasTextAlign
      hookSubtitle?: CanvasTextAlign
      hookCTA?: CanvasTextAlign
      title?: CanvasTextAlign
      content?: CanvasTextAlign
      cta?: CanvasTextAlign
    }
    arrow?: {
      type: 'right'
      color: string | 'theme'  // 'theme' means use color theme's primary color
      width: number
      height: number
      lineWidth: number
      offsetRight: number
      offsetBottom: number
    }
    ctaBox?: {
      useThemeColor: boolean  // If true, use color theme's primary color
      paddingX: number
      paddingY: number
      borderRadius: number
      offsetX?: number
      offsetY?: number
    }
  }
  hookLayout?: {
    showTopic: boolean
    showSubtitle: boolean
    showCTA: boolean
    useImage?: boolean  // Whether hook slide should display an image (above title/content)
  }
  textColor?: string  // Template-specific text color (overrides color theme text color)
  imagePrompt?: string  // Template-specific image generation prompt (use {input} as placeholder for content)
  hookImagePrompt?: string  // Template-specific image prompt for hook slide (use {input} as placeholder for hook content)
  
  // Layout & spacing controls
  layout?: {
    canvasWidth?: number      // default 1080
    canvasHeight?: number     // default 1350
    contentMaxWidth?: number  // e.g. 820 – max text column width
    verticalAlign?: 'top' | 'center' | 'bottom'
    hookPadding?: { top: number; right: number; bottom: number; left: number }
    titlePadding?: { top: number; right: number; bottom: number; left: number }
    contentPadding?: { top: number; right: number; bottom: number; left: number }
    gapTitleToContent?: number // vertical space between title + paragraph
  }
  
  // Image placement controls
  imageLayout?: {
    position?: 'top' | 'bottom' | 'center'      // relative to text block
    maxHeightRatio?: number                     // e.g. 0.35 of canvas height
    marginBottom?: number                    // space between image and text
    marginTop?: number                         // for bottom images
  }
  
  // Image placement configuration (which slide types should show images)
  imagePlacement?: {
    hook: boolean      // Show images in hook slides
    content: boolean   // Show images in content/middle slides  
    cta: boolean      // Show images in CTA slides (should always be false)
  }
  
  // Footer configuration
  footer?: {
    enabled: boolean
    height?: number              // e.g. 40 (required if enabled is true)
    paddingX?: number            // horizontal padding (left/right) inside footer
    paddingY?: number            // vertical padding (top/bottom) inside footer - should equal paddingX
    leftText?: string            // e.g. '@postmynote' (can be overridden by user input)
    rightText?: string           // e.g. 'postmynote.app' (can be overridden by user input)
    fontRole?: 'content' | 'title' | 'hook' // reuse an existing font role
    fontSize?: number            // Optional: override font size for footer text (smaller than fontRole default)
  }
  
  // Per-role colors (optional)
  roleColors?: {
    hook?: string
    title?: string
    content?: string
    cta?: string
  }
  
  // Per-slide-type overrides (optional)
  perSlideType?: {
    hook?: { contentMaxWidth?: number; gapTitleToContent?: number }
    body?: { contentMaxWidth?: number }
    outro?: { contentMaxWidth?: number }
  }
  
  // Safe area configuration (fixed margins to prevent content cutoff)
  safeArea?: {
    enabled: boolean
    top: number
    bottom: number
    left: number
    right: number
  }
  
  // Writing style configuration (tone, length constraints, structure)
  writingStyle?: {
    tone: string
    lengthConstraints: {
      hookTitle: { min: number; max: number }
      middleTitle: { min: number; max: number }
      middleContent: { min: number; max: number }
      caption: { min: number; max: number }
    }
    structure: {
      sentenceStyle: 'short' | 'medium' | 'long' | 'mixed'
      paragraphStyle: 'single' | 'multi' | 'mixed'
      hookStyle: 'question' | 'statement' | 'imperative' | 'mixed'
      contentFlow: string
      includeMiddleTitles?: boolean  // Whether middle slides should have titles (default: true)
    }
  }
  defaultColorThemeId?: string  // Default color theme for this template
}

// ═══════════════════════════════════════════════════════════════════════════
// AVAILABLE TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export const CAROUSEL_TEMPLATES: CarouselTemplate[] = [
  {
    id: 'template1',
    name: 'Template 1 (Classic)',
    fonts: {
      hook: {
        family: 'Poppins',
        weight: 'bold',
        style: 'normal',
        cssFont: 'bold 130px Poppins, sans-serif',
        lineHeight: 155,
        size: 130
      },
      title: {
        family: 'Poppins',
        weight: 'bold',
        style: 'normal',
        cssFont: 'bold 75px Poppins, sans-serif',
        lineHeight: 90,
        size: 75
      },
      content: {
        family: 'Kalam',
        weight: 'normal',
        style: 'normal',
        cssFont: '55px Kalam, sans-serif',
        lineHeight: 70,
        size: 55
      }
    },
    background: {
      type: 'image',
      src: '/backgrounds/bg1.jpg'
    },
    styles: {
      letterSpacing: {
        hook: 0,
        title: 0,
        content: 0,
        cta: 0
      },
      textAlign: {
        hook: 'left',
        title: 'left',
        content: 'left',
        cta: 'left'
      }
    },
    textColor: '#000000',  // Black text for light background
    imagePrompt: 'modern clean photography of {input}, professional lighting, vibrant colors, high quality, 16:9 aspect ratio',  // Classic photo style
    layout: {
      contentMaxWidth: 900,
      verticalAlign: 'center',
      gapTitleToContent: 40
    },
    imageLayout: {
      position: 'top',
      maxHeightRatio: 0.4,
      marginBottom: 40
    },
    footer: {
      enabled: true,
      height: 40,
      paddingX: 48,
      paddingY: 48,
      leftText: '@postmynote',  // Default, can be overridden by user input
      rightText: 'postmynote.app',  // Default, can be overridden by user input
      fontRole: 'content',
      fontSize: 28  // Smaller footer text (content font is 55px, footer will be 28px)
    },
    writingStyle: {
      tone: 'friendly and conversational, like talking to a friend, warm and approachable',
      lengthConstraints: {
        hookTitle: { min: 6, max: 12 },
        middleTitle: { min: 2, max: 5 },
        middleContent: { min: 18, max: 32 },
        caption: { min: 80, max: 120 }
      },
      structure: {
        sentenceStyle: 'medium',
        paragraphStyle: 'multi',
        hookStyle: 'mixed',
        contentFlow: 'Tell a story with clear progression. Use relatable examples and practical insights. Build connection through shared experiences.',
        includeMiddleTitles: true
      }
    },
    imagePlacement: {
      hook: false,
      content: true,
      cta: false
    },
    defaultColorThemeId: 'gold-green'
  },
  {
    id: 'template2',
    name: 'Template 2 (Elegant)',
    fonts: {
      hook: {
        family: 'Playfair Display',
        weight: 'bold',
        style: 'italic',
        cssFont: 'bold italic 130px "Playfair Display", serif',
        lineHeight: 150,
        size: 130
      },
      title: {
        family: 'Playfair Display',
        weight: 'bold',
        style: 'italic',
        cssFont: 'bold italic 90px "Playfair Display", serif',
        lineHeight: 110,
        size: 90
      },
      content: {
        family: 'Playfair Display',
        weight: 'normal',
        style: 'normal',
        cssFont: '56px "Playfair Display", serif',
        lineHeight: 78,
        size: 56
      }
    },
    background: {
      type: 'color',
      value: '#F8F4EF'
    },
    styles: {
      letterSpacing: {
        hook: -1,
        title: -1,
        content: -0.8,
        cta: -0.8
      },
      textAlign: {
        hook: 'center',
        title: 'center',
        content: 'center',
        cta: 'center'
      }
    },
    textColor: '#000000',  // Black text for light background
    imagePrompt: 'elegant artistic photography of {input}, soft natural lighting, warm tones, sophisticated composition, fine art style, 16:9 aspect ratio',  // Elegant artistic style
    layout: {
      contentMaxWidth: 850,
      verticalAlign: 'center',
      gapTitleToContent: 50
    },
    imageLayout: {
      position: 'top',
      maxHeightRatio: 0.35,
      marginBottom: 50
    },
    footer: {
      enabled: true,
      height: 40,
      paddingX: 48,
      paddingY: 48,
      leftText: '@postmynote',  // Default, can be overridden by user input
      rightText: 'postmynote.app',  // Default, can be overridden by user input
      fontRole: 'content',
      fontSize: 28  // Smaller footer text (content font is 56px, footer will be 28px)
    },
    writingStyle: {
      tone: 'sophisticated and refined, elegant and thoughtful, with a touch of poetic grace',
      lengthConstraints: {
        hookTitle: { min: 8, max: 14 },
        middleTitle: { min: 3, max: 6 },
        middleContent: { min: 25, max: 40 },
        caption: { min: 100, max: 150 }
      },
      structure: {
        sentenceStyle: 'long',
        paragraphStyle: 'multi',
        hookStyle: 'statement',
        contentFlow: 'Use flowing, elegant language with sophisticated vocabulary. Create depth through nuanced explanations. Build atmosphere and meaning.',
        includeMiddleTitles: true
      }
    },
    imagePlacement: {
      hook: false,
      content: true,
      cta: false
    },
    defaultColorThemeId: 'gold-green'
  },
  {
    id: 'template3',
    name: 'Template 3 (Modern)',
    fonts: {
      hookTopic: {
        family: 'Inter',
        weight: '500',
        style: 'normal',
        cssFont: '500 28px Inter, sans-serif',
        lineHeight: 36,
        size: 28
      },
      hook: {
        family: 'Inter',
        weight: '500',
        style: 'normal',
        cssFont: '500 120px Inter, sans-serif',
        lineHeight: 140,
        size: 120
      },
      hookSubtitle: {
        family: 'Inter',
        weight: '500',
        style: 'normal',
        cssFont: '500 42px Inter, sans-serif',
        lineHeight: 54,
        size: 42
      },
      hookCTA: {
        family: 'Mansalva',
        weight: 'normal',
        style: 'normal',
        cssFont: '48px Mansalva, cursive',
        lineHeight: 60,
        size: 48
      },
      title: {
        family: 'Inter',
        weight: '500',
        style: 'normal',
        cssFont: '500 75px Inter, sans-serif',
        lineHeight: 90,
        size: 75
      },
      content: {
        family: 'Inter',
        weight: '500',
        style: 'normal',
        cssFont: '500 52px Inter, sans-serif',
        lineHeight: 68,
        size: 52
      }
    },
    background: {
      type: 'color',
      value: '#fefbf8'
    },
    hookBackground: {
      type: 'image',
      src: '/templates/template3/bg.jpg',
      opacity: 0.3
    },
    styles: {
      letterSpacing: {
        hookTopic: 2,
        hook: -1,
        hookSubtitle: 0,
        hookCTA: 0,
        title: -1,
        content: 0,
        cta: 0
      },
      textAlign: {
        hookTopic: 'center',
        hook: 'center',
        hookSubtitle: 'center',
        hookCTA: 'center',
        title: 'center',
        content: 'center',
        cta: 'center'
      },
      ctaBox: {
        useThemeColor: true,
        paddingX: 32,
        paddingY: 20,
        borderRadius: 12
      },
      arrow: {
        type: 'right',
        color: 'theme',
        width: 80,
        height: 28,
        lineWidth: 6,
        offsetRight: 32,
        offsetBottom: 0
      }
    },
    hookLayout: {
      showTopic: true,
      showSubtitle: false,
      showCTA: true
    },
    textColor: '#000000',  // Black text for light background
    imagePrompt: 'contemporary minimalist photography of {input}, clean lines, bright natural lighting, modern aesthetic, geometric composition, 16:9 aspect ratio',  // Modern minimalist style
    layout: {
      contentMaxWidth: 820,
      verticalAlign: 'center',
      gapTitleToContent: 30
    },
    imageLayout: {
      position: 'top',
      maxHeightRatio: 0.3,
      marginBottom: 30
    },
    footer: {
      enabled: true,
      height: 40,
      paddingX: 48,
      paddingY: 48,
      leftText: '@postmynote',  // Default, can be overridden by user input
      rightText: 'postmynote.app',  // Default, can be overridden by user input
      fontRole: 'content',
      fontSize: 28  // Smaller footer text (content font is 52px, footer will be 28px)
    },
    writingStyle: {
      tone: 'casual and direct, modern and straightforward, no-nonsense approach',
      lengthConstraints: {
        hookTitle: { min: 6, max: 10 },
        middleTitle: { min: 2, max: 4 },
        middleContent: { min: 15, max: 28 },
        caption: { min: 70, max: 110 }
      },
      structure: {
        sentenceStyle: 'short',
        paragraphStyle: 'single',
        hookStyle: 'statement',
        contentFlow: 'Get straight to the point. Use short, punchy sentences. Be direct and actionable. Cut the fluff.',
        includeMiddleTitles: true
      }
    },
    imagePlacement: {
      hook: false,
      content: true,
      cta: false
    },
    defaultColorThemeId: 'gold-green'
  },
  // NEW: Template 4 – Dark Retention-style
  {
    id: 'template4',
    name: 'Template 4 (Dark Story)',
    fonts: {
      // Smaller hook title for Template 4
      hook: {
        family: 'Inter',
        weight: '500',
        style: 'normal',
        cssFont: '500 70px Inter, sans-serif',
        lineHeight: 84,
        size: 70
      },
      // Used for slide titles (e.g. "You're Speaking In Jargon.")
      title: {
        family: 'Inter',
        weight: '500',
        style: 'normal',
        cssFont: '500 88px Inter, sans-serif',
        lineHeight: 104,
        size: 88
      },
      // Used for the explanation paragraph under the title
      content: {
        family: 'Inter',
        weight: '500',
        style: 'normal',
        cssFont: '500 50px Inter, sans-serif',
        lineHeight: 70,
        size: 50
      }
    },
    background: {
      type: 'color',
      value: '#000000' // pure black background
    },
    styles: {
      letterSpacing: {
        hook: -1,
        title: -0.5,
        content: 0,
        cta: 0
      },
      textAlign: {
        hook: 'center',
        title: 'center',
        content: 'center',
        cta: 'center'
      }
    },
    hookLayout: {
      showTopic: false,
      showSubtitle: false,
      showCTA: false,
      useImage: true  // Hook slide should display an image above title/content
    },
    textColor: '#FFFFFF',  // White text for black background
    imagePrompt: 'a white line drawing {input}, with #000000 black background, high contrast, detailed',  // Template-specific image style for middle slides
    hookImagePrompt: 'a white line drawing illustration of {input}, vintage woodcut style, black background #000000, high contrast, detailed',  // Template-specific image style for hook slide
    layout: {
      contentMaxWidth: 820,  // Narrow centered column like Retentioned
      verticalAlign: 'top',  // Start from top, not center
      gapTitleToContent: 30,  // Space between title and content
      contentPadding: { top: 0, right: 48, bottom: 0, left: 48 },
      hookPadding: { top: 60, right: 48, bottom: 0, left: 48 },  // Top padding for hook slide
      titlePadding: { top: 0, right: 48, bottom: 0, left: 48 }
    },
    imageLayout: {
      position: 'top',  // Image above title/content
      maxHeightRatio: 0.42,  // 42% of canvas height for larger images
      marginBottom: 60  // Space between image and title
    },
    footer: {
      enabled: true,
      height: 40,
      paddingX: 48,
      paddingY: 48,
      leftText: '@postmynote',  // Default, can be overridden by user input
      rightText: 'postmynote.app',  // Default, can be overridden by user input
      fontRole: 'content',
      fontSize: 28  // Smaller footer text (content font is 50px, footer will be 28px)
    },
    writingStyle: {
      tone: 'bold and dramatic, impactful and provocative, with a sense of urgency and intensity',
      lengthConstraints: {
        hookTitle: { min: 4, max: 8 },
        middleTitle: { min: 2, max: 4 },
        middleContent: { min: 12, max: 25 },
        caption: { min: 60, max: 100 }
      },
      structure: {
        sentenceStyle: 'short',
        paragraphStyle: 'single',
        hookStyle: 'statement',
        contentFlow: 'Make bold, provocative statements. Use short, impactful sentences. Create tension and urgency. Every word must count.',
        includeMiddleTitles: false  // Template 4 doesn't need titles on middle slides
      }
    },
    imagePlacement: {
      hook: true,
      content: true,
      cta: false
    },
    defaultColorThemeId: 'transparent'
  },
  {
    id: 'template5',
    name: 'Template 5 (Serif Minimal)',
    fonts: {
      hook: {
        family: 'Permanent Marker',
        weight: 'normal',
        style: 'normal',
        cssFont: '100px "Permanent Marker", cursive',
        lineHeight: 120,
        size: 100
      },
      title: {
        family: 'Playfair Display',
        weight: 'bold',
        style: 'normal',
        cssFont: 'bold 64px "Playfair Display", serif',
        lineHeight: 80,
        size: 64
      },
      content: {
        family: 'Playfair Display',
        weight: 'normal',
        style: 'normal',
        cssFont: '44px "Playfair Display", serif',
        lineHeight: 64,
        size: 44
      }
    },
    background: {
      type: 'image',
      src: '/templates/template5/bg-paper.jpg'
    },
    styles: {
      letterSpacing: {
        hook: 0,
        title: 0,
        content: 0,
        cta: 0
      },
      textAlign: {
        hook: 'center',
        title: 'left',
        content: 'left',
        cta: 'left'
      }
    },
    hookLayout: {
      showTopic: false,
      showSubtitle: false,
      showCTA: false,
      useImage: false
    },
    textColor: '#000000',
    imagePrompt: 'a #C53030 line drawing {input}, with transparent background, high contrast, detailed',  // Template-specific image style for middle slides
    roleColors: {
      hook: '#C53030',
      title: '#C53030',
      content: '#000000',
      cta: '#000000'
    },
    layout: {
      contentMaxWidth: 820,
      verticalAlign: 'bottom',  // Changed to 'center' like Template 1 for image positioning
      hookPadding: { top: 260, right: 140, bottom: 0, left: 140 },
      titlePadding: { top: 220, right: 140, bottom: 0, left: 140 },
      contentPadding: { top: 320, right: 140, bottom: 0, left: 140 },
      gapTitleToContent: 40
    },
    imageLayout: {
      position: 'top',
      maxHeightRatio: 0.3,  // Enabled images: 40% of canvas height (same as Template 1)
      marginBottom: 80  // 40px gap below image (same as Template 1)
    },
    footer: {
      enabled: true,
      height: 40,
      paddingX: 48,
      paddingY: 48,
      leftText: '@postmynote',  // Default, can be overridden by user input
      rightText: 'postmynote.app',  // Default, can be overridden by user input
      fontRole: 'content',
      fontSize: 26
    },
    perSlideType: {
      hook: {
        contentMaxWidth: 760,
        gapTitleToContent: 0
      },
      body: {
        contentMaxWidth: 820
      },
      outro: {
        contentMaxWidth: 820
      }
    },
    safeArea: {
      enabled: true,
      top: 80,
      bottom: 140,
      left: 80,
      right: 80
    },
    writingStyle: {
      tone: 'gentle, sincere, reflective and calm',
      lengthConstraints: {
        hookTitle: { min: 8, max: 16 },
        middleTitle: { min: 1, max: 4 },
        middleContent: { min: 30, max: 80 },
        caption: { min: 90, max: 180 }
      },
      structure: {
        sentenceStyle: 'long',
        paragraphStyle: 'multi',
        hookStyle: 'imperative',
        contentFlow: 'Intro hook slide followed by several numbered title-and-paragraph slides, with an optional closing slide that is paragraph-only.',
        includeMiddleTitles: true
      }
    },
    imagePlacement: {
      hook: false,
      content: true,
      cta: false
    },
    defaultColorThemeId: 'transparent'
  },
  {
    id: 'template6',
    name: 'Template 6 (Premium Grid)',
    fonts: {
      hook: {
        family: 'Inter',
        weight: '600',
        style: 'normal',
        cssFont: '600 88px Inter, sans-serif',
        lineHeight: 104,
        size: 88
      },
      title: {
        family: 'Inter',
        weight: '600',
        style: 'normal',
        cssFont: '600 54px Inter, sans-serif',
        lineHeight: 66,
        size: 54
      },
      content: {
        family: 'Inter',
        weight: '400',
        style: 'normal',
        cssFont: '400 48px Inter, sans-serif',
        lineHeight: 66,
        size: 48
      }
    },
    background: {
      type: 'image',
      src: '/templates/template6/bg1.jpg'
    },
    hookBackground: {
      type: 'image',
      src: '/templates/template6/bg1.jpg',
      opacity: 1
    },
    styles: {
      letterSpacing: {
        hook: 0.2,
        title: 0.2,
        content: 0
      },
      textAlign: {
        hook: 'center',
        title: 'left',
        content: 'left'
      }
    },
    hookLayout: {
      showTopic: false,
      showSubtitle: false,
      showCTA: false,
      useImage: false
    },
    textColor: '#085C36',
    imagePrompt: 'premium professional photography of {input}, high quality, vibrant colors, clean composition, 16:9 aspect ratio',
    layout: {
      canvasWidth: 1080,
      canvasHeight: 1350,
      contentMaxWidth: 820,
      verticalAlign: 'center',
      hookPadding: { top: 540, right: 160, bottom: 0, left: 160 },
      titlePadding: { top: 320, right: 160, bottom: 0, left: 160 },
      contentPadding: { top: 420, right: 160, bottom: 0, left: 160 },
      gapTitleToContent: 40
    },
    imageLayout: {
      position: 'top',
      maxHeightRatio: 0.35,
      marginBottom: 40
    },
    footer: {
      enabled: true,
      height: 40,
      paddingX: 48,
      paddingY: 48,
      leftText: '@postmynote',  // Default, can be overridden by user input
      rightText: 'postmynote.app',  // Default, can be overridden by user input
      fontRole: 'content',
      fontSize: 26  // Smaller footer text (content font is 48px, footer will be 26px)
    },
    roleColors: {
      hook: '#085C36',
      title: '#085C36',
      content: '#085C36'
    },
    perSlideType: {
      hook: { contentMaxWidth: 720, gapTitleToContent: 20 },
      body: { contentMaxWidth: 820 },
      outro: { contentMaxWidth: 820 }
    },
    safeArea: {
      enabled: true,
      top: 140,
      bottom: 140,
      left: 120,
      right: 120
    },
    writingStyle: {
      tone: 'confident, calm and conversational, polished but friendly',
      lengthConstraints: {
        hookTitle: { min: 3, max: 6 },
        middleTitle: { min: 1, max: 4 },
        middleContent: { min: 24, max: 50 },
        caption: { min: 80, max: 140 }
      },
      structure: {
        sentenceStyle: 'mixed',
        paragraphStyle: 'multi',
        hookStyle: 'statement',
        contentFlow:
          'Intro hook slide with a short central phrase, followed by numbered slides each with a heading and one paragraph of explanation, then a final slide with a concise wrap-up line placed towards the bottom-left.',
        includeMiddleTitles: true
      }
    },
    imagePlacement: {
      hook: false,
      content: true,
      cta: false
    },
    defaultColorThemeId: 'transparent'
  },
  {
    id: 'template7',
    name: 'Template 7 (Glow Center)',
    fonts: {
      // Used for the main hook text on the first slide
      hook: {
        family: 'Inter',
        weight: '700',
        style: 'normal',
        cssFont: '700 120px Inter, sans-serif',
        lineHeight: 140,
        size: 120
      },
      // Optional subtitle under the hook title (script-like serif)
      hookSubtitle: {
        family: 'Playfair Display',
        weight: 'normal',
        style: 'italic',
        cssFont: 'italic 52px "Playfair Display", serif',
        lineHeight: 70,
        size: 52
      },
      title: {
        // Used for middle slide titles (same serif italic look)
        family: 'Playfair Display',
        weight: 'normal',
        style: 'italic',
        cssFont: 'italic 52px "Playfair Display", serif',
        lineHeight: 70,
        size: 52
      },
      content: {
        // Used for short supporting line under the title
        family: 'Inter',
        weight: '500',
        style: 'normal',
        cssFont: '500 40px Inter, sans-serif',
        lineHeight: 56,
        size: 40
      }
    },
    background: {
      type: 'color',
      value: '#F6F7F3' // soft off-white paper
    },
    styles: {
      letterSpacing: {
        hook: 0,
        hookSubtitle: 0,
        title: 0,
        content: 0,
        cta: 0
      },
      textAlign: {
        hook: 'center',
        hookSubtitle: 'center',
        title: 'center',
        content: 'center',
        cta: 'center'
      }
    },
    hookLayout: {
      showTopic: false,
      showSubtitle: true,
      showCTA: false,
      useImage: true // hook slide has icon + glow as well
    },
    textColor: '#000000',
    // Icon style for middle slides – theme color will be used for the glow circle,
    // this prompt just focuses on the central illustration.
    imagePrompt:
      'simple flat vector illustration of {input}, clean lines, minimal shading, soft pastel accent color, centered on a light background, modern icon style',
    hookImagePrompt:
      'flat vector illustration of {input}, clean lines, soft pastel accent color, centered, modern icon style, works on a light background',
    layout: {
      canvasWidth: 1080,
      canvasHeight: 1350,
      contentMaxWidth: 720,
      verticalAlign: 'center',
      hookPadding: { top: 260, right: 120, bottom: 260, left: 120 },
      titlePadding: { top: 520, right: 120, bottom: 0, left: 120 },
      contentPadding: { top: 620, right: 120, bottom: 0, left: 120 },
      gapTitleToContent: 24
    },
    imageLayout: {
      // Icon sits in the middle of the glow, with text just above or below
      position: 'center',
      maxHeightRatio: 0.26,
      marginBottom: 24
    },
    footer: {
      enabled: true,
      height: 40,
      paddingX: 48,
      paddingY: 48,
      leftText: '@postmynote',  // Default, can be overridden by user input
      rightText: 'postmynote.app',  // Default, can be overridden by user input
      fontRole: 'content',
      fontSize: 24  // Smaller footer text (content font is 40px, footer will be 24px)
    },
    roleColors: {
      // Text stays dark; glow color comes from the color theme's primary color
      hook: '#000000',
      title: '#000000',
      content: '#000000',
      cta: '#000000'
    },
    perSlideType: {
      hook: {
        contentMaxWidth: 720,
        gapTitleToContent: 18
      },
      body: {
        contentMaxWidth: 720
      },
      outro: {
        contentMaxWidth: 720
      }
    },
    safeArea: {
      enabled: true,
      top: 120,
      bottom: 180,
      left: 80,
      right: 80
    },
    writingStyle: {
      tone: 'simple, positive and encouraging, clear and easy to digest',
      lengthConstraints: {
        hookTitle: { min: 2, max: 5 },        // short hook like “5 Habits”
        middleTitle: { min: 3, max: 7 },      // one short phrase
        middleContent: { min: 6, max: 20 },   // 1–2 short lines
        caption: { min: 60, max: 120 }
      },
      structure: {
        sentenceStyle: 'short',
        paragraphStyle: 'single',
        hookStyle: 'statement',
        contentFlow:
          'One central hook slide followed by several icon + title + short support-line slides. Keep wording tight, scannable and straightforward. Maximum 10 words.',
        includeMiddleTitles: true
      }
    },
    imagePlacement: {
      hook: true,
      content: true,
      cta: false
    },
    defaultColorThemeId: 'glowGreen' // theme primary color used for the radial glow circle
  }
  
  // Add more templates here in the future
]

// Helper function to get template by ID (supports custom templates)
export async function getCarouselTemplateAsync(id: string, userId?: string): Promise<CarouselTemplate> {
  // First check if it's a default template
  const defaultTemplate = CAROUSEL_TEMPLATES.find(t => t.id === id)
  if (defaultTemplate) {
    return defaultTemplate
  }

  // If not found and ID starts with 'custom_', try fetching custom templates
  if (id.startsWith('custom_') && userId) {
    const customTemplates = await fetchCustomTemplates(userId)
    const customTemplate = customTemplates.find(t => t.id === id)
    if (customTemplate) {
      return customTemplate
    }
  }

  // Fallback to first default template
  return CAROUSEL_TEMPLATES[0]
}

// Synchronous version that checks cache for custom templates
export function getCarouselTemplate(id: string): CarouselTemplate {
  // First check default templates
  const defaultTemplate = CAROUSEL_TEMPLATES.find(t => t.id === id)
  if (defaultTemplate) {
    return defaultTemplate
  }
  
  // Check cached custom templates
  const customTemplate = customTemplatesCache.find(t => t.id === id)
  if (customTemplate) {
    return customTemplate
  }
  
  // Fallback to first default template
  return CAROUSEL_TEMPLATES[0]
}

// Helper function to get all template IDs and names for dropdown
export function getTemplateOptions(): { id: string; name: string }[] {
  return CAROUSEL_TEMPLATES.map(t => ({ id: t.id, name: t.name }))
}

// Cache for custom templates
let customTemplatesCache: CarouselTemplate[] = []
let cacheInitialized = false

// Helper function to fetch custom templates for a user
export async function fetchCustomTemplates(userId: string): Promise<CarouselTemplate[]> {
  try {
    if (!userId) {
      console.error('Failed to fetch custom templates: userId is required')
      return []
    }
    
    const response = await fetch(`/api/templates/list?userId=${encodeURIComponent(userId)}`)
    if (!response.ok) {
      console.error('Failed to fetch custom templates:', response.status, response.statusText)
      return []
    }
    const data = await response.json()
    const templates = data.templates || []
    
    // Update cache
    customTemplatesCache = templates
    cacheInitialized = true
    
    return templates
  } catch (error) {
    console.error('Error fetching custom templates:', error)
    return []
  }
}

// Helper to get cached custom templates
export function getCachedCustomTemplates(): CarouselTemplate[] {
  return customTemplatesCache
}

// Helper to add a template to the cache (useful when generating new templates)
export function addTemplateToCache(template: CarouselTemplate): void {
  // Check if template already exists in cache
  const existingIndex = customTemplatesCache.findIndex(t => t.id === template.id)
  if (existingIndex >= 0) {
    // Update existing template
    customTemplatesCache[existingIndex] = template
  } else {
    // Add new template to cache
    customTemplatesCache.push(template)
  }
  cacheInitialized = true
}

// Helper to initialize cache (call this on app load)
export async function initializeTemplateCache(userId: string): Promise<void> {
  if (!cacheInitialized && userId) {
    await fetchCustomTemplates(userId)
  }
}

// Helper function to get all templates including custom ones
export async function getAllTemplates(userId: string): Promise<CarouselTemplate[]> {
  const customTemplates = await fetchCustomTemplates(userId)
  return [...CAROUSEL_TEMPLATES, ...customTemplates]
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE LAYOUT EXTRACTION (for new prompt structure)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract only layout constraints from template (removes tone/voice)
 * This separates template concerns (length/structure) from user voice
 */
export function extractTemplateLayout(template: CarouselTemplate): TemplateLayout {
  if (!template.writingStyle) {
    // Fallback to defaults if template has no writing style
    return {
      hookTitle: { min: 6, max: 12 },
      middleTitle: { min: 2, max: 5 },
      middleContent: { min: 18, max: 32 },
      caption: { min: 80, max: 120 },
      includeMiddleTitles: true
    }
  }
  
  return {
    hookTitle: template.writingStyle.lengthConstraints.hookTitle,
    middleTitle: template.writingStyle.lengthConstraints.middleTitle,
    middleContent: template.writingStyle.lengthConstraints.middleContent,
    caption: template.writingStyle.lengthConstraints.caption,
    includeMiddleTitles: template.writingStyle.structure.includeMiddleTitles !== false
  }
}

