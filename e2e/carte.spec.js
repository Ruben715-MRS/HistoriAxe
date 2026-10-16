// Le Mode Carte (js/geoMap.js, js/geoPlace.js) : on pose un repère sur une carte sans noms, les
// points dépendent de la distance, puis on date l'événement.
//
// La carte est chargée pour de bon (MapLibre, WebGL) mais son fond est un aplat (voir
// e2e/fixtures.js) : on ne juge pas ici le dessin d'OpenStreetMap, on juge le jeu. Les placements
// passent par submitGeoGuess(lat, lon), l'entrée qui connaît déjà ses coordonnées — le clic sur la
// carte et la mire au clavier, eux, sont couverts par le parcours à la souris et par
// e2e/clavier.spec.js.

const { test, expect, visibleScreen } = require('./fixtures');

async function lancerSurHistoireDeFrance(page) {
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_fr') || (c.subcategories || []).length), null, { timeout: 45_000 });
    await page.evaluate(() => {
        let node = null;
        (function walk(ns) { ns.forEach(x => { (x.themes || []).forEach(t => { if (t.id === 'thm_fr') node = { themes: [t] }; }); if (x.subcategories) walk(x.subcategories); }); })(bdd);
        showScreen('screen-categories');
        startGeoModeFromNode(node, 'Histoire de France');
    });
    await expect(page.locator('#screen-carte')).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction(() => geoMap && geoMapLoaded && geoCurrentRound, null, { timeout: 30_000 });
}

// Un point à ~13 000 km de la réponse : un placement raté, quelle que soit l'échelle.
const LOIN = () => page => page.evaluate(() => {
    const r = geoCurrentRound.item;
    return { lat: -r.lat, lon: ((r.lon + 180 + 180) % 360) - 180 };
});

test('le Mode Carte est proposé sur un niveau qui a des lieux sûrs, et pas sur une zone qui n\'en a pas', async ({ page }) => {
    await page.waitForFunction(() => typeof atlasPoints !== 'undefined' && atlasPoints, null, { timeout: 30_000 });
    const [france, vide] = await page.evaluate(() => {
        let theme = null;
        (function walk(ns) { ns.forEach(x => { (x.themes || []).forEach(t => { if (t.id === 'thm_fr') theme = t; }); if (x.subcategories) walk(x.subcategories); }); })(bdd);
        return [isGeoEligible({ themes: [theme] }), isGeoEligible({ themes: [{ id: 'inconnu', nom: 'X', events: [{ id: 'a', titre: 'A', date: 1000 }] }] })];
    });
    expect(france).toBe(true);
    expect(vide).toBe(false);
});

test('une partie : douze questions, la carte sans noms, un repère à poser, « Valider » grisé tant qu\'il n\'y en a pas', async ({ page }) => {
    await lancerSurHistoireDeFrance(page);
    expect(await page.evaluate(() => currentMode)).toBe('carte');
    expect(await page.evaluate(() => geoSessionPool.length)).toBe(12);
    await expect(page.locator('#geo-event-title')).not.toHaveText('');
    await expect(page.locator('#geo-validate-btn')).toBeDisabled();
    await expect(page.locator('#geo-hint')).not.toHaveText('');

    // Poser un repère l'active ; le déplacer ne joue rien.
    await page.evaluate(() => { geoSetGuess(48.0, 2.0); geoSetGuess(45.0, 5.0); });
    await expect(page.locator('#geo-validate-btn')).toBeEnabled();
    expect(await page.evaluate(() => [geoGuess.lat, geoGuess.lon, score, lives])).toEqual([45, 5, 0, 3]);
});

test('la carte ne porte aucun nom de lieu : les couches de texte du style sont retirées', async ({ page }) => {
    // Le style réel d'OpenFreeMap est plein de noms ; on lui substitue un style qui en contient un.
    await page.route(/tiles\.openfreemap\.org/, route => route.fulfill({
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: JSON.stringify({
            version: 8, sources: {},
            layers: [
                { id: 'fond', type: 'background', paint: { 'background-color': '#dbe9f5' } },
                { id: 'noms-de-pays', type: 'symbol', source: 'inexistante', layout: { 'text-field': '{name}' } }
            ]
        })
    }));
    await lancerSurHistoireDeFrance(page);
    const types = await page.evaluate(() => geoMap.getStyle().layers.map(l => l.type));
    expect(types).toContain('background');
    expect(types).not.toContain('symbol');
});

test('un repère sur la bonne réponse rapporte les 80 points du placement et fait monter le combo', async ({ page }) => {
    await lancerSurHistoireDeFrance(page);
    await page.evaluate(() => { const r = geoCurrentRound.item; submitGeoGuess(r.lat, r.lon); });
    await expect(page.locator('#geo-reveal-label')).toBeVisible();
    await expect(page.locator('#geo-reveal-label')).toHaveClass(/is-correct/);
    expect(await page.evaluate(() => [score, comboMultiplier, lives])).toEqual([80, 1.1, 3]);
    // Le résultat se lit sur la carte, et « Continuer » mène à la date.
    await expect(page.locator('#geo-continue-btn')).toBeVisible();
    await page.locator('#geo-continue-btn').click();
    await expect(page.locator('#geo-time-options .quiz-option')).toHaveCount(4);
    // La question « où ? » n'est plus affichée au-dessus de « en quelle année ? ».
    await expect(page.locator('#geo-phase-kicker')).toBeHidden();
});

test('un repère très loin fait perdre une vie et retomber le combo ; le troisième raté termine la partie', async ({ page }) => {
    await lancerSurHistoireDeFrance(page);
    for (let manche = 1; manche <= 3; manche++) {
        const loin = await LOIN()(page);
        await page.evaluate(p => submitGeoGuess(p.lat, p.lon), loin);
        await expect(page.locator('#geo-reveal-label')).toHaveClass(/is-wrong/);
        expect(await page.evaluate(() => [lives, comboMultiplier])).toEqual([3 - manche, 1]);
        await page.locator('#geo-continue-btn').click();
        if (manche < 3) {
            await page.locator('#geo-time-options .quiz-option').first().click();
            await expect(page.locator('#geo-map-phase')).toBeVisible({ timeout: 5000 });
        }
    }
    // Plus de vie : la fin de partie, sans passer par la date.
    expect(await visibleScreen(page)).toBe('screen-end');
});

test('un placement moyen ne coûte ni vie ni combo, et rapporte une part des points', async ({ page }) => {
    await lancerSurHistoireDeFrance(page);
    // À 1,3 × l'échelle de la réponse : entre « raté » et « très bon ».
    await page.evaluate(() => {
        const r = geoCurrentRound.item;
        const kmParDegre = 111.2;
        const ecart = (geoScale * 1.3 + GeoPlace.toleranceKm(r.prec)) / kmParDegre;
        submitGeoGuess(r.lat + ecart, r.lon);
    });
    const etat = await page.evaluate(() => ({ lives, combo: comboMultiplier, score, verdict: geoCurrentRound.verdict }));
    expect(etat.verdict).toBe('ok');
    expect(etat.lives).toBe(3);
    expect(etat.combo).toBe(1);
    expect(etat.score).toBeGreaterThan(5);
    expect(etat.score).toBeLessThan(48);
});

test('un fait lié entre plusieurs thèmes n\'est posé qu\'une fois dans une partie', async ({ page }) => {
    await lancerSurHistoireDeFrance(page);
    const doublons = await page.evaluate(() => {
        const vus = new Set(); let n = 0;
        geoSessionPool.forEach(q => { const k = LinkedEvents.factKey(q.event); if (k) { if (vus.has(k)) n++; vus.add(k); } });
        return n;
    });
    expect(doublons).toBe(0);
});

// --- Chrono-Géo : la carte, puis l'année au curseur ---------------------------

async function lancerChronoGeo(page) {
    await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_fr') || (c.subcategories || []).length), null, { timeout: 45_000 });
    await page.evaluate(() => {
        let node = null;
        (function walk(ns) { ns.forEach(x => { (x.themes || []).forEach(t => { if (t.id === 'thm_fr') node = { themes: [t] }; }); if (x.subcategories) walk(x.subcategories); }); })(bdd);
        showScreen('screen-categories');
        startGeoModeFromNode(node, 'Histoire de France', undefined, 'slider');
    });
    await expect(page.locator('#screen-carte')).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction(() => geoMap && geoMapLoaded && geoCurrentRound, null, { timeout: 30_000 });
}

test('Chrono-Géo : après la carte, l\'année s\'estime au curseur (pas de choix multiple)', async ({ page }) => {
    await lancerChronoGeo(page);
    expect(await page.evaluate(() => geoYearVariant)).toBe('slider');
    await page.evaluate(() => { const r = geoCurrentRound.item; submitGeoGuess(r.lat, r.lon); });
    await page.locator('#geo-continue-btn').click();
    await expect(page.locator('#geo-slider-block')).toBeVisible();
    await expect(page.locator('#geo-time-options')).toBeHidden();
    await expect(page.locator('#geo-slider-range')).toBeEnabled();

    // Pile sur l'année : verdict « exact », points du temps en plus de ceux de la carte (80 + 100 × combo).
    await page.evaluate(() => {
        const range = document.getElementById('geo-slider-range');
        range.value = String(geoCurrentRound.correctYear);
        range.dispatchEvent(new Event('input'));
    });
    await page.locator('#geo-slider-validate').click();
    await expect(page.locator('#geo-slider-verdict')).toHaveClass(/is-good/);
    const etat = await page.evaluate(() => ({ score, gap: geoCurrentRound.yearGap, within: geoCurrentRound.timeCorrect }));
    expect(etat.gap).toBe(0);
    expect(etat.within).toBe(true);
    expect(etat.score).toBeGreaterThan(80); // carte parfaite + année exacte
    // La manche suivante repart sur la carte, curseur masqué.
    await expect(page.locator('#geo-map-phase')).toBeVisible({ timeout: 6000 });
});

test('Chrono-Géo : une année très fausse ne rapporte rien du côté du temps, et le partage dit « km / ans »', async ({ page }) => {
    await lancerChronoGeo(page);
    await page.evaluate(() => { const r = geoCurrentRound.item; submitGeoGuess(r.lat, r.lon); });
    await page.locator('#geo-continue-btn').click();
    const avant = await page.evaluate(() => score);
    await page.evaluate(() => {
        const range = document.getElementById('geo-slider-range');
        // Le bout de l'échelle le plus éloigné de la bonne année.
        const y = geoCurrentRound.correctYear;
        range.value = String(Math.abs(geoSliderScale.max - y) > Math.abs(y - geoSliderScale.min) ? geoSliderScale.max : geoSliderScale.min);
        range.dispatchEvent(new Event('input'));
    });
    await page.locator('#geo-slider-validate').click();
    await expect(page.locator('#geo-slider-verdict')).toHaveClass(/is-bad/);
    expect(await page.evaluate(() => score)).toBe(avant); // trois tolérances d'écart ou plus : 0 point
    const partage = await page.evaluate(() => generateShareText(false));
    expect(partage).toContain('Chrono-Géo');
    expect(partage).toMatch(/📍 .+ km · ⏳ \d+ ans en moyenne/);
});

test('Chrono-Géo est proposé à côté du Mode Carte', async ({ page }) => {
    await page.waitForFunction(() => typeof atlasPoints !== 'undefined' && atlasPoints, null, { timeout: 30_000 });
    const cartes = await page.evaluate(() => {
        let theme = null;
        (function walk(ns) { ns.forEach(x => { (x.themes || []).forEach(t => { if (t.id === 'thm_fr') theme = t; }); if (x.subcategories) walk(x.subcategories); }); })(bdd);
        const node = { themes: [theme], nom: 'France' };
        return [buildGeoModeCard(node, 'France').innerText, buildChronoGeoCard(node, 'France').innerText];
    });
    expect(cartes[0]).toContain('Mode Carte');
    expect(cartes[1]).toContain('Chrono-Géo');
});
