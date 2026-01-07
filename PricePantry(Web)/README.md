# 🛒 Price Pantry - Australian Grocery Price Comparison

Compare grocery prices across Coles, Woolworths, ALDI, IGA & Costco in one place!

## 🚨 IMPORTANT: Deployment Status

**Current Issue:** Black screens on website because backend is not deployed.

### Quick Fix (15 minutes):
👉 **Follow:** `RENDER_DEPLOY_GUIDE.md`

This will:
1. Deploy backend to Render.com (FREE)
2. Setup MongoDB Atlas (FREE) 
3. Update Vercel environment variables
4. Fix all black screens! ✅

---

## 🎯 What This App Does

- ✅ Compare prices across 5 major Australian supermarkets
- ✅ Search thousands of products
- ✅ Create shopping lists with total cost comparison
- ✅ Set price alerts for favorite products
- ✅ Save favorites locally (no login required)
- ✅ Mobile-friendly responsive design
- ✅ Dark mode support

---

## 📁 Project Structure

```
PricePantry(Web)/
├── frontend/              # React app (Vercel)
│   ├── src/
│   │   ├── pages/        # HomePage, SearchPage, etc.
│   │   ├── components/   # UI components
│   │   └── lib/          # API client, utilities
│   └── package.json
│
├── backend/              # FastAPI server (needs Render)
│   ├── server.py        # Main API endpoints
│   └── requirements.txt # Python dependencies
│
├── RENDER_DEPLOY_GUIDE.md   # 👈 START HERE!
├── DEPLOYMENT_GUIDE.md       # Detailed deployment info
└── FEATURE_AUDIT.md          # Feature comparison
```

---

## 🚀 Deployment Architecture

### Current (Broken):
```
Frontend (Vercel) ❌→ Backend (localhost - doesn't exist!)
```

### Fixed Setup:
```
Frontend (Vercel) ✅→ Backend (Render.com) ✅→ MongoDB (Atlas)
```

**All FREE tier!** 🎉

---

## ⚡ Quick Start (Local Development)

### Backend:
```bash
cd PricePantry(Web)/backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001
```

### Frontend:
```bash
cd PricePantry(Web)/frontend
yarn install
REACT_APP_BACKEND_URL=http://localhost:8001 yarn start
```

Visit: `http://localhost:3000`

---

## 🔑 Environment Variables

### Backend (.env)
```bash
MONGO_URL=mongodb://localhost:27017  # Local dev
# OR
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/  # Production

DB_NAME=pricepantry
PRICES_API_KEY=pricesapi_47WwUrKBYgVN787MqAcDvBla3npAOb
RESEND_API_KEY=your_key_here  # Optional
SENDER_EMAIL=noreply@pricepantry.com
```

### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=http://localhost:8001  # Local dev
# OR
REACT_APP_BACKEND_URL=https://your-backend.onrender.com  # Production
```

---

## 📦 Tech Stack

**Frontend:**
- React 19
- React Router
- Tailwind CSS
- Radix UI
- Axios
- Chart.js

**Backend:**
- FastAPI
- Motor (async MongoDB)
- Pydantic
- BeautifulSoup4 (web scraping)
- Resend (email alerts)

**Database:**
- MongoDB

---

## 🐛 Bug Fixes Applied

✅ Fixed all TypeError issues (undefined.slice, undefined.length)
✅ Added defensive null checks on all pages
✅ Proper error handling for failed API calls
✅ Loading states improved
✅ .gitignore files created

**Status:** Code is ready to deploy! Just needs backend hosting.

---

## 📖 Documentation

- `RENDER_DEPLOY_GUIDE.md` - **START HERE** for deployment
- `DEPLOYMENT_GUIDE.md` - Detailed deployment options
- `FEATURE_AUDIT.md` - Feature comparison vs requirements

---

## 🆘 Need Help?

**Black screens?** 
→ Follow `RENDER_DEPLOY_GUIDE.md` to deploy backend

**Deployment issues?**
→ Check Render logs and Vercel logs

**Other errors?**
→ Check browser console, share the error message

---

## 🎯 Next Steps

1. ✅ **Fix black screens** → Deploy backend (15 mins)
2. 📊 **Integrate real PricesAPI** → Replace mock data
3. 🎨 **UI polish** → Add loading states, animations
4. 🚀 **Performance** → Code splitting, caching
5. 📱 **Mobile app** → Convert to React Native

---

## 📄 License

This is a demo/learning project.

---

**Ready to deploy?** 👉 Open `RENDER_DEPLOY_GUIDE.md` and follow the steps!
