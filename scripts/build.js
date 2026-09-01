const fs = require('fs');
const path = require('path');

// Résolu relativement à ce script (scripts/../ = racine du repo), et non
// codé en dur sur un poste précis : ainsi `node scripts/build.js`
// fonctionne sur n'importe quelle machine, CI ou environnement, pas
// uniquement sur celle où il a été écrit.
const projectDir = path.resolve(__dirname, '..');
const wwwDir = path.join(projectDir, 'www');

console.log('Building web bundle into www/...');
if (!fs.existsSync(wwwDir)) {
    fs.mkdirSync(wwwDir, { recursive: true });
}

function copyRecursiveSync(src, dest) {
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

console.log('Web bundle built successfully in www/!');
