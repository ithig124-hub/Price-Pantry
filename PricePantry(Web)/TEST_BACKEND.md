# Test Backend on Vercel

## After deploying, test these URLs:

### 1. Test Health Check
```
https://your-app.vercel.app/api/
```
Should return: JSON with message

### 2. Test Specials API
```
https://your-app.vercel.app/api/specials?limit=2
```
Should return: JSON with products array

### 3. Test Search API
```
https://your-app.vercel.app/api/products/search?q=milk&page=1
```
Should return: JSON with products array

---

## If APIs Don't Work:

### Check Vercel Function Logs:
1. Vercel Dashboard → Your Project
2. Click latest deployment
3. Click "Functions" tab
4. Look for errors in `/api/index`

### Common Issues:

**Error: Module not found**
- Check api/requirements.txt has all dependencies
- Redeploy to rebuild dependencies

**Error: MongoDB connection failed**
- Check MONGO_URL environment variable is set
- Verify MongoDB Atlas allows Vercel IPs (0.0.0.0/0)

**Error: 500 Internal Server Error**
- Check Function logs for Python errors
- Verify backend/server.py imports correctly

---

## Quick Test (Copy-Paste):

After deployment, run in terminal:

```bash
# Replace YOUR_APP with your Vercel URL
curl https://YOUR_APP.vercel.app/api/specials?limit=1
```

Should see JSON response with product data!
