// =========================================================================
// === HISTORIAXE — ONBOARDING GUIDÉ (COACH-MARKS DES 3 PREMIÈRES MINUTES) ===
// =========================================================================
// Séquence de bulles d'aide contextuelles pour un nouvel arrivant : avec 5
// catégories, des centaines de thèmes et 7 modes de jeu, un premier lancement
// sans repère peut submerger. Ce module se contente de montrer 4 bulles très
// courtes aux points d'entrée existants (showScreen()/endGame() dans
// js/app.js) — aucune nouvelle navigation forcée, aucun blocage : l'utilisateur
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

    var STEPS = ['welcome', 'daily_or_categories', 'modes', 'first_xp'];
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
                    '<button type="button" class="onboarding-skip">' + escapeHtmlOb(opts.skipLabel || 'Passer le tutoriel') + '</button>' +
                    '<button type="button" class="onboarding-next">' + escapeHtmlOb(opts.nextLabel || 'Suivant') + '</button>' +
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

    function onHomeScreen() {
        if (isDone() || hasShown('welcome')) return;
        showCoachMark('welcome', {
            title: '👋 Bienvenue dans HistoriAxe !',
            text: "Découvre comment progresser en 3 minutes : une ou deux bulles d'aide vont s'afficher pendant que tu explores. Touche l'écran pour commencer.",
            nextLabel: "C'est parti"
        });
    }

    function onCategoriesScreen() {
        if (isDone() || hasShown('daily_or_categories')) return;
        setTimeout(function () {
            showCoachMark('daily_or_categories', {
                targetSelector: '#btn-daily',
                title: '🎯 Le Défi du jour',
                text: "10 événements à remettre dans l'ordre, en 2 minutes chrono : la façon la plus simple de commencer, et le point de départ de ta série quotidienne 🔥. Tu peux aussi explorer une catégorie ci-dessous."
            });
        }, 300);
    }

    function onModesScreen() {
        if (isDone() || hasShown('modes')) return;
        setTimeout(function () {
            showCoachMark('modes', {
                targetSelector: '#mode-card-discovery',
                title: '🧭 Le mode Découverte',
                text: "Parfait pour débuter : consulte la frise chronologique sans aucune pression, aucune vie en jeu. Une fois à l'aise, essaie le mode Classique !"
            });
        }, 300);
    }

    function onFirstGameEnd() {
        if (isDone() || hasShown('first_xp')) return;
        setTimeout(function () {
            var hasXpChip = !!document.getElementById('end-xp-display') && !document.getElementById('end-xp-display').classList.contains('hidden');
            showCoachMark('first_xp', {
                targetSelector: hasXpChip ? '#end-xp-display' : undefined,
                title: "🔥 Bravo, tu as gagné de l'XP !",
                text: "Reviens chaque jour jouer le Défi du jour pour garder ta série : plus elle dure longtemps, plus l'XP que tu gagnes est multiplié (visible en haut de l'écran d'accueil). Un seul jour manqué, et tout repart à zéro.",
                nextLabel: 'Compris !'
            });
        }, 500);
    }

    return {
        onHomeScreen: onHomeScreen,
        onCategoriesScreen: onCategoriesScreen,
        onModesScreen: onModesScreen,
        onFirstGameEnd: onFirstGameEnd,
        restart: restart,
        isDone: isDone
    };
})();
