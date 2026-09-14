// Serveur statique minimal pour les tests de bout en bout (voir
// playwright.config.js: webServer). Volontairement sans dépendance : le
// site est déjà statique et se sert tel quel en production, il n'y a donc
// rien à construire ni à transformer ici — juste à le rendre disponible sur
// un port, exactement comme Vercel sert le dossier racine.
//
// Les fonctions serverless de api/ ne sont PAS servies : les tests couvrent
// le client, et l'appel réseau est neutralisé côté navigateur (voir
// e2e/fixtures.js).

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.E2E_PORT || 8787);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    const filePath = path.resolve(ROOT, relative);

    // Ne jamais servir hors du dépôt, même si l'URL contient des « .. ».
    if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
        res.writeHead(403).end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
            return;
        }
        res.writeHead(200, {
            'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'Cache-Control': 'no-store'
        }).end(content);
    });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`e2e: site servi sur http://127.0.0.1:${PORT}`);
});
