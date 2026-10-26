// =========================================================================
// === LE DICTIONNAIRE (règles de recherche, de classement, de voisinage) ===
// =========================================================================
// Les termes proches de l'histoire et de la géographie (agrégation, CAPES) : une fiche par distinction, avec les termes qu'on
// confond. Tout est pur, sans DOM (l'écran est dans js/app/dictionnaire.js). Testé dans tests/dictionnaireCore.test.js.
// Données : assets/dictionnaire/termes.json, produites par scripts/dictionnaire/extract.py. Contenu en français seulement ;
// **à relire par un enseignant**.
//
//  - RECHERCHE : insensible aux accents, à la casse et aux apostrophes typographiques. Les mots qui commencent par la requête
//    passent d'abord, puis ceux qui la contiennent dans leur nom, puis ceux qui la contiennent dans leur définition.
//  - LISTE : classée par ordre alphabétique et regroupée par lettre (les termes qui ne commencent pas par une lettre vont à « # »).
//  - VOISINAGE : les termes d'une même fiche sont ceux qu'on confond : « à ne pas confondre avec ».

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.DictionnaireCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // « Élève » → « eleve » ; « d’Alsace » → « d'alsace ».
    function normalize(text) {
        return String(text == null ? '' : text)
            .normalize('NFD').replace(/[̀-ͯ]/g, '')
            .replace(/[’`]/g, "'")
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }

    // Première lettre du terme, sans accent ni guillemet, en majuscule ; « # » s'il n'y a pas de lettre.
    function letterOf(name) {
        const first = normalize(name).replace(/^[^a-z]+/, '').charAt(0).toUpperCase();
        return first >= 'A' && first <= 'Z' ? first : '#';
    }

    // Les termes qui ne commencent pas par une lettre (« # ») sont rangés après Z.
    // La clé ignore les guillemets et la ponctuation de tête, comme letterOf, pour que le tri suive les lettres.
    function sortKey(name) {
        if (letterOf(name) === '#') return '~' + normalize(name);
        return normalize(name).replace(/^[^a-z]+/, '');
    }

    function compareNames(a, b) {
        const x = sortKey(a.nom), y = sortKey(b.nom);
        return x < y ? -1 : x > y ? 1 : 0;
    }

    // Tous les termes, classés par nom.
    function sorted(termes) {
        return termes.slice().sort(compareNames);
    }

    // Filtre par domaine (id numérique), ou tous les domaines si `domaine` est « all » ou absent.
    function byDomaine(termes, domaine) {
        if (domaine == null || domaine === 'all') return termes;
        return termes.filter(t => t.domaine === Number(domaine));
    }

    // Recherche. Une requête vide renvoie la liste complète, classée. Sinon : d'abord les noms qui commencent par la requête,
    // puis les noms qui la contiennent, puis les définitions qui la contiennent. Chaque groupe reste classé par nom.
    function search(termes, query, domaine) {
        const pool = byDomaine(termes, domaine);
        const q = normalize(query);
        if (!q) return sorted(pool);
        const starts = [], inName = [], inDef = [];
        pool.forEach(t => {
            const name = normalize(t.nom);
            if (name.startsWith(q)) starts.push(t);
            else if (name.includes(q)) inName.push(t);
            else if (normalize(t.definition).includes(q)) inDef.push(t);
        });
        return sorted(starts).concat(sorted(inName), sorted(inDef));
    }

    // Regroupe une liste déjà classée par lettre : [{ letter: 'A', termes: [...] }, ...] (dans l'ordre d'apparition).
    function groupByLetter(termes) {
        const groups = [];
        termes.forEach(t => {
            const letter = letterOf(t.nom);
            const last = groups[groups.length - 1];
            if (last && last.letter === letter) last.termes.push(t);
            else groups.push({ letter: letter, termes: [t] });
        });
        return groups;
    }

    // Les termes qu'on confond avec `term` : les autres termes de sa fiche, classés par nom.
    function neighbours(termes, term) {
        return sorted(termes.filter(t => t.fiche === term.fiche && t.id !== term.id));
    }

    // Index par identifiant de terme, pour ouvrir un terme depuis un lien.
    function indexById(termes) {
        const map = new Map();
        termes.forEach(t => map.set(t.id, t));
        return map;
    }

    return { normalize, letterOf, search, byDomaine, groupByLetter, neighbours, indexById };
}));
