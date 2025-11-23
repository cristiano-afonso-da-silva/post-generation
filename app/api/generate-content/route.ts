import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { GEMINI_MODEL } from '../../config/aiConfig'
import { getEmphasisPrompt } from '../../config/prompts'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

const getModel = () => {
  if (!genAI) {
    throw new Error('Gemini client not initialized. GEMINI_API_KEY is missing.')
  }
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
  })
}

const UNDERLINE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    underline: {
      type: SchemaType.STRING,
      description: "Comma-separated phrases to underline (2-4 phrases max). Can be empty string if not applicable.",
    },
    highlight: {
      type: SchemaType.STRING,
      description: "Single most important word to highlight with background color (1 word only, no punctuation). Can be empty string if not applicable.",
    },
    imageSearch: {
      type: SchemaType.STRING,
      description: "REQUIRED for MIDDLE carousels: 2-4 keywords for image search (e.g., 'person working laptop', 'mountain sunrise'). Must be descriptive visual terms. Empty string for HOOK and CTA carousels.",
    },
  },
  required: ["underline", "highlight", "imageSearch"],
}

const safeJsonParse = (text: string): any => {
  try {
    return JSON.parse(text)
  } catch (e) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1])
    }
    throw e
  }
}

const CONTENT_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    slides: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          kind: {
            type: SchemaType.STRING,
            enum: ['HOOK', 'MIDDLE', 'CTA'],
            description: 'The type of slide'
          },
          topic: {
            type: SchemaType.STRING,
            nullable: true,
            description: 'Topic for HOOK slide (1-2 words)'
          },
          title: {
            type: SchemaType.STRING,
            description: 'Title text for the slide'
          },
          subtitle: {
            type: SchemaType.STRING,
            nullable: true,
            description: 'Subtitle for HOOK slide (3-8 words)'
          },
          cta: {
            type: SchemaType.STRING,
            nullable: true,
            description: 'CTA text for HOOK slide (2-3 words)'
          },
          content: {
            type: SchemaType.STRING,
            description: 'Content text for the slide'
          }
        },
        required: ['kind', 'title', 'content']
      }
    }
  },
  required: ['slides']
}

const generateContentPrompt = (websiteText: string) => `
You are an expert social media content creator specializing in engaging carousel posts.

TASK
Generate a 3-slide carousel based on this website content:
"${websiteText}"

REQUIREMENTS
✓ Create exactly 3 slides: HOOK, MIDDLE, and CTA
✓ HOOK slide must include: topic (1-2 words), title (6-12 words, engaging), subtitle (3-8 words), cta (2-3 words), empty content
✓ MIDDLE slide must include: title (2-5 words), content (18-32 words)
✓ CTA slide must include: title (2-5 words), content (actionable, 15-25 words)
✓ Content should be authentic and relevant to the website
✓ Use simple, clear English
✓ NO dashes (-) or semicolons (;) anywhere
✓ Make it engaging and valuable

OUTPUT FORMAT
Return ONLY valid JSON with this structure:
{
  "slides": [
    {"kind": "HOOK", "topic": "string", "title": "string", "subtitle": "string", "cta": "string", "content": ""},
    {"kind": "MIDDLE", "title": "string", "content": "string"},
    {"kind": "CTA", "title": "string", "content": "string"}
  ]
}
`.trim()

export async function POST(request: NextRequest) {
  try {
    const { websiteText } = await request.json()
    
    if (!websiteText || typeof websiteText !== 'string' || !websiteText.trim()) {
      return NextResponse.json(
        { error: 'Missing or invalid websiteText parameter' },
        { status: 400 }
      )
    }
    
    console.log(`[GENERATE-CONTENT] Generating carousel content from website text (${websiteText.length} chars)`)
    
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      )
    }
    
    const model = getModel()
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: generateContentPrompt(websiteText) }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
        responseSchema: CONTENT_SCHEMA
      }
    })
    
    const responseText = result.response.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      console.error('[GENERATE-CONTENT] Failed to parse JSON:', responseText)
      throw new Error('Failed to parse AI response')
    }
    
    if (!data.slides || !Array.isArray(data.slides) || data.slides.length !== 3) {
      throw new Error('Invalid response format: expected 3 slides')
    }
    
    console.log(`[GENERATE-CONTENT] Successfully generated 3 slides`)
    
    // Extract underline/highlight words for each slide
    const underlineWords: Record<number, { underline: string; highlight: string; imageSearch: string }> = {}
    const underlineModel = getModel()
    
    for (let i = 0; i < data.slides.length; i++) {
      const slide = data.slides[i]
      const prompt = getEmphasisPrompt(slide.kind, slide.title, slide.content)
      
      if (!prompt) {
        underlineWords[i] = { underline: '', highlight: '', imageSearch: '' }
        continue
      }
      
      try {
        const result = await underlineModel.generateContent({
          contents: [{
            role: 'user',
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: UNDERLINE_SCHEMA,
            temperature: 0.4,
          }
        })
        
        const responseText = result.response.text()
        const parsed = safeJsonParse(responseText)
        
        underlineWords[i] = {
          underline: parsed.underline || '',
          highlight: parsed.highlight || '',
          imageSearch: parsed.imageSearch || ''
        }
        
        console.log(`[GENERATE-CONTENT] Extracted emphasis for slide ${i + 1} (${slide.kind}):`, underlineWords[i])
      } catch (err: any) {
        console.error(`[GENERATE-CONTENT] Error extracting emphasis for slide ${i + 1}:`, err.message)
        underlineWords[i] = { underline: '', highlight: '', imageSearch: '' }
      }
    }
    
    return NextResponse.json({
      success: true,
      slides: data.slides,
      underlineWords: underlineWords
    })
    
  } catch (error: any) {
    console.error('Error generating content:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate carousel content' },
      { status: 500 }
    )
  }
}

