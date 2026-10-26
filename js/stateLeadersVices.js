// =========================================================================
// === LES VICE-PRÉSIDENTS DES ÉTATS-UNIS (complète js/stateLeadersData.js) ===
// =========================================================================
// Même forme que les présidents, avec en plus le parti : [début, fin (null = en fonction), nom, fonction, groupe, parti].
// La couleur suit le parti (démocrate en bleu, républicain en rouge, autre parti ou aucun en jaune), comme pour les présidents.
// Un vice-président qui succède au président en cours de mandat est compté à la date de sa fonction de vice-président.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.StateLeadersVices = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    return {
        etats_unis: {
            note: "Depuis la première élection (1789) : liste des vice-présidents. Couleur : bleu pour les démocrates, rouge pour les républicains, jaune pour un autre parti. Avant 1860, les partis d’alors (fédéralistes, whigs…) ne sont pas ceux d’aujourd’hui.",
            groups: { vice: { label: "Vice-présidence des États-Unis", color: "#e0e7ff" } },
            rows: [
                [1789, 1797, "John Adams", "Vice-président", "vice", "autre"],
                [1797, 1801, "Thomas Jefferson", "Vice-président", "vice", "autre"],
                [1801, 1805, "Aaron Burr", "Vice-président", "vice", "autre"],
                [1805, 1812, "George Clinton", "Vice-président", "vice", "autre"],
                [1813, 1814, "Elbridge Gerry", "Vice-président", "vice", "autre"],
                [1817, 1825, "Daniel D. Tompkins", "Vice-président", "vice", "autre"],
                [1825, 1829, "John C. Calhoun", "Vice-président (sous John Quincy Adams)", "vice", "autre"],
                [1829, 1832, "John C. Calhoun", "Vice-président (sous Andrew Jackson)", "vice", "democrate"],
                [1833, 1837, "Martin Van Buren", "Vice-président", "vice", "democrate"],
                [1837, 1841, "Richard Mentor Johnson", "Vice-président", "vice", "democrate"],
                [1841, 1841, "John Tyler", "Vice-président", "vice", "autre"],
                [1845, 1849, "George M. Dallas", "Vice-président", "vice", "democrate"],
                [1849, 1850, "Millard Fillmore", "Vice-président", "vice", "autre"],
                [1853, 1853, "William R. King", "Vice-président", "vice", "democrate"],
                [1857, 1861, "John C. Breckinridge", "Vice-président", "vice", "democrate"],
                [1861, 1865, "Hannibal Hamlin", "Vice-président", "vice", "republicain"],
                [1865, 1865, "Andrew Johnson", "Vice-président", "vice", "autre"],
                [1869, 1873, "Schuyler Colfax", "Vice-président", "vice", "republicain"],
                [1873, 1875, "Henry Wilson", "Vice-président", "vice", "republicain"],
                [1877, 1881, "William A. Wheeler", "Vice-président", "vice", "republicain"],
                [1881, 1881, "Chester A. Arthur", "Vice-président", "vice", "republicain"],
                [1885, 1885, "Thomas A. Hendricks", "Vice-président", "vice", "democrate"],
                [1889, 1893, "Levi P. Morton", "Vice-président", "vice", "republicain"],
                [1893, 1897, "Adlai Stevenson", "Vice-président", "vice", "democrate"],
                [1897, 1899, "Garret Hobart", "Vice-président", "vice", "republicain"],
                [1901, 1901, "Theodore Roosevelt", "Vice-président", "vice", "republicain"],
                [1905, 1909, "Charles W. Fairbanks", "Vice-président", "vice", "republicain"],
                [1909, 1912, "James S. Sherman", "Vice-président", "vice", "republicain"],
                [1913, 1921, "Thomas R. Marshall", "Vice-président", "vice", "democrate"],
                [1921, 1923, "Calvin Coolidge", "Vice-président", "vice", "republicain"],
                [1925, 1929, "Charles G. Dawes", "Vice-président", "vice", "republicain"],
                [1929, 1933, "Charles Curtis", "Vice-président", "vice", "republicain"],
                [1933, 1941, "John Nance Garner", "Vice-président", "vice", "democrate"],
                [1941, 1945, "Henry A. Wallace", "Vice-président", "vice", "democrate"],
                [1945, 1945, "Harry S. Truman", "Vice-président", "vice", "democrate"],
                [1949, 1953, "Alben W. Barkley", "Vice-président", "vice", "democrate"],
                [1953, 1961, "Richard Nixon", "Vice-président", "vice", "republicain"],
                [1961, 1963, "Lyndon B. Johnson", "Vice-président", "vice", "democrate"],
                [1965, 1969, "Hubert Humphrey", "Vice-président", "vice", "democrate"],
                [1969, 1973, "Spiro Agnew", "Vice-président", "vice", "republicain"],
                [1973, 1974, "Gerald Ford", "Vice-président", "vice", "republicain"],
                [1974, 1977, "Nelson Rockefeller", "Vice-président", "vice", "republicain"],
                [1977, 1981, "Walter Mondale", "Vice-président", "vice", "democrate"],
                [1981, 1989, "George H. W. Bush", "Vice-président", "vice", "republicain"],
                [1989, 1993, "Dan Quayle", "Vice-président", "vice", "republicain"],
                [1993, 2001, "Al Gore", "Vice-président", "vice", "democrate"],
                [2001, 2009, "Dick Cheney", "Vice-président", "vice", "republicain"],
                [2009, 2017, "Joe Biden", "Vice-président", "vice", "democrate"],
                [2017, 2021, "Mike Pence", "Vice-président", "vice", "republicain"],
                [2021, 2025, "Kamala Harris", "Vice-présidente", "vice", "democrate"],
                [2025, null, "JD Vance", "Vice-président", "vice", "republicain"]
            ]
        }
    };
}));
