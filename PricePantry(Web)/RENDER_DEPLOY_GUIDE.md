# Price Pantry Backend - Render Deployment

## Quick Deploy to Render.com (FREE)

### Step 1: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (easiest)

### Step 2: Deploy Backend

1. **Click "New +" → "Web Service"**

2. **Connect your GitHub repo** containing PricePantry(Web)

3. **Configure Settings:**
   ```
   Name: pricepantry-backend
   Region: Choose closest to Australia (Singapore recommended)
   Branch: main (or your branch name)
   Root Directory: PricePantry(Web)/backend
   Runtime: Python 3
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn server:app --host 0.0.0.0 --port $PORT
   ```

4. **Choose Plan:** Free (sufficient for testing)

5. **Add Environment Variables:**
   Click "Advanced" → Add these:
   ```
   MONGO_URL = mongodb+srv://your-connection-string (see Step 3)
   DB_NAME = pricepantry
   PRICES_API_KEY = pricesapi_47WwUrKBYgVN787MqAcDvBla3npAOb
   RESEND_API_KEY = (leave empty for now)
   SENDER_EMAIL = noreply@pricepantry.com
   ```

6. **Click "Create Web Service"**

7. **Wait 2-3 minutes** for deployment

8. **Copy your backend URL** (looks like: `https://pricepantry-backend.onrender.com`)

### Step 3: Setup MongoDB Atlas (FREE)

1. Go to https://cloud.mongodb.com
2. Sign up / Log in
3. **Create New Cluster:**
   - Choose FREE tier (M0)
   - Region: AWS / Sydney or Singapore
   - Click "Create Cluster"

4. **Create Database User:**
   - Security → Database Access
   - Add New User
   - Username: `pricepantry`
   - Password: Generate strong password (SAVE THIS!)

5. **Whitelist IP:**
   - Security → Network Access
   - Add IP Address
   - Choose "Allow Access from Anywhere" (0.0.0.0/0)
   - Click Confirm

6. **Get Connection String:**
   - Clusters → Connect → Connect your application
   - Copy the connection string:
   ```
   mongodb+srv://pricepantry:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   - Replace `<password>` with your actual password

7. **Update Render Environment Variable:**
   - Go back to Render dashboard
   - Your web service → Environment
   - Update `MONGO_URL` with your MongoDB connection string
   - Save Changes (this will redeploy)

### Step 4: Update Vercel Frontend

1. **Go to Vercel Dashboard**
2. **Select your Price Pantry project**
3. **Settings → Environment Variables**
4. **Add New Variable:**
   ```
   Name: REACT_APP_BACKEND_URL
   Value: https://pricepantry-backend.onrender.com
   ```
5. **Check all environments** (Production, Preview, Development)
6. **Click "Save"**

### Step 5: Redeploy Frontend

**Option A: Automatic (if you push to GitHub)**
```bash
git add .
git commit -m "Update backend URL"
git push
```
Vercel will auto-deploy

**Option B: Manual**
- Vercel Dashboard → Deployments
- Click "Redeploy" button

### Step 6: Test Your App! 🎉

1. Wait 2-3 minutes for deployment
2. Visit your Vercel URL
3. **Should now work!** No more black screens!

---

## Troubleshooting

### Backend not starting on Render?
Check logs: Render Dashboard → Your Service → Logs

Common issues:
- Missing `requirements.txt` in correct location
- Wrong start command
- MongoDB connection failed

### Frontend still black?
1. Check Vercel logs: Vercel Dashboard → Deployments → View Function Logs
2. Verify environment variable is set correctly
3. Hard refresh browser (Ctrl + Shift + R)
4. Check browser console for errors

### CORS errors?
The backend already has CORS configured for all origins, should work fine.

---

## Cost Breakdown

- ✅ Render Free Tier: Free
- ✅ MongoDB Atlas M0: Free
- ✅ Vercel Hobby: Free
- **Total: $0/month** 🎉

---

## Need Help?

If you get stuck, share:
1. Render deployment logs
2. Vercel deployment logs
3. Browser console errors

I'll help you debug! 🚀
