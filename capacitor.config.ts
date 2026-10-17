import type { CapacitorConfig } from '@capacitor/cli';

// webDir = « www » : la sortie de `npm run build:native` (scripts/build.js), qui ne copie que ce que l'app
// embarque. Pointer sur la racine embarquerait api/, tests/, e2e/, docs/, node_modules/… dans le binaire.
const config: CapacitorConfig = {
  appId: 'com.historiaxe.app',
  appName: 'HistoriAxe',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    // Domaines que la WebView peut ouvrir en plus de son bundle local.
    allowNavigation: ['histori-axe.vercel.app'],
    // Développement uniquement (ne concerne qu'Android ; iOS l'ignore). À retirer pour une version publiée.
    cleartext: true
  },
  ios: {
    contentInset: 'always',
    allowsLinkPreview: false,
    handleApplicationURL: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1800,
      launchAutoHide: true,
      backgroundColor: '#001a4b',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: true,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      spinnerColor: '#d4a017',
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#001a4b',
      overlaysWebView: false
    },
    Haptics: {
      enabled: true
    }
  }
};

export default config;
