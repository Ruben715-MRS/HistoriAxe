// =========================================================================
// === LA ROUE DES FÊTES — DONNÉES ET RÈGLES (mini-jeu du Monde 0, niveau 4 « Calendriers et fêtes ») ===
// =========================================================================
// Un calendrier = douze mois (les « parts de pizza » de la roue) et des fêtes à ranger dans le bon mois.
// Huit calendriers : chrétien, juif, musulman, puis les jours fériés et fêtes civiles de la France, du
// Royaume-Uni, des États-Unis, de l'Allemagne et de l'Espagne.
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
            short: 'Chrétien',
            icon: '✝️',
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
            short: 'Juif',
            icon: '✡️',
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
            short: 'Musulman',
            icon: '☪️',
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
        }
    ];

    // 3 étoiles au maximum, comme au Chemin. Une erreur = une fête posée dans un mauvais mois : la fête revient
    // dans la liste, et la bonne réponse n'est jamais donnée.
    var MAX_STARS = 3;
    var STAR_ERRORS = [1, 4];

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
        CALENDARS: CALENDARS, MAX_STARS: MAX_STARS,
        find: find, findEvent: findEvent, accepts: accepts, starsFor: starsFor,
        shuffle: shuffle, deal: deal, normalizeProgress: normalizeProgress, recordResult: recordResult
    };
}));
