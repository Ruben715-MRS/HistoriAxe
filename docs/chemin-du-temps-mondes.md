# Le Chemin du Temps — les mondes

> Généré par `node scripts/path_plan.js` à partir de `data/fr.json` (les chiffres suivent le contenu). Les bornes
> des niveaux sont figées dans `js/pathWorlds.js` (`--write`) : voir l'avertissement en tête du script.

## Principes

- **Mondes chrono-thématiques**, sur le modèle des collections Belin (*Mondes anciens*, *Histoire de France*) :
  un monde a des bornes ET des thèmes où puiser. La Grèce et Rome se chevauchent dans le temps ; c'est voulu
  (« diviser le temps est un choix », idée n° 3 du Monde 0).
- **Mondes de plus en plus courts** à mesure que le temps se densifie : 3 millions d'années pour la Préhistoire,
  6 ans pour la Grande Guerre.
- **Une limite des données** : les dates du jeu sont des années. Deux événements de 1916 ne se départagent pas,
  et plusieurs modes ne gardent qu'un événement par année. Un niveau couvre donc au moins 6 années et au plus
  2 événements par année (3 en période dense). Pour les périodes denses, on ne coupe pas plus fin :
  une même tranche donne plusieurs niveaux (« tiers »), du plus connu au plus pointu.
- **Franco-centré assumé** pour le chemin principal (à partir de 481), avec l'Europe et la culture générale en
  contexte ; **îles bonus** facultatives pour le reste du monde, ouvertes à la moitié d'un monde.
- **Taille** : 21 mondes sur le chemin principal (Monde 0 en plus), 5 îles bonus, 195 niveaux (boss compris) hors Monde 0.

## Le chemin principal

### 0. Monde 0 · Le temps des historiens

La périodisation, sur des questions rédigées (`js/pathLessons.js`) : voir le README.

### 1. La Préhistoire

- **Bornes** : 3 300 000 av. J.-C. à 3 300 av. J.-C.
- **Contenu** : 75 événements disponibles (dont 22 incontournables), tous thèmes confondus
- **Niveaux** : 3 + boss
- **Tranches** : 3 300 000 av. J.-C. à 40 000 av. J.-C. (22) ; 40 000 av. J.-C. à 9 600 av. J.-C. (24) ; 9 600 av. J.-C. à 3 300 av. J.-C. (25)
- Petit monde. Dates incertaines : à jouer surtout en ordre (Remise en ordre, Avant/Après) et au Curseur large. Les doublons de dates (Chauvet, Lascaux) ont été harmonisés dans data/fr.json.

### 2. L'Égypte et l'Orient ancien

- **Bornes** : 3 300 av. J.-C. à 800 av. J.-C. — Belin : *L'Égypte des pharaons ; Le Proche-Orient*
- **Contenu** : 108 événements disponibles (dont 34 incontournables), puisés dans 13 thèmes
- **Niveaux** : 6 + boss
- **Tranches** : 3 300 av. J.-C. à 2 650 av. J.-C. (13) ; 2 650 av. J.-C. à 1 971 av. J.-C. (14) ; 1 971 av. J.-C. à 1 550 av. J.-C. (16) ; 1 550 av. J.-C. à 1 273 av. J.-C. (18) ; 1 273 av. J.-C. à 1 020 av. J.-C. (14) ; 1 020 av. J.-C. à 800 av. J.-C. (14)

### 3. La Grèce antique

- **Bornes** : 800 av. J.-C. à 322 av. J.-C. — Belin : *La Grèce classique (510-336)*
- **Contenu** : 136 événements disponibles (dont 62 incontournables), puisés dans 4 thèmes
- **Niveaux** : 8 + boss
- **Tranches** : 800 av. J.-C. à 594 av. J.-C. (16) ; 594 av. J.-C. à 499 av. J.-C. (14) ; 499 av. J.-C. à 462 av. J.-C. (14) ; 462 av. J.-C. à 438 av. J.-C. (15) ; 438 av. J.-C. à 415 av. J.-C. (14) ; 415 av. J.-C. à 399 av. J.-C. (15) ; 399 av. J.-C. à 350 av. J.-C. (14) ; 350 av. J.-C. à 322 av. J.-C. (15)

### 4. Rome, naissance d'un empire

- **Bornes** : 753 av. J.-C. à 26 av. J.-C. — Belin : *Rome, naissance d'un empire (753-70)*
- **Contenu** : 119 événements disponibles (dont 32 incontournables), puisés dans 5 thèmes
- **Niveaux** : 7 + boss
- **Tranches** : 753 av. J.-C. à 509 av. J.-C. (14) ; 509 av. J.-C. à 445 av. J.-C. (15) ; 445 av. J.-C. à 264 av. J.-C. (16) ; 264 av. J.-C. à 168 av. J.-C. (18) ; 168 av. J.-C. à 88 av. J.-C. (13) ; 88 av. J.-C. à 46 av. J.-C. (17) ; 46 av. J.-C. à 26 av. J.-C. (14)

### 5. Rome, la fin d'un empire

- **Bornes** : 26 av. J.-C. à 476 — Belin : *Rome, la fin d'un empire (212-fin du Ve s.)*
- **Contenu** : 225 événements disponibles (dont 72 incontournables), puisés dans 8 thèmes
- **Niveaux** : 8 + boss
- **Tranches** : 26 av. J.-C. à 63 (27) ; 64 à 109 (25) ; 110 à 192 (26) ; 193 à 269 (20) ; 270 à 319 (23) ; 320 à 363 (16) ; 364 à 407 (22) ; 408 à 476 (17)

### 6. La France avant la France

- **Bornes** : 481 à 887 — Belin : *La France avant la France (481-888)*
- **Contenu** : 302 événements disponibles (dont 82 incontournables), puisés dans 113 thèmes
- **Niveaux** : 8 + boss
- **Tranches** : 481 à 536 (24) ; 537 à 609 (25) ; 610 à 671 (32) ; 672 à 717 (24) ; 718 à 761 (21) ; 762 à 799 (21) ; 800 à 849 (26) ; 850 à 887 (28)

### 7. Féodalités

- **Bornes** : 888 à 1179 — Belin : *Féodalités (888-1180)*
- **Contenu** : 321 événements disponibles (dont 96 incontournables), puisés dans 113 thèmes
- **Niveaux** : 8 + boss
- **Tranches** : 888 à 954 (28) ; 955 à 999 (31) ; 1000 à 1019 (16) ; 1020 à 1058 (30) ; 1059 à 1087 (26) ; 1088 à 1112 (24) ; 1113 à 1146 (28) ; 1147 à 1179 (30)

### 8. L'âge d'or capétien

- **Bornes** : 1180 à 1327 — Belin : *L'âge d'or capétien (1180-1328)*
- **Contenu** : 243 événements disponibles (dont 60 incontournables), puisés dans 113 thèmes
- **Niveaux** : 6 + boss
- **Tranches** : 1180 à 1199 (19) ; 1200 à 1213 (16) ; 1214 à 1234 (28) ; 1235 à 1263 (32) ; 1264 à 1290 (28) ; 1291 à 1327 (31)

### 9. Le temps de la guerre de Cent Ans

- **Bornes** : 1328 à 1452 — Belin : *Le temps de la guerre de Cent Ans (1328-1453)*
- **Contenu** : 191 événements disponibles (dont 49 incontournables), puisés dans 113 thèmes
- **Niveaux** : 7 + boss
- **Tranches** : 1328 à 1346 (20) ; 1347 à 1364 (21) ; 1365 à 1385 (17) ; 1386 à 1404 (17) ; 1405 à 1418 (12) ; 1419 à 1435 (16) ; 1436 à 1452 (16)

### 10. Les Renaissances

- **Bornes** : 1453 à 1558 — Belin : *Les Renaissances (1453-1559)*
- **Contenu** : 373 événements disponibles (dont 124 incontournables), puisés dans 113 thèmes
- **Niveaux** : 8 + boss
- **Tranches** : 1453 à 1475 (25) ; 1476 à 1493 (25) ; 1494 à 1508 (22) ; 1509 à 1518 (17) ; 1519 à 1528 (19) ; 1529 à 1535 (13) ; 1536 à 1545 (18) ; 1546 à 1558 (21)

### 11. Les guerres de Religion

- **Bornes** : 1559 à 1628 — Belin : *Les guerres de Religion (1559-1629)*
- **Contenu** : 253 événements disponibles (dont 73 incontournables), puisés dans 113 thèmes
- **Niveaux** : 7 + boss
- **Tranches** : 1559 à 1568 (17) ; 1569 à 1577 (13) ; 1578 à 1587 (15) ; 1588 à 1599 (18) ; 1600 à 1606 (13) ; 1607 à 1615 (16) ; 1616 à 1628 (21)

### 12. Les rois absolus

- **Bornes** : 1629 à 1714 — Belin : *Les rois absolus (1629-1715)*
- **Contenu** : 304 événements disponibles (dont 75 incontournables), puisés dans 113 thèmes
- **Niveaux** : 8 + boss
- **Tranches** : 1629 à 1639 (19) ; 1640 à 1648 (15) ; 1649 à 1657 (18) ; 1658 à 1666 (18) ; 1667 à 1678 (22) ; 1679 à 1688 (18) ; 1689 à 1702 (18) ; 1703 à 1714 (19)

### 13. La monarchie des Lumières

- **Bornes** : 1715 à 1788 — Belin : *La monarchie des Lumières (1715-1789)*
- **Contenu** : 247 événements disponibles (dont 57 incontournables), puisés dans 113 thèmes
- **Niveaux** : 7 + boss
- **Tranches** : 1715 à 1726 (18) ; 1727 à 1744 (25) ; 1745 à 1753 (17) ; 1754 à 1762 (15) ; 1763 à 1772 (19) ; 1773 à 1782 (18) ; 1783 à 1788 (12)

### 14. Révolution, Consulat, Empire

- **Bornes** : 1789 à 1814 — Belin : *(1789-1815)*
- **Contenu** : 239 événements disponibles (dont 70 incontournables), puisés dans 113 thèmes
- **Niveaux** : 6 + boss (3 tranches × 2 niveaux, du plus connu au plus pointu)
- **Tranches** : 1789 à 1794 (17) ; 1795 à 1803 (27) ; 1804 à 1814 (33)
- ⚠️ Une tranche a moins de 24 événements jouables : les derniers niveaux seront plus courts.

### 15. La Révolution inachevée

- **Bornes** : 1815 à 1869 — Belin : *La Révolution inachevée (1815-1870)*
- **Contenu** : 467 événements disponibles (dont 136 incontournables), puisés dans 113 thèmes
- **Niveaux** : 10 + boss (5 tranches × 2 niveaux, du plus connu au plus pointu)
- **Tranches** : 1815 à 1827 (37) ; 1828 à 1839 (36) ; 1840 à 1849 (30) ; 1850 à 1858 (27) ; 1859 à 1869 (33)

### 16. La République et les empires

- **Bornes** : 1870 à 1913 — Belin : *(1870-1914)*
- **Contenu** : 494 événements disponibles (dont 134 incontournables), puisés dans 113 thèmes
- **Niveaux** : 8 + boss (4 tranches × 2 niveaux, du plus connu au plus pointu)
- **Tranches** : 1870 à 1881 (36) ; 1882 à 1893 (36) ; 1894 à 1904 (33) ; 1905 à 1913 (27)

### 17. La Grande Guerre

- **Bornes** : 1914 à 1919 (jusqu'à 1919) — Belin : *Les grandes guerres (1914-1945), première moitié*
- **Contenu** : 185 événements disponibles (dont 59 incontournables), puisés dans 113 thèmes
- **Niveaux** : 3 + boss (1 tranche × 3 niveaux, du plus connu au plus pointu)
- **Tranches** : 1914 à 1919 (18)
- ⚠️ Une tranche a moins de 36 événements jouables : les derniers niveaux seront plus courts.
- Étendu jusqu'à 1919 : le traité de Versailles est la fin officielle de la guerre (l'armistice de 1918 n'en est que la fin des combats). Une seule tranche de 6 ans : trois niveaux qui creusent de plus en plus.

### 18. De l'entre-deux-guerres à 1945

- **Bornes** : 1920 à 1945 — Belin : *Les grandes guerres (1914-1945), seconde moitié*
- **Contenu** : 651 événements disponibles (dont 147 incontournables), puisés dans 113 thèmes
- **Niveaux** : 6 + boss (3 tranches × 2 niveaux, du plus connu au plus pointu)
- **Tranches** : 1920 à 1930 (33) ; 1931 à 1939 (27) ; 1940 à 1945 (18)
- ⚠️ Une tranche a moins de 24 événements jouables : les derniers niveaux seront plus courts.

### 19. Guerre froide et Trente Glorieuses

- **Bornes** : 1946 à 1973
- **Contenu** : 649 événements disponibles (dont 140 incontournables), puisés dans 113 thèmes
- **Niveaux** : 6 + boss (3 tranches × 2 niveaux, du plus connu au plus pointu)
- **Tranches** : 1946 à 1954 (27) ; 1955 à 1963 (27) ; 1964 à 1973 (30)

### 20. Crises et fin de la guerre froide

- **Bornes** : 1974 à 1991
- **Contenu** : 337 événements disponibles (dont 69 incontournables), puisés dans 113 thèmes
- **Niveaux** : 4 + boss (2 tranches × 2 niveaux, du plus connu au plus pointu)
- **Tranches** : 1974 à 1982 (27) ; 1983 à 1991 (27)

### 21. Le monde depuis 1991

- **Bornes** : 1992 à 2026 (jusqu'à 2026)
- **Contenu** : 665 événements disponibles (dont 86 incontournables), puisés dans 113 thèmes
- **Niveaux** : 8 + boss (4 tranches × 2 niveaux, du plus connu au plus pointu)
- **Tranches** : 1992 à 1999 (24) ; 2000 à 2007 (24) ; 2008 à 2016 (27) ; 2017 à 2026 (28)

## Les îles bonus (facultatives)

### A. La Chine impériale

- **Bornes** : 2 000 av. J.-C. à 1911
- **Contenu** : 217 événements disponibles (dont 97 incontournables), puisés dans 4 thèmes
- **Niveaux** : 6 + boss — **île** : s'ouvre à la moitié de « La Grèce antique »
- **Tranches** : 2 000 av. J.-C. à 250 av. J.-C. (36) ; 250 av. J.-C. à 104 (33) ; 105 à 625 (31) ; 626 à 1166 (37) ; 1167 à 1591 (34) ; 1592 à 1911 (35)

### B. Les Amériques précolombiennes

- **Bornes** : 2 000 av. J.-C. à 1599
- **Contenu** : 114 événements disponibles (dont 70 incontournables), puisés dans 3 thèmes
- **Niveaux** : 5 + boss — **île** : s'ouvre à la moitié de « La France avant la France »
- **Tranches** : 2 000 av. J.-C. à 899 (22) ; 900 à 1437 (18) ; 1438 à 1499 (16) ; 1500 à 1523 (14) ; 1524 à 1599 (19)

### C. L'Islam et l'Empire ottoman

- **Bornes** : 570 à 1923
- **Contenu** : 200 événements disponibles (dont 57 incontournables), puisés dans 4 thèmes
- **Niveaux** : 6 + boss — **île** : s'ouvre à la moitié de « Féodalités »
- **Tranches** : 570 à 655 (26) ; 656 à 934 (32) ; 935 à 1325 (34) ; 1326 à 1525 (30) ; 1526 à 1838 (33) ; 1839 à 1923 (35)

### D. Le Japon

- **Bornes** : 700 av. J.-C. à 2026 (jusqu'à 2026)
- **Contenu** : 124 événements disponibles (dont 60 incontournables), puisés dans 2 thèmes
- **Niveaux** : 5 + boss — **île** : s'ouvre à la moitié de « Les Renaissances »
- **Tranches** : 700 av. J.-C. à 711 (23) ; 712 à 1542 (26) ; 1543 à 1852 (25) ; 1853 à 1939 (24) ; 1940 à 2026 (26)

### E. Histoires d'Afrique

- **Bornes** : 3 000 av. J.-C. à 1962 (jusqu'à 1962)
- **Contenu** : 572 événements disponibles (dont 95 incontournables), puisés dans 53 thèmes
- **Niveaux** : 5 + boss — **île** : s'ouvre à la moitié de « La République et les empires »
- **Tranches** : 3 000 av. J.-C. à 1497 (110) ; 1498 à 1835 (107) ; 1836 à 1897 (79) ; 1898 à 1942 (69) ; 1943 à 1962 (38)
- S'arrête aux indépendances : après 1962, les thèmes africains ne racontent presque que des coups d'État et des constitutions, trop répétitifs pour des niveaux.
