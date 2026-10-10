// =========================================================================
// === HISTORIAXE — GÉNÉRATEURS DES MODES « REMISE EN ORDRE », « BLITZ »,
// === « CURSEUR », « INTRUS » ET « QUI EST-CE ? »
// =========================================================================
//
// Cinq modes, un seul module, parce qu'ils partagent la même nature : des
// questions FABRIQUÉES à partir des données du thème, sans aucune donnée
// supplémentaire à écrire. Ce que chacun entraîne diffère, et c'est tout
// l'intérêt de les avoir côte à côte :
//
//   - Remise en ordre : l'ordre RELATIF de cinq événements d'un coup, là où
//     la frise n'en fait insérer qu'un dans une suite déjà triée ;
//   - Blitz : le même jugement, réduit à sa forme la plus rapide (« X avant
//     Y ? »), pour une partie qui tient en 60 secondes ;
//   - Curseur : la date ABSOLUE, mais estimée plutôt que sue — on score à la
//     proximité, là où « Le fil du temps » exige l'année exacte ;
//   - Intrus : le sens de l'époque, c'est-à-dire reconnaître ce qui ne
//     cadre pas, sans qu'aucune date ne soit affichée ;
//   - Qui est-ce ? : mettre un nom sur un visage — les portraits des
//     panthéons, seul contenu de la base qui s'y prête.
//
// Comme js/simultaneity.js et js/dailyEngine.js, ce module ne touche ni au
// DOM ni à `window` : il tourne sous `node --test` (voir
// tests/gameModes.test.js), ce que js/app.js ne peut pas faire. L'écran et
// le score de chaque mode vivent, eux, dans js/app.js.
//
// Toutes les fonctions acceptent un générateur aléatoire injectable (`rng`),
// pour que les tests portent sur des tirages reproductibles.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.GameModes = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- RÉGLAGES PARTAGÉS ---------------------------------------------

    // Remise en ordre : cinq cartes. Quatre se trient de tête, six deviennent
    // illisibles sur un écran de téléphone.
    var ORDER_CARDS = 5;
    // Blitz : la durée est la partie. 60 secondes, c'est le format qui
    // manquait — le plus court ailleurs était le Défi du jour, 10 cartes.
    var BLITZ_SECONDS = 60;
    var BLITZ_PENALTY_SECONDS = 3;
    var SLIDER_ROUNDS = 10;
    var INTRUS_ROUNDS = 10;
    var INTRUS_OPTIONS = 4;
    // Qui est-ce ? : dix portraits, quatre noms. En dessous de WHO_MIN_PORTRAITS
    // figures à portrait, le mode n'a pas de quoi tirer trois mauvaises réponses
    // qui ne se devinent pas : il ne se propose pas (voir js/app.js: updateWhoisCard).
    var WHO_ROUNDS = 10;
    var WHO_OPTIONS = 4;
    var WHO_MIN_PORTRAITS = 8;

    // Intrus « période » : l'écart minimal entre le trio et son intrus est
    // un MULTIPLE de l'étalement du trio, jamais une valeur absolue — un
    // thème couvrant vingt ans et un autre couvrant trois millénaires n'ont
    // pas la même idée de « loin ». Le plancher en années évite seulement
    // qu'un trio très resserré n'accepte un intrus à trois ans de là.
    var INTRUS_GAP_RATIO = 3;
    var INTRUS_GAP_FLOOR = 15;

    // Curseur : au-delà de cette fraction de l'échelle, la réponse est
    // comptée fausse et coûte une vie. 5 % d'une frise de 1918-1939 fait une
    // année ; d'une frise de deux millénaires, un siècle. C'est voulu : la
    // tolérance doit suivre ce que le thème demande de savoir.
    var SLIDER_TOLERANCE_RATIO = 0.05;
    var SLIDER_TOLERANCE_FLOOR = 2;
    // Marge ajoutée de part et d'autre de l'échelle, pour que les événements
    // extrêmes ne soient pas collés aux butées du curseur (où ils se
    // devineraient en poussant le curseur à fond).
    var SLIDER_PAD_RATIO = 0.08;
    var SLIDER_PAD_FLOOR = 3;

    // Au-delà, une date n'est plus une année d'histoire mais un ordre de
    // grandeur géologique (« Maîtrise du feu par l'homme », -400000). Ces
    // quatre modes COMPARENT des dates, et une seule valeur pareille fausse
    // tout ce qu'ils construisent : sur « Histoire de France », trois
    // événements préhistoriques étiraient l'échelle du Curseur de -486162 à
    // 38186, avec une tolérance de ±22601 ans — un curseur sur lequel tout
    // le XXe siècle tenait dans un pixel. Ils restent parfaitement jouables
    // sur la frise et dans les autres modes ; seuls ces quatre-là les
    // écartent. Même seuil que js/app.js: LONG_YEAR_THRESHOLD et que
    // js/simultaneity.js, pour la même raison.
    //
    // Mesuré : 50 événements sur 19 781 (0,25 %), répartis sur 13 thèmes, et
    // aucun thème ne descend sous le minimum jouable en les retirant.
    var HISTORICAL_YEAR_LIMIT = 10000;

    // --- OUTILS ---------------------------------------------------------

    function shuffle(list, rng) {
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
        return out;
    }

    function datedEvents(events) {
        return (events || []).filter(function (e) {
            return e && typeof e.date === 'number' && isFinite(e.date)
                && Math.abs(e.date) < HISTORICAL_YEAR_LIMIT;
        });
    }

    // Un seul événement par date. Les quatre modes comparent des dates : deux
    // événements de la même année rendraient la bonne réponse indécidable
    // (« lequel est antérieur ? » n'a pas de réponse pour deux 1789).
    function oneEventPerDate(events, rng) {
        var seen = {};
        var out = [];
        shuffle(datedEvents(events), rng).forEach(function (e) {
            if (seen[e.date]) return;
            seen[e.date] = 1;
            out.push(e);
        });
        return out;
    }

    function byDate(a, b) { return a.date - b.date; }

    // --- 1. REMISE EN ORDRE ---------------------------------------------
    //
    // Cinq cartes mélangées, à classer d'un coup. Ce n'est pas la frise en
    // plus petit : la frise donne une suite déjà triée où glisser une carte,
    // ici rien n'est acquis et chaque carte se situe par rapport aux quatre
    // autres. C'est l'exercice d'examen (« classez ces événements »).

    function buildOrderRounds(events, options) {
        options = options || {};
        var rng = options.rng || Math.random;
        var perRound = options.cards || ORDER_CARDS;
        var wanted = options.count || 0;

        var pool = oneEventPerDate(events, rng);
        if (pool.length < perRound) return [];

        var rounds = [];
        var max = wanted || Math.floor(pool.length / perRound);
        for (var i = 0; i + perRound <= pool.length && rounds.length < max; i += perRound) {
            var cards = pool.slice(i, i + perRound);
            var solution = cards.slice().sort(byDate).map(function (e) { return e.id; });
            rounds.push({
                // Mélangées pour l'affichage : servies dans l'ordre des dates,
                // la manche serait déjà résolue.
                cards: shuffle(cards, rng),
                solution: solution
            });
        }
        return rounds;
    }

    // Combien de cartes le joueur a placées au bon rang, et si le classement
    // est parfait. Le décompte par rang (plutôt qu'en paires bien ordonnées)
    // est le seul que l'écran puisse montrer carte par carte.
    function scoreOrderAttempt(attempt, solution) {
        var placed = attempt || [];
        var correct = 0;
        solution.forEach(function (id, index) {
            if (placed[index] === id) correct++;
        });
        return {
            correct: correct,
            total: solution.length,
            perfect: correct === solution.length && placed.length === solution.length
        };
    }

    // --- 2. BLITZ VRAI / FAUX -------------------------------------------
    //
    // « X est antérieur à Y : vrai ou faux ? » La question la plus rapide
    // qu'on puisse poser sur une frise, et la seule qui tienne dans le temps
    // d'un feu rouge.

    // Une question. `wantTrue` force la véracité de l'énoncé quand on veut
    // équilibrer la série ; sans lui, le sens est tiré au sort.
    function buildBlitzQuestion(events, options) {
        options = options || {};
        var rng = options.rng || Math.random;
        var avoidPair = options.avoidPair || '';

        var pool = datedEvents(events);
        if (pool.length < 2) return null;

        // Plusieurs essais avant d'abandonner : deux événements tirés au
        // hasard peuvent partager leur date, ou reformer la paire précédente.
        for (var attempt = 0; attempt < 40; attempt++) {
            var pick = shuffle(pool, rng).slice(0, 2);
            var first = pick[0], second = pick[1];
            if (first.date === second.date) continue;
            var key = pairKey(first, second);
            if (key === avoidPair) continue;

            // L'énoncé porte toujours sur « gauche antérieur à droite » : on
            // choisit donc l'ordre d'affichage, et sa véracité suit.
            var statementTrue = typeof options.wantTrue === 'boolean'
                ? options.wantTrue
                : rng() < 0.5;
            var older = first.date < second.date ? first : second;
            var newer = first.date < second.date ? second : first;

            return {
                left: statementTrue ? older : newer,
                right: statementTrue ? newer : older,
                answer: statementTrue,
                pairKey: key
            };
        }
        return null;
    }

    function pairKey(a, b) {
        return a.id < b.id ? a.id + '|' + b.id : b.id + '|' + a.id;
    }

    // Une série de questions dont la moitié exactement est vraie : sans cette
    // contrainte, une série tirée à pile ou face penche assez souvent pour
    // qu'un joueur pressé gagne à répondre toujours la même chose.
    function buildBlitzQuestions(events, options) {
        options = options || {};
        var rng = options.rng || Math.random;
        var count = options.count || 20;

        var verdicts = [];
        for (var i = 0; i < count; i++) verdicts.push(i % 2 === 0);
        verdicts = shuffle(verdicts, rng);

        var out = [];
        var last = '';
        verdicts.forEach(function (wantTrue) {
            var q = buildBlitzQuestion(events, { rng: rng, wantTrue: wantTrue, avoidPair: last });
            if (!q) return;
            last = q.pairKey;
            out.push(q);
        });
        return out;
    }

    // --- 3. LE CURSEUR ---------------------------------------------------
    //
    // Estimer une date en faisant glisser un curseur, et marquer à la
    // proximité. « Le fil du temps » demande l'année exacte, « Périodes &
    // Ères » un siècle parmi quatre : entre les deux il manquait le geste
    // approximatif, celui qui récompense un ordre de grandeur juste.

    // L'échelle affichée : les bornes du vivier, élargies pour que les
    // événements extrêmes ne se devinent pas en poussant le curseur à fond.
    function sliderScaleFor(events) {
        var pool = datedEvents(events);
        if (!pool.length) return null;
        var dates = pool.map(function (e) { return e.date; });
        var min = Math.min.apply(null, dates);
        var max = Math.max.apply(null, dates);
        var span = Math.max(1, max - min);
        var pad = Math.max(SLIDER_PAD_FLOOR, Math.round(span * SLIDER_PAD_RATIO));
        return {
            min: min - pad,
            max: max + pad,
            span: span,
            tolerance: Math.max(SLIDER_TOLERANCE_FLOOR, Math.round(span * SLIDER_TOLERANCE_RATIO))
        };
    }

    function buildSliderRounds(events, options) {
        options = options || {};
        var rng = options.rng || Math.random;
        var count = options.count || SLIDER_ROUNDS;

        var scale = sliderScaleFor(events);
        if (!scale) return [];

        return shuffle(datedEvents(events), rng).slice(0, count).map(function (evt) {
            return {
                event: evt,
                min: scale.min,
                max: scale.max,
                tolerance: scale.tolerance
            };
        });
    }

    // Part du score conservée selon l'erreur commise. La décroissance est
    // mesurée sur la TOLÉRANCE, jamais sur la longueur de l'échelle : sur
    // « Histoire de France », qui couvre 6 600 ans, rapporter l'erreur à
    // l'échelle donnait encore 96 % des points à une réponse fausse de trois
    // siècles. Rapportée à la tolérance, la même réponse tombe où elle doit.
    //
    // Repères du barème : pile = 1, à la tolérance = 2/3, à trois fois la
    // tolérance = 0. Linéaire, parce qu'un joueur doit pouvoir sentir le
    // barème en jouant plutôt que le déduire d'une courbe.
    function scoreSliderGuess(guess, round) {
        var gap = Math.abs(guess - round.event.date);
        var zero = Math.max(1, round.tolerance * 3);
        return {
            gap: gap,
            within: gap <= round.tolerance,
            exact: gap === 0,
            ratio: Math.max(0, 1 - gap / zero)
        };
    }

    // --- 4. L'INTRUS -----------------------------------------------------
    //
    // Quatre événements, trois qui vont ensemble et un qui détonne. Aucune
    // date affichée : c'est le sens de l'époque qu'on entraîne, pas la
    // mémoire des années.
    //
    // Deux familles, parce que le thème peut réunir des événements de deux
    // façons — le temps et le fil thématique — et qu'un mode qui n'en
    // connaîtrait qu'une passerait à côté de la moitié de la base.

    // Famille « période » : trois événements voisins dans le temps, un
    // quatrième nettement à l'écart.
    function buildPeriodIntrus(events, rng) {
        var pool = datedEvents(events).slice().sort(byDate);
        if (pool.length < INTRUS_OPTIONS) return null;

        // Trios de voisins immédiats : par construction, ce sont les plus
        // resserrés du vivier, donc ceux dont l'intrus se détache le mieux.
        var starts = [];
        for (var i = 0; i + 3 <= pool.length; i++) starts.push(i);

        var tried = shuffle(starts, rng);
        for (var k = 0; k < tried.length; k++) {
            var start = tried[k];
            var trio = pool.slice(start, start + 3);
            var spread = trio[2].date - trio[0].date;
            var needed = Math.max(INTRUS_GAP_FLOOR, spread * INTRUS_GAP_RATIO);

            var candidates = pool.filter(function (e) {
                if (trio.indexOf(e) !== -1) return false;
                var nearest = Math.min(
                    Math.abs(e.date - trio[0].date),
                    Math.abs(e.date - trio[1].date),
                    Math.abs(e.date - trio[2].date)
                );
                return nearest >= needed;
            });
            if (!candidates.length) continue;

            var intruder = shuffle(candidates, rng)[0];
            return {
                kind: 'periode',
                options: shuffle(trio.concat([intruder]), rng),
                intruderId: intruder.id,
                groupIds: trio.map(function (e) { return e.id; })
            };
        }
        return null;
    }

    // Famille « axe » : trois événements du même fil thématique, un
    // quatrième pris dans un autre. Ne s'applique qu'aux thèmes dont les
    // événements portent un axe (85 % de la base).
    function buildAxisIntrus(events, rng) {
        var pool = datedEvents(events).filter(function (e) { return !!e.axe; });
        if (pool.length < INTRUS_OPTIONS) return null;

        var byAxis = {};
        pool.forEach(function (e) {
            (byAxis[e.axe] || (byAxis[e.axe] = [])).push(e);
        });
        var axes = Object.keys(byAxis);
        if (axes.length < 2) return null;

        var usable = shuffle(axes.filter(function (a) { return byAxis[a].length >= 3; }), rng);
        for (var i = 0; i < usable.length; i++) {
            var axis = usable[i];
            var others = axes.filter(function (a) { return a !== axis; });
            if (!others.length) continue;
            var trio = shuffle(byAxis[axis], rng).slice(0, 3);
            var otherAxis = shuffle(others, rng)[0];
            var intruder = shuffle(byAxis[otherAxis], rng)[0];
            return {
                kind: 'axe',
                axis: axis,
                options: shuffle(trio.concat([intruder]), rng),
                intruderId: intruder.id,
                groupIds: trio.map(function (e) { return e.id; })
            };
        }
        return null;
    }

    function buildIntrusQuestions(events, options) {
        options = options || {};
        var rng = options.rng || Math.random;
        var count = options.count || INTRUS_ROUNDS;

        var out = [];
        var usedIntruders = {};
        // On alterne les deux familles tant que les deux répondent, pour que
        // la série ne s'installe pas dans un seul type de raisonnement.
        var builders = [buildPeriodIntrus, buildAxisIntrus];
        var guard = count * 8;

        for (var i = 0; out.length < count && i < guard; i++) {
            var q = builders[i % builders.length](events, rng);
            if (!q) continue;
            // Deux manches sur le même intrus se reconnaîtraient de loin.
            if (usedIntruders[q.intruderId]) continue;
            usedIntruders[q.intruderId] = 1;
            out.push(q);
        }
        return out;
    }

    // --- 5. QUI EST-CE ? -------------------------------------------------
    //
    // Un portrait, quatre noms. Les figures viennent des panthéons : ce sont les
    // seuls événements à porter une image (champ `image`), et leur titre suit
    // toujours « Naissance de X », dont on tire le nom — le même découpage que la
    // galerie (js/gallery.js: galleryNameOf), vérifié identique par un test.
    //
    // Les mauvaises réponses sont tirées du MÊME vivier que la bonne : ce sont
    // les noms que le joueur vient de croiser, et le seul moyen de n'avoir ni
    // donnée à écrire, ni option qui détonne. Elles préfèrent le même domaine
    // (un chanteur parmi des chanteurs : on ne se trompe pas sur le métier), et
    // écartent un nom de famille déjà dans la question — deux Grimm, deux
    // Roosevelt rendraient la réponse indécidable au visage.

    // « Naissance de Victor Hugo » → « Victor Hugo » ; « Naissance du Caravage »
    // → « le Caravage ». Un titre hors modèle reste entier.
    function whoNameOf(evt) {
        var titre = String((evt && evt.titre) || '').trim();
        var m = /^Naissance (?:de |d'|d’)(.+)$/.exec(titre);
        if (m) return m[1];
        m = /^Naissance du (.+)$/.exec(titre);
        if (m) return 'le ' + m[1];
        return titre;
    }

    function hasPortrait(evt) {
        return !!(evt && evt.image && typeof evt.image.src === 'string' && evt.image.src);
    }

    // Les figures dont on peut faire une question : un portrait, un nom, et un
    // nom distinct — deux événements qui donneraient la même étiquette ne
    // feraient qu'une seule bonne réponse possible.
    function whoCandidates(events) {
        var seen = {};
        return (events || []).filter(function (e) {
            if (!hasPortrait(e)) return false;
            var name = whoNameOf(e);
            if (!name || seen[name]) return false;
            seen[name] = 1;
            return true;
        });
    }

    // Ce qui rapproche deux noms au point de les confondre au visage : le nom de famille
    // (dernier mot de « Victor Hugo »), ou le prénom d'un souverain (« Louis XIV » et
    // « Louis XVI » : leur dernier mot est un numéral, qui ne les distingue de personne).
    function familyKey(name) {
        var words = name.split(/\s+/);
        var last = words[words.length - 1];
        return (words.length > 1 && /^(?:Ier|Ire|[IVX]+)$/.test(last) ? words[0] : last).toLowerCase();
    }

    function buildWhoQuestion(candidates, correct, rng) {
        var name = whoNameOf(correct);
        var others = candidates.filter(function (e) { return e.id !== correct.id; });
        // Pas de nom de famille partagé avec la bonne réponse ; à défaut de
        // vivier assez large, on relâche cette règle plutôt que de renoncer.
        var strict = others.filter(function (e) { return familyKey(whoNameOf(e)) !== familyKey(name); });
        var pool = strict.length >= WHO_OPTIONS - 1 ? strict : others;
        // Le même domaine d'abord, puis les autres.
        var sameAxis = shuffle(pool.filter(function (e) { return e.axe && e.axe === correct.axe; }), rng);
        var rest = shuffle(pool.filter(function (e) { return !(e.axe && e.axe === correct.axe); }), rng);
        var wrong = [];
        var lastWords = {};
        sameAxis.concat(rest).forEach(function (e) {
            if (wrong.length >= WHO_OPTIONS - 1) return;
            var w = familyKey(whoNameOf(e));
            if (lastWords[w]) return; // deux mauvaises réponses au même nom de famille : une seule suffit
            lastWords[w] = 1;
            wrong.push(e);
        });
        // Si cette dernière règle a trop réduit le choix, on complète sans elle.
        if (wrong.length < WHO_OPTIONS - 1) {
            sameAxis.concat(rest).forEach(function (e) {
                if (wrong.length < WHO_OPTIONS - 1 && wrong.indexOf(e) === -1) wrong.push(e);
            });
        }
        if (wrong.length < WHO_OPTIONS - 1) return null;
        var options = shuffle([correct].concat(wrong), rng).map(function (e) {
            return { id: e.id, name: whoNameOf(e) };
        });
        return { kind: 'who', correct: correct, name: name, correctId: correct.id, options: options };
    }

    function buildWhoQuestions(events, options) {
        options = options || {};
        var rng = options.rng || Math.random;
        var count = options.count || WHO_ROUNDS;
        var candidates = whoCandidates(events);
        if (candidates.length < WHO_OPTIONS) return [];
        // Chaque figure ne sert qu'une fois comme bonne réponse.
        var out = [];
        shuffle(candidates, rng).forEach(function (correct) {
            if (out.length >= count) return;
            var q = buildWhoQuestion(candidates, correct, rng);
            if (q) out.push(q);
        });
        return out;
    }

    return {
        HISTORICAL_YEAR_LIMIT: HISTORICAL_YEAR_LIMIT,
        ORDER_CARDS: ORDER_CARDS,
        BLITZ_SECONDS: BLITZ_SECONDS,
        BLITZ_PENALTY_SECONDS: BLITZ_PENALTY_SECONDS,
        SLIDER_ROUNDS: SLIDER_ROUNDS,
        INTRUS_ROUNDS: INTRUS_ROUNDS,
        INTRUS_OPTIONS: INTRUS_OPTIONS,
        WHO_ROUNDS: WHO_ROUNDS,
        WHO_OPTIONS: WHO_OPTIONS,
        WHO_MIN_PORTRAITS: WHO_MIN_PORTRAITS,

        buildOrderRounds: buildOrderRounds,
        scoreOrderAttempt: scoreOrderAttempt,

        buildBlitzQuestion: buildBlitzQuestion,
        buildBlitzQuestions: buildBlitzQuestions,

        sliderScaleFor: sliderScaleFor,
        buildSliderRounds: buildSliderRounds,
        scoreSliderGuess: scoreSliderGuess,

        buildPeriodIntrus: buildPeriodIntrus,
        buildAxisIntrus: buildAxisIntrus,
        buildIntrusQuestions: buildIntrusQuestions,

        whoNameOf: whoNameOf,
        whoCandidates: whoCandidates,
        buildWhoQuestion: buildWhoQuestion,
        buildWhoQuestions: buildWhoQuestions
    };
});
