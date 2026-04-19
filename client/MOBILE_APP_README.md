# Construction Tracker - Mobile App Setup

This mobile app is built with **Capacitor** - it wraps your React web app for Android and iOS.

## Architecture

```
┌─────────────────────────────────────────┐
│  Mobile App (Capacitor)                 │
│  ┌───────────────────────────────────┐  │
│  │  WebView loads built React app    │  │
│  │  ↓                                │  │
│  │  React + MUI + Redux              │  │
│  │  ↓ API calls                      │  │
│  │  https://construction-tracker-webapp.onrender.com/api/v1
│  └───────────────────────────────────┘  │
│         ↓ Native plugins (optional)     │
│  Camera, GPS, Push Notifications, etc.  │
└─────────────────────────────────────────┘
```

## Prerequisites

### For Android:
- [Android Studio](https://developer.android.com/studio) (latest version)
- Java Development Kit (JDK) 17 or later
- Google Play Developer account ($25 one-time fee)

### For iOS:
- Mac computer (required - no Windows alternative)
- [Xcode](https://developer.apple.com/xcode/) (free from App Store)
- Apple Developer account ($99/year)

## Quick Start Commands

### 1. Build the Web App
```bash
npm run build
```

### 2. Sync to Android
```bash
npm run build:android
# Or manually:
npm run build
npx cap sync android
```

### 3. Open in Android Studio
```bash
npm run cap:open:android
```

### 4. Run on Device/Emulator
In Android Studio:
- Click the "Run" button (▶️)
- Choose an emulator or connected device

## Deployment to Play Store (Android)

### Step 1: Generate Signed APK/AAB

1. Open Android Studio
2. Go to **Build** → **Generate Signed Bundle / APK...**
3. Select **Android App Bundle (.aab)** (recommended) or **APK**
4. Create a new keystore or use existing:
   - Key store path: `android/app/construction-tracker.keystore`
   - Key store password: (create strong password)
   - Key alias: `construction-tracker`
   - Key password: (same as keystore)
5. Click **Next** → **Finish**

### Step 2: Upload to Google Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app:
   - App name: "Construction Tracker"
   - Default language: English
   - App or game: App
   - Free or paid: Free
3. Complete store listing:
   - App icon (512x512 PNG)
   - Feature graphic (1024x500 PNG)
   - Screenshots (phone + tablet)
   - Description, privacy policy, etc.
4. Go to **Production** → **Create new release**
5. Upload your `.aab` file
6. Review and publish

## Environment Variables

The mobile app uses the production API by default:

```
REACT_APP_API_URL=https://construction-tracker-webapp.onrender.com/api/v1
```

To test with local backend during development:
```bash
# In client/.env.local
REACT_APP_API_URL=http://192.168.1.X:5000/api/v1
```
(Replace with your computer's local IP)

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run build` | Build React app for production |
| `npm run build:android` | Build web + sync to Android |
| `npm run build:ios` | Build web + sync to iOS |
| `npm run cap:sync` | Copy web assets to native platforms |
| `npm run cap:open:android` | Open Android Studio |
| `npm run cap:open:ios` | Open Xcode |
| `npm run cap:android` | Run on Android device |
| `npm run cap:ios` | Run on iOS device |

## Customizing the App

### App Icon & Splash Screen

Replace these files before building:

**Android:**
- `android/app/src/main/res/mipmap-*dpi/ic_launcher.png` (app icon)
- `android/app/src/main/res/drawable/splash.png` (splash screen)

**iOS:**
- `ios/App/App/Assets.xcassets/AppIcon.appiconset/` (app icon)
- `ios/App/App/Assets.xcassets/Splash.imageset/` (splash screen)

Or use the Capacitor splash screen plugin configuration in `capacitor.config.ts`.

### App Name & ID

Edit `capacitor.config.ts`:
```typescript
appId: 'com.dsjservices.constructiontracker',  // Unique app ID
appName: 'Construction Tracker',                // Display name
```

## Troubleshooting

### Issue: "Could not connect to development server"
**Solution:** The app uses your production API. Make sure your Render backend is running.

### Issue: "App crashes on startup"
**Solution:** Run `npm run build` first, then `npx cap sync android`

### Issue: "CORS errors on API calls"
**Solution:** Your backend CORS is already configured for admin.servicesdsj.com. No changes needed for mobile.

### Issue: "White screen after splash"
**Solution:** Check browser console in Android Studio (Chrome DevTools) for JavaScript errors.

## Next Steps

1. ✅ Install Android Studio
2. ✅ Build the app: `npm run build:android`
3. ✅ Open Android Studio: `npm run cap:open:android`
4. ✅ Test on emulator or device
5. ✅ Generate signed AAB for Play Store
6. ✅ Upload to Google Play Console

## Resources

- [Capacitor Documentation](https://capacitorjs.com/docs)
- [Android Studio Guide](https://developer.android.com/studio/intro)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
- [Capacitor Plugins](https://capacitorjs.com/docs/plugins)

## Support

If you encounter issues:
1. Check the [Capacitor troubleshooting guide](https://capacitorjs.com/docs/android/troubleshooting)
2. Verify your API URL is accessible from mobile
3. Check Android Studio's logcat for errors
