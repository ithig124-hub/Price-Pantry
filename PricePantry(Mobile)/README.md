# PricePantry Mobile App

A React Native (Expo) mobile app for comparing grocery prices across Australian stores.

## Features

- 🔍 **Search Products** - Search across thousands of grocery items
- 💰 **Compare Prices** - See prices from Coles, Woolworths, Aldi, IGA, and Costco
- ❤️ **Favorites** - Save products you buy regularly
- 🔔 **Price Alerts** - Get notified when prices drop
- 🛒 **Shopping List** - Create lists with automatic store comparison
- 📊 **Price History** - View 30-day price trends
- 🌙 **Dark Mode** - Easy on the eyes
- 📤 **Share Lists** - Share your shopping list with family

## Screenshots

The app includes:
1. Home screen with featured deals and categories
2. Product search with sorting options
3. Product detail with price comparison and history chart
4. Shopping list with store totals and savings calculator
5. Favorites and Alerts management

## Prerequisites

- Node.js 18 or later
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- EAS CLI: `npm install -g eas-cli`
- Expo account (free): https://expo.dev/signup

## Getting Started

### 1. Install Dependencies

```bash
cd PricePantry(Mobile)
npm install
# or
yarn install
```

### 2. Run Development Server

```bash
npx expo start
```

Scan the QR code with Expo Go app on your phone to test.

### 3. Configure Backend URL

Edit `src/lib/api.js` and update the `API_BASE_URL`:

```javascript
const API_BASE_URL = 'https://your-backend-url.com/api';
```

## Building for Google Play Store

### Step 1: Create Expo Account & Project

1. Sign up at https://expo.dev
2. Run `eas login` to authenticate
3. Run `eas build:configure` to set up your project

### Step 2: Update app.json

Edit `app.json` with your details:

```json
{
  "expo": {
    "name": "PricePantry",
    "android": {
      "package": "com.yourcompany.pricepantry"
    },
    "extra": {
      "eas": {
        "projectId": "your-project-id-here"
      }
    }
  }
}
```

### Step 3: Build APK for Testing

```bash
eas build --platform android --profile preview
```

This creates an APK you can install directly on Android devices.

### Step 4: Build AAB for Play Store

```bash
eas build --platform android --profile production
```

This creates an Android App Bundle (AAB) required by Google Play.

### Step 5: Submit to Google Play Store

#### Option A: Automatic (with EAS Submit)

1. Create a Google Play Developer account ($25 one-time fee)
2. Create a new app in Google Play Console
3. Generate a service account key (JSON)
4. Save it as `google-services.json` in the project root
5. Run: `eas submit --platform android`

#### Option B: Manual Upload

1. Download the AAB from Expo dashboard
2. Go to Google Play Console
3. Create a new app
4. Upload the AAB in "Release > Production"

### Step 6: Play Store Requirements

Before publishing, you'll need:

- [ ] App icon (512x512) - Already included as `assets/icon.png`
- [ ] Feature graphic (1024x500)
- [ ] Screenshots (minimum 2, up to 8)
- [ ] Short description (80 characters)
- [ ] Full description (4000 characters)
- [ ] Privacy Policy URL - Use the PrivacyPolicy page we created
- [ ] App category: Shopping
- [ ] Content rating questionnaire

## App Signing

For Google Play, you have two options:

### Google-Managed Signing (Recommended)
- Select "Let Google manage and protect your app signing key"
- Google handles key security
- Easier key recovery if needed

### Self-Managed Signing
- You manage your own keystore
- More control but more responsibility
- Generate with: `keytool -genkey -v -keystore release.keystore -alias pricepantry -keyalg RSA -keysize 2048 -validity 10000`

## File Structure

```
PricePantry(Mobile)/
├── App.js                 # Main app entry
├── app.json              # Expo configuration
├── eas.json              # EAS Build configuration
├── package.json          # Dependencies
├── babel.config.js       # Babel configuration
├── assets/               # App icons and images
│   ├── icon.png
│   ├── splash.png
│   └── adaptive-icon.png
└── src/
    ├── components/       # Reusable components
    │   └── ProductCard.js
    ├── screens/          # App screens
    │   ├── HomeScreen.js
    │   ├── SearchScreen.js
    │   ├── FavoritesScreen.js
    │   ├── AlertsScreen.js
    │   ├── ShoppingListScreen.js
    │   └── ProductDetailScreen.js
    └── lib/              # Utilities and context
        ├── api.js
        ├── ThemeContext.js
        ├── FavoritesContext.js
        └── ShoppingListContext.js
```

## Customization

### Change App Colors
Edit the theme colors in `src/lib/ThemeContext.js`

### Update App Icon
Replace images in `assets/` folder:
- `icon.png` - Main app icon (1024x1024 recommended)
- `splash.png` - Splash screen
- `adaptive-icon.png` - Android adaptive icon foreground

### Modify API Endpoints
Update `src/lib/api.js` with your backend endpoints

## Support

For issues or questions about the mobile app, please open an issue in the repository.

## License

© 2025 PricePantry. All rights reserved.
