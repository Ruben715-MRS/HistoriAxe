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
  },
  ios: {
    // Les marges de sécurité sont gérées par le CSS (body, env(safe-area-inset-*)) :
    // ne pas les ajouter une seconde fois côté WebView.
    contentInset: 'never',
    // Fond de la WebView : même couleur que l'app, pour qu'aucune zone ne reste blanche.
    backgroundColor: '#F2F4F7',
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
      // Le contenu passe sous la barre d'état (plein écran). Le bandeau marine du haut
      // est alors dessiné en CSS (css/style.css, adaptations natives iOS).
      style: 'DARK',
      overlaysWebView: true
    },
    Haptics: {
      enabled: true
    }
  }
};

export default config;
