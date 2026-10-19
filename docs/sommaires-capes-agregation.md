# Sommaires CAPES & Agrégation : sources et points à revérifier

Les 22 thèmes de la catégorie « CAPES & Agrégation » portent un sommaire (`carteMentale`, voir le README).
Deux (Les Amériques, Vivre à la campagne) ont été écrits en premier ; les 20 autres l'ont été d'après les
textes de cadrage du jury (programmes CAPES/CAFEP et agrégation, sessions 2026-2027) quand ils existent.
Ce fichier dit, thème par thème, **ce qui est une question officielle** et ce qui n'est qu'un intitulé maison
(la fiche suit alors l'esprit de la question la plus proche, ce que son champ `esprit` indique).

Points communs à relire avant de s'en servir comme référence unique :
- les chiffres sont donnés de mémoire avec « environ » ou « selon les estimations » quand ils sont incertains ;
- aucun rapport de jury propre à la question n'a pu être lu pour la plupart des thèmes (les textes de cadrage, si) ;
- les fiches suivent le contenu de la frise quand elle se trompe, sauf mention contraire : voir « Écarts avec la frise ».

| Thème | Statut | Cadrage consulté |
|---|---|---|
| `thm_grc` Travailler en Grèce ancienne | question d'agrégation 2026-2027 | programme agrégation 2026 (devenirenseignant.gouv.fr/media/16663) |
| `thm_rome` Rome : République et Empire | libellé officiel du programme CAPES bac+3 2026 | pas de lettre détaillée ; esprit de « Gouverner l'Empire romain de Trajan à 410 » ; la partie République est écrite sans cadrage officiel |
| `thm_grccl` La Grèce classique | libellé du programme CAPES bac+3 ; bornes de la lettre ENS 2024 (Solon 594 – Philippe II 336) | lettre de cadrage ENS (histoire ancienne 2024) |
| `thm_traj` Gouverner l'Empire romain | question CAPES/CAFEP 2024-2027 (commune avec l'agrégation 284-410) | programme 2026-2027 (media/20531) |
| `thm_medi` Méditerranée VIe-XIIIe | question CAPES bac+3 2026 | note de cadrage (libellé seul) |
| `thm_emp` Gouvernement impérial VIIIe-XIe | question d'agrégation 2026 | note de cadrage 22 avril 2025 (media/16663) |
| `thm_eccl` Église, société, pouvoir 910-1274 | question agrégation et CAPES, nouvelle en 2025 | programme CAPES/CAFEP 2026-2027 (media/20531) |
| `thm_feod` Occident médiéval XIe-XVe | programme CAPES bac+3 (reprend la 5e) | programme (media/16785) |
| `thm_renhum` Renaissance, humanisme, réformes | CAPES bac+3 2026-2027 | programme (media/16849), sujet zéro 2025 |
| `thm_rev18` Europe du XVIIIe, Révolution, Empire | CAPES bac+3 2026-2027 | programme (media/16849) |
| `thm_19fr` XIXe siècle français | CAPES bac+3 | programme (media/16785) |
| `thm_colafr` Empire colonial en Afrique 1884-1962 | question CAPES 2025-2027 | lettre de cadrage ; rapport du jury 2025 |
| `thm_20s` XXe siècle | CAPES bac+3 (intitulé abrégé) | note de cadrage 2026 |
| `thm_aut` Régimes et mouvements autoritaires 1918-1939 | question d'agrégation 2027 | lettre de cadrage connue seulement de seconde main (EHNE, Clio-Prépas, Bruneteau) ; URSS exclue du périmètre officiel |
| `thm_littor` Les littoraux français | question CAPES et agrégations 2025-2027 | note de cadrage CAPES/CAFEP (chiffres du cadrage repris) |
| `thm_pacif` Le Pacifique | question 2027 (remplace l'Amérique latine) | lettre de cadrage « Le Pacifique » |
| `thm_geoeur` Europe, frontières, environnement | intitulé maison | « La France » (agrégation 2027), « Frontières » (2023), rubriques CAPES |
| `thm_envgeo` Environnements, Anthropocène | proche de « Environnements : approches géographiques » (CAPES 2026-2027, agrégation 2026) | cadrage complet |
| `thm_geopop` Mondialisation, populations, territoires | intitulé maison | quatre entrées du programme CAPES bac+3 ; rapport du jury CAPES 2025 (généralités) |
| `thm_amlat` Amérique latine | question CAPES 2026 (Caraïbes exclues ; remplacée par « Le Pacifique » en 2027) | programme 2026-2027 |

## Audit factuel (octobre 2026)

Chaque sommaire a été relu affirmation par affirmation (dates, chiffres, noms, lieux, attributions) contre des sources
(Wikipédia, Géoconfluences, Insee, ONU/FAO/HCR, Encyclopædia Universalis, textes de cadrage). Environ 370 corrections ont été
faites dans les fiches ; ce qui n'a pu être confirmé a été **supprimé ou reformulé**, plutôt que gardé « de mémoire ».
80 corrections ont aussi été apportées aux événements de la frise (`data/fr.json`) : dates (ex. Lorris 1155, Kousséri 1900,
Prestige 2002, Chico Mendes 1990, Tokyo devant New York vers 1955…), titres devenus faux (ex. « Interdiction du mariage des
prêtres » → « Condamnation du nicolaïsme par le synode du Latran »), descriptions inexactes. `cola7` (création de l'AEF) est
daté 1908 (gouverneur général et quatre territoires), `cola9` garde 1910 (décret d'organisation).

### Ce qui reste non confirmé par une source

Conservé parce que cohérent avec la frise et l'usage courant, mais non revérifié une à une (le plafond de recherches a été
atteint en cours d'audit) :
- dates « de manuel » de la Révolution et de l'Empire, des guerres mondiales et des indépendances (`rev18`, `20s`) ;
- dates et chiffres de l'entre-deux-guerres (`aut`) : République des conseils hongroise, putsch de Kapp, résultats électoraux de 1933, 400 000 stérilisations, 680 000 exécutions de la Grande Terreur (chiffre du NKVD), 11 % de Rex en 1936 ;
- `geoeur` : lettres de cadrage de « La France » (2027) et « Frontières » (2023), dates des lois d'aménagement ;
- `littor` : Concarneau, Boulogne, Trouville/Deauville, Fos, Côte d'Azur 1882, Le Havre détruit à plus de 80 %, La Grande-Motte 1970 ; puissance des parcs éoliens ;
- `envgeo` : population mondiale, 17 % des terres protégées, Humboldt 1807 ;
- `pacif` : thon, accord Chine–Salomon, populations des territoires français ;
- `geopop` : part de la PAC, Frontex 2004, Dublin 1990, élargissements ; `SOFI 2026` et HCR fin 2025 ne sont attestés que par des synthèses ;
- `amlat` : mégapoles (ONU 2018), organisations d'intégration, Belo Monte ; `am` : vice-royautés, Palmares, présides ;
- `colafr` : étendue de la révolte malgache (1895-1906 ou 1904), femmes touchées par le travail forcé jusqu'en 1927 (rapport du jury) ;
- `camp` : périodisations générales (radio, télévision, coopératives) ;
- datations réellement discutées, laissées telles quelles dans la frise avec nuance dans la fiche : commémoration des défunts à Cluny (`eccl3`), Sorbonne (`feod20`), Halles de Paris (`feod16`), Compagnie de Jésus (`renh31`), 95 thèses (`renh21`), Grande Terreur (`aut70`), pentécosté d'Athènes (`grc61`), Édit de Milan.

## Frise des thèmes (octobre 2026)

La frise des 22 thèmes a été refondue : de 50-72 événements par thème à **93-119** (24 617 événements au total dans le
pack, dont 1 166 ajoutés par cette refonte), avec 34 à 40 incontournables ⭐ par thème. Les sources sont dans
`scripts/capes/` (format et règles dans son README) ; `scripts/build_capes.py` les écrit dans `data/fr.json`.

- **Les événements cités dans les sommaires figurent dans la frise.** Pour chaque fiche, les faits datés des sommaires
  (lois, batailles, publications, chiffres de seuil) qui n'avaient pas d'événement en ont reçu un ; les repères qui
  n'avaient pas d'`eventId` (Potosí, Luanda et la Huronie dans `am` ; la Restauration et les chambres d'agriculture
  dans `camp` ; l'invasion de la Pologne et la disparition de l'URSS dans `20s`) sont maintenant rattachés.
- **Descriptions en trois phrases** : ce qu'est l'événement et son contexte, puis ce qui le rend déterminant pour la
  question, sans formule du type « cet événement compte pour le concours ». La longueur est contrôlée (220 à 760
  caractères).
- **Datations ou titres corrigés au passage** : grande enquête agricole du Second Empire (1866, `c10`), plan Freycinet
  (1879, `c13`), Congrès panafricain de 1919 à la place d'une « Ligue pour la défense » non
  identifiée (`cola23`), AEF 1908 (`cola7`), Grande Terreur 1937 (`aut70`), loi d'orientation de 1960 (`c42`, qui
  n'est pas la loi Pisani), monuments aux morts et Office du crédit agricole séparés (`c27`, `c57`).
- **Un axe ajouté** : `thm_20s` a un axe « Crises, totalitarismes et marche à la guerre (1919-1939) », que son
  sommaire traitait sans axe de frise.
- **Pas de point dans l'Atlas** pour les nouveaux événements, sauf lorsqu'ils sont liés à une fiche déjà localisée.
- **Liens Wikipédia** : les nouveaux événements pointent presque tous sur une recherche (`w/index.php?search=`), qui
  mène à l'article quand le terme est exact et n'invente aucun titre d'article.

### Vérification des chiffres de la frise (octobre 2026)

Les chiffres des descriptions ajoutées ou réécrites ont été confrontés à des sources (Mémorial de Verdun, Insee, Ined,
Commission européenne, ONU, FAO, HCR, ICMP, Amnesty, ZZF Potsdam, Chemins de mémoire, FranceArchives, Cedre, ministères)
pour tous les bilans humains, les effectifs et les seuils des thèmes `geopop`, `camp` et `amlat`, et pour les autres
nombres que contenaient les 22 sources. Corrigés :

- **Bilans humains** : Pylos (plus de 500 morts et disparus, 82 corps, 104 survivants, 750 passagers estimés), Cutro (au moins
  94), Lampedusa (plus de 360 morts, 155 survivants), Guernica (126 à 1 654, le plus probable 250-300), Annual (10 000 à 13 000),
  rue d'Isly (une cinquantaine), Oradour (642 ou 643 selon les décomptes : « plus de 640 »), Congo-Océan (10 000 à 23 000,
  17 000 le plus cité), Le Havre (environ 2 000 civils), Hiroshima (environ 140 000 fin 1945), Grande Terreur (680 000
  exécutions et environ 800 000 envois au Goulag, et non « plus d'un million »), mer du Nord 1953 (1 836 aux Pays-Bas, 28 en
  Belgique), Xynthia (47 en France, dont 29 à La Faute-sur-Mer, deux fiches mises d'accord), séisme de Mexico 1985 (5 000 à plus
  de 10 000), mur de Berlin (au moins 140).
- **Effectifs et seuils** : Sedan (environ 83 000 prisonniers), Exxon Valdez (environ 37 000 tonnes), Lothar et Martin (de
  l'ordre de 140 millions de m³), incendies de Gironde 2022 (près de 30 000 hectares), Potosí (plus de 150 000 habitants vers
  1600), Nouméa 1942 (17 000 Américains à l'arrivée), taux de croissance et fécondité mondiale en 2022 (sous 1 % ; deux humains
  sur trois sous le seuil de renouvellement), loi SRU (1 500 habitants en Île-de-France), Larzac (60 000 à 100 000 en 1973),
  Mexique (plus de 460 000 homicides depuis 2006, tous types confondus), Belo Monte (une des plus puissantes centrales du monde,
  et non « troisième »), Nauru, Conservatoire du littoral, Dunkerque (part française).
- **`camp`** : population rurale (plus de 26 millions, près des trois quarts, entre 1846 et les années 1860), pertes agricoles de
  la Grande Guerre (500 000 à 700 000 tués sur 5,4 millions d'actifs), parc de tracteurs (120 000 en 1949, près d'un million en
  1963), évacués d'Alsace (450 000), communes supprimées par la loi Marcellin (environ 1 100). Le taux d'équipement télévisuel,
  que les sources donnent de 13 % à 30 % pour 1960, n'est plus chiffré.
- **`amlat`, événements récents** : le port de Chancay a été inauguré le 14 novembre 2024 par visioconférence (et non en présence
  de Xi Jinping) ; l'accord Mercosur-UE, conclu le 6 décembre 2024, a été signé à Asunción le 17 janvier 2026, appliqué à titre
  provisoire depuis le 1er mai 2026, après la saisine de la Cour de justice par le Parlement européen (21 janvier) ; la COP30
  de Belém n'a pas retenu de sortie progressive des fossiles et a créé le fonds pour les forêts tropicales (TFFF).
- **Sommaire `geopop`** : les chiffres de la FAO (SOFI 2026 : 645 millions de personnes sous-alimentées en 2025, 7,8 %), du HCR
  (117,8 millions de déplacés de force fin 2025), de l'ONU (304 millions de migrants en 2024) et de la Commission européenne
  (gaz russe : 45 % en 2021, 19 % en 2024) ont été confirmés ; la PAC représente 31 % du budget de l'Union selon le Parlement
  européen (« près d'un tiers »).

Confirmés sans changement : Verdun (163 000 Français et 143 000 Allemands tués ou disparus), Somme (19 240 Britanniques tués le
1er juillet, environ 1,06 million de pertes), Chemin des Dames (environ 30 000 tués en dix jours, selon Jagielski), Srebrenica
(plus de 8 000), Thiaroye (35 morts selon le bilan officiel, jusqu'à 300-400 selon les travaux et le rapport sénégalais de 2025),
Burj Khalifa, Schengen, Dublin, élargissement de 2004 (environ 75 millions d'habitants), Corée du Sud (0,72 en 2023, puis 0,75
en 2024), World Population Prospects 2024 (10,3 milliards vers le milieu des années 2080).

Pas tout vérifié : les chiffres qui ne figurent pas dans cette liste (dates, durées, effectifs de moindre portée) viennent
des sommaires audités ou de manuels et n'ont pas été recoupés un par un. Les points les plus fragiles sont les chiffres
de victimes anciennes (épidémies, séismes, batailles médiévales et modernes), qui restent des ordres de grandeur.
