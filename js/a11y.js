// =========================================================================
// === HISTORIAXE — ACCÈS AU CLAVIER (js/a11y.js) =========================
// =========================================================================
//
// Jusqu'ici l'app ne se jouait qu'au doigt ou à la souris. Un inventaire
// des écrans, fait en parcourant l'app dans un vrai navigateur, comptait 59
// éléments cliquables sans accès clavier — à commencer par l'écran d'accueil
// tout entier, un `<div onclick>` : au clavier, on ne pouvait littéralement
// pas démarrer l'app. S'y ajoutaient l'absence de tout anneau de focus
// global, un champ de recherche dont le focus était supprimé
// (`outline: none`), et aucune gestion du focus entre écrans ni dans les
// modales.
//
// --- CHOIX DE CONCEPTION ----------------------------------------------
//
// `role="button"` + `tabindex="0"` + un seul gestionnaire de touches global,
// plutôt que la conversion de chaque `<div>` en `<button>`. Le `<button>`
// natif est préférable en principe, mais la quarantaine de sites concernés
// (cartes de mode, de catégorie, de thème, d'axe…) portent des styles
// propres : les convertir aurait demandé de réinitialiser le rendu d'un
// bouton à chaque fois, avec un risque visuel réel pour un gain nul, puisque
// l'accessibilité obtenue est la même. Là où l'élément est déjà un vrai
// <button> (les créneaux de la frise, les options de quiz, les pions de la
// carte), rien ne change.
//
// Une seule règle pour les éléments qui contiennent d'autres contrôles
// (la carte-thème, avec son étoile de favori et sa corbeille) : on ne rend
// PAS la carte focalisable. Un rôle `button` ne doit pas en contenir un
// autre — les lecteurs d'écran n'exposent alors pas l'intérieur. Le titre
// devient le contrôle principal, l'étoile et la corbeille des contrôles
// frères, et la carte garde son clic à la souris. On la marque
// `data-kbd-proxy` pour dire que son équivalent clavier est ailleurs.
//
// Comme js/simultaneity.js et js/gameModes.js, la logique de décision vit en
// fonctions pures, sans DOM (voir tests/a11y.test.js) ; le reste — écouteurs,
// observateur de modales, gestion du focus — ne se vérifie que dans un
// navigateur (voir e2e/clavier.spec.js).

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.A11y = factory();
        root.A11y.init();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Éléments dont le navigateur gère déjà le clavier : on n'y touche jamais,
    // sous peine de déclencher une activation en double.
    var NATIVE_TAGS = { BUTTON: 1, A: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, SUMMARY: 1 };

    // Entrée active un bouton ; Espace active aussi les cases à cocher et
    // interrupteurs, qui ne réagissent PAS à Entrée (convention ARIA : un
    // `checkbox` se coche à l'Espace, jamais à Entrée).
    var ENTER_ROLES = { button: 1, menuitem: 1, tab: 1, option: 1 };
    var SPACE_ROLES = { button: 1, menuitem: 1, tab: 1, option: 1, checkbox: 1, switch: 1, radio: 1 };

    var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
        'select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

    // --- LOGIQUE PURE ---------------------------------------------------

    // Que faire d'une touche pressée sur `ev.target` ? Renvoie 'click' (activer
    // l'élément), 'prevent' (neutraliser la touche sans rien activer) ou null
    // (laisser faire le navigateur).
    //
    // L'Espace se joue en deux temps : le keydown est neutralisé (sans quoi la
    // page défile) et l'activation n'a lieu qu'au keyup, comme un vrai bouton.
    // Entrée, elle, active au keydown, mais jamais en répétition : une touche
    // maintenue enfoncée ne doit pas lancer vingt parties.
    function activationFor(ev) {
        if (!ev || ev.defaultPrevented || ev.ctrlKey || ev.metaKey || ev.altKey) return null;
        var target = ev.target || {};
        if (NATIVE_TAGS[String(target.tagName || '').toUpperCase()]) return null;
        if (target.isContentEditable) return null;
        var role = target.role;
        if (!role) return null;

        if (ev.key === 'Enter') {
            if (ev.repeat) return null;
            return (ev.type === 'keydown' && ENTER_ROLES[role]) ? 'click' : null;
        }
        if (ev.key === ' ' || ev.key === 'Spacebar') {
            if (!SPACE_ROLES[role]) return null;
            if (ev.type === 'keydown') return 'prevent';
            return ev.type === 'keyup' ? 'click' : null;
        }
        return null;
    }

    // Piège à focus d'une modale : où envoyer le focus quand Tab est pressé ?
    // Renvoie null (navigation naturelle du navigateur), -1 (ne rien faire :
    // la modale n'a aucun contrôle focalisable) ou l'indice de l'élément à
    // focaliser de force. On n'intervient qu'aux deux bords — au milieu, le
    // navigateur sait très bien avancer — et quand le focus a fui hors de la
    // modale (indice courant -1).
    function trapMove(current, count, backwards) {
        if (count <= 0) return -1;
        if (current < 0) return backwards ? count - 1 : 0;
        if (backwards && current === 0) return count - 1;
        if (!backwards && current === count - 1) return 0;
        return null;
    }

    // Quelle modale est « au-dessus » ? La plus haute par z-index, et à
    // z-index égal la dernière dans le document. La confirmation (z-index 105)
    // s'ouvre souvent par-dessus une autre modale (100) qui la précède ou la
    // suit dans le DOM : l'ordre du document seul ne suffit donc pas.
    function topmostIndex(items) {
        var best = -1;
        for (var i = 0; i < items.length; i++) {
            if (best < 0 || items[i].z > items[best].z ||
                (items[i].z === items[best].z && items[i].order >= items[best].order)) best = i;
        }
        return best;
    }

    // --- OUTILS DOM -----------------------------------------------------

    function isVisible(el) {
        return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    }

    function focusablesIn(container) {
        return Array.prototype.filter.call(container.querySelectorAll(FOCUSABLE), isVisible);
    }

    function openModals() {
        return Array.prototype.filter.call(document.querySelectorAll('.modal-overlay'), function (m) {
            return !m.classList.contains('hidden');
        });
    }

    function topModal() {
        var modals = openModals();
        if (!modals.length) return null;
        var items = modals.map(function (m, i) {
            var z = parseInt(getComputedStyle(m).zIndex, 10);
            return { z: isNaN(z) ? 0 : z, order: i };
        });
        return modals[topmostIndex(items)];
    }

    function safeFocus(el) {
        try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
    }

    // Rend un élément quelconque activable au clavier : rôle, entrée dans
    // l'ordre de tabulation, et l'état ARIA qui va avec. Entrée et Espace sont
    // pris en charge par le gestionnaire global (voir init), rien à brancher
    // ici. Le nom accessible vient du contenu, sauf `label` explicite.
    function activatable(el, opts) {
        if (!el) return el;
        opts = opts || {};
        el.setAttribute('role', opts.role || 'button');
        if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
        if (opts.label) el.setAttribute('aria-label', opts.label);
        if (typeof opts.pressed === 'boolean') el.setAttribute('aria-pressed', String(opts.pressed));
        if (typeof opts.checked === 'boolean') el.setAttribute('aria-checked', String(opts.checked));
        if (typeof opts.expanded === 'boolean') el.setAttribute('aria-expanded', String(opts.expanded));
        if (opts.disabled) el.setAttribute('aria-disabled', 'true');
        else el.removeAttribute('aria-disabled');
        return el;
    }

    // Arrivée sur un écran : le focus passe au conteneur de l'écran (rendu
    // focalisable par programme, sans entrer dans l'ordre de tabulation).
    // Sans cela, l'élément qu'on vient de choisir disparaît avec l'écran
    // quitté, le focus retombe sur <body>, et la touche Tab repart du haut du
    // document au lieu du haut du nouvel écran.
    //
    // On focalise le conteneur plutôt que son titre : le titre se trouve
    // souvent APRÈS un bouton de retour, que Tab sauterait alors.
    function focusScreen(screen) {
        // Jamais avant une première action de l'utilisateur : au chargement,
        // showScreen('screen-home') passe ici, et lui voler le focus faisait
        // repartir le premier Tab de l'accueil vers le navigateur — un
        // utilisateur au clavier ne tombait sur « Commencer » qu'au second.
        // Voler le focus d'une page qu'on n'a pas encore touchée est de toute
        // façon une mauvaise manière.
        if (!screen || !interacted || openModals().length) return;
        makeFocusable(screen);
        safeFocus(screen);
    }

    // Rend un élément focalisable PAR PROGRAMME, sans l'ajouter à l'ordre de
    // tabulation (tabindex -1). Un élément qui l'est déjà — un champ, un
    // bouton, un `tabindex="0"` — est laissé tel quel : lui poser -1 le
    // RETIRERAIT de l'ordre de tabulation, ce que ferait par exemple le
    // curseur d'année si on le passait ici.
    function makeFocusable(el) {
        if (el.hasAttribute('tabindex') || el.matches(FOCUSABLE)) return;
        el.setAttribute('tabindex', '-1');
    }

    // Nouvelle question : le focus va à la carte-question de l'écran (balisée
    // `data-focus-target` dans index.html), faute de quoi il retombait sur
    // <body> avec les options reconstruites, et Tab repartait du bouton
    // « Quitter » à chaque question. Posé sur la carte plutôt que sur la
    // première option, pour qu'une touche Entrée enfoncée trop longtemps ne
    // réponde pas toute seule à la question suivante.
    function focusQuestion(screenId) {
        var screen = document.getElementById(screenId);
        if (!screen) return;
        focusScreen(screen.querySelector('[data-focus-target]') || screen);
    }

    // Reconstruire une liste détruit l'élément qui avait le focus : le focus
    // retombait sur <body>, et un utilisateur au clavier devait retabuler
    // depuis le haut après chaque case cochée. On retient la POSITION de
    // l'élément focalisé dans son conteneur et on la restitue après coup — les
    // contrôles se retrouvent à la même place quand la liste garde sa forme.
    function keepFocus(container, rebuild) {
        var active = document.activeElement;
        var index = -1;
        if (container && active && container.contains(active)) {
            index = focusablesIn(container).indexOf(active);
        }
        rebuild();
        if (index < 0 || !container) return;
        var again = focusablesIn(container);
        if (again.length) safeFocus(again[Math.min(index, again.length - 1)]);
    }

    // --- MODALES --------------------------------------------------------

    var openers = typeof WeakMap === 'function' ? new WeakMap() : null;

    function onModalToggled(modal, nowVisible) {
        var content = modal.querySelector('.modal-content') || modal;
        if (nowVisible) {
            var previous = document.activeElement;
            if (openers && previous && previous !== document.body && !modal.contains(previous)) {
                openers.set(modal, previous);
            }
            // Le focus va au conteneur et non au premier champ : un champ de
            // texte focalisé d'office ouvrirait le clavier à l'écran sur
            // mobile, à chaque ouverture, pour qui n'a rien demandé.
            if (!content.hasAttribute('tabindex')) content.setAttribute('tabindex', '-1');
            safeFocus(content);
        } else {
            var opener = openers ? openers.get(modal) : null;
            if (openers) openers.delete(modal);
            // Rendre le focus à ce qui avait ouvert la modale. Si cet élément a
            // disparu entre-temps (liste reconstruite), on retombe sur l'écran.
            if (opener && document.contains(opener) && isVisible(opener)) safeFocus(opener);
            else {
                var screen = document.querySelector('body > [id^="screen-"]:not(.hidden)');
                if (screen) focusScreen(screen);
            }
        }
    }

    // Chaque modale se déclare comme telle (rôle, modalité, nom) : sans cela
    // un lecteur d'écran continue de lire le contenu masqué derrière elle.
    function declareModals() {
        Array.prototype.forEach.call(document.querySelectorAll('.modal-overlay'), function (modal) {
            var content = modal.querySelector('.modal-content');
            if (!content) return;
            content.setAttribute('role', modal.id === 'modal-confirm' ? 'alertdialog' : 'dialog');
            content.setAttribute('aria-modal', 'true');
            var titleEl = modal.id === 'modal-confirm'
                ? modal.querySelector('#confirm-message')
                : content.querySelector('h1, h2, h3');
            if (titleEl) {
                if (!titleEl.id) titleEl.id = modal.id + '-title';
                content.setAttribute('aria-labelledby', titleEl.id);
            }
        });
    }

    function watchModals() {
        if (typeof MutationObserver !== 'function') return;
        var observer = new MutationObserver(function (records) {
            records.forEach(function (r) {
                var modal = r.target;
                var was = (r.oldValue || '').split(/\s+/).indexOf('hidden') === -1;
                var now = !modal.classList.contains('hidden');
                if (was !== now) onModalToggled(modal, now);
            });
        });
        Array.prototype.forEach.call(document.querySelectorAll('.modal-overlay'), function (modal) {
            observer.observe(modal, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
        });
    }

    // --- GESTIONNAIRES GLOBAUX -------------------------------------------

    function describe(e) {
        var t = e.target || {};
        return {
            key: e.key, type: e.type, repeat: e.repeat, defaultPrevented: e.defaultPrevented,
            ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey,
            target: {
                tagName: t.tagName,
                role: t.getAttribute ? t.getAttribute('role') : null,
                isContentEditable: t.isContentEditable
            }
        };
    }

    function onKey(e) {
        var action = activationFor(describe(e));
        if (action === 'click') { e.preventDefault(); e.target.click(); }
        else if (action === 'prevent') { e.preventDefault(); }
    }

    function onKeydown(e) {
        onKey(e);

        // Échap ferme la modale du dessus, comme le ferait son croisillon.
        if (e.key === 'Escape' && !e.defaultPrevented) {
            var modal = topModal();
            var closer = modal && modal.querySelector('.close-btn, [data-modal-close], #confirm-cancel-btn');
            if (closer) { e.preventDefault(); closer.click(); }
            return;
        }

        // Tab ne sort jamais d'une modale ouverte.
        if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
            var open = topModal();
            if (!open) return;
            var items = focusablesIn(open);
            var move = trapMove(items.indexOf(document.activeElement), items.length, e.shiftKey);
            if (move === null) return;
            e.preventDefault();
            if (move >= 0) safeFocus(items[move]);
        }
    }

    // Vrai dès la première touche, le premier clic ou le premier toucher (voir
    // focusScreen). Écouté en capture : aucun gestionnaire ne doit pouvoir
    // l'empêcher de se déclencher.
    var interacted = false;
    function markInteracted() { interacted = true; }

    var started = false;
    function init() {
        if (started || typeof document === 'undefined') return;
        started = true;
        ['keydown', 'pointerdown', 'mousedown', 'touchstart'].forEach(function (type) {
            document.addEventListener(type, markInteracted, { capture: true, passive: true });
        });
        document.addEventListener('keydown', onKeydown);
        document.addEventListener('keyup', onKey);
        declareModals();
        watchModals();
    }

    return {
        activationFor: activationFor,
        trapMove: trapMove,
        topmostIndex: topmostIndex,
        activatable: activatable,
        focusScreen: focusScreen,
        focusQuestion: focusQuestion,
        keepFocus: keepFocus,
        init: init
    };
});
