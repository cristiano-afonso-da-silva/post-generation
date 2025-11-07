# 🎨 Post My Note - AI-Powered Social Media Content Creator

A complete full-stack application for generating high-quality Instagram carousel posts using Google Gemini AI. Generate post ideas, create complete carousels with slides and captions, and download ready-to-post images.

## ✨ Features

### Backend API
- 🤖 **AI-Powered Generation** - Uses Google Gemini 2.0 Flash for high-quality content
- 💡 **Post Ideas Generation** - Generate 10 unique, diverse post ideas
- 🎨 **Carousel Creation** - Complete carousel posts with:
  - Hook slide (concise, powerful opening)
  - 2-7 middle slides (detailed content)
  - CTA slide (call to action)
  - Professional Instagram caption with hashtags
- ✅ **Comprehensive Validation** - Ensures quality and structure
- 📊 **Statistics & Metadata** - Word counts, generation times, and more

### Frontend Web App
- 🔐 **Authentication System** - Secure user authentication with Supabase
  - Landing page with feature showcase
  - Email/password sign up with verification
  - Sign in/out functionality
  - Protected routes
- 🎨 **Modern AI Design** - Dark theme with purple gradients and glassmorphism
- 📱 **Responsive UI** - Beautiful, mobile-friendly interface
- 🖼️ **Image Generation** - Automatically generate downloadable slide images
  - 1080x1350px (4:5 ratio for Instagram)
  - Custom backgrounds and fonts
  - Dynamic color themes (6 presets)
  - AI-powered text emphasis (underline & highlight)
  - Font combinations (Poppins + DreamingOutloudSans)
  - Vertically centered content
  - Safe zones for Instagram UI
- 📥 **Download Functionality** - Download individual slides or all at once
- 💫 **Smooth Animations** - Polished user experience

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- Supabase account ([Sign up here](https://supabase.com))

### 1. Clone and Setup

```bash
# Clone the repository
cd post-generation

# Install all dependencies (backend + frontend)
npm install
```

### 2. Environment Setup

Create environment files in the root folder:

**Backend configuration** (`.env`):
```bash
echo "GEMINI_API_KEY=your_api_key_here" > .env
echo "PORT=3000" >> .env
```

**Frontend configuration** (`.env.local`):
```bash
cat > .env.local << EOF
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:3000
EOF
```

**To get your Supabase credentials:**
1. Go to [supabase.com](https://supabase.com) and create a project
2. In your project dashboard, go to Settings → API
3. Copy your Project URL and anon/public key
4. Paste them into `.env.local`

### 3. Add Background Image (Optional)

Place a background image at:
```
public/backgrounds/background.jpg
```

### 4. Start the Application

**Option 1: Start both frontend and backend together (recommended):**
```bash
npm run dev
```

**Option 2: Start them separately:**
```bash
# Terminal 1 - Backend API
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

The app will be available at `http://localhost:3000`.

### 5. Use the App

1. Open `http://localhost:3000` in your browser
2. You'll see the landing page - click "Get Started" or "Sign Up"
3. Create an account with your email
4. Check your email for a verification code (6 digits)
5. Enter the code to verify your account
6. Once signed in, you can:
   - Enter your account description
   - Generate 10 post ideas
   - Select an idea to generate a complete carousel
   - Customize font and color themes
   - Download the slide images!

## 📁 Project Structure

```
post-generation/
├── app/
│   ├── page.tsx            # Main carousel generator page (protected)
│   ├── layout.tsx          # Root layout with AuthProvider
│   ├── globals.css         # Global styles
│   ├── landing/
│   │   └── page.tsx        # Landing page
│   ├── signin/
│   │   └── page.tsx        # Sign in page
│   ├── signup/
│   │   └── page.tsx        # Sign up page
│   ├── verify/
│   │   └── page.tsx        # Email verification page
│   ├── components/
│   │   └── SlideImageGenerator.tsx  # Image generation component
│   ├── context/
│   │   └── AuthContext.tsx # Authentication context
│   ├── lib/
│   │   └── supabase.ts     # Supabase client
│   └── config/
│       ├── slideThemes.ts  # Font & color theme configuration
│       └── README.md       # Theme customization guide
├── public/
│   ├── backgrounds/
│   │   ├── background.jpg  # Slide background image
│   │   └── README.md
│   └── fonts/
│       ├── Poppins-Bold.ttf
│       └── DreamingOutloudSans-Regular.otf
├── server.mjs              # Express API server
├── test-api.mjs            # Interactive test script
├── package.json            # All dependencies (backend + frontend)
├── .env                    # Backend environment variables (API key)
├── .env.local              # Frontend environment variables (Supabase keys)
├── next.config.js          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
└── README.md               # This file
```

## 🔌 API Documentation

### Base URL
```
http://localhost:3000/api
```

**Note:** The backend API runs on port 3000 with `/api` prefix, while the Next.js frontend runs on the same port.

### Endpoints

#### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "model": "gemini-2.0-flash-exp",
  "timestamp": "2025-11-06T..."
}
```

#### 2. Generate Ideas
```http
POST /api/social
Content-Type: application/json

{
  "action": "ideas",
  "accountDescription": "fitness coach for busy professionals"
}
```

**Response:**
```json
{
  "success": true,
  "action": "ideas",
  "data": {
    "ideas": [
      "Why Your Morning Routine Is Sabotaging Your Productivity",
      "The Five Minute Framework That Doubled My Client Base",
      ...
    ],
    "formatted": "...formatted text..."
  },
  "meta": {
    "count": 10,
    "generationTime": "2341ms",
    "model": "gemini-2.0-flash-exp"
  }
}
```

#### 3. Generate Carousel
```http
POST /api/social
Content-Type: application/json

{
  "action": "carousel",
  "ideaTitle": "Why Your Morning Routine Is Sabotaging Your Productivity",
  "accountDescription": "productivity coach for remote workers"
}
```

**Response:**
```json
{
  "success": true,
  "action": "carousel",
  "data": {
    "ideaTitle": "Why Your Morning Routine Is Sabotaging Your Productivity",
    "slides": [
      {
        "title": "Your morning routine is destroying your productivity",
        "content": "",
        "kind": "HOOK"
      },
      {
        "title": "The Problem",
        "content": "Most people pack their mornings with too many rigid tasks...",
        "kind": "MIDDLE"
      },
      ...
    ],
    "caption": "Most morning routines fail because...",
    "formatted": "...markdown formatted output...",
    "stats": {
      "totalSlides": 6,
      "hookWords": 9,
      "middleSlides": 4,
      "captionWords": 187
    }
  },
  "meta": {
    "generationTime": "4521ms",
    "model": "gemini-2.0-flash-exp"
  }
}
```

## 🎨 Slide Structure

### Hook Slide
- **Title:** Hook text (max 10 words)
- **Content:** Empty
- **Purpose:** Create curiosity and make readers swipe

### Middle Slides (2-7 slides)
- **Title:** 2-5 words (clear, punchy headline)
- **Content:** 18-32 words (specific, actionable information)
- **Purpose:** Deliver value and progress logically

### CTA Slide
- **Title:** Clear call-to-action
- **Content:** Imperative action text
- **Purpose:** Encourage engagement

## 🖼️ Image Generation

The frontend automatically generates downloadable images for each slide:

- **Dimensions:** 1080x1350px (4:5 aspect ratio for Instagram)
- **Background:** Pure white (#FFFFFF)
- **Text:** Black (#000000)
- **Safe Zones:** Margins to avoid Instagram UI overlap
- **Format:** PNG
- **Features:**
  - Vertically centered text
  - Proper text wrapping
  - Slide number indicator
  - Navigation arrow (if not last slide)
  - Purple accent highlights on hook slides

## 🛠️ Configuration

### Environment Variables

Create `.env` (backend):
```bash
GEMINI_API_KEY=your_api_key_here
PORT=3000
NODE_ENV=development
```

Create `.env.local` (frontend):
```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API URL (Optional, defaults to http://localhost:3000)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Model Selection

To change the AI model, edit `server.mjs`:
```javascript
const GEMINI_MODEL = 'gemini-2.0-flash-exp'; // Current model

// Available models:
// - gemini-2.0-flash-exp (experimental, latest features)
// - gemini-2.0-flash (stable Gemini 2.0)
// - gemini-2.5-pro (if available)
```

## 📊 Performance

Typical generation times:
- **Ideas:** 2-4 seconds
- **Carousel:** 4-8 seconds
- **Image Generation:** Instant (client-side)

## 🧪 Testing

### Test Backend API

```bash
npm test
```

This runs an interactive test script that:
- Checks server health
- Generates ideas
- Lets you choose an idea
- Generates a carousel
- Shows formatted output

### Test Full Application

```bash
npm run dev
```

Then open `http://localhost:3000` in your browser.

## 🐛 Troubleshooting

### Backend Issues

**"Missing GEMINI_API_KEY"**
- Make sure `.env` file exists in the root folder
- Check the API key is valid: `GEMINI_API_KEY=your_key`

**"Port 3000 already in use"**
- Kill the process: `lsof -ti:3000 | xargs kill -9`
- Or change port in `.env`: `PORT=3001`

**"Model not found"**
- Check the model name in `server.mjs`
- Try: `gemini-2.0-flash` or `gemini-2.0-flash-exp`

### Frontend Issues

**"Failed to fetch"**
- Make sure both frontend and backend are running (`npm run dev`)
- Check CORS configuration in `server.mjs`
- Verify `NEXT_PUBLIC_API_URL` matches backend URL

**Authentication not working**
- Check Supabase credentials in `.env.local`
- Verify Supabase project is active
- Check browser console for errors
- Enable email authentication in Supabase dashboard:
  - Go to Authentication → Settings
  - Enable Email provider
  - Configure email templates (optional)

**Images not generating**
- Check browser console for errors
- Ensure canvas is supported in your browser
- Make sure background image exists at `public/backgrounds/background.jpg`
- Verify fonts are loaded correctly
- Try refreshing the page

## 📝 Development

### Development Mode (Both Frontend + Backend)

```bash
npm run dev  # Runs both with auto-reload
```

### Or run separately:

**Backend:**
```bash
npm run dev:backend  # Auto-reload on changes
```

**Frontend:**
```bash
npm run dev:frontend  # Next.js dev server with hot reload
```

### Build for Production

```bash
# Build frontend
npm run build

# Start production server
npm start

# Start backend API (in separate terminal)
npm run start:backend
```

## 🎯 Usage Examples

### Generate Ideas
```bash
curl -X POST http://localhost:3000/api/social \
  -H "Content-Type: application/json" \
  -d '{
    "action": "ideas",
    "accountDescription": "productivity coach helping remote workers"
  }'
```

### Generate Carousel
```bash
curl -X POST http://localhost:3000/api/social \
  -H "Content-Type: application/json" \
  -d '{
    "action": "carousel",
    "ideaTitle": "Why Your Morning Routine Is Sabotaging Your Productivity",
    "accountDescription": "productivity coach"
  }'
```

## 🔒 Security Notes

- Never commit `.env` or `.env.local` files to git
- Keep your Gemini API key secure
- Keep your Supabase keys secure (they're already in `.gitignore`)
- The anon key is safe to use in the frontend
- For production, configure Supabase Row Level Security (RLS) policies
- The `.gitignore` file is configured to exclude sensitive files

## 📚 Tech Stack

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **@google/generative-ai** - Gemini AI SDK
- **dotenv** - Environment variables

### Frontend
- **Next.js 14** - React framework
- **React** - UI library
- **TypeScript** - Type safety
- **Supabase** - Authentication & database
- **Canvas API** - Image generation
- **Custom Fonts** - Poppins & DreamingOutloudSans

## 🤝 Contributing

This is a demonstration project showing best practices for:
- AI API integration
- Structured output generation
- Professional formatting
- Image generation
- Modern web UI

Feel free to adapt and improve for your needs!

## 📄 License

MIT

## 🙏 Acknowledgments

- Powered by [Google Gemini AI](https://ai.google.dev/)
- Built with modern web technologies
- Inspired by best practices in AI content generation

---

**Built with ❤️ for content creators**
