# Price Pantry - Deployment Guide

## 🚨 IMPORTANT: Black Screen Issue Fix

Your website is showing black screens because **the backend is not deployed**. The frontend is trying to connect to `http://localhost:8001` which doesn't exist in production.

## Quick Fix Options

### Option A: Deploy Backend to Render/Railway (Recommended)

**Backend needs to be hosted separately**

1. **Deploy Backend to Render.com:**
   - Go to https://render.com
   - Create new "Web Service"
   - Connect your GitHub repo
   - Set these settings:
     - **Root Directory:** `PricePantry(Web)/backend`
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `uvicorn server:app --host 0.0.0.0 --port $PORT`
     - **Environment Variables:**
       - `MONGO_URL`: Your MongoDB connection string
       - `DB_NAME`: `pricepantry`
       - `PRICES_API_KEY`: `pricesapi_47WwUrKBYgVN787MqAcDvBla3npAOb`
       
2. **Copy the Backend URL** (e.g., `https://your-app.onrender.com`)

3. **Update Frontend Environment Variable on Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add: `REACT_APP_BACKEND_URL` = `https://your-app.onrender.com`
   - Redeploy frontend

### Option B: Use Mock Data (Quick Test)

For testing without backend, I can modify the frontend to use mock data.

### Option C: All-in-One Next.js App (Best for Vercel)

Convert to Next.js with API routes - everything in one deployment.

---

## Current Architecture

```
PricePantry(Web)/
├── frontend/        ← React app (deployed to Vercel)
├── backend/         ← FastAPI (NOT deployed)
└── vercel.json      ← Only deploys frontend
```

## The Problem

- ✅ Frontend is deployed to Vercel
- ❌ Backend is NOT deployed anywhere
- ❌ Frontend can't fetch data (all API calls fail)
- ❌ Result: Black screens except home page

## The Solution

You need to deploy the backend to a Python-compatible host:

### Best Options for Python Backend:
1. **Render.com** - Free tier, easy Python deployment
2. **Railway.app** - Simple, good for FastAPI
3. **Heroku** - Classic choice
4. **Fly.io** - Modern platform
5. **PythonAnywhere** - Python-specific hosting

### NOT Recommended:
- ❌ Vercel - Limited Python support, not ideal for FastAPI with MongoDB

---

## Environment Variables You Need

### Backend (.env)
```bash
MONGO_URL=mongodb+srv://your-cluster.mongodb.net/
DB_NAME=pricepantry
PRICES_API_KEY=pricesapi_47WwUrKBYgVN787MqAcDvBla3npAOb
RESEND_API_KEY=your_resend_key
SENDER_EMAIL=noreply@yourapp.com
```

### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=https://your-backend-url.onrender.com
```

---

## Step-by-Step Fix (Render + Vercel)

### 1. Deploy Backend to Render

```bash
# On Render.com:
# 1. New Web Service
# 2. Connect GitHub
# 3. Settings:
Root Directory: PricePantry(Web)/backend
Build Command: pip install -r requirements.txt
Start Command: uvicorn server:app --host 0.0.0.0 --port $PORT
```

### 2. Add MongoDB (if not setup)

Option A: MongoDB Atlas (Free)
- https://cloud.mongodb.com
- Create free cluster
- Get connection string
- Add to Render environment variables

Option B: Use Render's MongoDB add-on

### 3. Update Frontend on Vercel

```bash
# Vercel Dashboard → Settings → Environment Variables
REACT_APP_BACKEND_URL = https://your-backend.onrender.com
```

### 4. Redeploy Frontend

```bash
# Push to GitHub or manual redeploy on Vercel
git add .
git commit -m "Update backend URL"
git push
```

---

## Alternative: Next.js Migration

If you want everything in one place on Vercel, I can convert this to Next.js:

**Benefits:**
- ✅ One deployment (frontend + API routes)
- ✅ No CORS issues
- ✅ Better Vercel integration
- ✅ Faster cold starts
- ✅ Built-in API routes

**Changes needed:**
- Convert React to Next.js pages
- Move FastAPI endpoints to Next.js API routes
- Update data fetching

---

## Testing Locally

Both services run locally:

```bash
# Terminal 1 - Backend
cd PricePantry(Web)/backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Terminal 2 - Frontend
cd PricePantry(Web)/frontend
yarn install
REACT_APP_BACKEND_URL=http://localhost:8001 yarn start
```

---

## What I Fixed

✅ All TypeError issues (undefined.slice, undefined.length)
✅ Added defensive null checks across all pages
✅ Proper error handling for failed API calls
✅ .gitignore files created

❌ Backend not deployed (you need to do this)
❌ MongoDB not configured for production
❌ Environment variables not set on host

---

## Next Steps - Choose One:

**1. Quick Fix (30 mins)**
- Deploy backend to Render
- Update Vercel env var
- Test

**2. Full Migration (2 hours)**
- Convert to Next.js
- One Vercel deployment
- All-in-one solution

**3. Testing Only (5 mins)**
- Use mock data in frontend
- No backend needed
- For demo purposes only

Let me know which option you want! 🚀
