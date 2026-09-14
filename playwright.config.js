// Configuration des tests de bout en bout (`npm run test:e2e`).
//
// Ces tests sont volontairement séparés de `npm test` (node --test, sans
// DOM, instantané) : ils ouvrent un vrai navigateur sur le site tel qu'il
// est servi en production. C'est ce qui leur permet de couvrir ce qu'aucun
// test unitaire ne voit ici — l'enchaînement des écrans, le rendu, et les
// erreurs JavaScript qui ne se manifestent qu'à l'exécution.
//
// Un seul navigateur (Chromium) et une seule taille d'écran (téléphone) :
// c'est le format majoritaire de l'app, et multiplier les combinaisons
// multiplierait surtout le temps de CI.

const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.E2E_PORT || 8787);
const BASE_URL = `http://127.0.0.1:${PORT}`;

module.exports = defineConfig({
    testDir: './e2e',
    testMatch: '**/*.spec.js',
    // Le pack de données français fait ~14 Mo : son chargement domine la
    // durée de chaque test, d'où des délais plus larges que par défaut.
    timeout: 60_000,
    expect: { timeout: 10_000 },
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    // Un test instable est un bug à corriger, pas à masquer : aucune
    // nouvelle tentative en local. En CI, une seule reprise, pour
    // distinguer une vraie régression d'un aléa d'infrastructure — si un
    // test ne passe qu'à la seconde tentative, le rapport le signale.
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
    use: {
        baseURL: BASE_URL,
        ...devices['Pixel 5'],
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        // Le service worker est neutralisé à la source plutôt que requête
        // par requête. Deux raisons : une fois qu'il prend le contrôle, il
        // recharge la page (voir index.html: controllerchange) en plein
        // test, et les requêtes qu'il relaie échappent aux interceptions
        // posées sur la page. Son propre comportement (cache hors ligne,
        // versions de cache) se teste à part, pas au détour de chaque
        // parcours d'interface.
        serviceWorkers: 'block',
        // Par défaut, Playwright utilise le Chromium qu'il télécharge
        // lui-même (`npx playwright install chromium`). E2E_CHROMIUM_PATH
        // permet de pointer un navigateur déjà présent — image de CI livrée
        // avec Chrome, poste hors ligne, environnement où le téléchargement
        // est bloqué — sans rien changer au reste de la configuration.
        launchOptions: process.env.E2E_CHROMIUM_PATH
            ? { executablePath: process.env.E2E_CHROMIUM_PATH }
            : {}
    },
    projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
    webServer: {
        command: 'node e2e/server.js',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 30_000
    }
});
