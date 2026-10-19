#!/usr/bin/env node
// Le Chemin du Temps — les MONDES : définition, découpage en niveaux, et mesure sur le contenu réel.
//
//   node scripts/path_plan.js          → écrit docs/chemin-du-temps-mondes.md (lecture seule, pour relire)
//   node scripts/path_plan.js --write  → écrit aussi js/pathWorlds.js, le fichier que le jeu lit
//   node scripts/path_plan.js --titles → liste, pour chaque niveau, ses repères les plus connus
//                                        (aide à la rédaction des titres de ui/fr.json)
//
// ⚠️ Les bornes des niveaux sont FIGÉES dans js/pathWorlds.js : l'identifiant d'un niveau (`grece-3`) et les
// étoiles que les joueurs ont gagnées dessus en dépendent. Régénérer ce fichier après un ajout de contenu
// déplacerait les bornes et donc les niveaux : on ne le fait que pour un nouveau monde, en gardant les
// bornes des mondes existants (ou avec une migration de la progression).
//
// Pourquoi des « tiers » : les dates du jeu sont des ANNÉES. Deux événements de 1916 ne se départagent pas, et
// plusieurs modes ne gardent qu'un événement par année : un niveau doit couvrir plusieurs années (au moins
// PathCore.MIN_LEVEL_YEARS). Pour les périodes denses, on ne coupe donc pas plus fin : une même tranche donne
// plusieurs niveaux (tiers), le premier sur les événements les plus connus, le suivant sur les suivants.

const fs = require('node:fs');
const path = require('node:path');
const PathCore = require('../js/pathCore.js');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'fr.json'), 'utf8'));
const args = process.argv.slice(2);

// --- Les thèmes, par identifiant ou par emplacement dans l'arbre ---------------------------
const themes = [];
(function walk(node, trail) {
    (node.themes || []).forEach((th) => themes.push({ id: th.id, nom: th.nom, trail, events: th.events || [] }));
    (node.subcategories || []).forEach((sub) => walk(sub, trail.concat(sub.nom)));
})({ subcategories: data.categories.filter((c) => !c.isCustomCategory) }, []);
const titleOf = new Map();
themes.forEach((th) => th.events.forEach((e) => titleOf.set(e.id, e.titre)));
const known = new Set(themes.map((th) => th.id));
const underPath = (...parts) => themes.filter((th) => parts.every((p) => th.trail.includes(p))).map((th) => th.id);
const only = (ids) => ids.filter((id) => known.has(id));

// Groupes de thèmes où puisent les mondes (chrono-thématiques : chacun a ses bornes ET ses thèmes).
const GROUPS = {
    culture: only(['thm_inv', 'thm_med', 'thm_explo', 'thm_art', 'thm_lit', 'thm_mus', 'thm_mon', 'thm_archi', 'thm_idees_philo',
        'thm_bat', 'thm_traites', 'thm_femmes', 'thm_sp', 'thm_gastro_mode', 'thm_rel', 'thm_christianisme_general',
        'thm_christianisme_catholicisme', 'thm_christianisme_protestantisme', 'thm_medias', 'thm_cine', 'thm_aero', 'thm_espace']),
    // L'histoire de France et les programmes français (collège, lycée, CAPES/agrégation).
    france: only(['thm_fr', 'thm_ecf', 'thm_colafr', 'thm_19fr', 'thm_camp', 'thm_rev18', 'thm_renhum', 'thm_feod', 'thm_eccl',
        'thm_emp', 'thm_medi', 'thm_20s', 'thm_aut', 'thm_am']).concat(underPath('Programmes scolaires', 'France')),
    europe: underPath('Histoires nationales', 'Europe').concat(only(['thm_byz', 'thm_urss', 'thm_aho', 'thm_hes', 'thm_ebr', 'thm_por'])),
    grece: only(['thm_grc', 'thm_grccl', 'thm_gr', 'hggsp_pre_t1']),
    rome: only(['thm_rom', 'thm_rome', 'thm_traj', 'thm_it', 'sec_t1']),
    orient: only(['thm_eg', 'thm_irq', 'thm_ir', 'thm_isr', 'thm_histoire_juive_civile',
        'thm_tr', 'col_6e', 'thm_inv', 'thm_lit', 'thm_mon', 'thm_archi', 'thm_rel', 'thm_zoroastrisme']),
    byzance: only(['thm_byz', 'thm_christianisme_general', 'thm_christianisme_orient']),
    chine: only(['thm_chn', 'thm_cn', 'thm_confucianisme', 'thm_taoisme']),
    islam: only(['thm_histoire_islam', 'thm_islam_sunnisme', 'thm_islam_chiisme', 'thm_ott']),
    ameriques: only(['thm_maya', 'thm_azt', 'thm_inca']),
    afrique: underPath('Histoires nationales', 'Afrique'),
    japon: only(['thm_jp', 'thm_shintoisme'])
};
const FR = ['france', 'europe', 'culture'];

// --- Les mondes ------------------------------------------------------------------------------
// belin : le volume des collections Belin (Mondes anciens / Histoire de France) dont le monde reprend l'esprit.
// count : nombre de tranches de temps (au plus : les tranches trop étroites sont fondues) ; tiers : niveaux par
// tranche ; maxPerDate : événements d'une même année dans un niveau (2 par défaut, 3 en période dense).
const PLAN = [
    { id: 'prehistoire', icon: '🦣', title: 'La Préhistoire', from: -3300000, to: -3300, count: 3, maxPerDate: 3, essentialOnly: false,
        note: "Petit monde. Dates incertaines : à jouer surtout en ordre (Remise en ordre, Avant/Après) et au Curseur large. Les doublons de dates (Chauvet, Lascaux) ont été harmonisés dans data/fr.json." },
    { id: 'orient', icon: '🔺', title: "L'Égypte et l'Orient ancien", belin: "L'Égypte des pharaons ; Le Proche-Orient", from: -3300, to: -800, themes: ['orient'], count: 6 },
    { id: 'grece', icon: '🏛️', title: 'La Grèce antique', belin: 'La Grèce classique (510-336)', from: -800, to: -322, themes: ['grece'], count: 8 },
    { id: 'rome1', icon: '🐺', title: "Rome, naissance d'un empire", belin: "Rome, naissance d'un empire (753-70)", from: -753, to: -26, themes: ['rome'], count: 7 },
    { id: 'rome2', icon: '🦅', title: "Rome, la fin d'un empire", belin: "Rome, la fin d'un empire (212-fin du Ve s.)", from: -26, to: 477, themes: ['rome', 'byzance'], count: 8 },
    { id: 'haut-moyen-age', icon: '👑', title: 'La France avant la France', belin: 'La France avant la France (481-888)', from: 481, to: 888, themes: FR, count: 8 },
    { id: 'feodalites', icon: '🏰', title: 'Féodalités', belin: 'Féodalités (888-1180)', from: 888, to: 1180, themes: FR, count: 8 },
    { id: 'capetiens', icon: '⚜️', title: "L'âge d'or capétien", belin: "L'âge d'or capétien (1180-1328)", from: 1180, to: 1328, themes: FR, count: 6 },
    { id: 'cent-ans', icon: '⚔️', title: 'Le temps de la guerre de Cent Ans', belin: 'Le temps de la guerre de Cent Ans (1328-1453)', from: 1328, to: 1453, themes: FR, count: 7 },
    { id: 'renaissances', icon: '🎨', title: 'Les Renaissances', belin: 'Les Renaissances (1453-1559)', from: 1453, to: 1559, themes: FR, count: 8 },
    { id: 'religion', icon: '🕯️', title: 'Les guerres de Religion', belin: 'Les guerres de Religion (1559-1629)', from: 1559, to: 1629, themes: FR, count: 7 },
    { id: 'absolus', icon: '☀️', title: 'Les rois absolus', belin: 'Les rois absolus (1629-1715)', from: 1629, to: 1715, themes: FR, count: 8 },
    { id: 'lumieres', icon: '💡', title: 'La monarchie des Lumières', belin: 'La monarchie des Lumières (1715-1789)', from: 1715, to: 1789, themes: FR, count: 7 },
    { id: 'revolution', icon: '🔔', title: 'Révolution, Consulat, Empire', belin: '(1789-1815)', from: 1789, to: 1815, themes: FR, count: 3, tiers: 2, maxPerDate: 3 },
    { id: 'revolution-inachevee', icon: '🚂', title: 'La Révolution inachevée', belin: 'La Révolution inachevée (1815-1870)', from: 1815, to: 1870, themes: FR, count: 5, tiers: 2, maxPerDate: 3 },
    { id: 'republique', icon: '🗼', title: 'La République et les empires', belin: '(1870-1914)', from: 1870, to: 1914, themes: FR, count: 4, tiers: 2, maxPerDate: 3 },
    { id: 'grande-guerre', icon: '🪖', title: 'La Grande Guerre', belin: 'Les grandes guerres (1914-1945), première moitié', from: 1914, to: 1920, shownTo: 1919, themes: FR, count: 1, tiers: 3, maxPerDate: 3,
        note: "Étendu jusqu'à 1919 : le traité de Versailles est la fin officielle de la guerre (l'armistice de 1918 n'en est que la fin des combats). Une seule tranche de 6 ans : trois niveaux qui creusent de plus en plus." },
    { id: 'entre-deux-guerres', icon: '📻', title: "De l'entre-deux-guerres à 1945", belin: 'Les grandes guerres (1914-1945), seconde moitié', from: 1920, to: 1946, themes: FR, count: 3, tiers: 2, maxPerDate: 3 },
    { id: 'trente-glorieuses', icon: '🚀', title: 'Guerre froide et Trente Glorieuses', from: 1946, to: 1974, themes: FR, count: 3, tiers: 2, maxPerDate: 3 },
    { id: 'crises', icon: '🧱', title: 'Crises et fin de la guerre froide', from: 1974, to: 1992, themes: FR, count: 2, tiers: 2, maxPerDate: 3 },
    { id: 'depuis-1991', icon: '🌐', title: 'Le monde depuis 1991', from: 1992, to: 2027, shownTo: 2026, themes: FR, count: 4, tiers: 2, maxPerDate: 3 },
    // Îles bonus : facultatives, ouvertes à la moitié de leur monde d'attache pour casser la monotonie d'une époque.
    { id: 'ile-chine', icon: '🐉', island: true, parent: 'grece', title: 'La Chine impériale', from: -2000, to: 1912, themes: ['chine'], count: 6 },
    { id: 'ile-ameriques', icon: '🌽', island: true, parent: 'haut-moyen-age', title: 'Les Amériques précolombiennes', from: -2000, to: 1600, themes: ['ameriques'], count: 5 },
    { id: 'ile-islam', icon: '🕌', island: true, parent: 'feodalites', title: "L'Islam et l'Empire ottoman", from: 570, to: 1924, themes: ['islam'], count: 6 },
    { id: 'ile-japon', icon: '🗾', island: true, parent: 'renaissances', title: 'Le Japon', from: -700, to: 2027, shownTo: 2026, themes: ['japon'], count: 5 },
    { id: 'ile-afrique', icon: '🌍', island: true, parent: 'republique', title: "Histoires d'Afrique", from: -3000, to: 1963, shownTo: 1962, themes: ['afrique'], count: 5,
        note: "S'arrête aux indépendances : après 1962, les thèmes africains ne racontent presque que des coups d'État et des constitutions, trop répétitifs pour des niveaux." }
];

// --- Mesure --------------------------------------------------------------------------------
const events = PathCore.flattenEvents(data.categories);
const year = (y) => (y < 0 ? `${Math.abs(y).toLocaleString('fr-FR')} av. J.-C.` : String(y));
const last = (to) => year(to > 0 ? to - 1 : to);
const span = (from, to) => (last(to) === year(from) ? year(from) : `${year(from)} à ${last(to)}`);

function levelOf(w, win) {
    const groupIds = [];
    (w.themes || []).forEach((g) => GROUPS[g].forEach((id) => { if (!groupIds.includes(id)) groupIds.push(id); }));
    return { from: win.from, to: win.to, themes: groupIds.length ? groupIds : null, essentialOnly: w.essentialOnly };
}

function measure(w) {
    const cands = PathCore.candidatesFor(levelOf(w, { from: w.from, to: w.to }), events);
    const windows = PathCore.sliceWindows(cands, w.from, w.to, w.count);
    const cap = w.maxPerDate || PathCore.MAX_PER_DATE;
    const perWindow = windows.map((win) => {
        const c = PathCore.candidatesFor(levelOf(w, win), events);
        const years = {};
        c.forEach((e) => { years[e.date] = Math.min(cap, (years[e.date] || 0) + 1); });
        return { playable: Object.keys(years).reduce((n, y) => n + years[y], 0), total: c.length, years: Object.keys(years).length };
    });
    return { cands: cands.length, essentials: cands.filter((e) => e.essential).length, windows, perWindow };
}

function section(w, n) {
    const m = measure(w);
    const tiers = w.tiers || 1;
    const lines = [`### ${n}. ${w.title}`, ''];
    const levels = m.windows.length * tiers;
    lines.push(`- **Bornes** : ${span(w.from, w.to)}${w.shownTo ? ` (jusqu'à ${w.shownTo})` : ''}${w.belin ? ` — Belin : *${w.belin}*` : ''}`);
    lines.push(`- **Contenu** : ${m.cands} événements disponibles (dont ${m.essentials} incontournables)` +
        (w.themes ? `, puisés dans ${w.themes.map((g) => GROUPS[g].length).reduce((a, b) => a + b, 0)} thèmes` : ', tous thèmes confondus'));
    lines.push(`- **Niveaux** : ${levels} + boss` + (tiers > 1 ? ` (${m.windows.length} tranche${m.windows.length > 1 ? 's' : ''} × ${tiers} niveaux, du plus connu au plus pointu)` : '') +
        (w.parent ? ` — **île** : s'ouvre à la moitié de « ${PLAN.find((x) => x.id === w.parent).title} »` : ''));
    lines.push(`- **Tranches** : ` + m.windows.map((win, i) => `${span(win.from, win.to)} (${m.perWindow[i].playable})`).join(' ; '));
    if (m.perWindow.some((c) => c.playable < PathCore.LEVEL_POOL_SIZE * tiers)) {
        lines.push(`- ⚠️ Une tranche a moins de ${PathCore.LEVEL_POOL_SIZE * tiers} événements jouables : les derniers niveaux seront plus courts.`);
    }
    if (w.note) lines.push(`- ${w.note}`);
    lines.push('');
    return { lines, windows: m.windows, levels };
}

const sections = PLAN.map((w) => {
    const islandIndex = PLAN.filter((x) => x.island).indexOf(w);
    const mainIndex = PLAN.filter((x) => !x.island).indexOf(w);
    return { w, ...section(w, w.island ? String.fromCharCode(65 + islandIndex) : mainIndex + 1) };
});
const total = sections.reduce((s, x) => s + x.levels + 1, 0);
const out = [
    '# Le Chemin du Temps — les mondes',
    '',
    '> Généré par `node scripts/path_plan.js` à partir de `data/fr.json` (les chiffres suivent le contenu). Les bornes',
    '> des niveaux sont figées dans `js/pathWorlds.js` (`--write`) : voir l\'avertissement en tête du script.',
    '',
    '## Principes',
    '',
    '- **Mondes chrono-thématiques**, sur le modèle des collections Belin (*Mondes anciens*, *Histoire de France*) :',
    '  un monde a des bornes ET des thèmes où puiser. La Grèce et Rome se chevauchent dans le temps ; c\'est voulu',
    '  (« diviser le temps est un choix », idée n° 3 du Monde 0).',
    '- **Mondes de plus en plus courts** à mesure que le temps se densifie : 3 millions d\'années pour la Préhistoire,',
    '  6 ans pour la Grande Guerre.',
    '- **Une limite des données** : les dates du jeu sont des années. Deux événements de 1916 ne se départagent pas,',
    '  et plusieurs modes ne gardent qu\'un événement par année. Un niveau couvre donc au moins 6 années et au plus',
    '  2 événements par année (3 en période dense). Pour les périodes denses, on ne coupe pas plus fin :',
    '  une même tranche donne plusieurs niveaux (« tiers »), du plus connu au plus pointu.',
    '- **Franco-centré assumé** pour le chemin principal (à partir de 481), avec l\'Europe et la culture générale en',
    '  contexte ; **îles bonus** facultatives pour le reste du monde, ouvertes à la moitié d\'un monde.',
    `- **Taille** : ${PLAN.filter((w) => !w.island).length} mondes sur le chemin principal (Monde 0 en plus), ${PLAN.filter((w) => w.island).length} îles bonus, ${total} niveaux (boss compris) hors Monde 0.`,
    '',
    '## Le chemin principal',
    '',
    '### 0. Monde 0 · Le temps des historiens',
    '',
    'La périodisation, sur des questions rédigées (`js/pathLessons.js`) : voir le README.',
    ''
];
sections.filter((x) => !x.w.island).forEach((x) => out.push(...x.lines));
out.push('## Les îles bonus (facultatives)', '');
sections.filter((x) => x.w.island).forEach((x) => out.push(...x.lines));
fs.writeFileSync(path.join(root, 'docs', 'chemin-du-temps-mondes.md'), out.join('\n'));
console.log(`docs/chemin-du-temps-mondes.md : ${PLAN.filter((w) => !w.island).length} mondes, ${PLAN.filter((w) => w.island).length} îles, ${total} niveaux`);

// --- js/pathWorlds.js ---------------------------------------------------------------------------
if (args.includes('--write')) {
    const wrap = (ids) => {
        const lines = [];
        let line = '            ';
        ids.forEach((id, i) => {
            const item = `'${id}'${i < ids.length - 1 ? ',' : ''}`;
            if ((line + item).length > 118) { lines.push(line.trimEnd()); line = '            '; }
            line += item + ' ';
        });
        lines.push(line.trimEnd());
        return lines.join('\n');
    };
    const worlds = sections.map(({ w, windows }) => {
        const parts = [`id: '${w.id}'`, `icon: '${w.icon}'`];
        if (w.island) parts.push('island: true', `parent: '${w.parent}'`);
        if (w.themes) parts.push(`themes: [${w.themes.map((g) => `'${g}'`).join(', ')}]`);
        if (w.tiers) parts.push(`tiers: ${w.tiers}`);
        if (w.maxPerDate) parts.push(`maxPerDate: ${w.maxPerDate}`);
        if (w.essentialOnly !== undefined) parts.push(`essentialOnly: ${w.essentialOnly}`);
        const wins = windows.map((win, i) => {
            const shown = i === windows.length - 1 && w.shownTo ? w.shownTo : (win.to > 0 ? win.to - 1 : win.to);
            return `[${win.from}, ${win.to}${shown !== win.to ? ', ' + shown : ''}]`;
        });
        return `            {\n                ${parts.join(', ')},\n                windows: [${wins.join(', ')}]\n            }`;
    });
    const groups = Object.keys(GROUPS).map((g) => `        ${g}: [\n${wrap(GROUPS[g])}\n        ]`);
    const file = `// =========================================================================
// === LE CHEMIN DU TEMPS — DÉFINITION DES MONDES (généré, FIGÉ) ===
// =========================================================================
// Généré par \`node scripts/path_plan.js --write\`. Ne pas modifier à la main ; ne pas régénérer pour suivre un
// ajout de contenu : les bornes des niveaux sont figées, parce que l'identifiant d'un niveau (\`grece-3\`) et les
// étoiles gagnées dessus en dépendent. Pour un nouveau monde, l'ajouter au script en gardant les bornes des autres.
//
//  - \`GROUPS\` : des groupes de thèmes (identifiants de data/fr.json) où puisent les mondes ;
//  - \`WORLDS\` : le chemin principal dans l'ordre, puis les îles ; \`windows\` : les tranches de temps
//    [début, fin exclue, dernière année à afficher si elle diffère] ; \`tiers\` : niveaux par tranche.
// js/pathCore.js en tire les niveaux, leurs épreuves et leurs événements.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PathWorlds = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var GROUPS = {
${groups.join(',\n')}
    };

    var WORLDS = [
${worlds.join(',\n')}
    ];

    return { GROUPS: GROUPS, WORLDS: WORLDS };
}));
`;
    fs.writeFileSync(path.join(root, 'js', 'pathWorlds.js'), file);
    console.log('js/pathWorlds.js écrit');
}

// --- Aide aux titres --------------------------------------------------------------------------
// À lancer APRÈS --write (dans une autre exécution) : lit les niveaux tels que le jeu les construit.
if (args.includes('--titles')) {
    const byId = new Map(events.map((e) => [e.id, e]));
    const lines = [];
    PathCore.WORLDS.filter((w) => w.id !== 'monde0').forEach((w) => {
        const pools = PathCore.buildWorldPools(w, events);
        PathCore.levelsOf(w).forEach((l) => {
            const picked = (pools[l.id] || []).map((id) => byId.get(id));
            const top = picked.slice().sort((a, b) => (b.fame - a.fame) || (b.essential - a.essential)).slice(0, 5);
            const where = l.boss ? 'boss' : `${span(l.from, l.to)}${l.tier !== undefined && (w.levels.length > 0 && w.levels.filter((x) => x.from === l.from).length > 1) ? ` tier ${l.tier + 1}` : ''}`;
            lines.push(`${l.id} [${where}] : ` + top.map((e) => `${year(e.date)} ${titleOf.get(e.id)}`).join(' | '));
        });
        lines.push('');
    });
    fs.writeFileSync(process.env.TITLES_OUT || path.join(root, 'docs', '.titres-brouillon.txt'), lines.join('\n'));
    console.log('titres : brouillon écrit');
}
