# ✅ FIX: AI Images Now Preserved When Extracting New Underline/Highlight Words

## Problem
After implementing Gemini API underline/highlight word extraction, when you clicked Save:
- ✅ New underline/highlight words were extracted correctly
- ❌ But AI-generated images disappeared from carousels
- ❌ Images were set to `null` when regenerating

## Root Cause
When the `/api/social` endpoint calls `extractUnderlineWordsWithGemini`, it sets:
```typescript
imageUrl: null,
originalImageUrl: null,
```

This happens because when `includeImages: false` is passed (which we do when just refreshing words), the function doesn't fetch new images, but it also doesn't preserve existing ones.

## Solution
**Preserve existing AI image URLs** when merging new underline/highlight words:

1. **Before calling API**: Store existing `imageUrl` and `originalImageUrl` from current `underlineWords`
2. **After API returns**: Merge new underline/highlight words with preserved image URLs
3. **Pass merged data**: Use the merged data (new words + preserved images) for regeneration

## Implementation

### File: `app/_internal/history-page.tsx` (Lines 439-467)

**Added**: Image URL preservation logic

```typescript
// ✅ CRITICAL: Preserve existing AI image URLs when updating underline/highlight words
const preservedUnderlineWords: Note['underlineWords'] = {}
const existingUnderlineWords = note.underlineWords || {}

Object.keys(updatedUnderline).forEach((key) => {
  const index = parseInt(key, 10)
  const newWords = updatedUnderline[index]
  const existingWords = existingUnderlineWords[index]
  
  // Merge: Use new underline/highlight words from Gemini, but preserve existing image URLs
  preservedUnderlineWords[index] = {
    underline: newWords?.underline || '',
    highlight: newWords?.highlight || '',
    imageSearch: newWords?.imageSearch || '',
    // ✅ PRESERVE existing AI image URLs (don't overwrite with null)
    imageUrl: existingWords?.imageUrl || newWords?.imageUrl || null,
    originalImageUrl: existingWords?.originalImageUrl || newWords?.originalImageUrl || null,
  }
})
```

## How It Works Now

### Complete Flow:
```
1. User edits carousel text
   └─ Example: "Focus intensely" → "Focus deeply"

2. User clicks Save
   ├─ Frontend sends edited text to /api/social
   └─ Action: refreshSlides

3. Backend calls Gemini API
   ├─ Extracts new underline phrases
   ├─ Extracts new highlight word
   └─ Returns with imageUrl: null (because includeImages: false)

4. Frontend receives response
   ├─ Gets new underline/highlight words
   ├─ Gets existing image URLs from note.underlineWords
   ├─ MERGES: New words + Existing image URLs
   └─ Creates preservedUnderlineWords

5. Regeneration uses merged data
   ├─ New underline/highlight words (from Gemini) ✅
   ├─ Existing AI image URLs (preserved) ✅
   └─ Regenerates carousels with both

6. Result
   └─ Images show edited text + new styling + AI backgrounds ✅
```

## What Changed

### Before:
```
Edit text → Save
├─ Gemini extracts new words ✅
├─ imageUrl set to null ❌
├─ Regenerate with null images ❌
└─ AI images disappear ❌
```

### After:
```
Edit text → Save
├─ Gemini extracts new words ✅
├─ Preserve existing imageUrl ✅
├─ Merge: new words + existing images ✅
├─ Regenerate with preserved images ✅
└─ AI images stay visible ✅
```

## Testing

### Test Case 1: Edit with AI Images
1. Generate carousels with AI images enabled
2. Verify AI images are visible on carousels
3. Edit carousel text: "Focus intensely" → "Focus deeply"
4. Click Save
5. **Verify**:
   - ✅ Carousel shows "Focus deeply"
   - ✅ New underline/highlight words applied
   - ✅ **AI images still visible** (not disappeared)
   - ✅ Console shows: "🖼️ Carousel X: Preserved imageUrl = [URL]"

### Test Case 2: Multiple Edits
1. Edit carousel 1 → Save → AI images preserved ✅
2. Edit carousel 2 → Save → AI images preserved ✅
3. Edit carousel 3 → Save → AI images preserved ✅
4. **Result**: All AI images remain throughout all edits

### Test Case 3: Download After Edit
1. Generate with AI images
2. Edit text → Save
3. Click Download
4. **Verify**:
   - ✅ Downloaded images have edited text
   - ✅ Downloaded images have new underline/highlight styling
   - ✅ **Downloaded images have AI backgrounds** (not blank)

## Console Logs to Verify

When you click Save, you should see:
```
🔄 Text saved - triggering carousel re-render with new underline/highlight words from Gemini...
🖼️ Carousel 1: Preserved imageUrl = https://image.pollinations.ai/...
🖼️ Carousel 2: Preserved imageUrl = https://image.pollinations.ai/...
🖼️ Carousel 3: Preserved imageUrl = https://image.pollinations.ai/...
✅ Preserved AI image URLs in underlineWords: 5 carousels
   Updated underlineWords (with preserved AI images): {
     "1": {
       "underline": "...",
       "highlight": "...",
       "imageUrl": "https://image.pollinations.ai/...",  ← Preserved!
       "originalImageUrl": "https://image.pollinations.ai/..."  ← Preserved!
     }
   }
✨ Using newly extracted underline/highlight words from Gemini API
✅ Carousels re-rendered with new text + new underline/highlight words + preserved AI images!
```

## Code Quality

- ✅ No linter errors
- ✅ Clean merge logic
- ✅ Comprehensive logging
- ✅ Handles edge cases (missing data)
- ✅ Backward compatible

## Summary

Now when you:
1. ✅ Edit carousel text
2. ✅ Click Save
3. ✅ Gemini extracts new underline/highlight words
4. ✅ **AI image URLs are preserved**
5. ✅ Images regenerate with new text + new styling + AI backgrounds
6. ✅ Download includes everything

**AI images will never disappear when editing text!** 🎉

