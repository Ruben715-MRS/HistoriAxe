// =========================================================================
// === LES CARTES BIBLIQUES — DONNÉES ET RÈGLES (outil de l'Atelier) ===
// =========================================================================
// Quatre cartes du Levant, refaites à la main d'après un ouvrage de référence en culture biblique : les lieux où Abraham a séjourné, la
// guerre des rois (Genèse 14), les lieux de Jacob et de ses enfants, et les quarante-deux étapes du désert (Nombres 33). Comme les cartes
// historiques (js/historyMapsCore.js), tout est dessiné à la main, donc approximatif : une position est un repère, pas un relevé. Là où
// l'ouvrage met un point d'interrogation (`doubt: true`), l'emplacement est discuté. Les noms hébreux sont sans voyelles, comme dans
// js/genealogyCore.js.
//
// Une carte peut aussi avoir des `zones` (des polygones colorés, ex. les tribus) : { id, color, ring, dan?, variant? }.
// Un lieu : { id, kind, lv, views, note, ref, altar, num, side, doubt, n, he, c } où `kind` est 'city' (un point et son nom), 'region' (un
// nom posé sur la carte), 'water' (un nom en italique), 'mountain', 'altar' (une flamme seule) ou 'war' (une bataille). `lv` (0 par défaut)
// est le niveau de détail : un lieu de niveau 1 n'apparaît qu'après un zoom, pour que les noms ne s'empilent pas. `views` restreint un lieu
// à certaines vues ; une vue `full` (un détail) les montre tous, une vue `top` (un aperçu) ne montre que les lieux `top`, le reste au zoom, une vue `dense` (les étapes du désert) laisse les noms de côté, sauf pour les lieux `key` (`true`, ou la liste des vues où ils gardent leur nom), et une vue `all`
// montre tous les numéros d'étapes. `icon` remplace le point par un emoji, `offshore` pose l'étiquette d'une zone hors de son contour (une bande trop étroite), `wide` élargit l'étiquette (un nom long). Les noms et positions communs à plusieurs cartes sont dans PLACES ; chaque carte les reprend par `id`.
// Pur, sans DOM : testé dans tests/biblicalMapsCore.test.js (positions dans les vues, sur la terre, identifiants).
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.BiblicalMapsCore = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // --- Les lieux communs : nom, nom hébreu, position [lon, lat] ---------------------------------------
    var PLACES = {
        ur: { n: 'Our Kasdim', he: 'אור כשדים', c: [46.10, 30.96] },
        haran: { n: "'Haran", he: 'חרן', c: [39.03, 36.87] },
        damas: { n: 'Damas', he: 'דמשק', c: [36.29, 33.51] },
        jerusalem: { n: 'Jérusalem', he: 'ירושלים', c: [35.22, 31.78] },
        hebron: { n: 'Kiriat Arba / Hébron', he: 'חברון / קרית ארבע', c: [35.10, 31.53] },
        chekhem: { n: 'Chékhem', he: 'שכם', c: [35.28, 32.21] },
        beitel: { n: 'Beit-El / Louz', he: 'בית־אל / לוז', c: [35.19, 31.95] },
        beersheva: { n: 'Béer-Chéva', he: 'באר שבע', c: [34.79, 31.25] },
        kadesh: { n: 'Kadèch Barnéa', he: 'קדש ברנע', c: [34.43, 30.69] },
        tsoar: { n: 'Tsoar', he: 'צער', c: [35.50, 30.92] },
        dotan: { n: 'Dotan', he: 'דתן', c: [35.17, 32.42] }
    };

    // --- Les eaux : dessinées sur toutes les cartes (le fond de terre vient des pays actuels, qui ne montrent ni lacs ni fleuves) ---
    var HYDRO = {
        lakes: [
            { id: 'mer-morte', ring: [[35.48, 31.77], [35.53, 31.70], [35.57, 31.55], [35.55, 31.40], [35.51, 31.25], [35.48, 31.10], [35.43, 31.02], [35.38, 31.05], [35.37, 31.20], [35.40, 31.40], [35.42, 31.58], [35.44, 31.70]] },
            { id: 'tiberiade', ring: [[35.55, 32.89], [35.62, 32.86], [35.65, 32.76], [35.60, 32.69], [35.54, 32.72], [35.51, 32.81]] }
        ],
        rivers: [
            { id: 'jourdain', pts: [[35.62, 33.25], [35.60, 33.05], [35.56, 32.89]] },
            { id: 'jourdain-sud', pts: [[35.57, 32.69], [35.55, 32.50], [35.56, 32.30], [35.53, 32.05], [35.52, 31.88], [35.50, 31.77]] },
            { id: 'jabbok', pts: [[36.05, 32.00], [35.92, 32.14], [35.78, 32.19], [35.62, 32.17], [35.56, 32.18]] },
            { id: 'arnon', pts: [[35.95, 31.45], [35.78, 31.48], [35.62, 31.47], [35.55, 31.47]] },
            { id: 'zered', pts: [[35.80, 31.05], [35.65, 31.10], [35.52, 31.04]] }
        ]
    };

    // --- Les quatre cartes -----------------------------------------------------------------------------
    var MAPS = [
        {
            id: 'abraham', icon: '⛺', name: "Lieux où Abraham a séjourné", ref: 'Genèse 11 – 25',
            summary: "De Our Kasdim, où naît sa famille, à Béer-Chéva et Hébron : le monde d'Abraham, de la Mésopotamie à l'Égypte. En Canaan, il bâtit un autel à chacune de ses grandes haltes (Chékhem, Beit-El, Hébron, et, à la Akéda, la montagne de Moriah) : ce sont les flammes de la carte.",
            views: [
                { id: 'monde', label: "Vue d'ensemble", bounds: [[29.5, 28.0], [48.5, 40.2]] },
                { id: 'canaan', label: 'Canaan en détail', bounds: [[34.6, 30.75], [36.0, 32.35]], full: true }
            ],
            legend: [{ icon: '🔥', text: 'Lieux où Abraham a édifié un autel' }],
            places: [
                { id: 'ur', lv: 0, views: ['monde'], note: "La famille de Téra en part pour aller en Canaan, avec Avram, Saraï et Lot (11,31). D.ieu rappellera plus tard à Abraham qu'Il l'a fait sortir d'Our Kasdim (15,7).", ref: 'Genèse 11,28-31 ; 15,7' },
                { id: 'haran', lv: 0, side: 'left', views: ['monde'], note: "Étape de la famille de Téra, qui y meurt. C'est de là qu'Avram, âgé de 75 ans, part vers Canaan sur l'ordre « Lekh Lekha ». Plus tard, le serviteur d'Abraham y cherchera une épouse pour Isaac, et Jacob s'y réfugiera chez Laban.", ref: 'Genèse 11,31-32 ; 12,1-5' },
                { id: 'aram', kind: 'region', n: 'ARAM NAHARAYIM', he: 'ארם נהרים', c: [39.8, 35.6], views: ['monde'], note: "« Aram des deux fleuves », la haute Mésopotamie autour de Haran : c'est la ville de Na'hor, où le serviteur d'Abraham trouve Rebecca.", ref: 'Genèse 24,10' },
                { id: 'assyrie', kind: 'region', n: 'ASSYRIE', he: 'אשור', c: [44.6, 35.7], views: ['monde'], note: "Ashour, au nord de la Mésopotamie. Elle ne figure pas dans le récit d'Abraham : c'est un repère du monde d'alors. La Torah dit qu'Ashour bâtit Ninive.", ref: 'Genèse 10,11' },
                { id: 'babylonie', kind: 'region', n: 'BABYLONIE', he: 'בבל', c: [44.9, 32.5], views: ['monde'], note: "Babel, dans la plaine de Chinar, où les hommes veulent bâtir une tour. Our Kasdim se trouve plus au sud-est, dans le même monde mésopotamien.", ref: 'Genèse 11,1-9' },
                { id: 'ararat', kind: 'mountain', n: 'Mont Ararat', he: 'הרי אררט', c: [44.30, 39.70], views: ['monde'], note: "L'arche de Noé se pose « sur les montagnes d'Ararat ». C'est un repère d'avant Abraham, tout au nord de la carte.", ref: 'Genèse 8,4' },
                { id: 'damas', lv: 0, side: 'right', views: ['monde'], note: "Éliézer, l'intendant d'Avram, est « de Damas ». Plus loin au nord, à Hova, Abraham poursuivra les quatre rois.", ref: 'Genèse 15,2' },
                { id: 'egypte', kind: 'region', n: 'ÉGYPTE', he: 'מצרים', c: [30.9, 29.4], views: ['monde'], note: "Une famine pousse Avram à y descendre. Saraï est prise par Pharaon, qui la rend lorsque D.ieu frappe sa maison, et le couple repart avec ses biens. Agar, la mère d'Ismaël, est égyptienne.", ref: 'Genèse 12,10-20 ; 16,1' },
                { id: 'philistia', kind: 'region', n: 'PHILISTINS', he: 'פלשתים', c: [34.85, 31.72], lv: 1, note: "« Pays des Philistins », où Abraham séjourne « de nombreux jours » auprès du roi Avimélekh, après l'alliance de Béer-Chéva.", ref: 'Genèse 21,32-34' },
                { id: 'canaan', kind: 'region', n: 'CANAAN', he: 'כנען', c: [35.3, 32.25], views: ['monde'], note: "La terre promise à Abraham et à sa descendance : « Je donnerai ce pays à ta descendance ».", ref: 'Genèse 12,7' },
                { id: 'canaan-d', kind: 'region', n: 'CANAAN', he: 'כנען', c: [34.7, 32.3], views: ['canaan'] },
                { id: 'guerar', n: 'Guérar', he: 'גרר', c: [34.55, 31.40], lv: 2, side: 'top', note: "Avimélekh, roi de Guérar, prend Sara ; D.ieu l'avertit en songe, rend Sara à Abraham, qui prie pour lui. Isaac séjournera à son tour à Guérar.", ref: 'Genèse 20 ; 26,1-6' },
                { id: 'kadesh', lv: 1, side: 'right', note: "Abraham demeure « entre Kadèch et Chour ». Le puits où l'ange parle à Agar est « entre Kadèch et Béred ».", ref: 'Genèse 20,1 ; 16,14' },
                { id: 'beersheva', lv: 2, side: 'left', note: "Après son alliance avec Avimélekh, Abraham y plante un tamaris et invoque le Nom de D.ieu. Il y séjourne « de nombreux jours ». Agar, chassée avec Ismaël, s'égare dans son désert.", ref: 'Genèse 21,14 ; 21,31-34' },
                { id: 'hebron', lv: 2, altar: true, note: "Après s'être séparé de Lot, Avram plante sa tente aux chênes de Mamré, à Hébron, et y bâtit un autel. Il y achète la grotte de Makhpéla pour enterrer Sara : c'est le tombeau des patriarches.", ref: 'Genèse 13,18 ; 23' },
                { id: 'jerusalem', lv: 2, altar: true, side: 'right', note: "Salem, dont le roi Malki-Tsédek, prêtre du D.ieu Très-Haut, bénit Avram après sa victoire. Sur la montagne de Moriah, Abraham lie Isaac et élève l'autel (la Akéda) ; la tradition y reconnaît le futur Mont du Temple.", ref: 'Genèse 14,18-20 ; 22 ; 2 Chroniques 3,1' },
                { id: 'chekhem', lv: 2, altar: true, side: 'right', note: "Première halte en Canaan, au chêne de Moré : D.ieu apparaît à Avram, lui promet ce pays pour sa descendance, et il y bâtit un autel.", ref: 'Genèse 12,6-7' },
                { id: 'beitel', lv: 2, note: "Avram s'installe sur la montagne à l'est de Beit-El, sa tente entre Beit-El à l'ouest et Aï à l'est. Il y revient après l'Égypte.", ref: 'Genèse 12,8 ; 13,3-4', side: 'left' },
                { id: 'ai', n: 'Aï', he: 'העי', c: [35.32, 31.90], lv: 2, note: "Le lieu où la tente d'Avram était dressée, à l'est de Beit-El.", ref: 'Genèse 12,8', side: 'right' },
                { id: 'autel-beitel', kind: 'altar', n: 'Autel entre Beit-El et Aï', c: [35.26, 31.925], lv: 2, note: "Avram y bâtit un autel et invoque le Nom de D.ieu ; il y revient après son séjour en Égypte.", ref: 'Genèse 12,8 ; 13,4' },
                { id: 'pentapole', kind: 'city', n: 'Sodome, Gomorrhe, Adma, Tsevoyim', he: 'סדם · עמורה · אדמה · צבויים', c: [35.36, 31.00], lv: 2, side: 'left', wide: true, note: "Les cinq villes de la plaine (avec Béla, c'est-à-dire Tsoar). Lot s'y installe ; Sodome et Gomorrhe sont détruites, après l'intercession d'Abraham.", ref: 'Genèse 13,10-13 ; 18 – 19' },
                { id: 'tsoar', lv: 2, side: 'right', note: "Appelée aussi Béla. Lot obtient d'y fuir, « elle est petite », et la ville est épargnée lors de la destruction des villes de la plaine.", ref: 'Genèse 14,2 ; 19,20-23' },
                { id: 'sidim', kind: 'region', n: 'VALLÉE DE SIDIM', he: 'עמק השדים', c: [35.80, 31.25], lv: 2, note: "« La vallée de Sidim, c'est la mer de Sel » : le champ de bataille des quatre et des cinq rois.", ref: 'Genèse 14,3' },
                { id: 'kikar', kind: 'region', n: 'PLAINE DU JOURDAIN', he: 'כבר הירדן', c: [35.82, 31.70], lv: 2, note: "La Plaine du Jourdain, « bien irriguée, comme le jardin de D.ieu » : Lot la choisit.", ref: 'Genèse 13,10-11' },
                { id: 'mer-morte', kind: 'water', n: 'Mer Morte', he: 'ים המלח', c: [35.66, 31.42], lv: 1, views: ['canaan'] },
                { id: 'tiberiade', kind: 'water', n: 'Lac de Tibériade', he: 'ים כנרת', c: [35.85, 32.96], views: ['canaan'] },
                { id: 'mediterranee', kind: 'water', n: 'MER MÉDITERRANÉE', he: 'הים הגדול', c: [32.0, 34.3], views: ['monde'] }
            ]
        },
        {
            id: 'guerre', icon: '⚔️', name: 'La guerre des rois cananéens', ref: 'Genèse 14',
            summary: "Quatre rois mésopotamiens, menés par Kédarlaomer d'Élam, ont soumis pendant douze ans les cinq rois de la plaine du Jourdain. La treizième année, ceux-ci se révoltent : à la quatorzième, les quatre rois reviennent, battent au passage les peuples du chemin (étapes 1 à 8 de la carte), puis les cinq rois dans la vallée de Sidim. Ils emmènent Lot et ses biens. Abraham, avec 318 hommes, les poursuit jusqu'à Dan, les attaque de nuit en deux troupes et les met en déroute jusqu'à Hova, au nord de Damas. À son retour, Malki-Tsédek, roi de Salem, vient à sa rencontre.",
            views: [
                { id: 'levant', label: 'Toute la guerre', bounds: [[33.3, 29.1], [37.3, 34.3]] },
                { id: 'sidim', label: 'La vallée de Sidim', bounds: [[34.6, 30.6], [36.2, 31.9]], full: true }
            ],
            variants: { label: "La poursuite d'Abraham", options: [{ id: 'v1', label: 'Première version' }, { id: 'v2', label: 'Deuxième version' }] },
            legend: [
                { color: '#4d7c0f', text: 'Conquêtes des quatre rois (numérotées dans l\'ordre)' },
                { color: '#5b3a1e', text: 'Entrée en guerre des cinq rois' },
                { icon: '⚔️', text: 'La bataille des quatre rois contre les cinq' },
                { color: '#c2410c', text: "Abraham poursuit les quatre rois (deux versions possibles pour l'emplacement de Dan)" }
            ],
            sections: [
                { title: 'Les quatre rois', items: [
                    { t: "Kédarlaomer, roi d'Élam", he: 'כדרלעמר מלך עילם' },
                    { t: 'Tidal, roi de Goyim', he: 'תדעל מלך גוים' },
                    { t: 'Amraphel, roi de Chinar', he: 'אמרפל מלך שנער' },
                    { t: "Ariokh, roi d'Elassar", he: 'אריוך מלך אלסר' }
                ] },
                { title: 'Les cinq rois', items: [
                    { t: 'Béra, roi de Sodome', he: 'ברע מלך סדם' },
                    { t: 'Bircha, roi de Gomorrhe', he: 'ברשע מלך עמרה' },
                    { t: "Chinav, roi d'Adma", he: 'שנאב מלך אדמה' },
                    { t: 'Cheméver, roi de Tsevoyim', he: 'שמאבר מלך צבוים' },
                    { t: 'Le roi de Béla / Tsoar', he: 'מלך בלע / צער' }
                ] },
                { title: 'Les huit étapes des quatre rois', items: [
                    { t: '1. Achtarot-Karnaïm : les Refaïm' }, { t: '2. Ham : les Zouzim' }, { t: '3. Chavé-Kiriataïm : les Émim' },
                    { t: '4. Le mont Seïr : les Horéens, jusqu\'à El-Paran' }, { t: '5. El-Paran, « près du désert »' }, { t: '6. Ein-Michpat, c\'est Kadèch' },
                    { t: '7. Tout le territoire des Amalécites' }, { t: '8. Hatsatson-Tamar : les Amorites' }
                ] }
            ],
            places: [
                { id: 'ashtarot', kind: 'city', n: 'Achtarot-Karnaïm', he: 'עשתרת קרנים', c: [36.10, 32.85], lv: 0, side: 'right', note: "Première étape des quatre rois : ils y battent les Refaïm (étape 1).", ref: 'Genèse 14,5' },
                { id: 'ham', kind: 'city', n: 'Ham', he: 'חם', c: [35.90, 32.10], lv: 0, side: 'right', doubt: true, note: "Les Zouzim sont battus à Ham (étape 2). Emplacement discuté.", ref: 'Genèse 14,5' },
                { id: 'shave', kind: 'city', n: 'Chavé-Kiriataïm', he: 'שוה קריתים', c: [35.85, 31.55], lv: 0, side: 'right', note: "Les Émim sont battus à Chavé-Kiriataïm (étape 3).", ref: 'Genèse 14,5' },
                { id: 'seir', kind: 'region', n: 'SEÏR', he: 'שעיר', c: [35.55, 30.30], lv: 0, note: "Les Horéens sont battus dans leur montagne de Seïr « jusqu'à El-Paran » (étapes 4 et 5).", ref: 'Genèse 14,6' },
                { id: 'el-paran', kind: 'city', n: 'Plaine de Paran', he: 'איל פארן', c: [34.90, 29.62], lv: 0, side: 'left', note: "El-Paran, « qui est près du désert » : le point le plus au sud du périple des quatre rois (étape 5).", ref: 'Genèse 14,6' },
                { id: 'ein-michpat', kind: 'city', n: 'Ein-Michpat / Kadèch', he: 'עין משפט / קדש', c: [35.05, 29.95], lv: 0, side: 'right', note: "Les quatre rois reviennent à Ein-Michpat, « c'est Kadèch » (étape 6).", ref: 'Genèse 14,7' },
                { id: 'amalec', kind: 'region', n: "TERRITOIRE DE L'AMALÉCITE", he: 'שדה העמלקי', c: [33.8, 30.2], lv: 0, note: "« Tout le territoire de l'Amalécite » est battu (étape 7), avant que les quatre rois ne remontent vers Hatsatson-Tamar.", ref: 'Genèse 14,7' },
                { id: 'hatsatson', kind: 'city', n: "'Hatsatson-Tamar", he: 'חצצן תמר', c: [35.38, 31.46], lv: 0, side: 'left', note: "Les Amorites y sont battus (étape 8). Hatsatson-Tamar est identifiée à Ein-Guédi, sur la rive ouest de la mer Morte.", ref: 'Genèse 14,7 ; 2 Chroniques 20,2' },
                { id: 'kadesh', kind: 'city', n: 'Kadèch Barnéa', he: 'קדש ברנע', c: [34.43, 30.69], lv: 1, side: 'left', note: "Un autre Kadèch, plus au nord-ouest dans le Néguev, que la Torah nomme aussi à propos d'Abraham et des explorateurs. Les quatre rois, eux, passent à Ein-Michpat.", ref: 'Genèse 14,7 ; 20,1' },
                { id: 'bataille', kind: 'war', n: 'La bataille de la vallée de Sidim', c: [35.47, 31.16], lv: 0, note: "Les cinq rois sortent à la rencontre des quatre rois et sont battus dans la vallée de Sidim, « pleine de puits de bitume » : les rois de Sodome et de Gomorrhe y tombent, les autres fuient vers la montagne. Lot est emmené avec ses biens.", ref: 'Genèse 14,8-12' },
                { id: 'sidim-ville', kind: 'city', n: 'Sodome, Gomorrhe, Adma, Tsevoyim', he: 'סדם · עמרה · אדמה · צבוים', c: [35.36, 31.00], lv: 0, side: 'left', wide: true, note: "Les villes des cinq rois, dans la vallée de Sidim.", ref: 'Genèse 14,2' },
                { id: 'tsoar', lv: 1, side: 'right', note: "Béla, la cinquième ville de la plaine, dont le roi est l'un des cinq rois.", ref: 'Genèse 14,2' },
                { id: 'hebron', lv: 1, side: 'top', n: 'Kiriat Arba / Hébron', note: "Un rescapé vient informer Avram « l'Hébreu », qui demeurait aux chênes de Mamré, de la capture de Lot.", ref: 'Genèse 14,13' },
                { id: 'salem', kind: 'city', n: 'Salem (Jérusalem)', he: 'שלם (ירושלים)', c: [35.22, 31.78], lv: 1, side: 'right', note: "À son retour, Abraham est accueilli par Malki-Tsédek, roi de Salem et prêtre du D.ieu Très-Haut, qui lui apporte du pain et du vin et le bénit. Abraham lui donne la dîme de tout.", ref: 'Genèse 14,17-20' },
                { id: 'dan', kind: 'city', n: 'Dan', he: 'דן', c: [35.80, 33.20], lv: 0, side: 'right', doubt: true, variant: 'v1', note: "Première version : Abraham poursuit les quatre rois jusqu'à Dan, au nord du lac de Tibériade. C'est là qu'il se divise en deux troupes pour attaquer de nuit. Emplacement discuté.", ref: 'Genèse 14,14-15' },
                { id: 'dan2', kind: 'city', n: 'Dan', he: 'דן', c: [35.15, 32.75], lv: 0, side: 'left', doubt: true, variant: 'v2', note: "Deuxième version : un autre emplacement possible pour Dan, plus à l'ouest. Dans les deux cas, la poursuite continue ensuite jusqu'à Hova. Emplacement discuté.", ref: 'Genèse 14,14-15' },
                { id: 'hova', kind: 'city', n: "'Hova", he: 'חובה', c: [36.36, 33.95], lv: 0, side: 'right', note: "Abraham poursuit les quatre rois jusqu'à Hova, « qui est à gauche de Damas », et ramène Lot, ses biens, les femmes et le peuple.", ref: 'Genèse 14,15-16' },
                { id: 'damas', lv: 0, side: 'right', note: "Hova, où s'arrête la poursuite, est « à gauche de Damas », c'est-à-dire au nord.", ref: 'Genèse 14,15' },
                { id: 'mediterranee', kind: 'water', n: 'MER MÉDITERRANÉE', he: 'הים הגדול', c: [33.8, 33.6], views: ['levant'] },
                { id: 'canaan', kind: 'region', n: 'CANAAN', he: 'כנען', c: [34.55, 32.1], views: ['levant'] },
                { id: 'philistins', kind: 'region', n: 'PHILISTINS', he: 'פלשתים', c: [34.1, 31.75], lv: 1, views: ['levant'] },
                { id: 'mer-morte', kind: 'water', n: 'Mer Morte', he: 'ים המלח', c: [35.25, 31.62], lv: 1 },
                { id: 'tiberiade', kind: 'water', n: 'Lac de Tibériade', he: 'ים כנרת', c: [35.85, 32.80], lv: 1, views: ['levant'] }
            ],
            routes: [
                { id: 'q1', num: '1', from: [37.15, 33.35], to: [36.10, 32.85], color: '#4d7c0f', bend: -0.12 },
                { id: 'q2', num: '2', from: [36.10, 32.85], to: [35.90, 32.10], color: '#4d7c0f', bend: 0.10 },
                { id: 'q3', num: '3', from: [35.90, 32.10], to: [35.85, 31.55], color: '#4d7c0f', bend: 0.08 },
                { id: 'q4', num: '4', from: [35.85, 31.55], to: [35.55, 30.30], color: '#4d7c0f', bend: 0.06 },
                { id: 'q5', num: '5', from: [35.55, 30.30], to: [34.90, 29.62], color: '#4d7c0f', bend: -0.10 },
                { id: 'q6', num: '6', from: [34.90, 29.62], to: [35.05, 29.95], color: '#4d7c0f', bend: 0.30 },
                { id: 'q7', num: '7', from: [35.05, 29.95], to: [34.15, 30.45], color: '#4d7c0f', bend: -0.14 },
                { id: 'q8', num: '8', from: [34.15, 30.45], to: [35.38, 31.46], color: '#4d7c0f', bend: -0.12 },
                { id: 'cinq', from: [35.66, 30.78], to: [35.54, 31.09], color: '#5b3a1e', bend: -0.12, w: 3 },
                { id: 'a1-v1', variant: 'v1', num: '1', pts: [[35.10, 31.55], [35.40, 32.05], [35.55, 32.60], [35.64, 33.15], [35.80, 33.20]], color: '#c2410c', w: 4 },
                { id: 'a2-v1', variant: 'v1', num: '2', pts: [[35.80, 33.20], [36.10, 33.55], [36.36, 33.95]], color: '#c2410c', w: 4 },
                { id: 'a1-v2', variant: 'v2', num: '1', pts: [[35.10, 31.55], [35.06, 32.00], [35.10, 32.40], [35.15, 32.75]], color: '#c2410c', w: 4, dash: true },
                { id: 'a2-v2', variant: 'v2', num: '2', pts: [[35.15, 32.75], [35.50, 33.30], [36.00, 33.75], [36.36, 33.95]], color: '#c2410c', w: 4, dash: true }
            ]
        },
        {
            id: 'jacob', icon: '🪜', name: 'Lieux où Jacob et ses enfants ont séjourné', ref: 'Genèse 28 – 46',
            summary: "De Beit-El à Haran, où il séjourne vingt ans chez Laban, puis le retour en Canaan : Ma'hanayim, le gué du Jaboc, Péniel, Souccot, Chékhem, Beit-El et Bethléem, jusqu'à Hébron, auprès d'Isaac. La carte situe aussi les séjours de ses fils (Dotan pour Joseph, Adoulam, Kéziv et Timna pour Juda), avant la descente de toute la maison en Égypte. Jacob a bâti un autel à Chékhem et à Beit-El.",
            views: [
                { id: 'canaan', label: 'Canaan', bounds: [[34.55, 30.95], [36.45, 32.65]] },
                { id: 'large', label: 'De Haran à l\'Égypte', bounds: [[29.5, 28.8], [40.5, 37.4]], top: true }
            ],
            legend: [{ icon: '🔥', text: 'Lieux où Jacob a édifié un autel' }],
            places: [
                { id: 'haran', lv: 0, top: true, views: ['large'], note: "Jacob y fuit la colère d'Ésaü et séjourne vingt ans chez son oncle Laban. Il y épouse Léa et Rachel, et onze de ses fils y naissent.", ref: 'Genèse 28,10 ; 29 – 31' },
                { id: 'egypte', kind: 'region', n: 'ÉGYPTE', he: 'מצרים', c: [31.0, 30.2], top: true, views: ['large'], note: "Jacob y descend avec toute sa maison, soixante-dix âmes, pour retrouver Joseph.", ref: 'Genèse 46' },
                { id: 'canaan-r', kind: 'region', n: 'CANAAN', he: 'כנען', c: [35.0, 32.62], views: ['canaan'], note: "La terre où Jacob a séjourné, comme son père Isaac.", ref: 'Genèse 37,1' },
                { id: 'canaan-l', kind: 'region', n: 'CANAAN', he: 'כנען', c: [35.4, 33.4], top: true, views: ['large'], note: "La terre où Jacob a séjourné, comme son père Isaac.", ref: 'Genèse 37,1' },
                { id: 'philistins', kind: 'region', n: 'PHILISTINS', he: 'פלשתים', c: [34.85, 31.10], note: "Le pays où Isaac a séjourné à Guérar, au sud-ouest de Canaan.", ref: 'Genèse 26,1' },
                { id: 'seir', kind: 'region', n: 'SEÏR', he: 'שעיר', c: [35.65, 31.00], note: "Le pays d'Ésaü, vers lequel Jacob envoie des messagers à son retour de Haran, et où Ésaü retourne.", ref: 'Genèse 32,4 ; 33,16' },
                { id: 'mahanayim', kind: 'city', n: "Ma'hanayim", he: 'מחנים', c: [36.00, 32.45], doubt: true, side: 'top', note: "Au retour de Haran, Jacob y rencontre des anges de D.ieu et nomme l'endroit « Camp (Ma'hanayim) ». Emplacement discuté.", ref: 'Genèse 32,2-3' },
                { id: 'jaboc', kind: 'city', n: 'Gué du Jaboc', he: 'מעבר יבק', c: [35.84, 32.12], doubt: true, lv: 0, side: 'bottom', note: "Jacob fait passer sa famille et ses biens au gué du Jaboc, puis reste seul : un homme lutte avec lui jusqu'à l'aube. Emplacement discuté.", ref: 'Genèse 32,23-25' },
                { id: 'peniel', kind: 'city', n: 'Péniel / Pénouel', he: 'פניאל / פנואל', c: [35.90, 32.20], doubt: true, lv: 0, side: 'right', note: "Jacob y reçoit le nom d'Israël et appelle le lieu « Péniel » : « J'ai vu D.ieu face à face ». Emplacement discuté.", ref: 'Genèse 32,29-31' },
                { id: 'souccot', kind: 'city', n: 'Souccot', he: 'סכות', c: [35.62, 32.22], lv: 0, side: 'top', note: "Après sa rencontre avec Ésaü, Jacob y bâtit une maison et des cabanes (souccot) pour son troupeau.", ref: 'Genèse 33,17' },
                { id: 'chekhem', lv: 0, altar: true, side: 'left', note: "Jacob arrive en paix à Chékhem et achète le champ où il dresse sa tente. Il y bâtit un autel qu'il appelle « El Élohé Israël ». C'est là aussi qu'est la tombe de Joseph, plus tard.", ref: 'Genèse 33,18-20' },
                { id: 'dotan', lv: 0, side: 'right', note: "Les frères de Joseph y font paître leurs troupeaux : c'est là qu'ils le jettent dans une fosse, avant de le vendre aux Ichmaélites.", ref: 'Genèse 37,17-28' },
                { id: 'beitel', lv: 0, altar: true, side: 'left', note: "Jacob y rêve de l'échelle en fuyant Ésaü (le lieu s'appelait Louz). À son retour, D.ieu lui ordonne d'y monter : il y bâtit un autel (« El Beit-El »). Débora, la nourrice de Rébecca, y meurt.", ref: 'Genèse 28,10-22 ; 35,1-8' },
                { id: 'jerusalem', lv: 0, side: 'right', note: "Entre Beit-El et Efrat (Bethléem), le chemin des hauteurs passe près de Jérusalem. La Torah ne dit pas que Jacob s'y soit arrêté.", ref: 'Genèse 35,16' },
                { id: 'bethleem', kind: 'city', n: 'Bethléem / Efrat', he: 'בית לחם / אפרת', c: [35.20, 31.70], lv: 0, side: 'left', note: "Rachel meurt en mettant au monde Benjamin « sur le chemin d'Efrat, qui est Bethléem » : Jacob dresse un monument sur sa tombe.", ref: 'Genèse 35,16-20' },
                { id: 'migdal-eder', kind: 'city', n: 'Migdal-Eder', he: 'מגדל עדר', c: [35.26, 31.65], doubt: true, lv: 1, side: 'right', note: "Après la mort de Rachel, Israël (Jacob) plante sa tente au-delà de Migdal-Eder. Emplacement discuté.", ref: 'Genèse 35,21' },
                { id: 'hebron', lv: 0, side: 'right', note: "Jacob rejoint son père Isaac à Mamré, Kiriat Arba, qui est Hébron : Isaac y meurt. C'est de la vallée d'Hébron que Jacob envoie Joseph retrouver ses frères.", ref: 'Genèse 35,27-29 ; 37,14' },
                { id: 'adoulam', kind: 'city', n: 'Adoulam', he: 'עדלם', c: [34.97, 31.64], lv: 1, side: 'left', note: "Juda s'y sépare de ses frères et s'installe chez un homme d'Adoulam, Hira.", ref: 'Genèse 38,1' },
                { id: 'keziv', kind: 'city', n: 'Kéziv', he: 'כזיב', c: [34.82, 31.56], lv: 1, side: 'left', note: "Juda y est quand sa femme lui donne son troisième fils, Chéla.", ref: 'Genèse 38,5' },
                { id: 'timna', kind: 'city', n: 'Timna', he: 'תמנת', c: [35.08, 31.40], lv: 1, side: 'bottom', note: "Juda y monte pour la tonte de ses moutons : c'est sur le chemin de Timna que Tamar l'attend.", ref: 'Genèse 38,12-14' },
                { id: 'jordan-label', kind: 'water', n: 'Jourdain', he: 'ירדן', c: [35.40, 32.55], lv: 1 },
                { id: 'jaboc-label', kind: 'water', n: 'Jaboc', he: 'נחל יבק', c: [36.28, 31.85], lv: 1 },
                { id: 'mer-morte', kind: 'water', n: 'Mer Morte', he: 'ים המלח', c: [35.55, 31.35], lv: 1 },
                { id: 'tiberiade', kind: 'water', n: 'Lac de Tibériade', he: 'ים כנרת', c: [35.78, 32.98], lv: 1 },
                { id: 'mediterranee', kind: 'water', n: 'MER MÉDITERRANÉE', he: 'הים הגדול', c: [32.6, 34.2], top: true, views: ['large'] }
            ]
        },
        {
            id: 'desert', icon: '🏜️', name: 'Les quarante-deux étapes du désert', ref: 'Nombres 33',
            summary: "De Ramsès aux plaines de Moab, la Torah énumère quarante-deux étapes (Nombres 33). Les quatorze premières ont lieu la première année, de Ramsès à Kadèch Barnéa (Ritma), d'où partent les explorateurs. Puis viennent vingt étapes durant trente-huit années : dix-sept stations (« Il les fit errer dans le désert ») avant le retour à Kadèch, puis le mont Hor. Les huit dernières, de Tsalmona aux plaines de Moab, sont parcourues la quarantième année, après la mort d'Aaron. Les points d'interrogation signalent des emplacements discutés.",
            views: [
                { id: 'levant', label: 'Toutes les étapes', bounds: [[30.5, 27.5], [37.2, 33.3]], dense: true },
                { id: 'sinai', label: 'Égypte et Sinaï', bounds: [[31.6, 28.15], [34.8, 31.0]], dense: true, all: true },
                { id: 'moab', label: 'Le chemin vers Moab', bounds: [[34.85, 30.0], [36.55, 32.4]], dense: true, all: true }
            ],
            legend: [
                { color: '#4d7c0f', text: 'Itinéraire des quarante-deux étapes (numérotées)' },
                { icon: '⚔️', text: 'Guerres : Amalec, le roi d\'Arad, Sihon et Og' }
            ],
            places: [
                { id: 'ramses', kind: 'city', num: '1', n: 'Ramsès', he: 'רעמסס', c: [31.83, 30.80], lv: 0, key: true, side: 'top', note: "Point de départ, le lendemain de la nuit de la sortie d'Égypte, le 15 Nissan.", ref: 'Nombres 33,3' },
                { id: 'souccot', kind: 'city', num: '2', n: 'Souccot', he: 'סכות', c: [32.10, 30.55], lv: 1, note: "Première halte, que la Torah nomme déjà au départ de Ramsès.", ref: 'Exode 12,37' },
                { id: 'etam', kind: 'city', num: '3', n: 'Etam', he: 'אתם', c: [32.38, 30.40], lv: 1, note: "« Au bord du désert » : la dernière halte avant que le peuple ne fasse demi-tour vers la mer.", ref: 'Exode 13,20 ; 14,1-2' },
                { id: 'pihahirot', kind: 'city', num: '4', n: "Pi-Ha'hirot", he: 'פי החירת', c: [32.35, 29.85], lv: 1, side: 'left', note: "Le peuple campe entre Migdol et la mer, devant Baal-Tsephon : la mer des Joncs se fend ensuite devant lui et il la traverse à pied sec.", ref: 'Exode 14,1-2 ; Nombres 33,7-8' },
                { id: 'mara', kind: 'city', num: '5', n: 'Mara', he: 'מרה', c: [32.75, 29.55], doubt: true, lv: 1, side: 'right', note: "Les eaux amères, que Moïse rend douces ; le peuple reçoit les premières lois.", ref: 'Exode 15,22-26' },
                { id: 'elim', kind: 'city', num: '6', n: 'Elim', he: 'אילם', c: [33.15, 29.20], doubt: true, lv: 1, side: 'right', note: "Douze sources d'eau et soixante-dix palmiers.", ref: 'Exode 15,27' },
                { id: 'merjoncs', kind: 'city', num: '7', n: 'Sur les rives de la mer des Joncs', he: 'על ים סוף', c: [33.25, 28.98], doubt: true, lv: 1, side: 'left', note: "Le peuple campe de nouveau au bord de la mer, après Elim.", ref: 'Nombres 33,10' },
                { id: 'sin', kind: 'city', num: '8', n: 'Désert de Sin', he: 'מדבר סין', c: [33.32, 28.68], doubt: true, lv: 1, side: 'left', note: "La manne tombe pour la première fois.", ref: 'Exode 16 ; Nombres 33,11' },
                { id: 'dofka', kind: 'city', num: '9', n: 'Dofka', he: 'דפקה', c: [33.50, 28.50], doubt: true, lv: 1, side: 'left', note: "Station du désert de Sin, avant Alouch.", ref: 'Nombres 33,12' },
                { id: 'alouch', kind: 'city', num: '10', n: 'Alouch', he: 'אלוש', c: [33.65, 28.30], doubt: true, lv: 1, side: 'bottom', note: "Station entre Dofka et Refidim.", ref: 'Nombres 33,13' },
                { id: 'refidim', kind: 'city', num: '11', n: 'Refidim', he: 'רפידים', c: [33.78, 28.62], lv: 1, side: 'right', note: "Le peuple manque d'eau ; Moïse frappe le rocher. Amalec attaque : c'est la première guerre du désert.", ref: 'Exode 17 ; Nombres 33,14' },
                { id: 'sinai', kind: 'mountain', num: '12', n: 'Désert du Sinaï', he: 'מדבר סיני', c: [33.97, 28.54], lv: 0, key: true, side: 'bottom', note: "Le don de la Torah, la faute du Veau d'or, puis la construction et l'inauguration du Tabernacle : le peuple y reste presque un an.", ref: 'Exode 19 ; Nombres 33,15' },
                { id: 'kivrot', kind: 'city', num: '13', n: 'Kivrot Hataava', he: 'קברת התאוה', c: [34.20, 28.85], doubt: true, lv: 1, side: 'left', note: "Les « Tombes de la convoitise » : le peuple réclame de la viande, les cailles arrivent, et beaucoup meurent.", ref: 'Nombres 11,34 ; 33,16' },
                { id: 'hatserot', kind: 'city', num: '14', n: "'Hatsérot", he: 'חצרות', c: [34.47, 29.15], doubt: true, lv: 1, side: 'right', note: "Miriam y est frappée de lèpre, et le peuple attend sept jours qu'elle soit guérie.", ref: 'Nombres 11,35 ; 12,1-16' },
                { id: 'kadesh', kind: 'city', num: '15 · 33', n: 'Kadèch Barnéa / Ritma', he: 'קדש ברנע / רתמה', c: [34.43, 30.69], lv: 0, key: true, side: 'top', note: "D'ici (Ritma) partent les explorateurs ; au retour, le verdict est rendu : quarante ans dans le désert. Le peuple y revient au début de la quarantième année, et c'est là que Miriam meurt.", ref: 'Nombres 13 – 14 ; 20,1 ; 33,18' },
                { id: 'errance', kind: 'city', num: '16-32', n: 'Il les fit errer dans le désert', he: '', c: [33.40, 30.75], lv: 0, key: true, side: 'bottom', note: "Dix-sept stations parcourues durant les trente-huit années d'errance, avant le retour à Kadèch. La carte ne les situe pas une à une : voir la liste.", ref: 'Nombres 33,18-36' },
                { id: 'mont-hor', kind: 'mountain', num: '34', n: 'Mont Hor', he: 'הר ההר', c: [35.40, 30.32], doubt: true, lv: 0, key: ['levant'], side: 'bottom', note: "Aaron y meurt, à 123 ans, le premier du mois d'Av de la quarantième année. Éléazar reprend les vêtements de grand prêtre.", ref: 'Nombres 20,22-29 ; 33,37-39' },
                { id: 'tsalmona', kind: 'city', num: '35', n: 'Tsalmona', he: 'צלמנה', c: [35.54, 30.10], doubt: true, lv: 1, side: 'bottom', note: "Première des huit dernières étapes : le peuple contourne le pays d'Édom.", ref: 'Nombres 33,41' },
                { id: 'pounone', kind: 'city', num: '36', n: 'Pounone', he: 'פונן', c: [35.52, 30.62], doubt: true, lv: 1, side: 'right', note: "Station du contournement d'Édom.", ref: 'Nombres 33,42' },
                { id: 'ovot', kind: 'city', num: '37', n: 'Ovot', he: 'אבת', c: [35.70, 30.95], doubt: true, lv: 1, side: 'right', note: "Station du contournement d'Édom, au bord de Moab.", ref: 'Nombres 21,10 ; 33,43' },
                { id: 'yiei', kind: 'city', num: '38', n: "Yiei Ha'avarim", he: 'עיי העברים', c: [35.82, 31.15], doubt: true, lv: 1, side: 'right', note: "À la frontière de Moab, du côté du soleil levant.", ref: 'Nombres 21,11 ; 33,44' },
                { id: 'divon', kind: 'city', num: '39', n: 'Divon-Gad', he: 'דיבן גד', c: [35.79, 31.50], doubt: true, lv: 1, side: 'right', note: "Station au nord de l'Arnon, dans le pays de Sihon.", ref: 'Nombres 33,45' },
                { id: 'almon', kind: 'city', num: '40', n: 'Almon-Divlataïma', he: 'עלמן דבלתימה', c: [35.95, 31.68], doubt: true, lv: 1, side: 'right', note: "Dernière station avant les monts des Avarim.", ref: 'Nombres 33,46' },
                { id: 'avarim', kind: 'mountain', num: '41', n: 'Monts des Avarim', he: 'הרי העברים', c: [35.76, 31.76], doubt: true, lv: 1, side: 'left', note: "Face à Nébo : le mont d'où Moïse verra la terre de Canaan.", ref: 'Nombres 33,47' },
                { id: 'moab-plaines', kind: 'city', num: '42', n: 'Plaines de Moab', he: 'ערבת מואב', c: [35.58, 31.90], doubt: true, lv: 0, key: true, side: 'left', note: "Le dernier campement, de Beit-Yechimot à Avel-Chittim, face à Jéricho. Moïse y adresse ses derniers discours (le Deutéronome) et monte mourir sur le mont Nébo.", ref: 'Nombres 33,48-49 ; Deutéronome 34' },
                { id: 'guerre-amalec', kind: 'war', n: "La guerre d'Amalec", c: [33.90, 28.80], lv: 1, note: "Amalec attaque le peuple à Refidim ; Josué le combat pendant que Moïse tient les mains levées.", ref: 'Exode 17,8-16' },
                { id: 'guerre-arad', kind: 'war', n: "La guerre contre le roi d'Arad", c: [35.22, 30.50], lv: 1, note: "Le roi cananéen d'Arad, qui habitait le Néguev, attaque Israël et fait des prisonniers ; Israël fait vœu de vouer ses villes à l'interdit, et les détruit.", ref: 'Nombres 21,1-3' },
                { id: 'guerre-sihon', kind: 'war', n: 'La guerre contre Sihon', c: [36.04, 31.60], lv: 1, note: "Sihon, roi des Amorites, refuse le passage et sort combattre à Yahats : Israël le bat et prend son pays, de l'Arnon au Jaboc.", ref: 'Nombres 21,21-31' },
                { id: 'guerre-og', kind: 'war', n: 'La guerre contre Og', c: [36.12, 32.70], lv: 1, note: "Og, roi du Bachan, vient combattre à Édréï : Israël le bat et prend son pays.", ref: 'Nombres 21,33-35' },
                { id: 'egypte', kind: 'region', n: 'ÉGYPTE', he: 'מצרים', c: [30.95, 29.7], lv: 0 },
                { id: 'edom', kind: 'region', n: 'ÉDOM', he: 'ארץ אדום', c: [36.2, 30.35], lv: 0 },
                { id: 'moab', kind: 'region', n: 'MOAB', he: 'ארץ מואב', c: [36.30, 31.15], lv: 0 },
                { id: 'ammon', kind: 'region', n: 'AMMON', he: 'עמון', c: [36.45, 31.75], lv: 1, views: ['levant', 'moab'] },
                { id: 'amorreen', kind: 'region', n: 'AMORRÉEN', he: 'ארץ האמרי', c: [36.20, 32.20], lv: 1, views: ['levant', 'moab'] },
                { id: 'bachan', kind: 'region', n: 'BACHAN', he: 'ארץ הבשן', c: [36.45, 32.95], lv: 0, views: ['levant', 'moab'] },
                { id: 'canaan', kind: 'region', n: 'CANAAN', he: 'ארץ כנען', c: [34.95, 32.55], lv: 0, views: ['levant', 'moab'] },
                { id: 'philistins', kind: 'region', n: 'PHILISTINS', he: 'ארץ פלשתים', c: [34.25, 31.60], lv: 1, views: ['levant'] },
                { id: 'paran', kind: 'region', n: 'DÉSERT DE PARAN', he: 'מדבר פארן', c: [33.85, 29.80], lv: 1, views: ['levant', 'sinai'] },
                { id: 'mer-joncs-w', kind: 'water', n: 'Mer des Joncs', he: 'ים סוף', c: [32.75, 28.45], lv: 0, views: ['levant', 'sinai'] },
                { id: 'mer-joncs-e', kind: 'water', n: 'Mer des Joncs', he: 'ים סוף', c: [35.05, 28.35], lv: 1, views: ['levant', 'sinai'] },
                { id: 'mer-morte', kind: 'water', n: 'Mer Morte', he: 'ים המלח', c: [35.00, 31.25], lv: 1, views: ['levant', 'moab'] },
                { id: 'mediterranee', kind: 'water', n: 'MER MÉDITERRANÉE', he: 'הים הגדול', c: [32.9, 32.7], views: ['levant', 'sinai'] }
            ],
            routes: [
                { id: 'e1', from: [31.83, 30.80], to: [32.10, 30.55], color: '#4d7c0f', bend: 0.1 },
                { id: 'e2', from: [32.10, 30.55], to: [32.38, 30.40], color: '#4d7c0f', bend: 0.1 },
                { id: 'e3', from: [32.38, 30.40], to: [32.35, 29.85], color: '#4d7c0f', bend: 0.12 },
                { id: 'e4', from: [32.35, 29.85], to: [32.75, 29.55], color: '#4d7c0f', bend: -0.3, dash: true },
                { id: 'e5', from: [32.75, 29.55], to: [33.15, 29.20], color: '#4d7c0f', bend: 0.05 },
                { id: 'e6', from: [33.15, 29.20], to: [33.25, 28.98], color: '#4d7c0f', bend: 0.05 },
                { id: 'e7', from: [33.25, 28.98], to: [33.32, 28.68], color: '#4d7c0f', bend: 0.05 },
                { id: 'e8', from: [33.32, 28.68], to: [33.50, 28.50], color: '#4d7c0f', bend: 0.05 },
                { id: 'e9', from: [33.50, 28.50], to: [33.65, 28.30], color: '#4d7c0f', bend: 0.05 },
                { id: 'e10', from: [33.65, 28.30], to: [33.78, 28.62], color: '#4d7c0f', bend: -0.15 },
                { id: 'e11', from: [33.78, 28.62], to: [33.97, 28.54], color: '#4d7c0f', bend: 0.1 },
                { id: 'e12', from: [33.97, 28.54], to: [34.20, 28.85], color: '#4d7c0f', bend: 0.12 },
                { id: 'e13', from: [34.20, 28.85], to: [34.47, 29.15], color: '#4d7c0f', bend: 0.1 },
                { id: 'e14', from: [34.47, 29.15], to: [34.43, 30.69], color: '#4d7c0f', bend: -0.08 },
                { id: 'err-a', from: [34.43, 30.69], to: [33.55, 30.85], color: '#4d7c0f', bend: -0.15, dash: true },
                { id: 'err-b', from: [33.55, 30.85], to: [34.43, 30.69], color: '#4d7c0f', bend: -0.15, dash: true },
                { id: 'e34', from: [34.43, 30.69], to: [35.40, 30.32], color: '#4d7c0f', bend: -0.1 },
                { id: 'e35', from: [35.40, 30.32], to: [35.54, 30.10], color: '#4d7c0f', bend: 0.1 },
                { id: 'e36', from: [35.54, 30.10], to: [35.52, 30.62], color: '#4d7c0f', bend: -0.1 },
                { id: 'e37', from: [35.52, 30.62], to: [35.70, 30.95], color: '#4d7c0f', bend: -0.1 },
                { id: 'e38', from: [35.70, 30.95], to: [35.82, 31.15], color: '#4d7c0f', bend: -0.1 },
                { id: 'e39', from: [35.82, 31.15], to: [35.79, 31.50], color: '#4d7c0f', bend: 0.1 },
                { id: 'e40', from: [35.79, 31.50], to: [35.95, 31.68], color: '#4d7c0f', bend: -0.1 },
                { id: 'e41', from: [35.95, 31.68], to: [35.76, 31.76], color: '#4d7c0f', bend: 0.08 },
                { id: 'e42', from: [35.76, 31.76], to: [35.58, 31.90], color: '#4d7c0f', bend: 0.05 }
            ],
            sections: [
                { title: 'Les quatorze premières étapes — la première année', items: [
                    { t: '1. Ramsès', he: 'רעמסס' }, { t: '2. Souccot', he: 'סכות' }, { t: '3. Etam', he: 'אתם' }, { t: "4. Pi-Ha'hirot", he: 'פי החירת' }, { t: '5. Mara', he: 'מרה' },
                    { t: '6. Elim', he: 'אילם' }, { t: '7. Sur les rives de la mer des Joncs', he: 'על ים סוף' }, { t: '8. Désert de Sin', he: 'מדבר סין' }, { t: '9. Dofka', he: 'דפקה' },
                    { t: '10. Alouch', he: 'אלוש' }, { t: '11. Refidim', he: 'רפידים' }, { t: '12. Désert du Sinaï', he: 'מדבר סיני' }, { t: '13. Kivrot Hataava', he: 'קברת התאוה' },
                    { t: "14. 'Hatsérot", he: 'חצרות' }
                ] },
                { title: 'Les vingt étapes — trente-huit années', items: [
                    { t: '15. Kadèch Barnéa / Ritma', he: 'קדש ברנע / רתמה' }, { t: '16. Rimon-Parets', he: 'רמן פרץ' }, { t: '17. Livna', he: 'לבנה' }, { t: '18. Rissa', he: 'רסה' },
                    { t: '19. Kehélata', he: 'קהלתה' }, { t: '20. Mont Chafer', he: 'הר שפר' }, { t: "21. 'Harada", he: 'חרדה' }, { t: '22. Makhélot', he: 'מקהלת' }, { t: "23. Ta'hat", he: 'תחת' },
                    { t: "24. Tara'h", he: 'תרח' }, { t: '25. Mitka', he: 'מתקה' }, { t: "26. 'Hachmona", he: 'חשמנה' }, { t: '27. Mossérot', he: 'מסרות' }, { t: '28. Bené-Yaakan', he: 'בני יעקן' },
                    { t: "29. 'Hor-Haguidgad", he: 'חר הגדגד' }, { t: '30. Yotvata', he: 'יטבתה' }, { t: '31. Avrona', he: 'עברנה' }, { t: '32. Etsion-Gaver', he: 'עציון גבר' },
                    { t: '33. Kadèch', he: 'קדש' }, { t: '34. Mont Hor', he: 'הר ההר' }
                ] },
                { title: 'Les huit dernières étapes — la quarantième année', items: [
                    { t: '35. Tsalmona', he: 'צלמנה' }, { t: '36. Pounone', he: 'פונן' }, { t: '37. Ovot', he: 'אבת' }, { t: "38. Yiei Ha'avarim", he: 'עיי העברים' },
                    { t: '39. Divon-Gad', he: 'דיבן גד' }, { t: '40. Almon-Divlataïma', he: 'עלמן דבלתימה' }, { t: '41. Monts des Avarim', he: 'הרי העברים' }, { t: '42. Plaines de Moab', he: 'ערבת מואב' }
                ] }
            ],
            // Les quarante années, an par an (années hébraïques depuis la création), avec les événements marquants.
            timeline: {
                title: 'Les quarante années dans le désert',
                note: "L'affaire des explorateurs a eu lieu la deuxième année suivant la sortie d'Égypte, mais D.ieu a rétroactivement commencé le compte des quarante ans depuis la première année, parce que cette longue période de pérégrinations avait déjà été envisagée après la faute du Veau d'or. D.ieu avait différé ce décret jusqu'à ce que « la mesure des fautes [d'Israël] soit comble », avec l'épisode des explorateurs (Rachi, Nombres 14,33).",
                rows: [
                    { year: 2448, label: 'Première année', events: [['Nissan', "Sortie d'Égypte"], ['Sivan', 'Don de la Torah'], ['Tamouz', "Faute du Veau d'or"]] },
                    { year: 2449, label: 'Deuxième année', events: [['Tichri', 'Ordre de construction du Tabernacle'], ['Nissan', 'Inauguration du Tabernacle'], ['Sivan', 'Envoi des explorateurs'], ['Av', 'Retour des explorateurs et verdict des quarante années dans le désert']] },
                    { year: 2487, label: 'Début de la quarantième année', events: [['Nissan', 'Décès de Miriam'], ['Av', "Décès d'Aaron"]] },
                    { year: 2488, label: 'Fin de la quarantième année', events: [['Adar', 'Décès de Moïse'], ['Nissan', "Entrée en Erets Israël"]] }
                ]
            }
        },
        {
            id: 'ebal', icon: '⛰️', name: 'Le mont Guerizim et le mont Ebal', ref: 'Deutéronome 11,29 ; 27,12',
            summary: "Dès l'entrée en Canaan, Israël se rassemble à Chékhem, entre deux montagnes : six tribus se tiennent sur le mont Guerizim pour la bénédiction, six sur le mont Ebal pour la malédiction, et les cohanim et les Lévites se tiennent entre les montagnes, avec l'Arche (Josué 8,33). Lévi est compté parmi les tribus du Guerizim, mais ce sont les Lévites, avec les cohanim, qui se tiennent entre les deux.",
            views: [
                { id: 'chekhem', label: 'Chékhem et les deux monts', bounds: [[35.12, 32.12], [35.46, 32.32]], full: true },
                { id: 'canaan', label: 'Dans le pays', bounds: [[34.3, 31.3], [36.1, 33.1]] }
            ],
            sections: [
                { title: 'Sur le mont Guerizim (la bénédiction)', items: [
                    { t: 'Siméon', he: 'שמעון' }, { t: 'Lévi *', he: 'לוי' }, { t: 'Juda', he: 'יהודה' }, { t: 'Issakhar', he: 'יששכר' }, { t: 'Joseph', he: 'יוסף' }, { t: 'Benjamin', he: 'בנימן' }
                ] },
                { title: 'Sur le mont Ebal (la malédiction)', items: [
                    { t: 'Ruben', he: 'ראובן' }, { t: 'Gad', he: 'גד' }, { t: 'Acher', he: 'אשר' }, { t: 'Zabulon', he: 'זבולן' }, { t: 'Dan', he: 'דן' }, { t: 'Naphtali', he: 'נפתלי' }
                ] },
                { title: 'Entre les montagnes', items: [{ t: 'Cohanim', he: 'כהנים' }, { t: 'Lévites *', he: 'לוים' }] }
            ],
            places: [
                { id: 'ebal', kind: 'mountain', n: 'Mont Ebal', he: 'הר עיבל', c: [35.265, 32.250], side: 'top', note: "Sur le mont Ebal, au nord de Chékhem, se placent Ruben, Gad, Acher, Zabulon, Dan et Naphtali, pour la malédiction. C'est là aussi que Josué bâtit un autel de pierres brutes et y écrit la Torah.", ref: 'Deutéronome 27,12-13 ; Josué 8,30-32' },
                { id: 'guerizim', kind: 'mountain', n: 'Mont Guerizim', he: 'הר גריזים', c: [35.265, 32.180], side: 'bottom', note: "Sur le mont Guerizim, au sud de Chékhem, se placent Siméon, Lévi, Juda, Issakhar, Joseph et Benjamin, pour la bénédiction.", ref: 'Deutéronome 27,12 ; 11,29' },
                { id: 'chekhem', lv: 0, side: 'left', note: "La ville entre les deux montagnes : c'est là qu'Abraham avait bâti son premier autel en Canaan, et là que Jacob avait acheté un champ.", ref: 'Genèse 12,6-7 ; 33,18-20' },
                { id: 'entre', kind: 'city', icon: '🕍', n: 'Entre les montagnes', he: 'כהנים · לוים', c: [35.345, 32.215], lv: 1, side: 'right', note: "Les cohanim et les Lévites se tiennent entre les deux montagnes, avec l'Arche, face aux tribus : les Lévites répondent « Amen » aux bénédictions et aux malédictions.", ref: 'Josué 8,33 ; Deutéronome 27,14' },
                { id: 'guilgal', kind: 'city', n: 'Guilgal', he: 'גלגל', c: [35.50, 31.95], lv: 0, side: 'left', views: ['canaan'], note: "Le premier camp d'Israël en Canaan, près du Jourdain, d'où le peuple monte vers Chékhem, puis où il revient après la cérémonie.", ref: 'Josué 4,19 ; 9,6' },
                { id: 'canaan-r', kind: 'region', n: 'CANAAN', he: 'כנען', c: [34.75, 31.70], lv: 0, views: ['canaan'] },
                { id: 'arava', kind: 'region', n: 'ARAVA', he: 'ערבה', c: [35.62, 32.35], lv: 0, views: ['canaan'] },
                { id: 'jourdain-l', kind: 'water', n: 'Jourdain', he: 'ירדן', c: [35.45, 32.72], lv: 0, views: ['canaan'] },
                { id: 'mer-morte', kind: 'water', n: 'Mer Morte', he: 'ים המלח', c: [35.30, 31.45], lv: 0, views: ['canaan'] },
                { id: 'mediterranee', kind: 'water', n: 'MER MÉDITERRANÉE', he: 'הים הגדול', c: [34.4, 32.4], views: ['canaan'] }
            ]
        },
        {
            id: 'tribus', icon: '🗺️', name: "Le partage de la terre d'Israël par tribu", ref: 'Nombres 32 ; Josué 13 – 19',
            summary: "Après la conquête, la terre est partagée par tirage au sort entre les tribus : neuf tribus et demie en Canaan, deux tribus et demie à l'est du Jourdain, Ruben, Gad et la moitié de Manassé, qui avaient demandé leur part avant la traversée. Siméon reçoit ses villes au milieu du lot de Juda, et Lévi, qui n'a pas de territoire, reçoit des villes dans toutes les tribus. Les contours sont dessinés à la main et approximatifs. La seconde carte montre l'héritage de Dan avec la part supplémentaire, selon Rachi sur Deutéronome 33,22.",
            views: [
                { id: 'terre', label: 'Toute la terre', bounds: [[33.9, 30.3], [36.7, 33.95]] },
                { id: 'centre', label: 'Le centre et le nord', bounds: [[34.6, 31.6], [36.3, 34.0]], full: true }
            ],
            variants: { label: 'Version', options: [{ id: 'partage', label: 'Le partage' }, { id: 'dan', label: 'Dan et sa part supplémentaire' }] },
            legend: [{ color: '#e8896a', text: 'Dan : son lot de la côte (et, dans la seconde carte, Léchem au nord)' }],
            zones: [
                { id: 'asher', color: '#6bb7b0', ring: [[35.117, 33.1], [35.279, 33.404], [35.279, 33.426], [35.294, 33.433], [35.545, 33.905], [35.828, 33.905], [35.666, 33.6], [35.65, 33.6], [35.65, 33.57], [35.639, 33.55], [35.581, 33.55], [35.558, 33.531], [35.55, 33.5], [35.513, 33.448], [35.52, 33.397], [35.503, 33.393], [35.49, 33.322], [35.496, 33.28], [35.482, 33.267], [35.482, 33.25], [35.462, 33.246], [35.441, 33.201], [35.445, 33.175], [35.42, 33.16], [35.358, 33.046], [35.301, 32.912], [35.281, 32.912], [35.265, 33.018], [35.22, 33.033], [35.211, 33.014], [35.19, 33.014], [35.181, 33.033], [35.183, 33.05], [35.15, 33.05], [35.15, 33.1]] },
                { id: 'naphtali', color: '#8e9fe0', ring: [[35.288, 32.888], [35.311, 32.946], [35.318, 32.994], [35.33, 32.997], [35.35, 33.058], [35.413, 33.171], [35.424, 33.177], [35.424, 33.194], [35.462, 33.278], [35.486, 33.288], [35.481, 33.331], [35.503, 33.414], [35.505, 33.46], [35.532, 33.499], [35.55, 33.5], [35.558, 33.531], [35.581, 33.55], [35.6, 33.55], [35.6, 33.5], [35.613, 33.5], [35.609, 33.49], [35.633, 33.49], [35.63, 33.45], [35.601, 33.439], [35.596, 33.412], [35.579, 33.41], [35.586, 33.345], [35.601, 33.343], [35.601, 33.154], [35.615, 32.977], [35.596, 32.95], [35.598, 32.914], [35.535, 32.916], [35.529, 32.952], [35.507, 32.95], [35.507, 32.929], [35.482, 32.927], [35.479, 32.871], [35.503, 32.863], [35.503, 32.845], [35.485, 32.833], [35.498, 32.829], [35.498, 32.814], [35.507, 32.807], [35.552, 32.805], [35.552, 32.786], [35.533, 32.767], [35.503, 32.707], [35.486, 32.692], [35.467, 32.692], [35.432, 32.724], [35.448, 32.807], [35.407, 32.826], [35.375, 32.795], [35.326, 32.803], [35.288, 32.867]] },
                { id: 'zabulon', color: '#f2b8a2', ring: [[34.934, 32.6], [35.117, 33.1], [35.15, 33.1], [35.15, 33.05], [35.183, 33.05], [35.182, 33.039], [35.194, 33.039], [35.203, 33.03], [35.213, 33.045], [35.273, 33.039], [35.286, 32.926], [35.307, 32.924], [35.298, 32.875], [35.337, 32.811], [35.365, 32.805], [35.396, 32.833], [35.432, 32.833], [35.45, 32.824], [35.458, 32.782], [35.441, 32.735], [35.473, 32.703], [35.496, 32.718], [35.524, 32.769], [35.571, 32.814], [35.59, 32.814], [35.603, 32.801], [35.607, 32.775], [35.626, 32.756], [35.626, 32.733], [35.605, 32.724], [35.603, 32.714], [35.547, 32.694], [35.541, 32.682], [35.467, 32.643], [35.443, 32.618], [35.422, 32.618], [35.386, 32.637], [35.384, 32.652], [35.364, 32.654], [35.362, 32.681], [35.347, 32.669], [35.347, 32.65], [35.311, 32.65], [35.237, 32.72], [35.229, 32.72], [35.232, 32.597], [35.192, 32.597], [35.103, 32.631], [35.018, 32.614], [35.017, 32.6]] },
                { id: 'issakhar', color: '#f5b86b', ring: [[35.215, 32.735], [35.248, 32.735], [35.252, 32.718], [35.32, 32.66], [35.337, 32.663], [35.348, 32.692], [35.371, 32.692], [35.377, 32.68], [35.401, 32.671], [35.399, 32.646], [35.433, 32.628], [35.458, 32.654], [35.471, 32.654], [35.524, 32.686], [35.526, 32.697], [35.569, 32.709], [35.607, 32.739], [35.63, 32.739], [35.632, 32.718], [35.647, 32.707], [35.647, 32.684], [35.601, 32.616], [35.601, 32.599], [35.579, 32.599], [35.447, 32.473], [35.422, 32.471], [35.416, 32.509], [35.407, 32.486], [35.295, 32.486], [35.292, 32.469], [35.273, 32.469], [35.248, 32.495], [35.233, 32.529], [35.233, 32.616]] },
                { id: 'manasse-o', color: '#b7a3dc', ring: [[34.992, 32.169], [35.011, 32.265], [35.022, 32.267], [35.037, 32.318], [35.045, 32.388], [35.041, 32.526], [35.016, 32.594], [35.018, 32.614], [35.067, 32.628], [35.103, 32.631], [35.133, 32.628], [35.203, 32.607], [35.222, 32.611], [35.222, 32.628], [35.241, 32.628], [35.241, 32.541], [35.267, 32.492], [35.399, 32.497], [35.405, 32.531], [35.424, 32.531], [35.43, 32.497], [35.445, 32.49], [35.53, 32.563], [35.571, 32.612], [35.592, 32.612], [35.624, 32.577], [35.615, 32.526], [35.622, 32.439], [35.615, 32.428], [35.615, 32.326], [35.626, 32.273], [35.626, 32.178], [35.615, 32.158], [35.605, 32.039], [35.588, 31.988], [35.599, 31.92], [35.59, 31.854], [35.601, 31.746], [35.537, 31.754], [35.522, 31.899], [35.511, 31.922], [35.305, 32.097], [35.309, 32.131], [35.277, 32.143], [35.275, 32.16], [35.256, 32.162], [35.22, 32.21], [35.164, 32.15]] },
                { id: 'ephraim', color: '#8fcf7e', ring: [[34.877, 31.911], [34.922, 31.994], [34.969, 32.128], [34.982, 32.131], [34.996, 32.177], [35.152, 32.158], [35.207, 32.22], [35.232, 32.218], [35.265, 32.171], [35.288, 32.169], [35.292, 32.15], [35.318, 32.148], [35.315, 32.107], [35.522, 31.928], [35.541, 31.803], [35.537, 31.758], [35.511, 31.758], [35.504, 31.788], [35.441, 31.777], [35.435, 31.784], [35.392, 31.778], [35.335, 31.792], [35.245, 31.792], [35.242, 31.887], [35.228, 31.878], [35.23, 31.845], [35.218, 31.841], [35.218, 31.784], [35.037, 31.812], [35.033, 31.828], [34.975, 31.845], [34.941, 31.845], [34.89, 31.871], [34.877, 31.886]] },
                { id: 'benjamin', color: '#6fb4e3', ring: [[35.007, 31.743], [35.009, 31.829], [35.209, 31.794], [35.218, 31.888], [35.254, 31.897], [35.256, 31.801], [35.345, 31.801], [35.354, 31.792], [35.401, 31.788], [35.447, 31.794], [35.451, 31.786], [35.513, 31.799], [35.522, 31.765], [35.589, 31.754], [35.592, 31.773], [35.611, 31.773], [35.626, 31.762], [35.626, 31.743], [35.609, 31.737], [35.609, 31.716], [35.586, 31.716], [35.56, 31.699], [35.471, 31.707], [35.43, 31.701], [35.418, 31.665], [35.379, 31.662], [35.335, 31.665], [35.335, 31.709], [35.309, 31.707], [35.309, 31.735], [35.298, 31.737], [35.288, 31.751], [35.284, 31.725], [35.296, 31.722], [35.296, 31.703], [35.256, 31.669], [35.241, 31.641], [35.171, 31.641], [35.116, 31.733]] },
                { id: 'dan', color: '#e8896a', ring: [[34.68, 31.9], [34.934, 32.6], [35.017, 32.6], [35.019, 32.586], [35.041, 32.571], [35.048, 32.537], [35.054, 32.409], [35.045, 32.307], [35.028, 32.235], [35.015, 32.231], [34.96, 32.052], [34.886, 31.894], [34.947, 31.854], [34.986, 31.852], [35.022, 31.839], [35.018, 31.75], [35.132, 31.737], [35.162, 31.682], [35.171, 31.631], [35.124, 31.584], [35.094, 31.586], [35.041, 31.607], [34.984, 31.645], [34.913, 31.705], [34.884, 31.753], [34.781, 31.828], [34.782, 31.85], [34.7, 31.85], [34.7, 31.9]], dan: true },
                { id: 'juda', color: '#d6d24a', ring: [[33.3, 31.091], [33.67, 31.13], [34.19, 31.317], [34.387, 31.484], [34.498, 31.608], [34.68, 31.9], [34.7, 31.9], [34.7, 31.85], [34.782, 31.85], [34.781, 31.828], [34.884, 31.752], [34.926, 31.692], [35.028, 31.611], [35.111, 31.577], [35.169, 31.631], [35.213, 31.639], [35.237, 31.656], [35.248, 31.68], [35.277, 31.707], [35.281, 31.765], [35.316, 31.762], [35.322, 31.729], [35.354, 31.724], [35.354, 31.701], [35.343, 31.694], [35.343, 31.677], [35.352, 31.671], [35.407, 31.673], [35.418, 31.686], [35.418, 31.711], [35.458, 31.714], [35.462, 31.741], [35.481, 31.741], [35.481, 31.716], [35.49, 31.711], [35.565, 31.707], [35.565, 31.678], [35.541, 31.658], [35.533, 31.616], [35.492, 31.529], [35.492, 31.477], [35.481, 31.46], [35.481, 31.358], [35.467, 31.335], [35.479, 31.228], [35.469, 31.178], [35.447, 31.129], [35.45, 31.056], [35.467, 31.045], [35.471, 30.999], [35.499, 30.997], [35.499, 30.973], [35.484, 30.937], [35.472, 30.938], [35.475, 30.89], [35.422, 30.811], [35.362, 30.763], [35.215, 30.741], [35.084, 30.743], [35.033, 30.724], [34.952, 30.714], [34.847, 30.663], [34.754, 30.584], [34.667, 30.565], [34.435, 30.537], [34.35, 30.503], [34.286, 30.494], [34.199, 30.518], [34.156, 30.546], [34.156, 30.56], [34.086, 30.624], [34.05, 30.669], [33.903, 30.677], [33.848, 30.733], [33.824, 30.809], [33.819, 30.918], [33.696, 30.881], [33.3, 30.84]] },
                { id: 'ruben', color: '#e0699f', ring: [[35.605, 31.754], [35.645, 31.75], [35.698, 31.822], [35.701, 31.848], [35.754, 31.895], [35.773, 31.895], [35.776, 31.882], [35.833, 31.875], [35.873, 31.843], [35.899, 31.833], [35.901, 31.822], [36.026, 31.816], [35.996, 31.552], [35.984, 31.548], [35.979, 31.443], [35.947, 31.256], [35.922, 31.256], [35.767, 31.303], [35.726, 31.326], [35.667, 31.326], [35.643, 31.312], [35.622, 31.312], [35.626, 31.399], [35.613, 31.437], [35.613, 31.501], [35.65, 31.68], [35.628, 31.707], [35.613, 31.707]] },
                { id: 'gad', color: '#f4cf3d', ring: [[35.579, 31.88], [35.592, 31.909], [35.581, 31.999], [35.598, 32.05], [35.603, 32.16], [35.618, 32.19], [35.618, 32.262], [35.607, 32.314], [35.611, 32.558], [35.622, 32.562], [35.643, 32.595], [35.756, 32.618], [35.824, 32.616], [35.843, 32.603], [35.856, 32.541], [35.86, 32.207], [35.869, 32.156], [35.947, 32.143], [36.401, 32.109], [36.407, 32.097], [36.445, 32.095], [36.447, 31.919], [36.456, 31.916], [36.458, 31.646], [36.43, 31.648], [36.42, 31.662], [36.398, 31.662], [36.352, 31.678], [36.35, 31.688], [36.305, 31.695], [36.29, 31.712], [36.245, 31.72], [36.22, 31.741], [36.162, 31.752], [36.079, 31.786], [36.067, 31.801], [35.886, 31.814], [35.879, 31.828], [35.803, 31.875], [35.745, 31.871], [35.737, 31.856], [35.709, 31.837], [35.65, 31.748], [35.622, 31.748], [35.586, 31.777]] },
                { id: 'manasse-e', color: '#f0a95a', ring: [[35.569, 33.437], [35.586, 33.437], [35.594, 33.452], [35.628, 33.462], [35.641, 33.482], [35.645, 33.526], [35.758, 33.52], [35.761, 33.505], [35.773, 33.512], [35.862, 33.505], [36.003, 33.512], [36.147, 33.56], [36.23, 33.569], [36.232, 33.578], [36.422, 33.584], [36.445, 32.095], [35.862, 32.146], [35.852, 32.195], [35.848, 32.529], [35.835, 32.592], [35.813, 32.609], [35.774, 32.609], [35.771, 32.599], [35.656, 32.597], [35.635, 32.577], [35.615, 32.577], [35.59, 32.603], [35.59, 32.624], [35.637, 32.697], [35.624, 32.707], [35.618, 32.745], [35.599, 32.763], [35.596, 32.79], [35.584, 32.801], [35.582, 32.846], [35.611, 32.89], [35.65, 32.912], [35.648, 32.95], [35.637, 32.952], [35.637, 33.016], [35.63, 33.031], [35.618, 33.031], [35.616, 33.094], [35.594, 33.171], [35.592, 33.328], [35.579, 33.331]] },
                { id: 'dan-nord', color: '#e8896a', ring: [[35.705, 33.829], [35.738, 33.817], [35.756, 33.773], [35.757, 33.694], [35.745, 33.634], [35.726, 33.586], [35.702, 33.534], [35.657, 33.531], [35.6, 33.53], [35.596, 33.574], [35.609, 33.634], [35.621, 33.694], [35.629, 33.755], [35.645, 33.797], [35.669, 33.821]], dan: true, variant: 'dan' }
            ],
            places: [
                { id: 'asher', kind: 'region', n: 'ACHER', he: 'אשר', c: [35.27, 33.4], lv: 0, offshore: true, note: "Le littoral du nord, du Carmel jusqu'à la région de Sidon, avec Acco et Tyr à ses limites.", ref: 'Josué 19,24-31' },
                { id: 'naphtali', kind: 'region', n: 'NAPHTALI', he: 'נפתלי', c: [35.492, 33.065], lv: 0, note: "La haute Galilée, de la vallée du Jourdain et du lac de Tibériade jusqu'aux frontières d'Acher.", ref: 'Josué 19,32-39' },
                { id: 'zabulon', kind: 'region', n: 'ZABULON', he: 'זבולן', c: [35.228, 32.811], lv: 1, note: "Entre le Carmel et le lac de Tibériade, au nord de la plaine de Jezréel : Jacob l'avait béni « sur le rivage des mers ».", ref: 'Josué 19,10-16 ; Genèse 49,13' },
                { id: 'issakhar', kind: 'region', n: 'ISSAKHAR', he: 'יששכר', c: [35.343, 32.575], lv: 1, note: 'La vallée de Jezréel, entre Zabulon et le Jourdain.', ref: 'Josué 19,17-23' },
                { id: 'manasse-o', kind: 'region', n: 'MANASSÉ (OUEST)', he: 'מנשה', c: [35.422, 32.295], lv: 0, note: "La moitié de la tribu de Manassé qui reçoit son lot en Canaan, entre le Carmel et la Samarie, au nord d'Éphraïm.", ref: 'Josué 17,1-13' },
                { id: 'ephraim', kind: 'region', n: 'ÉPHRAÏM', he: 'אפרים', c: [35.103, 31.994], lv: 0, note: "Au centre du pays, autour de Chékhem (qui est à la limite d'Éphraïm et de Manassé), avec Chilo.", ref: 'Josué 16' },
                { id: 'benjamin', kind: 'region', n: 'BENJAMIN', he: 'בנימן', c: [35.209, 31.724], lv: 1, note: 'Un lot étroit entre Éphraïm et Juda ; Jérusalem et Jéricho sont dans ses limites. Beit-El est à sa frontière nord.', ref: 'Josué 18,11-28' },
                { id: 'dan', kind: 'region', n: 'DAN', he: 'דן', c: [35.081, 31.673], lv: 1, note: 'Son lot, sur la côte (Joppé, Eltéqué), est trop étroit : les Danites conquièrent Léchem, au nord, et la nomment Dan.', ref: 'Josué 19,40-48 ; Juges 18' },
                { id: 'juda', kind: 'region', n: 'JUDA', he: 'יהודה', c: [35.216, 31.345], lv: 0, note: 'Le plus grand lot, du sud de Jérusalem à la mer Morte et au désert de Tsin ; Hébron y est donnée à Caleb. Le roi David en vient.', ref: 'Josué 15' },
                { id: 'simeon', kind: 'region', n: 'SIMÉON', he: 'שמעון', c: [34.571, 30.946], lv: 0, note: "Siméon n'a pas de territoire à part : ses villes (dont Béer-Chéva) sont prises « au milieu de l'héritage de Juda », car celui-ci était trop grand.", ref: 'Josué 19,1-9' },
                { id: 'ruben', kind: 'region', n: 'RUBEN', he: 'ראובן', c: [35.799, 31.495], lv: 0, note: "À l'est de la mer Morte, de l'Arnon à Heshbon : Ruben, Gad et la demi-tribu de Manassé reçoivent leur part avant le passage du Jourdain.", ref: 'Nombres 32 ; Josué 13,15-23' },
                { id: 'gad', kind: 'region', n: 'GAD', he: 'גד', c: [36.25, 32.0], lv: 0, note: 'En Transjordanie, de Heshbon au Jaboc et le long du Jourdain, avec une partie de Guilad.', ref: 'Nombres 32 ; Josué 13,24-28' },
                { id: 'manasse-e', kind: 'region', n: 'MANASSÉ (EST)', he: 'מנשה', c: [36.15, 32.95], lv: 0, note: "L'autre moitié de Manassé reçoit le Bachan et le nord de Guilad, à l'est du Jourdain.", ref: 'Nombres 32,33-42 ; Josué 13,29-31' },
                { id: 'dan-nord', kind: 'region', n: 'DAN', he: 'דן לשם', c: [35.85, 33.68], lv: 0, offshore: true, variant: 'dan', note: "Léchem (Laïch), conquise par les Danites, devient Dan. D'après le livre, qui cite Rachi sur Deutéronome 33,22, c'est la part supplémentaire de la tribu, ajoutée à son lot de la côte.", ref: 'Josué 19,47 ; Juges 18,27-29 ; Deutéronome 33,22' },
                { id: 'mediterranee', kind: 'water', n: 'MER MÉDITERRANÉE', he: 'הים הגדול', c: [34.2, 32.5] },
                { id: 'tiberiade', kind: 'water', n: 'Lac de Tibériade', he: 'ים כנרת', c: [35.82, 32.80], lv: 1 },
                { id: 'mer-morte', kind: 'water', n: 'Mer Morte', he: 'ים המלח', c: [35.25, 31.45], lv: 1 }
            ]
        }
    ];

    // --- Accès ---------------------------------------------------------------------------------------
    function mapById(id) {
        return MAPS.filter(function (m) { return m.id === id; })[0] || null;
    }

    // Un lieu de la carte, complété par ses données communes (PLACES) : nom, nom hébreu, position. Les champs de la carte l'emportent.
    function resolvePlace(place) {
        var base = PLACES[place.id] || {};
        var out = {};
        Object.keys(base).forEach(function (k) { out[k] = base[k]; });
        Object.keys(place).forEach(function (k) { out[k] = place[k]; });
        out.kind = out.kind || 'city';
        out.lv = out.lv || 0;
        return out;
    }

    function placesOf(map) {
        return map.places.map(resolvePlace);
    }

    function viewById(map, viewId) {
        return map.views.filter(function (v) { return v.id === viewId; })[0] || map.views[0];
    }

    // Le lieu apparaît-il dans cette vue, avec cette version (pour la poursuite d'Abraham) ?
    function visibleIn(place, viewId, variantId) {
        if (place.views && place.views.indexOf(viewId) === -1) return false;
        if (place.variant && place.variant !== variantId) return false;
        return true;
    }

    // Un arc entre deux points : une courbe de Bézier quadratique, pour que les flèches aient un tracé « à la main ». `bend` : l'écart du
    // point de contrôle, en fraction de la longueur (négatif : de l'autre côté).
    function curve(from, to, bend) {
        var dx = to[0] - from[0], dy = to[1] - from[1];
        var cx = (from[0] + to[0]) / 2 - dy * (bend || 0), cy = (from[1] + to[1]) / 2 + dx * (bend || 0);
        var pts = [];
        for (var i = 0; i <= 16; i++) {
            var t = i / 16, u = 1 - t;
            pts.push([u * u * from[0] + 2 * u * t * cx + t * t * to[0], u * u * from[1] + 2 * u * t * cy + t * t * to[1]]);
        }
        return pts;
    }

    // Lisse une ligne brisée (Chaikin, deux passes) : les routes de la poursuite d'Abraham suivent des points repères, sans angles vifs.
    function smooth(pts) {
        var out = pts;
        for (var pass = 0; pass < 3; pass++) {
            var next = [out[0]];
            for (var i = 0; i < out.length - 1; i++) {
                var a = out[i], b = out[i + 1];
                next.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]], [0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
            }
            next.push(out[out.length - 1]);
            out = next;
        }
        return out;
    }

    // Le tracé d'une route : un arc entre deux points, ou une ligne lissée par plusieurs points.
    function routePath(route) {
        return route.pts ? smooth(route.pts) : curve(route.from, route.to, route.bend);
    }

    // Le cap (degrés dans le sens horaire depuis le nord) de la fin du tracé, en projection de Mercator : l'orientation de la pointe de flèche.
    function endBearing(path) {
        var a = path[path.length - 3] || path[0], b = path[path.length - 1];
        function y(lat) { return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)); }
        var dx = (b[0] - a[0]) * Math.PI / 180, dy = y(b[1]) - y(a[1]);
        return (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    }

    // Le milieu du tracé, où se pose le numéro de la flèche.
    function midPoint(path) {
        return path[Math.floor(path.length / 2)];
    }

    // L'anneau fermé (le premier point répété à la fin), comme l'exige GeoJSON.
    function closeRing(ring) {
        var a = ring[0], b = ring[ring.length - 1];
        return a[0] === b[0] && a[1] === b[1] ? ring.slice() : ring.concat([a]);
    }

    function inBounds(c, bounds) {
        return c[0] >= bounds[0][0] && c[0] <= bounds[1][0] && c[1] >= bounds[0][1] && c[1] <= bounds[1][1];
    }

    return {
        MAPS: MAPS, PLACES: PLACES, HYDRO: HYDRO, mapById: mapById, resolvePlace: resolvePlace, placesOf: placesOf, viewById: viewById, visibleIn: visibleIn,
        closeRing: closeRing, curve: curve, smooth: smooth, routePath: routePath, endBearing: endBearing, midPoint: midPoint, inBounds: inBounds
    };
}));
