// =========================================================================
// === LE CHEMIN DU TEMPS — LEÇONS DU MONDE 0 (questions rédigées à la main) ===
// =========================================================================
// Le Monde 0 (« Le temps des historiens ») ne se joue pas seulement sur des événements : il enseigne
// la périodisation (programme de Seconde, chapitre introductif). Ses épreuves « leçon » posent des
// questions écrites à la main, regroupées en séries. Une épreuve tire quelques questions d'une ou
// plusieurs séries (js/app/lesson.js), toujours avec leur explication, qu'on ait juste ou faux.
//
// Format d'une question : { q, choices, explain } — la PREMIÈRE réponse de `choices` est la bonne
// (l'ordre est mélangé à l'affichage). Pur, sans DOM : testé dans tests/path-lessons.test.js.
//
// Contenu en français seulement : c'est un cours, il se traduira avec le reste du Chemin.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.PathLessons = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var DEFAULT_TAKE = 5;

    var SETS = {
        // --- Idée 1 : le temps a sa propre histoire --------------------------------------------
        ere: {
            title: 'Avant et après Jésus-Christ',
            questions: [
                {
                    q: "L'an 0 existe-t-il dans notre calendrier ?",
                    choices: ["Non : l'an 1 av. J.-C. est suivi de l'an 1 apr. J.-C.", "Oui : c'est l'année de la naissance de Jésus", "Oui, mais seuls les historiens l'emploient", "Oui : c'est l'année de la mort d'Auguste"],
                    explain: "Le moine Denys le Petit, qui calcule cette ère vers 525, ne connaît pas le zéro : on passe directement de l'an 1 av. J.-C. à l'an 1 apr. J.-C."
                },
                {
                    q: 'Quelle date est la plus ancienne ?',
                    choices: ['300 av. J.-C.', '200 av. J.-C.', '100 av. J.-C.', '100 apr. J.-C.'],
                    explain: 'Avant J.-C., on compte à rebours : plus le nombre est grand, plus la date est ancienne.'
                },
                {
                    q: "Combien d'années séparent 50 av. J.-C. de 50 apr. J.-C. ?",
                    choices: ['99 ans', '100 ans', '101 ans', '50 ans'],
                    explain: "Faute d'an 0, on ne fait pas 50 + 50 = 100 : il faut retirer une année. L'écart est de 99 ans."
                },
                {
                    q: 'Octave reçoit le titre d\'Auguste en 27 av. J.-C. et meurt en 14 apr. J.-C. Combien de temps a-t-il régné ?',
                    choices: ['40 ans', '41 ans', '13 ans', '27 ans'],
                    explain: "27 + 14 = 41, moins une année puisqu'il n'y a pas d'an 0 : 40 ans."
                },
                {
                    q: 'Selon les historiens, Jésus est probablement né…',
                    choices: ["quelques années avant l'an 1, vers 6 à 4 av. J.-C.", "le 25 décembre de l'an 0", "en l'an 1 apr. J.-C.", "vers l'an 30"],
                    explain: "Denys le Petit s'est trompé de quelques années : selon les Évangiles, Jésus naît sous le roi Hérode, mort en 4 av. J.-C. La date du 25 décembre n'est fixée qu'au IVe siècle."
                },
                {
                    q: 'Que signifie « avant notre ère » (av. n. è.) ?',
                    choices: ["La même chose qu'« av. J.-C. », sans référence religieuse", "Avant l'invention de l'écriture", 'Avant la chute de Rome', "Avant l'an 1000"],
                    explain: "Beaucoup d'historiens et de musées disent « avant notre ère » et « de notre ère » : le compte des années est le même, il ne renvoie simplement plus à Jésus."
                },
                {
                    q: 'Rome est fondée, selon la légende, en 753 av. J.-C. et son empire d\'Occident tombe en 476. Combien d\'années entre les deux ?',
                    choices: ['1 228 ans', '1 229 ans', '277 ans', '723 ans'],
                    explain: "753 + 476 = 1 229, moins une année faute d'an 0 : 1 228 ans."
                },
                {
                    q: "Comment s'appelle le siècle qui précède l'an 1 ?",
                    choices: ['Le Ier siècle av. J.-C.', 'Le siècle 0', 'Le IIe siècle av. J.-C.', 'Le siècle de Jésus'],
                    explain: "Le Ier siècle av. J.-C. couvre les années 100 à 1 av. J.-C. ; le Ier siècle apr. J.-C., les années 1 à 100."
                }
            ]
        },

        eres: {
            title: 'Compter les années : les ères',
            questions: [
                {
                    q: "Qu'est-ce qu'une ère ?",
                    choices: ["Un compte des années à partir d'un événement fondateur", 'Une période de mille ans', 'Un calendrier lunaire', "Le règne d'un roi"],
                    explain: "Chaque ère part d'un « an 1 » choisi par une société : la naissance de Jésus, l'Hégire, la création du monde selon la tradition juive…"
                },
                {
                    q: "Le calendrier musulman commence avec l'Hégire, en 622. De quoi s'agit-il ?",
                    choices: ['Le départ de Mahomet de La Mecque pour Médine', 'La naissance de Mahomet', 'La construction de la Kaaba', 'La prise de Jérusalem'],
                    explain: "L'Hégire (hijra, « émigration ») est le départ de Mahomet et de ses fidèles vers Médine : elle devient l'an 1 du calendrier musulman."
                },
                {
                    q: "L'an 1 du calendrier hébraïque correspond, selon la tradition, à…",
                    choices: ['la création du monde (3761 av. J.-C.)', "la sortie d'Égypte", 'la construction du Temple de Jérusalem', "la naissance d'Abraham"],
                    explain: "La tradition juive compte les années depuis la création du monde, placée en 3761 av. J.-C. de notre calendrier."
                },
                {
                    q: 'Le 22 septembre 1792 devient le 1er vendémiaire de l\'an I. Que commence-t-on à compter ?',
                    choices: ['Les années de la République', 'Les années du règne de Louis XVI', 'Les années depuis la prise de la Bastille', "Les années de l'Empire"],
                    explain: "Le calendrier républicain compte les années depuis le premier jour de la République. Napoléon l'abandonne : le grégorien revient le 1er janvier 1806."
                },
                {
                    q: "En 2026, on est en l'an 5786 (puis 5787 à l'automne) du calendrier…",
                    choices: ['hébraïque', 'musulman', 'chinois', 'républicain'],
                    explain: "3761 + 2026 = 5787 : le Nouvel An juif, Roch Hachana, tombe en septembre, d'où le changement d'année à l'automne."
                },
                {
                    q: "2026 − 622 = 1404. Pourtant, l'année musulmane en cours en 2026 est 1447. Pourquoi ?",
                    choices: ["Le calendrier musulman est lunaire : ses années ont 354 jours, 11 de moins", 'On a rajouté des années oubliées', "L'Hégire a eu lieu plus tôt qu'on ne le croit", 'Le calendrier musulman ajoute deux ans par siècle'],
                    explain: "Une année lunaire est plus courte d'environ 11 jours : en quatorze siècles, l'écart atteint plus de quarante ans."
                },
                {
                    q: 'Au Japon, à côté du calendrier grégorien, les années se comptent aussi…',
                    choices: ["selon l'ère de l'empereur régnant (ère Reiwa depuis 2019)", 'depuis la naissance de Bouddha', 'depuis la fondation de Tokyo', 'depuis 1945'],
                    explain: "Chaque règne ouvre une ère : 2019 est l'an 1 de l'ère Reiwa. Les documents officiels japonais l'emploient encore."
                }
            ]
        },

        gregorien: {
            title: 'Réformer le calendrier',
            questions: [
                {
                    q: 'Notre calendrier est dit « grégorien » en l\'honneur…',
                    choices: ['du pape Grégoire XIII, qui l\'instaure en 1582', 'de saint Grégoire de Tours', "d'un astronome nommé Grégoire", 'du pape Grégoire le Grand, vers 600'],
                    explain: "La réforme de Grégoire XIII corrige le calendrier julien, qui retardait sur le Soleil d'environ 3 jours tous les 400 ans."
                },
                {
                    q: 'Pour rattraper ce retard, la réforme de 1582 supprime…',
                    choices: ['10 jours : le jeudi 4 octobre est suivi du vendredi 15 octobre', 'une année entière', 'le mois de février', 'un jour tous les dix ans'],
                    explain: "En Italie et en Espagne, on saute du 4 au 15 octobre 1582. La France suit en décembre : le 9 est suivi du 20."
                },
                {
                    q: 'La « révolution d\'Octobre » a eu lieu le 7 novembre 1917 de notre calendrier. Pourquoi « Octobre » ?',
                    choices: ['La Russie suivait encore le calendrier julien : on y était le 25 octobre', "C'est une erreur de traduction", 'Les combats avaient commencé en octobre', 'Lénine l\'a nommée ainsi par symbole'],
                    explain: "La Russie n'adopte le calendrier grégorien qu'en 1918 : les mêmes jours portent deux dates, selon le calendrier."
                },
                {
                    q: 'Le calendrier julien, que le grégorien a remplacé, avait été créé par…',
                    choices: ['Jules César, en 46 av. J.-C.', 'Auguste', 'Charlemagne', "l'empereur Constantin"],
                    explain: "Jules César impose une année de 365 jours avec un jour en plus tous les quatre ans : d'où son nom, « julien »."
                },
                {
                    q: "Depuis quand l'année commence-t-elle officiellement le 1er janvier en France ?",
                    choices: ['Depuis l\'édit de Roussillon de Charles IX (1564)', 'Depuis toujours', 'Depuis la Révolution française', 'Depuis Napoléon'],
                    explain: "Auparavant, selon les régions, l'année commençait à Pâques, le 25 mars ou à Noël : même le Nouvel An a une histoire."
                },
                {
                    q: 'Une année bissextile revient en principe…',
                    choices: ['tous les 4 ans', 'tous les 2 ans', 'tous les 10 ans', 'tous les 100 ans'],
                    explain: "Avec une exception grégorienne : une année en « 00 » n'est bissextile que si elle est divisible par 400. 1900 ne l'était pas, 2000 l'était."
                }
            ]
        },

        calendriers: {
            title: 'Calendriers et Nouvel An',
            questions: [
                {
                    q: 'Le Nouvel An chinois tombe…',
                    choices: ['entre le 21 janvier et le 20 février', 'le 1er janvier', 'en septembre', "au solstice d'été"],
                    explain: "Le calendrier chinois est luni-solaire : le Nouvel An est fixé sur une nouvelle lune, d'où une date qui change chaque année."
                },
                {
                    q: 'Roch Hachana, le Nouvel An juif, tombe…',
                    choices: ['en septembre ou au début d\'octobre', 'le 1er janvier', 'au printemps', 'en février'],
                    explain: "Il ouvre le mois de Tichri, à l'automne : le Nouvel An n'a pas la même date d'une culture à l'autre."
                },
                {
                    q: 'Norouz, le Nouvel An persan, est fêté…',
                    choices: ["à l'équinoxe de printemps (20 ou 21 mars)", 'le 1er janvier', "au solstice d'hiver", 'à une date qui suit la Lune'],
                    explain: "Le calendrier iranien est solaire et commence au printemps, quand le jour égale la nuit."
                },
                {
                    q: 'Le calendrier musulman est…',
                    choices: ['lunaire', 'solaire', 'luni-solaire', 'fondé sur les étoiles'],
                    explain: "Douze mois lunaires, sans ajustement sur le Soleil : l'année compte 354 ou 355 jours."
                },
                {
                    q: 'Le calendrier hébraïque est…',
                    choices: ['luni-solaire : des mois lunaires, et un mois ajouté 7 années sur 19', 'purement lunaire', 'purement solaire', 'fondé sur les étoiles'],
                    explain: "Le mois ajouté maintient les fêtes dans leur saison : Pessah reste une fête de printemps."
                },
                {
                    q: 'Notre calendrier grégorien est…',
                    choices: ['solaire', 'lunaire', 'luni-solaire', 'fondé sur les marées'],
                    explain: "Ses mois n'ont plus de lien avec la Lune : l'année suit la course de la Terre autour du Soleil, 365 jours et un quart."
                },
                {
                    q: 'Le ramadan tombe-t-il toujours à la même saison ?',
                    choices: ["Non : il avance d'environ 11 jours chaque année", 'Oui, toujours en été', 'Oui, toujours au printemps', 'Non : sa date est tirée au sort'],
                    explain: "C'est la conséquence d'un calendrier lunaire : en 33 ans environ, le ramadan traverse toutes les saisons."
                }
            ]
        },

        cycles: {
            title: 'Temps cyclique, temps linéaire',
            questions: [
                {
                    q: 'Un temps « cyclique », c\'est un temps…',
                    choices: ['rythmé par ce qui revient : saisons, fêtes de chaque année', "qui va du passé vers l'avenir sans retour", 'mesuré en siècles', 'réservé aux sociétés anciennes'],
                    explain: "Le temps cyclique est celui des saisons, des récoltes, des fêtes qui reviennent à date fixe."
                },
                {
                    q: 'Compter les années depuis un événement fondateur (an 1, an 2, an 3…), c\'est voir le temps comme…',
                    choices: ['une ligne qui avance', 'un cercle', 'une spirale qui recule', 'un temps arrêté'],
                    explain: "Une ère suppose un temps linéaire : chaque année est nouvelle et ne revient pas."
                },
                {
                    q: 'Pâques, Pessah, l\'Aïd el-Fitr, Noël : ces fêtes relèvent d\'un temps…',
                    choices: ['cyclique : elles reviennent chaque année', "linéaire : elles n'ont lieu qu'une fois", "ni l'un ni l'autre", 'uniquement solaire'],
                    explain: "Toutes les religions ont un calendrier de fêtes qui reviennent : c'est leur part de temps cyclique."
                },
                {
                    q: 'Une société n\'a-t-elle qu\'un seul rapport au temps ?',
                    choices: ['Non : chacune combine un temps cyclique (fêtes, saisons) et un temps linéaire (une ère)', "Oui : l'Occident vit un temps linéaire, les autres un temps cyclique", 'Oui : seul le temps cyclique existe', 'Oui : seul le temps linéaire existe'],
                    explain: "Le chrétien qui fête Noël chaque année compte aussi les années depuis l'an 1 ; le juif qui fête Pessah compte aussi les années depuis la création du monde."
                },
                {
                    q: 'Les historiens des religions présentent souvent la Bible hébraïque comme…',
                    choices: ['l\'une des sources de la vision linéaire du temps, de la Création à la fin des temps', 'un texte sans calendrier', 'une vision purement cyclique du temps', 'un texte qui ne compte pas les années'],
                    explain: "Face au temps cyclique de nombreux penseurs grecs, la Bible raconte une histoire qui avance : Création, Alliance, attente du Messie. Le christianisme en hérite."
                },
                {
                    q: 'Au XVIIIe siècle, les philosophes des Lumières transforment le temps linéaire en…',
                    choices: ['une idée de progrès', 'un temps cyclique', 'un temps immobile', 'un temps sacré'],
                    explain: "La ligne du temps n'attend plus la fin du monde : elle mène vers un avenir meilleur, grâce à la raison et aux sciences (Condorcet)."
                }
            ]
        },

        // --- Idée 2 : le temps s'observe à différentes échelles ---------------------------------
        siecles: {
            title: 'Siècles et millénaires',
            questions: [
                {
                    q: 'En quel siècle a lieu la prise de la Bastille (1789) ?',
                    choices: ['Au XVIIIe siècle', 'Au XVIIe siècle', 'Au XIXe siècle', 'Entre le XVIIe et le XVIIIe siècle'],
                    explain: "On prend les centaines et on ajoute 1 : 17 + 1 = 18. Le XVIIIe siècle va de 1701 à 1800."
                },
                {
                    q: "À quel siècle appartient l'année 1900 ?",
                    choices: ['Au XIXe siècle', 'Au XXe siècle', 'Au XVIIIe siècle', 'À aucun : elle est entre deux siècles'],
                    explain: "Le XIXe siècle va de 1801 à 1900 : une année en « 00 » est la DERNIÈRE de son siècle."
                },
                {
                    q: "Et l'an 2000 ?",
                    choices: ['Au XXe siècle', 'Au XXIe siècle', 'Au IIIe millénaire', 'Au premier siècle du IIIe millénaire'],
                    explain: "Faute d'an 0, le XXIe siècle et le IIIe millénaire ont commencé le 1er janvier 2001."
                },
                {
                    q: "En quel siècle tombe l'Empire romain d'Occident (476) ?",
                    choices: ['Au Ve siècle', 'Au IVe siècle', 'Au VIe siècle', 'Au XLVIe siècle'],
                    explain: '4 + 1 = 5 : le Ve siècle, qui va de 401 à 500.'
                },
                {
                    q: 'Jules César est assassiné en 44 av. J.-C. En quel siècle ?',
                    choices: ['Au Ier siècle av. J.-C.', 'Au Ier siècle apr. J.-C.', 'Au IIe siècle av. J.-C.', 'Au siècle 0'],
                    explain: 'Le Ier siècle av. J.-C. couvre les années 100 à 1 av. J.-C.'
                },
                {
                    q: 'Rome est fondée en 753 av. J.-C. : en quel siècle ?',
                    choices: ['Au VIIIe siècle av. J.-C.', 'Au VIIe siècle av. J.-C.', 'Au IXe siècle av. J.-C.', 'Au LXXVe siècle av. J.-C.'],
                    explain: 'Même règle avant J.-C. : 7 + 1 = 8. Le VIIIe siècle av. J.-C. va de 800 à 701 av. J.-C.'
                },
                {
                    q: 'Le XVIe siècle couvre les années…',
                    choices: ['1501 à 1600', '1600 à 1699', '1500 à 1599', '1601 à 1700'],
                    explain: "Un siècle commence par une année en « 01 » et finit par une année en « 00 »."
                },
                {
                    q: 'Les « années 1960 » désignent…',
                    choices: ['les années 1960 à 1969', 'les années 1951 à 1960', 'tout le XXe siècle', 'les années 1961 à 1970'],
                    explain: "Une décennie se compte ici depuis l'année ronde : c'est un usage, pas une règle de calendrier."
                },
                {
                    q: 'Pourquoi dit-on que le découpage en siècles est « régulier » ?',
                    choices: ['Chaque siècle dure 100 ans, quoi qu\'il s\'y passe', 'Chaque siècle commence par une guerre', 'Un siècle correspond à un règne', 'Les historiens le fixent selon les événements'],
                    explain: "C'est un découpage mathématique : il ne dit rien des événements, ce qui le rend commode, mais parfois artificiel."
                },
                {
                    q: 'Combien de siècles séparent Clovis (vers 500) de Napoléon (vers 1800) ?',
                    choices: ['13', '3', '18', '15'],
                    explain: '1 800 − 500 = 1 300 ans, soit 13 siècles.'
                },
                {
                    q: 'Louis XIV règne de 1643 à 1715. On le dit roi du…',
                    choices: ['XVIIe siècle', 'XVIe siècle', 'XVIIIe siècle', 'XVe siècle'],
                    explain: "Son règne déborde sur le XVIIIe siècle, mais l'essentiel se joue au XVIIe : un découpage régulier coupe parfois un règne en deux."
                },
                {
                    q: 'Le Ier millénaire av. J.-C. couvre les années…',
                    choices: ['1000 à 1 av. J.-C.', '1 à 1000 apr. J.-C.', '2000 à 1000 av. J.-C.', '100 à 1 av. J.-C.'],
                    explain: 'Un millénaire, ce sont dix siècles : avant J.-C., on les compte à rebours vers l\'an 1.'
                }
            ]
        },

        chrononymes: {
            title: 'Les noms des périodes',
            questions: [
                {
                    q: "Qu'est-ce qu'un chrononyme ?",
                    choices: ['Le nom donné à une période (la Renaissance, les Trente Glorieuses…)', 'Une unité de temps de cent ans', 'Un instrument pour mesurer le temps', 'Une date de naissance'],
                    explain: "Un chrononyme nomme une période d'après ce qui la caractérise, et non d'après sa durée."
                },
                {
                    q: 'Les « Trente Glorieuses » désignent…',
                    choices: ['la forte croissance des pays industrialisés, de 1945 au milieu des années 1970', 'trente victoires de Napoléon', 'les trente premières années de la Ve République', 'le règne de Louis XIV'],
                    explain: "L'expression est de l'économiste Jean Fourastié (1979) : elle a été trouvée après coup, une fois la croissance retombée."
                },
                {
                    q: 'Combien de temps a duré la guerre de Cent Ans (1337-1453) ?',
                    choices: ['116 ans', '100 ans', '99 ans', '130 ans'],
                    explain: "Le nom, donné au XIXe siècle, arrondit : il désigne un long conflit franco-anglais entrecoupé de trêves, pas une durée exacte."
                },
                {
                    q: 'La guerre de Trente Ans (1618-1648), elle, a duré…',
                    choices: ['30 ans', '100 ans', '25 ans', '48 ans'],
                    explain: "Cette fois, le nom dit vrai : les chrononymes ne suivent pas tous la même logique."
                },
                {
                    q: 'La « Belle Époque » a été nommée ainsi…',
                    choices: ["après la Première Guerre mondiale, par nostalgie de l'avant-1914", 'par ceux qui la vivaient, vers 1900', 'par Louis XIV', 'au Moyen Âge'],
                    explain: "Vue depuis les tranchées et les deuils, l'avant-guerre paraît heureuse : le nom en dit autant sur ceux qui l'ont choisi que sur la période."
                },
                {
                    q: 'Les « Années folles » correspondent…',
                    choices: ['aux années 1920', 'aux années 1960', 'aux années 1890', 'aux années 1930'],
                    explain: "Après la guerre, le jazz, la fête et les avant-gardes : un nom qui retient l'insouciance des villes plus que la vie de tous."
                },
                {
                    q: 'Le nom « Moyen Âge » a été inventé…',
                    choices: ['par les humanistes de la Renaissance, pour désigner un âge « du milieu »', 'par les moines du Moyen Âge eux-mêmes', 'par Napoléon', 'au XXe siècle'],
                    explain: "Pour eux, c'était une parenthèse entre la brillante Antiquité et leur propre temps : le nom porte déjà un jugement."
                },
                {
                    q: 'Un chrononyme est-il neutre ?',
                    choices: ['Non : il porte souvent un jugement (« Glorieuses », « Âge d\'or », « Années folles »)', 'Oui, toujours', 'Oui : il est fixé par une loi', 'Non, car il est toujours faux'],
                    explain: "Nommer une période, c'est déjà l'interpréter : c'est pourquoi les historiens discutent les chrononymes."
                },
                {
                    q: 'Le mot « Renaissance », pour désigner une période, a été popularisé au XIXe siècle par…',
                    choices: ["l'historien Jules Michelet", 'Léonard de Vinci', 'François Ier', 'Voltaire'],
                    explain: "Michelet en fait le titre d'un volume de son Histoire de France (1855) : une période peut recevoir son nom trois siècles plus tard."
                }
            ]
        },

        echelles: {
            title: 'Les échelles du temps',
            questions: [
                {
                    q: "L'historien Fernand Braudel distingue trois temps. Lequel avance le plus lentement ?",
                    choices: ['Le temps long : climat, géographie, structures', 'Le temps court : les événements', 'Le temps moyen : les cycles économiques', 'Le temps des horloges'],
                    explain: "Dans La Méditerranée (1949), Braudel superpose un temps presque immobile, celui du milieu, à des temps de plus en plus rapides."
                },
                {
                    q: 'Pour Braudel, une bataille ou une élection appartient…',
                    choices: ["au temps court, celui de l'événement", 'au temps long', 'au temps moyen', 'au temps géologique'],
                    explain: "L'événement est l'écume de l'histoire : visible, rapide, mais porté par des mouvements plus profonds."
                },
                {
                    q: 'Une crise économique de quelques décennies relève, chez Braudel…',
                    choices: ['du temps moyen, celui de la conjoncture', 'du temps court', 'du temps long', "d'aucun de ces temps"],
                    explain: "La conjoncture, ce sont les cycles des prix, des récoltes, de la population : plusieurs années à quelques décennies."
                },
                {
                    q: 'Pour raconter la prise de la Bastille, quelle échelle de temps choisir ?',
                    choices: ['Le jour, voire l\'heure', 'Le millénaire', 'Le siècle', "L'ère"],
                    explain: "Le 14 juillet 1789 se raconte heure par heure : l'échelle dépend de la question posée."
                },
                {
                    q: 'Pour l\'historien Eric Hobsbawm, le « court XXe siècle » va…',
                    choices: ['de 1914 à 1991', 'de 1901 à 2000', 'de 1945 à 1989', 'de 1918 à 1939'],
                    explain: "De la Grande Guerre à la fin de l'URSS : un siècle défini par ses événements, et non par le calendrier."
                },
                {
                    q: 'Et le « long XIXe siècle », toujours selon Hobsbawm ?',
                    choices: ['De 1789 à 1914', 'De 1801 à 1900', 'De 1815 à 1870', 'De 1750 à 1850'],
                    explain: "De la Révolution française à la Grande Guerre : 125 ans, que le découpage régulier coupe en morceaux."
                }
            ]
        },

        // --- Idée 3 : le temps ne se divise pas de lui-même ---------------------------------------
        bornes: {
            title: 'Où commence une période ?',
            questions: [
                {
                    q: "L'Antiquité commence traditionnellement avec…",
                    choices: ["l'invention de l'écriture, vers 3300 av. J.-C.", 'la fondation de Rome', 'les premiers outils de pierre', 'la naissance de Jésus'],
                    explain: "L'écriture (en Mésopotamie, puis en Égypte) sépare la Préhistoire de l'Histoire : un critère qui privilégie les sources écrites."
                },
                {
                    q: "476 marque la fin de l'Antiquité. Que se passe-t-il ?",
                    choices: ["Le dernier empereur romain d'Occident, Romulus Augustule, est déposé", 'Rome est fondée', 'Constantinople est prise', 'Clovis est baptisé'],
                    explain: "Le chef germain Odoacre renvoie les insignes impériaux à Constantinople : un événement discret, devenu une borne après coup."
                },
                {
                    q: "476 : l'Empire romain prend-il fin partout ?",
                    choices: ["Non : en Orient, il dure jusqu'en 1453 (l'Empire byzantin)", 'Oui, partout', "Non : il dure jusqu'à Napoléon", 'Oui, sauf en Gaule'],
                    explain: "Une borne vaut pour un lieu : à Constantinople, l'Antiquité et le Moyen Âge ne se séparent pas en 476."
                },
                {
                    q: 'Certains historiens de la France font plutôt commencer le Moyen Âge en 496 (date traditionnelle). Pourquoi ?',
                    choices: ['Le baptême de Clovis', "La mort d'Attila", 'Le couronnement de Charlemagne', "L'Hégire"],
                    explain: "Le critère n'est plus la chute de Rome mais la naissance d'un royaume franc chrétien : un autre point de vue, une autre borne."
                },
                {
                    q: 'Pour certains, le Moyen Âge se termine en 1453. Pourquoi ?',
                    choices: ["Constantinople, dernier reste de l'Empire romain, est prise par les Ottomans", 'La guerre de Cent Ans commence', 'Gutenberg meurt', "Colomb atteint l'Amérique"],
                    explain: "1453 est aussi la fin de la guerre de Cent Ans : une même année peut servir de borne pour plusieurs raisons."
                },
                {
                    q: "D'autres préfèrent 1492. Quel critère cette date met-elle en avant ?",
                    choices: ["L'ouverture du monde : Colomb atteint l'Amérique", 'Une victoire militaire française', "La fin d'une épidémie", "L'invention de l'imprimerie"],
                    explain: "Choisir 1453 ou 1492, c'est choisir entre un critère politique (la fin d'un empire) et un critère mondial (les Grandes Découvertes)."
                },
                {
                    q: "Pour les historiens français, l'époque contemporaine commence en…",
                    choices: ['1789, avec la Révolution française', '1815', '1914', '1900'],
                    explain: "La Révolution change le régime politique et la société : c'est elle qui ouvre l'histoire « contemporaine » en France."
                },
                {
                    q: "Pourquoi les historiens ne s'accordent-ils pas toujours sur une borne ?",
                    choices: ['Chaque borne dépend du critère retenu : politique, religieux, économique, culturel', 'Parce que les dates sont mal connues', 'Parce que les calendriers sont différents', 'Parce que les archives ont brûlé'],
                    explain: "Périodiser est un choix : il dépend de ce que l'historien veut mettre en valeur."
                },
                {
                    q: 'Pour Jacques Le Goff (2014), le Moyen Âge…',
                    choices: ['se prolonge jusqu\'au milieu du XVIIIe siècle : un « long Moyen Âge »', "s'arrête en l'an 1000", "n'a jamais existé", 'se termine en 1453, sans discussion possible'],
                    explain: "Dans Faut-il vraiment découper l'histoire en tranches ?, il juge la Renaissance trop peu décisive pour ouvrir une nouvelle période."
                },
                {
                    q: 'La division en Antiquité, Moyen Âge, époque moderne et époque contemporaine est…',
                    choices: ["une convention surtout française : d'autres pays découpent autrement", 'une règle universelle', "fixée par l'ONU", 'fondée sur les siècles'],
                    explain: "En anglais, l'« early modern period » s'arrête vers 1800, et la « modern history » recouvre notre époque contemporaine."
                }
            ]
        }
    };

    // Séries de la révision finale (boss du Monde 0) : un peu de tout.
    var ALL_SETS = Object.keys(SETS);

    function getSet(id) { return SETS[id] || null; }

    function setTitle(ids) {
        var list = Array.isArray(ids) ? ids : [ids];
        if (list.length !== 1) return null;
        var set = getSet(list[0]);
        return set ? set.title : null;
    }

    function shuffled(list, rng) {
        var out = list.slice();
        for (var i = out.length - 1; i > 0; i--) {
            var j = Math.floor(rng() * (i + 1));
            var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
        }
        return out;
    }

    // `take` questions tirées des séries `ids` (une série ou une liste), réponses mélangées.
    // Plusieurs séries : on les alterne pour que chacune soit représentée.
    function draw(ids, take, rng) {
        var random = rng || Math.random;
        // Ordre des séries mélangé : avec moins de questions que de séries, ce n'est pas toujours la dernière
        // qui manque.
        var list = shuffled((Array.isArray(ids) ? ids : [ids]).filter(function (id) { return !!SETS[id]; }), random);
        var count = take || DEFAULT_TAKE;
        var decks = list.map(function (id) {
            return shuffled(SETS[id].questions, random).map(function (q) { return { set: id, q: q }; });
        });
        var picked = [];
        var round = 0;
        while (picked.length < count && decks.some(function (d) { return d.length > round; })) {
            decks.forEach(function (d) { if (picked.length < count && d[round]) picked.push(d[round]); });
            round++;
        }
        return shuffled(picked, random).map(function (item) {
            return {
                set: item.set,
                setTitle: SETS[item.set].title,
                prompt: item.q.q,
                explain: item.q.explain,
                choices: shuffled(item.q.choices.map(function (text, i) { return { text: text, correct: i === 0 }; }), random)
            };
        });
    }

    return { SETS: SETS, ALL_SETS: ALL_SETS, DEFAULT_TAKE: DEFAULT_TAKE, getSet: getSet, setTitle: setTitle, draw: draw };
}));
