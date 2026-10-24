// =========================================================================
// === LES CHEFS D'ÉTAT (outil de la boîte à outils) — DONNÉES ET RÈGLES ===
// =========================================================================
// Une liste encyclopédique et indicative, du début du pays à nos jours, du plus ancien au plus récent. Chaque ligne : le début et la fin
// du règne ou du mandat (`to` vide = en fonction), le nom, la fonction, et le groupe (dynastie ou régime). Les groupes donnent la couleur
// du fond et le trait qui sépare deux régimes. Pur, sans DOM : testé dans tests/stateLeadersCore.test.js. Contenu en français.
// **À relire par un enseignant.** Les rois mérovingiens, partagés entre plusieurs royaumes, ne sont pas tous donnés.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.StateLeadersCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var GROUPS = {
        merovingiens: { label: 'Dynastie mérovingienne', color: '#fef3c7' },
        carolingiens: { label: 'Dynastie carolingienne', color: '#e0e7ff' },
        capetiens: { label: 'Dynastie capétienne directe', color: '#dbeafe' },
        valois: { label: 'Dynastie des Valois', color: '#ede9fe' },
        bourbons: { label: 'Dynastie des Bourbons', color: '#fce7f3' },
        convention: { label: 'Première République (Convention, Directoire)', color: '#d1fae5' },
        consulat: { label: 'Consulat et Premier Empire', color: '#fed7aa' },
        restauration: { label: 'Restauration (Bourbons)', color: '#fce7f3' },
        orleans: { label: 'Monarchie de Juillet (Orléans)', color: '#ffe4e6' },
        iire: { label: 'IIe République', color: '#d1fae5' },
        second_empire: { label: 'Second Empire', color: '#fed7aa' },
        iiire: { label: 'IIIe République', color: '#d1fae5' },
        vichy: { label: 'État français (régime de Vichy)', color: '#e5e7eb' },
        gprf: { label: 'Gouvernement provisoire de la République', color: '#d1fae5' },
        ive: { label: 'IVe République', color: '#d1fae5' },
        ve: { label: 'Ve République', color: '#d1fae5' }
    };

    // [début, fin (null = en fonction), nom, fonction, groupe]
    var FRANCE_ROWS = [
        [481, 511, 'Clovis Ier', 'roi des Francs', 'merovingiens'],
        [511, 561, 'Clotaire Ier', 'roi des Francs', 'merovingiens'],
        [629, 639, 'Dagobert Ier', 'roi des Francs', 'merovingiens'],
        [639, 657, 'Clovis II', 'roi des Francs', 'merovingiens'],
        [657, 673, 'Clotaire III', 'roi des Francs', 'merovingiens'],
        [673, 691, 'Thierry III', 'roi des Francs', 'merovingiens'],
        [691, 695, 'Clovis III', 'roi des Francs', 'merovingiens'],
        [695, 711, 'Childebert III', 'roi des Francs', 'merovingiens'],
        [711, 715, 'Dagobert III', 'roi des Francs', 'merovingiens'],
        [715, 721, 'Chilpéric II', 'roi des Francs', 'merovingiens'],
        [721, 737, 'Thierry IV', 'roi des Francs', 'merovingiens'],
        [743, 751, 'Childéric III', 'roi des Francs', 'merovingiens'],

        [751, 768, 'Pépin le Bref', 'roi des Francs', 'carolingiens'],
        [768, 814, 'Charlemagne', 'roi des Francs, empereur', 'carolingiens'],
        [814, 840, 'Louis Ier le Pieux', 'empereur', 'carolingiens'],
        [840, 877, 'Charles II le Chauve', 'roi des Francs, empereur', 'carolingiens'],
        [877, 879, 'Louis II le Bègue', 'roi des Francs', 'carolingiens'],
        [879, 882, 'Louis III', 'roi des Francs', 'carolingiens'],
        [879, 884, 'Carloman II', 'roi des Francs', 'carolingiens'],
        [884, 887, 'Charles III le Gros', 'roi des Francs, empereur', 'carolingiens'],
        [888, 898, 'Eudes', 'roi des Francs (Robertien)', 'carolingiens'],
        [893, 922, 'Charles III le Simple', 'roi des Francs', 'carolingiens'],
        [922, 923, 'Robert Ier', 'roi des Francs (Robertien)', 'carolingiens'],
        [923, 936, 'Raoul', 'roi des Francs', 'carolingiens'],
        [936, 954, 'Louis IV d’Outremer', 'roi des Francs', 'carolingiens'],
        [954, 986, 'Lothaire', 'roi des Francs', 'carolingiens'],
        [986, 987, 'Louis V le Fainéant', 'roi des Francs', 'carolingiens'],

        [987, 996, 'Hugues Capet', 'roi des Francs', 'capetiens'],
        [996, 1031, 'Robert II le Pieux', 'roi des Francs', 'capetiens'],
        [1031, 1060, 'Henri Ier', 'roi des Francs', 'capetiens'],
        [1060, 1108, 'Philippe Ier', 'roi des Français', 'capetiens'],
        [1108, 1137, 'Louis VI le Gros', 'roi des Français', 'capetiens'],
        [1137, 1180, 'Louis VII le Jeune', 'roi des Français', 'capetiens'],
        [1180, 1223, 'Philippe II Auguste', 'roi des Français', 'capetiens'],
        [1223, 1226, 'Louis VIII le Lion', 'roi des Français', 'capetiens'],
        [1226, 1270, 'Louis IX (saint Louis)', 'roi des Français', 'capetiens'],
        [1270, 1285, 'Philippe III le Hardi', 'roi des Français', 'capetiens'],
        [1285, 1314, 'Philippe IV le Bel', 'roi des Français', 'capetiens'],
        [1314, 1316, 'Louis X le Hutin', 'roi de France', 'capetiens'],
        [1316, 1316, 'Jean Ier le Posthume', 'roi de France (cinq jours)', 'capetiens'],
        [1316, 1322, 'Philippe V le Long', 'roi de France', 'capetiens'],
        [1322, 1328, 'Charles IV le Bel', 'roi de France', 'capetiens'],

        [1328, 1350, 'Philippe VI de Valois', 'roi de France', 'valois'],
        [1350, 1364, 'Jean II le Bon', 'roi de France', 'valois'],
        [1364, 1380, 'Charles V le Sage', 'roi de France', 'valois'],
        [1380, 1422, 'Charles VI le Bien-Aimé', 'roi de France', 'valois'],
        [1422, 1461, 'Charles VII le Victorieux', 'roi de France', 'valois'],
        [1461, 1483, 'Louis XI', 'roi de France', 'valois'],
        [1483, 1498, 'Charles VIII', 'roi de France', 'valois'],
        [1498, 1515, 'Louis XII', 'roi de France', 'valois'],
        [1515, 1547, 'François Ier', 'roi de France', 'valois'],
        [1547, 1559, 'Henri II', 'roi de France', 'valois'],
        [1559, 1560, 'François II', 'roi de France', 'valois'],
        [1560, 1574, 'Charles IX', 'roi de France', 'valois'],
        [1574, 1589, 'Henri III', 'roi de France', 'valois'],

        [1589, 1610, 'Henri IV', 'roi de France et de Navarre', 'bourbons'],
        [1610, 1643, 'Louis XIII', 'roi de France', 'bourbons'],
        [1643, 1715, 'Louis XIV', 'roi de France', 'bourbons'],
        [1715, 1774, 'Louis XV', 'roi de France', 'bourbons'],
        [1774, 1792, 'Louis XVI', 'roi de France', 'bourbons'],

        [1792, 1795, 'Convention nationale', 'pouvoir collégial', 'convention'],
        [1795, 1799, 'Directoire exécutif', 'cinq directeurs', 'convention'],
        [1799, 1804, 'Napoléon Bonaparte', 'Premier consul', 'consulat'],
        [1804, 1814, 'Napoléon Ier', 'empereur des Français (et pendant les Cent-Jours, 1815)', 'consulat'],

        [1814, 1824, 'Louis XVIII', 'roi de France', 'restauration'],
        [1824, 1830, 'Charles X', 'roi de France', 'restauration'],
        [1830, 1848, 'Louis-Philippe Ier', 'roi des Français', 'orleans'],

        [1848, 1848, 'Cavaignac', 'chef du pouvoir exécutif', 'iire'],
        [1848, 1852, 'Louis-Napoléon Bonaparte', 'président de la République', 'iire'],
        [1852, 1870, 'Napoléon III', 'empereur des Français', 'second_empire'],

        [1871, 1873, 'Adolphe Thiers', 'chef du pouvoir exécutif', 'iiire'],
        [1873, 1879, 'Patrice de Mac Mahon', 'président de la République', 'iiire'],
        [1879, 1887, 'Jules Grévy', 'président de la République', 'iiire'],
        [1887, 1894, 'Sadi Carnot', 'président de la République', 'iiire'],
        [1894, 1895, 'Jean Casimir-Perier', 'président de la République', 'iiire'],
        [1895, 1899, 'Félix Faure', 'président de la République', 'iiire'],
        [1899, 1906, 'Émile Loubet', 'président de la République', 'iiire'],
        [1906, 1913, 'Armand Fallières', 'président de la République', 'iiire'],
        [1913, 1920, 'Raymond Poincaré', 'président de la République', 'iiire'],
        [1920, 1920, 'Paul Deschanel', 'président de la République', 'iiire'],
        [1920, 1924, 'Alexandre Millerand', 'président de la République', 'iiire'],
        [1924, 1931, 'Gaston Doumergue', 'président de la République', 'iiire'],
        [1931, 1932, 'Paul Doumer', 'président de la République', 'iiire'],
        [1932, 1940, 'Albert Lebrun', 'président de la République', 'iiire'],

        [1940, 1944, 'Philippe Pétain', 'chef de l’État français', 'vichy'],
        [1944, 1946, 'Charles de Gaulle', 'chef du Gouvernement provisoire', 'gprf'],

        [1947, 1954, 'Vincent Auriol', 'président de la République', 'ive'],
        [1954, 1959, 'René Coty', 'président de la République', 'ive'],

        [1959, 1969, 'Charles de Gaulle', 'président de la République', 've'],
        [1969, 1974, 'Georges Pompidou', 'président de la République', 've'],
        [1974, 1981, 'Valéry Giscard d’Estaing', 'président de la République', 've'],
        [1981, 1995, 'François Mitterrand', 'président de la République', 've'],
        [1995, 2007, 'Jacques Chirac', 'président de la République', 've'],
        [2007, 2012, 'Nicolas Sarkozy', 'président de la République', 've'],
        [2012, 2017, 'François Hollande', 'président de la République', 've'],
        [2017, null, 'Emmanuel Macron', 'président de la République', 've']
    ];

    // La France est ici ; les autres pays sont dans js/stateLeadersData.js (chargé avant ce fichier dans le navigateur).
    var COUNTRIES = {
        france: { name: 'France', note: 'Depuis Clovis (481) : rois, puis empereurs et présidents. Les rois mérovingiens, partagés entre plusieurs royaumes, ne sont pas tous donnés.', groups: GROUPS, rows: FRANCE_ROWS }
    };
    var DATA = typeof module === 'object' && module.exports
        ? require('./stateLeadersData.js')
        : (typeof self !== 'undefined' ? self : this).StateLeadersData;
    Object.keys(DATA).forEach(function (k) { COUNTRIES[k] = DATA[k]; });

    function toRows(rows) {
        return rows.map(function (r) {
            return { from: r[0], to: r[1], name: r[2], title: r[3], group: r[4], party: r[5] || null };
        });
    }

    // Couleurs par parti (États-Unis) : démocrate en bleu, républicain en rouge, autre parti ou aucun en jaune.
    var PARTY_COLORS = { democrate: '#bfdbfe', republicain: '#fecaca', autre: '#fef08a', aucun: '#fef08a' };

    // Les lignes d'un pays, dans l'ordre chronologique. `divider` : le nom du nouveau régime quand le groupe change ; `color` : le fond.
    function rowsOf(country) {
        var c = COUNTRIES[country];
        if (!c) return [];
        var out = [];
        var prev = null;
        toRows(c.rows).forEach(function (r) {
            out.push({ row: r, divider: prev !== r.group ? c.groups[r.group].label : null, color: r.party ? PARTY_COLORS[r.party] : c.groups[r.group].color });
            prev = r.group;
        });
        return out;
    }

    // La liste des pays, par ordre alphabétique : { key, name }.
    function countryList() {
        return Object.keys(COUNTRIES).map(function (k) {
            return { key: k, name: COUNTRIES[k].name };
        }).sort(function (a, b) { return a.name.localeCompare(b.name, 'fr'); });
    }

    // La note du pays, suivie de la mention commune « Liste indicative ».
    function noteOf(country) {
        return COUNTRIES[country] ? COUNTRIES[country].note + ' Liste indicative.' : '';
    }

    function normalize(text) {
        return String(text || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[-.]/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Les lignes dont le nom ou la fonction contient la saisie (sans accents, sans apostrophes).
    function search(items, query) {
        var q = normalize(query);
        if (!q) return items;
        return items.filter(function (it) {
            return normalize(it.row.name).indexOf(q) !== -1 || normalize(it.row.title).indexOf(q) !== -1;
        });
    }

    return {
        COUNTRIES: COUNTRIES, rowsOf: rowsOf, countryList: countryList, noteOf: noteOf, search: search, normalize: normalize
    };
}));
