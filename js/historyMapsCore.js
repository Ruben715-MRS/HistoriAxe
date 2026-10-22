// =========================================================================
// === LES CARTES HISTORIQUES — DONNÉES ET RÈGLES (outil de la boîte à outils) ===
// =========================================================================
// Des empires et des régions anciennes, dessinés **à la main**, de façon approximative : pas de source libre fiable pour ces contours, et un
// tracé exact serait trompeur (les frontières anciennes étaient floues, discutées, mouvantes). Chaque carte est un instantané daté
// (« l'Empire romain à la mort d'Auguste, en 14 ») ; une entité en a plusieurs, pour voir qu'un empire grandit et rétrécit.
//
// Les contours sont des anneaux [longitude, latitude]. Ils sont tracés sur la terre ferme et **peuvent déborder sur la mer** : l'écran
// recouvre la mer d'un masque (js/app/history-maps.js), donc seule la partie terrestre est colorée. Les tracer à gros traits sur l'eau est
// donc voulu. Pur, sans DOM : testé dans tests/historyMapsCore.test.js (anneaux fermés, sans croisement, dans le monde).
// Contenu en français seulement ; **à relire par un enseignant**.
//
// Une entité : { id, name, icon, color, span, from, to, places: [{ n, c: [lon, lat] }] (villes repères), capital, summary, snapshots: [{ id, label, year, text, zones: [{ name, ring, color? }] }] }.
// `from` / `to` : années signées (−753 = 753 av. J.-C.) ; elles bornent les événements de l'app proposés avec la carte.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HistoryMapsCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var ENTITIES = [
        {
            id: 'mesopotamie', name: 'Mésopotamie', icon: '🏺', color: '#c2703d', span: 'vers 3500 → 539 av. J.-C.', from: -3500, to: -539,
            places: [{ n: 'Ur', c: [46.1, 30.96] }, { n: 'Uruk', c: [45.64, 31.32] }, { n: 'Babylone', c: [44.42, 32.54] }, { n: 'Assur', c: [43.26, 35.46] }, { n: 'Ninive', c: [43.15, 36.36] }, { n: 'Suse', c: [48.25, 32.19] }],
            capital: 'Uruk, Akkad, Assur, Ninive, Babylone (selon l\'époque)',
            summary: 'La Mésopotamie, « le pays entre les fleuves » (le Tigre et l\'Euphrate), correspond surtout à l\'Irak actuel. Les premières villes, l\'écriture cunéiforme (vers 3300 av. J.-C.) et les premiers États y apparaissent. Ce n\'est pas un seul empire : des cités-États, puis des royaumes et des empires se succèdent.',
            snapshots: [
                {
                    id: 'sumer', label: 'Sumer', year: -2500,
                    text: 'Vers 2500 av. J.-C., le sud est une mosaïque de cités-États rivales (Ur, Uruk, Lagash…), chacune avec son dieu et son roi.',
                    zones: [{ name: 'Cités-États sumériennes', ring: [[43.9, 33.4], [45.2, 33.9], [46.2, 33.0], [47.4, 32.6], [48.3, 31.6], [48.4, 30.2], [47.0, 29.6], [45.6, 30.3], [44.2, 30.8], [43.4, 31.8], [43.3, 32.8]] }]
                },
                {
                    id: 'akkad', label: 'Empire d\'Akkad', year: -2250,
                    text: 'Vers 2300 av. J.-C., Sargon d\'Akkad réunit les cités sous son autorité : c\'est considéré comme le premier empire de l\'histoire.',
                    zones: [{ name: 'Empire d\'Akkad', ring: [[36.0, 36.5], [38.0, 37.0], [41.0, 37.5], [43.5, 37.0], [45.5, 36.0], [47.0, 35.0], [48.8, 32.5], [49.5, 30.5], [48.4, 29.8], [46.5, 29.0], [44.0, 30.0], [42.5, 31.5], [41.0, 32.5], [39.0, 34.0], [36.5, 34.5], [35.8, 35.5]] }]
                },
                {
                    id: 'assyrie', label: 'Empire néo-assyrien', year: -670,
                    text: 'Vers 670 av. J.-C., l\'Assyrie, depuis Ninive, domine tout le Proche-Orient. Assarhaddon conquiert même la Basse-Égypte en 671.',
                    zones: [{ name: 'Empire néo-assyrien', ring: [[31.0, 31.4], [34.3, 31.3], [35.1, 33.0], [35.8, 35.5], [35.5, 36.8], [37.5, 37.5], [39.5, 38.5], [42.0, 39.5], [44.0, 39.0], [45.8, 37.8], [47.6, 36.0], [48.6, 34.0], [48.8, 31.5], [48.3, 30.0], [46.5, 29.2], [44.0, 30.0], [41.0, 30.8], [38.5, 30.6], [36.0, 29.8], [34.0, 29.4], [32.8, 29.8], [31.5, 30.0]] }]
                },
                {
                    id: 'babylone', label: 'Empire néo-babylonien', year: -580,
                    text: 'Vers 580 av. J.-C., Nabuchodonosor II règne sur Babylone, à son apogée. Il prend Jérusalem (587). L\'empire tombe devant le Perse Cyrus en 539.',
                    zones: [{ name: 'Empire néo-babylonien', ring: [[34.4, 31.3], [35.2, 33.0], [35.9, 35.5], [36.4, 36.7], [38.5, 37.2], [41.0, 37.2], [42.8, 37.4], [43.8, 36.5], [45.5, 36.0], [46.5, 34.5], [47.6, 33.0], [48.4, 31.5], [48.3, 29.9], [46.5, 29.3], [44.0, 30.2], [41.0, 30.9], [38.5, 30.6], [36.0, 29.6], [34.6, 29.9]] }]
                }
            ]
        },
        {
            id: 'egypte', name: 'Égypte pharaonique', icon: '𓂀', color: '#d9a521', span: 'vers 3100 → 30 av. J.-C.', from: -3100, to: -30,
            places: [{ n: 'Memphis', c: [31.25, 29.85] }, { n: 'Gizeh', c: [31.13, 29.98] }, { n: 'Thèbes', c: [32.64, 25.72] }, { n: 'Pi-Ramsès', c: [31.83, 30.8] }, { n: 'Alexandrie', c: [29.92, 31.2] }, { n: 'Assouan', c: [32.9, 24.09] }, { n: 'Napata', c: [31.85, 18.55] }],
            capital: 'Memphis, Thèbes, Pi-Ramsès (puis Alexandrie, sous les Ptolémées)',
            summary: 'Un royaume né il y a plus de 5 000 ans le long du Nil, réuni (selon la tradition) vers 3100 av. J.-C. Le fleuve et ses crues rythment tout : l\'Égypte habitée est une bande étroite de terres noires entre deux déserts. Elle s\'achève avec la mort de Cléopâtre VII et la conquête romaine, en 30 av. J.-C.',
            snapshots: [
                {
                    id: 'ancien', label: 'Ancien Empire', year: -2500,
                    text: 'Vers 2500 av. J.-C., c\'est l\'époque des grandes pyramides de Gizeh (Khéops, vers 2560). Le pays se réduit à la vallée du Nil et au delta.',
                    zones: [{ name: 'Égypte de l\'Ancien Empire', ring: [[29.5, 31.3], [31.6, 31.6], [32.4, 31.3], [32.6, 30.3], [32.0, 29.6], [31.7, 28.0], [32.2, 26.8], [33.1, 25.7], [33.4, 24.0], [32.5, 23.9], [32.0, 25.5], [31.0, 26.8], [30.3, 28.2], [30.7, 29.5], [30.2, 30.2], [29.5, 30.6]] }]
                },
                {
                    id: 'nouveau', label: 'Nouvel Empire', year: -1450,
                    text: 'Vers 1450 av. J.-C., Thoutmosis III porte l\'Égypte à son extension maximale : la Nubie au sud, la Syrie-Palestine jusqu\'à l\'Euphrate au nord-est.',
                    zones: [{ name: 'Égypte du Nouvel Empire', ring: [[29.8, 31.1], [32.4, 31.4], [34.3, 31.3], [35.1, 33.0], [35.8, 35.0], [36.2, 36.4], [38.2, 36.9], [38.6, 35.2], [38.0, 33.2], [37.0, 31.8], [35.4, 29.8], [34.2, 29.0], [33.0, 29.6], [32.6, 28.5], [32.3, 27.0], [33.2, 25.8], [33.6, 24.0], [33.4, 22.0], [32.6, 20.0], [32.4, 18.4], [31.4, 18.3], [31.0, 20.0], [30.9, 22.0], [31.0, 23.8], [30.4, 25.5], [30.2, 27.5], [30.4, 29.4], [29.2, 30.5]] }]
                }
            ]
        },
        {
            id: 'rome', name: 'Empire romain', icon: '🏛️', color: '#b91c1c', span: '27 av. J.-C. → 476 (Occident) et 1453 (Orient)', from: -27, to: 476,
            places: [{ n: 'Rome', c: [12.5, 41.9] }, { n: 'Constantinople', c: [28.98, 41.01] }, { n: 'Carthage', c: [10.32, 36.85] }, { n: 'Alexandrie', c: [29.92, 31.2] }, { n: 'Lyon (Lugdunum)', c: [4.83, 45.76] }, { n: 'Antioche', c: [36.16, 36.2] }, { n: 'Londres (Londinium)', c: [-0.09, 51.51] }, { n: 'Milan', c: [9.19, 45.46] }, { n: 'Ravenne', c: [12.2, 44.42] }],
            capital: 'Rome (puis Constantinople, à partir de 330, pour la partie orientale)',
            summary: 'Rome, cité-État devenue république, étend sa domination autour de la Méditerranée, qu\'elle appelle « Mare nostrum ». L\'Empire commence avec Auguste (27 av. J.-C.). Il atteint son extension maximale vers 117 sous Trajan, se partage en 395 entre Occident et Orient, et l\'Occident disparaît en 476. L\'Orient (l\'Empire byzantin) dure jusqu\'en 1453.',
            snapshots: [
                {
                    id: 'auguste', label: 'À la mort d\'Auguste', year: 14,
                    text: 'En 14, l\'empire borde la Méditerranée, avec le Rhin et le Danube pour frontières au nord. La conquête de la Germanie, au-delà du Rhin, a échoué en l\'an 9 (défaite de Varus).',
                    zones: [{ name: 'Empire romain', ring: [[-12, 36], [-12, 44], [-6, 49.5], [-2, 50.0], [1.2, 50.6], [3.0, 51.5], [4.2, 52.8], [6.5, 53.7], [7.2, 53.2], [6.6, 52.0], [7.0, 51.0], [8.0, 50.0], [8.5, 49.0], [8.0, 48.0], [7.7, 47.6], [9.5, 47.6], [10.0, 48.4], [12.0, 48.9], [14.4, 48.4], [16.4, 48.2], [17.3, 48.0], [19.0, 47.5], [18.9, 46.0], [20.4, 44.8], [22.5, 44.5], [25.9, 43.9], [28.0, 44.1], [29.5, 45.2], [32, 44.5], [38, 43], [41.5, 41.6], [40.5, 40.2], [38.5, 39.0], [38.4, 37.0], [38.3, 35.8], [38.6, 34.5], [37.8, 32.8], [36.0, 31.0], [34.2, 31.1], [32.6, 29.9], [33.8, 27.2], [34.5, 25.5], [34.5, 24.0], [33.0, 23.8], [30.0, 24.5], [28.0, 25.5], [25.0, 29.0], [24.5, 30.5], [19.0, 30.3], [14.0, 31.8], [11.0, 32.2], [9.2, 34.0], [8.0, 34.5], [7.0, 35.0], [5.0, 35.0], [2.0, 35.5], [-2.0, 34.8], [-5.0, 34.2], [-6.5, 33.7], [-8.5, 32.8], [-12, 34]] }]
                },
                {
                    id: 'trajan', label: 'À l\'apogée, sous Trajan', year: 117,
                    text: 'En 117, l\'empire est à son maximum : la Bretagne jusqu\'au mur d\'Hadrien, la Dacie (conquise par Trajan en 106), l\'Arabie, et, très brièvement, la Mésopotamie jusqu\'au golfe Persique. Hadrien abandonnera ces dernières conquêtes.',
                    zones: [{ name: 'Empire romain', ring: [[-12, 36], [-12, 44], [-6, 49.5], [-7, 52], [-5.5, 54.0], [-3.5, 55.2], [-1.2, 55.2], [2.5, 54.0], [4.2, 52.8], [6.5, 53.7], [7.2, 53.2], [6.6, 52.0], [7.0, 51.0], [8.0, 50.0], [8.5, 49.0], [8.0, 48.0], [7.7, 47.6], [9.5, 47.6], [10.0, 48.4], [12.0, 48.9], [14.4, 48.4], [16.4, 48.2], [17.3, 48.0], [19.0, 47.5], [18.9, 46.0], [20.4, 44.8], [21.3, 45.7], [22.0, 47.0], [23.5, 47.8], [25.5, 47.8], [26.3, 46.3], [25.2, 45.3], [24.5, 43.7], [25.9, 43.9], [28.0, 44.1], [29.5, 45.2], [32, 44.5], [38, 43], [41.5, 41.6], [43.0, 40.5], [45.0, 39.5], [46.5, 38.5], [45.5, 36.0], [46.2, 34.5], [47.5, 33.0], [48.5, 31.0], [48.3, 29.8], [46.0, 29.0], [44.0, 30.0], [42.5, 32.5], [40.0, 31.0], [38.5, 29.5], [37.5, 28.5], [36.0, 27.5], [34.6, 27.8], [33.5, 28.8], [32.6, 29.9], [33.8, 27.2], [34.5, 25.5], [34.5, 24.0], [33.0, 23.8], [30.0, 24.5], [28.0, 25.5], [25.0, 29.0], [24.5, 30.5], [19.0, 30.3], [14.0, 31.8], [11.0, 32.2], [9.2, 34.0], [8.0, 34.5], [7.0, 35.0], [5.0, 35.0], [2.0, 35.5], [-2.0, 34.8], [-5.0, 34.2], [-6.5, 33.7], [-8.5, 32.8], [-12, 34]] }]
                },
                {
                    id: 'partage', label: 'Le partage de 395', year: 395,
                    text: 'En 395, à la mort de Théodose, l\'empire est partagé entre ses deux fils : l\'Occident (capitale Milan, puis Ravenne) et l\'Orient (capitale Constantinople). Ce partage devient définitif ; l\'Occident disparaît en 476, l\'Orient survit.',
                    zones: [
                        { name: 'Empire romain d\'Occident', color: '#b91c1c', ring: [[-12, 36], [-12, 44], [-6, 49.5], [-7, 52], [-5.5, 54.0], [-3.5, 55.2], [-1.2, 55.2], [2.5, 54.0], [4.2, 52.8], [6.5, 53.7], [7.2, 53.2], [6.6, 52.0], [7.0, 51.0], [8.0, 50.0], [8.5, 49.0], [8.0, 48.0], [7.7, 47.6], [9.5, 47.6], [10.0, 48.4], [12.0, 48.9], [14.4, 48.4], [16.4, 48.2], [17.3, 48.0], [19.0, 47.5], [19.0, 45.5], [19.0, 43.0], [19.5, 41.8], [19.5, 38.0], [19.0, 30.0], [14.0, 31.8], [11.0, 32.2], [9.2, 34.0], [8.0, 34.5], [7.0, 35.0], [5.0, 35.0], [2.0, 35.5], [-2.0, 34.8], [-5.0, 34.2], [-6.5, 33.7], [-8.5, 32.8], [-12, 34]] },
                        { name: 'Empire romain d\'Orient', color: '#7e22ce', ring: [[19.0, 45.5], [20.4, 44.8], [22.5, 44.5], [25.9, 43.9], [28.0, 44.1], [29.5, 45.2], [32, 44.5], [38, 43], [41.5, 41.6], [40.5, 40.2], [38.5, 39.0], [38.4, 37.0], [38.3, 35.8], [38.6, 34.5], [37.8, 32.8], [36.0, 31.0], [34.2, 31.1], [32.6, 29.9], [33.8, 27.2], [34.5, 25.5], [34.5, 24.0], [33.0, 23.8], [30.0, 24.5], [28.0, 25.5], [25.0, 29.0], [24.5, 30.5], [19.0, 30.0], [19.5, 38.0], [19.5, 41.8], [19.0, 43.0]] }
                    ]
                }
            ]
        },
        {
            id: 'saint-empire', name: 'Saint-Empire romain germanique', icon: '👑', color: '#7c3aed', span: '962 → 1806', from: 962, to: 1806,
            places: [{ n: 'Aix-la-Chapelle', c: [6.08, 50.78] }, { n: 'Francfort', c: [8.68, 50.11] }, { n: 'Prague', c: [14.42, 50.09] }, { n: 'Vienne', c: [16.37, 48.21] }, { n: 'Ratisbonne', c: [12.1, 49.02] }, { n: 'Milan', c: [9.19, 45.46] }, { n: 'Rome', c: [12.5, 41.9] }],
            capital: 'Pas de capitale fixe : les empereurs se déplacent ; couronnement à Aix-la-Chapelle, puis Francfort ; la Diète siège à Ratisbonne (1663-1806)',
            summary: 'Né en 962, quand le roi de Germanie Otton Ier est couronné empereur à Rome, il se présente comme l\'héritier de Charlemagne et de l\'Empire romain. Mosaïque de principautés, de villes libres et de royaumes, dont l\'empereur est élu, il est très peu centralisé. Il disparaît en 1806, quand François II renonce à la couronne sous la pression de Napoléon.',
            snapshots: [
                {
                    id: '962', label: 'Au temps d\'Otton Ier', year: 962,
                    text: 'En 962, l\'empire réunit la Germanie, la Lotharingie, la Bohême et l\'Italie du Nord et du Centre. La Bourgogne n\'en fera partie qu\'en 1032.',
                    zones: [{ name: 'Saint-Empire (962)', ring: [[7.0, 53.8], [8.6, 54.3], [9.9, 54.4], [10.9, 54.3], [12.2, 54.3], [13.0, 53.7], [13.6, 52.6], [14.5, 51.2], [15.6, 50.7], [16.9, 50.3], [17.2, 49.5], [16.1, 48.8], [14.7, 48.3], [14.5, 47.2], [14.0, 46.5], [13.7, 45.7], [12.4, 45.2], [12.5, 44.2], [13.6, 43.6], [14.2, 42.5], [13.4, 41.9], [12.4, 41.8], [11.1, 42.3], [10.2, 43.5], [9.0, 44.3], [7.7, 44.2], [7.2, 45.4], [8.3, 46.2], [8.7, 47.0], [7.5, 47.6], [7.3, 48.5], [5.9, 48.9], [5.0, 49.6], [4.5, 50.1], [3.8, 50.9], [3.6, 51.5], [4.5, 52.6], [5.6, 53.2]] }]
                },
                {
                    id: '1250', label: 'Au temps de Frédéric II', year: 1250,
                    text: 'Vers 1250, l\'empire s\'étend du Rhône à l\'Oder et de la Baltique à l\'Italie du Nord : il a absorbé le royaume de Bourgogne (Arles) et gagné des terres vers l\'est. Mais le pape et les villes italiennes lui résistent, et l\'empereur perd en pouvoir ce qu\'il gagne en territoire.',
                    zones: [{ name: 'Saint-Empire (vers 1250)', ring: [[7.0, 53.8], [8.6, 54.3], [9.9, 54.4], [10.9, 54.3], [12.2, 54.3], [14.0, 54.1], [14.6, 53.8], [14.8, 52.6], [15.2, 51.5], [16.2, 50.6], [17.0, 50.3], [17.4, 49.5], [16.4, 48.7], [16.8, 47.7], [16.3, 47.0], [15.7, 46.5], [15.2, 45.9], [14.1, 45.4], [13.7, 45.2], [12.4, 45.2], [12.3, 44.4], [11.5, 44.0], [11.8, 43.2], [11.1, 42.4], [10.2, 43.5], [9.0, 44.3], [8.0, 43.8], [7.3, 43.7], [6.5, 43.1], [5.4, 43.3], [4.5, 43.4], [4.5, 44.5], [4.6, 45.5], [4.9, 46.2], [5.2, 47.0], [5.3, 48.0], [5.0, 48.8], [4.8, 49.8], [4.0, 50.6], [3.6, 51.4], [4.5, 52.6], [5.6, 53.2]] }]
                },
                {
                    id: '1648', label: 'Après les traités de Westphalie', year: 1648,
                    text: 'En 1648, la guerre de Trente Ans s\'achève. L\'empire n\'est plus qu\'une fédération lâche de plus de 300 États : la Suisse et les Provinces-Unies en sont sorties, la France garde une partie de l\'Alsace. Son centre de gravité est l\'Autriche des Habsbourg.',
                    zones: [{ name: 'Saint-Empire (1648)', ring: [[7.0, 53.8], [8.6, 54.3], [9.9, 54.4], [10.9, 54.3], [12.2, 54.3], [13.6, 54.4], [14.6, 53.9], [15.4, 52.8], [15.8, 51.5], [17.3, 51.0], [18.5, 50.3], [18.3, 49.6], [17.6, 48.9], [17.0, 48.0], [16.8, 47.6], [16.2, 46.9], [15.5, 46.6], [15.2, 45.9], [14.3, 45.5], [13.7, 45.6], [13.0, 46.4], [12.4, 46.8], [11.3, 46.0], [10.5, 46.3], [10.2, 46.9], [9.6, 47.1], [9.5, 47.6], [8.6, 47.7], [7.6, 47.6], [7.8, 48.4], [8.2, 49.0], [7.0, 49.4], [6.2, 49.5], [5.8, 49.7], [5.9, 50.4], [5.7, 51.0], [6.1, 51.8], [6.8, 52.2], [7.0, 53.2]] }]
                }
            ]
        },
        {
            id: 'ottoman', name: 'Empire ottoman', icon: '🌙', color: '#15803d', span: 'vers 1299 → 1922', from: 1299, to: 1922,
            places: [{ n: 'Bursa', c: [29.06, 40.18] }, { n: 'Edirne', c: [26.56, 41.68] }, { n: 'Constantinople', c: [28.98, 41.01] }, { n: 'Le Caire', c: [31.24, 30.04] }, { n: 'Bagdad', c: [44.36, 33.31] }, { n: 'La Mecque', c: [39.83, 21.42] }, { n: 'Belgrade', c: [20.46, 44.82] }, { n: 'Alger', c: [3.06, 36.75] }],
            capital: 'Bursa, puis Édirne, puis Constantinople (Istanbul) à partir de 1453',
            summary: 'Né vers 1299 en Anatolie du nord-ouest autour d\'Osman Ier, l\'État ottoman grandit en Asie Mineure et dans les Balkans, prend Constantinople en 1453 (Mehmed II) et devient une puissance sur trois continents. Il recule à partir de la fin du XVIIe siècle, se réduit au XIXe (« l\'homme malade de l\'Europe »), et disparaît après la Première Guerre mondiale (sultanat aboli en 1922, République turque en 1923).',
            snapshots: [
                {
                    id: '1520', label: 'À l\'avènement de Soliman', year: 1520,
                    text: 'En 1520, Soliman le Magnifique monte sur le trône. L\'empire tient l\'Anatolie, une grande partie des Balkans, la Syrie, l\'Égypte (conquise en 1517) et le Hedjaz, avec les villes saintes de La Mecque et Médine.',
                    zones: [{ name: 'Empire ottoman (1520)', ring: [[20.3, 44.8], [22.5, 44.4], [25.9, 43.8], [28.5, 44.0], [30, 45], [34, 44.5], [38, 43.5], [41.5, 41.6], [43.5, 40.8], [44.0, 39.5], [43.5, 38.2], [42.0, 37.5], [41.0, 37.0], [39.5, 36.5], [38.6, 34.5], [38.0, 33.0], [37.0, 31.5], [36.0, 29.5], [37.5, 27.5], [39.5, 25.0], [40.5, 21.0], [41.0, 19.5], [37.0, 22.0], [35.5, 24.0], [33.0, 24.5], [32.0, 23.9], [30.5, 24.5], [25.0, 26.0], [25.0, 29.5], [25.0, 31.6], [25, 33], [23, 36], [21, 36.5], [19.8, 39.5], [19.3, 41.8], [19.0, 42.5], [17.5, 43.2], [16.3, 44.1], [15.7, 44.8], [16.5, 45.2], [18.5, 45.0]] }]
                },
                {
                    id: '1683', label: 'À l\'apogée, au siège de Vienne', year: 1683,
                    text: 'En 1683, les Ottomans assiègent Vienne pour la seconde fois, sans succès : c\'est le début du recul. L\'empire va alors de la Hongrie à l\'Irak et à l\'Algérie, de la mer Noire à la Haute-Égypte. Les régences d\'Alger, de Tunis et de Tripoli ne dépendent plus que de loin du sultan.',
                    zones: [{ name: 'Empire ottoman (1683)', ring: [[17.0, 46.0], [18.5, 47.5], [20.0, 48.2], [22.0, 48.5], [24.5, 48.2], [26.0, 48.9], [27.5, 48.5], [29.0, 47.5], [30.5, 46.5], [32.5, 46.0], [34.5, 45.5], [36.5, 45.2], [38, 44.5], [40, 43.5], [41.5, 41.6], [43.5, 41.0], [44.0, 39.5], [44.3, 38.0], [44.0, 37.0], [45.0, 36.0], [45.8, 35.0], [46.5, 34.0], [47.5, 32.5], [48.5, 30.5], [48.0, 29.5], [47.0, 29.0], [43.0, 29.0], [40.0, 29.0], [38.0, 27.0], [39.5, 25.0], [40.5, 21.0], [37.0, 21.5], [33.5, 23.8], [30.0, 24.0], [25.0, 25.5], [23.0, 28.5], [18.0, 29.0], [14.0, 28.0], [11.0, 30.5], [9.5, 32.0], [8.5, 34.0], [5.0, 35.0], [1.0, 34.5], [-1.5, 35.0], [-1.0, 37.0], [10, 37.5], [15, 36], [21, 36.0], [19.8, 39.5], [19.4, 41.8], [18.8, 42.5], [17.5, 43.2], [16.0, 44.9], [16.5, 45.2]] }]
                },
                {
                    id: '1914', label: 'À la veille de la Première Guerre mondiale', year: 1914,
                    text: 'En 1914, l\'empire s\'est beaucoup réduit : les Balkans sont perdus (guerres balkaniques de 1912-1913), l\'Égypte, la Tunisie et la Libye aussi. Il garde l\'Anatolie, la Syrie, la Palestine, l\'Irak et la côte occidentale de l\'Arabie. Il entre en guerre aux côtés de l\'Allemagne, fin 1914.',
                    zones: [{ name: 'Empire ottoman (1914)', ring: [[26.2, 41.0], [26.5, 41.7], [28.0, 41.95], [29.0, 41.2], [31.0, 41.3], [36.0, 42.0], [41.5, 41.5], [42.5, 41.0], [42.5, 40.0], [44.1, 39.5], [44.5, 39.7], [44.0, 38.4], [44.5, 37.5], [45.0, 36.5], [46.0, 35.0], [46.7, 33.8], [47.7, 32.5], [48.0, 30.5], [48.3, 29.9], [46.0, 29.5], [44.0, 30.5], [42.0, 28.5], [40.0, 26.0], [41.0, 24.0], [42.5, 20.0], [43.5, 17.5], [43.8, 15.0], [43.5, 13.0], [42.8, 13.8], [38, 20], [36, 25.0], [34.9, 29.4], [34.2, 31.3], [35.0, 33.0], [36.2, 36.6], [34, 36.4], [30, 36], [27.5, 36.7], [26, 38.5], [25.5, 40]] }]
                }
            ]
        },
        {
            id: 'mongol', name: 'Empire mongol', icon: '🐎', color: '#0e7490', span: '1206 → 1368 (Yuan)', from: 1206, to: 1368,
            places: [{ n: 'Karakorum', c: [102.84, 47.2] }, { n: 'Khanbaliq (Pékin)', c: [116.4, 39.9] }, { n: 'Samarcande', c: [66.96, 39.65] }, { n: 'Bagdad', c: [44.36, 33.31] }, { n: 'Saraï', c: [46.0, 48.7] }, { n: 'Kiev', c: [30.52, 50.45] }, { n: 'Tabriz', c: [46.3, 38.08] }],
            capital: 'Karakorum (jusqu\'en 1260), puis Khanbaliq, l\'actuelle Pékin (dynastie Yuan)',
            summary: 'En 1206, Temüjin est proclamé Gengis Khan, « souverain universel », des tribus mongoles réunies. En quelques décennies, ses cavaliers conquièrent le plus grand empire d\'un seul tenant de l\'histoire, de la Chine à l\'Europe de l\'Est. À la mort du Grand Khan Möngke (1259), il se divise en quatre khanats, dont la dynastie chinoise des Yuan, fondée par Kubilai, qui tombe en 1368.',
            snapshots: [
                {
                    id: '1227', label: 'À la mort de Gengis Khan', year: 1227,
                    text: 'En 1227, Gengis Khan meurt pendant la conquête des Xia occidentaux. L\'empire va déjà de la Mandchourie à la mer Caspienne : la Mongolie, une partie de la Chine du Nord, l\'Asie centrale et l\'est de l\'Iran (Khwarezm, détruit en 1220-1221).',
                    zones: [{ name: 'Empire mongol (1227)', ring: [[56, 55], [70, 55.5], [85, 56], [100, 55], [112, 53.5], [122, 52.5], [130, 50], [134, 48], [131, 43.5], [126, 41], [122, 40.5], [119, 40.2], [117.5, 38.2], [114.5, 36.0], [110.5, 35.0], [106, 34.0], [103, 32.0], [100, 34.0], [95, 35.5], [90, 36.8], [84, 37.5], [78, 37.0], [74, 37.5], [72, 36.5], [69, 36.0], [66, 34.5], [62.5, 33.8], [60.5, 34.5], [58, 36.0], [55, 37.5], [54, 38.5], [53.8, 41], [53, 45], [50, 46.5], [48.5, 48], [48.5, 51], [52, 52.5]] }]
                },
                {
                    id: '1279', label: 'Sous Kubilai, les quatre khanats', year: 1279,
                    text: 'En 1279, Kubilai Khan achève la conquête de la Chine des Song : la dynastie Yuan règne sur toute la Chine. L\'empire est alors partagé en quatre khanats, de moins en moins soumis au Grand Khan : les Yuan (Chine et Mongolie), le khanat de Djaghataï (Asie centrale), les Ilkhans (Iran et Irak) et la Horde d\'or (steppes russes, dont les princes russes sont tributaires).',
                    zones: [
                        { name: 'Dynastie Yuan', color: '#0e7490', ring: [[100, 52.5], [112, 53.5], [122, 53], [130, 50], [134, 48], [131, 43], [128.5, 41], [129.3, 37], [129, 35.2], [126.3, 34.5], [126.5, 37.0], [122, 36.8], [121, 32], [122, 30], [120, 26.5], [116.5, 23], [110.5, 20.8], [108, 21.5], [106, 22.5], [103, 22.5], [100, 21.5], [98, 24], [98.5, 28], [97, 29], [92, 27.5], [88.5, 27.8], [84, 28.5], [80, 30.5], [80, 31.5], [86, 40], [88, 45], [91, 48.5], [97, 51]] },
                        { name: 'Khanat de Djaghataï', color: '#b45309', ring: [[63, 37.5], [63.5, 40.5], [66, 43.5], [71, 45.5], [76, 46], [82, 46], [88, 45], [88, 43], [84, 39.5], [78, 37], [74, 36.5], [71, 36], [67.5, 35.0]] },
                        { name: 'Ilkhanat (Iran et Irak)', color: '#7c3aed', ring: [[30, 38.0], [32, 41.0], [37, 41.0], [41, 41.5], [44, 42.0], [48, 41.5], [49, 38.5], [53, 37], [57, 37.5], [60, 36.5], [62, 34.5], [66, 34], [67.5, 35.0], [66, 31.5], [62, 29.5], [58, 26], [54.5, 26.5], [51, 27], [48.5, 29.8], [47, 29.2], [43, 30.0], [41, 32.0], [39.5, 34.5], [38.5, 36.5], [35, 36.7], [32.5, 36.0]] },
                        { name: 'Horde d\'or (et princes russes tributaires)', color: '#be123c', ring: [[29, 45.8], [27.5, 48.5], [30, 51.5], [31, 55], [29, 58.5], [34, 60.5], [42, 59], [48, 58], [55, 56], [62, 53], [68, 52], [70, 48], [66, 45], [60, 45], [56, 43], [53, 42], [50, 45.5], [47, 43], [44, 43.5], [40, 44.5], [38, 45.2], [34.5, 46.0], [30.5, 46.2]] }
                    ]
                }
            ]
        }
    ];

    function entityById(id) {
        return ENTITIES.filter(function (e) { return e.id === id; })[0] || null;
    }

    function snapshotOf(entity, snapshotId) {
        return entity.snapshots.filter(function (s) { return s.id === snapshotId; })[0] || null;
    }

    // L'anneau fermé (le premier point répété à la fin), comme l'exige GeoJSON.
    function closeRing(ring) {
        var first = ring[0], last = ring[ring.length - 1];
        return first[0] === last[0] && first[1] === last[1] ? ring.slice() : ring.concat([first]);
    }

    // Les zones d'un instantané, en entités GeoJSON (une par zone, avec sa couleur et son nom).
    function snapshotFeatures(entity, snapshot) {
        return snapshot.zones.map(function (zone, i) {
            return {
                type: 'Feature',
                properties: { zone: i, name: zone.name, color: zone.color || entity.color },
                geometry: { type: 'Polygon', coordinates: [closeRing(zone.ring)] }
            };
        });
    }

    // Tous les polygones d'un instantané en un seul MultiPolygon (pour chercher les événements qui y sont situés).
    function snapshotGeometry(snapshot) {
        return { type: 'MultiPolygon', coordinates: snapshot.zones.map(function (zone) { return [closeRing(zone.ring)]; }) };
    }

    // Les segments [a,b] et [c,d] se croisent-ils vraiment (hors extrémités communes) ?
    function segmentsCross(a, b, c, d) {
        function orient(p, q, r) { return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]); }
        var o1 = orient(a, b, c), o2 = orient(a, b, d), o3 = orient(c, d, a), o4 = orient(c, d, b);
        return ((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0));
    }

    // Un anneau qui se recoupe (un « 8 ») se dessine mal : on le repère pour le corriger. Retourne la paire de segments fautive, ou null.
    function selfIntersection(ring) {
        var r = closeRing(ring);
        for (var i = 0; i < r.length - 1; i++) {
            for (var j = i + 2; j < r.length - 1; j++) {
                if (i === 0 && j === r.length - 2) continue;   // premier et dernier segments se touchent au point de fermeture
                if (segmentsCross(r[i], r[i + 1], r[j], r[j + 1])) return [i, j];
            }
        }
        return null;
    }

    // L'événement (année signée) est-il dans la période de l'entité ?
    function inSpan(entity, year) {
        return typeof year === 'number' && year >= entity.from && year <= entity.to;
    }

    return {
        ENTITIES: ENTITIES, entityById: entityById, snapshotOf: snapshotOf, closeRing: closeRing, snapshotFeatures: snapshotFeatures,
        snapshotGeometry: snapshotGeometry, selfIntersection: selfIntersection, inSpan: inSpan
    };
}));
