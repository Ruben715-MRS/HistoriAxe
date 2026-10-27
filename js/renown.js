// =========================================================================
// === HISTORIAXE — RENOMMÉE DES PERSONNAGES (contour du portrait) ===
// =========================================================================
// Chaque figure des panthéons porte un niveau de renommée dans le monde, de 1 à 3 (champ `etoiles` des données, nom
// hérité d'une première présentation en étoiles) :
//   1 · renommée locale     — figure nationale ou régionale, peu connue hors de son pays  (contour bronze, un filet)
//   2 · renommée régionale  — connue d'un public averti, dans plusieurs pays              (contour argent, deux filets)
//   3 · renommée mondiale   — connue presque partout                                      (contour or, trois filets)
// Le niveau décrit la diffusion d'un nom dans le monde, pas la valeur de la personne : d'où les mots « locale », « régionale »,
// « mondiale », et non « peu connue » ou « très connue ». La couleur ne porte jamais seule le sens : le nombre de filets du
// contour et le libellé écrit le disent aussi (voir `.renown-*` dans css/style.css).
//
// Le contour est un choix d'affichage, réglable (case « Afficher la renommée » de la galerie) : désactivé, aucun contour ni filtre
// nulle part. Il n'apparaît jamais PENDANT une question de « Qui suis-je ? » ou de « Qui est-ce ? » (il donnerait un indice), seulement
// à la révélation de la réponse. Mesure et seuils : scripts/pantheon_notoriete.py. Testé dans tests/renown.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Renown = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var KEYS = { 1: 'local', 2: 'regional', 3: 'world' };
    var STORAGE_KEY = 'historiaxe_renown_v1';

    // Le niveau (1 à 3) d'une figure, ou 0 quand les données ne le disent pas (un événement qui n'est pas une figure des panthéons).
    function levelOf(evt) {
        var n = evt && evt.etoiles;
        return n === 1 || n === 2 || n === 3 ? n : 0;
    }

    // « local », « regional » ou « world » (de quoi composer une clé de texte : renown.<clé>), ou '' sans niveau.
    function keyOf(evt) {
        return KEYS[levelOf(evt)] || '';
    }

    var memory = null; // le réglage de la session, quand le stockage du navigateur n'est pas disponible

    function store() {
        try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch (e) { return null; }
    }

    // Le contour est affiché, sauf si le joueur l'a désactivé.
    function shown() {
        if (memory !== null) return memory;
        var s = store();
        try { return !s || s.getItem(STORAGE_KEY) !== '0'; } catch (e) { return true; }
    }

    function setShown(on) {
        memory = !!on;
        var s = store();
        try { if (s) s.setItem(STORAGE_KEY, on ? '1' : '0'); } catch (e) { /* stockage indisponible : le réglage vaut pour la session seulement */ }
        return memory;
    }

    function reset() { memory = null; }

    return { reset: reset, LEVELS: [1, 2, 3], KEYS: KEYS, STORAGE_KEY: STORAGE_KEY, levelOf: levelOf, keyOf: keyOf, shown: shown, setShown: setShown };
}));
