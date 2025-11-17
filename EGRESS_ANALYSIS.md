# Egress Analysis: Image Retrieval from Supabase Storage

## Summary
This document identifies **exactly when and where** your app retrieves images from the Supabase storage bucket, causing egress costs.

## Egress-Causing Operations

### 1. `storage.list()` Calls (CAUSES EGRESS)
These operations download file metadata from storage, causing egress:

#### Location 1: `app/api/generations/list/route.ts`
- **Line 96-98**: Calls `storage.list()` when cached URLs are completely missing
- **When**: When `image_urls` field in database is empty/null for a generation
- **Frequency**: Only when cache is missing (should be rare if URLs are properly saved)
- **Fix**: Ensure URLs are always saved to database when images are uploaded

#### Location 2: `app/api/generations/[id]/route.ts`
- **Line 88-90**: Calls `storage.list()` when cached URLs are completely missing
- **When**: When `image_urls` field in database is empty/null for a generation
- **Frequency**: Only when cache is missing (should be rare if URLs are properly saved)
- **Fix**: Ensure URLs are always saved to database when images are uploaded

#### Location 3: `app/lib/uploadImages.ts` - `checkImagesExist()`
- **Line 136-138**: Calls `storage.list()` to check if images already exist
- **When**: Before uploading images, to avoid re-uploading
- **Frequency**: Every time images are checked before upload
- **Fix**: Check database `image_urls` field instead of calling storage.list()

#### Location 4: `app/api/generations/save/route.ts`
- **Line 171-173**: Calls `storage.list()` when deleting old images during update
- **When**: When updating a generation with new images
- **Frequency**: Only during updates that replace images
- **Fix**: Use known file paths instead of listing (we know the pattern: slide-0.png, slide-1.png, etc.)

### 2. Image Downloads (EXPECTED, but can be optimized)
These are expected operations but can be optimized with better caching:

#### Location 5: Browser fetching signed URLs
- **When**: Browser loads images from signed URLs
- **Frequency**: Every time images are displayed
- **Optimization**: Already using 24-hour signed URLs and CDN caching

#### Location 6: `app/lib/imageCache.ts` - `convertUrlToDataUrl()`
- **Line 135**: Fetches images to convert to data URLs for client-side caching
- **When**: When converting signed URLs to data URLs for localStorage caching
- **Frequency**: Once per image, then cached in localStorage
- **Note**: This is client-side, so egress is from Supabase to user's browser (expected)

## Non-Egress Operations (URL Generation Only)

These operations **DO NOT** cause egress - they only generate URLs:

- `createSignedUrl()` - Generates signed URLs (no data transfer)
- `getPublicUrl()` - Generates public URLs (no data transfer)
- `upload()` - Uploads data (ingress, not egress)

## Root Cause

The main issue is that `storage.list()` is being called as a fallback when cached URLs are missing from the database. This happens when:

1. Images are uploaded but URLs aren't saved to the database
2. Database `image_urls` field is null/empty
3. Code falls back to `storage.list()` to discover files

## Solution Strategy

1. **Always save URLs to database**: Ensure `image_urls` are saved immediately after upload
2. **Remove storage.list() fallbacks**: Instead of listing storage, construct file paths directly (we know the pattern: `slide-0.png`, `slide-1.png`, etc.)
3. **Use database as source of truth**: Never call `storage.list()` to discover files - use database URLs or construct paths
4. **Optimize checkImagesExist**: Check database instead of storage.list()

## Fixes Applied

### ✅ Fixed: `app/api/generations/list/route.ts`
- **Before**: Called `storage.list()` when cached URLs were missing
- **After**: Reconstructs URLs from known file pattern (`slide-0.png`, `slide-1.png`, etc.) and saves to database
- **Impact**: Eliminates `storage.list()` egress when listing generations

### ✅ Fixed: `app/api/generations/[id]/route.ts`
- **Before**: Called `storage.list()` when cached URLs were missing
- **After**: Reconstructs URLs from known file pattern and saves to database
- **Impact**: Eliminates `storage.list()` egress when fetching single generation

### ✅ Fixed: `app/lib/uploadImages.ts` - `checkImagesExist()`
- **Before**: Called `storage.list()` to check if images exist
- **After**: Checks database first, then tries known file paths if needed
- **Impact**: Eliminates `storage.list()` egress when checking for existing images

### ✅ Fixed: `app/lib/uploadImages.ts` - `deleteOldImages()`
- **Before**: Called `storage.list()` to find files to delete
- **After**: Uses known file pattern to check which files exist
- **Impact**: Eliminates `storage.list()` egress when deleting old images

### ✅ Fixed: `app/api/generations/save/route.ts`
- **Before**: Called `storage.list()` when deleting old images during update
- **After**: Uses known file pattern to find files to delete
- **Impact**: Eliminates `storage.list()` egress when updating generations

## Remaining Egress Sources

The only remaining egress sources are:
1. **Browser fetching signed URLs** - This is expected and necessary for displaying images
2. **Client-side image caching** - Converting URLs to data URLs (expected, happens once per image)

Both of these are expected operations and cannot be eliminated without breaking functionality.

