// =========================================================================
// === HISTORIAXE — ÉVÉNEMENTS « CARREFOURS » (LIENS ENTRE THÈMES) ===
// =========================================================================
//
// Un même fait figure souvent dans plusieurs thèmes, raconté sous un angle
// différent : l'invasion des Malouines est dans le thème de l'Argentine et
// dans celui de l'aviation, l'investiture de Mandela dans l'Afrique du Sud et
// dans les grandes figures du monde. Ce module les RELIE, pour que la fiche
// d'un événement puisse dire « vu aussi dans… » plutôt que de les laisser
// vivre comme des entrées indépendantes.
//
// Deux événements sont le même fait quand ils partagent le même lien
// Wikipédia ET la même année. Le lien seul ne suffit pas : la page de
// Gagarine sert à la fois à sa naissance (1934) et à son vol (1961). Sur
// data/fr.json, la règle relie ~1 600 événements ; ni les identifiants (non
// uniques d'un thème à l'autre : arc_10 existe plusieurs fois) ni les titres
// (reformulés d'un thème à l'autre) ne sont fiables pour cela.
//
// L'index est calculé à la volée sur la base chargée plutôt que stocké dans
// un fichier : il reste juste quand on ajoute un thème ou qu'on change de
// langue, et n'ajoute rien à télécharger ni à mettre en cache.
//
// Les liens ne servent qu'à la FICHE, jamais à une question : l'événement lié
// porte la même date, l'afficher pendant le jeu donnerait la réponse.

(function (root, factory) {
    if (typeof module === 'object' && typeof module.exports === 'object') {
        module.exports = factory();
    } else {
        root.LinkedEvents = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Clé d'identité d'un fait : lien Wikipédia (décodé, car « Alexe%C3%AF » et
    // « Alexeï » sont la même page) + année. null si l'événement n'en a pas.
    function factKey(evt) {
        if (!evt || !evt.wikipedia || typeof evt.date !== 'number') return null;
        let url = String(evt.wikipedia);
        try { url = decodeURIComponent(url); } catch (e) { /* lien mal encodé : tel quel */ }
        return url.toLowerCase() + '|' + evt.date;
    }

    // `entries` : le format de getAllEventsWithLocation() (event, theme,
    // categoryIndex, subcategoryIndex, themeIndex…). Les catégories
    // personnelles de l'utilisateur sont écartées : ce n'est pas du contenu
    // d'HistoriAxe, on ne l'enrichit pas de liens.
    function buildLinkIndex(entries) {
        const groups = new Map();
        entries.forEach(function (entry) {
            if (entry.category && entry.category.isCustomCategory) return;
            const key = factKey(entry.event);
            if (!key) return;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(entry);
        });
        // Un fait présent dans un seul thème n'a rien à relier.
        groups.forEach(function (members, key) {
            const themes = new Set(members.map(function (m) { return m.theme.id; }));
            if (themes.size < 2) groups.delete(key);
        });

        function isSame(entry, evt) {
            return entry.event === evt || (entry.event.id === evt.id && entry.event.titre === evt.titre);
        }

        return {
            size: groups.size,
            // Les mêmes faits, vus depuis d'AUTRES thèmes : une entrée par thème
            // (le premier événement rencontré), dans l'ordre de la base. Vide si
            // l'événement est inconnu de l'index — fiche hors base comprise.
            linksFor: function (evt) {
                const key = factKey(evt);
                const members = key && groups.get(key);
                if (!members) return [];
                const own = members.filter(function (m) { return isSame(m, evt); });
                if (own.length === 0) return [];
                const exclude = new Set(own.map(function (m) { return m.theme.id; }));
                const links = [];
                members.forEach(function (m) {
                    if (exclude.has(m.theme.id)) return;
                    exclude.add(m.theme.id);
                    links.push(m);
                });
                return links;
            }
        };
    }

    return {
        factKey: factKey,
        buildLinkIndex: buildLinkIndex
    };
});
