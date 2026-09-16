// =========================================================================
// === HISTORIAXE — MODE « PENDANT CE TEMPS, AILLEURS… » (SIMULTANÉITÉ) ===
// =========================================================================
//
// Tous les autres modes de jeu piochent dans UN SEUL thème. On peut donc
// maîtriser « Révolution française » et « Histoire de la Chine » chacun de
// son côté sans jamais savoir que Qianlong régnait en 1789. Ce mode-ci est
// le seul qui fasse travailler les 795 thèmes ensemble.
//
// L'asymétrie fait tout le mode :
//
//     L'ANCRE vient du thème en cours. Les RÉPONSES viennent d'ailleurs.
//
// C'est délibéré, et ce n'est pas qu'une question de cadrage : la question
// « lequel de ces 4 événements est contemporain de X ? » n'est répondable
// que si le joueur connaît X. Le thème qu'il vient d'ouvrir est justement
// ce qu'il connaît — un tirage global n'offrirait pas cette garantie, et la
// question se réduirait à « ces deux choses au hasard sont-elles
// contemporaines ? ».
//
// La vraie récompense n'est pas la question mais le RÉVÉLÉ qui la suit :
// deux ou trois contemporains réels affichés après chaque réponse, bonne ou
// mauvaise (voir buildReveal). La question n'est que le prétexte.
//
// --- CE QUE LES DONNÉES IMPOSENT -----------------------------------------
//
// Quatre contraintes, chacune mesurée sur data/fr.json plutôt que supposée :
//
// 1. DÉDOUBLONNER. 540 événements figurent dans plusieurs thèmes (1 265
//    occurrences, 6 % de la base) : « Chute du mur de Berlin » est dans 6
//    thèmes. Sans dédoublonnage, le mode proposerait comme « ailleurs »
//    l'ancre elle-même, vue depuis un autre thème. Le titre exact ne suffit
//    pas : 0,30 % des paires candidates ont des titres seulement PROCHES
//    (« Lancement de Spoutnik 1 » / « Lancement de Spoutnik »), d'où le
//    recouvrement de mots de titlesTooClose().
//
// 2. EXCLURE LE CALENDRIER NON GRÉGORIEN, via DailyEngine.EXCLUDED_THEME_IDS
//    — la même liste que les Défis, et pour la même raison : une année
//    hébraïque 5700 mélangée au reste de la base donnerait des
//    « contemporains » aberrants.
//
// 3. LIMITER LES RÉPONSES AUX ⭐ INCONTOURNABLES. C'est la contrainte de
//    qualité, et la plus importante. Sans elle, la génération produit des
//    paires exactes mais vides : « Invention du moteur à quatre temps
//    (1876) » → « Part étudier le droit en Angleterre (1878) ». Le coupable
//    est la catégorie Biographies et ses milliers de micro-événements de
//    vie. Le champ `essentiel` règle ça tout seul : il donne un vivier de
//    ~3 400 réponses dont AUCUNE n'est biographique, et 97 % des événements
//    restent utilisables comme ancres. Les biographies font d'excellentes
//    ancres, jamais des réponses.
//
// 4. ASSUMER UN BIAIS MODERNE. 41 % du vivier de réponses tombe entre 1800
//    et 1999 ; avant 1500, chaque siècle n'en offre que 30 à 110. Un thème
//    d'Antiquité tournera donc sur un vivier mince et se répétera davantage.
//    C'est une limite du contenu, pas du code : elle se corrigera en
//    étendant `essentiel` (aujourd'hui absent de 0 % des Biographies et de
//    2 % des Programmes scolaires), pas en touchant ce fichier.
//
// --- CE QUE « AILLEURS » VEUT DIRE ---------------------------------------
//
// Les cinq catégories ne sont PAS un signal de lieu : « Histoires
// nationales > Europe > Histoire de France » et « Programmes scolaires >
// France » parlent du même endroit. Les opposer comme « ailleurs » serait
// faux. L'étiquette est donc dérivée de l'identifiant du thème, jamais du
// nom de sa catégorie — qui change d'une langue à l'autre (même précaution
// que js/geoMap.js: isGeoEligible, et pour la même raison : data/en.json
// n'a pas d'équivalent à « Histoires nationales »).
//
// Voir themeTag() pour les trois règles.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.Simultaneity = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Un événement est « contemporain » de l'ancre à moins de CLOSE_YEARS,
    // et ne peut servir de distracteur qu'à partir de FAR_YEARS. L'écart
    // entre les deux seuils est la marge de sécurité du mode : aucune
    // réponse ne doit être défendable à moitié, sinon le joueur a raison de
    // contester. Une génération qui ne trouve rien dans ces bornes renonce
    // à la question plutôt que de les élargir.
    var CLOSE_YEARS = 5;
    var FAR_YEARS = 40;
    var SESSION_ROUNDS = 12;
    var OPTIONS_PER_QUESTION = 4;
    // Au-delà, une date n'est plus une année d'histoire mais un ordre de
    // grandeur géologique (« Maîtrise du feu par l'homme », -400000). Ces
    // événements existent dans la base et restent de bonnes ancres ailleurs,
    // mais comme distracteurs ils se repèrent au premier coup d'œil et
    // rendent la question gratuite. Même seuil que js/app.js:
    // LONG_YEAR_THRESHOLD, qui les affiche déjà à part.
    var LONG_YEAR_THRESHOLD = 10000;
    // Un distracteur trop éloigné de l'ancre s'élimine sans rien savoir. On
    // essaie d'abord de rester dans cette fenêtre, quitte à élargir si le
    // vivier de l'époque est trop mince (voir pickDistractors).
    var DISTRACTOR_MAX_GAP = 500;
    // Deux titres partageant cette fraction de leurs mots significatifs
    // désignent presque toujours le même événement (voir contrainte 1).
    var TITLE_OVERLAP_MAX = 0.6;
    // Nombre de contemporains supplémentaires montrés au révélé, en plus de
    // la bonne réponse.
    var REVEAL_EXTRAS = 2;

    // Mots trop fréquents pour distinguer deux titres l'un de l'autre.
    var STOP_WORDS = {
        de: 1, du: 1, des: 1, la: 1, le: 1, les: 1, et: 1, en: 1, au: 1,
        aux: 1, un: 1, une: 1, dans: 1, sur: 1, par: 1, pour: 1, the: 1,
        of: 1, and: 1, in: 1
    };

    function normalizeTitle(text) {
        if (!text) return '';
        var s = String(text).toLowerCase();
        if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
        return s.replace(/[^a-z0-9]+/g, ' ').trim();
    }

    function titleTokens(text) {
        var out = {};
        normalizeTitle(text).split(' ').forEach(function (w) {
            if (w.length > 2 && !STOP_WORDS[w]) out[w] = 1;
        });
        return out;
    }

    // Deux titres désignent-ils vraisemblablement le même événement ? Le
    // titre identique est le cas courant (6 % de la base) ; le recouvrement
    // de mots rattrape « Lancement de Spoutnik 1 » vs « Lancement de
    // Spoutnik », que l'égalité stricte laisserait passer.
    function titlesTooClose(a, b) {
        var na = normalizeTitle(a), nb = normalizeTitle(b);
        if (!na || !nb) return false;
        if (na === nb) return true;
        var ta = titleTokens(a), tb = titleTokens(b);
        var ka = Object.keys(ta), kb = Object.keys(tb);
        if (!ka.length || !kb.length) return false;
        var shared = 0;
        ka.forEach(function (w) { if (tb[w]) shared++; });
        return shared / Math.min(ka.length, kb.length) >= TITLE_OVERLAP_MAX;
    }

    // Étiquette de lieu/domaine d'un thème — c'est elle qui définit le
    // « ailleurs » : deux événements ne peuvent se répondre que si leurs
    // étiquettes diffèrent.
    //
    //   1. le thème a un pays connu (assets/geo/theme-country-map.json, déjà
    //      là pour le Mode Carte) → ce pays ;
    //   2. son identifiant suit la convention `psn_<iso2>_…` des programmes
    //      scolaires nationaux → ce pays, ce qui évite d'opposer
    //      « Programmes scolaires > Allemagne » à « Histoire de l'Allemagne » ;
    //   3. sinon → sa position dans l'arbre (indices, pas noms : voir
    //      l'en-tête). « Culture générale > Sciences » et « Culture générale >
    //      Arts » deviennent deux domaines distincts, ce qui est le bon
    //      grain pour un « ailleurs » thématique plutôt que géographique.
    //
    // Limite connue : les thèmes du programme scolaire FRANÇAIS portent des
    // identifiants historiques (col_6e, sec_t1, hggsp_ter_t3…) sans code
    // pays, et tombent donc dans le cas 3. Ils ne sont pas tous français
    // pour autant (HGGSP traite du monde entier), si bien qu'un code pays
    // forcé serait faux dans l'autre sens. Le filet reste titlesTooClose(),
    // et ces thèmes ne pèsent que 81 réponses sur ~3 400.
    function themeTag(themeId, pathIndices, countryByTheme) {
        var iso = countryByTheme && countryByTheme[themeId];
        if (iso) return 'pays:' + String(iso).toUpperCase();
        var m = /^psn_([a-z]{2})_/.exec(themeId || '');
        if (m) return 'pays:' + m[1].toUpperCase();
        return 'branche:' + (pathIndices || []).join('.');
    }

    // Parcourt la base et renvoie { answers, byYear } : le vivier dans
    // lequel les BONNES RÉPONSES sont piochées. Volontairement restreint aux
    // ⭐ Incontournables (contrainte 3) — ce n'est pas le même ensemble que
    // les ancres, qui sont, elles, tous les événements du thème en cours.
    function buildAnswerPool(bdd, options) {
        options = options || {};
        var countryByTheme = options.countryByTheme || {};
        var excluded = {};
        (options.excludedThemeIds || []).forEach(function (id) { excluded[id] = 1; });

        var answers = [];
        var seen = {};

        (bdd || []).forEach(function (category, ci) {
            (function walk(node, pathIndices) {
                if (!node) return;
                if (node.subcategories) {
                    node.subcategories.forEach(function (sub, si) {
                        walk(sub, pathIndices.concat(si));
                    });
                    return;
                }
                (node.themes || []).forEach(function (theme) {
                    if (!theme || excluded[theme.id]) return;
                    var essential = theme.essentiel;
                    if (!essential || !essential.length) return;
                    var keep = {};
                    essential.forEach(function (id) { keep[id] = 1; });
                    var tag = themeTag(theme.id, pathIndices, countryByTheme);
                    // Une étiquette de branche réduite au seul indice de
                    // catégorie désigne une catégorie SANS sous-catégories :
                    // tous ses thèmes partagent alors le même « lieu », si
                    // bien qu'un thème français y répondrait à une ancre
                    // française sous le titre « ailleurs ». C'est le cas de
                    // « CAPES & Agrégation », dont les thèmes sont des
                    // monographies (une région, une période) plutôt que des
                    // repères mondiaux. Ils restent d'excellentes ANCRES —
                    // seul le vivier de réponses les écarte. Règle
                    // structurelle et non liste en dur : toute future
                    // catégorie plate sera traitée pareil.
                    if (tag.indexOf('branche:') === 0 && pathIndices.length < 2) return;

                    (theme.events || []).forEach(function (evt) {
                        if (!evt || typeof evt.date !== 'number' || !keep[evt.id]) return;
                        if (Math.abs(evt.date) >= LONG_YEAR_THRESHOLD) return;
                        // Un même événement présent dans plusieurs thèmes ne
                        // doit entrer qu'une fois dans le vivier, sans quoi
                        // deux options d'une même question pourraient le
                        // désigner toutes les deux.
                        var key = normalizeTitle(evt.titre) + '|' + evt.date;
                        if (seen[key]) return;
                        seen[key] = 1;
                        answers.push({
                            id: evt.id,
                            titre: evt.titre,
                            date: evt.date,
                            axe: evt.axe || '',
                            tag: tag,
                            themeId: theme.id,
                            themeName: theme.nom || ''
                        });
                    });
                });
            })(category, [ci]);
        });

        var byYear = {};
        answers.forEach(function (a) {
            (byYear[a.date] || (byYear[a.date] = [])).push(a);
        });
        return { answers: answers, byYear: byYear };
    }

    // Étiquette de CHAQUE événement de la base, y compris non essentiel.
    // Le vivier de réponses (buildAnswerPool) ne visite que les essentiels ;
    // les ancres, elles, sont n'importe quel événement du thème en cours — et
    // en mode Révision, d'une dizaine de thèmes à la fois. Sans cet index,
    // une session de révision donnerait la même étiquette à toutes ses ancres
    // et « ailleurs » deviendrait un mensonge dès que la réponse viendrait du
    // thème dont l'ancre est issue.
    function buildTagIndex(bdd, options) {
        options = options || {};
        var countryByTheme = options.countryByTheme || {};
        var index = {};
        (bdd || []).forEach(function (category, ci) {
            (function walk(node, pathIndices) {
                if (!node) return;
                if (node.subcategories) {
                    node.subcategories.forEach(function (sub, si) {
                        walk(sub, pathIndices.concat(si));
                    });
                    return;
                }
                (node.themes || []).forEach(function (theme) {
                    if (!theme) return;
                    var tag = themeTag(theme.id, pathIndices, countryByTheme);
                    (theme.events || []).forEach(function (evt) {
                        // Premier thème rencontré qui le porte : un événement
                        // présent dans plusieurs thèmes (6 % de la base) garde
                        // une seule étiquette, ce qui suffit à l'écarter de
                        // ses propres réponses.
                        if (evt && index[evt.id] === undefined) index[evt.id] = tag;
                    });
                });
            })(category, [ci]);
        });
        return index;
    }

    function contemporariesOf(anchor, pool) {
        var out = [];
        for (var y = anchor.date - CLOSE_YEARS; y <= anchor.date + CLOSE_YEARS; y++) {
            var bucket = pool.byYear[y];
            if (!bucket) continue;
            for (var i = 0; i < bucket.length; i++) {
                var cand = bucket[i];
                if (cand.tag === anchor.tag) continue;
                if (cand.id === anchor.id) continue;
                if (titlesTooClose(cand.titre, anchor.titre)) continue;
                out.push(cand);
            }
        }
        return out;
    }

    // Mélange de Fisher-Yates sur un générateur injectable — le même
    // algorithme que js/app.js: shuffleArray, mais ce module doit rester
    // testable hors navigateur et déterministe sous graine.
    function shuffle(list, rng) {
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
        return out;
    }

    // Distracteurs : assez loin dans le temps pour qu'aucun ne soit
    // défendable, et d'étiquettes distinctes entre eux pour que les quatre
    // options n'aient pas l'air de venir du même endroit.
    //
    // Deux passes plutôt qu'un seul filtre : on cherche d'abord dans la
    // fenêtre DISTRACTOR_MAX_GAP, pour que les options restent du même
    // monde que l'ancre et qu'il faille vraiment connaître les dates ; on
    // n'élargit à toute la base que si l'époque de l'ancre n'offre pas assez
    // de candidats — ce qui arrive avant 1500, où le vivier est mince.
    function pickDistractors(anchor, correct, pool, rng) {
        var picked = [];
        var usedTags = {};
        usedTags[correct.tag] = 1;

        function collect(maxGap) {
            shuffle(pool.answers, rng).forEach(function (cand) {
                if (picked.length >= OPTIONS_PER_QUESTION - 1) return;
                var gap = Math.abs(cand.date - anchor.date);
                if (gap < FAR_YEARS || gap > maxGap) return;
                if (usedTags[cand.tag]) return;
                if (titlesTooClose(cand.titre, anchor.titre)) return;
                usedTags[cand.tag] = 1;
                picked.push(cand);
            });
        }

        collect(DISTRACTOR_MAX_GAP);
        if (picked.length < OPTIONS_PER_QUESTION - 1) collect(Infinity);
        return picked;
    }

    // Construit une question autour d'une ancre, ou renvoie null si le
    // vivier ne permet pas de la poser proprement.
    function buildQuestion(anchor, pool, rng) {
        if (!anchor || typeof anchor.date !== 'number') return null;

        var close = contemporariesOf(anchor, pool);
        if (!close.length) return null;
        var correct = shuffle(close, rng)[0];

        var far = pickDistractors(anchor, correct, pool, rng);
        if (far.length < OPTIONS_PER_QUESTION - 1) return null;

        return {
            anchor: anchor,
            correct: correct,
            distractors: far,
            options: shuffle([correct].concat(far), rng),
            reveal: buildReveal(anchor, correct, close, rng)
        };
    }

    // Le révélé : la bonne réponse, plus jusqu'à REVEAL_EXTRAS autres
    // contemporains venus d'ailleurs encore. C'est là que le mode enseigne
    // quelque chose, donc on diversifie les étiquettes plutôt que de montrer
    // trois fois le même pays.
    function buildReveal(anchor, correct, close, rng) {
        var items = [correct];
        var usedTags = {};
        usedTags[correct.tag] = 1;
        shuffle(close, rng).forEach(function (cand) {
            if (items.length > REVEAL_EXTRAS) return;
            if (usedTags[cand.tag]) return;
            if (titlesTooClose(cand.titre, correct.titre)) return;
            usedTags[cand.tag] = 1;
            items.push(cand);
        });
        return items.sort(function (a, b) { return a.date - b.date; });
    }

    // Une session complète. `anchors` est la liste des événements du thème
    // en cours (filtre d'axes et ⭐ déjà appliqués par l'appelant) ; on en
    // retient au plus `count` qui donnent une question valide.
    function buildSession(anchors, pool, options) {
        options = options || {};
        var rng = options.rng || Math.random;
        var count = options.count || SESSION_ROUNDS;
        var questions = [];
        var usedCorrect = {};

        shuffle((anchors || []).filter(function (e) {
            return e && typeof e.date === 'number';
        }), rng).forEach(function (anchor) {
            if (questions.length >= count) return;
            var q = buildQuestion(anchor, pool, rng);
            // Deux questions d'une même session ne doivent pas avoir la même
            // bonne réponse : le joueur la reconnaîtrait sans réfléchir.
            if (!q || usedCorrect[q.correct.id]) return;
            usedCorrect[q.correct.id] = 1;
            questions.push(q);
        });
        return questions;
    }

    return {
        CLOSE_YEARS: CLOSE_YEARS,
        FAR_YEARS: FAR_YEARS,
        SESSION_ROUNDS: SESSION_ROUNDS,
        OPTIONS_PER_QUESTION: OPTIONS_PER_QUESTION,
        normalizeTitle: normalizeTitle,
        titlesTooClose: titlesTooClose,
        themeTag: themeTag,
        buildAnswerPool: buildAnswerPool,
        buildTagIndex: buildTagIndex,
        contemporariesOf: contemporariesOf,
        buildQuestion: buildQuestion,
        buildSession: buildSession
    };
});
