# Generate Template Feature

## Overview

A new feature has been added that allows users to create custom carousel templates using AI. Users can upload 1-3 images along with a description, and Gemini will analyze the images and generate a custom template configuration that matches the desired style.

## What Was Implemented

### 1. New Sidebar Menu Item
- Added "Generate Template" tab with a sparkles icon to the left sidebar
- Located between "Post" and the user profile section

### 2. Generate Template Page (`app/_internal/generate-template-page.tsx`)
- **Image Upload Section**: Users can upload 1-3 images
  - Drag-and-drop or click to upload
  - Image preview with remove button
  - Maximum 3 images enforced
  
- **Description Section**: Text area for users to describe their desired template style
  - Placeholder text with helpful examples
  - Minimum required for generation
  
- **Generate Button**: Triggers AI template generation
  - Shows loading state during generation
  - Success/error messages
  - Auto-clears form after successful generation

- **Tips Section**: Guidelines for best results

### 3. API Endpoint (`app/api/templates/generate/route.ts`)
- **POST `/api/templates/generate`**
- Accepts: `images` (base64 array), `description`, `userId`
- Uses Gemini 2.0 Flash to analyze images
- Generates complete template configuration including:
  - Font selections (family, size, weight, style)
  - Color palette (background, text colors)
  - Layout settings (alignment, spacing, padding)
  - Image generation prompts
  - Footer configuration
- Saves generated template to database
- Returns template ID and configuration

### 4. Database Migration (`supabase_migration_custom_templates.sql`)
- **Table**: `custom_templates`
  - `id`: TEXT (primary key)
  - `user_id`: UUID (references auth.users)
  - `name`: TEXT (template name)
  - `config`: JSONB (complete template configuration)
  - `created_at`: TIMESTAMP
  - `updated_at`: TIMESTAMP
  
- **Row Level Security (RLS)**: Enabled with policies
  - Users can only view their own templates
  - Users can create, update, and delete their own templates
  
- **Indexes**: Optimized for user_id and created_at queries

### 5. Template List API (`app/api/templates/list/route.ts`)
- **GET `/api/templates/list`**
- Returns all custom templates for the authenticated user
- Transforms database records to template format

### 6. Template Configuration Updates (`app/config/carouselTemplates.ts`)
- Added template caching mechanism for performance
- New functions:
  - `fetchCustomTemplates()`: Fetches and caches custom templates
  - `getCachedCustomTemplates()`: Returns cached templates
  - `initializeTemplateCache()`: Initializes cache on app load
  - `getCarouselTemplateAsync()`: Async version supporting custom templates
  - Updated `getCarouselTemplate()`: Now checks cache for custom templates
  - `getAllTemplates()`: Returns both default and custom templates

### 7. Template Selector Modal Updates (`app/components/TemplateSelectorModal.tsx`)
- Loads custom templates when modal opens
- Displays custom templates with sparkles icon
- Shows "Custom Template - AI Generated" placeholder for custom templates
- Differentiates custom templates visually from default templates

### 8. Dashboard Integration (`app/dashboard/page.tsx`)
- Added "Generate Template" view support
- Initializes template cache when user logs in
- Routes to generate-template-page when view is active

## How It Works

1. **User Flow**:
   ```
   User clicks "Generate Template" in sidebar
   → Uploads 1-3 images + description
   → Clicks "Generate Template"
   → Gemini analyzes images and description
   → Creates template matching the style
   → Saves to database
   → Template appears in template selector
   ```

2. **Template Generation Process**:
   - Images are converted to base64 for Gemini API
   - Gemini analyzes color palette, typography, and aesthetic
   - AI selects appropriate fonts from available options:
     - Poppins (modern)
     - Playfair Display (elegant)
     - OpenSauce (contemporary)
     - Mansalva (playful)
     - DreamingOutloudSans (casual)
   - Generates complete template configuration
   - Maps font families to their file paths
   - Builds template with proper structure
   - Saves to database with user association

3. **Template Usage**:
   - Custom templates are cached on app load
   - Available immediately in template selector
   - Works seamlessly with existing carousel generator
   - Can be used for any carousel creation

## Database Setup

**IMPORTANT**: Run the database migration before using this feature:

```bash
# Execute the SQL migration in your Supabase dashboard
# Or use the Supabase CLI:
supabase db push
```

The migration file is located at: `supabase_migration_custom_templates.sql`

## Files Created/Modified

### Created:
1. `app/_internal/generate-template-page.tsx` - Main UI page
2. `app/api/templates/generate/route.ts` - Template generation API
3. `app/api/templates/list/route.ts` - Template fetching API
4. `supabase_migration_custom_templates.sql` - Database schema
5. `GENERATE_TEMPLATE_FEATURE.md` - This documentation

### Modified:
1. `app/components/Sidebar.tsx` - Added menu item
2. `app/dashboard/page.tsx` - Added view support and cache initialization
3. `app/config/carouselTemplates.ts` - Added caching and custom template support
4. `app/components/TemplateSelectorModal.tsx` - Added custom template display

## Template Structure

Custom templates follow the same `CarouselTemplate` interface as default templates:

```typescript
{
  id: 'custom_1234567890_abc12345',
  name: 'User-chosen name',
  fonts: { hook, title, content, ... },
  background: { type, value },
  textColor: '#FFFFFF',
  styles: { letterSpacing, textAlign },
  layout: { contentMaxWidth, verticalAlign, ... },
  imageLayout: { position, maxHeightRatio, ... },
  imagePrompt: 'Description for AI image generation',
  hookLayout: { showTopic, showSubtitle, ... },
  footer: { enabled, height, ... }
}
```

## Features

✅ Upload 1-3 reference images
✅ Describe desired template style
✅ AI-powered template generation via Gemini
✅ Automatic font and color selection
✅ Custom layout configuration
✅ User-specific template storage
✅ Seamless integration with existing templates
✅ Template caching for performance
✅ Visual differentiation in template selector
✅ Full RLS security

## Future Enhancements (Optional)

- Preview generated template before saving
- Edit custom templates after generation
- Share custom templates with other users
- Template versioning
- Template categories/tags
- Template analytics (usage tracking)
- Export/import template configurations
- Template preview thumbnails generation

## Testing

To test the feature:

1. Run the database migration
2. Log in to the app
3. Click "Generate Template" in the sidebar
4. Upload 1-3 images representing your desired style
5. Describe the style in detail
6. Click "Generate Template"
7. Wait for generation (usually 5-10 seconds)
8. Go to "Create" and open the template selector
9. Your custom template should appear with a sparkles icon

## Notes

- Gemini API key must be configured in environment variables
- Custom templates are user-specific (not shared globally)
- Template IDs follow format: `custom_timestamp_userIdPrefix`
- Templates are cached on dashboard load for better performance
- Font files must exist in `/public/templates/` directories
- Template generation uses approximately 1 Gemini API call per generation

