// ═══════════════════════════════════════════════════════════════════════════
// GOOGLE FONTS UTILITY
// ═══════════════════════════════════════════════════════════════════════════
// Utilities for loading Google Fonts dynamically for canvas rendering

/**
 * Normalizes a font family name for use in Google Fonts API URLs
 * Handles spaces, special characters, and encoding
 * @param family - Font family name (e.g., "Playfair Display", "Roboto")
 * @returns URL-encoded font family name (e.g., "Playfair+Display", "Roboto")
 */
export function normalizeFontFamilyName(family: string): string {
  // Replace spaces with '+' for Google Fonts API
  return family.replace(/\s+/g, '+')
}

/**
 * Maps weight values to Google Fonts API weight format
 * @param weight - Font weight (e.g., "normal", "bold", "500", "700")
 * @returns Numeric weight string for Google Fonts API
 */
function normalizeWeight(weight: string): string {
  const weightMap: Record<string, string> = {
    'normal': '400',
    'bold': '700',
    '100': '100',
    '200': '200',
    '300': '300',
    '400': '400',
    '500': '500',
    '600': '600',
    '700': '700',
    '800': '800',
    '900': '900'
  }
  return weightMap[weight] || weight || '400'
}

/**
 * Gets the Google Fonts CSS URL for a font family
 * @param family - Font family name
 * @param weights - Array of weight values (e.g., ["400", "700"])
 * @param styles - Array of style values (e.g., ["normal", "italic"])
 * @returns Google Fonts CSS URL
 */
export function getGoogleFontCssUrl(
  family: string,
  weights: string[] = ['400'],
  styles: string[] = ['normal']
): string {
  const normalizedFamily = normalizeFontFamilyName(family)
  const normalizedWeights = weights.map(w => normalizeWeight(w)).join(';')
  
  // Build the URL
  let url = `https://fonts.googleapis.com/css2?family=${normalizedFamily}:wght@${normalizedWeights}`
  
  // Add italic if needed
  if (styles.includes('italic')) {
    url += `&display=swap`
  } else {
    url += `&display=swap`
  }
  
  return url
}

/**
 * Fetches the Google Fonts CSS and extracts the font file URL
 * @param family - Font family name
 * @param weight - Font weight (e.g., "400", "bold", "700")
 * @param style - Font style ("normal" or "italic")
 * @returns Promise resolving to the font file URL
 */
export async function getGoogleFontFileUrl(
  family: string,
  weight: string = '400',
  style: string = 'normal'
): Promise<string> {
  try {
    const normalizedFamily = normalizeFontFamilyName(family)
    const normalizedWeight = normalizeWeight(weight)
    
    // Build Google Fonts CSS URL
    // For italic, we need to request italic style using :ital,wght@1,weight format
    // For normal, use :wght@weight format
    let url: string
    if (style === 'italic') {
      // Italic format: :ital,wght@1,weight (1 means italic, 0 would mean normal)
      url = `https://fonts.googleapis.com/css2?family=${normalizedFamily}:ital,wght@1,${normalizedWeight}&display=swap`
    } else {
      // Normal format: :wght@weight
      url = `https://fonts.googleapis.com/css2?family=${normalizedFamily}:wght@${normalizedWeight}&display=swap`
    }
    
    // Fetch the CSS
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Fonts CSS: ${response.status} ${response.statusText}`)
    }
    
    const css = await response.text()
    
    // Extract font file URL from CSS
    // Google Fonts CSS typically looks like:
    // @font-face {
    //   font-family: 'Roboto';
    //   src: url(https://fonts.gstatic.com/s/roboto/v30/...) format('woff2');
    // }
    const urlMatch = css.match(/url\(([^)]+)\)/i)
    
    if (!urlMatch || !urlMatch[1]) {
      throw new Error(`Could not extract font file URL from Google Fonts CSS for ${family}`)
    }
    
    return urlMatch[1]
  } catch (error) {
    console.error(`Error getting Google Font file URL for ${family}:`, error)
    throw error
  }
}

/**
 * Loads a Google Font using the FontFace API for canvas rendering
 * @param family - Font family name
 * @param weight - Font weight (e.g., "400", "bold", "700")
 * @param style - Font style ("normal" or "italic")
 * @returns Promise resolving to a loaded FontFace object
 */
export async function loadGoogleFont(
  family: string,
  weight: string = '400',
  style: string = 'normal'
): Promise<FontFace> {
  try {
    // Get the font file URL
    const fontUrl = await getGoogleFontFileUrl(family, weight, style)
    
    // Normalize weight for FontFace API
    const normalizedWeight = normalizeWeight(weight)
    
    // Create FontFace
    const fontFace = new FontFace(family, `url(${fontUrl})`, {
      weight: normalizedWeight,
      style: style,
      display: 'swap'
    })
    
    // Load the font
    await fontFace.load()
    
    return fontFace
  } catch (error) {
    console.error(`Error loading Google Font ${family}:`, error)
    throw error
  }
}

/**
 * Batch loads multiple Google Fonts
 * @param fonts - Array of font configurations { family, weight, style }
 * @returns Promise resolving to an array of loaded FontFace objects
 */
export async function loadGoogleFonts(
  fonts: Array<{ family: string; weight?: string; style?: string }>
): Promise<FontFace[]> {
  const loadPromises = fonts.map(font =>
    loadGoogleFont(font.family, font.weight || '400', font.style || 'normal')
      .catch(error => {
        console.warn(`Failed to load font ${font.family}:`, error)
        return null
      })
  )
  
  const results = await Promise.all(loadPromises)
  return results.filter((font): font is FontFace => font !== null)
}

