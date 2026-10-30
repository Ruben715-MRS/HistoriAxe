// Socle commun des tests de bout en bout : tout ce qu'il faut mettre en
// place pour qu'un test parte d'une app chargée, propre et déterministe.
//
// Deux neutralisations ici, et leurs raisons :
//  1. /api/* — les fonctions serverless ne tournent pas derrière le serveur
//     statique des tests ; sans réponse, chaque appel best-effort du client
//     laisse une erreur dans la console et polluerait l'assertion finale ;
//  2. le tutoriel et la présentation de Clio — leurs bulles se superposent aux
//     écrans et interceptent les clics des premiers pas ;
//  3. le fond de carte (tuiles OpenStreetMap servies par OpenFreeMap) — le Mode Carte
//     et l'Atlas le demandent au réseau ; les tests ne doivent dépendre ni d'internet ni
//     d'un tiers. Il est remplacé par un style réduit à un aplat : la carte se charge, on y
//     clique, rien d'autre.
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
        await page.route(/tiles\.openfreemap\.org/, route => route.fulfill({
            status: 200,
            contentType: 'application/json; charset=utf-8',
            body: JSON.stringify({ version: 8, sources: {}, layers: [{ id: 'fond', type: 'background', paint: { 'background-color': '#dbe9f5' } }] })
        }));
        await page.addInitScript(() => {
            try {
                localStorage.setItem('historiaxe_onboarding_v1', JSON.stringify({ completed: true, shownSteps: [] }));
            } catch (e) { /* stockage indisponible : le tutoriel s'affichera, tant pis */ }
            // La présentation de Clio (carte du premier passage sur le Chemin) couvrirait les clics des
            // parcours qui n'en parlent pas : elle est donc déjà vue. clio.spec.js la remet à zéro.
            try {
                if (!localStorage.getItem('historiaxe_clio_v1')) localStorage.setItem('historiaxe_clio_v1', JSON.stringify({ introSeen: true }));
            } catch (e) { /* stockage indisponible : la présentation s'affichera, tant pis */ }
            // La question « collectionner les portraits ? » est posée à la première ouverture de
            // « Personnages illustres » ; sa fenêtre intercepterait les clics des parcours qui n'en
            // parlent pas. Ils partent donc d'un choix déjà fait (en couleur) — sauf s'il l'est
            // déjà, pour qu'un rechargement ne défasse pas le choix d'un test.
            try {
                const settings = JSON.parse(localStorage.getItem('historiaxe_settings') || '{}');
                if (!('portraitCollection' in settings)) {
                    settings.portraitCollection = 'color';
                    localStorage.setItem('historiaxe_settings', JSON.stringify(settings));
                }
            } catch (e) { /* idem */ }
            // La demande de localisation (une fois, à la première ouverture de l'Atlas) recouvrirait les clics des
            // parcours qui passent par la carte : elle est donc déjà vue. atlas.spec.js le pose aussi, pour son cas.
            try {
                const settings = JSON.parse(localStorage.getItem('historiaxe_settings') || '{}');
                if (!settings.locationPromptShown) {
                    settings.locationPromptShown = true;
                    localStorage.setItem('historiaxe_settings', JSON.stringify(settings));
                }
            } catch (e) { /* idem */ }
        });

        await page.goto('/index.html');
        // Le pack français (~14 Mo) est chargé de façon asynchrone. `bdd` n'est
        // jamais vide au démarrage : app.js y range d'emblée la catégorie des
        // thèmes personnalisés. Attendre « non vide » laissait donc un test
        // cliquer sur l'accueil pendant le chargement du pack, et la fin de
        // window.onload (showScreen('screen-categories')) le ramenait au menu :
        // un test échouait dès que le pack tardait (démarrage à froid, machine
        // chargée). On attend une catégorie du pack — la fin de
        // l'initialisation suit dans la même tâche. Les helpers qui visent un
        // thème précis attendent ce thème (voir openThemeCard).
        await page.waitForFunction(() => window.bdd && window.bdd.some(c => !c.isCustomCategory), null, { timeout: 45_000 });
        // L'accueil n'est qu'un écran de chargement : on attend que l'app l'ait quitté pour le menu principal.
        await page.locator('#screen-categories').waitFor({ state: 'visible', timeout: 15_000 });

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
        id => window.bdd && getAllThemesWithPath().some(x => x.theme.id === id),
        themeId,
        { timeout: 45_000 }
    );

    // Un thème rangé dans une sous-catégorie (Histoire des pays, etc.) n'a pas de liste directe à
    // cliquer : on l'ouvre comme le fait la recherche de thèmes.
    const direct = await page.evaluate(id => bdd.some(c => (c.themes || []).some(t => t.id === id)), themeId);
    if (!direct) {
        await page.evaluate(id => {
            const t = getAllThemesWithPath().find(x => x.theme.id === id);
            openThemeAt(t.ci, t.si, t.ti);
        }, themeId);
        await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
        return;
    }

    const index = await page.evaluate(id => {
        const ci = bdd.findIndex(c => (c.themes || []).some(t => t.id === id));
        selectedCategoryIndex = ci;
        selectedSubcategoryIndex = null;
        showScreen('screen-themes');
        // La liste commence parfois par des cartes qui ne sont pas des
        // thèmes (Mode Carte dès que la catégorie est géolocalisable, carte
        // « Nouveau thème » des catégories perso) : les thèmes sont toujours
        // les dernières cartes, d'où ce décalage plutôt qu'un index brut.
        const themes = getCurrentThemeList();
        const decalage = document.querySelectorAll('#themes-container > div').length - themes.length;
        const rang = themes.findIndex(t => t.id === id);
        return rang < 0 ? -1 : decalage + rang;
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
