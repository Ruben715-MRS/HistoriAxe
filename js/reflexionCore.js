// =========================================================================
// === LES JEUX DE RÉFLEXION — RÈGLES DU MEMORY CHRONOLOGIQUE ET DE « QUI SUIS-JE ? » ===
// =========================================================================
// Cinq jeux au tour par tour, sans minuteur. Ici, seulement les règles (états purs, sans DOM) ; les écrans sont dans
// js/app/reflexion.js. Testé dans tests/reflexionCore.test.js.
//
//  - MEMORY : six événements, douze cartes (le titre de l'événement d'un côté, sa date de l'autre), face cachée. On
//    retourne deux cartes ; si ce sont l'événement et sa date, la paire reste. Une erreur = deux cartes qui ne vont pas
//    ensemble (deux événements, deux dates, ou un événement et une autre date).
//  - QUI SUIS-JE ? : une figure à trouver parmi quatre noms, avec des indices qui s'ajoutent un par un (domaine et pays,
//    siècle, phrases de sa notice dont le nom est caché, enfin son portrait). Plus on trouve tôt, plus on marque ; une
//    mauvaise réponse retire l'option et dévoile l'indice suivant.
//  - CAUSE OU CONSÉQUENCE ? : deux événements ; on dit lequel a provoqué l'autre (ou lequel est la conséquence de l'autre).
//    L'explication du mécanisme suit chaque réponse. Contenu écrit à la main : js/reflexionContent.js.
//  - PENDU DES DATES : l'événement est nommé, l'année est cachée, chiffre par chiffre. On propose un chiffre (il se dévoile partout où
//    il est, ou coûte une vie) ou une année entière (« plus tôt » / « plus tard », au prix d'une vie si elle est fausse).
//  - CHASSE AUX ANACHRONISMES : une scène d'une époque, huit éléments dont deux ou trois n'y ont pas leur place. On désigne
//    ceux qu'on croit anachroniques, puis on valide : chaque anachronisme trouvé rapporte, chaque élément à sa place désigné à
//    tort retire un point.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory(require('./arcadeCore.js'));
    else root.ReflexionCore = factory(root.ArcadeCore);
}(typeof self !== 'undefined' ? self : this, function (Arcade) {
    'use strict';

    // --- MEMORY ---------------------------------------------------------------------------------------
    var MEMORY_PAIRS = 6;
    // 100 points par paire, 25 de moins par erreur.
    var MEMORY_PAIR_POINTS = 100;
    var MEMORY_ERROR_COST = 25;

    // Un événement du vivier : { id, title, date }. Douze cartes : { pair, side: 'event' | 'date', event }.
    function createMemory(pool, rng, pairs) {
        var n = pairs || MEMORY_PAIRS;
        var events = Arcade.pickDistinct(Arcade.playable(pool), rng, n);
        var state = { pairs: n, cards: [], flipped: [], matched: {}, moves: 0, errors: 0, over: false };
        if (events.length < n) { state.over = true; state.empty = true; return state; }
        var cards = [];
        events.forEach(function (event, pair) {
            cards.push({ pair: pair, side: 'event', event: event });
            cards.push({ pair: pair, side: 'date', event: event });
        });
        state.cards = Arcade.shuffle(cards, rng);
        return state;
    }

    // Retourne la carte `index`. Renvoie : 'flip' (première carte), 'match' (une paire), 'miss' (deux cartes qui ne vont pas
    // ensemble : elles restent visibles jusqu'à memoryHide), 'done' (dernière paire).
    function memoryFlip(state, index) {
        var out = [];
        var card = state.cards[index];
        if (state.over || !card || state.matched[card.pair]) return out;
        if (state.flipped.length >= 2 || state.flipped.indexOf(index) !== -1) return out;
        state.flipped.push(index);
        if (state.flipped.length === 1) { out.push('flip'); return out; }
        state.moves += 1;
        var a = state.cards[state.flipped[0]], b = state.cards[state.flipped[1]];
        if (a.pair === b.pair && a.side !== b.side) {
            state.matched[a.pair] = true;
            state.flipped = [];
            out.push('match');
            if (Object.keys(state.matched).length === state.pairs) { state.over = true; out.push('done'); }
        } else {
            state.errors += 1;
            out.push('miss');
        }
        return out;
    }

    // Recache les deux cartes d'une erreur.
    function memoryHide(state) {
        state.flipped = [];
    }

    function memoryScore(state) {
        return Math.max(0, MEMORY_PAIR_POINTS * state.pairs - MEMORY_ERROR_COST * state.errors);
    }

    // --- QUI SUIS-JE ? -----------------------------------------------------------------------------------
    var WHO_ROUNDS = 6;
    // Points selon le nombre d'indices déjà montrés quand on trouve : 100, 80, 60, 40, 20.
    var WHO_POINTS = [100, 80, 60, 40, 20];
    var WHO_MAX_TEXT_CLUES = 2;

    var ROMAN = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

    function roman(n) {
        var out = '';
        ROMAN.forEach(function (pair) { while (n >= pair[0]) { out += pair[1]; n -= pair[0]; } });
        return out;
    }

    // Le siècle d'une année, en toutes lettres : 1789 → « XVIIIe siècle », 44 av. J.-C. → « Ier siècle av. J.-C. ».
    function centuryLabel(year) {
        var n = Math.ceil(Math.abs(year) / 100) || 1;
        return roman(n) + (n === 1 ? 'er' : 'e') + ' siècle' + (year < 0 ? ' av. J.-C.' : '');
    }

    // Particules qui ne désignent personne : « de », « du », « von »…
    var NAME_STOPWORDS = { de: 1, du: 1, des: 1, d: 1, le: 1, la: 1, les: 1, l: 1, von: 1, van: 1, der: 1, den: 1, el: 1, al: 1, bin: 1, ibn: 1, ben: 1, dos: 1, da: 1, di: 1, y: 1, et: 1, the: 1, of: 1 };
    // Les lettres qui ne se décomposent pas en « lettre + accent » : « Ørsted » se reconnaît dans « Orsted ».
    var FOLD_EXTRA = { 'ø': 'o', 'đ': 'd', 'ł': 'l', 'æ': 'a', 'œ': 'o', 'ß': 's', 'ð': 'd', 'þ': 't', 'ı': 'i' };

    // Une lettre sans accent ni casse, toujours UN caractère pour un caractère : le texte plié garde la longueur de l'original,
    // ce qui permet de chercher dans l'un et de remplacer dans l'autre.
    function foldChar(ch) {
        var base = ch.normalize('NFD').charAt(0).toLowerCase();
        return FOLD_EXTRA[base] || base;
    }

    function fold(text) {
        return text.split('').map(foldChar).join('');
    }

    function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

    // Les mots qui disent le nom : ceux du nom, et ceux du nom de classement (« Afrikaner, Jonker »). Ni particules, ni
    // mots d'une lettre, ni petits mots en minuscules (« wa », « bin »).
    function nameTokens() {
        var seen = {};
        var out = [];
        Array.prototype.slice.call(arguments).forEach(function (name) {
            String(name || '').split(/[\s'’,.-]+/).forEach(function (w) {
                var key = fold(w.normalize('NFC'));
                if (key.length < 2 || NAME_STOPWORDS[key] || seen[key]) return;
                if (key.length <= 3 && w === w.toLowerCase()) return;
                seen[key] = true;
                out.push(w);
            });
        });
        return out;
    }

    // Cache le nom dans un texte : chaque mot du nom devient « … », et « … du … » se range en un seul « … ». Les dates de
    // naissance et de mort entre parenthèses sont cachées aussi : le siècle est un indice à part.
    function maskName(text, tokens) {
        var original = String(text || '').normalize('NFC').replace(/\s*\([^()]*\d{3,4}[^()]*\)/g, ' (…)');
        var folded = fold(original);
        // Plus long d'abord : « Ier » ne doit pas entamer un mot plus long.
        tokens.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (token) {
            var re = new RegExp('(^|[^\\p{L}])(' + escapeRegExp(fold(token.normalize('NFC'))) + ')(?=[^\\p{L}]|$)', 'gu');
            var m;
            var spans = [];
            while ((m = re.exec(folded))) { spans.push([m.index + m[1].length, m[2].length]); if (m[0].length === 0) re.lastIndex++; }
            // De la fin vers le début, pour que les positions restent valables.
            spans.reverse().forEach(function (span) {
                original = original.slice(0, span[0]) + '…' + original.slice(span[0] + span[1]);
                folded = folded.slice(0, span[0]) + '…' + folded.slice(span[0] + span[1]);
            });
        });
        // Les particules entre deux mots cachés (« … du … ») disparaissent avec eux.
        original = original.replace(/…(?:[ \t'’-]+(?:(?:de|du|des|d|le|la|les|von|van|der|den|el|al|bin|ibn|ben|dos|da|di|y)[ \t'’-]+)?…)+/giu, '…');
        return original.replace(/\s+/g, ' ').trim();
    }

    // Découpe une notice en phrases. « av. J.-C. » et « apr. J.-C. » ne terminent pas une phrase.
    function splitSentences(text) {
        var NB = '\u00A0';
        var protectedText = String(text || '').replace(/\b(av|apr)\. J\.-C\./g, '$1.' + NB + 'J.-C.');
        var parts = protectedText.split(/([.!?])[ ]+(?=[A-ZÀ-ÖØ-Ý«“"])/);
        var sentences = [];
        for (var i = 0; i < parts.length; i += 2) {
            var s = (parts[i] + (parts[i + 1] || '')).split(NB).join(' ').trim();
            if (s) sentences.push(s);
        }
        return sentences;
    }

    // Les indices d'une figure, du plus vague au plus précis :
    //  { type: 'domain', axis, country } · { type: 'period', label } · { type: 'text', text } (au plus deux) · { type: 'portrait' }
    // `countryName(iso)` donne le nom d'un pays dans la langue de l'interface (il peut renvoyer vide).
    function buildClues(evt, name, countryName) {
        var clues = [];
        var country = evt.pays && countryName ? countryName(evt.pays) : '';
        if (evt.axe || country) clues.push({ type: 'domain', axis: evt.axe || '', country: country || '' });
        if (typeof evt.date === 'number') clues.push({ type: 'period', label: centuryLabel(evt.date) });
        var tokens = nameTokens(name, evt.classement);
        splitSentences(evt.description).slice(0, WHO_MAX_TEXT_CLUES).forEach(function (sentence) {
            var text = maskName(sentence, tokens);
            // Une phrase réduite à des « … » n'apprend rien.
            if (text.replace(/[…\s().,]/g, '').length >= 12) clues.push({ type: 'text', text: text });
        });
        clues.push({ type: 'portrait' });
        return clues;
    }

    // `questions` : { correctId, name, options: [{ id, name }], clues }.
    function createWho(questions) {
        var state = { questions: questions, index: 0, shown: 1, disabled: {}, score: 0, found: 0, errors: 0, results: [], resolved: null, over: !questions.length };
        if (!questions.length) state.empty = true;
        return state;
    }

    function whoQuestion(state) {
        return state.questions[state.index] || null;
    }

    function whoPoints(shown) {
        return WHO_POINTS[Math.min(shown, WHO_POINTS.length) - 1];
    }

    // Un indice de plus, à la demande.
    function whoReveal(state) {
        var q = whoQuestion(state);
        if (state.over || !q || state.resolved || state.shown >= q.clues.length) return [];
        state.shown += 1;
        return ['clue'];
    }

    // Répond. Renvoie : 'right' (trouvé, points selon les indices montrés), 'wrong' (l'option est retirée et un indice de
    // plus est dévoilé), 'lost' (plus d'indice ni d'espoir : manche perdue).
    function whoPick(state, optionId) {
        var q = whoQuestion(state);
        if (state.over || !q || state.resolved || state.disabled[optionId]) return [];
        if (optionId === q.correctId) {
            var points = whoPoints(state.shown);
            state.score += points;
            state.found += 1;
            state.resolved = 'right';
            state.results.push({ id: q.correctId, name: q.name, shown: state.shown, points: points });
            return ['right'];
        }
        state.disabled[optionId] = true;
        state.errors += 1;
        if (state.shown < q.clues.length) { state.shown += 1; return ['wrong']; }
        // Dernier indice vu et toujours faux : la réponse reste à choisir parmi les options non retirées, mais chaque erreur
        // coûte. Quand il ne reste que la bonne, la manche est perdue d'avance : on la clôt.
        var remaining = q.options.filter(function (o) { return !state.disabled[o.id]; });
        if (remaining.length <= 1) {
            state.resolved = 'lost';
            state.results.push({ id: q.correctId, name: q.name, shown: state.shown, points: 0 });
            return ['wrong', 'lost'];
        }
        return ['wrong'];
    }

    // Passe à la manche suivante (une fois celle-ci résolue). Renvoie 'next' ou 'done'.
    function whoNext(state) {
        if (state.over || !state.resolved) return [];
        state.index += 1;
        state.shown = 1;
        state.disabled = {};
        state.resolved = null;
        if (state.index >= state.questions.length) { state.over = true; return ['done']; }
        return ['next'];
    }



    // --- PENDU DES DATES -----------------------------------------------------------------------------------
    var HANGMAN_ROUNDS = 5;
    // Les niveaux : vies par manche ; `hint`, le « plus tôt / plus tard » donné après une année fausse ; `freeDigit`, le premier chiffre offert.
    var HANGMAN_LEVELS = {
        easy: { lives: 6, hint: true, freeDigit: true },
        normal: { lives: 4, hint: true, freeDigit: false },
        hard: { lives: 3, hint: false, freeDigit: false }
    };
    var HANGMAN_BASE = 30;
    var HANGMAN_PER_LIFE = 10;

    // Cinq événements aux années différentes, de un à quatre chiffres. `digits` : l'année sans signe ; `bc` : avant J.-C.
    // `options` : { difficulty: 'easy' | 'normal' | 'hard' }.
    function createHangman(pool, rng, rounds, options) {
        var difficulty = Arcade.normalizeDifficulty(options && options.difficulty);
        var level = HANGMAN_LEVELS[difficulty];
        var n = rounds || HANGMAN_ROUNDS;
        var events = Arcade.pickDistinct((pool || []).filter(function (e) {
            return e && typeof e.date === 'number' && e.title && Math.abs(e.date) >= 1 && Math.abs(e.date) <= 9999;
        }), rng, n);
        var questions = events.map(function (event) { return { event: event, digits: String(Math.abs(event.date)), bc: event.date < 0 }; });
        var state = { difficulty: difficulty, level: level, questions: questions, index: 0, guessed: {}, lives: level.lives, resolved: null, hint: null, score: 0, found: 0, results: [], over: !questions.length, empty: !questions.length };
        hangmanOffer(state);
        return state;
    }

    // En facile, le premier chiffre de l'année est offert (sauf pour une année trop courte, ou faite d'un seul chiffre répété : la manche
    // serait déjà gagnée).
    function hangmanOffer(state) {
        var q = state.questions[state.index];
        if (!q || !state.level.freeDigit || q.digits.length < 3) return;
        if (q.digits.split('').every(function (d) { return d === q.digits.charAt(0); })) return;
        state.guessed[q.digits.charAt(0)] = true;
    }

    function hangmanQuestion(state) { return state.questions[state.index] || null; }

    // Les cases : le chiffre s'il est trouvé, sinon null ; toutes quand la manche est résolue.
    function hangmanSlots(state) {
        var q = hangmanQuestion(state);
        if (!q) return [];
        return q.digits.split('').map(function (d) { return state.resolved || state.guessed[d] ? d : null; });
    }

    function hangmanResolve(state, how) {
        var q = hangmanQuestion(state);
        state.resolved = how;
        var points = how === 'solved' ? HANGMAN_BASE + HANGMAN_PER_LIFE * state.lives : 0;
        state.score += points;
        if (how === 'solved') state.found += 1;
        state.results.push({ id: q.event.id, title: q.event.title, date: q.event.date, solved: how === 'solved', lives: state.lives, points: points });
    }

    function hangmanLoseLife(state, out) {
        state.lives -= 1;
        if (state.lives <= 0) { hangmanResolve(state, 'lost'); out.push('lost'); }
    }

    // Propose un chiffre (« 0 » à « 9 »). Renvoie : 'hit' (il est dans l'année), 'miss' (il n'y est pas : une vie en moins),
    // 'solved' (tous les chiffres sont trouvés), 'lost' (plus de vie).
    function hangmanGuess(state, digit) {
        var q = hangmanQuestion(state);
        var d = String(digit);
        if (state.over || !q || state.resolved || !/^[0-9]$/.test(d) || state.guessed[d]) return [];
        state.guessed[d] = true;
        state.hint = null;
        var out = [];
        if (q.digits.indexOf(d) !== -1) {
            out.push('hit');
            if (q.digits.split('').every(function (x) { return state.guessed[x]; })) { hangmanResolve(state, 'solved'); out.push('solved'); }
        } else {
            out.push('miss');
            hangmanLoseLife(state, out);
        }
        return out;
    }

    // Propose une année entière (négative avant J.-C.). Juste : la manche est gagnée. Fausse : une vie en moins, et on apprend si la vraie date
    // est plus tôt ou plus tard (`state.hint` : 'earlier' ou 'later').
    function hangmanTryYear(state, year) {
        var q = hangmanQuestion(state);
        if (state.over || !q || state.resolved || !Number.isInteger(year) || year === 0) return [];
        if (year === q.event.date) { hangmanResolve(state, 'solved'); state.hint = null; return ['solved']; }
        state.hint = state.level.hint ? (q.event.date < year ? 'earlier' : 'later') : null;
        var out = state.hint ? ['wrong', state.hint] : ['wrong'];
        hangmanLoseLife(state, out);
        return out;
    }

    function hangmanNext(state) {
        if (state.over || !state.resolved) return [];
        state.index += 1;
        state.guessed = {};
        state.lives = state.level.lives;
        state.resolved = null;
        state.hint = null;
        if (state.index >= state.questions.length) { state.over = true; return ['done']; }
        hangmanOffer(state);
        return ['next'];
    }

    // --- CAUSE OU CONSÉQUENCE ? ----------------------------------------------------------------------------
    var CAUSE_ROUNDS = 8;
    var CAUSE_POINTS = 100;

    // `items` : { id, cause: { title, year }, effect: { title, year }, explain }. Pour chaque manche : de quel côté (0 : gauche,
    // 1 : droite) se trouve la cause, et ce qu'on demande (la cause, ou la conséquence) — les deux sens se mêlent, pour qu'on ne
    // réponde pas toujours par le même réflexe.
    function createCause(items, rng, rounds) {
        var random = rng || Math.random;
        var picks = Arcade.shuffle(items, random).slice(0, rounds || CAUSE_ROUNDS);
        var questions = picks.map(function (item) {
            return { item: item, causeSide: random() < 0.5 ? 0 : 1, kind: random() < 0.5 ? 'cause' : 'effect' };
        });
        return { questions: questions, index: 0, score: 0, found: 0, results: [], resolved: null, over: !questions.length, empty: !questions.length };
    }

    function causeQuestion(state) {
        return state.questions[state.index] || null;
    }

    // Les deux cartes affichées : [gauche, droite], chacune { title, year, role }.
    function causeSides(question) {
        var sides = [];
        sides[question.causeSide] = { title: question.item.cause.title, year: question.item.cause.year, role: 'cause' };
        sides[1 - question.causeSide] = { title: question.item.effect.title, year: question.item.effect.year, role: 'effect' };
        return sides;
    }

    // Répond en désignant une carte (0 ou 1). Renvoie : 'right' ou 'wrong'.
    function causeAnswer(state, side) {
        var q = causeQuestion(state);
        if (state.over || !q || state.resolved || (side !== 0 && side !== 1)) return [];
        var expected = q.kind === 'cause' ? q.causeSide : 1 - q.causeSide;
        var right = side === expected;
        state.resolved = right ? 'right' : 'wrong';
        if (right) { state.score += CAUSE_POINTS; state.found += 1; }
        state.results.push({ id: q.item.id, right: right, kind: q.kind });
        return [state.resolved];
    }

    function causeNext(state) {
        if (state.over || !state.resolved) return [];
        state.index += 1;
        state.resolved = null;
        if (state.index >= state.questions.length) { state.over = true; return ['done']; }
        return ['next'];
    }

    // --- CHASSE AUX ANACHRONISMES --------------------------------------------------------------------------
    var SCENE_ROUNDS = 5;
    var SCENE_POINTS = 100;
    // Les niveaux : `penalty`, ce que retire un élément désigné à tort (en anachronismes trouvés) ; `announce`, le nombre d'anachronismes
    // dit au joueur (« 2 intrus à trouver ») au lieu de le laisser deviner.
    var SCENE_LEVELS = {
        easy: { penalty: 0.5, announce: true },
        normal: { penalty: 1, announce: false },
        hard: { penalty: 2, announce: false }
    };

    function sceneTotal(scene) {
        return scene.elements.filter(function (e) { return e.anachronism; }).length;
    }

    // `scenes` : { id, title, when, intro, elements: [{ icon, text, anachronism, why }] }. L'ordre d'affichage des éléments est
    // mêlé à chaque partie (sinon les anachronismes seraient toujours en dernier) ; `selected` : indices dans scene.elements.
    // `options` : { difficulty: 'easy' | 'normal' | 'hard' }.
    function createScenes(scenes, rng, rounds, options) {
        var difficulty = Arcade.normalizeDifficulty(options && options.difficulty);
        var random = rng || Math.random;
        var picks = Arcade.shuffle(scenes, random).slice(0, rounds || SCENE_ROUNDS);
        var list = picks.map(function (scene) {
            var order = Arcade.shuffle(scene.elements.map(function (e, i) { return i; }), random);
            return { scene: scene, order: order };
        });
        return { difficulty: difficulty, level: SCENE_LEVELS[difficulty], rounds: list, index: 0, selected: {}, resolved: null, score: 0, results: [], over: !list.length, empty: !list.length };
    }

    function sceneRound(state) {
        return state.rounds[state.index] || null;
    }

    // Désigne (ou désélectionne) un élément, avant la validation.
    function sceneToggle(state, elementIndex) {
        var round = sceneRound(state);
        if (state.over || !round || state.resolved || !round.scene.elements[elementIndex]) return [];
        if (state.selected[elementIndex]) delete state.selected[elementIndex];
        else state.selected[elementIndex] = true;
        return ['toggle'];
    }

    // Valide la sélection : anachronismes trouvés, éléments désignés à tort, anachronismes manqués. Les points : 100 si tout est trouvé
    // sans erreur ; chaque erreur retire autant qu'un anachronisme trouvé en rapporte (la moitié en facile, le double en difficile).
    function sceneValidate(state) {
        var round = sceneRound(state);
        if (state.over || !round || state.resolved) return [];
        var found = [], wrong = [], missed = [];
        round.scene.elements.forEach(function (e, i) {
            var chosen = !!state.selected[i];
            if (chosen && e.anachronism) found.push(i);
            else if (chosen) wrong.push(i);
            else if (e.anachronism) missed.push(i);
        });
        var total = sceneTotal(round.scene);
        var points = Math.max(0, Math.round(SCENE_POINTS * (found.length - state.level.penalty * wrong.length) / total));
        state.score += points;
        state.resolved = { found: found, wrong: wrong, missed: missed, points: points, total: total };
        state.results.push({ id: round.scene.id, title: round.scene.title, found: found.length, total: total, wrong: wrong.length, points: points });
        return ['validated'];
    }

    function sceneNext(state) {
        if (state.over || !state.resolved) return [];
        state.index += 1;
        state.selected = {};
        state.resolved = null;
        if (state.index >= state.rounds.length) { state.over = true; return ['done']; }
        return ['next'];
    }

    return {
        MEMORY_PAIRS: MEMORY_PAIRS, WHO_ROUNDS: WHO_ROUNDS, WHO_POINTS: WHO_POINTS,
        createMemory: createMemory, memoryFlip: memoryFlip, memoryHide: memoryHide, memoryScore: memoryScore,
        centuryLabel: centuryLabel, nameTokens: nameTokens, maskName: maskName, splitSentences: splitSentences, buildClues: buildClues,
        HANGMAN_ROUNDS: HANGMAN_ROUNDS, HANGMAN_LEVELS: HANGMAN_LEVELS, SCENE_LEVELS: SCENE_LEVELS,
        createHangman: createHangman, hangmanQuestion: hangmanQuestion, hangmanSlots: hangmanSlots, hangmanGuess: hangmanGuess,
        hangmanTryYear: hangmanTryYear, hangmanNext: hangmanNext,
        CAUSE_ROUNDS: CAUSE_ROUNDS, SCENE_ROUNDS: SCENE_ROUNDS,
        createCause: createCause, causeQuestion: causeQuestion, causeSides: causeSides, causeAnswer: causeAnswer, causeNext: causeNext,
        createScenes: createScenes, sceneRound: sceneRound, sceneTotal: sceneTotal, sceneToggle: sceneToggle, sceneValidate: sceneValidate, sceneNext: sceneNext,
        createWho: createWho, whoQuestion: whoQuestion, whoPoints: whoPoints, whoReveal: whoReveal, whoPick: whoPick, whoNext: whoNext
    };
}));
