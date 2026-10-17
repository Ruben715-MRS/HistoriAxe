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
| `thm_rome` Rome : République et Empire | intitulé maison | esprit de « Gouverner l'Empire romain de Trajan à 410 » ; la partie République est écrite sans cadrage officiel |
| `thm_grccl` La Grèce classique | intitulé maison | lettre de cadrage ENS (histoire ancienne 2024) |
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

## Écarts avec la frise (dates ou intitulés à corriger dans `data/fr.json`)

Les sommaires donnent la date juste dans le texte et n'utilisent pas ces événements comme repères.
- `eccl` : Hirsau 1049 (réforme plutôt de la fin du XIe s.), commémoration des défunts à Cluny 1027 (tradition : vers 998), interdiction du mariage des prêtres 1059 (tournant : Latran I 1123 et II 1139).
- `feod` : Lorris 1130 (charte de 1155), Lübeck 1146 (1143, refondée en 1159), serment de Lusignan 1023 (années 1020-1030).
- `traj` : `traj50` Orose 411 (417-418), `traj12` 197 (provinces vers 195-198), `traj36` « accord de Marcianopolis » 376 (le traité de fédération est de 382), `traj27` solidus 312 (antérieur).
- `medi` : `medi45` prise d'Almería 1148 (1147 ; Tortosa 1148).
- `emp` : `emp67` couronnement d'Étienne Ier 998 (vers 1000-1001), `emp38` Charles Martel 714 (715-718).
- `colafr` : `cola13` Kousséri 1899 (22 avril 1900), `cola17` Étoile nord-africaine 1929 (fondée en 1926), `cola7` AEF 1904 (organisée en 1910), `cola39` Houphouët-Boigny 1957 (ministre 1956-1959).
- `amlat` : réserve Chico Mendes 1989 (décret de 1990), accord Mercosur-UE 2019 (accord de principe, non signature), dollarisation de l'Équateur 1999 (décidée en 2000).
- `littor` : `litt42` Prestige 2003 (novembre 2002).
- `geoeur` : retour de l'Alsace-Moselle 1919 (reprise militaire en novembre 1918).
- `envgeo` : Watt 1784 (« perfectionnement » ; brevet de 1769), événement de 1913 au titre tronqué (conférence de Berne ?).
- `geopop` : New York dépassée par Tokyo « dans les années 1960-1970 selon les séries » (frise : 1975).
- `pacif` : Kiribati 2013 (achat finalisé en 2014), `pacf41` au libellé tronqué (convention de Montego Bay ?).
- `rome` : aucune.

## Chiffres et faits à revérifier

Ordres de grandeur donnés avec prudence : effectifs de citoyens athéniens, esclaves de Nicias et de Lysias (`grc`), 30 légions et 80 000 km de routes (`rome`), solidus 72 à la livre (`traj`), chiffres de la peste noire et de Paris vers 1300 (`feod`), dates des sièges de Constantinople (`medi`), bilans de Sétif, Thiaroye, Madagascar 1947 (`colafr`), électorat censitaire et bilan de la Commune (`19fr`), 280 millions de migrants, 730 millions de personnes sous-alimentées (`geopop`), CONADEP, exode vénézuélien (`amlat`), 47 morts de Xynthia, puissances des parcs éoliens (`littor`), 193 essais nucléaires, référendums calédoniens, reconnaissance de Taïwan (`pacif`), zone euro à 21 États et Schengen élargi (`geoeur`), ppm de CO2 et aires protégées (`envgeo`), 36 000 morts de la guerre civile finlandaise, 400 000 stérilisations, 680 000 exécutions de la Grande Terreur (`aut`), bilans des guerres mondiales et du Rwanda (`20s`).
