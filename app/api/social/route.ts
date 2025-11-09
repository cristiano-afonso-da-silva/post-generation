import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// ════════════════════════════════════════════════════════════════════════════
// API Configuration
// ════════════════════════════════════════════════════════════════════════════
const GEMINI_MODEL = 'gemini-2.0-flash-exp';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY in environment variables');
}

if (!PEXELS_API_KEY) {
  console.error('❌ Missing PEXELS_API_KEY in environment variables');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);

// Model for regular generation (ideas and note)
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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callGeminiWithRetry(
  targetModel: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  request: Parameters<typeof targetModel.generateContent>[0],
  options?: Parameters<typeof targetModel.generateContent>[1],
  attempt = 0,
  maxRetries = 3
) {
  try {
    return await targetModel.generateContent(request, options);
  } catch (error: any) {
    const message = error?.message || '';
    const isQuotaError =
      error?.status === 429 ||
      message.includes('429') ||
      message.toLowerCase().includes('quota') ||
      message.toLowerCase().includes('too many requests');

    if (isQuotaError && attempt < maxRetries) {
      let delayMs = 4000;
      const retryMatch = message.match(/"retryDelay":"(\d+)s"/);
      if (retryMatch && retryMatch[1]) {
        const seconds = parseInt(retryMatch[1], 10);
        if (!Number.isNaN(seconds)) {
          delayMs = Math.max(1000, seconds * 1000);
        }
      }

      console.warn(
        `⚠️  Gemini quota hit (attempt ${attempt + 1}/${maxRetries}). Retrying in ${Math.round(
          delayMs / 1000
        )}s...`
      );
      await sleep(delayMs);
      return callGeminiWithRetry(targetModel, request, options, attempt + 1, maxRetries);
    }

    throw error;
  }
}

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

const formatToMarkdown = (note: any, underlineWords: any = {}) => {
  const lines: string[] = [];
  
  lines.push('═'.repeat(80));
  lines.push(`📝 ${note.ideaTitle.toUpperCase()}`);
  lines.push('═'.repeat(80));
  lines.push('');
  
  note.slides.forEach((carousel: any, index: number) => {
    const carouselNum = index + 1;
    const emoji = carousel.kind === 'HOOK' ? '🎣' : carousel.kind === 'CTA' ? '📢' : '📄';
    
    lines.push(`┌─ Carousel ${carouselNum}/${note.slides.length} ${emoji} ${carousel.kind} ${'─'.repeat(Math.max(0, 50 - carouselNum.toString().length - carousel.kind.length))}`);
    lines.push('│');
    
    if (carousel.title) {
      lines.push(`│ 🏷️  ${carousel.title}`);
    }
    
    if (carousel.content) {
      lines.push(`│ 💬  ${carousel.content}`);
    }
    
    if (carousel.kind === 'MIDDLE' && underlineWords[index]) {
      const emphasis = underlineWords[index];
      if (emphasis.underline) {
        lines.push(`│ ━ Underline: ${emphasis.underline}`);
      }
      if (emphasis.highlight) {
        lines.push(`│ ✨ Highlight: ${emphasis.highlight}`);
      }
      if (emphasis.imageSearch) {
        lines.push(`│ 🔍 Image Search: ${emphasis.imageSearch}`);
      }
      if (emphasis.imageUrl) {
        lines.push(`│ 🖼️  Image URL: ${emphasis.imageUrl}`);
      }
      if (emphasis.underline || emphasis.highlight || emphasis.imageSearch || emphasis.imageUrl) {
        lines.push(`│`);
      }
    }
    
    if (carousel.kind === 'HOOK' && underlineWords[index]) {
      const emphasis = underlineWords[index];
      if (emphasis.highlight) {
        lines.push(`│ ✨ Highlight: ${emphasis.highlight}`);
        lines.push(`│`);
      }
    }
    
    if (carousel.kind === 'CTA' && underlineWords[index]) {
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
  lines.push(note.caption);
  lines.push('');
  lines.push('═'.repeat(80));
  lines.push('📊 STATISTICS');
  lines.push('═'.repeat(80));
  lines.push(`Total Carousels: ${note.stats.totalSlides}`);
  lines.push(`Hook Words: ${note.stats.hookWords}`);
  lines.push(`Content carousels: ${note.stats.middleSlides}`);
  lines.push(`Caption Words: ${note.stats.captionWords}`);
  lines.push('═'.repeat(80));
  
  lines.push('');
  lines.push('🎨 GEMINI EMPHASIS EXTRACTION');
  lines.push('═'.repeat(80));
  lines.push('');
  
  Object.keys(underlineWords).forEach(key => {
    const data = underlineWords[key];
    if (data && (data.underline || data.highlight || data.imageSearch || data.imageUrl)) {
      const carouselNum = parseInt(key) + 1;
      lines.push(`Carousel ${carouselNum}:`);
      if (data.underline) {
        lines.push(`  ━ Underline: ${data.underline}`);
      }
      if (data.highlight) {
        lines.push(`  ✨ Highlight: ${data.highlight}`);
      }
      if (data.imageSearch) {
        lines.push(`  🔍 Image Search: ${data.imageSearch}`);
      }
      if (data.imageUrl) {
        lines.push(`  🖼️  Image URL: ${data.imageUrl}`);
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

const NOTE_PROMPT = (ideaTitle: string, accountDescription: string) => `
You are an expert Instagram note creator. Your posts go viral because they're perfectly structured and valuable.

CONTEXT
Account: ${accountDescription || 'General audience'}
Post Idea: "${ideaTitle}"

TASK
Create a complete note with carousels and caption that follows these EXACT specifications:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAROUSEL 1: HOOK (FIRST CAROUSEL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- title: The hook text itself (maximum 10 words)
  * Use simple English - easy to understand, clear, and direct
  * Avoid complex words or jargon
  * Make it attention-grabbing and engaging
- content: "" (leave empty)
- kind: "HOOK"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAROUSELS 2-N: MIDDLE CONTENT (2-7 carousels)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Each middle carousel needs:

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
LAST CAROUSEL: CALL TO ACTION (CTA)
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

The "slides" array is REQUIRED and MUST contain at least 3 carousels.
Each carousel MUST have: title, content, and kind properties.

QUALITY CHECKLIST
✓ Hook carousel has compelling title (max 10 words), empty content
✓ Middle carousels have 2-5 word titles and 18-32 word content
✓ Content flows logically and tells a story
✓ CTA is specific and actionable
✓ Caption is 150-250 words
✓ No asterisks, no markdown formatting
✓ Simple, clear English throughout
`.trim();

const NOTE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    ideaTitle: {
      type: SchemaType.STRING,
      description: "The main title of the note"
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
            description: "Carousel title (2-5 words for MIDDLE, ≤10 words for HOOK)"
          },
          content: {
            type: SchemaType.STRING,
            description: "Carousel content (18-32 words for MIDDLE carousels, empty for HOOK)"
          },
          kind: {
            type: SchemaType.STRING,
            enum: ['HOOK', 'MIDDLE', 'CTA'],
            description: "Carousel type"
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
};

// ════════════════════════════════════════════════════════════════════════════
// Pexels API Integration
// ════════════════════════════════════════════════════════════════════════════

type PexelsImageResult = {
  url: string | null;
  id: number | null;
};

async function searchPexelsImage(query: string, usedPhotoIds: Set<number>): Promise<PexelsImageResult | null> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🖼️  PEXELS IMAGE SEARCH INITIATED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  if (!PEXELS_API_KEY) {
    console.error('❌ CRITICAL: Pexels API key not configured!');
    console.error('   Please add PEXELS_API_KEY to your .env.local file');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return null;
  }

  console.log(`✓ API Key present: ${PEXELS_API_KEY.substring(0, 10)}...`);
  console.log(`📝 Search Query: "${query}"`);
  console.log(`🔗 Encoded Query: "${encodeURIComponent(query)}"`);

  try {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape&size=large`;
    console.log(`🌐 Request URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    console.log(`📡 Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Pexels API error: ${response.status} ${response.statusText}`);
      console.error(`📄 Error details: ${errorText}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      return null;
    }

    const data = await response.json();
    console.log(`📊 API Response:`, JSON.stringify(data, null, 2));
    
    if (data.photos && data.photos.length > 0) {
      // Ensure we return strictly horizontal images and avoid duplicates
      const HORIZONTAL_RATIO_THRESHOLD = 1.2; // width must be at least 20% wider than height

      const horizontalPhotos = data.photos.filter((photo: any) => {
        if (!photo || typeof photo.width !== 'number' || typeof photo.height !== 'number') {
          return false;
        }
        const ratio = photo.width / photo.height;
        return ratio >= HORIZONTAL_RATIO_THRESHOLD;
      });

      const unusedHorizontal = horizontalPhotos.find((photo: any) => !usedPhotoIds.has(photo.id));
      const fallbackHorizontal = horizontalPhotos[0];
      const unusedAny = data.photos.find((photo: any) => !usedPhotoIds.has(photo.id));
      const fallbackAny = data.photos[0];

      const selectedPhoto = unusedHorizontal || fallbackHorizontal || unusedAny || fallbackAny;

      if (!selectedPhoto) {
        console.warn(`⚠️  Pexels returned photos, but none could be selected (unexpected)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        return null;
      }

      if (usedPhotoIds.has(selectedPhoto.id)) {
        console.log(`ℹ️  All returned photos already used previously. Re-using photo ID ${selectedPhoto.id}`);
      }

      const imageUrl = selectedPhoto.src?.large2x || selectedPhoto.src?.landscape || selectedPhoto.src?.large;

      console.log(`✅ SUCCESS: Found horizontal image!`);
      console.log(`📸 Image URL: ${imageUrl}`);
      console.log(`👤 Photographer: ${selectedPhoto.photographer}`);
      console.log(`🆔 Photo ID: ${selectedPhoto.id}`);
      console.log(`📐 Dimensions: ${selectedPhoto.width}x${selectedPhoto.height}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      if (!imageUrl) {
        return null;
      }
      return { url: imageUrl, id: selectedPhoto.id ?? null };
    }

    console.warn(`⚠️  No images found for query: "${query}"`);
    console.warn(`   This might mean no matching images in Pexels database`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return null;
  } catch (error: any) {
    console.error(`❌ EXCEPTION during Pexels fetch:`);
    console.error(`   Error Type: ${error.constructor.name}`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Stack Trace:`, error.stack);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    return null;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// API Functions
// ════════════════════════════════════════════════════════════════════════════

async function generateIdeas(accountDescription: string) {
  const startTime = Date.now();
  
  try {
    const result = await callGeminiWithRetry(model, {
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

async function extractUnderlineWords(carousels: any[], includeImages: boolean = true) {
  console.log(`\n🎨 Extracting emphasis words and ${includeImages ? '🖼️ images (enabled)' : '📝 NO images (disabled)'}`);
  
  const underlineModel = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: UNDERLINE_SCHEMA,
      temperature: 0.4,
    },
  });

  const results: Record<number, any> = {};
  const usedImageIds = new Set<number>();

  for (let i = 0; i < carousels.length; i++) {
    const carousel = carousels[i];
    
    let prompt = '';
    
    if (carousel.kind === 'HOOK') {
      if (!carousel.title) continue;
      
      prompt = `Analyze this hook carousel title and extract emphasis words:

Title: "${carousel.title}"

Instructions:
- Extract 1 single word that is most important for emphasis
- The highlight word should be a KEY word that captures attention
- Return the word without any punctuation
- For underline and imageSearch, return empty string (no underlines or images on hook carousels)

Return JSON with:
- underline: "" (empty string for hook carousels)
- highlight: "word" (single most important word, no punctuation)
- imageSearch: "" (empty string for hook carousels)`;
    } else if (carousel.kind === 'CTA') {
      if (!carousel.content) continue;
      
      prompt = `Analyze this CTA carousel content and extract emphasis words:

Content: "${carousel.content}"

Instructions:
- Extract 2-3 short phrases (2-4 words each) that are most important for emphasis
- These phrases should be ACTION-ORIENTED and impactful
- Return them comma-separated
- For highlight and imageSearch, return empty string (no highlights or images on CTA carousels)

Return JSON with:
- underline: "phrase 1, phrase 2, phrase 3" (2-3 phrases)
- highlight: "" (empty string for CTA carousels)
- imageSearch: "" (empty string for CTA carousels)`;
    } else if (carousel.kind === 'MIDDLE') {
      if (!carousel.content) continue;
      
      prompt = `Analyze this middle carousel content and extract emphasis words and image search keywords:

Title: "${carousel.title}"
Content: "${carousel.content}"

CRITICAL INSTRUCTIONS:
1. UNDERLINE: Extract 2-4 short phrases (2-4 words each) that are KEY CONCEPTS
- Return them comma-separated
   - Example: "breathable fabric, everyday comfort, lightweight design"

2. HIGHLIGHT: Extract THE MOST important single word
   - Must be without punctuation
   - Example: "comfort"

3. IMAGE SEARCH: Extract 2-4 visual keywords for stock photo search
   - MUST be descriptive, concrete visual terms
   - Think about what IMAGE would represent this content
   - Good examples: "person wearing hoodie", "cotton fabric texture", "winter clothing"
   - Bad examples: "feeling", "concept", "idea" (too abstract)
   - Focus on objects, people, activities that can be photographed

REQUIRED JSON FORMAT (ALL FIELDS MUST BE PRESENT):
{
  "underline": "phrase 1, phrase 2, phrase 3",
  "highlight": "word",
  "imageSearch": "visual keyword1 keyword2 keyword3"
}

The imageSearch field is MANDATORY. Always provide visual search terms.`;
    }
    
    if (!prompt) continue;
    
    try {
      const result = await callGeminiWithRetry(underlineModel, prompt);
      const responseText = result.response.text();
      
      console.log(`\n🎨 Carousel ${i + 1} (${carousel.kind}) - Raw Gemini Response:`);
      console.log(responseText);
      
      const parsed = safeJsonParse(responseText);
      
      console.log(`🔍 Parsed response for carousel ${i + 1}:`, JSON.stringify(parsed, null, 2));
      
      // Ensure imageSearch exists for MIDDLE carousels
      let imageSearchKeywords = parsed.imageSearch || '';
      
      // If Gemini didn't provide imageSearch for MIDDLE carousel, generate basic keywords from content
      if (carousel.kind === 'MIDDLE' && !imageSearchKeywords) {
        console.warn(`⚠️  Gemini did not provide imageSearch for MIDDLE carousel ${i + 1}, generating fallback...`);
        // Extract first few meaningful words from content as fallback
        const words = carousel.content.toLowerCase()
          .replace(/[.,!?;:'"]/g, '')
          .split(' ')
          .filter((w: string) => w.length > 3 && !['that', 'this', 'with', 'from', 'have', 'been', 'they', 'their'].includes(w))
          .slice(0, 4)
          .join(' ');
        imageSearchKeywords = words || 'lifestyle product';
        console.log(`   Generated fallback keywords: "${imageSearchKeywords}"`);
      }
      
      results[i] = {
        underline: parsed.underline || '',
        highlight: parsed.highlight || '',
        imageSearch: imageSearchKeywords,
        imageUrl: null, // Will be populated next
      };
      
      // For MIDDLE carousels, fetch image from Pexels if enabled and we have search keywords
      if (includeImages && carousel.kind === 'MIDDLE' && imageSearchKeywords && imageSearchKeywords.trim()) {
        console.log(`\n🖼️  MIDDLE CAROUSEL ${i + 1}: Attempting to fetch image...`);
        console.log(`   Keywords: "${imageSearchKeywords}"`);
        const imageResult = await searchPexelsImage(imageSearchKeywords, usedImageIds);
        results[i].imageUrl = imageResult?.url || null;
        if (imageResult?.id) {
          usedImageIds.add(imageResult.id);
        }
        if (imageResult?.url) {
          console.log(`✅ SUCCESS: Image added to carousel ${i + 1}`);
        } else {
          console.error(`❌ FAILED: No image URL returned for carousel ${i + 1}`);
        }
      } else if (!includeImages && carousel.kind === 'MIDDLE') {
        console.log(`\n📝 MIDDLE CAROUSEL ${i + 1}: Images disabled by user - skipping image fetch`);
      } else if (carousel.kind === 'MIDDLE') {
        console.log(`\n⚠️  MIDDLE CAROUSEL ${i + 1}: NO imageSearch keywords!`);
        console.log(`   This should not happen with the fallback in place.`);
      }
      
      console.log(`\n📝 Final extraction result for carousel ${i + 1}:`, JSON.stringify(results[i], null, 2));
      
    } catch (error: any) {
      console.error(`❌ Error extracting emphasis for carousel ${i + 1}:`, error.message);
      results[i] = { underline: '', highlight: '', imageSearch: '', imageUrl: null };
    }
  }
  
  return results;
}

async function generateNote(ideaTitle: string, accountDescription: string, includeImages: boolean = true) {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Generating note for: "${ideaTitle}"`);
    
    const result = await callGeminiWithRetry(model, {
      contents: [{
        role: 'user',
        parts: [{ text: NOTE_PROMPT(ideaTitle, accountDescription) }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
        responseSchema: NOTE_SCHEMA
      }
    });
    
    const responseText = result.response.text();
    
    console.log('📝 Raw Gemini Response Length:', responseText.length);
    
    let data;
    try {
      data = safeJsonParse(responseText);
      console.log('✅ JSON parsed successfully');
      console.log('📊 Carousels count:', data.slides?.length || 0);
    } catch (parseError: any) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('📄 Problematic JSON (first 500 chars):', responseText.substring(0, 500));
      throw new Error(`Failed to parse Gemini response: ${parseError.message}`);
    }
    
    if (!data.slides || !Array.isArray(data.slides) || data.slides.length < 4) {
      console.error('❌ Invalid note structure!');
      console.error('📊 Received data:', JSON.stringify(data, null, 2));
      throw new Error(`Invalid note format: must have at least 4 carousels, got ${data.slides?.length || 0}`);
    }
    
    if (data.slides.length > 9) {
      console.warn(`⚠️  Note has ${data.slides.length} carousels (max 9), trimming...`);
      data.slides = data.slides.slice(0, 9);
    }
    
    // Remove asterisks from all carousel content
    if (data.slides && Array.isArray(data.slides)) {
      data.slides.forEach((carousel: any) => {
        if (carousel.title) {
          carousel.title = carousel.title.replace(/\*/g, '');
        }
        if (carousel.content) {
          carousel.content = carousel.content.replace(/\*/g, '');
        }
      });
    }
    // Remove asterisks from caption
    if (data.caption) {
      data.caption = data.caption.replace(/\*/g, '');
    }
    
    const underlineWords = await extractUnderlineWords(data.slides, includeImages);
    
    // Calculate stats before formatting
    const hookWords = data.slides[0]?.title ? wordCount(data.slides[0].title) : 0;
    const middleCarousels = data.slides.filter((c: any) => c.kind === 'MIDDLE').length;
    const captionWords = wordCount(data.caption);
    
    // Add stats to data object so formatToMarkdown can use them
    const noteWithStats = {
      ...data,
      stats: {
        totalSlides: data.slides.length,
        hookWords,
        middleSlides: middleCarousels,
        captionWords,
      }
    };
    
    const formatted = formatToMarkdown(noteWithStats, underlineWords);
    
    return {
      success: true,
      action: 'note',
      data: {
        ideaTitle: data.ideaTitle || ideaTitle,
        slides: data.slides,
        caption: data.caption,
        formatted,
        underlineWords,
        stats: {
          totalSlides: data.slides.length,
          hookWords,
          middleSlides: middleCarousels,
          captionWords,
        }
      },
      meta: {
        generationTime: `${Date.now() - startTime}ms`,
        model: GEMINI_MODEL,
      }
    };
  } catch (error: any) {
    console.error('Error generating note:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate note',
    };
  }
}

// ════════════════════════════════════════════════════════════════════════════
// Next.js API Route Handler
// ════════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, accountDescription, ideaTitle, includeImages } = body;
    
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
    
    if (action === 'note') {
      if (!ideaTitle || typeof ideaTitle !== 'string' || ideaTitle.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid ideaTitle' },
          { status: 400 }
        );
      }
      
      // Default to true if not specified for backward compatibility
      const shouldIncludeImages = includeImages !== undefined ? includeImages : true;
      
      const result = await generateNote(ideaTitle.trim(), accountDescription?.trim() || '', shouldIncludeImages);
      return NextResponse.json(result);
    }

    if (action === 'refreshSlides') {
      const carouselsInput = body.slides;
      const shouldIncludeImages = includeImages !== undefined ? includeImages : true;

      if (!Array.isArray(carouselsInput) || carouselsInput.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid carousels array' },
          { status: 400 }
        );
      }

      const sanitizedCarousels = carouselsInput.map((carousel: any, index: number) => ({
        title: typeof carousel?.title === 'string' ? carousel.title : '',
        content: typeof carousel?.content === 'string' ? carousel.content : '',
        kind: ['HOOK', 'CTA', 'MIDDLE'].includes(carousel?.kind) ? carousel.kind : 'MIDDLE',
        index
      })).map(({ index: _, ...rest }) => rest);

      try {
        const underlineWords = await extractUnderlineWords(sanitizedCarousels, shouldIncludeImages);

        return NextResponse.json({
          success: true,
          action: 'refreshSlides',
          data: {
            slides: sanitizedCarousels,
            underlineWords
          }
        });
      } catch (error: any) {
        console.error('Error refreshing carousels:', error);
        return NextResponse.json(
          { success: false, error: error.message || 'Failed to refresh carousels' },
          { status: 500 }
        );
      }
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

