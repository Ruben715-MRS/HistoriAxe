// L'app prise au clavier seul, et le zoom rendu aux utilisateurs.
//
// Ce parcours existe parce que l'app n'était, jusqu'ici, atteignable qu'au
// doigt ou à la souris : un inventaire des écrans dans un vrai navigateur
// comptait 59 éléments cliquables sans accès clavier, dont l'écran d'accueil
// entier (un `<div onclick>`). Au clavier, on ne pouvait littéralement pas
// démarrer l'app. La balise viewport interdisait par ailleurs tout zoom
// (`user-scalable=no`).
//
// La règle de ce fichier est de ne JAMAIS poser le focus à la main avant
// d'agir : on appuie sur Tab, comme le ferait quelqu'un qui n'a pas de souris,
// jusqu'à tomber sur l'élément visé. Un test qui ferait `locator.focus()`
// avant `press('Enter')` prouverait que l'élément réagit à Entrée, mais pas
// qu'on peut l'atteindre — et c'est précisément l'atteignabilité qui manquait.
//
// La logique de décision (quelle touche active quoi, où va le focus piégé)
// est déjà couverte sans navigateur (tests/a11y.test.js).

const { test, expect, openThemeModes } = require('./fixtures');
const { attendreLePack, parcourirLesEcrans } = require('./ecrans');

test.use({ viewport: { width: 390, height: 844 } });

// --- OUTILS ---------------------------------------------------------------

async function ecranVisible(page) {
    return page.evaluate(() => {
        const e = [...document.querySelectorAll('body > div')]
            .find(d => d.id.startsWith('screen-') && !d.classList.contains('hidden'));
        return e ? e.id : null;
    });
}

// Où est le focus, en clair — pour un message d'échec qui dit quoi réparer.
async function ouEstLeFocus(page) {
    return page.evaluate(() => {
        const a = document.activeElement;
        if (!a || a === document.body) return '<body>';
        const nom = (a.innerText || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
        return `${a.tagName.toLowerCase()}${a.id ? '#' + a.id : ''}[role=${a.getAttribute('role')}] « ${nom} »`;
    });
}

// Appuie sur Tab jusqu'à ce que le focus tombe sur un élément qui satisfait
// `condition` (une expression JavaScript sur `el`). Renvoie le nombre de Tab.
async function tabJusqua(page, condition, { max = 80, retour = false } = {}) {
    for (let i = 1; i <= max; i++) {
        await page.keyboard.press(retour ? 'Shift+Tab' : 'Tab');
        const trouve = await page.evaluate(
            expr => { const el = document.activeElement; return !!el && el !== document.body && !!(new Function('el', 'return (' + expr + ')'))(el); },
            condition
        );
        if (trouve) return i;
    }
    throw new Error(`« ${condition} » est resté hors d'atteinte en ${max} Tab — dernier focus : ${await ouEstLeFocus(page)}`);
}

// --- LE ZOOM ----------------------------------------------------------------

test('la balise viewport n’interdit plus de zoomer', async ({ page }) => {
    const contenu = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(contenu, 'user-scalable=no interdit le zoom : un lycéen malvoyant ne peut pas agrandir la page')
        .not.toMatch(/user-scalable\s*=\s*(no|0)/i);
    expect(contenu, 'maximum-scale=1.0 interdit lui aussi le zoom')
        .not.toMatch(/maximum-scale\s*=\s*1(\.0*)?\b/i);
});

test('aucun champ de saisie ne passe sous 16 px', async ({ page }) => {
    // Sous 16 px, iOS zoome dans la page à chaque focus d'un champ. Cela ne se
    // voyait pas tant que maximum-scale=1.0 le masquait ; une fois le zoom
    // rendu aux utilisateurs, c'est ce qui l'aurait réactivé en pleine saisie.
    const petits = await page.evaluate(() =>
        [...document.querySelectorAll('input:not([type="range"]):not([type="checkbox"]):not([type="hidden"]), select, textarea')]
            .map(el => ({ el: el.tagName.toLowerCase() + (el.id ? '#' + el.id : ''), px: parseFloat(getComputedStyle(el).fontSize) }))
            .filter(x => x.px < 16)
    );
    expect(petits, 'ces champs déclencheraient le zoom automatique d’iOS').toEqual([]);
});

test('le double-tap ne zoome pas, mais le pincement reste possible', async ({ page }) => {
    // Le Blitz enchaîne les taps en moins d'une demi-seconde : sans
    // `touch-action: manipulation`, un double-tap zoomerait en pleine partie.
    // Cette valeur supprime ce seul geste et garde le pincement.
    const valeurs = await page.evaluate(() => {
        const lire = sel => getComputedStyle(document.querySelector(sel)).touchAction;
        return { bouton: lire('button'), roleBouton: lire('[role="button"]'), carte: lire('.mode-card') };
    });
    Object.entries(valeurs).forEach(([quoi, ta]) =>
        expect(ta, `touch-action de « ${quoi} »`).toBe('manipulation'));
});

// --- ATTEINDRE L'APP AU CLAVIER ------------------------------------------------

test('au chargement, le focus n’est pas volé ; le premier Tab tombe sur « Commencer »', async ({ page }) => {
    await attendreLePack(page);
    // Avant toute action : aucun écran ne doit avoir pris le focus. Le lui
    // voler faisait repartir le premier Tab de l'accueil vers le navigateur.
    expect(await ouEstLeFocus(page)).toBe('<body>');

    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement.id)).toBe('screen-home');
    expect(await page.evaluate(() => document.activeElement.getAttribute('role'))).toBe('button');
    expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'l’accueil doit se nommer')
        .toBeTruthy();

    await page.keyboard.press('Enter');
    await expect(page.locator('#screen-categories')).toBeVisible();
});

test('de l’accueil à une question de Quiz, sans toucher la souris', async ({ page }) => {
    await attendreLePack(page);

    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.locator('#screen-categories')).toBeVisible();
    // Le focus a suivi l'écran : sans cela il retombait sur <body>.
    expect(await page.evaluate(() => document.activeElement.id)).toBe('screen-categories');

    // CAPES & Agrégation : ses thèmes sont rattachés directement à la catégorie.
    await tabJusqua(page, `el.getAttribute('role') === 'button' && el.innerText.includes('CAPES')`);
    await page.keyboard.press('Enter');
    await expect(page.locator('#screen-themes')).toBeVisible();

    // Un thème : c'est le TITRE de la carte qui est le contrôle principal.
    await tabJusqua(page, `el.classList.contains('data-card-title')`);
    await page.keyboard.press('Enter');
    await expect(page.locator('#screen-axes')).toBeVisible();

    await tabJusqua(page, `el.id === 'axes-continue-btn'`);
    await page.keyboard.press('Enter');
    await expect(page.locator('#screen-modes')).toBeVisible();

    await tabJusqua(page, `el.classList.contains('quiz-card')`);
    await page.keyboard.press('Enter');
    await expect(page.locator('#screen-quiz')).toBeVisible();

    // La question reçoit le focus : Tab mène aux options sans repasser par le
    // bouton « Quitter ».
    expect(await page.evaluate(() => document.activeElement.hasAttribute('data-focus-target'))).toBe(true);
    const tabs = await tabJusqua(page, `el.classList.contains('quiz-option')`);
    expect(tabs, 'les options doivent suivre immédiatement la question').toBe(1);

    await page.keyboard.press('Enter');
    await expect(page.locator('#quiz-options .quiz-option.correct')).toHaveCount(1);
});

test('après chaque question, le focus revient à la question suivante', async ({ page }) => {
    await openThemeModes(page, 'thm_aut');
    // On démarre au clavier : c'est la première interaction qui arme la gestion du focus.
    await tabJusqua(page, `el.classList.contains('quiz-card')`);
    await page.keyboard.press('Enter');
    await expect(page.locator('#screen-quiz')).toBeVisible();

    await tabJusqua(page, `el.classList.contains('quiz-option')`);
    await page.keyboard.press('Enter');
    // La longueur de la manche dépend du réglage (voir « Longueur de la
    // manche ») : on ne compte que la progression, pas le total.
    await expect(page.locator('#quiz-hud-count')).toHaveText(/^2 \/ \d+$/, { timeout: 6000 });

    // Les options viennent d'être reconstruites, le bouton pressé n'existe
    // plus : sans gestion du focus, on retombait sur <body>.
    expect(await ouEstLeFocus(page)).not.toBe('<body>');
    expect(await page.evaluate(() => document.activeElement.hasAttribute('data-focus-target'))).toBe(true);
});

// --- LES CONTRÔLES PERSONNALISÉS --------------------------------------------

test('Entrée active une carte, et n’active qu’une fois même maintenue', async ({ page }) => {
    await openThemeModes(page, 'thm_aut');
    await tabJusqua(page, `el.id === 'mode-card-training'`);
    // Une touche maintenue enfoncée répète le keydown : sans garde, elle
    // lancerait la partie vingt fois de suite.
    await page.evaluate(() => { window.__lancements = 0; const o = window.startActualGame; window.startActualGame = function () { window.__lancements++; return o.apply(this, arguments); }; });
    await page.keyboard.down('Enter');
    for (let i = 0; i < 5; i++) await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    await expect(page.locator('#screen-game')).toBeVisible();
    expect(await page.evaluate(() => window.__lancements)).toBe(1);
});

test('Espace bascule un axe (case à cocher), Entrée ne le bascule pas', async ({ page }) => {
    await openThemeCard(page);
    const cases = page.locator('#axes-container [role="checkbox"]');
    await expect(cases.first()).toHaveAttribute('aria-checked', 'true');

    await tabJusqua(page, `el.getAttribute('role') === 'checkbox'`);
    const nom = await page.evaluate(() => document.activeElement.innerText);

    // Convention ARIA : une case se coche à l'Espace, jamais à Entrée.
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement.getAttribute('aria-checked'))).toBe('true');

    await page.keyboard.press('Space');
    // La liste est reconstruite à chaque case cochée : le focus doit rester
    // sur le MÊME axe, sans quoi chaque case renvoyait au haut de l'écran.
    expect(await page.evaluate(() => document.activeElement.getAttribute('role'))).toBe('checkbox');
    expect(await page.evaluate(() => document.activeElement.innerText)).toBe(nom);
    expect(await page.evaluate(() => document.activeElement.getAttribute('aria-checked'))).toBe('false');
});

test('une carte-thème : le titre ouvre, l’étoile bascule sans ouvrir', async ({ page }) => {
    await attendreLePack(page);
    await page.evaluate(() => {
        selectedCategoryIndex = bdd.findIndex(c => c.nom && c.nom.indexOf('CAPES') >= 0);
        selectedSubcategoryIndex = null;
        showScreen('screen-themes');
    });
    await expect(page.locator('#screen-themes')).toBeVisible();

    await tabJusqua(page, `el.classList.contains('data-card-fav')`);
    const avant = await page.evaluate(() => document.activeElement.getAttribute('aria-pressed'));
    expect(avant).toBe('false');
    expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')),
        'l’étoile doit dire de quel thème il s’agit').toContain('—');

    await page.keyboard.press('Space');
    // Elle bascule, et ne remonte pas à la carte : l'écran ne change pas.
    expect(await page.evaluate(() => document.activeElement.getAttribute('aria-pressed'))).toBe('true');
    expect(await ecranVisible(page)).toBe('screen-themes');
});

test('une carte de mode verrouillée s’annonce indisponible mais s’active au clavier', async ({ page }) => {
    await openThemeModes(page, 'thm_aut');
    await tabJusqua(page, `el.id === 'mode-card-chrono'`);
    expect(await page.evaluate(() => document.activeElement.getAttribute('aria-disabled'))).toBe('true');

    await page.keyboard.press('Enter');
    await expect(page.locator('#modal-confirm')).toBeVisible();
    await expect(page.locator('#confirm-message')).not.toBeEmpty();
    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-confirm')).toBeHidden();
});

// --- LES MODALES -------------------------------------------------------------

test('une modale piège le focus, se ferme à Échap et rend le focus', async ({ page }) => {
    await attendreLePack(page);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await expect(page.locator('#screen-categories')).toBeVisible();

    await tabJusqua(page, `el.classList.contains('settings-btn')`);
    await page.keyboard.press('Enter');
    await expect(page.locator('#modal-settings')).toBeVisible();

    // Le focus est entré dans la modale.
    expect(await page.evaluate(() => !!document.activeElement.closest('#modal-settings'))).toBe(true);
    expect(await page.evaluate(() => document.querySelector('#modal-settings .modal-content').getAttribute('role'))).toBe('dialog');
    expect(await page.evaluate(() => document.querySelector('#modal-settings .modal-content').getAttribute('aria-modal'))).toBe('true');

    // Tab ne sort jamais de la modale, dans les deux sens.
    for (let i = 0; i < 40; i++) {
        await page.keyboard.press(i % 7 === 6 ? 'Shift+Tab' : 'Tab');
        const dedans = await page.evaluate(() => !!document.activeElement.closest('#modal-settings'));
        expect(dedans, `le focus a fui la modale au Tab n°${i + 1} : ${await ouEstLeFocus(page)}`).toBe(true);
    }

    await page.keyboard.press('Escape');
    await expect(page.locator('#modal-settings')).toBeHidden();
    // Retour d'où l'on venait, et non <body>.
    expect(await page.evaluate(() => document.activeElement.classList.contains('settings-btn'))).toBe(true);
});

test('le croisillon d’une modale s’atteint et se nomme', async ({ page }) => {
    await attendreLePack(page);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');
    await tabJusqua(page, `el.classList.contains('settings-btn')`);
    await page.keyboard.press('Enter');
    await expect(page.locator('#modal-settings')).toBeVisible();

    await tabJusqua(page, `el.classList.contains('close-btn')`);
    expect(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'un « × » seul ne se nomme pas')
        .toBeTruthy();
    await page.keyboard.press('Space');
    await expect(page.locator('#modal-settings')).toBeHidden();
});

// --- LES MODES -----------------------------------------------------------------

test('Remise en ordre : le focus survit à chaque carte touchée', async ({ page }) => {
    await openThemeModes(page, 'thm_aut');
    await tabJusqua(page, `el.id === 'mode-card-ordre'`);
    await page.keyboard.press('Enter');
    await expect(page.locator('#screen-ordre')).toBeVisible();

    await tabJusqua(page, `el.classList.contains('ordre-card')`);
    await page.keyboard.press('Enter');
    // Chaque tap reconstruit les cinq cartes : le focus ne doit pas retomber sur <body>.
    expect(await ouEstLeFocus(page)).not.toBe('<body>');
    expect(await page.evaluate(() => !!document.activeElement.closest('#ordre-cards'))).toBe(true);
    await expect(page.locator('#ordre-cards .ordre-card.placed')).toHaveCount(1);
});

test('Le curseur : le focus est sur le curseur, qui se règle aux flèches', async ({ page }) => {
    await openThemeModes(page, 'thm_aut');
    await tabJusqua(page, `el.id === 'mode-card-curseur'`);
    await page.keyboard.press('Enter');
    await expect(page.locator('#screen-curseur')).toBeVisible();

    expect(await page.evaluate(() => document.activeElement.id)).toBe('curseur-range');
    // `tabindex="-1"` aurait retiré le curseur de l'ordre de tabulation : il
    // doit rester atteignable.
    expect(await page.evaluate(() => document.activeElement.tabIndex)).toBeGreaterThanOrEqual(0);

    const avant = await page.locator('#curseur-range').inputValue();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(Number(await page.locator('#curseur-range').inputValue())).toBe(Number(avant) + 2);
    // L'année affichée suit les flèches, pas seulement la souris.
    await expect(page.locator('#curseur-value')).toContainText(String(Number(avant) + 2));
});

test('Mode Carte : un pion se nomme par son pays', async ({ page }) => {
    // Pour qui ne voit pas la carte, « Option 2 » ne désigne rien : le pays est
    // le seul moyen de savoir ce que désigne le pion.
    await attendreLePack(page);
    await page.evaluate(() => { loadGeoAssets().then(() => {}); });
    await page.waitForFunction(() => typeof GEO_PINS !== 'undefined' && GEO_PINS && GEO_THEME_COUNTRY, null, { timeout: 20000 });
    await page.evaluate(() => {
        const ci = bdd.findIndex(c => c.nom && c.nom.indexOf('nationales') >= 0);
        startGeoModeFromNode(bdd[ci], bdd[ci].nom);
    });
    await expect(page.locator('#geo-pins-layer .geo-pin-btn').first()).toBeVisible({ timeout: 10000 });
    const noms = await page.locator('#geo-pins-layer .geo-pin-btn').evaluateAll(
        els => els.map(e => e.getAttribute('aria-label')));
    expect(noms.length).toBeGreaterThanOrEqual(4);
    noms.forEach(n => expect(n, 'un pion doit nommer son pays').toMatch(/:| /));
});

// --- LE DÉTECTEUR : TOUT CE QUI SE CLIQUE SE PREND AU CLAVIER ----------------------

// Racine de chaque zone cliquable (curseur « main » ou attribut onclick) qui
// n'est pas atteignable au clavier. On ne retient que les RACINES : un enfant
// dont le parent est déjà « main » n'a fait qu'hériter du curseur, c'est le
// parent qu'il faut corriger.
const INVENTAIRE = () => {
    const NATIFS = new Set(['BUTTON', 'SELECT', 'TEXTAREA', 'SUMMARY']);
    const ROLES = ['button', 'link', 'tab', 'menuitem', 'checkbox', 'radio', 'switch', 'option'];
    const out = [];
    document.querySelectorAll('body *').forEach(el => {
        if (['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD'].includes(el.tagName)) return;
        const parentMain = el.parentElement && getComputedStyle(el.parentElement).cursor === 'pointer';
        const clic = el.hasAttribute('onclick') || (getComputedStyle(el).cursor === 'pointer' && !parentMain);
        if (!clic) return;
        if (NATIFS.has(el.tagName)) return;
        if (el.tagName === 'INPUT' && el.type !== 'hidden') return;
        if (el.tagName === 'A' && el.hasAttribute('href')) return;
        if (el.hasAttribute('tabindex')) return;
        if (ROLES.includes(el.getAttribute('role'))) return;
        // Une carte qui contient d'autres contrôles ne se rend pas focalisable
        // (un `button` n'en contient pas un autre) : son équivalent clavier est
        // un contrôle interne, déclaré par `data-kbd-proxy`.
        if (el.hasAttribute('data-kbd-proxy')) return;
        // Le fond d'une modale ne se clique que pour la fermer : Échap fait de même.
        if (el.classList.contains('modal-overlay')) return;
        if (el.parentElement && el.parentElement.closest('button, a[href], select, [role="button"], [tabindex]:not([tabindex="-1"])')) return;
        const racine = el.closest('[id^="screen-"], [id^="modal-"]');
        out.push((racine ? '#' + racine.id : '(hors écran)') + ' › ' + el.tagName.toLowerCase()
            + (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).trim().split(/\s+/)[0] : ''));
    });
    return out;
};

test('le détecteur détecte : un clic sans clavier est bien signalé', async ({ page }) => {
    // Sans ce test, un détecteur qui ne trouverait jamais rien passerait pour
    // une app irréprochable.
    await attendreLePack(page);
    const trouve = await page.evaluate(code => {
        const piege = document.createElement('div');
        piege.id = 'piege-a11y';
        piege.style.cursor = 'pointer';
        piege.setAttribute('onclick', 'void 0');
        piege.innerText = 'cliquable, mais pas au clavier';
        document.body.appendChild(piege);
        const liste = (new Function('return (' + code + ')()'))();
        piege.remove();
        return liste;
    }, INVENTAIRE.toString());
    expect(trouve.some(l => l.includes('piege-a11y')), 'le détecteur n’a pas vu le piège').toBe(true);

    // …et il laisse passer ce qui est correct.
    const apres = await page.evaluate(code => {
        const ok = document.createElement('div');
        ok.id = 'ok-a11y';
        ok.style.cursor = 'pointer';
        ok.setAttribute('onclick', 'void 0');
        ok.setAttribute('role', 'button');
        ok.setAttribute('tabindex', '0');
        document.body.appendChild(ok);
        const liste = (new Function('return (' + code + ')()'))();
        ok.remove();
        return liste;
    }, INVENTAIRE.toString());
    expect(apres.some(l => l.includes('ok-a11y'))).toBe(false);
});

test('aucun écran de l’app n’a de zone cliquable hors d’atteinte du clavier', async ({ page }) => {
    const trouvailles = new Map();
    // Le parcours est partagé avec les contrastes (voir e2e/ecrans.js).
    await parcourirLesEcrans(page, async etape => {
        (await page.evaluate(INVENTAIRE)).forEach(l => { if (!trouvailles.has(l)) trouvailles.set(l, etape); });
    });

    const restes = [...trouvailles.entries()].map(([l, etape]) => `${l}   (vu à l'étape « ${etape} »)`);
    expect(restes, 'ces zones se cliquent mais ne se prennent pas au clavier').toEqual([]);
});

// L'écran des axes, atteint par un clic : le clavier s'y prend ensuite.
async function openThemeCard(page) {
    await attendreLePack(page);
    await page.evaluate(() => {
        selectedCategoryIndex = bdd.findIndex(c => (c.themes || []).some(t => t.id === 'thm_aut'));
        selectedSubcategoryIndex = null;
        showScreen('screen-themes');
    });
    const index = await page.evaluate(() => bdd[selectedCategoryIndex].themes.findIndex(t => t.id === 'thm_aut'));
    await page.locator('#themes-container .data-card-title').nth(index).click();
    await page.waitForSelector('#screen-axes:not(.hidden)');
}
