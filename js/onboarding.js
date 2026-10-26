// =========================================================================
// === HISTORIAXE — ONBOARDING GUIDÉ (COACH-MARKS DES 3 PREMIÈRES MINUTES) ===
// =========================================================================
// Séquence de bulles d'aide contextuelles pour un nouvel arrivant : avec une
// dizaine de boutons au menu, des centaines de thèmes et une vingtaine de modes
// de jeu, un premier lancement sans repère peut submerger. Ce module montre
// des bulles très courtes aux points d'entrée existants (showScreen()/endGame()
// dans js/app.js) : un tour du menu principal (bienvenue, Chemin du Temps,
// Défis, Réviser, le reste, profil), puis une bulle à la première visite de la
// carte des mondes, deux à celle de l'écran des modes, une à la fin de la
// première partie. Aucune navigation forcée, aucun blocage : l'utilisateur
// peut « Passer le tutoriel » à tout moment.
//
// Persistance : js/storage.js (onboardingLoad/onboardingSave, clé
// ONBOARDING_KEY), volontairement locale à l'appareil (pas de sync cloud, comme
// les réglages d'affichage).
//
// Aucune dépendance externe : un calque plein écran + une bulle positionnée
// à côté de l'élément ciblé, le "trou" en spotlight étant simplement un
// box-shadow géant sur un élément positionné par-dessus la cible (voir
// css/style.css: .onboarding-*).

var Onboarding = (function () {
    'use strict';

    // Les identifiants d'origine (welcome, daily_or_categories, modes, first_xp) sont gardés tels quels : un
    // joueur au milieu de l'ancien tutoriel ne revoit pas ce qu'il a déjà vu.
    var STEPS = ['welcome', 'path', 'rewards', 'daily_or_categories', 'revise', 'more', 'profile',
        'path_screen', 'modes_play', 'modes', 'first_xp'];

    // Le tour du menu principal, dans l'ordre. `target` : ce que la bulle éclaire (aucun : bulle centrée).
    var MENU_TOUR = [
        { id: 'welcome', target: null, nextKey: 'onboarding.lets_go_btn', nextFallback: "C'est parti" },
        { id: 'path', target: '#btn-path' },
        { id: 'rewards', target: '.rewards-bar' },
        { id: 'daily_or_categories', target: '#btn-daily' },
        { id: 'revise', target: '#btn-reviser' },
        { id: 'more', target: '#quick-actions-2' },
        { id: 'profile', target: '.profile-btn', nextKey: 'onboarding.got_it_label', nextFallback: 'Compris !' }
    ];

    // Textes de repli (français), utilisés si le pack de langue n'a pas encore la clé.
    var FALLBACK = {
        welcome: ["👋 Bienvenue dans HistoriAxe !", "Remets des événements dans l'ordre, retrouve des dates, explore des cartes et des portraits… Un tour rapide en quelques bulles, à passer quand tu veux."],
        path: ["🛤️ Le Chemin du Temps", "Le parcours guidé : 21 mondes, de la Préhistoire à nos jours, niveau après niveau. Chaque niveau rapporte jusqu'à 3 étoiles ★ et des pièces 🪙. Commence par le Monde 0, qui sert de tutoriel."],
        rewards: ["🪙 Pièces, album et amis", "Tes pièces 🪙 et ta série de victoires ⚡ ; la Boutique pour les dépenser ; l'Album de cartes à collectionner ; tes Amis, pour se défier ; et l'Équipe, le coffre commun d'une classe."],
        daily: ["🎯 Les Défis", "Le Défi du jour : 10 événements à remettre dans l'ordre, en 2 minutes chrono. C'est le point de départ de ta série quotidienne 🔥. Il y a aussi un Défi hebdomadaire et un Défi de simultanéité, avec classement."],
        revise: ["🧠 Réviser", "Le jeu retient tes erreurs et te les repropose au bon moment (répétition espacée). Le chiffre entre parenthèses, c'est le nombre d'événements à revoir aujourd'hui."],
        more: ["🕹️ Et aussi…", "La Salle de jeux (arcade : Tetris des siècles, Snake, Pac-Man…), l'Atelier (convertisseurs, calendriers, repères, cartes historiques) et l'Atlas, qui place tous les événements sur une carte."],
        profile: ["🏆 Ton profil", "En haut : tes trophées et ton grade 🏆, la ligue de la semaine 🥇 et les réglages ⚙ (c'est là que tu peux revoir ce tutoriel). Cherche un thème dans la barre de recherche, ou ouvre une catégorie plus bas."],
        path_screen: ["🗺️ La carte des mondes", "Touche un monde pour ouvrir ses niveaux. Un niveau enchaîne plusieurs épreuves ; réussis-le pour débloquer le suivant. Le Monde 0 explique comment les historiens découpent le temps : tu peux le passer si tu le connais déjà."],
        modes_play: ["▶ Jouer", "Un seul tap pour lancer ta partie favorite (Classique au départ). Tu peux changer ce mode dans les Réglages."],
        modes: ["🧭 Tous les modes", "En dessous : la frise (Entraînement, Classique…), des défis express (Quiz, Blitz, Curseur…) et des modes pour explorer. Pour débuter, essaie Découverte : la frise sans aucune pression, sans vie en jeu."],
        first_xp: ["🔥 Bravo, tu as gagné de l'XP !", "Reviens chaque jour jouer le Défi du jour pour garder ta série : plus elle dure longtemps, plus l'XP que tu gagnes est multiplié (visible en haut du menu). Un seul jour manqué, et tout repart à zéro."]
    };
    // Le Défi du jour garde ses clés historiques `onboarding.daily_*`.
    var KEY_PREFIX = { daily_or_categories: 'daily' };
    var overlayEl = null;

    function state() {
        return (typeof onboardingLoad === 'function') ? onboardingLoad() : { completed: true, shownSteps: [] };
    }

    function isDone() {
        return !!state().completed;
    }

    function hasShown(step) {
        return (state().shownSteps || []).indexOf(step) !== -1;
    }

    function markShown(step) {
        if (typeof onboardingSave !== 'function') return;
        var s = state();
        s.shownSteps = s.shownSteps || [];
        if (s.shownSteps.indexOf(step) === -1) s.shownSteps.push(step);
        if (s.shownSteps.length >= STEPS.length) s.completed = true;
        onboardingSave(s);
    }

    function skipAll() {
        if (typeof onboardingSave === 'function') {
            onboardingSave({ completed: true, shownSteps: STEPS.slice(), skippedAt: Date.now() });
        }
        teardown();
    }

    // Relance la séquence depuis le début (bouton « Revoir le tutoriel »,
    // js/app.js: restartOnboarding, appelé depuis modal-settings).
    function restart() {
        if (typeof onboardingSave !== 'function') return;
        onboardingSave({ completed: false, shownSteps: [] });
    }

    function teardown() {
        if (overlayEl && overlayEl.parentNode) overlayEl.parentNode.removeChild(overlayEl);
        overlayEl = null;
    }

    function escapeHtmlOb(str) {
        return String(str == null ? '' : str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function showCoachMark(step, opts) {
        if (isDone() || hasShown(step)) return false;
        var target = opts.targetSelector ? document.querySelector(opts.targetSelector) : null;
        // Cible attendue mais absente du DOM (écran pas encore rendu, etc.) :
        // on retente une fois au lieu d'afficher une bulle sans spotlight.
        if (opts.targetSelector && !target && !opts._retried) {
            setTimeout(function () { showCoachMark(step, Object.assign({}, opts, { _retried: true })); }, 250);
            return false;
        }

        // Une cible sous le pli (petit écran) est amenée à l'écran avant d'être mesurée.
        if (target && target.scrollIntoView) {
            try { target.scrollIntoView({ block: 'center' }); } catch (e) { /* ancien navigateur */ }
        }

        teardown();
        overlayEl = document.createElement('div');
        overlayEl.className = 'onboarding-overlay';

        var rect = target ? target.getBoundingClientRect() : null;
        var spotlightHtml = '';
        var bubbleStyle = '';
        if (rect && rect.width > 0) {
            var pad = 8;
            spotlightHtml = '<div class="onboarding-spotlight" style="' +
                'top:' + Math.max(0, rect.top - pad) + 'px;' +
                'left:' + Math.max(0, rect.left - pad) + 'px;' +
                'width:' + (rect.width + pad * 2) + 'px;' +
                'height:' + (rect.height + pad * 2) + 'px;"></div>';
            var top = rect.bottom + 16;
            if (top + 200 > window.innerHeight) top = Math.max(16, rect.top - 200);
            bubbleStyle = 'top:' + top + 'px;';
        }

        overlayEl.innerHTML =
            spotlightHtml +
            '<div class="onboarding-bubble" style="' + bubbleStyle + '">' +
                '<div class="onboarding-bubble-title">' + escapeHtmlOb(opts.title || '') + '</div>' +
                '<div class="onboarding-bubble-text">' + escapeHtmlOb(opts.text || '') + '</div>' +
                '<div class="onboarding-bubble-actions">' +
                    '<button type="button" class="onboarding-skip">' + escapeHtmlOb(opts.skipLabel || (typeof t === 'function' ? t('onboarding.skip_label') : 'Passer le tutoriel')) + '</button>' +
                    '<button type="button" class="onboarding-next">' + escapeHtmlOb(opts.nextLabel || (typeof t === 'function' ? t('onboarding.next_label') : 'Suivant')) + '</button>' +
                '</div>' +
            '</div>';

        document.body.appendChild(overlayEl);
        overlayEl.querySelector('.onboarding-skip').onclick = skipAll;
        overlayEl.querySelector('.onboarding-next').onclick = function () {
            markShown(step);
            teardown();
            if (typeof opts.onNext === 'function') opts.onNext();
        };
        return true;
    }

    // --- Points d'entrée, appelés depuis js/app.js ---

    // Repli sur le texte français figé si i18n.js n'est pas encore chargé (ne
    // devrait pas arriver, l'ordre des <script> le charge avant celui-ci, mais
    // ce module est appelé depuis plusieurs points d'entrée de js/app.js).
    function ob(key, fallback) {
        if (typeof t !== 'function') return fallback;
        var val = t(key);
        return (val && val !== key) ? val : fallback;
    }

    function stepTexts(id) {
        var prefix = KEY_PREFIX[id] || id;
        var fb = FALLBACK[prefix];
        return { title: ob('onboarding.' + prefix + '_title', fb[0]), text: ob('onboarding.' + prefix + '_text', fb[1]) };
    }

    // Le prochain pas du tour du menu qui n'a pas encore été vu et dont la cible est à l'écran.
    function nextMenuStep() {
        for (var i = 0; i < MENU_TOUR.length; i++) {
            var step = MENU_TOUR[i];
            if (hasShown(step.id)) continue;
            if (step.target && !document.querySelector(step.target)) continue;
            return step;
        }
        return null;
    }

    function showMenuStep() {
        var screen = document.getElementById('screen-categories');
        if (isDone() || !screen || screen.classList.contains('hidden')) return;
        var step = nextMenuStep();
        if (!step) return;
        var texts = stepTexts(step.id);
        showCoachMark(step.id, {
            targetSelector: step.target || undefined,
            title: texts.title,
            text: texts.text,
            nextLabel: step.nextKey ? ob(step.nextKey, step.nextFallback) : undefined,
            onNext: function () { setTimeout(showMenuStep, 250); }
        });
    }

    // Le menu principal est le premier écran de l'app (l'accueil n'est qu'un écran de chargement) :
    // le tour s'y déroule bulle après bulle, et reprend là où il s'était arrêté si on le quitte.
    function onCategoriesScreen() {
        if (isDone()) return;
        setTimeout(showMenuStep, 300);
    }

    // Première visite de la carte des mondes.
    function onPathScreen() {
        if (isDone() || hasShown('path_screen')) return;
        setTimeout(function () {
            var texts = stepTexts('path_screen');
            showCoachMark('path_screen', { title: texts.title, text: texts.text });
        }, 400);
    }

    function showModesGroupsMark() {
        var texts = stepTexts('modes');
        showCoachMark('modes', {
            targetSelector: '#mode-card-discovery',
            title: texts.title,
            text: texts.text,
            nextLabel: ob('onboarding.got_it_label', 'Compris !')
        });
    }

    // Écran des modes : d'abord le bouton « Jouer », puis le reste des modes.
    function onModesScreen() {
        if (isDone()) return;
        setTimeout(function () {
            if (!hasShown('modes_play')) {
                var texts = stepTexts('modes_play');
                showCoachMark('modes_play', {
                    targetSelector: '#btn-modes-play',
                    title: texts.title,
                    text: texts.text,
                    onNext: function () { setTimeout(showModesGroupsMark, 250); }
                });
            } else if (!hasShown('modes')) {
                showModesGroupsMark();
            }
        }, 300);
    }

    function onFirstGameEnd() {
        if (isDone() || hasShown('first_xp')) return;
        setTimeout(function () {
            var hasXpChip = !!document.getElementById('end-xp-display') && !document.getElementById('end-xp-display').classList.contains('hidden');
            var texts = stepTexts('first_xp');
            showCoachMark('first_xp', {
                targetSelector: hasXpChip ? '#end-xp-display' : undefined,
                title: texts.title,
                text: texts.text,
                nextLabel: ob('onboarding.got_it_label', 'Compris !')
            });
        }, 500);
    }

    return {
        onCategoriesScreen: onCategoriesScreen,
        onPathScreen: onPathScreen,
        onModesScreen: onModesScreen,
        onFirstGameEnd: onFirstGameEnd,
        restart: restart,
        isDone: isDone
    };
})();
