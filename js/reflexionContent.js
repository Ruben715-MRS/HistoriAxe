// =========================================================================
// === LES JEUX DE RÉFLEXION — CONTENU RÉDIGÉ À LA MAIN (« Cause ou conséquence ? », « Chasse aux anachronismes ») ===
// =========================================================================
// Ni les liens de cause à effet, ni les scènes ne sont dans les données du jeu : ce contenu est écrit à la main, comme les
// leçons du Monde 0 (js/pathLessons.js). Pur, sans DOM : testé dans tests/reflexionCore.test.js. Contenu en français
// seulement. **Tout ce contenu est à relire par un enseignant.**
//
//  - CAUSES : { id, cause: { title, year }, effect: { title, year }, explain }. Les années sont négatives avant J.-C. ;
//    la cause n'est jamais postérieure à sa conséquence. Une explication dit le mécanisme, pas seulement l'ordre.
//  - SCENES : { id, title, when, intro, elements: [{ icon, text, anachronism, why }] }. Huit éléments par scène, dont
//    un à quatre anachronismes (le nombre varie d'une scène à l'autre et n'est jamais annoncé au joueur) ; `why` dit, pour un anachronisme, quand la chose apparaît, et pour un élément à sa place,
//    pourquoi il est bien de l'époque (montré au joueur qui l'a désigné à tort).

(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.ReflexionContent = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var CAUSES = [
        { id: "sarajevo", cause: { title: "Assassinat de l'archiduc François-Ferdinand à Sarajevo", year: 1914 }, effect: { title: "Déclenchement de la Première Guerre mondiale", year: 1914 }, explain: "L'attentat du 28 juin 1914 provoque une série d'ultimatums : l'Autriche-Hongrie déclare la guerre à la Serbie, puis le jeu des alliances entraîne toute l'Europe." },
        { id: "ruhr", cause: { title: "Occupation de la Ruhr par la France et la Belgique", year: 1923 }, effect: { title: "Hyperinflation en Allemagne", year: 1923 }, explain: "Pour payer les ouvriers de la Ruhr en grève passive, le gouvernement allemand fait tourner la planche à billets : le mark s'effondre." },
        { id: "krach", cause: { title: "Krach de Wall Street", year: 1929 }, effect: { title: "Arrivée d'Hitler au pouvoir", year: 1933 }, explain: "La crise mondiale ruine l'économie allemande (plus de six millions de chômeurs) et pousse les électeurs vers les nazis. Ce n'est pas la seule cause, mais elle a pesé lourd." },
        { id: "etatsgeneraux", cause: { title: "Crise financière de la monarchie française", year: 1788 }, effect: { title: "Convocation des États généraux", year: 1789 }, explain: "Le roi ne peut plus emprunter ni faire accepter de nouveaux impôts : il réunit les États généraux, pour la première fois depuis 1614." },
        { id: "varennes", cause: { title: "Fuite de Louis XVI, arrêté à Varennes", year: 1791 }, effect: { title: "Chute de la monarchie en France", year: 1792 }, explain: "Le roi apparaît comme un traître qui voulait rejoindre les armées étrangères : la confiance est rompue, et la monarchie tombe un an plus tard." },
        { id: "sedan", cause: { title: "Capture de Napoléon III à Sedan", year: 1870 }, effect: { title: "Proclamation de la IIIe République", year: 1870 }, explain: "Quand Paris apprend la défaite et la capture de l'empereur, le 2 septembre, la République est proclamée à l'Hôtel de ville le 4 septembre." },
        { id: "ems", cause: { title: "Dépêche d'Ems", year: 1870 }, effect: { title: "Déclaration de guerre de la France à la Prusse", year: 1870 }, explain: "Bismarck publie, en version durcie, un télégramme sur une entrevue avec l'ambassadeur de France. L'opinion française s'estime insultée, et Napoléon III déclare la guerre le 19 juillet." },
        { id: "dreyfus", cause: { title: "Affaire Dreyfus", year: 1894 }, effect: { title: "Création de la Ligue des droits de l'homme", year: 1898 }, explain: "La Ligue est fondée en 1898, au plus fort de l'affaire, pour défendre Dreyfus et, plus largement, les droits des citoyens contre l'arbitraire." },
        { id: "religion", cause: { title: "Guerres de Religion en France", year: 1562 }, effect: { title: "Édit de Nantes", year: 1598 }, explain: "Après trente-six ans de guerres civiles, Henri IV accorde aux protestants la liberté de conscience et des droits limités de culte : il met fin aux guerres." },
        { id: "revocation", cause: { title: "Révocation de l'édit de Nantes", year: 1685 }, effect: { title: "Exil de 150 000 à 200 000 protestants", year: 1685 }, explain: "Louis XIV retire aux protestants leurs droits. Malgré l'interdiction de quitter le royaume, des centaines de milliers de huguenots partent vers les Provinces-Unies, l'Angleterre ou la Prusse." },
        { id: "colomb", cause: { title: "Découverte de l'Amérique par Christophe Colomb", year: 1492 }, effect: { title: "Conquête de l'empire aztèque par Cortés", year: 1521 }, explain: "Le voyage de Colomb ouvre la route de l'Atlantique aux Espagnols. Vingt-neuf ans plus tard, Cortés renverse l'empire aztèque." },
        { id: "imprimerie", cause: { title: "Invention de l'imprimerie par Gutenberg", year: 1450 }, effect: { title: "Diffusion rapide de la Réforme protestante", year: 1520 }, explain: "Les écrits de Luther sont imprimés et vendus à des centaines de milliers d'exemplaires : sans l'imprimerie, ses idées se seraient diffusées bien moins vite." },
        { id: "thesesluther", cause: { title: "Affichage des 95 thèses de Luther", year: 1517 }, effect: { title: "Excommunication de Luther", year: 1521 }, explain: "Rome condamne ses idées en 1520 et l'excommunie en janvier 1521. Luther refuse de se rétracter à la diète de Worms." },
        { id: "peste", cause: { title: "Peste noire", year: 1347 }, effect: { title: "Révolte des paysans anglais de Wat Tyler", year: 1381 }, explain: "La peste a tué près d'un tiers de la population : la main-d'œuvre manque, et les salaires montent. Quand la couronne veut les bloquer et lève une nouvelle taxe, les paysans se soulèvent." },
        { id: "verdun843", cause: { title: "Guerre entre les fils de Louis le Pieux", year: 840 }, effect: { title: "Traité de Verdun", year: 843 }, explain: "Après trois ans de guerre, les trois petits-fils de Charlemagne se partagent l'empire à Verdun : c'est la lointaine origine de la France et de l'Allemagne." },
        { id: "dimanchrouge", cause: { title: "Dimanche rouge", year: 1905 }, effect: { title: "Révolution russe de 1905", year: 1905 }, explain: "Le 22 janvier 1905, la troupe tire sur une foule pacifique qui portait une pétition au tsar. Grèves et révoltes éclatent alors dans tout l'empire." },
        { id: "pearl", cause: { title: "Attaque japonaise sur Pearl Harbor", year: 1941 }, effect: { title: "Entrée en guerre des États-Unis", year: 1941 }, explain: "L'attaque surprise du 7 décembre 1941 met fin à l'isolationnisme américain : le Congrès déclare la guerre au Japon dès le lendemain." },
        { id: "pologne", cause: { title: "Invasion de la Pologne par l'Allemagne", year: 1939 }, effect: { title: "Déclarations de guerre de la France et du Royaume-Uni", year: 1939 }, explain: "Les deux pays avaient promis leur aide à la Pologne : ils déclarent la guerre à l'Allemagne le 3 septembre 1939." },
        { id: "hiroshima", cause: { title: "Bombardements atomiques d'Hiroshima et de Nagasaki", year: 1945 }, effect: { title: "Capitulation du Japon", year: 1945 }, explain: "Avec l'entrée en guerre de l'URSS contre le Japon, les bombes poussent l'empereur Hirohito à annoncer la capitulation, le 15 août 1945." },
        { id: "dienbienphu", cause: { title: "Défaite française de Diên Biên Phu", year: 1954 }, effect: { title: "Accords de Genève et partition du Vietnam", year: 1954 }, explain: "Après la chute du camp retranché, la France négocie son retrait : le Vietnam est coupé en deux au niveau du 17e parallèle." },
        { id: "treizemai", cause: { title: "Crise du 13 mai à Alger", year: 1958 }, effect: { title: "Retour du général de Gaulle au pouvoir", year: 1958 }, explain: "L'insurrection d'Alger et la menace d'une guerre civile poussent les dirigeants de la IVe République à appeler de Gaulle, qui devient chef du gouvernement en juin." },
        { id: "referendum69", cause: { title: "Échec du référendum sur la régionalisation et le Sénat", year: 1969 }, effect: { title: "Démission du général de Gaulle", year: 1969 }, explain: "De Gaulle avait lié son sort au résultat : le « non » l'emporte le 27 avril 1969, et il quitte le pouvoir le lendemain." },
        { id: "exode", cause: { title: "Exode massif d'Allemands de l'Est vers l'Ouest", year: 1961 }, effect: { title: "Construction du mur de Berlin", year: 1961 }, explain: "Plus de trois millions d'Allemands de l'Est avaient fui par Berlin-Ouest depuis 1949. Pour arrêter l'hémorragie, la RDA ferme la frontière dans la nuit du 12 au 13 août 1961." },
        { id: "chutemur", cause: { title: "Chute du mur de Berlin", year: 1989 }, effect: { title: "Réunification de l'Allemagne", year: 1990 }, explain: "L'ouverture du mur le 9 novembre 1989 rend la réunification possible : elle est officielle le 3 octobre 1990." },
        { id: "tchernobyl", cause: { title: "Catastrophe de Tchernobyl", year: 1986 }, effect: { title: "Référendum italien contre le nucléaire", year: 1987 }, explain: "L'accident nucléaire de 1986 inquiète l'opinion européenne : en novembre 1987, une large majorité d'Italiens vote contre l'énergie nucléaire, et le pays arrête ses centrales." },
        { id: "onzeseptembre", cause: { title: "Attentats du 11 septembre 2001", year: 2001 }, effect: { title: "Invasion de l'Afghanistan par les États-Unis", year: 2001 }, explain: "Les États-Unis accusent Al-Qaïda, hébergée par les talibans : leurs frappes commencent le 7 octobre 2001." },
        { id: "subprimes", cause: { title: "Crise des subprimes", year: 2007 }, effect: { title: "Faillite de Lehman Brothers", year: 2008 }, explain: "Les prêts immobiliers à risque américains ne sont plus remboursés ; la banque Lehman Brothers fait faillite en septembre 2008, ce qui déclenche une crise financière mondiale." },
        { id: "watt", cause: { title: "Machine à vapeur perfectionnée par Watt", year: 1769 }, effect: { title: "Première ligne de chemin de fer à vapeur pour voyageurs", year: 1825 }, explain: "Le perfectionnement de la machine à vapeur rend possible, un demi-siècle plus tard, la locomotive : la ligne Stockton–Darlington s'ouvre en 1825." },
        { id: "famineirlande", cause: { title: "Grande famine irlandaise (mildiou de la pomme de terre)", year: 1845 }, effect: { title: "Émigration massive des Irlandais vers l'Amérique", year: 1847 }, explain: "La maladie détruit les récoltes de pommes de terre, nourriture de base de nombreux Irlandais : plus d'un million meurent, et un million d'autres partent, surtout vers les États-Unis." },
        { id: "fevrier48", cause: { title: "Révolution de février 1848", year: 1848 }, effect: { title: "Abolition de l'esclavage dans les colonies françaises", year: 1848 }, explain: "La IIe République, proclamée en février, adopte le décret d'abolition le 27 avril 1848, sous l'impulsion de Victor Schœlcher." },
        { id: "saintdomingue", cause: { title: "Révolte des esclaves à Saint-Domingue", year: 1791 }, effect: { title: "Indépendance d'Haïti", year: 1804 }, explain: "Après plus de dix ans de guerre, Toussaint Louverture puis Dessalines battent l'armée française : Haïti proclame son indépendance en 1804." },
        { id: "teaparty", cause: { title: "Boston Tea Party", year: 1773 }, effect: { title: "Lois intolérables contre les colonies américaines", year: 1774 }, explain: "En réponse à la destruction du thé, le Parlement britannique ferme le port de Boston et retire des droits aux colons : cette sévérité pousse les colonies à s'unir." },
        { id: "saratoga", cause: { title: "Victoire américaine de Saratoga", year: 1777 }, effect: { title: "Alliance franco-américaine", year: 1778 }, explain: "Saratoga convainc Louis XVI que les insurgés peuvent l'emporter : la France signe un traité d'alliance et entre en guerre contre l'Angleterre." },
        { id: "russie1812", cause: { title: "Retraite de Russie de la Grande Armée", year: 1812 }, effect: { title: "Défaite de Napoléon à Leipzig", year: 1813 }, explain: "L'armée napoléonienne est détruite en Russie : la Prusse et l'Autriche se retournent contre lui, et la bataille des Nations, à Leipzig, est une défaite décisive." },
        { id: "cesar", cause: { title: "Assassinat de Jules César", year: -44 }, effect: { title: "Octave devient Auguste et fonde l'Empire", year: -27 }, explain: "La mort de César ouvre une nouvelle série de guerres civiles. Octave, son fils adoptif, en sort vainqueur et reçoit le titre d'Auguste en 27 av. J.-C." },
        { id: "salamine", cause: { title: "Victoire grecque de Salamine", year: -480 }, effect: { title: "Création de la Ligue de Délos", year: -478 }, explain: "Après la victoire sur les Perses, Athènes prend la tête d'une alliance de cités grecques pour poursuivre la guerre : c'est la Ligue de Délos." },
        { id: "alexandre", cause: { title: "Mort d'Alexandre le Grand", year: -323 }, effect: { title: "Partage de son empire entre ses généraux", year: -323 }, explain: "Alexandre meurt à Babylone sans héritier adulte : ses généraux (les diadoques) se partagent son empire et se font la guerre." },
        { id: "milvius", cause: { title: "Victoire de Constantin au pont Milvius", year: 312 }, effect: { title: "Édit de Milan", year: 313 }, explain: "Selon la tradition, Constantin attribue sa victoire au dieu des chrétiens. L'année suivante, avec Licinius, il accorde la liberté de culte à tous, chrétiens compris." },
        { id: "huns", cause: { title: "Arrivée des Huns en Europe de l'Est", year: 375 }, effect: { title: "Entrée des Wisigoths dans l'Empire romain", year: 376 }, explain: "Chassés par les Huns, les Wisigoths demandent asile à Rome en 376 : leur accueil tourne mal, et c'est le début des grandes invasions." },
        { id: "trenteans", cause: { title: "Guerre de Trente Ans", year: 1618 }, effect: { title: "Traités de Westphalie", year: 1648 }, explain: "Après trente ans de guerre en Europe, les traités de Westphalie établissent un nouvel équilibre entre les États et ouvrent une période de paix relative sur le continent." },
        { id: "berlin1884", cause: { title: "Conférence de Berlin", year: 1884 }, effect: { title: "Partage de l'Afrique entre puissances européennes", year: 1885 }, explain: "La conférence fixe les règles de la colonisation du continent : c'est le point de départ de la course au partage de l'Afrique." },
        { id: "saintcloud", cause: { title: "Ordonnances de Saint-Cloud", year: 1830 }, effect: { title: "Trois Glorieuses", year: 1830 }, explain: "Charles X suspend la liberté de la presse et dissout la Chambre : Paris se soulève du 27 au 29 juillet 1830, et le roi doit abdiquer." },
        { id: "banquet", cause: { title: "Interdiction d'un banquet républicain à Paris", year: 1848 }, effect: { title: "Chute de Louis-Philippe", year: 1848 }, explain: "L'interdiction, le 22 février, déclenche l'émeute. Trois jours plus tard, Louis-Philippe abdique." },
        { id: "coup1851", cause: { title: "Coup d'État de Louis-Napoléon Bonaparte", year: 1851 }, effect: { title: "Proclamation du Second Empire", year: 1852 }, explain: "Le prince-président dissout l'Assemblée le 2 décembre 1851 ; il est proclamé empereur le 2 décembre 1852." },
        { id: "frontpopulaire", cause: { title: "Victoire électorale du Front populaire", year: 1936 }, effect: { title: "Accords de Matignon", year: 1936 }, explain: "Les élections portent Léon Blum au pouvoir ; une vague de grèves aboutit aux accords de Matignon : congés payés et semaine de 40 heures." },
        { id: "defaite40", cause: { title: "Défaite française de mai-juin 1940", year: 1940 }, effect: { title: "Vote des pleins pouvoirs à Pétain", year: 1940 }, explain: "Après l'armistice, le Parlement réuni à Vichy donne les pleins pouvoirs au maréchal Pétain le 10 juillet 1940 : c'est la fin de la IIIe République." },
        { id: "partitioninde", cause: { title: "Partition des Indes", year: 1947 }, effect: { title: "Déplacement de millions de personnes entre l'Inde et le Pakistan", year: 1947 }, explain: "La naissance du Pakistan musulman à côté de l'Inde provoque des violences et le déplacement de près de quinze millions de personnes." },
        { id: "suez", cause: { title: "Nationalisation du canal de Suez par Nasser", year: 1956 }, effect: { title: "Expédition franco-britannique de Suez", year: 1956 }, explain: "Pour reprendre le contrôle du canal, la France, le Royaume-Uni et Israël attaquent l'Égypte en octobre 1956 ; les États-Unis et l'URSS les forcent à se retirer." },
        { id: "kippour", cause: { title: "Guerre du Kippour", year: 1973 }, effect: { title: "Premier choc pétrolier", year: 1973 }, explain: "En soutien à l'Égypte et à la Syrie, les pays arabes producteurs de pétrole réduisent leur production et décrètent un embargo : le prix du baril quadruple." },
        { id: "iran79", cause: { title: "Révolution iranienne", year: 1979 }, effect: { title: "Deuxième choc pétrolier", year: 1979 }, explain: "La révolution perturbe la production iranienne : le prix du pétrole double en un an, ce qui aggrave la crise économique mondiale." },
        { id: "koweit", cause: { title: "Invasion du Koweït par l'Irak", year: 1990 }, effect: { title: "Guerre du Golfe", year: 1991 }, explain: "Une coalition menée par les États-Unis, sous mandat de l'ONU, libère le Koweït en février 1991." },
        { id: "waterloo", cause: { title: "Défaite de Napoléon à Waterloo", year: 1815 }, effect: { title: "Exil de Napoléon à Sainte-Hélène", year: 1815 }, explain: "Après les Cent-Jours, les Anglais refusent de le laisser en Europe : il est déporté sur l'île de Sainte-Hélène, où il meurt en 1821." }
    ];

    var SCENES = [
        {
            id: "louisxiv", title: "Un banquet à la cour de Louis XIV", when: "vers 1680",
            intro: "Au château de Versailles, le roi dîne devant la cour. Quelque chose n'a rien à faire dans cette scène…",
            elements: [
                { icon: "🕯️", text: "Des bougies dans les lustres", anachronism: false, why: "On s'éclairait à la bougie : c'est bien l'éclairage de l'époque." },
                { icon: "🎻", text: "Un orchestre de violons", anachronism: false, why: "Lully dirigeait les « Vingt-quatre violons du roi »." },
                { icon: "☕", text: "Du café servi dans de petites tasses", anachronism: false, why: "Le café est à la mode à la cour depuis 1669, après la visite de l'ambassadeur ottoman." },
                { icon: "🧑‍🦳", text: "Des perruques poudrées", anachronism: false, why: "Louis XIV a lancé la mode des grandes perruques." },
                { icon: "🍷", text: "Du vin servi dans des verres", anachronism: false, why: "Le vin et les verres existent depuis l'Antiquité." },
                { icon: "🪞", text: "Des miroirs de la galerie des Glaces", anachronism: false, why: "La galerie des Glaces de Versailles est achevée en 1684 : ses miroirs sont l'un des décors du règne." },
                { icon: "📷", text: "Un photographe qui règle son appareil", anachronism: true, why: "La photographie est inventée en 1839, avec le daguerréotype." },
                { icon: "🥂", text: "Des coupes en cristal", anachronism: false, why: "Verres et coupes en cristal ornent les tables de la cour." }
            ]
        },
        {
            id: "athenes", title: "Le marché d'Athènes", when: "vers 430 av. J.-C.",
            intro: "Sur l'agora, entre les étals et les discussions, quelque chose cloche.",
            elements: [
                { icon: "🏺", text: "Des amphores d'huile d'olive", anachronism: false, why: "L'huile d'olive est l'une des grandes richesses de l'Attique." },
                { icon: "🪙", text: "Des pièces d'argent à la chouette", anachronism: false, why: "La « chouette d'Athènes » est la monnaie de la cité." },
                { icon: "🫒", text: "Des olives", anachronism: false, why: "L'olivier est l'arbre emblématique d'Athènes." },
                { icon: "🗣️", text: "Un philosophe qui discute avec des passants", anachronism: false, why: "Socrate arpente l'agora à cette époque." },
                { icon: "🧀", text: "Du fromage de chèvre", anachronism: false, why: "Le fromage fait partie de l'alimentation grecque ordinaire." },
                { icon: "🥔", text: "Des pommes de terre", anachronism: true, why: "Originaire d'Amérique, la pomme de terre n'arrive en Europe qu'après 1492." },
                { icon: "🍇", text: "Des grappes de raisin", anachronism: false, why: "La vigne est cultivée en Grèce depuis très longtemps : raisins et vin sont courants." },
                { icon: "🐟", text: "Du poisson salé", anachronism: false, why: "La pêche et le poisson salé nourrissent la cité, qui commerce par la mer." }
            ]
        },
        {
            id: "legion", title: "Un camp de légionnaires romains", when: "vers 50 apr. J.-C.",
            intro: "À la frontière de l'Empire, une légion installe son camp pour la nuit.",
            elements: [
                { icon: "⚔️", text: "Un glaive court, le gladius", anachronism: false, why: "C'est l'arme du légionnaire." },
                { icon: "🦅", text: "L'aigle de la légion, porté sur une hampe", anachronism: false, why: "L'aigle est l'enseigne sacrée de chaque légion." },
                { icon: "🛣️", text: "Une route pavée qui traverse la région", anachronism: false, why: "Les Romains bâtissent des routes dans tout l'Empire." },
                { icon: "⛺", text: "Des tentes en cuir alignées dans un camp fortifié", anachronism: false, why: "Chaque soir, la légion construit un camp selon un plan fixe." },
                { icon: "🍞", text: "Des galettes de blé cuites sur place", anachronism: false, why: "Le blé est la base de la ration des soldats." },
                { icon: "💣", text: "Un canon sur un rempart", anachronism: true, why: "L'artillerie à poudre n'apparaît en Europe qu'au XIVe siècle." },
                { icon: "🍷", text: "De la posca, mélange d'eau et de vinaigre", anachronism: false, why: "La posca est la boisson courante des soldats romains." },
                { icon: "🐎", text: "Un cavalier sur une selle à quatre cornes", anachronism: false, why: "Les cavaliers romains montent sur une selle à cornes : les étriers n'arrivent en Europe que vers le VIe-VIIIe siècle." }
            ]
        },
        {
            id: "village", title: "Un village du Moyen Âge", when: "vers 1100",
            intro: "Les paysans travaillent la terre autour d'une petite église. Qu'est-ce qui détonne ?",
            elements: [
                { icon: "⚙️", text: "Un moulin à eau sur la rivière", anachronism: false, why: "Le moulin à eau se généralise au Moyen Âge." },
                { icon: "⛪", text: "Une église romane", anachronism: false, why: "L'art roman domine les XIe et XIIe siècles." },
                { icon: "✍️", text: "Un moine qui copie un manuscrit", anachronism: false, why: "Les livres sont copiés à la main dans les monastères." },
                { icon: "🔨", text: "Un forgeron devant son enclume", anachronism: false, why: "Le forgeron est un artisan essentiel du village." },
                { icon: "🐂", text: "Un attelage de bœufs qui laboure", anachronism: false, why: "Le labour se fait avec des bœufs ou des chevaux." },
                { icon: "🕰️", text: "Une horloge mécanique au clocher", anachronism: true, why: "Les horloges mécaniques apparaissent à la fin du XIIIe siècle." },
                { icon: "🌽", text: "Des épis de maïs", anachronism: true, why: "Le maïs vient d'Amérique : les Européens ne le connaissent qu'au XVIe siècle." },
                { icon: "🔔", text: "Une cloche qui rythme les heures de prière", anachronism: false, why: "Les cloches des églises et des monastères rythment la journée au Moyen Âge." }
            ]
        },
        {
            id: "palos", title: "Le port de Palos", when: "août 1492",
            intro: "Christophe Colomb prépare son voyage. Un intrus s'est glissé dans le port.",
            elements: [
                { icon: "⛵", text: "Une caravelle prête à appareiller", anachronism: false, why: "La caravelle est le navire de l'exploration portugaise et espagnole." },
                { icon: "🧭", text: "Une boussole à bord", anachronism: false, why: "La boussole est en usage en Europe depuis le XIIe siècle." },
                { icon: "🗺️", text: "Une carte marine", anachronism: false, why: "Les cartes marines (portulans) existent déjà." },
                { icon: "🛢️", text: "Des tonneaux de biscuits et d'eau", anachronism: false, why: "Les vivres de bord sont conservés en tonneaux." },
                { icon: "⚓", text: "Une ancre en fer", anachronism: false, why: "L'ancre est un outil de navigation depuis l'Antiquité." },
                { icon: "🚢", text: "Un bateau à vapeur", anachronism: true, why: "Les premiers bateaux à vapeur apparaissent au début du XIXe siècle (Fulton, 1807)." },
                { icon: "⏳", text: "Un sablier pour mesurer le temps", anachronism: false, why: "Le sablier est l'instrument des marins pour mesurer les quarts avant les chronomètres." },
                { icon: "🇺🇸", text: "Un drapeau des États-Unis", anachronism: true, why: "Les États-Unis n'existent que depuis 1776." }
            ]
        },
        {
            id: "bastille", title: "Paris, le 14 juillet 1789", when: "juillet 1789",
            intro: "La foule parisienne marche vers la Bastille. Quels détails ne peuvent pas appartenir à cette journée ?",
            elements: [
                { icon: "💥", text: "Des canons et des mousquets", anachronism: false, why: "Les armes à poudre sont bien celles de l'époque." },
                { icon: "🔴", text: "Des cocardes bleues et rouges aux chapeaux", anachronism: false, why: "Ces cocardes aux couleurs de Paris sont portées dès les 13 et 14 juillet." },
                { icon: "📜", text: "Des pamphlets distribués dans la rue", anachronism: false, why: "La presse et les pamphlets nourrissent l'agitation." },
                { icon: "🔱", text: "Des piques et des fourches", anachronism: false, why: "Les émeutiers sont mal armés et prennent ce qu'ils trouvent." },
                { icon: "🏰", text: "Une forteresse aux tours massives", anachronism: false, why: "La Bastille est une ancienne forteresse devenue prison." },
                { icon: "🚴", text: "Un cycliste qui passe en trombe", anachronism: true, why: "Le vélocipède à pédales n'apparaît que vers 1860." },
                { icon: "🏮", text: "Des lanternes à huile suspendues au-dessus de la rue", anachronism: false, why: "Les réverbères à huile éclairent Paris depuis 1766 ; l'éclairage au gaz n'y arrive que vers 1820." },
                { icon: "📡", text: "Un télégraphe électrique", anachronism: true, why: "Le télégraphe électrique date des années 1830 (Morse, 1837)." }
            ]
        },
        {
            id: "verdun", title: "Une tranchée à Verdun", when: "1916",
            intro: "Les soldats français tiennent leur position sous les obus. Certains détails sont d'une autre guerre.",
            elements: [
                { icon: "🪖", text: "Un casque Adrian sur la tête d'un poilu", anachronism: false, why: "Le casque Adrian est distribué à partir de 1915." },
                { icon: "🕳️", text: "Un réseau de tranchées boueuses", anachronism: false, why: "La guerre de position se joue dans les tranchées." },
                { icon: "☁️", text: "Un nuage de gaz de combat", anachronism: false, why: "Les gaz sont utilisés dès 1915." },
                { icon: "🛩️", text: "Un biplan de reconnaissance dans le ciel", anachronism: false, why: "L'aviation sert à l'observation et au combat." },
                { icon: "💥", text: "Une pluie d'obus d'artillerie lourde", anachronism: false, why: "L'artillerie cause la majorité des pertes." },
                { icon: "🛸", text: "Un drone de surveillance", anachronism: true, why: "Les drones militaires modernes n'existent que depuis la fin du XXe siècle." },
                { icon: "📱", text: "Un soldat qui téléphone avec son portable", anachronism: true, why: "Le téléphone portable se répand dans les années 1990." },
                { icon: "🚚", text: "Un camion sur la Voie sacrée", anachronism: false, why: "La Voie sacrée ravitaille Verdun : jusqu'à un camion toutes les quatorze secondes en 1916." }
            ]
        },
        {
            id: "newyork", title: "Une rue de New York", when: "1925",
            intro: "Dans les « années folles », la ville bouillonne. Qu'est-ce qui n'est pas encore inventé ?",
            elements: [
                { icon: "🚗", text: "Une Ford T qui roule dans l'avenue", anachronism: false, why: "La Ford T est produite de 1908 à 1927." },
                { icon: "📻", text: "Une radio qui diffuse du jazz depuis une fenêtre", anachronism: false, why: "La radio grand public se répand dans les années 1920." },
                { icon: "🎷", text: "Un orchestre de jazz dans un club", anachronism: false, why: "Les années 1920 sont celles du jazz." },
                { icon: "🏙️", text: "Des gratte-ciel qui dominent la rue", anachronism: false, why: "New York compte déjà de nombreux gratte-ciel (Woolworth Building, 1913)." },
                { icon: "📰", text: "Un vendeur de journaux qui crie les titres", anachronism: false, why: "La presse quotidienne est très diffusée." },
                { icon: "📺", text: "Un poste de télévision en vitrine", anachronism: true, why: "La télévision n'entre dans les foyers américains qu'à la fin des années 1940." },
                { icon: "📲", text: "Un smartphone dans la main d'une passante", anachronism: true, why: "Le smartphone ne se répand qu'à la fin des années 2000." },
                { icon: "💳", text: "Un client qui paie avec une carte de crédit", anachronism: true, why: "La première carte de paiement, Diners Club, date de 1950." }
            ]
        },
        {
            id: "han", title: "La Chine des Han", when: "vers 100 apr. J.-C.",
            intro: "Dans une grande ville de la route de la soie, des marchands et des lettrés s'affairent.",
            elements: [
                { icon: "🎋", text: "Des lettrés qui écrivent sur des lamelles de bambou", anachronism: false, why: "Le bambou et la soie sont les supports d'écriture avant le papier." },
                { icon: "🧵", text: "De la soie, produit très recherché", anachronism: false, why: "La Chine est la seule productrice de soie." },
                { icon: "🐫", text: "Une caravane de chameaux sur la route de la soie", anachronism: false, why: "La route de la soie est ouverte sous les Han." },
                { icon: "🏯", text: "Un tronçon de la Grande Muraille", anachronism: false, why: "Les Han prolongent la muraille vers l'ouest." },
                { icon: "🥢", text: "Des baguettes pour manger", anachronism: false, why: "Les baguettes sont d'un usage très ancien en Chine." },
                { icon: "🎆", text: "Des feux d'artifice à la poudre", anachronism: true, why: "La poudre noire est inventée vers le IXe siècle, sous les Tang." },
                { icon: "🖨️", text: "Un imprimeur qui tire des pages en série", anachronism: true, why: "L'impression sur bois apparaît vers le VIIe siècle." },
                { icon: "🧲", text: "Une boussole pour naviguer en mer", anachronism: true, why: "La boussole de navigation date du XIe siècle environ." }
            ]
        },
        {
            id: "lavoisier", title: "Le laboratoire de Lavoisier", when: "vers 1790",
            intro: "Le chimiste mesure, pèse et note. Des objets viennent d'un autre siècle.",
            elements: [
                { icon: "⚖️", text: "Une balance de précision", anachronism: false, why: "Lavoisier mesure toujours les masses avant et après les réactions." },
                { icon: "🧪", text: "Des cornues et des flacons de verre", anachronism: false, why: "La verrerie de laboratoire existe déjà." },
                { icon: "🎈", text: "Une maquette de montgolfière", anachronism: false, why: "Le premier vol en ballon a lieu en 1783." },
                { icon: "🪶", text: "Un cahier de notes écrit à la plume", anachronism: false, why: "On écrit à la plume d'oie." },
                { icon: "📚", text: "Son Traité élémentaire de chimie", anachronism: false, why: "Lavoisier le publie en 1789." },
                { icon: "📊", text: "Le tableau périodique de Mendeleïev au mur", anachronism: true, why: "Mendeleïev le publie en 1869." },
                { icon: "🔬", text: "Un microscope électronique", anachronism: true, why: "Le premier microscope électronique date de 1931." },
                { icon: "💻", text: "Un ordinateur sur la table", anachronism: true, why: "L'ordinateur apparaît au XXe siècle." }
            ]
        },
        {
            id: "salon", title: "Un salon des Lumières", when: "vers 1760",
            intro: "Philosophes et savants discutent autour d'un café. Qu'est-ce qui ne cadre pas ?",
            elements: [
                { icon: "📚", text: "Les premiers volumes de l'Encyclopédie", anachronism: false, why: "Diderot et d'Alembert publient l'Encyclopédie à partir de 1751." },
                { icon: "🪶", text: "Une plume d'oie et un encrier", anachronism: false, why: "On écrit à la plume d'oie." },
                { icon: "🎹", text: "Un clavecin dans un coin du salon", anachronism: false, why: "Le clavecin est très répandu au XVIIIe siècle." },
                { icon: "☕", text: "Du café dans des tasses de porcelaine", anachronism: false, why: "Le café est la boisson des salons et des cafés philosophiques." },
                { icon: "🔌", text: "Une prise électrique au mur", anachronism: true, why: "L'électricité domestique ne se répand qu'à la fin du XIXe siècle ; vers 1760, on étudie à peine l'électricité statique." },
                { icon: "🖊️", text: "Un stylo à bille", anachronism: true, why: "Le stylo à bille est breveté en 1938." },
                { icon: "⌨️", text: "Une machine à écrire", anachronism: true, why: "La machine à écrire commerciale date des années 1870." },
                { icon: "🛢️", text: "Une lampe à pétrole", anachronism: true, why: "La lampe à pétrole se répand vers 1850." }
            ]
        },
        {
            id: "vikings", title: "Un drakkar viking", when: "vers 900",
            intro: "L'équipage approche d'une côte inconnue. Certains détails sont des légendes ou des inventions plus récentes.",
            elements: [
                { icon: "⛵", text: "Un drakkar à fond plat et à voile carrée", anachronism: false, why: "C'est le navire des Vikings." },
                { icon: "🛡️", text: "Un bouclier rond en bois", anachronism: false, why: "Les boucliers ronds étaient peints et fixés au bastingage." },
                { icon: "🪨", text: "Une pierre gravée de runes", anachronism: false, why: "Les Vikings écrivent en runes." },
                { icon: "🔫", text: "Un mousquet à mèche", anachronism: true, why: "Les armes à feu portatives n'arrivent en Europe qu'au XIVe-XVe siècle, bien après les Vikings." },
                { icon: "🍺", text: "De l'hydromel dans des cornes à boire", anachronism: false, why: "On boit de l'hydromel et de la bière." },
                { icon: "🪖", text: "Un casque orné de cornes", anachronism: true, why: "Les casques à cornes sont une image du XIXe siècle, popularisée par les opéras de Wagner." },
                { icon: "🧭", text: "Une boussole à aiguille", anachronism: true, why: "La boussole n'arrive en Europe qu'au XIIe siècle." },
                { icon: "🇩🇰", text: "Le drapeau danois, le Dannebrog", anachronism: true, why: "Le Dannebrog n'est attesté qu'au XIVe siècle (la légende le fait tomber du ciel en 1219)." }
            ]
        },
        {
            id: "expo1900", title: "L'Exposition universelle de Paris", when: "1900",
            intro: "Les Parisiens découvrent le métro, l'électricité et les manèges. Quelque chose n'a pas encore été inventé.",
            elements: [
                { icon: "🚇", text: "Une bouche de métro à la décoration Art nouveau", anachronism: false, why: "La première ligne de métro ouvre en 1900." },
                { icon: "🗼", text: "La tour Eiffel, achevée en 1889", anachronism: false, why: "Elle domine l'Exposition." },
                { icon: "📞", text: "Un téléphone à manivelle", anachronism: false, why: "Le téléphone existe depuis 1876." },
                { icon: "💡", text: "Des ampoules électriques qui illuminent le Palais de l'électricité", anachronism: false, why: "La « fée Électricité » est la vedette de l'Exposition." },
                { icon: "📱", text: "Un visiteur qui photographie avec son smartphone", anachronism: true, why: "Le smartphone date des années 2000 : en 1900, on photographie à l'appareil à plaque." },
                { icon: "✈️", text: "Un avion de ligne à réaction", anachronism: true, why: "Les avions à réaction de ligne n'existent que depuis les années 1950." },
                { icon: "🏧", text: "Un distributeur de billets", anachronism: true, why: "Le premier distributeur automatique de billets date de 1967." },
                { icon: "📺", text: "Un écran de télévision", anachronism: true, why: "La télévision ne se diffuse qu'à partir des années 1930-1950." }
            ]
        }
    ];

    return { CAUSES: CAUSES, SCENES: SCENES };
}));
