import type { CapacitorConfig } from '@capacitor/cli';

// PLACEHOLDERS — replace before store submission:
//   appId:   com.example.lagrind  → your real reverse-domain bundle ID (cannot change after first release)
//   appName: LA Grind             → final store name
//   icon / splash sources live in assets/ (regenerate with `npx @capacitor/assets generate`)
const config: CapacitorConfig = {
  appId: 'com.example.lagrind',
  appName: 'LA Grind',
  webDir: 'dist',
  backgroundColor: '#120c22',
  ios: {
    contentInset: 'never',
  },
  android: {
    backgroundColor: '#120c22',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#120c22',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#120c22',
      overlaysWebView: true,
    },
  },
};

export default config;
