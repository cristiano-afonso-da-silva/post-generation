#!/bin/bash

echo "🔍 Verifying 413 Error Fix Implementation..."
echo ""

# Check if required files exist
echo "✓ Checking new files..."
if [ -f "app/lib/uploadImages.ts" ]; then
    echo "  ✅ app/lib/uploadImages.ts exists"
else
    echo "  ❌ app/lib/uploadImages.ts NOT FOUND"
fi

if [ -f "vercel.json" ]; then
    echo "  ✅ vercel.json exists"
else
    echo "  ❌ vercel.json NOT FOUND"
fi

if [ -f "FIX_413_ERROR.md" ]; then
    echo "  ✅ FIX_413_ERROR.md exists"
else
    echo "  ❌ FIX_413_ERROR.md NOT FOUND"
fi

echo ""
echo "✓ Checking modified files..."

# Check if next.config.js has the body size limit
if grep -q "sizeLimit.*20mb" next.config.js; then
    echo "  ✅ next.config.js has 20MB size limit configured"
else
    echo "  ❌ next.config.js missing size limit configuration"
fi

# Check if CarouselImageGenerator imports uploadImagesToStorage
if grep -q "uploadImagesToStorage" app/components/CarouselImageGenerator.tsx; then
    echo "  ✅ CarouselImageGenerator.tsx imports uploadImagesToStorage"
else
    echo "  ❌ CarouselImageGenerator.tsx missing upload import"
fi

# Check if save route handles imageUrls
if grep -q "imageUrls.*providedImageUrls" app/api/generations/save/route.ts; then
    echo "  ✅ Save API route handles pre-uploaded images"
else
    echo "  ❌ Save API route missing imageUrls handling"
fi

echo ""
echo "🎯 Next Steps:"
echo "  1. Restart your dev server: npm run dev"
echo "  2. Open the app and generate carousels"
echo "  3. Check browser console for upload logs"
echo "  4. Verify no 413 errors occur"
echo ""
echo "📖 Read FIX_413_ERROR.md for detailed information"
echo ""

