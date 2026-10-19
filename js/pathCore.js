// =========================================================================
// === LE CHEMIN DU TEMPS — MOTEUR PUR (niveaux, étoiles, déblocage) ===
// =========================================================================
// Un parcours commun, du premier au dernier niveau, que tous les joueurs suivent dans le même
// ordre : des MONDES (une époque chacun), des NIVEAUX (une tranche de temps, quelques épreuves
// courtes) et un BOSS en fin de monde. Ce module ne touche ni au DOM ni au stockage : il décide
// quels événements composent chaque niveau, combien d'étoiles vaut une partie et ce qui est
// débloqué. L'écran est dans js/app/path.js ; les épreuves sont celles de l'Expédition
// (js/app/expedition.js).
//
// Le contenu d'un niveau est DÉTERMINISTE : même niveau, mêmes événements, pour tous les joueurs
// et à chaque visite (c'est ce qui en fait une « mission » et non un tirage). Il est dérivé des
// événements « incontournables » des thèmes (`theme.essentiel`) : aucun contenu à saisir à la
// main, et un événement ajouté au pack peut entrer dans un niveau sans toucher à ce fichier.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PathCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Les mondes « tirés » (tous sauf le Monde 0) sont décrits dans js/pathWorlds.js : bornes des niveaux figées,
    // thèmes, îles. Ce module en tire les niveaux, leurs épreuves et leurs événements.
    var DEFS = (typeof require === 'function' && typeof module === 'object' && module.exports)
        ? require('./pathWorlds.js')
        : (typeof self !== 'undefined' ? self : this).PathWorlds;

    // Événements par niveau ordinaire, et pour le boss d'un monde tiré.
    var LEVEL_POOL_SIZE = 12;
    var BOSS_POOL_SIZE = 20;
    var MAX_STARS = 3;
    // Événements d'une même année dans un niveau : au plus 2. Les dates du jeu sont des ANNÉES : plusieurs
    // événements de 1916 ne se départagent pas (les modes qui comparent des dates n'en gardent qu'un), donc un
    // niveau a besoin de plusieurs années différentes. D'où aussi la largeur minimale d'un niveau (MIN_LEVEL_YEARS).
    var MAX_PER_DATE = 2;
    // Dans une période très dense, un monde peut en accepter 3 (`maxPerDate` du monde).
    var MIN_LEVEL_YEARS = 6;
    // Plafond de la notoriété : au-delà de 3 thèmes, un événement est connu, inutile de départager.
    var FAME_CAP = 3;
    // Même exclusion que les défis (calendrier non grégorien : js/dailyEngine.js).
    var EXCLUDED_THEME_IDS = ['thm_histoire_juive_hebraique'];

    // Épreuves d'un niveau : des modes de l'Expédition qui fonctionnent sur un vivier mêlant
    // plusieurs thèmes (pas d'« Intrus », qui s'appuie sur les axes d'un seul thème).
    var STAGES_EASY = ['quiz', 'avantapres', 'classic'];
    var STAGES_MEDIUM = ['quiz', 'classic', 'periodes'];
    var STAGES_HARD = ['avantapres', 'classic', 'curseur'];
    var STAGES_LAST = ['classic', 'periodes', 'ordre'];
    var STAGES_BOSS = ['quiz', 'avantapres', 'classic', 'periodes', 'curseur', 'ordre'];

    // Une épreuve est un mode de l'Expédition (chaîne) ou une LEÇON : questions écrites à la main, tirées
    // d'une ou plusieurs séries de js/pathLessons.js ({ mode: 'lecon', set, take }).
    function lesson(set, take) { return take ? { mode: 'lecon', set: set, take: take } : { mode: 'lecon', set: set }; }
    function stageMode(stage) { return typeof stage === 'string' ? stage : stage && stage.mode; }

    // Événements choisis à la main pour le Monde 0 : des repères que tout le monde connaît, à des années
    // toutes différentes. Leur seul rôle : apprendre à jouer, puis servir d'exemples.
    var M0_TUTORIAL = ['mon27', 'rom1', 'rom73', 'fr41', 'chr75', 'exp10', 'fr132', '3e_47'];
    var M0_AROUND_ZERO = ['sp1', 'rom1', 'b1', 'b6', 'rom73', 'rom81', 'chr6', 'rom100', 'fr41'];
    var M0_CENTURIES = M0_TUTORIAL.concat(['b1', 'b14', 'b40', '3e_6', 'de44']);
    // Les bornes du thème « Périodisation historique » (Programmes scolaires › Seconde).
    var M0_BORNES = ['sp_11', 'sp_1', 'sp_8', 'sp_2', 'sp_9', 'sp_10', 'sp_3', 'sp_4', 'sp_5', 'sp_12', 'sp_6', 'sp_7'];

    // `to` est exclusif (`shownTo`, s'il existe, est la dernière année à afficher). Les titres sont dans ui/<lang>.json (path.worlds.<monde>.levels.<n>).
    //
    // Un monde se débloque quand le boss du précédent est vaincu (ou quand le joueur choisit de passer le
    // précédent, s'il est `skippable`). Options d'un niveau (ou de tout le monde) :
    //  - `ids` : les événements, choisis à la main (sinon : tirage dans la fenêtre `from`…`to`) ;
    //  - `themes` : ne tirer que dans ces thèmes (mondes chrono-thématiques : « la Grèce », « Rome »…) ;
    //  - `essentialOnly` : ne tirer que les incontournables (par défaut, oui sans `themes`, non avec).
    var WORLDS = [
        {
            // Monde 0 : la périodisation, chapitre introductif de Seconde — et le tutoriel du jeu.
            id: 'monde0',
            icon: '⏳',
            skippable: true,
            bossStarsRequired: 10,
            levels: [
                // Le premier niveau se joue tout de suite, sans leçon : apprendre en jouant.
                { n: 1, ids: M0_TUTORIAL, stages: ['avantapres', 'classic'] },
                { n: 2, ids: M0_AROUND_ZERO, stages: [lesson('ere'), 'avantapres'] },
                { n: 3, stages: [lesson('eres'), lesson('gregorien')] },
                { n: 4, stages: [lesson('calendriers'), lesson('cycles')] },
                { n: 5, ids: M0_CENTURIES, stages: [lesson('siecles'), 'periodes'] },
                { n: 6, stages: [lesson('chrononymes'), lesson('echelles')] },
                { n: 7, ids: M0_BORNES, stages: [lesson('bornes'), 'classic'] }
            ],
            boss: {
                ids: M0_BORNES.concat(['mon27', 'rom1', 'rom73', 'chr75', '3e_47']),
                stages: [lesson(['ere', 'eres', 'gregorien', 'calendriers', 'cycles', 'siecles', 'chrononymes', 'echelles', 'bornes'], 8), 'classic', 'ordre']
            }
        },
    ];

    // --- Les mondes tirés (js/pathWorlds.js) ---------------------------------------------------------
    // Épreuves selon la difficulté : 0 facile → 3 la plus dure.
    var STAGES_BY_TIER = [STAGES_EASY, STAGES_MEDIUM, STAGES_HARD, STAGES_LAST];

    function themeIdsOf(def) {
        var ids = [];
        (def.themes || []).forEach(function (group) {
            (DEFS.GROUPS[group] || []).forEach(function (id) { if (ids.indexOf(id) === -1) ids.push(id); });
        });
        return ids.length ? ids : null;
    }

    // Un monde du fichier de définitions → un monde du Chemin. Chaque tranche (`windows`) donne `tiers`
    // niveaux (par défaut 1) : le premier prend les événements les plus connus de la tranche, le suivant les
    // suivants, etc. — c'est ainsi qu'une période dense compte plus de niveaux sans tranches plus étroites que
    // les années du jeu ne le permettent (MIN_LEVEL_YEARS). La difficulté monte avec la place du monde dans le
    // Chemin (`rank` sur `count` mondes) puis, dans un monde, avec le niveau.
    function buildWorld(def, rank, count) {
        var themes = themeIdsOf(def);
        var levels = [];
        var tiers = def.tiers || 1;
        def.windows.forEach(function (w) {
            for (var t = 0; t < tiers; t++) {
                levels.push({ n: levels.length + 1, from: w[0], to: w[1], shownTo: w[2], tier: t, window: levels.length });
            }
        });
        levels.forEach(function (l, i) {
            var g = (rank + i / levels.length) / count;
            var base = g < 0.2 ? 0 : g < 0.5 ? 1 : g < 0.8 ? 2 : 3;
            l.stages = STAGES_BY_TIER[Math.min(3, base + (l.tier || 0))];
            delete l.window;
        });
        var world = {
            id: def.id, icon: def.icon, themes: themes, maxPerDate: def.maxPerDate, essentialOnly: def.essentialOnly,
            levels: levels,
            // La moitié des étoiles des niveaux ordinaires ouvre le boss.
            bossStarsRequired: Math.ceil(levels.length * MAX_STARS / 2),
            boss: { stages: STAGES_BOSS },
            from: def.windows[0][0], to: def.windows[def.windows.length - 1][1]
        };
        if (def.island) {
            world.island = true;
            world.parent = def.parent;
            // Une île s'ouvre à la moitié de son monde d'attache : le joueur y change d'époque et de lieu.
            world.opensAfter = def.opensAfter;
        }
        return world;
    }

    if (DEFS) {
        var mains = DEFS.WORLDS.filter(function (d) { return !d.island; });
        mains.forEach(function (d, i) { WORLDS.push(buildWorld(d, i, mains.length)); });
        DEFS.WORLDS.filter(function (d) { return d.island; }).forEach(function (d) {
            var parentRank = Math.max(0, mains.map(function (m) { return m.id; }).indexOf(d.parent));
            var world = buildWorld(d, parentRank, mains.length);
            var parent = WORLDS.filter(function (w) { return w.id === d.parent; })[0];
            world.opensAfter = parent ? Math.max(1, Math.floor(parent.levels.length / 2)) : 1;
            WORLDS.push(world);
        });
    }

    function levelId(world, n) { return world.id + '-' + n; }
    function bossId(world) { return world.id + '-boss'; }
    function isBossId(id) { return /-boss$/.test(String(id)); }

    function findWorld(id) {
        for (var i = 0; i < WORLDS.length; i++) if (WORLDS[i].id === id) return WORLDS[i];
        return null;
    }

    // Tous les niveaux d'un monde dans l'ordre du parcours, boss compris.
    function levelsOf(world) {
        var out = world.levels.map(function (l) {
            return {
                id: levelId(world, l.n), n: l.n, from: l.from, to: l.to, shownTo: l.shownTo, stages: l.stages, boss: false,
                ids: l.ids || null, themes: l.themes || world.themes || null, tier: l.tier || 0,
                maxPerDate: world.maxPerDate || MAX_PER_DATE,
                essentialOnly: l.essentialOnly !== undefined ? l.essentialOnly : world.essentialOnly
            };
        });
        out.push({
            id: bossId(world), n: world.levels.length + 1, from: world.from, to: world.to, stages: world.boss.stages, boss: true,
            ids: world.boss.ids || null, themes: world.themes || null, essentialOnly: world.essentialOnly,
            maxPerDate: world.maxPerDate || MAX_PER_DATE
        });
        return out;
    }

    // Un niveau fait-il jouer des événements (et pas seulement des leçons) ?
    function levelNeedsEvents(level) {
        return (level.stages || []).some(function (s) { return stageMode(s) !== 'lecon'; });
    }

    // --- Contenu --------------------------------------------------------------

    // Hachage stable (FNV-1a) → [0, 1[ : le « tirage » d'un événement pour un niveau.
    function rank(str) {
        var h = 2166136261;
        for (var i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return ((h >>> 0) % 1000003) / 1000003;
    }

    // Les noms propres d'un titre : mots à majuscule de 4 lettres ou plus, hors premier mot (« Fondation… »
    // commence par une majuscule sans être un nom). Un nom propre cité en début de titre par un autre
    // événement (« Aristote fonde le Lycée ») est retrouvé par `sharesName`.
    function titleWords(title) {
        var words = String(title || '').split(/[^A-Za-zÀ-ÖØ-öø-ÿ]+/).filter(Boolean);
        return words.map(function (w, i) { return { w: w, first: i === 0 }; })
            .filter(function (x) { return x.w.length >= 4 && /^[A-ZÀ-Ö]/.test(x.w); });
    }
    // Mots trop courants pour identifier un fait (« Guerre », « Traité »…) : deux événements de la même année qui ne
    // partagent que ceux-là ne sont pas le même fait.
    var GENERIC_WORDS = ['Guerre', 'Grande', 'Première', 'Seconde', 'Mondiale', 'Mondial', 'Empire', 'Royaume', 'République',
        'Révolution', 'Traité', 'Bataille', 'Paix', 'Conférence', 'Église', 'Nations', 'États', 'Unis', 'Union', 'Europe',
        'Européenne', 'Monde', 'France', 'Française', 'Français', 'Roi', 'Reine', 'Saint', 'Sainte', 'Premier', 'Deuxième',
        'Troisième', 'Fondation', 'Début', 'Fin', 'Mort', 'Naissance', 'Chute', 'Indépendance', 'Création'];
    // Les mots qui portent le sens d'un titre (minuscules, 4 lettres ou plus, sans mots-outils) : deux titres dont
    // la moitié des mots sont communs racontent le même fait (« Procès et mort de Socrate » / « Procès et
    // condamnation de Socrate »).
    var TOOL_WORDS = ['dans', 'pour', 'avec', 'sous', 'leur', 'leurs', 'cette', 'ainsi', 'entre', 'après', 'avant', 'vers', 'chez', 'sont', 'plus'];
    function significantWords(title) {
        var out = {};
        String(title || '').toLowerCase().split(/[^a-zà-öø-ÿ]+/).forEach(function (w) {
            if (w.length >= 4 && TOOL_WORDS.indexOf(w) === -1) out[w] = true;
        });
        return out;
    }
    function similarTitles(a, b) {
        var keys = Object.keys(a), common = 0;
        keys.forEach(function (k) { if (b[k]) common++; });
        var union = keys.length + Object.keys(b).length - common;
        return union > 0 && common / union >= 0.5 && common >= 2;
    }
    function sharesFact(a, b) {
        for (var i = 0; i < a.length; i++) {
            for (var j = 0; j < b.length; j++) {
                if (a[i].w === b[j].w && !(a[i].first && b[j].first) && GENERIC_WORDS.indexOf(a[i].w) === -1) return true;
            }
        }
        return false;
    }
    function sharesName(a, b) {
        for (var i = 0; i < a.length; i++) {
            for (var j = 0; j < b.length; j++) {
                if (a[i].w === b[j].w && !(a[i].first && b[j].first)) return true;
            }
        }
        return false;
    }

    // Aplatit l'arbre de catégories en événements candidats : { id, date, essential, fame }.
    // `fame` = combien d'AUTRES thèmes racontent le même fait (même année, même nom propre dans le titre) :
    // un événement que dix thèmes citent est un repère connu, un autre n'est cité que chez lui. Ignore le
    // contenu du joueur, les thèmes exclus et les événements sans année.
    function flattenEvents(categories) {
        var out = [];
        var seen = Object.create(null);
        var byDate = Object.create(null);
        function walk(node) {
            (node.themes || []).forEach(function (theme) {
                if (EXCLUDED_THEME_IDS.indexOf(theme.id) !== -1) return;
                var essential = Object.create(null);
                (theme.essentiel || []).forEach(function (id) { essential[id] = true; });
                (theme.events || []).forEach(function (evt) {
                    if (!evt || typeof evt.date !== 'number' || seen[evt.id]) return;
                    seen[evt.id] = true;
                    var item = { id: evt.id, date: evt.date, theme: theme.id, essential: !!essential[evt.id], fame: 0 };
                    out.push(item);
                    (byDate[evt.date] = byDate[evt.date] || []).push({ item: item, theme: theme.id, words: titleWords(evt.titre), sig: significantWords(evt.titre) });
                });
            });
            (node.subcategories || []).forEach(walk);
        }
        (categories || []).forEach(function (category) {
            if (!category || category.isCustomCategory) return;
            walk(category);
        });
        // Un même fait raconté par plusieurs thèmes (ou deux fois dans un thème) a plusieurs identifiants :
        // `cluster` les relie (même année, même nom propre), pour n'en tirer qu'un par niveau et par monde.
        Object.keys(byDate).forEach(function (date) {
            var group = byDate[date];
            group.forEach(function (g) { g.item.cluster = g.item.id; });
            if (group.length < 2) return;
            var root = {};
            group.forEach(function (g) { root[g.item.id] = g.item.id; });
            var find = function (id) { while (root[id] !== id) id = root[id]; return id; };
            for (var x = 0; x < group.length; x++) {
                for (var y = x + 1; y < group.length; y++) {
                    if (sharesFact(group[x].words, group[y].words) || similarTitles(group[x].sig, group[y].sig)) {
                        var rx = find(group[x].item.id), ry = find(group[y].item.id);
                        if (rx !== ry) root[ry < rx ? rx : ry] = ry < rx ? ry : rx;
                    }
                }
            }
            group.forEach(function (g) { g.item.cluster = find(g.item.id); });
            group.forEach(function (a) {
                var themes = Object.create(null);
                group.forEach(function (b) {
                    if (b.theme !== a.theme && sharesName(a.words, b.words)) themes[b.theme] = true;
                });
                a.item.fame = Math.min(FAME_CAP, Object.keys(themes).length);
            });
        });
        return out;
    }

    // Priorité d'un événement dans un tirage : incontournable d'abord, puis connu.
    function weight(e) { return (e.essential ? FAME_CAP + 1 : 0) + (e.fame || 0); }

    // `count` événements répartis sur la fenêtre : on la découpe en `count` tranches de durée égale
    // et chacune donne son événement le plus connu (puis le mieux classé au hasard stable), puis on complète. Deux événements d'un même
    // niveau n'ont jamais la même année (un placement serait alors indécidable).
    function pickSpread(candidates, count, seed, maxPerDate) {
        var ranked = candidates.map(function (c) { return { c: c, r: rank(seed + '|' + c.id) }; })
            .sort(function (a, b) { return weight(b.c) - weight(a.c) || a.r - b.r || (a.c.id < b.c.id ? -1 : 1); });
        if (!ranked.length) return [];
        var min = Infinity, max = -Infinity;
        ranked.forEach(function (x) { min = Math.min(min, x.c.date); max = Math.max(max, x.c.date); });
        var width = Math.max(1, (max - min + 1) / count);
        var perDate = Object.create(null);
        var clusters = Object.create(null);
        var cap = maxPerDate || 1;
        var chosen = [];
        var chosenIds = Object.create(null);
        function take(x) {
            perDate[x.c.date] = (perDate[x.c.date] || 0) + 1;
            clusters[x.c.cluster || x.c.id] = true;
            chosenIds[x.c.id] = true;
            chosen.push(x.c);
        }
        for (var s = 0; s < count; s++) {
            var lo = min + s * width, hi = min + (s + 1) * width;
            for (var i = 0; i < ranked.length; i++) {
                var x = ranked[i];
                if ((perDate[x.c.date] || 0) >= cap || chosenIds[x.c.id] || clusters[x.c.cluster || x.c.id] || x.c.date < lo || (x.c.date >= hi && s < count - 1)) continue;
                take(x);
                break;
            }
        }
        for (var j = 0; j < ranked.length && chosen.length < count; j++) {
            var y = ranked[j];
            if ((perDate[y.c.date] || 0) < cap && !chosenIds[y.c.id] && !clusters[y.c.cluster || y.c.id]) take(y);
        }
        return chosen.sort(function (a, b) { return a.date - b.date || (a.id < b.id ? -1 : 1); });
    }

    // Les candidats d'un niveau tiré au sort : la fenêtre de temps, les thèmes du monde s'il en a, et les
    // seuls incontournables par défaut quand le monde n'a pas de thèmes (sinon tout le monde y entrerait).
    function candidatesFor(level, events) {
        var themes = null;
        if (level.themes) {
            themes = Object.create(null);
            level.themes.forEach(function (id) { themes[id] = true; });
        }
        var essentialOnly = level.essentialOnly !== undefined ? level.essentialOnly : !themes;
        return events.filter(function (e) {
            if (e.date < level.from || e.date >= level.to) return false;
            if (themes && !themes[e.theme]) return false;
            return !essentialOnly || e.essential;
        });
    }

    // Les identifiants des événements de chaque niveau d'un monde : { 'grece-1': [...], …, 'grece-boss': [...] }.
    // Les niveaux sont tirés dans l'ordre et un événement ne sert qu'une fois dans un monde : c'est ce qui fait
    // que le 2e niveau d'une même tranche reçoit d'autres événements que le 1er. Sans liste fixée, le boss est
    // la révision du monde entier : BOSS_POOL_SIZE événements répartis sur tous ses niveaux.
    function buildWorldPools(world, events) {
        var pools = {};
        var byId = Object.create(null);
        events.forEach(function (e) { byId[e.id] = e; });
        var fixed = function (ids) { return ids.filter(function (id) { return !!byId[id]; }); };
        var used = Object.create(null);
        levelsOf(world).forEach(function (l) {
            if (l.boss) return;
            if (l.ids) { pools[l.id] = fixed(l.ids); return; }
            if (l.from === undefined) { pools[l.id] = []; return; }
            var cands = candidatesFor(l, events).filter(function (e) { return !used[e.cluster || e.id]; });
            var picked = pickSpread(cands, LEVEL_POOL_SIZE, l.id, l.maxPerDate);
            picked.forEach(function (e) { used[e.cluster || e.id] = true; });
            pools[l.id] = picked.map(function (e) { return e.id; });
        });
        if (world.boss.ids) {
            pools[bossId(world)] = fixed(world.boss.ids);
            return pools;
        }
        var all = [];
        world.levels.forEach(function (l) {
            (pools[levelId(world, l.n)] || []).forEach(function (id) { if (byId[id]) all.push(byId[id]); });
        });
        pools[bossId(world)] = pickSpread(all, BOSS_POOL_SIZE, bossId(world), world.maxPerDate || MAX_PER_DATE).map(function (e) { return e.id; });
        return pools;
    }

    // Découpe une fenêtre en au plus `count` tranches contenant chacune à peu près autant de candidats (bornes =
    // années réelles d'événements) : plus le temps est dense, plus les tranches sont courtes. Aucune tranche
    // n'est plus étroite que MIN_LEVEL_YEARS : les plus étroites sont fondues dans leur voisine. Sert à proposer
    // le découpage d'un monde (scripts/path_plan.js) ; une fois validé, les bornes sont figées dans js/pathWorlds.js.
    function sliceWindows(candidates, from, to, count, minWidth) {
        var floor = minWidth === undefined ? MIN_LEVEL_YEARS : minWidth;
        var dates = candidates.map(function (e) { return e.date; }).filter(function (d) { return d >= from && d < to; })
            .sort(function (a, b) { return a - b; });
        var bounds = [from];
        for (var k = 1; k < count; k++) {
            var d = dates[Math.floor(k * dates.length / count)];
            if (d !== undefined && d > bounds[bounds.length - 1] && d < to) bounds.push(d);
        }
        bounds.push(to);
        var merged = true;
        while (merged && bounds.length > 2) {
            merged = false;
            var narrow = -1, narrowW = Infinity;
            for (var i = 0; i < bounds.length - 1; i++) {
                var w = bounds[i + 1] - bounds[i];
                if (w < floor && w < narrowW) { narrow = i; narrowW = w; }
            }
            if (narrow >= 0) {
                // On retire la borne qui sépare la tranche étroite de sa voisine la plus étroite.
                var left = narrow > 0 ? bounds[narrow + 1] - bounds[narrow - 1] : Infinity;
                var right = narrow < bounds.length - 2 ? bounds[narrow + 2] - bounds[narrow] : Infinity;
                bounds.splice(left <= right ? narrow : narrow + 1, 1);
                merged = true;
            }
        }
        var out = [];
        for (var j = 0; j < bounds.length - 1; j++) out.push({ from: bounds[j], to: bounds[j + 1] });
        return out;
    }

    // --- Étoiles et progression ------------------------------------------------

    // Une étoile pour finir le niveau, une de plus par vie conservée au-dessus de la première :
    // 1 vie restante = ★, 2 = ★★, 3 (aucune erreur de bout en bout) = ★★★.
    function starsFor(won, livesLeft) {
        if (!won || !(livesLeft > 0)) return 0;
        return Math.max(1, Math.min(MAX_STARS, Math.floor(livesLeft)));
    }

    // Progression : { levels: { <id>: { stars, best, plays } }, skipped: [<monde>] } — tolère un stockage altéré.
    function normalizeProgress(raw) {
        var out = { levels: {}, skipped: [] };
        if (raw && Array.isArray(raw.skipped)) {
            out.skipped = raw.skipped.filter(function (id, i, all) { return typeof id === 'string' && all.indexOf(id) === i; });
        }
        var src = raw && typeof raw === 'object' && raw.levels && typeof raw.levels === 'object' ? raw.levels : {};
        Object.keys(src).forEach(function (id) {
            var e = src[id];
            if (!e || typeof e !== 'object') return;
            var stars = Math.max(0, Math.min(MAX_STARS, Math.floor(Number(e.stars)) || 0));
            out.levels[id] = {
                stars: stars,
                best: Math.max(0, Math.floor(Number(e.best)) || 0),
                plays: Math.max(0, Math.floor(Number(e.plays)) || 0)
            };
        });
        return out;
    }

    function starsOf(progress, id) {
        var e = progress && progress.levels && progress.levels[id];
        return e ? e.stars : 0;
    }

    // --- Mondes ------------------------------------------------------------------

    // Le chemin principal : les mondes qui ne sont pas des îles, dans l'ordre. Les îles sont facultatives.
    function mainWorlds() { return WORLDS.filter(function (w) { return !w.island; }); }
    function worldIndex(world) { return mainWorlds().indexOf(world); }

    function isWorldSkipped(world, progress) {
        return !!(progress && progress.skipped && progress.skipped.indexOf(world.id) !== -1);
    }

    function worldTouched(world, progress) {
        return levelsOf(world).some(function (l) { return progress && progress.levels && progress.levels[l.id]; });
    }

    // Un monde s'ouvre quand le boss du précédent est vaincu, ou quand le joueur a passé le précédent.
    // Un monde déjà commencé reste ouvert (progression venue d'une version qui n'avait pas ce verrou).
    // Une île s'ouvre à la moitié de son monde d'attache : le niveau `opensAfter` de ce monde doit être réussi.
    function isWorldUnlocked(world, progress) {
        if (world.island) {
            var parent = findWorld(world.parent);
            return worldTouched(world, progress) ||
                !!(parent && starsOf(progress, levelId(parent, world.opensAfter)) > 0);
        }
        var idx = worldIndex(world);
        if (idx <= 0) return idx === 0;
        var prev = mainWorlds()[idx - 1];
        return starsOf(progress, bossId(prev)) > 0 || isWorldSkipped(prev, progress) || worldTouched(world, progress);
    }

    // Les îles rattachées à un monde.
    function islandsOf(world) { return WORLDS.filter(function (w) { return w.island && w.parent === world.id; }); }

    // « Je connais déjà » : passer un monde ouvre le suivant, sans rien effacer.
    function skipWorld(progress, worldId) {
        var base = normalizeProgress(progress);
        var world = findWorld(worldId);
        if (world && world.skippable && base.skipped.indexOf(worldId) === -1) base.skipped.push(worldId);
        return base;
    }

    // Le niveau à proposer : dans l'ordre des mondes ouverts (en sautant ceux que le joueur a passés), le
    // premier qu'il n'a pas encore réussi ; à défaut, le premier sans ses trois étoiles. null si tout est fait.
    function nextTarget(progress) {
        var open = mainWorlds().filter(function (w) { return isWorldUnlocked(w, progress); });
        var passes = [
            function (w) { return !isWorldSkipped(w, progress); },
            function () { return true; }
        ];
        for (var p = 0; p < passes.length; p++) {
            for (var i = 0; i < open.length; i++) {
                if (!passes[p](open[i])) continue;
                var id = firstLevel(open[i], progress, function (stars) { return stars === 0; });
                if (id) return { world: open[i], levelId: id };
            }
        }
        for (var j = 0; j < open.length; j++) {
            var full = firstLevel(open[j], progress, function (stars) { return stars < MAX_STARS; });
            if (full) return { world: open[j], levelId: full };
        }
        return null;
    }

    function firstLevel(world, progress, test) {
        var levels = levelsOf(world);
        for (var i = 0; i < levels.length; i++) {
            if (isUnlocked(world, levels[i].id, progress) && test(starsOf(progress, levels[i].id))) return levels[i].id;
        }
        return null;
    }

    // Un nouveau progrès, sans toucher à l'ancien. Les étoiles ne redescendent jamais.
    function recordResult(progress, id, stars, points) {
        var base = normalizeProgress(progress);
        var prev = base.levels[id] || { stars: 0, best: 0, plays: 0 };
        base.levels[id] = {
            stars: Math.max(prev.stars, stars),
            best: Math.max(prev.best, Math.max(0, Math.round(points) || 0)),
            plays: prev.plays + 1
        };
        return base;
    }

    // Étoiles réunies dans un monde (boss compris) et maximum possible.
    function worldStars(world, progress) {
        return levelsOf(world).reduce(function (sum, l) { return sum + starsOf(progress, l.id); }, 0);
    }
    function worldMaxStars(world) { return levelsOf(world).length * MAX_STARS; }

    // Étoiles des seuls niveaux ordinaires : c'est ce qui ouvre le boss.
    function regularStars(world, progress) {
        return world.levels.reduce(function (sum, l) { return sum + starsOf(progress, levelId(world, l.n)); }, 0);
    }

    // Un niveau s'ouvre en finissant le précédent (une étoile suffit) ; le boss demande un total d'étoiles.
    function isUnlocked(world, id, progress) {
        if (!isWorldUnlocked(world, progress)) return false;
        var levels = levelsOf(world);
        var idx = -1;
        levels.forEach(function (l, i) { if (l.id === id) idx = i; });
        if (idx < 0) return false;
        if (idx === 0) return true;
        if (levels[idx].boss) {
            return starsOf(progress, levels[idx - 1].id) > 0 && regularStars(world, progress) >= world.bossStarsRequired;
        }
        return starsOf(progress, levels[idx - 1].id) > 0;
    }

    // Où en est le joueur : le premier niveau ouvert qu'il n'a pas encore réussi, sinon le premier
    // niveau ouvert sans ses trois étoiles, sinon null (monde bouclé à fond).
    function currentLevelId(world, progress) {
        var levels = levelsOf(world);
        for (var i = 0; i < levels.length; i++) {
            if (isUnlocked(world, levels[i].id, progress) && starsOf(progress, levels[i].id) === 0) return levels[i].id;
        }
        for (var j = 0; j < levels.length; j++) {
            if (isUnlocked(world, levels[j].id, progress) && starsOf(progress, levels[j].id) < MAX_STARS) return levels[j].id;
        }
        return null;
    }

    // Le niveau qui suit celui-ci s'il est ouvert, sinon null. Après le boss : le premier niveau du monde suivant.
    function nextLevelId(world, id, progress) {
        var levels = levelsOf(world);
        for (var i = 0; i < levels.length - 1; i++) {
            if (levels[i].id === id) return isUnlocked(world, levels[i + 1].id, progress) ? levels[i + 1].id : null;
        }
        var next = world.island ? null : mainWorlds()[worldIndex(world) + 1];
        if (next && levels[levels.length - 1].id === id) {
            var first = levelId(next, next.levels[0].n);
            return isUnlocked(next, first, progress) ? first : null;
        }
        return null;
    }

    // XP versée à la fin d'un niveau : de quoi récompenser sans écraser les défis (qui valent 100 à 250).
    // Premier passage réussi = prime ; le boss pèse plus.
    function levelXp(isBoss, won, stars, points, firstClear) {
        var xp = Math.round((points || 0) * 0.25);
        if (won) {
            xp += (isBoss ? 120 : 40) + stars * (isBoss ? 40 : 15);
            if (firstClear) xp += isBoss ? 200 : 50;
        }
        return xp;
    }

    return {
        WORLDS: WORLDS, LEVEL_POOL_SIZE: LEVEL_POOL_SIZE, BOSS_POOL_SIZE: BOSS_POOL_SIZE, MAX_STARS: MAX_STARS,
        EXCLUDED_THEME_IDS: EXCLUDED_THEME_IDS,
        findWorld: findWorld, levelsOf: levelsOf, levelId: levelId, bossId: bossId, isBossId: isBossId,
        stageMode: stageMode, levelNeedsEvents: levelNeedsEvents,
        flattenEvents: flattenEvents, pickSpread: pickSpread, candidatesFor: candidatesFor, buildWorldPools: buildWorldPools,
        sliceWindows: sliceWindows, MAX_PER_DATE: MAX_PER_DATE, MIN_LEVEL_YEARS: MIN_LEVEL_YEARS,
        isWorldUnlocked: isWorldUnlocked, islandsOf: islandsOf, mainWorlds: mainWorlds, isWorldSkipped: isWorldSkipped, skipWorld: skipWorld, nextTarget: nextTarget,
        starsFor: starsFor, normalizeProgress: normalizeProgress, starsOf: starsOf, recordResult: recordResult,
        worldStars: worldStars, worldMaxStars: worldMaxStars, regularStars: regularStars,
        isUnlocked: isUnlocked, currentLevelId: currentLevelId, nextLevelId: nextLevelId, levelXp: levelXp
    };
}));
