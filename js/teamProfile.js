// =========================================================================
// === PROFIL D'ÉQUIPE — LISTES ET VALIDATION PARTAGÉES (client et serveur) ===
// =========================================================================
// Ce que l'enseignant peut dire de son équipe : une courte description, le pays, la langue parlée. Pays et langue
// viennent de listes fermées (codes ISO) — leur nom est affiché par le navigateur dans la langue du joueur
// (Intl.DisplayNames), rien à traduire ici. La description est du texte libre, donc nettoyée de la même façon
// que les noms (caractères de contrôle et chevrons retirés, longueur bornée) ; elle n'est jamais injectée comme
// HTML, toujours posée en texte.
//
// Pur : ni DOM ni base. Testé dans tests/teamProfile.test.js. Utilisé par api/team.js et js/app/team.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.TeamProfile = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var MAX_DESCRIPTION = 200;
    // Niveaux de joueur : ceux des grades du jeu (js/gamification.js). Large, pour qu'un grade de plus ne casse rien.
    var MAX_LEVEL = 50;

    var COUNTRIES = ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ ' +
        'CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR ' +
        'GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP ' +
        'KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT ' +
        'MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW ' +
        'SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG ' +
        'UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' ');

    // Les langues que l'on parle le plus en classe ; les six premières sont celles de l'app.
    var LANGUAGES = ['fr', 'en', 'es', 'de', 'it', 'ja', 'pt', 'nl', 'ar', 'zh', 'ru', 'pl', 'tr', 'ko', 'el', 'sv', 'ro', 'hi'];

    function sanitizeDescription(raw) {
        if (typeof raw !== 'string') return '';
        return raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, ' ').trim().slice(0, MAX_DESCRIPTION);
    }
    // '' = non renseigné ; sinon un code de la liste, en majuscules. null : valeur invalide.
    function sanitizeCountry(raw) {
        if (raw === '' || raw === null || raw === undefined) return '';
        var code = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
        return COUNTRIES.indexOf(code) >= 0 ? code : null;
    }
    function sanitizeLanguage(raw) {
        if (raw === '' || raw === null || raw === undefined) return '';
        var code = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
        return LANGUAGES.indexOf(code) >= 0 ? code : null;
    }
    function sanitizeLevel(raw) {
        var n = Number(raw);
        if (!isFinite(n) || n !== Math.floor(n)) return null;
        return n >= 1 && n <= MAX_LEVEL ? n : null;
    }

    return {
        MAX_DESCRIPTION: MAX_DESCRIPTION, MAX_LEVEL: MAX_LEVEL, COUNTRIES: COUNTRIES, LANGUAGES: LANGUAGES,
        sanitizeDescription: sanitizeDescription, sanitizeCountry: sanitizeCountry,
        sanitizeLanguage: sanitizeLanguage, sanitizeLevel: sanitizeLevel
    };
}));
