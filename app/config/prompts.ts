// ════════════════════════════════════════════════════════════════════════════
// PROMPTS CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════
// All AI prompts for the application in one centralized location

// ════════════════════════════════════════════════════════════════════════════
// GEMINI PROMPTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Prompt for generating 3 post ideas based on business description
 * Follows the same structure as NOTE_PROMPT: User Voice > Template Layout > Global Rules
 */
export const IDEAS_PROMPT = (
  accountDescription: string,
  userVoice: UserVoice = DEFAULT_USER_VOICE,
  templateLayout: TemplateLayout = DEFAULT_TEMPLATE_LAYOUT
) => {
  // Build vocabulary section
  const vocabularySection = userVoice.preferWords && userVoice.preferWords.length > 0
    ? `- Prefer: ${userVoice.preferWords.join(', ')}`
    : ''
  
  const avoidSection = userVoice.avoidWords && userVoice.avoidWords.length > 0
    ? `- Avoid: ${userVoice.avoidWords.join(', ')}`
    : ''
  
  const vocabularyBlock = vocabularySection || avoidSection
    ? `- Vocabulary:\n  ${vocabularySection ? vocabularySection + '\n  ' : ''}${avoidSection || ''}`
    : ''
  
  // Build reference snippets section
  const referenceSection = userVoice.examples
    ? `\n\nREFERENCE SNIPPETS (imitate these):\n"""\n${userVoice.examples}\n"""`
    : ''
  
  // Determine title length from template layout
  const titleMin = templateLayout.hookTitle?.min || 5
  const titleMax = templateLayout.hookTitle?.max || 8
  
  return `
🎯 TOP PRIORITY: MATCH THE USER'S VOICE

You must generate ideas that match how this user likes to speak and write.

User voice overrides template style and all other instructions
except hard constraints like length limits.

USER VOICE:
- Tone: ${userVoice.tone}
- Sentence style: ${userVoice.sentenceStyle}${vocabularyBlock ? '\n' + vocabularyBlock : ''}${referenceSection}

If anything conflicts later in this prompt,
the USER VOICE here wins for wording, phrasing, and tone.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEMPLATE LAYOUT (SECOND PRIORITY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The template controls the length constraints for idea titles:
- Idea title length: ${titleMin}-${titleMax} words

This ensures ideas will fit well within the selected template's structure.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL RULES (THIRD PRIORITY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- No emojis
- No numbering
- No quotes
- NO dashes (-) or semicolons (;) anywhere
- Simple, clear language
- Avoid complicated words - use day-to-day language that humans naturally use

If a global rule conflicts with user voice,
try to satisfy both. If impossible, follow the user voice
for wording but still respect hard constraints like no emojis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generate 3 highly specific, compelling post idea titles for this account:
"${accountDescription}"

REQUIREMENTS
✓ Each title must be ${titleMin}-${titleMax} words maximum
✓ Titles should be specific and actionable (not vague)
✓ Cover diverse angles: how-to, mistakes, frameworks, case studies, experiments, myths, mindset shifts
✓ Each must be clearly distinct from others (no semantic overlap)
✓ Focus on value delivery and curiosity
✓ TONE CHECK: Does each idea match "${userVoice.tone}"? Does it sound like the user would write it?

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
Always ask yourself: "Does this idea sound like the user wrote it?"
`.trim();
}

/**
 * Prompt for generating a single personalized post idea from onboarding data
 */
export const ONBOARDING_IDEA_PROMPT = (
  projectDescription: string,
  topics: string[],
  vibe: string
) => `
You are an expert social media strategist creating the perfect first post idea for a new creator.

CONTEXT
What they're sharing: ${projectDescription}
Topics they like: ${topics.join(', ')}
Preferred vibe: ${vibe}

TASK
Generate ONE highly personalized, compelling post idea title that:
- Perfectly matches their project and interests
- Fits their chosen vibe and style
- Is specific, actionable, and engaging
- Will make their first carousel stand out

REQUIREMENTS
✓ Title must be 6-10 words maximum
✓ Must be specific and actionable (not vague)
✓ Should feel personal and tailored to their unique situation
✓ No emojis, no numbering, no quotes
✓ Use plain, direct language
✓ Avoid complicated words - use day-to-day language that humans naturally use
✓ Focus on value delivery and curiosity
✓ NO dashes (-) or semicolons (;) anywhere
✓ Should feel like it was created specifically for them, not generic
✓ DO NOT include the user's name in the title

EXAMPLES OF GOOD TITLES
- "Why Your Morning Routine Is Sabotaging Your Productivity"
- "The Five Minute Framework That Doubled My Client Base"
- "What I Learned Spending Six Months Without Social Media"
- "The One Mistake That's Costing You Thousands of Followers"

BAD EXAMPLES (DO NOT GENERATE THESE)
- "Building a Startup First Steps Behind the Scenes" (BAD: Just disconnected words/phrases stacked together, not a coherent idea)
- "Marketing Tips Growth Hacks Success Stories" (BAD: Random words that don't form a meaningful sentence)
- "Productivity Tools Morning Routine Daily Habits" (BAD: Word salad, no coherent thought)
- "Startup Journey Lessons Learned Key Insights" (BAD: Fragmented phrases, not a complete idea)

A good title must be a COMPLETE, COHERENT SENTENCE that forms a single, clear idea. Avoid just listing related words or phrases.

OUTPUT FORMAT
Return ONLY valid JSON matching this exact structure:
{
  "idea": "Your personalized post idea title here"
}

Make this idea feel like it was crafted specifically for their unique journey.
`.trim();

// ════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

export type UserVoice = {
  tone: string  // e.g. "soft, poetic, minimal, calm" or "bold, direct, no-nonsense"
  sentenceStyle: string  // e.g. "short and punchy", "flowy and descriptive", "medium length"
  preferWords?: string[]  // Words the user likes to use
  avoidWords?: string[]  // Words the user avoids
  examples?: string  // 2-3 short snippets of their writing style
}

export type TemplateLayout = {
  numSlides?: number  // Optional: suggested number of slides
  hookTitle: { min: number; max: number }
  middleTitle?: { min: number; max: number }  // Optional if includeMiddleTitles is false
  middleContent: { min: number; max: number }
  caption: { min: number; max: number }
  includeMiddleTitles: boolean
}

// ════════════════════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_USER_VOICE: UserVoice = {
  tone: 'friendly and conversational, authentic to the user\'s voice',
  sentenceStyle: 'medium length, clear and natural',
  preferWords: [],
  avoidWords: [],
  examples: ''
}

const DEFAULT_TEMPLATE_LAYOUT: TemplateLayout = {
  hookTitle: { min: 6, max: 12 },
  middleTitle: { min: 2, max: 5 },
  middleContent: { min: 18, max: 32 },
  caption: { min: 80, max: 120 },
  includeMiddleTitles: true
}

/**
 * Prompt for generating a complete carousel note with slides and caption
 * Follows strict hierarchy: User Voice > Template Layout > Global Rules
 */
export const NOTE_PROMPT = (
  ideaTitle: string,
  accountDescription: string,
  userVoice: UserVoice = DEFAULT_USER_VOICE,
  templateLayout: TemplateLayout = DEFAULT_TEMPLATE_LAYOUT
) => {
  // Build vocabulary section
  const vocabularySection = userVoice.preferWords && userVoice.preferWords.length > 0
    ? `- Prefer: ${userVoice.preferWords.join(', ')}`
    : ''
  
  const avoidSection = userVoice.avoidWords && userVoice.avoidWords.length > 0
    ? `- Avoid: ${userVoice.avoidWords.join(', ')}`
    : ''
  
  const vocabularyBlock = vocabularySection || avoidSection
    ? `- Vocabulary:\n  ${vocabularySection ? vocabularySection + '\n  ' : ''}${avoidSection || ''}`
    : ''
  
  // Build reference snippets section
  const referenceSection = userVoice.examples
    ? `\n\nREFERENCE SNIPPETS (imitate these):\n"""\n${userVoice.examples}\n"""`
    : ''
  
  // Build middle slides section
  const middleSlidesSection = templateLayout.includeMiddleTitles
    ? `- Middle slides:\n  - Include titles (${templateLayout.middleTitle?.min || 2}-${templateLayout.middleTitle?.max || 5} words)\n  - Content: ${templateLayout.middleContent.min}-${templateLayout.middleContent.max} words`
    : `- Middle slides:\n  - No titles, only body text\n  - Content: ${templateLayout.middleContent.min}-${templateLayout.middleContent.max} words`
  
  return `
🎯 TOP PRIORITY: MATCH THE USER'S VOICE

You must write exactly how this user likes to speak.

User voice overrides template style and all other instructions
except hard constraints like length limits.

USER VOICE:
- Tone: ${userVoice.tone}
- Sentence style: ${userVoice.sentenceStyle}${vocabularyBlock ? '\n' + vocabularyBlock : ''}${referenceSection}

If anything conflicts later in this prompt,
the USER VOICE here wins for wording, phrasing, and tone.

Language:
- Use the same language as the reference snippets unless the user explicitly asks otherwise.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEMPLATE LAYOUT (SECOND PRIORITY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
The template controls only:
- What fields exist (hook, middle, CTA, caption)
- Whether a slide has a title
- Word count ranges for each field

Do NOT change the tone to fit the template.
Keep the user voice above, only adapt:
- length
- presence/absence of titles
- number of slides

Template for this note:
- Hook title: ${templateLayout.hookTitle.min}-${templateLayout.hookTitle.max} words
${middleSlidesSection}
- Caption: ${templateLayout.caption.min}-${templateLayout.caption.max} words${templateLayout.numSlides ? `\n- Total slides: ${templateLayout.numSlides}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL RULES (THIRD PRIORITY)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- No emojis
- No markdown formatting
- No dashes (-) or semicolons (;) anywhere
- Simple, clear language
- Each slide must be distinct (no semantic overlap)

If a global rule conflicts with user voice,
try to satisfy both. If impossible, follow the user voice
for wording but still respect hard constraints like no emojis.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TASK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Create a complete carousel note based on:

Idea: "${ideaTitle}"
Account: ${accountDescription || 'General audience'}

Hierarchy of decisions:
1) First, make it sound like the USER VOICE above.
2) Then, fit each part into the TEMPLATE LAYOUT lengths.
3) Finally, respect GLOBAL RULES.

Always ask yourself:
"Does this still sound like the user?"
If not, rewrite until it does.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAROUSEL STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CAROUSEL 1: HOOK (FIRST CAROUSEL)
- topic: Short category label (1-2 words, all caps)
  Example: "ENTREPRENEURSHIP", "PRODUCTIVITY", "MARKETING"
- title: A compelling hook that grabs attention (${templateLayout.hookTitle.min}-${templateLayout.hookTitle.max} words, NOT a simple one-word title)
  * CRITICAL: This must be an engaging, attention-grabbing hook - NOT just a simple label or category
  * Create curiosity, intrigue, or a bold statement that makes people stop scrolling
  * TONE CHECK: Does this hook match "${userVoice.tone}"? Does it sound like the user wrote it?
- subtitle: Short descriptive text (3-8 words)
  Provides context or intrigue
  Example: "How I Stay Focused", "The Secret Nobody Tells You"
- cta: Call-to-action button text (2-3 words)
  Example: "Check details", "Learn more", "Read now"
- content: "" (leave empty)
- kind: "HOOK"

CAROUSELS 2-N: MIDDLE CONTENT (2-7 carousels)
Each middle carousel needs:

${templateLayout.includeMiddleTitles ? `TITLE: ${templateLayout.middleTitle?.min || 2}-${templateLayout.middleTitle?.max || 5} words (clear, punchy)
GOOD: "The Problem", "What Actually Works", "Mistake Three", "Try This Instead"
BAD: "Here's what you need to know about the problem" (too long)

` : 'IMPORTANT: Middle carousels should NOT have titles. Only include content text.\n\n'}CONTENT: ${templateLayout.middleContent.min}-${templateLayout.middleContent.max} words (aim for the middle of this range for optimal readability)

TONE CHECK: After writing each middle slide, ask: "Does this match '${userVoice.tone}' and '${userVoice.sentenceStyle}'? Does it sound like the user wrote it?"

GOOD EXAMPLE (24 words):
"Most people pack their mornings with too many rigid tasks, creating stress instead of momentum. When one thing falls apart, the entire day feels ruined."

GOOD EXAMPLE (20 words):
"Focus on one anchor habit that truly energizes you. Everything else should be flexible. This creates consistency without pressure."

BAD EXAMPLE (too short - 12 words):
"Start your day right. Morning routines matter. Build good habits daily."

BAD EXAMPLE (too long - 45 words):
"The problem with morning routines is that most people try to do too many things at once, which creates unnecessary stress and pressure that ends up being counterproductive to what they're trying to achieve in the first place with their morning routine."

LAST CAROUSEL: CALL TO ACTION (CTA)
- title: Clear call-to-action (2-5 words)
  GOOD: "Try This Today", "Start Here", "Your Next Step"
  BAD: "Here's what you should do next" (too long)
- content: Specific, actionable text (use imperative verbs)
  GOOD: "Save this post. Pick one anchor habit. Test it for 7 days. Share your results below."
  BAD: "You should probably try to implement these ideas" (vague, not actionable)
- kind: "CTA"

INSTAGRAM CAPTION (${templateLayout.caption.min}-${templateLayout.caption.max} words)
Structure:
1. Opening hook (1-2 sentences that expand on the post idea)
2. Main value (2-3 short sentences, use line breaks for readability)
3. Call to action (engagement prompt)
4. Relevant hashtags (8-12 hashtags, mix of broad and niche)

TONE CHECK: The caption must also match "${userVoice.tone}". Write it as if the user wrote it themselves.

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
    ${templateLayout.includeMiddleTitles ? '{"title": "string", "content": "string", "kind": "MIDDLE"}' : '{"title": "", "content": "string", "kind": "MIDDLE"}'},
    ${templateLayout.includeMiddleTitles ? '{"title": "string", "content": "string", "kind": "MIDDLE"}' : '{"title": "", "content": "string", "kind": "MIDDLE"}'},
    {"title": "string", "content": "string", "kind": "CTA"}
  ],
  "caption": "string (full Instagram caption with hashtags)"
}

IMPORTANT: The first slide (HOOK) MUST include topic, subtitle, and cta fields. Middle and CTA slides do NOT need these fields.

${templateLayout.includeMiddleTitles ? 'Middle carousels MUST have both title and content.' : 'Middle carousels MUST have content but should have empty title ("").'}

The "slides" array is REQUIRED and MUST contain at least 5 carousels (and no more than 7).
Each carousel MUST have: title, content, and kind properties.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
QUALITY CHECKLIST (Check in this order)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. ⚠️ USER VOICE CHECK (MOST IMPORTANT):
   ✓ Does EVERY slide match the tone: "${userVoice.tone}"?
   ✓ Does EVERY sentence follow: "${userVoice.sentenceStyle}"?
   ✓ Does it sound like the user wrote it themselves?
   ✓ Would the user use these exact words and phrases?
   If ANY answer is NO, rewrite until YES.

2. TEMPLATE LAYOUT CHECK (SECONDARY):
   ✓ Hook title: ${templateLayout.hookTitle.min}-${templateLayout.hookTitle.max} words
   ${templateLayout.includeMiddleTitles ? `✓ Middle titles: ${templateLayout.middleTitle?.min || 2}-${templateLayout.middleTitle?.max || 5} words` : `✓ Middle slides: NO titles`}
   ✓ Middle content: ${templateLayout.middleContent.min}-${templateLayout.middleContent.max} words
   ✓ Caption: ${templateLayout.caption.min}-${templateLayout.caption.max} words

3. GLOBAL RULES CHECK:
   ✓ No emojis, no markdown formatting
   ✓ No dashes (-) or semicolons (;) anywhere
   ✓ Simple, clear English throughout
   ✓ Each slide is distinct (no semantic overlap)

REMEMBER: User voice is checked FIRST. Template layout is secondary. Global rules are last.
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
- Extract 1 single word or short phrase (1-3 words) that is the MOST IMPORTANT for emphasis
- This should be ACTION-ORIENTED and impactful
- Return only one word or phrase (no comma-separated list)
- For highlight and imageSearch, return empty string (no highlights or images on CTA carousels)

Return JSON with:
- underline: "single word or phrase" (only one, not multiple)
- highlight: "" (empty string for CTA carousels)
- imageSearch: "" (empty string for CTA carousels)
`.trim();

/**
 * Prompt for extracting emphasis words and image keywords from MIDDLE carousel
 */
export const MIDDLE_EMPHASIS_PROMPT = (title: string | undefined, content: string) => {
  const titleSection = title ? `Title: "${title}"\n` : '';
  return `
Analyze this middle carousel content and extract emphasis words and image search keywords:

${titleSection}Content: "${content}"

CRITICAL INSTRUCTIONS:
1. UNDERLINE: Extract 1 single word or short phrase (1-3 words) that is the MOST IMPORTANT KEY CONCEPT
- Return only one word or phrase (no comma-separated list)
   - Example: "breathable fabric" or "comfort"

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
  "underline": "single word or phrase",
  "highlight": "word",
  "imageSearch": "visual keyword1 keyword2 keyword3"
}

The imageSearch field is MANDATORY. Always provide visual search terms.
`.trim();
};

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
  
  if (kind === 'MIDDLE' && content) {
    // Allow MIDDLE slides with just content (title is optional, e.g., Template 4)
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
    if (kind === 'MIDDLE') return !!content; // Title is optional for MIDDLE slides (e.g., Template 4)
    return false;
  }
};

