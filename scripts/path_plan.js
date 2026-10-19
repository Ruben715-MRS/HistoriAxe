#!/usr/bin/env node
// Le Chemin du Temps — PROPOSITION de mondes, mesurée sur le contenu réel (data/fr.json).
//
//   node scripts/path_plan.js            → écrit docs/chemin-du-temps-mondes.md
//
// Rien ici n'est encore jouable : c'est la liste à valider avant d'écrire les mondes dans
// js/pathCore.js (WORLDS). Pour chaque monde : ses bornes, les thèmes où il puise (mondes
// chrono-thématiques, sur le modèle des collections Belin), le nombre d'événements disponibles,
// un découpage en niveaux d'effectifs voisins (PathCore.sliceWindows : plus le temps est dense,
// plus les tranches sont courtes) et quelques repères que le tirage retiendrait en premier.

const fs = require('node:fs');
const path = require('node:path');
const PathCore = require('../js/pathCore.js');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'fr.json'), 'utf8'));

// --- Les thèmes, par identifiant ou par emplacement dans l'arbre ---------------------------
const themes = [];
(function walk(node, trail) {
    (node.themes || []).forEach((th) => themes.push({ id: th.id, nom: th.nom, trail, events: th.events || [] }));
    (node.subcategories || []).forEach((sub) => walk(sub, trail.concat(sub.nom)));
})({ subcategories: data.categories.filter((c) => !c.isCustomCategory) }, []);
const titleOf = new Map();
themes.forEach((th) => th.events.forEach((e) => titleOf.set(e.id, e.titre)));
const underPath = (...parts) => themes.filter((th) => parts.every((p) => th.trail.includes(p))).map((th) => th.id);

const G = {
    culture: ['thm_inv', 'thm_med', 'thm_explo', 'thm_art', 'thm_lit', 'thm_mus', 'thm_mon', 'thm_archi', 'thm_idees_philo',
        'thm_bat', 'thm_traites', 'thm_femmes', 'thm_sp', 'thm_gastro_mode', 'thm_rel', 'thm_christianisme_general',
        'thm_christianisme_catholicisme', 'thm_christianisme_protestantisme', 'thm_medias', 'thm_cine', 'thm_aero', 'thm_espace'],
    // L'histoire de France et les programmes français (collège, lycée, CAPES/agrégation).
    france: ['thm_fr', 'thm_ecf', 'thm_colafr', 'thm_19fr', 'thm_camp', 'thm_rev18', 'thm_renhum', 'thm_feod', 'thm_eccl',
        'thm_emp', 'thm_medi', 'thm_20s', 'thm_aut', 'thm_am']
        .concat(underPath('Programmes scolaires', 'France')),
    europe: underPath('Histoires nationales', 'Europe').concat(['thm_byz', 'thm_urss', 'thm_aho', 'thm_hes', 'thm_ebr', 'thm_por']),
    grece: ['thm_grc', 'thm_grccl', 'thm_gr', 'hggsp_pre_t1'],
    rome: ['thm_rom', 'thm_rome', 'thm_traj', 'thm_it', 'sec_t1'],
    orient: ['thm_eg', 'thm_myth_egyptienne', 'thm_myth_mesopotamienne', 'thm_irq', 'thm_ir', 'thm_isr', 'thm_histoire_juive_civile',
        'thm_tr', 'col_6e', 'thm_inv', 'thm_lit', 'thm_mon', 'thm_archi', 'thm_rel', 'thm_zoroastrisme'],
    chine: ['thm_chn', 'thm_cn', 'thm_confucianisme', 'thm_taoisme'],
    islam: ['thm_histoire_islam', 'thm_islam_sunnisme', 'thm_islam_chiisme', 'thm_ott'],
    ameriques: ['thm_maya', 'thm_azt', 'thm_inca'],
    afrique: underPath('Histoires nationales', 'Afrique'),
    japon: ['thm_jp', 'thm_shintoisme']
};
const FR = G.france.concat(G.europe, G.culture);

// --- La proposition --------------------------------------------------------------------------
// belin : le volume des collections Belin (Mondes anciens / Histoire de France) dont le monde reprend
// l'esprit, quand il y en a un. levels : nombre de niveaux ordinaires (le boss en plus).
const PLAN = [
    { id: 'monde0', title: 'Monde 0 · Le temps des historiens', note: 'Déjà jouable : la périodisation, sur des questions rédigées (js/pathLessons.js).', playable: true },
    { id: 'prehistoire', title: 'La Préhistoire', from: -3300000, to: -3300, essentialOnly: false, levels: 4,
        note: "Petit monde. Dates incertaines : à jouer surtout en ordre (Remise en ordre, Avant/Après) et au Curseur large. Doublons de dates à harmoniser d'abord (Chauvet -36 000 / -30 000, Lascaux -18 000 / -17 000)." },
    { id: 'orient', title: "L'Égypte et l'Orient ancien", belin: "L'Égypte des pharaons ; Le Proche-Orient", from: -3300, to: -800, themes: G.orient, levels: 6 },
    { id: 'grece', title: 'La Grèce antique', belin: 'La Grèce classique (510-336)', from: -800, to: -323, themes: G.grece, levels: 8 },
    { id: 'rome1', title: "Rome, naissance d'un empire", belin: 'Rome, naissance d\'un empire (753-70)', from: -753, to: -27, themes: G.rome, levels: 8 },
    { id: 'rome2', title: "Rome, la fin d'un empire", belin: "Rome, la fin d'un empire (212-fin du Ve s.)", from: -27, to: 477, themes: G.rome.concat(['thm_byz', 'thm_christianisme_general', 'thm_christianisme_orient']), levels: 8 },
    { id: 'haut-moyen-age', title: 'La France avant la France', belin: 'La France avant la France (481-888)', from: 481, to: 888, themes: FR.concat(G.islam), levels: 8 },
    { id: 'feodalites', title: 'Féodalités', belin: 'Féodalités (888-1180)', from: 888, to: 1180, themes: FR, levels: 8 },
    { id: 'capetiens', title: "L'âge d'or capétien", belin: "L'âge d'or capétien (1180-1328)", from: 1180, to: 1328, themes: FR, levels: 8 },
    { id: 'cent-ans', title: 'Le temps de la guerre de Cent Ans', belin: 'Le temps de la guerre de Cent Ans (1328-1453)', from: 1328, to: 1453, themes: FR, levels: 8 },
    { id: 'renaissances', title: 'Les Renaissances', belin: 'Les Renaissances (1453-1559)', from: 1453, to: 1559, themes: FR, levels: 10 },
    { id: 'religion', title: 'Les guerres de Religion', belin: 'Les guerres de Religion (1559-1629)', from: 1559, to: 1629, themes: FR, levels: 8 },
    { id: 'absolus', title: 'Les rois absolus', belin: 'Les rois absolus (1629-1715)', from: 1629, to: 1715, themes: FR, levels: 10 },
    { id: 'lumieres', title: 'La monarchie des Lumières', belin: 'La monarchie des Lumières (1715-1789)', from: 1715, to: 1789, themes: FR, levels: 10 },
    { id: 'revolution', title: 'Révolution, Consulat, Empire', belin: '(1789-1815)', from: 1789, to: 1815, themes: FR, levels: 10 },
    { id: 'revolution-inachevee', title: 'La Révolution inachevée', belin: 'La Révolution inachevée (1815-1870)', from: 1815, to: 1870, themes: FR, levels: 10 },
    { id: 'republique', title: 'La République et les empires', belin: '(1870-1914)', from: 1870, to: 1914, themes: FR, levels: 10 },
    { id: 'grande-guerre', title: 'La Grande Guerre', belin: 'Les grandes guerres (1914-1945), première moitié', from: 1914, to: 1919, themes: FR, levels: 5,
        note: 'Un niveau par année de guerre : le temps est si dense que la tranche se réduit à un an.' },
    { id: 'entre-deux-guerres', title: "De l'entre-deux-guerres à 1945", belin: 'Les grandes guerres (1914-1945), seconde moitié', from: 1919, to: 1946, themes: FR, levels: 10 },
    { id: 'trente-glorieuses', title: 'Guerre froide et Trente Glorieuses', from: 1946, to: 1974, themes: FR, levels: 10 },
    { id: 'crises', title: 'Crises et fin de la guerre froide', from: 1974, to: 1992, themes: FR, levels: 8 },
    { id: 'depuis-1991', title: 'Le monde depuis 1991', from: 1992, to: 2027, themes: FR, levels: 10 }
];
// Îles bonus, facultatives, à côté du chemin principal : la réponse au côté franco-centré.
const ISLANDS = [
    { id: 'chine', title: 'La Chine impériale', from: -2000, to: 1912, themes: G.chine, levels: 6 },
    { id: 'islam', title: "L'Islam et l'Empire ottoman", from: 570, to: 1924, themes: G.islam, levels: 6 },
    { id: 'ameriques', title: 'Les Amériques précolombiennes', from: -2000, to: 1600, themes: G.ameriques, levels: 5 },
    { id: 'afrique', title: "Histoires d'Afrique", from: -3000, to: 2027, themes: G.afrique, levels: 8 },
    { id: 'japon', title: 'Le Japon', from: -700, to: 2027, themes: G.japon, levels: 5 }
];

// --- Mesure --------------------------------------------------------------------------------
const events = PathCore.flattenEvents(data.categories);
const year = (y) => (y < 0 ? `${Math.abs(y).toLocaleString('fr-FR')} av. J.-C.` : String(y));
// Dernière année d'une fenêtre [from, to[ : to − 1 après J.-C. ; avant J.-C., on affiche la borne ronde.
const last = (to) => year(to > 0 ? to - 1 : to);
const span = (from, to) => (last(to) === year(from) ? year(from) : `${year(from)} à ${last(to)}`);

function measure(w) {
    const level = { from: w.from, to: w.to, themes: w.themes || null, essentialOnly: w.essentialOnly };
    const cands = PathCore.candidatesFor(level, events);
    const windows = PathCore.sliceWindows(cands, w.from, w.to, w.levels);
    const perLevel = windows.map((win) => PathCore.candidatesFor({ ...level, from: win.from, to: win.to }, events).length);
    const sample = PathCore.pickSpread(cands, 6, w.id).map((e) => `${year(e.date)} · ${titleOf.get(e.id)}`);
    return { cands: cands.length, essentials: cands.filter((e) => e.essential).length, windows, perLevel, sample };
}

function section(w, n) {
    const lines = [`### ${n}. ${w.title}`, ''];
    if (w.playable) return lines.concat([w.note, '']);
    const m = measure(w);
    lines.push(`- **Bornes** : ${span(w.from, w.to)}${w.belin ? ` — Belin : *${w.belin}*` : ''}`);
    lines.push(`- **Contenu** : ${m.cands} événements disponibles (dont ${m.essentials} incontournables)` +
        (w.themes ? `, puisés dans ${w.themes.length} thèmes` : ', tous thèmes confondus'));
    lines.push(`- **Niveaux proposés** : ${m.windows.length} + boss — ` +
        m.windows.map((win, i) => `${span(win.from, win.to)} (${m.perLevel[i]})`).join(' ; '));
    if (m.perLevel.some((c) => c < PathCore.LEVEL_POOL_SIZE)) lines.push(`- ⚠️ Un niveau a moins de ${PathCore.LEVEL_POOL_SIZE} événements : réduire le nombre de niveaux ou élargir les thèmes.`);
    if (w.note) lines.push(`- ${w.note}`);
    lines.push(`- **Repères tirés en premier** : ${m.sample.join(' ; ')}`);
    lines.push('');
    return lines;
}

const totalLevels = PLAN.concat(ISLANDS).reduce((s, w) => s + (w.levels ? w.levels + 1 : 8), 0);
const out = [
    '# Le Chemin du Temps — proposition de mondes (à valider)',
    '',
    '> Généré par `node scripts/path_plan.js` à partir de `data/fr.json` : les chiffres suivent le contenu.',
    '> Rien de ceci n\'est encore jouable, sauf le Monde 0 et l\'Antiquité actuelle (qui sera remplacée par',
    '> les mondes 2 à 5 ci-dessous).',
    '',
    '## Principes',
    '',
    '- **Mondes chrono-thématiques**, sur le modèle des collections Belin (*Mondes anciens*, *Histoire de France*) :',
    '  un monde a des bornes ET des thèmes où puiser. La Grèce et Rome se chevauchent dans le temps ; c\'est voulu',
    '  (« diviser le temps est un choix », idée n° 3 du Monde 0).',
    '- **Mondes de plus en plus courts** à mesure que le temps se densifie : 4 000 ans pour l\'Orient ancien,',
    '  5 ans pour la Grande Guerre.',
    '- **Niveaux d\'effectifs voisins** : le découpage proposé coupe là où les événements se répartissent également,',
    '  pas en tranches de durée égale. Les titres des niveaux restent à écrire une fois les mondes validés.',
    '- **Franco-centré assumé** pour le chemin principal (à partir de 481), avec l\'Europe et la culture générale',
    '  en contexte ; **îles bonus** facultatives pour le reste du monde.',
    `- **Taille** : ${PLAN.length} mondes sur le chemin principal (Monde 0 compris), ${ISLANDS.length} îles bonus, environ ${totalLevels} niveaux en tout.`,
    '',
    '## Le chemin principal',
    ''
];
PLAN.forEach((w, i) => out.push(...section(w, i)));
out.push('## Les îles bonus (facultatives)', '');
ISLANDS.forEach((w, i) => out.push(...section(w, String.fromCharCode(65 + i))));
out.push('## Questions à trancher', '',
    '1. **Antiquité** : remplacer le monde actuel (un seul monde, -800 → 476, tous thèmes) par Orient / Grèce / Rome ×2 ?',
    '2. **XXe siècle** : couper 1914-1945 en deux et 1945-1991 en deux, comme ici, ou suivre exactement Belin ?',
    '3. **Îles bonus** : lesquelles, et à partir de quand les ouvrir (dès le début, ou après tel monde) ?',
    '4. **Titres des niveaux** : je propose un premier jet par monde validé, que tu corriges.',
    '');

fs.writeFileSync(path.join(root, 'docs', 'chemin-du-temps-mondes.md'), out.join('\n'));
console.log(`docs/chemin-du-temps-mondes.md : ${PLAN.length} mondes, ${ISLANDS.length} îles, ~${totalLevels} niveaux`);
