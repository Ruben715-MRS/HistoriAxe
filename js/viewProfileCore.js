// =========================================================================
// === HISTORIAXE — PROFIL D'ACCUEIL : DISPOSITION PAR PROFIL (PUR) ===
// =========================================================================
// Le profil ne change que l'AFFICHAGE de l'accueil : quels boutons sont en tête, quels éléments de jeu sont
// masqués, et l'ordre des catégories. Rien ici ne touche au score, à la synchronisation ni aux records ; toutes les
// fonctions restent accessibles avec chaque profil (les éléments masqués se retrouvent dans l'Atelier ou dans
// « Profil et Trophées »). Ce module n'a aucune dépendance au DOM : il est testé hors navigateur
// (tests/viewProfileCore.test.js).

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.ViewProfile = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const PROFILES = ['culture', 'concours', 'scolaire'];
    const DEFAULT_PROFILE = 'culture';

    // Les boutons ronds de l'accueil, par rangée. Les clés sont lues par js/app/categories.js.
    const ALL_ROW_1 = ['favoris', 'daily', 'discover', 'resume'];
    const ALL_ROW_2 = ['revision', 'arcade', 'tools', 'atlas'];

    const LAYOUTS = {
        // Accueil complet, tel qu'il était : aucun élément masqué. C'est aussi le profil des joueurs existants.
        culture: {
            row1: ALL_ROW_1,
            row2: ALL_ROW_2,
            rewardsBar: true,
            pathCard: true,
            league: true,
            greeting: true,
            moreInProfile: []
        },
        // Préparer un concours : quatre boutons, un accueil sans jeu. Défis et Hasard se retrouvent avec le profil
        // « Culture générale » ; la Salle de jeux et l'Atlas sont dans l'Atelier ; le Chemin, les pièces et le reste
        // sont dans « Profil et Trophées ».
        concours: {
            row1: ['favoris', 'revision', 'tools', 'resume'],
            row2: [],
            rewardsBar: false,
            pathCard: false,
            league: false,
            greeting: false,
            moreInProfile: ['path', 'shop', 'album', 'friends', 'team', 'league']
        },
        // Programmes scolaires : même accueil que « Culture générale », avec les programmes en tête des catégories.
        scolaire: {
            row1: ALL_ROW_1,
            row2: ALL_ROW_2,
            rewardsBar: true,
            pathCard: true,
            league: true,
            greeting: true,
            moreInProfile: []
        }
    };

    // Les catégories mises en tête, dans l'ordre. Le reste garde l'ordre du pack.
    const CATEGORY_HEAD = {
        culture: [],
        concours: ['CAPES & Agrégation', 'Programmes scolaires', 'Histoires nationales', 'Culture générale', 'Personnages illustres'],
        scolaire: ['Programmes scolaires']
    };

    function normalize(value) {
        return PROFILES.indexOf(value) !== -1 ? value : DEFAULT_PROFILE;
    }

    function layout(profile) {
        return LAYOUTS[normalize(profile)];
    }

    // Les indices de `names` dans l'ordre d'affichage. Stable : deux catégories hors tête gardent leur ordre.
    function categoryOrder(profile, names) {
        const head = CATEGORY_HEAD[normalize(profile)];
        const rank = (name) => {
            const i = head.indexOf(name);
            return i === -1 ? head.length : i;
        };
        return names.map((_, i) => i).sort((a, b) => (rank(names[a]) - rank(names[b])) || (a - b));
    }

    return { PROFILES, DEFAULT_PROFILE, normalize, layout, categoryOrder };
});
