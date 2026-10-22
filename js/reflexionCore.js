// =========================================================================
// === LES JEUX DE RÉFLEXION — RÈGLES DU MEMORY CHRONOLOGIQUE ET DE « QUI SUIS-JE ? » ===
// =========================================================================
// Deux jeux au tour par tour, sans minuteur. Ici, seulement les règles (états purs, sans DOM) ; les écrans sont dans
// js/app/reflexion.js. Testé dans tests/reflexionCore.test.js.
//
//  - MEMORY : six événements, douze cartes (le titre de l'événement d'un côté, sa date de l'autre), face cachée. On
//    retourne deux cartes ; si ce sont l'événement et sa date, la paire reste. Une erreur = deux cartes qui ne vont pas
//    ensemble (deux événements, deux dates, ou un événement et une autre date).
//  - QUI SUIS-JE ? : une figure à trouver parmi quatre noms, avec des indices qui s'ajoutent un par un (domaine et pays,
//    siècle, phrases de sa notice dont le nom est caché, enfin son portrait). Plus on trouve tôt, plus on marque ; une
//    mauvaise réponse retire l'option et dévoile l'indice suivant.

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

    return {
        MEMORY_PAIRS: MEMORY_PAIRS, WHO_ROUNDS: WHO_ROUNDS, WHO_POINTS: WHO_POINTS,
        createMemory: createMemory, memoryFlip: memoryFlip, memoryHide: memoryHide, memoryScore: memoryScore,
        centuryLabel: centuryLabel, nameTokens: nameTokens, maskName: maskName, splitSentences: splitSentences, buildClues: buildClues,
        createWho: createWho, whoQuestion: whoQuestion, whoPoints: whoPoints, whoReveal: whoReveal, whoPick: whoPick, whoNext: whoNext
    };
}));
