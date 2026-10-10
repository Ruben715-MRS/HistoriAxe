// Le parcours des écrans de l'app, partagé par les tests qui doivent « tout
// voir » : l'inventaire clavier (e2e/clavier.spec.js) et les contrastes
// (e2e/contrastes.spec.js).
//
// Deux tests, un seul parcours : un écran ajouté ici est contrôlé des deux
// côtés à la fois. Avec deux parcours recopiés, ils s'écarteraient dès le
// premier écran oublié dans l'un des deux.

const { openThemeCard } = require('./fixtures');

async function attendreLePack(page) {
    await page.waitForFunction(
        () => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')),
        null,
        { timeout: 45_000 }
    );
}

// Parcourt une trentaine d'écrans et de modales, et appelle
// `surChaqueEcran(etape)` quand chacun est affiché. `etape` est un libellé
// lisible, pour que l'échec d'un test dise OÙ regarder.
async function parcourirLesEcrans(page, surChaqueEcran) {
    await attendreLePack(page);

    // Un historique, pour que le hub de révision et le Défi de simultanéité aient du contenu.
    await page.evaluate(() => {
        const srs = {}; let n = 0;
        (function w(ns) { ns.forEach(x => { (x.themes || []).forEach(t => (t.events || []).forEach(e => { if (n < 40 && typeof e.date === 'number') { srs[e.id] = { box: 1, lastReviewed: Date.now(), failCount: 2, successCount: 0 }; n++; } })); if (x.subcategories) w(x.subcategories); }); })(window.bdd);
        localStorage.setItem('historiaxe_srs_v1', JSON.stringify(srs));
    });

    await surChaqueEcran('accueil');
    await page.evaluate(() => showScreen('screen-categories')); await surChaqueEcran('catégories');
    await page.locator('#btn-daily').click(); await surChaqueEcran('catégories + défis');
    await page.locator('#theme-search-input').fill('rome');
    await page.waitForTimeout(400); await surChaqueEcran('résultats de recherche');
    await page.evaluate(() => clearThemeSearch());
    await page.evaluate(() => showScreen('screen-revision-hub')); await surChaqueEcran('hub de révision');
    await page.evaluate(() => switchRevisionHubTab('progress'));
    await page.waitForTimeout(300); await surChaqueEcran('progression');
    await page.evaluate(() => { const ci = bdd.findIndex(c => c.subcategories); selectedCategoryIndex = ci; selectedSubcategoryIndex = null; showScreen('screen-subcategories'); }); await surChaqueEcran('sous-catégories');
    // Personnages illustres : le bouton de la galerie et ses trois ordres, la galerie, une fiche ouverte de là.
    await page.evaluate(() => { selectedCategoryIndex = bdd.findIndex(c => c.nom === 'Personnages illustres'); selectedSubcategoryIndex = []; showScreen('screen-subcategories'); }); await surChaqueEcran('personnages illustres');
    await page.evaluate(() => document.getElementById('modal-collection').classList.remove('hidden')); await surChaqueEcran('choix de la collection de portraits');
    await page.locator('#modal-collection .close-btn').click();
    await page.locator('#btn-gallery').click(); await surChaqueEcran('galerie : choix de l’ordre');
    await page.locator('#gallery-order-picker [data-order="famille"]').click();
    await page.waitForSelector('#gallery-container .gallery-card'); await surChaqueEcran('galerie des portraits');
    await page.locator('#gallery-container .gallery-card').first().click(); await surChaqueEcran('fiche ouverte depuis la galerie');
    await page.locator('#modal-details .close-btn').click();
    // Mode collection : cartes en noir et blanc, compteur, fiche d'un personnage pas encore rencontré.
    await page.evaluate(() => { appSettings.portraitCollection = 'bw'; settingsSave(appSettings); initGallery(); });
    await surChaqueEcran('galerie en mode collection');
    await page.locator('#gallery-container .gallery-card').first().click(); await surChaqueEcran('fiche d’un portrait à débloquer');
    await page.locator('#modal-details .close-btn').click();
    await page.evaluate(() => { appSettings.portraitCollection = 'color'; settingsSave(appSettings); });
    await page.evaluate(() => { const ci = bdd.findIndex(c => (c.themes || []).length); selectedCategoryIndex = ci; selectedSubcategoryIndex = null; showScreen('screen-themes'); }); await surChaqueEcran('thèmes');

    await openThemeCard(page, 'thm_aut'); await surChaqueEcran('axes');
    await page.locator('#axes-continue-btn').click(); await surChaqueEcran('modes');
    await page.evaluate(() => openSelectionMode()); await surChaqueEcran('sélection');
    await page.evaluate(() => showScreen('screen-modes'));
    await page.locator('#mode-card-classic').click(); await page.waitForSelector('#screen-game:not(.hidden)'); await surChaqueEcran('frise');
    await page.evaluate(() => showScreen('screen-modes'));
    for (const [carte, etape] of [['.quiz-card', 'quiz'], ['.periodes-card', 'périodes'], ['.avap-card', 'avant/après'],
        ['.fil-card', 'fil du temps'], ['.ecart-card', 'écart'], ['#mode-card-simultaneity', 'simultanéité'],
        ['#mode-card-ordre', 'remise en ordre'], ['#mode-card-curseur', 'curseur'], ['#mode-card-intrus', 'intrus']]) {
        await page.locator(carte).click(); await surChaqueEcran(etape);
        await page.evaluate(() => { currentMode = 'classic'; showScreen('screen-modes'); });
    }
    // Qui est-ce ? : un panthéon, son mode, la question, puis la fiche révélée.
    await page.evaluate(() => { const t = getAllThemesWithPath().find(x => x.theme.id === 'pan_fr'); openThemeAt(t.ci, t.si, t.ti); });
    await page.waitForSelector('#screen-axes:not(.hidden), #screen-modes:not(.hidden)');
    if (await page.locator('#screen-axes').isVisible()) await page.locator('#axes-continue-btn').click();
    await surChaqueEcran('modes d’un panthéon');
    await page.locator('#mode-card-whois').click(); await surChaqueEcran('qui est-ce');
    await page.locator('#whois-options .whois-option').first().click();
    await page.waitForSelector('#whois-reveal:not(.hidden)'); await surChaqueEcran('qui est-ce : révélé');
    await page.evaluate(() => { currentMode = 'classic'; showScreen('screen-modes'); });
    await page.evaluate(() => showScreen('screen-end')); await surChaqueEcran('fin de partie');
    await page.evaluate(() => { openProfileModal(); }); await surChaqueEcran('profil');
    await page.evaluate(() => closeProfileModal());
    for (const ouvrir of ['openSettings()', 'openLeaderboard()', 'openAddThemeModal()', 'openAddEventModal()', 'openScoringInfo()']) {
        await page.evaluate(code => { try { (new Function(code))(); } catch (e) { } }, ouvrir);
        await surChaqueEcran('modale ' + ouvrir);
        await page.evaluate(() => document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')));
    }
}

module.exports = { attendreLePack, parcourirLesEcrans };
