import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  console.log('[TEMPLATES/GENERATE] Starting template generation request...')
  
  try {
    console.log('[TEMPLATES/GENERATE] Parsing request body...')
    const { images, description, userId } = await request.json()

    console.log('[TEMPLATES/GENERATE] Request body parsed:', {
      hasImages: !!images,
      imageCount: images?.length,
      hasDescription: !!description,
      descriptionLength: description?.length,
      userId
    })

    // Validate userId is provided
    if (!userId) {
      console.error('[TEMPLATES/GENERATE] Validation failed: No userId provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!images || images.length === 0) {
      console.error('[TEMPLATES/GENERATE] Validation failed: No images')
      return NextResponse.json(
        { error: 'At least 1 image is required' },
        { status: 400 }
      )
    }

    if (images.length > 3) {
      console.error('[TEMPLATES/GENERATE] Validation failed: Too many images:', images.length)
      return NextResponse.json(
        { error: 'Maximum 3 images allowed' },
        { status: 400 }
      )
    }

    if (!description || !description.trim()) {
      console.error('[TEMPLATES/GENERATE] Validation failed: No description')
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    console.log('[TEMPLATES/GENERATE] Validation passed, preparing images for OpenAI...')
    // Convert base64 images to OpenAI format (keep full data URL)
    const imageContents = images.map((base64Image: string) => ({
      type: 'image_url' as const,
      image_url: {
        url: base64Image
      }
    }))

    console.log('[TEMPLATES/GENERATE] Creating OpenAI prompt with enhanced creativity...')
    // Enhanced prompt with more creative freedom
    const systemPrompt = `You are an expert carousel design architect with deep understanding of visual design, typography, color theory, and user experience. Your task is to analyze reference images and create a comprehensive, creative template configuration that captures the essence and aesthetic of the provided visuals.`

    const userPrompt = `Analyze the ${images.length} reference image(s) provided and the user's description below to create a unique, professional carousel template configuration.

USER'S DESCRIPTION:
"${description}"

YOUR TASK:
Create a complete, production-ready carousel template that embodies the visual style, mood, and aesthetic evident in the reference images. Be creative and thoughtful - consider not just obvious elements but also subtle design details like spacing, rhythm, visual hierarchy, and emotional tone.

AVAILABLE FONTS:
- Poppins (Modern, clean, versatile - great for contemporary designs)
- Playfair Display (Elegant, sophisticated, serif - perfect for luxury/artistic styles)
- OpenSauce (Contemporary, geometric - excellent for tech/modern brands)
- Mansalva (Playful, handwritten - ideal for casual/friendly content)
- DreamingOutloudSans (Casual, friendly - great for approachable content)

BACKGROUND OPTIONS:
You can choose either:
1. Solid color: { "type": "color", "value": "#HEXCODE" }
2. Generated image: { "type": "image", "prompt": "detailed DALL-E prompt describing the background aesthetic" }

Choose based on what would best complement the reference images. If the images suggest texture, depth, or visual interest that a solid color can't capture, use a generated image background.

RETURN THIS JSON STRUCTURE (be creative with values but maintain valid JSON):

{
  "templateName": "Create a memorable, descriptive name (e.g., 'Serene Minimalist', 'Bold Geometric', 'Vintage Elegance')",
  "fonts": {
    "hook": {
      "family": "Choose most appropriate font",
      "weight": "normal | bold | 500",
      "style": "normal | italic",
      "size": 100-140
    },
    "title": {
      "family": "Can match hook or complement it",
      "weight": "normal | bold | 500",
      "style": "normal | italic",
      "size": 70-90
    },
    "content": {
      "family": "Any available font - choose for readability and style match",
      "weight": "normal | bold | 500",
      "style": "normal | italic",
      "size": 50-60
    },
    "hookTopic": {
      "family": "Optional - only include if needed",
      "weight": "normal | bold | 500",
      "style": "normal | italic",
      "size": 24-32
    },
    "hookSubtitle": {
      "family": "Optional - only include if needed",
      "weight": "normal | bold | 500",
      "style": "normal | italic",
      "size": 36-48
    },
    "hookCTA": {
      "family": "Optional - only include if needed",
      "weight": "normal | bold | 500",
      "style": "normal | italic",
      "size": 40-52
    }
  },
  "background": {
    "type": "color" OR "image",
    "value": "#HEXCODE" (if type is "color"),
    "prompt": "Detailed DALL-E prompt" (if type is "image")
  },
  "hookBackground": {
    "type": "image",
    "src": "/path/to/image",
    "opacity": 0.1-0.5
  },
  "textColor": "#HEXCODE - Ensure high contrast for readability",
  "roleColors": {
    "hook": "#HEXCODE (optional - can override textColor for hook)",
    "title": "#HEXCODE (optional)",
    "content": "#HEXCODE (optional)",
    "cta": "#HEXCODE (optional)"
  },
  "styles": {
    "letterSpacing": {
      "hook": -2 to 3 (negative = tighter, positive = wider),
      "title": -2 to 3,
      "content": -1 to 2,
      "cta": -1 to 2
    },
    "textAlign": {
      "hook": "left | center | right",
      "title": "left | center | right",
      "content": "left | center | right",
      "cta": "left | center | right"
    },
    "arrow": {
      "type": "right",
      "color": "#HEXCODE or 'theme'",
      "width": 60-100,
      "height": 24-32,
      "lineWidth": 4-8,
      "offsetRight": 24-48,
      "offsetBottom": 0
    },
    "ctaBox": {
      "useThemeColor": true/false,
      "paddingX": 24-48,
      "paddingY": 16-32,
      "borderRadius": 8-16,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "hookLayout": {
    "showTopic": true/false,
    "showSubtitle": true/false,
    "showCTA": true/false,
    "useImage": true/false
  },
  "layout": {
    "canvasWidth": 1080,
    "canvasHeight": 1350,
    "contentMaxWidth": 700-950,
    "verticalAlign": "top | center | bottom",
    "hookPadding": { "top": 40-120, "right": 40-80, "bottom": 0-40, "left": 40-80 },
    "titlePadding": { "top": 0-60, "right": 40-80, "bottom": 0-40, "left": 40-80 },
    "contentPadding": { "top": 0-40, "right": 40-80, "bottom": 0-40, "left": 40-80 },
    "gapTitleToContent": 20-60
  },
  "imageLayout": {
    "position": "top | bottom | center",
    "maxHeightRatio": 0.25-0.5,
    "marginBottom": 20-80,
    "marginTop": 20-80
  },
  "imagePrompt": "Creative DALL-E prompt describing the style of images that would match this template. Include style, mood, composition, lighting. Use {input} as placeholder for content.",
  "hookImagePrompt": "Optional: Specific prompt for hook slide images. Use {input} as placeholder.",
  "footer": {
    "enabled": true/false,
    "height": 60-100,
    "lineColor": "#HEXCODE",
    "lineThickness": 1-3,
    "paddingX": 32-64,
    "leftText": "@yourbrand",
    "rightText": "yourbrand.com",
    "fontRole": "content | title | hook",
    "fontSize": 20-32
  },
  "perSlideType": {
    "hook": { "contentMaxWidth": 700-950, "gapTitleToContent": 20-60 },
    "body": { "contentMaxWidth": 700-950 },
    "outro": { "contentMaxWidth": 700-950 }
  }
}

DESIGN GUIDELINES:
1. **Color Analysis**: Extract dominant colors, accent colors, and mood from images. Create a cohesive palette.
2. **Typography Matching**: Choose fonts that complement the visual style (modern images = modern fonts, vintage = serif, etc.)
3. **Spacing & Rhythm**: Consider the breathing room and visual flow evident in the reference images
4. **Readability**: Always prioritize text readability with proper contrast ratios
5. **Personality**: Let the template reflect the personality and tone of the reference images
6. **Innovation**: Don't be afraid to be creative - this is a custom template, make it special
7. **Consistency**: Ensure all elements work harmoniously together

Return ONLY valid JSON - no markdown formatting, no code blocks, no explanations. Just the pure JSON object.`

    console.log('[TEMPLATES/GENERATE] Calling OpenAI GPT-4o with vision...')
    
    // Build messages with images
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: userPrompt
          },
          ...imageContents
        ]
      }
    ]

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      temperature: 0.7, // Balance creativity with consistency
      max_tokens: 3000,
      response_format: { type: 'json_object' } // Force JSON response
    })

    const text = completion.choices[0]?.message?.content || ''
    console.log('[TEMPLATES/GENERATE] OpenAI API response received, length:', text.length)

    // Parse the response
    console.log('[TEMPLATES/GENERATE] Parsing OpenAI response...')
    let templateConfig
    try {
      // Remove markdown code blocks if present (though OpenAI should return clean JSON)
      const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      templateConfig = JSON.parse(cleanedText)
      console.log('[TEMPLATES/GENERATE] Template config parsed successfully:', {
        templateName: templateConfig.templateName,
        hasFonts: !!templateConfig.fonts,
        backgroundType: templateConfig.background?.type,
        hasHookBackground: !!templateConfig.hookBackground
      })
    } catch (parseError: any) {
      console.error('[TEMPLATES/GENERATE] Failed to parse OpenAI response:', {
        error: parseError.message,
        responseText: text.substring(0, 500),
        fullResponse: text
      })
      return NextResponse.json(
        { error: 'Failed to parse AI response. Please try again.', details: parseError.message },
        { status: 500 }
      )
    }

    // Build the complete template object based on the template structure
    const templateId = `custom_${Date.now()}_${userId.substring(0, 8)}`
    
    // Map font families to their file paths
    const fontFiles: Record<string, string> = {
      'Poppins': '/templates/template1/fonts/Poppins-Bold.ttf',
      'Playfair Display': '/templates/template2/fonts/PlayfairDisplay-BoldItalic.ttf',
      'OpenSauce': '/templates/template3/fonts/open-sauce.one-medium.ttf',
      'Mansalva': '/templates/template3/fonts/Mansalva-Regular.ttf',
      'DreamingOutloudSans': '/templates/template1/fonts/DreamingOutloudSans-Regular.otf'
    }

    const buildFontConfig = (fontConfig: any) => {
      const file = fontFiles[fontConfig.family] || fontFiles['Poppins']
      const weight = fontConfig.weight || 'normal'
      const style = fontConfig.style || 'normal'
      const size = fontConfig.size || 70
      const lineHeight = size * 1.2
      
      return {
        family: fontConfig.family,
        file: file,
        weight: weight,
        style: style,
        cssFont: `${weight} ${style !== 'normal' ? style + ' ' : ''}${size}px "${fontConfig.family}", sans-serif`,
        lineHeight: lineHeight,
        size: size
      }
    }

    // Handle background - support both color and image
    let background
    if (templateConfig.background?.type === 'image') {
      // For image backgrounds, store the prompt to generate later
      background = {
        type: 'image' as const,
        prompt: templateConfig.background.prompt || templateConfig.background.value
      }
    } else {
      // Color background
      background = {
        type: 'color' as const,
        value: templateConfig.background?.value || '#FFFFFF'
      }
    }

    // Build textAlign object - support per-role alignment or global
    const textAlign = templateConfig.styles?.textAlign
    const textAlignConfig = typeof textAlign === 'string' 
      ? {
          hook: textAlign,
          title: textAlign,
          content: textAlign,
          cta: textAlign
        }
      : (textAlign || {
          hook: 'left',
          title: 'left',
          content: 'left',
          cta: 'left'
        })

    const completeTemplate = {
      id: templateId,
      name: templateConfig.templateName || 'Custom Template',
      fonts: {
        hook: buildFontConfig(templateConfig.fonts.hook),
        title: buildFontConfig(templateConfig.fonts.title),
        content: buildFontConfig(templateConfig.fonts.content),
        ...(templateConfig.fonts.hookTopic && { hookTopic: buildFontConfig(templateConfig.fonts.hookTopic) }),
        ...(templateConfig.fonts.hookSubtitle && { hookSubtitle: buildFontConfig(templateConfig.fonts.hookSubtitle) }),
        ...(templateConfig.fonts.hookCTA && { hookCTA: buildFontConfig(templateConfig.fonts.hookCTA) })
      },
      background: background,
      ...(templateConfig.hookBackground && { hookBackground: templateConfig.hookBackground }),
      textColor: templateConfig.textColor || '#000000',
      ...(templateConfig.roleColors && { roleColors: templateConfig.roleColors }),
      styles: {
        letterSpacing: templateConfig.styles?.letterSpacing || {},
        textAlign: textAlignConfig,
        ...(templateConfig.styles?.arrow && { arrow: templateConfig.styles.arrow }),
        ...(templateConfig.styles?.ctaBox && { ctaBox: templateConfig.styles.ctaBox })
      },
      layout: templateConfig.layout || {},
      imageLayout: templateConfig.imageLayout || {},
      imagePrompt: templateConfig.imagePrompt,
      ...(templateConfig.hookImagePrompt && { hookImagePrompt: templateConfig.hookImagePrompt }),
      hookLayout: templateConfig.hookLayout || {},
      ...(templateConfig.footer && { footer: templateConfig.footer }),
      ...(templateConfig.perSlideType && { perSlideType: templateConfig.perSlideType })
    }

    // Save template to database
    console.log('[TEMPLATES/GENERATE] Saving template to database...', {
      templateId,
      userId,
      templateName: completeTemplate.name
    })
    const supabase = createServerClient()
    const { error: dbError } = await supabase
      .from('custom_templates')
      .insert({
        id: templateId,
        user_id: userId,
        name: completeTemplate.name,
        config: completeTemplate,
        created_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('[TEMPLATES/GENERATE] Database error:', {
        error: dbError,
        message: dbError.message,
        code: dbError.code,
        details: dbError.details
      })
      return NextResponse.json(
        { error: 'Failed to save template to database', details: dbError.message },
        { status: 500 }
      )
    }

    console.log('[TEMPLATES/GENERATE] Template saved successfully!', {
      templateId,
      templateName: completeTemplate.name
    })

    return NextResponse.json({
      success: true,
      templateId: templateId,
      templateName: completeTemplate.name,
      template: completeTemplate
    })

  } catch (error: any) {
    console.error('[TEMPLATES/GENERATE] Unexpected error:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    })
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

