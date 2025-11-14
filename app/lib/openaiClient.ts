// ════════════════════════════════════════════════════════════════════════════
// OPENAI CLIENT
// ════════════════════════════════════════════════════════════════════════════
// OpenAI API client for GPT-5.1 with functions mirroring Gemini interface

import OpenAI from 'openai';
import { OPENAI_MODEL } from '../config/aiConfig';
import { IDEAS_PROMPT, NOTE_PROMPT, getEmphasisPrompt } from '../config/prompts';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in environment variables');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// ════════════════════════════════════════════════════════════════════════════
// JSON Schema Definitions (OpenAI format)
// ════════════════════════════════════════════════════════════════════════════

const IDEAS_SCHEMA_OPENAI = {
  type: 'object',
  properties: {
    ideas: {
      type: 'array',
      items: { type: 'string' },
      minItems: 3,
      maxItems: 3,
      description: 'Array of exactly 3 post idea titles'
    }
  },
  required: ['ideas'],
  additionalProperties: false
} as const;

const NOTE_SCHEMA_OPENAI = {
  type: 'object',
  properties: {
    ideaTitle: {
      type: 'string',
      description: 'The main title of the note'
    },
    slides: {
      type: 'array',
      minItems: 4,
      maxItems: 9,
      items: {
        type: 'object',
        properties: {
          topic: {
            type: ['string', 'null'],
            description: 'Category label (1-2 words, all caps, only for HOOK carousel)'
          },
          title: {
            type: 'string',
            description: 'Carousel title (2-5 words for MIDDLE, ≤10 words for HOOK)'
          },
          subtitle: {
            type: ['string', 'null'],
            description: 'Subtitle text (3-8 words, only for HOOK carousel)'
          },
          cta: {
            type: ['string', 'null'],
            description: 'CTA button text (2-3 words, only for HOOK carousel)'
          },
          content: {
            type: 'string',
            description: 'Carousel content (18-32 words for MIDDLE carousels, empty for HOOK)'
          },
          kind: {
            type: 'string',
            enum: ['HOOK', 'MIDDLE', 'CTA'],
            description: 'Carousel type'
          }
        },
        // In strict JSON schema mode, required must list *every* property key
        required: ['topic', 'title', 'subtitle', 'cta', 'content', 'kind'],
        additionalProperties: false
      }
    },
    caption: {
      type: 'string',
      description: 'Instagram caption (150-250 words)'
    }
  },
  required: ['ideaTitle', 'slides', 'caption'],
  additionalProperties: false
} as const;

const UNDERLINE_SCHEMA_OPENAI = {
  type: 'object',
  properties: {
    underline: {
      type: 'string',
      description: 'Comma-separated phrases to underline (2-4 phrases max). Can be empty string if not applicable.'
    },
    highlight: {
      type: 'string',
      description: 'Single most important word to highlight with background color (1 word only, no punctuation). Can be empty string if not applicable.'
    },
    imageSearch: {
      type: 'string',
      description: 'REQUIRED for MIDDLE carousels: 2-4 keywords for image search (e.g., "person working laptop", "mountain sunrise"). Must be descriptive visual terms. Empty string for HOOK and CTA carousels.'
    }
  },
  required: ['underline', 'highlight', 'imageSearch'],
  additionalProperties: false
} as const;

// ════════════════════════════════════════════════════════════════════════════
// Utility Functions
// ════════════════════════════════════════════════════════════════════════════

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callOpenAIWithRetry(
  request: Parameters<typeof openai.chat.completions.create>[0],
  attempt = 0,
  maxRetries = 3
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  try {
    return await openai.chat.completions.create(request);
  } catch (error: any) {
    const message = error?.message || '';
    const isQuotaError =
      error?.status === 429 ||
      error?.code === 'rate_limit_exceeded' ||
      message.includes('429') ||
      message.toLowerCase().includes('quota') ||
      message.toLowerCase().includes('too many requests') ||
      message.toLowerCase().includes('rate limit');

    if (isQuotaError && attempt < maxRetries) {
      let delayMs = 4000;
      // Check for retry-after header
      if (error?.response?.headers?.['retry-after']) {
        const seconds = parseInt(error.response.headers['retry-after'], 10);
        if (!Number.isNaN(seconds)) {
          delayMs = Math.max(1000, seconds * 1000);
        }
      }

      console.warn(
        `⚠️  OpenAI quota/rate limit hit (attempt ${attempt + 1}/${maxRetries}). Retrying in ${Math.round(
          delayMs / 1000
        )}s...`
      );
      await sleep(delayMs);
      return callOpenAIWithRetry(request, attempt + 1, maxRetries);
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
    try {
      // First attempt: try to parse as-is after removing markdown
      return JSON.parse(cleaned);
    } catch (e2) {
      // Second attempt: escape control characters
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

// ════════════════════════════════════════════════════════════════════════════
// OpenAI API Functions
// ════════════════════════════════════════════════════════════════════════════

export async function generateIdeasWithOpenAI(accountDescription: string) {
  const startTime = Date.now();
  
  try {
    const response = await callOpenAIWithRetry({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: IDEAS_PROMPT(accountDescription)
        }
      ],
      temperature: 0.9,
      max_completion_tokens: 800,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ideas_response',
          strict: true,
          schema: IDEAS_SCHEMA_OPENAI
        }
      }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    
    const data = safeJsonParse(content);
    
    if (!data.ideas || !Array.isArray(data.ideas) || data.ideas.length === 0) {
      throw new Error('Invalid ideas format from OpenAI');
    }
    
    return {
      success: true,
      action: 'ideas',
      data: {
        ideas: data.ideas,
        formatted: formatIdeasToText(data.ideas),
      },
      meta: {
        count: data.ideas.length,
        generationTime: `${Date.now() - startTime}ms`,
        model: OPENAI_MODEL,
      }
    };
  } catch (error: any) {
    console.error('Error generating ideas with OpenAI:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate ideas',
    };
  }
}

export async function generateNoteWithOpenAI(
  ideaTitle: string,
  accountDescription: string
) {
  const startTime = Date.now();
  
  try {
    console.log(`🚀 Generating note with OpenAI for: "${ideaTitle}"`);
    
    const response = await callOpenAIWithRetry({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'user',
          content: NOTE_PROMPT(ideaTitle, accountDescription)
        }
      ],
      temperature: 0.8,
      max_completion_tokens: 2000,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'note_response',
          strict: true,
          schema: NOTE_SCHEMA_OPENAI
        }
      }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }
    
    console.log('📝 Raw OpenAI Response Length:', content.length);
    
    let data;
    try {
      data = safeJsonParse(content);
      console.log('✅ JSON parsed successfully');
      console.log('📊 Carousels count:', data.slides?.length || 0);
    } catch (parseError: any) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('📄 Problematic JSON (first 500 chars):', content.substring(0, 500));
      throw new Error(`Failed to parse OpenAI response: ${parseError.message}`);
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
        model: OPENAI_MODEL,
      }
    };
  } catch (error: any) {
    console.error('Error generating note with OpenAI:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate note',
    };
  }
}

export async function extractUnderlineWordsWithOpenAI(
  carousels: any[]
): Promise<Record<number, any>> {
  console.log(`\n🎨 Extracting emphasis words with OpenAI`);
  
  const results: Record<number, any> = {};

  for (let i = 0; i < carousels.length; i++) {
    const carousel = carousels[i];
    
    // Get prompt from centralized prompts config
    const prompt = getEmphasisPrompt(carousel.kind, carousel.title, carousel.content);
    
    if (!prompt) continue;
    
    try {
      const response = await callOpenAIWithRetry({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.4,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'emphasis_response',
            strict: true,
            schema: UNDERLINE_SCHEMA_OPENAI
          }
        }
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }
      
      console.log(`\n🎨 Carousel ${i + 1} (${carousel.kind}) - Raw OpenAI Response:`);
      console.log(content);
      
      const parsed = safeJsonParse(content);
      
      console.log(`🔍 Parsed response for carousel ${i + 1}:`, JSON.stringify(parsed, null, 2));
      
      // Ensure imageSearch exists for MIDDLE carousels
      let imageSearchKeywords = parsed.imageSearch || '';
      
      // If OpenAI didn't provide imageSearch for MIDDLE carousel, generate basic keywords from content
      if (carousel.kind === 'MIDDLE' && !imageSearchKeywords) {
        console.warn(`⚠️  OpenAI did not provide imageSearch for MIDDLE carousel ${i + 1}, generating fallback...`);
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
      
      console.log(`\n📝 Final extraction result for carousel ${i + 1}:`, JSON.stringify(results[i], null, 2));
      
    } catch (error: any) {
      console.error(`❌ Error extracting emphasis for carousel ${i + 1}:`, error.message);
      results[i] = { underline: '', highlight: '', imageSearch: '', imageUrl: null, originalImageUrl: null };
    }
  }
  
  return results;
}

// ════════════════════════════════════════════════════════════════════════════
// Formatting Utilities (matching Gemini implementation)
// ════════════════════════════════════════════════════════════════════════════

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


