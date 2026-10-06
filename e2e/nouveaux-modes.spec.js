// Les quatre modes fabriqués à partir des seules dates du thème : Remise en
// ordre, Blitz, Curseur et Intrus.
//
// La fabrication des questions est déjà couverte sans navigateur
// (tests/gameModes.test.js, 20 tests). Ce parcours vérifie ce qu'un module
// pur ne peut pas dire : que chaque mode se lance depuis sa carte, qu'une
// première interaction le fait avancer, et que ce qui doit rester caché le
// reste — les dates en Remise en ordre et en Intrus, puisque les montrer
// donnerait la réponse.

const { test, expect, openThemeModes } = require('./fixtures');

// 72 événements, 5 axes : de quoi nourrir les quatre modes, y compris les
// deux familles de questions de l'Intrus.
const THEME = 'thm_aut';

// --- REMISE EN ORDRE -----------------------------------------------------

test('Remise en ordre sert cinq cartes sans leurs dates', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-ordre').click();
    await expect(page.locator('#screen-ordre')).toBeVisible();

    const cartes = page.locator('#ordre-cards .ordre-card');
    await expect(cartes).toHaveCount(5);

    // Les dates sont la réponse : aucune ne doit figurer sur les cartes.
    const fuite = await page.evaluate(() => {
        const round = ordreRounds[ordreIndex];
        const texte = document.getElementById('ordre-cards').innerText;
        return round.cards.filter(c => texte.includes(String(c.date))).map(c => c.titre);
    });
    expect(fuite, 'une date affichée donnerait la réponse').toEqual([]);
});

test('toucher les cartes les range, et retoucher les sort du classement', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-ordre').click();
    await expect(page.locator('#screen-ordre')).toBeVisible();

    const cartes = page.locator('#ordre-cards .ordre-card');
    await cartes.nth(0).click();
    await cartes.nth(1).click();
    await expect(page.locator('#ordre-cards .ordre-card.placed')).toHaveCount(2);
    await expect(cartes.nth(0).locator('.ordre-rank')).toHaveText('1');
    await expect(cartes.nth(1).locator('.ordre-rank')).toHaveText('2');

    // Retirer la première décale la seconde : c'est le seul moyen de
    // corriger un rang sans tout reprendre.
    await cartes.nth(0).click();
    await expect(page.locator('#ordre-cards .ordre-card.placed')).toHaveCount(1);
    await expect(cartes.nth(1).locator('.ordre-rank')).toHaveText('1');
});

test('classer les cinq cartes conclut la manche et montre le bon ordre', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-ordre').click();
    await expect(page.locator('#screen-ordre')).toBeVisible();

    // On joue la bonne réponse, lue dans la solution de la manche.
    const ordreJuste = await page.evaluate(() => ordreRounds[ordreIndex].solution);
    for (const id of ordreJuste) {
        await page.locator(`#ordre-cards .ordre-card[data-event-id="${id}"]`).click();
    }

    const reveal = page.locator('#ordre-reveal');
    await expect(reveal).toBeVisible();
    // Le révélé, lui, montre les dates : c'est là qu'on apprend.
    await expect(reveal.locator('.simul-reveal-row')).toHaveCount(5);
    expect(await page.evaluate(() => score)).toBeGreaterThan(0);
    // Classement parfait : aucune vie perdue.
    expect(await page.evaluate(() => lives)).toBe(3);
});

// --- BLITZ ---------------------------------------------------------------

test('Blitz démarre son compte à rebours et enchaîne sans vies', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-blitz').click();
    await expect(page.locator('#screen-blitz')).toBeVisible();

    await expect(page.locator('#blitz-left')).not.toBeEmpty();
    await expect(page.locator('#blitz-right')).not.toBeEmpty();
    // Pas de cœurs : l'horloge est la seule contrainte.
    await expect(page.locator('#blitz-hud-lives')).toHaveCount(0);

    const depart = Number(await page.locator('#blitz-clock').innerText());
    expect(depart).toBeGreaterThan(55);
    expect(depart).toBeLessThanOrEqual(60);

    const premiere = await page.locator('#blitz-left').innerText();
    await page.locator('#blitz-true').click();
    // L'enchaînement est volontairement très court (320 ms).
    await expect(page.locator('#blitz-left')).not.toHaveText(premiere, { timeout: 4000 });
    await expect(page.locator('#blitz-tally')).toContainText('1');
});

test('une mauvaise réponse au Blitz coûte du temps, jamais une vie', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-blitz').click();
    await expect(page.locator('#screen-blitz')).toBeVisible();

    const avant = await page.evaluate(() => blitzDeadline);
    const mauvaise = await page.evaluate(() => !blitzCurrent.answer);
    await page.locator(mauvaise ? '#blitz-true' : '#blitz-false').click();
    const apres = await page.evaluate(() => blitzDeadline);

    expect(avant - apres).toBeGreaterThanOrEqual(3000);
    expect(await page.evaluate(() => lives)).toBe(Infinity);
});

test('l’horloge du Blitz s’arrête quand on quitte l’écran', async ({ page }) => {
    // Sans ce garde-fou, elle continuerait de tourner et terminerait une
    // partie qui n'est plus à l'écran.
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-blitz').click();
    await expect(page.locator('#screen-blitz')).toBeVisible();
    expect(await page.evaluate(() => blitzInterval !== null)).toBe(true);

    await page.evaluate(() => { currentMode = 'classic'; tickBlitzClock(); });
    expect(await page.evaluate(() => blitzInterval)).toBeNull();
});

// --- LE CURSEUR ----------------------------------------------------------

test('Le curseur borne son échelle sur le thème et annonce sa tolérance', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-curseur').click();
    await expect(page.locator('#screen-curseur')).toBeVisible();

    const bornes = await page.evaluate(() => {
        const r = document.getElementById('curseur-range');
        return { min: Number(r.min), max: Number(r.max), value: Number(r.value) };
    });
    // L'échelle vient du thème (1918-1939), jamais de la base entière.
    expect(bornes.min).toBeGreaterThan(1800);
    expect(bornes.max).toBeLessThan(2000);
    // Le curseur repart du milieu : le laisser en place donnerait un indice.
    expect(bornes.value).toBe(Math.round((bornes.min + bornes.max) / 2));
    await expect(page.locator('#curseur-kicker')).toContainText('±');
});

test('viser juste au curseur marque des points et garde la vie', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-curseur').click();
    await expect(page.locator('#screen-curseur')).toBeVisible();

    // On place le curseur sur la bonne année.
    await page.evaluate(() => {
        const r = document.getElementById('curseur-range');
        r.value = String(curseurRounds[curseurIndex].event.date);
        r.dispatchEvent(new Event('input'));
    });
    await page.locator('#curseur-validate').click();

    const verdict = page.locator('#curseur-verdict');
    await expect(verdict).toBeVisible();
    await expect(verdict).toHaveClass(/is-good/);
    expect(await page.evaluate(() => lives)).toBe(3);
    expect(await page.evaluate(() => score)).toBeGreaterThan(0);
});

test('se tromper largement au curseur coûte une vie', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-curseur').click();
    await expect(page.locator('#screen-curseur')).toBeVisible();

    await page.evaluate(() => {
        const round = curseurRounds[curseurIndex];
        const r = document.getElementById('curseur-range');
        // À l'autre bout de l'échelle, aussi loin que le curseur le permet.
        const loin = round.event.date - round.min > round.max - round.event.date ? round.min : round.max;
        r.value = String(loin);
        r.dispatchEvent(new Event('input'));
    });
    await page.locator('#curseur-validate').click();

    await expect(page.locator('#curseur-verdict')).toHaveClass(/is-bad/);
    expect(await page.evaluate(() => lives)).toBe(2);
});

// --- L'INTRUS ------------------------------------------------------------

test('L’intrus propose quatre événements sans leurs dates', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-intrus').click();
    await expect(page.locator('#screen-intrus')).toBeVisible();

    await expect(page.locator('#intrus-options .intrus-option')).toHaveCount(4);
    // Aucune date : c'est le sens de l'époque qu'on teste, pas la mémoire
    // des années.
    const fuite = await page.evaluate(() => {
        const q = intrusQuestions[intrusIndex];
        const texte = document.getElementById('intrus-options').innerText;
        return q.options.filter(o => texte.includes(String(o.date))).map(o => o.titre);
    });
    expect(fuite, 'une date affichée donnerait la réponse').toEqual([]);
    await expect(page.locator('#intrus-kicker')).not.toBeEmpty();
});

test('désigner l’intrus le marque et déplie le révélé daté', async ({ page }) => {
    await openThemeModes(page, THEME);
    await page.locator('#mode-card-intrus').click();
    await expect(page.locator('#screen-intrus')).toBeVisible();

    await expect(page.locator('#intrus-reveal')).toBeHidden();
    const intrusId = await page.evaluate(() => intrusQuestions[intrusIndex].intruderId);
    await page.locator(`#intrus-options .intrus-option[data-event-id="${intrusId}"]`).click();

    await expect(page.locator('#intrus-options .intrus-option.correct')).toHaveCount(1);
    const reveal = page.locator('#intrus-reveal');
    await expect(reveal).toBeVisible();
    // Le révélé montre les quatre dates que la question cachait, et désigne
    // l'intrus.
    await expect(reveal.locator('.simul-reveal-row')).toHaveCount(4);
    await expect(reveal.locator('.simul-reveal-row.is-intrus')).toHaveCount(1);
    expect(await page.evaluate(() => lives)).toBe(3);
});
