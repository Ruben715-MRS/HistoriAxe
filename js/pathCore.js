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

    // `to` est exclusif (`shownTo`, s'il existe, est la dernière année à afficher). Les titres sont dans ui/<lang>.json (path.worlds.<monde>.levels.<n>).
    var WORLDS = [
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
            return { id: levelId(world, l.n), n: l.n, from: l.from, to: l.to, shownTo: l.shownTo, stages: l.stages, boss: false };
        });
        out.push({ id: bossId(world), n: world.levels.length + 1, from: world.from, to: world.to, stages: world.boss.stages, boss: true });
        return out;
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
                    var item = { id: evt.id, date: evt.date, essential: !!essential[evt.id], fame: 0 };
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

    // `count` événements répartis sur la fenêtre : on la découpe en `count` tranches de durée égale
    // et chacune donne son événement le plus connu (puis le mieux classé au hasard stable), puis on complète. Deux événements d'un même
    // niveau n'ont jamais la même année (un placement serait alors indécidable).
    function pickSpread(candidates, count, seed) {
        var ranked = candidates.map(function (c) { return { c: c, r: rank(seed + '|' + c.id) }; })
            .sort(function (a, b) { return (b.c.fame || 0) - (a.c.fame || 0) || a.r - b.r || (a.c.id < b.c.id ? -1 : 1); });
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

    // Les identifiants des événements de chaque niveau d'un monde : { 'antiquite-1': [...], …,
    // 'antiquite-boss': [...] }. Le boss reprend 2 événements de chaque niveau — ce que le joueur a
    // déjà traversé — plutôt que du neuf : c'est la révision du monde entier.
    function buildWorldPools(world, events) {
        var pools = {};
        var essentials = events.filter(function (e) { return e.essential; });
        world.levels.forEach(function (l) {
            var inWindow = essentials.filter(function (e) { return e.date >= l.from && e.date < l.to; });
            pools[levelId(world, l.n)] = pickSpread(inWindow, LEVEL_POOL_SIZE, levelId(world, l.n)).map(function (e) { return e.id; });
        });
        var byId = Object.create(null);
        events.forEach(function (e) { byId[e.id] = e; });
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

    // --- Étoiles et progression ------------------------------------------------

    // Une étoile pour finir le niveau, une de plus par vie conservée au-dessus de la première :
    // 1 vie restante = ★, 2 = ★★, 3 (aucune erreur de bout en bout) = ★★★.
    function starsFor(won, livesLeft) {
        if (!won || !(livesLeft > 0)) return 0;
        return Math.max(1, Math.min(MAX_STARS, Math.floor(livesLeft)));
    }

    // Progression : { levels: { <id>: { stars, best, plays } } } — tolère un stockage altéré.
    function normalizeProgress(raw) {
        var out = { levels: {} };
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

    // Le niveau qui suit celui-ci s'il est ouvert, sinon null.
    function nextLevelId(world, id, progress) {
        var levels = levelsOf(world);
        for (var i = 0; i < levels.length - 1; i++) {
            if (levels[i].id === id) return isUnlocked(world, levels[i + 1].id, progress) ? levels[i + 1].id : null;
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
        flattenEvents: flattenEvents, pickSpread: pickSpread, buildWorldPools: buildWorldPools,
        starsFor: starsFor, normalizeProgress: normalizeProgress, starsOf: starsOf, recordResult: recordResult,
        worldStars: worldStars, worldMaxStars: worldMaxStars, regularStars: regularStars,
        isUnlocked: isUnlocked, currentLevelId: currentLevelId, nextLevelId: nextLevelId, levelXp: levelXp
    };
}));
