// Le Chemin du Temps (js/app/path.js, js/pathCore.js) : la carte des niveaux, un niveau joué avec les
// épreuves de l'Expédition, les étoiles, le déblocage. Les épreuves sont de vrais modes ; on vérifie ici le
// parcours qui les relie, et que chaque niveau est jouable avec les modes qu'il annonce.

const { test, expect, visibleScreen } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    // Le récap hebdomadaire s'ouvre de lui-même 1,2 s après le chargement dès que le journal n'est plus vide :
    // un test rapide le verrait passer devant ses boutons. On le déclare déjà vu cette semaine.
    await page.evaluate(() => {
        markRecapShownThisWeek();
        localStorage.removeItem('historiaxe_path_v1');
        showScreen('screen-categories');
        initCategories();
    });
});

async function ouvrirCarte(page) {
    await page.locator('#btn-path').click();
    await expect(page.locator('#screen-path')).toBeVisible();
}

// Termine l'épreuve en cours comme le ferait un moteur arrivé au bout.
async function finirEpreuve(page, { gagne = true, vies } = {}) {
    await page.evaluate(({ gagne, vies }) => { if (vies !== undefined) lives = vies; score = 100; endGame(gagne); }, { gagne, vies });
}

async function jouerNiveau(page, { gagne = true, vies = 3 } = {}) {
    const n = await page.evaluate(() => expedition.stages.length);
    for (let i = 0; i < n; i++) {
        if (await page.locator('#expedition-final').isVisible()) break;
        await page.locator('#expedition-go').click();
        await finirEpreuve(page, { gagne, vies });
    }
}

test('la carte du Chemin est en tête des catégories et annonce le niveau 1', async ({ page }) => {
    await expect(page.locator('#btn-path')).toBeVisible();
    await expect(page.locator('#btn-path .resume-card-title')).toContainText('Niveau 1');
    await ouvrirCarte(page);
    await expect(page.locator('.path-node')).toHaveCount(11);
    await expect(page.locator('.path-node.is-locked')).toHaveCount(10);
    await expect(page.locator('.path-node.is-next')).toHaveCount(1);
    await expect(page.locator('.path-node.is-boss.is-locked')).toHaveCount(1);
    await expect(page.locator('#path-subtitle')).toContainText('0 ★ sur 33');
});

test('un niveau verrouillé s\'explique et ne se lance pas', async ({ page }) => {
    await ouvrirCarte(page);
    await page.locator('.path-node[data-level="antiquite-3"]').click();
    await expect(page.locator('#path-sheet')).toBeVisible();
    await expect(page.locator('#path-sheet-lock')).toContainText('précédent');
    await expect(page.locator('#path-sheet-play')).toBeHidden();
    await page.locator('.path-node[data-level="antiquite-boss"]').click();
    await expect(page.locator('#path-sheet-lock')).toContainText('15 étoiles');
    await page.evaluate(() => pathStartLevel('antiquite-3'));
    expect(await visibleScreen(page)).toBe('screen-path');
    expect(await page.evaluate(() => expedition)).toBeNull();
});

test('un niveau : 3 épreuves sur 12 repères de sa tranche de temps, vies du niveau', async ({ page }) => {
    await ouvrirCarte(page);
    await page.locator('.path-node[data-level="antiquite-1"]').click();
    await expect(page.locator('#path-sheet-title')).toContainText('Les cités naissantes');
    await page.locator('#path-sheet-play').click();
    expect(await visibleScreen(page)).toBe('screen-expedition');
    await expect(page.locator('#expedition-title')).toHaveText('Les cités naissantes');
    await expect(page.locator('#expedition-track .expedition-stage')).toHaveCount(3);
    const etat = await page.evaluate(() => ({
        n: revisionEvents.length, revision: revisionMode, lives: expedition.lives,
        min: Math.min(...revisionEvents.map(e => e.date)), max: Math.max(...revisionEvents.map(e => e.date))
    }));
    expect(etat.n).toBe(12);
    expect(etat.revision).toBe(true);
    expect(etat.lives).toBe(3);
    expect(etat.min).toBeGreaterThanOrEqual(-800);
    expect(etat.max).toBeLessThan(-600);
    await page.locator('#expedition-go').click();
    expect(await visibleScreen(page)).not.toBe('screen-expedition');
});

test('trois étoiles sans erreur : progression enregistrée, XP versée, niveau suivant ouvert', async ({ page }) => {
    const xpAvant = await page.evaluate(() => gamificationLoad().xp || 0);
    await page.evaluate(() => pathStartLevel('antiquite-1'));
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('#expedition-final-title')).toHaveText('Niveau réussi !');
    await expect(page.locator('.path-final-stars')).toHaveText('★★★');
    await expect(page.locator('#expedition-next-level')).toBeVisible();
    await expect(page.locator('#expedition-leave')).toHaveText('Retour à la carte');
    const sauve = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_path_v1')));
    expect(sauve.levels['antiquite-1'].stars).toBe(3);
    expect(await page.evaluate(() => gamificationLoad().xp || 0)).toBeGreaterThan(xpAvant);
    // « Niveau suivant » lance le niveau 2.
    await page.locator('#expedition-next-level').click();
    await expect(page.locator('#expedition-title')).toHaveText('Perses, sages et philosophes');
    // On quitte par la flèche : retour à la carte, vivier de révision relâché.
    await page.locator('#screen-expedition .back-btn').click();
    await page.locator('#confirm-ok-btn').click();
    expect(await visibleScreen(page)).toBe('screen-path');
    expect(await page.evaluate(() => revisionMode)).toBe(false);
    await expect(page.locator('.path-node[data-level="antiquite-1"] .path-node-stars')).toHaveText('★★★');
    await expect(page.locator('.path-node.is-next')).toHaveAttribute('data-level', 'antiquite-2');
});

test('les étoiles suivent les vies gardées, et ne redescendent jamais en rejouant', async ({ page }) => {
    await page.evaluate(() => pathStartLevel('antiquite-1'));
    await jouerNiveau(page, { vies: 2 });
    await expect(page.locator('.path-final-stars')).toHaveText('★★☆');
    await expect(page.locator('#expedition-final-text')).toContainText('2 vies');
    await page.locator('#expedition-replay').click();
    await expect(page.locator('#expedition-title')).toHaveText('Les cités naissantes');
    await jouerNiveau(page, { vies: 1 });
    await expect(page.locator('.path-final-stars')).toHaveText('★☆☆');
    const p = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_path_v1')).levels['antiquite-1']);
    expect(p).toMatchObject({ stars: 2, plays: 2 });
});

test('perdre toutes ses vies : pas d\'étoile, le niveau suivant reste fermé', async ({ page }) => {
    await page.evaluate(() => pathStartLevel('antiquite-1'));
    await page.locator('#expedition-go').click();
    await finirEpreuve(page, { gagne: false, vies: 0 });
    await expect(page.locator('#expedition-final-title')).toHaveText('Niveau raté — plus de vies');
    await expect(page.locator('.path-final-stars')).toHaveText('☆☆☆');
    await expect(page.locator('#expedition-next-level')).toBeHidden();
    await page.locator('#expedition-leave').click();
    expect(await visibleScreen(page)).toBe('screen-path');
    await expect(page.locator('.path-node.is-locked')).toHaveCount(10);
});

test('abandonner un niveau en pleine épreuve ramène à la carte', async ({ page }) => {
    await page.evaluate(() => pathStartLevel('antiquite-1'));
    await page.locator('#expedition-go').click();
    await page.locator('.quit-btn:visible').click();
    await page.locator('#confirm-ok-btn').click();
    expect(await visibleScreen(page)).toBe('screen-path');
    expect(await page.evaluate(() => expedition)).toBeNull();
    expect(await page.evaluate(() => revisionMode)).toBe(false);
});

test('finir un niveau compte pour la série quotidienne', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('historiaxe_streak_v1'));
    await page.evaluate(() => pathStartLevel('antiquite-1'));
    await jouerNiveau(page, { vies: 3 });
    expect(await page.evaluate(() => streakLoad().currentStreak)).toBe(1);
});

test('le boss : fermé sous 15 étoiles, ouvert au-delà, six épreuves et une vie offerte à mi-parcours', async ({ page }) => {
    await page.evaluate(() => {
        const levels = {};
        for (let n = 1; n <= 10; n++) levels['antiquite-' + n] = { stars: 2, best: 100, plays: 1 };
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels }));
        initCategories();
    });
    await ouvrirCarte(page);
    await expect(page.locator('.path-node.is-boss.is-locked')).toHaveCount(0);
    await page.locator('.path-node[data-level="antiquite-boss"]').click();
    await page.locator('#path-sheet-play').click();
    await expect(page.locator('#expedition-track .expedition-stage')).toHaveCount(6);
    expect(await page.evaluate(() => revisionEvents.length)).toBe(20);
    for (let i = 0; i < 3; i++) {
        await page.locator('#expedition-go').click();
        await finirEpreuve(page, { gagne: true, vies: i === 2 ? 2 : 3 });
    }
    await expect(page.locator('.expedition-joker[data-joker="life"]')).toBeEnabled();
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('#expedition-final-title')).toHaveText('Boss vaincu !');
    await expect(page.locator('#expedition-next-level')).toBeHidden();
});

test('chaque niveau démarre avec chacune de ses épreuves, sans alerte, sur ses 12 repères', async ({ page }) => {
    const resultats = await page.evaluate(() => {
        const out = [];
        for (const world of PathCore.WORLDS) {
            for (const level of PathCore.levelsOf(world)) {
                const events = pathLevelEvents(level.id);
                for (const mode of level.stages) {
                    revisionMode = true; revisionEvents = events.slice();
                    expedition = { plan: { boss: level.boss }, stages: [{ mode, tier: 0, result: null }], index: 0, lives: 3, total: 0, jokers: { skip: 0, life: 0 }, earned: null, running: true, finished: null };
                    let alerte = false;
                    const reel = window.alert; window.alert = () => { alerte = true; };
                    try { EXPEDITION_STARTERS[mode](); } catch (e) { alerte = 'exception: ' + e.message; }
                    window.alert = reel;
                    if (alerte) out.push(level.id + ' / ' + mode + ' : ' + alerte);
                    stopTimer(); resetPlacementAnimationState();
                }
                if (events.length < (level.boss ? 20 : 12)) out.push(level.id + ' : ' + events.length + ' événements');
            }
        }
        expedition = null; revisionMode = false; revisionEvents = [];
        return out;
    });
    expect(resultats).toEqual([]);
});
