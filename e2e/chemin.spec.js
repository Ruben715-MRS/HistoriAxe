// Le Chemin du Temps (js/app/path.js, js/pathCore.js) : la carte des niveaux, un niveau joué avec les
// épreuves de l'Expédition, les étoiles, le déblocage. Les épreuves sont de vrais modes ; on vérifie ici le
// parcours qui les relie, et que chaque niveau est jouable avec les modes qu'il annonce.
//
// Sauf mention contraire, un test part d'un joueur qui a PASSÉ le Monde 0 (la Préhistoire est ouverte) :
// les tests du Monde 0 et des leçons repartent d'une progression vide (`progression(page, null)`).

const { test, expect, visibleScreen } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    // Le récap hebdomadaire s'ouvre de lui-même 1,2 s après le chargement dès que le journal n'est plus vide :
    // un test rapide le verrait passer devant ses boutons. On le déclare déjà vu cette semaine.
    await page.evaluate(() => {
        // La révélation d'une carte (js/app/rewards.js, testée dans recompenses.spec.js) ouvrirait une modale
        // devant les boutons de fin de niveau : ces tests-ci portent sur le parcours, pas sur les récompenses.
        rewardsRevealCards = () => {};
        markRecapShownThisWeek();
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels: {}, skipped: ['monde0'] }));
        showScreen('screen-categories');
        initCategories();
    });
});

// Remplace la progression du Chemin (null : joueur tout neuf) et redessine l'écran des catégories.
async function progression(page, data) {
    await page.evaluate((data) => {
        if (data) localStorage.setItem('historiaxe_path_v1', JSON.stringify(data));
        else localStorage.removeItem('historiaxe_path_v1');
        initCategories();
    }, data);
}

// Progression d'un joueur qui a fait tous les niveaux (une étoile) des mondes qui précèdent `worldId`,
// plus d'éventuels niveaux supplémentaires `extra` ({ id: étoiles }).
async function arrivee(page, worldId, extra = {}) {
    await page.evaluate(({ worldId, extra }) => {
        const levels = {};
        for (const w of PathCore.mainWorlds()) {
            if (w.id === worldId) break;
            PathCore.levelsOf(w).forEach(l => { levels[l.id] = { stars: 1, best: 1, plays: 1 }; });
        }
        Object.entries(extra).forEach(([id, stars]) => { levels[id] = { stars, best: 100, plays: 1 }; });
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels, skipped: [] }));
        showScreen('screen-categories');
        initCategories();
    }, { worldId, extra });
}

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

test('un joueur neuf commence par le Monde 0 ; les mondes suivants sont fermés, et seul le prochain est dessiné', async ({ page }) => {
    await progression(page, null);
    await expect(page.locator('#btn-path')).toBeVisible();
    await expect(page.locator('#btn-path .resume-card-title')).toContainText('Premiers pas sur la frise');
    await ouvrirCarte(page);
    // Monde 0 (7 niveaux + boss) et la Préhistoire, le prochain monde (3 niveaux + boss) : 12 pastilles.
    await expect(page.locator('.path-node')).toHaveCount(12);
    await expect(page.locator('.path-node:not(.is-locked)')).toHaveCount(1);
    await expect(page.locator('.path-node.is-next')).toHaveAttribute('data-level', 'monde0-1');
    const total = await page.evaluate(() => pathTotalMaxStars());
    await expect(page.locator('#path-subtitle')).toContainText(`0 ★ sur ${total}`);
    // Les 20 autres mondes ne sont qu'un en-tête replié : la carte reste lisible.
    await expect(page.locator('.path-world.is-collapsed')).toHaveCount(20);
    await expect(page.locator('.path-world[data-world="prehistoire"]')).toHaveClass(/is-locked/);
    await expect(page.locator('.path-world[data-world="prehistoire"] .path-world-note')).toContainText('Monde 0');
    // On gravit la carte : la suite du Chemin en haut, le Monde 0 tout en bas.
    const ordre = await page.evaluate(() => [...document.querySelectorAll('.path-world')].map(s => s.dataset.world));
    expect(ordre[0]).toBe('depuis-1991');
    expect(ordre[ordre.length - 1]).toBe('monde0');
    expect(ordre).toHaveLength(22);
    await page.locator('.path-node[data-level="prehistoire-1"]').click();
    await expect(page.locator('#path-sheet-lock')).toContainText('boss du monde');
    await expect(page.locator('#path-sheet-play')).toBeHidden();
});

test('« Je connais déjà » passe le Monde 0 : la Préhistoire s\'ouvre, le Monde 0 reste jouable', async ({ page }) => {
    await progression(page, null);
    await ouvrirCarte(page);
    await page.locator('.path-world[data-world="monde0"] .path-world-skip').click();
    await page.locator('#confirm-ok-btn').click();
    await expect(page.locator('.path-world[data-world="prehistoire"]')).not.toHaveClass(/is-locked/);
    await expect(page.locator('.path-node.is-next')).toHaveAttribute('data-level', 'prehistoire-1');
    await expect(page.locator('.path-node[data-level="monde0-1"]')).not.toHaveClass(/is-locked/);
    await expect(page.locator('.path-world-skip')).toHaveCount(0);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_path_v1')).skipped)).toEqual(['monde0']);
});

test('Monde 0, niveau 1 : on joue tout de suite, sur 8 repères connus, sans leçon', async ({ page }) => {
    await progression(page, null);
    await ouvrirCarte(page);
    await page.locator('.path-node[data-level="monde0-1"]').click();
    await expect(page.locator('#path-sheet-range')).toBeHidden();
    await page.locator('#path-sheet-play').click();
    await expect(page.locator('#expedition-title')).toHaveText('Premiers pas sur la frise');
    await expect(page.locator('#expedition-track .expedition-stage')).toHaveCount(2);
    expect(await page.evaluate(() => revisionEvents.length)).toBe(8);
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('.path-final-stars')).toHaveText('★★★');
    await expect(page.locator('#expedition-next-level')).toBeVisible();
});

test('une leçon : l\'explication s\'affiche après chaque réponse, une erreur coûte une vie', async ({ page }) => {
    await progression(page, { levels: { 'monde0-1': { stars: 3, best: 1, plays: 1 }, 'monde0-2': { stars: 3, best: 1, plays: 1 } } });
    await page.evaluate(() => pathStartLevel('monde0-3'));
    await expect(page.locator('#expedition-title')).toHaveText('Compter les années');
    await expect(page.locator('#expedition-next-title')).toHaveText('Leçon · Compter les années : les ères');
    await page.locator('#expedition-go').click();
    expect(await visibleScreen(page)).toBe('screen-lesson');
    await expect(page.locator('#lesson-options .lesson-option')).toHaveCount(4);
    await expect(page.locator('#lesson-hud-count')).toHaveText('1 / 5');
    // Une bonne réponse : « Juste ! », l'explication, 100 points, les vies intactes.
    const bonne = await page.evaluate(() => lessonQuestions[0].choices.findIndex(c => c.correct));
    await page.locator(`#lesson-options .lesson-option[data-index="${bonne}"]`).click();
    await expect(page.locator('#lesson-feedback')).toBeVisible();
    await expect(page.locator('#lesson-feedback-title')).toHaveText('Juste !');
    await expect(page.locator('#lesson-feedback-text')).not.toBeEmpty();
    await expect(page.locator('#lesson-options .lesson-option.correct')).toHaveCount(1);
    expect(await page.evaluate(() => ({ score, lives }))).toEqual({ score: 100, lives: 3 });
    await page.locator('#lesson-next').click();
    // Une mauvaise : la bonne réponse est montrée, une vie est perdue.
    const mauvaise = await page.evaluate(() => lessonQuestions[1].choices.findIndex(c => !c.correct));
    await page.locator(`#lesson-options .lesson-option[data-index="${mauvaise}"]`).click();
    await expect(page.locator('#lesson-feedback-title')).toHaveText('Pas tout à fait…');
    await expect(page.locator('#lesson-options .lesson-option.wrong')).toHaveCount(1);
    await expect(page.locator('#lesson-options .lesson-option.correct')).toHaveCount(1);
    expect(await page.evaluate(() => lives)).toBe(2);
    // Les trois questions suivantes, justes : l'épreuve rend la main au niveau avec ses vies.
    for (let i = 2; i < 5; i++) {
        await page.locator('#lesson-next').click();
        const idx = await page.evaluate((i) => lessonQuestions[i].choices.findIndex(c => c.correct), i);
        await page.locator(`#lesson-options .lesson-option[data-index="${idx}"]`).click();
    }
    await expect(page.locator('#lesson-next')).toHaveText('Terminer la leçon');
    await page.locator('#lesson-next').click();
    expect(await visibleScreen(page)).toBe('screen-expedition');
    expect(await page.evaluate(() => ({ index: expedition.index, lives: expedition.lives, total: expedition.total }))).toEqual({ index: 1, lives: 2, total: 400 });
});

test('une leçon perdue (plus de vies) termine le niveau sans étoile', async ({ page }) => {
    await progression(page, { levels: { 'monde0-1': { stars: 3, best: 1, plays: 1 } } });
    await page.evaluate(() => pathStartLevel('monde0-2'));
    await page.locator('#expedition-go').click();
    for (let i = 0; i < 3; i++) {
        const idx = await page.evaluate((i) => lessonQuestions[i].choices.findIndex(c => !c.correct), i);
        await page.locator(`#lesson-options .lesson-option[data-index="${idx}"]`).click();
        if (i < 2) await page.locator('#lesson-next').click();
    }
    await expect(page.locator('#lesson-next')).toHaveText('Plus de vies — terminer');
    await page.locator('#lesson-next').click();
    await expect(page.locator('#expedition-final-title')).toHaveText('Niveau raté — plus de vies');
    await expect(page.locator('.path-final-stars')).toHaveText('☆☆☆');
});

test('quitter une leçon ramène à la carte', async ({ page }) => {
    await progression(page, { levels: { 'monde0-1': { stars: 1, best: 1, plays: 1 } } });
    await page.evaluate(() => pathStartLevel('monde0-2'));
    await page.locator('#expedition-go').click();
    await page.locator('#screen-lesson .quit-btn').click();
    await page.locator('#confirm-ok-btn').click();
    expect(await visibleScreen(page)).toBe('screen-path');
    expect(await page.evaluate(() => ({ e: expedition, r: revisionMode }))).toEqual({ e: null, r: false });
});

test('le boss du Monde 0 vaincu : « Niveau suivant » mène à la Préhistoire', async ({ page }) => {
    const levels = {};
    for (let n = 1; n <= 7; n++) levels['monde0-' + n] = { stars: 2, best: 100, plays: 1 };
    await progression(page, { levels });
    await page.evaluate(() => pathStartLevel('monde0-boss'));
    await expect(page.locator('#expedition-track .expedition-stage')).toHaveCount(3);
    await expect(page.locator('#expedition-next-title')).toHaveText('Leçon · Révision générale');
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('#expedition-final-title')).toHaveText('Boss vaincu !');
    await expect(page.locator('#expedition-final-extra')).toContainText('Vous savez lire le temps');
    await page.locator('#expedition-next-level').click();
    await expect(page.locator('#expedition-title')).toHaveText('Les premiers outils et le feu');
});

test('un niveau verrouillé s\'explique et ne se lance pas', async ({ page }) => {
    await ouvrirCarte(page);
    await page.locator('.path-node[data-level="prehistoire-3"]').click();
    await expect(page.locator('#path-sheet')).toBeVisible();
    await expect(page.locator('#path-sheet-lock')).toContainText('précédent');
    await expect(page.locator('#path-sheet-play')).toBeHidden();
    await page.locator('.path-node[data-level="prehistoire-boss"]').click();
    await expect(page.locator('#path-sheet-lock')).toContainText('5 étoiles');
    await page.evaluate(() => pathStartLevel('prehistoire-3'));
    expect(await visibleScreen(page)).toBe('screen-path');
    expect(await page.evaluate(() => expedition)).toBeNull();
});

test('un niveau : 3 épreuves sur 12 repères de sa tranche de temps, vies du niveau', async ({ page }) => {
    await ouvrirCarte(page);
    await page.locator('.path-node[data-level="prehistoire-1"]').click();
    await expect(page.locator('#path-sheet-title')).toContainText('Les premiers outils et le feu');
    await expect(page.locator('#path-sheet-range')).toContainText('av. J.-C.');
    await page.locator('#path-sheet-play').click();
    expect(await visibleScreen(page)).toBe('screen-expedition');
    await expect(page.locator('#expedition-title')).toHaveText('Les premiers outils et le feu');
    await expect(page.locator('#expedition-track .expedition-stage')).toHaveCount(3);
    const etat = await page.evaluate(() => ({
        n: revisionEvents.length, revision: revisionMode, lives: expedition.lives,
        min: Math.min(...revisionEvents.map(e => e.date)), max: Math.max(...revisionEvents.map(e => e.date))
    }));
    expect(etat.n).toBe(12);
    expect(etat.revision).toBe(true);
    expect(etat.lives).toBe(3);
    expect(etat.min).toBeGreaterThanOrEqual(-3300000);
    expect(etat.max).toBeLessThan(-40000);
    await page.locator('#expedition-go').click();
    expect(await visibleScreen(page)).not.toBe('screen-expedition');
});

test('trois étoiles sans erreur : progression enregistrée, XP versée, niveau suivant ouvert', async ({ page }) => {
    const xpAvant = await page.evaluate(() => gamificationLoad().xp || 0);
    await page.evaluate(() => pathStartLevel('prehistoire-1'));
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('#expedition-final-title')).toHaveText('Niveau réussi !');
    await expect(page.locator('.path-final-stars')).toHaveText('★★★');
    await expect(page.locator('#expedition-next-level')).toBeVisible();
    await expect(page.locator('#expedition-leave')).toHaveText('Retour à la carte');
    const sauve = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_path_v1')));
    expect(sauve.levels['prehistoire-1'].stars).toBe(3);
    expect(await page.evaluate(() => gamificationLoad().xp || 0)).toBeGreaterThan(xpAvant);
    // « Niveau suivant » lance le niveau 2.
    await page.locator('#expedition-next-level').click();
    await expect(page.locator('#expedition-title')).toHaveText('Les premiers artistes');
    // On quitte par la flèche : retour à la carte, vivier de révision relâché.
    await page.locator('#screen-expedition .back-btn').click();
    await page.locator('#confirm-ok-btn').click();
    expect(await visibleScreen(page)).toBe('screen-path');
    expect(await page.evaluate(() => revisionMode)).toBe(false);
    await expect(page.locator('.path-node[data-level="prehistoire-1"] .path-node-stars')).toHaveText('★★★');
    await expect(page.locator('.path-node.is-next')).toHaveAttribute('data-level', 'prehistoire-2');
});

test('les étoiles suivent les vies gardées, et ne redescendent jamais en rejouant', async ({ page }) => {
    await page.evaluate(() => pathStartLevel('prehistoire-1'));
    await jouerNiveau(page, { vies: 2 });
    await expect(page.locator('.path-final-stars')).toHaveText('★★☆');
    await expect(page.locator('#expedition-final-text')).toContainText('2 vies');
    await page.locator('#expedition-replay').click();
    await expect(page.locator('#expedition-title')).toHaveText('Les premiers outils et le feu');
    await jouerNiveau(page, { vies: 1 });
    await expect(page.locator('.path-final-stars')).toHaveText('★☆☆');
    const p = await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_path_v1')).levels['prehistoire-1']);
    expect(p).toMatchObject({ stars: 2, plays: 2 });
});

test('perdre toutes ses vies : pas d\'étoile, le niveau suivant reste fermé', async ({ page }) => {
    await page.evaluate(() => pathStartLevel('prehistoire-1'));
    await page.locator('#expedition-go').click();
    await finirEpreuve(page, { gagne: false, vies: 0 });
    await expect(page.locator('#expedition-final-title')).toHaveText('Niveau raté — plus de vies');
    await expect(page.locator('.path-final-stars')).toHaveText('☆☆☆');
    await expect(page.locator('#expedition-next-level')).toBeHidden();
    await page.locator('#expedition-leave').click();
    expect(await visibleScreen(page)).toBe('screen-path');
    await expect(page.locator('.path-world[data-world="prehistoire"] .path-node.is-locked')).toHaveCount(3);
});

test('abandonner un niveau en pleine épreuve ramène à la carte', async ({ page }) => {
    await page.evaluate(() => pathStartLevel('prehistoire-1'));
    await page.locator('#expedition-go').click();
    await page.locator('.quit-btn:visible').click();
    await page.locator('#confirm-ok-btn').click();
    expect(await visibleScreen(page)).toBe('screen-path');
    expect(await page.evaluate(() => expedition)).toBeNull();
    expect(await page.evaluate(() => revisionMode)).toBe(false);
});

test('finir un niveau compte pour la série quotidienne', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('historiaxe_streak_v1'));
    await page.evaluate(() => pathStartLevel('prehistoire-1'));
    await jouerNiveau(page, { vies: 3 });
    expect(await page.evaluate(() => streakLoad().currentStreak)).toBe(1);
});

test('le boss : fermé sous la moitié des étoiles, six épreuves et une vie offerte à mi-parcours', async ({ page }) => {
    // La Préhistoire : 3 niveaux, donc 5 étoiles ouvrent le boss. Avec 1 étoile par niveau (3), il reste fermé.
    await arrivee(page, 'prehistoire', { 'prehistoire-1': 1, 'prehistoire-2': 1, 'prehistoire-3': 1 });
    await ouvrirCarte(page);
    await expect(page.locator('.path-node[data-level="prehistoire-boss"]')).toHaveClass(/is-locked/);
    await arrivee(page, 'prehistoire', { 'prehistoire-1': 2, 'prehistoire-2': 2, 'prehistoire-3': 1 });
    await ouvrirCarte(page);
    await expect(page.locator('.path-node[data-level="prehistoire-boss"]')).not.toHaveClass(/is-locked/);
    await page.locator('.path-node[data-level="prehistoire-boss"]').click();
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
    // Le monde suivant s'ouvre : « Niveau suivant » y conduit.
    await expect(page.locator('#expedition-next-level')).toBeVisible();
    await page.locator('#expedition-next-level').click();
    await expect(page.locator('#expedition-title')).toHaveText('Narmer et l\'invention de l\'écriture');
});

test('une île bonus s\'ouvre à la moitié de son monde, se joue à part et ramène à sa carte', async ({ page }) => {
    // La Grèce a 8 niveaux : l'île de Chine s'ouvre quand le niveau 4 est réussi.
    await arrivee(page, 'grece', { 'grece-1': 1, 'grece-2': 1, 'grece-3': 1 });
    await ouvrirCarte(page);
    const carte = page.locator('.path-island-card[data-island="ile-chine"]');
    await expect(carte).toBeVisible();
    await expect(carte).toHaveClass(/is-locked/);
    await carte.click();
    await expect(page.locator('#confirm-message')).toContainText('niveau 4');
    await page.locator('#confirm-ok-btn').click();
    // On réussit le niveau 4 : l'île est annoncée sur l'écran de fin.
    await page.evaluate(() => pathStartLevel('grece-4'));
    await jouerNiveau(page, { vies: 3 });
    await expect(page.locator('.path-final-island')).toContainText('La Chine impériale');
    await page.locator('#expedition-leave').click();
    await expect(page.locator('.path-island-card[data-island="ile-chine"]')).not.toHaveClass(/is-locked/);
    // Entrer dans l'île : sa seule piste (6 niveaux + boss), et la flèche revient à la carte des mondes.
    await page.locator('.path-island-card[data-island="ile-chine"]').click();
    await expect(page.locator('.path-node')).toHaveCount(7);
    await expect(page.locator('#path-subtitle')).toContainText('Île bonus');
    await expect(page.locator('.path-node.is-next')).toHaveAttribute('data-level', 'ile-chine-1');
    // Jouer un niveau de l'île, puis quitter : retour à la carte de l'île, pas à celle des mondes.
    await page.evaluate(() => pathStartLevel('ile-chine-1'));
    await expect(page.locator('#expedition-title')).toHaveText('Confucius et Lao Tseu');
    await page.locator('#expedition-go').click();
    await page.locator('.quit-btn:visible').click();
    await page.locator('#confirm-ok-btn').click();
    expect(await visibleScreen(page)).toBe('screen-path');
    await expect(page.locator('.path-node')).toHaveCount(7);
    await page.locator('#path-back').click();
    await expect(page.locator('.path-world[data-world="grece"]')).toBeVisible();
    // Le chemin principal ne propose jamais l'île d'office.
    expect(await page.evaluate(() => PathCore.nextTarget(pathProgress()).levelId)).toBe('grece-5');
});

test('chaque niveau de chaque monde démarre avec chacune de ses épreuves, sans alerte, sur au moins 8 repères', async ({ page }) => {
    test.setTimeout(180_000);
    const resultats = await page.evaluate(() => {
        const out = [];
        for (const world of PathCore.WORLDS) {
            for (const level of PathCore.levelsOf(world)) {
                const events = pathLevelEvents(level.id);
                for (const spec of level.stages) {
                    const stage = typeof spec === 'string' ? { mode: spec } : spec;
                    revisionMode = true; revisionEvents = events.slice();
                    expedition = { plan: { boss: level.boss }, stages: [{ ...stage, tier: 0, result: null }], index: 0, lives: 3, total: 0, jokers: { skip: 0, life: 0 }, earned: null, running: true, finished: null };
                    let alerte = false;
                    const reel = window.alert; window.alert = () => { alerte = true; };
                    try {
                        if (stage.mode === 'lecon') startLessonStage(stage); else EXPEDITION_STARTERS[stage.mode]();
                    } catch (e) { alerte = 'exception: ' + e.message; }
                    window.alert = reel;
                    if (alerte) out.push(level.id + ' / ' + stage.mode + ' : ' + alerte);
                    stopTimer(); resetPlacementAnimationState();
                }
                const attendu = level.ids ? level.ids.length : (PathCore.levelNeedsEvents(level) ? (level.boss ? 12 : 8) : 0);
                if (events.length < attendu) out.push(level.id + ' : ' + events.length + ' événements');
            }
        }
        expedition = null; revisionMode = false; revisionEvents = [];
        return out;
    });
    expect(resultats).toEqual([]);
});
