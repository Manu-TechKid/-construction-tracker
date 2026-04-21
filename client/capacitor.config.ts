import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dsjservices.constructiontracker',
  appName: 'Construction Tracker',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: ['construction-tracker-webapp.onrender.com', 'admin.servicesdsj.com']
  },
  android: {
    buildOptions: {
      keystorePath: undefined,
      keystoreAlias: undefined
    }
  },
  ios: {
    scheme: 'ConstructionTracker',
    contentInset: 'automatic',
    backgroundColor: '#1976d2'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1976d2',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      iosSplashStyle: 'SCREEN',
      iosSplashImmersive: true,
      launchFadeInDuration: 0,
      launchFadeOutDuration: 300
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#1976d2',
      overlaysWebView: false
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK'
    }
  }
};

export default config;
