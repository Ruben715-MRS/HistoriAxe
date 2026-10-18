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

### À revérifier dans la frise

Écrits de mémoire, sans relecture contre une source : les chiffres de victimes et de seuils (Verdun, Somme, Srebrenica,
Thiaroye, rue d'Isly, Oradour, Guernica), les chiffres de population des sommaires de `geopop`, le nombre d'exemplaires et
de délégués de quelques conférences (`20s`, `colafr`), les épisodes récents de `amlat` (COP30 de Belém, accord
Mercosur-Union européenne, port de Chancay) et les effectifs de `camp` (tracteurs, taux d'équipement en télévision,
rappelés de 1956). Les points précis dont l'énoncé est plus fragile ont été formulés avec « environ » ou « selon les
estimations ».
