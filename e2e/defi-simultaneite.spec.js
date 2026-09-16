// Le Défi de simultanéité : la version globale du mode, lancée depuis
// l'écran des catégories plutôt que depuis un thème.
//
// Ce qui le distingue du mode par thème tient en une règle : ses ancres sont
// tirées de ce que le joueur a DÉJÀ RENCONTRÉ (les fiches du SRS), jamais de
// toute la base — sans quoi la question « lequel de ces événements lui est
// contemporain ? » porterait sur une ancre inconnue et deviendrait du tirage
// au sort. Ces parcours vérifient les deux versants de cette règle : le
// verrou tant que l'historique est trop mince, et le tirage effectif une fois
// l'historique fourni.

const { test, expect } = require('./fixtures');

// `bdd` se remplit en deux temps : les thèmes personnalisés d'abord, le pack
// de langue (~14 Mo) ensuite. Attendre un thème connu, et non « bdd non
// vide », évite d'agir sur une base encore incomplète — le chargement du pack
// redessine l'écran en cours de route (même précaution que
// e2e/fixtures.js: openThemeCard).
async function attendreLePack(page) {
    await page.waitForFunction(
        () => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')),
        null,
        { timeout: 45_000 }
    );
}

// Écrit un historique SRS de toutes pièces, comme si le joueur avait déjà
// croisé ces événements en jeu. `box: 3` = déjà réussi, donc des ancres que
// le défi préfère.
async function donnerUnHistorique(page, nombre) {
    await attendreLePack(page);
    return page.evaluate(count => {
        const srs = {};
        const pris = [];
        (function walk(nodes) {
            nodes.forEach(n => {
                (n.themes || []).forEach(th => {
                    (th.events || []).forEach(e => {
                        if (pris.length < count && typeof e.date === 'number') {
                            srs[e.id] = { box: 3, lastReviewed: Date.now(), failCount: 0, successCount: 2 };
                            pris.push(e.id);
                        }
                    });
                });
                if (n.subcategories) walk(n.subcategories);
            });
        })(window.bdd);
        localStorage.setItem('historiaxe_srs_v1', JSON.stringify(srs));
        return pris.length;
    }, nombre);
}

async function ouvrirLeSelecteurDeDefis(page) {
    await attendreLePack(page);
    await page.evaluate(() => showScreen('screen-categories'));
    await expect(page.locator('#screen-categories')).toBeVisible();
    await page.locator('#btn-daily').click();
    await expect(page.locator('#challenge-picker')).toBeVisible();
}

test('sans historique, le défi est visible mais verrouillé', async ({ page }) => {
    await ouvrirLeSelecteurDeDefis(page);

    const bouton = page.locator('#btn-challenge-simul');
    // Visible et non caché : un mode qu'on ne voit pas ne donne envie de rien.
    await expect(bouton).toBeVisible();
    await expect(bouton).toHaveClass(/locked/);

    // Le clic explique ce qui l'ouvrira, plutôt que de ne rien faire.
    await bouton.click();
    await expect(page.locator('#modal-confirm')).toBeVisible();
    await expect(page.locator('#modal-confirm')).toContainText('20');
    await expect(page.locator('#screen-simultaneity')).toBeHidden();
});

test('une fois l’historique fourni, le défi se déverrouille et se lance', async ({ page }) => {
    const ecrits = await donnerUnHistorique(page, 40);
    expect(ecrits).toBeGreaterThanOrEqual(20);

    await ouvrirLeSelecteurDeDefis(page);
    const bouton = page.locator('#btn-challenge-simul');
    await expect(bouton).not.toHaveClass(/locked/);

    await bouton.click();
    await expect(page.locator('#screen-simultaneity')).toBeVisible();
    // 10 questions, comme le Défi du jour — et non 12 comme le mode par thème.
    await expect(page.locator('#simul-hud-count')).toHaveText('1 / 10');
    await expect(page.locator('#simul-options .simul-option')).toHaveCount(4);
    // Chaque ancre annonce son thème d'origine : au Défi elles viennent de
    // thèmes divers, il n'y a pas de « thème courant » à afficher.
    await expect(page.locator('#simul-anchor-theme')).not.toBeEmpty();
});

test('toutes les ancres du défi sortent de l’historique du joueur', async ({ page }) => {
    await donnerUnHistorique(page, 40);
    await ouvrirLeSelecteurDeDefis(page);
    await page.locator('#btn-challenge-simul').click();
    await expect(page.locator('#screen-simultaneity')).toBeVisible();

    const inconnues = await page.evaluate(() => {
        const srs = JSON.parse(localStorage.getItem('historiaxe_srs_v1') || '{}');
        return simulQuestions.filter(q => !srs[q.anchor.id]).map(q => q.anchor.titre);
    });
    expect(inconnues, 'une ancre hors historique rendrait la question indevinable').toEqual([]);
});

test('le tirage du jour est stable d’une partie à l’autre', async ({ page }) => {
    // La graine mêle l'identifiant d'appareil au jour courant : relancer le
    // défi dans la journée doit redonner exactement le même tirage, sinon ce
    // n'est plus un défi mais un mode à volonté.
    await donnerUnHistorique(page, 40);

    async function tirage() {
        await ouvrirLeSelecteurDeDefis(page);
        await page.locator('#btn-challenge-simul').click();
        await expect(page.locator('#screen-simultaneity')).toBeVisible();
        const ids = await page.evaluate(() => simulQuestions.map(q => q.anchor.id + '>' + q.correct.id));
        await page.evaluate(() => showScreen('screen-categories'));
        return ids;
    }

    const premier = await tirage();
    const second = await tirage();
    expect(second).toEqual(premier);
    expect(premier.length).toBe(10);
});

test('le défi ne rattache aucun score à un thème', async ({ page }) => {
    // Ses ancres viennent de thèmes divers : il n'y a pas de theme.id auquel
    // rattacher le score, et en inventer un polluerait l'historique du thème.
    await donnerUnHistorique(page, 40);
    await ouvrirLeSelecteurDeDefis(page);
    await page.locator('#btn-challenge-simul').click();
    await expect(page.locator('#screen-simultaneity')).toBeVisible();

    const avant = await page.evaluate(() => localStorage.getItem('historiaxe_daily_leaderboard_v1'));
    // Termine la partie d'office plutôt que de cliquer dix fois.
    await page.evaluate(() => endGame(true));
    await expect(page.locator('#screen-end')).toBeVisible();
    const apres = await page.evaluate(() => localStorage.getItem('historiaxe_daily_leaderboard_v1'));
    expect(apres).toEqual(avant);
});
