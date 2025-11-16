// ════════════════════════════════════════════════════════════════════════════
// PROMPTS CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════
// All AI prompts for the application in one centralized location

// ════════════════════════════════════════════════════════════════════════════
// GEMINI PROMPTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Prompt for generating 3 post ideas based on business description
 */
export const IDEAS_PROMPT = (accountDescription: string) => `
You are an expert social media strategist with deep knowledge of viral content and engagement patterns.

TASK
Generate 3 highly specific, compelling post idea titles for this account:
"${accountDescription}"

REQUIREMENTS
✓ Each title must be 6-10 words maximum
✓ Titles should be specific and actionable (not vague)
✓ Cover diverse angles: how-to, mistakes, frameworks, case studies, experiments, myths, mindset shifts
✓ No emojis, no numbering, no quotes
✓ Each must be clearly distinct from others (no semantic overlap)
✓ Use plain, direct language
✓ Avoid complicated words - use day-to-day language that humans naturally use
✓ Focus on value delivery and curiosity
✓ NO dashes (-) or semicolons (;) anywhere in the generated content

EXAMPLES OF GOOD TITLES
- "Why Your Morning Routine Is Sabotaging Your Productivity"
- "The Five Minute Framework That Doubled My Client Base"
- "What I Learned Spending Six Months Without Social Media"

BAD EXAMPLES
- "Mortgage Made Easy: Demystifying Home Loan Calculations" (BAD: "Demystifying" is too complicated - use simpler, everyday language)

OUTPUT FORMAT
Return ONLY valid JSON matching this exact structure:
{
  "ideas": ["title 1", "title 2", "title 3"]
}

Think strategically about what would make someone stop scrolling and engage.
`.trim();

// Default writing style (Template 1 style) for backward compatibility
const DEFAULT_WRITING_STYLE = {
  tone: 'friendly and conversational, like talking to a friend, warm and approachable',
  lengthConstraints: {
    hookTitle: { min: 6, max: 12 },
    middleTitle: { min: 2, max: 5 },
    middleContent: { min: 18, max: 32 },
    caption: { min: 80, max: 120 }
  },
  structure: {
    sentenceStyle: 'medium' as const,
    paragraphStyle: 'multi' as const,
    hookStyle: 'mixed' as const,
    contentFlow: 'Tell a story with clear progression. Use relatable examples and practical insights. Build connection through shared experiences.',
    includeMiddleTitles: true
  }
}

/**
 * Prompt for generating a complete carousel note with slides and caption
 */
export const NOTE_PROMPT = (
  ideaTitle: string, 
  accountDescription: string,
  writingStyle?: {
    tone: string
    lengthConstraints: {
      hookTitle: { min: number; max: number }
      middleTitle: { min: number; max: number }
      middleContent: { min: number; max: number }
      caption: { min: number; max: number }
    }
    structure: {
      sentenceStyle: 'short' | 'medium' | 'long' | 'mixed'
      paragraphStyle: 'single' | 'multi' | 'mixed'
      hookStyle: 'question' | 'statement' | 'imperative' | 'mixed'
      contentFlow: string
      includeMiddleTitles?: boolean
    }
  }
) => {
  const style = writingStyle || DEFAULT_WRITING_STYLE
  
  // Build hook style guidance
  const hookStyleGuidance = style.structure.hookStyle === 'question' 
    ? 'Use questions to create curiosity and engagement'
    : style.structure.hookStyle === 'statement'
    ? 'Use bold, declarative statements that make strong claims'
    : style.structure.hookStyle === 'imperative'
    ? 'Use direct commands or calls to action'
    : 'Mix questions, statements, and provocative claims for maximum impact'
  
  // Build sentence style guidance
  const sentenceStyleGuidance = style.structure.sentenceStyle === 'short'
    ? 'Use short, punchy sentences. Keep them concise and impactful.'
    : style.structure.sentenceStyle === 'long'
    ? 'Use longer, flowing sentences that build depth and nuance.'
    : style.structure.sentenceStyle === 'medium'
    ? 'Use medium-length sentences that balance clarity with depth.'
    : 'Vary sentence length for rhythm and engagement.'
  
  return `
You are an expert Instagram note creator. Your posts go viral because they're perfectly structured and valuable.

CONTEXT
Account: ${accountDescription || 'General audience'}
Post Idea: "${ideaTitle}"

WRITING STYLE & TONE
${style.tone}

${sentenceStyleGuidance}

${style.structure.contentFlow}

TASK
Create a complete note with carousels and caption that follows these EXACT specifications:

REQUIREMENTS
✓ No emojis, no numbering, no quotes
✓ Each must be clearly distinct from others (no semantic overlap)
✓ Use plain, direct language
✓ Avoid complicated words - use day-to-day language that humans naturally use
✓ Your post should match the tone: ${style.tone}
✓ Focus on value delivery and curiosity
✓ NO dashes (-) or semicolons (;) anywhere in the generated content

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAROUSEL 1: HOOK (FIRST CAROUSEL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- title: A compelling hook that grabs attention (${style.lengthConstraints.hookTitle.min}-${style.lengthConstraints.hookTitle.max} words, NOT a simple one-word title)
  * CRITICAL: This must be an engaging, attention-grabbing hook - NOT just a simple label or category
  * Create curiosity, intrigue, or a bold statement that makes people stop scrolling
  * ${hookStyleGuidance}
  * Examples of GOOD hooks:    
    * "You're One Habit Away From Burnout"
    * "The One Mistake That's Costing You Thousands of Followers"
    * "This Is Why You're Not Growing"
    * "Your Goals Are Holding You Back"

- topic: Short category label (1-2 words, all caps)
  * Example: "ENTREPRENEURSHIP", "PRODUCTIVITY", "MARKETING"
- subtitle: Short descriptive text (3-8 words)
  * Provides context or intrigue
  * Example: "How I Stay Focused", "The Secret Nobody Tells You"
- cta: Call-to-action button text (2-3 words)
  * Example: "Check details", "Learn more", "Read now"
- content: "" (leave empty)
- kind: "HOOK"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAROUSELS 2-N: MIDDLE CONTENT (2-7 carousels)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Each middle carousel needs:

${style.structure.includeMiddleTitles !== false ? `TITLE: ${style.lengthConstraints.middleTitle.min}-${style.lengthConstraints.middleTitle.max} words (clear, punchy)
GOOD: "The Problem", "What Actually Works", "Mistake Three", "Try This Instead"
BAD: "Here's what you need to know about the problem" (too long)

` : 'IMPORTANT: Middle carousels should NOT have titles. Only include content text.\n\n'}CONTENT: ${style.lengthConstraints.middleContent.min}-${style.lengthConstraints.middleContent.max} words (aim for the middle of this range for optimal readability)
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
INSTAGRAM CAPTION (${style.lengthConstraints.caption.min}-${style.lengthConstraints.caption.max} words)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Structure:
1. Opening hook (1-2 sentences that expand on the post idea)
2. Main value (2-3 short sentences, use line breaks for readability)
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
    {"topic": "string", "title": "string", "subtitle": "string", "cta": "string", "content": "", "kind": "HOOK"},
    ${style.structure.includeMiddleTitles !== false ? '{"title": "string", "content": "string", "kind": "MIDDLE"}' : '{"title": "", "content": "string", "kind": "MIDDLE"}'},
    ${style.structure.includeMiddleTitles !== false ? '{"title": "string", "content": "string", "kind": "MIDDLE"}' : '{"title": "", "content": "string", "kind": "MIDDLE"}'},
    {"title": "string", "content": "string", "kind": "CTA"}
  ],
  "caption": "string (full Instagram caption with hashtags)"
}

IMPORTANT: The first slide (HOOK) MUST include topic, subtitle, and cta fields. Middle and CTA slides do NOT need these fields.

${style.structure.includeMiddleTitles !== false ? 'Middle carousels MUST have both title and content.' : 'Middle carousels MUST have content but should have empty title ("").'}

The "slides" array is REQUIRED and MUST contain at least 3 carousels.
Each carousel MUST have: title, content, and kind properties.

QUALITY CHECKLIST
✓ Hook carousel has topic (1-2 words), compelling hook title (${style.lengthConstraints.hookTitle.min}-${style.lengthConstraints.hookTitle.max} words, NOT a simple one-word title - must be engaging and attention-grabbing), subtitle (3-8 words), cta (2-3 words), empty content
${style.structure.includeMiddleTitles !== false ? `✓ Middle carousels have ${style.lengthConstraints.middleTitle.min}-${style.lengthConstraints.middleTitle.max} word titles and ${style.lengthConstraints.middleContent.min}-${style.lengthConstraints.middleContent.max} word content` : `✓ Middle carousels have NO titles, only ${style.lengthConstraints.middleContent.min}-${style.lengthConstraints.middleContent.max} word content`}
✓ Content flows logically and tells a story following: ${style.structure.contentFlow}
✓ CTA is specific and actionable
✓ Caption is ${style.lengthConstraints.caption.min}-${style.lengthConstraints.caption.max} words
✓ No asterisks, no markdown formatting
✓ Simple, clear English throughout
✓ NO dashes (-) or semicolons (;) anywhere in titles, content, or captions
`.trim();
}

/**
 * Prompt for extracting emphasis words from HOOK carousel
 */
export const HOOK_EMPHASIS_PROMPT = (title: string) => `
Analyze this hook carousel title and extract emphasis words:

Title: "${title}"

Instructions:
- Extract 1 single word that is most important for emphasis
- The highlight word should be a KEY word that captures attention
- Return the word without any punctuation
- For underline and imageSearch, return empty string (no underlines or images on hook carousels)

Return JSON with:
- underline: "" (empty string for hook carousels)
- highlight: "word" (single most important word, no punctuation)
- imageSearch: "" (empty string for hook carousels)
`.trim();

/**
 * Prompt for extracting emphasis words from CTA carousel
 */
export const CTA_EMPHASIS_PROMPT = (content: string) => `
Analyze this CTA carousel content and extract emphasis words:

Content: "${content}"

Instructions:
- Extract 2-3 short phrases (2-4 words each) that are most important for emphasis
- These phrases should be ACTION-ORIENTED and impactful
- Return them comma-separated
- For highlight and imageSearch, return empty string (no highlights or images on CTA carousels)

Return JSON with:
- underline: "phrase 1, phrase 2, phrase 3" (2-3 phrases)
- highlight: "" (empty string for CTA carousels)
- imageSearch: "" (empty string for CTA carousels)
`.trim();

/**
 * Prompt for extracting emphasis words and image keywords from MIDDLE carousel
 */
export const MIDDLE_EMPHASIS_PROMPT = (title: string, content: string) => `
Analyze this middle carousel content and extract emphasis words and image search keywords:

Title: "${title}"
Content: "${content}"

CRITICAL INSTRUCTIONS:
1. UNDERLINE: Extract 2-4 short phrases (2-4 words each) that are KEY CONCEPTS
- Return them comma-separated
   - Example: "breathable fabric, everyday comfort, lightweight design"

2. HIGHLIGHT: Extract one MOST important single word
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

The imageSearch field is MANDATORY. Always provide visual search terms.
`.trim();

// ════════════════════════════════════════════════════════════════════════════
// AI IMAGE GENERATION PROMPTS
// ════════════════════════════════════════════════════════════════════════════

export type AIImageStyle = 'animated' | 'surreal';

/**
 * Build AI image prompt based on keywords and style
 * @param baseKeywords - Keywords extracted from carousel content
 * @param style - Visual style (animated or surreal)
 * @returns Complete prompt for Pollinations.AI
 */
export const buildAIImagePrompt = (baseKeywords: string, style: AIImageStyle): string => {
  const trimmedKeywords = baseKeywords.trim();
  
  if (style === 'surreal') {
    return `${trimmedKeywords}, surreal dreamscape, otherworldly lighting, impossible geometry, melting architecture, floating whales, cinematic atmosphere, 16:9 aspect ratio, high detail`;
  }
  
  // Default: animated style
  return `${trimmedKeywords}, anime illustration, cel-shaded, vibrant colors, dynamic lighting, detailed background, expressive characters, 16:9 aspect ratio`;
};

/**
 * Style descriptions for user reference
 */
export const AI_IMAGE_STYLES = {
  animated: {
    name: 'Animated',
    description: 'Anime-inspired artwork with cel-shading, vibrant colors, and expressive characters. Characters should not look evil, they should look like normal people.',
    keywords: ['anime', 'cel-shaded', 'vibrant', 'dynamic lighting']
  },
  surreal: {
    name: 'Surrealism',
    description: 'Dreamscape imagery with impossible geometry, melting architecture, and otherworldly elements',
    keywords: ['surreal', 'dreamscape', 'impossible geometry', 'melting', 'floating', 'otherworldly']
  }
} as const;

// ════════════════════════════════════════════════════════════════════════════
// PROMPT UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get emphasis extraction prompt based on carousel kind
 */
export const getEmphasisPrompt = (
  kind: 'HOOK' | 'MIDDLE' | 'CTA',
  title?: string,
  content?: string
): string => {
  if (kind === 'HOOK' && title) {
    return HOOK_EMPHASIS_PROMPT(title);
  }
  
  if (kind === 'CTA' && content) {
    return CTA_EMPHASIS_PROMPT(content);
  }
  
  if (kind === 'MIDDLE' && title && content) {
    return MIDDLE_EMPHASIS_PROMPT(title, content);
  }
  
  return '';
};

/**
 * Validate prompt parameters
 */
export const validatePromptParams = {
  ideas: (accountDescription: string): boolean => {
    return !!(accountDescription && accountDescription.trim().length > 0);
  },
  
  note: (ideaTitle: string): boolean => {
    return !!(ideaTitle && ideaTitle.trim().length > 0);
  },
  
  emphasis: (kind: string, title?: string, content?: string): boolean => {
    if (kind === 'HOOK') return !!title;
    if (kind === 'CTA') return !!content;
    if (kind === 'MIDDLE') return !!(title && content);
    return false;
  }
};

