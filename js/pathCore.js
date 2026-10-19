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

    // Événements par niveau ordinaire, et par niveau pour composer le boss (2 × 10 niveaux).
    var LEVEL_POOL_SIZE = 12;
    var BOSS_PER_LEVEL = 2;
    var MAX_STARS = 3;
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
        {
            id: 'antiquite',
            icon: '🏛️',
            from: -800,
            to: 477,
            // Étoiles à réunir (sur 30) pour oser le boss : de quoi rejouer un peu, sans bloquer.
            bossStarsRequired: 15,
            levels: [
                { n: 1, from: -800, to: -600, stages: STAGES_EASY },
                { n: 2, from: -600, to: -500, stages: STAGES_EASY },
                { n: 3, from: -500, to: -400, stages: STAGES_EASY },
                { n: 4, from: -400, to: -300, stages: STAGES_MEDIUM },
                { n: 5, from: -300, to: -200, stages: STAGES_MEDIUM },
                { n: 6, from: -200, to: -100, stages: STAGES_MEDIUM },
                { n: 7, from: -100, to: -27, stages: STAGES_HARD },
                { n: 8, from: -27, to: 100, stages: STAGES_HARD },
                { n: 9, from: 100, to: 250, stages: STAGES_HARD },
                { n: 10, from: 250, to: 477, shownTo: 476, stages: STAGES_LAST }
            ],
            boss: { stages: STAGES_BOSS }
        }
    ];

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
                ids: l.ids || null, themes: l.themes || world.themes || null,
                essentialOnly: l.essentialOnly !== undefined ? l.essentialOnly : world.essentialOnly
            };
        });
        out.push({
            id: bossId(world), n: world.levels.length + 1, from: world.from, to: world.to, stages: world.boss.stages, boss: true,
            ids: world.boss.ids || null, themes: world.themes || null, essentialOnly: world.essentialOnly
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
                    (byDate[evt.date] = byDate[evt.date] || []).push({ item: item, theme: theme.id, words: titleWords(evt.titre) });
                });
            });
            (node.subcategories || []).forEach(walk);
        }
        (categories || []).forEach(function (category) {
            if (!category || category.isCustomCategory) return;
            walk(category);
        });
        Object.keys(byDate).forEach(function (date) {
            var group = byDate[date];
            if (group.length < 2) return;
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
    function pickSpread(candidates, count, seed) {
        var ranked = candidates.map(function (c) { return { c: c, r: rank(seed + '|' + c.id) }; })
            .sort(function (a, b) { return weight(b.c) - weight(a.c) || a.r - b.r || (a.c.id < b.c.id ? -1 : 1); });
        if (!ranked.length) return [];
        var min = Infinity, max = -Infinity;
        ranked.forEach(function (x) { min = Math.min(min, x.c.date); max = Math.max(max, x.c.date); });
        var width = Math.max(1, (max - min + 1) / count);
        var usedDates = Object.create(null);
        var chosen = [];
        var chosenIds = Object.create(null);
        function take(x) {
            usedDates[x.c.date] = true;
            chosenIds[x.c.id] = true;
            chosen.push(x.c);
        }
        for (var s = 0; s < count; s++) {
            var lo = min + s * width, hi = min + (s + 1) * width;
            for (var i = 0; i < ranked.length; i++) {
                var x = ranked[i];
                if (usedDates[x.c.date] || x.c.date < lo || (x.c.date >= hi && s < count - 1)) continue;
                take(x);
                break;
            }
        }
        for (var j = 0; j < ranked.length && chosen.length < count; j++) {
            var y = ranked[j];
            if (!usedDates[y.c.date] && !chosenIds[y.c.id]) take(y);
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

    // Les identifiants des événements de chaque niveau d'un monde : { 'antiquite-1': [...], …,
    // 'antiquite-boss': [...] }. Sans liste fixée, le boss reprend 2 événements de chaque niveau — ce
    // que le joueur a déjà traversé — plutôt que du neuf : c'est la révision du monde entier.
    function buildWorldPools(world, events) {
        var pools = {};
        var byId = Object.create(null);
        events.forEach(function (e) { byId[e.id] = e; });
        var fixed = function (ids) { return ids.filter(function (id) { return !!byId[id]; }); };
        levelsOf(world).forEach(function (l) {
            if (l.boss) return;
            if (l.ids) pools[l.id] = fixed(l.ids);
            else if (l.from !== undefined) pools[l.id] = pickSpread(candidatesFor(l, events), LEVEL_POOL_SIZE, l.id).map(function (e) { return e.id; });
            else pools[l.id] = [];
        });
        if (world.boss.ids) {
            pools[bossId(world)] = fixed(world.boss.ids);
            return pools;
        }
        var boss = [];
        var usedDates = Object.create(null);
        world.levels.forEach(function (l) {
            var own = (pools[levelId(world, l.n)] || []).map(function (id) { return byId[id]; })
                .filter(function (e) { return e && !usedDates[e.date]; });
            pickSpread(own, BOSS_PER_LEVEL, bossId(world)).forEach(function (e) {
                usedDates[e.date] = true;
                boss.push(e);
            });
        });
        pools[bossId(world)] = boss.sort(function (a, b) { return a.date - b.date; }).map(function (e) { return e.id; });
        return pools;
    }

    // Découpe une fenêtre en `count` tranches qui contiennent chacune à peu près autant de candidats
    // (bornes = années réelles d'événements). Sert à proposer le découpage d'un nouveau monde
    // (scripts/path_plan.js) : plus le temps est dense, plus les tranches sont courtes.
    function sliceWindows(candidates, from, to, count) {
        var dates = candidates.map(function (e) { return e.date; }).filter(function (d) { return d >= from && d < to; })
            .sort(function (a, b) { return a - b; });
        var bounds = [from];
        for (var k = 1; k < count; k++) {
            var d = dates[Math.floor(k * dates.length / count)];
            if (d !== undefined && d > bounds[bounds.length - 1] && d < to) bounds.push(d);
        }
        bounds.push(to);
        var out = [];
        for (var i = 0; i < bounds.length - 1; i++) out.push({ from: bounds[i], to: bounds[i + 1] });
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

    function worldIndex(world) { return WORLDS.indexOf(world); }

    function isWorldSkipped(world, progress) {
        return !!(progress && progress.skipped && progress.skipped.indexOf(world.id) !== -1);
    }

    function worldTouched(world, progress) {
        return levelsOf(world).some(function (l) { return progress && progress.levels && progress.levels[l.id]; });
    }

    // Un monde s'ouvre quand le boss du précédent est vaincu, ou quand le joueur a passé le précédent.
    // Un monde déjà commencé reste ouvert (progression venue d'une version qui n'avait pas ce verrou).
    function isWorldUnlocked(world, progress) {
        var idx = worldIndex(world);
        if (idx <= 0) return idx === 0;
        var prev = WORLDS[idx - 1];
        return starsOf(progress, bossId(prev)) > 0 || isWorldSkipped(prev, progress) || worldTouched(world, progress);
    }

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
        var open = WORLDS.filter(function (w) { return isWorldUnlocked(w, progress); });
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
        var next = WORLDS[worldIndex(world) + 1];
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
        WORLDS: WORLDS, LEVEL_POOL_SIZE: LEVEL_POOL_SIZE, BOSS_PER_LEVEL: BOSS_PER_LEVEL, MAX_STARS: MAX_STARS,
        EXCLUDED_THEME_IDS: EXCLUDED_THEME_IDS,
        findWorld: findWorld, levelsOf: levelsOf, levelId: levelId, bossId: bossId, isBossId: isBossId,
        stageMode: stageMode, levelNeedsEvents: levelNeedsEvents,
        flattenEvents: flattenEvents, pickSpread: pickSpread, candidatesFor: candidatesFor, buildWorldPools: buildWorldPools,
        sliceWindows: sliceWindows,
        isWorldUnlocked: isWorldUnlocked, isWorldSkipped: isWorldSkipped, skipWorld: skipWorld, nextTarget: nextTarget,
        starsFor: starsFor, normalizeProgress: normalizeProgress, starsOf: starsOf, recordResult: recordResult,
        worldStars: worldStars, worldMaxStars: worldMaxStars, regularStars: regularStars,
        isUnlocked: isUnlocked, currentLevelId: currentLevelId, nextLevelId: nextLevelId, levelXp: levelXp
    };
}));
