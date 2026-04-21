# iOS App Build Instructions

## Prerequisites

1. **Mac Computer** - iOS development requires a Mac
2. **Xcode** - Latest version from Mac App Store
3. **Apple Developer Account** - For testing and distribution
4. **iOS Device** - For testing (iPhone/iPad)

## Project Setup

The iOS project has been created and configured with:
- ✅ Capacitor iOS platform added
- ✅ Web assets synced
- ✅ iOS-specific configuration applied
- ✅ Mobile optimizations included

## Building the iOS App

### Method 1: Using Xcode (Recommended)

1. **Open the project in Xcode:**
   ```bash
   cd client
   npx cap open ios
   ```

2. **In Xcode:**
   - Select your team in the "Signing & Capabilities" tab
   - Choose your development device or simulator
   - Press `Cmd+R` to build and run

### Method 2: Using Command Line

1. **Build for simulator:**
   ```bash
   cd client/ios/App
   xcodebuild -workspace App.xcworkspace -scheme App -destination 'platform=iOS Simulator,name=iPhone 14'
   ```

2. **Build for device:**
   ```bash
   cd client/ios/App
   xcodebuild -workspace App.xcworkspace -scheme App -destination 'generic/platform=iOS'
   ```

## Configuration Details

### App Information
- **Bundle ID:** com.dsjservices.constructiontracker
- **App Name:** Construction Tracker
- **Version:** 1.0.0

### iOS Features Enabled
- ✅ Splash screen with fade animations
- ✅ Light status bar style
- ✅ Keyboard resize handling
- ✅ Safe area insets
- ✅ iOS-specific styling

### Mobile Optimizations Included
- ✅ Responsive navigation bar
- ✅ Mobile-friendly login page
- ✅ Card-based layouts for tables
- ✅ Touch-friendly buttons (44px min)
- ✅ Optimized typography
- ✅ Scrollable drawer with sticky logout

## Testing

### On Simulator
1. Open Xcode
2. Choose iPhone simulator
3. Press `Cmd+R` to run

### On Physical Device
1. Connect iPhone/iPad to Mac
2. Trust the developer certificate on device
3. Select device in Xcode
4. Press `Cmd+R` to run

## Distribution

### For Testing (TestFlight)
1. Build Archive in Xcode: `Product > Archive`
2. Upload to App Store Connect
3. Add testers in TestFlight

### For App Store
1. Create App Store Connect listing
2. Build Archive
3. Submit for Review

## Troubleshooting

### Common Issues
1. **"Signing for 'App' requires a development team"**
   - Add your Apple Developer account in Xcode preferences
   - Select your team in project settings

2. **"Unable to install app"**
   - Check device trust settings
   - Verify provisioning profiles

3. **Build fails with plugin errors**
   - Run: `npx cap sync ios`
   - Clean build folder in Xcode

### Updating Web Assets
When web code changes:
```bash
cd client
npm run build
npx cap sync ios
```

## Next Steps

1. Open project on Mac with Xcode
2. Configure Apple Developer account
3. Test on simulator and device
4. Prepare for TestFlight beta testing
5. Submit to App Store when ready

## Support

For iOS-specific issues:
- Check Xcode build logs
- Verify provisioning profiles
- Ensure iOS deployment target is compatible (iOS 13.0+)
