import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import {
  IDEAS_PROMPT,
  NOTE_PROMPT,
  getEmphasisPrompt,
  buildAIImagePrompt,
  type AIImageStyle
} from '../config/prompts';
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
  console.error('   Please add PEXELS_API_KEY to your .env.local file');
} else {
  console.log('✅ PEXELS_API_KEY loaded successfully');
  console.log(`   Key preview: ${PEXELS_API_KEY.substring(0, 10)}...`);
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

// Prompts are now imported from app/config/prompts.ts

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
// Image API Integration (Pexels & Pollinations.AI)
// ════════════════════════════════════════════════════════════════════════════

type PexelsImageResult = {
  url: string | null;
  id: number | null;
};

type PollinationsImageResult = {
  url: string | null;
  id: string | null;
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

/**
 * Generate AI image using Pollinations.AI
 * Simple API that generates images from text prompts
 * 
 * API Documentation: https://pollinations.ai/
 * Usage: https://image.pollinations.ai/prompt/{prompt}?width={w}&height={h}&seed={s}&nologo=true
 * 
 * Benefits:
 * - No API key required (free to use)
 * - Generates unique images based on text descriptions
 * - Perfect for creating custom visuals that match carousel content
 * - 16:9 aspect ratio (1920x1080) optimized for Instagram carousels
 * 
 * IMPORTANT: Pollinations.AI returns images directly, not JSON
 * The URL itself IS the image - no need to parse response
 */
async function generatePollinationsImage(prompt: string, usedImageIds: Set<string>): Promise<PollinationsImageResult | null> {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎨 POLLINATIONS.AI IMAGE GENERATION INITIATED');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  console.log(`📝 Prompt: "${prompt}"`);
  console.log(`🔗 Encoded Prompt: "${encodeURIComponent(prompt)}"`);

  try {
    // Pollinations.AI simple API - the URL IS the image
    // Add parameters for better quality: width, height, and seed for consistency
    const seed = Math.floor(Math.random() * 1000000); // Random seed for variety
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1920&height=1080&seed=${seed}&nologo=true`;
    
    console.log(`🌐 Generated Image URL: ${imageUrl}`);
    
    // Pollinations.AI generates images on-demand, so we don't need to test
    // The URL itself will generate and return the image when accessed
    // Just return the URL immediately
    
    const imageId = `pollinations-${seed}`;
    
    console.log(`✅ SUCCESS: AI image URL generated!`);
    console.log(`🖼️ Image URL: ${imageUrl}`);
    console.log(`🆔 Image ID: ${imageId}`);
    console.log(`📐 Dimensions: 1920x1080 (16:9 aspect ratio)`);
    console.log(`ℹ️  Note: Image will be generated when URL is accessed`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    return { url: imageUrl, id: imageId };
  } catch (error: any) {
    console.error(`❌ EXCEPTION during Pollinations.AI URL generation:`);
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

// buildAIImagePrompt is now imported from app/config/prompts.ts

async function extractUnderlineWords(carousels: any[], includeImages: boolean = true, useAIImages: boolean = false, aiImageStyle: AIImageStyle = 'animated') {
  const imageSource = useAIImages ? 'Pollinations.AI (AI-generated)' : 'Pexels (stock photos)';
  console.log(`\n🎨 Extracting emphasis words and ${includeImages ? `🖼️ images from ${imageSource} (enabled)` : '📝 NO images (disabled)'}`);
  
  const underlineModel = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: UNDERLINE_SCHEMA,
      temperature: 0.4,
    },
  });

  const results: Record<number, any> = {};
  const usedPexelsIds = new Set<number>();
  const usedPollinationsIds = new Set<string>();

  for (let i = 0; i < carousels.length; i++) {
    const carousel = carousels[i];
    
    // Get prompt from centralized prompts config
    const prompt = getEmphasisPrompt(carousel.kind, carousel.title, carousel.content);
    
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
        imageUrl: null,
        originalImageUrl: null,
      };
      
      // For MIDDLE carousels, fetch image if enabled and we have search keywords
      if (includeImages && carousel.kind === 'MIDDLE' && imageSearchKeywords && imageSearchKeywords.trim()) {
        console.log(`\n🖼️  MIDDLE CAROUSEL ${i + 1}: Attempting to fetch image...`);
        console.log(`   Keywords: "${imageSearchKeywords}"`);
        console.log(`   includeImages flag: ${includeImages}`);
        console.log(`   useAIImages flag: ${useAIImages}`);
        console.log(`   carousel.kind: ${carousel.kind}`);
        console.log(`   imageSearchKeywords.trim(): "${imageSearchKeywords.trim()}"`);
        
        try {
          if (useAIImages) {
            // Use Pollinations.AI to generate an image based on the description
            console.log(`   Using Pollinations.AI for AI-generated image`);
            
            // Create a more detailed prompt based on the selected AI style
            const aiPrompt = buildAIImagePrompt(imageSearchKeywords, aiImageStyle);
            
            const imageResult = await generatePollinationsImage(aiPrompt, usedPollinationsIds);
            
            // Use the Pollinations URL directly (no proxy needed - Pollinations supports CORS)
            results[i].imageUrl = imageResult?.url || null;
            results[i].originalImageUrl = imageResult?.url || null;
            
            if (imageResult?.id) {
              usedPollinationsIds.add(imageResult.id);
            }
            if (imageResult?.url) {
              console.log(`✅ SUCCESS: AI-generated image added to carousel ${i + 1}`);
              console.log(`   Image URL: ${imageResult.url}`);
              console.log(`   ℹ️  Using direct Pollinations URL (supports CORS)`);
            } else {
              console.error(`❌ FAILED: No image URL returned from Pollinations.AI for carousel ${i + 1}`);
              console.error(`   This could mean: API error or network issue`);
              results[i].imageUrl = null;
              results[i].originalImageUrl = null;
            }
          } else {
            // Use Pexels to search for stock photos
            console.log(`   Using Pexels for stock photo search`);
            
            const imageResult = await searchPexelsImage(imageSearchKeywords, usedPexelsIds);
            results[i].originalImageUrl = imageResult?.url || null;
            results[i].imageUrl = imageResult?.url || null;
            if (imageResult?.id) {
              usedPexelsIds.add(imageResult.id);
            }
            if (imageResult?.url) {
              console.log(`✅ SUCCESS: Stock image added to carousel ${i + 1}`);
              console.log(`   Image URL: ${imageResult.url}`);
            } else {
              console.error(`❌ FAILED: No image URL returned from Pexels for carousel ${i + 1}`);
              console.error(`   Pexels API returned:`, imageResult);
              console.error(`   This could mean: API key issue, rate limit, or no matching images`);
              results[i].imageUrl = null;
              results[i].originalImageUrl = null;
            }
          }
        } catch (imageError: any) {
          console.error(`❌ EXCEPTION during image fetch for carousel ${i + 1}:`);
          console.error(`   Error:`, imageError);
          console.error(`   Error message:`, imageError?.message);
          console.error(`   Stack:`, imageError?.stack);
          results[i].imageUrl = null;
          results[i].originalImageUrl = null;
        }
      } else {
        // Log why image fetch was skipped
        if (carousel.kind === 'MIDDLE') {
          if (!includeImages) {
            console.log(`\n📝 MIDDLE CAROUSEL ${i + 1}: Images disabled by user (includeImages=${includeImages}) - skipping image fetch`);
          } else if (!imageSearchKeywords || !imageSearchKeywords.trim()) {
            console.log(`\n⚠️  MIDDLE CAROUSEL ${i + 1}: NO imageSearch keywords!`);
            console.log(`   includeImages: ${includeImages}`);
            console.log(`   imageSearchKeywords: "${imageSearchKeywords}"`);
            console.log(`   This should not happen with the fallback in place.`);
          } else {
            console.log(`\n⚠️  MIDDLE CAROUSEL ${i + 1}: Unexpected condition - image fetch skipped`);
            console.log(`   includeImages: ${includeImages}`);
            console.log(`   carousel.kind: ${carousel.kind}`);
            console.log(`   imageSearchKeywords: "${imageSearchKeywords}"`);
          }
        }
      }
      
      console.log(`\n📝 Final extraction result for carousel ${i + 1}:`, JSON.stringify(results[i], null, 2));
      
    } catch (error: any) {
      console.error(`❌ Error extracting emphasis for carousel ${i + 1}:`, error.message);
      results[i] = { underline: '', highlight: '', imageSearch: '', imageUrl: null, originalImageUrl: null };
    }
  }
  
  return results;
}

async function generateNote(ideaTitle: string, accountDescription: string, includeImages: boolean = true, useAIImages: boolean = false, aiImageStyle: AIImageStyle = 'animated') {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Generating note for: "${ideaTitle}"`);
    console.log(`🖼️ generateNote: includeImages parameter =`, includeImages);
    console.log(`🎨 generateNote: useAIImages parameter =`, useAIImages);
    console.log(`🎭 generateNote: aiImageStyle parameter =`, aiImageStyle);
    
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
    
    console.log(`🖼️ generateNote: Calling extractUnderlineWords with includeImages =`, includeImages, 'useAIImages =', useAIImages, 'aiImageStyle =', aiImageStyle);
    const underlineWords = await extractUnderlineWords(data.slides, includeImages, useAIImages, aiImageStyle);
    
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
    const { action, accountDescription, ideaTitle, includeImages, useAIImages, aiImageStyle } = body;
    
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
      const shouldUseAIImages = useAIImages !== undefined ? useAIImages : false;
      const resolvedAIStyle: AIImageStyle = shouldUseAIImages && (aiImageStyle === 'surreal' || aiImageStyle === 'animated') ? aiImageStyle : 'animated';
      console.log('🖼️ Backend: Received includeImages =', includeImages, '→ Using shouldIncludeImages =', shouldIncludeImages);
      console.log('🎨 Backend: Received useAIImages =', useAIImages, '→ Using shouldUseAIImages =', shouldUseAIImages);
      console.log('🎭 Backend: Using AI image style =', resolvedAIStyle);
      
      const result = await generateNote(ideaTitle.trim(), accountDescription?.trim() || '', shouldIncludeImages, shouldUseAIImages, resolvedAIStyle);
      return NextResponse.json(result);
    }

    if (action === 'refreshSlides') {
      const carouselsInput = body.slides;
      const shouldIncludeImages = includeImages !== undefined ? includeImages : true;
      const shouldUseAIImages = useAIImages !== undefined ? useAIImages : false;
      const resolvedAIStyle: AIImageStyle = shouldUseAIImages && (aiImageStyle === 'surreal' || aiImageStyle === 'animated') ? aiImageStyle : 'animated';
      console.log('🖼️ Backend: Received includeImages for refreshSlides =', includeImages, '→ Using shouldIncludeImages =', shouldIncludeImages);
      console.log('🎨 Backend: Received useAIImages for refreshSlides =', useAIImages, '→ Using shouldUseAIImages =', shouldUseAIImages);
      console.log('🎭 Backend: Using AI image style for refreshSlides =', resolvedAIStyle);

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
        console.log('🖼️ refreshSlides: Calling extractUnderlineWords with shouldIncludeImages =', shouldIncludeImages, 'shouldUseAIImages =', shouldUseAIImages, 'aiImageStyle =', resolvedAIStyle);
        const underlineWords = await extractUnderlineWords(sanitizedCarousels, shouldIncludeImages, shouldUseAIImages, resolvedAIStyle);

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

