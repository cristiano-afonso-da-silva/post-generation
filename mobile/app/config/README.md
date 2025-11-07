# Slide Theme Configuration Guide

This folder contains the theme configuration system for slide generation.

## How to Add New Font Combinations

1. Open `slideThemes.ts`
2. Add a new object to the `FONT_COMBINATIONS` array:

```typescript
{
  id: 'combination-2',  // Unique ID
  name: 'Combination 2 (Your Font Names)',  // Display name
  hook: {
    font: 'bold 130px YourFont, sans-serif',  // Hook slide font
    lineHeight: 155
  },
  title: {
    font: 'bold 75px YourFont, sans-serif',  // Middle slide title font
    lineHeight: 90
  },
  content: {
    font: '55px YourContentFont, sans-serif',  // Middle/CTA content font
    lineHeight: 70
  }
}
```

3. Make sure your fonts are loaded in `/mobile/public/fonts/`
4. Update the font loading in `SlideImageGenerator.tsx` if needed

## How to Add New Color Themes

1. Open `slideThemes.ts`
2. Add a new object to the `COLOR_THEMES` array:

```typescript
{
  id: 'my-theme',  // Unique ID
  name: 'My Custom Theme',  // Display name
  textColor: '#1a1a3e',  // Main text color
  highlightColor: 'rgba(255, 107, 107, 0.5)',  // Word highlight background
  underlineColor: '#1a1a3e'  // Underline color
}
```

## Color Format

- **textColor**: Hex color (e.g., `#000000`)
- **highlightColor**: RGBA with opacity (e.g., `rgba(119, 119, 255, 0.5)`)
- **underlineColor**: Hex color (e.g., `#000000`)

## Font Size Guidelines

- **Hook**: 100-150px (main attention-grabber)
- **Title**: 60-80px (section headers)
- **Content**: 45-60px (body text)

Adjust line heights proportionally to font sizes for optimal readability.

