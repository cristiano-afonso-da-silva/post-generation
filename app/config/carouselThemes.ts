// ═══════════════════════════════════════════════════════════════════════════
// CAROUSEL THEME CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════
// Add new font combinations and color themes here

export interface FontCombination {
  id: string
  name: string
  hook: {
    font: string
    lineHeight: number
  }
  title: {
    font: string
    lineHeight: number
  }
  content: {
    font: string
    lineHeight: number
  }
}

export interface ColorTheme {
  id: string
  name: string
  textColor: string
  highlightColor: string  // Used for hook first line and important words
  underlineColor: string
  primaryColor: string  // Used for CTA boxes, arrows, and accent elements
}

// ═══════════════════════════════════════════════════════════════════════════
// FONT COMBINATIONS
// ═══════════════════════════════════════════════════════════════════════════

export const FONT_COMBINATIONS: FontCombination[] = [
  {
    id: 'combination-1',
    name: 'Combination 1 (Poppins + Dreaming)',
    hook: {
      font: 'bold 130px Poppins, sans-serif',
      lineHeight: 155
    },
    title: {
      font: 'bold 75px Poppins, sans-serif',
      lineHeight: 90
    },
    content: {
      font: '55px DreamingOutloudSans, sans-serif',
      lineHeight: 70
    }
  }
  // Add more combinations here:
  // {
  //   id: 'combination-2',
  //   name: 'Combination 2 (Your fonts here)',
  //   hook: { font: '...', lineHeight: ... },
  //   title: { font: '...', lineHeight: ... },
  //   content: { font: '...', lineHeight: ... }
  // }
]

// ═══════════════════════════════════════════════════════════════════════════
// COLOR THEMES
// ═══════════════════════════════════════════════════════════════════════════

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'purple-black',
    name: 'Purple + Black',
    textColor: '#000000',
    highlightColor: 'rgba(119, 119, 255, 0.5)',
    underlineColor: '#000000',
    primaryColor: '#7777FF'
  },
  {
    id: 'blue-black',
    name: 'Blue + Black',
    textColor: '#000000',
    highlightColor: 'rgba(59, 130, 246, 0.5)',
    underlineColor: '#000000',
    primaryColor: '#3B82F6'
  },
  {
    id: 'pink-black',
    name: 'Pink + Black',
    textColor: '#000000',
    highlightColor: 'rgba(236, 72, 153, 0.5)',
    underlineColor: '#000000',
    primaryColor: '#EC4899'
  },
  {
    id: 'orange-black',
    name: 'Orange + Black',
    textColor: '#000000',
    highlightColor: 'rgba(249, 115, 22, 0.5)',
    underlineColor: '#000000',
    primaryColor: '#F97316'
  },
  {
    id: 'coral-navy',
    name: 'Coral + Black',
    textColor: '#000000',
    highlightColor: 'rgba(255, 107, 107, 0.5)',
    underlineColor: '#000000',
    primaryColor: '#FF6B6B'
  },
  {
    id: 'gold-green',
    name: 'Gold + Black',
    textColor: '#000000',
    highlightColor: 'rgba(255, 195, 0, 0.5)',
    underlineColor: '#000000',
    primaryColor: '#FFC300'
  },
  {
    id: 'mint-gray',
    name: 'Mint + Black',
    textColor: '#000000',
    highlightColor: 'rgba(0, 230, 118, 0.5)',
    underlineColor: '#000000',
    primaryColor: '#00E676'
  },
  {
    id: 'transparent',
    name: 'Transparent',
    textColor: '#000000',
    highlightColor: 'transparent',
    underlineColor: '#000000',
    primaryColor: '#000000'
  }
]

// Helper functions
export function getFontCombination(id: string): FontCombination {
  return FONT_COMBINATIONS.find(c => c.id === id) || FONT_COMBINATIONS[0]
}

export function getColorTheme(id: string): ColorTheme {
  return COLOR_THEMES.find(t => t.id === id) || COLOR_THEMES[0]
}





