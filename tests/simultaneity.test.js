// Le moteur du mode « Pendant ce temps, ailleurs… » (js/simultaneity.js).
//
// Contrairement aux autres modes, celui-ci a toute sa logique dans un module
// sans DOM : elle est donc vérifiable ici, et pas seulement dans un
// navigateur. Deux familles de tests :
//
//  - sur une base miniature écrite à la main, où chaque contrainte peut être
//    mise en défaut isolément (un doublon, une étiquette identique, un
//    distracteur trop proche…) ;
//  - sur le VRAI pack français, parce que les quatre contraintes du mode ont
//    été déduites de ses données : un test qui ne tournerait que sur une
//    maquette ne dirait rien du jour où le contenu bouge.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const S = require('../js/simultaneity.js');
const DailyEngine = require('../js/dailyEngine.js');

// Générateur déterministe : les tests portent sur des propriétés vraies pour
// tout tirage, mais un échec doit être reproductible à l'identique.
function seededRng(seed) {
    let s = seed >>> 0;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

// --- BASE MINIATURE ------------------------------------------------------
// Deux catégories à sous-catégories (donc des étiquettes de branche valides)
// et une catégorie plate, pour couvrir les trois règles de themeTag.
//
// Elle compte six étiquettes distinctes, et ce n'est pas du décor : une
// question réclame l'étiquette de l'ancre, celle de la bonne réponse, et
// trois autres encore pour les distracteurs. En dessous de cinq, le moteur a
// raison de refuser de poser la question — c'est d'ailleurs ce que vérifie
// « une ancre sans contemporain ailleurs… ».
const MINI_COUNTRIES = { thm_fr: 'FR', thm_cn: 'CN', thm_br: 'BR', thm_in: 'IN' };

function miniBdd() {
    const evt = (id, date, titre) => ({ id, date, titre, description: '', wikipedia: '' });
    const theme = (id, nom, events) => ({ id, nom, essentiel: events.map(e => e.id), events });
    return [
        {
            nom: 'Monde',
            subcategories: [
                {
                    nom: 'Europe',
                    themes: [theme('thm_fr', 'France', [
                        evt('fr1', 1789, 'Prise de la Bastille'),
                        evt('fr2', 1900, 'Exposition universelle')
                    ])]
                },
                {
                    nom: 'Asie',
                    themes: [theme('thm_cn', 'Chine', [
                        evt('cn1', 1792, 'Ambassade Macartney'),
                        evt('cn2', 1420, 'Cité interdite achevée')
                    ])]
                },
                {
                    nom: 'Amériques',
                    themes: [theme('thm_br', 'Brésil', [
                        evt('br1', 1822, 'Indépendance du Brésil'),
                        evt('br2', 1500, 'Cabral atteint le Brésil')
                    ])]
                },
                {
                    nom: 'Asie du Sud',
                    themes: [theme('thm_in', 'Inde', [
                        evt('in1', 1857, 'Révolte des cipayes'),
                        evt('in2', 1526, 'Fondation de l’Empire moghol')
                    ])]
                }
            ]
        },
        {
            nom: 'Savoirs',
            subcategories: [
                {
                    nom: 'Sciences',
                    themes: [theme('thm_sci', 'Sciences', [
                        evt('sc1', 1791, 'Invention du télégraphe optique'),
                        evt('sc2', 1543, 'De revolutionibus'),
                        evt('sc3', -400000, 'Maîtrise du feu')
                    ])]
                },
                {
                    nom: 'Arts',
                    themes: [theme('thm_art', 'Arts', [
                        evt('ar1', 1503, 'La Joconde'),
                        evt('ar2', 1937, 'Guernica')
                    ])]
                }
            ]
        },
        {
            // Catégorie PLATE : pas de sous-catégories, donc pas de « lieu »
            // exploitable — ses événements ne doivent jamais servir de réponse.
            nom: 'Concours',
            themes: [theme('thm_capes', 'Monographie', [evt('cap1', 1790, 'Fête de la Fédération')])]
        }
    ];
}

const MINI_POOL = () => S.buildAnswerPool(miniBdd(), { countryByTheme: MINI_COUNTRIES });

// --- themeTag ------------------------------------------------------------

test('themeTag : un pays connu prime sur la position dans l’arbre', () => {
    assert.equal(S.themeTag('thm_fr', [0, 0], { thm_fr: 'fr' }), 'pays:FR');
});

test('themeTag : la convention psn_<iso>_ des programmes scolaires donne le pays', () => {
    // Sans quoi « Programmes scolaires > Allemagne » serait un « ailleurs »
    // pour « Histoire de l'Allemagne », alors que c'est le même pays.
    assert.equal(S.themeTag('psn_de_t1', [3, 2], {}), 'pays:DE');
    assert.equal(S.themeTag('psn_de_t1', [3, 2], {}), S.themeTag('thm_de', [2, 0], { thm_de: 'DE' }));
});

test('themeTag : sinon, la position dans l’arbre — jamais le nom de la catégorie', () => {
    // Les noms de catégories sont traduits (data/en.json…), les indices non.
    assert.equal(S.themeTag('col_6e', [3, 0], {}), 'branche:3.0');
});

// --- titlesTooClose ------------------------------------------------------

test('titlesTooClose repère le même événement rédigé deux fois', () => {
    assert.equal(S.titlesTooClose('Lancement de Spoutnik 1', 'Lancement de Spoutnik'), true);
    assert.equal(S.titlesTooClose('Chute du mur de Berlin', 'chute du Mur de BERLIN'), true);
    assert.equal(S.titlesTooClose('Prise de la Bastille', 'Ambassade Macartney'), false);
});

test('titlesTooClose ne se laisse pas piéger par les mots-outils communs', () => {
    // « de », « la », « du » sont partout : deux titres qui ne partagent
    // qu'eux ne parlent pas du même événement.
    assert.equal(S.titlesTooClose('Sacre de Napoléon', 'Bataille de la Marne'), false);
});

// --- Vivier de réponses --------------------------------------------------

test('le vivier ne retient que les ⭐ Incontournables', () => {
    const bdd = miniBdd();
    bdd[0].subcategories[0].themes[0].essentiel = ['fr1']; // fr2 n'est plus essentiel
    const pool = S.buildAnswerPool(bdd, { countryByTheme: MINI_COUNTRIES });
    const ids = pool.answers.map(a => a.id);
    assert.ok(ids.includes('fr1'));
    assert.ok(!ids.includes('fr2'), 'un événement non essentiel ne doit pas pouvoir être une réponse');
});

test('le vivier écarte les catégories plates, faute de « lieu » exploitable', () => {
    const pool = MINI_POOL();
    assert.ok(!pool.answers.some(a => a.themeId === 'thm_capes'),
        'un thème de catégorie sans sous-catégories ne peut pas définir un « ailleurs »');
});

test('le vivier écarte les dates hors échelle historique', () => {
    const pool = MINI_POOL();
    assert.ok(!pool.answers.some(a => a.id === 'sc3'),
        '-400000 comme option se repère au premier coup d’œil et rend la question gratuite');
});

test('le vivier écarte les thèmes exclus des tirages (calendrier non grégorien)', () => {
    const bdd = miniBdd();
    bdd[0].subcategories[0].themes[0].id = DailyEngine.EXCLUDED_THEME_IDS[0];
    const pool = S.buildAnswerPool(bdd, { excludedThemeIds: DailyEngine.EXCLUDED_THEME_IDS });
    assert.ok(!pool.answers.some(a => a.id === 'fr1'));
});

test('un même événement présent dans deux thèmes n’entre qu’une fois dans le vivier', () => {
    const bdd = miniBdd();
    bdd[0].subcategories[1].themes.push({
        id: 'thm_autre', nom: 'Autre', essentiel: ['x1'],
        events: [{ id: 'x1', date: 1789, titre: 'Prise de la Bastille' }]
    });
    bdd[0].subcategories[0].themes[0].essentiel = ['fr1', 'fr2'];
    const pool = S.buildAnswerPool(bdd, { countryByTheme: MINI_COUNTRIES });
    const bastilles = pool.answers.filter(a => S.normalizeTitle(a.titre) === 'prise de la bastille');
    assert.equal(bastilles.length, 1, 'sinon deux options d’une même question désigneraient le même événement');
});

// --- Génération d'une question ------------------------------------------

test('la bonne réponse est contemporaine mais vient d’ailleurs', () => {
    const pool = MINI_POOL();
    const anchor = { id: 'fr1', date: 1789, titre: 'Prise de la Bastille', tag: 'pays:FR' };
    const q = S.buildQuestion(anchor, pool, seededRng(1));
    assert.ok(q, 'la question doit pouvoir être posée');
    assert.ok(Math.abs(q.correct.date - anchor.date) <= S.CLOSE_YEARS);
    assert.notEqual(q.correct.tag, anchor.tag, 'la réponse doit venir d’une autre étiquette que l’ancre');
});

test('aucun distracteur n’est défendable comme contemporain', () => {
    const pool = MINI_POOL();
    const anchor = { id: 'fr1', date: 1789, titre: 'Prise de la Bastille', tag: 'pays:FR' };
    const q = S.buildQuestion(anchor, pool, seededRng(7));
    assert.ok(q);
    q.distractors.forEach(d => {
        assert.ok(Math.abs(d.date - anchor.date) >= S.FAR_YEARS,
            `« ${d.titre} » (${d.date}) est à ${Math.abs(d.date - anchor.date)} ans de l’ancre : trop près pour être faux sans discussion`);
    });
});

test('une ancre sans contemporain ailleurs ne produit pas de question bancale', () => {
    const pool = MINI_POOL();
    const seul = { id: 'z', date: 1200, titre: 'Événement isolé', tag: 'pays:XX' };
    assert.equal(S.buildQuestion(seul, pool, seededRng(3)), null,
        'mieux vaut renoncer à la question que d’élargir les seuils');
});

// --- Index d'étiquettes (ancres) ----------------------------------------

test('l’index d’étiquettes couvre aussi les événements non essentiels', () => {
    // Les ancres ne sont pas prises dans le vivier : n'importe quel
    // événement du thème peut en être une, essentiel ou non.
    const bdd = miniBdd();
    bdd[0].subcategories[0].themes[0].essentiel = []; // plus aucun essentiel
    const index = S.buildTagIndex(bdd, { countryByTheme: MINI_COUNTRIES });
    assert.equal(index['fr1'], 'pays:FR');
    assert.equal(index['fr2'], 'pays:FR');
});

test('l’index donne à chaque ancre l’étiquette de SON thème', () => {
    // Décisif en mode Révision, où les ancres viennent de thèmes différents :
    // une étiquette commune laisserait une réponse sortir du thème de l'ancre.
    const index = S.buildTagIndex(miniBdd(), { countryByTheme: MINI_COUNTRIES });
    assert.equal(index['fr1'], 'pays:FR');
    assert.equal(index['cn1'], 'pays:CN');
    assert.notEqual(index['fr1'], index['cn1']);
    // Y compris pour les thèmes écartés du vivier des réponses.
    assert.equal(index['cap1'], 'branche:2');
});

test('une ancre ne peut pas recevoir une réponse de son propre thème', () => {
    const pool = MINI_POOL();
    const index = S.buildTagIndex(miniBdd(), { countryByTheme: MINI_COUNTRIES });
    // fr2 (1900) est dans le vivier ; une ancre française ne doit jamais le
    // recevoir comme « ailleurs », même à date compatible.
    const anchor = { id: 'fr9', date: 1898, titre: 'Événement français inédit', tag: index['fr1'] };
    const contemporains = S.contemporariesOf(anchor, pool);
    assert.ok(!contemporains.some(c => c.id === 'fr2'),
        'fr2 vient du même pays que l’ancre : ce n’est pas un « ailleurs »');
});

// --- Sur le vrai pack français ------------------------------------------

const frData = require(path.join('..', 'data', 'fr.json'));
const geoMap = require(path.join('..', 'assets', 'geo', 'theme-country-map.json'));

const realPool = S.buildAnswerPool(frData.categories, {
    countryByTheme: geoMap,
    excludedThemeIds: DailyEngine.EXCLUDED_THEME_IDS
});

function allThemes() {
    const out = [];
    (function walk(nodes) {
        nodes.forEach(n => {
            (n.themes || []).forEach(t => out.push(t));
            if (n.subcategories) walk(n.subcategories);
        });
    })(frData.categories);
    return out;
}

test('le pack français fournit un vivier de réponses exploitable', () => {
    // Le mode serait injouable sur un vivier squelettique ; ce seuil garde
    // une marge large sous la valeur réelle (~2 700) pour ne pas rougir au
    // premier ajustement de contenu.
    assert.ok(realPool.answers.length > 1500,
        `vivier trop mince : ${realPool.answers.length} réponses`);
});

test('aucune réponse du pack français ne sort de l’échelle historique', () => {
    // Attrape en particulier les années hébraïques (5700…), dont l’exclusion
    // passe par DailyEngine.EXCLUDED_THEME_IDS.
    const hors = realPool.answers.filter(a => Math.abs(a.date) >= 10000);
    assert.deepEqual(hors, [], 'des dates non grégoriennes ont fui dans le vivier');
});

test('les gros thèmes du pack français remplissent une session entière', () => {
    const rng = seededRng(2024);
    ['thm_fr', 'thm_usa', 'thm_aut'].forEach(id => {
        const theme = allThemes().find(t => t.id === id);
        if (!theme) return;
        const session = S.buildSession(theme.events, realPool, { rng, count: S.SESSION_ROUNDS });
        assert.equal(session.length, S.SESSION_ROUNDS,
            `« ${theme.nom} » ne produit que ${session.length} questions sur ${S.SESSION_ROUNDS}`);
    });
});

test('à graine égale, la session est rigoureusement identique', () => {
    // C'est ce qui fait du Défi de simultanéité un défi et non un mode à
    // volonté : la graine mêle l'identifiant d'appareil au jour courant (voir
    // js/app.js: startSimultaneityChallenge), donc le tirage ne bouge pas
    // avant demain.
    const theme = allThemes().find(t => t.id === 'thm_fr');
    const empreinte = () => S.buildSession(theme.events, realPool, { rng: seededRng(4242), count: 10 })
        .map(q => q.anchor.id + '>' + q.correct.id + '>' + q.options.map(o => o.id).join(','));
    assert.deepEqual(empreinte(), empreinte());
});

test('une graine différente donne un tirage différent', () => {
    // Sans quoi le défi de demain serait celui d'aujourd'hui.
    const theme = allThemes().find(t => t.id === 'thm_fr');
    const tirage = seed => S.buildSession(theme.events, realPool, { rng: seededRng(seed), count: 10 })
        .map(q => q.anchor.id).join(',');
    assert.notEqual(tirage(1), tirage(2));
});

test('une session ne repose jamais deux fois la même bonne réponse', () => {
    const theme = allThemes().find(t => t.id === 'thm_fr');
    const session = S.buildSession(theme.events, realPool, { rng: seededRng(11) });
    const ids = session.map(q => q.correct.id);
    assert.equal(new Set(ids).size, ids.length);
});

test('sur le pack français, aucune question ne s’auto-répond', () => {
    // La garde la plus utile du mode : proposer comme « ailleurs » l’ancre
    // elle-même, vue depuis un autre thème (6 % de la base est dupliquée).
    const rng = seededRng(99);
    const themes = allThemes().filter(t => (t.events || []).length >= 20).slice(0, 40);
    let posees = 0;
    themes.forEach(theme => {
        S.buildSession(theme.events, realPool, { rng, count: 6 }).forEach(q => {
            posees++;
            q.options.forEach(opt => {
                assert.ok(!S.titlesTooClose(opt.titre, q.anchor.titre),
                    `« ${opt.titre} » répond à « ${q.anchor.titre} » : c’est le même événement`);
                assert.notEqual(opt.tag, q.anchor.tag,
                    `« ${opt.titre} » porte la même étiquette que l’ancre « ${q.anchor.titre} »`);
            });
        });
    });
    assert.ok(posees > 100, `échantillon trop maigre pour conclure : ${posees} questions`);
});
