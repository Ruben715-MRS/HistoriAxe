// L'équipe de classe (js/app/team.js) avec un faux /api/team : la logique serveur (coffre, plafonds, réclamation
// unique, exclusion, cumul des comptes) a ses propres tests sur Postgres en mémoire (tests/team.test.js) ; ici,
// on vérifie que l'interface suit le protocole — rejoindre, voir le coffre, verser, réclamer, gérer.

const { test, expect, openThemeModes } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        markRecapShownThisWeek();
        localStorage.removeItem('historiaxe_team_v1');
        localStorage.setItem('historiaxe_rewards_v1', JSON.stringify({ coins: 100 }));
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels: {}, skipped: ['monde0'] }));
        rewardsRevealCards = () => {};
        showScreen('screen-categories');
        initCategories();
    });
});

async function fauxServeur(page, etat) {
    const appels = [];
    await page.route(/\/api\/team/, async route => {
        const req = route.request();
        if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(etat.courant) });
        const corps = JSON.parse(req.postData());
        appels.push(corps);
        const reponse = etat.reponses[corps.action] || { status: 200, body: {} };
        // `apres` : l'état du serveur une fois cette action jouée (un coffre réclamé n'est plus à réclamer).
        if (reponse.apres) { etat.courant = reponse.apres; delete reponse.apres; reponse.body = JSON.parse(JSON.stringify(reponse.body)); etat.reponses[corps.action] = { body: { chests: [] } }; }
        return route.fulfill({ status: reponse.status || 200, contentType: 'application/json', body: JSON.stringify(reponse.body || {}) });
    });
    return appels;
}

const etatEquipe = (extra = {}) => ({
    code: 'ABC234', name: '2de B', isTeacher: false, isMember: true, memberCount: 2, progress: 24, target: 60,
    chestIndex: 0, cards: 0, untilCard: 3,
    members: [{ name: 'Léa', points: 14, me: true }, { name: 'Hugo', points: 10, me: false }],
    me: { points: 14, account: false, teamPoints: 0, dailyLeft: 16, unclaimed: [] },
    ...extra
});

const pieces = page => page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_rewards_v1')).coins);

async function ouvrirEquipe(page) {
    await page.evaluate(() => { showScreen('screen-path'); renderPath(); });
    await page.locator('#path-rewards .rewards-team-btn').click();
    await expect(page.locator('#screen-team')).toBeVisible();
}

test('un élève rejoint avec le code et son prénom, puis voit le coffre et sa classe', async ({ page }) => {
    const etat = { courant: etatEquipe(), reponses: { join: { body: { code: 'ABC234' } } } };
    const appels = await fauxServeur(page, etat);
    await ouvrirEquipe(page);

    await expect(page.locator('#team-join-form')).toBeVisible();
    await page.locator('#team-code-input').fill('abc-234');
    await page.locator('#team-join-form .class-primary').click();
    await expect(page.locator('#team-name-input')).toBeVisible();
    // Le prénom est obligatoire.
    await expect(page.locator('#team-error')).toContainText('prénom');

    await page.locator('#team-name-input').fill('Léa');
    await page.locator('#team-join-form .class-primary').click();
    await expect(page.locator('#team-panel-view')).toBeVisible();
    const jointure = appels.find(a => a.action === 'join');
    expect(jointure).toMatchObject({ code: 'ABC234', name: 'Léa' });

    await expect(page.locator('#team-title')).toHaveText('2de B');
    await expect(page.locator('#team-chest-text')).toContainText('24 / 60');
    await expect(page.locator('#team-chest-track')).toHaveAttribute('aria-valuenow', '24');
    await expect(page.locator('#team-members .team-member')).toHaveCount(2);
    await expect(page.locator('#team-members .team-member.is-me')).toContainText('Léa');
    // Sans compte : l'invitation à se connecter, pas de bouton d'exclusion.
    await expect(page.locator('#team-me')).toContainText('Connecte-toi');
    await expect(page.locator('.team-kick')).toHaveCount(0);
    // Le code n'est pas montré aux élèves.
    await expect(page.locator('#team-teacher-tools')).toBeHidden();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_team_v1')).code)).toBe('ABC234');
});

test('un coffre ouvert se réclame une fois : pièces versées, état rafraîchi', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('historiaxe_team_v1', JSON.stringify({ code: 'ABC234', role: 'member', name: '' })));
    const etat = {
        courant: etatEquipe({ chestIndex: 1, progress: 4, me: { points: 14, account: false, teamPoints: 0, dailyLeft: 16, unclaimed: [{ index: 1, coins: 40, card: false }] } }),
        reponses: { claim: { body: { chests: [{ index: 1, coins: 40, card: false }] }, apres: etatEquipe({ chestIndex: 1, progress: 4 }) } }
    };
    const appels = await fauxServeur(page, etat);
    await ouvrirEquipe(page);

    await expect(page.locator('#team-claimed')).toContainText('+40 pièces');
    expect(await pieces(page)).toBe(140);
    expect(appels.filter(a => a.action === 'claim')).toHaveLength(1);
});

test('un coffre à carte rare ajoute une carte à la collection', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('historiaxe_team_v1', JSON.stringify({ code: 'ABC234', role: 'member', name: '' })));
    const etat = {
        courant: etatEquipe({ chestIndex: 3, me: { points: 14, account: false, teamPoints: 0, dailyLeft: 16, unclaimed: [{ index: 3, coins: 60, card: true }] } }),
        reponses: { claim: { body: { chests: [{ index: 3, coins: 60, card: true }] }, apres: etatEquipe({ chestIndex: 3 }) } }
    };
    await fauxServeur(page, etat);
    // Un joueur arrivé à Orient, dont l'album existe.
    await page.evaluate(() => {
        const levels = {};
        PathCore.levelsOf(PathCore.findWorld('prehistoire')).forEach(l => { levels[l.id] = { stars: 1, best: 1, plays: 1 }; });
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels, skipped: ['monde0'] }));
    });
    await ouvrirEquipe(page);
    await expect(page.locator('#team-claimed')).toContainText('+60 pièces');
    const cartes = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('historiaxe_rewards_v1')).cards || {}).length);
    expect(cartes).toBe(1);
});

test('les étoiles gagnées sur le Chemin sont versées au coffre ; un compte touche une pièce par point', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('historiaxe_team_v1', JSON.stringify({ code: 'ABC234', role: 'member', name: '' })));
    const etat = { courant: etatEquipe(), reponses: { contribute: { body: { accepted: 3, account: true, progress: 27, chestIndex: 0, opened: 0 } } } };
    const appels = await fauxServeur(page, etat);

    await page.evaluate(() => teamOnStars(3));
    await expect.poll(() => appels.filter(a => a.action === 'contribute').length).toBe(1);
    expect(appels.find(a => a.action === 'contribute')).toMatchObject({ code: 'ABC234', stars: 3 });
    await expect.poll(() => pieces(page)).toBe(103);

    // Rejouer un niveau sans gagner d'étoile ne verse rien.
    await page.evaluate(() => teamOnStars(0));
    expect(appels.filter(a => a.action === 'contribute')).toHaveLength(1);
});

test('hors ligne, les étoiles sont gardées pour le prochain envoi', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('historiaxe_team_v1', JSON.stringify({ code: 'ABC234', role: 'member', name: '' })));
    const etat = { courant: etatEquipe(), reponses: {} };
    const appels = await fauxServeur(page, etat);
    // Pas de réseau : l'appel échoue sans réponse du serveur.
    await page.evaluate(() => {
        window.__vraiAppel = HistoriAxeAPI.team;
        HistoriAxeAPI.team = () => Promise.resolve({ ok: false, offline: true, error: 'hors ligne' });
        teamOnStars(2);
    });
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_team_v1')).pending)).toBe(2);

    await page.evaluate(() => { HistoriAxeAPI.team = window.__vraiAppel; });
    etat.reponses.contribute = { body: { accepted: 5, account: false, progress: 29, chestIndex: 0, opened: 0 } };
    await page.evaluate(() => teamOnStars(3));
    await expect.poll(() => appels.filter(a => a.action === 'contribute').length).toBe(1);
    expect(appels.find(a => a.action === 'contribute').stars).toBe(5);
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('historiaxe_team_v1')).pending)).toBe(0);
});

test('l\'enseignant crée l\'équipe, voit le code, retire un élève et peut lier une séance de classe', async ({ page }) => {
    const etat = {
        courant: etatEquipe({ isTeacher: true, isMember: false, me: null, members: [{ name: 'Léa', points: 14, me: false, ref: '11111111-1111-4111-8111-111111111111' }] }),
        reponses: { create: { body: { code: 'ABC234' } }, kick: { body: { ok: true } } }
    };
    const appels = await fauxServeur(page, etat);
    await ouvrirEquipe(page);

    await page.locator('#team-new-name').fill('2de B');
    await page.locator('#team-create-form .class-primary').click();
    expect(appels.find(a => a.action === 'create')).toMatchObject({ name: '2de B' });
    await expect(page.locator('#team-panel-view')).toBeVisible();
    await expect(page.locator('#team-code')).toHaveAttribute('aria-label', 'A B C 2 3 4');
    await expect(page.locator('#team-me')).toBeHidden();

    await page.locator('.team-kick').click();
    await page.locator('#confirm-ok-btn').click();
    await expect.poll(() => appels.find(a => a.action === 'kick')).toMatchObject({ code: 'ABC234', ref: '11111111-1111-4111-8111-111111111111' });

    // Le Mode Classe propose de compter pour l'équipe, case cochée par défaut, et transmet le code.
    await openThemeModes(page, 'thm_be');
    await page.locator('#mode-card-class').click();
    await expect(page.locator('#class-team-link')).toBeVisible();
    await expect(page.locator('#class-team-link-label')).toContainText('2de B');
    await expect(page.locator('#class-team-link-input')).toBeChecked();
    const seances = [];
    await page.route(/\/api\/classroom/, async route => {
        const req = route.request();
        if (req.method() === 'POST') seances.push(JSON.parse(req.postData()));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(req.method() === 'POST' ? { code: 'XYZ789' } : { code: 'XYZ789', status: 'lobby', total: 9, isTeacher: true, players: [] }) });
    });
    await page.locator('#class-create-btn').click();
    await expect.poll(() => seances.length).toBe(1);
    expect(seances[0]).toMatchObject({ action: 'create', teamCode: 'ABC234' });
});

test('une équipe supprimée ou un élève retiré sont oubliés avec un message', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('historiaxe_team_v1', JSON.stringify({ code: 'ABC234', role: 'member', name: '' })));
    const etat = { courant: etatEquipe({ isMember: false, me: null }), reponses: {} };
    await fauxServeur(page, etat);
    await ouvrirEquipe(page);
    await expect(page.locator('#team-error')).toContainText('ne faites plus partie');
    await expect(page.locator('#team-join-form')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('historiaxe_team_v1'))).toBeNull();
});

test('l\'enseignant dessine l\'écusson à la création, puis le modifie ; les bordures se débloquent avec les coffres', async ({ page }) => {
    const etat = { courant: etatEquipe({ isTeacher: true, isMember: false, badge: '7.9.1.0', chestIndex: 2, me: null }), reponses: { create: { body: { code: 'ABC234' } }, badge: { body: { badge: '2.9.1.2' } } } };
    const appels = await fauxServeur(page, etat);
    await ouvrirEquipe(page);

    // Création : fond n° 8, motif n° 10 ; une bordure verrouillée est refusée (message, rien n'est choisi).
    await page.locator('#team-create-badge .tb-opt[data-row="bg"][data-index="7"]').click();
    await page.locator('#team-create-badge .tb-opt[data-row="pattern"][data-index="9"]').click();
    await page.locator('#team-create-badge .tb-opt[data-row="border"][data-index="3"]').click({ force: true });
    await expect(page.locator('#app-toast')).toContainText('coffres');
    await expect(page.locator('#team-create-badge .tb-opt[data-row="border"][data-index="0"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#team-new-name').fill('2de B');
    await page.locator('#team-create-form .class-primary').click();
    await expect(page.locator('#team-panel-view')).toBeVisible();
    expect(appels.find(a => a.action === 'create').badge).toBe('7.9.1.0');

    // L'écusson s'affiche, avec le niveau de l'équipe (1 + coffres ouverts).
    await expect(page.locator('#team-badge-view svg')).toBeVisible();
    await expect(page.locator('#team-badge-view text')).toHaveText('3');

    // Modification : deux coffres ouverts, donc trois bordures disponibles.
    await page.locator('#team-badge-edit-btn').click();
    await expect(page.locator('#team-edit-badge .tb-opt.is-locked')).toHaveCount(5);
    await page.locator('#team-edit-badge .tb-opt[data-row="bg"][data-index="2"]').click();
    await page.locator('#team-edit-badge .tb-opt[data-row="border"][data-index="2"]').click();
    await page.locator('#team-badge-edit .class-primary').click();
    await expect(page.locator('#team-badge-edit')).toBeHidden();
    expect(appels.find(a => a.action === 'badge').badge).toBe('2.9.1.2');
});

test('un élève voit l\'écusson de l\'équipe mais ne peut pas le modifier', async ({ page }) => {
    const etat = { courant: etatEquipe({ badge: '3.5.2.1' }), reponses: {} };
    await fauxServeur(page, etat);
    await page.evaluate(() => localStorage.setItem('historiaxe_team_v1', JSON.stringify({ code: 'ABC234', role: 'member', name: '', pending: 0 })));
    await ouvrirEquipe(page);
    await expect(page.locator('#team-badge-view svg')).toBeVisible();
    await expect(page.locator('#team-badge-edit-btn')).toBeHidden();
});
