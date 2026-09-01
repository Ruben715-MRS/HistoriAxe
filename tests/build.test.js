// Vérifie que `node scripts/build.js` fonctionne sur n'importe quelle
// machine/CI, et pas seulement sur le poste où il a été écrit à l'origine
// (régression : scripts/build.js contenait un chemin absolu codé en dur,
// spécifique à un poste Windows précis, qui faisait échouer silencieusement
// le build partout ailleurs).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const os = require('node:os');

const repoRoot = path.resolve(__dirname, '..');
const buildScript = path.join(repoRoot, 'scripts', 'build.js');
const wwwDir = path.join(repoRoot, 'www');

test('build.js ne contient aucun chemin de poste codé en dur', () => {
    const source = fs.readFileSync(buildScript, 'utf8');
    assert.ok(!/[A-Za-z]:[\\/]/.test(source), 'un chemin de type "C:/..." a été trouvé dans scripts/build.js');
    assert.ok(!source.includes('OneDrive'), 'un chemin de poste personnel a été trouvé dans scripts/build.js');
});

test('node scripts/build.js fonctionne quel que soit le répertoire courant', () => {
    // Lancé depuis un cwd totalement différent du repo (ici le tmpdir du
    // système) pour prouver que le script se résout par rapport à
    // lui-même (__dirname), pas par rapport à un chemin codé en dur ou au
    // cwd de l'appelant.
    if (fs.existsSync(wwwDir)) {
        fs.rmSync(wwwDir, { recursive: true, force: true });
    }

    execFileSync(process.execPath, [buildScript], { cwd: os.tmpdir() });

    assert.ok(fs.existsSync(path.join(wwwDir, 'index.html')), 'www/index.html devrait avoir été généré');
    assert.ok(fs.existsSync(path.join(wwwDir, 'js', 'app.js')), 'www/js/app.js devrait avoir été copié');
    assert.ok(
        !fs.existsSync(path.join(wwwDir, 'accueil_original.jpg')),
        'accueil_original.jpg (source non optimisée, ~3,1 Mo, inutilisée à l\'exécution) ne devrait pas être bundlé'
    );

    fs.rmSync(wwwDir, { recursive: true, force: true });
});
