// L'Expédition (js/app/expedition.js) : huit épreuves tirées parmi les modes, trois vies pour tout le
// parcours. Les épreuves sont de vrais modes ; ce qu'on vérifie ici, c'est le parcours qui les relie.

const { test, expect, visibleScreen, openThemeModes } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    await openThemeModes(page, 'thm_be');
    await page.locator('#mode-card-expedition').click();
    await expect(page.locator('#screen-expedition')).toBeVisible();
});

// Termine l'épreuve en cours comme le ferait un moteur arrivé au bout.
async function finirEpreuve(page, { gagne = true, vies } = {}) {
    await page.evaluate(({ gagne, vies }) => { if (vies !== undefined) lives = vies; score = 120; endGame(gagne); }, { gagne, vies });
}

test('le parcours : huit épreuves, trois vies, la première à lancer', async ({ page }) => {
    await expect(page.locator('#expedition-track .expedition-stage')).toHaveCount(8);
    await expect(page.locator('#expedition-track .is-current')).toHaveCount(1);
    await expect(page.locator('#expedition-lives .pip:not(.spent)')).toHaveCount(3);
    await expect(page.locator('#expedition-go')).toBeVisible();
    const paliers = await page.evaluate(() => expedition.stages.map(s => s.tier));
    expect(paliers).toEqual([0, 0, 1, 1, 1, 2, 2, 2]);
});

test('lancer une épreuve ouvre un vrai mode, court, avec les vies du parcours', async ({ page }) => {
    await page.locator('#expedition-go').click();
    expect(await visibleScreen(page)).not.toBe('screen-expedition');
    const etat = await page.evaluate(() => ({ mode: expedition.stages[0].mode, lives, running: expedition.running, ecran: currentMode }));
    expect(etat.running).toBe(true);
    expect(etat.lives).toBe(3);
    // Une épreuve est courte : au plus cinq questions pour le Quiz ou l'Avant/Après.
    const n = await page.evaluate(() => (typeof quizQuestions !== 'undefined' && currentMode === 'quiz') ? quizQuestions.length : (currentMode === 'avantapres' ? avapQuestions.length : -1));
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(5);
});

test('une épreuve réussie rend la main au parcours, en gardant les vies perdues et les points', async ({ page }) => {
    await page.locator('#expedition-go').click();
    await finirEpreuve(page, { gagne: true, vies: 2 });
    expect(await visibleScreen(page)).toBe('screen-expedition');
    const etat = await page.evaluate(() => ({ index: expedition.index, lives: expedition.lives, total: expedition.total }));
    expect(etat).toEqual({ index: 1, lives: 2, total: 120 });
    await expect(page.locator('#expedition-lives .pip:not(.spent)')).toHaveCount(2);
    await expect(page.locator('#expedition-score')).toHaveText('120');
    // L'épreuve suivante démarre avec ces deux vies, pas avec trois.
    await page.locator('#expedition-go').click();
    expect(await page.evaluate(() => lives)).toBe(2);
});

test('perdre la dernière vie interrompt l\'expédition', async ({ page }) => {
    await page.locator('#expedition-go').click();
    await finirEpreuve(page, { gagne: false, vies: 0 });
    expect(await visibleScreen(page)).toBe('screen-expedition');
    await expect(page.locator('#expedition-final')).toBeVisible();
    await expect(page.locator('#expedition-final-title')).toHaveText('Expédition interrompue');
    await expect(page.locator('#expedition-next')).toBeHidden();
});

test('les jokers : « passer l\'épreuve » après la 3e, « regagner une vie » après la 6e', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
        await page.locator('#expedition-go').click();
        await finirEpreuve(page, { gagne: true, vies: i === 2 ? 2 : 3 });
    }
    // Trois épreuves faites, une vie perdue : un joker « passer » est gagné.
    await expect(page.locator('.expedition-earned')).toContainText('passer');
    const passer = page.locator('.expedition-joker[data-joker="skip"]');
    await expect(passer).toBeEnabled();
    await passer.click();
    expect(await page.evaluate(() => expedition.index)).toBe(4);
    expect(await page.evaluate(() => expedition.stages[3].result.skipped)).toBe(true);
    await expect(page.locator('.expedition-joker[data-joker="skip"]')).toHaveCount(0);

    // Épreuves 5 et 6, puis le joker « vie » : il rend une vie (jamais au-delà de trois).
    for (let i = 0; i < 2; i++) {
        await page.locator('#expedition-go').click();
        await finirEpreuve(page, { gagne: true, vies: 2 });
    }
    const vie = page.locator('.expedition-joker[data-joker="life"]');
    await expect(vie).toBeEnabled();
    await vie.click();
    expect(await page.evaluate(() => expedition.lives)).toBe(3);
    await expect(page.locator('#expedition-lives .pip:not(.spent)')).toHaveCount(3);
});

test('huit épreuves menées au bout : expédition réussie, XP versée une fois, partage', async ({ page }) => {
    const xpAvant = await page.evaluate(() => gamificationLoad().xp || 0);
    for (let i = 0; i < 8; i++) {
        if (await page.locator('#expedition-final').isVisible()) break;
        await page.locator('#expedition-go').click();
        await finirEpreuve(page, { gagne: true, vies: 3 });
    }
    await expect(page.locator('#expedition-final-title')).toHaveText('Expédition réussie !');
    const xpApres = await page.evaluate(() => gamificationLoad().xp || 0);
    expect(xpApres).toBeGreaterThan(xpAvant);
    const partage = await page.evaluate(() => expeditionShareText());
    expect(partage).toContain('Expédition');
    expect(partage).toMatch(/[🟩⏭🟥⬜]{8}/u);
    await expect(page.locator('#expedition-share')).toBeVisible();
});

test('quitter en pleine épreuve abandonne le parcours et ramène aux modes', async ({ page }) => {
    await page.locator('#expedition-go').click();
    await page.locator('.quit-btn:visible').click();
    await expect(page.locator('#modal-confirm')).toBeVisible();
    await page.locator('#confirm-ok-btn').click();
    expect(await visibleScreen(page)).toBe('screen-modes');
    expect(await page.evaluate(() => expedition)).toBeNull();
});

test('un thème trop court n\'ouvre pas d\'expédition', async ({ page }) => {
    await page.evaluate(() => { expeditionAbort(); showScreen('screen-modes'); });
    await page.evaluate(() => { revisionMode = true; revisionEvents = getCurrentTheme().events.slice(0, 5); });
    await page.evaluate(() => startExpedition());
    await expect(page.locator('#modal-confirm')).toBeVisible();
    await expect(page.locator('#confirm-message')).toContainText('12');
    expect(await page.evaluate(() => expedition)).toBeNull();
});

test('chacune des neuf épreuves possibles démarre sur un thème ordinaire, avec les vies du parcours et un plafond', async ({ page }) => {
    const modes = await page.evaluate(() => Object.keys(EXPEDITION_STARTERS));
    expect(modes).toHaveLength(9);
    for (const mode of modes) {
        const etat = await page.evaluate((mode) => {
            expedition = { stages: [{ mode, tier: 0, result: null }], index: 0, lives: 2, total: 0, jokers: { skip: 0, life: 0 }, earned: null, running: true, finished: null };
            let alerte = false;
            const reel = window.alert; window.alert = () => { alerte = true; };
            EXPEDITION_STARTERS[mode]();
            window.alert = reel;
            const tailles = {
                quiz: () => quizQuestions.length, avantapres: () => avapQuestions.length, periodes: () => periodesQuestions.length,
                intrus: () => intrusQuestions.length, curseur: () => curseurRounds.length, ordre: () => ordreRounds.length,
                ecart: () => ecartQuestions.length, fil: () => filEvents.length, classic: () => totalEvents
            };
            const out = { alerte, lives, taille: tailles[mode](), cap: EXPEDITION_CAPS[mode] };
            expedition = null;
            return out;
        }, mode);
        expect(etat.alerte, mode).toBe(false);
        expect(etat.lives, mode).toBe(2);
        expect(etat.taille, mode).toBeGreaterThan(0);
        expect(etat.taille, mode).toBeLessThanOrEqual(etat.cap);
        await page.evaluate(() => { stopTimer(); showScreen('screen-modes'); });
    }
});
