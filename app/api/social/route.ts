import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import {
  IDEAS_PROMPT,
  ONBOARDING_IDEA_PROMPT,
  NOTE_PROMPT,
  getEmphasisPrompt,
  buildAIImagePrompt,
  type AIImageStyle,
  type UserVoice,
  type TemplateLayout
} from '../../config/prompts';
import { GEMINI_MODEL } from '../../config/aiConfig';
import { getCarouselTemplate, extractTemplateLayout } from '../../config/carouselTemplates';
// ════════════════════════════════════════════════════════════════════════════
// API Configuration
// ════════════════════════════════════════════════════════════════════════════
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY in environment variables');
  console.error('   Please add GEMINI_API_KEY to your .env.local file');
} else {
  console.log('✅ GEMINI_API_KEY loaded successfully');
  console.log(`   Key preview: ${GEMINI_API_KEY.substring(0, 10)}...`);
}

if (!PEXELS_API_KEY) {
  console.error('❌ Missing PEXELS_API_KEY in environment variables');
  console.error('   Please add PEXELS_API_KEY to your .env.local file');
} else {
  console.log('✅ PEXELS_API_KEY loaded successfully');
  console.log(`   Key preview: ${PEXELS_API_KEY.substring(0, 10)}...`);
}

// Create Gemini client only if API key is available (will be validated at request time)
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Model for regular generation (ideas and note)
// Note: We'll add responseSchema per request, not globally
// Model will be created per request after validating API key
const getModel = () => {
  if (!genAI) {
    throw new Error('Gemini client not initialized. GEMINI_API_KEY is missing.');
  }
  return genAI.getGenerativeModel({
  model: GEMINI_MODEL,
  generationConfig: {
    temperature: 0.85,
    topP: 0.95,
    topK: 40,
  }
});
};

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
  // Preprocess: Clean up the response
  let cleaned = text
    // Remove markdown code blocks
    .replace(/^```json\s*|\s*```$/g, '')
    .trim();
  
  // Fix unterminated strings by finding and closing them
  // This handles cases where Gemini returns strings with excessive tabs/newlines that break JSON
  let fixed = '';
  let inString = false;
  let escapeNext = false;
  let stringStart = -1;
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNext) {
      fixed += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      fixed += char;
      escapeNext = true;
      continue;
    }
    
    if (char === '"') {
      if (!inString) {
        stringStart = i;
        inString = true;
      } else {
        inString = false;
        stringStart = -1;
      }
      fixed += char;
      continue;
    }
    
    if (inString) {
      // Inside a string: normalize excessive whitespace
      if (char === '\t' || char === '\n' || char === '\r') {
        // Replace tabs/newlines with single space, but avoid multiple spaces in a row
        if (fixed[fixed.length - 1] !== ' ') {
          fixed += ' ';
        }
      } else if (char === '\u0000') {
        // Remove null characters
        continue;
      } else {
        fixed += char;
      }
    } else {
      fixed += char;
    }
  }
  
  // Close any unterminated strings
  if (inString) {
    fixed += '"';
  }
  
  // Use the fixed version for all attempts
  cleaned = fixed;
  
  // Additional cleanup: fix common JSON structural issues
  // First, remove trailing commas (safe to do globally)
  cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
  
  // Fix missing commas between properties (only outside strings)
  let commaFixed = '';
  let inStr = false;
  let escapeNextComma = false;
  let lastChar = '';
  
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    
    if (escapeNextComma) {
      commaFixed += char;
      escapeNextComma = false;
      lastChar = char;
      continue;
    }
    
    if (char === '\\') {
      commaFixed += char;
      escapeNextComma = true;
      lastChar = char;
      continue;
    }
    
    if (char === '"') {
      inStr = !inStr;
      commaFixed += char;
      lastChar = char;
      continue;
    }
    
    if (!inStr) {
      // Outside strings: fix missing commas
      // Only fix obvious cases to avoid breaking valid JSON
      
      // Pattern 1: } or ] followed by " or { (missing comma between objects/arrays)
      if ((lastChar === '}' || lastChar === ']') && (char === '"' || char === '{' || char === '[')) {
        commaFixed += ',';
      }
      // Pattern 2: Closing quote followed by opening quote (likely missing comma)
      // But only if the next non-whitespace is not a colon (which would indicate a key)
      else if (lastChar === '"' && char === '"') {
        let j = i + 1;
        while (j < cleaned.length && /\s/.test(cleaned[j])) j++;
        if (j < cleaned.length && cleaned[j] !== ':') {
          // Look back to find what ended before this quote
          let k = commaFixed.length - 1;
          while (k >= 0 && /\s/.test(commaFixed[k])) k--;
          // If we ended with a quote, }, ], or a value token, we likely need a comma
          if (k >= 0) {
            const prevChar = commaFixed[k];
            const prev4 = k >= 4 ? commaFixed.substring(k-4, k+1) : '';
            const prev5 = k >= 5 ? commaFixed.substring(k-5, k+1) : '';
            if (prevChar === '"' || prevChar === '}' || prevChar === ']' || 
                prev4 === 'true' || prev5 === 'false' || prev4 === 'null' ||
                (prevChar === 'e' && /[0-9]/.test(commaFixed[k-1]))) {
              commaFixed += ',';
            }
          }
        }
      }
    }
    
    commaFixed += char;
    lastChar = char;
  }
  
  cleaned = commaFixed
    // Fix double commas
    .replace(/,,+/g, ',')
    // Remove commas at start of objects/arrays
    .replace(/([{[])\s*,/g, '$1');
  
  // First attempt: try parsing the preprocessed version
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Second attempt: fix control characters and unescaped quotes
    // This is a more sophisticated approach that handles unterminated strings
    try {
        let result = '';
        let inString = false;
        let escapeNext = false;
        let i = 0;
        
        while (i < cleaned.length) {
          const char = cleaned[i];
          
          if (escapeNext) {
            result += char;
            escapeNext = false;
            i++;
            continue;
          }
          
          if (char === '\\') {
            result += char;
            escapeNext = true;
            i++;
            continue;
          }
          
          if (char === '"') {
            inString = !inString;
            result += char;
            i++;
            continue;
          }
          
          if (inString) {
            // Inside a string, escape control characters and unescaped quotes
            if (char === '\n') {
              result += '\\n';
            } else if (char === '\r') {
              result += '\\r';
            } else if (char === '\t') {
              result += '\\t';
            } else if (char === '\f') {
              result += '\\f';
            } else if (char === '\b') {
              result += '\\b';
            } else if (char === '\u0000') {
              // Null character - remove it
              result += '';
            } else {
              result += char;
            }
          } else {
            result += char;
          }
          
          i++;
        }
        
        // If we ended with an unterminated string, try to close it
        if (inString) {
          result += '"';
        }
        
        return JSON.parse(result);
      } catch (e2) {
        // Third attempt: try to find and extract valid JSON from the response
        // Look for JSON object boundaries
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          try {
            let extracted = cleaned.substring(jsonStart, jsonEnd + 1);
            
            // Try to fix unterminated strings in the extracted JSON
            // Find all unterminated strings and close them
            let fixed = '';
            let inStr = false;
            let escaped = false;
            let stringStart = -1;
            
            for (let j = 0; j < extracted.length; j++) {
              const c = extracted[j];
              
              if (escaped) {
                fixed += c;
                escaped = false;
                continue;
              }
              
              if (c === '\\') {
                fixed += c;
                escaped = true;
                continue;
              }
              
              if (c === '"') {
                if (!inStr) {
                  stringStart = j;
                  inStr = true;
                } else {
                  inStr = false;
                  stringStart = -1;
                }
                fixed += c;
                continue;
              }
              
              if (inStr) {
                // Escape control characters inside strings
                if (c === '\n') {
                  fixed += '\\n';
                } else if (c === '\r') {
                  fixed += '\\r';
                } else if (c === '\t') {
                  fixed += '\\t';
                } else if (c === '\f') {
                  fixed += '\\f';
                } else if (c === '\b') {
                  fixed += '\\b';
                } else if (c === '\u0000') {
                  // Remove null characters
                  fixed += '';
                } else {
                  fixed += c;
                }
              } else {
                fixed += c;
              }
            }
            
            // If we ended with an unterminated string, close it
            if (inStr && stringStart !== -1) {
              fixed += '"';
            }
            
            // Remove trailing commas before closing braces/brackets
            fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
            
            return JSON.parse(fixed);
          } catch (e3) {
            // Fourth attempt: more aggressive repair
            try {
              let lastAttempt = cleaned
                // Remove any trailing commas before closing braces/brackets
                .replace(/,(\s*[}\]])/g, '$1')
                // Remove null characters
                .replace(/\u0000/g, '');
              
              // Fix unterminated strings by finding the last unclosed quote
              let repaired = '';
              let inString = false;
              let escaped = false;
              let lastQuotePos = -1;
              
              for (let k = 0; k < lastAttempt.length; k++) {
                const ch = lastAttempt[k];
                
                if (escaped) {
                  repaired += ch;
                  escaped = false;
                  continue;
                }
                
                if (ch === '\\') {
                  repaired += ch;
                  escaped = true;
                  continue;
                }
                
                if (ch === '"') {
                  lastQuotePos = k;
                  inString = !inString;
                  repaired += ch;
                  continue;
                }
                
                if (inString) {
                  // Escape control characters
                  if (ch === '\n' || ch === '\r' || ch === '\t' || ch === '\f' || ch === '\b') {
                    repaired += ch === '\n' ? '\\n' : ch === '\r' ? '\\r' : ch === '\t' ? '\\t' : ch === '\f' ? '\\f' : '\\b';
                  } else if (ch === '\u0000') {
                    // Skip null characters
                  } else {
                    repaired += ch;
                  }
                } else {
                  repaired += ch;
                }
              }
              
              // If string is still open, close it
              if (inString) {
                repaired += '"';
              }
              
              return JSON.parse(repaired);
            } catch (e4) {
              // If all attempts fail, throw the original error with context
              console.error('❌ All JSON parsing attempts failed');
              console.error('📄 Original text length:', text.length);
              console.error('📄 Cleaned text length:', cleaned.length);
              console.error('📄 First 500 chars:', cleaned.substring(0, 500));
              console.error('📄 Last 500 chars:', cleaned.substring(Math.max(0, cleaned.length - 500)));
              
              // Try to extract error position from the error message
              const errorMessage = e4 instanceof Error ? e4.message : String(e4);
              const positionMatch = errorMessage.match(/position (\d+)/);
              if (positionMatch) {
                const pos = parseInt(positionMatch[1], 10);
                const start = Math.max(0, pos - 200);
                const end = Math.min(cleaned.length, pos + 200);
                console.error(`📄 Context around error position ${pos} (chars ${start}-${end}):`);
                console.error(cleaned.substring(start, end));
                console.error('📄 Character at error position:', cleaned[pos] || 'N/A');
                console.error('📄 Character code:', cleaned.charCodeAt(pos) || 'N/A');
              }
              
              throw new Error(`Failed to parse JSON after multiple attempts: ${errorMessage}`);
            }
          }
        } else {
          // If no JSON boundaries found, throw error
          console.error('❌ No JSON boundaries found in response');
          console.error('📄 Response text:', cleaned.substring(0, 1000));
          throw new Error(`Failed to parse JSON after multiple attempts: ${e2 instanceof Error ? e2.message : String(e2)}`);
        }
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
          topic: {
            type: SchemaType.STRING,
            description: "Category label (1-2 words, all caps, only for HOOK carousel)",
            nullable: true
          },
          title: {
            type: SchemaType.STRING,
            description: "Carousel title (2-5 words for MIDDLE, ≤10 words for HOOK). For MIDDLE slides, use empty string \"\" if template doesn't require titles."
          },
          subtitle: {
            type: SchemaType.STRING,
            description: "Subtitle text (3-8 words, only for HOOK carousel)",
            nullable: true
          },
          cta: {
            type: SchemaType.STRING,
            description: "CTA button text (2-3 words, only for HOOK carousel)",
            nullable: true
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
      minItems: 3,
      maxItems: 3,
      description: "Array of exactly 3 post idea titles"
    }
  },
  required: ['ideas']
};

const ONBOARDING_IDEA_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    idea: {
      type: SchemaType.STRING,
      description: "Single personalized post idea title (6-10 words)"
    }
  },
  required: ['idea']
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

async function generateIdeasWithGemini(accountDescription: string) {
  const startTime = Date.now();
  
  try {
    const model = getModel();
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
    console.error('Error generating ideas with Gemini:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate ideas',
    };
  }
}

async function generateIdeas(accountDescription: string) {
  return generateIdeasWithGemini(accountDescription);
}

async function generateOnboardingIdeaWithGemini(
  projectDescription: string,
  topics: string[],
  vibe: string
) {
  const startTime = Date.now();
  
  try {
    const model = getModel();
    const result = await callGeminiWithRetry(model, {
      contents: [{
        role: 'user',
        parts: [{ text: ONBOARDING_IDEA_PROMPT(projectDescription, topics, vibe) }]
      }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 200,
        responseMimeType: 'application/json',
        responseSchema: ONBOARDING_IDEA_SCHEMA
      }
    });
    
    const responseText = result.response.text();
    const data = safeJsonParse(responseText);
    
    if (!data.idea || typeof data.idea !== 'string' || data.idea.trim().length === 0) {
      throw new Error('Invalid idea format from Gemini');
    }
    
    return {
      success: true,
      action: 'onboarding-idea',
      data: {
        idea: data.idea.trim()
      },
      meta: {
        generationTime: `${Date.now() - startTime}ms`,
        model: GEMINI_MODEL,
      }
    };
  } catch (error: any) {
    console.error('Error generating onboarding idea with Gemini:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate onboarding idea',
    };
  }
}

async function generateOnboardingIdea(
  projectDescription: string,
  topics: string[],
  vibe: string
) {
  return generateOnboardingIdeaWithGemini(projectDescription, topics, vibe);
}

// buildAIImagePrompt is now imported from app/config/prompts.ts

async function extractUnderlineWordsWithGemini(carousels: any[]): Promise<Record<number, any>> {
  if (!genAI) {
    throw new Error('Gemini client not initialized. GEMINI_API_KEY is missing.');
  }
  const underlineModel = genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: UNDERLINE_SCHEMA,
      temperature: 0.4,
    },
  });

  const results: Record<number, any> = {};

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
      
      // Ensure imageSearch exists for MIDDLE and HOOK carousels
      let imageSearchKeywords = parsed.imageSearch || '';
      
      // If Gemini didn't provide imageSearch, generate basic keywords from content/title
      // CRITICAL: Always ensure imageSearchKeywords exists for MIDDLE slides to enable image fetching
      if (!imageSearchKeywords || !imageSearchKeywords.trim()) {
        // For HOOK: use title, subtitle, or content
        // For MIDDLE: use content first, then title as fallback
        // For CTA: use title or content
        let sourceText = '';
        if (carousel.kind === 'HOOK') {
          sourceText = carousel.title || carousel.subtitle || carousel.content || '';
        } else if (carousel.kind === 'MIDDLE') {
          sourceText = carousel.content || carousel.title || '';
        } else {
          // CTA
          sourceText = carousel.title || carousel.content || '';
        }
        
        if (sourceText && sourceText.trim()) {
          console.warn(`⚠️  Gemini did not provide imageSearch for ${carousel.kind} carousel ${i + 1}, generating fallback from content...`);
          // Extract first few meaningful words from content/title as fallback
          const words = sourceText.toLowerCase()
            .replace(/[.,!?;:'"]/g, '')
            .split(' ')
            .filter((w: string) => w.length > 3 && !['that', 'this', 'with', 'from', 'have', 'been', 'they', 'their', 'your', 'youre', 'what', 'when', 'where', 'which', 'there', 'these', 'those'].includes(w))
            .slice(0, 4)
            .join(' ');
          imageSearchKeywords = words || (carousel.kind === 'HOOK' ? 'illustration concept' : carousel.kind === 'MIDDLE' ? 'lifestyle product' : 'call to action');
          console.log(`   Generated fallback keywords: "${imageSearchKeywords}"`);
        } else {
          // Even if sourceText is empty, set a default fallback
          console.warn(`⚠️  Gemini did not provide imageSearch for ${carousel.kind} carousel ${i + 1}, and no content available. Using default fallback...`);
          imageSearchKeywords = carousel.kind === 'HOOK' ? 'illustration concept' : carousel.kind === 'MIDDLE' ? 'lifestyle product' : 'call to action';
          console.log(`   Generated default fallback keywords: "${imageSearchKeywords}"`);
        }
      }
      
      // Final safety check: ensure imageSearchKeywords is never empty for MIDDLE slides
      if (carousel.kind === 'MIDDLE' && (!imageSearchKeywords || !imageSearchKeywords.trim())) {
        console.error(`❌ CRITICAL: imageSearchKeywords is still empty for MIDDLE carousel ${i + 1} after fallback generation!`);
        imageSearchKeywords = 'lifestyle product'; // Force a default
        console.log(`   Forced default keywords: "${imageSearchKeywords}"`);
      }
      
      results[i] = {
        underline: parsed.underline || '',
        highlight: parsed.highlight || '',
        imageSearch: imageSearchKeywords,
        imageUrl: null,
        originalImageUrl: null,
      };
      
      console.log(`\n📝 Final extraction result for carousel ${i + 1}:`, JSON.stringify(results[i], null, 2));
      
    } catch (error: any) {
      console.error(`❌ Error extracting emphasis for carousel ${i + 1}:`, error.message);
      // Generate fallback imageSearchKeywords even on error to ensure images can be fetched
      let fallbackKeywords = '';
      if (carousel.kind === 'HOOK') {
        const sourceText = carousel.title || carousel.subtitle || carousel.content || '';
        if (sourceText) {
          const words = sourceText.toLowerCase()
            .replace(/[.,!?;:'"]/g, '')
            .split(' ')
            .filter((w: string) => w.length > 3)
            .slice(0, 4)
            .join(' ');
          fallbackKeywords = words || 'illustration concept';
        } else {
          fallbackKeywords = 'illustration concept';
        }
      } else if (carousel.kind === 'MIDDLE') {
        const sourceText = carousel.content || carousel.title || '';
        if (sourceText) {
          const words = sourceText.toLowerCase()
            .replace(/[.,!?;:'"]/g, '')
            .split(' ')
            .filter((w: string) => w.length > 3)
            .slice(0, 4)
            .join(' ');
          fallbackKeywords = words || 'lifestyle product';
        } else {
          fallbackKeywords = 'lifestyle product';
        }
      } else {
        fallbackKeywords = 'call to action';
      }
      results[i] = { underline: '', highlight: '', imageSearch: fallbackKeywords, imageUrl: null, originalImageUrl: null };
      console.log(`   Generated fallback imageSearchKeywords on error: "${fallbackKeywords}"`);
    }
  }
  
  return results;
}

async function extractUnderlineWords(carousels: any[], includeImages: boolean = true, useAIImages: boolean = false, aiImageStyle: AIImageStyle = 'animated', templateId?: string) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🎨 EXTRACT UNDERLINE WORDS${includeImages ? ' & IMAGES' : ''}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📊 Parameters: includeImages=${includeImages}, useAIImages=${useAIImages}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  // Step 1: Extract underline/highlight words (always needed)
  const results: Record<number, any> = await extractUnderlineWordsWithGemini(carousels);
  
  // Step 2: Fetch images ONLY if includeImages is true
  if (!includeImages) {
    // Text-only mode: just return underline words without images
    return results;
  }
  
  // Image mode: fetch images for eligible carousels
  const usedPexelsIds = new Set<number>();
  const usedPollinationsIds = new Set<string>();
  const template = templateId ? getCarouselTemplate(templateId) : null;
  const defaultImagePlacement = { hook: false, content: true, cta: false };
  const imagePlacement = template?.imagePlacement || defaultImagePlacement;

  for (let i = 0; i < carousels.length; i++) {
    const carousel = carousels[i];
    
    // Ensure results[i] exists
    if (!results[i]) {
      results[i] = {
        underline: '',
        highlight: '',
        imageSearch: '',
        imageUrl: null,
        originalImageUrl: null
      };
    }
    
    const imageSearchKeywords = results[i].imageSearch || '';
    
    // Determine if this slide type should have images
    const slideType = carousel.kind === 'HOOK' ? 'hook' : carousel.kind === 'MIDDLE' ? 'content' : 'cta';
    const templateAllowsImage = slideType === 'hook' ? imagePlacement.hook : 
                                 slideType === 'content' ? imagePlacement.content : false;
    
    // Debug logging for template 4
    if (templateId === 'template4') {
      console.log(`🔍 Template 4 - Carousel ${i + 1} (${carousel.kind}):`);
      console.log(`   imageSearchKeywords: "${imageSearchKeywords}"`);
      console.log(`   slideType: ${slideType}`);
      console.log(`   templateAllowsImage: ${templateAllowsImage}`);
      console.log(`   imagePlacement:`, imagePlacement);
    }
    
    // Simple check: fetch image if keywords exist and template allows it
    if (imageSearchKeywords?.trim() && templateAllowsImage) {
      try {
        if (useAIImages) {
          // Build AI prompt from template or default
          let aiPrompt: string;
          if (templateId && template) {
            if (carousel.kind === 'HOOK' && template.hookImagePrompt) {
              aiPrompt = template.hookImagePrompt.replace('{input}', imageSearchKeywords);
            } else if (template.imagePrompt) {
              aiPrompt = template.imagePrompt.replace('{input}', imageSearchKeywords);
            } else {
              aiPrompt = buildAIImagePrompt(imageSearchKeywords, aiImageStyle);
            }
          } else {
            aiPrompt = buildAIImagePrompt(imageSearchKeywords, aiImageStyle);
          }
          
          const imageResult = await generatePollinationsImage(aiPrompt, usedPollinationsIds);
          results[i].imageUrl = imageResult?.url || null;
          results[i].originalImageUrl = imageResult?.url || null;
          if (imageResult?.id) usedPollinationsIds.add(imageResult.id);
        } else {
          const imageResult = await searchPexelsImage(imageSearchKeywords, usedPexelsIds);
          results[i].originalImageUrl = imageResult?.url || null;
          results[i].imageUrl = imageResult?.url || null;
          if (imageResult?.id) usedPexelsIds.add(imageResult.id);
        }
      } catch (error: any) {
        console.error(`Error fetching image for carousel ${i + 1}:`, error.message);
        results[i].imageUrl = null;
        results[i].originalImageUrl = null;
      }
    } else {
      // No image for this carousel - ensure image fields are set
      results[i].imageUrl = results[i].imageUrl || null;
      results[i].originalImageUrl = results[i].originalImageUrl || null;
    }
  }
  
  // Log summary
  const imagesFetched = Object.values(results).filter((r: any) => r.imageUrl || r.originalImageUrl).length;
  console.log(`✅ Extracted underline words and fetched ${imagesFetched} images`);
  
  return results;
}

async function generateNoteWithGemini(
  ideaTitle: string, 
  accountDescription: string, 
  userVoice?: UserVoice,  // NEW: User's voice preferences (optional for now)
  templateId?: string
) {
  const startTime = Date.now();
  
  try {
    // Get template and extract ONLY layout constraints (NO tone)
    let templateLayout: TemplateLayout | undefined = undefined
    if (templateId) {
      try {
        const template = getCarouselTemplate(templateId)
        templateLayout = extractTemplateLayout(template)
        console.log(`📏 Using template layout from: ${templateId}`)
      } catch (error) {
        console.warn(`⚠️  Failed to load template ${templateId}, using default layout:`, error)
      }
    }
    
    // Use provided userVoice or default
    // TODO: In the future, extract user voice from user profile or account description
    const finalUserVoice: UserVoice = userVoice || {
      tone: 'friendly and conversational, authentic to the user\'s voice',
      sentenceStyle: 'medium length, clear and natural',
      preferWords: [],
      avoidWords: [],
      examples: ''
    }
    
    if (userVoice) {
      console.log(`🎯 Using user's voice: tone="${userVoice.tone}", style="${userVoice.sentenceStyle}"`)
    } else {
      console.log(`🎯 Using default user voice`)
    }
    
    const model = getModel();
    const result = await callGeminiWithRetry(model, {
      contents: [{
        role: 'user',
        parts: [{ 
          text: NOTE_PROMPT(
            ideaTitle, 
            accountDescription, 
            finalUserVoice,  // User voice (TOP PRIORITY)
            templateLayout   // Template layout (length/structure only)
          ) 
        }]
      }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
        responseSchema: NOTE_SCHEMA
      }
    });
    
    const responseText = result.response.text();
    
    // Check if response was truncated
    const candidates = result.response.candidates;
    if (candidates && candidates.length > 0) {
      const finishReason = candidates[0].finishReason;
      if (finishReason && finishReason !== 'STOP') {
        console.warn(`⚠️  Response finish reason: ${finishReason} (might indicate truncation)`);
      }
    }
    
    console.log('📝 Raw Gemini Response Length:', responseText.length);
    
    // Check for potential truncation indicators
    if (responseText.length > 0 && !responseText.trim().endsWith('}')) {
      console.warn('⚠️  Response does not end with closing brace - might be truncated');
    }
    
    let data;
    try {
      data = safeJsonParse(responseText);
      console.log('✅ JSON parsed successfully');
      console.log('📊 Carousels count:', data.slides?.length || 0);
    } catch (parseError: any) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('📄 Problematic JSON (first 500 chars):', responseText.substring(0, 500));
      console.error('📄 Problematic JSON (last 500 chars):', responseText.substring(Math.max(0, responseText.length - 500)));
      
      // Extract position from error if available
      const positionMatch = parseError.message?.match(/position (\d+)/);
      if (positionMatch) {
        const pos = parseInt(positionMatch[1], 10);
        const start = Math.max(0, pos - 200);
        const end = Math.min(responseText.length, pos + 200);
        console.error(`📄 Context around error position ${pos} (chars ${start}-${end}):`);
        console.error(responseText.substring(start, end));
      }
      
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
    
    return {
      success: true,
      action: 'note',
      data: {
        ideaTitle: data.ideaTitle || ideaTitle,
        slides: data.slides,
        caption: data.caption,
      },
      meta: {
        generationTime: `${Date.now() - startTime}ms`,
        model: GEMINI_MODEL,
      }
    };
  } catch (error: any) {
    console.error('Error generating note with Gemini:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate note',
    };
  }
}

async function generateNote(ideaTitle: string, accountDescription: string, includeImages: boolean = true, useAIImages: boolean = false, aiImageStyle: AIImageStyle = 'animated', templateId?: string, userVoice?: UserVoice) {
  const startTime = Date.now();
  
  try {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🚀 GENERATE NOTE FUNCTION`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📝 ideaTitle: "${ideaTitle}"`);
    console.log(`📄 accountDescription: "${accountDescription?.substring(0, 100)}${accountDescription && accountDescription.length > 100 ? '...' : ''}"`);
    console.log(`🖼️ includeImages: ${includeImages}`);
    console.log(`🎨 useAIImages: ${useAIImages}`);
    console.log(`🎭 aiImageStyle: ${aiImageStyle}`);
    console.log(`📋 templateId: ${templateId || 'none'}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // Get note data from Gemini
    console.log(`📡 Step 1: Calling generateNoteWithGemini()...`);
    const noteResult = await generateNoteWithGemini(ideaTitle, accountDescription, userVoice, templateId);
    
    if (!noteResult.success) {
      console.error(`❌ generateNoteWithGemini failed:`, noteResult.error);
      return noteResult;
    }
    
    const data = noteResult.data;
    
    if (!data) {
      console.error(`❌ No data returned from note generation`);
      return {
        success: false,
        error: 'No data returned from note generation',
      };
    }
    
    console.log(`✅ Step 1 complete: Generated ${data.slides?.length || 0} carousels`);
    
    // Step 2: Extract underline words (and fetch images if includeImages is true)
    const underlineWords = await extractUnderlineWords(data.slides, includeImages, useAIImages, aiImageStyle, templateId);
    
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
    
    // Count images in underlineWords
    const imagesInUnderlineWords = Object.values(underlineWords).filter((uw: any) => uw.imageUrl || uw.originalImageUrl).length;
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ GENERATE NOTE COMPLETE`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Summary:`);
    console.log(`   Total slides: ${data.slides.length}`);
    console.log(`   Images in underlineWords: ${imagesInUnderlineWords}/${data.slides.length}`);
    console.log(`   Generation time: ${Date.now() - startTime}ms`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
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
        model: noteResult.meta.model,
      }
    };
  } catch (error: any) {
    console.error(`\n❌ EXCEPTION in generateNote:`);
    console.error(`   Error:`, error);
    console.error(`   Error message:`, error.message);
    console.error(`   Error stack:`, error.stack);
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
    // Validate GEMINI_API_KEY at request time
    if (!GEMINI_API_KEY || GEMINI_API_KEY.trim().length === 0) {
      console.error('❌ GEMINI_API_KEY is missing or empty');
      return NextResponse.json(
        { success: false, error: 'GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { action, accountDescription, ideaTitle, includeImages, useAIImages, aiImageStyle, templateId, userVoice } = body;
    
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
    
    if (action === 'onboarding-idea') {
      const { projectDescription, topics, vibe } = body;
      
      if (!projectDescription || typeof projectDescription !== 'string' || projectDescription.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid projectDescription' },
          { status: 400 }
        );
      }
      
      if (!Array.isArray(topics) || topics.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid topics array' },
          { status: 400 }
        );
      }
      
      if (!vibe || typeof vibe !== 'string' || vibe.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Missing or invalid vibe' },
          { status: 400 }
        );
      }
      
      const result = await generateOnboardingIdea(
        projectDescription.trim(),
        topics,
        vibe.trim()
      );
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
      
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📥 API ROUTE: /api/social - action=note');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📝 ideaTitle:', ideaTitle);
      console.log('📄 accountDescription:', accountDescription?.substring(0, 100) + '...');
      console.log('🖼️ includeImages (raw):', includeImages);
      console.log('🖼️ includeImages (resolved):', shouldIncludeImages);
      console.log('🎨 useAIImages (raw):', useAIImages);
      console.log('🎨 useAIImages (resolved):', shouldUseAIImages);
      console.log('🎭 aiImageStyle (raw):', aiImageStyle);
      console.log('🎭 aiImageStyle (resolved):', resolvedAIStyle);
      console.log('📋 templateId:', templateId);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      const result = await generateNote(ideaTitle.trim(), accountDescription?.trim() || '', shouldIncludeImages, shouldUseAIImages, resolvedAIStyle, templateId, userVoice);
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
      console.log('📋 Backend: Received templateId for refreshSlides =', templateId);

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
        console.log('🖼️ refreshSlides: Calling extractUnderlineWords with shouldIncludeImages =', shouldIncludeImages, 'shouldUseAIImages =', shouldUseAIImages, 'aiImageStyle =', resolvedAIStyle, 'templateId =', templateId);
        const underlineWords = await extractUnderlineWords(sanitizedCarousels, shouldIncludeImages, shouldUseAIImages, resolvedAIStyle, templateId);

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

