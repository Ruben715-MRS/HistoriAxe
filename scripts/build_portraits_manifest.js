// Écrit assets/portraits.json : la liste des portraits de assets/portraits/, pour le téléchargement en bloc
// (js/portraits.js). À relancer après tout ajout ou suppression de portrait ; tests/portraits.test.js
// signale une liste périmée.
//   node scripts/build_portraits_manifest.js
const fs = require('fs');
const path = require('path');

const projectDir = path.resolve(__dirname, '..');
const list = fs.readdirSync(path.join(projectDir, 'assets', 'portraits'))
    .filter((f) => f.endsWith('.jpg'))
    .sort()
    .map((f) => 'assets/portraits/' + f);

fs.writeFileSync(path.join(projectDir, 'assets', 'portraits.json'), JSON.stringify(list) + '\n');
console.log(`✓ assets/portraits.json : ${list.length} portraits`);
