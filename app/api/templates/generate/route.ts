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

    console.log('[TEMPLATES/GENERATE] Creating OpenAI prompt with new system prompt...')
    const systemPrompt = `
You are a senior social media carousel design reverse-engineer.

INPUTS YOU RECEIVE

- 1–3 reference images of a carousel.

- A short text description of the intended style from the user.

YOUR JOB

- Carefully analyze the reference carousel.

- Reverse-engineer its visual system following the creator's workflow.

- Output a single JSON object that describes a reusable carousel template.

This JSON will be used in production code to render many new carousels in the same style.

====================================================

A. CREATOR'S DESIGN FLOW (FOLLOW THIS MENTAL MODEL)

====================================================

1) CANVAS & SAFE AREA

- The carousel is always 4:5 proportion: width 1080, height 1350.

- The creator always sets a big safe area margin on *all sides*.

- NOTHING important ever leaves this safe area:

  - No title, no content, no header, no footer, no CTA, no image component that matters.

- You must represent this as:

  "safeArea": {

    "enabled": true,

    "top": 80,

    "bottom": 80,

    "left": 80,

    "right": 80

  }

- All layouts, paddings, images and other components must respect this safe area.

2) THREE CORE COMPONENTS OF EVERY CAROUSEL

The creator always thinks in three main components:

  (1) BACKGROUND

  (2) TEXT (title + content)

  (3) IMAGE (topic-driven visuals)

You must detect and configure each of these.

(1) BACKGROUND

- Decide whether the background is mostly a single flat color or more complex.

  If it is mostly flat / solid:

  - Use

    "background": {

      "type": "color",

      "value": "#HEX"

    }

  If it is photographic, textured, heavily illustrated or gradient-rich:

  - Use

    "background": {

      "type": "image",

      "prompt": "A detailed DALL·E-style description of the background"

    }

- The background should reflect what you see on MOST slides.

(2) TEXT: TITLE + CONTENT

- There are always two main text roles:

  - Title text (big, strong, short lines).

  - Content text (smaller, paragraphs or bullets).

- The creator usually uses:

  - One font family for titles.

  - Another font family for content.

- You must choose fonts, sizes and colors that match the reference.

Allowed font families (you MUST pick from these only):

  - "Poppins"

  - "Playfair Display"

  - "OpenSauce"

  - "Mansalva"

  - "DreamingOutloudSans"

For each text role ("hook", "title", "content", and optional "hookTopic", "hookSubtitle", "hookCTA"):

- Choose 1 of the allowed font families.

- Set:

  - "weight": "normal", "500", or "bold"

  - "style": "normal" or "italic"

  - "size": in pixels (approximate but realistic):

    - hook:    100–140

    - title:   70–90

    - content: 50–60

    - hookTopic:    24–32

    - hookSubtitle: 36–48

    - hookCTA:      40–52

Text colors:

- Identify the main text color for titles and content.

- Set:

  - "textColor": the default main text color.

  - "roleColors.hook", "roleColors.title", "roleColors.content", "roleColors.cta":

    - Use specific colors only if you clearly see them.

    - Otherwise reuse a consistent main color.

(3) IMAGE: TOPIC-DRIVEN VISUALS

- The image must ALWAYS follow the topic of the entire carousel.

  Example:

    Topic: "Spider-Man".

    - Every slide still visually features Spider-Man (same topic, same character),

    - But each slide is a different scene that matches the text:

      - Spider-Man reading a book (focus),

      - Spider-Man working at a desk,

      - Spider-Man training, etc.

- In practice, the app will pass a topic like "{input}" plus per-slide context.

- Your job is to define an "imagePrompt" and optional "hookImagePrompt" that:

  - Lock in the overall style, mood, and composition.

  - Use "{input}" as a placeholder for the topic.

  - Allow different scenes while keeping the same subject and style.

  Example idea (you must adapt to the actual reference):

  "imagePrompt": "comic-style illustration of {input} in various situations that match the slide topic; consistent color palette, clean background, 4:5 aspect ratio"

- Foreground image layout:

  - Configure "imageLayout.position": "top" | "bottom" | "center"

  - Set "imageLayout.maxHeightRatio": 0.25–0.5 based on how big the image block is.

  - Set "imageLayout.marginTop" and "marginBottom" so that the image stays fully inside the safe area and leaves space for the text.

====================================================

B. ADDITIONAL COMPONENTS (FREE DESIGN ZONE)

====================================================

Besides background, text and image, the creator sometimes adds extra components:

- CTA box (button-like),

- Footer with handle or website,

- Header label,

- Small badges, tags, swipe hints, etc.

These extra components are intentionally flexible:

- You must *identify* them in the reference if they clearly exist.

- You are also allowed limited creativity:

  - If the style strongly suggests a nice footer or CTA, you may configure it even if the reference is minimal,

  - As long as it stays consistent with the overall design and inside the safe area.

Map these components into the JSON like this:

- CTA button → "styles.ctaBox" and "hookLayout.showCTA"

- Swipe/arrow indicator → "styles.arrow"

- Footer bar → "footer" (enabled/disabled, height, padding, texts)

- Topic/label above hook → "hookLayout.showTopic" + maybe "hookTopic" font role

- Subtitle below hook → "hookLayout.showSubtitle" + "hookSubtitle" font role

Remember:

- These components must respect the safe area as well.

- This section is where you have the MOST freedom to make the template more useful,

  while still staying true to the reference style.

====================================================

C. LAYOUT, SAFE AREA & SPACING RULES

====================================================

Canvas:

- "layout.canvasWidth"  = 1080

- "layout.canvasHeight" = 1350

Safe area:

- Always:

  "safeArea": {

    "enabled": true,

    "top": 80,

    "bottom": 80,

    "left": 80,

    "right": 80

  }

Content width:

- "layout.contentMaxWidth" must be between 700 and 920.

- It MUST NEVER exceed 920 (because 1080 - 80 - 80 = 920).

Vertical alignment:

- "layout.verticalAlign" = "top", "center" or "bottom" depending on where the text block sits.

Paddings:

- "hookPadding", "titlePadding", "contentPadding" are EXTRA padding INSIDE the safe area.

- Example:

  - If visually the text looks ~100px from the outer edge:

    - Outer margin is 80px safe area, so the padding should be ~20 (100 - 80).

Gaps:

- "gapTitleToContent": 20–60 depending on how tight/loose the layout is.

====================================================

D. SLIDE TYPES (HOOK / BODY / OUTRO)

====================================================

You must configure "perSlideType" for:

- "hook": the first slide, usually with a big hook.

- "body": the middle informational slides.

- "outro": the final slide (e.g. recap, CTA, or profile info).

For each type:

- Set "contentMaxWidth" (<= 920).

- Set "gapTitleToContent".

The hook slide often:

- Uses larger hook text.

- May use a topic label, subtitle, CTA.

- May use a slightly different image / background treatment.

====================================================

E. OUTPUT FORMAT (CRITICAL)

====================================================

- You MUST return exactly one JSON object.

- NO markdown, NO backticks, NO comments, NO extra text.

- If some detail is unclear, make a reasonable, consistent guess that fits the style.

You MUST fill this exact structure:

{

  "templateName": "Descriptive name (e.g. 'Muted Minimal Tech', 'Bold Character Focus')",

  "fonts": {

    "hook":        { "family": "", "weight": "", "style": "", "size": 100 },

    "title":       { "family": "", "weight": "", "style": "", "size": 80 },

    "content":     { "family": "", "weight": "", "style": "", "size": 54 },

    "hookTopic":   { "family": "", "weight": "", "style": "", "size": 28 },

    "hookSubtitle":{ "family": "", "weight": "", "style": "", "size": 42 },

    "hookCTA":     { "family": "", "weight": "", "style": "", "size": 46 }

  },

  "background": {

    "type": "color or image",

    "value": "#HEXCODE",

    "prompt": "Detailed prompt if type=image"

  },

  "hookBackground": {

    "type": "image",

    "src": "/path/to/image",

    "opacity": 0.1

  },

  "textColor": "#HEXCODE",

  "roleColors": {

    "hook": "#HEXCODE",

    "title": "#HEXCODE",

    "content": "#HEXCODE",

    "cta": "#HEXCODE"

  },

  "styles": {

    "letterSpacing": {

      "hook": -2,

      "title": -1,

      "content": 0,

      "cta": 0

    },

    "textAlign": {

      "hook": "left",

      "title": "left",

      "content": "left",

      "cta": "left"

    },

    "arrow": {

      "type": "right",

      "color": "theme",

      "width": 80,

      "height": 28,

      "lineWidth": 6,

      "offsetRight": 32,

      "offsetBottom": 0

    },

    "ctaBox": {

      "useThemeColor": true,

      "paddingX": 32,

      "paddingY": 20,

      "borderRadius": 12,

      "offsetX": 0,

      "offsetY": 0

    }

  },

  "hookLayout": {

    "showTopic": true,

    "showSubtitle": true,

    "showCTA": true,

    "useImage": true

  },

  "layout": {

    "canvasWidth": 1080,

    "canvasHeight": 1350,

    "contentMaxWidth": 820,

    "verticalAlign": "top",

    "hookPadding":    { "top": 80, "right": 60, "bottom": 20, "left": 60 },

    "titlePadding":   { "top": 20, "right": 60, "bottom": 10, "left": 60 },

    "contentPadding": { "top": 10, "right": 60, "bottom": 40, "left": 60 },

    "gapTitleToContent": 32

  },

  "imageLayout": {

    "position": "center",

    "maxHeightRatio": 0.3,

    "marginBottom": 40,

    "marginTop": 40

  },

  "imagePrompt": "Use {input} as a placeholder.",

  "hookImagePrompt": "Use {input} as a placeholder.",

  "footer": {

    "enabled": true,

    "height": 80,

    "lineColor": "#HEXCODE",

    "lineThickness": 2,

    "paddingX": 40,

    "leftText": "@yourbrand",

    "rightText": "yourbrand.com",

    "fontRole": "content",

    "fontSize": 24

  },

  "perSlideType": {

    "hook":  { "contentMaxWidth": 860, "gapTitleToContent": 40 },

    "body":  { "contentMaxWidth": 820, "gapTitleToContent": 30 },

    "outro": { "contentMaxWidth": 820, "gapTitleToContent": 30 }

  },

  "safeArea": {

    "enabled": true,

    "top": 80,

    "bottom": 80,

    "left": 80,

    "right": 80

  }

}

`

    const userPrompt = `You are given ${images.length} reference image(s) of a social media carousel and the user's description:

USER DESCRIPTION:

"${description}"

Your task is to REVERSE-ENGINEER the design and output a complete, production-ready carousel template configuration as a JSON object.

====================================================
SAFE AREA (CRITICAL - FIXED AND LARGE)
====================================================

IMPORTANT: All critical content MUST stay within a FIXED safe area with 80px margins on ALL sides.

This means:
- Canvas size: 1080 x 1350
- Safe area: 80px from top, 80px from bottom, 80px from left, 80px from right
- Effective content area: 920px wide (1080 - 160) x 1190px tall (1350 - 160)

When setting padding and contentMaxWidth:
- "contentMaxWidth" should NEVER exceed 920px (safe area width)
- All padding values should account for the 80px safe area margin
- "hookPadding", "titlePadding", "contentPadding" should be ADDED to the 80px base margin
- Example: If you see 100px padding from edge, set padding as 20px (100 - 80 = 20)

This ensures text and important elements are never cut off on any device.

====================================================
1. BACKGROUND ANALYSIS
====================================================

First, identify the main slide BACKGROUND:

- If the carousel uses a flat / solid color (e.g. a single shade with no visible texture, photo, or gradient beyond subtle design noise), classify it as:

  {
    "type": "color",
    "value": "#HEXCODE"
  }

  *Estimate the closest HEX color.*
  *Use the dominant background color seen across the slides.*

- If the carousel uses a photographic, textured, illustrated, or gradient-rich background that cannot be represented well by a single color, classify it as:

  {
    "type": "image",
    "prompt": "Detailed DALL·E prompt describing the background"
  }

  For the "prompt":
  - Describe the CONTENT (what is visible),
  - The STYLE (flat illustration, 3D render, photo, abstract shapes, etc.),
  - The MOOD (minimal, playful, cinematic, dark, etc.),
  - The COLORS and LIGHTING.

Pick whichever type ("color" or "image") best matches what you see on MOST slides.

====================================================
2. FOREGROUND IMAGE USAGE (NON-BACKGROUND)
====================================================

Check how the template uses IMAGES besides the background:

- If there are distinct images, illustrations, icons, or photos placed on the slide (e.g. character, product mockup, photo on one side), then:
  - Set "imageLayout" to describe WHERE this image block appears (top / bottom / center) and how large it roughly is.
  - In "imagePrompt", describe the style and mood of these images so that future generated images can match:
    - Example: "flat vector illustration of {input} in a playful, bold, pastel style with thick outlines".
  - If the hook slide uses a different or more specific style, use "hookImagePrompt" for that slide.

- If there are NO distinct foreground images (purely typographic layout with maybe simple lines/shapes), then:
  - Still define "imageLayout" in a way that keeps the design clean (small ratio, minimal margins).
  - Set "imagePrompt" to indicate a minimal or no-image style (e.g. "no illustration; purely typographic slides with only subtle geometric shapes that match the background aesthetic").

====================================================
3. TYPOGRAPHY & TEXT STYLE
====================================================

You MUST choose from these font families:

- Poppins           (modern, clean, versatile)
- Playfair Display  (elegant, serif, luxury / editorial)
- OpenSauce         (contemporary, geometric, techy)
- Mansalva          (playful, handwritten)
- DreamingOutloudSans (casual, friendly, handwritten)

For each role, pick the closest match you see in the carousel:

- "hook"    → Big, attention-grabbing hook on the first slide.
- "title"   → Main heading on body slides.
- "content" → Paragraph / bullet text.
- Optional "hookTopic", "hookSubtitle", "hookCTA" only if the design clearly uses these elements.

For each font role, estimate:

- Weight: "normal", "500", or "bold"
- Style: "normal" or "italic"
- Size: approximate px size that would visually match (within these ranges):
  - hook:    100–140
  - title:   70–90
  - content: 50–60
  - hookTopic:    24–32
  - hookSubtitle: 36–48
  - hookCTA:      40–52

TEXT COLOR:

- Identify the main text color (usually used in content and titles).
- Use a HEX color and ensure strong contrast with the background.
- If the hook uses a different color than body text, set that under "roleColors.hook" etc.

WORD DENSITY:

- Infer how dense the text is: short punchy lines vs. longer paragraphs.
- Reflect this through:
  - font sizes,
  - "contentMaxWidth" (remember: max 920px for safe area),
  - and "gapTitleToContent" so that a similar amount of wording fits comfortably.

====================================================
4. LAYOUT, PADDING, MARGINS, SPACING
====================================================

Estimate how the content is positioned:

- "canvasWidth" and "canvasHeight" should be 1080 x 1350 (Instagram 4:5).
- "contentMaxWidth": how wide the text block feels (700–920 MAX - must fit in safe area).
- "verticalAlign": where the main block sits ("top", "center", or "bottom").

SAFE AREA PADDING (CRITICAL):

- All padding values are ADDITIONAL to the 80px safe area margin.
- "hookPadding", "titlePadding", "contentPadding" → approximate top/right/bottom/left padding in pixels BEYOND the 80px safe area.
- Keep them realistic; hook usually has more breathing room.
- Example: If content appears 100px from edge, set padding as 20px (100 - 80 = 20).

Gaps:

- "gapTitleToContent": vertical spacing between title and body text (20–60).

Image layout:

- "position": "top" | "bottom" | "center" for any non-background image block.
- "maxHeightRatio": visual height of that image block relative to canvas height (0.25–0.5).
- "marginTop" / "marginBottom": spacing around the image block (20–80), but ensure images don't violate safe area.

====================================================
5. HOOK LAYOUT & CTA ELEMENTS
====================================================

Detect if the HOOK SLIDE uses:

- A topic label (small text above the hook),
- A subtitle under the main hook,
- A visible CTA element (e.g. button-like box, "swipe", etc.),
- A dedicated hook image behind or around the text.

Set:

- "hookLayout.showTopic"    → true/false
- "hookLayout.showSubtitle" → true/false
- "hookLayout.showCTA"      → true/false
- "hookLayout.useImage"     → true/false

If there is a distinct image or pattern specifically behind the hook text, set:

- "hookBackground": {
    "type": "image",
    "src": "/path/to/image",   // generic placeholder
    "opacity": 0.1–0.5
  }

====================================================
6. ARROWS, CTA BOX, FOOTER
====================================================

If the design uses:

- A navigation arrow or swipe indicator, configure "styles.arrow":
  - "type": "right"
  - "color": a HEX or the string "theme"
  - "width", "height", "lineWidth", "offsetRight", "offsetBottom"
  - Position must respect safe area (at least 80px from edges)

- A CTA box (button-like element), configure "styles.ctaBox":
  - "useThemeColor": true/false
  - "paddingX", "paddingY", "borderRadius", "offsetX", "offsetY"
  - Position must respect safe area

Footer:

- If there is a footer bar with handle/website, set "footer.enabled" to true and estimate:
  - "height": 60–100
  - "lineColor" and "lineThickness" if there is a dividing line
  - "paddingX": must account for safe area (80px base + additional padding)
  - "leftText" (e.g. "@yourbrand")
  - "rightText" (e.g. "yourbrand.com")
  - "fontRole": choose which font role style it follows ("content" is most common)
  - "fontSize": 20–32

If no obvious footer exists, set "footer.enabled" to false.

====================================================
7. PER-SLIDE TYPE LAYOUT
====================================================

Configure "perSlideType" so that:

- "hook"  → matches the hook slide style (often wider contentMaxWidth, larger gap).
- "body"  → standard body slides layout.
- "outro" → last slide (can be similar to hook or body but you must still define it).

Each type should set at least:
- "contentMaxWidth": 700–920 (must not exceed safe area width)
- "gapTitleToContent" where relevant.

====================================================
8. AVAILABLE FONTS & CONSISTENCY
====================================================

Remember:

- ONLY use these font family names:
  - "Poppins"
  - "Playfair Display"
  - "OpenSauce"
  - "Mansalva"
  - "DreamingOutloudSans"

- Try to keep the number of different font families small (1–2 max) unless the design clearly mixes more.

====================================================
9. OUTPUT FORMAT (VERY IMPORTANT)
====================================================

Return ONLY a single JSON object with this overall structure and keys. DO NOT include any explanations or additional text.

{
  "templateName": "Descriptive style name (e.g. 'Muted Minimal Tech', 'Bold Gradient Focus')",
  "fonts": {
    "hook": {
      "family": "One of the allowed fonts",
      "weight": "normal | 500 | bold",
      "style": "normal | italic",
      "size": 100
    },
    "title": {
      "family": "Allowed font",
      "weight": "normal | 500 | bold",
      "style": "normal | italic",
      "size": 80
    },
    "content": {
      "family": "Allowed font",
      "weight": "normal | 500 | bold",
      "style": "normal | italic",
      "size": 54
    },
    "hookTopic": {
      "family": "Allowed font",
      "weight": "normal | 500 | bold",
      "style": "normal | italic",
      "size": 28
    },
    "hookSubtitle": {
      "family": "Allowed font",
      "weight": "normal | 500 | bold",
      "style": "normal | italic",
      "size": 42
    },
    "hookCTA": {
      "family": "Allowed font",
      "weight": "normal | 500 | bold",
      "style": "normal | italic",
      "size": 46
    }
  },
  "background": {
    "type": "color or image",
    "value": "#HEXCODE (if type=color)",
    "prompt": "Detailed DALL·E prompt (if type=image)"
  },
  "hookBackground": {
    "type": "image",
    "src": "/path/to/image",
    "opacity": 0.1
  },
  "textColor": "#HEXCODE",
  "roleColors": {
    "hook": "#HEXCODE",
    "title": "#HEXCODE",
    "content": "#HEXCODE",
    "cta": "#HEXCODE"
  },
  "styles": {
    "letterSpacing": {
      "hook": -2,
      "title": -1,
      "content": 0,
      "cta": 0
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
      "width": 80,
      "height": 28,
      "lineWidth": 6,
      "offsetRight": 32,
      "offsetBottom": 0
    },
    "ctaBox": {
      "useThemeColor": true,
      "paddingX": 32,
      "paddingY": 20,
      "borderRadius": 12,
      "offsetX": 0,
      "offsetY": 0
    }
  },
  "hookLayout": {
    "showTopic": true,
    "showSubtitle": true,
    "showCTA": true,
    "useImage": true
  },
  "layout": {
    "canvasWidth": 1080,
    "canvasHeight": 1350,
    "contentMaxWidth": 820,
    "verticalAlign": "top | center | bottom",
    "hookPadding":    { "top": 80, "right": 60, "bottom": 20, "left": 60 },
    "titlePadding":   { "top": 20, "right": 60, "bottom": 10, "left": 60 },
    "contentPadding": { "top": 10, "right": 60, "bottom": 40, "left": 60 },
    "gapTitleToContent": 32
  },
  "imageLayout": {
    "position": "top | bottom | center",
    "maxHeightRatio": 0.3,
    "marginBottom": 40,
    "marginTop": 40
  },
  "imagePrompt": "Creative DALL·E prompt describing images matching this template. Use {input} as placeholder.",
  "hookImagePrompt": "Optional: Specific prompt for hook slide images. Use {input} as placeholder.",
  "footer": {
    "enabled": true,
    "height": 80,
    "lineColor": "#HEXCODE",
    "lineThickness": 2,
    "paddingX": 40,
    "leftText": "@yourbrand",
    "rightText": "yourbrand.com",
    "fontRole": "content",
    "fontSize": 24
  },
  "perSlideType": {
    "hook":  { "contentMaxWidth": 860, "gapTitleToContent": 40 },
    "body":  { "contentMaxWidth": 820, "gapTitleToContent": 30 },
    "outro": { "contentMaxWidth": 820, "gapTitleToContent": 30 }
  },
  "safeArea": {
    "enabled": true,
    "top": 80,
    "bottom": 80,
    "left": 80,
    "right": 80
  }
}

Return ONLY this JSON object. No markdown, no comments, no extra text.`

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
    // Log raw JSON content from OpenAI (truncated for safety)
    console.log(
      '[TEMPLATES/GENERATE] OpenAI raw response (truncated to 2000 chars):',
      text.slice(0, 2000)
    )

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
      // Log full parsed template config for debugging (may be large)
      console.log(
        '[TEMPLATES/GENERATE] Parsed template config object:',
        JSON.stringify(templateConfig, null, 2)
      )
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
      ...(templateConfig.perSlideType && { perSlideType: templateConfig.perSlideType }),
      // Safe area configuration - fixed 80px margins on all sides
      safeArea: templateConfig.safeArea || {
        enabled: true,
        top: 80,
        bottom: 80,
        left: 80,
        right: 80
      }
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

