const fs = require('fs');
const path = require('path');

const projectDir = path.resolve('c:/Users/natha/OneDrive/Bureau/My Apps/HistoriAxe');
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
const itemsToCopy = [
    'index.html',
    'manifest.webmanifest',
    'sw.js',
    'apple_icon.jpg',
    'accueil.jpg',
    'accueil_original.jpg',
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
