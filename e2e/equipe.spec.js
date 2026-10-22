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
    chestIndex: 0, cards: 0, untilCard: 3, maxMembers: 50, totalPoints: 24, description: '', country: '', lang: '',
    leader: { name: 'Mme Durand', level: 6 }, challenge: null,
    members: [{ name: 'Léa', points: 14, level: 3, me: true }, { name: 'Hugo', points: 10, level: 2, me: false }],
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
    // Le chef d'équipe ouvre la liste, puis les deux élèves.
    await expect(page.locator('#team-members .team-member')).toHaveCount(3);
    await expect(page.locator('#team-members .team-member.is-leader')).toHaveCount(1);
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
    const etat = { courant: etatEquipe({ isTeacher: true, isMember: false, badge: '7.9.1.0', chestIndex: 2, me: null }), reponses: { create: { body: { code: 'ABC234' } }, badge: { body: { badge: '2.9.1.2' } }, profile: { body: { description: '', country: '', lang: '' } } } };
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
    await page.locator('#team-edit-btn').click();
    await expect(page.locator('#team-edit-badge .tb-opt.is-locked')).toHaveCount(5);
    await page.locator('#team-edit-badge .tb-opt[data-row="bg"][data-index="2"]').click();
    await page.locator('#team-edit-badge .tb-opt[data-row="border"][data-index="2"]').click();
    await page.locator('#team-edit .class-primary').click();
    await expect(page.locator('#team-edit')).toBeHidden();
    expect(appels.find(a => a.action === 'badge').badge).toBe('2.9.1.2');
});

test('un élève voit l\'écusson de l\'équipe mais ne peut pas le modifier', async ({ page }) => {
    const etat = { courant: etatEquipe({ badge: '3.5.2.1' }), reponses: {} };
    await fauxServeur(page, etat);
    await page.evaluate(() => localStorage.setItem('historiaxe_team_v1', JSON.stringify({ code: 'ABC234', role: 'member', name: '', pending: 0 })));
    await ouvrirEquipe(page);
    await expect(page.locator('#team-badge-view svg')).toBeVisible();
    await expect(page.locator('#team-edit-btn')).toBeHidden();
});

test('la fiche de l\'équipe : identifiant, description, pays, langue, membres classés par niveau', async ({ page }) => {
    const etat = { courant: etatEquipe({
        description: 'Les historiens de la 3e B', country: 'BE', lang: 'fr', memberCount: 3, totalPoints: 120,
        members: [{ name: 'Zoé', points: 40, level: 5, me: false }, { name: 'Léa', points: 14, level: 3, me: true }, { name: 'Hugo', points: 10, level: 2, me: false }]
    }), reponses: {} };
    await fauxServeur(page, etat);
    await page.evaluate(() => localStorage.setItem('historiaxe_team_v1', JSON.stringify({ code: 'ABC234', role: 'member', name: '', pending: 0, levelSent: 1 })));
    await ouvrirEquipe(page);
    await expect(page.locator('#team-id')).toHaveText('#ABC234');
    await expect(page.locator('#team-desc')).toHaveText('Les historiens de la 3e B');
    await expect(page.locator('#team-fact-country')).toContainText('Belgique');
    await expect(page.locator('#team-fact-lang')).toContainText('français');
    await expect(page.locator('#team-fact-members')).toHaveText('3/50');
    await expect(page.locator('#team-fact-points')).toHaveText('120');
    // Le chef d'équipe d'abord, puis du plus haut niveau au plus bas.
    await expect(page.locator('#team-members .team-member .team-member-name b')).toHaveText(['Mme Durand', 'Zoé', 'Léa', 'Hugo']);
    await expect(page.locator('#team-members .team-member-level')).toHaveText(['Niv. 6', 'Niv. 5', 'Niv. 3', 'Niv. 2']);
    await expect(page.locator('#team-members-title')).toContainText('3/50');
    // Un élève ne modifie rien et ne lance pas de défi.
    await expect(page.locator('#team-edit-btn')).toBeHidden();
    await expect(page.locator('#team-challenge-btn')).toBeHidden();
    // Un texte venu du serveur n'est jamais du HTML.
    await page.evaluate(() => { teamCache.description = '<img src=x onerror=window.__pwned=1>'; teamRenderHeader(teamCache); });
    await expect(page.locator('#team-desc img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
});

test('le niveau du joueur est envoyé au serveur quand il change', async ({ page }) => {
    const etat = { courant: etatEquipe(), reponses: { level: { body: { ok: true } } } };
    const appels = await fauxServeur(page, etat);
    await page.evaluate(() => {
        localStorage.setItem('historiaxe_team_v1', JSON.stringify({ code: 'ABC234', role: 'member', name: '', pending: 0, levelSent: 1 }));
        const d = gamificationLoad(); d.xp = 1600; gamificationSave(d);
    });
    await ouvrirEquipe(page);
    await expect.poll(() => appels.find(a => a.action === 'level')).toMatchObject({ code: 'ABC234', level: 3 });
    await expect.poll(() => page.evaluate(() => teamLoad().levelSent)).toBe(3);
});

test('chercher une équipe par son nom ou son identifiant, puis la rejoindre avec son prénom', async ({ page }) => {
    const etat = { courant: etatEquipe(), reponses: {
        search: { body: { teams: [{ code: 'XYZ789', name: 'Les Historiens', badge: '1.1.1.0', country: 'FR', lang: 'fr', memberCount: 12 }, { code: 'FULL22', name: 'Pleine', badge: '2.2.2.0', country: '', lang: '', memberCount: 50 }] } },
        join: { body: { code: 'XYZ789' } }
    } };
    const appels = await fauxServeur(page, etat);
    await ouvrirEquipe(page);
    await page.locator('#team-join-search input').fill('h');
    await page.locator('#team-join-search .team-find-btn').click();
    await expect(page.locator('#team-join-search [role="status"]')).toContainText('deux caractères');
    await page.locator('#team-join-search input').fill('histor');
    await page.locator('#team-join-search .team-find-btn').click();
    await expect(page.locator('#team-join-search .team-find-item')).toHaveCount(2);
    expect(appels.find(a => a.action === 'search').q).toBe('histor');
    await expect(page.locator('#team-join-search .team-find-item').first()).toContainText('#XYZ789');
    await expect(page.locator('#team-join-search .team-find-item').first()).toContainText('12/50');
    // Une équipe pleine ne se rejoint pas.
    await expect(page.locator('#team-join-search .team-find-item').nth(1).locator('button')).toBeDisabled();
    // Rejoindre sans prénom : refusé ; avec : l'identifiant du résultat est envoyé.
    await page.locator('#team-join-search .team-find-item').first().locator('button').click();
    await expect(page.locator('#team-error')).toContainText('prénom');
    await page.locator('#team-name-input').fill('Léa');
    await page.locator('#team-join-search .team-find-item').first().locator('button').click();
    await expect(page.locator('#team-panel-view')).toBeVisible();
    expect(appels.find(a => a.action === 'join')).toMatchObject({ code: 'XYZ789', name: 'Léa' });
});

test('l\'enseignant édite le profil (description, pays, langue) à la création et ensuite', async ({ page }) => {
    const etat = { courant: etatEquipe({ isTeacher: true, isMember: false, me: null, description: 'Avant', country: 'FR', lang: 'fr', badge: '0.2.1.0', listed: true }),
        reponses: { create: { body: { code: 'ABC234' } }, profile: { body: { description: '', country: '', lang: '' } } } };
    const appels = await fauxServeur(page, etat);
    await ouvrirEquipe(page);
    await page.locator('#team-new-name').fill('2de B');
    await page.locator('#team-create-profile textarea').fill('Une classe <b>géniale</b>');
    await page.locator('#team-create-profile select').first().selectOption('BE');
    await page.locator('#team-create-profile select').nth(1).selectOption('nl');
    // Privée par défaut : on ne la rend visible dans la recherche qu'en cochant la case.
    await expect(page.locator('#team-create-profile input[type="checkbox"]')).not.toBeChecked();
    await page.locator('#team-create-profile input[type="checkbox"]').check();
    await page.locator('#team-create-form .class-primary').click();
    await expect(page.locator('#team-panel-view')).toBeVisible();
    expect(appels.find(a => a.action === 'create')).toMatchObject({ name: '2de B', description: 'Une classe <b>géniale</b>', country: 'BE', lang: 'nl', listed: true });

    await page.locator('#team-edit-btn').click();
    await expect(page.locator('#team-edit-profile textarea')).toHaveValue('Avant');
    await expect(page.locator('#team-edit-profile select').first()).toHaveValue('FR');
    await page.locator('#team-edit-profile textarea').fill('Après');
    await page.locator('#team-edit-profile select').nth(1).selectOption('');
    await page.locator('#team-edit .class-primary').click();
    await expect(page.locator('#team-edit')).toBeHidden();
    expect(appels.find(a => a.action === 'profile')).toMatchObject({ code: 'ABC234', description: 'Après', country: 'FR', lang: '', listed: true });
});

test('défier une autre équipe : recherche, invitation, réponse, score', async ({ page }) => {
    const base = etatEquipe({ isTeacher: true, isMember: false, me: null });
    const etat = { courant: base, reponses: {
        search: { body: { teams: [{ code: 'XYZ789', name: 'Les Rivaux', badge: '3.3.3.0', country: 'ES', lang: 'es', memberCount: 8 }] } },
        challenge: { body: { id: 5 } }, challenge_cancel: { body: { ok: true } }, challenge_reply: { body: { ok: true } }
    } };
    const appels = await fauxServeur(page, etat);
    await page.evaluate(() => localStorage.setItem('historiaxe_team_v1', JSON.stringify({ code: 'ABC234', role: 'teacher', name: '2de B', pending: 0, levelSent: 1 })));
    await ouvrirEquipe(page);
    await page.locator('#team-challenge-btn').click();
    await page.locator('#team-challenge-search input').fill('rivaux');
    await page.locator('#team-challenge-search .team-find-btn').click();
    await page.locator('#team-challenge-search .team-find-item button').click();
    expect(appels.find(a => a.action === 'challenge')).toMatchObject({ code: 'ABC234', target: 'XYZ789' });

    const opp = { code: 'XYZ789', name: 'Les Rivaux', badge: '3.3.3.0', country: 'ES', lang: 'es', memberCount: 8 };
    const montre = async (challenge) => { etat.courant = { ...base, challenge }; await page.evaluate(() => teamRefresh()); };
    await montre({ id: 5, status: 'pending', direction: 'sent', opponent: opp, myScore: null, theirScore: null, endsAt: null });
    await expect(page.locator('#team-challenge-card')).toContainText('Les Rivaux');
    await page.locator('#team-challenge-card button').click();
    expect(appels.find(a => a.action === 'challenge_cancel')).toBeTruthy();

    await montre({ id: 6, status: 'pending', direction: 'received', opponent: opp, myScore: null, theirScore: null, endsAt: null });
    await page.locator('#team-challenge-card .class-primary').click();
    expect(appels.find(a => a.action === 'challenge_reply')).toMatchObject({ id: 6, accept: true });

    await montre({ id: 6, status: 'active', direction: 'received', opponent: opp, myScore: 12, theirScore: 30, endsAt: new Date(Date.now() + 3 * 86400000).toISOString() });
    await expect(page.locator('#team-challenge-card .team-versus-score')).toHaveText(['12 pts', '30 pts']);
    await expect(page.locator('#team-challenge-card')).toContainText('3 jour');
    await montre({ id: 6, status: 'done', direction: 'received', opponent: opp, myScore: 40, theirScore: 30, endsAt: new Date(Date.now() - 86400000).toISOString() });
    await expect(page.locator('#team-challenge-card')).toContainText('Victoire');
});
