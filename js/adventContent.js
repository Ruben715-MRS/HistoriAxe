// =========================================================================
// === LE CALENDRIER DE L'AVENT HISTORIQUE — UN FAIT PAR JOUR DE DÉCEMBRE ===
// =========================================================================
// Trente et une cases, une par jour de décembre : chaque case raconte un événement arrivé CE jour-là, quelle que soit l'année, et
// demande en quelle année il a eu lieu. Contenu écrit à la main, en français seulement ; **à relire par un enseignant**.
//
// Format : { day, icon, title, year, explain }. `title` ne donne jamais l'année ; `explain` la dit, et raconte le fait.
// Le jour du mois est celui de l'événement (nouveau style, calendrier grégorien).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.AdventContent = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var DAYS = [
        { day: 1, icon: "🚇", title: "Les deux tunnels sous la Manche se rejoignent", year: 1990, explain: "Le 1er décembre 1990, ouvriers britanniques et français se serrent la main au milieu du tunnel : la jonction est faite. Il ouvrira aux trains en 1994." },
        { day: 2, icon: "👑", title: "Le sacre de Napoléon à Notre-Dame", year: 1804, explain: "Le 2 décembre 1804, Napoléon se couronne lui-même empereur devant le pape Pie VII, venu de Rome." },
        { day: 3, icon: "❤️", title: "La première greffe du cœur", year: 1967, explain: "Le 3 décembre 1967, au Cap, le chirurgien Christiaan Barnard transplante un cœur humain. Le patient survit dix-huit jours." },
        { day: 4, icon: "🎩", title: "La mort du cardinal de Richelieu", year: 1642, explain: "Le 4 décembre 1642 meurt Richelieu, principal ministre de Louis XIII, qui a renforcé l'État royal et fondé l'Académie française en 1635." },
        { day: 5, icon: "🥂", title: "La fin de la Prohibition aux États-Unis", year: 1933, explain: "Le 5 décembre 1933, le 21e amendement met fin à treize ans d'interdiction de l'alcool, qui avait enrichi les gangsters." },
        { day: 6, icon: "🇫🇮", title: "La Finlande proclame son indépendance", year: 1917, explain: "Le 6 décembre 1917, le Parlement finlandais déclare l'indépendance du pays, qui appartenait à l'Empire russe. C'est toujours la fête nationale." },
        { day: 7, icon: "✈️", title: "L'attaque de Pearl Harbor", year: 1941, explain: "Le 7 décembre 1941, l'aviation japonaise attaque par surprise la flotte américaine à Hawaï. Les États-Unis entrent en guerre." },
        { day: 8, icon: "🎸", title: "L'assassinat de John Lennon", year: 1980, explain: "Le 8 décembre 1980, l'ancien Beatle est tué devant son immeuble à New York, à 40 ans." },
        { day: 9, icon: "⛪", title: "La loi de séparation des Églises et de l'État", year: 1905, explain: "Promulguée le 9 décembre 1905, elle garantit la liberté de conscience et met fin au financement public des cultes : c'est la base de la laïcité française." },
        { day: 10, icon: "🕊️", title: "La Déclaration universelle des droits de l'homme", year: 1948, explain: "Adoptée à Paris le 10 décembre 1948 par l'Assemblée générale de l'ONU, elle proclame pour la première fois des droits valables pour tous les êtres humains." },
        { day: 11, icon: "🧒", title: "La création de l'UNICEF", year: 1946, explain: "Le 11 décembre 1946, l'ONU crée un fonds pour aider les enfants d'Europe affamés par la guerre. Il deviendra permanent en 1953." },
        { day: 12, icon: "📻", title: "Le premier signal radio à travers l'Atlantique", year: 1901, explain: "Le 12 décembre 1901, Guglielmo Marconi capte à Terre-Neuve la lettre « S » envoyée depuis la Cornouailles, à 3 500 km." },
        { day: 13, icon: "🏝️", title: "Abel Tasman aperçoit la Nouvelle-Zélande", year: 1642, explain: "Le 13 décembre 1642, le navigateur néerlandais voit les côtes de l'île du Sud : première observation européenne de la Nouvelle-Zélande." },
        { day: 14, icon: "🚩", title: "Amundsen atteint le pôle Sud", year: 1911, explain: "Le 14 décembre 1911, l'équipe de Roald Amundsen plante le drapeau norvégien au pôle Sud, cinq semaines avant le Britannique Scott." },
        { day: 15, icon: "📜", title: "Le Bill of Rights américain entre en vigueur", year: 1791, explain: "Le 15 décembre 1791, dix amendements à la Constitution garantissent la liberté d'expression, de religion et de la presse aux Américains." },
        { day: 16, icon: "🍵", title: "La Boston Tea Party", year: 1773, explain: "Le 16 décembre 1773, des colons déguisés en Amérindiens jettent à la mer 342 caisses de thé pour protester contre les taxes britanniques." },
        { day: 17, icon: "🛩️", title: "Le premier vol des frères Wright", year: 1903, explain: "Le 17 décembre 1903, à Kitty Hawk, le Flyer des frères Wright vole douze secondes, sur 37 mètres : c'est le premier vol d'un avion à moteur." },
        { day: 18, icon: "🩰", title: "La première du ballet Casse-Noisette", year: 1892, explain: "Le 18 décembre 1892, à Saint-Pétersbourg, Tchaïkovski présente un ballet qui se passe la nuit de Noël." },
        { day: 19, icon: "📖", title: "Dickens publie Un chant de Noël", year: 1843, explain: "Le 19 décembre 1843 paraît le conte de Charles Dickens sur l'avare Scrooge : il fait renaître la tradition de Noël en Angleterre." },
        { day: 20, icon: "🗳️", title: "Louis-Napoléon Bonaparte prête serment comme président", year: 1848, explain: "Le 20 décembre 1848, le neveu de Napoléon, élu au suffrage universel masculin avec plus de 74 % des voix, devient président de la IIe République." },
        { day: 21, icon: "🚀", title: "Apollo 8 s'envole vers la Lune", year: 1968, explain: "Le 21 décembre 1968, trois astronautes décollent pour le premier voyage habité autour de la Lune. Ils photographieront la Terre se levant au-dessus de l'horizon lunaire." },
        { day: 22, icon: "⚖️", title: "La condamnation du capitaine Dreyfus", year: 1894, explain: "Le 22 décembre 1894, un conseil de guerre condamne à tort Alfred Dreyfus pour trahison : c'est le début de l'affaire qui divisera la France." },
        { day: 23, icon: "🔌", title: "L'invention du transistor", year: 1947, explain: "Le 23 décembre 1947, les ingénieurs des laboratoires Bell montrent un composant qui amplifie un signal électrique : il remplacera les tubes à vide et permettra les ordinateurs." },
        { day: 24, icon: "🇱🇾", title: "L'indépendance de la Libye", year: 1951, explain: "Le 24 décembre 1951, la Libye devient indépendante : c'est le premier pays d'Afrique à l'obtenir par décision de l'ONU." },
        { day: 25, icon: "🎄", title: "Le couronnement de Charlemagne", year: 800, explain: "Le jour de Noël de l'an 800, le pape Léon III pose la couronne impériale sur la tête de Charlemagne, à Rome." },
        { day: 26, icon: "🔨", title: "La dissolution de l'URSS", year: 1991, explain: "Le 26 décembre 1991, le Soviet suprême constate la disparition de l'Union soviétique, au lendemain de la démission de Gorbatchev." },
        { day: 27, icon: "🚢", title: "Darwin embarque sur le Beagle", year: 1831, explain: "Le 27 décembre 1831, le jeune naturaliste quitte l'Angleterre pour un voyage de cinq ans autour du monde, qui nourrira sa théorie de l'évolution." },
        { day: 28, icon: "🎬", title: "La première séance de cinéma payante", year: 1895, explain: "Le 28 décembre 1895, les frères Lumière projettent leurs films au Salon indien du Grand Café, à Paris, devant 33 spectateurs payants." },
        { day: 29, icon: "🪶", title: "Le massacre de Wounded Knee", year: 1890, explain: "Le 29 décembre 1890, l'armée américaine tue plus de 250 Sioux Lakotas dans le Dakota du Sud : c'est l'un des derniers grands épisodes des guerres indiennes." },
        { day: 30, icon: "☭", title: "La création de l'URSS", year: 1922, explain: "Le 30 décembre 1922, la Russie, l'Ukraine, la Biélorussie et la Transcaucasie signent le traité qui fonde l'Union des républiques socialistes soviétiques." },
        { day: 31, icon: "⚓", title: "Le Panama récupère son canal", year: 1999, explain: "Le 31 décembre 1999, les États-Unis rendent au Panama le canal qu'ils contrôlaient depuis son ouverture, en 1914." }
    ];

    return { DAYS: DAYS };
}));
