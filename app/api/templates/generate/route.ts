import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/app/lib/supabase'
import OpenAI from 'openai'

// Get OpenAI API key from environment variables
const OPENAI_API_KEY = process.env.OPEN_AI_API_KEY || process.env.OPENAI_API_KEY

// Validate API key at module load
if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in environment variables')
  console.error('   Please add OPENAI_API_KEY or OPEN_AI_API_KEY to your .env.local file')
} else {
  console.log('✅ OPENAI_API_KEY loaded successfully')
  console.log(`   Key preview: ${OPENAI_API_KEY.substring(0, 10)}...`)
}

// Create OpenAI client only if API key is available (will be validated at request time)
const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null

export async function POST(request: NextRequest) {
  console.log('[TEMPLATES/GENERATE] Starting template generation request...')
  
  try {
    // Validate OpenAI API key at request time
    if (!OPENAI_API_KEY || OPENAI_API_KEY.trim().length === 0) {
      console.error('❌ OPENAI_API_KEY is missing or empty')
      return NextResponse.json(
        { error: 'OPENAI_API_KEY is not configured. Please set OPENAI_API_KEY or OPEN_AI_API_KEY in your environment variables.' },
        { status: 500 }
      )
    }

    if (!openai) {
      console.error('❌ OpenAI client not initialized')
      return NextResponse.json(
        { error: 'OpenAI client not initialized. Please check your environment variables.' },
        { status: 500 }
      )
    }
    console.log('[TEMPLATES/GENERATE] Parsing request body...')
    const { images, description, userId, isRegeneration, existingTemplate } = await request.json()

    console.log('[TEMPLATES/GENERATE] Request body parsed:', {
      hasImages: !!images,
      imageCount: images?.length,
      hasDescription: !!description,
      descriptionLength: description?.length,
      userId,
      isRegeneration: !!isRegeneration,
      hasExistingTemplate: !!existingTemplate
    })

    // Validate userId is provided
    if (!userId) {
      console.error('[TEMPLATES/GENERATE] Validation failed: No userId provided')
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Check if user has already used the Generate Template feature (only for initial generation, not regeneration)
    if (!isRegeneration) {
      console.log('[TEMPLATES/GENERATE] Checking if user has already used template generation...')
      const supabase = createServerClient()
      const { data: userCredits, error: creditsError } = await supabase
        .from('user_credits')
        .select('template_generation_used')
        .eq('user_id', userId)
        .single()

      if (creditsError && creditsError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('[TEMPLATES/GENERATE] Error checking user credits:', creditsError)
        return NextResponse.json(
          { error: 'Failed to check template generation status' },
          { status: 500 }
        )
      }

      // If user has already used the feature, reject the request
      if (userCredits?.template_generation_used === true) {
        console.log('[TEMPLATES/GENERATE] User has already used template generation feature')
        return NextResponse.json(
          { 
            error: 'Template Generation Limit Reached. This feature is limited to one use per account. You\'ve already used your available template generation.',
            code: 'TEMPLATE_GENERATION_LIMIT_REACHED'
          },
          { status: 403 }
        )
      }
    }

    if (!isRegeneration) {
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
    } else {
      // For regeneration, we need generated template images
      if (!images || images.length === 0) {
        console.error('[TEMPLATES/GENERATE] Validation failed: No generated template images for regeneration')
        return NextResponse.json(
          { error: 'Generated template images are required for regeneration' },
          { status: 400 }
        )
      }
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
    
    // Use different system prompt for regeneration vs initial generation
    const systemPrompt = isRegeneration ? `
You are a senior social media carousel design modifier and enhancer.

INPUTS YOU RECEIVE

- 1–3 images of a previously generated carousel template (showing the current template design).

- A text description from the user describing what they want to alter or improve.

- The existing template configuration (optional, for reference).

YOUR JOB

- Carefully analyze the existing template images.

- Understand what the user wants to change based on their description.

- Modify the template configuration to incorporate the requested changes while maintaining the overall design coherence.

- Output a single JSON object that describes the updated carousel template.

The user wants to alter: "${description}"

====================================================

ALTERATION GUIDELINES

====================================================

1. PRESERVE WHAT WORKS

- Keep elements that the user doesn't mention changing.

- Maintain the overall structure and layout unless specifically requested to change.

- Preserve safe area, canvas dimensions, and core layout principles.

2. APPLY REQUESTED CHANGES

- If the user mentions fonts: update font families, weights, sizes, or styles accordingly.

- If the user mentions colors: adjust textColor, roleColors, background colors, or theme colors.

- If the user mentions spacing: modify padding, margins, gaps, or contentMaxWidth.

- If the user mentions layout: adjust verticalAlign, contentMaxWidth, or component positions.

- If the user mentions components: enable/disable footer, CTA, arrows, or other elements.

- If the user mentions images: adjust imagePlacement (hook, content, cta) to control where images appear.

3. MAINTAIN CONSISTENCY

- Ensure all changes work together harmoniously.

- Keep the template production-ready and usable.

- Don't break existing functionality or create conflicting settings.

4. IMAGE GENERATION NEGATIVE PROMPTS (CRITICAL - FOR POOMOODOIN AI)

====================================================

When creating "imagePrompt" and "hookImagePrompt" fields, you MUST include explicit negative prompt instructions that will be sent to Pomoodoin AI.

IMPORTANT: All image prompts MUST explicitly state what should NOT be drawn. This is a NEGATIVE PROMPT requirement.

You MUST append to every image prompt a clear negative prompt section that prohibits:

- Anything that looks devious, sinister, or malicious
- Anything that looks demonic, demon-like, or evil
- Anything that looks strange, disturbing, or unsettling
- Dark, menacing, or threatening imagery
- Horror-themed or scary elements
- Any content that could be considered inappropriate or offensive

Format your image prompts like this:

"imagePrompt": "positive description of the image style and content. NEGATIVE PROMPT: Do not draw anything that looks devious, demon, strange, sinister, evil, disturbing, menacing, threatening, horror-themed, scary, or inappropriate. Keep all imagery positive, friendly, and appropriate for social media."

This negative prompt instruction will be sent directly to Pomoodoin AI to ensure safe, appropriate image generation.

5. OUTPUT FORMAT

- Return the complete template JSON structure (same as initial generation).

- Include all required fields even if unchanged.

- Make sure the output is valid JSON that can be used directly in production.

====================================================

OUTPUT FORMAT (CRITICAL)

====================================================

Return ONLY a single JSON object with the complete template structure. Use the same format as initial template generation, but with your modifications applied.

` : `
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

FONT SELECTION (CRITICAL - USE ANY GOOGLE FONT):

- You can use ANY font from the Google Fonts database (250+ fonts available)
- Choose fonts that visually match the reference carousel style
- Use exact Google Font family names (e.g., "Roboto", "Montserrat", "Lato", "Open Sans", "Poppins", "Playfair Display", "Inter", "Work Sans", "Kalam", "Caveat", etc.)
- Prioritize visual similarity to the reference over any predefined font list
- Common Google Fonts include: Roboto, Montserrat, Lato, Open Sans, Poppins, Playfair Display, Inter, Work Sans, Raleway, Source Sans Pro, Nunito, Kalam, Caveat, and many more
- Browse https://fonts.google.com for inspiration, but use the exact family name as it appears on Google Fonts

For each text role ("hook", "title", "content", and optional "hookTopic", "hookSubtitle", "hookCTA"):

- Choose a Google Font family name that visually matches the reference style.

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

  - MUST include negative prompt instructions (see CRITICAL: IMAGE GENERATION NEGATIVE PROMPTS section below)

  Example idea (you must adapt to the actual reference):

  "imagePrompt": "comic-style illustration of {input} in various situations that match the slide topic; consistent color palette, clean background, 4:5 aspect ratio. NEGATIVE PROMPT: Do not draw anything that looks devious, demon, strange, sinister, evil, disturbing, menacing, threatening, horror-themed, scary, or inappropriate. Keep all imagery positive, friendly, and appropriate for social media."

- Foreground image layout:

  - Configure "imageLayout.position": "top" | "bottom" | "center"

  - Set "imageLayout.maxHeightRatio": 0.25–0.5 based on how big the image block is.

  - Set "imageLayout.marginTop" and "marginBottom" so that the image stays fully inside the safe area and leaves space for the text.

- Image placement configuration:

  - Configure "imagePlacement" to specify which slide types should show images:

    - "hook": true/false - Whether hook slides should display images

    - "content": true/false - Whether middle/content slides should display images

    - "cta": false - CTA slides should NEVER show images (always set to false)

  - Default: { "hook": false, "content": true, "cta": false } (images only in content slides)

  - If the reference shows images in hook slides, set "hook": true

  - If the reference shows images only in middle slides, set "hook": false, "content": true

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

  "imagePrompt": "Use {input} as a placeholder. NEGATIVE PROMPT: Do not draw anything that looks devious, demon, strange, sinister, evil, disturbing, menacing, threatening, horror-themed, scary, or inappropriate. Keep all imagery positive, friendly, and appropriate for social media.",

  "hookImagePrompt": "Use {input} as a placeholder. NEGATIVE PROMPT: Do not draw anything that looks devious, demon, strange, sinister, evil, disturbing, menacing, threatening, horror-themed, scary, or inappropriate. Keep all imagery positive, friendly, and appropriate for social media.",

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

  },

  "imagePlacement": {

    "hook": false,

    "content": true,

    "cta": false

  }

}

`

    const userPrompt = isRegeneration ? `You are given ${images.length} image(s) of a previously generated carousel template and the user's edit request:

USER'S EDIT REQUEST:

"${description}"

Your task is to MODIFY the existing template based on the user's request and output a complete, production-ready carousel template configuration as a JSON object.

The user wants to alter the template. Analyze the provided template images and apply the requested changes while maintaining design coherence.

Return the complete template JSON with your modifications applied.` : `You are given ${images.length} reference image(s) of a social media carousel and the user's description:

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
  - MUST include negative prompt instructions: "NEGATIVE PROMPT: Do not draw anything that looks devious, demon, strange, sinister, evil, disturbing, menacing, threatening, horror-themed, scary, or inappropriate. Keep all imagery positive, friendly, and appropriate for social media."

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

CRITICAL: IMAGE GENERATION NEGATIVE PROMPTS (FOR POOMOODOIN AI)

When creating "imagePrompt" and "hookImagePrompt" fields, you MUST include explicit negative prompt instructions that will be sent to Pomoodoin AI.

IMPORTANT: All image prompts MUST explicitly state what should NOT be drawn. This is a NEGATIVE PROMPT requirement.

You MUST append to every image prompt a clear negative prompt section that prohibits:

- Anything that looks devious, sinister, or malicious
- Anything that looks demonic, demon-like, or evil
- Anything that looks strange, disturbing, or unsettling
- Dark, menacing, or threatening imagery
- Horror-themed or scary elements
- Any content that could be considered inappropriate or offensive

Format your image prompts like this:

"imagePrompt": "positive description of the image style and content. NEGATIVE PROMPT: Do not draw anything that looks devious, demon, strange, sinister, evil, disturbing, menacing, threatening, horror-themed, scary, or inappropriate. Keep all imagery positive, friendly, and appropriate for social media."

This negative prompt instruction will be sent directly to Pomoodoin AI to ensure safe, appropriate image generation.

====================================================
3. TYPOGRAPHY & TEXT STYLE
====================================================

FONT SELECTION - USE ANY GOOGLE FONT:

- You can use ANY font from the Google Fonts database (250+ fonts available)
- Choose fonts that visually match the reference carousel style
- Use exact Google Font family names (e.g., "Roboto", "Montserrat", "Lato", "Open Sans", "Poppins", "Playfair Display", "Inter", "Work Sans", "Kalam", "Caveat", "Mansalva", etc.)
- Prioritize visual similarity to the reference - match the style, not a predefined list
- Common Google Fonts include: Roboto, Montserrat, Lato, Open Sans, Poppins, Playfair Display, Inter, Work Sans, Raleway, Source Sans Pro, Nunito, Kalam, Caveat, Mansalva, and many more
- Browse https://fonts.google.com for inspiration, but use the exact family name as it appears on Google Fonts

For each role, pick a Google Font that visually matches what you see in the carousel:

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
8. FONT SELECTION & CONSISTENCY
====================================================

Remember:

- Use ANY Google Font family name from the Google Fonts database (250+ fonts available)
- Choose fonts that visually match the reference carousel style
- Use exact Google Font family names as they appear on https://fonts.google.com
- Examples: "Roboto", "Montserrat", "Lato", "Open Sans", "Poppins", "Playfair Display", "Inter", "Work Sans", "Kalam", "Caveat", "Mansalva", etc.
- Prioritize visual similarity to the reference over any predefined font list

- Try to keep the number of different font families small (1–2 max) unless the design clearly mixes more.

====================================================
9. OUTPUT FORMAT (VERY IMPORTANT)
====================================================

Return ONLY a single JSON object with this overall structure and keys. DO NOT include any explanations or additional text.

{
  "templateName": "Descriptive style name (e.g. 'Muted Minimal Tech', 'Bold Gradient Focus')",
  "fonts": {
    "hook": {
      "family": "Google Font family name (e.g., 'Roboto', 'Montserrat', 'Poppins')",
      "weight": "normal | 500 | bold",
      "style": "normal | italic",
      "size": 100
    },
    "title": {
      "family": "Google Font family name (e.g., 'Roboto', 'Montserrat', 'Poppins')",
      "weight": "normal | 500 | bold",
      "style": "normal | italic",
      "size": 80
    },
    "content": {
      "family": "Google Font family name (e.g., 'Roboto', 'Montserrat', 'Poppins')",
      "weight": "normal | 500 | bold",
      "style": "normal | italic",
      "size": 54
    },
    "hookTopic": {
      "family": "Google Font family name (e.g., 'Roboto', 'Montserrat', 'Poppins')",
      "weight": "normal | 500 | bold",
      "style": "normal | italic",
      "size": 28
    },
    "hookSubtitle": {
      "family": "Google Font family name (e.g., 'Roboto', 'Montserrat', 'Poppins')",
      "weight": "normal | 500 | bold",
      "style": "normal | italic",
      "size": 42
    },
    "hookCTA": {
      "family": "Google Font family name (e.g., 'Roboto', 'Montserrat', 'Poppins')",
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
  "imagePrompt": "Creative DALL·E prompt describing images matching this template. Use {input} as placeholder. NEGATIVE PROMPT: Do not draw anything that looks devious, demon, strange, sinister, evil, disturbing, menacing, threatening, horror-themed, scary, or inappropriate. Keep all imagery positive, friendly, and appropriate for social media.",
  "hookImagePrompt": "Optional: Specific prompt for hook slide images. Use {input} as placeholder. NEGATIVE PROMPT: Do not draw anything that looks devious, demon, strange, sinister, evil, disturbing, menacing, threatening, horror-themed, scary, or inappropriate. Keep all imagery positive, friendly, and appropriate for social media.",
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
  },
  "imagePlacement": {
    "hook": false,
    "content": true,
    "cta": false
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

    const buildFontConfig = (fontConfig: any) => {
      // Font family should be a Google Font family name (e.g., "Roboto", "Montserrat", "Lato")
      const family = fontConfig.family || 'Roboto'
      const weight = fontConfig.weight || 'normal'
      const style = fontConfig.style || 'normal'
      const size = fontConfig.size || 70
      const lineHeight = size * 1.2
      
      return {
        family: family,
        weight: weight,
        style: style,
        cssFont: `${weight} ${style !== 'normal' ? style + ' ' : ''}${size}px "${family}", sans-serif`,
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
      },
      // Image placement configuration - default to images only in content slides
      imagePlacement: templateConfig.imagePlacement || {
        hook: false,
        content: true,
        cta: false
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

    // Mark template generation as used (only for initial generation, not regeneration)
    if (!isRegeneration) {
      console.log('[TEMPLATES/GENERATE] Marking template generation as used for user...')
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({ template_generation_used: true })
        .eq('user_id', userId)

      if (updateError) {
        console.error('[TEMPLATES/GENERATE] Failed to update template_generation_used:', updateError)
        // Don't fail the request, just log the error - template was saved successfully
      } else {
        console.log('[TEMPLATES/GENERATE] Template generation marked as used')
      }
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

