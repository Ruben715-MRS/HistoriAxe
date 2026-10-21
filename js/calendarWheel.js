// =========================================================================
// === LA ROUE DES FÊTES — DONNÉES ET RÈGLES (mini-jeu du Monde 0, niveau 4 « Calendriers et fêtes ») ===
// =========================================================================
// Un calendrier = douze mois (les « parts de pizza » de la roue) et des fêtes à ranger dans le bon mois.
// Trente et un calendriers, en deux familles (`kind`) :
//  - « religieux » : chrétien, juif, musulman, hindou, bouddhiste, zoroastrien ;
//  - « civil » : les jours fériés et fêtes civiles de vingt-cinq pays.
//
// Format d'un calendrier : { id, title, short, icon, kind, intro, months, events } ; `short` est le nom du choix dans
// la liste (rangée par ordre alphabétique, voir `byKind`).
//
// Format d'une fête : { id, name, local?, icon, months, when, explain }
//  - `months` : les numéros (1 à 12, dans l'ordre des mois du calendrier) où la fête est acceptée. Presque
//    toujours un seul ; une FÊTE MOBILE (Pâques, Pentecôte, Rosenmontag…) en accepte deux, parce que sa date
//    dépend de Pâques et change chaque année : on n'exige pas du joueur de connaître le mois de cette année ;
//  - `local` : le nom dans la langue du pays, affiché sous le nom français ;
//  - `icon` : un emoji, UNIQUE dans le calendrier (c'est lui qu'on voit dans la part une fois la fête posée) ;
//  - `when` : la date, telle qu'on la donne dans ce calendrier ; `explain` : ce qu'on y célèbre.
//
// Pur, sans DOM : testé dans tests/calendarWheel.test.js. Contenu en français seulement, comme les leçons du
// Monde 0 (js/pathLessons.js) : **à relire par un enseignant**.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.CalendarWheel = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var CIVIL_MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

    var CALENDARS = [
        {
            id: 'chretien',
            title: 'Calendrier chrétien',
            short: 'Christianisme',
            icon: '✝️',
            kind: 'religieux',
            intro: "Les mois sont ceux du calendrier grégorien, et les fêtes celles des Églises d'Occident. Les fêtes mobiles dépendent de la date de Pâques, qui change chaque année : deux mois sont acceptés.",
            months: CIVIL_MONTHS,
            events: [
                { id: 'epiphanie', name: 'Épiphanie', icon: '🌟', months: [1], when: '6 janvier', explain: "Les Rois mages viennent adorer l'enfant Jésus : c'est sa « manifestation » aux nations, douze jours après Noël. On mange la galette des rois." },
                { id: 'chandeleur', name: 'Chandeleur', icon: '🕯️', months: [2], when: '2 février', explain: "Quarante jours après Noël, la présentation de Jésus au Temple. On bénit des cierges (les « chandelles ») ; la tradition des crêpes s'y est greffée." },
                { id: 'cendres', name: 'Mercredi des Cendres', icon: '⚱️', months: [2, 3], when: '46 jours avant Pâques (fête mobile)', explain: "Début du Carême, quarante jours de préparation à Pâques. Son jour tombe entre le 4 février et le 10 mars." },
                { id: 'annonciation', name: 'Annonciation', icon: '👼', months: [3], when: '25 mars', explain: "L'ange Gabriel annonce à Marie la naissance de Jésus : neuf mois exactement avant Noël." },
                { id: 'rameaux', name: 'Rameaux', icon: '🌿', months: [3, 4], when: 'Dimanche avant Pâques (fête mobile)', explain: "Jésus entre à Jérusalem, acclamé par la foule qui agite des rameaux. Le dimanche des Rameaux ouvre la Semaine sainte." },
                { id: 'vendredisaint', name: 'Vendredi saint', icon: '✝️', months: [3, 4], when: 'Vendredi avant Pâques (fête mobile)', explain: "On commémore la crucifixion et la mort de Jésus." },
                { id: 'paques', name: 'Pâques', icon: '🐣', months: [3, 4], when: 'Fête mobile', explain: "La résurrection de Jésus, la plus grande fête chrétienne. Elle tombe le premier dimanche après la première pleine lune de printemps : entre le 22 mars et le 25 avril." },
                { id: 'ascension', name: 'Ascension', icon: '☁️', months: [5, 6], when: 'Un jeudi, 40 jours après Pâques (fête mobile)', explain: "Jésus ressuscité quitte ses disciples et monte au ciel. Son jeudi tombe presque toujours en mai, parfois début juin." },
                { id: 'pentecote', name: 'Pentecôte', icon: '🔥', months: [5, 6], when: 'Un dimanche, 50 jours après Pâques (fête mobile)', explain: "L'Esprit Saint descend sur les apôtres sous forme de langues de feu : on y voit la naissance de l'Église. Entre le 10 mai et le 13 juin." },
                { id: 'assomption', name: 'Assomption', icon: '🌹', months: [8], when: '15 août', explain: "Marie est élevée au ciel avec son corps, à la fin de sa vie terrestre." },
                { id: 'toussaint', name: 'Toussaint', icon: '🍂', months: [11], when: '1er novembre', explain: "Fête de tous les saints. Le lendemain, 2 novembre, on prie pour les défunts." },
                { id: 'stnicolas', name: 'Saint-Nicolas', icon: '🎁', months: [12], when: '6 décembre', explain: "Évêque de Myre au IVe siècle devenu le protecteur des enfants, fêté surtout dans l'Est de la France, en Belgique, en Allemagne et aux Pays-Bas." },
                { id: 'immaculee', name: 'Immaculée Conception', icon: '🙏', months: [12], when: '8 décembre', explain: "Marie est conçue sans péché, selon un dogme catholique de 1854. À Lyon, on y allume des lumignons : c'est la fête des Lumières." },
                { id: 'noel', name: 'Noël', icon: '🎄', months: [12], when: '25 décembre', explain: "La naissance de Jésus. Cette date est fixée à Rome au IVe siècle, près du solstice d'hiver ; l'Évangile ne dit pas quel jour il est né." }
            ]
        },
        {
            id: 'juif',
            title: 'Calendrier juif',
            short: 'Judaïsme',
            icon: '✡️',
            kind: 'religieux',
            intro: "Un calendrier luni-solaire : les mois suivent la Lune, et un mois en plus (un second Adar) est ajouté sept fois en dix-neuf ans pour rester en phase avec les saisons. La roue part de Tichri, le mois du Nouvel An ; la Torah, elle, appelle Nissan « le premier des mois ».",
            months: ['Tichri', 'Hechvan', 'Kislev', 'Tevet', 'Chevat', 'Adar', 'Nissan', 'Iyar', 'Sivan', 'Tamouz', 'Av', 'Elloul'],
            events: [
                { id: 'rochhachana', name: 'Roch Hachana', icon: '🍎', months: [1], when: '1er et 2 Tichri', explain: "Le Nouvel An juif : on sonne du shofar et on mange une pomme trempée dans du miel pour souhaiter une douce année. Les années se comptent depuis la création du monde, placée par la tradition vers 3761 av. J.-C." },
                { id: 'yomkippour', name: 'Yom Kippour', icon: '🕊️', months: [1], when: '10 Tichri', explain: "Le Grand Pardon, dix jours après Roch Hachana : jeûne complet et prière pendant environ vingt-cinq heures." },
                { id: 'souccot', name: 'Souccot', icon: '🌿', months: [1], when: '15 Tichri', explain: "La fête des Cabanes : pendant une semaine, on mange (et parfois on dort) dans une souccah, une cabane au toit de feuillage, en souvenir de la traversée du désert." },
                { id: 'simhattorah', name: "Sim'hat Torah", icon: '📜', months: [1], when: '22 ou 23 Tichri', explain: "La « joie de la Torah » : on termine la lecture annuelle du Pentateuque et on la recommence aussitôt." },
                { id: 'hanoucca', name: 'Hanoucca', icon: '🕎', months: [3], when: '25 Kislev', explain: "La fête des lumières : huit soirs, on allume une bougie de plus. Elle rappelle la purification du Temple de Jérusalem après la révolte des Maccabées (164 av. J.-C.)." },
                { id: 'jeune10tevet', name: 'Jeûne du 10 Tevet', icon: '⏳', months: [4], when: '10 Tevet', explain: "Un jeûne qui rappelle le début du siège de Jérusalem par Nabuchodonosor, vers 588 av. J.-C." },
                { id: 'toubichvat', name: 'Tou Bichvat', icon: '🌳', months: [5], when: '15 Chevat', explain: "Le Nouvel An des arbres : on mange des fruits (surtout ceux de la Terre d'Israël) et on plante des arbres." },
                { id: 'pourim', name: 'Pourim', icon: '🎭', months: [6], when: '14 Adar', explain: "On lit le livre d'Esther : la reine sauve les Juifs de Perse du ministre Haman. Déguisements, cadeaux et gâteaux (les « oreilles d'Haman »)." },
                { id: 'pessah', name: 'Pessah', icon: '🫓', months: [7], when: '15 Nissan', explain: "La Pâque : la sortie d'Égypte. Pendant une semaine on ne mange que du pain sans levain (la matza) ; le premier soir, on fait le séder." },
                { id: 'yomhashoah', name: 'Yom Hashoah', icon: '🕯️', months: [7], when: '27 Nissan', explain: "Le jour du souvenir de la Shoah : en Israël, des sirènes retentissent et le pays s'arrête deux minutes." },
                { id: 'yomhaatsmaout', name: "Yom Haatsmaout", icon: '🇮🇱', months: [8], when: '5 Iyar', explain: "La fête de l'indépendance d'Israël : le 14 mai 1948, David Ben Gourion proclame l'État, soit le 5 Iyar 5708." },
                { id: 'lagbaomer', name: "Lag Baomer", icon: '🔥', months: [8], when: '18 Iyar', explain: "Le 33e jour du compte du Omer, entre Pessah et Chavouot : feux de joie, pique-niques et mariages, car la période de semi-deuil est levée." },
                { id: 'chavouot', name: 'Chavouot', icon: '📖', months: [9], when: '6 Sivan', explain: "La fête des Semaines, cinquante jours après Pessah : le don de la Torah au Sinaï. On mange des produits laitiers et on étudie toute la nuit." },
                { id: 'jeune17tamouz', name: 'Jeûne du 17 Tamouz', icon: '🧱', months: [10], when: '17 Tamouz', explain: "Ce jour-là, les murailles de Jérusalem sont percées : il ouvre trois semaines de deuil qui mènent à Tisha Beav." },
                { id: 'tishabeav', name: "Tisha Beav", icon: '🏚️', months: [11], when: '9 Av', explain: "Un jeûne en mémoire de la destruction des deux Temples de Jérusalem, en 586 av. J.-C. puis en 70 apr. J.-C." },
                { id: 'toubeav', name: 'Tou Beav', icon: '💞', months: [11], when: '15 Av', explain: "Six jours après le deuil de Tisha Beav, une fête de l'amour : dans l'Antiquité, c'est un jour où l'on se mariait." }
            ]
        },
        {
            id: 'musulman',
            title: 'Calendrier musulman',
            short: 'Islam',
            icon: '☪️',
            kind: 'religieux',
            intro: "Le calendrier de l'Hégire est purement lunaire : douze mois de 29 ou 30 jours, soit une année de 354 jours. Les fêtes reculent donc d'une dizaine de jours chaque année dans le calendrier grégorien et parcourent toutes les saisons.",
            months: ['Mouharram', 'Safar', "Rabi' I", "Rabi' II", 'Joumada I', 'Joumada II', 'Rajab', "Cha'ban", 'Ramadan', 'Chawwal', "Dhou l-qi'da", 'Dhou l-hijja'],
            events: [
                { id: 'nouvelanhegire', name: "Nouvel An de l'Hégire", icon: '🌙', months: [1], when: '1er Mouharram', explain: "Le début de l'ère musulmane, qui compte les années depuis l'Hégire (hijra) : le départ du prophète Mahomet de La Mecque pour Médine, en 622." },
                { id: 'achoura', name: 'Achoura', icon: '🤲', months: [1], when: '10 Mouharram', explain: "Un jour de jeûne pour beaucoup de sunnites. Pour les chiites, c'est le deuil de Hussein, petit-fils du Prophète, tué à Kerbala en 680." },
                { id: 'arbain', name: 'Arbaïn', icon: '🕯️', months: [2], when: '20 Safar', explain: "Quarante jours après Achoura, un grand pèlerinage chiite à Kerbala, en Irak." },
                { id: 'mawlid', name: 'Mawlid', icon: '🎉', months: [3], when: "12 Rabi' I", explain: "La naissance du prophète Mahomet, vers 570, célébrée par de nombreux musulmans (tous ne la fêtent pas)." },
                { id: 'israa', name: "Isra' et Mi'raj", icon: '🌌', months: [7], when: '27 Rajab', explain: "Le voyage nocturne du Prophète de La Mecque à Jérusalem, puis son ascension à travers les cieux." },
                { id: 'chaaban', name: "Nuit de la mi-Cha'ban", icon: '🌕', months: [8], when: "15 Cha'ban", explain: "Une nuit de prière et de demande de pardon, un mois avant le Ramadan." },
                { id: 'ramadan', name: 'Ramadan', icon: '☪️', months: [9], when: 'Tout le mois', explain: "Le neuvième mois : on jeûne du lever au coucher du soleil. C'est l'un des cinq piliers de l'islam." },
                { id: 'laylat', name: 'Nuit du Destin', icon: '⭐', months: [9], when: '27 Ramadan (la tradition la cherche dans les dix dernières nuits)', explain: "Laylat al-Qadr : la nuit où le Coran a commencé à être révélé au Prophète. Elle « vaut mieux que mille mois »." },
                { id: 'aidfitr', name: 'Aïd el-Fitr', icon: '🍬', months: [10], when: '1er Chawwal', explain: "La fête de la rupture du jeûne, le lendemain du Ramadan : prière, repas en famille, aumône aux pauvres, bonbons pour les enfants." },
                { id: 'hajj', name: 'Pèlerinage (Hajj)', icon: '🕋', months: [12], when: '8 au 13 Dhou l-hijja', explain: "Le pèlerinage à La Mecque, cinquième pilier de l'islam : un musulman qui en a les moyens doit l'accomplir au moins une fois dans sa vie." },
                { id: 'arafat', name: "Jour d'Arafat", icon: '⛰️', months: [12], when: '9 Dhou l-hijja', explain: "Le sommet du pèlerinage : les pèlerins se tiennent en prière sur la plaine d'Arafat, du midi au coucher du soleil." },
                { id: 'aidadha', name: 'Aïd el-Kébir', icon: '🐑', months: [12], when: '10 Dhou l-hijja', explain: "La fête du sacrifice (Aïd al-Adha) : on immole un mouton en souvenir d'Abraham, prêt à sacrifier son fils." }
            ]
        },
        {
            id: 'france',
            title: 'France',
            short: 'France',
            icon: '🇫🇷',
            kind: 'civil',
            intro: "Jours fériés et fêtes civiles de la France. Beaucoup de fériés viennent du calendrier chrétien, et leurs dates mobiles suivent Pâques.",
            months: CIVIL_MONTHS,
            events: [
                { id: 'jourdelan', name: "Jour de l'An", icon: '🎆', months: [1], when: '1er janvier', explain: "L'année commence le 1er janvier en France depuis l'édit de Roussillon de Charles IX, en 1564 : auparavant, elle commençait souvent à Pâques." },
                { id: 'lundipaques', name: 'Lundi de Pâques', icon: '🥚', months: [3, 4], when: 'Lendemain de Pâques (fête mobile)', explain: "Un jour férié d'origine chrétienne : sa date change chaque année avec celle de Pâques." },
                { id: 'travail', name: 'Fête du Travail', icon: '🌷', months: [5], when: '1er mai', explain: "Elle rappelle les grèves ouvrières de Chicago en 1886 pour la journée de huit heures. Elle est fériée et payée depuis 1947. On offre du muguet." },
                { id: 'victoire45', name: 'Victoire 1945', icon: '🕊️', months: [5], when: '8 mai', explain: "On commémore la capitulation de l'Allemagne nazie en Europe, le 8 mai 1945." },
                { id: 'ascension', name: 'Ascension', icon: '☁️', months: [5, 6], when: 'Un jeudi, 40 jours après Pâques (fête mobile)', explain: "Une fête chrétienne devenue jour férié : elle tombe presque toujours en mai, parfois début juin." },
                { id: 'lundipentecote', name: 'Lundi de Pentecôte', icon: '🔥', months: [5, 6], when: 'Lendemain de la Pentecôte (fête mobile)', explain: "Depuis 2004, c'est la « journée de solidarité » créée après la canicule de 2003 : on peut y travailler au profit des personnes âgées et handicapées." },
                { id: 'musique', name: 'Fête de la musique', icon: '🎶', months: [6], when: '21 juin', explain: "Créée en 1982 par Jack Lang, le jour du solstice d'été : des concerts gratuits dans les rues, partout en France." },
                { id: 'fetenationale', name: 'Fête nationale', icon: '🇫🇷', months: [7], when: '14 juillet', explain: "Elle rappelle la prise de la Bastille (1789) et la fête de la Fédération (1790) ; c'est la fête nationale depuis 1880." },
                { id: 'assomption', name: 'Assomption', icon: '☀️', months: [8], when: '15 août', explain: "Une fête chrétienne devenue jour férié, au milieu des vacances d'été." },
                { id: 'patrimoine', name: 'Journées du patrimoine', icon: '🏛️', months: [9], when: '3e week-end de septembre', explain: "Nées en France en 1984, elles ouvrent gratuitement monuments et lieux de pouvoir. Elles sont devenues européennes en 1991." },
                { id: 'toussaint', name: 'Toussaint', icon: '🍂', months: [11], when: '1er novembre', explain: "Une fête chrétienne devenue jour férié : on fleurit les tombes des défunts." },
                { id: 'armistice', name: 'Armistice 1918', icon: '🎖️', months: [11], when: '11 novembre', explain: "L'armistice signé à Rethondes en 1918 met fin aux combats de la Première Guerre mondiale. Le 11 novembre honore tous les morts pour la France." },
                { id: 'noel', name: 'Noël', icon: '🎄', months: [12], when: '25 décembre', explain: "Une fête chrétienne devenue la grande fête familiale, y compris pour beaucoup de non-croyants." }
            ]
        },
        {
            id: 'royaumeuni',
            title: 'Royaume-Uni',
            short: 'Royaume-Uni',
            icon: '🇬🇧',
            kind: 'civil',
            intro: "Les « bank holidays » sont les jours fériés du Royaume-Uni. Beaucoup tombent un lundi, pour faire des week-ends de trois jours, et certaines fêtes ne concernent qu'un des quatre pays (Angleterre, Écosse, pays de Galles, Irlande du Nord).",
            months: CIVIL_MONTHS,
            events: [
                { id: 'newyear', name: "Jour de l'An", local: "New Year's Day", icon: '🎆', months: [1], when: '1er janvier', explain: "En Écosse, on fête surtout Hogmanay, la veille au soir, et le 2 janvier est aussi férié." },
                { id: 'burns', name: 'Nuit de Burns', local: 'Burns Night', icon: '🎻', months: [1], when: '25 janvier', explain: "On fête en Écosse la naissance du poète Robert Burns (1759) avec un repas de haggis et la lecture de ses poèmes." },
                { id: 'pancake', name: 'Mardi gras', local: 'Pancake Day', icon: '🥞', months: [2, 3], when: 'Veille du Mercredi des Cendres (fête mobile)', explain: "Le dernier jour avant le Carême : on mange des pancakes, et on organise des courses de crêpes. Sa date change avec Pâques." },
                { id: 'goodfriday', name: 'Vendredi saint', local: 'Good Friday', icon: '✝️', months: [3, 4], when: 'Vendredi avant Pâques (fête mobile)', explain: "Un jour férié dans tout le pays, d'origine chrétienne." },
                { id: 'eastermonday', name: 'Lundi de Pâques', local: 'Easter Monday', icon: '🐰', months: [3, 4], when: 'Lendemain de Pâques (fête mobile)', explain: "Jour férié en Angleterre, au pays de Galles et en Irlande du Nord (pas en Écosse)." },
                { id: 'mayday', name: 'Férié de début mai', local: 'Early May bank holiday', icon: '🌳', months: [5], when: '1er lundi de mai', explain: "Il rappelle l'ancienne fête de mai, avec son mât de mai (maypole) autour duquel on dansait." },
                { id: 'trooping', name: 'Défilé du Souverain', local: 'Trooping the Colour', icon: '💂', months: [6], when: 'Un samedi de juin', explain: "Un défilé militaire à Londres qui marque l'anniversaire officiel du souverain, quelle que soit sa vraie date de naissance." },
                { id: 'summerbank', name: "Férié de fin d'été", local: 'Summer bank holiday', icon: '🏖️', months: [8], when: "Dernier lundi d'août (Angleterre)", explain: "Le dernier jour férié avant l'automne : la fin des grandes vacances pour beaucoup de familles." },
                { id: 'bonfire', name: 'Nuit de Guy Fawkes', local: 'Bonfire Night', icon: '🎇', months: [11], when: '5 novembre', explain: "On commémore l'échec de la conspiration des Poudres (1605), qui voulait faire sauter le Parlement et le roi Jacques Ier : feux de joie et feux d'artifice." },
                { id: 'remembrance', name: 'Dimanche du Souvenir', local: 'Remembrance Sunday', icon: '🌺', months: [11], when: '2e dimanche de novembre', explain: "Hommage aux morts des guerres, avec un coquelicot (poppy) à la boutonnière. Il est proche du 11 novembre, date de l'armistice de 1918." },
                { id: 'christmas', name: 'Noël', local: 'Christmas Day', icon: '🎄', months: [12], when: '25 décembre', explain: "Le déjeuner de Noël (dinde, puddings) et le discours du souverain à la télévision, l'après-midi." },
                { id: 'boxing', name: 'Lendemain de Noël', local: 'Boxing Day', icon: '🎁', months: [12], when: '26 décembre', explain: "Un jour férié dont le nom vient des « boîtes » de cadeaux que les maîtres offraient autrefois à leurs domestiques." }
            ]
        },
        {
            id: 'etatsunis',
            title: 'États-Unis',
            short: 'États-Unis',
            icon: '🇺🇸',
            kind: 'civil',
            intro: "Les « federal holidays » sont fixés par le Congrès. Beaucoup sont placés un lundi précis du mois (« le 3e lundi de janvier »), et non à une date fixe.",
            months: CIVIL_MONTHS,
            events: [
                { id: 'newyear', name: "Jour de l'An", local: "New Year's Day", icon: '🎆', months: [1], when: '1er janvier', explain: "Le premier jour de l'année. La veille, des millions de personnes regardent la boule de Times Square descendre à minuit." },
                { id: 'mlk', name: 'Jour de Martin Luther King', local: 'Martin Luther King Jr. Day', icon: '✊', months: [1], when: '3e lundi de janvier', explain: "Hommage au pasteur Martin Luther King (1929-1968), figure du mouvement des droits civiques. Férié fédéral depuis 1986." },
                { id: 'presidents', name: 'Jour des Présidents', local: "Presidents' Day", icon: '🏛️', months: [2], when: '3e lundi de février', explain: "Officiellement l'anniversaire de George Washington, premier président. Par extension, on honore tous les présidents." },
                { id: 'memorial', name: 'Jour du Souvenir', local: 'Memorial Day', icon: '🪖', months: [5], when: 'Dernier lundi de mai', explain: "Hommage aux soldats morts au service du pays. Il marque le début informel de l'été." },
                { id: 'juneteenth', name: 'Juneteenth', local: 'Juneteenth', icon: '🎉', months: [6], when: '19 juin', explain: "Le 19 juin 1865, au Texas, les derniers esclaves apprennent leur libération. Il est férié fédéral depuis 2021." },
                { id: 'independence', name: "Fête de l'Indépendance", local: 'Independence Day', icon: '🗽', months: [7], when: '4 juillet', explain: "La Déclaration d'indépendance, adoptée en 1776 : feux d'artifice, défilés et barbecues." },
                { id: 'labor', name: 'Fête du Travail', local: 'Labor Day', icon: '🛠️', months: [9], when: '1er lundi de septembre', explain: "La fête du Travail américaine tombe en septembre, et non le 1er mai. Elle marque la fin de l'été et la rentrée." },
                { id: 'columbus', name: 'Jour de Christophe Colomb', local: "Columbus Day", icon: '⛵', months: [10], when: '2e lundi d\'octobre', explain: "Il rappelle l'arrivée de Colomb en Amérique en 1492. De plus en plus d'États le renomment « jour des peuples autochtones »." },
                { id: 'halloween', name: 'Halloween', local: 'Halloween', icon: '🎃', months: [10], when: '31 octobre', explain: "D'origine celtique (la fête de Samhain), apportée par des immigrants irlandais. Pas férié, mais très célébré : déguisements et citrouilles." },
                { id: 'veterans', name: 'Jour des Anciens combattants', local: "Veterans Day", icon: '🎖️', months: [11], when: '11 novembre', explain: "Il rend hommage aux anciens combattants. La date est celle de l'armistice de 1918." },
                { id: 'thanksgiving', name: "Jour d'action de grâce", local: 'Thanksgiving', icon: '🦃', months: [11], when: '4e jeudi de novembre', explain: "Un grand repas familial, avec la dinde, en souvenir d'un repas partagé en 1621 entre les Pères pèlerins et les Wampanoags." },
                { id: 'christmas', name: 'Noël', local: 'Christmas Day', icon: '🎄', months: [12], when: '25 décembre', explain: "Le seul férié fédéral à caractère religieux, avec ses sapins, ses cadeaux et ses décorations dans les maisons." }
            ]
        },
        {
            id: 'allemagne',
            title: 'Allemagne',
            short: 'Allemagne',
            icon: '🇩🇪',
            kind: 'civil',
            intro: "En Allemagne, les jours fériés dépendent des Länder : certains (Toussaint, Réformation) ne sont fériés que dans les États catholiques ou protestants, ce que précise alors la date.",
            months: CIVIL_MONTHS,
            events: [
                { id: 'neujahr', name: "Jour de l'An", local: 'Neujahr', icon: '🎆', months: [1], when: '1er janvier', explain: "Le 31 au soir (Silvester), on tire des feux d'artifice et l'on mange des beignets de Berlin." },
                { id: 'rosenmontag', name: 'Lundi des Roses', local: 'Rosenmontag', icon: '🎭', months: [2, 3], when: 'Lundi avant le Mercredi des Cendres (fête mobile)', explain: "Le sommet du carnaval rhénan, avec de grands cortèges à Cologne, Düsseldorf et Mayence. Il n'est pas férié partout." },
                { id: 'karfreitag', name: 'Vendredi saint', local: 'Karfreitag', icon: '✝️', months: [3, 4], when: 'Vendredi avant Pâques (fête mobile)', explain: "Un jour férié dans toute l'Allemagne, calme : les danses et les spectacles sont en général interdits." },
                { id: 'ostermontag', name: 'Lundi de Pâques', local: 'Ostermontag', icon: '🐰', months: [3, 4], when: 'Lendemain de Pâques (fête mobile)', explain: "Un jour férié dans tout le pays, en pleine période des œufs et des lapins de Pâques." },
                { id: 'tagderarbeit', name: 'Fête du Travail', local: 'Tag der Arbeit', icon: '🌷', months: [5], when: '1er mai', explain: "Un jour férié, avec des manifestations syndicales. La veille, la « Nuit de Walpurgis » est fêtée dans le Harz." },
                { id: 'himmelfahrt', name: 'Ascension', local: 'Christi Himmelfahrt', icon: '☁️', months: [5, 6], when: 'Un jeudi, 40 jours après Pâques (fête mobile)', explain: "Le jeudi de l'Ascension est aussi la « fête des pères » (Vatertag) : des groupes d'hommes partent en balade avec un chariot de bière." },
                { id: 'pfingstmontag', name: 'Lundi de Pentecôte', local: 'Pfingstmontag', icon: '🔥', months: [5, 6], when: 'Lendemain de la Pentecôte (fête mobile)', explain: "Un jour férié dans tout le pays : le week-end de Pentecôte est l'un des premiers longs week-ends de beau temps." },
                { id: 'oktoberfest', name: 'Fête de la bière', local: 'Oktoberfest', icon: '🍺', months: [9, 10], when: 'Mi-septembre au début d\'octobre (à cheval sur deux mois)', explain: "Née à Munich en 1810, pour le mariage du prince héritier de Bavière, elle commence en fait en septembre et se termine le premier dimanche d'octobre." },
                { id: 'einheit', name: "Fête de l'Unité allemande", local: 'Tag der Deutschen Einheit', icon: '🇩🇪', months: [10], when: '3 octobre', explain: "Elle célèbre la réunification de l'Allemagne le 3 octobre 1990, un an après la chute du mur de Berlin." },
                { id: 'reformation', name: 'Fête de la Réformation', local: 'Reformationstag', icon: '📜', months: [10], when: '31 octobre (selon les Länder)', explain: "En 1517, Luther aurait affiché ses 95 thèses à Wittenberg. Férié surtout dans les Länder protestants." },
                { id: 'allerheiligen', name: 'Toussaint', local: 'Allerheiligen', icon: '🍂', months: [11], when: '1er novembre (selon les Länder)', explain: "Férié surtout dans les Länder catholiques, comme la Bavière ; la veille, les Länder protestants fêtent la Réformation." },
                { id: 'martin', name: 'Saint-Martin', local: 'Sankt Martin', icon: '🏮', months: [11], when: '11 novembre', explain: "Des enfants défilent avec des lanternes en l'honneur de saint Martin de Tours, qui partage son manteau avec un pauvre. Le carnaval s'ouvre ce jour-là à 11 h 11." },
                { id: 'weihnachten1', name: 'Noël', local: 'Erster Weihnachtstag', icon: '🎄', months: [12], when: '25 décembre', explain: "En Allemagne, les cadeaux s'échangent plutôt le soir du 24 (Heiligabend) ; le 25 est le jour du grand repas." },
                { id: 'weihnachten2', name: 'Lendemain de Noël', local: 'Zweiter Weihnachtstag', icon: '🎁', months: [12], when: '26 décembre', explain: "Un second jour férié : on se rend visite en famille. L'Allemagne fête Noël pendant deux jours entiers." }
            ]
        },
        {
            id: 'espagne',
            title: 'Espagne',
            short: 'Espagne',
            icon: '🇪🇸',
            kind: 'civil',
            intro: "Les fiestas espagnoles mêlent calendrier chrétien et traditions locales : chaque communauté autonome a ses propres jours fériés et ses grandes fêtes de rue.",
            months: CIVIL_MONTHS,
            events: [
                { id: 'anonuevo', name: "Jour de l'An", local: 'Año Nuevo', icon: '🍇', months: [1], when: '1er janvier', explain: "Dans la nuit du 31, on avale douze grains de raisin au rythme des douze coups de minuit, un pour chaque mois à venir (las doce uvas)." },
                { id: 'reyes', name: 'Rois mages', local: 'Reyes Magos', icon: '👑', months: [1], when: '6 janvier', explain: "Les enfants espagnols reçoivent leurs cadeaux des Rois mages, plus que du père Noël. La veille, de grands défilés ont lieu dans les villes." },
                { id: 'fallas', name: 'Les Fallas', local: 'Las Fallas', icon: '🔥', months: [3], when: '15 au 19 mars', explain: "À Valence : d'immenses statues de carton-pâte sont brûlées dans la nuit du 19, la Saint-Joseph." },
                { id: 'viernessanto', name: 'Vendredi saint', local: 'Viernes Santo', icon: '✝️', months: [3, 4], when: 'Vendredi avant Pâques (fête mobile)', explain: "Pendant la Semana Santa, de grandes processions de pénitents défilent dans les villes, surtout en Andalousie." },
                { id: 'trabajo', name: 'Fête du Travail', local: 'Fiesta del Trabajo', icon: '🌷', months: [5], when: '1er mai', explain: "Un jour férié dans toute l'Espagne, avec des manifestations syndicales." },
                { id: 'sanfermin', name: 'San Fermín', local: 'San Fermín', icon: '🐂', months: [7], when: '6 au 14 juillet', explain: "À Pampelune, chaque matin, des taureaux sont lâchés dans les rues et des hommes courent devant eux : c'est l'encierro." },
                { id: 'asuncion', name: 'Assomption', local: 'Asunción', icon: '☀️', months: [8], when: '15 août', explain: "Un jour férié dans toute l'Espagne, au cœur de l'été : beaucoup de villes y fêtent leur saint patron." },
                { id: 'tomatina', name: 'La Tomatina', local: 'La Tomatina', icon: '🍅', months: [8], when: 'Dernier mercredi d\'août', explain: "À Buñol, près de Valence, des milliers de personnes se lancent des tomates mûres pendant une heure, depuis 1945." },
                { id: 'hispanidad', name: "Fête nationale", local: 'Fiesta Nacional de España', icon: '🇪🇸', months: [10], when: '12 octobre', explain: "Elle rappelle l'arrivée de Christophe Colomb en Amérique, le 12 octobre 1492, et fait de l'Espagne un pont vers l'Amérique latine (Día de la Hispanidad)." },
                { id: 'santos', name: 'Toussaint', local: 'Todos los Santos', icon: '🍂', months: [11], when: '1er novembre', explain: "Les familles fleurissent les tombes de leurs proches ; on mange des pâtisseries comme les huesos de santo." },
                { id: 'constitucion', name: 'Fête de la Constitution', local: 'Día de la Constitución', icon: '📜', months: [12], when: '6 décembre', explain: "La Constitution est approuvée par référendum le 6 décembre 1978, trois ans après la mort de Franco : elle fonde la démocratie espagnole." },
                { id: 'inmaculada', name: 'Immaculée Conception', local: 'Inmaculada Concepción', icon: '🙏', months: [12], when: '8 décembre', explain: "Une fête chrétienne qui est aussi un jour férié ; c'est souvent le pont de décembre." },
                { id: 'navidad', name: 'Noël', local: 'Navidad', icon: '🎄', months: [12], when: '25 décembre', explain: "Le grand repas a lieu la veille, la Nochebuena ; le 25, on se retrouve en famille." }
            ]
        },
        {
            id: 'italie',
            title: 'Italie',
            short: 'Italie',
            icon: '🇮🇹',
            kind: 'civil',
            intro: "Les fêtes italiennes mêlent calendrier catholique et fêtes civiles. Plusieurs fériés rappellent la fin de la Seconde Guerre mondiale (25 avril) et la naissance de la République en 1946 (2 juin).",
            months: CIVIL_MONTHS,
            events: [
                { id: 'capodanno', name: "Jour de l'An", local: 'Capodanno', icon: '🎆', months: [1], when: '1er janvier', explain: "Dans la nuit du 31, on mange des lentilles, symbole d'argent et de chance pour l'année qui vient." },
                { id: 'memoria', name: 'Jour de la Mémoire', local: 'Giorno della Memoria', icon: '🕯️', months: [1], when: '27 janvier', explain: "Hommage aux victimes de la Shoah, le jour de la libération d'Auschwitz par l'Armée rouge en 1945. L'Italie l'a institué par une loi de 2000." },
                { id: 'epifania', name: 'Épiphanie', local: 'Epifania', icon: '🧹', months: [1], when: '6 janvier', explain: "La Befana, une vieille dame bienveillante à balai, apporte des bonbons aux enfants sages (et du « charbon » en sucre aux autres). Jour férié." },
                { id: 'carnevale', name: 'Carnaval de Venise', local: 'Carnevale', icon: '🎭', months: [2, 3], when: 'Avant le Carême (fête mobile)', explain: "Masques et costumes dans les rues de Venise pendant les deux semaines qui précèdent le Mardi gras. Sa date change avec celle de Pâques." },
                { id: 'papa', name: 'Fête des pères', local: 'Festa del Papà', icon: '👨', months: [3], when: '19 mars', explain: "On la fête à la Saint-Joseph, le père de Jésus, avec des beignets : les zeppole." },
                { id: 'pasquetta', name: 'Lundi de Pâques', local: 'Pasquetta', icon: '🧺', months: [3, 4], when: 'Lendemain de Pâques (fête mobile)', explain: "Un jour férié consacré au pique-nique en famille ou entre amis, à la campagne ou au bord de la mer." },
                { id: 'liberazione', name: 'Fête de la Libération', local: 'Festa della Liberazione', icon: '🕊️', months: [4], when: '25 avril', explain: "Elle rappelle la libération de l'Italie du nazisme et du fascisme : le 25 avril 1945, le Comité de libération ordonne l'insurrection dans le nord du pays." },
                { id: 'lavoro', name: 'Fête du Travail', local: 'Festa dei Lavoratori', icon: '🌷', months: [5], when: '1er mai', explain: "Un jour férié, avec un grand concert gratuit à Rome, sur la place Saint-Jean-de-Latran." },
                { id: 'repubblica', name: 'Fête de la République', local: 'Festa della Repubblica', icon: '🇮🇹', months: [6], when: '2 juin', explain: "Elle rappelle le référendum du 2 juin 1946, où les Italiens choisissent la République et chassent la monarchie." },
                { id: 'ferragosto', name: 'Mi-août', local: 'Ferragosto', icon: '🏖️', months: [8], when: '15 août', explain: "Un très ancien jour de repos : il vient des feriae Augusti, instituées par l'empereur Auguste. C'est aujourd'hui le cœur des vacances d'été, qui vide les villes." },
                { id: 'ognissanti', name: 'Toussaint', local: 'Ognissanti', icon: '🍂', months: [11], when: '1er novembre', explain: "Fête de tous les saints, jour férié ; le lendemain, on honore les défunts." },
                { id: 'ambrogio', name: 'Saint-Ambroise', local: "Sant'Ambrogio", icon: '🎼', months: [12], when: '7 décembre', explain: "Fête du saint patron de Milan : c'est le soir de l'ouverture de la saison de la Scala, l'opéra de la ville." },
                { id: 'immacolata', name: 'Immaculée Conception', local: 'Immacolata', icon: '🙏', months: [12], when: '8 décembre', explain: "Une fête catholique et un jour férié : on y dresse en général l'arbre de Noël et la crèche." },
                { id: 'natale', name: 'Noël', local: 'Natale', icon: '🎄', months: [12], when: '25 décembre', explain: "La crèche (presepe), très ancienne tradition italienne, a une place d'honneur à côté du sapin." },
                { id: 'santostefano', name: 'Saint-Étienne', local: 'Santo Stefano', icon: '🎁', months: [12], when: '26 décembre', explain: "Lendemain de Noël et jour férié, pour prolonger la fête en famille." }
            ]
        },
        {
            id: 'japon',
            title: 'Japon',
            short: 'Japon',
            icon: '🇯🇵',
            kind: 'civil',
            intro: "Le Japon utilise le calendrier grégorien depuis 1873, mais compte aussi les années par ères impériales (depuis 2019, l'ère Reiwa). Beaucoup de fêtes traditionnelles viennent de l'ancien calendrier luni-solaire : leur date a pu changer ou dépendre des régions.",
            months: CIVIL_MONTHS,
            events: [
                { id: 'shogatsu', name: 'Nouvel An', local: 'Shōgatsu', icon: '🎍', months: [1], when: '1er au 3 janvier', explain: "La plus grande fête de l'année : on visite un sanctuaire (hatsumōde), on mange les plats de fête (osechi) et des galettes de riz (mochi)." },
                { id: 'seijin', name: 'Jour de la majorité', local: 'Seijin no hi', icon: '👘', months: [1], when: '2e lundi de janvier', explain: "Les jeunes qui deviennent adultes défilent en kimono ou en costume. La majorité légale est à 18 ans depuis 2022, mais la cérémonie reste liée aux 20 ans." },
                { id: 'setsubun', name: 'Fête du changement de saison', local: 'Setsubun', icon: '👹', months: [2], when: '3 février', explain: "La veille du début du printemps dans l'ancien calendrier : on lance des haricots de soja pour chasser les démons (oni)." },
                { id: 'hinamatsuri', name: 'Fête des poupées', local: 'Hina-matsuri', icon: '🎎', months: [3], when: '3 mars', explain: "La fête des filles : on expose des poupées de la cour impériale sur des étagères rouges, avec des vœux de bonheur." },
                { id: 'hanami', name: 'Contemplation des cerisiers', local: 'Hanami', icon: '🌸', months: [3, 4], when: 'Selon la floraison (à cheval sur deux mois)', explain: "Pique-nique sous les cerisiers en fleurs. La floraison remonte du sud au nord : fin mars à Tokyo, plus tard au nord." },
                { id: 'showa', name: 'Jour de Shōwa', local: 'Shōwa no hi', icon: '🌿', months: [4], when: '29 avril', explain: "L'anniversaire de l'empereur Shōwa (Hirohito). Il ouvre la « Golden Week », une série de jours fériés fin avril-début mai." },
                { id: 'kenpo', name: 'Jour de la Constitution', local: 'Kenpō kinenbi', icon: '📜', months: [5], when: '3 mai', explain: "Elle rappelle l'entrée en vigueur de la Constitution de 1947, qui fait de l'empereur un symbole et renonce à la guerre. Fête de la Golden Week." },
                { id: 'kodomo', name: 'Fête des enfants', local: 'Kodomo no hi', icon: '🎏', months: [5], when: '5 mai', explain: "On hisse des carpes en tissu (koinobori) devant les maisons, pour souhaiter aux enfants force et réussite. C'était autrefois la fête des garçons." },
                { id: 'tanabata', name: 'Fête des étoiles', local: 'Tanabata', icon: '🎋', months: [7], when: '7 juillet', explain: "Deux étoiles amoureuses, Orihime et Hikoboshi, ne se retrouvent qu'une nuit par an. On accroche des vœux écrits sur du papier à des branches de bambou." },
                { id: 'obon', name: 'Fête des morts', local: 'Obon', icon: '🏮', months: [7, 8], when: '13 au 16 août, ou mi-juillet dans certaines régions (à cheval sur deux mois)', explain: "Les âmes des ancêtres reviennent voir leur famille : on allume des lanternes, on nettoie les tombes et on danse le bon-odori." },
                { id: 'keiro', name: 'Jour des Aînés', local: 'Keirō no hi', icon: '👴', months: [9], when: '3e lundi de septembre', explain: "Un jour férié pour honorer les personnes âgées, dans un pays où elles sont très nombreuses." },
                { id: 'tsukimi', name: 'Contemplation de la lune', local: 'Tsukimi', icon: '🌕', months: [9, 10], when: "Pleine lune d'automne (fête mobile)", explain: "On regarde la pleine lune de l'automne en mangeant des boulettes de riz (dango) et en admirant l'herbe de pampa. La date suit l'ancien calendrier lunaire." },
                { id: 'sports', name: 'Jour des Sports', local: 'Supōtsu no hi', icon: '🏃', months: [10], when: '2e lundi d\'octobre', explain: "Il rappelle l'ouverture des Jeux olympiques de Tokyo, le 10 octobre 1964, les premiers de l'histoire en Asie." },
                { id: 'bunka', name: 'Jour de la Culture', local: 'Bunka no hi', icon: '🎨', months: [11], when: '3 novembre', explain: "Un jour férié consacré aux arts et à la paix ; il tombe le jour de l'anniversaire de l'empereur Meiji (né en 1852)." },
                { id: 'shichigosan', name: 'Fête des 3, 5 et 7 ans', local: 'Shichi-go-san', icon: '🎀', months: [11], when: '15 novembre', explain: "Les enfants de 3, 5 et 7 ans vont au sanctuaire en kimono pour remercier de leur bonne santé, avec des bonbons « de longue vie » (chitose-ame)." },
                { id: 'omisoka', name: 'Réveillon du Nouvel An', local: 'Ōmisoka', icon: '🔔', months: [12], when: '31 décembre', explain: "Les temples sonnent 108 coups de cloche et l'on mange des nouilles de sarrasin (toshikoshi soba) pour « passer d'une année à l'autre »." },
                { id: 'kurisumasu', name: 'Noël', local: 'Kurisumasu', icon: '🍰', months: [12], when: '25 décembre', explain: "Pas férié et peu religieux : une fête commerciale, avec un gâteau à la fraise et un repas de poulet frit entre amis ou en couple." }
            ]
        },
        {
            id: "hindouisme",
            title: "Calendrier hindou",
            short: "Hindouisme",
            icon: "🕉️",
            kind: "religieux",
            intro: "Un calendrier luni-solaire : les mois vont de nouvelle lune en nouvelle lune (système « amānta », suivi au sud et à l'ouest de l'Inde). Au nord, on compte de pleine lune en pleine lune, ce qui décale le nom des mois pour la quinzaine sombre : Diwali y tombe en Kartika. Les dates changent chaque année dans le calendrier grégorien, car les mois sont lunaires.",
            months: ["Chaitra", "Vaishakha", "Jyeshtha", "Ashadha", "Shravana", "Bhadrapada", "Ashvin", "Kartika", "Margashirsha", "Pausha", "Magha", "Phalguna"],
            events: [
                { id: "ugadi", name: "Nouvel An (Ugadi, Gudi Padwa)", icon: "🌼", months: [1], when: "1er jour de Chaitra", explain: "Le Nouvel An du calendrier luni-solaire, au printemps : on décore la maison de guirlandes de fleurs et de feuilles de manguier, et l'on mange un plat aux six saveurs." },
                { id: "ramnavami", name: "Ram Navami", icon: "🏹", months: [1], when: "9e jour de Chaitra", explain: "La naissance de Rama, héros du Ramayana et septième avatar de Vishnou : lectures du Ramayana, chants et processions." },
                { id: "akshaya", name: "Akshaya Tritiya", icon: "🪙", months: [2], when: "3e jour de Vaishakha", explain: "Un jour réputé porter chance pour tout ce qu'on commence : beaucoup de familles achètent de l'or ce jour-là." },
                { id: "rathyatra", name: "Rath Yatra", icon: "🛕", months: [4], when: "2e jour de la quinzaine claire d'Ashadha", explain: "À Puri, d'immenses chars sont tirés par la foule pour promener le dieu Jagannath, son frère et sa sœur jusqu'à un autre temple." },
                { id: "gurupurnima", name: "Guru Purnima", icon: "🎓", months: [4], when: "Pleine lune d'Ashadha", explain: "Les disciples honorent leur maître spirituel ; on y célèbre aussi le sage Vyasa, auteur présumé du Mahabharata." },
                { id: "rakshabandhan", name: "Raksha Bandhan", icon: "🧵", months: [5], when: "Pleine lune de Shravana", explain: "Une sœur noue un fil (rakhi) au poignet de son frère, qui promet de la protéger et lui fait un cadeau." },
                { id: "ganesh", name: "Ganesh Chaturthi", icon: "🐘", months: [6], when: "4e jour de la quinzaine claire de Bhadrapada", explain: "La naissance du dieu à tête d'éléphant : des statues sont exposées pendant dix jours, puis plongées dans l'eau en procession, surtout à Mumbai." },
                { id: "janmashtami", name: "Janmashtami", icon: "🦚", months: [6], when: "8e jour de la quinzaine sombre de Bhadrapada", explain: "La naissance de Krishna, à minuit : on jeûne jusqu'à cette heure, et l'on casse des jarres de lait caillé suspendues en hauteur (dahi handi)." },
                { id: "navaratri", name: "Navaratri", icon: "💃", months: [7], when: "Neuf nuits au début d'Ashvin", explain: "Neuf nuits consacrées à la déesse Durga, avec jeûne, prières et danses (le garba au Gujarat)." },
                { id: "dussehra", name: "Dussehra", icon: "🔥", months: [7], when: "10e jour de la quinzaine claire d'Ashvin", explain: "Rama triomphe du démon-roi Ravana : on brûle des effigies géantes de Ravana. Au Bengale, c'est le jour où l'on immerge les statues de Durga." },
                { id: "diwali", name: "Diwali", icon: "🪔", months: [7], when: "Nouvelle lune d'Ashvin (Kartika au nord)", explain: "La fête des lumières, la plus grande de l'Inde : on allume des lampes à huile (diyas), on tire des feux d'artifice et l'on honore la déesse Lakshmi." },
                { id: "chhath", name: "Chhath Puja", icon: "🌅", months: [8], when: "6e jour de la quinzaine claire de Kartika", explain: "Une fête du Soleil, surtout au Bihar : on se tient dans l'eau d'une rivière pour offrir des prières au soleil couchant, puis levant." },
                { id: "makarsankranti", name: "Makar Sankranti", icon: "🪁", months: [10, 11], when: "14 ou 15 janvier (fête solaire, à cheval sur deux mois)", explain: "Le Soleil entre dans le signe du Capricorne et les jours rallongent : on fait voler des cerfs-volants. Cette fête suit le Soleil, pas la Lune, et se fixe donc presque toujours au même jour du calendrier grégorien." },
                { id: "vasantpanchami", name: "Vasant Panchami", icon: "📚", months: [11], when: "5e jour de la quinzaine claire de Magha", explain: "L'arrivée du printemps, dédiée à Saraswati, déesse du savoir : on s'habille en jaune et l'on fait « lire » ses premières lettres à un jeune enfant." },
                { id: "shivaratri", name: "Maha Shivaratri", icon: "🔱", months: [11], when: "14e jour de la quinzaine sombre de Magha", explain: "La « grande nuit de Shiva » : on veille et l'on jeûne toute la nuit, en versant lait et eau sur un lingam." },
                { id: "holi", name: "Holi", icon: "🎨", months: [12], when: "Pleine lune de Phalguna", explain: "La fête des couleurs, au début du printemps : on se lance de la poudre colorée et de l'eau, après avoir brûlé un grand bûcher la veille (Holika Dahan)." }
            ]
        },
        {
            id: "bouddhisme",
            title: "Calendrier bouddhiste",
            short: "Bouddhisme",
            icon: "☸️",
            kind: "religieux",
            intro: "Il n'existe pas un seul calendrier bouddhiste : chaque tradition (Thaïlande, Sri Lanka, Tibet, Japon…) suit ses propres mois lunaires. La roue place donc les fêtes dans les mois du calendrier grégorien, et beaucoup de dates varient d'une année à l'autre : ces fêtes mobiles acceptent deux mois.",
            months: CIVIL_MONTHS,
            events: [
                { id: "losar", name: "Losar", icon: "🏔️", months: [2, 3], when: "Nouvel An tibétain (fête mobile)", explain: "Le Nouvel An lunaire tibétain : maisons nettoyées, offrandes, danses masquées dans les monastères. Il tombe en février ou en mars." },
                { id: "nirvana", name: "Jour du Nirvana", local: "Nehan-e", icon: "🛌", months: [2], when: "15 février", explain: "Dans le bouddhisme du Grand Véhicule (Chine, Japon, Corée), on commémore la mort du Bouddha et son entrée dans le parinirvana." },
                { id: "magha", name: "Magha Puja", local: "Makha Bucha", icon: "🕯️", months: [2, 3], when: "Pleine lune du 3e mois lunaire (fête mobile)", explain: "Elle rappelle une assemblée de 1 250 disciples réunis spontanément autour du Bouddha. Les fidèles thaïlandais font un tour de temple à la bougie." },
                { id: "hanamatsuri", name: "Fête des fleurs", local: "Hana-matsuri", icon: "🌸", months: [4], when: "8 avril", explain: "Au Japon, on célèbre la naissance du Bouddha en versant du thé sucré sur une statue de l'enfant, dans un petit kiosque fleuri." },
                { id: "songkran", name: "Songkran", icon: "💦", months: [4], when: "13 au 15 avril", explain: "Le Nouvel An bouddhiste d'Asie du Sud-Est (Thaïlande, Laos, Cambodge, Birmanie). On verse de l'eau sur les statues du Bouddha et sur les mains des aînés ; dans la rue, on s'asperge." },
                { id: "vesak", name: "Vesak", local: "Visakha Bucha", icon: "🪷", months: [5, 6], when: "Pleine lune de Vesakha (fête mobile)", explain: "La plus grande fête bouddhiste : elle célèbre à la fois la naissance, l'Éveil et la mort du Bouddha. Elle tombe presque toujours en mai, parfois début juin." },
                { id: "asalha", name: "Asalha Puja", local: "Dhamma Day", icon: "☸️", months: [7], when: "Pleine lune du 8e mois lunaire", explain: "Elle rappelle le premier sermon du Bouddha à Sarnath, qui a « mis en mouvement la roue du Dharma ». Elle ouvre la retraite des pluies des moines." },
                { id: "perahera", name: "Esala Perahera", icon: "🐘", months: [7, 8], when: "Pleine lune d'Esala (fête mobile)", explain: "À Kandy, au Sri Lanka, de grands éléphants parés défilent chaque nuit pendant une dizaine de jours, pour honorer la dent du Bouddha." },
                { id: "okphansa", name: "Fin de la retraite des pluies", local: "Ok Phansa", icon: "🛶", months: [10], when: "Pleine lune du 11e mois lunaire", explain: "Après trois mois de retraite, les moines sortent des monastères. Au Laos et en Thaïlande, on organise des courses de pirogues." },
                { id: "ambedkar", name: "Conversion de Bhimrao Ambedkar", local: "Dhammachakra Pravartan Day", icon: "🔵", months: [10], when: "14 octobre", explain: "En 1956, le juriste Bhimrao Ambedkar, né dans une caste jugée « intouchable », se convertit au bouddhisme avec environ 500 000 personnes, à Nagpur. Des millions de fidèles s'y retrouvent chaque année." },
                { id: "bodhi", name: "Jour de l'Éveil", local: "Rohatsu", icon: "🌳", months: [12], when: "8 décembre", explain: "Dans le bouddhisme du Grand Véhicule, on commémore l'Éveil du Bouddha sous l'arbre de la Bodhi, à Bodh Gaya. Les moines zen méditent toute la semaine précédente." }
            ]
        },
        {
            id: "zoroastrisme",
            title: "Calendrier zoroastrien",
            short: "Zoroastrisme",
            icon: "🔥",
            kind: "religieux",
            intro: "Le calendrier zoroastrien suit l'année solaire persane : douze mois de 30 jours (plus cinq jours en fin d'année), qui commence au printemps. Les Parsis d'Inde utilisent un calendrier légèrement décalé, sans correction des années bissextiles, qui avance d'environ un jour tous les quatre ans par rapport à celui-ci.",
            months: ["Farvardin", "Ordibehesht", "Khordad", "Tir", "Mordad", "Shahrivar", "Mehr", "Aban", "Azar", "Dey", "Bahman", "Esfand"],
            events: [
                { id: "nowruz", name: "Norouz", local: "Nowruz", icon: "🌱", months: [1], when: "1er Farvardin (vers le 21 mars)", explain: "Le Nouvel An, à l'équinoxe de printemps : on dresse la table du haft-sin (sept objets dont le nom commence par un « s »). Son origine remonte à l'Iran ancien, bien avant l'islam." },
                { id: "ordibeheshtgan", name: "Fête d'Ordibehesht", local: "Ordibeheshtgan", icon: "🔥", months: [2], when: "3 Ordibehesht", explain: "Dédiée à Asha Vahishta, l'esprit de la vérité, que le zoroastrisme associe au feu." },
                { id: "khordadsal", name: "Naissance de Zoroastre", local: "Khordadsal", icon: "✨", months: [3], when: "6 Khordad", explain: "On célèbre la naissance du prophète Zoroastre (Zarathoustra), qui aurait fondé la religion en Iran ancien." },
                { id: "tirgan", name: "Tirgan", icon: "💧", months: [4], when: "13 Tir", explain: "Une fête de l'eau et de la pluie : on s'asperge d'eau, on noue des rubans colorés au poignet et l'on lit des poèmes." },
                { id: "mordadgan", name: "Fête de Mordad", local: "Mordadgan", icon: "🌿", months: [5], when: "7 Mordad", explain: "Dédiée à Amordad, l'esprit de l'immortalité, protecteur des plantes." },
                { id: "shahrivargan", name: "Fête de Shahrivar", local: "Shahrivargan", icon: "⚒️", months: [6], when: "4 Shahrivar", explain: "Dédiée à Khshathra, l'esprit de la puissance bien employée, associé aux métaux." },
                { id: "mehregan", name: "Mehregan", icon: "☀️", months: [7], when: "16 Mehr", explain: "La fête de Mithra, esprit de l'amitié et du contrat, et celle des récoltes d'automne : on mange des fruits de saison." },
                { id: "abanagan", name: "Fête de l'eau", local: "Abanagan", icon: "🌊", months: [8], when: "10 Aban", explain: "On honore Anahita, esprit des eaux, en se rendant près d'une rivière ou d'une source." },
                { id: "yalda", name: "Nuit de Yalda", local: "Shab-e Yalda", icon: "🍉", months: [9], when: "30 Azar (21 décembre)", explain: "La nuit la plus longue de l'année : on veille en famille avec des grenades et des pastèques, et l'on lit les poèmes de Hafez. On y célèbre la victoire de la lumière." },
                { id: "zartosht", name: "Mort de Zoroastre", local: "Zartosht No-Diso", icon: "🕯️", months: [10], when: "11 Dey", explain: "On commémore la mort du prophète Zoroastre par des prières et des repas communs." },
                { id: "sadeh", name: "Sadeh", icon: "🪵", months: [11], when: "10 Bahman (vers le 30 janvier)", explain: "Une fête du feu, cinquante jours avant Norouz : on allume de grands brasiers en plein hiver, en souvenir de la découverte du feu." },
                { id: "chaharshanbe", name: "Mercredi du feu", local: "Chaharshanbe Suri", icon: "🎇", months: [12], when: "Dernier mardi soir avant Norouz", explain: "On saute par-dessus de petits feux en disant : « Ma pâleur à toi, ta rougeur à moi », pour se débarrasser des malheurs de l'année qui finit." }
            ]
        },
        {
            id: "afriquedusud",
            title: "Afrique du Sud",
            short: "Afrique du Sud",
            icon: "🇿🇦",
            kind: "civil",
            intro: "Plusieurs jours fériés sud-africains datent de la fin de l'apartheid : ils rappellent la lutte pour l'égalité et la première élection démocratique de 1994. Quand un férié tombe un dimanche, le lundi suivant l'est aussi.",
            months: CIVIL_MONTHS,
            events: [
                { id: "klopse", name: "Second Nouvel An", local: "Tweede Nuwe Jaar", icon: "🎺", months: [1], when: "2 janvier", explain: "Au Cap, des troupes en costumes colorés défilent en musique : c'est le carnaval des Minstrels (Kaapse Klopse), né chez les descendants d'esclaves." },
                { id: "humanrights", name: "Jour des droits humains", local: "Human Rights Day", icon: "⚖️", months: [3], when: "21 mars", explain: "Il rappelle le massacre de Sharpeville, en 1960 : la police tire sur des manifestants qui protestaient contre les laissez-passer imposés aux Noirs." },
                { id: "goodfriday", name: "Vendredi saint", local: "Good Friday", icon: "✝️", months: [3, 4], when: "Vendredi avant Pâques (fête mobile)", explain: "Un jour férié d'origine chrétienne ; le lundi de Pâques est le « jour de la famille »." },
                { id: "freedom", name: "Jour de la Liberté", local: "Freedom Day", icon: "🗳️", months: [4], when: "27 avril", explain: "Il rappelle les premières élections libres de 1994, où tous les Sud-Africains, quelle que soit leur couleur de peau, ont pu voter. Nelson Mandela devient président." },
                { id: "workers", name: "Fête du Travail", local: "Workers' Day", icon: "🌷", months: [5], when: "1er mai", explain: "Un jour férié consacré aux travailleurs et aux syndicats, qui ont joué un grand rôle dans la lutte contre l'apartheid." },
                { id: "youth", name: "Journée de la jeunesse", local: "Youth Day", icon: "✊", months: [6], when: "16 juin", explain: "Il rappelle le soulèvement de Soweto, en 1976 : des milliers d'écoliers manifestent contre l'enseignement obligatoire en afrikaans, et la police tire." },
                { id: "mandela", name: "Journée Nelson Mandela", local: "Mandela Day", icon: "🕊️", months: [7], when: "18 juillet", explain: "Le jour de naissance de Mandela (1918) : on lui rend hommage en consacrant 67 minutes, une pour chacune de ses années de combat politique, à aider les autres. Ce n'est pas un férié." },
                { id: "womens", name: "Journée des femmes", local: "National Women's Day", icon: "👩", months: [8], when: "9 août", explain: "Il rappelle la marche de 20 000 femmes vers les bureaux du gouvernement à Pretoria, en 1956, contre les laissez-passer." },
                { id: "heritage", name: "Jour du Patrimoine", local: "Heritage Day", icon: "🍖", months: [9], when: "24 septembre", explain: "On célèbre la diversité des cultures du pays, souvent par un barbecue (braai) : on l'appelle d'ailleurs « Braai Day »." },
                { id: "reconciliation", name: "Jour de la Réconciliation", local: "Day of Reconciliation", icon: "🤝", months: [12], when: "16 décembre", explain: "Une date double : autrefois celle de la victoire des Boers à Blood River (1838), elle rappelle aussi la création de la branche armée de l'ANC en 1961. Elle est devenue un jour d'unité nationale." },
                { id: "christmas", name: "Noël", local: "Christmas Day", icon: "🎄", months: [12], when: "25 décembre", explain: "Un férié en plein été austral : on le fête souvent par un déjeuner en plein air, à la plage ou au braai." },
                { id: "goodwill", name: "Jour de la bonne volonté", local: "Day of Goodwill", icon: "🎁", months: [12], when: "26 décembre", explain: "Le lendemain de Noël : c'est l'ancien Boxing Day, où l'on offrait des cadeaux à ceux qui avaient servi." }
            ]
        },
        {
            id: "argentine",
            title: "Argentine",
            short: "Argentine",
            icon: "🇦🇷",
            kind: "civil",
            intro: "L'Argentine a un calendrier riche en commémorations de son histoire : indépendance, héros nationaux, guerre des Malouines et dictature militaire (1976-1983). Plusieurs fériés sont déplacés au lundi le plus proche pour faire des week-ends de trois jours.",
            months: CIVIL_MONTHS,
            events: [
                { id: "carnaval", name: "Carnaval", local: "Carnaval", icon: "🎭", months: [2, 3], when: "Lundi et mardi avant le Mercredi des Cendres (fête mobile)", explain: "Deux jours fériés de défilés, de comparsas et de batailles d'eau, surtout à Gualeguaychú." },
                { id: "memoria", name: "Jour de la Mémoire", local: "Día de la Memoria", icon: "🕊️", months: [3], when: "24 mars", explain: "Il rappelle le coup d'État militaire du 24 mars 1976, qui a ouvert sept ans de dictature, avec des dizaines de milliers de disparus." },
                { id: "malvinas", name: "Jour des Malouines", local: "Día de las Malvinas", icon: "🏝️", months: [4], when: "2 avril", explain: "Il rappelle le débarquement argentin sur les îles Malouines (Falkland), le 2 avril 1982, début d'une guerre perdue contre le Royaume-Uni." },
                { id: "mayo", name: "Révolution de Mai", local: "Revolución de Mayo", icon: "🔔", months: [5], when: "25 mai", explain: "En 1810, à Buenos Aires, un premier gouvernement local (la Primera Junta) remplace le vice-roi espagnol : c'est le début de l'indépendance." },
                { id: "bandera", name: "Jour du Drapeau", local: "Día de la Bandera", icon: "💙", months: [6], when: "20 juin", explain: "Il honore Manuel Belgrano, créateur du drapeau bleu ciel et blanc, mort le 20 juin 1820." },
                { id: "independencia", name: "Jour de l'Indépendance", local: "Día de la Independencia", icon: "📜", months: [7], when: "9 juillet", explain: "En 1816, à Tucumán, un congrès proclame l'indépendance des Provinces-Unies du Rio de la Plata." },
                { id: "amigo", name: "Jour de l'Ami", local: "Día del Amigo", icon: "🤝", months: [7], when: "20 juillet", explain: "Une fête née en Argentine en 1969, le jour de l'arrivée de l'homme sur la Lune : on offre un cadeau ou un message à ses amis. Elle n'est pas fériée." },
                { id: "sanmartin", name: "Mort de San Martín", local: "Paso a la Inmortalidad de San Martín", icon: "🐎", months: [8], when: "17 août (3e lundi d'août)", explain: "Il honore José de San Martín, « Libérateur » de l'Argentine, du Chili et du Pérou, mort en 1850 à Boulogne-sur-Mer, en France." },
                { id: "diversidad", name: "Jour de la diversité culturelle", local: "Día del Respeto a la Diversidad Cultural", icon: "🌎", months: [10], when: "12 octobre", explain: "Il rappelle l'arrivée de Colomb en Amérique en 1492, mais s'appelait autrefois « Jour de la Race » : il a été renommé en 2010 pour respecter les peuples originaires." },
                { id: "soberania", name: "Jour de la Souveraineté", local: "Día de la Soberanía Nacional", icon: "⚓", months: [11], when: "20 novembre", explain: "Il rappelle la bataille de la Vuelta de Obligado (1845), où l'Argentine résiste à une flotte franco-britannique qui remontait le fleuve Paraná." },
                { id: "inmaculada", name: "Immaculée Conception", local: "Inmaculada Concepción", icon: "🙏", months: [12], when: "8 décembre", explain: "Une fête catholique et un jour férié, très suivi dans un pays majoritairement catholique." },
                { id: "tango", name: "Jour du Tango", local: "Día Nacional del Tango", icon: "💃", months: [12], when: "11 décembre", explain: "Il rappelle la naissance de deux grandes figures du tango, Carlos Gardel (selon une version) et Julio De Caro." },
                { id: "navidad", name: "Noël", local: "Navidad", icon: "🎄", months: [12], when: "25 décembre", explain: "Un férié en plein été : le réveillon du 24 se termine à minuit par des feux d'artifice et le pan dulce." }
            ]
        },
        {
            id: "australie",
            title: "Australie",
            short: "Australie",
            icon: "🇦🇺",
            kind: "civil",
            intro: "L'Australie est dans l'hémisphère sud : Noël y tombe en plein été et la rentrée scolaire se fait en février. Beaucoup de jours fériés sont fixés par chaque État, donc variables selon l'endroit.",
            months: CIVIL_MONTHS,
            events: [
                { id: "newyear", name: "Jour de l'An", local: "New Year's Day", icon: "🎆", months: [1], when: "1er janvier", explain: "Le feu d'artifice de Sydney, au-dessus de l'Opéra et du pont de la baie, est vu par des millions de spectateurs." },
                { id: "australiaday", name: "Fête de l'Australie", local: "Australia Day", icon: "🦘", months: [1], when: "26 janvier", explain: "Elle rappelle l'arrivée de la Première Flotte britannique à Sydney Cove, en 1788. Pour beaucoup d'Aborigènes, c'est le début de l'invasion : ils l'appellent « Jour de l'invasion » ou « Jour de la survie »." },
                { id: "mardigras", name: "Mardi gras de Sydney", local: "Sydney Mardi Gras", icon: "🌈", months: [2, 3], when: "Fin février - début mars (fête mobile)", explain: "Un des plus grands défilés de fierté LGBTQ+ du monde, qui est né en 1978 d'une manifestation réprimée par la police." },
                { id: "goodfriday", name: "Vendredi saint", local: "Good Friday", icon: "✝️", months: [3, 4], when: "Vendredi avant Pâques (fête mobile)", explain: "Un jour férié dans tout le pays, d'origine chrétienne." },
                { id: "anzac", name: "Jour de l'ANZAC", local: "ANZAC Day", icon: "🌺", months: [4], when: "25 avril", explain: "Il rappelle le débarquement des soldats australiens et néo-zélandais (ANZAC) à Gallipoli, en Turquie, en 1915. À l'aube, on observe un moment de recueillement." },
                { id: "sorry", name: "Journée des excuses", local: "National Sorry Day", icon: "🤝", months: [5], when: "26 mai", explain: "On se souvient des enfants aborigènes enlevés à leur famille, la « génération volée ». En 2008, le Premier ministre a présenté les excuses officielles du pays." },
                { id: "kingsbirthday", name: "Anniversaire du souverain", local: "King's Birthday", icon: "👑", months: [6], when: "2e lundi de juin (selon les États)", explain: "L'anniversaire officiel du souverain, célébré en juin quel que soit son vrai jour de naissance." },
                { id: "naidoc", name: "Semaine NAIDOC", local: "NAIDOC Week", icon: "🖤", months: [7], when: "Première semaine de juillet", explain: "Une semaine pour célébrer l'histoire, la culture et les succès des Aborigènes et des insulaires du détroit de Torrès." },
                { id: "afl", name: "Finale du football australien", local: "AFL Grand Final", icon: "🏉", months: [9], when: "Dernier samedi de septembre", explain: "La finale du championnat de football australien, sport propre au pays, se joue à Melbourne devant 100 000 spectateurs." },
                { id: "melbournecup", name: "Coupe de Melbourne", local: "Melbourne Cup", icon: "🐎", months: [11], when: "1er mardi de novembre", explain: "Une course de chevaux surnommée « la course qui arrête la nation » : le pays s'arrête pour la regarder pendant trois minutes." },
                { id: "christmas", name: "Noël", local: "Christmas Day", icon: "🎄", months: [12], when: "25 décembre", explain: "En plein été : on mange souvent des crevettes et du barbecue, à la plage." },
                { id: "boxing", name: "Lendemain de Noël", local: "Boxing Day", icon: "🎁", months: [12], when: "26 décembre", explain: "Il est marqué par une grande régate, la Sydney-Hobart, qui part de Sydney le jour même." }
            ]
        },
        {
            id: "autriche",
            title: "Autriche",
            short: "Autriche",
            icon: "🇦🇹",
            kind: "civil",
            intro: "L'Autriche est un pays très catholique, et la plupart de ses fêtes sont d'origine chrétienne. Elle est aussi célèbre pour sa musique classique : Vienne, Salzbourg, les valses.",
            months: CIVIL_MONTHS,
            events: [
                { id: "neujahrskonzert", name: "Concert du Nouvel An", local: "Neujahrskonzert", icon: "🎼", months: [1], when: "1er janvier", explain: "L'orchestre philharmonique de Vienne joue des valses de la famille Strauss, retransmises dans des dizaines de pays." },
                { id: "dreikoenig", name: "Épiphanie", local: "Heilige Drei Könige", icon: "👑", months: [1], when: "6 janvier", explain: "Un jour férié : des enfants déguisés en Rois mages passent de maison en maison (Sternsinger) et inscrivent à la craie la bénédiction de l'année." },
                { id: "opernball", name: "Bal de l'Opéra", local: "Wiener Opernball", icon: "💃", months: [2, 3], when: "Jeudi avant le Mercredi des Cendres (fête mobile)", explain: "Le grand bal de la saison de carnaval à Vienne : valse, robes de soirée, présence de personnalités du monde entier." },
                { id: "ostermontag", name: "Lundi de Pâques", local: "Ostermontag", icon: "🐰", months: [3, 4], when: "Lendemain de Pâques (fête mobile)", explain: "Un jour férié dans tout le pays, d'origine chrétienne." },
                { id: "staatsfeiertag", name: "Fête du Travail", local: "Staatsfeiertag", icon: "🌷", months: [5], when: "1er mai", explain: "Le « jour férié de l'État » : défilés de syndicats, dont le plus célèbre à Vienne." },
                { id: "fronleichnam", name: "Fête-Dieu", local: "Fronleichnam", icon: "⛪", months: [5, 6], when: "Jeudi après la Trinité, 60 jours après Pâques (fête mobile)", explain: "Des processions traversent les villages et les villes, avec des fleurs et des fanfares : c'est un jour férié." },
                { id: "festspiele", name: "Festival de Salzbourg", local: "Salzburger Festspiele", icon: "🎭", months: [7, 8], when: "Fin juillet - août (à cheval sur deux mois)", explain: "Un des plus grands festivals d'art lyrique et de théâtre du monde, né en 1920 : il se joue chaque année dans la ville natale de Mozart." },
                { id: "mariaehimmelfahrt", name: "Assomption", local: "Mariä Himmelfahrt", icon: "🌹", months: [8], when: "15 août", explain: "Un jour férié catholique, qui est aussi le moment où l'on bénit les bouquets d'herbes et de fleurs (Kräuterbuschen)." },
                { id: "nationalfeiertag", name: "Fête nationale", local: "Nationalfeiertag", icon: "🇦🇹", months: [10], when: "26 octobre", explain: "Elle rappelle la loi de neutralité du 26 octobre 1955, votée après le départ des troupes d'occupation alliées : l'Autriche s'engage à ne participer à aucune alliance militaire." },
                { id: "allerheiligen", name: "Toussaint", local: "Allerheiligen", icon: "🍂", months: [11], when: "1er novembre", explain: "Un jour férié : on fleurit les tombes et l'on offre aux enfants des brioches tressées (Allerheiligenstriezel)." },
                { id: "empfaengnis", name: "Immaculée Conception", local: "Mariä Empfängnis", icon: "🙏", months: [12], when: "8 décembre", explain: "Un jour férié catholique, qui marque aussi le début des achats de Noël." },
                { id: "christtag", name: "Noël", local: "Christtag", icon: "🎄", months: [12], when: "25 décembre", explain: "Les cadeaux sont apportés dans la soirée du 24 par l'Enfant Jésus (Christkind), et non par le père Noël." },
                { id: "stefanitag", name: "Saint-Étienne", local: "Stefanitag", icon: "🎁", months: [12], when: "26 décembre", explain: "Le lendemain de Noël, un second jour férié, consacré en famille." }
            ]
        },
        {
            id: "bresil",
            title: "Brésil",
            short: "Brésil",
            icon: "🇧🇷",
            kind: "civil",
            intro: "Au Brésil, le Carnaval est la fête la plus célèbre, mais le calendrier mêle aussi des fêtes catholiques, des fêtes de l'indépendance et la mémoire de l'esclavage, qui n'y a été aboli qu'en 1888.",
            months: CIVIL_MONTHS,
            events: [
                { id: "iemanja", name: "Fête de Yemanjá", local: "Dia de Iemanjá", icon: "🌊", months: [2], when: "2 février", explain: "À Salvador, des milliers de fidèles du candomblé jettent des fleurs et des offrandes à la mer pour la déesse des eaux, Yemanjá, vêtus de blanc." },
                { id: "carnaval", name: "Carnaval", local: "Carnaval", icon: "💃", months: [2, 3], when: "Quatre jours avant le Mercredi des Cendres (fête mobile)", explain: "Les défilés des écoles de samba de Rio, le sambodrome, les « blocos » dans les rues : le plus grand carnaval du monde." },
                { id: "sextasanta", name: "Vendredi saint", local: "Sexta-feira Santa", icon: "✝️", months: [3, 4], when: "Vendredi avant Pâques (fête mobile)", explain: "Un jour férié, marqué par des processions." },
                { id: "tiradentes", name: "Jour de Tiradentes", local: "Tiradentes", icon: "🗡️", months: [4], when: "21 avril", explain: "Il honore Joaquim José da Silva Xavier, dit Tiradentes, pendu en 1792 pour avoir conspiré contre la domination portugaise (l'Inconfidência Mineira)." },
                { id: "trabalho", name: "Fête du Travail", local: "Dia do Trabalho", icon: "🌷", months: [5], when: "1er mai", explain: "Un jour férié, avec des manifestations syndicales." },
                { id: "corpus", name: "Fête-Dieu", local: "Corpus Christi", icon: "🌼", months: [5, 6], when: "Jeudi après la Trinité (fête mobile)", explain: "Des tapis de sciure colorée recouvrent les rues pour la procession, comme à Ouro Preto." },
                { id: "juninas", name: "Fêtes de juin", local: "Festas Juninas", icon: "🌽", months: [6], when: "Juin", explain: "Dédiées à saint Antoine, saint Jean et saint Pierre : feux de joie, danses de quadrille, maïs grillé, surtout dans le Nordeste." },
                { id: "independencia", name: "Fête de l'Indépendance", local: "Independência", icon: "🇧🇷", months: [9], when: "7 septembre", explain: "En 1822, Dom Pedro, prince héritier du Portugal, proclame l'indépendance du Brésil en lançant « Indépendance ou la mort ! »." },
                { id: "aparecida", name: "Notre-Dame d'Aparecida", local: "Nossa Senhora Aparecida", icon: "🙏", months: [10], when: "12 octobre", explain: "La sainte patronne du Brésil : des millions de pèlerins se rendent à sa basilique. C'est aussi la fête des enfants." },
                { id: "finados", name: "Jour des morts", local: "Finados", icon: "🕯️", months: [11], when: "2 novembre", explain: "Un jour férié où les familles se rendent au cimetière pour fleurir les tombes." },
                { id: "republica", name: "Proclamation de la République", local: "Proclamação da República", icon: "🏛️", months: [11], when: "15 novembre", explain: "En 1889, un coup d'État militaire renverse l'empereur Pierre II et fait du Brésil une République." },
                { id: "consciencia", name: "Journée de la conscience noire", local: "Consciência Negra", icon: "✊", months: [11], when: "20 novembre", explain: "Il rappelle la mort de Zumbi, chef du Quilombo dos Palmares, refuge d'esclaves en fuite, en 1695. Il est férié dans tout le pays depuis 2024." },
                { id: "natal", name: "Noël", local: "Natal", icon: "🎄", months: [12], when: "25 décembre", explain: "Un férié en plein été : le repas du réveillon, avec dinde et riz, a lieu dans la nuit du 24." },
                { id: "reveillon", name: "Réveillon du Nouvel An", local: "Réveillon", icon: "🎆", months: [12], when: "31 décembre", explain: "À Copacabana, des millions de personnes vêtues de blanc voient le feu d'artifice sur la plage et offrent des fleurs à la mer." }
            ]
        },
        {
            id: "canada",
            title: "Canada",
            short: "Canada",
            icon: "🇨🇦",
            kind: "civil",
            intro: "Le Canada compte des fêtes nationales et des fêtes propres à chaque province. Au Québec, le 24 juin remplace le 1er juillet comme fête principale, et beaucoup d'habitants y déménagent le 1er juillet.",
            months: CIVIL_MONTHS,
            events: [
                { id: "carnaval", name: "Carnaval de Québec", local: "Carnaval de Québec", icon: "⛄", months: [1, 2], when: "Fin janvier - mi-février (à cheval sur deux mois)", explain: "Le plus grand carnaval d'hiver du monde, dont la mascotte est Bonhomme Carnaval, un bonhomme de neige." },
                { id: "family", name: "Jour de la famille", local: "Family Day", icon: "🏠", months: [2], when: "3e lundi de février", explain: "Un jour férié dans plusieurs provinces, qui permet de passer du temps en famille en plein hiver." },
                { id: "goodfriday", name: "Vendredi saint", local: "Good Friday", icon: "✝️", months: [3, 4], when: "Vendredi avant Pâques (fête mobile)", explain: "Un jour férié fédéral, d'origine chrétienne." },
                { id: "victoria", name: "Fête de la reine Victoria", local: "Victoria Day", icon: "👑", months: [5], when: "Lundi avant le 25 mai", explain: "Elle honore la reine Victoria, née le 24 mai 1819. C'est le début informel de l'été." },
                { id: "stjean", name: "Fête nationale du Québec", local: "Saint-Jean-Baptiste", icon: "🔵", months: [6], when: "24 juin", explain: "On célèbre la culture québécoise avec des feux de joie et des chansons, sous le drapeau fleurdelisé." },
                { id: "canadaday", name: "Fête du Canada", local: "Canada Day", icon: "🍁", months: [7], when: "1er juillet", explain: "Elle rappelle la Confédération de 1867, qui unit quatre colonies britanniques en un dominion." },
                { id: "stampede", name: "Stampede de Calgary", local: "Calgary Stampede", icon: "🤠", months: [7], when: "Dix jours en juillet", explain: "Un grand rodéo et une fête de l'Ouest canadien : les rues se remplissent de chapeaux de cow-boys." },
                { id: "labour", name: "Fête du Travail", local: "Labour Day", icon: "🛠️", months: [9], when: "1er lundi de septembre", explain: "Le dernier jour de l'été pour les familles, avant la rentrée scolaire." },
                { id: "truth", name: "Journée de la vérité et de la réconciliation", local: "Truth and Reconciliation Day", icon: "🧡", months: [9], when: "30 septembre", explain: "Elle commémore les enfants autochtones enlevés à leur famille et placés dans des pensionnats. On porte une chemise orange." },
                { id: "thanksgiving", name: "Action de grâce", local: "Thanksgiving", icon: "🦃", months: [10], when: "2e lundi d'octobre", explain: "Un repas de récolte avec de la dinde, en octobre et non en novembre comme aux États-Unis, car les récoltes sont plus précoces." },
                { id: "remembrance", name: "Jour du Souvenir", local: "Remembrance Day", icon: "🌺", months: [11], when: "11 novembre", explain: "On honore les soldats morts à la guerre en portant un coquelicot, inspiré d'un poème du médecin militaire canadien John McCrae." },
                { id: "christmas", name: "Noël", local: "Christmas Day", icon: "🎄", months: [12], when: "25 décembre", explain: "Un jour férié, avec la neige de saison pour la plupart des familles." },
                { id: "boxing", name: "Lendemain de Noël", local: "Boxing Day", icon: "🎁", months: [12], when: "26 décembre", explain: "Un jour de grandes soldes dans les magasins." }
            ]
        },
        {
            id: "chine",
            title: "Chine",
            short: "Chine",
            icon: "🇨🇳",
            kind: "civil",
            intro: "Beaucoup de grandes fêtes chinoises suivent le calendrier traditionnel luni-solaire : leur date change chaque année dans le calendrier grégorien. Elles sont donc mobiles, et acceptent deux mois.",
            months: CIVIL_MONTHS,
            events: [
                { id: "chunjie", name: "Fête du Printemps", local: "Chūnjié", icon: "🧧", months: [1, 2], when: "Nouvel An lunaire (fête mobile)", explain: "Le Nouvel An chinois, la plus grande fête du pays : on retourne dans sa famille (le plus grand déplacement humain annuel), on mange des raviolis et l'on offre des enveloppes rouges." },
                { id: "lantern", name: "Fête des Lanternes", local: "Yuánxiāo jié", icon: "🏮", months: [2, 3], when: "15e jour du 1er mois lunaire (fête mobile)", explain: "Elle clôt les célébrations du Nouvel An : on promène des lanternes et l'on mange des boulettes de riz glutineux." },
                { id: "women", name: "Journée des femmes", local: "Fùnǚ jié", icon: "🌸", months: [3], when: "8 mars", explain: "Les femmes ont souvent une demi-journée de congé ce jour-là." },
                { id: "qingming", name: "Fête de Qingming", local: "Qīngmíng", icon: "🌿", months: [4], when: "4 ou 5 avril", explain: "On nettoie les tombes de ses ancêtres, on y fait des offrandes et l'on pique-nique au printemps." },
                { id: "labour", name: "Fête du Travail", local: "Láodòng jié", icon: "🌷", months: [5], when: "1er mai", explain: "Un congé de plusieurs jours, qui est l'un des grands moments de voyages du pays." },
                { id: "dragonboat", name: "Fête des Bateaux-Dragons", local: "Duānwǔ jié", icon: "🐉", months: [5, 6], when: "5e jour du 5e mois lunaire (fête mobile)", explain: "Des courses de bateaux-dragons et des zongzi (boulettes de riz) rappellent la mort du poète Qu Yuan, noyé vers 278 av. J.-C." },
                { id: "children", name: "Fête des enfants", local: "Értóng jié", icon: "🎈", months: [6], when: "1er juin", explain: "Les écoliers reçoivent des cadeaux et font des spectacles à l'école." },
                { id: "qixi", name: "Fête de Qixi", local: "Qīxī", icon: "🌌", months: [7, 8], when: "7e jour du 7e mois lunaire (fête mobile)", explain: "La « Saint-Valentin chinoise » : elle rappelle la légende de la Tisserande et du Bouvier, séparés par la Voie lactée et réunis une nuit par an." },
                { id: "army", name: "Fête de l'Armée", local: "Jiànjūn jié", icon: "🎖️", months: [8], when: "1er août", explain: "Elle rappelle le soulèvement de Nanchang, le 1er août 1927, considéré comme la naissance de l'Armée populaire de libération." },
                { id: "teachers", name: "Fête des enseignants", local: "Jiàoshī jié", icon: "🍎", months: [9], when: "10 septembre", explain: "Les élèves offrent des fleurs et des cartes à leurs enseignants. Elle existe depuis 1985." },
                { id: "midautumn", name: "Fête de la mi-automne", local: "Zhōngqiū jié", icon: "🥮", months: [9, 10], when: "15e jour du 8e mois lunaire (fête mobile)", explain: "La pleine lune d'automne : les familles se réunissent pour la regarder en mangeant des gâteaux de lune." },
                { id: "national", name: "Fête nationale", local: "Guóqìng jié", icon: "🇨🇳", months: [10], when: "1er octobre", explain: "En 1949, Mao Zedong proclame la République populaire de Chine, place Tiananmen, à Pékin. C'est suivi d'une semaine de congé, la « Golden Week »." },
                { id: "singles", name: "Journée des célibataires", local: "Guānggùn jié", icon: "🛍️", months: [11], when: "11 novembre", explain: "Née dans les universités, elle est devenue la plus grande journée de soldes en ligne du monde (11/11, quatre fois le chiffre 1)." },
                { id: "dongzhi", name: "Solstice d'hiver", local: "Dōngzhì", icon: "🥟", months: [12], when: "21 ou 22 décembre", explain: "Le jour le plus court de l'année : on mange des raviolis dans le Nord et des boulettes de riz dans le Sud." }
            ]
        },
        {
            id: "colombie",
            title: "Colombie",
            short: "Colombie",
            icon: "🇨🇴",
            kind: "civil",
            intro: "La Colombie célèbre l'indépendance (1810-1819), ses fêtes catholiques et de grands carnavals. Beaucoup de fêtes religieuses sont reportées au lundi le plus proche, pour faire des week-ends de trois jours.",
            months: CIVIL_MONTHS,
            events: [
                { id: "reyes", name: "Rois mages", local: "Reyes Magos", icon: "👑", months: [1], when: "6 janvier (reporté au lundi)", explain: "Un jour férié, qui clôt les fêtes de fin d'année." },
                { id: "barranquilla", name: "Carnaval de Barranquilla", local: "Carnaval de Barranquilla", icon: "🎭", months: [2, 3], when: "Quatre jours avant le Mercredi des Cendres (fête mobile)", explain: "Un des plus grands carnavals du monde, classé par l'UNESCO en 2003 : danses de cumbia, masques et défilés sur la côte caraïbe." },
                { id: "semanasanta", name: "Semaine sainte", local: "Semana Santa", icon: "✝️", months: [3, 4], when: "Semaine avant Pâques (fête mobile)", explain: "Des processions de pénitents défilent dans les villes coloniales comme Popayán, classée par l'UNESCO pour ses processions." },
                { id: "vallenato", name: "Festival de la légende vallenato", local: "Festival de la Leyenda Vallenata", icon: "🪗", months: [4], when: "Fin avril", explain: "À Valledupar, des accordéonistes se disputent le titre de roi du vallenato, musique traditionnelle du nord du pays." },
                { id: "trabajo", name: "Fête du Travail", local: "Día del Trabajo", icon: "🌷", months: [5], when: "1er mai", explain: "Un jour férié, avec des défilés de syndicats." },
                { id: "independencia", name: "Fête de l'Indépendance", local: "Día de la Independencia", icon: "🇨🇴", months: [7], when: "20 juillet", explain: "En 1810, à Bogotá, une querelle autour d'un vase prêté (le florero de Llorente) déclenche la révolte contre l'Espagne." },
                { id: "boyaca", name: "Bataille de Boyacá", local: "Batalla de Boyacá", icon: "⚔️", months: [8], when: "7 août", explain: "En 1819, Simón Bolívar bat les troupes espagnoles à Boyacá et libère la région : c'est l'événement décisif de l'indépendance." },
                { id: "flores", name: "Foire des fleurs", local: "Feria de las Flores", icon: "🌸", months: [8], when: "Début août", explain: "À Medellín, des paysans défilent en portant sur leur dos d'immenses compositions de fleurs (les silleteros)." },
                { id: "diversidad", name: "Jour de la diversité", local: "Día de la Raza", icon: "🌎", months: [10], when: "12 octobre (reporté au lundi)", explain: "Il rappelle l'arrivée de Colomb en Amérique en 1492 ; il a été rebaptisé pour honorer aussi les peuples originaires." },
                { id: "todossantos", name: "Toussaint", local: "Todos los Santos", icon: "🍂", months: [11], when: "1er novembre (reporté au lundi)", explain: "Un jour férié catholique : on fleurit les tombes." },
                { id: "cartagena", name: "Indépendance de Carthagène", local: "Independencia de Cartagena", icon: "🏰", months: [11], when: "11 novembre", explain: "En 1811, la ville portuaire de Carthagène des Indes se déclare indépendante : on y fête chaque année un concours de beauté et des défilés." },
                { id: "velitas", name: "Jour des Petites Bougies", local: "Día de las Velitas", icon: "🕯️", months: [12], when: "7 décembre, veille de l'Immaculée Conception", explain: "On allume des bougies et des lanternes devant les maisons, ce qui marque le début des fêtes de Noël." },
                { id: "navidad", name: "Noël", local: "Navidad", icon: "🎄", months: [12], when: "25 décembre", explain: "Les neuf jours qui précèdent Noël, on prie la novena de aguinaldos et l'on mange des buñuelos et de la natilla." }
            ]
        },
        {
            id: "rdc",
            title: "Congo (RDC)",
            short: "Congo (RDC)",
            icon: "🇨🇩",
            kind: "civil",
            intro: "La République démocratique du Congo est indépendante de la Belgique depuis 1960. Ses fêtes civiles rappellent les martyrs de l'indépendance, ses héros nationaux et ses libérations.",
            months: CIVIL_MONTHS,
            events: [
                { id: "nouvelan", name: "Nouvel An", icon: "🎆", months: [1], when: "1er janvier", explain: "Un jour férié, avec des messes et des rassemblements en famille." },
                { id: "martyrs", name: "Journée des martyrs de l'indépendance", icon: "🕯️", months: [1], when: "4 janvier", explain: "Elle rappelle les émeutes de Léopoldville (Kinshasa) du 4 janvier 1959, réprimées par l'administration coloniale belge : elles précipitent l'indépendance." },
                { id: "heros", name: "Journée des héros nationaux", icon: "🌹", months: [1], when: "16 et 17 janvier", explain: "Elle honore Patrice Lumumba, Premier ministre assassiné le 17 janvier 1961, et Laurent-Désiré Kabila, assassiné le 16 janvier 2001." },
                { id: "femme", name: "Journée de la femme", icon: "👩", months: [3], when: "8 mars", explain: "Une journée de reconnaissance des femmes, avec des défilés et des discours, dans un pays où elles jouent un grand rôle dans l'économie." },
                { id: "kimbangu", name: "Fête du 6 avril (Église kimbanguiste)", icon: "⛪", months: [4], when: "6 avril", explain: "Les kimbanguistes, fidèles d'une Église née au Congo, commémorent la première guérison attribuée à Simon Kimbangu, à Nkamba, le 6 avril 1921." },
                { id: "travail", name: "Fête du Travail", icon: "🌷", months: [5], when: "1er mai", explain: "Un jour férié, avec des défilés de syndicats." },
                { id: "liberation", name: "Journée de la libération", icon: "✊", months: [5], when: "17 mai", explain: "Elle rappelle l'entrée à Kinshasa des troupes de Laurent-Désiré Kabila, le 17 mai 1997, qui chassent le maréchal Mobutu." },
                { id: "enfant", name: "Journée de l'enfant africain", icon: "🧒", months: [6], when: "16 juin", explain: "Elle rappelle les écoliers tués à Soweto en 1976 et célèbre les droits des enfants du continent." },
                { id: "independance", name: "Fête de l'Indépendance", icon: "🇨🇩", months: [6], when: "30 juin", explain: "En 1960, le Congo devient indépendant de la Belgique ; Lumumba prononce un discours célèbre contre la colonisation." },
                { id: "musique", name: "Fête de la musique", icon: "🎶", months: [6], when: "21 juin", explain: "Dans la ville de la rumba congolaise, des concerts éclatent dans les rues de Kinshasa. La rumba congolaise est inscrite au patrimoine de l'UNESCO depuis 2021." },
                { id: "parents", name: "Fête des parents", icon: "👪", months: [8], when: "1er août", explain: "Un jour férié consacré aux parents, propre au Congo : on leur offre des cadeaux et l'on se réunit en famille." },
                { id: "noel", name: "Noël", icon: "🎄", months: [12], when: "25 décembre", explain: "Un jour férié, marqué par la messe et le repas en famille." }
            ]
        },
        {
            id: "egypte",
            title: "Égypte",
            short: "Égypte",
            icon: "🇪🇬",
            kind: "civil",
            intro: "Le calendrier égyptien superpose plusieurs systèmes : le calendrier grégorien pour l'État, le calendrier copte (hérité de l'Égypte pharaonique) et le calendrier musulman. Les grandes fêtes musulmanes, dont l'Aïd, dépendent de la Lune et ne peuvent pas se ranger dans un mois civil fixe : elles ne figurent pas ici.",
            months: CIVIL_MONTHS,
            events: [
                { id: "noelcopte", name: "Noël copte", icon: "🎄", months: [1], when: "7 janvier", explain: "Les chrétiens d'Égypte (les coptes) fêtent Noël le 7 janvier, car leur calendrier suit le calendrier julien. C'est un jour férié pour tout le pays." },
                { id: "revolution25", name: "Révolution du 25 janvier", icon: "✊", months: [1], when: "25 janvier", explain: "Elle rappelle le soulèvement de 2011 place Tahrir, au Caire, qui a renversé le président Hosni Moubarak. C'est aussi la fête de la police." },
                { id: "sinai", name: "Libération du Sinaï", icon: "🏜️", months: [4], when: "25 avril", explain: "Elle rappelle la restitution complète du Sinaï à l'Égypte par Israël, en 1982, après les accords de paix de Camp David." },
                { id: "shamennessim", name: "Sham el-Nessim", icon: "🥚", months: [4, 5], when: "Lendemain de Pâques copte (fête mobile)", explain: "Une fête de printemps dont l'origine remonte, dit-on, à l'Égypte pharaonique, commune aux musulmans et aux chrétiens : on pique-nique en famille et on mange du poisson salé et des œufs colorés." },
                { id: "travail", name: "Fête du Travail", icon: "🌷", months: [5], when: "1er mai", explain: "Un jour férié, avec des discours officiels." },
                { id: "juin30", name: "Révolution du 30 juin", icon: "📣", months: [6], when: "30 juin", explain: "Elle rappelle les manifestations de 2013 qui ont précédé la destitution du président Mohamed Morsi." },
                { id: "juillet23", name: "Révolution du 23 juillet", icon: "🎖️", months: [7], when: "23 juillet", explain: "En 1952, des officiers menés par Nasser et Naguib renversent le roi Farouk et mettent fin à la monarchie." },
                { id: "wafaa", name: "Fête de la crue du Nil", local: "Wafaa el-Nil", icon: "🌊", months: [8], when: "15 ou 16 août", explain: "Une fête très ancienne, héritée des Pharaons, qui célèbre la crue annuelle du Nil, source de la fertilité de l'Égypte." },
                { id: "nayrouz", name: "Nouvel An copte", local: "Nayrouz", icon: "🍇", months: [9], when: "11 septembre", explain: "Le début de l'année copte, qui compte les années depuis l'an 284 apr. J.-C., début du règne de Dioclétien, grand persécuteur des chrétiens." },
                { id: "armee", name: "Fête des forces armées", icon: "✈️", months: [10], when: "6 octobre", explain: "Elle rappelle le franchissement du canal de Suez par l'armée égyptienne en 1973, au début de la guerre d'Octobre contre Israël." },
                { id: "portsaid", name: "Fête de la Victoire", local: "Victory Day", icon: "🏆", months: [12], when: "23 décembre", explain: "À Port-Saïd, elle rappelle la résistance à l'attaque franco-britannique et israélienne de 1956, lors de la crise de Suez." }
            ]
        },
        {
            id: "inde",
            title: "Inde",
            short: "Inde",
            icon: "🇮🇳",
            kind: "civil",
            intro: "L'Inde compte plus de fêtes que presque tout autre pays, parce que chaque religion et chaque région a les siennes. Beaucoup d'entre elles suivent le calendrier lunaire hindou : leur date varie dans le calendrier grégorien.",
            months: CIVIL_MONTHS,
            events: [
                { id: "pongal", name: "Pongal", icon: "🍚", months: [1], when: "14 au 17 janvier", explain: "La fête de la récolte du Tamil Nadu : on fait bouillir du lait et du riz jusqu'à ce qu'il déborde, en remerciement au Soleil." },
                { id: "republic", name: "Jour de la République", local: "Republic Day", icon: "🇮🇳", months: [1], when: "26 janvier", explain: "Il rappelle l'entrée en vigueur de la Constitution, le 26 janvier 1950, qui fait de l'Inde une république. Défilé militaire à New Delhi." },
                { id: "holi", name: "Holi", icon: "🎨", months: [2, 3], when: "Pleine lune de Phalguna (fête mobile)", explain: "La fête des couleurs, qui célèbre le printemps : on se lance de la poudre colorée." },
                { id: "baisakhi", name: "Baisakhi", icon: "🌾", months: [4], when: "13 ou 14 avril", explain: "La fête des récoltes du Pendjab, et le jour où le gourou Gobind Singh a fondé la communauté sikhe des Khalsa, en 1699." },
                { id: "ambedkar", name: "Anniversaire d'Ambedkar", local: "Ambedkar Jayanti", icon: "🔵", months: [4], when: "14 avril", explain: "Il honore Bhimrao Ambedkar (né en 1891), principal auteur de la Constitution et défenseur des « intouchables »." },
                { id: "independence", name: "Fête de l'Indépendance", local: "Independence Day", icon: "🪁", months: [8], when: "15 août", explain: "En 1947, l'Inde devient indépendante du Royaume-Uni. Le Premier ministre hisse le drapeau au Fort Rouge, à Delhi, et l'on fait voler des cerfs-volants." },
                { id: "ganesh", name: "Ganesh Chaturthi", icon: "🐘", months: [8, 9], when: "Fin août - septembre (fête mobile)", explain: "La fête du dieu à tête d'éléphant, très suivie à Mumbai : on immerge ses statues dans la mer." },
                { id: "teachers", name: "Fête des enseignants", local: "Teachers' Day", icon: "📖", months: [9], when: "5 septembre", explain: "Elle honore le philosophe et président Sarvepalli Radhakrishnan, né en 1888 ; les élèves offrent des fleurs à leurs maîtres." },
                { id: "dussehra", name: "Dussehra", icon: "🔥", months: [9, 10], when: "Fin septembre - octobre (fête mobile)", explain: "La victoire de Rama sur le démon Ravana : on brûle de grandes effigies de Ravana." },
                { id: "gandhi", name: "Anniversaire de Gandhi", local: "Gandhi Jayanti", icon: "🕊️", months: [10], when: "2 octobre", explain: "Le jour de naissance du Mahatma Gandhi (1869), proclamé aussi Journée internationale de la non-violence par l'ONU." },
                { id: "diwali", name: "Diwali", icon: "🪔", months: [10, 11], when: "Mi-octobre - mi-novembre (fête mobile)", explain: "La fête des lumières : on allume des lampes, on tire des feux d'artifice et l'on fait des cadeaux." },
                { id: "children", name: "Journée des enfants", local: "Children's Day", icon: "🧒", months: [11], when: "14 novembre", explain: "Elle honore Jawaharlal Nehru, premier Premier ministre de l'Inde, né en 1889 et surnommé « chacha » (oncle) par les enfants." },
                { id: "christmas", name: "Noël", local: "Christmas", icon: "🎄", months: [12], when: "25 décembre", explain: "Un jour férié pour tout le pays, même si les chrétiens y sont une minorité : à Goa et au Kerala, on le fête avec éclat." }
            ]
        },
        {
            id: "indonesie",
            title: "Indonésie",
            short: "Indonésie",
            icon: "🇮🇩",
            kind: "civil",
            intro: "L'Indonésie, plus grand pays musulman du monde, reconnaît officiellement six religions et leurs fêtes. Elle compte aussi des fêtes nationales liées à l'indépendance, acquise en 1945.",
            months: CIVIL_MONTHS,
            events: [
                { id: "tahunbaru", name: "Nouvel An", local: "Tahun Baru", icon: "🎆", months: [1], when: "1er janvier", explain: "Un jour férié, avec des feux d'artifice et des concerts." },
                { id: "imlek", name: "Nouvel An chinois", local: "Imlek", icon: "🏮", months: [1, 2], when: "Nouvel An lunaire (fête mobile)", explain: "Il est devenu jour férié en 2003, après avoir été interdit sous le régime de Suharto : lanternes rouges, danses du lion." },
                { id: "nyepi", name: "Nyepi", local: "Nyepi", icon: "🤫", months: [3], when: "Nouvel An balinais (mars)", explain: "Le « Jour du silence » à Bali : pendant 24 heures, on ne sort pas, on n'allume pas de lumière, et même l'aéroport ferme." },
                { id: "kartini", name: "Jour de Kartini", local: "Hari Kartini", icon: "👩", months: [4], when: "21 avril", explain: "Il honore Raden Ajeng Kartini (née en 1879), pionnière de l'éducation des femmes, dont les lettres ont été publiées à titre posthume." },
                { id: "waisak", name: "Waisak", local: "Waisak", icon: "🪷", months: [5, 6], when: "Pleine lune de mai (fête mobile)", explain: "La fête du Bouddha : des milliers de fidèles font une procession jusqu'au temple de Borobudur, à Java, et lâchent des lanternes." },
                { id: "pancasila", name: "Jour de la Pancasila", local: "Hari Lahir Pancasila", icon: "🦅", months: [6], when: "1er juin", explain: "Il rappelle le discours de Soekarno, en 1945, sur les cinq principes (Pancasila) qui fondent l'État indonésien, dont la croyance en un dieu unique et l'unité nationale." },
                { id: "kemerdekaan", name: "Fête de l'Indépendance", local: "Hari Kemerdekaan", icon: "🇮🇩", months: [8], when: "17 août", explain: "En 1945, Soekarno proclame l'indépendance face aux Pays-Bas. On y organise des jeux de village, comme la grimpée de mât graissé." },
                { id: "sumpahpemuda", name: "Serment de la jeunesse", local: "Sumpah Pemuda", icon: "📣", months: [10], when: "28 octobre", explain: "En 1928, des jeunes de tout l'archipel jurent une seule patrie, un seul peuple et une seule langue, l'indonésien." },
                { id: "batik", name: "Journée du batik", local: "Hari Batik", icon: "👘", months: [10], when: "2 octobre", explain: "Le batik, tissu teint à la cire, a été inscrit par l'UNESCO en 2009 : on porte ce jour-là un vêtement de batik." },
                { id: "pahlawan", name: "Jour des héros", local: "Hari Pahlawan", icon: "⚔️", months: [11], when: "10 novembre", explain: "Il rappelle la bataille de Surabaya, en 1945, où des Indonésiens résistent au retour des forces britanniques et néerlandaises." },
                { id: "hariibu", name: "Fête des mères", local: "Hari Ibu", icon: "💐", months: [12], when: "22 décembre", explain: "Elle rappelle le premier congrès des femmes indonésiennes, en 1928." },
                { id: "natal", name: "Noël", local: "Natal", icon: "🎄", months: [12], when: "25 décembre", explain: "Un jour férié, même si les chrétiens sont une minorité : on le fête surtout dans les régions à forte population chrétienne, comme le nord de Sulawesi." }
            ]
        },
        {
            id: "mexique",
            title: "Mexique",
            short: "Mexique",
            icon: "🇲🇽",
            kind: "civil",
            intro: "Le Mexique mêle traditions catholiques et héritage précolombien, comme la fête des morts. Plusieurs fériés sont reportés au lundi le plus proche pour faire un week-end de trois jours.",
            months: CIVIL_MONTHS,
            events: [
                { id: "reyes", name: "Rois mages", local: "Día de Reyes", icon: "👑", months: [1], when: "6 janvier", explain: "On mange la « rosca de reyes », un gâteau où se cache une petite figurine : celui qui la trouve doit offrir les tamales le 2 février." },
                { id: "candelaria", name: "Chandeleur", local: "Día de la Candelaria", icon: "🕯️", months: [2], when: "2 février", explain: "Celui qui a trouvé la figurine dans la rosca offre des tamales à ses invités." },
                { id: "constitucion", name: "Jour de la Constitution", local: "Día de la Constitución", icon: "📜", months: [2], when: "5 février (1er lundi de février)", explain: "Il rappelle la Constitution de 1917, née de la Révolution mexicaine." },
                { id: "juarez", name: "Anniversaire de Benito Juárez", local: "Natalicio de Benito Juárez", icon: "🏛️", months: [3], when: "21 mars (3e lundi de mars)", explain: "Il honore Benito Juárez, président d'origine indigène, né en 1806, qui a résisté à l'intervention française et à l'empereur Maximilien." },
                { id: "semanasanta", name: "Semaine sainte", local: "Semana Santa", icon: "✝️", months: [3, 4], when: "Semaine avant Pâques (fête mobile)", explain: "Des processions et des représentations vivantes de la Passion, comme celle d'Iztapalapa à Mexico." },
                { id: "cincomayo", name: "Cinq de Mai", local: "Cinco de Mayo", icon: "🇲🇽", months: [5], when: "5 mai", explain: "Elle rappelle la victoire de l'armée mexicaine sur les troupes françaises de Napoléon III à Puebla, en 1862. Elle est plus fêtée aux États-Unis qu'au Mexique." },
                { id: "madres", name: "Fête des mères", local: "Día de las Madres", icon: "💐", months: [5], when: "10 mai", explain: "À date fixe, quel que soit le jour de la semaine : un jour très important, avec des mariachis qui jouent des sérénades aux mères." },
                { id: "independencia", name: "Fête de l'Indépendance", local: "Día de la Independencia", icon: "🔔", months: [9], when: "15 et 16 septembre", explain: "Le soir du 15, le président sonne la cloche et lance le « Grito » depuis le palais de Mexico, comme le curé Hidalgo à Dolores en 1810." },
                { id: "muertos", name: "Jour des morts", local: "Día de Muertos", icon: "💀", months: [11], when: "1er et 2 novembre", explain: "On dresse des autels (ofrendas) avec des fleurs de cempasúchil, des photos et des mets pour accueillir les âmes des défunts. Classé par l'UNESCO en 2008." },
                { id: "revolucion", name: "Jour de la Révolution", local: "Día de la Revolución", icon: "✊", months: [11], when: "20 novembre (3e lundi de novembre)", explain: "Il rappelle le début de la Révolution mexicaine, en 1910, contre la dictature de Porfirio Díaz." },
                { id: "guadalupe", name: "Vierge de Guadalupe", local: "Día de la Virgen de Guadalupe", icon: "🌹", months: [12], when: "12 décembre", explain: "La sainte patronne du Mexique : des millions de pèlerins se rendent à sa basilique de Mexico." },
                { id: "posadas", name: "Les Posadas", local: "Las Posadas", icon: "🏠", months: [12], when: "16 au 24 décembre", explain: "Neuf soirées de processions qui rejouent la recherche d'un logis par Marie et Joseph : on chante, on casse des piñatas." },
                { id: "navidad", name: "Noël", local: "Navidad", icon: "🎄", months: [12], when: "25 décembre", explain: "On fête surtout la veille, la Nochebuena, avec un grand repas en famille." }
            ]
        },
        {
            id: "nigeria",
            title: "Nigéria",
            short: "Nigéria",
            icon: "🇳🇬",
            kind: "civil",
            intro: "Le Nigéria est le pays le plus peuplé d'Afrique, partagé entre le nord (majoritairement musulman) et le sud (majoritairement chrétien). Les fêtes musulmanes, qui suivent la Lune, ne figurent pas ici car elles ne se rangent pas dans un mois civil fixe.",
            months: CIVIL_MONTHS,
            events: [
                { id: "newyear", name: "Jour de l'An", local: "New Year's Day", icon: "🎆", months: [1], when: "1er janvier", explain: "Un jour férié, avec des offices religieux et des fêtes." },
                { id: "armedforces", name: "Journée du souvenir des forces armées", local: "Armed Forces Remembrance Day", icon: "🌺", months: [1], when: "15 janvier", explain: "Elle rappelle la fin de la guerre du Biafra, le 15 janvier 1970, et les soldats morts à la guerre. On porte un coquelicot." },
                { id: "argungu", name: "Festival de pêche d'Argungu", local: "Argungu Fishing Festival", icon: "🎣", months: [2, 3], when: "Fin février - mars (fête mobile)", explain: "À Argungu, dans le nord, des milliers de pêcheurs plongent à la main dans la rivière pour attraper le plus gros poisson." },
                { id: "goodfriday", name: "Vendredi saint", local: "Good Friday", icon: "✝️", months: [3, 4], when: "Vendredi avant Pâques (fête mobile)", explain: "Un jour férié national, d'origine chrétienne." },
                { id: "workers", name: "Fête du Travail", local: "Workers' Day", icon: "🌷", months: [5], when: "1er mai", explain: "Un jour férié, avec des défilés de syndicats." },
                { id: "children", name: "Journée des enfants", local: "Children's Day", icon: "🧒", months: [5], when: "27 mai", explain: "Une journée où les enfants défilent en uniforme d'école, souvent devant le gouverneur de leur État." },
                { id: "democracy", name: "Jour de la Démocratie", local: "Democracy Day", icon: "🗳️", months: [6], when: "12 juin", explain: "Il rappelle l'élection présidentielle du 12 juin 1993, la plus libre du pays, annulée par l'armée. Il est férié depuis 2019." },
                { id: "osun", name: "Festival d'Osun-Osogbo", local: "Osun-Osogbo Festival", icon: "🌊", months: [8], when: "Août", explain: "Un pèlerinage vers la déesse de la rivière, Osun, dans un bois sacré classé par l'UNESCO en 2005, à Osogbo." },
                { id: "newyam", name: "Fête de la nouvelle igname", local: "New Yam Festival", icon: "🍠", months: [8, 9], when: "Août - septembre (fête mobile)", explain: "Chez les Igbo, on remercie les dieux et les ancêtres avant de manger l'igname de la nouvelle récolte." },
                { id: "independence", name: "Fête de l'Indépendance", local: "Independence Day", icon: "🇳🇬", months: [10], when: "1er octobre", explain: "En 1960, le Nigéria devient indépendant du Royaume-Uni." },
                { id: "calabar", name: "Carnaval de Calabar", local: "Calabar Carnival", icon: "🎭", months: [12], when: "Tout le mois de décembre", explain: "Surnommé « la plus grande fête de rue d'Afrique » : défilés de groupes costumés, de chars et de musique tout au long du mois." },
                { id: "christmas", name: "Noël", local: "Christmas Day", icon: "🎄", months: [12], when: "25 décembre", explain: "Un jour férié : beaucoup de citadins retournent dans leur village d'origine." },
                { id: "boxing", name: "Lendemain de Noël", local: "Boxing Day", icon: "🎁", months: [12], when: "26 décembre", explain: "Le lendemain de Noël, un second jour férié." }
            ]
        },
        {
            id: "russie",
            title: "Russie",
            short: "Russie",
            icon: "🇷🇺",
            kind: "civil",
            intro: "L'Église orthodoxe russe suit encore le calendrier julien, qui retarde de 13 jours sur le nôtre : Noël y tombe le 7 janvier, et Pâques est calculée autrement. La Russie a adopté le calendrier grégorien pour la vie civile en 1918.",
            months: CIVIL_MONTHS,
            events: [
                { id: "novygod", name: "Nouvel An", local: "Novy god", icon: "🎆", months: [1], when: "1er janvier", explain: "La plus grande fête de l'année : un sapin, des cadeaux apportés par Grand-Père Gel (Ded Moroz) et sa petite-fille Snegourotchka." },
                { id: "rozhdestvo", name: "Noël orthodoxe", local: "Rozhdestvo", icon: "🎄", months: [1], when: "7 janvier", explain: "Il tombe le 7 janvier, car l'Église orthodoxe suit le calendrier julien (le 25 décembre julien)." },
                { id: "starynovygod", name: "Ancien Nouvel An", local: "Staryï Novyï god", icon: "📅", months: [1], when: "14 janvier", explain: "Le Nouvel An selon le calendrier julien, 13 jours après le nôtre : une seconde occasion de faire la fête." },
                { id: "defender", name: "Défenseur de la patrie", local: "Den zashchitnika Otechestva", icon: "🪖", months: [2], when: "23 février", explain: "Un jour férié consacré aux hommes, qui sont censés être tous des défenseurs : on leur offre des cadeaux." },
                { id: "maslenitsa", name: "Maslenitsa", local: "Maslenitsa", icon: "🥞", months: [2, 3], when: "Semaine avant le Carême orthodoxe (fête mobile)", explain: "Une semaine où l'on mange des blinis, ronds comme le soleil, avant le Carême, et où l'on brûle un mannequin d'hiver." },
                { id: "women", name: "Journée des femmes", local: "Mezhdunarodny zhenski den", icon: "🌷", months: [3], when: "8 mars", explain: "Un jour férié où l'on offre des fleurs, surtout des mimosas, aux femmes." },
                { id: "cosmonautics", name: "Jour de la cosmonautique", local: "Den kosmonavtiki", icon: "🚀", months: [4], when: "12 avril", explain: "Il rappelle le vol de Iouri Gagarine, premier homme dans l'espace, le 12 avril 1961." },
                { id: "paskha", name: "Pâques orthodoxe", local: "Paskha", icon: "🥚", months: [4, 5], when: "Fête mobile (calendrier julien)", explain: "La plus grande fête religieuse : on fait bénir des gâteaux (koulitch) et des œufs peints en rouge." },
                { id: "victory", name: "Jour de la Victoire", local: "Den Pobedy", icon: "🎖️", months: [5], when: "9 mai", explain: "Il rappelle la capitulation de l'Allemagne nazie, signée dans la nuit du 8 au 9 mai 1945 (heure de Moscou) : défilé sur la place Rouge." },
                { id: "russiaday", name: "Jour de la Russie", local: "Den Rossii", icon: "🇷🇺", months: [6], when: "12 juin", explain: "Il rappelle la déclaration de souveraineté de la Russie, en 1990, avant la fin de l'URSS." },
                { id: "kupala", name: "Ivan Kupala", local: "Ivan Kupala", icon: "🔥", months: [7], when: "7 juillet", explain: "Une fête d'été ancienne, devenue celle de saint Jean-Baptiste : on saute par-dessus des feux et on tisse des couronnes de fleurs." },
                { id: "knowledge", name: "Jour du Savoir", local: "Den znaniy", icon: "📚", months: [9], when: "1er septembre", explain: "Le premier jour de l'année scolaire : les élèves offrent des fleurs à leurs maîtres." },
                { id: "unity", name: "Jour de l'Unité nationale", local: "Den narodnogo edinstva", icon: "🤝", months: [11], when: "4 novembre", explain: "Il rappelle la libération de Moscou des troupes polonaises, en 1612. Il a remplacé en 2005 l'ancienne fête de la révolution d'Octobre." }
            ]
        },
        {
            id: "suisse",
            title: "Suisse",
            short: "Suisse",
            icon: "🇨🇭",
            kind: "civil",
            intro: "En Suisse, chaque canton (il y en a 26) fixe en partie ses jours fériés : seule la fête nationale du 1er août est fériée dans tout le pays. Beaucoup de fêtes locales y sont donc célèbres, comme le carnaval de Bâle.",
            months: CIVIL_MONTHS,
            events: [
                { id: "berchtold", name: "Saint-Berchtold", local: "Berchtoldstag", icon: "🥂", months: [1], when: "2 janvier", explain: "Un jour férié dans plusieurs cantons alémaniques, le lendemain du Nouvel An." },
                { id: "fasnacht", name: "Carnaval de Bâle", local: "Basler Fasnacht", icon: "🎭", months: [2, 3], when: "Lundi après le Mercredi des Cendres (fête mobile)", explain: "Il commence à 4 heures du matin (Morgestraich), dans le noir, avec des lanternes et des fifres : classé au patrimoine immatériel de l'UNESCO." },
                { id: "karfreitag", name: "Vendredi saint", local: "Karfreitag", icon: "✝️", months: [3, 4], when: "Vendredi avant Pâques (fête mobile)", explain: "Un jour férié dans presque tous les cantons." },
                { id: "sechselaeuten", name: "Sechseläuten", local: "Sechseläuten", icon: "🔥", months: [4], when: "3e lundi d'avril", explain: "À Zurich, on brûle un bonhomme de neige en ouate, le Böögg : plus il explose vite, plus l'été sera beau." },
                { id: "auffahrt", name: "Ascension", local: "Auffahrt", icon: "☁️", months: [5, 6], when: "Jeudi, 40 jours après Pâques (fête mobile)", explain: "Un jour férié dans tout le pays, souvent prolongé en pont jusqu'au dimanche." },
                { id: "nationalday", name: "Fête nationale", local: "Bundesfeier", icon: "🇨🇭", months: [8], when: "1er août", explain: "Elle rappelle le pacte des trois cantons fondateurs, daté de 1291. Feux de joie, lampions et feux d'artifice." },
                { id: "bettag", name: "Jeûne fédéral", local: "Eidgenössischer Bettag", icon: "🕊️", months: [9], when: "3e dimanche de septembre", explain: "Une journée de prière, de recueillement et de réflexion, que toutes les confessions peuvent célébrer ; le lundi suivant est férié dans plusieurs cantons." },
                { id: "desalpe", name: "Désalpe", local: "Alpabzug", icon: "🐄", months: [9, 10], when: "Fin septembre - octobre (fête mobile)", explain: "Les vaches reviennent des alpages vers la plaine, parées de fleurs et de grandes cloches." },
                { id: "zibelemaerit", name: "Marché à l'oignon", local: "Zibelemärit", icon: "🧅", months: [11], when: "4e lundi de novembre", explain: "À Berne, un grand marché d'oignons tressés, et une bataille de confettis." },
                { id: "escalade", name: "Escalade", local: "Escalade", icon: "⚔️", months: [12], when: "11 et 12 décembre", explain: "À Genève, elle rappelle la nuit du 12 décembre 1602, quand les habitants repoussent une attaque des troupes du duc de Savoie. On casse une marmite en chocolat." },
                { id: "weihnachten", name: "Noël", local: "Weihnachten", icon: "🎄", months: [12], when: "25 décembre", explain: "Un jour férié dans toute la Suisse." }
            ]
        },
        {
            id: "turquie",
            title: "Turquie",
            short: "Turquie",
            icon: "🇹🇷",
            kind: "civil",
            intro: "La Turquie est une république laïque depuis 1923. Beaucoup de ses fêtes civiles honorent Mustafa Kemal Atatürk, son fondateur. Les grandes fêtes musulmanes (Ramazan Bayramı, Kurban Bayramı) suivent la Lune et ne figurent pas ici.",
            months: CIVIL_MONTHS,
            events: [
                { id: "yilbasi", name: "Nouvel An", local: "Yılbaşı", icon: "🎆", months: [1], when: "1er janvier", explain: "Un jour férié, avec des arbres de Noël, des feux d'artifice et la loterie nationale." },
                { id: "canakkale", name: "Victoire de Çanakkale", local: "Çanakkale Zaferi", icon: "⚔️", months: [3], when: "18 mars", explain: "Elle rappelle la victoire ottomane aux Dardanelles, en 1915, contre la flotte alliée. C'est la fameuse bataille de Gallipoli." },
                { id: "nevruz", name: "Nevruz", local: "Nevruz", icon: "🌞", months: [3], when: "21 mars", explain: "La fête du printemps, héritée de l'Iran ancien, célébrée aussi par les Kurdes : on saute par-dessus de grands feux." },
                { id: "cocuk", name: "Fête de la souveraineté nationale et de l'enfance", local: "Ulusal Egemenlik ve Çocuk Bayramı", icon: "🧒", months: [4], when: "23 avril", explain: "Elle rappelle l'ouverture de la Grande Assemblée nationale, en 1920. Atatürk a offert cette fête aux enfants : ils « dirigent » le pays pendant un jour." },
                { id: "emek", name: "Fête du Travail", local: "Emek ve Dayanışma Günü", icon: "🌷", months: [5], when: "1er mai", explain: "Un jour férié, avec des manifestations syndicales." },
                { id: "hidirellez", name: "Hıdırellez", local: "Hıdırellez", icon: "🌹", months: [5], when: "5 et 6 mai", explain: "La fête du printemps, nuit où l'on formule des vœux en nouant des chiffons à un rosier. Elle est inscrite à l'UNESCO." },
                { id: "gencik", name: "Jour de la jeunesse", local: "Atatürk'ü Anma, Gençlik ve Spor Bayramı", icon: "🏃", months: [5], when: "19 mai", explain: "Il rappelle le débarquement d'Atatürk à Samsun, le 19 mai 1919, début de la guerre d'indépendance turque : des défilés sportifs ont lieu dans les stades." },
                { id: "kirkpinar", name: "Lutte à l'huile de Kırkpınar", local: "Kırkpınar", icon: "🤼", months: [6, 7], when: "Fin juin - début juillet (à cheval sur deux mois)", explain: "À Edirne, des lutteurs enduits d'huile d'olive s'affrontent : c'est l'une des plus anciennes compétitions sportives encore organisées, depuis 1362 selon la tradition." },
                { id: "demokrasi", name: "Jour de la démocratie", local: "Demokrasi ve Milli Birlik Günü", icon: "🕯️", months: [7], when: "15 juillet", explain: "Il rappelle la tentative de coup d'État du 15 juillet 2016, déjouée par la population et les forces loyalistes." },
                { id: "zafer", name: "Fête de la Victoire", local: "Zafer Bayramı", icon: "🏅", months: [8], when: "30 août", explain: "Elle rappelle la victoire de Dumlupınar, en 1922, décisive dans la guerre d'indépendance contre la Grèce." },
                { id: "cumhuriyet", name: "Fête de la République", local: "Cumhuriyet Bayramı", icon: "🇹🇷", months: [10], when: "29 octobre", explain: "En 1923, Atatürk proclame la République, après la chute de l'Empire ottoman." },
                { id: "ataturk", name: "Commémoration d'Atatürk", local: "Atatürk'ü Anma Günü", icon: "🖤", months: [11], when: "10 novembre", explain: "Atatürk est mort le 10 novembre 1938, à 9 h 05 : à cette minute, tout le pays s'arrête et des sirènes retentissent." },
                { id: "mevlana", name: "Cérémonie de Mevlana", local: "Şeb-i Arus", icon: "🌀", months: [12], when: "7 au 17 décembre", explain: "À Konya, des derviches tourneurs dansent pour commémorer la mort du poète mystique Rûmî, en 1273." }
            ]
        },
        {
            id: "vietnam",
            title: "Vietnam",
            short: "Vietnam",
            icon: "🇻🇳",
            kind: "civil",
            intro: "Le Vietnam suit le calendrier grégorien pour la vie civile, mais ses grandes fêtes traditionnelles, dont le Têt, suivent le calendrier lunaire : elles sont mobiles et acceptent deux mois.",
            months: CIVIL_MONTHS,
            events: [
                { id: "tet", name: "Nouvel An lunaire", local: "Tết Nguyên Đán", icon: "🧧", months: [1, 2], when: "Nouvel An lunaire (fête mobile)", explain: "La plus grande fête du pays : on retourne dans sa famille, on prépare le bánh chưng (gâteau de riz gluant) et l'on offre des enveloppes rouges (lì xì)." },
                { id: "party", name: "Fondation du Parti communiste", local: "Ngày thành lập Đảng", icon: "🚩", months: [2], when: "3 février", explain: "Elle rappelle la création du Parti communiste vietnamien par Hô Chi Minh, en 1930." },
                { id: "hung", name: "Commémoration des rois Hùng", local: "Giỗ Tổ Hùng Vương", icon: "🏯", months: [3, 4], when: "10e jour du 3e mois lunaire (fête mobile)", explain: "On rend hommage aux rois Hùng, fondateurs légendaires du premier État vietnamien, avec des offrandes au temple de Phú Thọ." },
                { id: "reunification", name: "Jour de la Réunification", local: "Ngày Thống nhất", icon: "🕊️", months: [4], when: "30 avril", explain: "Il rappelle la chute de Saïgon, le 30 avril 1975, qui met fin à la guerre du Vietnam et réunifie le pays." },
                { id: "labour", name: "Fête du Travail", local: "Quốc tế Lao động", icon: "🌷", months: [5], when: "1er mai", explain: "Un jour férié, qui suit de près le 30 avril : un long week-end." },
                { id: "children", name: "Fête des enfants", local: "Quốc tế Thiếu nhi", icon: "🎈", months: [6], when: "1er juin", explain: "On offre des cadeaux aux enfants, avec des spectacles et des jeux." },
                { id: "vulan", name: "Fête Vu Lan", local: "Vu Lan", icon: "🏮", months: [8, 9], when: "15e jour du 7e mois lunaire (fête mobile)", explain: "Une fête bouddhiste des parents : on porte une rose rouge si l'on a encore ses parents, une rose blanche si l'on les a perdus." },
                { id: "national", name: "Fête nationale", local: "Quốc khánh", icon: "🇻🇳", months: [9], when: "2 septembre", explain: "En 1945, Hô Chi Minh proclame l'indépendance du Vietnam, place Ba Đình, à Hanoï." },
                { id: "midautumn", name: "Fête de la mi-automne", local: "Tết Trung Thu", icon: "🥮", months: [9, 10], when: "15e jour du 8e mois lunaire (fête mobile)", explain: "La fête des enfants à la pleine lune : lanternes en forme d'étoile, danses du lion et gâteaux de lune." },
                { id: "women", name: "Journée des femmes vietnamiennes", local: "Ngày Phụ nữ Việt Nam", icon: "🌸", months: [10], when: "20 octobre", explain: "Elle honore les femmes, avec des fleurs et des cadeaux : elle rappelle la fondation de l'Union des femmes en 1930." },
                { id: "teachers", name: "Fête des enseignants", local: "Ngày Nhà giáo Việt Nam", icon: "📚", months: [11], when: "20 novembre", explain: "Les élèves et leurs parents offrent des fleurs aux enseignants." },
                { id: "army", name: "Fête de l'armée", local: "Ngày Quân đội nhân dân", icon: "🎖️", months: [12], when: "22 décembre", explain: "Elle rappelle la création de l'armée populaire vietnamienne, en 1944." },
                { id: "noel", name: "Noël", local: "Giáng sinh", icon: "🎄", months: [12], when: "25 décembre", explain: "Pas férié, mais très fêté dans les villes, avec des décorations et des sapins devant les cathédrales." }
            ]
        }
    ];

    // 3 étoiles au maximum, comme au Chemin. Une erreur = une fête posée dans un mauvais mois : la fête revient
    // dans la liste, et la bonne réponse n'est jamais donnée.
    var MAX_STARS = 3;
    var STAR_ERRORS = [1, 4];

    var KINDS = ['religieux', 'civil'];

    // Les calendriers d'une famille, par ordre alphabétique du nom affiché (« Égypte » se range à E).
    function byKind(kind) {
        return CALENDARS.filter(function (c) { return c.kind === kind; })
            .sort(function (a, b) { return a.short.localeCompare(b.short, 'fr'); });
    }

    function find(id) {
        for (var i = 0; i < CALENDARS.length; i++) if (CALENDARS[i].id === id) return CALENDARS[i];
        return null;
    }

    function findEvent(calendar, eventId) {
        for (var i = 0; i < calendar.events.length; i++) if (calendar.events[i].id === eventId) return calendar.events[i];
        return null;
    }

    // `month` : numéro du mois de la part (1 à 12).
    function accepts(event, month) {
        return event.months.indexOf(month) !== -1;
    }

    // 3 étoiles jusqu'à 1 erreur, 2 jusqu'à 4, 1 ensuite (toute roue terminée en donne au moins une).
    function starsFor(errors) {
        return errors <= STAR_ERRORS[0] ? 3 : errors <= STAR_ERRORS[1] ? 2 : 1;
    }

    // Mélange de Fisher-Yates ; `rng` (0 ≤ x < 1) est injectable pour les tests. Ne modifie pas `list`.
    function shuffle(list, rng) {
        var random = rng || Math.random;
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(random() * (i + 1));
            var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
        return out;
    }

    // Le tirage d'une partie : l'ordre des fêtes dans la liste du bas. On évite qu'il soit celui du calendrier
    // (ce serait donner la réponse) : si le hasard le rend identique, on décale d'un cran.
    function deal(calendar, rng) {
        var ids = calendar.events.map(function (e) { return e.id; });
        var out = shuffle(ids, rng);
        var sorted = ids.every(function (id, i) { return out[i] === id; });
        if (sorted && out.length > 1) out.push(out.shift());
        return out;
    }

    // Progression : { <calendrier>: { stars, errors } }, le meilleur résultat de chaque roue terminée.
    function normalizeProgress(raw) {
        var out = {};
        if (raw && typeof raw === 'object') {
            CALENDARS.forEach(function (c) {
                var e = raw[c.id];
                if (e && typeof e === 'object' && e.stars >= 1) {
                    out[c.id] = { stars: Math.min(MAX_STARS, Math.floor(e.stars)), errors: Math.max(0, Math.floor(e.errors) || 0) };
                }
            });
        }
        return out;
    }

    // Garde le meilleur : plus d'étoiles, à égalité moins d'erreurs.
    function recordResult(progress, calendarId, errors) {
        var next = normalizeProgress(progress);
        var stars = starsFor(errors);
        var old = next[calendarId];
        if (!old || stars > old.stars || (stars === old.stars && errors < old.errors)) {
            next[calendarId] = { stars: stars, errors: errors };
        }
        return next;
    }

    return {
        CALENDARS: CALENDARS, KINDS: KINDS, MAX_STARS: MAX_STARS, byKind: byKind,
        find: find, findEvent: findEvent, accepts: accepts, starsFor: starsFor,
        shuffle: shuffle, deal: deal, normalizeProgress: normalizeProgress, recordResult: recordResult
    };
}));
