// ═══════════════════════════════════════════════════════════════════════════
// SLIDE THEME CONFIGURATION
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
    underlineColor: '#000000'
  },
  {
    id: 'blue-black',
    name: 'Blue + Black',
    textColor: '#000000',
    highlightColor: 'rgba(59, 130, 246, 0.5)',
    underlineColor: '#000000'
  },
  {
    id: 'pink-black',
    name: 'Pink + Black',
    textColor: '#000000',
    highlightColor: 'rgba(236, 72, 153, 0.5)',
    underlineColor: '#000000'
  },
  {
    id: 'coral-navy',
    name: 'Coral + Navy',
    textColor: '#1a1a3e',
    highlightColor: 'rgba(255, 107, 107, 0.5)',
    underlineColor: '#1a1a3e'
  },
  {
    id: 'gold-green',
    name: 'Gold + Green',
    textColor: '#0d3b2e',
    highlightColor: 'rgba(255, 195, 0, 0.6)',
    underlineColor: '#0d3b2e'
  },
  {
    id: 'mint-gray',
    name: 'Mint + Gray',
    textColor: '#2d2d2d',
    highlightColor: 'rgba(0, 230, 118, 0.5)',
    underlineColor: '#2d2d2d'
  }
]

// Helper functions
export function getFontCombination(id: string): FontCombination {
  return FONT_COMBINATIONS.find(c => c.id === id) || FONT_COMBINATIONS[0]
}

export function getColorTheme(id: string): ColorTheme {
  return COLOR_THEMES.find(t => t.id === id) || COLOR_THEMES[0]
}

