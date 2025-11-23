import { NextRequest, NextResponse } from 'next/server'
import { CarouselTemplate } from '../../config/carouselTemplates'
import { CAROUSEL_TEMPLATES } from '../../config/carouselTemplates'

// Simple seeded random number generator
function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

// Generate random mesh gradient with seed
function generateRandomMeshGradient(
  selectedColor: string,
  seed: number,
  width: number = 1080,
  height: number = 1350
): string {
  const random = seededRandom(seed)
  
  // Colors: selected color, black, white, selected color (4 colors total)
  const colors = [
    selectedColor,
    '#000000',
    '#FFFFFF',
    selectedColor
  ]
  
  // Generate random positions for radial gradients
  const numGradients = 6 + Math.floor(random() * 4) // 6-9 gradients for variety
  
  const gradients = Array.from({ length: numGradients }, (_, i) => {
    const colorIndex = Math.floor(random() * colors.length)
    return {
      cx: `${random() * 100}%`,
      cy: `${random() * 100}%`,
      r: `${30 + random() * 50}%`, // 30-80% radius
      color: colors[colorIndex],
      opacity: 0.6 + random() * 0.4 // 0.6-1.0 opacity
    }
  })
  
  // Create SVG with random mesh gradient
  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      ${gradients.map((grad, i) => `
        <radialGradient id="mesh-${seed}-${i}" cx="${grad.cx}" cy="${grad.cy}" r="${grad.r}">
          <stop offset="0%" style="stop-color:${grad.color};stop-opacity:${grad.opacity}" />
          <stop offset="100%" style="stop-color:${grad.color};stop-opacity:0" />
        </radialGradient>
      `).join('')}
    </defs>
    <rect width="${width}" height="${height}" fill="#000000"/>
    ${gradients.map((_, i) => `
      <rect width="${width}" height="${height}" fill="url(#mesh-${seed}-${i})" style="mix-blend-mode:screen"/>
    `).join('')}
  </svg>`
  
  return svg
}

export async function POST(request: NextRequest) {
  try {
    const { selectedColor } = await request.json()
    
    if (!selectedColor || typeof selectedColor !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid selectedColor. Please select a color.' },
        { status: 400 }
      )
    }
    
    console.log(`[GENERATE-GRADIENT] Received selected color:`, selectedColor)
    
    // Normalize the selected color
    const normalizedColor = selectedColor.startsWith('#') ? selectedColor : `#${selectedColor}`
    
    // Mesh gradient colors: black, white, and selected color
    const meshColors: [string, string, string, string] = [
      normalizedColor, // Selected color
      '#000000',        // Black
      '#FFFFFF',        // White
      normalizedColor   // Selected color (repeated for 4 colors)
    ]
    
    console.log(`[GENERATE-GRADIENT] Mesh gradient colors:`, meshColors)
    
    // Generate 3 different random mesh gradient backgrounds - one for each slide type
    const generatedImages = ['Hook', 'Middle', 'CTA'].map((slideType) => {
      // Generate random seed for each gradient (0 to 1,000,000)
      const seed = Math.floor(Math.random() * 1000000)
      
      // Generate random mesh gradient SVG
      const svg = generateRandomMeshGradient(normalizedColor, seed)
      
      return {
        imageUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
        slideType,
      }
    })
    
    console.log(`[GENERATE-GRADIENT] Generated 3 random mesh gradient images with different seeds`)
    
    // Create a template based on template1 (Classic) with the selected color as highlight
    const baseTemplate = CAROUSEL_TEMPLATES.find(t => t.id === 'template1') || CAROUSEL_TEMPLATES[0]
    
    // Convert hex color to rgba for highlight (with 0.5 opacity)
    const hexToRgba = (hex: string, alpha: number = 0.5): string => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
    
    // Create custom color theme ID
    const colorThemeId = `custom-${normalizedColor.replace('#', '')}`
    
    // Clone the base template and customize it
    const customTemplate: CarouselTemplate = {
      ...baseTemplate,
      id: `template-custom-${normalizedColor.replace('#', '')}`,
      name: `Classic (${normalizedColor})`,
      defaultColorThemeId: colorThemeId,
      // Keep all other properties from base template
    }
    
    // Create custom color theme
    const customColorTheme = {
      id: colorThemeId,
      name: `Custom (${normalizedColor})`,
      textColor: '#000000',
      highlightColor: hexToRgba(normalizedColor, 0.5),
      underlineColor: '#000000',
      primaryColor: normalizedColor
    }
    
    console.log(`[GENERATE-GRADIENT] Created custom template with color theme:`, colorThemeId)
    
    return NextResponse.json({
      success: true,
      images: generatedImages,
      selectedColor: normalizedColor,
      colors: meshColors,
      template: customTemplate,
      colorTheme: customColorTheme
    })
    
  } catch (error: any) {
    console.error('Error generating gradient:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate gradient image' },
      { status: 500 }
    )
  }
}

