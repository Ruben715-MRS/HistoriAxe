// =========================================================================
// === LE CHEMIN DU TEMPS — DÉFINITION DES MONDES (généré, FIGÉ) ===
// =========================================================================
// Généré par `node scripts/path_plan.js --write`. Ne pas modifier à la main ; ne pas régénérer pour suivre un
// ajout de contenu : les bornes des niveaux sont figées, parce que l'identifiant d'un niveau (`grece-3`) et les
// étoiles gagnées dessus en dépendent. Pour un nouveau monde, l'ajouter au script en gardant les bornes des autres.
//
//  - `GROUPS` : des groupes de thèmes (identifiants de data/fr.json) où puisent les mondes ;
//  - `WORLDS` : le chemin principal dans l'ordre, puis les îles ; `windows` : les tranches de temps
//    [début, fin exclue, dernière année à afficher si elle diffère] ; `tiers` : niveaux par tranche.
// js/pathCore.js en tire les niveaux, leurs épreuves et leurs événements.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PathWorlds = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var GROUPS = {
        culture: [
            'thm_inv', 'thm_med', 'thm_explo', 'thm_art', 'thm_lit', 'thm_mus', 'thm_mon', 'thm_archi',
            'thm_idees_philo', 'thm_bat', 'thm_traites', 'thm_femmes', 'thm_sp', 'thm_gastro_mode', 'thm_rel',
            'thm_christianisme_general', 'thm_christianisme_catholicisme', 'thm_christianisme_protestantisme',
            'thm_medias', 'thm_cine', 'thm_aero', 'thm_espace'
        ],
        france: [
            'thm_fr', 'thm_ecf', 'thm_colafr', 'thm_19fr', 'thm_camp', 'thm_rev18', 'thm_renhum', 'thm_feod',
            'thm_eccl', 'thm_emp', 'thm_medi', 'thm_20s', 'thm_aut', 'thm_am', 'col_6e', 'thm_5e', 'thm_4e', 'thm_3e',
            'sec_perio', 'sec_t1', 'sec_t2', 'sec_t3', 'sec_t4', 'pre_t1', 'pre_t2', 'pre_t3', 'pre_t4',
            'hggsp_pre_t1', 'hggsp_pre_t2', 'hggsp_pre_t3', 'hggsp_pre_t4', 'hggsp_pre_t5', 'ter_t1', 'ter_t2',
            'ter_t3', 'ter_t4', 'hggsp_ter_t1', 'hggsp_ter_t2', 'hggsp_ter_t3', 'hggsp_ter_t4', 'hggsp_ter_t5',
            'hggsp_ter_t6'
        ],
        europe: [
            'thm_de', 'thm_at', 'thm_be', 'thm_fr', 'thm_li', 'thm_lu', 'thm_mc', 'thm_nl', 'thm_ch', 'thm_dk',
            'thm_ee', 'thm_fi', 'thm_ie', 'thm_is', 'thm_lv', 'thm_lt', 'thm_no', 'thm_gb', 'thm_se', 'thm_al',
            'thm_ad', 'thm_ba', 'thm_hr', 'thm_es', 'thm_gr', 'thm_it', 'thm_mk', 'thm_mt', 'thm_me', 'thm_pt',
            'thm_sm', 'thm_rs', 'thm_si', 'thm_va', 'thm_by', 'thm_bg', 'thm_hu', 'thm_md', 'thm_pl', 'thm_ro',
            'thm_sk', 'thm_cz', 'thm_ua', 'thm_byz', 'thm_urss', 'thm_aho', 'thm_hes', 'thm_ebr', 'thm_por'
        ],
        grece: [
            'thm_grc', 'thm_grccl', 'thm_gr', 'hggsp_pre_t1'
        ],
        rome: [
            'thm_rom', 'thm_rome', 'thm_traj', 'thm_it', 'sec_t1'
        ],
        orient: [
            'thm_eg', 'thm_irq', 'thm_ir', 'thm_isr', 'thm_histoire_juive_civile', 'thm_tr', 'col_6e', 'thm_inv',
            'thm_lit', 'thm_mon', 'thm_archi', 'thm_rel', 'thm_zoroastrisme'
        ],
        byzance: [
            'thm_byz', 'thm_christianisme_general', 'thm_christianisme_orient'
        ],
        chine: [
            'thm_chn', 'thm_cn', 'thm_confucianisme', 'thm_taoisme'
        ],
        islam: [
            'thm_histoire_islam', 'thm_islam_sunnisme', 'thm_islam_chiisme', 'thm_ott'
        ],
        ameriques: [
            'thm_maya', 'thm_azt', 'thm_inca'
        ],
        afrique: [
            'thm_dz', 'thm_ly', 'thm_ma', 'thm_sd', 'thm_tn', 'thm_bj', 'thm_bf', 'thm_cv', 'thm_ci', 'thm_gm',
            'thm_gh', 'thm_gn', 'thm_gw', 'thm_lr', 'thm_ml', 'thm_mr', 'thm_ne', 'thm_ng', 'thm_sn', 'thm_sl',
            'thm_tg', 'thm_ao', 'thm_cm', 'thm_cg', 'thm_ga', 'thm_gq', 'thm_cd', 'thm_cf', 'thm_st', 'thm_td',
            'thm_bi', 'thm_km', 'thm_dj', 'thm_er', 'thm_et', 'thm_ke', 'thm_mg', 'thm_mw', 'thm_mu', 'thm_mz',
            'thm_ug', 'thm_rw', 'thm_sc', 'thm_so', 'thm_ss', 'thm_tz', 'thm_zm', 'thm_zw', 'thm_za', 'thm_bw',
            'thm_sz', 'thm_ls', 'thm_na'
        ],
        japon: [
            'thm_jp', 'thm_shintoisme'
        ]
    };

    var WORLDS = [
            {
                id: 'prehistoire', icon: '🦣', maxPerDate: 3, essentialOnly: false,
                windows: [[-3300000, -40000], [-40000, -9600], [-9600, -3300]]
            },
            {
                id: 'orient', icon: '🔺', themes: ['orient'],
                windows: [[-3300, -2650], [-2650, -1971], [-1971, -1550], [-1550, -1273], [-1273, -1020], [-1020, -800]]
            },
            {
                id: 'grece', icon: '🏛️', themes: ['grece'],
                windows: [[-800, -594], [-594, -499], [-499, -462], [-462, -438], [-438, -415], [-415, -399], [-399, -350], [-350, -322]]
            },
            {
                id: 'rome1', icon: '🐺', themes: ['rome'],
                windows: [[-753, -509], [-509, -445], [-445, -264], [-264, -168], [-168, -88], [-88, -46], [-46, -26]]
            },
            {
                id: 'rome2', icon: '🦅', themes: ['rome', 'byzance'],
                windows: [[-26, 64, 63], [64, 110, 109], [110, 193, 192], [193, 270, 269], [270, 320, 319], [320, 364, 363], [364, 408, 407], [408, 477, 476]]
            },
            {
                id: 'haut-moyen-age', icon: '👑', themes: ['france', 'europe', 'culture'],
                windows: [[481, 537, 536], [537, 610, 609], [610, 672, 671], [672, 718, 717], [718, 762, 761], [762, 800, 799], [800, 850, 849], [850, 888, 887]]
            },
            {
                id: 'feodalites', icon: '🏰', themes: ['france', 'europe', 'culture'],
                windows: [[888, 955, 954], [955, 1000, 999], [1000, 1020, 1019], [1020, 1059, 1058], [1059, 1088, 1087], [1088, 1113, 1112], [1113, 1147, 1146], [1147, 1180, 1179]]
            },
            {
                id: 'capetiens', icon: '⚜️', themes: ['france', 'europe', 'culture'],
                windows: [[1180, 1200, 1199], [1200, 1214, 1213], [1214, 1235, 1234], [1235, 1264, 1263], [1264, 1291, 1290], [1291, 1328, 1327]]
            },
            {
                id: 'cent-ans', icon: '⚔️', themes: ['france', 'europe', 'culture'],
                windows: [[1328, 1347, 1346], [1347, 1365, 1364], [1365, 1386, 1385], [1386, 1405, 1404], [1405, 1419, 1418], [1419, 1436, 1435], [1436, 1453, 1452]]
            },
            {
                id: 'renaissances', icon: '🎨', themes: ['france', 'europe', 'culture'],
                windows: [[1453, 1476, 1475], [1476, 1494, 1493], [1494, 1509, 1508], [1509, 1519, 1518], [1519, 1529, 1528], [1529, 1536, 1535], [1536, 1546, 1545], [1546, 1559, 1558]]
            },
            {
                id: 'religion', icon: '🕯️', themes: ['france', 'europe', 'culture'],
                windows: [[1559, 1569, 1568], [1569, 1578, 1577], [1578, 1588, 1587], [1588, 1600, 1599], [1600, 1607, 1606], [1607, 1616, 1615], [1616, 1629, 1628]]
            },
            {
                id: 'absolus', icon: '☀️', themes: ['france', 'europe', 'culture'],
                windows: [[1629, 1640, 1639], [1640, 1649, 1648], [1649, 1658, 1657], [1658, 1667, 1666], [1667, 1679, 1678], [1679, 1689, 1688], [1689, 1703, 1702], [1703, 1715, 1714]]
            },
            {
                id: 'lumieres', icon: '💡', themes: ['france', 'europe', 'culture'],
                windows: [[1715, 1727, 1726], [1727, 1745, 1744], [1745, 1754, 1753], [1754, 1763, 1762], [1763, 1773, 1772], [1773, 1783, 1782], [1783, 1789, 1788]]
            },
            {
                id: 'revolution', icon: '🔔', themes: ['france', 'europe', 'culture'], tiers: 2, maxPerDate: 3,
                windows: [[1789, 1795, 1794], [1795, 1804, 1803], [1804, 1815, 1814]]
            },
            {
                id: 'revolution-inachevee', icon: '🚂', themes: ['france', 'europe', 'culture'], tiers: 2, maxPerDate: 3,
                windows: [[1815, 1828, 1827], [1828, 1840, 1839], [1840, 1850, 1849], [1850, 1859, 1858], [1859, 1870, 1869]]
            },
            {
                id: 'republique', icon: '🗼', themes: ['france', 'europe', 'culture'], tiers: 2, maxPerDate: 3,
                windows: [[1870, 1882, 1881], [1882, 1894, 1893], [1894, 1905, 1904], [1905, 1914, 1913]]
            },
            {
                id: 'grande-guerre', icon: '🪖', themes: ['france', 'europe', 'culture'], tiers: 3, maxPerDate: 3,
                windows: [[1914, 1920, 1919]]
            },
            {
                id: 'entre-deux-guerres', icon: '📻', themes: ['france', 'europe', 'culture'], tiers: 2, maxPerDate: 3,
                windows: [[1920, 1931, 1930], [1931, 1940, 1939], [1940, 1946, 1945]]
            },
            {
                id: 'trente-glorieuses', icon: '🚀', themes: ['france', 'europe', 'culture'], tiers: 2, maxPerDate: 3,
                windows: [[1946, 1955, 1954], [1955, 1964, 1963], [1964, 1974, 1973]]
            },
            {
                id: 'crises', icon: '🧱', themes: ['france', 'europe', 'culture'], tiers: 2, maxPerDate: 3,
                windows: [[1974, 1983, 1982], [1983, 1992, 1991]]
            },
            {
                id: 'depuis-1991', icon: '🌐', themes: ['france', 'europe', 'culture'], tiers: 2, maxPerDate: 3,
                windows: [[1992, 2000, 1999], [2000, 2008, 2007], [2008, 2017, 2016], [2017, 2027, 2026]]
            },
            {
                id: 'ile-chine', icon: '🐉', island: true, parent: 'grece', themes: ['chine'],
                windows: [[-2000, -250], [-250, 105, 104], [105, 626, 625], [626, 1167, 1166], [1167, 1592, 1591], [1592, 1912, 1911]]
            },
            {
                id: 'ile-ameriques', icon: '🌽', island: true, parent: 'haut-moyen-age', themes: ['ameriques'],
                windows: [[-2000, 900, 899], [900, 1438, 1437], [1438, 1500, 1499], [1500, 1524, 1523], [1524, 1600, 1599]]
            },
            {
                id: 'ile-islam', icon: '🕌', island: true, parent: 'feodalites', themes: ['islam'],
                windows: [[570, 656, 655], [656, 935, 934], [935, 1326, 1325], [1326, 1526, 1525], [1526, 1839, 1838], [1839, 1924, 1923]]
            },
            {
                id: 'ile-japon', icon: '🗾', island: true, parent: 'renaissances', themes: ['japon'],
                windows: [[-700, 712, 711], [712, 1543, 1542], [1543, 1853, 1852], [1853, 1940, 1939], [1940, 2027, 2026]]
            },
            {
                id: 'ile-afrique', icon: '🌍', island: true, parent: 'republique', themes: ['afrique'],
                windows: [[-3000, 1498, 1497], [1498, 1836, 1835], [1836, 1898, 1897], [1898, 1943, 1942], [1943, 1963, 1962]]
            }
    ];

    return { GROUPS: GROUPS, WORLDS: WORLDS };
}));
