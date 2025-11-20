// ═══════════════════════════════════════════════════════════════════════════
// ONBOARDING CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// Vibe mapping for onboarding flow - maps user's selected vibe to template/font/theme

export interface VibeMapping {
  templateId: string
  fontCombinationId: string
  colorThemeId: string
}

export function getTemplateStyleMapping(templateStyle: string): VibeMapping {
  // Simple mock mapping - will be updated later when templates are finalized
  const mappings: Record<string, VibeMapping> = {
    'Clean & minimal': {
      templateId: 'template1',
      fontCombinationId: 'combination-1',
      colorThemeId: 'purple-black'
    },
    'Warm & friendly': {
      templateId: 'template2',
      fontCombinationId: 'combination-1',
      colorThemeId: 'orange-black'
    },
    'Bold & punchy': {
      templateId: 'template3',
      fontCombinationId: 'combination-1',
      colorThemeId: 'pink-black'
    },
    'Dark & techy': {
      templateId: 'template4',
      fontCombinationId: 'combination-1',
      colorThemeId: 'blue-black'
    }
  }

  // Default to clean & minimal if template style not found
  return mappings[templateStyle] || mappings['Clean & minimal']
}

// Legacy function name for backward compatibility
export function getVibeMapping(vibe: string): VibeMapping {
  return getTemplateStyleMapping(vibe)
}

// ═══════════════════════════════════════════════════════════════════════════
// COPY TONE TO USER VOICE MAPPING
// ═══════════════════════════════════════════════════════════════════════════

import type { UserVoice } from './prompts'

/**
 * Maps copy tone selections to UserVoice object for prompt generation
 * @param copyTone - Array of selected copy tones (max 2)
 * @returns UserVoice object with tone and sentenceStyle
 */
export function mapCopyToneToUserVoice(copyTone: string[]): UserVoice {
  if (!copyTone || copyTone.length === 0) {
    return {
      tone: 'friendly and conversational, authentic to the user\'s voice',
      sentenceStyle: 'medium length, clear and natural',
      preferWords: [],
      avoidWords: [],
      examples: ''
    }
  }

  // Map tone selections to tone description
  const toneMap: Record<string, string> = {
    'Simple & clear': 'simple, clear, straightforward, easy to understand',
    'Friendly & casual': 'friendly, casual, approachable, conversational',
    'Bold & direct': 'bold, direct, no-nonsense, confident',
    'Calm & reflective': 'calm, reflective, thoughtful, peaceful',
    'Playful & fun': 'playful, fun, energetic, lighthearted'
  }

  // Map tone selections to sentence style
  const styleMap: Record<string, string> = {
    'Simple & clear': 'short and clear, straightforward sentences',
    'Friendly & casual': 'medium length, conversational and natural',
    'Bold & direct': 'short and punchy, impactful statements',
    'Calm & reflective': 'medium to long, flowing and thoughtful',
    'Playful & fun': 'varied length, energetic and engaging'
  }

  // Combine multiple tones if selected (max 2)
  const tones = copyTone.map(t => toneMap[t] || '').filter(Boolean)
  const styles = copyTone.map(t => styleMap[t] || '').filter(Boolean)

  // Combine tones with "and" if multiple
  const combinedTone = tones.length > 1 
    ? tones.join(' and ') 
    : tones[0] || 'friendly and conversational'

  // Combine styles with "with" if multiple
  const combinedStyle = styles.length > 1
    ? styles.join(' with ')
    : styles[0] || 'medium length, clear and natural'

  return {
    tone: combinedTone,
    sentenceStyle: combinedStyle,
    preferWords: [],
    avoidWords: [],
    examples: ''
  }
}

export const TEMPLATE_STYLE_OPTIONS = [
  'Clean & minimal',
  'Warm & friendly',
  'Bold & punchy',
  'Dark & techy'
] as const

export const COPY_TONE_OPTIONS = [
  'Simple & clear',
  'Friendly & casual',
  'Bold & direct',
  'Calm & reflective',
  'Playful & fun'
] as const

export const TOPIC_OPTIONS = [
  'Building a startup',
  'Marketing & content',
  'Money & careers',
  'Tech / AI',
  'Self-growth & mindset',
  'Lifestyle / travel',
  'Design & creativity',
  'E-commerce / online business',
  'Other'
] as const

export const BRAND_INTENTION_EXAMPLES = [
  "I'm building a startup and sharing the journey.",
  'I sell services and want more clients.',
  'I run an online store / dropshipping brand.',
  'I create content to grow my personal brand.'
] as const

