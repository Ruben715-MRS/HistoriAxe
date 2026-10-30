// =========================================================================
// === HISTORIAXE — LIEN ET QR CODE POUR REJOINDRE UNE CLASSE (PUR) ===
// =========================================================================
// L'enseignant affiche un lien https://…/?classe=ABCD23 (et son QR code) : les élèves l'ouvrent ou le scannent
// et arrivent directement sur le salon, code déjà saisi. Ce module ne touche ni au DOM ni au réseau : il sert
// à construire le lien et à relire le code dans l'adresse. Testé hors navigateur (tests/classLink.test.js).

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.ClassLink = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Même alphabet que api/_lib/classroom.js (sans I, O, 0, 1).
    const CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;
    const PARAM = 'classe';

    // Le lien pointe toujours vers le site web : l'app native n'a pas d'adresse http à montrer.
    function joinLink(origin, code) {
        return origin.replace(/\/+$/, '') + '/?' + PARAM + '=' + encodeURIComponent(code);
    }

    // Le code de l'adresse, normalisé comme à la saisie (casse, espaces, tirets) ; null s'il n'est pas valide.
    function codeFromSearch(search) {
        const raw = new URLSearchParams(search || '').get(PARAM);
        if (!raw) return null;
        const code = raw.toUpperCase().replace(/[\s-]+/g, '');
        return CODE_PATTERN.test(code) ? code : null;
    }

    return { joinLink, codeFromSearch };
});
