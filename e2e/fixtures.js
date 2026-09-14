// Socle commun des tests de bout en bout : tout ce qu'il faut mettre en
// place pour qu'un test parte d'une app chargée, propre et déterministe.
//
// Deux neutralisations ici, et leurs raisons :
//  1. /api/* — les fonctions serverless ne tournent pas derrière le serveur
//     statique des tests ; sans réponse, chaque appel best-effort du client
//     laisse une erreur dans la console et polluerait l'assertion finale ;
//  2. le tutoriel — ses bulles se superposent aux écrans et interceptent
//     les clics des premiers pas.
// La troisième, le service worker, est bloquée en amont par la
// configuration (voir playwright.config.js: serviceWorkers).
//
// Et une assertion offerte à tous les tests : aucune erreur console ni
// exception non rattrapée, sur aucun écran traversé. C'est la ligne la plus
// rentable de cette suite — elle couvre la famille de régressions « une
// fonction a disparu lors d'un refactor », déjà vue dans l'historique du
// projet (voir README.md).

const base = require('@playwright/test');

const expect = base.expect;

const test = base.test.extend({
    page: async ({ page }, use) => {
        const problems = [];
        page.on('console', msg => {
            if (msg.type() !== 'error') return;
            // L'URL et la ligne sont indispensables : « Failed to load
            // resource » sans elles ne dit pas quoi réparer.
            const where = msg.location();
            const url = (where && where.url) || '';
            // Seule exception tolérée, et elle n'est pas une erreur de
            // l'app : /favicon.ico est réclamé d'office par le navigateur,
            // alors que le site ne le référence nulle part et ne le fournit
            // pas. Le 404 est donc identique en production, et disparaîtra
            // le jour où index.html déclarera une icône.
            if (/\/favicon\.ico$/.test(url)) return;
            const origine = url ? ` (${url}${where.lineNumber ? ':' + where.lineNumber : ''})` : '';
            problems.push(`console: ${msg.text()}${origine}`);
        });
        page.on('pageerror', err => {
            problems.push(`exception: ${err.message}`);
        });

        // Expression régulière plutôt que motif glob : elle s'applique à
        // l'URL complète, avec ou sans chaîne de requête, et ne dépend pas
        // des subtilités de la syntaxe glob d'une version de Playwright.
        await page.route(/\/api\//, route => route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: '{}'
        }));
        await page.addInitScript(() => {
            try {
                localStorage.setItem('historiaxe_onboarding_v1', JSON.stringify({ completed: true, shownSteps: [] }));
            } catch (e) { /* stockage indisponible : le tutoriel s'affichera, tant pis */ }
        });

        await page.goto('/index.html');
        // Le pack français (~14 Mo) est chargé de façon asynchrone. Cette
        // attente ne garantit qu'un démarrage : les helpers qui visent un
        // thème précis attendent ce thème (voir openThemeCard).
        await page.waitForFunction(() => window.bdd && window.bdd.length > 0, null, { timeout: 45_000 });

        await use(page);

        expect(problems, 'la console du navigateur doit rester vierge pendant tout le parcours').toEqual([]);
    }
});

// Identifiant de l'écran actuellement affiché. L'app masque les écrans avec
// la classe `hidden` (display:none) plutôt que de les démonter.
async function visibleScreen(page) {
    return page.evaluate(() => {
        const screen = [...document.querySelectorAll('body > div')]
            .find(div => div.id.startsWith('screen-') && !div.classList.contains('hidden'));
        return screen ? screen.id : null;
    });
}

// Ouvre la liste des thèmes contenant `themeId` et clique sur sa carte.
//
// Seul le saut jusqu'à cette liste est programmé : choisir une catégorie
// n'a jamais rien cassé, et la parcourir à l'aveugle rendrait les tests
// dépendants de l'ordre du contenu, qui bouge à chaque ajout. À partir de
// la liste, on clique comme un joueur — c'est précisément ce bout de
// parcours, liste → axes → modes, qui a déjà porté une régression (voir
// selectedAxesThemeId dans js/app.js: initAxes).
async function openThemeCard(page, themeId) {
    // `bdd` se remplit en deux temps : les thèmes personnalisés d'abord,
    // le pack de langue ensuite. Attendre le thème visé, et non « bdd non
    // vide », évite de cliquer dans une liste encore incomplète.
    await page.waitForFunction(
        id => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === id)),
        themeId,
        { timeout: 45_000 }
    );

    const index = await page.evaluate(id => {
        const ci = bdd.findIndex(c => (c.themes || []).some(t => t.id === id));
        selectedCategoryIndex = ci;
        selectedSubcategoryIndex = null;
        showScreen('screen-themes');
        return bdd[ci].themes.findIndex(t => t.id === id);
    }, themeId);

    expect(index, `thème « ${themeId} » introuvable parmi les thèmes directs d'une catégorie`).toBeGreaterThanOrEqual(0);
    await page.locator('#themes-container > div').nth(index).click();
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
}

// Amène l'app sur l'écran des modes de jeu d'un thème donné.
async function openThemeModes(page, themeId) {
    await openThemeCard(page, themeId);
    // Un thème dont les événements portent un axe passe par l'écran de
    // filtre ; les autres arrivent directement sur les modes.
    if (await visibleScreen(page) === 'screen-axes') {
        await page.locator('#axes-continue-btn').click();
    }
    await expect(page.locator('#screen-modes')).toBeVisible();
}

module.exports = { test, expect, visibleScreen, openThemeCard, openThemeModes };
