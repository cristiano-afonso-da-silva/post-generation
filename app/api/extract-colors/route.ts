import { NextRequest, NextResponse } from 'next/server'

// Helper function to extract colors from CSS text
function extractColorsFromCSS(cssText: string): string[] {
  const colors: string[] = []
  
  // Match hex colors (#rgb, #rrggbb, #rrggbbaa)
  const hexPattern = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
  const hexMatches = cssText.match(hexPattern)
  if (hexMatches) {
    colors.push(...hexMatches.map(c => c.toLowerCase()))
  }
  
  // Match rgb/rgba colors
  const rgbPattern = /rgba?\([^)]+\)/g
  const rgbMatches = cssText.match(rgbPattern)
  if (rgbMatches) {
    colors.push(...rgbMatches)
  }
  
  // Match named colors (basic CSS color names)
  const namedColors = [
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
    'pink', 'brown', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'navy',
    'teal', 'maroon', 'olive', 'silver', 'gold', 'indigo', 'violet', 'coral'
  ]
  const namedPattern = new RegExp(`\\b(${namedColors.join('|')})\\b`, 'gi')
  const namedMatches = cssText.match(namedPattern)
  if (namedMatches) {
    colors.push(...namedMatches.map(c => c.toLowerCase()))
  }
  
  return colors
}

// Convert named colors to hex
function namedColorToHex(color: string): string {
  const colorMap: { [key: string]: string } = {
    'black': '#000000',
    'white': '#ffffff',
    'red': '#ff0000',
    'green': '#008000',
    'blue': '#0000ff',
    'yellow': '#ffff00',
    'orange': '#ffa500',
    'purple': '#800080',
    'pink': '#ffc0cb',
    'brown': '#a52a2a',
    'gray': '#808080',
    'grey': '#808080',
    'cyan': '#00ffff',
    'magenta': '#ff00ff',
    'lime': '#00ff00',
    'navy': '#000080',
    'teal': '#008080',
    'maroon': '#800000',
    'olive': '#808000',
    'silver': '#c0c0c0',
    'gold': '#ffd700',
    'indigo': '#4b0082',
    'violet': '#ee82ee',
    'coral': '#ff7f50'
  }
  return colorMap[color.toLowerCase()] || color
}

// Convert rgb/rgba to hex
function rgbToHex(rgb: string): string {
  const match = rgb.match(/\d+/g)
  if (!match || match.length < 3) return rgb
  
  const r = parseInt(match[0])
  const g = parseInt(match[1])
  const b = parseInt(match[2])
  
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

// Normalize color to hex format
function normalizeColor(color: string): string {
  // If already hex, return as is
  if (color.startsWith('#')) {
    // Expand short hex (#abc -> #aabbcc)
    if (color.length === 4) {
      return '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3]
    }
    return color.substring(0, 7) // Remove alpha if present
  }
  
  // If named color, convert to hex
  if (!color.includes('(')) {
    return namedColorToHex(color)
  }
  
  // If rgb/rgba, convert to hex
  if (color.startsWith('rgb')) {
    return rgbToHex(color)
  }
  
  return color
}

// Count color frequency and get top colors with percentages
function getTopColorsWithPercentages(colors: string[], limit: number = 5): Array<{ color: string; percentage: number }> {
  const colorCounts: { [key: string]: number } = {}
  
  colors.forEach(color => {
    try {
      const normalized = normalizeColor(color)
      // Skip invalid colors
      if (normalized && normalized.startsWith('#')) {
        colorCounts[normalized] = (colorCounts[normalized] || 0) + 1
      }
    } catch (e) {
      // Skip invalid colors
    }
  })
  
  // Calculate total count
  const totalCount = Object.values(colorCounts).reduce((sum, count) => sum + count, 0)
  
  if (totalCount === 0) {
    return []
  }
  
  // Sort by frequency and calculate percentages
  const sorted = Object.entries(colorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([color, count]) => ({
      color,
      percentage: Math.round((count / totalCount) * 100 * 10) / 10 // Round to 1 decimal place
    }))
  
  return sorted
}

// Legacy function for backward compatibility (returns just colors)
function getTopColors(colors: string[], limit: number = 5): string[] {
  return getTopColorsWithPercentages(colors, limit).map(item => item.color)
}

// Filter out common background/neutral colors
function filterNeutralColors(colors: string[]): string[] {
  const neutralColors = [
    '#ffffff', '#000000', '#f5f5f5', '#fafafa', '#ffffff',
    '#e5e5e5', '#cccccc', '#999999', '#666666', '#333333',
    '#f0f0f0', '#eeeeee', '#dddddd', '#bbbbbb', '#aaaaaa'
  ]
  
  return colors.filter(color => !neutralColors.includes(color.toLowerCase()))
}

// Check if URL is a logo
function isLogo(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  
  // Logo indicators in URL
  const logoIndicators = [
    'logo',
    'brand',
    'branding',
    'logotype',
    'wordmark',
    'symbol',
    'icon-logo',
    'logo-icon',
    'site-logo',
    'header-logo',
    'footer-logo',
    'nav-logo',
    'navigation-logo',
    '/logo/',
    '/logos/',
    '/brand/',
    '/branding/',
    'favicon', // Often considered a logo
    'apple-touch-icon' // App icon/logo
  ]
  
  // Check if URL contains logo indicators
  return logoIndicators.some(indicator => lowerUrl.includes(indicator))
}

// Check if URL is a static image (exclude GIFs, videos, and video thumbnails)
function isStaticImage(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  
  // Video file extensions to exclude
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.m4v', '.3gp', '.mpg', '.mpeg']
  
  // Check if URL contains video extension
  if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
    return false
  }
  
  // Exclude GIF files
  if (lowerUrl.includes('.gif') || lowerUrl.includes('image/gif')) {
    return false
  }
  
  // Exclude video thumbnails and preview images
  const videoThumbnailIndicators = [
    'thumbnail',
    'thumb',
    'video-thumb',
    'video_thumb',
    'videothumb',
    'video-preview',
    'video_preview',
    'videopreview',
    'poster', // video poster images
    'video-poster',
    'video_poster',
    'ytimg.com', // YouTube thumbnails
    'i.ytimg.com', // YouTube thumbnails
    'img.youtube.com', // YouTube thumbnails
    'vumbnail.com', // Video thumbnail service
    'thumbnails', // Plural form
    'thumbs', // Common thumbnail folder name
    '/thumb/', // Thumbnail path
    '/thumbs/', // Thumbs path
    'maxresdefault', // YouTube max resolution thumbnail
    'hqdefault', // YouTube high quality thumbnail
    'mqdefault', // YouTube medium quality thumbnail
    'sddefault', // YouTube standard definition thumbnail
    'vi_', // YouTube video ID prefix in thumbnails
    'video-thumbnail',
    'video_thumbnail',
    'videothumbnail'
  ]
  
  // Check if URL contains video thumbnail indicators
  if (videoThumbnailIndicators.some(indicator => lowerUrl.includes(indicator))) {
    return false
  }
  
  // Check for video MIME types in data URIs
  if (url.startsWith('data:')) {
    const mimeType = url.split(';')[0].split(':')[1]
    if (mimeType && (mimeType.startsWith('video/') || mimeType === 'image/gif')) {
      return false
    }
  }
  
  // Static image extensions to include
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.tif']
  
  // If URL has an extension, check if it's a valid image extension
  if (imageExtensions.some(ext => lowerUrl.includes(ext))) {
    // But still exclude if it contains video thumbnail indicators
    return !videoThumbnailIndicators.some(indicator => lowerUrl.includes(indicator))
  }
  
  // If no extension found, check if it's likely an image (has image in path or query params)
  // This is a fallback for URLs without clear extensions
  const imageIndicators = ['/image', '/img', '/photo', '/picture', '/pic', 'image/', 'img/']
  if (imageIndicators.some(indicator => lowerUrl.includes(indicator))) {
    // But still exclude if it's clearly a video, gif, or thumbnail
    return !lowerUrl.includes('video') && 
           !lowerUrl.includes('gif') && 
           !videoThumbnailIndicators.some(indicator => lowerUrl.includes(indicator))
  }
  
  // Default: include if no clear indication it's a video, gif, or thumbnail
  return !lowerUrl.includes('video') && 
         !lowerUrl.includes('gif') && 
         !videoThumbnailIndicators.some(indicator => lowerUrl.includes(indicator))
}

// Check if image tag attributes indicate it's a logo
function isLogoFromAttributes(imgTag: string): boolean {
  const lowerTag = imgTag.toLowerCase()
  
  // Check alt attribute
  const altMatch = lowerTag.match(/alt\s*=\s*["']([^"']+)["']/i)
  if (altMatch) {
    const altText = altMatch[1].toLowerCase()
    const logoAltIndicators = ['logo', 'brand', 'logotype', 'wordmark', 'symbol', 'site logo', 'company logo']
    if (logoAltIndicators.some(indicator => altText.includes(indicator))) {
      return true
    }
  }
  
  // Check class attribute
  const classMatch = lowerTag.match(/class\s*=\s*["']([^"']+)["']/i)
  if (classMatch) {
    const classText = classMatch[1].toLowerCase()
    const logoClassIndicators = ['logo', 'brand', 'logotype', 'wordmark', 'site-logo', 'header-logo', 'footer-logo', 'nav-logo', 'navbar-logo']
    if (logoClassIndicators.some(indicator => classText.includes(indicator))) {
      return true
    }
  }
  
  // Check id attribute
  const idMatch = lowerTag.match(/id\s*=\s*["']([^"']+)["']/i)
  if (idMatch) {
    const idText = idMatch[1].toLowerCase()
    const logoIdIndicators = ['logo', 'brand', 'logotype', 'wordmark', 'site-logo', 'header-logo', 'footer-logo']
    if (logoIdIndicators.some(indicator => idText.includes(indicator))) {
      return true
    }
  }
  
  // Check if image is in header/nav/footer context (common logo locations)
  // This is a simple heuristic - we'll check the surrounding HTML
  return false
}

// Extract images from HTML and separate logos from regular images
function extractImagesFromHTML(html: string, baseUrl: string): { logos: string[]; images: string[] } {
  const allImages: Array<{ url: string; isLogo: boolean }> = []
  const baseUrlObj = new URL(baseUrl)
  
  // Helper function to extract image URL from img tag
  const extractImageUrlFromTag = (fullImgTag: string): string | null => {
    // Try regular src first
    let srcMatch = fullImgTag.match(/src\s*=\s*["']([^"']+)["']/i)
    if (srcMatch && srcMatch[1]) {
      return srcMatch[1].trim()
    }
    
    // Try lazy loading attributes (data-src, data-lazy-src, data-original, etc.)
    const lazyAttributes = ['data-src', 'data-lazy-src', 'data-original', 'data-lazy', 'data-srcset']
    for (const attr of lazyAttributes) {
      const pattern = new RegExp(`${attr}\\s*=\\s*["']([^"']+)["']`, 'i')
      const match = fullImgTag.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }
    
    return null
  }
  
  // Extract from img tags with full tag context
  const imgPattern = /<img[^>]+>/gi
  let imgMatch
  let imgCount = 0
  while ((imgMatch = imgPattern.exec(html)) !== null) {
    imgCount++
    const fullImgTag = imgMatch[0]
    const imageUrlRaw = extractImageUrlFromTag(fullImgTag)
    
    if (!imageUrlRaw) {
      continue
    }
    
    let imageUrl = imageUrlRaw
    
    // Skip data URIs (but allow data-src with actual URLs)
    if (imageUrl.startsWith('data:') && !imageUrl.includes('http')) {
      continue
    }
    
    // Convert to absolute URL
    if (imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl
    } else if (imageUrl.startsWith('/')) {
      imageUrl = baseUrlObj.origin + imageUrl
    } else if (!imageUrl.startsWith('http')) {
      imageUrl = new URL(imageUrl, baseUrl).href
    }
    
    // Only add if it's a static image (exclude GIFs and videos)
    if (isStaticImage(imageUrl)) {
      // Check if it's a logo based on URL
      const isLogoFromUrl = isLogo(imageUrl)
      // Check if it's a logo based on HTML attributes
      const isLogoFromAttrs = isLogoFromAttributes(fullImgTag)
      
      // Check context - is it in header/nav/footer?
      const imgIndex = imgMatch.index || 0
      const contextBefore = html.substring(Math.max(0, imgIndex - 500), imgIndex).toLowerCase()
      const contextAfter = html.substring(imgIndex, Math.min(html.length, imgIndex + 500)).toLowerCase()
      const fullContext = contextBefore + contextAfter
      
      const isInHeader = fullContext.includes('<header') || fullContext.includes('class="header') || fullContext.includes('id="header') || fullContext.includes('class=\'header') || fullContext.includes('id=\'header')
      const isInNav = fullContext.includes('<nav') || fullContext.includes('class="nav') || fullContext.includes('id="nav') || fullContext.includes('class=\'nav') || fullContext.includes('id=\'nav')
      const isInFooter = fullContext.includes('<footer') || fullContext.includes('class="footer') || fullContext.includes('id="footer') || fullContext.includes('class=\'footer') || fullContext.includes('id=\'footer')
      
      // Logo detection logic:
      // 1. URL contains logo indicators
      // 2. HTML attributes (alt/class/id) contain logo indicators
      // 3. Image is in header/nav (common logo locations) - but not footer (footer logos are less common)
      // 4. Image is in a link that wraps it (logos are often clickable)
      const isInLink = fullContext.includes('<a') && fullContext.includes('</a>')
      const isLikelyLogo = isLogoFromUrl || 
                          isLogoFromAttrs || 
                          (isInHeader && !isInFooter) || 
                          (isInNav && !isInFooter) ||
                          (isInLink && (isInHeader || isInNav))
      
      allImages.push({
        url: imageUrl,
        isLogo: isLikelyLogo
      })
    }
  }
  
  console.log(`[EXTRACT-COLORS] Found ${imgCount} <img> tags in HTML`)
  
  // Extract from srcset and data-srcset attributes (these are usually responsive images)
  const srcsetPatterns = [
    /srcset\s*=\s*["']([^"']+)["']/gi,
    /data-srcset\s*=\s*["']([^"']+)["']/gi
  ]
  
  srcsetPatterns.forEach(pattern => {
    const srcsetMatches = html.match(pattern)
    if (srcsetMatches) {
      srcsetMatches.forEach(match => {
        const srcsetContent = match.replace(/(srcset|data-srcset)\s*=\s*["']|["']/gi, '')
        // srcset format: "url1 1x, url2 2x, ..."
        const urls = srcsetContent.split(',').map(item => {
          const url = item.trim().split(/\s+/)[0]
          if (url.startsWith('data:') && !url.includes('http')) {
            // Check data URI MIME type
            if (isStaticImage(url)) {
              return { url, isLogo: isLogo(url) }
            }
            return null
          }
          
          let absoluteUrl = url
          if (url.startsWith('//')) {
            absoluteUrl = 'https:' + url
          } else if (url.startsWith('/')) {
            absoluteUrl = baseUrlObj.origin + url
          } else if (!url.startsWith('http')) {
            absoluteUrl = new URL(url, baseUrl).href
          }
          
          // Only return if it's a static image
          return isStaticImage(absoluteUrl) ? { url: absoluteUrl, isLogo: isLogo(absoluteUrl) } : null
        }).filter(Boolean) as Array<{ url: string; isLogo: boolean }>
        
        allImages.push(...urls)
      })
    }
  })
  
  // Extract from picture/source elements (modern responsive images)
  const sourcePattern = /<source[^>]+srcset\s*=\s*["']([^"']+)["'][^>]*>/gi
  let sourceMatch
  while ((sourceMatch = sourcePattern.exec(html)) !== null) {
    const srcsetContent = sourceMatch[1]
    const urls = srcsetContent.split(',').map(item => {
      const url = item.trim().split(/\s+/)[0]
      if (url.startsWith('data:') && !url.includes('http')) {
        return null
      }
      
      let absoluteUrl = url
      if (url.startsWith('//')) {
        absoluteUrl = 'https:' + url
      } else if (url.startsWith('/')) {
        absoluteUrl = baseUrlObj.origin + url
      } else if (!url.startsWith('http')) {
        absoluteUrl = new URL(url, baseUrl).href
      }
      
      return isStaticImage(absoluteUrl) ? { url: absoluteUrl, isLogo: isLogo(absoluteUrl) } : null
    }).filter(Boolean) as Array<{ url: string; isLogo: boolean }>
    
    allImages.push(...urls)
  }
  
  // Extract background images from inline styles
  const inlineStylePattern = /style\s*=\s*["']([^"']+)["']/gi
  const inlineMatches = html.match(inlineStylePattern)
  if (inlineMatches) {
    inlineMatches.forEach(match => {
      const styleContent = match.replace(/style\s*=\s*["']|["']/gi, '')
      const bgImagePattern = /background-image\s*:\s*url\(["']?([^"')]+)["']?\)/gi
      const bgMatches = styleContent.match(bgImagePattern)
      if (bgMatches) {
        bgMatches.forEach(bgMatch => {
          const urlMatch = bgMatch.match(/url\(["']?([^"')]+)["']?\)/i)
          if (urlMatch && urlMatch[1]) {
            let imageUrl = urlMatch[1].trim()
            
            if (imageUrl.startsWith('data:')) {
              return
            }
            
            if (imageUrl.startsWith('//')) {
              imageUrl = 'https:' + imageUrl
            } else if (imageUrl.startsWith('/')) {
              imageUrl = baseUrlObj.origin + imageUrl
            } else if (!imageUrl.startsWith('http')) {
              imageUrl = new URL(imageUrl, baseUrl).href
            }
            
            // Only add if it's a static image (exclude GIFs and videos)
            if (isStaticImage(imageUrl)) {
              allImages.push({ url: imageUrl, isLogo: isLogo(imageUrl) })
            }
          }
        })
      }
    })
  }
  
  // Extract background images from style tags
  const styleTagPattern = /<style[^>]*>([\s\S]*?)<\/style>/gi
  const styleMatches = html.match(styleTagPattern)
  if (styleMatches) {
    styleMatches.forEach(match => {
      const styleContent = match.replace(/<style[^>]*>|<\/style>/gi, '')
      const bgImagePattern = /background-image\s*:\s*url\(["']?([^"')]+)["']?\)/gi
      const bgMatches = styleContent.match(bgImagePattern)
      if (bgMatches) {
        bgMatches.forEach(bgMatch => {
          const urlMatch = bgMatch.match(/url\(["']?([^"')]+)["']?\)/i)
          if (urlMatch && urlMatch[1]) {
            let imageUrl = urlMatch[1].trim()
            
            if (imageUrl.startsWith('data:')) {
              return
            }
            
            if (imageUrl.startsWith('//')) {
              imageUrl = 'https:' + imageUrl
            } else if (imageUrl.startsWith('/')) {
              imageUrl = baseUrlObj.origin + imageUrl
            } else if (!imageUrl.startsWith('http')) {
              imageUrl = new URL(imageUrl, baseUrl).href
            }
            
            // Only add if it's a static image (exclude GIFs and videos)
            if (isStaticImage(imageUrl)) {
              allImages.push({ url: imageUrl, isLogo: isLogo(imageUrl) })
            }
          }
        })
      }
    })
  }
  
  // Remove duplicates and filter out invalid URLs and non-static images
  const imageMap = new Map<string, boolean>()
  
  allImages.forEach(({ url, isLogo }) => {
    try {
      new URL(url)
      // Final check: ensure it's a static image (not GIF or video)
      if (isStaticImage(url)) {
        // If we already have this URL, keep the logo flag if either instance is a logo
        if (imageMap.has(url)) {
          if (isLogo) {
            imageMap.set(url, true)
          }
        } else {
          imageMap.set(url, isLogo)
        }
      }
    } catch (e) {
      // Skip invalid URLs
      console.log(`[EXTRACT-COLORS] Skipping invalid URL: ${url.substring(0, 50)}...`)
    }
  })
  
  // Debug logging
  console.log(`[EXTRACT-COLORS] Found ${allImages.length} total image candidates, ${imageMap.size} unique valid images`)
  
  // Separate logos from regular images
  const logos: string[] = []
  const images: string[] = []
  
  imageMap.forEach((isLogoFlag, url) => {
    if (isLogoFlag) {
      logos.push(url)
    } else {
      images.push(url)
    }
  })
  
  // Limit to 10 logos and 20 images
  return {
    logos: logos.slice(0, 10),
    images: images.slice(0, 20)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid URL parameter' },
        { status: 400 }
      )
    }
    
    // Validate URL format
    let websiteUrl = url.trim()
    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      websiteUrl = 'https://' + websiteUrl
    }
    
    try {
      new URL(websiteUrl)
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }
    
    // Fetch the website
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      // Timeout after 10 seconds
      signal: AbortSignal.timeout(10000)
    })
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch website: ${response.status} ${response.statusText}` },
        { status: response.status }
      )
    }
    
    const html = await response.text()
    const baseUrl = websiteUrl
    
    // Extract images from HTML (separated into logos and regular images)
    const extractedMedia = extractImagesFromHTML(html, baseUrl)
    
    // Debug logging
    console.log(`[EXTRACT-COLORS] Extracted ${extractedMedia.logos.length} logos and ${extractedMedia.images.length} images from ${websiteUrl}`)
    
    // Extract colors from HTML
    const allColors: string[] = []
    
    // Extract from inline styles
    const inlineStylePattern = /style\s*=\s*["']([^"']+)["']/gi
    const inlineMatches = html.match(inlineStylePattern)
    if (inlineMatches) {
      inlineMatches.forEach(match => {
        const styleContent = match.replace(/style\s*=\s*["']|["']/gi, '')
        allColors.push(...extractColorsFromCSS(styleContent))
      })
    }
    
    // Extract from style tags
    const styleTagPattern = /<style[^>]*>([\s\S]*?)<\/style>/gi
    const styleMatches = html.match(styleTagPattern)
    if (styleMatches) {
      styleMatches.forEach(match => {
        const styleContent = match.replace(/<style[^>]*>|<\/style>/gi, '')
        allColors.push(...extractColorsFromCSS(styleContent))
      })
    }
    
    // Extract from link tags (external stylesheets)
    const linkPattern = /<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi
    const linkMatches = html.match(linkPattern)
    
    if (linkMatches) {
      // Try to fetch and parse external stylesheets (limit to 5 for better coverage)
      const stylesheetPromises = linkMatches.slice(0, 5).map(async (match) => {
        const hrefMatch = match.match(/href\s*=\s*["']([^"']+)["']/i)
        if (!hrefMatch) return []
        
        let stylesheetUrl = hrefMatch[1]
        if (stylesheetUrl.startsWith('//')) {
          stylesheetUrl = 'https:' + stylesheetUrl
        } else if (stylesheetUrl.startsWith('/')) {
          const baseUrl = new URL(websiteUrl)
          stylesheetUrl = baseUrl.origin + stylesheetUrl
        } else if (!stylesheetUrl.startsWith('http')) {
          const baseUrl = new URL(websiteUrl)
          stylesheetUrl = new URL(stylesheetUrl, baseUrl.origin).href
        }
        
        try {
          const cssResponse = await fetch(stylesheetUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(5000)
          })
          if (cssResponse.ok) {
            const cssText = await cssResponse.text()
            return extractColorsFromCSS(cssText)
          }
        } catch (e) {
          // Skip failed stylesheet fetches
        }
        return []
      })
      
      const stylesheetColors = await Promise.all(stylesheetPromises)
      allColors.push(...stylesheetColors.flat())
    }
    
    // Get top colors with percentages, filtering out neutrals first
    let topColorsWithPercentages = getTopColorsWithPercentages(allColors, 10)
    const neutralColors = [
      '#ffffff', '#000000', '#f5f5f5', '#fafafa',
      '#e5e5e5', '#cccccc', '#999999', '#666666', '#333333',
      '#f0f0f0', '#eeeeee', '#dddddd', '#bbbbbb', '#aaaaaa'
    ]
    let filteredColors = topColorsWithPercentages.filter(item => 
      !neutralColors.includes(item.color.toLowerCase())
    )
    
    // If we filtered out too many, get more and filter again
    if (filteredColors.length < 5) {
      topColorsWithPercentages = getTopColorsWithPercentages(allColors, 15)
      filteredColors = topColorsWithPercentages.filter(item => {
        const neutralColors = [
          '#ffffff', '#000000', '#f5f5f5', '#fafafa',
          '#e5e5e5', '#cccccc', '#999999', '#666666', '#333333',
          '#f0f0f0', '#eeeeee', '#dddddd', '#bbbbbb', '#aaaaaa'
        ]
        return !neutralColors.includes(item.color.toLowerCase())
      })
    }
    
    // Take top 5
    let finalColors = filteredColors.slice(0, 5)
    
    // If we still don't have 5, fill with most common colors (including neutrals)
    if (finalColors.length < 5) {
      const allTopColors = getTopColorsWithPercentages(allColors, 5)
      const existingColors = new Set(finalColors.map(item => item.color))
      const additionalColors = allTopColors.filter(item => !existingColors.has(item.color))
      finalColors = [...finalColors, ...additionalColors].slice(0, 5)
    }
    
    // Extract text content from the website
    const extractTextFromHTML = (html: string): string => {
      // Remove script and style tags
      let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      
      // Extract text from common content elements
      const contentSelectors = [
        /<h1[^>]*>([\s\S]*?)<\/h1>/gi,
        /<h2[^>]*>([\s\S]*?)<\/h2>/gi,
        /<h3[^>]*>([\s\S]*?)<\/h3>/gi,
        /<p[^>]*>([\s\S]*?)<\/p>/gi,
        /<title[^>]*>([\s\S]*?)<\/title>/gi,
        /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/gi,
        /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/gi,
      ]
      
      const extractedTexts: string[] = []
      
      contentSelectors.forEach(pattern => {
        let match
        while ((match = pattern.exec(text)) !== null) {
          const content = match[1]
            .replace(/<[^>]+>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim()
          
          if (content && content.length > 10) {
            extractedTexts.push(content)
          }
        }
      })
      
      // Combine and limit to first 2000 characters
      return extractedTexts.join(' ').substring(0, 2000)
    }
    
    const extractedText = extractTextFromHTML(html)
    
    return NextResponse.json({
      success: true,
      colors: finalColors.map(item => item.color),
      colorsWithPercentages: finalColors,
      logos: extractedMedia.logos,
      images: extractedMedia.images,
      text: extractedText
    })
    
  } catch (error: any) {
    console.error('Error extracting colors:', error)
    
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Request timeout. The website took too long to respond.' },
        { status: 408 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to extract colors from website' },
      { status: 500 }
    )
  }
}

