// server.mjs
import 'dotenv/config';
import express from 'express';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

const app = express();
app.use(express.json());

// ════════════════════════════════════════════════════════════════════════════
// CORS Configuration
// ════════════════════════════════════════════════════════════════════════════
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Allow localhost on any port for development
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:5173'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!origin || origin.includes('localhost') || origin.includes('127.0.0.1')) {
    // Allow any localhost origin in development
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ════════════════════════════════════════════════════════════════════════════
// Gemini Configuration
// ════════════════════════════════════════════════════════════════════════════
// Gemini 2.x models (try these if one doesn't work):
//   - gemini-2.0-flash-exp (experimental, latest features)
//   - gemini-2.0-flash (stable Gemini 2.0)
//   - gemini-2.5-pro (Gemini 2.5, if available)
//   - gemini-2.5-flash (Gemini 2.5 flash, if available)
const GEMINI_MODEL = 'gemini-2.0-flash-exp'; // Latest Gemini 2.0 experimental
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ Missing GEMINI_API_KEY in .env file');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
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

/**
 * Count words in a string
 */
const wordCount = (text) => {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
};

/**
 * Safely parse JSON from Gemini response
 */
const safeJsonParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/^```json\s*|\s*```$/g, '').trim();
    return JSON.parse(cleaned);
  }
};

/**
 * Format carousel data to Markdown for display
 */
const formatToMarkdown = (carousel) => {
  const lines = [];
  
  // Title
  lines.push('═'.repeat(80));
  lines.push(`📝 ${carousel.ideaTitle.toUpperCase()}`);
  lines.push('═'.repeat(80));
  lines.push('');
  
  // Slides
  carousel.slides.forEach((slide, index) => {
    const slideNum = index + 1;
    const totalSlides = carousel.slides.length;
    
    let slideType = '';
    if (slide.kind === 'HOOK') {
      slideType = '🎣 HOOK';
    } else if (slide.kind === 'CTA') {
      slideType = '📢 CALL TO ACTION';
    } else {
      slideType = `📄 CONTENT ${slideNum - 1}/${totalSlides - 2}`;
    }
    
    lines.push(`┌─ Slide ${slideNum}/${totalSlides} ${slideType} ─────────────────────────────────`);
    
    // For hook slides, show ONLY the hook text from title field
    if (slide.kind === 'HOOK') {
      // Hook slide - just the hook text from title field
      lines.push(`│`);
      lines.push(`│ ${slide.title.trim()}`);
      lines.push(`│`);
    } else {
      // Other slides - show title and content
      lines.push(`│`);
      lines.push(`│ 🏷️  ${slide.title}`);
      lines.push(`│`);
      
      // Wrap content text
      const words = slide.content.split(' ');
      let currentLine = '│ 💬  ';
      words.forEach(word => {
        if ((currentLine + word).length > 78) {
          lines.push(currentLine);
          currentLine = '│     ' + word + ' ';
        } else {
          currentLine += word + ' ';
        }
      });
      if (currentLine.trim() !== '│') {
        lines.push(currentLine);
      }
      lines.push(`│`);
    }
    lines.push(`└${'─'.repeat(78)}`);
    lines.push('');
  });
  
  // Caption
  lines.push('═'.repeat(80));
  lines.push('📱 INSTAGRAM CAPTION');
  lines.push('═'.repeat(80));
  lines.push('');
  
  const captionLines = carousel.caption.split('\n');
  captionLines.forEach(line => {
    if (line.trim()) {
      lines.push(line);
    }
  });
  
  lines.push('');
  lines.push('═'.repeat(80));
  
  return lines.join('\n');
};

/**
 * Format ideas to a beautiful list
 */
const formatIdeasToText = (ideas) => {
  const lines = [];
  
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
// Prompts - Carefully Crafted for Quality
// ════════════════════════════════════════════════════════════════════════════

const IDEAS_PROMPT = (accountDescription) => `
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

const CAROUSEL_PROMPT = (ideaTitle, accountDescription) => `
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
"Hitting snooze disrupts your sleep cycle. Resist the urge!" (too brief, needs more detail)

BAD EXAMPLE (too long - 45 words):
"Most people pack their mornings with way too many different rigid tasks that they think they need to do, and this actually creates a lot of stress instead of building momentum, and when one thing inevitably falls apart, the entire day feels completely ruined." (too verbose, cut it down)

Content should:
- Deliver specific, actionable value
- Be concrete (not vague)
- Follow logical flow: problem → solution → steps → examples → pitfalls
- No fluff, no filler, no repetition

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LAST SLIDE: CTA (CALL TO ACTION)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Short, clear, imperative action.

GOOD EXAMPLES:
✓ "Save this post and try it this week"
✓ "Follow for more productivity tips"
✓ "Comment which tip you'll try first"
✓ "Share this with someone who needs it"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
150-250 words. Natural, conversational tone. Start with a hook. End with 2-3 relevant hashtags. No emojis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BEFORE SUBMITTING: WORD COUNT CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Count the words in your hook. If it's more than 10 words, cut it down.
Count the words in each middle slide content. Adjust to 18-32 words.

OUTPUT FORMAT (JSON only):
{
  "ideaTitle": "${ideaTitle}",
  "slides": [
    {"title": "Your morning routine is destroying your productivity", "content": "", "kind": "HOOK"},
    {"title": "2-5 words", "content": "18-32 words of value", "kind": "MIDDLE"},
    {"title": "2-5 words", "content": "18-32 words of value", "kind": "MIDDLE"},
    {"title": "clear cta", "content": "imperative action", "kind": "CTA"}
  ],
  "caption": "150-250 words with hashtags"
}
`.trim();

// ════════════════════════════════════════════════════════════════════════════
// JSON Schemas for Structured Output
// ════════════════════════════════════════════════════════════════════════════

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
            description: "Slide title (2-5 words)"
          },
          content: {
            type: SchemaType.STRING,
            description: "Slide content (18-32 words for MIDDLE slides, ≤10 for HOOK)"
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

// ════════════════════════════════════════════════════════════════════════════
// Core Generation Functions
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generate 10 post ideas based on account description
 */
async function generatePostIdeas(accountDescription) {
  console.log('🚀 Generating post ideas...');
  
  const response = await model.generateContent({
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
  
  const data = safeJsonParse(response.response.text());
  
  // Validate and clean
  if (!data.ideas || !Array.isArray(data.ideas) || data.ideas.length !== 10) {
    throw new Error('Invalid ideas response: expected exactly 10 ideas');
  }
  
  const cleanedIdeas = data.ideas.map(idea => idea.trim()).filter(Boolean);
  
  if (cleanedIdeas.length !== 10) {
    throw new Error('Some ideas were empty after cleaning');
  }
  
  console.log(`✅ Generated ${cleanedIdeas.length} ideas`);
  
  return {
    ideas: cleanedIdeas,
    formatted: formatIdeasToText(cleanedIdeas)
  };
}

/**
 * Generate complete carousel from a chosen idea
 */
async function generateCarousel(ideaTitle, accountDescription) {
  console.log(`🚀 Generating carousel for: "${ideaTitle}"`);
  
  const response = await model.generateContent({
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
  
  const data = safeJsonParse(response.response.text());
  
  // Comprehensive validation
  validateCarousel(data);
  
  console.log(`✅ Generated carousel with ${data.slides.length} slides`);
  
  return {
    ...data,
    formatted: formatToMarkdown(data),
    stats: {
      totalSlides: data.slides.length,
      hookWords: wordCount(data.slides[0].title), // Hook text is in title field
      middleSlides: data.slides.length - 2,
      captionWords: wordCount(data.caption)
    }
  };
}

/**
 * Validate carousel structure and content
 */
function validateCarousel(carousel) {
  // Check basic structure
  if (!carousel.slides || !Array.isArray(carousel.slides) || carousel.slides.length < 4) {
    throw new Error('Carousel must have at least 4 slides (HOOK + MIDDLE + CTA)');
  }
  
  if (carousel.slides.length > 9) {
    throw new Error('Carousel cannot have more than 9 slides');
  }
  
  // Validate HOOK (first slide) - structure only
  const hookSlide = carousel.slides[0];
  if (hookSlide.kind !== 'HOOK') {
    throw new Error('First slide must be of kind HOOK');
  }
  
  // Warn if hook is too long, but don't fail (check title field for hook)
  const hookWords = wordCount(hookSlide.title);
  if (hookWords > 15) {
    console.warn(`⚠️  Hook slide has ${hookWords} words (recommended: ≤10 words for best engagement)`);
  }
  
  // Validate CTA (last slide)
  const ctaSlide = carousel.slides[carousel.slides.length - 1];
  if (ctaSlide.kind !== 'CTA') {
    throw new Error('Last slide must be of kind CTA');
  }
  
  // Validate MIDDLE slides - structure only
  const middleSlides = carousel.slides.slice(1, -1);
  
  if (middleSlides.length < 2) {
    throw new Error('Must have at least 2 MIDDLE slides');
  }
  
  if (middleSlides.length > 7) {
    throw new Error('Cannot have more than 7 MIDDLE slides');
  }
  
  middleSlides.forEach((slide, index) => {
    if (slide.kind !== 'MIDDLE') {
      throw new Error(`Slide ${index + 2} should be MIDDLE but is ${slide.kind}`);
    }
    
    // Warn about title length, but don't fail
    const titleWords = wordCount(slide.title);
    if (titleWords > 8) {
      console.warn(`⚠️  Middle slide ${index + 1} title has ${titleWords} words (recommended: 2-5 words): "${slide.title}"`);
    }
    
    // Warn about content length, but don't fail
    const contentWords = wordCount(slide.content);
    if (contentWords < 10) {
      console.warn(`⚠️  Middle slide ${index + 1} content has ${contentWords} words (recommended: 18-32 words for optimal readability)`);
    } else if (contentWords > 50) {
      console.warn(`⚠️  Middle slide ${index + 1} content has ${contentWords} words (recommended: 18-32 words for optimal readability)`);
    }
  });
  
  // Warn about caption length, but don't fail
  const captionWords = wordCount(carousel.caption);
  if (captionWords < 30) {
    console.warn(`⚠️  Caption has ${captionWords} words (recommended: 150-250 words for best engagement)`);
  } else if (captionWords > 400) {
    console.warn(`⚠️  Caption has ${captionWords} words (recommended: 150-250 words for best engagement)`);
  }
  
  console.log('✅ Carousel validation passed (structure validated, word counts are flexible)');
}

// ════════════════════════════════════════════════════════════════════════════
// API Routes
// ════════════════════════════════════════════════════════════════════════════

/**
 * Health check endpoint
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    model: GEMINI_MODEL,
    timestamp: new Date().toISOString()
  });
});

/**
 * Main API endpoint - handles all generation requests
 */
app.post('/api/social', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { action } = req.body || {};
    
    // ────────────────────────────────────────────────────────────────────────
    // ACTION: Generate Ideas
    // ────────────────────────────────────────────────────────────────────────
    if (action === 'ideas') {
      const { accountDescription } = req.body || {};
      
      if (!accountDescription || typeof accountDescription !== 'string') {
        return res.status(400).json({
          error: 'accountDescription is required and must be a string'
        });
      }
      
      if (accountDescription.length < 10) {
        return res.status(400).json({
          error: 'accountDescription must be at least 10 characters'
        });
      }
      
      const result = await generatePostIdeas(accountDescription);
      const duration = Date.now() - startTime;
      
      return res.json({
        success: true,
        action: 'ideas',
        data: {
          ideas: result.ideas,
          formatted: result.formatted
        },
        meta: {
          count: result.ideas.length,
          generationTime: `${duration}ms`,
          model: GEMINI_MODEL
        }
      });
    }
    
    // ────────────────────────────────────────────────────────────────────────
    // ACTION: Generate Carousel
    // ────────────────────────────────────────────────────────────────────────
    if (action === 'carousel') {
      const { ideaTitle, accountDescription } = req.body || {};
      
      if (!ideaTitle || typeof ideaTitle !== 'string') {
        return res.status(400).json({
          error: 'ideaTitle is required and must be a string'
        });
      }
      
      const result = await generateCarousel(ideaTitle, accountDescription);
      const duration = Date.now() - startTime;
      
      return res.json({
        success: true,
        action: 'carousel',
        data: {
          ideaTitle: result.ideaTitle,
          slides: result.slides,
          caption: result.caption,
          formatted: result.formatted,
          stats: result.stats
        },
        meta: {
          generationTime: `${duration}ms`,
          model: GEMINI_MODEL
        }
      });
    }
    
    // ────────────────────────────────────────────────────────────────────────
    // Invalid Action
    // ────────────────────────────────────────────────────────────────────────
    return res.status(400).json({
      error: 'Invalid action',
      validActions: ['ideas', 'carousel'],
      received: action
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Check if it's a model error
    const isModelError = error.message?.includes('model') || 
                         error.message?.includes('Model') ||
                         error.message?.includes('404 Not Found');
    
    let errorMessage = error.message || 'Internal server error';
    let suggestions = null;
    
    if (isModelError) {
      errorMessage = `Model error: ${GEMINI_MODEL} is not available or not supported.`;
      suggestions = {
        availableModels: [
          'gemini-2.0-flash-exp',
          'gemini-2.0-flash',
          'gemini-2.5-pro',
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-pro'
        ],
        currentModel: GEMINI_MODEL,
        howToFix: 'Update GEMINI_MODEL in server.mjs to one of the available models listed above'
      };
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      suggestions,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Server Startup
// ════════════════════════════════════════════════════════════════════════════

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log('\n' + '═'.repeat(80));
  console.log('🚀 POST GENERATION API SERVER');
  console.log('═'.repeat(80));
  console.log(`📍 Server running at: http://localhost:${PORT}`);
  console.log(`🤖 AI Model: ${GEMINI_MODEL}`);
  console.log(`🕐 Started at: ${new Date().toLocaleString()}`);
  console.log('═'.repeat(80));
  console.log('\n📚 ENDPOINTS:');
  console.log(`  GET  /health              → Health check`);
  console.log(`  POST /api/social          → Generate content`);
  console.log('\n💡 EXAMPLE REQUESTS:');
  console.log('  Ideas:');
  console.log(`    POST /api/social`);
  console.log(`    { "action": "ideas", "accountDescription": "fitness coach for busy professionals" }`);
  console.log('\n  Carousel:');
  console.log(`    POST /api/social`);
  console.log(`    { "action": "carousel", "ideaTitle": "Why Your Morning Routine Fails", "accountDescription": "..." }`);
  console.log('\n' + '═'.repeat(80) + '\n');
});

// Handle port conflicts gracefully
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error('\n❌ ERROR: Port', PORT, 'is already in use!\n');
    console.log('💡 Solutions:');
    console.log(`   1. Kill the process using port ${PORT}:`);
    console.log(`      lsof -ti:${PORT} | xargs kill -9`);
    console.log(`   2. Use a different port:`);
    console.log(`      PORT=3001 npm start`);
    console.log(`   3. Change the port in your .env file:`);
    console.log(`      PORT=3001\n`);
    process.exit(1);
  } else {
    console.error('\n❌ Server error:', error.message);
    process.exit(1);
  }
});
