// Disposition de la frise en paysage : « Ligne », « Lignes multiples » et
// « Serpentin » (réglage landscapeFlow), et la case « Une ligne par axe ».
//
// Ce qui se vérifie ici n'est pas la beauté du rendu (les captures s'en
// chargent) mais les règles : ces dispositions n'existent que sur les grands
// écrans, le serpentin que dans la Découverte, et les voies par axe que dans la
// Découverte aussi. Le thème est celui des autres tests de modes : 50 repères
// et 5 axes.

const { test, expect, openThemeModes } = require('./fixtures');

const THEME = 'thm_be';

async function reglages(page, valeurs) {
    await page.evaluate(v => {
        Object.assign(appSettings, { orientation: 'auto' }, v);
        settingsSave(appSettings);
        applyOrientationLayout();
    }, valeurs);
}

async function flow(page) {
    return page.evaluate(() => document.documentElement.getAttribute('data-landscape-flow'));
}

async function lignesDeRepères(page) {
    return page.evaluate(() => new Set([...document.querySelectorAll('#timeline .entry')].map(e => e.offsetTop)).size);
}

test.describe('tablette en paysage', () => {
    test.use({ viewport: { width: 1180, height: 820 }, isMobile: false, hasTouch: false });

    test.beforeEach(async ({ page }) => {
        await openThemeModes(page, THEME);
    });

    test('lignes multiples par défaut : la frise revient à la ligne', async ({ page }) => {
        await page.locator('#mode-card-discovery').click();
        await expect(page.locator('#timeline .entry')).toHaveCount(50);

        expect(await flow(page)).toBe('wrap');
        expect(await lignesDeRepères(page)).toBeGreaterThan(2);
        // Plus de défilement horizontal : tout tient dans la largeur.
        const déborde = await page.evaluate(() => { const b = document.getElementById('board'); return b.scrollWidth > b.clientWidth + 1; });
        expect(déborde).toBe(false);
        // Chaque retour à la ligne est marqué (flèche de fin de ligne).
        expect(await page.locator('#timeline .row-end').count()).toBeGreaterThan(1);
    });

    test('en partie, survoler un intervalle ne fait pas bouger la frise : aucun repère ni intervalle ne change de place', async ({ page }) => {
        await page.locator('#mode-card-training').click();
        await expect(page.locator('#screen-game')).toBeVisible();
        expect(await flow(page)).toBe('wrap');
        // Quelques cartes posées (au bon intervalle) : la frise passe à plusieurs lignes.
        for (let k = 0; k < 6; k++) {
            const avantN = await page.evaluate(() => placedEvents.length);
            const idx = await page.evaluate(() => { let i = 0; while (i < placedEvents.length && placedEvents[i].date <= eventToPlace.date) i++; return i; });
            await page.locator('#timeline button.slot').nth(idx).click();
            await page.waitForFunction(n => placedEvents.length > n, avantN);
            await page.waitForTimeout(700);
        }
        expect(await lignesDeRepères(page)).toBeGreaterThan(1);
        const positions = () => page.evaluate(() => [...document.querySelectorAll('#timeline .entry, #timeline .slot')].map(e => [e.offsetLeft, e.offsetTop, e.offsetWidth]));
        const avant = await positions();
        // Des intervalles au milieu de la frise : le survol de chacun ne doit rien déplacer.
        for (const i of [1, 3, 4]) {
            await page.locator('#timeline button.slot').nth(i).hover();
            await page.waitForTimeout(300);
            expect(await positions()).toEqual(avant);
        }
    });

    test('« Ligne » garde la frise sur une seule ligne', async ({ page }) => {
        await reglages(page, { landscapeFlow: 'line' });
        await page.locator('#mode-card-discovery').click();
        await expect(page.locator('#timeline .entry')).toHaveCount(50);

        expect(await flow(page)).toBe('line');
        expect(await lignesDeRepères(page)).toBe(1);
    });

    test('le serpentin n\'existe qu\'en Découverte : une partie repasse en lignes multiples', async ({ page }) => {
        await reglages(page, { landscapeFlow: 'snake' });
        await page.locator('#mode-card-discovery').click();
        await expect(page.locator('#timeline .entry')).toHaveCount(50);

        expect(await flow(page)).toBe('snake');
        // Une ligne sur deux est inversée, avec un demi-tour entre les lignes.
        expect(await page.locator('#timeline .entry.row-rtl').count()).toBeGreaterThan(0);
        expect(await page.locator('#timeline .snake-turn').count()).toBeGreaterThan(0);
        // Deux repères consécutifs sont voisins : même colonne en bout de ligne.
        const voisins = await page.evaluate(() => {
            const e = [...document.querySelectorAll('#timeline .entry')];
            const bout = e.find(x => x.classList.contains('snake-end'));
            const suivant = e[e.indexOf(bout) + 1];
            return Math.abs(bout.getBoundingClientRect().left - suivant.getBoundingClientRect().left) < 2;
        });
        expect(voisins).toBe(true);

        await page.evaluate(() => showScreen('screen-modes'));
        await page.locator('#mode-card-classic').click();
        await expect(page.locator('#screen-game')).toBeVisible();
        expect(await flow(page)).toBe('wrap');
        await expect(page.locator('#timeline .snake-turn')).toHaveCount(0);
        expect(await page.locator('#timeline button.slot').count()).toBeGreaterThan(0);
    });

    test('une ligne par axe : une voie par axe en Découverte, pas en partie', async ({ page }) => {
        await reglages(page, { landscapeFlow: 'wrap', landscapeByAxis: true });
        await page.locator('#mode-card-discovery').click();
        await expect(page.locator('#timeline .entry')).toHaveCount(50);

        const voies = await page.evaluate(() => [...document.querySelectorAll('#timeline .axis-lane')].map(l => ({
            titre: l.getAttribute('aria-label'),
            axes: [...new Set([...l.querySelectorAll('.entry')].map(e => e.dataset.axis))]
        })));
        expect(voies).toHaveLength(5);
        // Une voie = un seul axe, donc une seule couleur.
        voies.forEach(v => expect(v.axes, v.titre).toHaveLength(1));
        // Aucun événement perdu ni dupliqué.
        await expect(page.locator('#timeline .axis-lane .entry')).toHaveCount(50);

        await page.evaluate(() => showScreen('screen-modes'));
        await page.locator('#mode-card-classic').click();
        await expect(page.locator('#screen-game')).toBeVisible();
        await expect(page.locator('#timeline .axis-lane')).toHaveCount(0);
        expect(await page.locator('#timeline button.slot').count()).toBeGreaterThan(0);
    });

    test('une partie reste jouable en lignes multiples : un clic sur un intervalle place la carte', async ({ page }) => {
        await page.locator('#mode-card-training').click();
        await expect(page.locator('#screen-game')).toBeVisible();
        const avant = await page.evaluate(() => placedEvents.length);
        const idx = await page.evaluate(() => { let i = 0; while (i < placedEvents.length && placedEvents[i].date <= eventToPlace.date) i++; return i; });
        await page.locator('#timeline button.slot').nth(idx).click();
        await page.waitForFunction(n => placedEvents.length > n, avant);
        expect(await flow(page)).toBe('wrap');
    });

    test('les réglages : trois dispositions, la case par axe n\'apparaît qu\'avec « Lignes multiples »', async ({ page }) => {
        await page.evaluate(() => openSettings());
        await expect(page.locator('#settings-group-landscape')).toBeVisible();
        await expect(page.locator('#settings-landscape-flow button')).toHaveCount(3);
        await expect(page.locator('#settings-landscape-axis-row')).toBeVisible();

        await page.locator('#settings-landscape-flow [data-value="snake"]').click();
        await expect(page.locator('#settings-landscape-axis-row')).toBeHidden();
        expect(await page.evaluate(() => appSettings.landscapeFlow)).toBe('snake');

        await page.locator('#settings-landscape-flow [data-value="wrap"]').click();
        await page.locator('#settings-landscape-by-axis').check();
        expect(await page.evaluate(() => appSettings.landscapeByAxis)).toBe(true);
    });
});

test.describe('téléphone en paysage', () => {
    test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });

    test.beforeEach(async ({ page }) => {
        await openThemeModes(page, THEME);
    });

    test('la frise reste sur une ligne, quel que soit le réglage, et le réglage est masqué', async ({ page }) => {
        for (const v of [{ landscapeFlow: 'wrap' }, { landscapeFlow: 'snake', landscapeByAxis: true }]) {
            await reglages(page, v);
            await page.locator('#mode-card-discovery').click();
            await expect(page.locator('#timeline .entry')).toHaveCount(50);
            expect(await flow(page)).toBe('line');
            expect(await lignesDeRepères(page)).toBe(1);
            await expect(page.locator('#timeline .axis-lane')).toHaveCount(0);
            await expect(page.locator('#timeline .snake-turn')).toHaveCount(0);
            await page.evaluate(() => showScreen('screen-modes'));
        }
        await page.evaluate(() => openSettings());
        await expect(page.locator('#settings-group-landscape')).toBeHidden();
    });
});
