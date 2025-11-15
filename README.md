# 🎨 Post My Note – AI-Powered Instagram Carousel Generator

This repository contains the full-stack application that powers Post My Note: a workflow for creating high-converting Instagram carousels (hook → middle slides → CTA) complete with captions, downloadable images, and integration with billing and analytics services.  

> **Why the big README?**  
> The project originally shipped with more than a dozen Markdown docs (PEXELS_SETUP.md, FLEXIBLE_LAYOUT_FIX.md, etc.). Everything is now consolidated here so you only have one reference point.

---

## 📦 What You Get

| Area | Highlights |
|------|------------|
| **Generation** | Gemini 2.0 Flash for ideas + full notes, automatic underline/highlight extraction, image keywords, Pexels-powered images (unique horizontal 16:9), vertically centered slides that respect Instagram safe zones, editable preview that regenerates emphasis & imagery on save |
| **Frontend** | Next.js 14, responsive UI, Auth-protected dashboard, slide editor, one-click downloads (single or zip), dynamic font/color themes, Pexels image toggle, debug panel (hidden by default) |
| **Backend** | Next.js route handlers + Supabase for auth & credits, Stripe subscriptions (Portal + webhook), rate-limit aware Gemini retries, health checks |
| **Dev Experience** | TypeScript, shared env handling, Supabase tooling, database migrations, detailed troubleshooting guides baked into this README |

---

## 🗺️ Architecture at a Glance

- **app/page.tsx** – Main generator/preview/editor experience
- **app/api/social/route.ts** – Core Gemini/Pexels orchestration
- **app/components/SlideImageGenerator.tsx** – Canvas renderer (hook/middle/CTA) with safe-zone aware layout and image compositing
- **Supabase** – Auth, user credits, saved generations
- **Stripe** – Subscription checkout & billing portal
- **Pexels** – Stock imagery for middle slides
- **Google Gemini** – Idea and slide content generation, underline/highlight extraction

---

## 🛠️ Prerequisites

- Node.js ≥ 18
- npm (bundled) or yarn
- Supabase project (auth + database)
- Stripe account (for subscriptions/credits)
- Google Gemini API key
- Pexels API key (optional but recommended for imagery)
- Vercel account (optional, for hosting)

---

## 🔑 Environment Variables

Create **`.env.local`** (Next.js + API routes):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | Base URL for client (e.g. `http://localhost:3000`) |
| `GEMINI_API_KEY` | Google Gemini key |
| `PEXELS_API_KEY` | Pexels key (required for images) |
| `STRIPE_SECRET_KEY` | Stripe secret |
| `STRIPE_PUBLISHABLE_KEY` | Stripe public key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `STRIPE_PRICE_ID_BASIC` / `STRIPE_PRICE_ID_PRO` | Plan IDs (if using plans) |
| `NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID` / `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID` | Matching public IDs |
| `NEXT_PUBLIC_STRIPE_PORTAL_RETURN_URL` | Where users land after portal |
| `THREADS_APP_ID` | Threads App ID from developers.facebook.com (separate from Meta/Facebook app) |
| `THREADS_APP_SECRET` | Threads App Secret (for Threads posting) |
| `THREADS_REDIRECT_URI` | OAuth callback URL (e.g., `https://redirectmeto.com/http://localhost:3000/api/threads/callback`) |

> **Tip:** Keep `.env` + `.env.local` in sync locally and in Vercel environment settings.

---

## 🧱 Database Setup (Supabase)

1. **Create tables**  
   ```sql
   -- user_credits table (supabase_migration_user_credits.sql)
   create table if not exists user_credits (
     user_id uuid primary key references auth.users on delete cascade,
     credits_remaining integer default 0,
     current_plan text,
     subscription_status text,
     updated_at timestamptz default now()
   );

   -- generations table (supabase_migration_generations.sql)
   create table if not exists generations (
     id uuid primary key default uuid_generate_v4(),
     user_id uuid references auth.users on delete cascade,
     idea_title text,
     slides jsonb,
     caption text,
     created_at timestamptz default now()
   );
   ```

2. **RLS policies** – enable row level security and allow users to access only their rows (documentation covered in Supabase dashboard).

3. **Auth** – enable email/password auth and configure the redirect URL:
   - `Authentication → URL Configuration → Site URL` – `https://postmynote.app` (prod) or `http://localhost:3000`
   - `Redirect URLs` – add `http://localhost:3000/**` for local testing

---

## 💳 Stripe Setup (Optional but recommended)

1. Create products/prices (e.g., `Basic`, `Pro`) → copy price IDs into the environment vars above.
2. Configure webhook:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Use the signing secret in `STRIPE_WEBHOOK_SECRET`.
3. The app exposes:
   - `POST /api/stripe/create-checkout`
   - `POST /api/stripe/create-portal`
   - `POST /api/stripe/subscription-renewal`
   - `POST /api/stripe/webhook`

---

## 📸 Pexels Integration

1. Create an account at [pexels.com/api](https://www.pexels.com/api/)  
2. Generate an API key → set `PEXELS_API_KEY`
3. The app requests up to 5 landscape images per middle slide, filters by aspect ratio (≥1.2), and avoids reuse within a generation.
4. Toggle imagery on/off via “Include images in posts” checkbox before generating or editing slides.

---

## ⚙️ Running Locally

```bash
npm install
npm run dev         # Runs Next.js + API routes together
# or
npm run dev:frontend
npm run dev:backend
```

Visit `http://localhost:3000`.

---

## 🧭 User Flow

1. **Describe your business** → generate 10 ideas (free)
2. **Pick one idea** → consumes 1 credit, generates:
   - Hook + middle + CTA slides
   - Instagram-ready caption
   - Underline/highlight data + image keywords
   - Pexels image URLs (if enabled)
3. **Customize**  
   - Change fonts/themes  
   - Edit slide text inline → press **Save Slides** to re-run Gemini/Pexels for underline/highlight/images  
   - Download individual slides or a zipped set

---

## 🖼️ Slide Rendering Notes

- Canvas resolution: **1080 × 1350** (Instagram 4:5)
- Safe zone: 100 px sides, 150 px top/bottom
- Hook slides auto-scale font horizontally & vertically (≥ 50% size)
- Middle slides auto-scale title/content + maintain 20 px spacing
- Images: 880 × 495 (16:9), center-cropped with rounded corners
- Highlights always render at 50% opacity regardless of theme

---

## 🧪 Testing Scripts

```bash
npm run lint
npm run test        # Optional interactive API test script
npm run build
npm start           # Production mode (Next.js)
```

---

## 🌐 Deployment Checklist

1. Push to GitHub (optional: connect repo to Vercel)
2. In Vercel project settings set environment vars (see table above)
3. Add Supabase + Stripe webhook URLs to Vercel dashboard
4. Update Supabase auth redirect URLs to include production domain
5. Deploy from Vercel or run `vercel deploy`

---

## 🧭 Troubleshooting Guide

| Issue | Fix |
|-------|-----|
| **Gemini 429 / quota** | Implemented retry/backoff (`callGeminiWithRetry`). If you still see warnings, wait for the suggested delay or upgrade limits. |
| **Pexels returns no image** | Check `PEXELS_API_KEY`, watch the console for “Images disabled” or “NO KEYWORDS.” Gemini falls back to content keywords if needed. |
| **Slides overflow vertically** | Hook + middle slides auto-scale; if content still breaks safe zones, reduce text or disable imagery. |
| **Supabase login redirects to production domain** | Add `http://localhost:3000/**` to Supabase redirect allow list and set `NEXT_PUBLIC_APP_URL` per environment. |
| **Local credits not updating** | Ensure `SUPABASE_SERVICE_ROLE_KEY` is present (used for server mutations). |
| **Stripe webhook failing** | Verify `STRIPE_WEBHOOK_SECRET` matches the live/cli webhook; check Vercel logs. |

---

## 📝 Maintenance Recipes

| Task | Command |
|------|---------|
| Add credits via script | `node scripts/add-credits.js <email> <amount>` (create similar to example used earlier) |
| Clear cached slides | Delete `postGeneration_canvasImages` / `postGeneration_fullContentHash` from localStorage |
| Toggle debug panel | In `app/page.tsx`, change `showDebugPanel` to `true` |
| Update fonts/themes | Edit `app/config/slideThemes.ts` |
| Adjust image layout | Modify `app/components/SlideImageGenerator.tsx` |

---

## 📚 Changelog Highlights (Previously Separate Docs)

- **CENTERING_FIX_APPLIED / VERTICAL_CENTERING_FIX** – Hook/middle/CTA slides auto-center with dynamic sizing
- **IMAGE_16_9_CROP** – Pexels images always render 16:9, left-aligned, full width
- **IMAGE_TOGGLE_FEATURE** – UI checkbox + backend support for opting out of imagery
- **FLEXIBLE_LAYOUT_FIX** – Middle slides shrink spacing/font down to 50% if required
- **PEXELS_SETUP / PEXELS_INTEGRATION_SUMMARY** – Combined in Pexels section above
- **SUPABASE_REDIRECT_CONFIG / QUICK_FIX_LOCALHOST / FIX_LOCALHOST_REDIRECT** – Combined in troubleshooting
- **STRIPE_SETUP / VERCEL_*** – Covered in Deployment & Stripe sections
- **DEBUG_PEXELS** – Debug view is still present (hidden via `showDebugPanel`)
- **JSON_PARSE_FIX / CAROUSEL_FORMAT_FIX** – Code already updated; no further action required

---

## 👥 Credits & License

- Built with ❤️ using **Next.js**, **Supabase**, **Stripe**, **Google Gemini**, **Pexels**
- Fonts: Poppins, DreamingOutloudSans (licenses in `public/fonts`)
- Background textures in `public/backgrounds`
- **License:** MIT – feel free to fork and adapt

---

Need something that used to live in another doc? Everything should now be summarized here. If you notice a missing detail, check git history for the original Markdown file or open an issue. Happy building! 🎉
