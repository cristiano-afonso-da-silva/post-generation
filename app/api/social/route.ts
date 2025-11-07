import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// ════════════════════════════════════════════════════════════════════════════
// Gemini Configuration
// ════════════════════════════════════════════════════════════════════════════
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

// Model for regular generation (ideas and carousel)
// Note: We'll add responseSchema per request, not globally
const model = genAI.getGenerativeModel({
  model: GEMINI_MODEL,
  generationConfig: {
    temperature: 0.85,
    topP: 0.95,
    topK: 40,
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ════════════════════════════════════════════════════════════════════════════

const wordCount = (text: string): number => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

const safeJsonParse = (text: string) => {
  try {
    return JSON.parse(text);
  } catch (e) {
    // Remove markdown code blocks
    let cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();
    
    // Fix common control character issues in JSON strings
    // Replace literal newlines, tabs, and carriage returns within string values
    try {
      // First attempt: try to parse as-is after removing markdown
      return JSON.parse(cleaned);
    } catch (e2) {
      // Second attempt: escape control characters
      // This regex finds content within quotes and escapes control characters
      cleaned = cleaned.replace(
        /"([^"]*)"/g, 
        (match, content) => {
          // Escape control characters within the string
          const escaped = content
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t')
            .replace(/\f/g, '\\f')
            .replace(/\b/g, '\\b');
          return `"${escaped}"`;
        }
      );
      return JSON.parse(cleaned);
    }
  }
};

const formatToMarkdown = (carousel: any, underlineWords: any = {}) => {
  const lines: string[] = [];
  
  lines.push('═'.repeat(80));
  lines.push(`📝 ${carousel.ideaTitle.toUpperCase()}`);
  lines.push('═'.repeat(80));
  lines.push('');
  
  carousel.slides.forEach((slide: any, index: number) => {
    const slideNum = index + 1;
    const emoji = slide.kind === 'HOOK' ? '🎣' : slide.kind === 'CTA' ? '📢' : '📄';
    
    lines.push(`┌─ Slide ${slideNum}/${carousel.slides.length} ${emoji} ${slide.kind} ${'─'.repeat(Math.max(0, 50 - slideNum.toString().length - slide.kind.length))}`);
    lines.push('│');
    
    if (slide.title) {
      lines.push(`│ 🏷️  ${slide.title}`);
    }
    
    if (slide.content) {
      lines.push(`│ 💬  ${slide.content}`);
    }
    
    if (slide.kind === 'MIDDLE' && underlineWords[index]) {
      const emphasis = underlineWords[index];
      if (emphasis.underline) {
        lines.push(`│ ━ Underline: ${emphasis.underline}`);
      }
      if (emphasis.highlight) {
        lines.push(`│ ✨ Highlight: ${emphasis.highlight}`);
      }
      if (emphasis.underline || emphasis.highlight) {
        lines.push(`│`);
      }
    }
    
    if (slide.kind === 'HOOK' && underlineWords[index]) {
      const emphasis = underlineWords[index];
      if (emphasis.highlight) {
        lines.push(`│ ✨ Highlight: ${emphasis.highlight}`);
        lines.push(`│`);
      }
    }
    
    if (slide.kind === 'CTA' && underlineWords[index]) {
      const emphasis = underlineWords[index];
      if (emphasis.underline) {
        lines.push(`│ ━ Underline: ${emphasis.underline}`);
        lines.push(`│`);
      }
    }
    
    lines.push('└' + '─'.repeat(78));
    lines.push('');
  });
  
  lines.push('═'.repeat(80));
  lines.push('📝 INSTAGRAM CAPTION');
  lines.push('═'.repeat(80));
  lines.push('');
  lines.push(carousel.caption);
  lines.push('');
  lines.push('═'.repeat(80));
  lines.push('📊 STATISTICS');
  lines.push('═'.repeat(80));
  lines.push(`Total Slides: ${carousel.stats.totalSlides}`);
  lines.push(`Hook Words: ${carousel.stats.hookWords}`);
  lines.push(`Middle Slides: ${carousel.stats.middleSlides}`);
  lines.push(`Caption Words: ${carousel.stats.captionWords}`);
  lines.push('═'.repeat(80));
  
  lines.push('');
  lines.push('🎨 GEMINI EMPHASIS EXTRACTION');
  lines.push('═'.repeat(80));
  lines.push('');
  
  Object.keys(underlineWords).forEach(key => {
    const data = underlineWords[key];
    if (data && (data.underline || data.highlight)) {
      const slideNum = parseInt(key) + 1;
      lines.push(`Slide ${slideNum}:`);
      if (data.underline) {
        lines.push(`  ━ Underline: ${data.underline}`);
      }
      if (data.highlight) {
        lines.push(`  ✨ Highlight: ${data.highlight}`);
      }
      lines.push('');
    }
  });
  lines.push('═'.repeat(80));
  
  return lines.join('\n');
};

const formatIdeasToText = (ideas: string[]) => {
  const lines: string[] = [];
  
  lines.push('═'.repeat(80));
  lines.push('💡 POST IDEAS GENERATED');
  lines.push('═'.repeat(80));
  lines.push('');
  
  ideas.forEach((idea, index) => {
    lines.push(`${String(index + 1).padStart(2, ' ')}. ${idea}`);
  });
  
  lines.push('');
  lines.push('═'.repeat(80));
  lines.push(`✅ Generated ${ideas.length} unique post ideas`);
  lines.push('═'.repeat(80));
  
  return lines.join('\n');
};

// ════════════════════════════════════════════════════════════════════════════
// Prompts
// ════════════════════════════════════════════════════════════════════════════

const IDEAS_PROMPT = (accountDescription: string) => `
You are an expert social media strategist with deep knowledge of viral content and engagement patterns.

TASK
Generate 10 highly specific, compelling post idea titles for this account:
"${accountDescription}"

REQUIREMENTS
✓ Each title must be 8-12 words maximum
✓ Titles should be specific and actionable (not vague)
✓ Cover diverse angles: how-to, mistakes, frameworks, case studies, experiments, myths, mindset shifts
✓ No emojis, no numbering, no quotes
✓ Each must be clearly distinct from others (no semantic overlap)
✓ Use plain, direct language
✓ Focus on value delivery and curiosity

EXAMPLES OF GOOD TITLES
- "Why Your Morning Routine Is Sabotaging Your Productivity"
- "The Five Minute Framework That Doubled My Client Base"
- "What I Learned Spending Six Months Without Social Media"

OUTPUT FORMAT
Return ONLY valid JSON matching this exact structure:
{
  "ideas": ["title 1", "title 2", ... "title 10"]
}

Think strategically about what would make someone stop scrolling and engage.
`.trim();

const CAROUSEL_PROMPT = (ideaTitle: string, accountDescription: string) => `
You are an expert Instagram carousel creator. Your posts go viral because they're perfectly structured and valuable.

CONTEXT
Account: ${accountDescription || 'General audience'}
Post Idea: "${ideaTitle}"

TASK
Create a complete carousel with slides and caption that follows these EXACT specifications:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SLIDE 1: HOOK (FIRST SLIDE)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- title: The hook text itself (maximum 10 words)
  * Use simple English - easy to understand, clear, and direct
  * Avoid complex words or jargon
  * Make it attention-grabbing and engaging
- content: "" (leave empty)
- kind: "HOOK"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SLIDES 2-N: MIDDLE CONTENT (2-7 slides)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Each middle slide needs:

TITLE: 2-5 words (clear, punchy)
GOOD: "The Problem", "What Actually Works", "Mistake Three", "Try This Instead"
BAD: "Here's what you need to know about the problem" (too long)

CONTENT: 18-32 words (aim for 20-30 for optimal readability)
GOOD EXAMPLE (24 words):
"Most people pack their mornings with too many rigid tasks, creating stress instead of momentum. When one thing falls apart, the entire day feels ruined."

GOOD EXAMPLE (20 words):
"Focus on one anchor habit that truly energizes you. Everything else should be flexible. This creates consistency without pressure."

BAD EXAMPLE (too short - 12 words):
"Start your day right. Morning routines matter. Build good habits daily."

BAD EXAMPLE (too long - 45 words):
"The problem with morning routines is that most people try to do too many things at once, which creates unnecessary stress and pressure that ends up being counterproductive to what they're trying to achieve in the first place with their morning routine."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAST SLIDE: CALL TO ACTION (CTA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- title: Clear call-to-action (2-5 words)
  GOOD: "Try This Today", "Start Here", "Your Next Step"
  BAD: "Here's what you should do next" (too long)
- content: Specific, actionable text (use imperative verbs)
  GOOD: "Save this post. Pick one anchor habit. Test it for 7 days. Share your results below."
  BAD: "You should probably try to implement these ideas" (vague, not actionable)
- kind: "CTA"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSTAGRAM CAPTION (150-250 words)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Structure:
1. Opening hook (1-2 sentences that expand on the post idea)
2. Main value (2-3 short paragraphs, use line breaks for readability)
3. Call to action (engagement prompt)
4. Relevant hashtags (8-12 hashtags, mix of broad and niche)

Example structure:
"Your morning routine might be working against you. Here's why.

Most people... [insight paragraph]

The shift that changed everything: [solution paragraph]

Try this instead: [actionable advice]

Save this if it resonated. What's your anchor habit? Drop it below 👇

#productivity #morningroutine #habitbuilding #personaldevelopment"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL: You MUST return a JSON object with this EXACT structure. Do not return text, do not add explanations.

Required JSON structure:
{
  "ideaTitle": "string (the original post idea)",
  "slides": [
    {"title": "string", "content": "string", "kind": "HOOK"},
    {"title": "string", "content": "string", "kind": "MIDDLE"},
    {"title": "string", "content": "string", "kind": "MIDDLE"},
    {"title": "string", "content": "string", "kind": "CTA"}
  ],
  "caption": "string (full Instagram caption with hashtags)"
}

The "slides" array is REQUIRED and MUST contain at least 3 slides.
Each slide MUST have: title, content, and kind properties.

QUALITY CHECKLIST
✓ Hook slide has compelling title (max 10 words), empty content
✓ Middle slides have 2-5 word titles and 18-32 word content
✓ Content flows logically and tells a story
✓ CTA is specific and actionable
✓ Caption is 150-250 words
✓ No asterisks, no markdown formatting
✓ Simple, clear English throughout
`.trim();

const CAROUSEL_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    ideaTitle: {
      type: SchemaType.STRING,
      description: "The main title of the carousel"
    },
    slides: {
      type: SchemaType.ARRAY,
      minItems: 4,
      maxItems: 9,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          title: {
            type: SchemaType.STRING,
            description: "Slide title (2-5 words for MIDDLE, ≤10 words for HOOK)"
          },
          content: {
            type: SchemaType.STRING,
            description: "Slide content (18-32 words for MIDDLE slides, empty for HOOK)"
          },
          kind: {
            type: SchemaType.STRING,
            enum: ['HOOK', 'MIDDLE', 'CTA'],
            description: "Slide type"
          }
        },
        required: ['title', 'content', 'kind']
      }
    },
    caption: {
      type: SchemaType.STRING,
      description: "Instagram caption (150-250 words)"
    }
  },
  required: ['ideaTitle', 'slides', 'caption']
};

const IDEAS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    ideas: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      minItems: 10,
      maxItems: 10,
      description: "Array of exactly 10 post idea titles"
    }
  },
  required: ['ideas']
};

const UNDERLINE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    underline: {
      type: SchemaType.STRING,
      description: "Comma-separated phrases to underline (2-4 phrases max)",
      nullable: false,
    },
    highlight: {
      type: SchemaType.STRING,
      description: "Single most important word to highlight with background color (1 word only, no punctuation)",
      nullable: false,
    },
  },
  required: ["underline", "highlight"],
};

// ════════════════════════════════════════════════════════════════════════════
// API Functions
// ════════════════════════════════════════════════════════════════════════════

async function generateIdeas(accountDescription: string) {
  const startTime = Date.now();
  
  try {
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: IDEAS_PROMPT(accountDescription) }]
      }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 800,
        responseMimeType: 'application/json',
        responseSchema: IDEAS_SCHEMA
      }
    });
    
    const responseText = result.response.text();
    const data = safeJsonParse(responseText);
    
    if (!data.ideas || !Array.isArray(data.ideas) || data.ideas.length === 0) {
      throw new Error('Invalid ideas format from Gemini');
    }
    
    const formatted = formatIdeasToText(data.ideas);
    
    return {
      success: true,
      action: 'ideas',
      data: {
        ideas: data.ideas,
        formatted,
      },
      meta: {
        count: data.ideas.length,
        generationTime: `${Date.now() - startTime}ms`,
        model: GEMINI_MODEL,
      }
    };
  } catch (error: any) {
    console.error('Error generating ideas:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate ideas',
    };
  }
}

async function extractUnderlineWords(slides: any[]) {
  const underlineModel = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: UNDERLINE_SCHEMA,
      temperature: 0.4,
    },
  });

  const results: Record<number, any> = {};

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    
    let prompt = '';
    
    if (slide.kind === 'HOOK') {
      if (!slide.title) continue;
      
      prompt = `Analyze this hook slide title and extract emphasis words:

Title: "${slide.title}"

Instructions:
- Extract 1 single word that is most important for emphasis
- The highlight word should be a KEY word that captures attention
- Return the word without any punctuation
- For underline, return empty string (no underlines on hook slides)

Return JSON with:
- underline: "" (empty string for hook slides)
- highlight: "word" (single most important word, no punctuation)`;
    } else if (slide.kind === 'CTA') {
      if (!slide.content) continue;
      
      prompt = `Analyze this CTA slide content and extract emphasis words:

Content: "${slide.content}"

Instructions:
- Extract 2-3 short phrases (2-4 words each) that are most important for emphasis
- These phrases should be ACTION-ORIENTED and impactful
- Return them comma-separated
- For highlight, return empty string (no highlights on CTA slides)

Return JSON with:
- underline: "phrase 1, phrase 2, phrase 3" (2-3 phrases)
- highlight: "" (empty string for CTA slides)`;
    } else if (slide.kind === 'MIDDLE') {
      if (!slide.content) continue;
      
      prompt = `Analyze this middle slide content and extract emphasis words:

Title: "${slide.title}"
Content: "${slide.content}"

Instructions:
- Extract 2-4 short phrases (2-4 words each) that are most important for emphasis
- These phrases should be KEY CONCEPTS or insights
- Return them comma-separated
- Also extract 1 single word that is THE MOST important word in the content
- The highlight word should be without any punctuation

Return JSON with:
- underline: "phrase 1, phrase 2, phrase 3, phrase 4" (2-4 phrases)
- highlight: "word" (single most important word, no punctuation)`;
    }
    
    if (!prompt) continue;
    
    try {
      const result = await underlineModel.generateContent(prompt);
      const responseText = result.response.text();
      
      console.log(`\n🎨 Slide ${i + 1} (${slide.kind}) - Raw Gemini Response:`);
      console.log(responseText);
      
      const parsed = safeJsonParse(responseText);
      
      results[i] = {
        underline: parsed.underline || '',
        highlight: parsed.highlight || '',
      };
      
      console.log(`📝 Extracted:`, results[i]);
      
    } catch (error: any) {
      console.error(`❌ Error extracting emphasis for slide ${i + 1}:`, error.message);
      results[i] = { underline: '', highlight: '' };
    }
  }
  
  return results;
}

async function generateCarousel(ideaTitle: string, accountDescription: string) {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Generating carousel for: "${ideaTitle}"`);
    
    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [{ text: CAROUSEL_PROMPT(ideaTitle, accountDescription) }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
        responseSchema: CAROUSEL_SCHEMA
      }
    });
    
    const responseText = result.response.text();
    
    console.log('📝 Raw Gemini Response Length:', responseText.length);
    
    let data;
    try {
      data = safeJsonParse(responseText);
      console.log('✅ JSON parsed successfully');
      console.log('📊 Slides count:', data.slides?.length || 0);
    } catch (parseError: any) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('📄 Problematic JSON (first 500 chars):', responseText.substring(0, 500));
      throw new Error(`Failed to parse Gemini response: ${parseError.message}`);
    }
    
    if (!data.slides || !Array.isArray(data.slides) || data.slides.length < 4) {
      console.error('❌ Invalid carousel structure!');
      console.error('📊 Received data:', JSON.stringify(data, null, 2));
      throw new Error(`Invalid carousel format: must have at least 4 slides, got ${data.slides?.length || 0}`);
    }
    
    if (data.slides.length > 9) {
      console.warn(`⚠️  Carousel has ${data.slides.length} slides (max 9), trimming...`);
      data.slides = data.slides.slice(0, 9);
    }
    
    // Remove asterisks from all slide content
    if (data.slides && Array.isArray(data.slides)) {
      data.slides.forEach((slide: any) => {
        if (slide.title) {
          slide.title = slide.title.replace(/\*/g, '');
        }
        if (slide.content) {
          slide.content = slide.content.replace(/\*/g, '');
        }
      });
    }
    // Remove asterisks from caption
    if (data.caption) {
      data.caption = data.caption.replace(/\*/g, '');
    }
    
    const underlineWords = await extractUnderlineWords(data.slides);
    
    // Calculate stats before formatting
    const hookWords = data.slides[0]?.title ? wordCount(data.slides[0].title) : 0;
    const middleSlides = data.slides.filter((s: any) => s.kind === 'MIDDLE').length;
    const captionWords = wordCount(data.caption);
    
    // Add stats to data object so formatToMarkdown can use them
    const carouselWithStats = {
      ...data,
      stats: {
        totalSlides: data.slides.length,
        hookWords,
        middleSlides,
        captionWords,
      }
    };
    
    const formatted = formatToMarkdown(carouselWithStats, underlineWords);
    
    return {
      success: true,
      action: 'carousel',
      data: {
        ideaTitle: data.ideaTitle || ideaTitle,
        slides: data.slides,
        caption: data.caption,
        formatted,
        underlineWords,
        stats: {
          totalSlides: data.slides.length,
          hookWords,
          middleSlides,
          captionWords,
        }
      },
      meta: {
        generationTime: `${Date.now() - startTime}ms`,
        model: GEMINI_MODEL,
      }
    };
  } catch (error: any) {
    console.error('Error generating carousel:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate carousel',
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Next.js API Route Handler
// ════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, accountDescription, ideaTitle } = body;
    
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Missing action parameter' },
        { status: 400 }
      );
    }
    
    if (action === 'ideas') {
      if (!accountDescription || typeof accountDescription !== 'string' || accountDescription.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid accountDescription' },
          { status: 400 }
        );
      }
      
      const result = await generateIdeas(accountDescription.trim());
      return NextResponse.json(result);
    }
    
    if (action === 'carousel') {
      if (!ideaTitle || typeof ideaTitle !== 'string' || ideaTitle.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid ideaTitle' },
          { status: 400 }
        );
      }
      
      const result = await generateCarousel(ideaTitle.trim(), accountDescription?.trim() || '');
      return NextResponse.json(result);
    }
    
    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}` },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

