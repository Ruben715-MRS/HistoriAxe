// =========================================================================
// === LES DIRIGEANTS DU PARTI COMMUNISTE CHINOIS (complète js/stateLeadersData.js) ===
// =========================================================================
// Même forme que les chefs d’État : [début, fin (null = en fonction), nom, fonction, groupe]. La fonction est celle du Parti
// (secrétaire général, puis président du Comité central au temps de Mao et de Hua Guofeng).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.StateLeadersParti = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    return {
        chine: {
            note: "Depuis la fondation du Parti communiste chinois (1921). Entre 1931 et 1943, la direction du Parti a été exercée par plusieurs dirigeants, non donnés ici. Deng Xiaoping n’a pas occupé ces fonctions : il a été le dirigeant de fait de 1978 à 1992, sans être secrétaire général ni chef de l’État.",
            groups: { parti: { label: "Parti communiste chinois", color: "#fee2e2" } },
            rows: [
                [1921, 1927, "Chen Duxiu", "secrétaire général", "parti"],
                [1927, 1928, "Qu Qiubai", "secrétaire général", "parti"],
                [1928, 1931, "Xiang Zhongfa", "secrétaire général", "parti"],
                [1943, 1976, "Mao Zedong", "président du Comité central", "parti"],
                [1976, 1981, "Hua Guofeng", "président du Comité central", "parti"],
                [1981, 1987, "Hu Yaobang", "président du Comité central, puis secrétaire général (1982)", "parti"],
                [1987, 1989, "Zhao Ziyang", "secrétaire général", "parti"],
                [1989, 2002, "Jiang Zemin", "secrétaire général", "parti"],
                [2002, 2012, "Hu Jintao", "secrétaire général", "parti"],
                [2012, null, "Xi Jinping", "secrétaire général", "parti"]
            ]
        }
    };
}));
