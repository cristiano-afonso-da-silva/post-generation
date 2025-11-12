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
        src: string
      }
    | {
        type: 'color'
        value: string
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
  }
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
    }
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
      },
      arrow: {
        type: 'right',
        color: '#1C1C1C',
        width: 100,
        height: 36,
        lineWidth: 8,
        offsetRight: 24,
        offsetBottom: 24
      }
    }
  },
  {
    id: 'template3',
    name: 'Template 3 (Modern)',
    fonts: {
      hookTopic: {
        family: 'Poppins',
        file: '/templates/template3/fonts/Poppins-SemiBold.ttf',
        weight: '600',
        style: 'normal',
        cssFont: '600 28px Poppins, sans-serif',
        lineHeight: 36,
        size: 28
      },
      hook: {
        family: 'Poppins',
        file: '/templates/template3/fonts/Poppins-Bold.ttf',
        weight: 'bold',
        style: 'normal',
        cssFont: 'bold 72px Poppins, sans-serif',
        lineHeight: 88,
        size: 72
      },
      hookSubtitle: {
        family: 'Poppins',
        file: '/templates/template3/fonts/Poppins-Regular.ttf',
        weight: 'normal',
        style: 'normal',
        cssFont: '42px Poppins, sans-serif',
        lineHeight: 54,
        size: 42
      },
      hookCTA: {
        family: 'Poppins',
        file: '/templates/template3/fonts/Poppins-SemiBold.ttf',
        weight: '600',
        style: 'normal',
        cssFont: '600 32px Poppins, sans-serif',
        lineHeight: 40,
        size: 32
      },
      title: {
        family: 'Poppins',
        file: '/templates/template3/fonts/Poppins-Bold.ttf',
        weight: 'bold',
        style: 'normal',
        cssFont: 'bold 75px Poppins, sans-serif',
        lineHeight: 90,
        size: 75
      },
      content: {
        family: 'Poppins',
        file: '/templates/template3/fonts/Poppins-Regular.ttf',
        weight: 'normal',
        style: 'normal',
        cssFont: '52px Poppins, sans-serif',
        lineHeight: 68,
        size: 52
      }
    },
    background: {
      type: 'color',
      value: '#FFFFFF'
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
        title: 'left',
        content: 'left',
        cta: 'left'
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
      showSubtitle: true,
      showCTA: true
    }
  }
  // Add more templates here in the future
]

// Helper function to get template by ID
export function getCarouselTemplate(id: string): CarouselTemplate {
  return CAROUSEL_TEMPLATES.find(t => t.id === id) || CAROUSEL_TEMPLATES[0]
}

// Helper function to get all template IDs and names for dropdown
export function getTemplateOptions(): { id: string; name: string }[] {
  return CAROUSEL_TEMPLATES.map(t => ({ id: t.id, name: t.name }))
}

