// =========================================================================
// === LES DÉCOUPAGES DE L'HISTOIRE SELON LES PAYS (données de l'outil « Repères de périodes ») ===
// =========================================================================
// « Antiquité, Moyen Âge, Temps modernes » est un découpage français, hérité de l'Europe de la Renaissance : il ne dit rien des autres
// régions du monde, qui découpent le temps autrement (par dynasties en Chine, par ères et par shogunats au Japon, par grandes dominations
// en Inde, par califats dans le monde arabo-musulman…). Chaque découpage est une suite de périodes qui se suivent sans trou ni recouvrement
// (là où des dynasties coexistaient, on suit la période que les manuels retiennent et on le dit).
//
// Une période : { id, name, start, end, bounds, debated? } ; `start` et `end` sont des années signées (−221 = 221 av. J.-C.), `start`
// inclus, `end` exclu ; null au début de la première, ou à la fin de la dernière (« jusqu'à aujourd'hui »).
// Un découpage : { id, name, flag, intro, doubts?: [{ from, to, text }], periods }. Testé dans tests/toolsCore.test.js.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PeriodSystems = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var SYSTEMS = [
        {
            id: 'france', name: 'France', flag: '🇫🇷',
            intro: 'Le découpage des programmes français, hérité des humanistes de la Renaissance : l\'Antiquité, le Moyen Âge (un « âge du milieu »), puis les Temps modernes. Il est pensé à partir de l\'Europe occidentale.',
            doubts: [
                { from: 470, to: 480, text: 'proche de 476, borne discutée entre l\'Antiquité et le Moyen Âge' },
                { from: 1450, to: 1495, text: 'entre 1453 et 1492, bornes discutées de la fin du Moyen Âge' }
            ],
            periods: [
                {
                    id: 'prehistoire', name: 'Préhistoire', start: null, end: -3300,
                    bounds: 'Des premiers humains jusqu\'à l\'invention de l\'écriture, vers 3300 av. J.-C. (Sumer, en Mésopotamie).',
                    debated: 'La date de fin dépend des régions : l\'écriture apparaît vers 3300 av. J.-C. au Proche-Orient, bien plus tard ailleurs. On distingue le Paléolithique, le Néolithique (premiers agriculteurs) et l\'âge des métaux.'
                },
                {
                    id: 'antiquite', name: 'Antiquité', start: -3300, end: 476,
                    bounds: 'De l\'invention de l\'écriture (vers 3300 av. J.-C.) à la chute de l\'Empire romain d\'Occident (476).',
                    debated: '476, c\'est la déposition du dernier empereur d\'Occident, Romulus Augustule. Certains historiens préfèrent 395 (partage de l\'Empire), d\'autres la fin du VIIe siècle ; l\'Empire romain d\'Orient dure jusqu\'en 1453.'
                },
                {
                    id: 'moyenage', name: 'Moyen Âge', start: 476, end: 1492,
                    bounds: 'De 476 à 1492, la découverte de l\'Amérique par Christophe Colomb.',
                    debated: 'La fin est très discutée : 1453 (prise de Constantinople, fin de la guerre de Cent Ans) ou 1492 (Amérique) ou encore 1517 (début de la Réforme). On le divise en haut Moyen Âge (jusqu\'à l\'an mil), Moyen Âge central et bas Moyen Âge.'
                },
                {
                    id: 'modernes', name: 'Temps modernes', start: 1492, end: 1789,
                    bounds: 'De 1492 à 1789, le début de la Révolution française.',
                    debated: 'Dans les pays anglophones, « Modern history » commence souvent vers 1500 et continue jusqu\'à nos jours. En France, on arrête à 1789 (ou 1815, fin des guerres napoléoniennes).'
                },
                {
                    id: 'xix', name: 'De 1789 à 1914', start: 1789, end: 1914,
                    bounds: 'De la Révolution française au début de la Première Guerre mondiale. C\'est le début de l\'époque contemporaine.',
                    debated: 'On parle du « long XIXe siècle » : il commence en 1789 et se termine en 1914, pas en 1801 ni en 1900.'
                },
                {
                    id: 'contemporain', name: 'Depuis 1914', start: 1914, end: null,
                    bounds: 'De 1914 à aujourd\'hui, la seconde partie de l\'époque contemporaine.',
                    debated: 'Le « court XXe siècle » va de 1914 à 1991 (fin de l\'URSS). Où s\'arrête l\'époque contemporaine, les historiens en débattent encore : on parle parfois de « temps présent » après 1945 ou 1989.'
                }
            ]
        },
        {
            id: 'anglophone', name: 'Monde anglophone', flag: '🇬🇧',
            intro: 'Au Royaume-Uni et aux États-Unis, on découpe aussi en « Ancient », « Medieval » et « Modern », mais le « Modern » est coupé en plusieurs morceaux (« Early Modern », « Modern », « Contemporary »), et le Moyen Âge est souvent daté de 500 à 1500 plutôt que de 476 à 1492. L\'histoire nationale a aussi ses propres coupures (les Tudors, l\'ère victorienne, la guerre de Sécession).',
            doubts: [
                { from: 470, to: 510, text: 'vers 476 ou 500, selon qu\'on date la fin de l\'Antiquité de la chute de Rome ou d\'un « Ve siècle » rond' },
                { from: 1450, to: 1520, text: 'entre 1453, 1485, 1492 et 1517, bornes discutées du début de l\'« Early Modern »' }
            ],
            periods: [
                {
                    id: 'prehistory', name: 'Préhistoire (Prehistory)', start: null, end: -3300,
                    bounds: 'Jusqu\'à l\'apparition de l\'écriture, vers 3300 av. J.-C.',
                    debated: 'Les mondes anglophone et français s\'accordent à peu près : la limite est l\'écriture, dont la date varie selon les régions.'
                },
                {
                    id: 'ancient', name: 'Histoire ancienne (Ancient history)', start: -3300, end: 476,
                    bounds: 'De l\'écriture à la chute de l\'Empire romain d\'Occident (476).',
                    debated: 'On trouve aussi « Late Antiquity » (IIIe-VIIe siècle), qui voit moins une rupture en 476 qu\'une lente transformation du monde romain.'
                },
                {
                    id: 'medieval', name: 'Moyen Âge (Middle Ages, Medieval)', start: 476, end: 1500,
                    bounds: 'De 476 à environ 1500. En histoire de l\'Angleterre, on s\'arrête souvent en 1485, à la bataille de Bosworth, qui ouvre le règne des Tudors.',
                    debated: 'Le haut Moyen Âge s\'appelle parfois « Dark Ages », une expression que les historiens récusent. Les États-Unis ont une histoire « coloniale » qui ne commence qu\'au XVIe siècle.'
                },
                {
                    id: 'early-modern', name: 'Début de l\'époque moderne (Early Modern)', start: 1500, end: 1800,
                    bounds: 'De 1500 environ à 1800 : Renaissance, Réforme, grandes découvertes, colonisation de l\'Amérique, révolutions anglaise, américaine et française.',
                    debated: 'Cette période est un découpage propre au monde anglophone ; en France, elle est comprise dans les « Temps modernes », qui vont de 1492 à 1789.'
                },
                {
                    id: 'modern', name: 'Époque moderne (Modern, Late Modern)', start: 1800, end: 1945,
                    bounds: 'De 1800 environ à 1945 : révolution industrielle, ère victorienne, expansion des États-Unis, guerres mondiales.',
                    debated: 'Dans les universités américaines, « Modern history » commence souvent vers 1500 et couvre tout ce qui suit. Pour le XIXe siècle, on dit « long nineteenth century » (1789-1914).'
                },
                {
                    id: 'contemporary', name: 'Histoire contemporaine (Contemporary)', start: 1945, end: null,
                    bounds: 'Depuis 1945 : guerre froide, décolonisation, mondialisation.',
                    debated: 'La borne varie : 1914, 1945 ou 1989 selon les historiens. Les Anglo-Saxons parlent aussi de « post-war » (l\'après-guerre).'
                }
            ]
        },
        {
            id: 'allemagne', name: 'Allemagne', flag: '🇩🇪',
            intro: 'L\'histoire allemande se découpe d\'abord par ses ruptures politiques : la Réforme (1517), la fin du Saint-Empire (1806), l\'unité de 1871, puis les régimes qui se succèdent au XXe siècle. Le mot « Neuzeit » (temps nouveau) y est plus utilisé que « temps modernes », et 1945 ou 1990 y comptent plus que 1789.',
            doubts: [
                { from: 470, to: 480, text: 'proche de 476, borne discutée de la fin de l\'Antiquité' },
                { from: 1485, to: 1520, text: 'entre 1492 et 1517 (la Réforme), bornes discutées du début de la « Frühe Neuzeit »' }
            ],
            periods: [
                {
                    id: 'vorgeschichte', name: 'Préhistoire (Vor- und Frühgeschichte)', start: null, end: -3300,
                    bounds: 'Jusqu\'à l\'invention de l\'écriture. L\'Allemagne a sa propre « Vorgeschichte » jusqu\'au contact avec le monde romain.',
                    debated: 'Pour les territoires germaniques, la préhistoire dure bien plus longtemps qu\'au Proche-Orient : l\'écriture n\'y arrive que par Rome.'
                },
                {
                    id: 'altertum', name: 'Antiquité (Altertum)', start: -3300, end: 476,
                    bounds: 'De l\'écriture à la fin de l\'Empire romain d\'Occident (476). Pour l\'Allemagne, c\'est aussi l\'époque des peuples germaniques et de la frontière du Rhin et du Danube.',
                    debated: 'On cite aussi l\'an 9 (défaite de Varus dans la forêt de Teutobourg), qui arrête l\'expansion romaine à l\'est du Rhin.'
                },
                {
                    id: 'mittelalter', name: 'Moyen Âge (Mittelalter)', start: 476, end: 1500,
                    bounds: 'De 476 à environ 1500 : royaumes francs, Saint-Empire (962), Hanse, Empire des Habsbourg.',
                    debated: 'La fin se place vers 1500 (invention de l\'imprimerie, découverte de l\'Amérique, Réforme à venir) : 1492 et 1517 sont les repères les plus cités.'
                },
                {
                    id: 'fruehe-neuzeit', name: 'Début des temps nouveaux (Frühe Neuzeit)', start: 1500, end: 1806,
                    bounds: 'De 1500 à 1806 : Réforme (1517), guerre de Trente Ans (1618-1648), absolutisme, Lumières, puis fin du Saint-Empire en 1806.',
                    debated: 'On coupe parfois en 1648 (paix de Westphalie) ou en 1789 (Révolution française). 1806 est une date typiquement allemande : l\'empereur François II renonce à la couronne.'
                },
                {
                    id: 'unite', name: 'Du Saint-Empire à l\'unité (1806-1871)', start: 1806, end: 1871,
                    bounds: 'Occupation napoléonienne, Confédération germanique (1815), révolutions de 1848, puis unité allemande dirigée par la Prusse de Bismarck.',
                    debated: 'La période est aussi appelée « Vormärz » (avant mars 1848) puis « Reichsgründungszeit » (époque de la fondation du Reich).'
                },
                {
                    id: 'kaiserreich', name: 'Empire allemand (Kaiserreich)', start: 1871, end: 1918,
                    bounds: 'De la proclamation de l\'Empire à Versailles (18 janvier 1871) à la défaite de 1918 et l\'abdication de Guillaume II.',
                    debated: 'On distingue souvent l\'ère Bismarck (jusqu\'en 1890) de l\'ère de Guillaume II (« Wilhelminisme »).'
                },
                {
                    id: 'weimar', name: 'République de Weimar', start: 1918, end: 1933,
                    bounds: 'De la révolution de novembre 1918 à l\'arrivée d\'Hitler au pouvoir (30 janvier 1933).',
                    debated: 'La fin est datée de 1933, mais on parle de crise de la république dès 1930 (gouvernements présidentiels).'
                },
                {
                    id: 'nazisme', name: 'Troisième Reich (nazisme)', start: 1933, end: 1945,
                    bounds: 'De 1933 à la capitulation allemande de mai 1945 : dictature nazie, Seconde Guerre mondiale, génocide des Juifs d\'Europe.',
                    debated: 'Les Allemands disent « Zeitgeschichte » (histoire du temps présent) pour la période qui commence en 1917 ou 1945, encore vécue par des témoins.'
                },
                {
                    id: 'division', name: 'Allemagne divisée (1945-1990)', start: 1945, end: 1990,
                    bounds: 'Occupation par les quatre Alliés, puis deux États : la République fédérale (RFA) et la République démocratique (RDA), de 1949 à 1990. Chute du Mur de Berlin en 1989.',
                    debated: 'On cite aussi 1949 (création des deux États) comme début de la période.'
                },
                {
                    id: 'reunifiee', name: 'Allemagne réunifiée (depuis 1990)', start: 1990, end: null,
                    bounds: 'Depuis la réunification du 3 octobre 1990.',
                    debated: 'Les historiens parlent de « Berliner Republik » (République de Berlin), par contraste avec la « Bonner Republik » (RFA, capitale Bonn).'
                }
            ]
        },
        {
            id: 'chine', name: 'Chine', flag: '🇨🇳',
            intro: 'Le découpage de l\'histoire chinoise est dynastique : une dynastie, une époque. Chaque nom désigne la famille qui règne et le « mandat du Ciel » qu\'elle a reçu. La coupure est faite par la chute d\'une dynastie, pas par un siècle. Certaines dynasties ont coexisté ; on suit ici celle que les manuels retiennent pour chaque période.',
            periods: [
                {
                    id: 'neolithique', name: 'Préhistoire et Néolithique', start: null, end: -2070,
                    bounds: 'Des premiers habitants jusqu\'aux premiers États, vers 2070 av. J.-C. : cultures néolithiques du fleuve Jaune et du Yangzi (Yangshao, Longshan, Liangzhu).',
                    debated: 'La date de 2070 av. J.-C. est celle que la Chine officielle retient pour la fondation de la dynastie Xia ; elle est conventionnelle.'
                },
                {
                    id: 'xia', name: 'Xia (vers 2070-1600 av. J.-C.)', start: -2070, end: -1600,
                    bounds: 'La première dynastie de la tradition, fondée par Yu le Grand, qui aurait dompté les crues.',
                    debated: 'Son existence historique est discutée : on n\'a pas d\'écrit de l\'époque. Le site d\'Erlitou est parfois relié aux Xia.'
                },
                {
                    id: 'shang', name: 'Shang', start: -1600, end: -1046,
                    bounds: 'De 1600 à 1046 av. J.-C. : premiers écrits (inscriptions sur os divinatoires), bronze, capitale à Anyang.',
                    debated: 'Les dates exactes varient d\'un siècle selon les chronologies.'
                },
                {
                    id: 'zhou', name: 'Zhou (dont Printemps et Automnes, Royaumes combattants)', start: -1046, end: -221,
                    bounds: 'De 1046 à 221 av. J.-C. Le pouvoir des rois Zhou s\'effrite : la période des Printemps et Automnes (770-476) puis celle des Royaumes combattants (475-221) voient naître Confucius, Laozi et les « cent écoles de pensée ».',
                    debated: 'Les rois Zhou disparaissent en 256 av. J.-C., mais les États combattants continuent jusqu\'à l\'unification de 221.'
                },
                {
                    id: 'qin', name: 'Qin', start: -221, end: -206,
                    bounds: 'De 221 à 206 av. J.-C. : Qin Shi Huangdi unifie la Chine et se proclame « premier empereur ». Début de l\'Empire.',
                    debated: 'Très courte dynastie, mais fondatrice : le mot « Chine » vient de son nom.'
                },
                {
                    id: 'han', name: 'Han', start: -206, end: 220,
                    bounds: 'De 206 av. J.-C. à 220 : papier, routes de la soie, confucianisme comme doctrine d\'État. On distingue les Han occidentaux et orientaux, séparés par l\'interrègne de Wang Mang (9-23).',
                    debated: 'Aujourd\'hui, les Chinois majoritaires se disent « Han », du nom de cette dynastie.'
                },
                {
                    id: 'six-dynasties', name: 'Trois Royaumes et dynasties du Nord et du Sud', start: 220, end: 581,
                    bounds: 'De 220 à 581 : division de la Chine (Wei, Shu, Wu, puis dynasties du Nord et du Sud) et arrivée du bouddhisme.',
                    debated: 'Plusieurs États coexistent ; on parle aussi de « période de désunion ».'
                },
                {
                    id: 'sui', name: 'Sui', start: 581, end: 618,
                    bounds: 'De 581 à 618 : réunification de la Chine (589) et construction du Grand Canal.',
                    debated: 'Dynastie brève, qui prépare la suivante.'
                },
                {
                    id: 'tang', name: 'Tang', start: 618, end: 907,
                    bounds: 'De 618 à 907 : « âge d\'or » de la Chine, capitale Chang\'an (une des plus grandes villes du monde), grande poésie (Li Bai, Du Fu), expansion.',
                    debated: 'La rébellion d\'An Lushan (755-763) marque le début du déclin.'
                },
                {
                    id: 'cinq-dynasties', name: 'Cinq Dynasties et Dix Royaumes', start: 907, end: 960,
                    bounds: 'De 907 à 960 : nouvelle division, dans le nord comme dans le sud.',
                    debated: 'Les Liao (Khitan) existent au nord depuis 916 et se maintiennent jusqu\'en 1125.'
                },
                {
                    id: 'song', name: 'Song', start: 960, end: 1279,
                    bounds: 'De 960 à 1279 : essor économique, imprimerie, boussole, poudre ; examens impériaux. Les Song du Nord perdent le nord du pays en 1127 ; les Song du Sud durent jusqu\'en 1279.',
                    debated: 'Les Song coexistent avec les empires Liao, Xia occidentaux puis Jin.'
                },
                {
                    id: 'yuan', name: 'Yuan', start: 1279, end: 1368,
                    bounds: 'De 1279 à 1368 : la Chine fait partie de l\'Empire mongol, sous Kubilai Khan (capitale Khanbaliq, l\'actuelle Pékin).',
                    debated: 'Kubilai proclame la dynastie en 1271, mais la conquête des Song n\'est achevée qu\'en 1279.'
                },
                {
                    id: 'ming', name: 'Ming', start: 1368, end: 1644,
                    bounds: 'De 1368 à 1644 : restauration d\'une dynastie chinoise, Cité interdite, Grande Muraille actuelle, voyages de Zheng He.',
                    debated: 'La chute en 1644 est celle de Pékin face à une révolte, puis la prise du pouvoir par les Mandchous.'
                },
                {
                    id: 'qing', name: 'Qing', start: 1644, end: 1912,
                    bounds: 'De 1644 à 1912 : dynastie mandchoue, dernier empire. Guerres de l\'opium (1839-1842, 1856-1860), rébellion des Taiping, abdication du dernier empereur, Puyi, en 1912.',
                    debated: 'Le XIXe siècle est appelé « siècle d\'humiliation » : traités inégaux et concessions aux puissances étrangères.'
                },
                {
                    id: 'republique', name: 'République de Chine', start: 1912, end: 1949,
                    bounds: 'De 1912 à 1949 : période des seigneurs de la guerre, invasion japonaise (1937-1945), guerre civile entre nationalistes (Guomindang) et communistes.',
                    debated: 'La République de Chine se maintient à Taïwan depuis 1949.'
                },
                {
                    id: 'rpc', name: 'République populaire de Chine', start: 1949, end: null,
                    bounds: 'Depuis le 1er octobre 1949, proclamation de la République populaire par Mao Zedong. Grand Bond en avant, Révolution culturelle, réformes de Deng Xiaoping (1978).',
                    debated: 'On distingue souvent l\'« ère Mao » (1949-1976) de l\'« ère des réformes » (depuis 1978).'
                }
            ]
        },
        {
            id: 'japon', name: 'Japon', flag: '🇯🇵',
            intro: 'L\'histoire japonaise se découpe par les lieux où siège le pouvoir (Nara, Heian, Kamakura, Muromachi, Edo), puis, à l\'époque moderne, par le règne de chaque empereur (Meiji, Taishō, Shōwa, Heisei, Reiwa) : l\'ère change à chaque règne. Le nom d\'une période est celui d\'une capitale, d\'un shogunat ou d\'un empereur.',
            periods: [
                {
                    id: 'jomon', name: 'Jōmon', start: null, end: -300,
                    bounds: 'Jusqu\'à environ 300 av. J.-C. : chasseurs-cueilleurs, poteries décorées de cordes (« jōmon » veut dire « motif de corde »), une des plus anciennes poteries connues.',
                    debated: 'Les débuts remontent à plus de 14 000 ans.'
                },
                {
                    id: 'yayoi', name: 'Yayoi', start: -300, end: 250,
                    bounds: 'De 300 av. J.-C. à 250 environ : riziculture, métal (fer et bronze) venus du continent.',
                    debated: 'Des datations récentes au radiocarbone font remonter le début à 900-1000 av. J.-C.'
                },
                {
                    id: 'kofun', name: 'Kofun', start: 250, end: 538,
                    bounds: 'De 250 à 538 environ : grands tumulus funéraires (« kofun »), formation de l\'État de Yamato.',
                    debated: 'Certains historiens font durer le Kofun jusqu\'en 710 et fusionnent Asuka avec lui.'
                },
                {
                    id: 'asuka', name: 'Asuka', start: 538, end: 710,
                    bounds: 'De 538 (ou 552) à 710 : arrivée du bouddhisme, réformes de Taika (645), premier code de lois à la chinoise.',
                    debated: 'La date de l\'arrivée du bouddhisme est 538 ou 552 selon les chroniques.'
                },
                {
                    id: 'nara', name: 'Nara', start: 710, end: 794,
                    bounds: 'De 710 à 794 : capitale fixe à Nara (Heijō-kyō), premiers livres d\'histoire (Kojiki, Nihon shoki).',
                    debated: 'Période courte, mais où l\'État impérial est à son plus fort.'
                },
                {
                    id: 'heian', name: 'Heian', start: 794, end: 1185,
                    bounds: 'De 794 à 1185 : capitale à Heian-kyō (Kyoto), culture de cour raffinée (Dit du Genji, écriture kana), puissance des Fujiwara.',
                    debated: 'La fin est la victoire de Minamoto sur les Taira (1185).'
                },
                {
                    id: 'kamakura', name: 'Kamakura', start: 1185, end: 1333,
                    bounds: 'De 1185 à 1333 : premier shogunat, pouvoir réel des guerriers (samouraïs). Invasions mongoles repoussées en 1274 et 1281.',
                    debated: 'On dit aussi 1192, quand Minamoto no Yoritomo devient shogun.'
                },
                {
                    id: 'muromachi', name: 'Muromachi', start: 1333, end: 1573,
                    bounds: 'De 1333 à 1573 : shogunat des Ashikaga, siège à Kyoto. La fin est la « période des provinces en guerre » (Sengoku), avec l\'arrivée des Portugais en 1543.',
                    debated: 'Le shogunat des Ashikaga ne date que de 1336-1338 : on inclut ici la brève « restauration de Kenmu » (1333-1336).'
                },
                {
                    id: 'azuchi-momoyama', name: 'Azuchi-Momoyama', start: 1573, end: 1603,
                    bounds: 'De 1573 à 1603 : unification du pays par Oda Nobunaga puis Toyotomi Hideyoshi.',
                    debated: 'Période très brève, parfois comprise dans celle d\'Edo ou de Muromachi.'
                },
                {
                    id: 'edo', name: 'Edo (Tokugawa)', start: 1603, end: 1868,
                    bounds: 'De 1603 à 1868 : shogunat des Tokugawa, siège à Edo (Tokyo), paix de plus de deux siècles et fermeture du pays (sakoku) sauf quelques ports.',
                    debated: 'L\'arrivée des navires du commodore Perry (1853-1854) ouvre le pays ; la fin est la restauration de Meiji.'
                },
                {
                    id: 'meiji', name: 'Meiji', start: 1868, end: 1912,
                    bounds: 'De 1868 à 1912, règne de l\'empereur Mutsuhito : modernisation et industrialisation, victoires sur la Chine (1895) et la Russie (1905).',
                    debated: 'Le nom de l\'ère (« gouvernement éclairé ») sert aussi de nom à l\'empereur après sa mort.'
                },
                {
                    id: 'taisho', name: 'Taishō', start: 1912, end: 1926,
                    bounds: 'De 1912 à 1926, règne de l\'empereur Yoshihito : démocratie « Taishō », grand séisme du Kantō (1923).',
                    debated: 'Un des règnes les plus courts, mais où la vie politique est la plus ouverte.'
                },
                {
                    id: 'showa', name: 'Shōwa', start: 1926, end: 1989,
                    bounds: 'De 1926 à 1989, règne d\'Hirohito : militarisme, guerre du Pacifique, défaite de 1945, occupation américaine, « miracle économique ».',
                    debated: 'L\'ère est coupée en deux par 1945 : « Shōwa d\'avant-guerre » et « Shōwa d\'après-guerre ».'
                },
                {
                    id: 'heisei', name: 'Heisei', start: 1989, end: 2019,
                    bounds: 'De 1989 à 2019, règne d\'Akihito : éclatement de la bulle économique, « décennies perdues », séisme et tsunami de 2011. Il abdique, ce qui est rare.',
                    debated: 'Akihito est le premier empereur à abdiquer depuis 1817.'
                },
                {
                    id: 'reiwa', name: 'Reiwa', start: 2019, end: null,
                    bounds: 'Depuis le 1er mai 2019, règne de Naruhito.',
                    debated: 'L\'ère change à chaque règne : la fin de Reiwa sera celle du règne de Naruhito.'
                }
            ]
        },
        {
            id: 'inde', name: 'Inde', flag: '🇮🇳',
            intro: 'L\'histoire indienne est souvent découpée en « ancienne », « médiévale » et « moderne », mais pas aux mêmes dates qu\'en Europe : la période médiévale commence avec les royaumes régionaux du Ve-VIe siècle et les premières dominations musulmanes, et la période moderne avec la domination coloniale britannique. Les grandes périodes portent le nom du pouvoir dominant.',
            doubts: [
                { from: 1755, to: 1760, text: 'proche de 1757 (bataille de Plassey), borne discutée du début de la domination britannique (d\'autres disent 1858)' }
            ],
            periods: [
                {
                    id: 'antiquite', name: 'Antiquité', start: null, end: 550,
                    bounds: 'Des origines à environ 550 : civilisation de l\'Indus (vers 2600-1900 av. J.-C.), âge védique, empire maurya (321-185 av. J.-C., Ashoka) et empire gupta (320-550, « âge classique »).',
                    debated: 'Les Indiens disent souvent « ancient India » pour tout ce qui précède 1200 environ ; on a ici coupé à la chute des Gupta.'
                },
                {
                    id: 'haut-moyen-age', name: 'Royaumes régionaux (Moyen Âge ancien)', start: 550, end: 1206,
                    bounds: 'De 550 à 1206 : royaumes régionaux (Chola, Chalukya, Rajputs…), premières conquêtes musulmanes (Sind en 711, raids de Mahmud de Ghazni).',
                    debated: 'La coupure à 1206 est celle de la fondation du sultanat de Delhi.'
                },
                {
                    id: 'delhi', name: 'Sultanat de Delhi', start: 1206, end: 1526,
                    bounds: 'De 1206 à 1526 : cinq dynasties successives de sultans musulmans, centrés sur Delhi. Le Sud est dominé par l\'empire hindou de Vijayanagara (1336-1646).',
                    debated: 'Timur pille Delhi en 1398, ce qui affaiblit durablement le sultanat.'
                },
                {
                    id: 'moghols', name: 'Empire moghol', start: 1526, end: 1757,
                    bounds: 'De 1526 (bataille de Panipat, Babur) à 1757 : empire dont l\'apogée est sous Akbar (1556-1605) et Aurangzeb (mort en 1707). Taj Mahal (1632-1653).',
                    debated: 'L\'empire existe formellement jusqu\'en 1857, mais n\'a plus de pouvoir réel après 1707, voire après 1757.'
                },
                {
                    id: 'colonisation', name: 'Domination britannique', start: 1757, end: 1947,
                    bounds: 'De 1757 (bataille de Plassey, la Compagnie des Indes orientales prend le Bengale) à 1947. Après la révolte des cipayes (1857), la Couronne gouverne directement : le « Raj » (1858-1947).',
                    debated: 'Début de la période : 1757 (Compagnie) ou 1858 (Raj) selon qu\'on prend la conquête ou le gouvernement direct.'
                },
                {
                    id: 'independance', name: 'Inde indépendante', start: 1947, end: null,
                    bounds: 'Depuis le 15 août 1947 : indépendance et partition de l\'Inde britannique en deux États, l\'Inde et le Pakistan. Constitution de 1950.',
                    debated: 'La partition a causé des déplacements de populations de plusieurs millions de personnes.'
                }
            ]
        },
        {
            id: 'arabo-musulman', name: 'Monde arabo-musulman', flag: '☪️',
            intro: 'Le monde arabo-musulman a son propre calendrier, qui part de l\'Hégire en 622, et un découpage fondé sur les grandes dynasties califales (Omeyyades, Abbassides), puis sur les dominations (mamelouke, ottomane, coloniale). On suit ici le Proche-Orient arabe (Arabie, Syrie, Irak, Égypte) ; d\'autres régions musulmanes (Iran, Inde, Maghreb, Afrique subsaharienne) ont d\'autres rythmes.',
            doubts: [
                { from: 607, to: 625, text: 'entre la première révélation (610) et l\'Hégire (622), dates qu\'on distingue dans les récits musulmans' }
            ],
            periods: [
                {
                    id: 'jahiliyya', name: 'Avant l\'islam (jāhiliyya)', start: null, end: 610,
                    bounds: 'Jusqu\'à la première révélation, vers 610. Les musulmans appellent « jāhiliyya » (ignorance) l\'époque qui précède : tribus d\'Arabie, royaumes de Palmyre, des Nabatéens, de Saba, empires byzantin et sassanide voisins.',
                    debated: 'Le terme est religieux, pas historique : l\'Arabie d\'avant l\'islam a une culture riche (poésie, commerce caravanier).'
                },
                {
                    id: 'origines', name: 'Prophète et premiers califes', start: 610, end: 661,
                    bounds: 'De 610 à 661 : prédication de Mahomet, Hégire à Médine (622, an 1 du calendrier musulman), puis les quatre califes « bien guidés » (632-661) et les premières conquêtes (Syrie, Égypte, Iran).',
                    debated: 'Le calendrier musulman commence en 622 (l\'Hégire) et non en 610 : c\'est l\'événement qui lance la communauté.'
                },
                {
                    id: 'omeyyades', name: 'Califat omeyyade', start: 661, end: 750,
                    bounds: 'De 661 à 750 : capitale Damas, de l\'Espagne à l\'Inde. Arabisation de l\'administration, Dôme du Rocher (691).',
                    debated: 'Une branche omeyyade survit en Espagne (émirat puis califat de Cordoue, 756-1031).'
                },
                {
                    id: 'abbassides', name: 'Califat abbasside', start: 750, end: 1258,
                    bounds: 'De 750 à 1258 : capitale Bagdad (fondée en 762), « âge d\'or » des sciences, de la traduction et du commerce. Le pouvoir réel des califes décline dès le Xe siècle (Fatimides, Seldjoukides…).',
                    debated: 'La fin est la prise de Bagdad par les Mongols d\'Houlagou (1258). Le pouvoir politique des califes avait disparu bien avant.'
                },
                {
                    id: 'mamelouks', name: 'Mamelouks, Mongols et sultanats', start: 1258, end: 1517,
                    bounds: 'De 1258 à 1517 : les sultans mamelouks (Égypte, Syrie, Hedjaz) arrêtent les Mongols à Aïn Djalout (1260) ; ailleurs, dynasties locales ; les Ottomans montent en puissance en Anatolie.',
                    debated: 'Les Mamelouks perdent leur sultanat devant les Ottomans en 1516-1517.'
                },
                {
                    id: 'ottomans', name: 'Période ottomane', start: 1517, end: 1798,
                    bounds: 'De 1517 à 1798 : le sultan ottoman, qui se réclame du califat, gouverne la plupart des pays arabes (Égypte, Syrie, Irak, Hedjaz).',
                    debated: 'Le Maghreb (Alger, Tunis, Tripoli) est ottoman mais autonome ; le Maroc reste indépendant.'
                },
                {
                    id: 'reformes-colonisation', name: 'Réformes et domination européenne', start: 1798, end: 1945,
                    bounds: 'De 1798 à 1945 : expédition de Bonaparte en Égypte (1798), « Nahda » (renaissance culturelle arabe), colonisation de l\'Algérie (1830), de l\'Égypte (1882), mandats français et britannique après 1920.',
                    debated: 'Selon les pays, la domination commence en 1830, 1882 ou 1920, et la fin en 1943-1956.'
                },
                {
                    id: 'independances', name: 'Indépendances', start: 1945, end: null,
                    bounds: 'Depuis 1945 : Ligue arabe (1945), indépendances des pays arabes, création d\'Israël (1948) et guerres du Proche-Orient, nationalisme arabe, pétrole.',
                    debated: 'Les indépendances s\'échelonnent de 1943 (Liban) à 1971 (Qatar, Bahreïn, Émirats).'
                }
            ]
        }
    ];

    function byId(id) {
        return SYSTEMS.filter(function (s) { return s.id === id; })[0] || null;
    }

    return { SYSTEMS: SYSTEMS, byId: byId };
}));
