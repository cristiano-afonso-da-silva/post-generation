# Configuration Files

This directory contains all configuration files for the application.

## Files

### `prompts.ts`
**All AI prompts in one centralized location**

Contains:
- **Gemini Prompts**
  - `IDEAS_PROMPT` - Generate 10 post ideas from business description
  - `NOTE_PROMPT` - Generate complete carousel note with slides and caption
  - `HOOK_EMPHASIS_PROMPT` - Extract emphasis words from hook carousel
  - `CTA_EMPHASIS_PROMPT` - Extract emphasis words from CTA carousel
  - `MIDDLE_EMPHASIS_PROMPT` - Extract emphasis words and image keywords from middle carousel

- **AI Image Generation Prompts**
  - `buildAIImagePrompt()` - Build Pollinations.AI prompt based on style
  - `AIImageStyle` type - 'animated' | 'surreal'
  - `AI_IMAGE_STYLES` - Style descriptions and keywords

- **Utilities**
  - `getEmphasisPrompt()` - Get appropriate prompt based on carousel kind
  - `validatePromptParams` - Validate prompt parameters

**Why centralized?**
- Easy to find and edit all prompts in one place
- Consistent prompt structure across the app
- Easier to test and iterate on prompts
- Better maintainability

### `carouselThemes.ts`
**Visual styling configuration for carousels**

Contains:
- Font combinations (Poppins + Dreaming Outloud Sans)
- Color themes (Purple, Blue, Pink, Orange, Coral, Gold, Mint)
- Helper functions to get font/color configs

### `stripeConfig.ts`
**Stripe subscription and pricing configuration**

Contains:
- Subscription plans (Free, Starter, Pro)
- Pricing details
- Feature lists
- Stripe product/price IDs

## Usage Examples

### Using Prompts

```typescript
import { IDEAS_PROMPT, NOTE_PROMPT, buildAIImagePrompt } from '@/app/config/prompts';

// Generate ideas
const prompt = IDEAS_PROMPT('sustainable clothing brand');
const result = await gemini.generateContent(prompt);

// Generate note
const notePrompt = NOTE_PROMPT('Why Fast Fashion Is Bad', 'eco brand');
const note = await gemini.generateContent(notePrompt);

// Generate AI image prompt
const imagePrompt = buildAIImagePrompt('person wearing hoodie', 'animated');
// Returns: "person wearing hoodie, anime illustration, cel-shaded..."
```

### Using Themes

```typescript
import { getFontCombination, getColorTheme } from '@/app/config/carouselThemes';

const fonts = getFontCombination('combination-1');
const colors = getColorTheme('purple-black');
```

## Editing Prompts

To modify prompts:

1. Open `app/config/prompts.ts`
2. Find the prompt you want to edit
3. Modify the prompt text
4. Save the file
5. Restart the dev server

**Tips:**
- Keep prompts clear and specific
- Include examples of good/bad outputs
- Specify exact output format (JSON structure)
- Test changes thoroughly

## Adding New Prompts

```typescript
// In app/config/prompts.ts

export const MY_NEW_PROMPT = (param: string) => `
Your prompt text here with ${param}
`.trim();
```

Then import and use:

```typescript
import { MY_NEW_PROMPT } from '@/app/config/prompts';

const prompt = MY_NEW_PROMPT('value');
```

## Best Practices

1. **Keep prompts in config files** - Don't hardcode prompts in API routes
2. **Use template functions** - Allow dynamic values via parameters
3. **Document prompt purpose** - Add JSDoc comments explaining what each prompt does
4. **Version control** - Track prompt changes in git
5. **Test thoroughly** - Changes to prompts can affect output quality
