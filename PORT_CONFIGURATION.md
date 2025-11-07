# 🔌 Port Configuration

## Fixed Port Conflict Issue

Both Next.js (frontend) and Express (backend) were trying to use port 3000, causing conflicts.

## New Configuration

| Service | Port | URL |
|---------|------|-----|
| **Frontend** (Next.js) | 3000 | http://localhost:3000 |
| **Backend** (Express API) | 3001 | http://localhost:3001 |

## What Was Changed

### 1. Backend Configuration (`.env`)
```bash
GEMINI_API_KEY=your_key_here
PORT=3001  # Changed from 3000 to 3001
```

### 2. Frontend Configuration (`.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://drepsyokmfixpjaxchky.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
NEXT_PUBLIC_API_URL=http://localhost:3001  # Updated to point to backend on 3001
```

### 3. Next.js Config (`next.config.js`)
- Changed from CommonJS (`module.exports`) to ES module syntax (`export default`)
- This fixes the ES module error

### 4. Frontend Code (`app/page.tsx`)
- Updated default API URL to `http://localhost:3001`
- Updated error messages to reference port 3001

## How to Start

```bash
npm run dev
```

This will start:
- ✅ Frontend on **port 3000** (Next.js)
- ✅ Backend on **port 3001** (Express API)

## Access the Application

Open your browser: **http://localhost:3000**

The frontend will automatically communicate with the backend API on port 3001.

## API Endpoints

All backend API endpoints are now on port 3001:

```
http://localhost:3001/health
http://localhost:3001/api/social
```

## Troubleshooting

### Port 3000 Already in Use
```bash
lsof -ti:3000 | xargs kill -9
```

### Port 3001 Already in Use
```bash
lsof -ti:3001 | xargs kill -9
```

### To Use Different Ports
Edit `.env`:
```bash
PORT=3002  # or any other port
```

Then update `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3002
```

## Summary

✅ **Fixed:** Next.js ES module error  
✅ **Fixed:** Port conflict between frontend and backend  
✅ **Configuration:** Clean separation of concerns  
- Frontend: port 3000
- Backend: port 3001

**No more port conflicts!** 🎉

