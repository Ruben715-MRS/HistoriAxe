// Les amis (js/app/friends.js) avec un faux /api/friends : la logique serveur (identifiant, demandes, blocage, réponses
// qui ne trahissent rien) a ses propres tests sur Postgres en mémoire (tests/friends.test.js) ; ici, on vérifie que
// l'interface suit le protocole.

const { test, expect } = require('./fixtures');

test.beforeEach(async ({ page }) => {
    await page.evaluate(() => {
        markRecapShownThisWeek();
        localStorage.setItem('historiaxe_rewards_v1', JSON.stringify({ coins: 100 }));
        localStorage.setItem('historiaxe_path_v1', JSON.stringify({ levels: {}, skipped: ['monde0'] }));
        showScreen('screen-categories');
        initCategories();
    });
});

const vide = (extra = {}) => ({ code: 'K7QX92HM', requests: true, friends: [], incoming: [], outgoing: [], blocked: [], ...extra });

async function fauxServeur(page, etat) {
    const appels = [];
    await page.route(/\/api\/friends/, async route => {
        const corps = JSON.parse(route.request().postData());
        appels.push(corps);
        const reponse = etat.reponses[corps.action] || { status: 200, body: {} };
        const sortie = typeof reponse === 'function' ? reponse(corps) : reponse;
        const courant = corps.action === 'list' ? etat.courant : null;
        return route.fulfill({ status: sortie.status || 200, contentType: 'application/json', body: JSON.stringify(courant || sortie.body || {}) });
    });
    return appels;
}

async function ouvrirAmis(page) {
    await page.evaluate(() => { showScreen('screen-categories'); initCategories(); });
    await page.locator('.rewards-friends-btn').click();
    await expect(page.locator('#screen-friends')).toBeVisible();
}

test('sans compte : on explique pourquoi et on renvoie vers la connexion, sans rien demander au serveur', async ({ page }) => {
    const appels = await fauxServeur(page, { courant: vide(), reponses: {} });
    await page.evaluate(() => { Auth.isSignedIn = () => false; });
    await ouvrirAmis(page);
    await expect(page.locator('#friends-panel-account')).toBeVisible();
    await expect(page.locator('#friends-panel-main')).toBeHidden();
    await expect(page.locator('#friends-panel-account')).toContainText('aucun lien avec votre adresse e-mail');
    await page.locator('#friends-panel-account .class-primary').click();
    await expect(page.locator('#modal-settings')).toBeVisible();
    expect(appels).toHaveLength(0);
});

test('avec un compte : l\'identifiant d\'ami s\'affiche, se copie, et les demandes se règlent', async ({ page }) => {
    const etat = { courant: vide(), reponses: { settings: { body: { requests: false } } } };
    const appels = await fauxServeur(page, etat);
    await page.evaluate(() => { Auth.isSignedIn = () => true; });
    await ouvrirAmis(page);
    await expect(page.locator('#friends-code')).toHaveText('K7QX-92HM');
    await expect(page.locator('#friends-lists .friends-friend, #friends-lists .friends-person')).toHaveCount(0);
    await expect(page.locator('#friends-lists')).toContainText('Pas encore d\'ami');
    // Le niveau du joueur accompagne le relevé.
    expect(appels.find(a => a.action === 'list')).toMatchObject({ level: expect.any(Number) });
    await page.locator('#friends-allow-input').uncheck();
    await expect.poll(() => appels.find(a => a.action === 'settings')).toMatchObject({ requests: false });
});

test('ajouter un ami par son identifiant : validation, erreurs du serveur traduites, succès', async ({ page }) => {
    const etat = { courant: vide(), reponses: { request: { body: { status: 'pending' } } } };
    const appels = await fauxServeur(page, etat);
    await page.evaluate(() => { Auth.isSignedIn = () => true; });
    await ouvrirAmis(page);
    // Trop court : refusé sans appel.
    await page.locator('#friends-add-input').fill('K7QX');
    await page.locator('#friends-panel-main .friends-add .class-primary').click();
    await expect(page.locator('#friends-add-msg')).toContainText('8 caractères');
    expect(appels.filter(a => a.action === 'request')).toHaveLength(0);
    // Les refus du serveur sont dits en clair.
    const cas = [[404, 'Aucun joueur avec cet identifiant.', 'Aucun joueur'], [400, 'C\'est votre propre identifiant.', 'propre identifiant'],
        [409, 'Vous êtes déjà amis.', 'déjà amis'], [409, 'Demande déjà envoyée.', 'déjà envoyée'], [409, 'Vous avez bloqué ce joueur : débloquez-le d\'abord.', 'bloqué'],
        [409, 'Trop de demandes en attente.', 'Limite atteinte']];
    for (const [status, error, attendu] of cas) {
        // Le refus est rejoué côté client : un vrai 4xx réseau salirait la console du navigateur.
        await page.evaluate(([status, error]) => { window.__friendsReel = window.__friendsReel || HistoriAxeAPI.friends; HistoriAxeAPI.friends = () => Promise.resolve({ ok: false, status, error }); }, [status, error]);
        await page.locator('#friends-add-input').fill('k7qx-92hn');
        await page.locator('#friends-panel-main .friends-add .class-primary').click();
        await expect(page.locator('#friends-add-msg')).toContainText(attendu);
    }
    await page.evaluate(() => { HistoriAxeAPI.friends = window.__friendsReel; });
    // Succès : l'identifiant est envoyé normalisé, le champ se vide.
    const appels2 = appels;
    await page.locator('#friends-add-input').fill('#k7qx-92hn');
    await page.locator('#friends-panel-main .friends-add .class-primary').click();
    await expect(page.locator('#friends-add-msg')).toContainText('Demande envoyée');
    expect(appels2.find(a => a.action === 'request').code).toBe('K7QX92HN');
    await expect(page.locator('#friends-add-input')).toHaveValue('');
});

test('les listes : demandes reçues (accepter, refuser, bloquer), amis par niveau, demandes envoyées, bloqués', async ({ page }) => {
    const etat = { courant: vide({
        incoming: [{ id: 11, name: 'Inès', level: 2 }],
        friends: [{ id: 21, name: 'Zoé', level: 5 }, { id: 22, name: 'Léa', level: 3 }],
        outgoing: [{ id: 31, name: 'Hugo', level: 1 }],
        blocked: [{ id: 41, name: 'Troll' }]
    }), reponses: {} };
    const appels = await fauxServeur(page, etat);
    await page.evaluate(() => { Auth.isSignedIn = () => true; });
    await ouvrirAmis(page);
    await expect(page.locator('#friends-lists h3')).toHaveText(['Demandes reçues (1)', 'Mes amis (2)', 'Demandes envoyées (1)', 'Joueurs bloqués (1)']);
    await expect(page.locator('#friends-lists .friends-section').nth(1).locator('.friends-person-name')).toHaveText(['Zoé', 'Léa']);
    await expect(page.locator('#friends-lists .friends-section').nth(1).locator('.team-member-level')).toHaveText(['Niv. 5', 'Niv. 3']);
    // Le pseudo d'un autre joueur n'est jamais interprété comme du HTML.
    etat.courant = vide({ friends: [{ id: 21, name: '<img src=x onerror=window.__pwned=1>', level: 1 }] });
    await page.evaluate(() => friendsRefresh());
    await expect(page.locator('#friends-lists img')).toHaveCount(0);
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    etat.courant = vide({ incoming: [{ id: 11, name: 'Inès', level: 2 }], friends: [{ id: 21, name: 'Zoé', level: 5 }], outgoing: [{ id: 31, name: 'Hugo' }], blocked: [{ id: 41, name: 'Troll' }] });
    await page.evaluate(() => friendsRefresh());
    const section = n => page.locator('#friends-lists .friends-section').nth(n);

    await section(0).getByRole('button', { name: 'Accepter' }).click();
    await expect.poll(() => appels.find(a => a.action === 'respond' && a.accept === true)).toMatchObject({ id: 11 });
    await section(0).getByRole('button', { name: 'Refuser' }).click();
    await expect.poll(() => appels.find(a => a.action === 'respond' && a.accept === false)).toMatchObject({ id: 11 });
    // Bloquer et retirer demandent confirmation.
    await section(0).getByRole('button', { name: 'Bloquer' }).click();
    await expect(page.locator('#modal-confirm')).toContainText('Bloquer Inès');
    await page.locator('#confirm-ok-btn').click();
    await expect.poll(() => appels.find(a => a.action === 'respond' && a.block === true)).toMatchObject({ id: 11 });
    await section(1).getByRole('button', { name: 'Retirer' }).click();
    await expect(page.locator('#modal-confirm')).toContainText('Retirer Zoé');
    await page.locator('#confirm-ok-btn').click();
    await expect.poll(() => appels.find(a => a.action === 'remove')).toMatchObject({ id: 21 });
    await section(2).getByRole('button', { name: 'Annuler' }).click();
    await expect.poll(() => appels.find(a => a.action === 'cancel')).toMatchObject({ id: 31 });
    await section(3).getByRole('button', { name: 'Débloquer' }).click();
    await expect.poll(() => appels.find(a => a.action === 'unblock')).toMatchObject({ id: 41 });
});

test('la pastille « Amis » de l\'accueil annonce les demandes en attente', async ({ page }) => {
    const etat = { courant: vide({ incoming: [{ id: 1, name: 'A', level: 1 }, { id: 2, name: 'B', level: 1 }] }), reponses: {} };
    await fauxServeur(page, etat);
    await page.evaluate(() => { Auth.isSignedIn = () => true; friendsCache = null; friendsFetchedAt = 0; showScreen('screen-categories'); initCategories(); });
    await expect(page.locator('.rewards-friends-btn small')).toHaveText('2');
});
