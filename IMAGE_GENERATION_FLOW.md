# Image Generation Flow - Debugging Guide

## Overview
When you select "Text + Image" in the dropdown, the system should automatically fetch images for MIDDLE (content) carousels. This document explains how the flow works and how to debug issues.

## The Complete Flow

### 1. Frontend Selection (page.tsx)
```typescript
// State: defaults to false (Text only)
const [includeImages, setIncludeImages] = useState(false)

// Dropdown changes this state
<select value={includeImages ? 'text-image' : 'text'} 
        onChange={(e) => setIncludeImages(e.target.value === 'text-image')}>
  <option value="text">Text (1 credit)</option>
  <option value="text-image">Text + Image (2 credits)</option>
</select>
```

**When "Text + Image" is selected:**
- `includeImages` state → `true`
- Required credits → `2`
- This value is sent to the API

### 2. Frontend → Backend (API Call)
```typescript
// page.tsx line ~404
fetch('/api/social', {
  method: 'POST',
  body: JSON.stringify({
    action: 'note',
    ideaTitle: idea,
    accountDescription: accountDescription.trim(),
    includeImages: includeImages  // ← This should be true when "Text + Image" selected
  })
})
```

### 3. Backend Receives Parameter (route.ts)
```typescript
// Line ~886: Extract from request body
const { action, accountDescription, ideaTitle, includeImages } = body;

// Line ~916: Set default if undefined (backward compatibility)
const shouldIncludeImages = includeImages !== undefined ? includeImages : true;

// Line ~918: Pass to generateNote function
const result = await generateNote(ideaTitle.trim(), accountDescription?.trim() || '', shouldIncludeImages);
```

### 4. Generate Note Function (route.ts ~line 768)
```typescript
async function generateNote(ideaTitle: string, accountDescription: string, includeImages: boolean = true) {
  // ... generate carousel content with AI ...
  
  // Line ~829: Call extractUnderlineWords with includeImages parameter
  const underlineWords = await extractUnderlineWords(data.slides, includeImages);
  
  return { ..., underlineWords };
}
```

### 5. Extract Underline Words & Fetch Images (route.ts ~line 611)
```typescript
async function extractUnderlineWords(carousels: any[], includeImages: boolean = true) {
  console.log(`Extracting emphasis words and ${includeImages ? '🖼️ images (enabled)' : '📝 NO images (disabled)'}`);
  
  for (let i = 0; i < carousels.length; i++) {
    const carousel = carousels[i];
    
    // ... extract underline/highlight words ...
    
    // Line ~737: Only fetch images if includeImages = true AND kind = MIDDLE
    if (includeImages && carousel.kind === 'MIDDLE' && imageSearchKeywords) {
      console.log(`🖼️ MIDDLE CAROUSEL ${i + 1}: Attempting to fetch image...`);
      const imageResult = await searchPexelsImage(imageSearchKeywords, usedImageIds);
      results[i].imageUrl = imageResult?.url || null;
    } else if (!includeImages && carousel.kind === 'MIDDLE') {
      console.log(`📝 MIDDLE CAROUSEL ${i + 1}: Images disabled by user - skipping image fetch`);
    }
  }
}
```

### 6. Pexels API Call (route.ts ~line 463)
```typescript
async function searchPexelsImage(query: string, usedPhotoIds: Set<number>) {
  console.log('🖼️ PEXELS IMAGE SEARCH INITIATED');
  console.log(`📝 Search Query: "${query}"`);
  
  const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5...`, {
    headers: { Authorization: PEXELS_API_KEY }
  });
  
  // Returns { url: string, id: number } or null
}
```

## Debugging Logs Added

I've added comprehensive logging throughout the flow. When you run the app, check the **browser console** and **server terminal** for these logs:

### Browser Console (Frontend)
```
🖼️ Frontend: Sending includeImages = true/false
🖼️ Frontend: Refreshing slides with includeImages = true/false
```

### Server Terminal (Backend)
```
🖼️ Backend: Received includeImages = true/false → Using shouldIncludeImages = true/false
🖼️ generateNote: includeImages parameter = true/false
🖼️ generateNote: Calling extractUnderlineWords with includeImages = true/false
🎨 Extracting emphasis words and 🖼️ images (enabled) / 📝 NO images (disabled)
🖼️ MIDDLE CAROUSEL X: Attempting to fetch image...
🖼️ PEXELS IMAGE SEARCH INITIATED
📝 Search Query: "..."
✅ SUCCESS: Found horizontal image!
```

## How to Test

### Test 1: Verify Parameter Passing
1. Open browser DevTools Console
2. Open server terminal
3. Select **"Text + Image (2 credits)"** from dropdown
4. Generate a note
5. **Look for these logs in sequence:**
   - Browser: `🖼️ Frontend: Sending includeImages = true`
   - Server: `🖼️ Backend: Received includeImages = true`
   - Server: `🖼️ generateNote: includeImages parameter = true`
   - Server: `🎨 Extracting emphasis words and 🖼️ images (enabled)`
   - Server: `🖼️ MIDDLE CAROUSEL X: Attempting to fetch image...`

### Test 2: Verify Image URLs in Response
1. After generation completes, check the note data
2. Look for `underlineWords` in the response
3. For MIDDLE carousels, check if `imageUrl` is present:
```javascript
// In browser console after generation:
console.log(JSON.stringify(note.underlineWords, null, 2))
```

Expected output for MIDDLE carousels when images are enabled:
```json
{
  "0": { "highlight": "word", "underline": "...", "imageUrl": null },  // HOOK - no image
  "1": { 
    "highlight": "word", 
    "underline": "phrases", 
    "imageSearch": "visual keywords",
    "imageUrl": "https://images.pexels.com/photos/..."  // ← Should have URL!
  },
  "2": { ... }
}
```

## Common Issues & Solutions

### Issue 1: `includeImages` is always `false`
**Check:** Browser console - does it show `includeImages = false` even when you selected "Text + Image"?
**Solution:** Clear localStorage and refresh, or check if the dropdown state is updating properly

### Issue 2: `includeImages` is `true` but no images found
**Check:** Server logs - are you seeing "🖼️ PEXELS IMAGE SEARCH INITIATED"?
**Possible causes:**
- Pexels API key not set: Check `.env.local` for `PEXELS_API_KEY`
- No search keywords generated: Check if `imageSearch` is empty
- Pexels API rate limit: You get 200 requests/hour
- Network error: Check server logs for API errors

### Issue 3: Images found but not displayed
**Check:** The `CarouselImageGenerator` component
**Solution:** Verify that `underlineWords` prop includes `imageUrl` and the component is using it

### Issue 4: Default state issue
**Current behavior:** `includeImages` defaults to `false` (Text only)
**If you want images by default:** Change line 71 in `page.tsx`:
```typescript
const [includeImages, setIncludeImages] = useState(true)  // Default to Text + Image
```

## Quick Debug Checklist

- [ ] Browser console shows `includeImages = true` when sending request
- [ ] Server logs show `includeImages = true` when receiving request
- [ ] Server logs show "🖼️ images (enabled)" in extractUnderlineWords
- [ ] Server logs show "🖼️ PEXELS IMAGE SEARCH INITIATED" for MIDDLE carousels
- [ ] `.env.local` has valid `PEXELS_API_KEY`
- [ ] Response data includes `imageUrl` for MIDDLE carousels
- [ ] CarouselImageGenerator receives and uses the `imageUrl`

## Need More Help?

If images still aren't working after checking the logs:
1. Share the complete log output from both browser and server
2. Verify your Pexels API key is valid at https://www.pexels.com/api/
3. Check if you've hit the rate limit (200 requests/hour)
4. Try a simple test with just one MIDDLE carousel to isolate the issue

