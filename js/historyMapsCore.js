// =========================================================================
// === LES CARTES HISTORIQUES — DONNÉES ET RÈGLES (outil de la boîte à outils) ===
// =========================================================================
// Des empires, des civilisations et des régions anciennes (de la Mésopotamie aux Incas), dessinés **à la main**, de façon approximative : pas de source libre fiable pour ces contours, et un
// tracé exact serait trompeur (les frontières anciennes étaient floues, discutées, mouvantes). Chaque carte est un instantané daté
// (« l'Empire romain à la mort d'Auguste, en 14 ») ; une entité en a plusieurs, pour voir qu'un empire grandit et rétrécit.
//
// Les contours sont des anneaux [longitude, latitude]. Ils sont tracés sur la terre ferme et **peuvent déborder sur la mer** : l'écran
// recouvre la mer d'un masque (js/app/history-maps.js), donc seule la partie terrestre est colorée. Les tracer à gros traits sur l'eau est
// donc voulu. Pur, sans DOM : testé dans tests/historyMapsCore.test.js (anneaux fermés, sans croisement, dans le monde).
// Contenu en français seulement ; **à relire par un enseignant**.
//
// Une entité : { id, name, icon, color, span, from, to, places: [{ n, c: [lon, lat] }] (villes repères), capital, summary, snapshots: [{ id, label, year, text, zones: [{ name, ring, color? }] }] }.
// `from` / `to` : années signées (−753 = 753 av. J.-C.) ; elles bornent les événements de l'app proposés avec la carte. `peak` : l'année de l'apogée,
// qui classe l'entité dans une tranche (CATEGORIES). `legend: true` sur un instantané force la légende des zones.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.HistoryMapsCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var ENTITIES = [
        {
            id: 'mesopotamie', name: 'Mésopotamie', icon: '🏺', color: '#c2703d', span: 'vers 3500 → 539 av. J.-C.', from: -3500, to: -539, peak: -670,
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
            id: 'egypte', name: 'Égypte pharaonique', icon: '𓂀', color: '#d9a521', span: 'vers 3100 → 30 av. J.-C.', from: -3100, to: -30, peak: -1450,
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
            id: 'maurya', name: "Empire maurya", icon: "🛕", color: '#c2410c', span: "vers 321 → 185 av. J.-C.", from: -322, to: -185, peak: -250,
            places: [{ n: "Pataliputra", c: [85.14, 25.61] }, { n: "Taxila", c: [72.8, 33.75] }, { n: "Ujjain", c: [75.78, 23.18] }, { n: "Sarnath", c: [83.02, 25.38] }, { n: "Kandahar", c: [65.7, 31.6] }, { n: "Bhubaneswar", c: [85.82, 20.3] }],
            capital: "Pataliputra (l'actuelle Patna)",
            summary: "Le premier grand empire de l'Inde, fondé vers 321 av. J.-C. par Chandragupta Maurya, qui renverse la dynastie des Nanda dans le royaume de Magadha. Il repousse les Grecs de Séleucos Ier (vers 305) et réunit le nord du sous-continent. Son petit-fils Ashoka (268-232) en fait le plus vaste État de l'Inde ancienne : après la guerre sanglante du Kalinga, il se convertit au bouddhisme et prêche la tolérance par des édits gravés sur des piliers, qui sont parmi les plus anciens textes écrits déchiffrés de l'Inde. L'empire se disloque après sa mort : le dernier roi maurya est assassiné vers 185 av. J.-C.",
            snapshots: [
                {
                    id: 'chandragupta', label: "Sous Chandragupta Maurya", year: -300,
                    text: "Vers 300 av. J.-C., Chandragupta, venu de Magadha, a renversé les Nanda (vers 321) et conquis le nord de l'Inde. Il bat Séleucos Ier (vers 305) qui lui cède les provinces à l'ouest de l'Indus, contre 500 éléphants de guerre. Son ministre Kautilya aurait écrit l'Arthashastra, traité de gouvernement.",
                    zones: [{ name: "Empire maurya (vers 300)", ring: [[62.0, 30.5], [65.0, 34.0], [68.0, 34.5], [71.5, 34.5], [74.5, 34.0], [77.0, 32.5], [79.0, 30.5], [81.0, 29.0], [84.0, 27.5], [87.0, 26.0], [88.5, 24.5], [87.5, 22.0], [86.0, 21.0], [84.0, 19.5], [80.0, 19.5], [77.5, 19.5], [75.0, 19.5], [73.0, 19.5], [72.7, 21.0], [70.5, 21.0], [69.5, 22.5], [68.7, 23.5], [67.5, 24.5], [66.0, 25.5], [63.5, 26.0], [62.0, 28.0]] }]
                },
                {
                    id: 'ashoka', label: "Sous Ashoka", year: -250,
                    text: "Vers 250 av. J.-C., sous Ashoka (268-232), l'empire couvre presque tout le sous-continent, sauf l'extrême sud. Après la conquête du Kalinga (vers 261), qui fait des dizaines de milliers de morts, Ashoka renonce à la guerre, soutient le bouddhisme et envoie des missionnaires jusqu'à Ceylan et dans les royaumes grecs.",
                    zones: [{ name: "Empire maurya (vers 250)", ring: [[62.0, 32.0], [66.0, 36.5], [70.0, 36.0], [73.0, 35.0], [74.5, 34.5], [77.0, 34.0], [80.0, 31.0], [84.0, 28.5], [88.0, 27.0], [92.0, 26.5], [93.0, 24.0], [92.0, 22.5], [91.0, 22.0], [88.0, 21.5], [86.5, 20.0], [84.5, 18.5], [82.0, 16.5], [80.3, 15.7], [79.8, 13.5], [77.5, 11.8], [74.8, 12.8], [73.0, 16.0], [72.8, 19.0], [72.6, 21.5], [70.0, 21.0], [68.5, 23.5], [67.5, 24.5], [66.5, 25.5], [63.0, 26.0], [62.0, 28.0], [61.5, 30.0]] }]
                }
            ]
        },
        {
            id: 'han', name: "Empire Han", icon: "🐉", color: '#b91c1c', span: "206 av. J.-C. → 220", from: -206, to: 220, peak: 100,
            places: [{ n: "Chang'an", c: [108.94, 34.34] }, { n: "Luoyang", c: [112.45, 34.62] }, { n: "Dunhuang", c: [94.66, 40.14] }, { n: "Kashgar", c: [75.99, 39.47] }, { n: "Chengdu", c: [104.07, 30.67] }, { n: "Pyongyang", c: [125.75, 39.02] }, { n: "Hanoï", c: [105.85, 21.03] }],
            capital: "Chang'an (Han occidentaux), puis Luoyang (Han orientaux, dès 25)",
            summary: "Liu Bang fonde la dynastie Han en 206 av. J.-C., après la chute de l'éphémère dynastie Qin. Pendant plus de quatre siècles (avec un intermède, l'usurpation de Wang Mang de 9 à 23), la Chine y gagne son identité : on dit encore « Han » pour les Chinois majoritaires et « langue han » pour le chinois. Sous l'empereur Wudi (141-87), l'empire se tourne vers l'extérieur : guerres contre les Xiongnu, mission de Zhang Qian vers l'ouest, qui ouvre les routes de la soie. Le confucianisme devient doctrine d'État ; on invente le papier (Cai Lun, 105) ; Sima Qian écrit la première grande histoire de la Chine. Après des révoltes (Turbans jaunes, 184), l'empire se divise en Trois Royaumes (220).",
            snapshots: [
                {
                    id: 'han-occ', label: "Han occidentaux, sous Wudi", year: -100,
                    text: "Vers 100 av. J.-C., sous Wudi, l'empire s'étend au nord contre les Xiongnu (corridor du Hexi jusqu'à Dunhuang), au sud (Nanyue, le Vietnam du nord, en 111) et à l'est (commanderies de Corée, 108). Chang'an est l'une des plus grandes villes du monde.",
                    zones: [{ name: "Empire Han (vers 100 av. J.-C.)", ring: [[94.0, 40.5], [100.0, 42.5], [106.0, 41.5], [111.0, 42.0], [116.0, 41.5], [119.0, 41.5], [122.0, 40.5], [125.5, 40.0], [126.5, 37.5], [122.5, 37.5], [120.0, 35.0], [121.5, 31.5], [121.0, 28.0], [119.0, 25.5], [117.0, 23.5], [113.0, 22.0], [108.0, 21.5], [106.0, 19.0], [105.0, 18.0], [104.0, 22.5], [102.0, 22.5], [100.0, 22.5], [98.5, 24.0], [98.0, 27.0], [100.0, 30.0], [101.0, 33.0], [100.0, 35.5], [97.0, 38.0], [95.0, 39.5]] }]
                },
                {
                    id: 'han-or', label: "Han orientaux et Régions d'Occident", year: 100,
                    text: "Vers 100, sous les Han orientaux (capitale Luoyang), le général Ban Chao rétablit le protectorat chinois sur les oasis du bassin du Tarim (Kashgar, Khotan), ce qui sécurise les routes de la soie. L'empire compte alors environ 50 millions d'habitants, ce que montre le recensement de l'an 2 (près de 58 millions).",
                    zones: [{ name: "Empire Han (vers 100)", ring: [[74.5, 38.5], [76.0, 41.0], [82.0, 42.0], [88.0, 43.3], [94.0, 42.8], [100.0, 42.5], [106.0, 41.5], [111.0, 42.0], [116.0, 41.5], [119.0, 41.5], [122.0, 40.5], [125.5, 40.0], [126.5, 37.5], [122.5, 37.5], [120.0, 35.0], [121.5, 31.5], [121.0, 28.0], [119.0, 25.5], [117.0, 23.5], [113.0, 22.0], [108.0, 21.5], [106.0, 19.0], [105.0, 18.0], [104.0, 22.5], [102.0, 22.5], [100.0, 22.5], [98.5, 24.0], [98.0, 27.0], [100.0, 30.0], [101.0, 33.0], [100.0, 35.5], [96.0, 36.5], [90.0, 36.5], [84.0, 36.0], [79.0, 35.5], [76.0, 37.0]] }]
                }
            ]
        },
        {
            id: 'rome', name: 'Empire romain', icon: '🏛️', color: '#b91c1c', span: '27 av. J.-C. → 476 (Occident) et 1453 (Orient)', from: -27, to: 476, peak: 117,
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
            id: 'aksoum', name: "Empire d'Aksoum", icon: "🗿", color: '#0f766e', span: "Ier siècle → vers 940", from: 100, to: 940, peak: 350,
            places: [{ n: "Axoum", c: [38.72, 14.13] }, { n: "Adulis", c: [39.65, 15.25] }, { n: "Yéha", c: [39.0, 14.28] }, { n: "Méroé", c: [33.75, 16.94] }, { n: "Sanaa", c: [44.2, 15.35] }],
            capital: "Axoum (dans le Tigré, au nord de l'Éthiopie actuelle)",
            summary: "Un royaume des hautes terres d'Érythrée et du Tigré, qui contrôle le commerce de la mer Rouge par le port d'Adulis, entre l'Égypte romaine, l'Arabie et l'Inde. Au IIIe siècle, le prophète Mani le range parmi les quatre grandes puissances du monde avec Rome, la Perse et la Chine. Il frappe sa propre monnaie, en or, érige des stèles monumentales à Axoum, et son roi Ézana (vers 330) se convertit au christianisme, bientôt suivi du royaume : l'Éthiopie est l'un des plus anciens États chrétiens. Vers 350 Ézana détruit le royaume de Koush (Méroé), et vers 525 le roi Kaleb traverse la mer Rouge pour intervenir au Yémen. L'empire décline ensuite, avec l'expansion arabe et le recul du commerce de la mer Rouge, et disparaît vers 940.",
            snapshots: [
                {
                    id: '200', label: "Le royaume commerçant", year: 200,
                    text: "Vers 200, Aksoum est un royaume prospère des hautes terres, dont le port d'Adulis exporte l'ivoire, l'or et l'encens vers l'Égypte romaine et l'Inde. Il bat ses premières monnaies un siècle plus tard.",
                    zones: [{ name: "Royaume d'Aksoum (vers 200)", ring: [[37.5, 15.5], [39.0, 15.9], [40.6, 15.3], [40.2, 13.8], [38.5, 12.8], [37.0, 13.5]] }]
                },
                {
                    id: '350', label: "Sous Ézana", year: 350,
                    text: "Vers 350, sous Ézana, converti au christianisme, Aksoum atteint la haute vallée du Nil : l'inscription du roi vante la conquête du royaume de Koush, dont la capitale, Méroé, est ruinée. Le royaume tient la côte de la mer Rouge et contrôle une grande partie du commerce.",
                    zones: [{ name: "Royaume d'Aksoum (vers 350)", ring: [[33.0, 17.0], [35.0, 18.5], [38.5, 18.0], [40.5, 15.8], [41.0, 13.5], [39.0, 12.5], [36.5, 12.5], [34.0, 13.5]] }]
                },
                {
                    id: '530', label: "Sous Kaleb : Aksoum et le Yémen", year: 530,
                    text: "Vers 530, le roi Kaleb franchit la mer Rouge pour renverser le roi juif du Yémen, Dhu Nuwas, qui persécutait les chrétiens. Aksoum domine un temps le Yémen, avant d'en être chassé par les Perses (vers 570).",
                    zones: [
                        { name: "Royaume d'Aksoum", ring: [[33.0, 17.0], [35.0, 18.5], [38.5, 18.0], [40.5, 15.8], [41.0, 13.5], [39.0, 12.5], [36.5, 12.5], [34.0, 13.5]] },
                        { name: "Conquête du Yémen (Himyar)", color: '#b45309', ring: [[42.5, 13.0], [44.0, 12.8], [46.0, 13.5], [48.0, 14.5], [44.0, 17.5], [42.7, 16.0]] }
                    ]
                }
            ]
        },
        {
            id: 'gupta', name: "Empire gupta", icon: "🪔", color: '#a16207', span: "320 → vers 550", from: 320, to: 550, peak: 400,
            places: [{ n: "Pataliputra", c: [85.14, 25.61] }, { n: "Ujjain", c: [75.78, 23.18] }, { n: "Mathura", c: [77.67, 27.49] }, { n: "Ayodhya", c: [82.2, 26.8] }, { n: "Prayagraj", c: [81.85, 25.43] }, { n: "Nalanda", c: [85.44, 25.14] }],
            capital: "Pataliputra (l'actuelle Patna)",
            summary: "Fondé vers 320 par Chandragupta Ier dans le Magadha, l'empire gupta réunit le nord de l'Inde sous Samudragupta (vers 335-375) et Chandragupta II (vers 375-415). On le dit « âge d'or » de l'Inde classique : le sanskrit devient la langue de cour, le poète Kalidasa écrit ses pièces, l'astronome Aryabhata (476) calcule la valeur de pi et le jour de la Terre, la numération décimale de position se répand, les grottes d'Ajanta et l'université de Nalanda se développent. Les invasions des Huns blancs (Hephthalites) au Ve siècle et la montée de royaumes régionaux mettent fin à l'empire vers 550.",
            snapshots: [
                {
                    id: '320', label: "Chandragupta Ier", year: 320,
                    text: "Vers 320, le royaume de Chandragupta Ier se limite au Magadha et à ses environs, autour de Pataliputra. Un mariage avec une princesse licchavi lui donne du prestige et des alliés.",
                    zones: [{ name: "Royaume du Magadha (vers 320)", ring: [[83.0, 26.5], [86.0, 26.8], [87.5, 25.5], [86.0, 24.5], [83.5, 24.8]] }]
                },
                {
                    id: '350', label: "Samudragupta", year: 350,
                    text: "Vers 350, Samudragupta a conquis la plaine du Gange et reçoit un tribut des rois du Sud, comme le raconte une inscription gravée sur un pilier d'Allahabad.",
                    zones: [{ name: "Empire gupta (vers 350)", ring: [[75.0, 30.5], [78.0, 31.0], [81.0, 29.5], [84.0, 28.0], [88.0, 27.0], [91.0, 25.0], [90.0, 22.5], [87.0, 21.5], [85.0, 19.5], [82.0, 17.0], [80.0, 18.5], [79.0, 21.0], [76.0, 22.5], [74.0, 24.5], [75.0, 27.5]] }]
                },
                {
                    id: '400', label: "Chandragupta II", year: 400,
                    text: "Vers 400, sous Chandragupta II, l'empire est à son apogée : de l'Indus au Bengale, de l'Himalaya à la Narmada, avec l'accès aux ports du Gujarat (conquis vers 410). Le pèlerin chinois Faxian, qui traverse l'Inde entre 399 et 414, décrit un pays prospère et bien gouverné.",
                    zones: [{ name: "Empire gupta (vers 400)", ring: [[70.0, 31.5], [72.5, 33.5], [75.0, 32.5], [77.5, 31.5], [80.0, 30.5], [83.0, 28.5], [86.0, 27.5], [89.0, 26.5], [92.0, 24.5], [91.0, 22.5], [88.0, 21.5], [86.5, 20.3], [84.0, 19.8], [81.0, 19.0], [78.0, 20.0], [75.0, 20.5], [72.8, 21.0], [70.5, 20.8], [69.0, 22.0], [68.7, 23.6], [70.0, 25.0], [70.5, 28.0]] }]
                }
            ]
        },
        {
            id: 'mayas', name: 'Civilisation maya', icon: '🌿', color: '#15803d', span: 'vers 2000 av. J.-C. → 1697', from: -2000, to: 1697, peak: 700,
            places: [{ n: 'Tikal', c: [-89.62, 17.22] }, { n: 'Palenque', c: [-92.05, 17.48] }, { n: 'Copán', c: [-89.14, 14.84] }, { n: 'Chichén Itzá', c: [-88.57, 20.68] }, { n: 'Calakmul', c: [-89.81, 18.1] }, { n: 'Uxmal', c: [-89.77, 20.36] }, { n: 'El Mirador', c: [-89.92, 17.76] }],
            capital: "Aucune capitale : des dizaines de cités-États rivales (Tikal, Calakmul, Palenque, Copán, Chichén Itzá, Mayapán…)",
            summary: "Les Mayas n'ont jamais formé un empire, mais une civilisation de cités-États, entre le sud du Mexique, le Guatemala, le Belize et l'ouest du Honduras. Ils ont inventé une écriture complète (hiéroglyphes), un calendrier très précis et utilisé le zéro. L'apogée est la période classique (250-900) : grandes cités, pyramides, alliances et guerres entre Tikal et Calakmul. Vers 800-900, beaucoup de cités du sud sont abandonnées (« effondrement »), dont les causes (sécheresses, guerres, épuisement des sols) sont débattues. Le nord du Yucatán prospère ensuite (Chichén Itzá, Mayapán). Les Espagnols conquièrent la région au XVIe siècle ; la dernière cité indépendante, Nojpetén, tombe en 1697. Plus de six millions de personnes parlent aujourd'hui des langues mayas.",
            snapshots: [
                {
                    id: 'preclassique', label: 'Préclassique : les premières grandes cités', year: -300,
                    text: "Vers 300 av. J.-C., dans le bassin du Petén, des cités comme El Mirador comptent déjà des pyramides colossales (La Danta, parmi les plus massives du monde) et des chaussées. L'écriture et le calendrier commencent à se développer.",
                    zones: [{ name: 'Basses terres mayas (Petén)', ring: [[-91.5, 17.0], [-91.2, 17.8], [-90.4, 18.5], [-89.5, 18.8], [-88.6, 18.4], [-88.5, 17.4], [-88.8, 16.5], [-89.8, 15.8], [-91.0, 15.8]] }]
                },
                {
                    id: 'classique', label: 'Période classique', year: 700,
                    text: "Vers 700, c'est l'apogée : des dizaines de cités-États, de Palenque à Copán, comptant jusqu'à plusieurs millions d'habitants au total. Tikal et Calakmul se disputent l'hégémonie par des alliances et des guerres.",
                    zones: [{ name: 'Monde maya classique', ring: [[-92.5, 18.0], [-91.0, 18.8], [-90.5, 19.8], [-90.3, 21.0], [-88.8, 21.6], [-87.1, 21.6], [-86.8, 20.5], [-87.5, 18.5], [-88.2, 16.8], [-88.9, 15.8], [-89.2, 14.5], [-90.2, 13.8], [-91.5, 14.2], [-92.3, 15.2], [-92.5, 16.5]] }]
                },
                {
                    id: 'postclassique', label: 'Période postclassique', year: 1200,
                    text: "Vers 1200, le sud est abandonné ou affaibli ; le pouvoir se déplace vers le nord du Yucatán (Chichén Itzá, puis Mayapán), où le commerce maritime prospère, et vers les hautes terres du Guatemala (peuples quiché et cakchiquel).",
                    zones: [
                        { name: 'Yucatán du nord (Chichén Itzá, Mayapán)', color: '#15803d', ring: [[-91.0, 19.5], [-90.3, 21.0], [-88.8, 21.6], [-87.1, 21.6], [-87.2, 19.8], [-88.4, 18.5], [-90.0, 18.5]] },
                        { name: 'Hautes terres du Guatemala', color: '#b45309', ring: [[-92.4, 15.8], [-91.2, 16.2], [-90.2, 15.7], [-89.8, 14.7], [-90.8, 14.2], [-92.0, 14.7]] }
                    ]
                }
            ]
        },
        {
            id: 'perse', name: "Empire perse achéménide", icon: '🦁', color: '#be185d', span: '550 → 330 av. J.-C.', from: -550, to: -330, peak: -500,
            places: [{ n: 'Persépolis', c: [52.89, 29.93] }, { n: 'Suse', c: [48.24, 32.19] }, { n: 'Pasargades', c: [53.17, 30.2] }, { n: 'Babylone', c: [44.42, 32.54] }, { n: 'Sardes', c: [28.04, 38.49] }, { n: 'Ecbatane', c: [48.52, 34.8] }, { n: 'Memphis', c: [31.25, 29.85] }],
            capital: 'Pasargades, Persépolis, Suse, Babylone et Ecbatane (selon la saison et le roi)',
            summary: "Cyrus II renverse le roi des Mèdes vers 550 av. J.-C., prend Sardes (546) puis Babylone (539). Son fils Cambyse conquiert l'Égypte (525). Darius Ier organise l'empire en provinces (satrapies) reliées par la « route royale » de Sardes à Suse, et respecte les religions et les coutumes locales. Les guerres médiques contre les Grecs (Marathon en 490, Salamine en 480) arrêtent son expansion vers l'ouest. Alexandre le Grand met fin à l'empire en 330 av. J.-C.",
            snapshots: [
                {
                    id: 'cyrus', label: 'À la mort de Cyrus II', year: -530,
                    text: "Vers 530 av. J.-C., Cyrus II a réuni la Perse, la Médie, la Lydie et la Babylonie : de l'Asie Mineure à l'Asie centrale. Il meurt en combattant, au nord-est, vers la Syr-Daria.",
                    zones: [{ name: 'Empire perse (vers 530)', ring: [[26.0, 38.0], [26.5, 41.0], [31, 42], [35, 42], [40, 41.2], [43, 41.5], [46, 41], [49, 40], [53, 38.5], [54, 41], [58, 42], [62, 43], [66, 44], [70, 42.5], [70, 38], [68, 36], [64, 33], [61, 30], [60, 26], [57, 25.5], [55, 26.5], [51, 27.5], [48.5, 29.5], [47, 29], [44, 30], [40, 30], [36, 29.5], [34.5, 31.2], [35.2, 33], [35.8, 36], [32, 36.3], [29, 36.5], [27, 37]] }]
                },
                {
                    id: 'darius', label: 'Sous Darius Ier', year: -500,
                    text: "Vers 500 av. J.-C., l'empire est à son apogée : avec l'Égypte (conquise en 525), la Thrace et la Macédoine, et la vallée de l'Indus. Il compte une vingtaine de satrapies et plus de 40 % de la population du monde alors connu.",
                    zones: [{ name: 'Empire perse (vers 500)', ring: [[22, 40], [22.5, 41.5], [24.5, 42.5], [28, 44], [31, 42.5], [35, 42.5], [40, 41.5], [43, 41.5], [46, 41.5], [49, 41], [49.5, 40], [53, 38.5], [54, 41], [58, 42], [62, 43], [66, 44], [70, 42.5], [72, 40], [74, 37], [73, 34], [72, 31], [70, 28], [68, 25], [66, 25], [62, 25], [57, 25.5], [55, 26.5], [51, 27.5], [48.5, 29.5], [47, 29], [44, 30], [40, 30], [36, 29.5], [34.5, 28.5], [33.2, 26], [33.6, 24], [32.5, 23.5], [30, 24.5], [25, 29.5], [25, 31.5], [30, 31.3], [32, 31.3], [34.5, 31.2], [35.2, 33], [35.8, 36], [32, 36.3], [29, 36.5], [27.2, 36.8], [26.5, 38.5], [25.8, 40], [24.5, 40.9]] }]
                }
            ]
        },
        {
            id: 'alexandre', name: "Empire d'Alexandre le Grand", icon: '⚔️', color: '#2563eb', span: '336 → 323 av. J.-C., puis royaumes hellénistiques', from: -336, to: -30, peak: -323,
            places: [{ n: 'Pella', c: [22.52, 40.76] }, { n: 'Athènes', c: [23.73, 37.98] }, { n: 'Alexandrie', c: [29.92, 31.2] }, { n: 'Babylone', c: [44.42, 32.54] }, { n: 'Persépolis', c: [52.89, 29.93] }, { n: 'Samarcande', c: [66.96, 39.65] }, { n: 'Taxila', c: [72.8, 33.75] }],
            capital: 'Pella (Macédoine), puis Babylone, où Alexandre meurt',
            summary: "Roi de Macédoine à 20 ans (336 av. J.-C.), Alexandre traverse l'Hellespont en 334, bat les Perses au Granique, à Issos (333) et à Gaugamèles (331), fonde Alexandrie en Égypte (332), détruit Persépolis (330) et atteint l'Indus (326). Il meurt à Babylone en 323, à 32 ans, sans héritier désigné. Ses généraux, les Diadoques, se disputent l'empire et fondent des royaumes qui durent jusqu'à la conquête romaine : le monde « hellénistique ».",
            snapshots: [
                {
                    id: '336', label: 'À l\'avènement d\'Alexandre', year: -336,
                    text: "En 336 av. J.-C., Alexandre succède à son père Philippe II, assassiné. Il hérite d'un royaume de Macédoine devenu la première puissance de Grèce, dont les cités sont réunies dans la ligue de Corinthe, et d'un projet : attaquer la Perse.",
                    zones: [{ name: 'Macédoine et ligue de Corinthe', ring: [[19.8, 39.5], [20.2, 42.0], [22.5, 42.5], [25.5, 42.0], [26.0, 41.0], [24.5, 40.4], [24, 38], [22.5, 36.4], [21, 37.5]] }]
                },
                {
                    id: '323', label: 'À la mort d\'Alexandre', year: -323,
                    text: "En 323 av. J.-C., l'empire s'étend de la Grèce à l'Indus en passant par l'Égypte, la Perse et l'Asie centrale : c'est l'un des plus grands de l'Antiquité. Il est fragile : l'armée refusa d'aller plus loin que le fleuve Hyphase, et l'empire ne survit pas à son fondateur.",
                    zones: [{ name: "Empire d'Alexandre", ring: [[19.8, 39.8], [20.2, 42.2], [22.5, 43.5], [26, 44.0], [28.5, 43.8], [31, 42.5], [35, 42.5], [40, 41.5], [43, 41.5], [46, 41.5], [49, 41], [49.5, 40], [53, 38.5], [54, 41], [58, 42], [62, 43], [66, 44], [70, 42.5], [72, 40], [74, 38], [76, 35], [76, 32], [75, 30], [72.5, 28], [70, 26], [68, 24.5], [66, 25], [62, 25], [57, 25.5], [55, 26.5], [51, 27.5], [48.5, 29.5], [47, 29], [44, 30], [40, 30], [36, 29.5], [34.5, 28.5], [33.2, 26], [33.6, 24], [32.5, 23.5], [30, 24.5], [25, 29.5], [25, 31.5], [30, 31.3], [32, 31.3], [34.5, 31.2], [35.2, 33], [35.8, 36], [32, 36.3], [29, 36.5], [27.2, 36.8], [26.5, 38.5], [25.8, 40.5], [24, 38], [22.5, 36.4], [21, 37.5]] }]
                },
                {
                    id: '281', label: 'Les royaumes des Diadoques', year: -281,
                    text: "En 281 av. J.-C., après la bataille de Couroupédion, l'empire est partagé : les Lagides (Ptolémées) en Égypte, les Séleucides en Syrie, en Mésopotamie et en Iran, et la Macédoine. Les rois parlent grec, fondent des villes grecques jusqu'en Asie centrale (Alexandrie, Antioche, Séleucie) et mêlent les cultures.",
                    zones: [
                        { name: 'Lagides (Égypte)', color: '#b45309', ring: [[20, 32.0], [25, 29.5], [30, 24.5], [32.5, 23.5], [33.6, 24], [33.2, 26], [34.5, 28.5], [36, 29.5], [37.5, 31.5], [37, 33.5], [35.8, 34.6], [34.5, 33], [29, 33.5], [24, 33.5]] },
                        { name: 'Séleucides (Syrie, Mésopotamie, Iran)', color: '#2563eb', ring: [[27, 37], [27, 39.5], [30, 40.5], [36, 39.5], [42, 39], [46, 39.5], [49, 39], [53, 38.5], [54, 41], [58, 42], [62, 43], [66, 44], [70, 42.5], [72, 40], [72, 36], [68, 32], [66, 28], [62, 25.5], [57, 25.5], [55, 26.5], [51, 27.5], [48.5, 29.5], [47, 29], [44, 30], [40, 31], [38, 31.5], [37.2, 33.5], [35.8, 34.8], [36, 36.2], [33, 36.5], [29, 36.5]] },
                        { name: 'Macédoine', color: '#be185d', ring: [[19.8, 39.5], [20.2, 42], [22.5, 42.5], [25.5, 42.0], [26, 41], [24.5, 40.4], [23.8, 39.5], [23, 38], [21, 38.5]] }
                    ]
                }
            ]
        },
        {
            id: 'byzance', name: 'Empire byzantin', icon: '⛪', color: '#a21caf', span: '395 → 1453', from: 395, to: 1453, peak: 1025,
            places: [{ n: 'Constantinople', c: [28.98, 41.01] }, { n: 'Ravenne', c: [12.2, 44.42] }, { n: 'Carthage', c: [10.32, 36.85] }, { n: 'Antioche', c: [36.16, 36.2] }, { n: 'Alexandrie', c: [29.92, 31.2] }, { n: 'Thessalonique', c: [22.94, 40.64] }, { n: 'Jérusalem', c: [35.22, 31.77] }, { n: 'Nicée', c: [29.72, 40.43] }],
            capital: 'Constantinople (fondée en 330 par Constantin)',
            summary: "L'Empire romain d'Orient, qui survit mille ans à celui d'Occident. Ses habitants se disent toujours « Romains » ; on parle de « byzantin » depuis le XVIe siècle (d'après l'ancien nom de Constantinople, Byzance). La langue est le grec, la religion le christianisme orthodoxe. Justinien reconquiert une partie de l'Occident (533-554), puis l'empire perd la Syrie et l'Égypte devant les Arabes (636-642), se redresse sous la dynastie macédonienne (apogée en 1025), perd l'Anatolie après Mantzikert (1071), est pillé par les croisés en 1204 et tombe devant les Ottomans en 1453.",
            snapshots: [
                {
                    id: '565', label: 'À la mort de Justinien', year: 565, legend: true,
                    text: "En 565, Justinien a reconquis l'Afrique des Vandales (533-534), l'Italie des Ostrogoths (535-554) et une bande du sud de l'Espagne (551). La Méditerranée est presque redevenue un « lac romain ». L'empire est épuisé : peste de 541, guerres coûteuses, et l'Italie sera bientôt envahie par les Lombards (568).",
                    zones: [
                        { name: 'Orient, Balkans, Anatolie, Syrie et Égypte', ring: [[20.0, 39.5], [19.2, 43.0], [19.5, 45.0], [21.0, 44.8], [22.5, 44.3], [25, 43.8], [28, 44], [29.3, 45.2], [31, 43.5], [36, 43], [40, 42.5], [41.5, 42.2], [42.5, 41.0], [41.5, 39.5], [41.0, 37.8], [40.0, 36.5], [39.0, 34.5], [38.0, 33.0], [37.0, 31.5], [36.0, 29.5], [34.5, 28.5], [33.2, 26.0], [33.6, 24.0], [32.5, 23.5], [30.0, 24.5], [25.0, 29.5], [22.0, 31.5], [21.0, 33.5], [21.5, 36.5], [21.0, 38.5]] },
                        { name: 'Italie et Dalmatie reconquises', ring: [[7.7, 43.9], [7.2, 45.4], [8.5, 46.2], [10.5, 46.6], [13.0, 46.6], [14.2, 46.0], [15.5, 45.8], [17.0, 45.5], [19.0, 45.2], [19.2, 43.0], [18.0, 42.0], [18.5, 40.2], [17.0, 39.0], [15.8, 38.0], [15.0, 40.0], [12.5, 41.3], [11.0, 42.5], [10.0, 43.8]] },
                        { name: 'Afrique, Sicile, Sardaigne et sud de l\'Espagne reconquises', ring: [[-6.2, 36.0], [-5.5, 37.2], [-3.5, 37.6], [-1.5, 38.1], [-0.3, 37.8], [3, 39.8], [8.0, 41.2], [12.4, 38.5], [15.6, 38.3], [15.3, 36.7], [12.4, 37.0], [11.3, 37.2], [10.5, 37.3], [11.2, 33.8], [15.0, 32.3], [19.0, 30.5], [15.0, 30.0], [10.0, 32.3], [8.5, 34.0], [5.0, 34.8], [2.0, 35.0], [-1.0, 35.0], [-2.5, 35.2], [-5.3, 35.8]] }
                    ]
                },
                {
                    id: '1025', label: 'À la mort de Basile II', year: 1025, legend: true,
                    text: "En 1025, à la mort de Basile II, « le Tueur de Bulgares », l'empire est à son apogée médiéval : les Balkans jusqu'au Danube (Bulgarie soumise en 1018), l'Anatolie, une partie de l'Arménie, le nord de la Syrie avec Antioche, la Crète et le sud de l'Italie. Constantinople est alors la plus grande ville chrétienne.",
                    zones: [
                        { name: 'Empire byzantin', ring: [[20.0, 39.5], [19.2, 43.0], [19.5, 45.0], [21.0, 44.8], [22.5, 44.3], [25, 43.8], [28.5, 44.0], [29.2, 45.2], [31, 43.5], [36, 43], [40, 42.5], [43, 41.0], [44, 40.5], [43.5, 38.5], [42, 37.5], [40, 37.2], [38, 36.8], [36.8, 35.5], [36.0, 35.8], [34, 36.2], [28, 36.2], [26.0, 35.1], [23.5, 35.0], [21.5, 36.5], [20, 38.5]] },
                        { name: 'Catépanat d\'Italie', ring: [[16.2, 41.9], [17.5, 41.0], [18.6, 40.3], [18.3, 39.8], [17.2, 39.4], [16.6, 38.9], [16.0, 37.9], [15.7, 38.2], [15.9, 39.6], [16.0, 40.4], [15.6, 40.9]] }
                    ]
                },
                {
                    id: '1450', label: 'À la veille de la chute', year: 1450, legend: true,
                    text: "En 1450, trois ans avant la fin, l'empire se réduit à Constantinople et à sa banlieue, et au despotat de Morée (Mistra), dans le Péloponnèse. Entouré des Ottomans, il ne tient que par ses remparts et l'espoir d'une aide occidentale. Mehmed II prend la ville le 29 mai 1453.",
                    zones: [
                        { name: 'Constantinople et sa banlieue', ring: [[28.5, 41.1], [29.1, 41.2], [29.1, 40.85], [28.5, 40.9]] },
                        { name: 'Despotat de Morée', ring: [[21.0, 37.0], [21.6, 37.9], [22.5, 37.9], [23.2, 37.4], [23.1, 36.5], [22.5, 36.4], [21.7, 36.8]] }
                    ]
                }
            ]
        },
        {
            id: 'califat', name: 'Califat arabe (omeyyade et abbasside)', icon: '🕌', color: '#4d7c0f', span: '632 → 1258', from: 632, to: 1258, peak: 750,
            places: [{ n: 'Médine', c: [39.61, 24.47] }, { n: 'La Mecque', c: [39.83, 21.42] }, { n: 'Damas', c: [36.3, 33.5] }, { n: 'Bagdad', c: [44.36, 33.31] }, { n: 'Kairouan', c: [10.1, 35.68] }, { n: 'Cordoue', c: [-4.78, 37.89] }, { n: 'Samarcande', c: [66.96, 39.65] }],
            capital: 'Médine, puis Damas (Omeyyades, 661-750), puis Bagdad (Abbassides, dès 762)',
            summary: "À la mort de Mahomet (632), ses successeurs, les califes, dirigent la communauté musulmane. En quelques décennies, les armées arabes conquièrent la Syrie (bataille du Yarmouk, 636), la Perse (Qadisiyya, 636, Nihavand, 642) et l'Égypte (642), puis l'Afrique du Nord et l'Espagne (711). Les Omeyyades règnent depuis Damas (661-750), les Abbassides depuis Bagdad (750-1258). L'unité politique disparaît dès le IXe siècle, mais la langue arabe, la religion et le commerce restent un lien. Les Mongols prennent Bagdad en 1258.",
            snapshots: [
                {
                    id: '661', label: 'À l\'avènement des Omeyyades', year: 661,
                    text: "En 661, Mu'awiya devient calife et fonde la dynastie omeyyade, avec Damas pour capitale. L'empire musulman comprend déjà l'Arabie, la Syrie-Palestine, l'Égypte, la Mésopotamie et l'Iran, conquis en moins de trente ans.",
                    zones: [{ name: 'Califat (661)', ring: [[34.5, 31.3], [35.2, 33.0], [35.8, 36.3], [40, 37.2], [43, 38.0], [44, 40.0], [48, 41.0], [49, 38.5], [53.5, 38.0], [57, 37.5], [61, 36.5], [62, 32.0], [61, 29.0], [58, 26.0], [56.5, 26.2], [58, 24.5], [59.5, 22.5], [55.5, 17.5], [52, 16], [45, 12.8], [43, 12.7], [40, 15.5], [37, 21], [33.6, 24], [32.5, 23.5], [30, 24.5], [25, 29.5], [25, 31.5], [30, 31.3], [32, 31.3]] }]
                },
                {
                    id: '750', label: 'Le califat omeyyade à son apogée', year: 750,
                    text: "En 750, avant la chute des Omeyyades, l'empire musulman va de l'Espagne et du Maroc à la vallée de l'Indus et à l'Asie centrale (Samarcande). C'est l'un des plus vastes empires de l'histoire. L'Europe est arrêtée à Poitiers (732), l'Asie centrale à Talas (751), contre les Chinois.",
                    zones: [{ name: 'Califat omeyyade', ring: [[3.0, 43.2], [0.0, 42.8], [-2.0, 43.0], [-4.0, 41.5], [-8.5, 41.3], [-9.5, 39.5], [-9.8, 37.0], [-9.8, 32.0], [-9.0, 30.0], [-5.0, 30.5], [0.0, 31.5], [7.0, 32.0], [11.0, 31.0], [15.0, 29.5], [24.0, 27.0], [30.0, 23.0], [33.0, 23.5], [36.0, 21.0], [38.0, 17.0], [43.0, 12.7], [45.0, 12.8], [52.0, 16.0], [55.5, 17.5], [59.5, 22.5], [58.0, 24.5], [56.5, 26.2], [60.0, 25.4], [66.0, 25.0], [67.5, 24.3], [70.0, 26.0], [72.0, 29.0], [71.5, 32.0], [69.0, 34.0], [68.0, 36.0], [67.0, 38.5], [70.0, 40.5], [66.0, 42.5], [60.0, 43.5], [54.0, 41.0], [53.5, 38.5], [49.0, 38.5], [49.0, 40.5], [45.0, 41.5], [44.0, 40.5], [43.0, 38.5], [40.0, 38.0], [36.0, 37.2], [35.3, 36.8], [34.0, 34.0], [32.0, 31.3], [25.0, 31.8], [10.0, 37.2], [8.0, 37.0], [3.0, 37.0], [-1.0, 35.8], [-5.3, 35.8], [-5.0, 36.2], [-2.0, 36.8], [-0.5, 38.6], [0.3, 39.5], [1.0, 41.0], [3.0, 42.0]] }]
                },
                {
                    id: '900', label: 'Abbassides et émirat de Cordoue', year: 900,
                    text: "Vers 900, le califat abbasside, dirigé depuis Bagdad, ne contrôle plus directement le Maghreb, l'Espagne ni l'Égypte, gouvernée par des princes autonomes. Un prince omeyyade, rescapé de 750, a fondé à Cordoue un émirat indépendant (756), qui deviendra califat en 929. D'autres dynasties se partagent le Maghreb (Aghlabides, Idrissides).",
                    zones: [
                        { name: 'Califat abbasside', color: '#4d7c0f', ring: [[25.0, 31.5], [25.0, 29.5], [30.0, 24.5], [33.0, 23.5], [36.0, 21.0], [38.0, 17.0], [43.0, 12.7], [45.0, 12.8], [52.0, 16.0], [55.5, 17.5], [59.5, 22.5], [58.0, 24.5], [56.5, 26.2], [60.0, 25.4], [66.0, 25.0], [67.5, 24.3], [70.0, 26.0], [72.0, 29.0], [71.5, 32.0], [69.0, 34.0], [68.0, 36.0], [67.0, 38.5], [70.0, 40.5], [66.0, 42.5], [60.0, 43.5], [54.0, 41.0], [53.5, 38.5], [49.0, 38.5], [49.0, 40.5], [45.0, 41.5], [44.0, 40.5], [43.0, 38.5], [40.0, 38.0], [36.0, 37.2], [35.3, 36.8], [34.0, 34.0], [32.0, 31.3]] },
                        { name: 'Émirat omeyyade de Cordoue', color: '#b45309', ring: [[3.0, 42.0], [0.0, 42.4], [-2.0, 43.0], [-4.0, 41.5], [-8.5, 41.3], [-9.5, 39.5], [-9.8, 37.0], [-6.2, 36.0], [-5.0, 36.2], [-2.0, 36.8], [-0.5, 38.6], [0.3, 39.5], [1.0, 41.0]] }
                    ]
                }
            ]
        },
        {
            id: 'carolingien', name: 'Empire carolingien', icon: '⚜️', color: '#475569', span: '751 → 888', from: 751, to: 888, peak: 814,
            places: [{ n: 'Aix-la-Chapelle', c: [6.08, 50.78] }, { n: 'Paris', c: [2.35, 48.86] }, { n: 'Rome', c: [12.5, 41.9] }, { n: 'Pavie', c: [9.16, 45.19] }, { n: 'Verdun', c: [5.38, 49.16] }, { n: 'Ratisbonne', c: [12.1, 49.02] }, { n: 'Barcelone', c: [2.17, 41.39] }],
            capital: 'Aix-la-Chapelle (palais de Charlemagne, à partir de 794)',
            summary: "La dynastie des Carolingiens succède aux Mérovingiens : Pépin le Bref devient roi des Francs en 751. Son fils Charlemagne (roi en 768) conquiert la Lombardie, la Saxe et la Bavière, et est couronné empereur à Rome le jour de Noël 800. Il organise l'empire en comtés, envoie des « missi dominici » contrôler les comtes, et soutient la renaissance des études (« renaissance carolingienne »). Après sa mort (814), son fils Louis le Pieux garde l'unité ; les petits-fils se partagent l'empire à Verdun en 843. La dynastie s'éteint peu à peu au Xe siècle.",
            snapshots: [
                {
                    id: '768', label: 'À l\'avènement de Charlemagne', year: 768,
                    text: "En 768, à la mort de Pépin le Bref, le royaume des Francs est partagé entre ses fils Charles et Carloman ; Charles (Charlemagne) restera seul roi en 771. Le royaume va de l'Atlantique à la Rhénanie, avec la Provence et l'Aquitaine, sans l'Italie ni la Germanie orientale.",
                    zones: [{ name: 'Royaume des Francs (768)', ring: [[-1.8, 43.4], [3.0, 42.5], [4.5, 43.4], [6.5, 43.1], [7.5, 44.0], [7.0, 45.5], [7.5, 47.0], [9.5, 47.5], [11.0, 48.5], [10.0, 50.0], [11.0, 50.5], [10.0, 53.0], [6.5, 53.6], [4.5, 52.5], [3.5, 51.5], [1.8, 50.8], [-1.5, 49.7], [-4.7, 48.5], [-2.0, 46.5], [-1.3, 44.5]] }]
                },
                {
                    id: '814', label: 'À la mort de Charlemagne', year: 814,
                    text: "En 814, l'empire de Charlemagne est à son maximum : la Gaule, la Germanie jusqu'à l'Elbe, l'Italie du Nord et du Centre (Lombardie conquise en 774), la Bavière, la marche de Pannonie contre les Avars et la marche d'Espagne autour de Barcelone. Il compte environ dix millions d'habitants.",
                    zones: [{ name: 'Empire carolingien', ring: [[-1.8, 43.4], [0.0, 41.5], [1.0, 40.9], [2.8, 41.4], [3.2, 41.9], [3.0, 42.5], [4.5, 43.4], [6.5, 43.1], [7.5, 44.0], [9.0, 44.4], [10.2, 43.5], [11.1, 42.3], [12.4, 41.9], [13.4, 41.9], [14.2, 42.5], [13.6, 43.6], [12.4, 44.2], [13.7, 45.4], [15.0, 45.8], [16.5, 46.2], [17.5, 47.5], [19.0, 47.7], [16.9, 50.3], [15.6, 50.7], [14.5, 51.2], [13.6, 52.6], [13.0, 53.7], [12.2, 54.3], [10.9, 54.3], [9.9, 54.4], [8.6, 54.3], [7.0, 53.8], [5.5, 53.2], [4.5, 52.6], [3.5, 51.5], [1.8, 50.8], [-1.5, 49.7], [-4.7, 48.5], [-2.0, 46.5], [-1.3, 44.5]] }]
                },
                {
                    id: '843', label: 'Le partage de Verdun', year: 843,
                    text: "En 843, le traité de Verdun partage l'empire entre les trois petits-fils de Charlemagne : Charles le Chauve reçoit la Francie occidentale (l'ancêtre de la France), Louis le Germanique la Francie orientale (l'ancêtre de l'Allemagne), et Lothaire la Lotharingie, bande allongée des Pays-Bas à l'Italie, avec le titre d'empereur. Cette bande sera disputée pendant mille ans.",
                    zones: [
                        { name: 'Francie occidentale (Charles le Chauve)', color: '#1d4ed8', ring: [[-1.8, 43.4], [3.2, 41.9], [3.0, 42.5], [4.5, 43.4], [4.5, 44.5], [4.6, 45.5], [4.9, 46.2], [5.0, 47.2], [5.0, 48.5], [4.8, 49.6], [4.0, 50.6], [3.6, 51.4], [1.8, 50.8], [-1.5, 49.7], [-4.7, 48.5], [-2.0, 46.5], [-1.3, 44.5]] },
                        { name: 'Lotharingie (Lothaire Ier)', color: '#b45309', ring: [[3.6, 51.4], [4.5, 52.6], [5.5, 53.2], [6.5, 53.0], [6.1, 51.8], [6.9, 50.9], [7.8, 50.0], [8.2, 49.0], [7.6, 47.6], [8.5, 46.5], [10.5, 46.4], [13.7, 46.4], [13.7, 45.6], [12.4, 45.2], [12.3, 44.4], [13.6, 43.6], [14.2, 42.5], [13.4, 41.9], [12.4, 41.8], [11.1, 42.3], [10.2, 43.5], [9.0, 44.3], [7.7, 44.0], [6.5, 43.1], [5.4, 43.3], [4.5, 43.4], [4.5, 44.5], [4.6, 45.5], [4.9, 46.2], [5.0, 47.2], [5.0, 48.5], [4.8, 49.6], [4.0, 50.6]] },
                        { name: 'Francie orientale (Louis le Germanique)', color: '#475569', ring: [[7.0, 53.8], [8.6, 54.3], [9.9, 54.4], [10.9, 54.3], [12.2, 54.3], [13.0, 53.7], [13.6, 52.6], [14.5, 51.2], [15.6, 50.7], [16.9, 50.3], [17.2, 49.5], [16.1, 48.8], [14.7, 48.3], [14.5, 47.2], [14.0, 46.5], [10.5, 46.4], [8.5, 46.5], [7.6, 47.6], [8.2, 49.0], [7.8, 50.0], [6.9, 50.9], [6.1, 51.8], [6.5, 53.0]] }
                    ]
                }
            ]
        },
        {
            id: 'saint-empire', name: 'Saint-Empire romain germanique', icon: '👑', color: '#7c3aed', span: '962 → 1806', from: 962, to: 1806, peak: 1250,
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
            id: 'mali', name: "Empire du Mali", icon: "🪙", color: '#b45309', span: "vers 1235 → 1670", from: 1235, to: 1670, peak: 1325,
            places: [{ n: "Niani", c: [-9.2, 11.5] }, { n: "Tombouctou", c: [-3.0, 16.77] }, { n: "Gao", c: [-0.04, 16.27] }, { n: "Djenné", c: [-4.55, 13.9] }, { n: "Walata", c: [-6.93, 17.3] }, { n: "Kangaba", c: [-8.4, 11.9] }],
            capital: "Niani (sur le haut Niger), dont l'emplacement exact est discuté",
            summary: "Vers 1235, Soundiata Keïta bat le roi Soumaoro Kanté à Kirina et fonde l'empire du Mali, en pays mandingue. La « charte du Manden » (Kouroukan Fouga), transmise par la tradition orale, aurait fixé les règles de l'empire. Il contrôle le commerce de l'or (Bambouk, Bouré), du sel (Taghaza) et du cuivre à travers le Sahel. Mansa Moussa (1312-1337) accomplit en 1324-1325 un pèlerinage à La Mecque avec une suite immense et distribue tant d'or au Caire que le cours du métal chute : l'Europe découvre le Mali (Atlas catalan de 1375). Tombouctou devient un centre d'études (mosquée de Sankoré). L'empire décline au XVe siècle face aux Songhaï (Gao) ; la date de 1670 est la date traditionnelle de sa fin.",
            snapshots: [
                {
                    id: '1235', label: "Soundiata Keïta", year: 1235,
                    text: "Vers 1235, Soundiata Keïta réunit les clans mandingues après sa victoire de Kirina. Le jeune empire se limite alors au haut Niger et à la savane qui l'entoure, avec Niani pour capitale.",
                    zones: [{ name: "Haut pays mandingue (vers 1235)", ring: [[-11.0, 12.5], [-9.0, 13.5], [-7.5, 13.0], [-7.0, 11.5], [-8.5, 10.5], [-10.0, 11.0]] }]
                },
                {
                    id: '1325', label: "Mansa Moussa", year: 1325,
                    text: "Vers 1325, sous Mansa Moussa, l'empire s'étend de l'Atlantique (Sénégambie) à la boucle du Niger (Gao, Tombouctou) et du sud de la forêt jusqu'aux routes du Sahara. Il est alors l'un des plus grands États du monde, et son souverain l'un des hommes les plus riches de l'histoire.",
                    zones: [{ name: "Empire du Mali (vers 1325)", ring: [[-17.5, 15.2], [-16.0, 12.2], [-13.5, 10.5], [-10.0, 9.5], [-7.0, 9.5], [-3.0, 10.5], [0.5, 12.5], [3.5, 14.0], [4.5, 16.5], [1.5, 17.5], [-2.0, 18.5], [-6.0, 18.5], [-10.0, 18.0], [-13.0, 17.0], [-16.5, 16.5]] }]
                }
            ]
        },
        {
            id: 'mongol', name: 'Empire mongol', icon: '🐎', color: '#0e7490', span: '1206 → 1368 (Yuan)', from: 1206, to: 1368, peak: 1279,
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
        },
        {
            id: 'songhai', name: "Empire songhaï", icon: "🌾", color: '#a16207', span: "vers 1464 → 1591", from: 1464, to: 1591, peak: 1520,
            places: [{ n: "Gao", c: [-0.04, 16.27] }, { n: "Tombouctou", c: [-3.0, 16.77] }, { n: "Djenné", c: [-4.55, 13.9] }, { n: "Agadez", c: [7.99, 16.97] }, { n: "Walata", c: [-6.93, 17.3] }],
            capital: "Gao",
            summary: "Le royaume songhaï, au bord du Niger, a été sujet du Mali. Vers 1464, Sonni Ali Ber le rend indépendant et en fait un empire : il prend Tombouctou (1468) et Djenné (1473, après un siège de sept ans). Askia Mohammed, qui le renverse en 1493, fait le pèlerinage à La Mecque (1496-1497), reçoit le titre de calife du Soudan et organise l'empire en provinces, avec des juges et des savants musulmans : Tombouctou devient un grand centre d'études. L'empire s'étend sur le Niger, vers Agadez et les villes haoussa, et contrôle le commerce de l'or et du sel. Une armée marocaine, équipée de mousquets et de canons, le bat à Tondibi (1591) : l'empire se disloque.",
            snapshots: [
                {
                    id: '1480', label: "Sous Sonni Ali", year: 1480,
                    text: "Vers 1480, Sonni Ali, chef de guerre redoutable, tient Gao, Tombouctou et Djenné : la boucle du Niger forme le cœur de l'empire. Il s'appuie sur une flotte de pirogues et sur une cavalerie.",
                    zones: [{ name: "Empire songhaï (vers 1480)", ring: [[-6.0, 15.0], [-3.0, 17.0], [1.0, 17.5], [3.5, 16.0], [3.0, 13.0], [-1.0, 12.0], [-5.0, 12.5], [-7.0, 13.5]] }]
                },
                {
                    id: '1520', label: "Sous Askia Mohammed", year: 1520,
                    text: "Vers 1520, l'empire est à son maximum : de la Sénégambie (à l'ouest) à l'Aïr et au pays haoussa (à l'est), du Sahara (mines de sel de Taghaza) à la savane. Il est plus étendu que l'empire du Mali, qu'il a remplacé comme grande puissance du Sahel.",
                    zones: [{ name: "Empire songhaï (vers 1520)", ring: [[-12.0, 15.2], [-9.0, 18.0], [-5.0, 19.5], [0.0, 20.0], [5.0, 19.0], [9.0, 17.5], [13.0, 15.0], [13.0, 12.0], [9.0, 11.5], [5.0, 11.5], [1.0, 11.5], [-3.0, 11.0], [-8.0, 12.0], [-12.0, 12.5]] }]
                }
            ]
        },
        {
            id: 'ottoman', name: 'Empire ottoman', icon: '🌙', color: '#15803d', span: 'vers 1299 → 1922', from: 1299, to: 1922, peak: 1683,
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
            id: 'charles-quint', name: "Empire de Charles Quint", icon: "🌐", color: '#ca8a04', span: "1516 → 1556", from: 1516, to: 1556, peak: 1540,
            places: [{ n: "Gand", c: [3.72, 51.05] }, { n: "Bruxelles", c: [4.35, 50.85] }, { n: "Tolède", c: [-4.02, 39.86] }, { n: "Séville", c: [-5.98, 37.39] }, { n: "Vienne", c: [16.37, 48.21] }, { n: "Naples", c: [14.27, 40.85] }, { n: "Milan", c: [9.19, 45.46] }, { n: "Mexico", c: [-99.13, 19.43] }, { n: "Lima", c: [-77.04, -12.05] }],
            capital: "Aucune capitale : une cour itinérante (Gand, Bruxelles, Tolède, Valladolid)",
            summary: "Né à Gand en 1500, Charles de Habsbourg réunit par héritage la Bourgogne et les Pays-Bas (1506), l'Espagne et ses possessions d'Italie et d'Amérique (1516), et les États autrichiens de sa famille ; il est élu empereur du Saint-Empire en 1519, face à François Ier. C'est le premier souverain sur les terres duquel « le soleil ne se couche jamais » (la formule est postérieure). Il combat sans cesse : contre la France (Pavie, 1525 ; sac de Rome, 1527), les Ottomans (siège de Vienne, 1529) et les princes protestants (Réforme de Luther, paix d'Augsbourg, 1555). Pendant son règne, Cortés conquiert le Mexique (1519-1521) et Pizarro le Pérou (1532). Épuisé, il abdique en 1555-1556 et partage l'héritage : l'Espagne, les Pays-Bas, l'Italie et l'Amérique à son fils Philippe II, l'Autriche et la couronne impériale à son frère Ferdinand.",
            snapshots: [
                {
                    id: '1519', label: "À l'élection impériale", year: 1519, legend: true,
                    text: "En 1519, Charles est roi d'Espagne (couronnes de Castille et d'Aragon, avec Naples, la Sicile et la Sardaigne), souverain des Pays-Bas et de la Franche-Comté, et chef des États autrichiens des Habsbourg. L'élection impériale lui ajoute le Saint-Empire, un ensemble de principautés que la carte ne figure pas (voir la carte du Saint-Empire).",
                    zones: [
                        { name: "Couronnes de Castille et d'Aragon", color: '#ca8a04', ring: [[-9.2, 42.0], [-9.8, 37.0], [-6.2, 36.0], [-2.0, 36.8], [0.3, 39.5], [1.0, 41.0], [3.2, 42.4], [0.0, 42.8], [-1.8, 43.4], [-8.5, 43.5]] },
                        { name: "Naples, Sicile et Sardaigne", color: '#ca8a04', ring: [[13.4, 41.5], [14.2, 42.6], [16.2, 41.8], [18.5, 40.2], [17.0, 39.0], [15.8, 38.0], [15.2, 40.0]] },
                        { name: "Naples, Sicile et Sardaigne", color: '#ca8a04', ring: [[12.4, 37.4], [12.6, 38.1], [15.6, 38.3], [15.3, 36.7]] },
                        { name: "Naples, Sicile et Sardaigne", color: '#ca8a04', ring: [[8.1, 39.0], [8.2, 41.0], [9.6, 41.2], [9.8, 39.2]] },
                        { name: "Pays-Bas et Franche-Comté", color: '#ca8a04', ring: [[2.5, 50.8], [3.5, 51.5], [4.5, 52.6], [5.5, 53.3], [7.0, 53.4], [6.8, 52.0], [6.1, 51.2], [5.8, 50.4], [5.4, 49.6], [4.5, 49.9], [3.2, 50.4]] },
                        { name: "Pays-Bas et Franche-Comté", color: '#ca8a04', ring: [[5.2, 47.9], [6.9, 47.4], [6.0, 46.3], [5.3, 46.6]] },
                        { name: "États autrichiens des Habsbourg", color: '#b45309', ring: [[9.6, 47.1], [10.5, 46.4], [12.4, 46.5], [13.7, 46.5], [13.6, 45.7], [14.5, 45.5], [15.2, 46.2], [16.4, 46.9], [16.8, 47.7], [17.0, 48.2], [14.7, 48.8], [13.8, 48.8], [13.0, 47.7], [10.5, 47.5]] }
                    ]
                },
                {
                    id: '1556', label: "À l'abdication : le partage", year: 1556, legend: true,
                    text: "En 1556, Charles Quint abdique. Son fils Philippe II reçoit l'Espagne, les Pays-Bas, l'Italie (avec le Milanais, conquis en 1535) et les Amériques, où l'empire des Aztèques et celui des Incas viennent d'être conquis. Son frère Ferdinand reçoit les États autrichiens et sera élu empereur en 1558. L'empire de Charles Quint ne lui survit donc pas : les Habsbourg se divisent en deux branches.",
                    zones: [
                        { name: "Couronnes de Castille et d'Aragon", color: '#ca8a04', ring: [[-9.2, 42.0], [-9.8, 37.0], [-6.2, 36.0], [-2.0, 36.8], [0.3, 39.5], [1.0, 41.0], [3.2, 42.4], [0.0, 42.8], [-1.8, 43.4], [-8.5, 43.5]] },
                        { name: "Naples, Sicile, Sardaigne et Milanais", color: '#ca8a04', ring: [[13.4, 41.5], [14.2, 42.6], [16.2, 41.8], [18.5, 40.2], [17.0, 39.0], [15.8, 38.0], [15.2, 40.0]] },
                        { name: "Naples, Sicile, Sardaigne et Milanais", color: '#ca8a04', ring: [[12.4, 37.4], [12.6, 38.1], [15.6, 38.3], [15.3, 36.7]] },
                        { name: "Naples, Sicile, Sardaigne et Milanais", color: '#ca8a04', ring: [[8.1, 39.0], [8.2, 41.0], [9.6, 41.2], [9.8, 39.2]] },
                        { name: "Naples, Sicile, Sardaigne et Milanais", color: '#ca8a04', ring: [[8.5, 45.0], [8.6, 46.0], [10.2, 46.3], [10.6, 45.5], [10.0, 44.9], [9.2, 44.7]] },
                        { name: "Pays-Bas et Franche-Comté", color: '#ca8a04', ring: [[2.5, 50.8], [3.5, 51.5], [4.5, 52.6], [5.5, 53.3], [7.0, 53.4], [6.8, 52.0], [6.1, 51.2], [5.8, 50.4], [5.4, 49.6], [4.5, 49.9], [3.2, 50.4]] },
                        { name: "Pays-Bas et Franche-Comté", color: '#ca8a04', ring: [[5.2, 47.9], [6.9, 47.4], [6.0, 46.3], [5.3, 46.6]] },
                        { name: "Amériques espagnoles", color: '#ca8a04', ring: [[-106.0, 22.0], [-103.0, 26.0], [-98.0, 26.5], [-97.4, 21.5], [-96.0, 19.0], [-94.5, 18.0], [-90.5, 17.8], [-88.0, 16.0], [-85.0, 15.8], [-83.5, 15.0], [-83.5, 11.0], [-82.7, 9.3], [-80.0, 8.9], [-80.0, 7.4], [-81.0, 7.5], [-83.0, 8.5], [-85.5, 10.0], [-87.5, 13.0], [-89.5, 13.5], [-92.0, 14.2], [-96.0, 15.8], [-100.0, 17.0], [-104.5, 19.5]] },
                        { name: "Amériques espagnoles", color: '#ca8a04', ring: [[-81.0, -6.0], [-79.8, -8.0], [-77.5, -12.0], [-75.0, -15.0], [-71.5, -17.5], [-70.5, -19.5], [-70.3, -23.0], [-67.0, -19.0], [-66.5, -15.5], [-68.5, -12.5], [-72.0, -10.5], [-75.5, -8.5], [-78.0, -5.5]] },
                        { name: "États autrichiens (Ferdinand)", color: '#b45309', ring: [[9.6, 47.1], [10.5, 46.4], [12.4, 46.5], [13.7, 46.5], [13.6, 45.7], [14.5, 45.5], [15.2, 46.2], [16.4, 46.9], [16.8, 47.7], [17.0, 48.2], [14.7, 48.8], [13.8, 48.8], [13.0, 47.7], [10.5, 47.5]] }
                    ]
                }
            ]
        },
        {
            id: 'azteques', name: 'Empire aztèque (Triple Alliance)', icon: '🌞', color: '#ea580c', span: '1325 → 1521', from: 1325, to: 1521, peak: 1519,
            places: [{ n: 'Tenochtitlan', c: [-99.13, 19.43] }, { n: 'Texcoco', c: [-98.88, 19.51] }, { n: 'Tlacopan', c: [-99.21, 19.46] }, { n: 'Cholula', c: [-98.3, 19.06] }, { n: 'Tlaxcala', c: [-98.24, 19.31] }, { n: 'Tochtepec', c: [-96.2, 18.1] }],
            capital: 'Mexico-Tenochtitlan (sur une île du lac de Texcoco)',
            summary: "Les Mexicas, un peuple nomade arrivé dans la vallée de Mexico, fondent Tenochtitlan en 1325 sur une île du lac de Texcoco. En 1428, avec Texcoco et Tlacopan, ils forment la Triple Alliance qui vainc Azcapotzalco et domine peu à peu le centre et le sud du Mexique. L'« empire aztèque » (nom donné plus tard) n'est pas un État centralisé : c'est un réseau de cités qui paient tribut (cacao, coton, plumes, guerriers). Tenochtitlan compte vers 200 000 habitants. Moctezuma II règne quand Hernán Cortés arrive (1519) ; avec ses alliés indigènes (dont les Tlaxcaltèques, ennemis des Aztèques) et une épidémie de variole, il prend la ville le 13 août 1521.",
            snapshots: [
                {
                    id: '1428', label: 'La naissance de la Triple Alliance', year: 1428,
                    text: "En 1428, les Mexicas de Tenochtitlan s'allient à Texcoco et à Tlacopan pour vaincre Azcapotzalco, la puissance dominante du lac. La Triple Alliance contrôle alors la vallée de Mexico, qu'elle va dépasser peu à peu.",
                    zones: [{ name: 'Vallée de Mexico (Triple Alliance)', ring: [[-99.7, 19.0], [-99.3, 19.9], [-98.5, 20.3], [-97.8, 19.8], [-98.0, 19.0], [-98.7, 18.7]] }]
                },
                {
                    id: '1519', label: 'À l\'arrivée de Cortés', year: 1519,
                    text: "En 1519, l'empire s'étend de la côte du Golfe à celle du Pacifique, et du pays huastèque au Soconusco, à plus de 1 000 km. À l'intérieur subsistent quelques États indépendants, comme Tlaxcala, que cette carte ne montre pas, et à l'ouest les Tarasques, jamais conquis.",
                    zones: [{ name: 'Triple Alliance aztèque', ring: [[-102.0, 18.5], [-101.0, 19.8], [-99.5, 21.0], [-98.0, 22.4], [-97.5, 21.5], [-96.2, 19.5], [-95.0, 18.2], [-94.5, 17.3], [-93.0, 16.3], [-92.2, 14.9], [-94.0, 15.8], [-96.0, 15.7], [-98.0, 16.0], [-100.0, 16.8], [-101.5, 17.6]] }]
                }
            ]
        },
        {
            id: 'incas', name: 'Empire inca (Tawantinsuyu)', icon: '🏔️', color: '#9a3412', span: '1438 → 1533', from: 1438, to: 1572, peak: 1527,
            places: [{ n: 'Cusco', c: [-71.97, -13.52] }, { n: 'Machu Picchu', c: [-72.54, -13.16] }, { n: 'Quito', c: [-78.5, -0.2] }, { n: 'Cajamarca', c: [-78.5, -7.16] }, { n: 'Tiwanaku', c: [-68.67, -16.55] }, { n: 'Chan Chan', c: [-79.07, -8.11] }],
            capital: 'Cusco (« le nombril du monde »)',
            summary: "Les Incas, un petit peuple de la vallée de Cusco, vainquent leurs voisins, les Chancas, en 1438. Sous Pachacutec, puis Túpac Yupanqui et Huayna Capac, ils bâtissent le Tawantinsuyu (« les quatre parties réunies »), le plus grand empire de l'Amérique précolombienne, le long des Andes : environ 10 millions d'habitants. Ils n'ont pas d'écriture, mais comptent et transmettent des informations avec des cordelettes nouées (quipus), et relient l'empire par un réseau de 40 000 km de routes (Qhapaq Ñan). Une guerre civile entre deux fils de Huayna Capac, Huáscar et Atahualpa (1529-1532), affaiblit l'empire juste avant l'arrivée de Pizarro, qui capture Atahualpa à Cajamarca (1532) et le fait exécuter (1533). Des Incas résistent à Vilcabamba jusqu'en 1572.",
            snapshots: [
                {
                    id: '1438', label: 'Le royaume de Cusco', year: 1438,
                    text: "En 1438, le chef inca Pachacutec repousse l'attaque des Chancas contre Cusco, et se proclame « Inca » (souverain). Le royaume se limite alors à la vallée de Cusco et à ses abords.",
                    zones: [{ name: 'Royaume de Cusco', ring: [[-72.6, -13.0], [-71.6, -12.6], [-71.0, -13.4], [-71.4, -14.6], [-72.5, -14.2]] }]
                },
                {
                    id: '1470', label: 'Les conquêtes de Pachacutec et de Túpac Yupanqui', year: 1470,
                    text: "Vers 1470, les Incas ont conquis la côte du Pérou (royaume de Chimú, 1470) et les hautes terres jusqu'au lac Titicaca (Tiwanaku, Collao), qui forment le cœur de l'empire.",
                    zones: [{ name: 'Empire inca (vers 1470)', ring: [[-80.0, -7.0], [-79.2, -9.2], [-77.0, -12.0], [-75.0, -15.0], [-71.5, -17.5], [-69.5, -19.0], [-67.0, -19.0], [-66.5, -15.5], [-68.5, -12.5], [-72.0, -10.5], [-75.5, -8.5], [-78.0, -5.5]] }]
                },
                {
                    id: '1527', label: 'À son extension maximale', year: 1527,
                    text: "Vers 1527, à la mort de Huayna Capac, le Tawantinsuyu va de la frontière de la Colombie actuelle (Pasto) jusqu'au fleuve Maule, au Chili, et à l'Argentine du nord-ouest, sur près de 4 000 km. Il est organisé en quatre « suyu » autour de Cusco ; il a des greniers publics, un impôt en travail (mit'a) et des déplacements de populations.",
                    zones: [{ name: 'Tawantinsuyu', ring: [[-77.2, 1.3], [-79.6, 0.8], [-80.2, -1.0], [-80.5, -4.0], [-81.0, -6.0], [-79.8, -8.0], [-77.5, -12.0], [-75.0, -15.0], [-71.5, -17.5], [-70.5, -19.5], [-70.3, -23.0], [-70.7, -27.0], [-71.4, -31.0], [-71.8, -35.0], [-69.5, -34.5], [-68.5, -32.5], [-67.0, -29.5], [-65.0, -26.0], [-64.5, -22.5], [-62.5, -19.5], [-64.0, -16.0], [-66.0, -13.0], [-69.0, -11.0], [-73.0, -9.0], [-75.5, -7.0], [-77.0, -4.0], [-77.8, -1.5]] }]
                }
            ]
        },
        {
            id: 'kongo', name: "Royaume de Kongo", icon: "🌴", color: '#c2410c', span: "vers 1390 → 1914", from: 1390, to: 1914, peak: 1520,
            places: [{ n: "Mbanza Kongo", c: [14.25, -6.27] }, { n: "Soyo", c: [12.37, -6.13] }, { n: "Kinshasa (Mpumbu)", c: [15.31, -4.32] }, { n: "Luanda", c: [13.23, -8.84] }, { n: "Mbwila", c: [15.45, -7.95] }],
            capital: "Mbanza Kongo (rebaptisée São Salvador par les Portugais)",
            summary: "Le royaume de Kongo naît vers 1390 de la réunion de provinces autour de Mbanza Kongo, sous Lukeni lua Nimi : un royaume centralisé, avec un roi (manikongo), des gouverneurs de provinces et un système d'impôts et de monnaie (coquillages nzimbu). Les Portugais arrivent en 1483. Le roi Nzinga a Nkuwu se fait baptiser en 1491. Son fils Afonso Ier (1509-1542), roi chrétien lettré, entretient des relations d'égal à égal avec le Portugal et le pape, mais proteste, dans des lettres célèbres, contre la traite des esclaves, qui dépeuple son pays. Après l'invasion des Jaga (1568) et la défaite de Mbwila face aux Portugais (29 octobre 1665, où le roi António Ier est tué), le royaume sombre dans les guerres civiles. Il garde une existence nominale jusqu'en 1914, quand le Portugal supprime la royauté.",
            snapshots: [
                {
                    id: '1400', label: "Les débuts du royaume", year: 1400,
                    text: "Vers 1400, le royaume se réduit à la région de Mbanza Kongo, entre le fleuve Congo, au nord, et l'Atlantique, à l'ouest. Il est composé de provinces gouvernées par des proches du roi.",
                    zones: [{ name: "Royaume de Kongo (vers 1400)", ring: [[13.5, -5.5], [15.0, -5.0], [15.5, -6.5], [14.5, -7.5], [13.5, -7.0]] }]
                },
                {
                    id: '1520', label: "Sous Afonso Ier", year: 1520,
                    text: "Vers 1520, sous Afonso Ier, le royaume atteint sa plus grande extension : de l'Atlantique au Kwango, et du Congo au nord à la Dande au sud. Mbanza Kongo compte une grande population et accueille des missions, des écoles et des églises de pierre.",
                    zones: [{ name: "Royaume de Kongo (vers 1520)", ring: [[12.4, -5.0], [14.0, -4.5], [16.0, -4.0], [18.5, -4.8], [19.0, -7.0], [18.5, -9.0], [16.5, -9.3], [14.0, -9.0], [13.2, -8.6], [12.3, -6.2]] }]
                },
                {
                    id: '1680', label: "Après la défaite de Mbwila", year: 1680,
                    text: "Vers 1680, après la défaite de Mbwila (1665), le royaume est affaibli et divisé en factions rivales. La capitale est abandonnée en 1678 puis reconstruite ; les provinces s'autonomisent. Le commerce des esclaves continue de saigner le pays.",
                    zones: [{ name: "Royaume de Kongo (vers 1680)", ring: [[12.8, -5.4], [15.5, -5.2], [16.2, -7.2], [14.5, -8.2], [13.0, -7.2]] }]
                }
            ]
        },
        {
            id: 'qing', name: "Empire chinois des Qing", icon: "🏮", color: '#ca8a04', span: "1644 → 1912", from: 1644, to: 1912, peak: 1760,
            places: [{ n: "Pékin", c: [116.4, 39.9] }, { n: "Moukden", c: [123.4, 41.8] }, { n: "Lhassa", c: [91.1, 29.65] }, { n: "Ourounqi", c: [87.6, 43.8] }, { n: "Kashgar", c: [75.99, 39.47] }, { n: "Canton", c: [113.26, 23.13] }, { n: "Nankin", c: [118.8, 32.06] }, { n: "Taipei", c: [121.56, 25.03] }, { n: "Oulan-Bator", c: [106.9, 47.9] }],
            capital: "Pékin (Moukden avant 1644)",
            summary: "Les Mandchous, un peuple du nord-est, fondent la dynastie Qing en 1636 et prennent Pékin en 1644, quand l'empire Ming s'effondre. Ils gouvernent la Chine avec les lettrés chinois, mais imposent la natte (« queue ») aux hommes. Sous Kangxi (1661-1722), Yongzheng et surtout Qianlong (1735-1796), ils doublent le territoire : Taïwan (1683), Mongolie, Tibet (protectorat dès 1720) et le Xinjiang (« nouvelle frontière »), conquis en 1755-1759 sur les Dzoungars. L'empire compte alors 300 millions d'habitants. Au XIXe siècle, les guerres de l'opium (1839-1842, 1856-1860), la rébellion des Taiping (1850-1864) et les traités inégaux l'affaiblissent : perte de la Mandchourie extérieure (traités d'Aigun, 1858, et de Pékin, 1860, au profit de la Russie), de Taïwan (1895, Japon). Le dernier empereur, Puyi, abdique le 12 février 1912 : c'est la fin de plus de deux mille ans d'empire en Chine.",
            snapshots: [
                {
                    id: '1644', label: "À la prise de Pékin", year: 1644,
                    text: "En 1644, les Mandchous, appelés par un général Ming, entrent à Pékin après la chute de l'empereur Ming (qui s'est pendu). Leur domaine est alors la Mandchourie et le nord de la Chine ; la conquête du sud dure encore près de quarante ans.",
                    zones: [{ name: "Empire Qing (1644)", ring: [[98.0, 42.0], [106.0, 41.5], [111.0, 42.0], [114.0, 44.0], [118.0, 46.0], [120.0, 49.0], [122.0, 52.0], [125.0, 53.5], [130.0, 53.0], [135.0, 54.0], [140.0, 53.5], [140.0, 48.0], [135.0, 43.0], [131.0, 42.5], [128.0, 42.0], [124.5, 40.0], [122.5, 37.5], [120.0, 35.0], [121.5, 31.5], [121.0, 28.0], [119.0, 25.5], [117.0, 23.5], [113.0, 22.0], [110.0, 20.5], [108.0, 21.5], [106.0, 22.5], [104.0, 22.5], [102.0, 22.5], [100.0, 22.5], [98.5, 24.0], [98.0, 27.0], [100.0, 30.0], [101.0, 33.0], [100.0, 35.5], [97.0, 38.0], [95.0, 39.5]] }]
                },
                {
                    id: '1760', label: "Sous Qianlong, à son apogée", year: 1760,
                    text: "En 1760, après la conquête du Xinjiang, l'empire est à son sommet : près de 13 millions de km², de la Mandchourie et de la Mongolie au Turkestan et au Tibet. La Corée, le Vietnam et la Birmanie lui versent tribut, ce que la carte ne figure pas. Le commerce avec les Européens est limité à Canton.",
                    zones: [
                        { name: "Empire Qing (1760)", ring: [[74.5, 39.5], [73.5, 41.5], [80.0, 42.5], [80.5, 45.0], [83.0, 47.0], [87.0, 49.0], [90.0, 50.3], [97.0, 50.5], [98.0, 51.7], [105.0, 50.3], [115.0, 50.0], [120.0, 52.5], [121.0, 53.3], [125.0, 55.0], [130.0, 55.0], [135.0, 54.5], [140.0, 53.5], [140.0, 48.0], [135.0, 43.0], [131.0, 42.5], [128.0, 42.0], [124.5, 40.0], [122.5, 37.5], [120.0, 35.0], [121.5, 31.5], [121.0, 28.0], [119.0, 25.5], [117.0, 23.5], [113.0, 22.0], [110.0, 20.5], [108.0, 21.5], [106.0, 22.5], [104.0, 22.5], [102.0, 22.5], [100.0, 22.5], [98.5, 24.0], [98.0, 27.0], [97.0, 28.5], [92.0, 27.8], [88.5, 27.8], [84.0, 28.5], [80.0, 30.5], [79.0, 32.5], [78.0, 35.5], [76.0, 37.0]] },
                        { name: "Taïwan", ring: [[120.0, 23.0], [120.2, 24.7], [121.1, 25.3], [122.0, 25.0], [121.5, 22.0], [120.6, 22.3]] }
                    ]
                },
                {
                    id: '1900', label: "À l'époque des traités inégaux", year: 1900,
                    text: "En 1900, l'empire a perdu la Mandchourie extérieure (Russie, 1858-1860) et Taïwan (Japon, 1895), et ses côtes sont partagées en zones d'influence et en concessions étrangères. La révolte des Boxeurs (1900) est écrasée par une expédition internationale. La carte ne montre pas les concessions.",
                    zones: [{ name: "Empire Qing (1900)", ring: [[74.5, 39.5], [74.0, 40.5], [80.0, 42.5], [80.5, 45.0], [83.0, 47.0], [87.0, 49.0], [90.0, 50.3], [97.0, 50.5], [98.0, 51.7], [105.0, 50.3], [115.0, 50.0], [120.0, 52.5], [120.5, 53.3], [126.0, 50.2], [127.0, 50.3], [130.0, 48.5], [134.5, 48.3], [134.2, 47.3], [133.5, 45.5], [132.0, 44.5], [131.0, 43.0], [130.7, 42.4], [128.0, 42.0], [124.5, 40.0], [122.5, 37.5], [120.0, 35.0], [121.5, 31.5], [121.0, 28.0], [119.0, 25.5], [117.0, 23.5], [113.0, 22.0], [110.0, 20.5], [108.0, 21.5], [106.0, 22.5], [104.0, 22.5], [102.0, 22.5], [100.0, 22.5], [98.5, 24.0], [98.0, 27.0], [97.0, 28.5], [92.0, 27.8], [88.5, 27.8], [84.0, 28.5], [80.0, 30.5], [79.0, 32.5], [78.0, 35.5], [76.0, 37.0]] }]
                }
            ]
        },
        {
            id: 'ethiopie', name: "Empire d'Éthiopie", icon: "⛪", color: '#15803d', span: "1270 → 1974", from: 1270, to: 1974, peak: 1900,
            places: [{ n: "Axoum", c: [38.72, 14.13] }, { n: "Lalibela", c: [39.04, 12.03] }, { n: "Gondar", c: [37.47, 12.6] }, { n: "Addis-Abeba", c: [38.74, 9.03] }, { n: "Adoua", c: [38.9, 14.16] }],
            capital: "Variable : Axoum (couronnement), Gondar (1636-1855), puis Addis-Abeba (depuis 1886)",
            summary: "L'Éthiopie est l'un des plus anciens États chrétiens du monde (le royaume d'Axoum se convertit au IVe siècle). En 1270, Yekuno Amlak renverse la dynastie zagwé (celle des églises creusées de Lalibela) et fonde la dynastie dite « salomonide », qui se prétend issue du roi Salomon et de la reine de Saba (Kebra Nagast). L'empire résiste à l'invasion de l'imam Ahmad Gragn (1529-1543) avec l'aide portugaise, puis se replie sur Gondar. Au XIXe siècle, Tewodros II, Yohannes IV et surtout Ménélik II le reconstruisent : ce dernier écrase l'armée italienne à Adoua (1896), faisant de l'Éthiopie, avec le Liberia, l'un des deux États africains non colonisés. Occupée par l'Italie de 1936 à 1941, elle est dirigée par l'empereur Haïlé Sélassié (1930-1974), renversé par le Derg.",
            snapshots: [
                {
                    id: '1270', label: "La dynastie salomonide", year: 1270,
                    text: "En 1270, Yekuno Amlak prend le pouvoir : le royaume chrétien est alors un ensemble de hautes terres du centre-nord (Amhara, Choa), entouré de peuples musulmans ou fidèles aux religions africaines.",
                    zones: [{ name: "Royaume chrétien des hautes terres (1270)", ring: [[37.0, 13.5], [39.0, 13.5], [40.0, 12.0], [39.5, 9.5], [37.5, 9.5], [36.5, 11.0]] }]
                },
                {
                    id: '1450', label: "Sous Zara Yaqob", year: 1450,
                    text: "Vers 1450, sous Zara Yaqob (1434-1468), le royaume s'étend et se renforce : monastères, réforme de l'Église, administration centralisée. Il guerroie contre les sultanats musulmans voisins (Adal, Ifat).",
                    zones: [{ name: "Royaume d'Éthiopie (vers 1450)", ring: [[36.5, 14.5], [39.5, 15.0], [41.5, 13.0], [42.0, 10.5], [41.0, 8.5], [38.5, 7.5], [36.0, 8.5], [35.5, 11.0], [36.0, 13.0]] }]
                },
                {
                    id: '1900', label: "Sous Ménélik II", year: 1900,
                    text: "Vers 1900, Ménélik II a doublé le pays par des conquêtes au sud et à l'est (Oromo, Ogaden, Sidamo) et fondé Addis-Abeba (1886). La carte ne montre pas l'Érythrée, colonie italienne depuis 1890. La victoire d'Adoua (1896) a assuré l'indépendance.",
                    zones: [{ name: "Empire d'Éthiopie (vers 1900)", ring: [[36.5, 14.6], [39.8, 14.2], [41.7, 12.8], [42.5, 11.2], [43.3, 9.7], [45.0, 8.5], [47.9, 8.0], [47.5, 6.5], [44.0, 4.5], [41.9, 3.9], [39.5, 3.6], [38.0, 3.6], [36.0, 4.5], [34.5, 5.3], [33.8, 7.5], [34.5, 9.8], [35.5, 11.5], [36.2, 13.5]] }]
                }
            ]
        },
        {
            id: 'britannique', name: "Empire britannique", icon: "🇬🇧", color: '#1d4ed8', span: "vers 1600 → 1997", from: 1600, to: 1997, peak: 1920,
            places: [{ n: "Londres", c: [-0.13, 51.51] }, { n: "Calcutta", c: [88.36, 22.57] }, { n: "Le Cap", c: [18.42, -33.92] }, { n: "Ottawa", c: [-75.7, 45.42] }, { n: "Sydney", c: [151.21, -33.87] }, { n: "Le Caire", c: [31.24, 30.04] }, { n: "Nairobi", c: [36.82, -1.29] }, { n: "Singapour", c: [103.82, 1.35] }],
            capital: "Londres",
            summary: "Né des comptoirs et des colonies fondés à partir de 1600 (Compagnie des Indes orientales, Virginie en 1607), l'empire s'étend après 1763 au Canada, à l'Inde et à la Caraïbe, perd les treize colonies américaines (1783), puis se reconstruit au XIXe siècle autour de l'Inde (Raj, 1858), de l'Afrique, de l'Australie et du Pacifique. À son apogée, vers 1920, il couvre environ un quart des terres émergées et compte près de 460 millions d'habitants : « l'empire où le soleil ne se couche jamais ». Il repose sur la marine, le commerce et l'exploitation des colonies (dont la traite des esclaves jusqu'en 1807, l'esclavage jusqu'en 1833). Il se défait après 1945 (Inde en 1947, Afrique à partir de 1957, Suez en 1956) ; la restitution de Hong Kong à la Chine (1997) en est le symbole final.",
            snapshots: [
                {
                    id: '1763', label: "Après la guerre de Sept Ans", year: 1763, legend: true,
                    text: "En 1763, au traité de Paris, la France cède à la Grande-Bretagne le Canada et la rive est du Mississippi ; l'Espagne cède la Floride. En Inde, la Compagnie des Indes domine le Bengale depuis Plassey (1757). L'Empire britannique devient la première puissance coloniale... avant de perdre ses treize colonies en 1783.",
                    zones: [
                        { name: "Treize colonies et Floride", ring: [[-80.5, 25.2], [-81.8, 26.5], [-82.7, 29.5], [-85.0, 29.8], [-88.0, 30.4], [-89.5, 31.0], [-91.0, 32.0], [-88.0, 35.0], [-85.0, 38.0], [-82.0, 38.5], [-80.5, 40.5], [-79.0, 42.0], [-75.0, 45.0], [-71.0, 45.2], [-67.0, 44.8], [-70.5, 41.5], [-75.5, 35.2], [-79.0, 33.0], [-81.4, 30.5], [-80.5, 27.5]] },
                        { name: "Canada, Acadie, Terre-Neuve et terres de la baie d'Hudson", ring: [[-79.0, 45.5], [-75.0, 45.2], [-71.0, 45.2], [-67.5, 45.0], [-64.0, 43.5], [-60.0, 46.0], [-56.0, 47.5], [-53.0, 47.0], [-55.0, 51.5], [-60.0, 55.0], [-65.0, 58.5], [-73.0, 62.0], [-78.0, 58.5], [-79.0, 52.0]] },
                        { name: "Jamaïque", ring: [[-78.4, 18.3], [-76.2, 18.2], [-76.5, 17.8], [-78.2, 17.8]] },
                        { name: "Bengale (Compagnie des Indes)", ring: [[86.0, 25.5], [88.0, 26.5], [92.0, 25.0], [91.0, 22.5], [88.0, 21.5], [86.5, 21.6], [85.0, 24.0]] }
                    ]
                },
                {
                    id: '1920', label: "À son apogée", year: 1920,
                    text: "En 1920, après la Première Guerre mondiale (qui lui ajoute des mandats : Irak, Palestine, Tanganyika…), l'empire atteint son maximum : plus de 33 millions de km². Le Canada, l'Australie, la Nouvelle-Zélande et l'Afrique du Sud sont des dominions quasi indépendants ; l'Inde, l'Égypte et l'Afrique sont des possessions. La carte simplifie : les petites îles et les comptoirs ne sont pas tous figurés.",
                    zones: [
                        { name: "Royaume-Uni", ring: [[-10.5, 51.4], [-10.0, 54.7], [-6.5, 55.5], [-5.0, 58.6], [-3.0, 58.7], [0.0, 56.0], [1.8, 52.7], [1.5, 51.0], [-5.5, 49.9]] },
                        { name: "Canada", ring: [[-141.0, 60.0], [-141.0, 69.6], [-128.0, 70.2], [-112.0, 68.5], [-96.0, 71.5], [-86.0, 69.0], [-81.0, 63.0], [-86.0, 57.0], [-79.0, 51.5], [-78.0, 58.0], [-73.0, 62.0], [-66.0, 59.0], [-61.0, 55.5], [-56.0, 52.0], [-53.0, 47.0], [-59.0, 47.0], [-65.0, 43.5], [-70.0, 45.0], [-75.0, 45.0], [-79.0, 43.5], [-83.0, 46.0], [-95.0, 49.0], [-123.0, 49.0], [-130.0, 54.0], [-136.0, 58.5]] },
                        { name: "Australie", ring: [[113.0, -22.0], [114.0, -26.0], [115.0, -34.0], [118.0, -35.0], [124.0, -33.0], [131.0, -31.5], [138.0, -35.5], [141.0, -38.0], [146.0, -39.0], [150.0, -37.0], [153.0, -30.0], [153.0, -25.0], [146.0, -19.0], [142.0, -10.8], [140.0, -17.5], [136.0, -12.0], [130.0, -12.0], [127.0, -14.0], [122.0, -17.0]] },
                        { name: "Nouvelle-Zélande", ring: [[172.7, -34.4], [178.5, -37.8], [175.0, -41.8], [173.0, -43.5], [170.5, -46.2], [166.5, -46.0], [168.5, -43.5], [172.5, -41.0]] },
                        { name: "Inde britannique et Birmanie", ring: [[61.5, 25.2], [62.0, 29.0], [66.0, 31.5], [70.0, 34.5], [72.0, 36.8], [75.0, 37.0], [78.0, 35.5], [80.0, 31.0], [84.0, 28.5], [88.0, 27.5], [92.0, 27.8], [96.0, 28.5], [98.5, 25.0], [98.5, 21.0], [99.0, 16.0], [98.5, 12.0], [98.3, 9.8], [97.6, 16.5], [95.0, 15.8], [94.2, 18.5], [92.5, 21.0], [91.8, 22.5], [90.0, 21.7], [87.0, 21.0], [85.0, 19.5], [82.0, 16.5], [80.2, 15.5], [80.3, 13.0], [79.8, 10.3], [77.5, 8.1], [76.0, 10.0], [74.8, 13.0], [73.0, 16.5], [72.8, 19.5], [72.6, 21.5], [70.0, 20.8], [68.5, 23.0], [67.0, 24.5], [66.5, 25.2]] },
                        { name: "Ceylan", ring: [[79.8, 9.8], [81.5, 7.5], [81.0, 6.2], [80.0, 6.0], [79.8, 7.5]] },
                        { name: "Égypte et Soudan", ring: [[25.0, 22.0], [25.0, 31.6], [32.0, 31.3], [34.0, 29.5], [35.5, 24.0], [37.5, 18.5], [38.5, 16.0], [36.5, 14.5], [34.5, 11.0], [34.2, 9.5], [33.2, 8.0], [31.5, 5.0], [27.0, 4.5], [24.2, 8.5], [24.5, 11.0], [24.0, 14.0], [22.5, 15.5], [24.0, 19.5]] },
                        { name: "Afrique orientale", ring: [[29.8, 4.2], [33.9, 4.5], [36.0, 4.6], [39.5, 3.5], [41.9, 3.9], [41.0, -1.8], [39.2, -4.6], [39.5, -6.9], [39.2, -10.5], [34.5, -11.5], [30.0, -8.5], [29.6, -4.4], [29.8, -1.5], [30.5, 1.0]] },
                        { name: "Afrique australe", ring: [[11.8, -17.3], [20.0, -17.3], [24.0, -17.5], [28.0, -15.8], [33.0, -14.0], [34.5, -11.5], [35.0, -14.5], [35.5, -17.0], [32.9, -18.8], [32.4, -22.0], [32.9, -26.5], [31.0, -29.8], [27.0, -33.5], [22.0, -34.2], [18.5, -34.2], [16.5, -29.0], [14.5, -23.0]] },
                        { name: "Nigeria", ring: [[2.7, 6.3], [3.6, 6.4], [8.5, 4.3], [9.8, 4.0], [12.0, 6.5], [13.5, 10.0], [14.5, 12.8], [13.0, 13.7], [8.0, 13.5], [4.0, 13.5], [3.5, 11.5], [2.7, 9.0]] },
                        { name: "Gold Coast", ring: [[-3.2, 5.1], [1.2, 6.1], [1.2, 9.0], [0.0, 11.0], [-2.8, 11.0], [-2.8, 8.0]] },
                        { name: "Sierra Leone", ring: [[-13.3, 8.5], [-11.5, 6.9], [-10.3, 8.5], [-10.5, 9.8], [-12.5, 9.8]] },
                        { name: "Irak (mandat)", ring: [[38.8, 33.2], [42.5, 37.0], [44.0, 37.3], [46.0, 35.5], [48.5, 33.0], [48.5, 30.0], [47.0, 29.1], [44.0, 29.1], [41.5, 31.0]] },
                        { name: "Palestine et Transjordanie (mandat)", ring: [[34.3, 31.3], [35.5, 33.2], [39.0, 32.5], [38.5, 30.5], [36.5, 29.5], [35.0, 29.5]] },
                        { name: "Malaisie", ring: [[100.1, 6.5], [102.5, 6.2], [104.3, 2.5], [104.1, 1.2], [103.5, 1.25], [101.0, 3.0], [100.1, 5.0]] }
                    ]
                }
            ]
        },
        {
            id: 'russe', name: "Empire russe", icon: "🦅", color: '#334155', span: "1721 → 1917", from: 1721, to: 1917, peak: 1895,
            places: [{ n: "Saint-Pétersbourg", c: [30.34, 59.93] }, { n: "Moscou", c: [37.62, 55.75] }, { n: "Kiev", c: [30.52, 50.45] }, { n: "Varsovie", c: [21.01, 52.23] }, { n: "Tbilissi", c: [44.8, 41.72] }, { n: "Tachkent", c: [69.24, 41.3] }, { n: "Vladivostok", c: [131.89, 43.12] }, { n: "Irkoutsk", c: [104.28, 52.29] }],
            capital: "Saint-Pétersbourg (fondée en 1703), de 1712 à 1918, avec Moscou pour couronnement",
            summary: "En 1721, à la fin de la grande guerre du Nord contre la Suède, Pierre Ier le Grand prend le titre d'empereur (« imperator »). L'empire s'agrandit de la Baltique à la mer Noire (Catherine II : Crimée en 1783, partages de la Pologne en 1772, 1793 et 1795), du Caucase et de l'Asie centrale (conquêtes de 1860 à 1885), de la Sibérie et de l'Extrême-Orient (Amour et Vladivostok, 1858-1860). Il vend l'Alaska aux États-Unis en 1867. Son sommet, vers 1895, est un des plus grands États de l'histoire : plus de 22 millions de km², environ un sixième des terres émergées, et plus d'une centaine de peuples. Il reste autocratique et agraire : le servage n'est aboli qu'en 1861. La défaite de 1905 contre le Japon, la révolution de 1905, puis la guerre mondiale le fragilisent : Nicolas II abdique en mars 1917 (février selon l'ancien calendrier).",
            snapshots: [
                {
                    id: '1721', label: "Sous Pierre le Grand", year: 1721,
                    text: "En 1721, l'empire s'étend de la Baltique (provinces conquises sur la Suède : Livonie, Estonie, Carélie) à l'océan Pacifique, par la Sibérie. La frontière est fixée avec la Chine (traité de Nertchinsk, 1689) ; la Russie n'a ni l'Amour, ni la mer Noire.",
                    zones: [{ name: "Empire russe (1721)", ring: [[24.5, 57.5], [22.8, 59.3], [28.2, 60.4], [30.0, 62.0], [30.0, 66.0], [33.0, 69.5], [41.0, 67.5], [44.0, 68.5], [60.0, 68.5], [69.0, 73.0], [80.0, 73.5], [100.0, 76.0], [112.0, 73.5], [140.0, 72.0], [160.0, 69.5], [180.0, 68.0], [180.0, 65.5], [172.0, 62.5], [163.0, 59.5], [155.0, 59.5], [143.0, 59.2], [137.5, 54.5], [130.0, 53.5], [122.0, 53.5], [116.0, 50.5], [110.0, 50.3], [104.0, 50.2], [98.0, 51.5], [90.0, 50.8], [85.0, 49.8], [80.0, 51.0], [74.0, 54.0], [70.0, 55.0], [63.0, 54.0], [61.0, 51.5], [55.0, 50.8], [50.0, 49.5], [48.5, 46.5], [47.5, 45.5], [44.5, 46.0], [41.0, 47.5], [38.0, 50.2], [35.5, 51.5], [33.0, 52.0], [30.2, 50.0], [31.0, 52.5], [31.0, 54.5], [28.5, 56.5], [27.5, 57.3]] }]
                },
                {
                    id: '1796', label: "À la mort de Catherine II", year: 1796,
                    text: "En 1796, Catherine II a annexé la Crimée (1783), le littoral de la mer Noire (Novorossia), la Biélorussie, la Lituanie et une grande partie de l'Ukraine, aux dépens de l'Empire ottoman et de la Pologne. Les Russes se sont aussi installés en Alaska (colonie de l'Amérique russe, dès 1784).",
                    zones: [
                        { name: "Empire russe (1796)", ring: [[21.2, 56.0], [21.0, 57.0], [22.8, 59.3], [28.2, 60.4], [30.0, 62.0], [30.0, 66.0], [33.0, 69.5], [41.0, 67.5], [44.0, 68.5], [60.0, 68.5], [69.0, 73.0], [80.0, 73.5], [100.0, 76.0], [112.0, 73.5], [140.0, 72.0], [160.0, 69.5], [180.0, 68.0], [180.0, 65.5], [172.0, 62.5], [163.0, 59.5], [155.0, 59.5], [143.0, 59.2], [137.5, 54.5], [130.0, 53.5], [122.0, 53.5], [116.0, 50.5], [110.0, 50.3], [104.0, 50.2], [98.0, 51.5], [90.0, 50.8], [85.0, 49.8], [80.0, 51.0], [74.0, 54.0], [70.0, 55.0], [63.0, 54.0], [61.0, 51.5], [55.0, 50.8], [50.0, 49.5], [48.5, 46.5], [47.5, 45.5], [44.5, 43.5], [40.0, 44.5], [38.0, 45.2], [36.5, 45.4], [34.0, 44.6], [32.5, 46.5], [30.5, 46.5], [29.5, 46.5], [26.5, 48.2], [24.5, 49.2], [23.5, 51.0], [23.5, 53.0], [23.2, 54.4], [22.5, 55.2]] },
                        { name: "Amérique russe (Alaska)", color: '#475569', ring: [[-141.0, 60.0], [-141.0, 69.6], [-156.0, 71.3], [-166.0, 68.8], [-168.0, 65.5], [-165.0, 62.5], [-165.0, 60.5], [-162.0, 58.5], [-158.0, 56.5], [-153.0, 58.5], [-148.0, 60.2], [-143.0, 59.9]] }
                    ]
                },
                {
                    id: '1895', label: "À son extension maximale", year: 1895,
                    text: "En 1895, l'empire va de la Pologne (Vistule) et de la Finlande à Vladivostok, et du cercle polaire au Caucase et à l'Asie centrale. L'Alaska a été vendu en 1867. Le Transsibérien, commencé en 1891, relie l'ouest à l'Extrême-Orient.",
                    zones: [{ name: "Empire russe (1895)", ring: [[21.2, 56.0], [20.7, 55.5], [22.8, 54.4], [21.0, 53.5], [19.5, 53.0], [18.4, 52.0], [18.2, 50.8], [19.5, 50.3], [22.5, 49.5], [24.0, 50.2], [26.0, 48.5], [27.5, 48.4], [28.2, 45.5], [30.0, 45.4], [33.5, 44.6], [36.5, 45.2], [37.5, 47.0], [38.0, 44.5], [41.5, 42.0], [41.6, 41.6], [43.1, 40.6], [44.8, 39.7], [46.0, 38.9], [48.0, 38.4], [49.0, 40.5], [47.0, 43.0], [50.0, 45.5], [53.8, 41.5], [54.0, 37.5], [57.0, 37.5], [60.5, 36.5], [62.5, 35.7], [66.0, 37.3], [68.0, 37.2], [71.0, 37.5], [75.0, 37.3], [75.5, 38.5], [78.0, 41.0], [80.0, 43.0], [80.5, 45.0], [83.0, 47.0], [87.0, 49.0], [90.0, 50.5], [97.0, 50.5], [98.0, 51.7], [105.0, 50.3], [115.0, 50.0], [120.0, 52.5], [120.5, 53.3], [126.0, 50.2], [127.0, 50.3], [130.0, 48.5], [134.5, 48.3], [134.2, 47.3], [133.5, 45.5], [132.0, 44.5], [131.0, 43.0], [130.7, 42.4], [133.0, 42.8], [135.5, 44.5], [138.5, 47.0], [140.5, 50.0], [141.0, 52.5], [143.0, 53.5], [143.0, 59.0], [155.0, 59.5], [163.0, 59.5], [172.0, 62.5], [180.0, 65.5], [180.0, 68.0], [160.0, 69.5], [140.0, 72.0], [112.0, 73.5], [100.0, 76.0], [80.0, 73.5], [69.0, 73.0], [60.0, 68.5], [44.0, 68.5], [41.0, 67.5], [33.0, 69.8], [28.5, 70.3], [21.0, 69.0], [20.7, 67.5], [23.8, 65.8], [21.5, 63.3], [21.3, 61.0], [22.5, 60.0], [24.0, 59.5], [22.0, 58.5], [21.5, 57.0]] }]
                }
            ]
        },
        {
            id: 'napoleon', name: "Empire napoléonien (Premier Empire)", icon: "🦅", color: '#1e3a8a', span: "1804 → 1815", from: 1804, to: 1815, peak: 1812,
            places: [{ n: "Paris", c: [2.35, 48.86] }, { n: "Rome", c: [12.5, 41.9] }, { n: "Hambourg", c: [9.99, 53.55] }, { n: "Amsterdam", c: [4.9, 52.37] }, { n: "Madrid", c: [-3.7, 40.42] }, { n: "Varsovie", c: [21.01, 52.23] }, { n: "Milan", c: [9.19, 45.46] }, { n: "Vienne", c: [16.37, 48.21] }],
            capital: "Paris",
            summary: "Proclamé empereur des Français le 2 décembre 1804 (sacre à Notre-Dame), Napoléon Ier fait de la France, par la guerre, l'arbitre de l'Europe : victoires d'Austerlitz (1805), d'Iéna (1806), de Friedland (1807). Il annexe des territoires (jusqu'à 130 départements en 1812, de Hambourg à Rome) et place des États satellites sous le contrôle de ses proches (Espagne, Naples, Westphalie, Hollande), tandis que la Confédération du Rhin et d'autres États sont ses alliés. Le Blocus continental contre l'Angleterre, l'enlisement en Espagne (1808) et la désastreuse campagne de Russie (1812) ruinent l'empire : abdication en 1814, retour des Cent-Jours, Waterloo (18 juin 1815) et exil à Sainte-Hélène. Il laisse en France le Code civil (1804), les préfets, le lycée et la Banque de France.",
            snapshots: [
                {
                    id: '1804', label: "Au sacre de l'Empereur", year: 1804,
                    text: "En 1804, l'empire se limite à la France des « frontières naturelles » (Rhin, Alpes, Pyrénées), conquises par la Révolution : Belgique, rive gauche du Rhin, Savoie, Nice, et le Piémont annexé en 1802. Le sacre fait de Napoléon l'héritier de Charlemagne.",
                    zones: [{ name: "France de 1804", ring: [[-1.8, 43.4], [3.2, 42.4], [6.5, 43.1], [7.5, 43.8], [7.0, 45.5], [6.9, 46.2], [7.0, 47.5], [7.6, 47.6], [8.2, 49.0], [8.4, 50.0], [6.9, 50.9], [6.1, 51.8], [4.5, 51.8], [3.5, 51.3], [1.8, 50.9], [-1.5, 49.7], [-4.7, 48.5], [-2.2, 46.5], [-1.3, 44.5]] }]
                },
                {
                    id: '1812', label: "À son apogée", year: 1812, legend: true,
                    text: "En 1812, juste avant la campagne de Russie, l'Empire compte 130 départements. Autour de lui, des royaumes confiés à des proches (Espagne, Naples, Westphalie), la Confédération du Rhin et le grand-duché de Varsovie lui sont soumis ou alliés. L'Autriche, la Prusse et la Russie sont ses alliées sous la contrainte. Seul le Royaume-Uni, protégé par sa flotte, résiste.",
                    zones: [
                        { name: "États satellites et alliés : Espagne", color: '#60a5fa', ring: [[-9.2, 42.0], [-9.8, 37.0], [-6.2, 36.0], [-2.0, 36.8], [0.3, 39.5], [0.8, 40.8], [0.0, 42.5], [-1.8, 43.4], [-8.5, 43.5]] },
                        { name: "États satellites et alliés : Italie et Naples", color: '#60a5fa', ring: [[7.5, 45.5], [8.5, 46.2], [10.5, 46.5], [13.4, 46.5], [13.7, 45.6], [12.3, 44.3], [13.4, 43.5], [14.5, 42.4], [16.2, 41.8], [18.5, 40.2], [17.0, 39.0], [15.8, 38.0], [15.2, 40.0], [12.5, 41.3], [11.1, 42.3], [10.2, 43.5], [9.0, 44.4], [7.7, 44.0]] },
                        { name: "États satellites et alliés : Confédération du Rhin", color: '#60a5fa', ring: [[7.8, 50.0], [8.2, 49.0], [7.6, 47.6], [9.5, 47.5], [13.0, 47.6], [14.5, 48.6], [15.0, 50.8], [14.4, 53.0], [14.2, 54.0], [10.9, 53.97], [9.3, 52.8], [8.5, 51.5]] },
                        { name: "États satellites et alliés : grand-duché de Varsovie", color: '#60a5fa', ring: [[15.5, 52.5], [16.5, 54.0], [18.6, 54.4], [21.0, 54.4], [23.5, 54.1], [23.8, 52.0], [23.2, 50.4], [21.0, 50.0], [19.0, 50.1], [16.8, 51.0]] },
                        { name: "Empire français (130 départements)", color: '#1e3a8a', ring: [[-1.8, 43.4], [0.8, 40.8], [3.2, 41.9], [4.5, 43.4], [6.5, 43.1], [7.7, 43.8], [9.0, 44.4], [10.2, 43.5], [11.1, 42.3], [12.5, 41.3], [13.4, 41.9], [12.2, 43.3], [10.8, 44.3], [9.5, 45.2], [8.5, 46.0], [7.0, 45.9], [7.4, 47.0], [7.6, 47.6], [8.2, 49.0], [8.4, 50.0], [8.5, 51.5], [9.3, 52.8], [10.9, 53.5], [10.9, 53.97], [8.7, 53.9], [6.8, 53.5], [5.5, 53.2], [4.5, 52.6], [3.5, 51.5], [1.8, 50.8], [-1.5, 49.7], [-4.7, 48.5], [-2.0, 46.5], [-1.3, 44.5]] },
                        { name: "Provinces illyriennes", color: '#1e3a8a', ring: [[13.4, 46.3], [15.2, 46.5], [16.0, 45.5], [18.0, 43.7], [19.2, 42.2], [18.5, 42.4], [16.0, 43.5], [14.5, 44.8], [13.7, 45.5]] }
                    ]
                }
            ]
        },
        {
            id: 'austro-hongrois', name: "Empire austro-hongrois", icon: "🎻", color: '#be123c', span: "1867 → 1918", from: 1867, to: 1918, peak: 1914,
            places: [{ n: "Vienne", c: [16.37, 48.21] }, { n: "Budapest", c: [19.04, 47.5] }, { n: "Prague", c: [14.42, 50.09] }, { n: "Cracovie", c: [19.94, 50.06] }, { n: "Trieste", c: [13.77, 45.65] }, { n: "Sarajevo", c: [18.41, 43.86] }, { n: "Zagreb", c: [15.98, 45.81] }, { n: "Lemberg (Lviv)", c: [24.03, 49.84] }],
            capital: "Vienne (et Budapest, pour la Hongrie)",
            summary: "Après la défaite contre la Prusse à Sadowa (1866), l'Autriche des Habsbourg négocie avec les Hongrois le Compromis de 1867 : un seul souverain, François-Joseph (empereur d'Autriche et roi de Hongrie), mais deux États, deux parlements et trois ministères communs (affaires étrangères, guerre, finances). L'empire compte plus de dix peuples (Allemands, Hongrois, Tchèques, Polonais, Ukrainiens, Croates, Roumains, Slovaques, Slovènes, Serbes, Italiens), qui réclament de plus en plus de droits. Il annexe la Bosnie-Herzégovine en 1908. L'assassinat de l'héritier François-Ferdinand à Sarajevo (28 juin 1914) déclenche la Première Guerre mondiale. L'empire se disloque en octobre-novembre 1918, et les traités de Saint-Germain et de Trianon (1919-1920) créent l'Autriche, la Hongrie et la Tchécoslovaquie, et agrandissent la Roumanie, la Pologne, l'Italie et la Yougoslavie.",
            snapshots: [
                {
                    id: '1867', label: "Le Compromis austro-hongrois", year: 1867,
                    text: "En 1867, la monarchie des Habsbourg, qui a perdu la Lombardie (1859) et la Vénétie (1866) face à l'Italie, et l'hégémonie en Allemagne (Sadowa, 1866), devient une double monarchie. Elle comprend l'Autriche (Cisleithanie), la Hongrie (Transleithanie, avec la Croatie) et la Dalmatie.",
                    zones: [{ name: "Autriche-Hongrie (1867)", ring: [[9.6, 47.1], [10.5, 46.4], [12.4, 46.5], [13.7, 46.5], [13.6, 45.7], [13.6, 45.1], [14.5, 44.8], [15.2, 44.1], [16.5, 43.5], [17.5, 43.0], [18.5, 42.4], [17.7, 43.2], [16.4, 44.0], [15.7, 44.6], [16.0, 45.1], [17.0, 45.2], [18.0, 45.1], [19.0, 45.0], [20.3, 44.85], [21.5, 45.2], [22.5, 44.6], [22.7, 45.3], [24.0, 45.6], [25.5, 45.7], [26.4, 46.5], [25.6, 47.9], [26.7, 48.5], [26.3, 49.6], [24.6, 50.3], [23.5, 50.3], [22.5, 49.2], [21.0, 50.0], [19.8, 50.2], [18.5, 50.3], [17.1, 50.4], [16.4, 50.7], [15.0, 50.95], [14.3, 50.9], [13.2, 50.4], [12.1, 50.3], [12.5, 49.6], [13.2, 49.0], [13.8, 48.8], [13.0, 47.7], [12.2, 47.7], [10.5, 47.5]] }]
                },
                {
                    id: '1914', label: "À la veille de la Grande Guerre", year: 1914,
                    text: "En 1914, l'empire, avec 52 millions d'habitants, est la troisième puissance démographique d'Europe. La Bosnie-Herzégovine, administrée depuis 1878 et annexée en 1908, y est incluse : c'est là que l'archiduc François-Ferdinand est assassiné, à Sarajevo.",
                    zones: [{ name: "Autriche-Hongrie (1914)", ring: [[9.6, 47.1], [10.5, 46.4], [12.4, 46.5], [13.7, 46.5], [13.6, 45.7], [13.6, 45.1], [14.5, 44.8], [15.2, 44.1], [16.5, 43.5], [17.5, 43.0], [18.5, 42.4], [19.0, 43.3], [19.5, 43.6], [19.1, 44.5], [19.4, 44.9], [20.3, 44.85], [21.5, 45.2], [22.5, 44.6], [22.7, 45.3], [24.0, 45.6], [25.5, 45.7], [26.4, 46.5], [25.6, 47.9], [26.7, 48.5], [26.3, 49.6], [24.6, 50.3], [23.5, 50.3], [22.5, 49.2], [21.0, 50.0], [19.8, 50.2], [18.5, 50.3], [17.1, 50.4], [16.4, 50.7], [15.0, 50.95], [14.3, 50.9], [13.2, 50.4], [12.1, 50.3], [12.5, 49.6], [13.2, 49.0], [13.8, 48.8], [13.0, 47.7], [12.2, 47.7], [10.5, 47.5]] }]
                }
            ]
        },
        {
            id: 'colonial-francais', name: "Empire colonial français", icon: "🇫🇷", color: '#2563eb', span: "1534 → 1962 (et outre-mer actuel)", from: 1534, to: 1962, peak: 1930,
            places: [{ n: "Paris", c: [2.35, 48.86] }, { n: "Québec", c: [-71.21, 46.81] }, { n: "Alger", c: [3.06, 36.75] }, { n: "Dakar", c: [-17.47, 14.69] }, { n: "Hanoï", c: [105.85, 21.03] }, { n: "Tananarive", c: [47.52, -18.91] }, { n: "Pondichéry", c: [79.83, 11.93] }, { n: "Brazzaville", c: [15.28, -4.27] }],
            capital: "Paris",
            summary: "La France s'étend d'abord en Amérique (Jacques Cartier en 1534, Québec en 1608, Louisiane en 1682), aux Antilles (sucre, esclavage) et en Inde : c'est le « premier empire colonial », presque entièrement perdu en 1763 (traité de Paris) et avec l'indépendance d'Haïti (1804). Le « second empire colonial » naît avec la conquête de l'Algérie (1830), puis l'Indochine, la Tunisie (1881), l'Afrique occidentale et équatoriale, Madagascar (1896), le Maroc (1912) et, après 1919, les mandats sur la Syrie, le Liban, le Cameroun et le Togo. Vers 1930, il couvre plus de dix millions de km², soit près de vingt fois la France. Il disparaît pour l'essentiel après 1945 : Indochine (1954), Maroc et Tunisie (1956), Afrique noire et Madagascar (1960), Algérie (1962) ; les départements et territoires d'outre-mer actuels en sont l'héritage.",
            snapshots: [
                {
                    id: '1750', label: "Le premier empire colonial", year: 1750, legend: true,
                    text: "Vers 1750, la Nouvelle-France forme un immense arc, du Canada (vallée du Saint-Laurent) à la Louisiane, par les Grands Lacs et le Mississippi, très peu peuplé. À cela s'ajoutent les Antilles (Saint-Domingue, la plus riche colonie du monde, la Guadeloupe et la Martinique), et quelques comptoirs en Inde, au Sénégal et dans l'océan Indien. La perte du Canada (1763) y met fin.",
                    zones: [
                        { name: "Nouvelle-France (Canada et Louisiane)", ring: [[-89.5, 29.0], [-94.0, 29.5], [-97.0, 30.5], [-100.5, 33.5], [-103.5, 38.5], [-106.0, 43.0], [-108.0, 47.0], [-104.5, 49.0], [-95.0, 49.3], [-89.5, 48.3], [-84.0, 46.5], [-80.0, 45.7], [-76.0, 46.5], [-70.0, 47.5], [-70.5, 45.5], [-73.5, 45.0], [-75.5, 43.8], [-79.0, 43.2], [-81.5, 41.5], [-82.5, 39.0], [-85.0, 37.5], [-86.0, 36.0], [-88.0, 34.0], [-88.5, 31.0], [-89.0, 30.2]] },
                        { name: "Saint-Domingue", ring: [[-74.5, 18.4], [-73.4, 19.9], [-72.2, 19.9], [-71.8, 18.8], [-72.8, 18.1]] },
                        { name: "Guadeloupe", ring: [[-61.9, 16.5], [-61.0, 16.5], [-61.0, 15.9], [-61.8, 15.9]] },
                        { name: "Martinique", ring: [[-61.25, 14.9], [-60.8, 14.9], [-60.8, 14.4], [-61.2, 14.4]] },
                        { name: "Pondichéry", ring: [[79.6, 12.1], [80.1, 12.1], [80.1, 11.6], [79.6, 11.6]] }
                    ]
                },
                {
                    id: '1930', label: "Le second empire colonial à son apogée", year: 1930,
                    text: "Vers 1930, le second empire colonial couvre le Maghreb, l'Afrique-Occidentale et équatoriale, Madagascar, l'Indochine et les mandats du Proche-Orient. La métropole en est le centre politique, économique et culturel. La carte simplifie : les petites îles (Antilles, La Réunion, Polynésie, Nouvelle-Calédonie) et les comptoirs ne sont pas tous figurés.",
                    zones: [
                        { name: "Algérie, Tunisie et Maroc", ring: [[-13.0, 27.7], [-9.8, 31.5], [-8.5, 33.5], [-5.9, 35.8], [-2.0, 35.1], [2.0, 36.8], [8.6, 37.1], [10.5, 37.3], [11.2, 33.5], [11.5, 30.2], [9.4, 26.5], [12.2, 23.5], [8.5, 19.5], [4.0, 19.2], [-3.0, 18.9], [-5.5, 24.5], [-8.7, 27.2]] },
                        { name: "Afrique-Occidentale française", ring: [[-17.0, 21.0], [-13.0, 27.0], [-5.5, 24.5], [-3.0, 18.9], [4.0, 19.2], [8.5, 19.5], [12.0, 23.5], [15.8, 23.5], [15.5, 19.5], [14.0, 13.0], [11.0, 13.7], [8.0, 13.4], [4.0, 13.5], [3.2, 11.8], [2.5, 9.5], [1.7, 6.3], [-2.9, 5.2], [-7.5, 4.4], [-8.5, 4.6], [-11.0, 7.0], [-13.3, 9.3], [-14.5, 10.5], [-17.0, 12.5], [-18.2, 14.9]] },
                        { name: "Afrique-Équatoriale française", ring: [[9.0, 0.0], [9.3, -2.0], [11.0, -3.8], [12.2, -5.0], [14.5, -5.5], [15.5, -4.5], [16.2, -2.0], [17.5, 0.0], [18.5, 3.5], [22.0, 4.2], [24.0, 8.5], [25.0, 5.0], [27.5, 5.0], [24.0, 19.5], [15.5, 23.0], [15.5, 19.5], [14.0, 13.0], [15.2, 7.5], [16.2, 3.5], [16.0, 2.2], [11.3, 2.2], [9.3, 2.2]] },
                        { name: "Cameroun (mandat)", ring: [[8.6, 4.5], [9.7, 3.9], [11.3, 2.2], [16.0, 2.2], [16.2, 3.5], [15.2, 7.5], [14.8, 10.0], [14.2, 12.5], [13.2, 13.2], [12.0, 10.5], [10.0, 7.0], [8.8, 5.6]] },
                        { name: "Togo (mandat)", ring: [[0.9, 6.1], [1.8, 6.1], [1.6, 11.0], [0.1, 11.0]] },
                        { name: "Madagascar", ring: [[43.3, -16.5], [44.0, -20.0], [43.6, -23.0], [44.8, -25.3], [47.2, -25.1], [47.5, -22.0], [49.4, -18.0], [50.4, -15.5], [49.5, -12.2], [48.2, -13.5], [44.5, -16.3]] },
                        { name: "Côte française des Somalis", ring: [[41.8, 12.7], [43.4, 12.7], [43.0, 11.0], [42.0, 11.2]] },
                        { name: "Indochine", ring: [[101.1, 22.4], [105.0, 23.2], [108.0, 22.0], [106.7, 20.5], [105.8, 19.0], [106.5, 17.0], [108.5, 15.5], [109.3, 13.0], [109.3, 11.5], [106.8, 10.3], [105.0, 8.6], [104.5, 10.3], [103.0, 11.0], [102.4, 12.2], [102.8, 14.2], [105.2, 14.4], [105.5, 15.8], [104.5, 17.5], [102.5, 18.3], [101.2, 17.8], [100.8, 19.2], [101.2, 20.4], [100.1, 20.5]] },
                        { name: "Syrie et Liban (mandat)", ring: [[35.1, 33.1], [35.8, 34.6], [35.9, 36.5], [38.0, 36.8], [40.5, 37.1], [42.3, 37.2], [41.0, 34.5], [39.5, 33.0], [37.0, 32.3], [36.0, 32.8]] },
                        { name: "Guyane", ring: [[-54.0, 5.7], [-51.7, 4.3], [-51.7, 2.2], [-54.5, 2.2], [-54.0, 3.5]] }
                    ]
                }
            ]
        },
        {
            id: 'parthes', name: "Empire parthe (arsacide)", icon: "🏹", color: '#9a3412', span: "vers 247 av. J.-C. → 224", from: -247, to: 224, peak: -53,
            places: [{ n: "Nisa", c: [57.9, 37.95] }, { n: "Rhagès", c: [51.4, 35.6] }, { n: "Ecbatane", c: [48.5, 34.8] }, { n: "Suse", c: [48.25, 32.19] }, { n: "Ctésiphon", c: [44.58, 33.09] }, { n: "Doura-Europos", c: [40.73, 34.75] }, { n: "Merv", c: [62.19, 37.66] }, { n: "Carrhes", c: [39.03, 36.86] }],
            capital: "Nisa, puis Ctésiphon, sur le Tigre",
            summary: "Les Parthes sont un peuple cavalier venu des steppes de l'Est de la mer Caspienne. Vers 247 av. J.-C., leur chef Arsace s'empare de la province de Parthie, dans le nord-est de l'Iran, aux dépens des Séleucides, héritiers d'Alexandre. Mithridate Ier conquiert l'Iran et la Mésopotamie (Séleucie du Tigre en 141), puis Mithridate II porte l'empire jusqu'à l'Euphrate. Les archers parthes à cheval, qui tirent en arrière en feignant de fuir, écrasent les légions de Crassus à Carrhes en 53 av. J.-C. : l'Empire parthe est, face à Rome, la seule grande puissance de l'époque, et il tient les routes de la soie. Affaibli par les guerres romaines et les querelles de succession, il est renversé en 224 par un vassal perse, Ardachir, fondateur de la dynastie sassanide.",
            snapshots: [
                {
                    id: '-247', label: "La Parthie d'Arsace", year: -247,
                    text: "Vers 247 av. J.-C., Arsace et les Parnes, un peuple de cavaliers, occupent la Parthie (le nord-est de l'Iran actuel, autour de Nisa) et se révoltent contre les Séleucides. C'est un petit royaume, loin de l'empire qu'il deviendra.",
                    zones: [{ name: "Parthie (vers 247 av. J.-C.)", ring: [[54.0, 37.8], [56.5, 38.3], [59.0, 38.2], [60.8, 37.4], [60.5, 35.8], [59.0, 35.2], [57.0, 35.6], [55.0, 36.3]] }]
                },
                {
                    id: '-141', label: "Sous Mithridate Ier", year: -141,
                    text: "En 141 av. J.-C., Mithridate Ier entre à Séleucie du Tigre : les Parthes ont pris aux Séleucides l'Iran, puis la Mésopotamie. Ctésiphon, sur le Tigre en face de Séleucie, devient la résidence d'hiver des rois.",
                    zones: [{ name: "Empire parthe (vers 141 av. J.-C.)", ring: [[54.0, 38.0], [57.0, 38.3], [60.5, 37.6], [61.5, 35.5], [61.0, 33.0], [60.5, 31.0], [58.0, 29.0], [56.0, 27.0], [53.0, 27.5], [51.0, 29.0], [49.0, 30.0], [47.5, 30.5], [45.5, 31.0], [43.8, 32.0], [43.3, 33.5], [43.0, 35.0], [43.5, 36.5], [44.5, 37.5], [46.0, 38.5], [48.5, 38.5], [49.5, 37.2], [51.5, 36.8]] }]
                },
                {
                    id: '-53', label: "À Carrhes, face à Rome", year: -53,
                    text: "En 53 av. J.-C., à Carrhes, les cavaliers du général Surena détruisent l'armée du Romain Crassus. L'empire s'étend de l'Euphrate (où il touche les provinces romaines) à l'Asie centrale. Carrhes elle-même reste du côté romain.",
                    zones: [{ name: "Empire parthe (53 av. J.-C.)", ring: [[41.0, 36.5], [42.5, 37.8], [44.0, 39.0], [46.5, 39.5], [48.5, 38.8], [53.0, 38.0], [56.0, 38.3], [59.5, 38.0], [62.5, 38.0], [64.0, 36.5], [65.0, 34.5], [64.5, 32.0], [63.5, 30.0], [62.0, 27.0], [59.0, 25.5], [56.5, 27.0], [53.0, 26.7], [50.5, 28.5], [48.5, 29.8], [47.8, 29.8], [46.0, 30.0], [44.0, 30.5], [42.0, 32.0], [40.3, 33.5], [40.0, 35.0]] }]
                }
            ]
        },
        {
            id: 'sassanide', name: "Empire perse sassanide", icon: "🔥", color: '#0d9488', span: "224 → 651", from: 224, to: 651, peak: 620,
            places: [{ n: "Ctésiphon", c: [44.58, 33.09] }, { n: "Istakhr (Persépolis)", c: [52.9, 29.97] }, { n: "Gundishapur", c: [48.5, 32.27] }, { n: "Nisibe", c: [41.22, 37.07] }, { n: "Antioche", c: [36.16, 36.2] }, { n: "Alexandrie", c: [29.92, 31.2] }, { n: "Merv", c: [62.19, 37.66] }, { n: "Balkh", c: [66.9, 36.76] }, { n: "Derbent", c: [48.3, 42.06] }, { n: "Sanaa", c: [44.2, 15.35] }],
            capital: "Ctésiphon, sur le Tigre",
            summary: "En 224, Ardachir Ier, prince du Fars (le berceau des Perses), renverse le dernier roi parthe et fonde la dynastie sassanide, qui se veut l'héritière des Achéménides et fait du zoroastrisme la religion de l'État. Pendant quatre siècles, c'est le grand rival de Rome puis de Byzance : Chapour Ier capture l'empereur Valérien à Édesse en 260, Khosro Ier (531-579) réorganise l'État et l'impôt et s'empare du Yémen, Khosro II (590-628) conquiert la Syrie, la Palestine (Jérusalem, 614) et l'Égypte (619). Mais l'empereur Héraclius contre-attaque, et les deux empires, épuisés, s'écroulent devant les armées arabes (Qadisiyya vers 636, Nahavand en 642). Le dernier roi, Yazdegerd III, est assassiné en 651.",
            snapshots: [
                {
                    id: '260', label: "Sous Chapour Ier", year: 260, legend: true,
                    text: "Vers 260, Chapour Ier, fils d'Ardachir, a repoussé Rome : il prend Nisibe, vainc l'empereur Valérien à Édesse (260) et le capture, puis occupe pour un temps la Syrie. À l'est, il soumet les restes de l'empire kouchan. L'Iran, la Mésopotamie, l'Arménie et la Bactriane forment l'empire.",
                    zones: [{ name: "Empire sassanide (vers 260)", ring: [[40.5, 37.5], [42.5, 38.5], [44.5, 40.0], [47.5, 40.0], [49.5, 39.0], [53.0, 38.2], [57.0, 38.4], [61.0, 38.0], [65.0, 37.5], [67.5, 37.0], [68.0, 34.5], [66.0, 32.5], [64.0, 29.5], [62.0, 27.5], [58.0, 25.5], [56.5, 27.0], [53.0, 26.7], [50.5, 28.5], [48.5, 29.8], [47.8, 29.8], [46.0, 30.0], [43.5, 30.8], [41.5, 32.5], [40.3, 34.5]] }]
                },
                {
                    id: '560', label: "Sous Khosro Ier", year: 560, legend: true,
                    text: "Vers 560, Khosro Ier Anouchirvan est au sommet de la puissance sassanide : il tient les passes du Caucase (muraille de Derbent), a écrasé les Hephtalites à l'est, et envoie vers 570 une expédition au Yémen, qui chasse les Éthiopiens. C'est aussi l'âge d'or de la culture : l'académie de Gundishapur, l'impôt réformé.",
                    zones: [
                        { name: "Empire sassanide (vers 560)", ring: [[40.5, 37.5], [41.5, 39.5], [43.0, 41.5], [45.0, 42.0], [47.0, 42.4], [49.2, 42.4], [49.3, 40.5], [53.0, 38.2], [57.0, 38.4], [61.0, 38.0], [65.0, 37.5], [67.5, 37.0], [68.0, 34.5], [66.0, 32.5], [64.0, 29.5], [62.0, 27.5], [58.0, 25.5], [56.5, 27.0], [53.0, 26.7], [50.5, 28.5], [48.5, 29.8], [47.8, 29.8], [46.0, 30.0], [43.5, 30.8], [41.5, 32.5], [40.3, 34.5]] },
                        { name: "Yémen sassanide", ring: [[43.0, 16.5], [44.5, 17.5], [46.5, 16.0], [48.0, 14.5], [45.0, 12.8], [43.5, 13.5]] }
                    ]
                },
                {
                    id: '620', label: "Les conquêtes de Khosro II", year: 620, legend: true,
                    text: "Vers 620, Khosro II a pris la Syrie, Jérusalem (614), l'Égypte (619) et une large part de l'Anatolie : il tient presque tout l'ancien empire achéménide, de l'Égée à l'Indus. Ce sommet est de courte durée : dès 622, Héraclius contre-attaque et ruine l'empire en six ans.",
                    zones: [
                        { name: "Empire sassanide (vers 620)", ring: [[28.0, 41.0], [31.0, 41.4], [35.0, 42.4], [38.0, 42.0], [41.5, 42.0], [43.0, 42.5], [45.0, 42.5], [47.0, 42.5], [49.2, 42.4], [49.3, 40.5], [53.0, 38.2], [57.0, 38.4], [61.0, 38.0], [65.0, 37.5], [67.5, 37.0], [68.0, 34.5], [66.0, 32.5], [64.0, 29.5], [62.0, 27.5], [58.0, 25.5], [56.5, 27.0], [53.0, 26.7], [50.5, 28.5], [48.5, 29.8], [47.8, 29.8], [46.0, 29.5], [44.0, 29.5], [40.0, 29.8], [37.0, 29.5], [35.0, 29.5], [34.0, 27.5], [33.5, 24.5], [31.5, 22.5], [29.5, 23.5], [28.5, 26.5], [28.0, 29.5], [28.0, 31.5], [28.2, 36.0]] },
                        { name: "Yémen sassanide", ring: [[43.0, 16.5], [44.5, 17.5], [46.5, 16.0], [48.0, 14.5], [45.0, 12.8], [43.5, 13.5]] }
                    ]
                }
            ]
        },
        {
            id: 'zimbabwe', name: "Mapungubwe et Grand Zimbabwe", icon: "🪨", color: '#92400e', span: "vers 1075 → vers 1450", from: 1075, to: 1450, peak: 1350,
            places: [{ n: "Grand Zimbabwe", c: [30.93, -20.27] }, { n: "Mapungubwe", c: [29.4, -22.2] }, { n: "Khami", c: [28.6, -20.15] }, { n: "Tete", c: [33.58, -16.16] }, { n: "Sofala", c: [34.72, -20.2] }, { n: "Kilwa", c: [39.5, -8.96] }],
            capital: "Mapungubwe, puis Grand Zimbabwe",
            summary: "Dans le sud-est de l'Afrique, entre le Limpopo et le Zambèze, des royaumes shonas s'enrichissent par l'élevage du bétail et par l'or, qu'ils échangent avec les villes swahilies de la côte (Sofala, Kilwa) contre des perles, de la céramique chinoise et du verre perse. Mapungubwe (vers 1075-1220) en est le premier centre. Vers 1100-1450, Grand Zimbabwe (« les maisons de pierre » en shona) devient la capitale d'un État puissant : sa Grande Enceinte, en blocs de granit sans mortier, haute de plus de 10 mètres, est la plus grande construction de pierre d'Afrique au sud du Sahara. Il compte peut-être 18 000 habitants. La ville est abandonnée vers 1450 ; des royaumes issus d'elle (le Mutapa au nord, les Torwa à Khami) prennent le relais. L'archéologie a mis fin aux légendes coloniales qui l'attribuaient à des étrangers (Phéniciens, reine de Saba) : c'est bien une œuvre africaine.",
            snapshots: [
                {
                    id: '1150', label: "Mapungubwe", year: 1150,
                    text: "Vers 1150, Mapungubwe, au confluent du Limpopo et de la Chamdwe, est le premier royaume de la région : sa cour, installée sur une colline, thésaurise l'or (le fameux rhinocéros d'or) et le bétail, et commerce avec la côte de l'océan Indien.",
                    zones: [{ name: "Royaume de Mapungubwe", ring: [[28.4, -21.2], [30.0, -21.5], [31.0, -22.5], [30.0, -23.4], [28.5, -23.0], [27.8, -22.0]] }]
                },
                {
                    id: '1300', label: "Grand Zimbabwe", year: 1300,
                    text: "Vers 1300, le pouvoir s'est déplacé vers le plateau du Zimbabwe, plus riche en pâturages et en or. Grand Zimbabwe, sa capitale, domine un royaume qui s'étend de la vallée du Zambèze aux abords du Limpopo, et qui contrôle la route de l'or vers Sofala.",
                    zones: [{ name: "Royaume du Grand Zimbabwe", ring: [[28.5, -17.0], [31.5, -16.8], [33.0, -18.0], [33.5, -20.5], [32.0, -22.0], [29.5, -22.0], [28.0, -20.5]] }]
                },
                {
                    id: '1450', label: "Les héritiers : Mutapa et Torwa", year: 1450, legend: true,
                    text: "Vers 1450, Grand Zimbabwe est abandonnée. Au nord, le prince Mutota fonde le royaume du Mutapa (le « maître des mines »), qui contrôle la vallée du Zambèze et l'or ; au sud-ouest, une autre dynastie bâtit une nouvelle capitale à Khami, dans l'esprit des murs de pierre.",
                    zones: [
                        { name: "Royaume du Mutapa", ring: [[29.5, -15.5], [32.0, -15.0], [34.5, -16.0], [35.0, -18.5], [34.5, -20.5], [32.5, -19.0], [30.5, -18.0], [29.0, -17.0]] },
                        { name: "Royaume des Torwa (Khami)", ring: [[26.5, -19.0], [28.5, -19.0], [29.8, -20.5], [29.0, -22.0], [27.0, -21.5]] }
                    ]
                }
            ]
        },
        {
            id: 'khmer', name: "Empire khmer (Angkor)", icon: "🛕", color: '#d97706', span: "802 → 1431", from: 802, to: 1431, peak: 1200,
            places: [{ n: "Angkor Vat", c: [103.87, 13.41] }, { n: "Phnom Kulen", c: [104.1, 13.57] }, { n: "Phimai", c: [102.5, 15.22] }, { n: "Lopburi", c: [100.62, 14.8] }, { n: "Wat Phou", c: [105.83, 14.85] }, { n: "Vientiane", c: [102.6, 17.97] }, { n: "Phnom Penh", c: [104.92, 11.56] }],
            capital: "Hariharalaya, puis Angkor (Yasodharapura)",
            summary: "En 802, Jayavarman II se proclame « roi universel » sur le mont Kulen, au nord-est du Grand Lac (le Tonlé Sap) : c'est la naissance de l'Empire khmer. Ses rois, hindous (shivaïtes, vishnouïtes) puis bouddhistes, bâtissent Angkor, dont Suryavarman II élève au XIIe siècle le temple d'Angkor Vat, plus grand édifice religieux du monde. Le pouvoir repose sur un système de réservoirs (barays) et de canaux qui permet plusieurs récoltes de riz par an. Jayavarman VII (1181-vers 1218), bouddhiste, chasse les Chams qui avaient pillé Angkor, bâtit Angkor Thom et le Bayon, des routes, des hôpitaux : c'est l'apogée. Ensuite l'empire décline, et le royaume d'Ayutthaya (siamois) prend Angkor en 1431 : la cour se replie vers Phnom Penh.",
            snapshots: [
                {
                    id: '802', label: "Jayavarman II et le mont Kulen", year: 802,
                    text: "En 802, Jayavarman II, revenu de Java (selon la tradition), se fait consacrer sur le mont Kulen : il réunit les petits royaumes du bassin du Tonlé Sap et fonde la royauté khmère. Sa capitale, Hariharalaya, est à la limite du Grand Lac.",
                    zones: [{ name: "Royaume khmer (vers 802)", ring: [[102.5, 14.8], [104.8, 14.7], [105.5, 13.3], [105.0, 12.0], [103.5, 11.5], [102.4, 12.5]] }]
                },
                {
                    id: '1050', label: "Sous Suryavarman Ier", year: 1050,
                    text: "Vers 1050, Suryavarman Ier étend le royaume vers l'ouest et le nord : il prend Lopburi, dans la vallée de la Chao Phraya, et le plateau de Khorat, et tient le Mékong jusqu'à Wat Phou. Angkor est déjà la grande capitale, avec ses premiers temples-montagnes.",
                    zones: [{ name: "Empire khmer (vers 1050)", ring: [[100.2, 16.5], [102.5, 17.5], [104.5, 17.0], [106.5, 15.5], [106.5, 13.5], [106.0, 11.5], [104.5, 10.7], [102.5, 11.5], [101.5, 12.8], [100.5, 14.0]] }]
                },
                {
                    id: '1200', label: "L'apogée de Jayavarman VII", year: 1200,
                    text: "Vers 1200, Jayavarman VII règne sur la plus grande étendue de l'empire : du delta du Mékong au Laos, de la vallée de la Chao Phraya aux marges de la Birmanie, et occupe une partie du Champa à l'est. Le roi bâtisseur multiplie temples, hôpitaux et « maisons de repos » sur les routes.",
                    zones: [{ name: "Empire khmer (vers 1200)", ring: [[99.0, 19.0], [101.5, 19.8], [104.0, 19.0], [106.0, 18.0], [108.0, 16.0], [109.2, 14.0], [109.3, 12.0], [107.5, 10.5], [105.0, 8.7], [103.0, 10.5], [101.5, 11.0], [100.0, 13.5], [98.8, 16.0]] }]
                }
            ]
        },
        {
            id: 'japon', name: "Empire du Japon", icon: "🌅", color: '#e11d48', span: "1868 → 1945", from: 1868, to: 1945, peak: 1942,
            places: [{ n: "Tokyo", c: [139.69, 35.69] }, { n: "Kyoto", c: [135.77, 35.01] }, { n: "Séoul (Keijō)", c: [126.98, 37.57] }, { n: "Taipei", c: [121.56, 25.04] }, { n: "Port-Arthur", c: [121.25, 38.81] }, { n: "Changchun (Hsinking)", c: [125.32, 43.82] }, { n: "Nankin", c: [118.8, 32.06] }, { n: "Manille", c: [120.98, 14.6] }, { n: "Singapour", c: [103.85, 1.29] }, { n: "Rabaul", c: [152.17, -4.2] }],
            capital: "Tokyo",
            summary: "La restauration de Meiji (1868) met fin au shogunat des Tokugawa : le jeune empereur Mutsuhito s'installe à Tokyo, et le Japon se modernise à marche forcée (constitution de 1889, armée, industrie, école obligatoire). Il devient en trente ans une puissance coloniale : la guerre contre la Chine (1894-1895) lui donne Taïwan, la guerre contre la Russie (1904-1905) le sud de Sakhaline, la ferme de Port-Arthur et le protectorat sur la Corée, annexée en 1910. Après la Première Guerre mondiale, il reçoit les îles allemandes du Pacifique en mandat. À partir de 1931 (Mandchourie, puis guerre contre la Chine en 1937), un régime militariste entraîne le pays dans la Seconde Guerre mondiale : après Pearl Harbor (décembre 1941), il occupe en six mois l'Asie du Sud-Est, mais reflue dès Midway (1942), et capitule en août 1945, après Hiroshima et Nagasaki. L'empire est alors démantelé.",
            snapshots: [
                {
                    id: '1895', label: "Après la guerre contre la Chine", year: 1895, legend: true,
                    text: "En 1895, le traité de Shimonoseki, qui conclut la guerre contre la Chine des Qing, donne à Japon Taïwan (et la presqu'île du Liaodong, qu'il doit rendre sous la pression de la Russie, de la France et de l'Allemagne). L'archipel comprend déjà Hokkaido et les îles Ryukyu (Okinawa), annexées en 1879.",
                    zones: [
                        { name: "Archipel japonais", ring: [[130.0, 33.0], [130.0, 34.6], [132.0, 35.6], [135.5, 36.0], [137.0, 37.4], [139.0, 38.5], [140.2, 40.6], [141.7, 41.2], [142.0, 39.5], [141.0, 37.0], [140.8, 35.4], [139.8, 34.8], [137.5, 34.5], [136.0, 33.4], [134.5, 33.6], [133.0, 32.5], [131.8, 31.2], [130.3, 31.0]] },
                        { name: "Archipel japonais", ring: [[139.8, 42.5], [140.2, 43.4], [141.5, 45.4], [143.5, 44.2], [145.5, 43.4], [143.5, 42.0], [141.5, 41.8]] },
                        { name: "Archipel japonais", ring: [[127.6, 26.0], [128.5, 26.9], [128.5, 26.0], [127.8, 25.6]] },
                        { name: "Taïwan (depuis 1895)", color: '#fb7185', ring: [[120.0, 23.0], [120.2, 25.0], [121.6, 25.3], [122.0, 24.5], [121.0, 22.0]] }
                    ]
                },
                {
                    id: '1920', label: "Après la Première Guerre mondiale", year: 1920, legend: true,
                    text: "Vers 1920, l'empire compte, autour de l'archipel, Taïwan (1895), le sud de Sakhaline (Karafuto, 1905), le territoire à bail du Kwantung avec Port-Arthur (1905), la Corée (annexée en 1910) et, depuis 1919-1920, des îles du Pacifique allemandes reçues en mandat de la Société des Nations (Mariannes, Carolines, Marshall, trop petites pour figurer ici).",
                    zones: [
                        { name: "Archipel japonais", ring: [[130.0, 33.0], [130.0, 34.6], [132.0, 35.6], [135.5, 36.0], [137.0, 37.4], [139.0, 38.5], [140.2, 40.6], [141.7, 41.2], [142.0, 39.5], [141.0, 37.0], [140.8, 35.4], [139.8, 34.8], [137.5, 34.5], [136.0, 33.4], [134.5, 33.6], [133.0, 32.5], [131.8, 31.2], [130.3, 31.0]] },
                        { name: "Archipel japonais", ring: [[139.8, 42.5], [140.2, 43.4], [141.5, 45.4], [143.5, 44.2], [145.5, 43.4], [143.5, 42.0], [141.5, 41.8]] },
                        { name: "Archipel japonais", ring: [[127.6, 26.0], [128.5, 26.9], [128.5, 26.0], [127.8, 25.6]] },
                        { name: "Taïwan", color: '#fb7185', ring: [[120.0, 23.0], [120.2, 25.0], [121.6, 25.3], [122.0, 24.5], [121.0, 22.0]] },
                        { name: "Corée (annexée en 1910)", color: '#fb7185', ring: [[124.5, 38.0], [125.0, 39.8], [126.5, 41.0], [128.5, 42.0], [130.7, 42.4], [129.5, 40.5], [129.5, 38.0], [129.4, 35.4], [128.0, 34.7], [126.3, 34.4], [126.2, 36.6]] },
                        { name: "Sud de Sakhaline (Karafuto)", color: '#fb7185', ring: [[141.9, 46.0], [141.9, 48.5], [142.5, 50.0], [143.9, 49.0], [143.5, 46.5], [142.5, 46.2]] },
                        { name: "Kwantung (Port-Arthur)", color: '#fb7185', ring: [[120.8, 38.5], [122.6, 38.5], [122.6, 40.0], [121.0, 40.0]] }
                    ]
                },
                {
                    id: '1942', label: "À son extension maximale", year: 1942, legend: true,
                    text: "Vers mi-1942, le Japon occupe, en plus de son empire d'avant-guerre, le Mandchoukouo (un État fantoche en Mandchourie, depuis 1932), la Chine du Nord et de l'Est, l'Indochine, la Birmanie, la Malaisie et Singapour, les Philippines, les Indes néerlandaises et le nord de la Nouvelle-Guinée, ainsi que des archipels du Pacifique. La Thaïlande est alliée. C'est le moment de la « sphère de coprospérité de la grande Asie orientale ».",
                    zones: [
                        { name: "Archipel japonais", ring: [[130.0, 33.0], [130.0, 34.6], [132.0, 35.6], [135.5, 36.0], [137.0, 37.4], [139.0, 38.5], [140.2, 40.6], [141.7, 41.2], [142.0, 39.5], [141.0, 37.0], [140.8, 35.4], [139.8, 34.8], [137.5, 34.5], [136.0, 33.4], [134.5, 33.6], [133.0, 32.5], [131.8, 31.2], [130.3, 31.0]] },
                        { name: "Archipel japonais", ring: [[139.8, 42.5], [140.2, 43.4], [141.5, 45.4], [143.5, 44.2], [145.5, 43.4], [143.5, 42.0], [141.5, 41.8]] },
                        { name: "Archipel japonais", ring: [[127.6, 26.0], [128.5, 26.9], [128.5, 26.0], [127.8, 25.6]] },
                        { name: "Colonies d'avant-guerre", color: '#fb7185', ring: [[120.0, 23.0], [120.2, 25.0], [121.6, 25.3], [122.0, 24.5], [121.0, 22.0]] },
                        { name: "Colonies d'avant-guerre", color: '#fb7185', ring: [[124.5, 38.0], [125.0, 39.8], [126.5, 41.0], [128.5, 42.0], [130.7, 42.4], [129.5, 40.5], [129.5, 38.0], [129.4, 35.4], [128.0, 34.7], [126.3, 34.4], [126.2, 36.6]] },
                        { name: "Colonies d'avant-guerre", color: '#fb7185', ring: [[141.9, 46.0], [141.9, 48.5], [142.5, 50.0], [143.9, 49.0], [143.5, 46.5], [142.5, 46.2]] },
                        { name: "Colonies d'avant-guerre", color: '#fb7185', ring: [[120.8, 38.5], [122.6, 38.5], [122.6, 40.0], [121.0, 40.0]] },
                        { name: "Mandchoukouo et Chine occupée", color: '#f97316', ring: [[121.0, 53.3], [125.5, 53.2], [130.5, 49.0], [134.5, 48.0], [131.0, 44.0], [130.7, 42.4], [128.5, 42.0], [126.5, 41.0], [124.5, 40.0], [122.0, 40.8], [121.0, 40.0], [119.5, 39.0], [118.0, 38.2], [120.5, 37.8], [122.5, 37.2], [121.0, 35.0], [121.5, 32.5], [121.5, 30.0], [120.5, 27.0], [119.5, 25.5], [117.0, 23.5], [113.5, 22.2], [111.0, 21.5], [110.5, 23.5], [111.5, 26.0], [113.0, 29.5], [112.0, 32.5], [112.5, 35.5], [114.5, 38.5], [116.5, 40.5], [114.0, 41.5], [112.5, 43.0], [116.0, 45.0], [119.5, 47.0], [119.0, 50.0]] },
                        { name: "Asie du Sud-Est continentale (occupée ou alliée)", color: '#f59e0b', ring: [[93.5, 26.0], [97.0, 27.8], [98.5, 24.0], [101.0, 22.3], [104.0, 22.8], [106.5, 22.5], [108.0, 21.5], [107.0, 19.5], [108.5, 16.0], [109.3, 13.0], [109.2, 11.2], [106.5, 9.8], [105.0, 8.6], [104.5, 5.0], [104.4, 1.2], [103.5, 1.1], [101.0, 2.8], [100.0, 6.0], [98.3, 8.0], [98.6, 10.5], [97.7, 14.0], [95.0, 15.8], [94.3, 18.5], [93.5, 21.5], [92.5, 22.5]] },
                        { name: "Philippines et Indes néerlandaises", color: '#eab308', ring: [[119.8, 18.5], [122.3, 18.5], [122.0, 16.0], [124.0, 13.8], [123.0, 13.0], [121.0, 13.7], [120.0, 14.5]] },
                        { name: "Philippines et Indes néerlandaises", color: '#eab308', ring: [[122.0, 11.5], [125.5, 11.0], [126.5, 9.0], [126.2, 6.2], [124.0, 6.0], [122.0, 7.0], [122.0, 9.0]] },
                        { name: "Philippines et Indes néerlandaises", color: '#eab308', ring: [[95.3, 5.5], [98.0, 4.0], [100.5, 1.5], [104.5, -1.5], [106.0, -3.0], [105.8, -5.8], [102.5, -4.0], [99.5, -1.5], [96.5, 2.5]] },
                        { name: "Philippines et Indes néerlandaises", color: '#eab308', ring: [[105.2, -6.0], [108.5, -6.3], [112.5, -6.5], [114.5, -7.8], [112.0, -8.3], [108.0, -7.8], [106.0, -7.2]] },
                        { name: "Philippines et Indes néerlandaises", color: '#eab308', ring: [[109.0, 1.5], [111.0, 2.0], [114.5, 4.5], [117.0, 7.0], [119.0, 5.0], [117.5, 1.0], [116.5, -1.5], [116.0, -4.0], [113.0, -3.5], [110.0, -3.0], [109.0, -0.5]] },
                        { name: "Philippines et Indes néerlandaises", color: '#eab308', ring: [[119.5, -5.5], [119.0, -2.0], [119.8, 0.5], [121.5, 1.2], [124.8, 1.5], [124.5, 0.0], [122.0, -0.8], [123.2, -3.2], [122.0, -5.2], [120.3, -3.5], [120.3, -5.6]] },
                        { name: "Nord de la Nouvelle-Guinée et Bismarck", color: '#eab308', ring: [[131.0, -0.8], [135.0, -3.2], [138.5, -4.0], [141.0, -2.6], [144.5, -3.8], [147.5, -6.0], [148.5, -8.0], [145.0, -6.5], [142.5, -8.5], [141.0, -9.0], [138.0, -8.2], [135.0, -4.5], [132.5, -4.0], [131.0, -2.0]] },
                        { name: "Nord de la Nouvelle-Guinée et Bismarck", color: '#eab308', ring: [[148.0, -5.5], [150.5, -5.0], [152.6, -3.8], [152.2, -4.8], [151.0, -5.8], [149.5, -6.2]] }
                    ]
                }
            ]
        },
        {
            id: 'allemand', name: "Empire allemand (Deuxième Reich)", icon: "🦅", color: '#52525b', span: "1871 → 1918", from: 1871, to: 1918, peak: 1914,
            places: [{ n: "Berlin", c: [13.4, 52.52] }, { n: "Hambourg", c: [9.99, 53.55] }, { n: "Munich", c: [11.58, 48.14] }, { n: "Strasbourg", c: [7.75, 48.58] }, { n: "Metz", c: [6.18, 49.12] }, { n: "Königsberg", c: [20.5, 54.7] }, { n: "Breslau", c: [17.03, 51.11] }, { n: "Posen", c: [16.93, 52.41] }, { n: "Windhoek", c: [17.08, -22.56] }, { n: "Dar es Salaam", c: [39.28, -6.8] }, { n: "Douala", c: [9.7, 4.05] }, { n: "Lomé", c: [1.22, 6.13] }, { n: "Qingdao (Tsingtao)", c: [120.38, 36.07] }],
            capital: "Berlin",
            summary: "Le 18 janvier 1871, en pleine guerre contre la France, les princes allemands proclament le roi de Prusse, Guillaume Ier, empereur allemand dans la galerie des Glaces de Versailles. L'Empire est l'œuvre du chancelier Bismarck : il réunit 25 États (royaumes, grands-duchés, villes libres) autour de la Prusse, sans l'Autriche, et prend à la France l'Alsace et une partie de la Lorraine (l'Alsace-Lorraine, « terre d'Empire »). En vingt ans, l'Allemagne devient la première puissance industrielle d'Europe. Guillaume II (1888-1918) veut aussi un empire colonial et une flotte : Togo, Cameroun, Sud-Ouest africain, Afrique orientale, Kiautschou en Chine, Nouvelle-Guinée et îles du Pacifique. L'Empire entre en guerre en 1914 ; il impose à la Russie la paix de Brest-Litovsk (mars 1918), puis s'effondre en novembre : l'empereur abdique, la République est proclamée.",
            snapshots: [
                {
                    id: '1871', label: "La proclamation à Versailles", year: 1871,
                    text: "En 1871, l'Empire allemand comprend la Prusse (avec ses annexions de 1866), la Bavière, la Saxe, le Wurtemberg et les autres États du sud, auxquels s'ajoute l'Alsace-Lorraine prise à la France. L'Autriche, vaincue en 1866, reste à l'écart : c'est la solution « petite-allemande ».",
                    zones: [{ name: "Empire allemand (1871)", ring: [[7.0, 47.5], [7.6, 47.58], [8.6, 47.65], [9.6, 47.55], [10.2, 47.3], [10.9, 47.5], [12.2, 47.6], [13.0, 47.45], [13.1, 48.4], [13.8, 48.75], [12.9, 49.3], [12.1, 50.2], [12.9, 50.4], [14.6, 50.9], [15.5, 50.8], [16.4, 50.4], [16.9, 50.2], [18.0, 50.1], [18.8, 50.3], [19.0, 50.7], [18.3, 51.2], [17.9, 52.3], [18.5, 52.9], [19.6, 53.3], [20.4, 53.6], [22.0, 53.9], [22.8, 54.4], [22.7, 55.1], [21.1, 55.9], [19.5, 54.8], [16.5, 54.8], [14.2, 54.2], [12.0, 54.5], [10.9, 54.3], [10.0, 54.8], [9.3, 55.0], [8.5, 55.0], [8.5, 53.9], [7.3, 53.9], [6.9, 53.5], [7.1, 52.5], [6.8, 52.1], [6.0, 51.9], [5.9, 50.8], [6.3, 49.9], [5.9, 49.2], [6.3, 48.7], [6.9, 48.35], [7.05, 47.9]] }]
                },
                {
                    id: '1914', label: "À la veille de la guerre, avec ses colonies", year: 1914, legend: true,
                    text: "En 1914, l'Empire compte 65 millions d'habitants en Europe et s'est donné des colonies depuis 1884 : le Togo, le Cameroun (agrandi du « Neukamerun » en 1911), le Sud-Ouest africain (la Namibie actuelle), l'Afrique orientale allemande (Tanzanie, Rwanda, Burundi), la concession de Kiautschou en Chine (1898), et des îles du Pacifique (Samoa, Micronésie, Nouvelle-Guinée allemande, trop petites ou dispersées pour figurer toutes ici). Elles sont toutes perdues pendant la guerre.",
                    zones: [
                        { name: "Reich allemand", ring: [[7.0, 47.5], [7.6, 47.58], [8.6, 47.65], [9.6, 47.55], [10.2, 47.3], [10.9, 47.5], [12.2, 47.6], [13.0, 47.45], [13.1, 48.4], [13.8, 48.75], [12.9, 49.3], [12.1, 50.2], [12.9, 50.4], [14.6, 50.9], [15.5, 50.8], [16.4, 50.4], [16.9, 50.2], [18.0, 50.1], [18.8, 50.3], [19.0, 50.7], [18.3, 51.2], [17.9, 52.3], [18.5, 52.9], [19.6, 53.3], [20.4, 53.6], [22.0, 53.9], [22.8, 54.4], [22.7, 55.1], [21.1, 55.9], [19.5, 54.8], [16.5, 54.8], [14.2, 54.2], [12.0, 54.5], [10.9, 54.3], [10.0, 54.8], [9.3, 55.0], [8.5, 55.0], [8.5, 53.9], [7.3, 53.9], [6.9, 53.5], [7.1, 52.5], [6.8, 52.1], [6.0, 51.9], [5.9, 50.8], [6.3, 49.9], [5.9, 49.2], [6.3, 48.7], [6.9, 48.35], [7.05, 47.9]] },
                        { name: "Togo", color: '#a1a1aa', ring: [[0.8, 5.9], [1.8, 5.9], [1.6, 11.0], [0.1, 11.0]] },
                        { name: "Cameroun", color: '#a1a1aa', ring: [[8.5, 4.6], [9.5, 3.7], [9.8, 2.3], [11.3, 2.2], [14.5, 1.5], [16.2, 1.8], [16.0, 3.5], [15.2, 7.5], [14.8, 10.0], [14.2, 12.5], [13.2, 13.2], [12.0, 10.5], [10.0, 7.0], [9.0, 6.0]] },
                        { name: "Sud-Ouest africain", color: '#a1a1aa', ring: [[11.75, -17.3], [20.0, -17.8], [20.0, -22.0], [20.0, -24.9], [19.0, -28.0], [17.2, -28.8], [16.45, -28.6], [15.0, -27.0], [14.4, -22.5], [11.8, -17.8]] },
                        { name: "Afrique orientale allemande", color: '#a1a1aa', ring: [[29.2, -1.1], [30.5, -1.0], [33.9, -1.0], [34.1, -2.5], [37.6, -3.0], [39.8, -4.7], [40.0, -7.0], [40.6, -9.8], [40.6, -10.7], [38.0, -11.3], [36.0, -11.6], [34.6, -11.5], [34.0, -9.8], [33.0, -9.3], [32.3, -9.2], [30.8, -8.3], [29.5, -6.5], [29.2, -4.5], [29.0, -3.3]] },
                        { name: "Kiautschou (Tsingtao)", color: '#a1a1aa', ring: [[119.7, 35.6], [120.8, 35.6], [120.8, 36.6], [119.7, 36.6]] },
                        { name: "Nouvelle-Guinée allemande", color: '#a1a1aa', ring: [[141.0, -2.6], [144.5, -3.8], [147.5, -6.0], [148.5, -8.0], [145.5, -6.6], [143.0, -4.5], [141.0, -5.0]] },
                        { name: "Nouvelle-Guinée allemande", color: '#a1a1aa', ring: [[148.0, -5.5], [150.5, -5.0], [152.6, -3.8], [152.2, -4.8], [151.0, -5.8], [149.5, -6.2]] }
                    ]
                },
                {
                    id: '1918', label: "Après Brest-Litovsk", year: 1918, legend: true,
                    text: "En mars 1918, la paix de Brest-Litovsk impose à la Russie bolchevique de renoncer à la Pologne, aux pays baltes, à la Biélorussie et à l'Ukraine : l'armée allemande les occupe ou y installe des gouvernements dépendants, sous le régime de l'Ober Ost. C'est le sommet territorial de l'Empire, quelques mois avant sa chute. Les colonies d'Afrique et d'Asie ne tiennent plus, sauf l'Afrique orientale de Lettow-Vorbeck.",
                    zones: [
                        { name: "Reich allemand", ring: [[7.0, 47.5], [7.6, 47.58], [8.6, 47.65], [9.6, 47.55], [10.2, 47.3], [10.9, 47.5], [12.2, 47.6], [13.0, 47.45], [13.1, 48.4], [13.8, 48.75], [12.9, 49.3], [12.1, 50.2], [12.9, 50.4], [14.6, 50.9], [15.5, 50.8], [16.4, 50.4], [16.9, 50.2], [18.0, 50.1], [18.8, 50.3], [19.0, 50.7], [18.3, 51.2], [17.9, 52.3], [18.5, 52.9], [19.6, 53.3], [20.4, 53.6], [22.0, 53.9], [22.8, 54.4], [22.7, 55.1], [21.1, 55.9], [19.5, 54.8], [16.5, 54.8], [14.2, 54.2], [12.0, 54.5], [10.9, 54.3], [10.0, 54.8], [9.3, 55.0], [8.5, 55.0], [8.5, 53.9], [7.3, 53.9], [6.9, 53.5], [7.1, 52.5], [6.8, 52.1], [6.0, 51.9], [5.9, 50.8], [6.3, 49.9], [5.9, 49.2], [6.3, 48.7], [6.9, 48.35], [7.05, 47.9]] },
                        { name: "Territoires de l'Est sous contrôle allemand", color: '#a1a1aa', ring: [[22.7, 55.1], [21.0, 56.0], [21.5, 57.8], [23.5, 59.2], [27.5, 59.5], [28.2, 57.0], [30.5, 55.5], [31.5, 53.5], [34.0, 52.2], [35.5, 50.5], [38.0, 49.5], [38.3, 47.2], [37.0, 46.5], [35.0, 46.5], [32.0, 46.5], [30.0, 45.8], [29.6, 45.4], [28.2, 47.8], [26.8, 48.3], [24.5, 48.4], [24.0, 50.0], [22.0, 50.8], [19.0, 50.7], [18.3, 51.2], [17.9, 52.3], [18.5, 52.9], [19.6, 53.3], [20.4, 53.6], [22.0, 53.9], [22.8, 54.4]] }
                    ]
                }
            ]
        },
        {
            id: 'prusse', name: "Royaume de Prusse", icon: "🪖", color: '#1e3a8a', span: "1701 → 1918 (dissous en 1947)", from: 1701, to: 1918, peak: 1866,
            places: [{ n: "Berlin", c: [13.4, 52.52] }, { n: "Potsdam", c: [13.06, 52.4] }, { n: "Königsberg", c: [20.5, 54.7] }, { n: "Breslau", c: [17.03, 51.11] }, { n: "Posen", c: [16.93, 52.41] }, { n: "Danzig", c: [18.65, 54.35] }, { n: "Clèves", c: [6.14, 51.79] }, { n: "Cologne", c: [6.96, 50.94] }, { n: "Magdebourg", c: [11.63, 52.12] }, { n: "Hanovre", c: [9.73, 52.37] }, { n: "Francfort", c: [8.68, 50.11] }, { n: "Kiel", c: [10.14, 54.32] }],
            capital: "Berlin (et Potsdam)",
            summary: "Le Brandebourg, un petit État sableux du nord de l'Allemagne, s'agrandit par mariages et héritages, puis devient la Prusse : en 1701, l'électeur Frédéric III se couronne « roi en Prusse » à Königsberg (Frédéric Ier). Frédéric-Guillaume Ier, le « roi-sergent », lui donne une armée disciplinée et une administration efficace ; Frédéric II le Grand (1740-1786) s'empare de la Silésie, bat l'Autriche, la France et la Russie pendant la guerre de Sept Ans et partage la Pologne (1772). Battue par Napoléon à Iéna (1806), la Prusse se réforme et revient plus grande au congrès de Vienne (1815), avec la Rhénanie, la Westphalie et la Saxe du nord. Sous Bismarck, elle bat l'Autriche à Sadowa (1866), annexe le Hanovre, la Hesse, Nassau et Francfort, puis fait l'unité allemande autour d'elle en 1871. Elle couvre alors les deux tiers du Reich. Le royaume disparaît avec la monarchie en 1918, l'État prussien est dissous en 1947.",
            snapshots: [
                {
                    id: '1701', label: "Le royaume de 1701", year: 1701, legend: true,
                    text: "En 1701, l'électeur de Brandebourg se couronne roi « en Prusse » : sa couronne vient du duché de Prusse, hors du Saint-Empire. Ses États sont dispersés : le Brandebourg et la Poméranie (avec Berlin) au centre, le duché de Prusse (Königsberg) loin à l'est, et des terres sur le Rhin (Clèves, Mark, Minden).",
                    zones: [
                        { name: "Brandebourg et Poméranie", ring: [[11.0, 52.0], [11.1, 53.0], [12.5, 53.9], [14.2, 54.1], [15.6, 54.3], [17.0, 54.5], [17.8, 54.0], [17.5, 53.3], [16.0, 53.0], [15.2, 52.2], [14.8, 51.5], [13.5, 51.6], [12.3, 51.7]] },
                        { name: "Duché de Prusse (Königsberg)", ring: [[19.4, 54.4], [19.5, 54.8], [21.1, 55.3], [22.8, 55.1], [22.9, 54.3], [22.5, 53.7], [21.0, 53.5], [19.7, 53.9]] },
                        { name: "Clèves, Mark et Minden", ring: [[6.0, 51.9], [8.7, 52.4], [8.8, 51.6], [7.0, 51.2], [6.0, 51.4]] }
                    ]
                },
                {
                    id: '1786', label: "À la mort de Frédéric le Grand", year: 1786, legend: true,
                    text: "En 1786, Frédéric II laisse un État bien plus grand : la Silésie, prise à l'Autriche en 1740-1742, la Prusse royale (la Prusse occidentale, reçue au premier partage de la Pologne, 1772) qui relie enfin le Brandebourg à Königsberg, et la Frise orientale. Danzig et Thorn, polonaises, ne sont pas encore prussiennes (1793).",
                    zones: [
                        { name: "Prusse de 1786", ring: [[11.0, 52.0], [11.1, 53.0], [12.5, 53.9], [14.2, 54.1], [15.6, 54.4], [17.6, 54.8], [18.25, 54.8], [18.3, 54.25], [19.0, 54.25], [19.1, 54.85], [20.0, 55.0], [21.1, 55.3], [22.8, 55.1], [22.9, 54.3], [23.2, 53.9], [22.5, 53.4], [20.5, 53.0], [19.5, 52.8], [18.0, 52.8], [16.8, 52.7], [16.1, 52.0], [17.3, 51.5], [18.3, 51.0], [19.0, 50.4], [18.9, 50.1], [17.6, 50.0], [16.6, 50.3], [15.4, 50.8], [14.95, 51.0], [14.9, 51.5], [13.5, 51.5], [12.3, 51.7]] },
                        { name: "Terres de l'Ouest (Clèves, Mark, Minden)", ring: [[6.0, 51.9], [8.7, 52.4], [8.8, 51.6], [7.0, 51.2], [6.0, 51.4]] },
                        { name: "Terres de l'Ouest (Clèves, Mark, Minden)", ring: [[6.9, 53.4], [7.9, 53.7], [7.9, 53.2], [7.2, 53.0]] }
                    ]
                },
                {
                    id: '1815', label: "Après le congrès de Vienne", year: 1815, legend: true,
                    text: "En 1815, la Prusse, victorieuse de Napoléon, reçoit au congrès de Vienne la moitié nord de la Saxe, la Westphalie et la Rhénanie, qui en font une puissance de l'Ouest comme de l'Est : elle est désormais frontalière de la France. Elle a aussi retrouvé Posen et Danzig (qu'elle avait pris en 1793-1795, aux deuxième et troisième partages de la Pologne). Son territoire est en deux morceaux, séparés par le Hanovre.",
                    zones: [
                        { name: "Prusse orientale et centrale", ring: [[10.0, 51.6], [10.9, 52.5], [11.1, 53.1], [12.5, 54.0], [14.2, 54.3], [16.0, 54.6], [18.0, 54.85], [19.6, 54.7], [20.5, 55.0], [21.1, 55.3], [22.8, 55.1], [22.9, 54.3], [23.2, 53.9], [22.5, 53.4], [20.5, 53.0], [19.6, 52.7], [18.5, 52.3], [18.3, 51.6], [19.0, 50.8], [19.0, 50.3], [18.9, 50.1], [17.6, 50.0], [16.6, 50.3], [15.4, 50.8], [14.95, 51.0], [14.9, 51.5], [13.5, 51.45], [12.6, 51.3], [12.2, 51.1], [11.6, 50.9], [11.0, 50.8], [10.4, 50.9], [10.0, 51.3]] },
                        { name: "Rhénanie et Westphalie", ring: [[6.3, 49.4], [6.2, 50.2], [6.0, 50.8], [5.9, 51.4], [5.95, 51.9], [6.9, 52.4], [7.7, 52.55], [9.0, 52.5], [9.2, 52.0], [8.7, 51.4], [8.4, 50.9], [8.2, 50.4], [7.9, 50.0], [7.5, 49.6], [7.2, 49.2], [6.8, 49.15]] }
                    ]
                },
                {
                    id: '1866', label: "Après Sadowa", year: 1866, legend: true,
                    text: "En 1866, après sa victoire sur l'Autriche, la Prusse annexe le royaume de Hanovre, la Hesse-Cassel, Nassau, la ville libre de Francfort et le Schleswig-Holstein (pris au Danemark en 1864) : ses deux morceaux se rejoignent, elle devient un État compact qui coupe l'Allemagne en deux et s'impose à tous les États du nord. La Confédération de l'Allemagne du Nord, sous son autorité, est le prélude de l'Empire.",
                    zones: [
                        { name: "Prusse d'avant 1866", ring: [[10.0, 51.6], [10.9, 52.5], [11.1, 53.1], [12.5, 54.0], [14.2, 54.3], [16.0, 54.6], [18.0, 54.85], [19.6, 54.7], [20.5, 55.0], [21.1, 55.3], [22.8, 55.1], [22.9, 54.3], [23.2, 53.9], [22.5, 53.4], [20.5, 53.0], [19.6, 52.7], [18.5, 52.3], [18.3, 51.6], [19.0, 50.8], [19.0, 50.3], [18.9, 50.1], [17.6, 50.0], [16.6, 50.3], [15.4, 50.8], [14.95, 51.0], [14.9, 51.5], [13.5, 51.45], [12.6, 51.3], [12.2, 51.1], [11.6, 50.9], [11.0, 50.8], [10.4, 50.9], [10.0, 51.3]] },
                        { name: "Prusse d'avant 1866", ring: [[6.3, 49.4], [6.2, 50.2], [6.0, 50.8], [5.9, 51.4], [5.95, 51.9], [6.9, 52.4], [7.7, 52.55], [9.0, 52.5], [9.2, 52.0], [8.7, 51.4], [8.4, 50.9], [8.2, 50.4], [7.9, 50.0], [7.5, 49.6], [7.2, 49.2], [6.8, 49.15]] },
                        { name: "Annexions de 1866 (Hanovre, Hesse, Nassau, Schleswig-Holstein)", color: '#60a5fa', ring: [[7.0, 52.7], [7.2, 53.4], [8.4, 53.7], [8.7, 53.95], [8.6, 54.9], [9.4, 55.0], [10.4, 54.7], [11.0, 54.4], [10.9, 53.9], [10.6, 53.5], [11.1, 53.1], [10.9, 52.5], [10.0, 51.6], [9.9, 50.8], [9.4, 50.2], [8.9, 49.95], [8.0, 49.95], [8.2, 50.4], [8.4, 50.9], [8.7, 51.4], [9.2, 52.0], [9.0, 52.5], [7.7, 52.55]] }
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

    // --- Le classement : par époque de l'apogée ------------------------------------------------------
    // Trente-six entités ne tiennent pas sur une rangée de puces : on les range selon l'année de leur apogée (`peak`), en tranches neutres
    // (sans « Antiquité » ou « Moyen Âge », qui sont des termes européens) ; l'écran en fait les groupes d'un menu déroulant.
    var CATEGORIES = [
        { id: 'avant-500', label: 'Jusqu\'à 500', title: 'Apogée jusqu\'en 500', to: 500 },
        { id: '500-1500', label: '500 – 1500', title: 'Apogée entre 500 et 1500', to: 1500 },
        { id: '1500-1800', label: '1500 – 1800', title: 'Apogée entre 1500 et 1800', to: 1800 },
        { id: 'depuis-1800', label: 'Depuis 1800', title: 'Apogée depuis 1800', to: Infinity }
    ];

    function categoryOf(entity) {
        for (var i = 0; i < CATEGORIES.length; i++) if (entity.peak <= CATEGORIES[i].to) return CATEGORIES[i].id;
        return CATEGORIES[CATEGORIES.length - 1].id;
    }

    // La légende (la liste des zones) n'a d'intérêt que si les zones se distinguent par la couleur, ou si l'instantané le demande
    // (plusieurs zones de même couleur mais nommées : les reconquêtes de Justinien).
    function legendNeeded(entity, snapshot) {
        if (snapshot.zones.length < 2) return false;
        if (snapshot.legend === true) return true;
        var colors = {};
        snapshot.zones.forEach(function (zone) { colors[zone.color || entity.color] = true; });
        return Object.keys(colors).length > 1;
    }

    // --- Le curseur temporel -----------------------------------------------------------------------------
    // Une échelle qui n'est pas régulière : 3 500 ans de 3500 av. J.-C. à l'an 1000 d'un côté, et 500 ans par tranche de 250 crans de l'autre,
    // sinon tout le XIXe siècle tiendrait en un cran. Les années sont en « années astronomiques » (an 1 av. J.-C. = 0) pour interpoler, puis
    // reconverties en années signées (pas d'an 0).
    var SLIDER_MAX = 1000;
    var SCALE_YEARS = [-3499, -999, 0, 1000, 1500, 2000];
    var SCALE_POSITIONS = [0, 150, 350, 600, 750, 1000];

    function astroToYear(a) { return a <= 0 ? a - 1 : a; }
    function yearToAstro(y) { return y < 0 ? y + 1 : y; }

    function positionToYear(position) {
        var p = Math.max(0, Math.min(SLIDER_MAX, position));
        for (var i = 1; i < SCALE_POSITIONS.length; i++) {
            if (p <= SCALE_POSITIONS[i]) {
                var f = (p - SCALE_POSITIONS[i - 1]) / (SCALE_POSITIONS[i] - SCALE_POSITIONS[i - 1]);
                return astroToYear(Math.round(SCALE_YEARS[i - 1] + f * (SCALE_YEARS[i] - SCALE_YEARS[i - 1])));
            }
        }
        return 2000;
    }

    function yearToPosition(year) {
        var a = Math.max(SCALE_YEARS[0], Math.min(SCALE_YEARS[SCALE_YEARS.length - 1], yearToAstro(year)));
        for (var i = 1; i < SCALE_YEARS.length; i++) {
            if (a <= SCALE_YEARS[i]) {
                var f = (a - SCALE_YEARS[i - 1]) / (SCALE_YEARS[i] - SCALE_YEARS[i - 1]);
                return Math.round(SCALE_POSITIONS[i - 1] + f * (SCALE_POSITIONS[i] - SCALE_POSITIONS[i - 1]));
            }
        }
        return SLIDER_MAX;
    }

    // Les entités qui existent une année donnée, chacune avec la carte la plus proche dans le temps (la plus ancienne en cas d'égalité) :
    // une carte n'est qu'un instantané, et le plus fidèle est celui qui en est le plus près. `since` : années écoulées depuis cette carte
    // (négatif : la carte est postérieure).
    function activeAt(year) {
        var result = [];
        ENTITIES.forEach(function (entity) {
            if (!inSpan(entity, year)) return;
            var chosen = entity.snapshots[0];
            entity.snapshots.forEach(function (snapshot) {
                if (Math.abs(yearToAstro(snapshot.year) - yearToAstro(year)) < Math.abs(yearToAstro(chosen.year) - yearToAstro(year))) chosen = snapshot;
            });
            result.push({ entity: entity, snapshot: chosen, since: yearToAstro(year) - yearToAstro(chosen.year) });
        });
        return result;
    }

    return {
        ENTITIES: ENTITIES, entityById: entityById, snapshotOf: snapshotOf, closeRing: closeRing, snapshotFeatures: snapshotFeatures,
        snapshotGeometry: snapshotGeometry, selfIntersection: selfIntersection, inSpan: inSpan,
        CATEGORIES: CATEGORIES, categoryOf: categoryOf, legendNeeded: legendNeeded, SLIDER_MAX: SLIDER_MAX, positionToYear: positionToYear, yearToPosition: yearToPosition, activeAt: activeAt
    };
}));
