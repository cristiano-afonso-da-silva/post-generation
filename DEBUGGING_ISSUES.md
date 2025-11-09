# Debugging Issues Found

## Issue 1: Missing Image for Carousel 5

**Symptom:**
- Carousel 5 (MIDDLE carousel) shows `imageUrl: null`
- Warning: `⚠️ Carousel 5: No imageUrl in emphasisData for MIDDLE carousel!`
- Image not drawn: `loadedImage=false, imageWidth=0, imageHeight=0`

**Possible Causes:**

### A. Pexels API Didn't Return an Image
Check your **server terminal logs** for Carousel 5. You should see one of these:

1. **If Pexels was called:**
   ```
   🖼️ MIDDLE CAROUSEL 5: Attempting to fetch image...
   Keywords: "..."
   ❌ FAILED: No image URL returned for carousel 5
   ```
   **Possible reasons:**
   - Pexels API key invalid or missing
   - Rate limit exceeded (200 requests/hour)
   - No matching images for the search keywords
   - Network error

2. **If Pexels was NOT called:**
   ```
   ⚠️ MIDDLE CAROUSEL 5: NO imageSearch keywords!
   ```
   **This means:** Gemini didn't generate image search keywords for this carousel

3. **If images were disabled:**
   ```
   📝 MIDDLE CAROUSEL 5: Images disabled by user (includeImages=false)
   ```
   **This means:** The `includeImages` flag was `false` when generating

### B. How to Fix

**If Pexels API issue:**
1. Check `.env.local` has `PEXELS_API_KEY` set
2. Verify API key is valid at https://www.pexels.com/api/
3. Check if you've hit rate limit (200/hour)
4. Try generating again - might be a temporary network issue

**If no imageSearch keywords:**
- This shouldn't happen with the fallback in place
- Check server logs for Gemini extraction errors
- The fallback should generate keywords from content

**If includeImages was false:**
- Check browser console for: `🖼️ Frontend: Sending includeImages = true`
- Check server logs for: `🖼️ Backend: Received includeImages = true`
- Make sure you selected "Text + Image (2 credits)" before generating

---

## Issue 2: localStorage QuotaExceededError

**Symptom:**
```
Error saving images to localStorage: QuotaExceededError: 
Failed to execute 'setItem' on 'Storage': 
Setting the value of 'postGeneration_canvasImages' exceeded the quota.
```

**What This Means:**
- Browser localStorage has a limit (typically 5-10MB per origin)
- Canvas images stored as data URLs are very large (1-2MB each)
- With 6 carousels, that's 6-12MB total, which exceeds the limit

**Impact:**
- ✅ **Images will still display** - this only affects caching
- ❌ Images won't be cached for next visit
- ❌ Regenerating on page refresh will require new API calls

**Solution Applied:**
I've added graceful error handling that:
1. Catches the QuotaExceededError
2. Logs a warning (doesn't crash the app)
3. Still saves content hashes (for validation)
4. Images still display normally

**Long-term Solutions:**

### Option 1: Reduce Image Quality (Quick Fix)
Modify canvas export to use lower quality:
```typescript
const dataUrl = canvas.toDataURL('image/jpeg', 0.7) // 70% quality instead of PNG
```

### Option 2: Use IndexedDB (Better Solution)
IndexedDB has much higher limits (50MB+). Would require refactoring storage.

### Option 3: Don't Cache Images Locally
Rely only on Supabase backend storage. Images are already saved there.

### Option 4: Clear Old localStorage Data
Add a cleanup function to remove old cached images periodically.

---

## How to Debug Further

### Step 1: Check Server Logs
When you generate a note, look in your **server terminal** for:

```
🖼️ Backend: Received includeImages = true
🖼️ generateNote: includeImages parameter = true
🎨 Extracting emphasis words and 🖼️ images (enabled)

For each MIDDLE carousel:
🖼️ MIDDLE CAROUSEL X: Attempting to fetch image...
   Keywords: "..."
   includeImages flag: true
✅ SUCCESS: Image added to carousel X
   Image URL: https://images.pexels.com/...
```

### Step 2: Check Browser Console
Look for:
```
📦 CarouselImageGenerator: Received underlineWords:
✅ Carousel 5 (MIDDLE): Has imageUrl = https://...
```

### Step 3: Verify Pexels API Key
1. Check `.env.local` file exists
2. Verify `PEXELS_API_KEY=your_key_here`
3. Test API key: https://www.pexels.com/api/

### Step 4: Check Rate Limits
- Pexels free tier: 200 requests/hour
- If you've generated many notes, you might have hit the limit
- Wait an hour or upgrade your Pexels plan

---

## Quick Test

1. **Clear localStorage** (to avoid quota issues):
   ```javascript
   // In browser console:
   localStorage.clear()
   ```

2. **Generate a new note** with "Text + Image" selected

3. **Check both browser console AND server terminal** for the logs above

4. **Share the logs** if images still don't appear - they'll show exactly where the issue is

---

## Expected Behavior

When everything works correctly, you should see:

**Server Terminal:**
```
🖼️ Backend: Received includeImages = true
🖼️ MIDDLE CAROUSEL 1: Attempting to fetch image...
✅ SUCCESS: Image added to carousel 1
🖼️ MIDDLE CAROUSEL 2: Attempting to fetch image...
✅ SUCCESS: Image added to carousel 2
... (for all MIDDLE carousels)
```

**Browser Console:**
```
📦 CarouselImageGenerator: Received underlineWords:
✅ Carousel 1 (MIDDLE): Has imageUrl = https://...
✅ Carousel 2 (MIDDLE): Has imageUrl = https://...

🖼️ Carousel 1: Attempting to load image from: https://...
✅ Carousel 1: Image loaded successfully! Dimensions: 1920x1080
🖼️ Rendering pre-loaded image for carousel 1
✅ Image successfully drawn on canvas for carousel 1!
```

If you see different logs, that's where the problem is!

