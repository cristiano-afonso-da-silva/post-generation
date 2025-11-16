// ═══════════════════════════════════════════════════════════════════════════
// CAROUSEL TEMPLATE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// Each template defines the complete styling for carousel rendering

export interface CarouselTemplate {
  id: string
  name: string
  fonts: {
    hook: {
      family: string
      file: string
      weight: string
      style: string
      cssFont: string
      lineHeight: number
      size: number
    }
    hookTopic?: {
      family: string
      file: string
      weight: string
      style: string
      cssFont: string
      lineHeight: number
      size: number
    }
    hookSubtitle?: {
      family: string
      file: string
      weight: string
      style: string
      cssFont: string
      lineHeight: number
      size: number
    }
    hookCTA?: {
      family: string
      file: string
      weight: string
      style: string
      cssFont: string
      lineHeight: number
      size: number
    }
    title: {
      family: string
      file: string
      weight: string
      style: string
      cssFont: string
      lineHeight: number
      size: number
    }
    content: {
      family: string
      file: string
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
  
  // Footer configuration
  footer?: {
    enabled: boolean
    height?: number              // e.g. 80 (required if enabled is true)
    lineColor?: string           // separator line color
    lineThickness?: number       // e.g. 2
    paddingX?: number            // left/right padding inside footer
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
        file: '/templates/template1/fonts/Poppins-Bold.ttf',
        weight: 'bold',
        style: 'normal',
        cssFont: 'bold 130px Poppins, sans-serif',
        lineHeight: 155,
        size: 130
      },
      title: {
        family: 'Poppins',
        file: '/templates/template1/fonts/Poppins-Bold.ttf',
        weight: 'bold',
        style: 'normal',
        cssFont: 'bold 75px Poppins, sans-serif',
        lineHeight: 90,
        size: 75
      },
      content: {
        family: 'DreamingOutloudSans',
        file: '/templates/template1/fonts/DreamingOutloudSans-Regular.otf',
        weight: 'normal',
        style: 'normal',
        cssFont: '55px DreamingOutloudSans, sans-serif',
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
      enabled: false
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
    defaultColorThemeId: 'gold-green'
  },
  {
    id: 'template2',
    name: 'Template 2 (Elegant)',
    fonts: {
      hook: {
        family: 'Playfair Display',
        file: '/templates/template2/fonts/PlayfairDisplay-BoldItalic.ttf',
        weight: 'bold',
        style: 'italic',
        cssFont: 'bold italic 130px "Playfair Display", serif',
        lineHeight: 150,
        size: 130
      },
      title: {
        family: 'Playfair Display',
        file: '/templates/template2/fonts/PlayfairDisplay-BoldItalic.ttf',
        weight: 'bold',
        style: 'italic',
        cssFont: 'bold italic 90px "Playfair Display", serif',
        lineHeight: 110,
        size: 90
      },
      content: {
        family: 'Playfair Display',
        file: '/templates/template2/fonts/PlayfairDisplay-Regular.ttf',
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
      enabled: false
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
    defaultColorThemeId: 'gold-green'
  },
  {
    id: 'template3',
    name: 'Template 3 (Modern)',
    fonts: {
      hookTopic: {
        family: 'OpenSauce',
        file: '/templates/template3/fonts/open-sauce.one-medium.ttf',
        weight: '500',
        style: 'normal',
        cssFont: '500 28px OpenSauce, sans-serif',
        lineHeight: 36,
        size: 28
      },
      hook: {
        family: 'OpenSauce',
        file: '/templates/template3/fonts/open-sauce.one-medium.ttf',
        weight: '500',
        style: 'normal',
        cssFont: '500 120px OpenSauce, sans-serif',
        lineHeight: 140,
        size: 120
      },
      hookSubtitle: {
        family: 'OpenSauce',
        file: '/templates/template3/fonts/open-sauce.one-medium.ttf',
        weight: '500',
        style: 'normal',
        cssFont: '500 42px OpenSauce, sans-serif',
        lineHeight: 54,
        size: 42
      },
      hookCTA: {
        family: 'Mansalva',
        file: '/templates/template3/fonts/Mansalva-Regular.ttf',
        weight: 'normal',
        style: 'normal',
        cssFont: '48px Mansalva, cursive',
        lineHeight: 60,
        size: 48
      },
      title: {
        family: 'OpenSauce',
        file: '/templates/template3/fonts/open-sauce.one-medium.ttf',
        weight: '500',
        style: 'normal',
        cssFont: '500 75px OpenSauce, sans-serif',
        lineHeight: 90,
        size: 75
      },
      content: {
        family: 'OpenSauce',
        file: '/templates/template3/fonts/open-sauce.one-medium.ttf',
        weight: '500',
        style: 'normal',
        cssFont: '500 52px OpenSauce, sans-serif',
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
      enabled: false
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
    defaultColorThemeId: 'gold-green'
  },
  // NEW: Template 4 – Dark Retention-style
  {
    id: 'template4',
    name: 'Template 4 (Dark Story)',
    fonts: {
      // Smaller hook title for Template 4
      hook: {
        family: 'OpenSauce',
        file: '/templates/template3/fonts/open-sauce.one-medium.ttf',
        weight: '500',
        style: 'normal',
        cssFont: '500 70px OpenSauce, sans-serif',
        lineHeight: 84,
        size: 70
      },
      // Used for slide titles (e.g. "You're Speaking In Jargon.")
      title: {
        family: 'OpenSauce',
        file: '/templates/template3/fonts/open-sauce.one-medium.ttf',
        weight: '500',
        style: 'normal',
        cssFont: '500 88px OpenSauce, sans-serif',
        lineHeight: 104,
        size: 88
      },
      // Used for the explanation paragraph under the title
      content: {
        family: 'OpenSauce',
        file: '/templates/template3/fonts/open-sauce.one-medium.ttf',
        weight: '500',
        style: 'normal',
        cssFont: '500 50px OpenSauce, sans-serif',
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
    imagePrompt: 'a white line drawing {input}, with #000000 black background',  // Template-specific image style for middle slides
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
      height: 80,
      lineColor: '#FFFFFF',
      lineThickness: 2,
      paddingX: 48,
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
    defaultColorThemeId: 'transparent'
  },
  {
    id: 'template5',
    name: 'Template 5 (Serif Minimal)',
    fonts: {
      hook: {
        family: 'DreamingOutloudSans',
        file: '/templates/template5/fonts/DreamingOutloudSans-Regular.otf',
        weight: 'normal',
        style: 'normal',
        cssFont: '100px DreamingOutloudSans, sans-serif',
        lineHeight: 120,
        size: 100
      },
      title: {
        family: 'Playfair Display',
        file: '/templates/template5/fonts/PlayfairDisplay-Bold.ttf',
        weight: 'bold',
        style: 'normal',
        cssFont: 'bold 64px "Playfair Display", serif',
        lineHeight: 80,
        size: 64
      },
      content: {
        family: 'Playfair Display',
        file: '/templates/template5/fonts/PlayfairDisplay-Regular.ttf',
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
    roleColors: {
      hook: '#C53030',
      title: '#C53030',
      content: '#000000',
      cta: '#000000'
    },
    layout: {
      contentMaxWidth: 820,
      verticalAlign: 'top',
      hookPadding: { top: 260, right: 140, bottom: 0, left: 140 },
      titlePadding: { top: 220, right: 140, bottom: 0, left: 140 },
      contentPadding: { top: 320, right: 140, bottom: 0, left: 140 },
      gapTitleToContent: 40
    },
    imageLayout: {
      position: 'top',
      maxHeightRatio: 0,
      marginBottom: 0
    },
    footer: {
      enabled: true,
      height: 80,
      lineColor: '#000000',
      lineThickness: 0,
      paddingX: 80,
      leftText: '',
      rightText: '@your_handle',
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
    defaultColorThemeId: 'transparent'
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

