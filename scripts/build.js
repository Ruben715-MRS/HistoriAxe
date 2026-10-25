const fs = require('fs');
const path = require('path');

// Résolu relativement à ce script (scripts/../ = racine du repo), et non
// codé en dur sur un poste précis : ainsi `node scripts/build.js`
// fonctionne sur n'importe quelle machine, CI ou environnement, pas
// uniquement sur celle où il a été écrit.
const projectDir = path.resolve(__dirname, '..');
const wwwDir = path.join(projectDir, 'www');
const isNativeBuild = process.argv.includes('--native');

// Les portraits (assets/portraits/, ~113 Mo) ne sont pas dans le paquet de l'app native : le joueur les
// télécharge depuis le site (réglages, js/portraits.js). Le build web les garde, il sert le site tel quel.
const nativeOnlySkip = new Set(isNativeBuild ? [path.join(projectDir, 'assets', 'portraits')] : []);

console.log('Building web bundle into www/...');
if (!fs.existsSync(wwwDir)) {
    fs.mkdirSync(wwwDir, { recursive: true });
}

// Fichiers de données que l'app n'a pas à embarquer : les packs découpés
// (data/pack/, voir scripts/build_pack.js) remplacent le fichier unique des
// langues volumineuses — 18,8 Mo de moins dans l'app native.
const bundleSkip = new Set(
    fs.existsSync(path.join(projectDir, 'data', 'pack'))
        ? fs.readdirSync(path.join(projectDir, 'data', 'pack')).map((lang) => path.join(projectDir, 'data', lang + '.json'))
        : []
);

function copyRecursiveSync(src, dest) {
    if (bundleSkip.has(src) || nativeOnlySkip.has(src)) return;
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else if (exists) {
        fs.copyFileSync(src, dest);
    }
}

// Files & Folders to bundle
// Note : accueil_original.jpg (~3,1 Mo, fichier source non compressé de
// accueil.jpg) n'est jamais référencé par l'app et n'a donc rien à faire
// dans le bundle livré — il reste versionné comme source de travail, mais
// n'est plus copié dans www/.
const itemsToCopy = [
    'index.html',
    'confidentialite.html',
    'conditions.html',
    'manifest.webmanifest',
    'sw.js',
    'apple_icon.jpg',
    'accueil.jpg',
    'splash_ipad_landscape.jpg',
    'splash_ipad_portrait.jpg',
    'splash_iphone_landscape.jpg',
    'splash_iphone_portrait.jpg',
    'css',
    'js',
    'data',
    'ui',
    'assets'
];

itemsToCopy.forEach(item => {
    const srcPath = path.join(projectDir, item);
    const destPath = path.join(wwwDir, item);
    if (fs.existsSync(srcPath)) {
        copyRecursiveSync(srcPath, destPath);
        console.log(`✓ Copied ${item} to www/`);
    }
});

// URL du backend pour l'app native. js/apiClient.js la lit dans
// NATIVE_APP_API_BASE_URL, vide dans le dépôt : l'app Capacitor est servie
// depuis un bundle local, où location.origin ne désigne pas le backend, et
// sans cette URL classement, synchronisation, ligue et duels échouent en
// silence. Elle est donc injectée dans la COPIE de www/ à la compilation
// (variable HISTORIAXE_API_BASE_URL), jamais écrite dans le dépôt.
// `--native` (scripts cap:*) refuse de construire sans elle ; le build web
// (Vercel) n'en a pas besoin, la PWA appelle son propre domaine.
const apiBase = (process.env.HISTORIAXE_API_BASE_URL || '').trim().replace(/\/+$/, '');
if (apiBase) {
    let validBase = false;
    try { validBase = new URL(apiBase).protocol === 'https:' && !/['"\\\s]/.test(apiBase); } catch (e) { /* URL invalide */ }
    if (!validBase) {
        console.error('HISTORIAXE_API_BASE_URL doit être une URL en https (reçu : ' + apiBase + ')');
        process.exit(1);
    }
    const clientPath = path.join(wwwDir, 'js', 'apiClient.js');
    const source = fs.readFileSync(clientPath, 'utf8');
    const marker = "var NATIVE_APP_API_BASE_URL = '';";
    if (!source.includes(marker)) {
        console.error('Marqueur NATIVE_APP_API_BASE_URL introuvable dans js/apiClient.js : injection impossible.');
        process.exit(1);
    }
    fs.writeFileSync(clientPath, source.replace(marker, "var NATIVE_APP_API_BASE_URL = '" + apiBase + "';"));
    console.log('✓ API native : ' + apiBase);
} else if (isNativeBuild) {
    console.error('Build natif : définissez HISTORIAXE_API_BASE_URL (adresse https de votre déploiement Vercel).');
    process.exit(1);
}

console.log('Web bundle built successfully in www/!');
