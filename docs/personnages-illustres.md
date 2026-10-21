# Personnages illustres : biographies, panthéons et portraits

> Journal détaillé, extrait du README : conception, règles de contenu et décisions pays par pays.
> Le README n'en garde que l'essentiel (voir « Personnages illustres »).


« Biographies » n'est plus une catégorie à part : c'est la première des deux
sous-catégories de **Personnages illustres**, l'autre étant **Panthéons**. Elles
ne posent pas la même question :

| | Un thème, c'est | Une date, c'est | On le joue par |
|---|---|---|---|
| **Biographies** | une vie (360 thèmes, en 12 domaines) | une étape de cette vie | étape de la vie |
| **Panthéons** | un pays, ou une région qui en rassemble plusieurs (la France, la Chine, l'Égypte, l'Espagne, les États-Unis, l'Italie, le Royaume-Uni, l'Amérique hispanique, le Maghreb, le Machrek et la péninsule Arabique, l'Allemagne, l'Autriche et la Suisse, la Scandinavie, l'Afrique de l'Ouest, l'Afrique centrale, le sous-continent indien, Israël, la Turquie, le Japon, la Russie, l'Australie, le Canada, le Benelux, le Portugal, l'Asie centrale et l'Afghanistan, la Nouvelle-Zélande et le Pacifique, le Brésil, l'Iran, les Balkans, les pays baltes, l'Afrique du Sud, l'Éthiopie, l'Afrique de l'Est et la Corne, l'Afrique australe, l'océan Indien occidental, l'Indonésie, le monde malais, les Philippines, le Vietnam-Cambodge-Laos, la Thaïlande et la Birmanie, la Mongolie, la Corée, la Pologne, l'Europe centrale, la Caraïbe non hispanique, l'Irlande, Malte, Chypre) | la naissance d'un personnage | domaine |

Le déplacement ne coûte aucune migration : les 360 thèmes gardent leurs
identifiants, et rien de ce que le joueur a sauvegardé (favoris, révision,
SRS, scores) ne retient une position dans l'arbre — tout passe par des
identifiants de thème ou d'événement.

### Panthéons

Un thème par pays, nommé « Grandes figures de… » et identifié `pan_<iso2>`
(`pan_fr`), ou par **bloc** de pays (voir plus bas). Le nom d'un pays seul
(« France ») serait ambigu dès qu'on sort de l'arborescence — favoris,
historique, bouton « Jouer sur ce thème » du Défi du jour — où il voisinerait
avec « Histoire de France ».

Chaque événement est **la naissance d'un personnage**, daté de son année de
naissance, titré « Naissance de X ». Le titre dit ce que la date représente,
ce qu'un simple « Victor Hugo — 1802 » ne ferait pas hors du thème (Défi du
jour, Révision, Blitz).

### Galerie des portraits

Sous les tuiles « Biographies » et « Panthéons », un bouton doré pleine largeur,
« Galerie des portraits », qui n'est ni une sous-catégorie ni un mode de jeu
(`js/gallery.js`). Il déplie trois choix — « Ordre alphabétique », « Par nom de
famille » et « Ordre chronologique » — qui ouvrent un trombinoscope de **toutes
les figures des panthéons qui ont un portrait** (`screen-gallery`) : une carte par
personne (portrait, nom, drapeau, année de naissance), rangées par initiale ou par
siècle de naissance.

- **Trois ordres.** L'alphabétique suit le nom tel qu'on l'écrit (Victor Hugo à V,
  « le Caravage » à C) ; « par nom de famille » suit le champ `classement` des
  données (Hugo à H, de Gaulle à G, Louis XIV à L) ; le chronologique regroupe par
  siècle de naissance. À nom égal, la date de naissance départage. Une bascule en
  tête d'écran change d'ordre sans revenir en arrière.
- **Recherche et filtres.** Une recherche par nom (sans accent, chaque mot dans
  n'importe quel ordre : « hugo victor » trouve Victor Hugo), et deux listes — pays
  et domaine — qui annoncent leur effectif (« France (140) »). « Tout effacer » les
  remet à zéro, et le décompte devient « 12 portraits sur 970 ».
- **La fiche.** Un visage ouvre la fiche de sa naissance (`openModal`), d'où l'on
  passe au portrait voisin **dans l'ordre affiché** — boutons, flèches du clavier ou
  glissement franchement horizontal, arrêt aux extrémités — et qui porte deux accès
  au jeu : « Jouer sur sa biographie » quand le personnage en a une, et « Jouer sur
  « Grandes figures de… » » pour son panthéon.
- **Le retour.** Une partie lancée depuis la fiche ramène à la galerie, à la même
  hauteur, avec la même recherche, le même ordre et les mêmes filtres. Le périmètre
  de la galerie est retenu à part (`galleryScope`) : lancer une partie (`openThemeAt`)
  écrase la sélection de catégorie, et la galerie, sans ce repère, s'affichait vide
  au retour. Le retour ne survit pas à un détour par l'arbre des catégories
  (`showScreen` l'efface).
- **Une pastille 📖** dans l'angle de la photo signale une biographie disponible. Posée
  par-dessus l'image, elle n'ajoute rien à la carte : avec ou sans, le gabarit est le
  même.

Rien n'y est figé : la galerie se lit dans `bdd` à l'affichage. Un panthéon ajouté y
entre de lui-même, et un pack de langue sans « Panthéons » n'affiche pas le bouton. Le
nom vient du titre (« Naissance de X » → « X » ; « Naissance du Caravage » → « le
Caravage »), le drapeau du champ `pays` ou, à défaut, du code du thème (`pan_fr`).

### Le nom de classement

Le champ `classement` de chaque personnage (« Hugo, Victor », « Gaulle, Charles de »,
« Louis XIV ») sert à trier « par nom de famille » et à choisir l'initiale d'un
intertitre ; il ne s'affiche jamais. Aucune règle ne devine un nom de famille — « Léonard de
Vinci », « Gabriel García Márquez », « Abd el-Kader », « Louis XIV » — d'où
`scripts/pantheon_classement.py` : une règle générale (« Prénom Nom » → « Nom, Prénom »,
particules minuscules à la fin) et une table d'exceptions relue nom par nom (souverains
et saints rangés par prénom, noms arabes à article, surnoms, doubles noms espagnols).
`build_pantheon.py` exige le champ et refuse un classement qui contient un mot absent du
nom, pour qu'une faute de frappe ne range pas un personnage sous une mauvaise initiale.
Un nouveau panthéon passe d'abord par `python3 scripts/pantheon_classement.py --write` ;
ce qui sort étonnant s'ajoute aux exceptions.

### Collection de portraits

Les portraits peuvent se **débloquer** : en noir et blanc tant que le personnage n'a pas
été rencontré en jeu, puis en couleur. « Rencontré » veut dire qu'une fiche existe pour son
événement dans le suivi de révision (`srsLoad`) — quel que soit le mode, réponse juste ou
ratée, la même définition que pour les événements « rencontrés » du Défi de simultanéité.
Lire une fiche dans la galerie ne débloque rien. Un compteur « 30 / 970 portraits
débloqués » et sa barre ouvrent la galerie, et le bouton de « Personnages illustres »
annonce l'avancement.

Rien de cela n'est imposé : certains joueurs veulent s'instruire sans progression ni
compétition. Le réglage `portraitCollection` (`'bw'`, `'color'`, ou `null` tant que la question
n'a pas été posée ; propre à l'appareil, comme l'apparence) se décide à la première ouverture
de « Personnages illustres », par une fenêtre qui explique et propose « Débloquer mes
portraits » ou « Tout voir en couleur ». La croix et Échap valent « en couleur », le fond ne
ferme pas la fenêtre, et la question n'est jamais reposée. Le choix se change à tout moment,
depuis la galerie ou depuis les Réglages. Les parcours de bout en bout partent d'un choix
déjà fait (`e2e/fixtures.js`), sans quoi la fenêtre intercepterait leurs clics.

### Pays et blocs : « un personnage ne figure que dans un seul thème »

Un thème par pays marche tant que les pays ne partagent pas leurs figures.
En Amérique hispanique, ils les partagent presque toutes : Bolívar est
vénézuélien, mais aussi colombien, équatorien, péruvien et bolivien ; San
Martín, argentin, chilien et péruvien. Vingt panthéons nationaux auraient
répété les mêmes vingt noms. D'où une règle, tenue **entre** tous les
panthéons : **un personnage ne figure que dans un seul thème** — et, quand
des pays ont une histoire commune, un thème **de région** plutôt qu'un par pays.

| | Pays | Bloc |
|---|---|---|
| Identifiant | `pan_<iso2>` : deux lettres (`pan_fr`) | `pan_<code>` : trois lettres ou plus (`pan_hispam`) — jamais de collision avec un code de pays |
| `pays` sur chaque événement | interdit (le thème le dit déjà), sauf pour un **invité** d'un autre État (Monaco chez la France, voir « Les micro-États ») | obligatoire : code ISO à deux lettres (`"pays": "VE"`) |
| Exemples | France, Égypte, Espagne, États-Unis, Italie, Royaume-Uni, Israël, Portugal, Brésil, Iran | Amérique hispanique, Maghreb, Machrek, Allemagne-Autriche-Suisse, Scandinavie |

Ce que le champ `pays` d'un événement change :

- **la fiche** affiche le drapeau et le nom du pays sous la date (`renderModalCountry`,
  qui réutilise `isoToFlagEmoji` et `countryDisplayName` du Mode Carte :
  `Intl.DisplayNames`, aucune table de noms à maintenir) ;
- **« Pendant ce temps, ailleurs… »** : l'étiquette de lieu de l'événement est
  son pays (`Simultaneity.eventTag`), faute de quoi un événement vénézuélien
  passerait pour « ailleurs » face à la naissance de Bolívar à Caracas ;
- **la recherche** (`motsCles` du thème, ci-dessous) n'en dépend pas.

Le thème d'un bloc porte aussi des `motsCles` : les noms de ses pays (et des
mots comme « Amérique latine »), que le nom du thème ne dit pas. La recherche de
thèmes (`onThemeSearchInput`) les parcourt, si bien que « mexique » mène à
« Grandes figures d'Amérique hispanique ».

**Départager un personnage entre deux pays** : celui qui l'honore le plus, pas
celui de l'état civil. Camus (né en Algérie) et Marie Curie (née à Varsovie)
restent en France ; Che Guevara est rangé en Argentine, où il est né, la fiche
disant ce que Cuba lui doit. Joséphine Baker, née à Saint-Louis (Missouri),
naturalisée française en 1937 et entrée au Panthéon de Paris en 2021, est au
panthéon de la France, non à celui des États-Unis. Les cas disputés sont écrits
comme tels dans la description (Atahualpa : Quito ou Cuzco).

**Seules des personnalités disparues** : le format de la phrase d'ouverture
exige une année de décès, et un panthéon de vivants se démodera.

**Des dates avérées et une illustration** : la note d'information des Panthéons le dit au joueur. Une
personnalité n'entre que si ses dates de naissance et de décès sont avérées, ou communément admises par
des sources solides (d'où l'absence d'Homère, de Laozi ou d'Ésope), et si une illustration libre existe
(d'où les figures écartées « faute d'image »).

**Les sportifs : une exception, pas une règle.** Un sportif n'entre au panthéon que
si son nom dépasse le sport : il a porté l'image de son pays dans le monde (Maradona,
Beckenbauer), marqué l'histoire (Owens aux Jeux de Berlin) ou posé un acte politique
dont on se souvient (Ali refusant la guerre du Viêt Nam, Schmeling et Bartali face au
nazisme et au fascisme). Les records seuls ne suffisent pas : ils restent aux
Biographies. Le sportif est rangé en « Musique, spectacle et sport », et la règle des
morts s'applique à lui comme aux autres : Tommie Smith et John Carlos, dont le poing
levé à Mexico en 1968 serait un cas d'école, sont vivants et restent donc dehors. Lev Yachine (seul gardien Ballon d'or) est au panthéon de la
Russie.

**Six axes communs, et un septième là où il se justifie.** La palette n'a que huit
couleurs (`AXIS_PALETTE`) : six axes laissent de la marge, sept la gardent. Littérature
et philosophie sont fusionnées, parce que leur frontière est floue (Voltaire,
Rousseau, Camus) ; peinture et musique restent séparées, parce que la leur est nette.
Les axes sont déclarés par panthéon (`axes`, dans `scripts/pantheon/<code>.json`) : rien
n'oblige deux panthéons à les partager.

Le septième, **« Économie et entreprise »** (fondateurs et dirigeants d'entreprises,
banquiers, marchands), n'existe que pour la France, les États-Unis, le Royaume-Uni et le bloc
Allemagne-Autriche-Suisse, où les entrepreneurs sont assez nombreux pour former un axe
(sept, neuf, dix et huit figures).
**Règle : un axe de plus n'est créé que s'il a au moins six figures et une histoire
propre** ; l'Égypte, l'Espagne, l'Italie, le Maghreb et l'Amérique hispanique n'en ont pas, faute de
candidats évidents (pour l'Espagne, Güell, Comillas, Salamanca et March ne font pas six). Le sport n'a pas d'axe — une poignée de figures par pays — mais il est
accueilli dans « Musique, spectacle et sport », pour les sportifs de portée historique
(voir « Les sportifs : une exception, pas une règle »).

| Axe | Contenu | France | États-Unis |
|---|---|---|---|
| Chefs d'État et dirigeants | souverains, présidents, chefs de gouvernement | 37 | 21 |
| Guerres et résistances | chefs militaires, résistants, héros d'indépendance, combats pour les droits | 20 | 24 |
| Littérature et pensée | écrivains, poètes, philosophes | 39 | 25 |
| Beaux-arts | peinture, sculpture, architecture | 19 | 12 |
| Musique, spectacle et sport | compositeurs, interprètes, cinéma, théâtre, sport | 20 | 22 |
| Sciences, techniques et innovation | savants, ingénieurs, inventeurs, explorateurs | 23 | 16 |
| Économie et entreprise | fondateurs d'entreprises, industriels, banquiers, marchands | 12 | 9 |

Les règles de rédaction, vérifiées par script et par test (voir plus bas) :

- **Un personnage, un axe** : sa dimension dominante, comme dans les
  Biographies, dont le classement est repris. **Une exception assumée :
  Napoléon**, rangé chez les Chefs d'État (il fut empereur) alors que sa
  biographie le range chez les chefs militaires.
- **« Illustre » ne veut pas dire « né dans les frontières actuelles »** :
  Marie Curie, née à Varsovie, et Jean-Jacques Rousseau, né à Genève,
  appartiennent au panthéon de la France qui les a adoptés. Le pays d'un
  panthéon est celui qui honore, pas celui de l'état civil.
- **Description en trois phrases**, la première « Nom (naissance-décès) est… »,
  avec « vers » devant une année incertaine (Charlemagne, Hugues Capet) et
  « av. J.-C. » une fois, à la fin : « Vercingétorix (vers 82-46 av. J.-C.) ».
  Une vie qui enjambe l'ère chrétienne (Auguste, Ovide) dit les deux ères : « 63
  av. J.-C.-14 ap. J.-C. » (voir plus bas, l'Italie).
  **L'année entre parenthèses doit être celle de l'événement** : sur soixante
  fiches, la faute de frappe est l'erreur la plus probable.
- **Une personne ne naît pas deux fois.** Les 29 personnages qui ont aussi une
  biographie (champ `biographie`, qui nourrit le bouton « Voir sa biographie »
  de la fiche) doivent porter la *même* date. Les dates des soixante et une premières ont été
  comparées une à une à la phrase d'ouverture de l'article Wikipédia, celles des 72 figures
  ajoutées ensuite (voir « La France, de 68 à 140 figures ») au résumé de leur article.
- **⭐ Incontournables** (`essentiel`) : 42 sur 170 pour la France, 39 sur 129 pour les États-Unis,
  56 sur 149 pour l'Allemagne, l'Autriche et la Suisse, 51 sur 151 pour le Royaume-Uni, 36 sur 132 pour l'Espagne.

Quantités visées : 68 personnages pour la France (portés à 170, voir plus bas), 52 pour l'Égypte, 129 pour les
États-Unis (85 proposés, portés à 123 : « mieux vaut plus que moins », puis à 129 avec l'axe Économie et entreprise), 127 pour
l'Italie (126 proposés, plus Enzo Ferrari), 80 à 100
pour l'Amérique hispanique (dix-neuf pays, de 1 à 19 figures chacun), 58 pour le
Maghreb (cinq pays, de 1 à 21), 149 pour l'Allemagne, l'Autriche et la Suisse (170 candidats,
21 coupés ; trois pays, de 26 à 85 figures), 151 pour le Royaume-Uni (194 candidats, 4 ajoutés, 47 écartés), 132 pour l'Espagne (132 proposés, tous retenus),
103 pour le Machrek et la péninsule Arabique (182 noms testés, 106 avec une image libre, 3 en attente de leur portrait ; dix pays, de 1 à 25 figures),
127 pour le sous-continent indien (262 noms testés, 129 fiches rédigées, 127 avec une image libre ; sept pays, de 2 à 77 figures),
83 pour Israël (93 fiches rédigées, dix mises en attente faute d'image libre),
40 pour les grands pays, 30 pour les autres. À 6
axes, 30 donne environ 5 par axe — le minimum pour qu'un axe joué seul reste un jeu.

### Le premier bloc : l'Amérique hispanique

`pan_hispam`, « Grandes figures d'Amérique hispanique » : **99 personnages de
19 pays** — Mexique 19, Argentine 15, Chili 8, Venezuela 8, Cuba 7, Pérou 7,
Colombie 6, Uruguay 5, Équateur 4, Bolivie, Nicaragua et Paraguay 3 chacun,
Costa Rica, Guatemala, Honduras et Porto Rico 2 chacun, et un seul pour le Panama, le
Salvador et la République dominicaine. Par axe : 27 Guerres et
résistances, 24 Littérature et pensée, 22 Chefs d'État, 10 Beaux-arts, 11
Musique, spectacle et sport, 5 Sciences, techniques et innovation (l'axe le plus mince — voir
plus bas pourquoi) ; 32 ⭐ et 19 biographies liées.

Les choix qui ne vont pas de soi :

- **« Hispanique », et non « latine »** : le Brésil, d'une autre langue et d'une
  autre histoire, a son propre thème (voir « Un pays à part : le Brésil ») ; Haïti ou le Belize n'ont pas leur
  place dans une région qu'unit l'espagnol.
- **Le Mexique pèse près d'un cinquième** (19 sur 97), l'Argentine suit avec
  14 : un bloc se tient à la population et au rôle historique, pas à
  l'égalité des pays. Le constructeur ne prévient que lorsqu'un pays dépasse
  40 % du bloc.
- **Six figures d'avant la Conquête ou de ses premières années** (Pakal,
  Nezahualcóyotl, Moctezuma II, Cuauhtémoc, Pachacútec, Atahualpa) et trois
  chefs de la résistance indienne (Lautaro, Túpac Amaru II, Túpac Katari) :
  les peuples d'avant l'Espagne ne sont pas un prologue. Leurs images sont
  d'époque coloniale ou plus tardives, et les légendes le disent.
- **Un personnage, un pays — celui qui l'honore le plus.** Che Guevara
  (Rosario) et le pape François sont argentins, Carlos Gardel aussi (Toulouse
  ou Tacuarembó : la querelle est écrite telle quelle dans sa fiche) ;
  Bolívar est vénézuélien, bien que cinq pays le tiennent pour leur libérateur.
- **Pas de vivants** (la phrase d'ouverture exige une année de décès), ni entrepreneurs ;
  les sportifs seulement s'ils passent la règle des sportifs (Maradona, Clemente).

### Ce que les images ont écarté

La règle « libre aussi aux États-Unis » (plus bas) coûte plus cher en
Amérique latine qu'en France : nombre de photographies du milieu du XXe siècle
y avaient une durée de protection très courte (20 ans en Argentine et en
Italie, 25 à Cuba, 25 à 50 ans en Finlande), ce qui les rend « domaine public »
pour Commons — mais seules celles qui l'étaient déjà en 1996 l'étaient aussi aux
États-Unis ; les autres y ont été rétablies. Faute d'image libre, **huit figures
prévues ont été retirées** de la liste de départ (99 noms), et six autres
les ont remplacées pour tenir les pays et les axes :

| Retiré | Pourquoi | Remplacé par |
|---|---|---|
| Luis Federico Leloir, César Milstein | photographies argentines sans balise américaine, ou postérieures à 1975 | José Gregorio Hernández (Venezuela, sciences) |
| Roberto Matta | seule une photographie de fresque murale, œuvre protégée, est sous licence libre | Claudio Arrau (Chili, musique) |
| Jorge Eliécer Gaitán | photographies colombiennes de 1936 et de 1948, rétablies aux États-Unis | Antonio Nariño (Colombie) |
| Julia de Burgos | seulement une photographie de statue | Ramón Emeterio Betances (Porto Rico) |
| Jesús Soto | aucun portrait exploitable | Arturo Michelena (Venezuela, beaux-arts) |
| Víctor Jara | la seule photographie solide est finlandaise, de 1969 : libre en Finlande, rétablie aux États-Unis | — (le Chili compte 8 figures) |
| Jacobo Árbenz | portraits officiels guatémaltèques de 1951, dans le même cas | Justo Rufino Barrios (Guatemala) |

Florentino Ameghino a aussi été écarté, pour un autre motif : sa naissance est
disputée (Luján en 1854, ou Moneglia en 1853 selon sa propre lettre), et une
date contestée n'a rien à faire dans une question de chronologie. Eugenio María
de Hostos, envisagé pour Porto Rico, n'a pas d'article en français vers lequel
renvoyer. Si une image convenable apparaît pour l'un d'eux, il se réintègre en
ajoutant sa fiche à `scripts/pantheon/hispam.json`.

### Le deuxième bloc : le Maghreb

`pan_maghreb`, « Grandes figures du Maghreb » : **58 personnages de cinq pays** —
Algérie 21, Maroc 16, Tunisie 16, Libye 4 et Mauritanie 1 — de Hannibal
(247 av. J.-C.) à Tahar Djaout (1953). Par axe : 18 Littérature et pensée, 17
Chefs d'État et dirigeants, 9 Guerres et résistances, 9 Musique, spectacle et sport, 3
Sciences, techniques et innovation, 2 Beaux-arts (les deux axes les plus minces : la
plupart des peintres et des savants envisagés n'avaient pas de portrait libre) ;
22 ⭐ et 3 biographies liées (Hannibal, Ibn Khaldun, Ibn Battûta).

Les choix qui ne vont pas de soi :

- **Cinq pays, comme l'Union du Maghreb arabe.** La Libye et la Mauritanie,
  qui n'auraient jamais eu assez de figures pour un thème à elles, restent dans
  le bloc : quatre Libyens (Septime Sévère, Omar al-Mokhtar, Idris Ier,
  Kadhafi) et un Mauritanien (Moktar Ould Daddah). Les mots-clés du thème
  portent les cinq noms de pays, si bien que « tunisie », « libye » ou
  « mauritanie » mènent au Maghreb dans la recherche. L'Algérie, la plus
  fournie, pèse 36 % du bloc, sous le seuil de 40 % du constructeur.
- **Huit figures de l'Antiquité**, rangées dans le pays actuel de leur lieu de
  naissance : les Carthaginois (Hannibal, Térence, Tertullien) en Tunisie, les
  Numides et l'Afrique romaine de l'ouest (Massinissa, Jugurtha, Apulée,
  Augustin) en Algérie, Septime Sévère, de Leptis Magna, en Libye. Juba II, dont
  la vie enjambe l'ère chrétienne (le format de date ne sait pas l'écrire), et
  Tariq ibn Ziyad (« né au VIIe siècle ») n'y sont pas.
- **Des dirigeants contestés** — Hassan II, Boumédiène, Bourguiba, Kadhafi —
  figurent dans le bloc comme Castro ou Perón dans le bloc hispanique : leur
  fiche dit ce qu'on leur reproche (les « années de plomb », le parti unique, des
  attentats attribués au régime de Kadhafi), sans l'éluder.
- **Les figures juives n'entrent que si le Maghreb les honore lui-même** — la
  règle posée pour ce bloc. Deux y sont : Edmond Amran El Maleh (Prix national
  du mérite, la plus haute distinction culturelle officielle du Maroc, en 1996)
  et Habiba Msika (un film et des hommages en Tunisie). Examinés et laissés pour
  une prochaine passe : Cheikh Raymond, Reinette l'Oranaise, Salim Halali,
  Albert Memmi, Abraham Serfaty, dont la réception au Maghreb même demande une
  vérification propre, cas par cas, que cette première version n'a pas faite ;
  Samy Elmaghribi (aucun portrait libre) et Zohra al-Fassia (pas d'année de
  naissance établie).
- **Un personnage, un seul thème.** Camus, né en Algérie, reste en France.
  Ma El Aïnin, Dimi Mint Abba, Abdelkébir Khatibi, Chaïbia, Ibn al-Banna et
  Baya, faute d'image libre, n'ont pas été retenus, ni Yahia Turki, né à
  Constantinople.
- **Pas de vivants**, ni entrepreneurs ; sportifs seulement selon la règle des sportifs.

### Ce que les images ont changé au Maghreb

Chaque personnage devait avoir son portrait : les cinq figures de la liste
validée qui n'en avaient pas de libre ont été remplacées, dans le même pays et
presque dans le même axe, de sorte que les 21 Algériens, 16 Marocains, 16
Tunisiens, 4 Libyens et 1 Mauritanien du départ sont restés.

| Retiré | Pourquoi | Remplacé par |
|---|---|---|
| Youssef ben Tachfine (Maroc, dirigeants) | seulement des pièces, un tombeau et un manuscrit | Allal El Fassi (Maroc, dirigeants) |
| Houcine Slaoui (Maroc, musique) | la seule image libre est une photographie de musiciens de 2012, où rien n'atteste qu'il figure | Abdelwahab Doukkali (Maroc, musique) |
| Mohamed Choukri (Maroc, littérature) | aucune photographie libre de lui | Abdelkrim Ghallab (Maroc, littérature) |
| Aly Ben Salem (Tunisie, beaux-arts) | une similigravure tirée d'un dictionnaire suédois d'artistes, trop grossière à 320 px | Saliha (Tunisie, musique) |
| Mouloud Mammeri (Algérie, littérature) | seulement de minuscules images libres (189 × 315 et 225 × 316 px) | Tahar Djaout (Algérie, littérature) |

Si une image convenable apparaît pour l'un d'eux, il se réintègre en ajoutant sa
fiche à `scripts/pantheon/maghreb.json`.

### Le troisième bloc : Allemagne, Autriche et Suisse

`pan_dach`, « Grandes figures d'Allemagne, d'Autriche et de Suisse » (code `dach`, comme
Deutschland, Austria, Confoederatio Helvetica) : **155 personnages de quatre pays** —
Allemagne 87, Autriche 38, Suisse 26, Liechtenstein 4 (voir « Les micro-États », le titre du
thème ne change pas) — d'Arminius (vers 17 av. J.-C.) à Helmut Kohl
(1930). Par axe : 39 Littérature et pensée, 24 Sciences, techniques et innovation, 25
Musique, spectacle et sport, 21 Chefs d'État et dirigeants, 21 Beaux-arts, 13 Guerres et
résistances, 8 Économie et entreprise ; 56 ⭐ et 22 biographies liées (Luther, Kant,
Hegel, Marx, Nietzsche, Goethe, Kafka, Bach, Mozart, Beethoven, Mendel, Einstein, Fugger,
Gropius, Le Corbusier, Ramuz, Ansermet, Dufour, Dunant, H.-B. de Saussure, Rommel, Sophie
Scholl). La liste (170 candidats, ramenés à 149 pour tenir l'équilibre des axes et des pays)
a été soumise puis validée sans retrait.

Les choix qui ne vont pas de soi :

- **Un bloc, non trois thèmes.** Avant 1871 il n'y a ni Allemagne, ni Autriche, ni Suisse au
  sens actuel, mais un Saint-Empire dont les figures passent d'un pays à l'autre : Mozart naît à
  Salzbourg, Kafka à Prague, Hitler en Autriche mais gouverne l'Allemagne, Einstein naît à Ulm,
  est suisse puis américain. Autriche et Suisse, seules, n'auraient jamais eu assez de figures
  pour un thème à elles, comme la Libye et la Mauritanie au Maghreb.
- **« Allemagne, Autriche et Suisse », non « monde germanophone ».** La Suisse n'est pas
  que germanophone, et ses figures romandes (Dunant, Ramuz, Le Corbusier, Piaget, Saussure,
  Ansermet) appartiennent au bloc. `pays` vaut `DE`, `AT` ou `CH` ; les mots-clés du thème portent
  les trois noms, Habsbourg, Prusse, Bavière, Vienne, Berlin, Bauhaus…
- **L'Allemagne pèse 57 %, et le seuil est écrit.** Au-delà de 40 % le constructeur
  prévient ; l'Allemagne compte environ quatre cinquièmes des germanophones et ne peut guère
  descendre sans léser ses figures. La source du bloc déclare donc `partMaxPays: 0.6` (nombre
  entre 0,4 et 1, accepté pour les seuls blocs) : le seuil devient un choix écrit, non un
  avertissement ignoré. L'Autriche (26 %) et la Suisse (17 %) sont, elles, au-dessus de
  leur part dans la population.
- **Le pays que le bloc donne à chacun, non l'état civil.** Les germanophones de Bohême et de
  Moravie — Freud (Příbor), Kafka et Rilke (Prague), Mahler (Kaliště), Mendel (Hynčice),
  Bertha von Suttner (Prague), Gödel (Brno) — sont rangés en Autriche, avec « alors en
  Autriche-Hongrie » dans la fiche, plutôt que d'ajouter la Tchéquie à un bloc dont la
  frontière est la langue et l'histoire des Habsbourg. Hesse, né à Calw et suisse depuis
  1924, est en Allemagne ; Le Corbusier, né à La Chaux-de-Fonds et naturalisé français,
  est en Suisse, comme Henri Nestlé, né à Francfort et installé à Vevey, et Guillaume-Henri
  Dufour, né à Constance de parents genevois.
- **Deux figures de l'Antiquité et du haut Moyen Âge seulement** : Arminius, qui anéantit
  trois légions romaines en l'an 9, et Otton Ier (912), fondateur du Saint-Empire ; puis
  Henri IV (1050), Hildegarde de Bingen (1098) et Barberousse (vers 1122). La plupart des
  figures sont modernes : 17 d'avant 1500, 32 de 1500 à 1799, 100 de 1800 à nos jours.
- **Charlemagne reste à la France** (« un personnage, un seul thème », et la France l'a), et
  Charles Quint, né à Gand, n'est pas ici : il relève de l'Espagne ou de la Belgique.
  Henri IV porte « du Saint-Empire » dans son nom pour ne pas être confondu avec le roi de
  France, qui a sa fiche au panthéon de la France (la règle un-seul-thème compare aussi les titres).
- **Hitler y est, comme Mussolini en Italie**, avec une fiche qui dit tout : la dictature,
  la guerre, la Shoah, et que l'Allemagne et l'Autriche font de la mémoire de ses crimes un
  devoir public, non un culte. Un panthéon allemand sans lui laisserait un trou dans
  l'histoire que l'app raconte. Il est rangé en Allemagne : né à Braunau, il y a gouverné.
- **Des figures contestées, avec leur contexte** : Guillaume II et Metternich, Rommel (la
  légende du soldat « propre »), Karajan (membre du parti nazi dès 1933), Richard Strauss
  (Chambre de musique du Reich), Orff, Wagner et Luther (leur antisémitisme), Krupp (l'armement
  du Reich), Alfred Escher (la plantation familiale de Cuba, travaillée par des esclaves),
  Jung (ses propos des années 1930), Robert Koch (ses essais sur des malades en Afrique
  orientale), Günter Grass (la Waffen-SS, révélée en 2006), Kreisky (d'anciens nazis dans son
  gouvernement de 1970) et le général Guisan (sa rencontre avec Schellenberg).
- **Les résistants allemands et autrichiens** : Stauffenberg, Bonhoeffer, Sophie Scholl,
  le paysan Franz Jägerstätter, seul de son village à voter contre l'Anschluss.
- **Pas de vivants**, comme ailleurs, donc ni Merkel ni Federer. **Deux sportifs** passent la
  règle : Schmeling et Beckenbauer ; Lauda reste aux Biographies. Hedy Lamarr, actrice et
  inventrice, est rangée en « Musique, spectacle et sport ».

### Ce que les images disent en Allemagne, en Autriche et en Suisse

Cent vingt portraits sont du domaine public (peintures, gravures, photographies d'avant
1931 ou de longue date), quatre en CC0 (le fonds d'archives néerlandais Anefo : Le Corbusier,
Karajan, Tinguely et Max Ernst), vingt-cinq sous une licence CC BY ou CC BY-SA : les
**Archives fédérales allemandes** (treize photographies, CC BY-SA 3.0 DE : Stresemann,
Adenauer, Brandt, Rommel, Bonhoeffer, Brecht, Remarque, Böll, Lang, Weill, Planck, Piccard
et Heisenberg ; celle de Hitler porte la même licence, sans provenance précisée), l'ETH
Zurich (Frisch, Pauli), Elke Wetzig (Dürrenmatt), Lothar Wolleh (Beuys), le musée de
Basse-Campagne (Guisan), Erling Mandelmann (Ansermet), Wolfgang Hunscher (Zuse), le Blaues
Sofa (Grass), Christian Lambiotte (Kohl), le SPÖ (Kreisky) et DorianKBandy (Popper). La
licence est lue sur la page Commons du fichier, non écrite à la main ; elle et l'auteur sont
portés dans la fiche.

Beaucoup sont posthumes ou conventionnelles, et la légende le dit : Arminius est montré par
la statue du Hermannsdenkmal (1875) ; Otton Ier, Henri IV, Barberousse et Hildegarde par des
miniatures médiévales ; Albert le Grand par une fresque de Tommaso da Modena (1352) ;
Gutenberg et Paracelse par des gravures du XVIe siècle ; Nicolas de Flue par une image
traditionnelle ; Mozart par le portrait peint par Barbara Krafft en 1819, vingt-huit ans après sa mort,
d'après ses portraits de son vivant. Plusieurs images ont été **remplacées** en route :
la photographie de Ramuz (d'abord le détail du billet de 200 francs, puis un cliché de la
revue *Lettres* de 1945, recadré), celle de Max Ernst (d'abord une image sans auteur ni source
sûrs, puis une photographie de presse d'Anefo, dont le bord noir de négatif est recadré),
celle d'Otto Dix (d'abord un cliché de presse d'exposition où il est à peine visible ; Hugo
Erfurth, vers 1929) et celle d'Ansermet (d'abord un cliché de presse en pied où le visage est
minuscule ; Erling Mandelmann, 1965). Jung, Popper et Schönberg,
d'abord refusés par le script (licences « PDM » ou « Attribution »), ont chacun une image libre.

Images à relire, si l'on veut être plus strict : Hitler (la photographie de 1937, CC BY-SA
3.0 DE, sans auteur connu), Marlene Dietrich et Hedy Lamarr (clichés de cinéma de 1951 et
de 1944, dont la liberté de droits repose sur la balise de Commons) et Ramuz (un cliché de
revue de 1945, « domaine public » sur la foi du fichier).

### Ce que les images ont changé en Allemagne, en Autriche et en Suisse

Un seul candidat a été écarté faute d'image convenable : **Falco**, dont la seule photographie
libre est un cliché très pixelisé de 1986. Vingt autres, dont l'image existait, ont été
retirés pour tenir l'équilibre des axes et des pays :

| Retiré | Pourquoi |
|---|---|
| Helmut Schmidt | un cinquième chancelier fédéral : Adenauer, Brandt et Kohl portent le XXe siècle |
| Radetzky, Moltke l'Ancien | généraux du XIXe siècle, redondants avec Blücher et Hofer |
| Georg Elser | seulement un buste commémoratif comme portrait |
| Engels, Heidegger | Marx suffit ; Heidegger, philosophe majeur, mais compromis avec le nazisme : à rediscuter |
| Karl May, Hölderlin, Ingeborg Bachmann | littérature : l'axe, à 39 figures, était déjà le plus chargé |
| Füssli, Kirchner, Hundertwasser | beaux-arts : trois noms de moindre portée internationale |
| Carl Maria von Weber, F. W. Murnau | musique et cinéma |
| Lilienthal, Hertz, Landsteiner, Konrad Lorenz | sciences : portraits corrects, noms moins incontournables |
| Daimler, Ferdinand Porsche | Benz et Bosch couvrent l'automobile ; Porsche, compromis avec le nazisme |

Si l'un d'eux doit revenir, sa fiche se rédige comme les autres dans
`scripts/pantheon/dach.json` (le script `scripts/fetch_portraits.py dach` récupère son portrait).

### Le quatrième bloc : la Scandinavie

`pan_scandinavie`, « Grandes figures de Scandinavie » (code `scandinavie`, trois lettres au moins
pour un bloc) : **86 personnages de cinq pays** — Suède 28, Danemark 21, Norvège 17, Finlande 15,
Islande 5 — de Leif Erikson (vers 970) à Olof Palme (1927). Par axe : 17 Chefs d'État et
dirigeants, 17 Littérature et pensée, 13 Beaux-arts, 11 Guerres, résistances et exploration, 11
Sciences, techniques et innovation, 10 Musique, spectacle et sport, 7 Économie et entreprise ;
31 ⭐ et aucune biographie liée.

Les choix qui ne vont pas de soi :

- **Cinq pays, un bloc.** Danemark, Suède et Norvège ont été unis (Union de Kalmar, puis le
  Danemark-Norvège, puis la Suède-Norvège de 1814 à 1905) ; la Finlande est restée suédoise jusqu'en
  1809 ; l'Islande a été danoise jusqu'en 1944. Un pays par thème aurait laissé l'Islande à cinq
  figures. Aucun pays ne dépasse 40 % (la Suède pèse 33 %) : pas de `partMaxPays`.
- **Le pays est celui de la naissance.** Ludvig Holberg, né à Bergen, est norvégien dans ce
  thème, bien qu'il ait écrit en danois ; Sigrid Undset, née au Danemark d'un père norvégien,
  est norvégienne ; Tycho Brahe, né en Scanie (alors danoise), est danois ; Bernadotte, né à Pau,
  est suédois (il règne à Stockholm) ; Adolf Erik Nordenskiöld, né à Helsinki, est finlandais
  bien qu'il ait fait sa carrière en Suède ; Bertel Thorvaldsen, né à Copenhague d'un père
  islandais, est danois ; Knud Rasmussen, né au Groenland, est danois.
- **Un axe d'exploration.** « Guerres et résistances » devient « Guerres, résistances et
  exploration » : Leif Erikson, Nansen, Amundsen, Béring, Rasmussen, Nordenskiöld et Heyerdahl
  n'ont pas d'autre axe où entrer proprement.
- **Que des morts.** La phrase d'ouverture exige les deux dates (« Nom (naissance-décès) est… ») :
  Vigdís Finnbogadóttir, Björn Borg, Björk ou Greta Thunberg ne peuvent donc pas y entrer.
- **Écartés.** Raoul Wallenberg (sa mort est datée de 1947 par Moscou, de 1952 par la Suède :
  aucune date de décès ne s'impose pour la phrase d'ouverture), Harald Hardrada (le seul
  fichier libre trouvé sur Commons est un détail de miniature de 350 × 339 px, illisible une
  fois recadré ; Trygve Lie le remplace parmi les chefs norvégiens) et Jørn Utzon (aucun
  portrait libre trouvé : Commons ne propose que sa maison, des plans et l'Opéra de Sydney).
  Ils peuvent rejoindre `scripts/pantheon/scandinavie.json` si une bonne image se présente.
- **Licences à revoir.** Le script lit la licence que Commons déclare (domaine public, CC BY,
  CC BY-SA), pas le statut américain de l'image : à revérifier en priorité pour Mannerheim
  (photographie de 1940 des archives de l'armée finlandaise), Tove Jansson, Kekkonen, Virtanen
  (CC BY 4.0) et Kamprad (CC BY 2.0).

### Le cinquième bloc : l'Afrique de l'Ouest

`pan_afriqueouest`, « Grandes figures d'Afrique de l'Ouest » (code `afriqueouest`) : **62
personnages de quinze pays** — Nigeria 9, Sénégal 7, Mali 6, Côte d'Ivoire 5, Burkina Faso 4,
Libéria 4, Niger 4, Sierra Leone 4, Togo 4, Bénin 3, Ghana 3, Guinée 3, Guinée-Bissau 3, Cap-Vert 2,
Gambie 1 — de Mansa Moussa (vers 1280) à Idrissa Ouedraogo (1954). Par axe : 34 Chefs d'État et
dirigeants, 13 Littérature et pensée, 7 Musique, spectacle et sport, 6 Guerres et résistances,
1 Beaux-arts, 1 Sciences, techniques et innovation ; 28 ⭐ et trois biographies liées (Mansa
Moussa, Chinua Achebe, Fela Kuti).

Les choix qui ne vont pas de soi :

- **Le périmètre est celui des quinze membres historiques de la CEDEAO** : Bénin, Cap-Vert, Côte
  d'Ivoire, Gambie, Ghana, Guinée, Guinée-Bissau, Libéria, Nigeria, Sénégal, Sierra Leone, Togo,
  Burkina Faso, Mali et Niger. Le Burkina Faso, le Mali et le Niger ont quitté l'organisation en
  janvier 2025 : ils restent dans le bloc, qui est un ensemble géographique et historique, non
  l'organigramme d'une institution. Les `motsCles` du thème comptent « CEDEAO ». La Mauritanie,
  qui avait quitté la CEDEAO en 2000, est déjà au Maghreb.
- **Les images ont décidé de la taille.** Cent vingt-deux fiches ont été rédigées, dates relues sur
  l'article Wikipédia ; seules 62 ont une image libre convenable (l'image principale de l'article,
  sinon une recherche sur Commons). Le bloc est donc bien en deçà des 80 à 100 figures visées, et
  les chefs d'État y pèsent plus de la moitié : ce sont eux que photographient les agences et
  les archives publiques. Beaux-arts et Sciences n'ont qu'une figure chacune (Ben Enwonwu, Davidson Nicol).
- **Dates incertaines.** Mansa Moussa (naissance vers 1280, mort 1332 ou 1337 selon les sources)
  et Omar Tall (naissance entre 1794 et 1797) portent un « vers » ; Samory Touré aussi. Ghézo,
  Osei Tutu, Alfa Yaya, Joseph Cinqué (Sengbe Pieh) et Ovonramwen ont été écartés faute d'année de naissance établie.
- **Rangés là où on les honore** : Amílcar Cabral, né à Bafatá (Guinée-Bissau) de parents
  capverdiens, est en Guinée-Bissau (le portrait est son buste de Bafatá, faute de photographie
  libre) ; Edward Wilmot Blyden, né à Saint-Thomas, est libérien ; Adelaide Casely-Hayford est
  sierra-léonaise. Que des morts : Abdou Diouf, Wole Soyinka, Alpha Condé ou Angélique Kidjo n'y entrent pas.
- **Écartés faute d'image libre convenable**, à réintégrer si l'une apparaît : une soixantaine de
  figures, dont Soundiata Keïta, Askia Mohammed, Félix Houphouët-Boigny (la seule photographie libre
  est un cliché israélien de 1962 dont le statut américain n'est pas établi), Yaa Asantewaa, Nnamdi
  Azikiwe, Usman dan Fodio, Ken Saro-Wiwa, Cheikh Anta Diop, Ousmane Sembène (sa seule photographie est
  signalée « copyright violation » sur Commons), Lat Dior, Lamine Guèye et Amadou Hampâté Bâ. Leurs
  fiches sont déjà rédigées dans `scripts/pantheon/afriqueouest_candidats.md`.
- **Licences à revoir.** Le script lit la licence que Commons déclare, pas le statut américain :
  à revérifier pour Amílcar Cabral (photographie d'un monument), Sékou Touré, Fela Kuti, Samory
  Touré et les clichés d'archives de Bello, Eyadéma, Pereira (domaine public américain déclaré), ainsi que pour
  les images d'Ernesto Djédjé, Flora Nwapa (illustrations) et Alboury Ndiaye (tableau).

### Le cinquième bloc : le Machrek et la péninsule Arabique

`pan_machrek`, « Grandes figures du Machrek et de la péninsule Arabique » (code `machrek`) :
**108 personnages de douze pays** — Liban 25, Syrie 21, Irak 19, Palestine 15, Arabie saoudite 12,
Jordanie, Yémen et Qatar 3 chacun, Émirats arabes unis, Koweït et Bahreïn 2 chacun, Oman 1 — de Assurbanipal
(vers 685 av. J.-C.) à Shireen Abu Akleh (1971). Par axe : 50 Chefs d'État et dirigeants, 33
Littérature et pensée, 12 Guerres et résistances, 6 Sciences, techniques et innovation, 5
Musique, spectacle et sport, 2 Beaux-arts ; 25 ⭐ et 2 biographies liées (Saladin et Ibn
al-Haytham). Le Liban, le plus fourni, pèse 23 % du bloc, sous le seuil de 40 % du
constructeur. Les mots-clés du thème portent les noms des pays, de Babylone à Bagdad, si bien
que « irak », « liban » ou « yémen » mènent au Machrek dans la recherche.

Les choix qui ne vont pas de soi :

- **Le périmètre.** Douze pays : Liban, Syrie, Irak, Jordanie, Palestine,
  Arabie saoudite, Yémen, Oman, Émirats, Koweït, Qatar et Bahreïn. **Le Qatar et Bahreïn ont été ajoutés après coup** (cinq figures : les émirs
  Ahmad ben Ali Al Thani et Khalifa ben Hamad Al Thani, l'acteur Abdulaziz Jassim, l'émir Issa ben Salmane Al Khalifa et le Premier ministre
  Khalifa ben Salmane Al Khalifa), parce que les articles français de leurs autres souverains (Jassim, Abdallah, Hamad Ier…) n'existent pas ; **deux images sont non libres** (Ahmad et Khalifa ben Hamad, photographies de Wikipédia
  en anglais sous usage équitable, `licence` « Image non libre » et `source` vers la page du fichier : à remplacer ou à faire valider). L'Égypte a son thème
  (voir plus bas), la Libye est au Maghreb ; Israël a **son thème** (voir « Un pays à part : Israël »),
  les figures juives de la diaspora restent dans le panthéon de leur pays.
- **L'Antiquité par pays actuel.** Huit figures d'avant l'islam — Assurbanipal et Hammurabi
  (Irak), Odénat, Philippe l'Arabe, Julia Domna, Héliogabale et Apollodore de Damas (Syrie),
  Sévère Alexandre (Liban) — sont rangées dans le pays actuel de leur lieu de naissance, comme
  les Carthaginois au Maghreb. Ce n'est pas parfait (Babylone n'est pas « l'Irak »), mais le
  champ `pays` est obligatoire dans un bloc et c'est la seule règle qui ne demande pas de
  jugement cas par cas. Zénobie et Al-Mansur manquent : leur page française ne donne aucune
  année de naissance, et la phrase d'ouverture en exige une. La naissance de Hammurabi
  (« vers 1810 ») et d'Assurbanipal (« vers 685 ») est une estimation.
- **Les premiers siècles de l'islam, sans portrait authentique.** Les quatre premiers
  califes (Abou Bakr, Omar, Othman et Ali), ainsi que Mu'awiya et Abd al-Malik, sont là, mais **le
  principe est : pas de portrait, pas de carte, sauf une illustration, même imaginaire,
  légendée comme telle**. Les quatre premiers sont montrés par des miniatures ottomanes de
  la fin du XVIe siècle, Mu'awiya et Abd al-Malik par des monnaies de leur règne. Mahomet n'y
  est pas : aucune illustration libre ne le montre seul (les miniatures trouvées le réunissent
  à d'autres prophètes), et il garde ses Biographies.
- **Les figures très contestées sont dans le bloc**, avec une fiche qui dit ce qu'on leur
  reproche, comme Castro ou Kadhafi : Saddam Hussein et Hafez el-Assad (la répression des
  Kurdes et des chiites, Hama), le mufti de Jérusalem Mohammed Amin al-Husseini (sa rencontre
  avec Hitler), Georges Habache et Abou Jihad, Yasser Arafat, Béchir Gemayel (Sabra et
  Chatila ont suivi sa mort), Antoun Saadé, Moussa Sadr. Shireen Abu Akleh, tuée en 2022, est la
  plus récente.
- **Pas de remplissage.** Les chefs d'État sont presque la moitié du bloc et les Beaux-arts n'ont
  que deux figures (Apollodore de Damas et la photographe Karimeh Abbud) : les peintres, sculpteurs
  et architectes libanais, syriens et irakiens envisagés n'avaient pas d'article en français ou pas
  d'image libre, et on n'a ajouté personne pour équilibrer. Même chose pour les sciences
  (six figures, toutes médiévales sauf Taqi al-Din) et la musique (quatre).
- **Des dates de Wikipédia, non de Wikidata.** Les deux divergent souvent : Moubarak Al-Sabah
  est né vers 1837 (non 1844), Khaled d'Arabie saoudite en 1913 (non 1911), Farid El Atrache en 1910
  (non 1917), Sabah en 1925 (non 1927), Al-Mutanabbi en 915, Michel Aflak en 1912 (la date de
  1910 est un âge vieilli de deux ans), Zaki al-Arsouzi en 1900, et Youssef Karam est mort en 1889,
  non en 1923. Les dates de Saladin (vers 1137) et d'Ibn al-Haytham (965) suivent celles de leur
  biographie ; Wikipédia donne 1138 pour Saladin.
- **Wahhab n'y est pas** : sa seule image libre est une calligraphie. Les premiers
  noms envisagés mais retirés pour l'image sont dans `scripts/pantheon/machrek_candidats.md`.
- **Trois fiches en attente d'un portrait**, écrites et valides, mais Wikimedia limitait les
  requêtes de l'environnement qui téléchargeait les images : Harun al-Rashid (dont le fichier prévu
  est refusé par `fetch_portraits.py`, qui détecte « fair use » sur sa page ; sa biographie existe,
  date 763), Al-Ma'mun et Salah al-Din al-Bitar. Elles sont dans
  `scripts/pantheon/machrek_en_attente.md`, avec la marche à suivre pour les remettre.

### Ce que les images disent au Machrek

Une bonne part des portraits du Machrek est imaginée ou indirecte, et la légende le dit.
Les quatre premiers califes sont montrés par des miniatures ottomanes de 1585-1590 (manuscrit
T 414 de la Chester Beatty Library), Saladin une gravure de 1584 du British Museum,
Abou Nouwas, Al-Mutanabbi et Abou al-Alaa al-Maari des dessins de Khalil Gibran (1916-1917),
Hammurabi un relief de la stèle de son Code, Assurbanipal un relief de chasse, Mu'awiya et
Abd al-Malik des monnaies, Nazik al-Malaika et Al-Masudi des statues. Les empereurs
syriens de Rome (Philippe l'Arabe, Julia Domna, Sévère Alexandre, Héliogabale) sont montrés
par leurs bustes antiques, et Odénat par un buste de Palmyre dont l'identification est
traditionnelle. Gibran, lui, est montré à treize ans, par une photographie de Fred Holland Day
de 1896 (Metropolitan Museum), libre de droits et en grand format.

Le statut américain des photographies du milieu du XXe siècle, souvent libres seulement selon
la loi du pays d'origine (PD-Irak, PD-Syrie, PD-Arabie saoudite…), est celui qui a coûté huit
figures à l'Amérique hispanique ; `scripts/search_portraits.py` en donne une première
indication par fichier, pas une certitude. Khalid ibn al-Walid, Zaha Hadid et Asmahan restent
sans image libre acceptable.

### Un pays à part : Israël

`pan_il`, « Grandes figures d'Israël » : **83 personnages**, de David (vers 1040 av. J.-C.) à
Ilan Ramon (1954). Par axe : 27 Littérature et pensée, 21 Chefs d'État et dirigeants, 11 Guerres et
résistances, 9 Musique, spectacle et sport, 8 Sciences, techniques et innovation, 7 Beaux-arts ;
29 ⭐ ; une biographie liée (Jésus de Nazareth).

Les choix qui ne vont pas de soi :

- **Le critère est la vie en Israël, pas le judaïsme.** Y entrent les citoyens israéliens et
  ceux qui ont réellement vécu en Terre d'Israël : Ben Gourion (né à Płońsk), Golda Meir (Kiev),
  Buber (Vienne), Scholem (Berlin). Un Juif qui n'y a pas vécu reste dans le thème de son pays :
  Einstein, Freud, Kafka, Arendt (Allemagne, Autriche, Suisse), Maïmonide (Espagne). La règle « un
  personnage, un seul thème » joue comme ailleurs ; il n'y a pas de thème juif de la diaspora.
- **Une exception : Theodor Herzl**, né à Budapest, mort en 1904 sans avoir vécu en Terre
  d'Israël, entre comme sioniste par excellence ; sa fiche le dit.
- **Un thème de Terre d'Israël, géographique et culturel, non religieux.** Aucun thème religieux n'est
  prévu : les figures du judaïsme, du christianisme et des croisades qui ont vécu en Terre d'Israël
  y entrent, quand une année de naissance est établie. Jésus de Nazareth (né en Judée, mort à Jérusalem)
  garde la date de sa biographie (vers 4 av. J.-C.) et son bouton « Voir sa biographie ». Antiquité :
  David, Hérode Ier le Grand, Jésus, Flavius Josèphe (né à Jérusalem), Hillel l'Ancien (né à Babylone,
  installé à Jérusalem) et Rabbi Akiva. Moyen Âge : Jérôme de Stridon (à Bethléem de 386 à 420), Joseph
  Caro et Isaac Louria (Safed), Nahmanide (Jérusalem et Acre), Godefroy de Bouillon (Jérusalem, 1099-1100).
  Les dates antiques portent « vers ».
- **Écartés faute d'année de naissance sur Wikipédia en français** : Jean le Baptiste, Paul de Tarse,
  Salomon, Judas Maccabée, Bar Kokhba. Faute d'image libre : Haïm Vital, Moïse Cordovero, Yohanan ben
  Zakkaï (leurs fiches sont à écrire). Moïse, qui n'entre pas en Terre promise, reste hors du thème.
- **Les citoyens arabes d'Israël restent au Machrek** (Émile Habibi, Samih al-Qasim, rangés `PS`),
  pour ne pas défaire un panthéon écrit ; le Yishouv d'avant 1948 est ici.
- **Des figures contestées**, dont la fiche dit pourquoi : Avraham Stern (héros pour les uns,
  terroriste pour les autres), Ariel Sharon (Sabra et Chatila), Ezer Weizman (la fin de sa présidence).
- **Dates discutées** : Zalman Shazar 1885 et Agnon 1887 suivent l'article Wikipédia en français ;
  d'autres sources donnent 1889 et 1888.
- **Pas de vivants** ; pas de sportif. Mordechaï Gur, Eliyahu Golomb et Arieh Sharon n'ont pas
  d'article en français et n'y sont pas.
- **Dix fiches en attente d'une image libre**, rédigées dans `scripts/pantheon/il_candidats.md` :
  Zalman Shazar, Léa Goldberg, Nathan Alterman, Eli Cohen, Yonatan Netanyahou, Mickey Marcus,
  Reuven Rubin, Uziel Gal, Simcha Blass et Isaac Louria.

Le statut américain a décidé des images : les clichés du Bureau de presse israélien postérieurs à
1946 ne sont libres que selon la loi israélienne, et leur statut américain est douteux ; ils sont
écartés au profit de CC BY, CC BY-SA, CC0 (Nationaal Archief, collections de la Bibliothèque nationale
d'Israël) ou de photographies d'avant 1931. David, Hérode, Jésus (icône du Sinaï du VIe siècle), Hillel (vitrail), Nahmanide, Jérôme, Godefroy, Rabbi Akiva et Joseph Caro sont montrés
par des images imaginées (statue de l'Escorial, gravures, carte postale), et la légende le dit ;
Hannah Szenes par une photographie d'enfance. Le portrait de Meir Ariel n'a pas pu être recadré :
Wikimedia limitait les téléchargements.
### Un pays à part : la Turquie

`pan_tr`, « Grandes figures de Turquie » (code `tr`, pays) : **71 personnages**, des Seldjoukides (Alp
Arslan, né vers 1029) à Naim Süleymanoğlu (1967). Par axe : 21 Chefs d'État et dirigeants, 19
Littérature et pensée, 9 Guerres et résistances, 8 Beaux-arts, 8 Musique, spectacle et sport, 6 Sciences,
techniques et innovation ; 20 ⭐ et 3 biographies liées (Soliman le Magnifique, Rûmî, Mimar Sinan). Les
six axes sont ceux de l'Égypte et d'Israël ; la Turquie n'a pas d'axe « Économie et entreprise ».

- **Le pays de la République et de l'Empire ottoman.** Le panthéon honore ce que la Turquie honore :
  les sultans, les grands vizirs et les corsaires de l'empire y entrent comme les présidents de la
  République. Atatürk y a sa fiche, avec les pères de la guerre d'indépendance (İnönü, Çakmak,
  Karabekir). Les Turcs d'avant 1934 n'avaient pas de nom de famille : on les range par leur nom d'usage
  (`scripts/pantheon_classement.py`).
- **Des figures disputées.** Rûmî, né à Balkh et mort à Konya, est rangé ici, où on l'honore le plus
  (Konya, les Mevlevis) ; sa biographie reste liée. Taqi al-Din, né à Damas, est resté au Machrek, où
  il était déjà. Saïd Nursî et Yaşar Kemal, Kurdes de Turquie, sont ici ; Ahmet Kaya et Yılmaz Güney aussi, avec
  des fiches qui disent l'exil. Enver Pacha entre avec une fiche qui nomme sa part dans le génocide
  des Arméniens de 1915 ; Talaat et Djemal n'y sont pas. Abdülhamid II est montré avec les massacres
  des Arméniens de 1894-1896.
- **Le sport : un seul cas.** Naim Süleymanoğlu, dont l'exil de 1986 et la négociation entre la Turquie
  et la Bulgarie font l'événement politique.
- **Pas de vivants** : Orhan Pamuk, Aziz Sancar, Sezen Aksu et Tarkan attendent. Les fiches pour
  lesquelles Wikipédia en français n'a pas d'article ne sont pas écrites : Kemaleddin, Sedad Hakkı
  Eldem, Cezeri, Şerafeddin Sabuncuoğlu, Feza Gürsey, Vecihi Hürkuş, Neşet Ertaş, Münir Nurettin Selçuk,
  Itri. Faute d'image libre : Katip Çelebi, Sait Faik, Kemal Sunal, Müzeyyen Senar.
- **Dates** : Mimar Sinan est né « vers 1490 » (sa biographie `bio_sinan`), non vers 1489 comme l'écrivent
  d'autres sources ; Sabiha Gökçen, 1913 (d'autres sources donnent 1914).
- **Les images** : beaucoup sont imaginées (miniatures, gravures, statues, tombes) et la légende le dit :
  Osman, Rûmî, Yunus Emre, Piri Reis, Kösem, Evliya Çelebi, Sinan, Nedîm, Dede Efendi, Turgut Reis, Nene
  Hatun, Müteferrika, Cem Karaca, Zeki Müren, Yaşar Kemal (statue de cire), Fikret Moualla, Oğuz Atay,
  Naim Süleymanoğlu et Oktay Sinanoğlu (tombe). Roxelane est montrée par la « Sultana Rossa » de Titien,
  dont l'identification est incertaine ; Fahrelnissa Zeid par un cadrage de sa photographie de famille.
  À remplacer si de meilleures images libres apparaissent.

### Un pays à part : le Japon

`pan_jp`, « Grandes figures du Japon » (code `jp`, pays) : **88 personnages**, de Kūkai (774) à Sakamoto
Ryūichi (1952). Par axe : 14 Chefs d'État et dirigeants, 11 Guerres et résistances, 25 Littérature et pensée,
8 Beaux-arts, 13 Musique, spectacle et sport, 11 Sciences, techniques et innovation, 6 Économie et entreprise ;
37 ⭐ et 3 biographies liées (Miyamoto Musashi, Murasaki Shikibu, Akio Morita). Les sept axes sont ceux de la France.

- **Le nom de famille d'abord.** Oda Nobunaga, Natsume Sōseki, Kurosawa Akira : on range « par nom de famille »
  sous l'initiale du premier mot (`scripts/pantheon_classement.py`). Les noms de plume ou d'artiste (Bashō,
  Hokusai, Hiroshige, Utamaro, Foujita) se rangent tels qu'on les dit.
- **Un seul thème.** Les shoguns, les samouraïs, les moines et les empereurs de l'ère Meiji entrent ici
  comme les prix Nobel et les patrons d'entreprise. Tadao Ando (bio_ando) est vivant : il reste dans sa biographie.
  Andō Momofuku, l'inventeur des nouilles instantanées, est un autre homme.
- **Les cas disputés.** Takauji est montré par un portrait du Jōdo-ji dont l'identification est discutée ;
  Minamoto no Yoritomo, Fujiwara no Michinaga et Yoshitsune par des images tardives. Saigō Takamori, qui ne
  s'est jamais laissé photographier, est montré par le seul portrait tenu pour fidèle.
- **Pas de vivants** : Miyazaki Hayao, Murakami Haruki, Kusama Yayoi et Sadaharu Ō attendent. Hirohito, dont le rôle dans la guerre reste débattu, est présenté par ses actes et ses dates.
- **Les images** : beaucoup sont imaginées ou tardives (peintures, estampes, gravures, statue de Nichiren) et la
  légende le dit : Yoritomo, Takauji, Tokimune, Yoshitsune, Shingen, Kenshin, Kuranosuke, Shōnagon, Murasaki,
  Kūkai, Dōgen, Saikaku, Bashō, Seki, Michinaga. Les photographies sont presque toutes du domaine public ; Satō
  Eisaku est sous CC BY 4.0, Ōe Kenzaburō et Issa (image) sous CC BY-SA, Sakamoto Ryūichi sous CC BY 2.0.
- **Écartés faute d'image libre** : Shōtoku Taishi, Zeami, Sesshū, Hasegawa Tōhaku, Ogata Kōrin, Honda Ishirō
  (réalisateur de Godzilla). **À ajouter** (image libre repérée, mais Wikimedia a refusé les téléchargements
  de cette session, erreur 429) : Kuroda Seiki (`Kuroda Seiki.jpg`), Noguchi Hideyo (`Noguchi Hideyo.png`),
  Matsushita Kōnosuke (`Konosuke Matsushita 01.jpg`) et Toyoda Kiichirō ; leurs fiches sont à reprendre dans
  `scripts/pantheon/jp.json` (Kuroda, 1866 ; Noguchi, 1876 ; Matsushita, 1894 ; Toyoda, 1894).

### Le sixième bloc : le sous-continent indien

`pan_indien`, « Grandes figures du sous-continent indien » (code `indien`) : **127 personnages
de sept pays** — Inde 77, Pakistan 14, Bangladesh 11, Népal 10, Sri Lanka 9, Bhoutan 4,
Maldives 2 — d'Ashoka (vers 304 av. J.-C.) et du Bouddha (vers 563 av. J.-C.) à Zakir
Hussain (1951). Par axe : 42 Chefs d'État et dirigeants, 37 Littérature et pensée, 16
Guerres et résistances, 14 Musique, spectacle et sport, 10 Sciences, techniques et
innovation, 8 Beaux-arts ; 32 ⭐ et 10 biographies liées (Ashoka, Akbar, Gandhi, Adi
Shankara, Guru Nanak, Guru Gobind Singh, Mère Teresa, Tagore, Ravi Shankar et le Bouddha).
Les mots-clés du thème portent les noms des sept pays, de l'Hindoustan, du Raj britannique et
de l'Empire moghol.

Les choix qui ne vont pas de soi :

- **L'Inde pèse 61 %, et c'est voulu.** Le constructeur prévient au-delà de 40 % et refuse
  qu'on le dépasse sans le dire (voir « L'Allemagne pèse 57 % »). Le bloc déclare donc
  `partMaxPays: 0.65`. L'Inde a plus d'histoire à elle seule que les six autres pays ensemble
  — un sous-continent de plus d'un milliard d'habitants, des empires, des religions nées
  sur place — et les six autres n'ont pas de quoi la compenser : le Bhoutan et les Maldives
  n'ont que quelques figures avec un portrait libre. L'Inde reste sous 65 %, ce qui oblige à
  y décider si une figure de plus s'ajoute ou non.
- **Le périmètre est celui des sept pays demandés.** L'Afghanistan, rangé dans « l'Asie du Sud »
  de l'Histoire par pays, n'en fait pas partie : il est au bloc d'Asie centrale (voir « Un bloc :
  l'Asie centrale et l'Afghanistan »). Le Tibet non plus. Les figures nées dans
  un pays voisin sont rangées là où on les honore (voir plus bas).
- **Là où on les honore, pas là où elles sont nées.** Beaucoup de figures sont nées avant
  1947 dans une région devenue le Pakistan ou le Bangladesh : Guru Nanak (Nankana Sahib),
  Akbar (Umarkot), Shah Jahan (Lahore), Ranjit Singh (Gujranwala), Bhagat Singh, Manmohan Singh,
  Milkha Singh, Dilip Kumar, Nek Chand sont à l'Inde ; Jinnah, Iqbal, Ghaffar Khan, Edhi
  ou Nusrat Fateh Ali Khan sont au Pakistan. Jagadish Chandra Bose (Mymensingh) est à l'Inde,
  Allauddin Khan (Brahmanbaria), qui a aussi enseigné en Inde, au Bangladesh ; Zia-ul-Haq
  (Jalandhar) et Musharraf (Delhi) au Pakistan. Les fiches le disent chaque fois.
- **Mère Teresa est ici, pas dans un futur panthéon des Balkans.** Née à Skopje, elle a vécu
  près de soixante-dix ans en Inde, dont elle a pris la nationalité en 1951 : l'Inde l'honore le
  plus. Même règle que pour Joséphine Baker. Sa biographie liée garde la date de 1910.
- **Babur est dans le bloc.** Né à Andijan, enterré à Kaboul, il est aussi honoré en Ouzbékistan
  et c'est l'un des cas que la feuille de route réservait aux règles de partage entre deux
  thèmes. Il est ici parce qu'il fonde l'empire moghol de l'Inde ; un futur thème d'Asie
  centrale ne pourra donc pas le reprendre. Humayun (né à Kaboul) suit la même logique.
- **Le Bouddha au Népal, Ashoka et Mahavira en Inde.** Siddhartha Gautama naît à Lumbini,
  aujourd'hui au Népal, et le Bouddha y est rangé ; les dates de sa vie, comme celles de
  Mahavira (vers 599-527 av. J.-C.), sont celles des traditions, avec « vers ».
- **Les religieux vont à « Littérature et pensée »**, comme ailleurs : les gourous sikhs, les
  maîtres de l'hindouisme, Mahavira, le Bouddha, Mère Teresa. Il n'y a pas d'axe « religion ».
- **Pas d'axe « Économie et entreprise ».** Il en faut six figures et une histoire propre. Seuls
  J. R. D. Tata et Ratan Tata avaient une image libre convenable, et deux ne font pas un axe :
  J. R. D. Tata est rangé en Sciences, techniques et innovation, en tant que pionnier de
  l'aviation, et Ratan Tata attend d'autres noms. Jamsetji Tata, Dhirubhai Ambani et G. D. Birla
  n'ont aucune image utilisable.
- **Pas de vivants** : Malala, Amartya Sen, Imran Khan, Sachin Tendulkar, Muttiah Muralitharan ou
  Sheikh Hasina n'y entrent pas, ni Maumoon Abdul Gayoom, dont le portrait est libre. Les décès
  récents (Manmohan Singh et Zakir Hussain, tous deux morts en 2024) sont admis.
- **Sportifs : trois, au titre de la règle des sportifs** — Tensing Norgay (l'Everest, 1953), Pasang
  Lhamu Sherpa (première Népalaise au sommet) et Milkha Singh (orphelin de la Partition, quatrième
  aux Jeux de Rome). Dhyan Chand attend une image libre exploitable (il n'en existe qu'une de
  211 pixels). Le cricket est absent, faute de figure disparue dont l'image soit libre.
- **Figures contestées et controversées** : Aurangzeb, Tipu Sultan, Babur (l'empereur-conquérant),
  Indira Gandhi (l'état d'urgence), Zia-ul-Haq, Abdul Qadeer Khan (la prolifération nucléaire),
  J. R. Jayewardene (juillet 1983), Mère Teresa. Chaque fiche dit ce qu'on leur reproche.
- **Dates retenues quand les sources divergent.** Shivaji est né en 1630 (1627 et 1631 selon les
  sources), Prithvi Narayan Shah en 1723 (1722 selon d'autres), Ghalib en 1797 (décembre 1796 selon
  Wikipédia en français), Allauddin Khan vers 1881 (1862 selon lui), Kalpana Chawla en 1962
  (1961 à l'état civil), Mahavira vers 599, le Bouddha vers 563, Kabir vers 1398.
- **Écartés faute d'image libre convenable**, à réintégrer si l'une apparaît : Jamsetji Tata,
  Dhirubhai Ambani, Vikram Sarabhai, Kalam, Vajpayee, Mehboob Khan, Raj
  Kapoor, Guru Dutt, Madhubala, Tansen, Bhaskara II, Faiz (le portrait retenu est une
  photographie de 2013), Sadequain, Chughtai, Maududi, Fatima Jinnah, Ayub Khan, Vijayabahu Ier,
  Parakramabahu Ier, Geoffrey Bawa, Walpola Rahula, Anagarika Dharmapala, Jung Bahadur Rana,
  les rois Tribhuvan, Mahendra et Birendra du Népal, Jigme Wangchuck, Thakurufaanu (Maldives) et
  des dizaines d'autres.
- **Écartés faute d'article en français** : Saadat Hasan Manto, dont la fiche est prête et qui
  n'a pas de page sur la Wikipédia francophone.
- **Beaucoup de portraits sont imaginés ou indirects**, et la légende le dit : miniatures moghole,
  statues (Mahavira, Basava, Aryabhata, Bhanubhakta, Araniko, Pasang Lhamu, Savitribai Phule,
  Rajaraja Ier), reliefs (Ashoka à Sanchi), thangkas bhoutanais (Zhabdrung, Pema Lingpa, Drukpa
  Kunley), gravures. Pour Lakshmî Bâî, le portrait des années 1850 est incertain.
- **Licences à revoir.** Les photographies américaines de la Maison-Blanche (Indira Gandhi,
  Zia-ul-Haq, Manmohan Singh) et les clichés de gouvernements (Ceylan, Inde) sont dits
  publics ; le statut américain de celui de Zulfikar Ali Bhutto et de Jinnah n'est pas établi
  (Commons ne le précise pas) ; Bhagat Singh, Ghaffar Khan, Liaquat Ali Khan, Tajuddin Ahmad
  et Mujibur Rahman sont des photographies d'avant 1960, sans auteur connu.

### Un pays à part : l'Égypte

`pan_eg`, « Grandes figures d'Égypte » : **52 personnages**, d'Imhotep (vers 2670
av. J.-C.) à Ahmed Zewail (1946). Par axe : 17 Chefs d'État et dirigeants, 17
Littérature et pensée, 7 Musique, spectacle et sport, 4 Guerres et résistances, 4
Sciences, techniques et innovation, 3 Beaux-arts (un sculpteur, une peintre, un
architecte) ; 21 ⭐ et 5 biographies liées (Imhotep, Cléopâtre, Oum Kalthoum,
Hassan Fathy, Naguib Mahfouz).

Les choix qui ne vont pas de soi :

- **Un pays, donc pas un bloc — et séparé du Machrek.** Le thème s'appelle
  `pan_eg` (deux lettres) : ses événements n'ont pas de champ `pays`, la fiche
  n'affiche ni drapeau ni nom de pays, et « Pendant ce temps, ailleurs… » le
  compte comme l'Égypte, au même titre que `thm_eg`, le thème « Histoire de
  l'Égypte ». Mêlée aux 54 figures prévues du Machrek, l'Égypte aurait pesé 49 %
  d'un bloc de 106 figures, soit bien plus que le seuil de 40 % du constructeur :
  le Machrek viendra sans elle. Le thème se range par son nom de rangement,
  « Égypte », entre l'Amérique hispanique et la France.
- **Cinq millénaires, de très inégale densité.** Sept figures de l'Égypte
  pharaonique et ptolémaïque (Imhotep, Hatchepsout, Akhenaton, Néfertiti,
  Toutânkhamon, Ramsès II, Cléopâtre VII) ; six de l'Égypte romaine — cinq
  savants et penseurs de langue grecque (Ptolémée, Origène, Plotin, Athanase,
  Hypatie) et le père du monachisme chrétien, Antoine le Grand ; un seul poète
  médiéval, Ibn al-Fârid (1181) ; puis trente-huit modernes, d'Ali Bey al-Kabir
  (1728) à Zewail. Entre 1181 et 1728, le vide du Caire des Ayyoubides, des
  Mamelouks et des Ottomans vient des images : al-Maqrizi et al-Suyuti n'ont de
  libre que de la calligraphie, al-Jabarti qu'un portrait de 134 × 188 px, Hassan
  al-Attar rien du tout.
- **Les dates de l'Égypte ancienne portent « vers »** : celles de Wikipédia en
  français, que les chronologies déplacent de quelques années. Les pharaons dont
  on ne connaît aucune année de naissance (Khéops, Khéphren, Mykérinos, Djéser,
  Sésostris III, Thoutmosis III) n'y sont pas : la phrase d'ouverture exige une
  naissance.
- **Les cinq biographies liées gardent la date de leur biographie** — Imhotep
  vers 2670 av. J.-C., Cléopâtre vers 69, Oum Kalthoum « vers 1898 »
  (Wikipédia hésite jusqu'en 1906), Fathy 1900, Mahfouz 1911 — et le bouton
  « Voir sa biographie » les relie.
- **Des dirigeants contestés** — Farouk, Naguib, Nasser, Sadate, Moubarak —
  dont la fiche dit ce qui les a perdus ou ce qu'on leur reproche : la défaite de
  1948 pour Farouk, la résidence surveillée jusqu'en 1970 pour Naguib, la guerre
  des Six Jours pour Nasser, la paix avec Israël et l'assassinat pour Sadate,
  l'état d'urgence et la révolution de 2011 pour Moubarak.
- **« Illustre » ne veut pas dire « de souche égyptienne » ni « né dans les
  frontières actuelles »** : Naguib naît à Khartoum, d'un père égyptien et d'une
  mère soudanaise ; Cléopâtre VII, d'une dynastie macédonienne, est la première
  de sa lignée à parler égyptien ; Omar Sharif sort d'une famille chrétienne du
  Liban ; Ptolémée, Plotin et Hypatie écrivent en grec. Le pays d'un panthéon
  est celui qui honore, pas celui de l'état civil.
- **Pas de vivants**, ni entrepreneurs ; sportifs seulement selon la règle des sportifs.

### Ce que les images disent en Égypte

La légende dit ce qu'on voit, et l'Égypte en a le plus besoin. Six de ses
figures antiques sont montrées par une sculpture ou un masque de leur temps :
Hatchepsout agenouillée, le buste colossal de Ramsès II, un fragment d'Akhenaton,
le buste de Néfertiti, le masque de Toutânkhamon, le buste de Cléopâtre VII
conservé à Berlin — une sculpture tient lieu de portrait. Huit autres n'ont
aucune image authentique : Imhotep, par une statuette de bronze de l'époque
ptolémaïque, plus de deux millénaires après sa mort ; Plotin, par un buste
d'Ostie que l'on identifie sans certitude ; Ptolémée, Origène, Athanase, Antoine,
Hypatie et Ibn al-Fârid, par des images imaginées des siècles plus tard (Juste de
Gand en 1475 pour Ptolémée, Zurbarán pour Antoine, Alfred Seifert pour Hypatie,
un dessin de Khalil Gibran en 1917 pour Ibn al-Fârid…).

### Un pays à part : les États-Unis

`pan_us`, « Grandes figures des États-Unis » : **142 personnages** (132 des États-Unis continentaux, plus les dix figures d'Hawaï, voir « Un bloc : la Nouvelle-Zélande et le Pacifique »), de Pocahontas
(vers 1596) à Charlie Kirk (1993). Par axe : 26 Littérature et pensée, 24 Guerres et
résistances, 24 Musique, spectacle et sport, 21 Chefs d'État et dirigeants, 16
Sciences, techniques et innovation, 12 Beaux-arts, 9 Économie et entreprise ; 39 ⭐ et
31 biographies liées.

**Charlie Kirk** (1993-2025), militant conservateur fondateur de Turning Point USA, assassiné
le 10 septembre 2025, est entré à la demande de l'éditeur, bien que son recul historique soit
d'un an à peine : il passe la règle « que des morts », et c'est la seule figure du panthéon
née après 1960. Sa fiche, rangée en « Littérature et pensée » (auteur de cinq ouvrages,
animateur d'un podcast), s'en tient aux faits et aux dates, expose ses soutiens comme ses
critiques (comme celles de Reagan ou de Malcolm X) et ne dit rien de la procédure judiciaire en
cours. Portrait : Gage Skidmore, CC BY-SA 3.0 (CPAC, 2017). À relire quand le recul permettra
de mesurer son rôle.

La liste a été soumise puis validée décision par décision : 85
figures proposées, portées à 123 (« mieux vaut plus que moins »), puis à 129 avec
l'axe Économie et entreprise (Vanderbilt, Carnegie, Morgan, Rockefeller, Ford et
Madam Walker, aux côtés d'Edison, de Disney et de Jobs, qui y ont été rangés).

Les choix qui ne vont pas de soi :

- **Un pays, donc pas un bloc**, comme l'Égypte : `pan_us` (deux lettres), aucun
  champ `pays`, aucun pays dans la fiche, et « Pendant ce temps, ailleurs… » le
  compte comme les États-Unis, au même titre que `thm_usa` — l'« Histoire des
  États-Unis », dont l'identifiant n'est pas `thm_us`, ce que dit la table de pays
  (`assets/geo/theme-country-map.json`, où aucun panthéon ne figure). Le thème se
  range par son nom de rangement, « États-Unis », entre l'Égypte et la France.
- **Nés aux États-Unis, plus Hamilton** (né à Nevis, en 1755 selon la date la plus
  admise, en 1757 selon d'autres sources : la fiche le dit). Einstein, Tesla, Bell,
  Chaplin, Hitchcock, Kissinger et Carnegie restent à leur pays de naissance, et
  Joséphine Baker, entrée au Panthéon de Paris, est dans celui de la France.
- **Neuf Amérindiens** — Pocahontas, Tecumseh, Sequoyah, Sacagawea, Sitting Bull,
  Red Cloud, Crazy Horse, Geronimo et le chef Joseph — sans exiger de portrait
  authentique : des dessins ou des représentations illustrées connues sont
  acceptés, et la légende dit ce qu'on voit (voir plus bas). Les années incertaines
  portent « vers » (Pocahontas, Sequoyah, Sacagawea, Sojourner Truth, Harriet
  Tubman, Sitting Bull, Crazy Horse, Carver) ; pour les autres, la date la plus
  communément admise est retenue et l'incertitude est dite dans la fiche
  (Hamilton, Tecumseh, Douglass, Geronimo).
- **Des dirigeants contestés**, dont la fiche dit ce qu'on leur reproche :
  l'esclavage (Washington, qui affranchit les siens par testament, Jefferson,
  Madison, Jackson), l'Indian Removal Act et la Piste des larmes (Jackson), la
  ségrégation dans l'administration fédérale (Wilson), l'internement des Américains
  d'origine japonaise (Franklin Roosevelt), Hiroshima et Nagasaki (Truman), le
  Watergate (Nixon), l'affaire Iran-Contra et le sida (Reagan), la Bonus Army
  (Hoover), la guerre du Viêt Nam (Lyndon Johnson), le « gros bâton » (Theodore
  Roosevelt). Même démarche pour Lindbergh (propos antisémites, décoration
  allemande), Malcolm X, Disney (HUAC), Edison (guerre des courants) ou Sinatra.
- **Des confédérés, avec leur contexte** : Jefferson Davis, Robert Lee et Stonewall
  Jackson. Leur fiche dit que la sécession défendait l'esclavage, que tous trois
  possédaient des esclaves, que la défaite de 1865 n'a pas fait taire le mythe de la
  « Cause perdue » et que plusieurs de leurs statues ont été retirées.
- **Des figures d'origine juive**, incluses comme américaines (Gershwin,
  Bernstein, Kubrick, Oppenheimer, Feynman, Sagan, Man Ray, Arthur Miller) :
  l'idée d'un thème juif à part est abandonnée.
- **Des exceptions de rangement.** Eisenhower et Grant sont rangés chez les
  Chefs d'État et dirigeants — leurs biographies en font des chefs militaires —,
  MacArthur et Patton restant chez les militaires. Edison, Disney et Steve
  Jobs, inventeurs ou créateurs autant que chefs d'entreprise, sont rangés dans
  « Économie et entreprise », l'axe que leurs biographies appellent « Entrepreneurs et magnats » ;
  Eiffel et Louis Lumière, d'abord ingénieur et inventeur, restent dans « Sciences,
  techniques et innovation » et « Musique, spectacle et sport ».
- **César Chávez.** L'article de Wikipédia en français rapporte qu'une enquête du
  *New York Times* de mars 2026 l'accuse de dizaines de viols et d'agressions
  sexuelles, dont certaines sur des mineures, et que plusieurs États ont annulé ou
  rebaptisé la journée portant son nom. La fiche le dit en toutes lettres, comme
  une accusation ; sa présence est à rediscuter si elles sont confirmées.
- **Pas de vivants**, ni entrepreneurs, ni religieux (Ford, Rockefeller, Gates, Joseph
  Smith, Billy Graham : ils ont leur biographie). **Deux sportifs** passent la règle,
  Owens et Ali ; Ruth reste aux Biographies.

### Ce que les images disent aux États-Unis

Les Amérindiens sont la part délicate. Pocahontas est montrée par la gravure de
Simon van de Passe faite à Londres en 1616, Tecumseh par une aquarelle
d'Owen Staples de 1915 d'après une gravure de 1868 (une représentation posthume),
Sequoyah par une lithographie du XIXe siècle, Sacagawea par le détail d'une
peinture murale d'Edgar Paxson — « aucun portrait authentique n'existe » — et
Crazy Horse par une photographie de 1877 dont l'identification est contestée : la
légende dit qu'aucun portrait authentique n'est connu. Sitting Bull, Red Cloud,
Geronimo et le chef Joseph sont, eux, photographiés de leur vivant. Les
peintures — les autoportraits de Whistler et de Cassatt, Washington par Stuart,
Jefferson par Peale, Melville par Eaton… — côtoient des daguerréotypes (Poe,
Thoreau, Emerson, Dickinson, John Brown) et, pour tout le XXe siècle, des
photographies de presse ou de studio.

### Un pays à part : l'Italie

`pan_it`, « Grandes figures d'Italie » : **128 personnages**, d'Archimède (vers 287
av. J.-C.) à Paolo Borsellino (1940). Par axe : 31 Littérature et pensée, 24
Beaux-arts, 25 Musique, spectacle et sport, 19 Sciences, techniques et innovation, 18 Chefs d'État et
dirigeants, 11 Guerres et résistances ; 42 ⭐ et 13 biographies liées (Scipion,
César, Archimède, François d'Assise, Thomas d'Aquin, Dante, Brunelleschi, Léonard,
Palladio, Marco Polo, Colomb, Vespucci, Galilée). La liste a été soumise puis validée
sans retrait : 126 figures proposées, auxquelles s'ajoute Enzo Ferrari, à la demande.

Les choix qui ne vont pas de soi :

- **Un pays, donc pas un bloc**, comme l'Égypte et les États-Unis : `pan_it` (deux
  lettres), aucun champ `pays`, aucun pays dans la fiche, et « Pendant ce temps,
  ailleurs… » le compte comme l'Italie, au même titre que `thm_it`, l'« Histoire de
  l'Italie » que la table de pays (`assets/geo/theme-country-map.json`) range sous
  `IT`. Le thème se range par son nom de rangement, « Italie », entre la France et
  le Maghreb.
- **De la Rome antique à nos jours** : quatorze figures d'avant l'an mille
  (Archimède, Scipion, Cicéron, César, Marc Antoine, Virgile, Horace, Auguste,
  Ovide, Pline l'Ancien, Marc Aurèle, Boèce, Benoît de Nursie, Guido d'Arezzo).
  Comme au Maghreb, les figures de l'Antiquité sont rangées dans le pays actuel de
  leur lieu de naissance : Archimède, de Syracuse, est italien ; Hadrien et Trajan,
  nés en Espagne, Constantin, né en Serbie, et Callas, née à New York, ne le sont pas.
  Inversement, Garibaldi (né à Nice), Calvino (né à Cuba) et De Chirico (né à
  Volos, en Grèce) figurent ici : c'est l'Italie qui les honore.
- **Les papes et les saints sont dedans** : les papes (Jules II, Jean XXIII) chez
  les Chefs d'État et dirigeants, les saints et les religieux (Benoît de Nursie,
  François d'Assise, Thomas d'Aquin, Catherine de Sienne) en Littérature et pensée,
  comme Antoine le Grand et Augustin pour l'Égypte et le Maghreb.
- **Des dirigeants contestés**, dont la fiche dit ce qu'on leur reproche :
  Mussolini (la dictature, les lois raciales de 1938, la guerre), Berlusconi (le
  cumul du pouvoir politique et médiatique, ses procès, sa condamnation définitive
  pour fraude fiscale en 2013), Giolitti (la conquête de la Libye), César Borgia (la
  terreur en Romagne) et Colomb (les Taïnos réduits en esclavage, la destitution de
  1500).
- **Enzo Ferrari, exception à « pas d'entrepreneurs »**, ajouté sur
  décision de l'éditeur pour son rôle dans le rayonnement culturel de l'Italie dans
  le monde : il est rangé en Sciences, techniques et innovation (constructeur et ingénieur),
  comme Edison et Steve Jobs aux États-Unis. Giovanni Agnelli, Olivetti et Armani
  restent exclus. **Gino Bartali** passe la règle des sportifs : il a sauvé des Juifs
  pendant la guerre.
- **Un format de date étendu.** Auguste (63 av. J.-C.-14 ap. J.-C.) et Ovide (43
  av. J.-C.-17 ap. J.-C.) sont nés avant l'ère chrétienne et morts après, ce que la
  règle « av. J.-C. une fois, à la fin » ne savait pas écrire — d'où l'absence de
  Juba II au Maghreb. Le constructeur (`DATES` et `sentence_count` dans
  `scripts/build_pantheon.py`) et le test de schéma (`tests/data-schema.test.js`) acceptent
  désormais « 63 av. J.-C.-14 ap. J.-C. » : « av. J.-C. » après l'année de naissance,
  « ap. J.-C. » à la fin ; la naissance reste négative, et « ap. J.-C. » est protégé
  comme « av. J.-C. » dans le comptage des phrases.
- **Des dates incertaines, dites comme telles** : « vers » devant Mathilde de
  Toscane (1045 ou 1046), Benoît et Boèce (vers 480), Giotto (1266 ou 1267),
  Fra Angelico (entre 1387 et 1400), Piero della Francesca (entre 1412 et 1420),
  Giorgione (1477 ou 1478), Titien (1488-1490), Palestrina (1525 ou 1526),
  Stradivari, Cabot, Fibonacci, Guido d'Arezzo et Artemisia Gentileschi pour sa mort.
  Scipion (−236), François d'Assise (1181) et Colomb (1451) suivent leur biographie.
- **Les années de décès ont été recoupées avec Wikipédia**, non lues sur Wikidata
  seul : Wikidata donne 1794 pour Goldoni (mort le 6 février 1793) et 1758 pour
  Canaletto (mort le 19 avril 1768), 525 pour Boèce (que l'article fait mourir en 524).
- **Pas de vivants**, comme ailleurs.

### Ce que les images disent en Italie

Cent huit portraits reposent sur des bases solides : peintures, gravures, bustes et
photographies d'avant 1931, licences CC posées par l'auteur ou par une institution
(le Sénat de la République pour Pertini et Parri, l'ETH-Bibliothek de Zurich pour
Magnani, le Parti populaire européen pour Berlusconi, la bibliothèque universitaire
de Lund pour Levi-Montalcini, Olivier Strecker pour Morricone, Gorup de Besanez pour
Mastroianni, Obbino pour Leone, Kingkongphoto pour Pavarotti), CC0 des archives
néerlandaises (Eco et De Sica, Anefo ; Donizetti, Rijksmuseum), cliché du département
américain de l'Énergie (Fermi). Beaucoup sont posthumes ou imaginaires, et la légende
le dit : Dante par Botticelli, deux siècles après sa mort ; Horace, Pline l'Ancien et
Fibonacci par des gravures imaginaires ; Marco Polo par une mosaïque de 1867 ; Boèce
et Guido d'Arezzo par des miniatures ; Piero della Francesca par un bois gravé des
*Vies* de Vasari. Les bustes antiques sont montrés pour ce qu'ils sont — celui que
l'on prenait pour Scipion l'Africain, trouvé à Herculanum, serait un prêtre d'Isis ;
Archimède est montré par un « portrait d'érudit » de Domenico Fetti, « peut-être
Archimède » ; Virgile par une mosaïque romaine de Tunisie ; Brunelleschi par un
visage que la tradition reconnaît dans une fresque de Masaccio.

Dix-neuf images sont à relire, si l'on veut être plus strict :

- **Treize photographies du XXe siècle à balise « PD-Italy »** : la loi italienne
  protège vingt ans une « simple photographie », et Commons précise qu'une telle
  image n'est libre aux États-Unis que si elle a été créée avant 1976 et publiée avant
  1978, auquel cas elle porte aussi la balise « PD-1996 ». Six l'ont (Mussolini, De
  Gasperi, Jean XXIII, Matteotti, Gramsci, Ferrari). Les sept autres n'ont que
  la première : Aldo Moro (1955), Primo Levi (années 1950), Toscanini (1938), Pasolini
  (1964), Totò (avant 1967) et Visconti (1972), dont la date est antérieure à 1976, et
  **Enrico Berlinguer**, d'auteur et de date inconnus — le cliché le plus fragile de
  la liste. (Pertini, dont la photographie du Sénat porte aussi cette balise, est
  crédité de sa licence CC BY 3.0 IT, plus explicite.)
- **Cinq photographies à une autre raison de l'être** : Roberto Rossellini (1951,
  « publiée aux États-Unis entre 1931 et 1963 sans renouvellement du droit d'auteur »,
  dit la balise, ce que rien ici ne permet de vérifier pour un cliché de presse pris à
  Rome), Eugenio Montale (Kaj Hagman, 1965, « PD-Finland » : un cliché publié avant
  1966, libre en Finlande aussi en 1996), Maria Montessori (« PD-anon », auteur
  jamais révélé), et deux clichés de collections de la Bibliothèque du Congrès « sans
  restriction connue » — Federico Fellini (*New York World-Telegram*, 1965) et Giorgio de
  Chirico (Carl Van Vechten, 1936) —, même raisonnement que Matisse et Camus en France.
- **Une licence CC posée par un tiers**, plausible mais invérifiable d'ici : Italo
  Calvino (Johan Brun, Oslo, 1961, CC BY-SA 4.0).

Deux autres sont d'une nature à part : les portraits de **Falcone et de Borsellino**
sont des dessins au crayon de Luigi Oldani qui se déclare l'auteur (CC BY-SA 3.0),
faute de photographie libre.

Plusieurs images ont été **écartées** en route : la photographie de Falcone de 1984,
proposée à la suppression sur Commons ; celle de Borsellino, déposée sous « fair use »
(donc non libre) ; un mur peint à l'effigie de Berlinguer, qui n'est pas un portrait ;
le présumé autoportrait de Piero della Francesca, pour sa taille (170 px) ; les statues
de Giotto, de Donatello et de l'Arioste, remplacées par des portraits peints ; et une
photographie de Cavour assis, trop petite dans son cadre, remplacée par le portrait de
Hayez.

### Un pays à part : le Royaume-Uni

`pan_gb`, « Grandes figures du Royaume-Uni » : **151 personnages**, de Boudicca (vers 30)
à Amy Winehouse (1983). Par axe : 43 Littérature et pensée, 29 Sciences, techniques et
innovation, 22 Musique, spectacle et sport, 18 Chefs d'État et dirigeants, 15 Beaux-arts, 14
Guerres et résistances, 10 Économie et entreprise ; 51 ⭐ et 33 biographies liées (Henri VIII,
Élisabeth Ire, Victoria, Élisabeth II, Nelson, Wellington, Wilberforce, Pankhurst, Thomas
Becket, Wesley, Locke, Mill, Shakespeare, Austen, Dickens, Woolf, Wren, Newton, Faraday,
Darwin, Lovelace, Maxwell, Brunel, Cook, Livingstone, Turing, Rosalind Franklin, Hawking,
Lennon, Mercury, Bowie, Bannister, Wedgwood). La liste a été soumise puis validée sans
changement : 152 figures proposées, dont Haendel, retiré ensuite (voir plus bas).

Les choix qui ne vont pas de soi :

- **Un pays, donc pas un bloc**, comme l'Italie : `pan_gb` (deux lettres), aucun champ
  `pays`, aucun pays dans la fiche, et « Pendant ce temps, ailleurs… » le compte comme le
  Royaume-Uni, au même titre que `thm_gb`, l'« Histoire du Royaume-Uni » que la table de
  pays (`assets/geo/theme-country-map.json`) range sous `GB`. Le thème se range par son nom
  de rangement, « Royaume-Uni », après le Maghreb. Le code est `gb` (le code ISO du pays,
  non `uk`).
- **Les quatre nations dedans** : Wallace et Robert Bruce pour l'Écosse, Russell,
  Siddons, Wallace (le naturaliste) et Lawrence pour le pays de Galles, Kelvin, né à Belfast,
  pour l'Irlande du Nord. Les Irlandais de la République (Wilde, Swift, Shackleton) sont
  rangés dans le panthéon de l'Irlande ; Wellington, né à Dublin sous la couronne
  britannique, reste ici.
- **Celui qui honore le plus.** Nés ailleurs, rangés ici : Guillaume le Conquérant (Falaise,
  duc de Normandie devenu roi d'Angleterre), Kipling (Bombay), Orwell (Motihari), Tolkien
  (Bloemfontein), Nightingale (Florence), Hodgkin (Le Caire), Mercury (Zanzibar). Nés ici,
  restés ici, comme l'annonçait le panthéon des États-Unis : Chaplin, Hitchcock et Bell.
  **Haendel**, né à Halle et naturalisé britannique en 1727, était dans la liste soumise ;
  il est resté dans le panthéon de l'Allemagne, de l'Autriche et de la Suisse, qui l'avait
  déjà (règle : un personnage, un seul thème). Carnegie, né à Dunfermline, reste de même
  aux États-Unis.
- **Un septième axe, « Économie et entreprise »** : dix figures de la révolution industrielle
  et du commerce, de Gresham (1519) à Mary Quant (1930) — Boulton, Wedgwood, Arkwright,
  Thomas Cook, Cadbury, Lipton, Lever, Royce —, au-dessus du seuil de six figures et d'une
  histoire propre.
- **Des dirigeants contestés**, dont la fiche dit ce qu'on leur reproche : Cromwell (Drogheda
  et Wexford, l'exhumation de son corps), Churchill (les Dardanelles, la famine du Bengale), Thatcher
  (les mineurs, la capitation), Clive (Plassey, la famine de 1770 au Bengale). De même Locke
  (la Compagnie royale d'Afrique), Hume (des notes racistes), Kipling (« Le fardeau de l'homme
  blanc »), Cadbury (le cacao de São Tomé), Lever (le travail forcé au Congo) et Livingstone
  ou Cook, dont l'héritage colonial est discuté.
- **Des saints et des religieux** : Becket, Bède et Wesley, rangés en Littérature et pensée
  comme les saints de l'Italie.
- **Des dates incertaines, dites comme telles** : « vers » devant Boudicca (vers 30), Bède
  (vers 672), Guillaume le Conquérant (vers 1028), Wallace (vers 1270), Chaucer (vers 1343),
  Gresham (vers 1519), Tallis (vers 1505), Byrd (vers 1540) et Defoe (vers 1660). Newton garde 1642, date julienne
  de sa biographie. Becket, né en 1119 selon sa biographie (Wikipédia hésite entre 1118 et 1120), garde la date de celle-ci.
- **Les noms à initiales sont écrits en toutes lettres** (Herbert George Wells, Thomas Edward
  Lawrence, William Gilbert Grace, John Ronald Reuel Tolkien) : « H. G. Wells » casserait le
  comptage des phrases, qui prend un point suivi d'une majuscule pour une fin de phrase.
- **Pas de vivants**, comme ailleurs : Paul McCartney, Mick Jagger ou Charles III n'y sont
  pas.

La liste de départ comptait 194 candidats ; quatre y ont été ajoutés en route (Burne-Jones,
Paxton, Westwood, Ruskin) pour remplacer des artistes sans image. **Dix ont été écartés faute
d'image libre convenable** : Robert Hooke, dont aucun portrait authentique n'existe, Barbara
Hepworth, L. S. Lowry, Lucian Freud, Francis Bacon le peintre, Zaha Hadid, Dylan Thomas, Anita
Roddick, Laura Ashley et Owain Glyndŵr, qui n'a qu'un blason et un sceau dessiné. **Trente-six
l'ont été pour tenir la taille** : George III, Richard Cœur de Lion, Peel, Marlborough, Gordon,
Haig, Violette Szabo, Donne, Pope, Bentham, Coleridge, Tennyson, Keynes, Stevenson, C. S.
Lewis, Roald Dahl, Roger Bacon, Telford, Joule, Lister, Priestley, Dalton, Lyell, Whittle,
Higgs, Pugin, Beardsley, Lutyens, Holst, Sullivan, Garrick, Matthews, Clark, Fonteyn,
Burberry et Robert Owen. Ils peuvent rejoindre `scripts/pantheon/gb.json` si on le souhaite,
la plupart ayant un portrait libre déjà repéré.

### Ce que les images disent au Royaume-Uni

Cent trente et un portraits sont du domaine public, dont la quasi-totalité sont des peintures,
des gravures et des photographies d'avant 1931. Beaucoup sont posthumes ou imaginaires, et la
légende le dit : Alfred le Grand par la statue de Winchester ; Guillaume le Conquérant par
la tapisserie de Bayeux ; Boudicca par le groupe en bronze de Londres ; Robert Bruce par une
reconstitution faciale d'après son crâne ; Becket par un vitrail ; Bède par une gravure de
la Chronique de Nuremberg ; Tallis, Marlowe et Shakespeare (portrait « de Chandos ») pour
lesquels l'identification est incertaine ou le portrait posthume.

Quinze images sont à relire, si l'on veut être plus strict :

- **Treize photographies du XXe siècle à balise « Domaine public »**, dont la page de Commons
  ne dit pas pourquoi : Churchill (le portrait de Yousuf Karsh de 1941, aux balises
  « Domaine public » et « CC BY 2.0 » posées par un tiers), Attlee (« présumé Karsh »),
  Montgomery (ni auteur ni date), Russell (Bassano, 1936), Olivier (MGM, 1940), Leigh (1941),
  Perry (1936), Orwell (carte de presse de 1943), Britten (photographie publicitaire de 1968),
  Bobby Moore (1970, auteur inconnu), Hitchcock (photographie de studio, sans date), Fleming
  (fondation Nobel, 1945) et Turing (1936, auteur inconnu). Même raisonnement que Matisse et
  Camus en France.
- **Une licence CC posée par un tiers**, plausible mais invérifiable d'ici : Lennon (Tony Barnard,
  *Los Angeles Times*, 1974, CC BY 4.0).
- **Une photographie par une police** : Élisabeth II (police de Berlin, 2015, CC BY-SA 4.0).

Wallace est la plus petite image (250 × 344 px, une gravure) ; Milton, déjà petit, est
demandé à Commons en 330 px de large (`largeur`).

### Un pays à part : l'Espagne

`pan_es`, « Grandes figures d'Espagne » : **132 personnages**, de Trajan (53) à Margarita
Salas (1938). Par axe : 44 Littérature et pensée, 20 Chefs d'État et dirigeants, 18
Beaux-arts, 17 Musique, spectacle et sport, 17 Sciences, techniques et innovation, 16 Guerres
et résistances ; 36 ⭐ et 11 biographies liées (Isabelle Ire de Castille, le Cid, Ibárruri,
Averroès, Maïmonide, Ignace de Loyola, Cervantès, Ortega y Gasset, Gaudí, Balboa, Ramón y
Cajal). La liste a été soumise puis validée sans changement : 132 figures proposées, 132
retenues.

Les choix qui ne vont pas de soi :

- **Un pays, donc pas un bloc**, comme l'Italie et le Royaume-Uni : `pan_es`, aucun champ
  `pays`, aucun pays dans la fiche, et « Pendant ce temps, ailleurs… » le compte comme
  l'Espagne, au même titre que `thm_es`, l'« Histoire de l'Espagne » que la table de pays
  (`assets/geo/theme-country-map.json`) range sous `ES`. Le thème se range par son nom de
  rangement, « Espagne », entre l'Égypte et les États-Unis.
- **Six axes, pas de septième.** Güell, Comillas, Salamanca et Juan March, seuls candidats
  d'un axe « Économie et entreprise », ne font pas six ; l'axe n'a pas été créé (règle : au
  moins six figures et une histoire propre).
- **Les nations de la péninsule dedans** : Catalans (Jacques Ier, Companys, Casals, Gaudí,
  Miró, Dalí, Tàpies, Rodoreda, Caballé), Basques (Loyola, Elcano, Urdaneta, Lezo, Chillida,
  Unamuno, Baroja) et Galiciens (Rosalía de Castro, Pardo Bazán, Valle-Inclán, Cela), comme
  les quatre nations du Royaume-Uni. Le Portugal a son propre panthéon (voir « Un pays à part : le
  Portugal ») : Magellan et Viriathe, que les deux pays se disputent, y sont, et pas ici.
- **Hispanie romaine et al-Andalus dedans.** Trajan, Hadrien, Théodose, Sénèque et Martial
  d'un côté ; Abd al-Rahman III, Almanzor, Averroès, Maïmonide, Ibn Arabi, Abulcasis et Ibn
  Firnas de l'autre : la péninsule n'est pas devenue espagnole en 1492.
- **Celui qui honore le plus.** Nés ailleurs, rangés ici : Charles Quint (Gand), Jacques Ier
  (Montpellier), Don Juan d'Autriche (Ratisbonne) et le Greco (Candie). Hadrien, né à Italica
  selon l'article français et à Rome selon d'autres sources, le dit dans sa fiche. Maïmonide,
  Ibn Arabi et Servet ont quitté la péninsule ; Casals, Picasso, Buñuel, Zambrano ou Ochoa
  ont vécu en exil. Colomb, né à Gênes, reste au panthéon de l'Italie (un personnage, un seul
  thème).
- **Des conquistadors et des dirigeants contestés**, dont la fiche dit ce qu'on leur reproche :
  Cortés (massacres, esclavage, épidémies), Pizarro (l'exécution d'Atahualpa malgré la
  rançon), Las Casas (une description jugée exagérée, une proposition d'esclaves africains qu'il
  a regrettée), Philippe II et Cisneros (l'Inquisition, les conversions forcées de Grenade),
  Isabelle et Ferdinand (l'expulsion des juifs en 1492), Franco (trente-six ans de dictature,
  des dizaines de milliers de fusillés), Cánovas (le « turno » et le pouvoir des caciques),
  Cela (censeur sous Franco), Belmonte (la corrida) et Cierva, qui avait aidé à affréter
  l'avion de Franco. François Xavier a demandé l'Inquisition à Goa ; Dominique, dont l'ordre
  l'a ensuite exercée, n'est pas jugé sur elle.
- **Des saints et des religieux** : Isidore, Dominique, Loyola, François Xavier, Thérèse
  d'Avila et Jean de la Croix, rangés en Littérature et pensée comme ceux de l'Italie et du
  Royaume-Uni.
- **Des dates incertaines, dites comme telles** : « vers » devant Pélage (vers 685), le Cid
  (vers 1043), Pizarro (vers 1475), Sénèque (vers 4 av. J.-C.), Martial (vers 40), Isidore (vers
  560), Dominique (vers 1170), Lulle (vers 1232), Nebrija (vers 1444), Rojas (vers 1470),
  Berruguete (vers 1490), Garcilaso (vers 1501), Tirso (vers 1579), Victoria (vers 1548),
  Abulcasis (vers 936), Cabeza de Vaca (vers 1488) et Servet (vers 1511). Quand les sources
  divergent, la date retenue est la plus consensuelle : Ferdinand III en 1201 (Wikipédia en
  français ; 1199 ailleurs), Elcano en 1486 (et non 1476), Don Juan d'Autriche en 1547 (1545 ou
  1547), Almanzor en 938, Lulle mort en 1315 (1316 ailleurs), Riego en 1784 (1785 sur certaines
  images), Vives en 1493 (1492 sur Commons).
- **Pas de vivants**, comme ailleurs : Nadal, Gasol, Plácido Domingo, Calatrava, Amancio
  Ortega, Juan Carlos Ier et Felipe González n'y sont pas ; leurs biographies, quand l'appli en
  a une (Domingo, Nadal, Gasol, Calatrava, Ortega), ne sont donc liées à aucune fiche.
- **Trois sportifs, validés avant que la règle ne se resserre** : Belmonte (la tauromachie, et
  l'amitié des écrivains), Ballesteros (le golf européen) et Ángel Nieto (treize titres mondiaux
  de vitesse moto). La liste espagnole a été soumise et validée avec eux ; la règle des sportifs
  (« Les sportifs : une exception, pas une règle ») veut qu'un nom dépasse le sport et que les
  records seuls ne suffisent pas. Belmonte la passe sans peine, Ballesteros plus difficilement, et
  Nieto, dont le titre est surtout un record, serait le premier à en sortir si l'on veut
  appliquer la règle strictement : il n'a pas encore de biographie dans l'appli. **Les trois
  sont gardés** : la question a été posée, et tranchée en leur faveur.
- **Les titres** : « Le Cid » et « Le Greco » donnent « Naissance du Cid » et « Naissance du
  Greco », comme « du Tasse » en Italie.

### Ce que les images disent en Espagne

Cent deux portraits sont du domaine public, 2 sont CC0, 5 CC BY et 23 CC BY-SA, la
licence lue sur la page Commons. Beaucoup sont posthumes ou imaginaires, et la légende le
dit : Pélage (peint en 1855), Isidore (par Murillo, mille ans après), Averroès (fresque
florentine du XIVe siècle), Dominique (Fra Angelico), Abulcasis (peinture d'Ernest Board, début du XXe siècle),
Martial (un profil gravé qui n'est pas un portrait), Abd al-Rahman III, représenté par un
dirham faute de portrait, Ibn Arabi et Ibn Firnas, qui n'ont qu'un dessin moderne. Garcilaso
est un « portrait présumé » (chevalier d'Alcántara anonyme, vers 1550), et le Greco un
« autoportrait présumé ».

Onze images restent faibles, et sont gardées, par manque de portrait libre convenable : le dirham d'Abd
al-Rahman III et le dessin moderne d'Ibn Firnas, six statues (le Cid, Lulle dans sa niche,
Agustina d'Aragon, Berlanga, Nebrija, Berruguete), deux bustes (Almanzor et Rodrigo) et une
photographie de sport (Ballesteros, en plein swing). Sept sont recadrées
sur la figure (`recadrage` : Ballesteros, le Cid, Lulle, Galdós, Agustina, Berlanga, Rodrigo).
Wikimedia refusant à plusieurs reprises les miniatures de 500 px de trois fichiers
(Companys, Berruguete et Peral), ceux-ci sont demandés à une autre largeur standard
(`largeur` : 960 pour Companys, 330 pour Berruguete et Peral, d'où des images moins nettes).

Dix-huit images sont à relire, si l'on veut être plus strict ; elles sont gardées telles quelles :

- **Dix-sept photographies du XXe siècle à balise « Domaine public »**, dont la page de
  Commons ne dit pas toujours pourquoi (auteur inconnu ou lointain, publication dans la
  presse) : Suárez (photographie officielle du Consejo de Ministros de 1979, signée du
  ministère de la Présidence), Companys, Durruti, Iglesias, Baroja, Jiménez, Ortega, Alberti,
  Zambrano, Hernández, Lorca, Buñuel, Falla, Caballé, Camarón, Picasso (revue argentine,
  1962) et Ochoa (université de New York, 1958). Même raisonnement que Matisse et Camus en
  France.
- **Une photographie à licence CC0 posée sans auteur** : Franco (portrait officiel).

Les crédits d'auteur ont été remis au propre à la main : le script ne reprend pas l'auteur
que Commons rend trop long ou trop vague (« Unknown author Unknown author », listes de noms
alternatifs), ce qui laissait dix-huit portraits sans crédit.

### La France, de 68 à 140 figures

`pan_fr` était le plus mince des panthéons de pays, en comparaison de l'Italie (127),
des États-Unis (129), de l'Espagne (132), de l'Allemagne-Autriche-Suisse (149) et du
Royaume-Uni (151). Il passe de 68 à **170 personnages**, de Vercingétorix (vers 82 av. J.-C.) à
Serge Gainsbourg (1928) : 72 figures ajoutées, plus 10 invités de Monaco (voir « Les micro-États »), Pétain, Rachi et 18
figures d'outre-mer (voir plus bas).
Par axe : 37 Chefs d'État et dirigeants, 39 Littérature et pensée, 23 Sciences, techniques et
innovation, 19 Beaux-arts, 20 Guerres et résistances, 20 Musique, spectacle et sport, 12
Économie et entreprise ; 42 ⭐ et 29 biographies
liées (Sartre, Gainsbourg et Alexandra David-Néel s'ajoutent aux 26 d'avant).

- **Les ajouts, par axe** : Philippe Auguste, Philippe le Bel, Louis XI, Colbert, Louis XVI,
  Talleyrand, Robespierre, Napoléon III, Gambetta, Jaurès, Blum, Mitterrand ; Du Guesclin, Bayard,
  Turenne, Carnot, Louise Michel, Dreyfus, Marc Bloch, Leclerc, Germaine Tillion, Lucie Aubrac ;
  Ronsard, Corneille, Madame de Sévigné, Racine, Montesquieu, Diderot, Beaumarchais, Chateaubriand,
  Stendhal, Balzac, Dumas, Flaubert, Rimbaud, Colette, Sartre ; Le Nôtre, Watteau, Ingres, Courbet,
  Manet, Degas, Renoir, Morisot, Gauguin, Toulouse-Lautrec ; Lully, Bizet, Méliès, Coubertin, Ravel,
  Gabin, Brassens, Gainsbourg, Truffaut ; Paré, Champlain, Buffon, Laplace, Fourier, Ampère, Claude
  Bernard, Poincaré, Pierre Curie, Blériot, Alexandra David-Néel ; Hermès, Boucicaut, Peugeot,
  Monnet, Dassault.
- **Sept axes, déjà là** : l'axe « Économie et entreprise » existait pour la France (douze figures
  désormais), aucun axe n'a été créé.
- **Ce qui a été écarté, et pourquoi.** Fermat (né entre 1601 et 1607 selon les sources) et Manouchian
  (1906 ou 1909) : une date de naissance trop incertaine pour être celle de l'événement. Villon : le
  format de la phrase d'ouverture exige une année de décès, et l'on ignore la sienne. Le
  Corbusier, né en Suisse, est déjà au panthéon de l'Allemagne, de l'Autriche et de la Suisse (un
  personnage, un seul thème).
- **Nés ailleurs, rangés ici**, comme Marie Curie : Lully (Florence) et Thierry Hermès (Krefeld,
  alors française) ; le pays d'un panthéon est celui qui honore.
- **Pétain y est, comme Hitler, Mussolini et Franco dans leurs panthéons**, avec une fiche qui dit
  tout : Verdun, puis Vichy, le statut des Juifs, la collaboration, la rafle du Vél' d'Hiv et la
  condamnation de 1945. Un panthéon de la France sans lui laisserait un trou dans l'histoire que
  l'app raconte ; il y figure comme figure de l'histoire, non comme figure honorée. Rangé en Chefs
  d'État (comme Mussolini), marqué ⭐ ; son portrait est la photographie officielle de 1941, et la
  légende le dit.
- **Rachi y est, et non en Israël.** Né, enseignant et mort à Troyes, il n'a jamais vécu en Terre
  d'Israël : selon le critère d'Israël (« un Juif qui n'y a pas vécu reste dans le thème de son pays »,
  comme Maïmonide en Espagne), il appartient au panthéon de la France. Rangé en Littérature et
  pensée, comme les autres commentateurs et religieux, marqué ⭐. Son année de naissance est dite
  « vers 1040 » ; son portrait est une gravure sur bois imaginaire de 1539, et la légende le dit. Un
  événement de même titre existe dans le thème d'histoire juive : les deux fiches partagent le même
  point sur la carte (Troyes), comme l'exige la règle des faits liés.
- **L'outre-mer : la France, avec son territoire dit.** La Martinique, la Guadeloupe, la Guyane, La
  Réunion et Mayotte sont des départements français : leurs figures sont au panthéon de la France, et non
  dans un thème à part (le panthéon de l'océan Indien occidental exclut La Réunion et Mayotte pour cette
  raison). Chacune porte un `pays` — `MQ`, `GP`, `GF`, `RE`, `YT` — comme les invités de Monaco : la
  fiche affiche le drapeau et le nom du territoire sous la date, et la galerie les filtre à part. La
  Simultanéité les compte donc comme un « ailleurs » face à la France métropolitaine, ce qui est
  géographiquement juste. **18 figures** : Martinique (4) Césaire, Fanon, Glissant, Joséphine de
  Beauharnais ; Guadeloupe (4) le chevalier de Saint-George, Louis Delgrès, Saint-John Perse, Maryse
  Condé ; Guyane (4) Félix Éboué, Gaston Monnerville, Léon-Gontran Damas, Henri Salvador ; La Réunion
  (5) Parny, Leconte de Lisle, Edmond Albius, Roland Garros, Raymond Barre ; Mayotte (1) Younoussa
  Bamana. Delgrès, né à Saint-Pierre (Martinique) mais héros de la résistance guadeloupéenne de 1802,
  est rangé en Guadeloupe, où on l'honore. Écartés : Zéna M'Déré (née « entre 1917 et 1922 ») et le roi
  Andriantsoly (naissance inconnue), dont l'année manque ; Mayotte n'a donc qu'une figure, à étoffer.
  Le portrait de Delgrès est un buste (faute de portrait d'époque), celui d'Edmond Albius un dessin
  retouché ; Saint-George est montré par une gravure de 1788.
- **Les collectivités du Pacifique ne sont pas ici.** La Polynésie française, la Nouvelle-Calédonie et
  Wallis-et-Futuna ont une identité locale très liée à l'Océanie, leur propre statut et le franc Pacifique
  plutôt que l'euro, à la différence des départements d'outre-mer, très intégrés : leurs figures sont dans
  « Grandes figures de Nouvelle-Zélande et du Pacifique ». Une **note de thème** (champ `theme.note` de
  `scripts/pantheon/fr.json`, reporté sur le thème par `build_pantheon.py`) le dit à l'ouverture de
  « Grandes figures de France », sur l'écran des axes, avec le même encadré que les notes de
  sous-catégorie. Tout thème peut en porter une.
  Dans la galerie, la France se lit « France métropolitaine (143) » (clé `gallery.country_fr`, traduite
  dans les six langues) : elle ne contient pas l'outre-mer, qui a ses entrées (Martinique, Guadeloupe,
  Guyane, La Réunion, Mayotte) triées à leur place alphabétique.
- **Des figures contestées, dont la fiche dit ce qu'on leur reproche** : Colbert (le Code noir,
  préparé sous son ministère), Philippe le Bel (les Templiers), Turenne (le Palatinat), Napoléon
  III (le coup d'État), Mitterrand (Vichy, Bousquet), Degas (l'affaire Dreyfus), Gauguin (ses
  relations avec de très jeunes filles à Tahiti), Coubertin (la place des femmes et des peuples
  colonisés).
- **Des dates incertaines, dites comme telles** : « vers » devant Du Guesclin (vers 1320), Bayard
  (vers 1474 : 1473 ou 1474 selon les sources), Paré (vers 1510) et Champlain (vers 1567 : entre
  1567 et 1574 selon Wikipédia).
- **Pas de vivants**, comme ailleurs : Zidane et Bernard Arnault, qui ont une biographie dans
  l'appli, n'ont donc pas de fiche ici.
- **Les rangements de la galerie** : Philippe Auguste et Philippe le Bel se rangent par leur
  prénom, André Le Nôtre sous « Le Nôtre » et Leclerc de Hauteclocque sous « Leclerc ».

**Portraits.** 72 JPEG de 320 × 400, 24 Ko en moyenne, 1,7 Mo en tout : 59 du domaine public, 3 CC0,
5 CC BY et 5 CC BY-SA, la licence lue sur la page Commons. Quatre portraits écrivent le nom dans
l'image et sont marqués `nomVisible` : le sceau de Philippe Auguste, Du Guesclin, Montesquieu et
Racine. Les images les plus faibles : le **sceau** de Philippe Auguste (faute de portrait ancien
sur Commons), la **gravure** où Champlain tire à l'arquebuse (un dessin de sa main, qui ne montre
pas son visage), la gravure d'Ambroise Paré, le portrait de Du Guesclin (peint au XVIe siècle,
plus d'un siècle après sa mort) et Sartre, demandé en 330 px parce que Commons refuse les
miniatures plus grandes de ce fichier. Pour Philippe le Bel, c'est le détail d'une miniature
qui le montre avec sa famille.

### Les micro-États

Monaco, Saint-Marin, Andorre, le Liechtenstein et le Vatican n'ont pas un thème « micro-États »
à eux : ce serait un thème par la taille, non par l'histoire (le Luxembourg est de même réservé à
un futur « Benelux »), et il aurait compté une vingtaine de figures, presque toutes des princes, sous
les 30 qu'on vise pour un petit pays. Chaque État est un **invité** du panthéon le plus proche,
dont le titre ne change pas ; la fiche dit son pays (drapeau et nom sous la date), la galerie le
filtre à part (« 🇲🇨 Monaco (10) »), et « Pendant ce temps, ailleurs… » le compte comme un autre
pays que son hôte.

- **Une règle assouplie** : un panthéon de pays n'avait pas de champ `pays`. Il l'accepte pour un
  invité, jamais pour le pays du panthéon lui-même (`scripts/build_pantheon.py`,
  `tests/data-schema.test.js`). Les sources `scripts/pantheon/<code>.json` ne changent pas de forme.
- **Monaco (10)**, dans `pan_fr` : Honoré II (1597), Louis Ier (1642), Antoine Ier (1661), Honoré
  III (1720), Charles III (1818), Albert Ier (1848), Louis II (1870), Charlotte (1898), Rainier III
  (1923) et Grace Kelly (1929), américaine honorée à Monaco. Huit sont rangés en Chefs d'État (sept
  souverains et Charlotte, héritière du trône), Albert Ier, souverain lui aussi, en Sciences pour
  son œuvre d'océanographe, Grace Kelly en Musique, spectacle et sport. Honoré V, dont la fiche n'a pas pu être
  établie avec certitude, est resté dehors ; Louis Notari, écrivain, n'a pas de portrait ; François
  Grimaldi (Malizia) n'a pas d'année de naissance connue. Les titres portent « de Monaco »
  (« Charles III de Monaco », « Louis II de Monaco ») pour ne pas se confondre avec Charles III
  d'Espagne et Louis II de Bavière.
- **Liechtenstein (4)**, dans `pan_dach`, dont la liste de pays gagne `LI` : Jean Ier (1760), Jean II
  (1840), François-Joseph II (1906) et Josef Rheinberger (1839), le compositeur né à Vaduz. Les
  princes sont presque tous nés en Autriche ou en Moravie, et vivaient à Vienne : le pays les
  honore, il n'est pas leur lieu de naissance. Alois II et François Ier, sans fiche solide, sont restés
  dehors. Le thème garde son titre « Allemagne, Autriche et Suisse » ; la recherche « liechtenstein »
  ou « vaduz » y mène par ses `motsCles`.
- **En attente : Saint-Marin et Andorre**, faute de portrait libre. Pour Saint-Marin : Bartolomeo
  Borghesi (1781, numismate, né en Italie), Giovanni Battista Belluzzi (1506, architecte, sans portrait
  sur Commons) ; saint Marin, légendaire, n'a pas de date de naissance fiable. Pour Andorre : Guillem
  d'Areny-Plandolit (1822) et Francesc Cairat (1880), sans portrait libre vérifié. Ils rejoindraient
  `pan_it` et `pan_es`.
- **Vatican : aucune figure propre.** Les papes sont déjà rangés par leur nationalité (Jean XXIII
  dans `pan_it`, François dans `pan_hispam`), et un pape italien n'est pas né au Vatican.

### Un pays à part : la Chine

`pan_cn`, « Grandes figures de Chine » : **122 personnages**, de Qin Shi Huang (259 av. J.-C.) à
Yuan Longping (1930). Par axe : 34 Littérature et pensée, 26 Chefs d'État et dirigeants, 18
Guerres et résistances, 17 Beaux-arts, 17 Sciences, techniques et innovation, 10 Musique,
spectacle et sport ; 41 ⭐ et 12 biographies liées (Qin Shi Huang, Wu Zetian, Sun Tzu, Zhuge
Liang, Zheng He, Confucius, Zhuangzi, Mencius, Lu Xun, Xuanzang, Bruce Lee, Zhang Heng).
122 portraits : 96 du domaine public, 1 CC0, 7 CC BY et 18 CC BY-SA.

Les choix qui ne vont pas de soi :

- **Un pays, donc pas un bloc** : `pan_cn`, aucun champ `pays` pour les figures de Chine, et
  « Pendant ce temps, ailleurs… » le compte comme `thm_cn`, l'« Histoire de la Chine ». Le thème
  se range par « Chine », entre l'Amérique hispanique et l'Égypte. La RPC, la République de Chine
  (Sun Yat-sen, Tchang Kaï-chek) et Hong Kong (Leslie Cheung, Anita Mui, Jin Yong) sont dedans.
- **Deux invités.** Bruce Lee (né à San Francisco, `US`) et Teresa Teng (née à Taïwan, `TW`) portent
  leur pays, comme Monaco dans le panthéon de la France ; ce champ est un repère technique, non une
  position politique.
- **Un nom chinois s'écrit famille d'abord** (Mao Zedong, Li Bai) et se range tel quel ; seuls les
  noms écrits à l'occidentale (Bruce Lee, Teresa Teng, Anita Mui, Leslie Cheung) passent par les exceptions de
  `scripts/pantheon_classement.py`. Les empereurs portent leur nom de règne ou de temple (Hongwu, Yongle,
  Kangxi, Qianlong, Taizong des Tang) ; le nom de naissance est dans la fiche.
- **Des dirigeants contestés**, dont la fiche dit ce qu'on leur reproche : Qin Shi Huang (autodafé,
  tyrannie), Hongwu (purges), Cixi, Yuan Shikai (l'empire de 1915), Tchang Kaï-chek (la loi martiale à
  Taïwan), Mao (le Grand Bond en avant, la Révolution culturelle), Deng (Tiananmen), Puyi (le Mandchoukouo).
- **Kubilai Khan est ici**, en tant que fondateur de la dynastie Yuan ; Gengis Khan n'y est pas. Les
  figures tibétaines (le dalaï-lama) sont laissées de côté, comme celles d'un futur panthéon de la Mongolie
  et de l'Asie centrale : leur rattachement est disputé.
- **Écartés faute d'image libre** : Liu Xiaobo (la biographie existe, mais aucune image libre
  convenable), Chien-Shiung Wu (aucun portrait libre accepté), Yang Chen-Ning (auteur du portrait
  inconnu : une licence CC BY-SA sans crédit possible), Zao Wou-ki (seule sa signature est libre ;
  français naturalisé, il aurait été un invité `FR`). Laozi n'y est pas non plus : sa naissance est
  légendaire et sa mort inconnue, que l'ouverture « Nom (naissance-décès) » ne sait pas dire.
- **Pas de vivants.** Tu Youyou, Wang Shu, Jack Ma, Yao Ming, Mo Yan et Xi Jinping n'y sont pas ; leurs
  biographies, quand l'appli en a une, ne sont liées à aucune fiche. I. M. Pei, de nationalité américaine,
  n'y est pas non plus.
- **Pas de sportif.** Aucun nom qui dépasse le sport n'a été retenu ; Yao Ming est vivant.
- **Des dates incertaines, dites comme telles** : « vers » devant Liu Bang (256 ou 247 av. J.-C.), Sun
  Tzu (544-496), Zhuangzi, Xunzi, Han Feizi, Shang Yang, Guan Yu, Gu Kaizhi, Luo Guanzhong, Cao Xueqin
  (1715 ou 1724), Zhang Zhongjing, Hua Tuo, Cai Lun et Bi Sheng. Quand les sources divergent, la date est la
  plus consensuelle : Li Bai en 701 (702 sur Wikipédia en français), Wang Xizhi en 303 (321 pour d'autres), Yan Zhenqing en 708 (709
  ailleurs), Wen Tianxiang mort en 1283 (1282 selon le calendrier chinois), Zheng Banqiao mort en 1765, Shitao
  (1641-vers 1720).
- **Les titres** : « Naissance d'Abing » et « Naissance d'Anita Mui » prennent l'apostrophe ; « Naissance de Yue Fei » non.

### Ce que les images disent en Chine

Sur 122 portraits, très peu sont authentiques : pour tout ce qui précède la photographie, on a
des portraits d'époques tardives ou imaginaires, et la légende le dit (« un portrait imaginaire »,
« peint des siècles après sa mort »). Treize images écrivent le nom (inscription, dédicace, panneau) et sont
marquées `nomVisible` : Liu Bang, Xuanzong, Xiang Yu, Cao Cao, Confucius, Mencius, Li Bai, Du Fu, Lu Xun,
Cai Lun, Zhang Zhongjing, Guo Shoujing et Luo Guanzhong.

Images faibles, gardées faute de mieux : Wu Zetian (la stèle sans inscription de son mausolée de Qianling,
aucun portrait authentique n'existe), Wu Cheng'en (une page d'édition ancienne), Zhang Heng (une réplique
de son sismoscope), Bi Sheng (un atelier reconstitué), Su Song (la reconstitution de son horloge),
Leslie Cheung (une statue de cire), Anita Mui (une statue), et douze autres statues ou bustes (Shang Yang, Sun Tzu,
Ban Chao, Zheng He, Qi Jiguang, Han Feizi, Li Qingzhao, Luo Guanzhong, Cao Xueqin, Zu Chongzhi, Yi Xing, Guo Shoujing).
Wang Wei est un dessin vu de dos. Deux sont recadrés (Qian Xuesen, Deng Jiaxian).

À relire, si l'on veut être plus strict : les photographies du XXe siècle à balise « Domaine public »
de sources officielles ou de presse (Mao, Zhou Enlai, Zhu De, Peng Dehuai : agence Xinhua ; Deng, 1979 ;
Zhang Xueliang, Zhang Daqian, Qi Baishi, Hu Shi, Lao She, Qian Xuesen, Teresa Teng, Bruce Lee) : même
raisonnement que Matisse et Camus en France. Les crédits d'auteur trop vagues ont été remis au propre à la
main (« Auteur inconnu »). Le client de Commons refusant à plusieurs reprises la miniature de 500 px de
Ba Jin, celui-ci est demandé en 960 px (`largeur`).

### Un pays à part : la Russie

`pan_ru`, « Grandes figures de Russie » (code `ru`, pays) : **155 personnages**, dont **20 invités de la Biélorussie** (voir plus bas), d'Euphrosyne de Polotsk (vers 1104) à
Alexeï Navalny (1976). Par axe : 41 Littérature et pensée, 28 Chefs d'État et dirigeants, 23 Guerres et
résistances, 22 Musique, spectacle et sport, 22 Sciences, techniques et innovation, 19 Beaux-arts ; 38 ⭐ et
8 biographies liées (Pierre le Grand, Catherine II, Koutouzov, Joukov, Dostoïevski, Tolstoï, Mendeleïev,
Gagarine). 155 portraits : 123 du domaine public, 2 CC0, 12 CC BY et 18 CC BY-SA (versions 2.0 à 4.0). Pas d'axe « Économie et
entreprise » : les mécènes (Tretiakov) et le joaillier Fabergé sont rangés aux Beaux-arts.

- **Un pays, pas un bloc** : `pan_ru`, et « Pendant ce temps, ailleurs… » le compte
  comme `thm_ru` et `thm_urss`. Les figures russes n'ont pas de champ `pays` ; les **vingt invités biélorusses**
  portent `pays: "BY"`, comme Monaco chez la France, et la fiche dit leur pays. L'Ukraine a son propre panthéon
  (voir « Un pays à part : l'Ukraine »).
- **Le pays qui honore, pas l'état civil.** Sont ici des figures nées hors des frontières actuelles mais
  honorées avant tout en Russie, et la fiche le dit : Trotski (Ianovka), Brejnev, Berdiaev, Boulgakov,
  Akhmatova, Répine, Prokofiev et Korolev (Ukraine), Gogol et Malevitch (que l'Ukraine revendique aussi),
  Mandelstam et Eisenstein (Pologne, Lettonie), Staline (Géorgie), Rostropovitch (Azerbaïdjan). Les exilés
  (Kandinsky, Stravinsky, Rachmaninov, Brodsky, Soljenitsyne) y sont aussi : la Russie les honore.
- **Les figures disputées sont écrites comme telles** : Navalny et Politkovskaïa y sont avec la mort de
  l'un et le meurtre de l'autre ; Lénine, Staline, Trotski et Brejnev avec leurs crimes ou leurs échecs.
- **Dates** : Staline est né en 1878 (le 21 décembre 1879 est la date officielle) ; Korolev en 1907 (12 janvier
  grégorien, 30 décembre 1906 julien) ; Nevski vers 1220 ; Razine vers 1630. Les dates julien/grégorien des
  articles de Wikipédia ne sont pas toujours convertis : on suit le calendrier grégorien.
- **Écartés pour une date disputée** : Anna Pavlova (1881 ou 1882), Fiodor Ouchakov (1744 ou 1745),
  Griboïedov (1790, 1794 ou 1795), Dmitri Levitski (1735 ou 1737).
- **Écartés faute d'image libre aux États-Unis** : Maïakovski (la seule image libre porte une mention de
  droits contestée), Plissetskaïa (la photographie libre est un cliché de 1974 sans auteur), Nabokov (la photographie
  de 1973 n'est pas libre aux États-Unis, URAA) et Kourtchatov (cliché soviétique de 1948). Les clichés
  soviétiques d'après 1930 « libres en Russie » ont été écartés pour des licences explicites (Staline :
  Signal Corps américain, 1943 ; Khrouchtchev : archives néerlandaises, CC0).
- **Les images** : les tsars Ivan III, Ivan IV et Alexandre Nevski sont montrés par des miniatures du Livre
  des titres du tsar (1672), posthumes, qui écrivent le nom et sont marquées `nomVisible`. Donskoï est une
  statue (monument du Millénaire de la Russie), Pojarski et Razine des gravures, Tchouïkov un portrait peint
  en 2018, Oulanova une photographie de 1968 (Anefo) ; à remplacer si de meilleures images libres apparaissent.
- **Pas de vivants** : Terechkova (qui a sa biographie), Poutine, Kasparov, Alla Pougatcheva et Anna Netrebko n'y sont pas.

### Un pays à part : la Grèce

`pan_gr`, « Grandes figures de Grèce » : **82 personnages**, de Solon (vers 640 av. J.-C.) à Vangelis
(1943). Par axe : 30 Littérature et pensée, 13 Chefs d'État et dirigeants, 12 Guerres et résistances,
12 Musique, spectacle et sport, 9 Sciences, techniques et innovation, 6 Beaux-arts ; 40 ⭐ et 5
biographies liées (Alexandre le Grand, Socrate, Platon, Aristote, Maria Callas). 82 portraits : 51 du
domaine public, 1 CC0, 7 CC BY et 23 CC BY-SA.

Les choix qui ne vont pas de soi :

- **Un pays, donc pas un bloc** : `pan_gr`, aucun champ `pays`, et « Pendant ce temps, ailleurs… » le
  compte comme `thm_gr`, l'« Histoire de la Grèce ». Le thème se range par « Grèce », entre la France
  et Israël. Le panthéon est celui du monde grec, de l'Antiquité à nos jours : les figures nées en Asie
  Mineure, en Égypte ou en Roumanie (Hérodote, Cavafy, Xenakis) y sont par leur culture grecque.
- **Byzance est dedans, mais à petite dose** : Basile II, Alexis Ier Comnène, Constantin XI, Anne
  Comnène et Pléthon. Justinien (né en Illyrie, de langue latine) reste aux Biographies.
- **Homère n'y est pas** : sa fiche d'ouverture « Nom (naissance-décès) » ne sait pas dire une naissance
  et une mort légendaires ; il garde sa biographie. Hésiode, Ésope, Euclide et Praxitèle sont dans le
  même cas (dates inconnues ou trop incertaines pour la phrase d'ouverture).
- **Pas de vivants** : Nana Mouskouri, Giánnis Antetokoúnmpo et Pýrros Dímas n'y sont pas. **Pas
  d'entrepreneurs** : Onassis (qui a sa biographie) et Niarchos auraient demandé un septième axe, qui
  n'a que deux figures ; la règle est d'en exiger six. **Un sportif** passe la règle, Spyrídon Loúis,
  vainqueur du premier marathon olympique en 1896.
- **Alexandre et Philippe de Macédoine** sont ici : Alexandre garde la date de sa biographie, et la
  Macédoine antique est rattachée au monde grec ; l'État macédonien actuel n'a pas de panthéon.
- **Des figures disputées ailleurs** : Archimède (Syracuse) est dans le panthéon de l'Italie, Hypatie
  et Ptolémée dans celui de l'Égypte ; Castoriadis, naturalisé français, est ici car il se réclame de
  la démocratie athénienne.
- **Des dates incertaines, dites comme telles** : « vers » devant Solon, Thémistocle, Périclès,
  Pyrrhus, Léonidas, Miltiade, Épaminondas, Sappho, Eschyle, Sophocle, Euripide, Aristophane,
  Hérodote, Thucydide, Xénophon, Héraclite, Démocrite, Diogène, Zénon, Plutarque, Phidias, Polyclète,
  Lysippe, Thalès, Anaximandre, Pythagore, Hippocrate, Aristarque, Hipparque, Basile II, Alexis Ier,
  Pléthon, Anne Comnène (décès), Kanaris, Bótzaris et Rigas.
- **Écartés faute d'image convenable** : Kostís Palamás (seule une toile de groupe est libre) et
  Georgios Papanikolaou (le portrait libre est une silhouette lointaine). Dix-huit autres noms envisagés
  attendent (Clisthène, Pisistrate, Myron, Praxitèle, Apelle, Ictinos, Hippodamos, Karamanlis, Ritsos,
  Doxiadis, Tsitsanis, Velouchiótis, Melás, Diákos, Karaïskákis, Parthénis, Ghikas, Pikionis), dont
  certains sans titre d'article trouvé ou sans image libre.

### Ce que les images disent en Grèce

Avant la photographie, très peu de portraits sont authentiques : les bustes de l'Antiquité sont
des copies romaines d'originaux grecs perdus, posthumes, et la légende le dit. Plusieurs images sont de
simples gravures du XIXe siècle (Thémistocle, Thalès) ou des représentations modernes (Épaminondas à
Stowe, Héraclite et Démocrite par Torretti). Trois images écrivent le nom (socle d'Aristophane, médaillon
d'Hipparque, page de titre d'Épictète) et sont marquées `nomVisible`. Faibles, gardées faute de mieux :
Sappho (une jeune femme de Pompéi, qui n'est pas elle), Polyclète et Lysippe (une de leurs œuvres, non
leur visage), Mitropoulos (un dessin au crayon), Pléthon (un détail de fresque) et Plutarque (un buste
moderne). L'image de Bouboulína est une lithographie de 1827.

### Un pays à part : l'Australie

`pan_au`, « Grandes figures d'Australie » (code `au`, pays) : **99 personnages**, d'Arthur Phillip (1738) à
Heath Ledger (1979). Par axe : 22 Musique, spectacle et sport, 21 Sciences, techniques et innovation, 15 Guerres
et résistances, 14 Chefs d'État et dirigeants, 14 Beaux-arts, 13 Littérature et pensée ; 24 ⭐ et 4 biographies
liées (Menzies, Monash, Mary MacKillop, Patrick White). 99 portraits : 75 du domaine public, 9 CC BY et 15 CC BY-SA.
Pas d'axe « Économie et entreprise » : Rupert Murdoch et Nicole Kidman, qui ont leur biographie, sont vivants.

- **Un pays, pas un bloc** : `pan_au`, et « Pendant ce temps, ailleurs… » le compte comme `thm_au`. Les invités
  d'un autre État portent leur `pays` et la fiche le dit : Phillip, Macquarie et Flinders (Royaume-Uni),
  Leichhardt (Allemagne), Walter Burley Griffin (États-Unis). Les figures nées ailleurs mais devenues australiennes
  (Parkes, Mawson, Nancy Wake, Bon Scott, Victor Chang, Seidler) n'ont pas de `pays` : la fiche dit où elles sont nées.
- **Les Aborigènes et les insulaires du détroit de Torrès** : Pemulwuy, Bennelong, Truganini, William Barak,
  Namatjira, Unaipon, Oodgeroo Noonuccal, Neville Bonner et Archie Roach. La fiche de Truganini corrige l'idée
  qu'elle serait « la dernière Tasmanienne ».
- **Les figures disputées sont écrites comme telles** : Deakin et l'« Australie blanche », Hughes et la conscription,
  Lindsay et ses provocations, Preston et l'appropriation de motifs aborigènes.
- **Dates** : Pemulwuy (vers 1750), Bennelong (vers 1764), Truganini (vers 1812), Barak (vers 1824) :
  les articles disent « vers ». Ned Kelly est écarté, sa naissance étant donnée en 1854 ou 1855.
- **Pas de vivants** : Cate Blanchett, Kylie Minogue, Paul Keating, Evonne Goolagong, Cathy Freeman et Rod Laver n'y sont pas.
- **Les images** : Dunlop, Chang, Judith Wright et Adam Lindsay Gordon sont montrés par une sculpture, et la légende le
  dit ; les peintures (Phillip, Chauvel, Streeton, Flinders, McCubbin, Bunny) sont des portraits d'époque ou des
  autoportraits.
- **Écartés faute d'image libre ou d'article en français** : Eddie Mabo (qui a sa biographie : seule une photographie
  de monument est libre), Christina Stead, Colleen McCullough, Manning Clark, Fred Williams, Emily Kame Kngwarreye,
  Clifford Possum Tjapaltjarri, Peter Sculthorpe, Fred Hollows, Charles Perkins, Vincent Lingiari, Jessie Street, Faith
  Bandler, William Cooper, John Simpson Kirkpatrick, Hans Heysen, Margaret Olley, Henry Kendall, Robert Hughes, John
  Bradfield. Lionel Rose (carte à collectionner) et Brett Whiteley (photo d'une galerie) sont écartés pour leur image.
- **À ajouter** (fiches rédigées, image libre trouvée, mais Wikimedia a refusé les téléchargements de cette session,
  erreur 429, pendant plus de deux heures) : Marcus Clarke (1846), Frank Hurley (1885) et Shane Warne (1969). Leurs fiches,
  avec le nom du fichier Commons, la légende et l'auteur de chaque portrait, sont dans `scripts/pantheon/au_candidats.md`.
  Le portrait de Weary Dunlop (une statue) doit être retéléchargé avec son recadrage, déjà inscrit dans la source :
  `python3 scripts/fetch_portraits.py au --force --only dunlop`.

### Un pays à part : le Canada

`pan_ca`, « Grandes figures du Canada » (code `ca`, pays) : **118 personnages**, de Marie de l'Incarnation (1599) à
Terry Fox (1958). Par axe :
29 Chefs d'État et dirigeants, 24 Musique, spectacle et sport, 18 Littérature et pensée, 16 Guerres et résistances,
16 Beaux-arts, 15 Sciences, techniques et innovation ; 16 ⭐ et 1 biographie liée (Pierre Elliott Trudeau).
118 portraits : 95 du domaine public, le reste sous licence CC BY ou CC BY-SA.

- **Un pays, pas un bloc** : `pan_ca`, et « Pendant ce temps, ailleurs… » le compte comme `thm_ca`. Deux invités d'un
  autre État portent leur `pays` : Wolfe (Royaume-Uni) et Montcalm (France). Les fondateurs de la Nouvelle-France nés
  en France (Mance, Maisonneuve, Laval, Talon, Frontenac) n'ont pas de `pays` : la fiche dit où ils sont nés.
- **Les Premières Nations, les Métis et les Inuits** : Kondiaronk, Brant, Riel, Dumont, Poundmaker, Crowfoot,
  Mistahimaskwa, Tom Longboat, Pauline Johnson, Tommy Prince, Kenojuak Ashevak.
- **Les figures disputées sont écrites comme telles** : Macdonald et les pensionnats, Groulx et son antisémitisme,
  Parizeau le soir du référendum de 1995, Alice Munro et ce que sa fille a révélé en 2024.
- **Déjà dans un autre panthéon, donc absents** : Champlain et Jacques Cartier (France), Alexander Graham Bell
  (Royaume-Uni), Tecumseh (États-Unis). Le panthéon de la France porte leur fiche.
- **Dates** : Kondiaronk, Poundmaker, Crowfoot et Mistahimaskwa portent un « vers » : les articles ne donnent pas leur année exacte.
- **Pas de vivants** : Céline Dion, qui a sa biographie, Wayne Gretzky, Margaret Atwood ou Joni Mitchell n'y sont pas.
- **Les images** : Mance, Secord, Frye et Riopelle sont montrés par une statue, Frontenac par une sculpture, Hébert par
  un dessin ; Kondiaronk n'a aucun portrait connu : on montre la marque du Rat qu'il a apposée au traité de 1701 (`nomVisible`) ; David Thompson est montré par un dessin moderne.
- **Écartés faute d'image libre** : Mordecai Richler (seule une pierre tombale est libre), William Logan (Wikimedia a
  refusé le téléchargement). Pas de portrait libre non plus pour Arthur Erickson, Norval Morrisseau ou Joyce Wieland.

### Un bloc : le Benelux

`pan_benelux`, « Grandes figures du Benelux » (code `benelux`, bloc) : **89 personnages de trois pays** — Belgique 38,
Pays-Bas 38, Luxembourg 13 — de Jean l'Aveugle (1296) à Johan Cruyff (1947). Par axe : 21 Beaux-arts, 20 Sciences,
techniques et innovation, 14 Littérature et pensée, 13 Chefs d'État et dirigeants, 9 Musique, spectacle et sport,
6 Guerres et résistances, 6 Économie et entreprise ; 29 ⭐ et 11 biographies liées (Léopold II, Simenon, Horta, Brel,
Solvay, Lemaître, Andrée De Jongh, Leman, de Gerlache, Damien de Veuster, Spinoza). 89 portraits : 76 du domaine
public ou CC0, le reste sous licence CC BY ou CC BY-SA.

- **Un seul bloc, non trois thèmes.** Les Pays-Bas bourguignons, puis espagnols, forment une seule entité jusqu'à la
  révolte de 1568 ; le Nord s'en sépare ensuite, le Sud reste espagnol puis autrichien, et les deux sont réunis de 1815
  à 1830 avant la Belgique indépendante. Jan van Eyck, Bruegel et Rubens appartiennent autant à l'un qu'à l'autre. Le
  Luxembourg, seul, n'aurait jamais eu de quoi faire un thème. Chaque figure porte son `pays` (`BE`, `NL`, `LU`), d'où le
  drapeau de la fiche et le compte de la Simultanéité.
- **Un équilibre déclaré.** Belgique et Pays-Bas pèsent chacun 42,7 % du bloc, au-dessus du seuil de 40 % : la
  source déclare `partMaxPays: 0.45`, c'est un choix écrit. Le Luxembourg, 13 figures sur 89, n'en a pas davantage :
  son histoire d'avant 1815 est celle d'un comté dont les souverains règnent ailleurs (Jean l'Aveugle, roi de
  Bohême).
- **Nés ailleurs, rangés là où on les honore.** Rubens naît à Siegen (Allemagne) mais est anversois ; Guillaume le
  Taciturne et Maurice de Nassau naissent à Dillenburg ; Léopold Ier naît à Cobourg ; Anne Frank naît à Francfort et
  vit à Amsterdam ; Vondel naît à Cologne ; Einthoven à Semarang ; Pierre Werner à Saint-André, près de Lille ; Henri
  Tudor près d'Echternach ; Robert Schuman à Luxembourg, d'une famille lorraine, avant d'être français : la fiche dit chaque fois
  où ils sont nés. Frans Hals, né à Anvers de parents de Haarlem, est aux Pays-Bas ; Django Reinhardt, né à Liberchies, et
  Audrey Hepburn, née à Ixelles, sont en Belgique et leur fiche dit où ils ont vécu.
- **Déjà dans un autre panthéon, donc absent** : Charles Quint, né à Gand, est au panthéon de l'Espagne ; Descartes,
  qui a vécu vingt ans aux Provinces-Unies, à celui de la France.
- **Les figures disputées sont écrites comme telles** : Léopold II et le Congo, Jan Pieterszoon Coen et le massacre
  de Banda, Mata Hari, condamnée sur des preuves minces.
- **Dates** : Jan van Eyck, Bruegel, Hals, Bosch, Tasman et Érasme portent un « vers » : les sources donnent plusieurs
  années ou aucune. Érasme est daté de vers 1466, avec 1467 et 1469 pour variantes.
- **Pas de vivants** : Eddy Merckx, qui a sa biographie, n'y est pas.
- **Les images** : Stevin est montré par une statue ; Vermeer par un détail de « L'Entremetteuse », que l'on tient pour son
  seul autoportrait ; Bruegel, Bosch et Jean l'Aveugle par un dessin ; Mercator et Vésale par une gravure dont l'inscription
  porte leur nom (`nomVisible` : « Qui est-ce ? » les écarte). Charlotte, Wilhelmine et Léopold Ier sont des portraits
  officiels.
- **Écarté faute d'image libre** : Peyo (la seule photographie trouvée porte un bandeau de contestation de licence).

### Un pays à part : le Portugal

`pan_pt`, « Grandes figures du Portugal » (code `pt`, pays) : **77 personnages**, de Viriathe (vers 180 av. J.-C.) à
Mariano Gago (1948). Par axe : 22 Littérature et pensée, 20 Chefs d'État et dirigeants, 14 Guerres, résistances et
exploration, 8 Beaux-arts, 8 Musique, spectacle et sport, 5 Sciences, techniques et innovation ; 18 ⭐ et 2 biographies
liées (Vasco de Gama, Magellan). 77 portraits : 57 du domaine public, 5 CC0 et 15 sous licence CC BY ou CC BY-SA.

- **Un pays, pas un bloc** : `pan_pt`, aucun champ `pays` (pas d'invité), et « Pendant ce temps, ailleurs… » le compte
  comme `thm_pt`, l'« Histoire du Portugal ». Le thème se range par « Portugal », entre le Maghreb et le Royaume-Uni.
- **Un axe qui dit l'exploration** : « Guerres, résistances et exploration », comme la Scandinavie. Les Découvertes
  (Henri le Navigateur, Dias, Gama, Cabral, Magellan, Albuquerque, Almeida, Diogo Cão, Duarte Pacheco Pereira) sont le
  cœur du pays ; Henri le Navigateur et Manuel Ier sont rangés avec les chefs d'État, Mendes Pinto avec les écrivains.
- **Magellan et Viriathe, enfin chez eux** : le panthéon de l'Espagne les avait laissés de côté. Magellan est au
  service de l'Espagne et sa biographie reste liée (`bio_magellan`), comme celle de Gama ; Viriathe est lusitanien.
- **Ceux qui sont nés ailleurs** : Eusébio et Otelo Saraiva de Carvalho au Mozambique, Almada Negreiros à São Tomé,
  Inês de Castro en Galice, Josefa de Óbidos à Séville. Leur description le dit ; aucun n'est rangé comme invité
  (pas de champ `pays`), puisque c'est le Portugal qui les honore le plus.
- **Un régime et sa chute, sans complaisance** : Salazar et Caetano sont là avec ce que fut l'Estado Novo (censure,
  PIDE, guerres coloniales) ; Delgado, Sousa Mendes, Cunhal, Soares, Zeca Afonso, Salgueiro Maia et Otelo sont ceux
  qui l'ont combattu ou renversé. Otelo est dit tel qu'il fut, y compris sa condamnation de 1984.
- **Dates** : « vers » devant Alphonse Ier, Viriathe, Almeida, Gama, Dias, Magellan, Diogo Cão, Pacheco Pereira,
  Camões, Gil Vicente, Mendes Pinto et Jean XXI, que les sources ne donnent pas à l'année près. Gama et Magellan gardent
  la date de leur biographie (1469, 1480).
- **Pas de vivants** : Cristiano Ronaldo, José Mourinho, Mariza, Siza Vieira ou Joana Vasconcelos n'y sont pas.
- **Les images** : plusieurs portraits sont des gravures, des enluminures ou des peintures posthumes, et leur légende le dit
  (les rois d'Alphonse Ier à Jean Ier d'après la « Genealogia dos Reis de Portugal » de 1530-1534, Albuquerque,
  Nuno Álvares Pereira, Cabral). Dias, Orta et Soares dos Reis sont montrés par une statue, Gago Coutinho par un
  buste, Josefa de Óbidos et Amadeo de Souza-Cardoso par une de leurs œuvres (aucun portrait libre d'eux). Torga,
  Sophia, Natália Correia et Carlos Paredes sont montrés par des portraits dessinés ou peints de Bottelho. Dix images
  écrivent le nom (inscription latine sur Magellan, Jean II, Jean XXI et Manuel Ier, légende gravée sur Camões, Cabral,
  Nuno Álvares Pereira, Diogo Cão et Orta, signature d'Herculano) et sont marquées `nomVisible`. Salgueiro Maia est
  recadré dans une photographie de famille où il se tient debout dans une jeep.
- **Écartés faute d'image libre ou sûre** : Paula Rego et Maria Helena Vieira da Silva (aucun portrait libre : le
  seul est une image sous licence locale de Wikipédia), l'image d'Eusébio la plus connue (une vignette Panini de
  1973, « Not-PD-US-URAA » : refusée, remplacée par une photographie d'Anefo de 1963), la photographie d'Amadeo de
  Souza-Cardoso numérisée par la Gulbenkian (« No restrictions », hors liste). Le statut américain du portrait de
  Lopes-Graça (« Fundação Mário Soares », années 1950, auteur inconnu) est à confirmer.
- **Envisagés et pas faits** : Mouzinho de Albuquerque (la date de sa mort diffère selon les sources), Abel Salazar et
  Ricardo Jorge (titres d'article à retrouver), Sidónio Pais, Jean III, Philippa de Lancastre, Vergílio Ferreira,
  Eugénio de Andrade ; et les figures que le Brésil revendique autant (Pierre Ier, Bartolomeu de Gusmão : ils sont au panthéon du Brésil), ou né à Goa
  (Joseph Vaz).

### Un bloc : l'Asie centrale et l'Afghanistan

`pan_asiecentrale`, « Grandes figures d'Asie centrale » (code `asiecentrale`, bloc) : **65 personnages de six pays** —
Afghanistan 17, Kazakhstan 17, Ouzbékistan 15, Kirghizistan 7, Tadjikistan 5, Turkménistan 4 — d'Al-Khwârizmî
(vers 780) à Meena Keshwar Kamal (1956). Par axe : 26 Chefs d'État et dirigeants, 20 Littérature et pensée, 6 Guerres
et résistances, 6 Sciences, techniques et innovation, 5 Musique, spectacle et sport, 2 Beaux-arts ; 17 ⭐ et 2
biographies liées (Avicenne, Al-Khwarizmi). 65 portraits : 55 du domaine public, le reste sous licence CC0, CC BY ou
CC BY-SA. Les mots-clés du thème portent les six pays, la Transoxiane, le Khorassan, le Khârezm, Samarcande, Boukhara,
Hérat et les grandes dynasties (Timourides, Samanides, Seldjoukides, Ghaznévides).

- **Pourquoi l'Afghanistan en fait partie.** La question s'est posée en construisant le bloc : l'Histoire par pays
  range l'Afghanistan en « Asie du Sud », l'ONU aussi. Mais aucun autre panthéon ne le couvre (le bloc indien l'écarte
  expressément), et c'est le pays d'Asie où Balkh, Ghazni, Hérat et la Bactriane font la même histoire que Samarcande ou
  Boukhara : les Ghaznévides, les Timourides de Hérat, Navoï, Djâmî et Behzad circulent des deux côtés de la frontière.
  Le laisser dehors aurait obligé à ranger Djâmî ou Mahmoud de Ghazni dans un thème où ils n'ont rien à faire, ou à
  les perdre. Les cinq pays demandés (Kazakhstan, Ouzbékistan, Kirghizistan, Tadjikistan, Turkménistan) forment le
  noyau ; l'Afghanistan s'y ajoute, et pèse 26 % du bloc, sous le seuil de 40 %.
- **Un équilibre déclaré.** Le Kazakhstan, l'Afghanistan et l'Ouzbékistan représentent ensemble 75 % des figures ; le
  Tadjikistan (5) et le Turkménistan (4) sont minces, faute d'articles en français et de portraits libres, non par choix.
  Aucun pays ne dépasse le seuil de 40 % du constructeur. Les chefs
  d'État pèsent 40 % du bloc (26 sur 65), davantage que dans les autres : ce sont souvent les seules figures dont on
  trouve à la fois la date, l'article français et une image libre.
- **Hors périmètre.** La Mongolie (Gengis Khan et sa descendance ont leur biographie, mais aucun panthéon), le
  Xinjiang et les peuples turcs de Russie. Les figures de langue persane nées dans l'Iran actuel (Omar Khayyâm, Ferdowsi,
  al-Razi, al-Ghazali) sont au panthéon de l'Iran (voir « Un pays à part : l'Iran »), et celles déjà prises ailleurs le restent : Babur et
  Humayun (sous-continent indien), Rûmî, né à Balkh, et Alp Arslan (Turquie).
- **Là où on les honore, pas là où elles sont nées.** Alicher Navoï est né à Hérat (Afghanistan) mais l'Ouzbékistan en a fait
  son poète national : il est ouzbek. Djâmî, né à Kharjird (Khorassan, aujourd'hui en Iran) et mort à Hérat, est afghan.
  Goharshad, née à Samarcande, aurait été afghane aussi : faute de portrait elle est restée dehors. Avicenne, né à
  Afshona près de Boukhara, est ouzbek, et le Tadjikistan comme l'Iran le revendiquent : la fiche le dit. Al-Fârâbî est kazakh
  (né près de Farab, ou à Faryab en Afghanistan selon d'autres sources) ; Al-Biruni, né au Khârezm, ouzbek ; Ismaïl Samani,
  tadjik, bien que né à Ferghana ; Tamara Khanum, d'origine arménienne, ouzbèke ; Semion Tchouïkov, né à Pichpek, kirghiz.
- **Des figures contestées**, dont la fiche dit ce qu'on leur reproche : Tamerlan (massacres), Islam Karimov (Andijan),
  Saparmourad Niazov (culte de la personnalité), Charaf Rachidov (le scandale du coton), Najibullah et Taraki (la
  répression communiste), Mahmoud de Ghazni (le pillage de Somnath), Ahmad Shah Massoud étant absent faute d'image libre.
- **Dates retenues quand les sources divergent.** Magtymguly est daté de vers 1724 (la date de l'Unesco et du
  Turkménistan, l'infobox de Wikipédia dit vers 1733), Rudaki de vers 859 (858 selon d'autres), Kourmanghazy de 1823 (le
  Kazakhstan fête 1818), Fitrat de 1886 (1885 en catégorie), Momyshuly de 1910 (1911 en catégorie), Al-Fârâbî de
  vers 872. Cholpon (1893 ou 1897), Muhammad de Ghor (1144 ou 1149), Sher Ali Khan (1823 ou 1825) et
  Nadia Anjuman (1980 ou 1981) ont été écartés pour cette raison.
- **Des portraits souvent indirects**, et les légendes le disent : billets de banque (Abylaï, Aïni, Samani, Osmonov,
  Beïchenalieva, Yusuf Khass Hajib), timbres (Magtymguly, Al-Khwârizmî, Al-Fârâbî, Fitrat, Kourmanghazy, Nasir Khusraw,
  Ansari, Momyshuly, Imanov, Kenesary, Jambyl, Toktogul), une pièce (Aouézov), miniatures timourides et persanes (Tamerlan,
  Ulugh Beg, Chaybani, Djâmî, Husayn Bayqara), une statue (Biruni), une peinture moderne (Nadira, Roudaki, Yasavi). Onze
  portraits écrivent le nom de la personne et portent `nomVisible` : « Qui est-ce ? » les écarte. Behzad et Tchouïkov
  sont montrés par une œuvre, faute de portrait libre de leur main ou de leur visage.
- **Un téléchargement contraint.** Wikimedia refusait à cet environnement les miniatures de plus de 330 pixels (réponse 429
  même à intervalle long) : dix-neuf portraits sont donc tirés d'une miniature de 330 pixels et recadrés au plus près, au
  prix d'une définition plus basse pour les billets et les timbres. À refaire en 960 pixels depuis une autre adresse.
- **Écartés faute d'article en français** : Isataï Taïmanov, Altynsarine, Baïtoursynov, Doulatov, Joumabaïev,
  Aliya Moldagoulova, Qodiriy, Gafur Gulom, Oybek, Muqimiy, Behbudi, Kamal Khujandi, Bobodjan Gafourov, Mirzo Tursunzoda,
  Nusratullo Makhsum, Tynystanov, Tokombaev, Moldo Kylych, Seydi, Kemine, Mollanepes, Azadi, Kerbabayev, Khalili.
- **Écartés faute d'image libre convenable**, à réintégrer si l'une apparaît : Ahmad Shah Massoud (seules les
  photographies du Parlement européen existent, sous une licence hors liste, et l'illustration disponible est sous
  licence Art libre), Mirwais Hotak (un timbre de 1961 trop petit et refusé par Commons à cet environnement), Ahmad Zahir,
  Zulfiya, Qahhor Mahkamov, Goharshad, Al-Boukhari, Naqshband et Zamakhshari (des calligraphies et des tombes seulement),
  Sanaï.
- **Écartés par choix** : six chefs d'État et chefs de guerre afghans (Habibullah Khan, Nadir Shah, Sher Ali
  Khan, Hafizullah Amin, Habibullah Kalakani, Abdul Haq), pour ne pas faire de l'Afghanistan un thème de chefs d'État ;
  Khushal Khattak, né dans le Pakistan actuel, que le Pakistan honore autant que l'Afghanistan.
- **Géolocalisation** : seules les deux figures qui ont aussi une biographie (Avicenne, Al-Khwârizmî) ont un point dans
  `assets/geo/events-geo.json`, repris de leur biographie (le test des faits liés l'exige). Les 63 autres naissances ne sont
  pas encore placées sur l'Atlas.

### Un bloc : la Nouvelle-Zélande et le Pacifique

`pan_pacifique`, « Grandes figures de Nouvelle-Zélande et du Pacifique » (code `pacifique`, bloc) : **88 personnages de 21 pays et
territoires** — Nouvelle-Zélande 51, Polynésie française 5, Samoa 5, Fidji 4, Tonga 3, îles Cook 2, Micronésie 2, Nouvelle-Calédonie 2,
Wallis-et-Futuna 2, et un chacun pour les Samoa américaines, la Papouasie-Nouvelle-Guinée, les îles Salomon, Nauru, les îles Marshall,
les Palaos, Guam, les îles Mariannes du Nord, Pitcairn, Rapa Nui, Niue et Tuvalu — du navigateur Tupaia (vers 1725) au rugbyman Jonah
Lomu (1975). Par axe : 39 Chefs d'État et dirigeants, 17 Guerres et résistances, 12 Littérature et pensée, 9 Sciences, techniques et
innovation, 6 Beaux-arts, 5 Musique, spectacle et sport ; 20 ⭐, aucune biographie liée. 88 portraits (2 Mo) : 53 du domaine public, 2 CC0,
12 CC BY, 20 CC BY-SA et un « image non libre » (voir plus bas). Les mots-clés du thème portent tous les noms de pays et de territoires,
les adjectifs (néo-zélandais, māori, hawaïen, kanak), l'Océanie, la Polynésie, la Mélanésie, la Micronésie, Wellington, Auckland,
Waitangi, Honolulu et Papeete.

- **Plus de la moitié du bloc est néo-zélandaise, et c'est assumé.** 51 figures sur 88 (58 %), au-dessus du seuil de 40 % : la source
  déclare `partMaxPays` à 0,6. Le Pacifique insulaire compte plus de vingt États et territoires, la plupart minuscules, dont
  beaucoup n'ont que quelques personnages à la fois documentés (article en français, dates avérées) et illustrés ; la
  Nouvelle-Zélande a un siècle et demi d'histoire écrite et photographiée. Les chefs d'État et dirigeants pèsent 44 % du bloc
  (39 sur 88) : pour un micro-État, ce sont souvent les seules figures qui remplissent les trois conditions.
- **Tous les territoires, même dépendants.** la Polynésie française, la Nouvelle-Calédonie et
  Wallis-et-Futuna (France), les Samoa américaines, Guam et les Mariannes du Nord (États-Unis), Niue et les îles Cook (en libre
  association avec la Nouvelle-Zélande), Pitcairn (Royaume-Uni) et Rapa Nui, l'île de Pâques (Chili), ont leur place au même titre que
  les États indépendants. `pays` porte le code ISO du territoire (`PF`, `NC`, `WF`, `AS`, `GU`, `MP`, `NU`, `CK`, `PN`) ; l'île de
  Pâques, qui n'en a pas, porte celui du Chili (`CL`).
- **Hawaï est au panthéon des États-Unis.** Hawaï est un État américain, et aucun code ISO ne le désigne : ses dix figures (Kamehameha
  Ier, Kamehameha III, Kalākaua, Liliʻuokalani, Kaʻahumanu, Kaʻiulani, Emma, Duke Kahanamoku, Samuel Kamakau, Israel
  Kamakawiwoʻole) ont donc rejoint « Grandes figures des États-Unis » (`scripts/pantheon/us.json`), et leurs portraits sont des
  `pan_us_…`. Les rois d'avant l'annexion de 1898 y sont avec leur royaume dans la description. Damien de Molokaʻi, apôtre des lépreux
  de Molokaʻi, reste au panthéon du Benelux, dont il est un fils.
- **Là où on les honore, pas là où ils sont nés.** Hobson (né à Waterford), Seddon (Lancashire), Vogel (Londres), Savage (Victoria),
  Fraser (Écosse), Kate Sheppard (Liverpool), Haast (Bonn), Freyberg (Londres, élevé en Nouvelle-Zélande) et Robin Hyde (Le Cap) sont
  ici ; Katherine Mansfield aussi, née à Wellington et morte en France, que l'article français dit « britannique d'origine
  néo-zélandaise », comme Rutherford. Pierre Chanel, né dans l'Ain, est à Wallis-et-Futuna : il y est mort, et il est le saint patron de
  l'Océanie. James Cook (Royaume-Uni), Gauguin (France), Tasman (Benelux) et Nancy Wake, née à Wellington (Australie), restent dans leur
  panthéon. Maurice Wilkins et Harold Gillies, « britanniques d'origine néo-zélandaise » selon l'article français, sont laissés de
  côté, comme Fred Hollows, que le panthéon de l'Australie a lui aussi écarté ; Eddie Mabo, qui a sa biographie, reste dehors faute d'image libre, comme dans le panthéon de l'Australie.
- **Un homonyme à désambiguïser.** « Naissance de John Adams » est déjà le titre du deuxième président des États-Unis, et la règle
  « un personnage, un seul thème » compare aussi les titres : le mutin du Bounty devenu patriarche de Pitcairn s'appelle ici « John
  Adams (Pitcairn) », sous « Adams, John (Pitcairn) » dans le classement.
- **Dates retenues quand les sources divergent.** Kamehameha Ier est daté de vers 1758, la date la plus citée (l'article français dit
  vers 1736, Wikidata 1756 ou 1800), Te Rauparaha de vers 1768 (« années 1760 »), Tāwhiao de vers 1822 (Wikidata 1825), Te Kooti de
  vers 1832 (date des sources anglophones ; le français dit vers 1820), Hōne Heke de vers 1807 (le français : vers 1790), Cakobau de vers
  1815 (le français : vers 1817), Kate Sheppard de 1847 (le français : 1847 ou 1848), Māui Pōmare de 1875 (ou 1876), Te Rangi Hīroa de
  1877 (1880 selon d'autres) et Nidoïsh Naisseline de 1945 (l'article français écrit 1947 en tête, mais 1945 dans son infobox, sa
  catégorie et sur Wikidata).
- **Écartés faute de date avérée** : Ataï (sa naissance n'est pas connue : le grand chef de l'insurrection kanak de 1878 manque donc
  au panthéon), Makea Takau Ariki (1840 pour l'article français, 1845 pour Wikidata), Pōmare Ier (1742, 1743 ou 1753), Omai (1751 ou
  1753), Bernard Narokobi (1937 ou vers 1941) et Jimmy Stevens (dans les années 1910, ou 1920).
- **Écartés faute d'article en français** : Rewi Maniapoto, Rua Kenana, Wiremu Tamihana, Wiremu Rātana, Truby King, Archibald McIndoe,
  Richard Pearse, Bill Hamilton, Allen Curnow, Gottfried Lindauer, Rewi Alley, Ettie Rout, Bernice Pauahi Bishop, Jonah Kūhiō
  Kalanianaʻole, David Malo, Apolosi Nawai, Yali Singina, Paliau Maloat, Jacob Vouza et Antonio Won Pat.
- **Écartés faute d'image libre convenable**, à réintégrer si l'une apparaît : Norman Kirk (la seule photographie de lui, de 1966, porte
  un bandeau de suppression sur Commons), Jean-Marie Tjibaou, Beatrice Tinsley, Haunani-Kay Trask, Henri Hiro, Nidoïsh Naisseline, Merata Mita, Sylvia Ashton-Warner, Vincent Eri, John Guise,
  Robert Rex, Toaripi Lauti, Yeiwéné Yeiwéné et Solomon Mamaloni ; Eddie Aikau (seule une plaque commémorative), Walter Lini (un profil
  que le cadre coupe) et Burt Munro (sa moto, sans lui). Teatao Teannaki (Kiribati) et Faimalaga Luka (Tuvalu) n'ont que des
  photographies sous une licence « Attribution » d'un site officiel taïwanais, hors de la liste.
- **Des territoires sans figure.** Kiribati, Tokelau, l'île Norfolk et le Vanuatu n'ont aucun personnage : aucun des dirigeants
  historiques de ces pays n'a à la fois une date de mort, un article en français et une image libre exploitable. Tuvalu n'est
  représenté que par Ionatana Ionatana, dont la seule image libre mesure 100 × 130 pixels.
- **Laissés de côté pour tenir l'équilibre**, avec leur image : Joseph Ward et Keith Holyoake (deux Premiers ministres de plus),
  Kamehameha II, Lunalilo et Kapiʻolani (Hawaï est déjà bien fourni), George Tupou II, Tupua Tamasese Lealofi IV, Bernard
  Dowiyogo, Bailey Olter, Lazarus Salii, Roman Tmetuchl, Ricardo Bordallo, Penaia Ganilau et Josefa Iloilo (un ou deux chefs d'État
  suffisent par territoire), Don Ho et Inia Te Wiata (dont l'article français ne dit presque rien), ainsi que les sportifs que
  retiendrait le seul palmarès : Peter Snell, Arthur Lydiard, Colin Meads et Dave Gallaher.
- **Les sportifs.** Jonah Lomu a porté l'image de son pays dans le monde, Jack Lovelock gagne à Berlin en 1936, Bruce McLaren laisse
  l'écurie qui porte son nom, Peter Blake gagne la Coupe de l'America et meurt en défendant les océans, Duke Kahanamoku est le père du
  surf moderne. Les rangs et les records seuls restent aux Biographies (voir « Les sportifs : une exception, pas une règle »).
- **Des portraits souvent indirects**, et les légendes le disent : une aquarelle attribuée à Tupaia (un Māori échange une langouste
  avec Joseph Banks), la statue de Pouvanaa a Oopa à Papeete, le buste d'Atamu Tekena à Hanga Roa, un graffiti d'Éloi Machoro
  photographié à Thio (son nom y est écrit : `nomVisible`, donc écarté de « Qui est-ce ? »), des portraits posthumes (Kamehameha Ier
  d'après Choris, Pierre Chanel jeune, Pōmare II gravé en 1830), des portraits peints (Hobson, Pōtatau Te Wherowhero, Te Rauparaha,
  Hōne Heke, Tāwhiao) ou gravés dans la presse (Te Whiti, Titokowaru, Te Kooti), un dessin contemporain pour Colin McCahon.
- **Une exception assumée : deux images non libres.** Epeli Hauʻofa et Israel Kamakawiwoʻole, trop importants pour être écartés,
  n'avaient aucune image libre. Ils ont l'image qui laisse le plus de libertés : pour Hauʻofa, une photographie d'Ann Tarte (2006)
  publiée par le site `kanivatonga.co.nz`, sans licence indiquée ; pour Iz, l'image promotionnelle de l'article anglais de Wikipédia,
  téléversée en usage équitable (« fair use »), et donc absente de Commons. Leur licence s'écrit « Image non libre » dans les données
  (`image.licence`), `image.source` renvoie à la page d'origine (et non à Commons), `fetch_portraits.py` les ignore, et le test de schéma
  accepte cette seule exception. Ces droits ne sont pas ceux de l'App Store : **à remplacer dès qu'une image libre existe, ou à
  faire valider** — c'est la réserve la plus lourde du bloc. Iz est au panthéon des États-Unis, Hauʻofa (fidjien d'origine tongienne,
  né en Papouasie) à celui-ci, rangé aux Fidji.
- **Statut américain des images.** Les pages de fichier ont été relues à la fin : 82 des 93 premières portent un modèle de licence
  valable aux États-Unis (PD-1923, PD-1996, PD-old, PD-USGov ou une licence Creative Commons), et les trois suivantes (Hotere, Woollaston,
  Blake) sont des CC BY ou CC BY-SA. Les onze autres sont à relire si l'on veut être plus strict : **six images à balise nationale
  seule** (Keith Park, photographie de la Royal Air Force de 1940, « PD-UKGov » ; Jack Lovelock, photographie de 1936 du musée
  olympique, « PD-anon-70-EU » ; Sālote Tupou III, « PD-Tonga » ; Lala Sukuna, « PD-Fiji » ; Amata Kabua, « PD-MH » ; Tosiwo Nakayama,
  « PD-Micronesia »), **trois licences posées par l'auteur de la photographie** (CC BY-SA pour Keri Hulme et Déwé Gorodey, CC0 pour le graffiti de Machoro)
  et **deux photographies d'avant 1931**, sans modèle américain (Kalākaua, vers 1882, et Kaʻiulani, 1897). Quatre portraits sont des
  clichés du gouvernement américain des îles du Pacifique (Coleman, Remeliik, Camacho, Tenorio), sans réserve.
- **Un téléchargement contraint.** Wikimedia refusait à cet environnement les fichiers originaux (429, même après de longues pauses) :
  les portraits sont tirés de miniatures de 330 px, 500 px, 960 px ou 1920 px, jamais de l'original, sauf pour les images plus étroites
  que 330 px. Huit sont agrandis depuis une source de moins de 290 pixels de large : Ionatana (100), Kulimoetoke (193), Lomu et Mau Piailug
  (200), Nakayama (202), DeRoburt (233), Hodgkins (283) et Pa Tepaeru Terito Ariki (284). Hone Tuwhare est recadré dans la version non rognée de
  l'image, pour avoir un visage net ; Whina Cooper dans une planche-contact de 5 409 × 1 293 px, sur la seule image où elle est
  identifiable.
- **Géolocalisation** : aucune des 88 naissances n'est placée sur l'Atlas, et aucune n'a sa biographie, donc le test des faits liés ne
  l'exige pas.

### Un pays à part : le Brésil

`pan_br`, « Grandes figures du Brésil » (code `br`, pays) : **96 personnages**, de Gregório de Matos (1636) à Marielle Franco
(1979). Par axe : 25 Littérature et pensée, 21 Musique, spectacle et sport, 17 Guerres et résistances, 14 Chefs d'État et
dirigeants, 10 Sciences, techniques et innovation, 9 Beaux-arts ; 19 ⭐ et 3 biographies liées (Pelé, Senna, Niemeyer).
96 portraits (2,3 Mo) : 73 du domaine public, 1 CC0, 8 CC BY et 14 CC BY-SA. Les mots-clés du thème portent le pays et ses
adjectifs, les villes (Rio de Janeiro, São Paulo, Brasília, Salvador de Bahia), les régions (Nordeste, Sertão, Amazonie, Minas Gerais,
Pernambouc), les grandes pages de l'histoire (Empire du Brésil, Estado Novo, Canudos, Palmares, Inconfidência mineira) et les genres qui
disent le pays (samba, bossa nova, Tropicália, Cinema Novo, modernisme brésilien).

- **Un pays, pas un bloc, et pas l'Amérique « hispanique ».** `pan_br`, aucun champ `pays` sauf une invitée, et « Pendant ce
  temps, ailleurs… » le compte comme `thm_br`, l'« Histoire du Brésil ». Le thème se range par « Brésil », entre le Benelux et
  le Canada. L'invitée est Marie-Léopoldine d'Autriche (`AT`), archiduchesse née à Vienne, première impératrice du Brésil, dont
  la fiche affiche donc l'Autriche sous la date : c'est au Brésil qu'on l'honore, et elle compte pour le Brésil dans la
  Simultanéité, comme le prévoit la règle des invités.
- **Ceux que le Portugal avait laissés.** Pierre Ier, né près de Lisbonne et proclamateur de l'indépendance, et Bartolomeu de
  Gusmão, né à Santos, avaient été écartés du panthéon du Portugal (« les figures que le Brésil revendique autant »). Cabral
  et le père António Vieira, eux, restent portugais. Carmen Miranda, née à Marco de Canaveses et arrivée à Rio encore bébé, et Clarice Lispector, née en Ukraine, sont rangées ici comme les autres : leur fiche le dit dans la phrase, mais
  elles n'ont pas de champ `pays`, puisque c'est le Brésil qui les honore le plus. Anita Garibaldi, née à Laguna, est brésilienne ;
  l'Italie n'a que son mari.
- **L'esclavage et la dictature, sans complaisance.** Zumbi, Isabelle du Brésil, Patrocínio, Nabuco, Rebouças et Castro Alves sont les
  figures de l'abolition ; Vargas est là avec l'Estado Novo, Castelo Branco comme premier général du régime de 1964, Goulart,
  Prestes, Marighella, Hélder Câmara, Paulo Freire et Marielle Franco comme ceux qui l'ont combattu, subi ou payé. Marighella est dit
  tel qu'il fut, guérillero urbain. La fiche de Marielle Franco ne dit de l'enquête que ce qu'établissait la justice à la date de
  rédaction : deux tueurs condamnés en 2024, des commanditaires issus du monde politique mis en cause.
- **Un panthéon de culture, avec ses limites.** La littérature et la musique en font la moitié (25 + 21 sur 96) : le Brésil a une
  histoire où la chanson, le roman et le football ont fait autant que les gouvernements pour dire le pays. Les Beaux-arts n'ont que
  9 figures, faute d'images libres : Lúcio Costa, Hélio Oiticica, Lygia Clark et Di Cavalcanti, qui y auraient leur place, n'ont aucun portrait libre.
- **Un septième axe ?** Non : « Économie et entreprise » exige six figures et une histoire propre (voir plus haut), et Mauá,
  Matarazzo n'y suffisent pas.
- **Où l'on range qui.** Rondon (explorateur, maréchal) est avec les Sciences ; Bertha Lutz (zoologiste, mais surtout cheffe du
  mouvement pour le droit de vote des femmes) et Chico Mendes (syndicaliste et écologiste) avec les Guerres et résistances,
  « combats pour les droits » ; Zilda Arns, pédiatre, avec les Sciences ; Vinicius de Moraes, poète et parolier, avec la musique.
- **Les sportifs : trois.** Pelé et Garrincha ont porté l'image du pays dans le monde, Ayrton Senna aussi, et ses funérailles
  nationales en 1994 disent ce qu'il fut. Éder Jofre, Maria Esther Bueno ou Adhemar Ferreira da Silva, dont les palmarès sont
  grands mais restent dans le sport, sont laissés aux Biographies (voir « Les sportifs : une exception, pas une règle »).
- **Pas de vivants** : Lula, Fernando Henrique Cardoso, Dilma Rousseff, Caetano Veloso, Gilberto Gil, Chico Buarque, Fernanda
  Montenegro, Marta, Zico, Neymar n'y sont pas.
- **Dates retenues quand les sources divergent.** Lampião est daté du 7 juin 1897 (d'autres sources disent 1898), Zumbi de 1655
  (date traditionnelle : sa naissance n'est pas documentée), Antônio Conselheiro de 1830, Tiradentes de 1746, Gregório de Matos de
  1636 et Bartolomeu de Gusmão du 18 décembre 1685 ; Castelo Branco naît en 1900, non en 1897 comme on le lit parfois.
- **Écartés faute de date avérée** : Aleijadinho (né en 1730 ou 1738 selon les sources), Chica da Silva, Dandara, Elza Soares.
- **Écartés faute d'article en français** : Frei Caneca, Luiz Gama, Roberto Landell de Moura.
- **Écartés faute d'image libre convenable** : Josué de Castro (la seule photographie libre exploitable mesure 190 × 270 px, et
  Wikimedia a refusé à cet environnement, à plusieurs reprises, de la servir : la fiche existait, elle est retirée avec lui), Sérgio Buarque de Holanda
  (une photographie de 1957 dont la licence est posée par un tiers), Raul Seixas (seulement des photographies d'un hommage),
  João Cabral de Melo Neto (seulement la statue de Recife), Lúcio Costa, Hélio Oiticica et Lygia Clark (seulement des vues d'expositions, ou une œuvre sous une licence posée par
  l'importateur), Di Cavalcanti et Tomé de Sousa. Josué de Castro, Sérgio Buarque de Holanda, Cabral
  de Melo Neto et Lúcio Costa peuvent rejoindre `scripts/pantheon/br.json` si une bonne image se présente.
- **Laissés de côté pour tenir l'équilibre**, avec leur image : Eurico Gaspar Dutra (un président de plus) et Éder Jofre.
- **Des portraits souvent indirects**, et les légendes le disent : un buste (Zumbi, à Brasília, avec sa plaque : `nomVisible`),
  des portraits posthumes (Tiradentes par Oscar Pereira da Silva en 1922, Gusmão par Benedito Calixto en 1902, Maria Quitéria par
  Failutti en 1920, José Bonifácio en lithographie de Sisson, dont la signature est écrite sous l'image : `nomVisible`), une gravure imaginaire
  (Gregório de Matos), une illustration de presse de 1897 (Antônio Conselheiro, dont on ne connaît aucune photographie de son vivant :
  l'image est recadrée sur le dessin, sans la légende imprimée), des peintures d'époque (Pierre Ier, Bento Gonçalves, Anita Garibaldi,
  Marie-Léopoldine par Kreutzinger), un dessin (Darcy Ribeiro), un timbre (Adolfo Lutz, dont le nom est imprimé : `nomVisible`), le
  photogramme d'un film hollywoodien (Carmen Miranda en 1941) et la photographie d'une fiche d'internement (Lima Barreto, en 1914).
- **Statut américain des images.** Soixante-treize images relèvent du domaine public, une de la CC0, huit de licences CC BY et
  quatorze de CC BY-SA. Parmi le domaine public, **vingt-sept ne portent qu'une balise de pays, ou aucune balise américaine**
  (Pierre II, Kubitschek, Castelo Branco, Tiradentes, Bertha Lutz, Drummond de Andrade, Manuel Bandeira, Cecília Meireles, Graciliano
  Ramos, Jorge Amado, Rachel de Queiroz, Nelson Rodrigues, Portinari, Jobim, Vinicius de Moraes, Elis Regina, Grande Otelo, Glauber
  Rocha, Pelé, Garrincha, Oswaldo Cruz, Adolfo Lutz, Nise da Silveira, Guimarães Rosa, Pixinguinha, Luiz Gonzaga, César Lattes) : plusieurs
  sont des photographies du fonds « Correio da Manhã » des Archives nationales du Brésil, des portraits officiels du gouvernement ou
  des images d'avant 1931 ; à relire si l'on veut être plus strict.
- **Un téléchargement contraint.** Wikimedia refusait souvent à cet environnement les fichiers originaux et les miniatures de largeur
  non standard (429), et `Special:FilePath` ne rend pas une miniature plus large que l'original : 330, 500, 960 ou 1920 px pour les
  images assez grandes, le fichier original (`largeur: 0`) pour les images plus étroites que 330 px. Huit portraits sont agrandis depuis une
  source de moins de 290 pixels de large : Noel Rosa (196), Vital Brazil (197), Gregório de Matos (204), Villa-Lobos (219), Cruz e Sousa (251),
  Lispector (276), Oswald de Andrade (277) et Euclides da Cunha (279). Dix portraits sont recadrés sur le visage dans une image plus
  large ou plus haute (Isabelle, Rio Branco, Nabuco, Bertha Lutz, Chagas, Gusmão, Rondon, Lobato, Elis Regina, Garrincha), Luiz Gonzaga
  dans une photographie de groupe où il tient son accordéon, Oswaldo Cruz dans un cadre ovale, Antônio Conselheiro dans une illustration.
- **Géolocalisation** : trois naissances sont placées sur l'Atlas, reprises de leur biographie (Três Corações pour Pelé, São Paulo pour
  Senna, Rio de Janeiro pour Niemeyer ; le test des faits liés l'exige). Les 93 autres ne le sont pas encore.

### Un pays à part : l'Iran

`pan_ir`, « Grandes figures d'Iran » (code `ir`, pays) : **67 personnages**, de Cyrus le Grand (vers 580 av. J.-C.) à Maryam Mirzakhani
(1977). Par axe : 21 Littérature et pensée, 17 Chefs d'État et dirigeants, 14 Musique, spectacle et sport, 6 Guerres et
résistances, 6 Sciences, techniques et innovation, 3 Beaux-arts ; 21 ⭐ et aucune biographie liée. 67 portraits (1,8 Mo) : 51 du
domaine public, 1 CC0, 3 CC BY (2 en 4.0, 1 en 2.0) et 12 CC BY-SA. Neuf figures sont nées avant l'an 1000, quinze entre 1000 et 1799,
quarante-trois depuis 1800 : l'Iran de la poésie classique est là, mais le XXe siècle pèse les deux tiers. Les mots-clés du thème portent le
pays et ses adjectifs, la Perse, les villes (Téhéran, Ispahan, Chiraz, Tabriz, Machhad, Nichapour), les dynasties (achéménide, sassanide,
séfévide, afcharide, zand, qadjar, Pahlavi) et les grandes pages de l'histoire (Révolution constitutionnelle, révolution blanche, révolution
islamique, République islamique, Mossadegh).

- **Un pays, pas un bloc.** `pan_ir`, aucun champ `pays` — aucun invité d'un autre État — et « Pendant ce temps, ailleurs… » le compte
  comme `thm_ir`, l'« Histoire de l'Iran ». Le thème se range par « Iran », entre la Grèce et Israël.
- **Ce que l'Asie centrale avait laissé.** Le panthéon de l'Asie centrale avait réservé à « un futur panthéon de l'Iran » les figures de
  langue persane nées dans l'Iran actuel : Omar Khayyâm, Ferdowsi, al-Razi et al-Ghazali sont ici. Ce qui est déjà pris ailleurs le reste :
  Avicenne, Al-Biruni, Al-Khwârizmî, Djâmî, Behzad, Ismaïl Samani, Al-Fârâbî et Tamerlan en Asie centrale, Rûmî en Turquie, Babur et Akbar
  dans le sous-continent indien. Nezami, né à Ganja, et Jamal ad-Din al-Afghani, né à Asadabad et que l'Afghanistan revendique, sont laissés
  à de futurs blocs (le Caucase, l'Afghanistan) plutôt que disputés d'avance.
- **Cyrus, daté de 580 av. J.-C.** Sa naissance se situe vers 600 ou en 576 av. J.-C. selon l'article français : « vers 580 » est un choix éditorial, à discuter. Son image est un relief de Pasargades, longtemps tenu pour le sien.
- **Une date qui se discute n'entre pas.** Zoroastre (« entre 1500 et 550
  av. J.-C. »), Ardachir et Chapour Ier (naissance non renseignée), Mollâ Sadrâ (1571 ou 1572), Houshang Golshiri (1937 ou 1938), Delkash
  (1924 ou 1925), Monir Farmanfarmaian (1922, 1923 ou 1924) sont écartés, comme Ameghino en Amérique hispanique ; Hassan-i Sabbah, dont
  la naissance varie selon les sources, aussi.
  Quand les sources s'écartent d'une année seulement, la plus répandue est retenue et dite : Rouhollah Khomeini (1900, l'état civil ;
  la version officielle donne 1902), Forough Farrokhzad (5 janvier 1935, l'article français dit aussi le 29 décembre 1934), Sattar Khan (1866,
  l'article français donne 1868 dans ses catégories), Khosro Ier (« vers 501 »). Ali Akbar Dehkhoda est mort en 1956 — la fiche française
  de l'infobox dit 1959 par erreur.
- **Pas de vivants.** Mahmoud Dowlatabadi, que l'article français donne vivant, Narges Mohammadi, Shirin Ebadi, Googoosh, Asghar Farhadi,
  Mohammad Khatami n'y sont pas. Mahsa Amini (morte en 2022, née en 1999 selon l'article, en 2000 selon d'autres sources) et Neda
  Agha-Soltan, dont les morts ont mobilisé le monde, ne sont pas retenues : la chronologie de leur naissance se discute, et le recul manque.
  Qasem Soleimani, mort en 2020, est trop disputé pour qu'une fiche de trois phrases le tienne ; il n'a pas été cherché dans les images.
- **L'histoire contemporaine, sans complaisance.** Les trois grands acteurs du XXe siècle, Reza Chah, Mohammad Reza Pahlavi et Khomeini,
  sont dits tels qu'ils furent : la modernisation autoritaire et l'interdiction du voile (1936), la SAVAK et la « révolution blanche »,
  puis la révolution islamique, le velayat-e faqih, les exécutions de prisonniers politiques de l'été 1988 et la fatwa contre Rushdie.
  Mossadegh est renversé par un coup d'État que la CIA et le MI6 ont organisé. Nader Chah, qui pille Delhi, Agha Mohammad Khan, qui met
  Tbilissi à sac, et Abbas Ier, qui déplace des Arméniens de force, ont leur ombre dans la fiche.
- **Neuf femmes**, de la princesse Taj es-Saltaneh (1883) à la mathématicienne Maryam Mirzakhani (1977) : Bibi Khanoum Astarabadi, qui
  ouvre en 1907 la première école de filles de Téhéran, la poétesse Parvin E'tesami, Forough Farrokhzad, la romancière Simin Daneshvar, les
  chanteuses Qamar ol-Moluk Vaziri (première à chanter en public, sans voile, en 1924), Marzieh et Hayedeh. Beaucoup de figures sont
  mortes hors d'Iran : Reza Chah à Johannesburg, Mohammad Reza Pahlavi au Caire, Hedayat et Kiarostami à Paris, Choubak à Berkeley, Golestan
  dans le Sussex, Shariati à Southampton, Marzieh en France, Hayedeh aux États-Unis, Jamalzadeh et Hessabi à Genève.
- **Où l'on range qui.** Omar Khayyam, mathématicien d'abord (algèbre, calendrier de Malik Chah) puis poète, est avec les Sciences ;
  al-Ghazali, Sohrawardi et Tabari avec la pensée ; Nader Chah, chef de guerre avant d'être chah, avec les Guerres et résistances, comme
  Abbas Mirza, Sattar Khan et Mirza Koutchak Khan ; Taj es-Saltaneh et Bibi Khanoum Astarabadi, « combats pour les droits », aussi. Kamal-ol-Molk,
  Sani ol-Molk et Reza Abbassi sont les trois seuls Beaux-arts : l'axe le plus mince. Monir Farmanfarmaian (date incertaine) et Houshang Seyhoun (pas
  d'article français) n'ont pas été retenus, et Bahman Mohassess n'a pas été examiné.
- **Un seul sportif.** Gholamreza Takhti, champion olympique à Melbourne en 1956, dont la générosité et la mort à trente-sept ans, en 1968,
  ont fait un symbole d'intégrité (voir « Les sportifs : une exception, pas une règle »).
- **Écartés faute de date, d'article ou de portrait.** Al-Kashi (mathématicien de Kachan) a été retiré : aucun portrait libre, seulement des
  pages de manuscrit ; Mahmoud Hessabi, physicien, l'a remplacé aux Sciences. Ali-Naqi Vaziri (fils de Bibi Khanoum) n'a pas d'article
  français retrouvé, et Mollâ Sadrâ pas de date établie.
- **Des portraits souvent indirects**, et les légendes le disent : deux reliefs achéménides (Darius Ier, Xerxès Ier à Persépolis,
  celui-ci endommagé), un plat sassanide (Khosro Ier), deux statues (Ya'qub ibn al-Layth à Zabol, Omar Khayyam), un buste (Nizam al-Mulk),
  des miniatures et dessins (Ismaïl Ier attribué à Behzad, Saadi en 1427, Ferdowsi en 1476-1486, Hafez, Sohrawardi, Reza Abbassi par Mo'in
  Mosavver en 1673), une gravure sur bois de Dürer (Al-Sufi, sous le nom d'Azophi Arabus), un sceau calligraphique au nom de Tabari et un
  timbre de 1976 au nom de Nasir ad-Din Tusi (tous deux `nomVisible`), un manuscrit d'Attar exposé à Berlin, des portraits posthumes (Agha
  Mohammad Khan vers 1820, Nader Chah en 1774, Abbas Mirza en 1849) et une photographie colorisée en 2021 (Forough Farrokhzad). Cinq sont
  recadrés dans une image plus large (Attar, Kiarostami, Hatami dans une photographie de couple, Al-Sufi dans la carte céleste, Mirzakhani),
  et celle de Mirzakhani, agrandie depuis une source de 144 pixels de large, est la seule libre assez grande que Commons propose : elle reste floue.
- **Statut américain des images : à relire.** Cinquante et un portraits sont du « domaine public », dont la plupart sont des photographies du XXe siècle
  d'auteur inconnu (Foroughi, Reza Chah, Mossadegh, Khomeini, Shariati, Sepehri, Hayedeh, Fardin, Hatami, Takhti, Hessabi…) ou un
  portrait officiel de 1973 (Mohammad Reza Pahlavi). Le script lit la licence que Commons déclare, non le statut américain, et ce dernier
  n'a **pas été vérifié image par image** : Wikimedia répondait 429 à presque toutes les requêtes de cet environnement et le contrôle a été
  abandonné au bout de cinq fichiers. D'après les modèles de Commons, les œuvres publiées en Iran n'y sont pas protégées aux États-Unis,
  l'Iran n'étant pas partie aux conventions de Berne et de Genève, mais c'est à confirmer pour les photographies publiées hors d'Iran
  (Mossadegh : International News Photos, 1951 ; Nasseredin Chah : Nadar). Les sept CC BY-SA 4.0 (Darius, Khosro, Ya'qub, Nizam al-Mulk,
  Tabari, Kiarostami, Al-Sufi) viennent d'importateurs identifiés, sauf celle du plat de Khosro, une « œuvre personnelle » dont la page de
  Commons ne donne pas le nom.
- **Un téléchargement contraint.** Les miniatures de largeur non standard étaient refusées (429) : Dehkhoda, Saba, Entezami, Takhti
  sont demandés en 330 px, Attar en 960 px, Xerxès, Kiarostami et Hatami en 500 px, Mirzakhani et Al-Sufi à la taille de l'original.
- **Géolocalisation** : aucune figure n'est encore placée sur l'Atlas, faute de biographie liée (le test des faits liés ne l'exige pas).

### Un bloc : l'Afrique centrale

`pan_afriquecentrale`, « Grandes figures d'Afrique centrale » (code `afriquecentrale`, bloc) : **67 personnages de dix pays** —
RDC 20, Cameroun 11, Burundi 8, Congo 7, Centrafrique 6, Gabon 4, Rwanda 4, Guinée équatoriale 3, Tchad 3,
São Tomé-et-Príncipe 1 — de Rudolf Douala Manga Bell (1873) à Dikembe Mutombo (1966). Par axe : 39 Chefs d'État et dirigeants,
11 Littérature et pensée, 11 Musique, spectacle et sport, 6 Guerres et résistances ; 19 ⭐ et aucune biographie liée. 67 portraits :
27 du domaine public, 8 CC0, 8 CC BY 4.0, 4 CC BY 2.0, 3 CC BY 3.0, 1 CC BY 2.5, 6 CC BY-SA 4.0, 5 CC BY-SA 3.0, 3 CC BY-SA 3.0 NL, 1 CC BY-SA 3.0 DE et 1 CC BY-SA 2.0.
Aucune figure n'est née avant 1800, cinq entre 1800 et 1899, soixante-deux depuis 1900 : **depuis le départ de l'Angola** (Alphonse Ier du Kongo, Njinga et Kimpa Vita, au bloc de
l'Afrique australe), l'Afrique centrale des royaumes n'y est plus que par le Rwanda de Musinga (1883) et le Burundi ; l'époque des indépendances pèse l'essentiel.
Les mots-clés du thème portent les dix pays et leurs anciens noms (Zaïre, Congo belge, Oubangui-Chari, Fernando Poo, Ruanda-Urundi),
la CEEAC, les villes (Kinshasa, Brazzaville, Léopoldville), le Kongo, les Grands Lacs, la rumba congolaise, le makossa et le soukous.

- **Le périmètre est celui des dix membres de la CEEAC restant**, la Communauté économique des États de l'Afrique centrale, comme l'Afrique de
  l'Ouest suit la CEDEAO : la RDC, le Congo, le Cameroun, le Gabon, la Centrafrique, le Tchad et la Guinée équatoriale
  (la demande de départ), plus **São Tomé-et-Príncipe, le Rwanda et le Burundi**. Ce sont des membres de la CEEAC ; l'usage français range le Rwanda et le Burundi
  en « Afrique centrale » avec la RDC, dont ils ont partagé la tutelle belge ; et São Tomé complète l'Afrique centrale des Nations unies. Ils pèsent 13 figures sur 67.
  **L'Angola a quitté le bloc** à la demande de l'éditeur : ses dix figures sont au bloc de l'Afrique australe (voir « Un bloc : l'Afrique australe »). Le Kenya, la Tanzanie,
  l'Ouganda et la Corne sont à l'Afrique de l'Est et Corne.
- **Aucun pays ne dépasse 40 %.** La RDC en pèse 30 %, ce qui reste sous le seuil de `partMaxPays` ; la demande de départ tolérait de
  le dépasser. Les petits pays tiennent par une, deux ou trois figures (São Tomé : la poétesse Alda do Espírito Santo, qui a écrit
  les paroles de l'hymne national).
- **Rangés là où on les honore.** Alphonse Ier, Njinga et Kimpa Vita, nés dans l'Angola actuel, sont partis avec lui au bloc de l'Afrique australe, bien que le
  royaume du Kongo déborde sur la RDC et le Congo : le bloc central n'a donc plus aucune figure d'avant 1873. Henri Lopes, né à Léopoldville,
  est congolais de Brazzaville, où il a été Premier ministre.
- **Que des morts.** Paul Biya, Teodoro Obiang Nguema, Denis Sassou-Nguesso, Faustin-Archange Touadéra, Paul Kagame, Denis Mukwege
  n'y sont pas, comme dans les autres panthéons. Mutombo (mort en 2024) et Mudimbe (2025) sont les plus récents.
- **Les noms qu'il fallait trancher.** Une date qui se discute n'entre pas : Ibrahim Njoya, roi des Bamoun (né en 1860 ou en 1876
  selon les sources), Kigeli IV Rwabugiri (1840 ou 1853) et Marguerite Barankitse (1956 ou 1957) sont écartés. Quand l'article
  français donne une approximation, elle est dite : Kasa-Vubu (vers 1917), Musinga (vers 1883). André-Marie Mbida est daté de 1914, comme sur sa fiche française
  (d'autres sources donnent 1917).
- **L'histoire contemporaine, sans complaisance.** Mobutu (la kleptocratie), Bokassa (le massacre d'écoliers de 1979), Macías Nguema
  (un tiers de la population en exil), Hissène Habré (condamné en 2016 à Dakar), Micombero (les massacres de 1972), Kayibanda et
  Habyarimana (les violences contre les Tutsi et le génocide de 1994) sont dits tels qu'ils furent ; Lumumba est tué avec la
  complicité de la Belgique, qui en reconnaît en 2001 une responsabilité morale ; Um Nyobè est abattu par l'armée française.
- **Six femmes** (huit avant le départ de Njinga et de Kimpa Vita, les deux grandes figures de la résistance du XVIIe siècle). Marthe Moumié, cofondatrice de
  l'Union démocratique des femmes camerounaises ; Élisabeth Domitien, première femme Première ministre d'Afrique ; sœur Anuarite,
  première Congolaise béatifiée ; les écrivaines Angèle Rawiri (Gabon), María Nsué Angüe (Guinée équatoriale) et Alda do Espírito Santo.
  Agathe Uwilingiyimana, première Première ministre du Rwanda, a sa fiche rédigée mais pas d'image libre.
- **Deux axes sont vides, donc retirés.** Aucun Beaux-arts (Bodys Isek Kingelez, Marcel Gotène, Pilipili Mulongoy n'ont pas d'image
  libre) et aucune figure Sciences, techniques et innovation (le panthéon n'en a trouvé aucune avec une fiche et une image sûres) :
  `axeOrder` ne compte que quatre axes. À reprendre si de telles figures apparaissent.
- **Les images ont écarté plus de quarante figures**, parmi lesquelles Wendo Kolosoy (le père de la rumba), Félix-Roland Moumié,
  Ernest Ouandié, Francis Bebey, Sony Labou Tansi, Tchicaya U Tam'si, Marc-Vivien Foé, André Kolingba, Félix Malloum,
  Agathe Uwilingiyimana, Fred Rwigema, Alexis Kagame ; Tshala Muana n'a qu'une image de 168 × 216 pixels, que Commons ne sert qu'en
  120 pixels de large. Les cinq fiches déjà rédigées et la liste des écartés sont dans `scripts/pantheon/afriquecentrale_candidats.md`.
- **Des portraits souvent indirects**, et les légendes le disent : quatre timbres (Dacko, Patassé, Micombero, Rwagasore), deux affiches
  (Mulele, Mongo Beti : le nom est écrit dans l'image, trois fiches sont `nomVisible`) et un buste (Simaro Lutumba).
  Quatre photographies sont recadrées dans une image plus large (Goumba, Pépé
  Kallé, Monsengwo, Angèle Rawiri) ; celle de Rawiri, un tirage ancien d'un cliché de famille, est la seule libre et reste médiocre.
  La photographie de Musinga est un groupe de cour : le roi y est entouré de ses dignitaires. Celle de Simon Kimbangu est la
  photographie que Commons date de 1919 : son identification reste celle de Commons.
- **Statut américain des images : à relire.** Vingt-sept portraits sont du « domaine public », dont la plupart sont des photographies
  d'auteur inconnu ou d'archives (Franco, Docteur Nico et Grand Kallé : photographies promotionnelles de labels congolais des
  années 1950-1960 ; Boganda, Youlou, Pamelo Mounk'a, Opangault, Matswa). Le script lit la licence que Commons déclare, non le statut
  américain, et ce dernier n'a **pas été vérifié image par image** : Wikimedia répondait 429 à presque toutes les requêtes de cet
  environnement. À confirmer pour ces photographies publiées en Afrique avant 1978 sans mention de droits.
- **Un téléchargement contraint.** Les originaux sont refusés (429) et les miniatures de largeur non standard aussi : Farnana est
  demandé en 250 px, Musinga en 330 px, Goumba à la taille de l'original.
- **Géolocalisation** : aucune figure n'est encore placée sur l'Atlas, faute de biographie liée.

### Un bloc : l'océan Indien occidental

`pan_oceanindien`, « Grandes figures de l'océan Indien occidental » (code `oceanindien`, bloc ; rangé sous « Océan Indien occidental », entre la Nouvelle-Zélande et les pays baltes) : **32 personnages de quatre pays** —
Madagascar 18, Maurice 8, Comores 4, Seychelles 2 — d'Andrianampoinimerina (vers 1745) à James Mancham (1939). Par axe : 24 Chefs d'État et dirigeants, 4 Guerres et résistances, 2 Littérature et pensée, 1 Musique,
spectacle et sport, 1 Sciences, techniques et innovation ; 5 ⭐ (Andrianampoinimerina, Radama Ier, Ranavalona Ire, Rabearivelo, Ramgoolam) et aucune biographie liée. **Cinq axes, pas six** : aucune figure des Beaux-arts n'a à la
fois un article en français et un portrait libre. 32 portraits : 17 du domaine public, 4 CC BY 4.0, 4 CC BY-SA 4.0, 2 CC BY-SA 3.0, 2 CC BY-SA 3.0 DE et **3 images non libres** (voir plus bas). Quatre figures sont nées avant 1800
(Andrianampoinimerina, Radama Ier, Ranavalona Ire, Adrien d'Épinay), neuf entre 1800 et 1899, dix-neuf depuis 1900 : l'histoire des royaumes de Madagascar (la dynastie merina) puis celle des indépendances. Les mots-clés du thème portent
les quatre pays, leurs capitales et îles (Antananarivo, Moroni, Port-Louis, Victoria, Anjouan, Mohéli), les Mascareignes, le hainteny, le hira gasy et les Menalamba.

- **Un petit bloc, dominé par Madagascar** : l'île pèse 18 figures sur 32, soit 56 %, au-dessus du seuil par défaut de 40 %. Le bloc déclare donc `partMaxPays` à 0,6, un choix écrit de l'éditeur (« ce n'est pas grave si
  Madagascar dépasse »). Les Comores (4) et les Seychelles (2) tiennent par peu de figures ; Maurice (8) par ses premiers ministres, ses poètes et un saint.
- **La Réunion et Mayotte ne sont pas dans le bloc** : ce sont des départements français, et leurs figures vont au panthéon de la France, comme celles d'Hawaï à celui des États-Unis. C'est aussi pour cela qu'**Andriantsoly**,
  roi de Mayotte qui l'a cédée à la France en 1841, n'est pas retenu.
- **Un invité** : **Jacques-Désiré Laval** (1803-1864), prêtre français mort à Maurice, rangé là où on l'honore (sa fiche dit qu'il est français). Les gouverneurs français de l'Isle de France et des Seychelles (La Bourdonnais,
  Poivre, Quéau de Quincy) relèvent de la France et ne sont pas retenus. Laval est rangé aux « Guerres et résistances », comme Kolbe en Pologne.
- **Les rois et reines de Madagascar sont presque tous au panthéon** (Andrianampoinimerina, Radama Ier et II, Rasoherina, Ranavalona Ire, II et III, le Premier ministre Rainilaiarivony), parce que leurs portraits sont du
  domaine public. Ranavalona III est aussi la dernière reine, exilée à Alger ; Rainandriamampandry, pasteur, général et ministre de l'Intérieur, est fusillé par la France en 1896.
- **Dates retenues** : « vers » devant Andrianampoinimerina (1745, l'infobox dit 1740), Radama Ier (1793), Ranavalona Ire (1788, l'article dit entre 1788 et 1790) ; Ali Soilih est daté de 1937 (les catégories de l'article disent 1932).
  Les autres dates viennent de l'article français ou de Wikidata, non recoupées une à une.
- **Des portraits souvent indirects**, et les légendes le disent : quatre rois et reines (Andrianampoinimerina, Radama Ier, Ranavalona Ire et II) sont vus sur des portraits posthumes de Philippe-Auguste Ramanankirahina, peints
  d'après des images anciennes ; Ralaimongo par un buste de son monument ; Rakoto Frah par un dessin ; Ahmed Abdallah et Ali Soilih par des illustrations de la Voix de l'Amérique ; Duval par une image tirée d'une vidéo ;
  Adrien d'Épinay par un portrait peint. Huit portraits sont **recadrés localement** sur le visage, à partir de l'image déjà téléchargée : les quatre portraits posthumes précédents, Radama II, Tsiranana (photographié
  avec Willy Brandt), Ramanantsoa (photographié avec un Allemand) et Bissoondoyal. Le recadrage n'est pas dans `recadrage` : un nouveau téléchargement les rendrait à leur cadrage de base.
- **Trois images non libres, exception assumée** : Rasoherina (licence introuvable sur la page du fichier), Anerood Jugnauth (photographie du secrétariat de la présidence de Maurice) et Veerasamy Ringadoo (photographie de la
  bibliothèque de la LSE) ont une image que `fetch_portraits.py` refuse (licence absente ou hors liste). Elles sont téléchargées depuis Commons, leur licence s'écrit « Image non libre » dans les données,
  `image.source` renvoie à la page du fichier. **À remplacer dès qu'une image libre existe, ou à faire valider**, comme pour la Pologne, l'Afrique de l'Est et l'Afrique australe.
- **Écartés ou en attente**, voir `scripts/pantheon/oceanindien_candidats.md` : une vingtaine de figures sans portrait libre (Rabemananjara, Raseta, Ranaivo, Malcolm de Chazal, Édouard Maunick, Antoine Abel, Anquetil, Rozemont,
  Saïd Mohamed Cheikh, fondateur de l'État comorien…) et quelques figures sans article français (Rémy Ollier, Raman Osman). Les Beaux-arts sont vides.
- **Statut américain des images : à relire**, comme pour les blocs précédents. Le téléchargement a demandé le même détour par les miniatures directes de `upload.wikimedia.org`, Wikimedia limitant le débit pendant des heures.

### Un bloc : les pays baltes

`pan_baltes`, « Grandes figures des pays baltes » (code `baltes`, bloc ; rangé sous « Pays baltes », entre la Nouvelle-Zélande et le Portugal) :
**65 personnages de trois pays** — Estonie 23, Lituanie 23, Lettonie 19 — de Mindaugas (vers 1203) à Mariss Jansons (1943). Par axe : 24 Littérature et
pensée, 12 Chefs d'État et dirigeants, 10 Musique, spectacle et sport, 10 Sciences, techniques et innovation, 6 Beaux-arts, 3 Guerres et résistances ;
26 ⭐ et aucune biographie liée. 65 portraits : 48 du domaine public, 3 CC0, 6 CC BY et 8 CC BY-SA. Huit figures sont nées avant 1800 (les grands-ducs
lituaniens, Donelaitis, Baer, Krusenstern, Bellingshausen), quarante-cinq entre 1800 et 1899, douze depuis 1900 : le panthéon est celui des
« réveils nationaux » du XIXe siècle et de l'entre-deux-guerres. Les mots-clés du thème portent les trois pays et leurs noms historiques (Livonie,
Courlande, Estland, Samogitie, Prusse-Orientale), les capitales, le grand-duché de Lituanie, les Allemands baltes, la « révolution chantante »
et la chaîne balte, Kalevipoeg, les dainas et Lāčplēsis.

- **Trois pays, pas de pays dominant** : aucun ne dépasse 36 % des figures. Le bloc suit les frontières actuelles, comme tous les panthéons :
  Kristjan Jaak Peterson, poète estonien né à Riga, et Georg Ots, né à Petrograd, n'y sont donc pas ; Kārlis Zāle, sculpteur de la Lettonie né
  à Mažeikiai, non plus. Donelaitis, né en Prusse-Orientale (région de Kaliningrad), y est rangé comme Kant l'est en Allemagne : la fiche le dit.
- **Les Germano-Baltes comptent pour l'Estonie et la Lettonie** quand ils y sont nés : Baer, Krusenstern, Bellingshausen, Uexküll (Estonie),
  Ostwald (Lettonie). Ils ont fait carrière dans l'Empire russe ou en Allemagne, et leur fiche le dit.
- **Les figures disputées avec un autre pays n'y sont pas** : Sergueï Eisenstein (né à Riga) est au panthéon de la Russie ; Berlin, Rothko, Gary,
  Levinas, Miłosz et Lipchitz, nés dans le pays mais rangés là où on les honore, sont dans `scripts/pantheon/baltes_candidats.md`. Gimbutas, Mekas
  et Birkerts, qui se sont toujours dits lituaniens ou lettons, y sont.
- **Des dates approchées, dites** : Mindaugas (vers 1203), Gediminas (vers 1275), Algirdas (vers 1296) et Vytautas (vers 1350) ; les dates disputées
  (Heifetz, Jogaila, Tõnisson) écartent la figure.
- **Que des morts**, et deux sportifs au titre de la règle des sportifs, des joueurs d'échecs : Paul Keres (cinq couronnes estoniennes à son effigie) et
  Mikhaïl Tal (« magicien de Riga », champion du monde 1960).
- **L'histoire du XXe siècle, sans complaisance** : Päts (le coup d'État de 1934), Ulmanis (celui de 1934, la déportation de 1940), Smetona (celui de
  1926), Brazauskas (communiste devenu président), Nėris (poétesse ralliée à l'annexion de 1940, « mémoire disputée »), Žemaitis (chef des partisans
  fusillé à Moscou), Šimaitė (Juste parmi les nations).
- **Huit femmes** : Koidula, Marie Under, Aspazija, Žemaitė, Petkevičaitė-Bitė, Nėris, Šimaitė et Gimbutas.
- **Onze fiches rédigées n'ont pas de portrait** : Wikimedia a répondu 429 à toute miniature, des heures durant, depuis cet environnement. Elles
  sont gardées, avec le fichier Commons choisi, dans `scripts/pantheon/baltes_candidats.md` : Konstantin Päts et Eduard Vilde (Estonie), Andrejs
  Pumpurs, Aleksandrs Čaks, Zenta Mauriņa, Jukums Vācietis, Vilhelms Purvītis et Gustav Klucis (Lettonie), Konstantinas Sirvydas, Vydūnas et Jonas
  Jablonskis (Lituanie). **Päts, premier président de l'Estonie, est le manque le plus sensible** : à réintégrer en premier. Pumpurs a de plus été refusé
  par le garde-fou de `fetch_portraits.py` (l'historique de la page évoque une ancienne image « non libre » ; la version actuelle est taguée domaine public).
- **Des portraits souvent indirects**, et les légendes le disent : gravures imaginaires pour Mindaugas, Gediminas et Algirdas, détail du tableau de Matejko pour
  Vytautas (aucun portrait d'époque), dessin posthume pour Donelaitis, portrait au crayon pour Barons, peintures pour Kreutzwald, Poska et Krusenstern,
  dessin de Triik pour Tammsaare, statue pour Baumanis (recadrée). Tsander est photographié jeune, en uniforme, devant une porte : le visage est petit.
  La photographie de Žemaitė est un détail d'un cliché de famille.
- **Statut américain des images : à relire**, comme pour l'Afrique centrale : quarante-huit portraits sont du « domaine public », en majorité des photographies
  d'auteur inconnu ; le script lit la licence que Commons déclare, non le statut américain, qui n'a pas été vérifié image par image.
- **Un téléchargement contraint** : voir ci-dessus ; sur les 79 fiches écrites à l'origine, 65 ont leur portrait. Trois autres images ont été écartées à l'examen
  (visage caché, bas-relief de pierre tombale, 184 × 250 pixels).
- **Géolocalisation** : aucune figure n'est placée sur l'Atlas, faute de biographie liée.

### Un bloc : les Balkans

`pan_balkans`, « Grandes figures des Balkans » (code `balkans`, bloc) : **148 personnages de dix pays** — Roumanie 37, Serbie 28,
Croatie 25, Bulgarie 17, Albanie 11, Bosnie-Herzégovine 7, Moldavie 6, Macédoine du Nord 6, Kosovo 6, Monténégro 5 — de Dioclétien
(vers 244) à Toše Proeski (1981). Par axe : 42 Chefs d'État et dirigeants, 42 Littérature et pensée, 22 Guerres et résistances,
16 Sciences, techniques et innovation, 15 Musique, spectacle et sport, 11 Beaux-arts ; 44 ⭐ et une biographie liée (Nikola Tesla).
148 portraits : 107 du domaine public, 6 CC0, 35 CC BY ou CC BY-SA ; 9 figures sont nées avant 1500, 12 de 1500 à 1799, 127 depuis 1800.

- **Le périmètre est celui des pays colorés sur la carte de départ** : la Roumanie, la Moldavie, la Bulgarie, la Serbie, la Croatie,
  la Bosnie-Herzégovine, le Monténégro, le Kosovo, l'Albanie et la Macédoine du Nord. **La Slovénie, grisée sur cette carte, n'y est pas** (elle
  relève du bloc d'Europe centrale), ni la Grèce, qui a son panthéon. Le Kosovo porte le code `XK`, l'usage de l'Union
  européenne : `Intl.DisplayNames` le nomme « Kosovo » et le drapeau 🇽🇰 s'affiche.
- **Aucun pays ne dépasse 40 %** : la Roumanie en pèse 25 %. Le Monténégro, le Kosovo et la Moldavie tiennent par cinq ou six figures.
- **Un personnage, un seul thème, et celui qui l'honore le plus.** Nikola Tesla, né en Croatie de parents serbes, est serbe (son urne est à
  Belgrade, son nom est celui de l'aéroport) ; Tito, né à Kumrovec, est croate, la fiche disant ce qu'est la Yougoslavie ; Ivo Andrić,
  né à Travnik, est bosniaque ; Gavrilo Princip, né en Bosnie, aussi ; Constantin Ier, né à Niš, est serbe, Dioclétien, né près de Salone, croate ;
  Elias Canetti, né à Roussé, est bulgare ; Mircea Eliade, Cioran, Ionesco et Tzara, nés en Roumanie, sont roumains, bien qu'ils aient écrit en
  France ; Dora Pejačević (née à Budapest) est croate. Mère Teresa, née à Skopje, reste au panthéon du sous-continent indien.
- **Des dates disputées, et donc des figures absentes.** Karađorđe (1752, 1762 ou 1768), Petar Ier Petrović-Njegoš, Milunka Savić,
  Ali Pacha de Janina, Dositej Obradović, saint Sava, Ivan Asen II : l'article français donne plusieurs années, et une date contestée n'a rien
  à faire dans une question de chronologie. Étienne le Grand est gardé avec « vers 1433 » ; Dioclétien, Constantin Ier, Stefan Dušan, Tudor
  Vladimirescu et Pjetër Bogdani aussi gardent leur « vers ».
- **Des figures disputées entre deux pays, avec leur contexte.** Gotsé Deltchev (né à Koukouch, aujourd'hui en Grèce) et Damé Grouev sont rangés en
  Macédoine du Nord ; la Bulgarie les revendique aussi, et la fiche le dit. Les figures albanaises du Kosovo (Rugova, Jashari, Demaçi, Boletini, Prishtina) sont rangées au Kosovo, Skanderbeg et Fan Noli (né dans
  l'actuelle Turquie) en Albanie : on range là où l'État actuel honore le plus.
- **L'histoire contemporaine, sans complaisance.** Ceaușescu (la Securitate, les privations), Antonescu (la Shoah), Milošević et Mihailović
  (guerres de Yougoslavie, tchetniks), Tuđman (controverses sur la Bosnie), Hoxha (le régime le plus fermé d'Europe), Jivkov (la campagne contre
  les Turcs de Bulgarie), Jashari (héros pour les Kosovars, terroriste pour Belgrade) et Princip (héros ou assassin, selon le côté) sont dits tels qu'ils
  furent ; la fiche de Boris III distingue les Juifs bulgares des Juifs de Thrace et de Macédoine.
- **Des portraits souvent indirects**, et les légendes le disent : cinq timbres (Kiš, Selimović, Bogdani, Palade, Predić), deux bustes (Dizdar,
  Jashari), un buste de Krapina, une statue (Marulić), des portraits votifs et des fresques (Étienne le Grand, Brâncoveanu, Dušan, Lazar), des gravures
  de presse et des tableaux posthumes (Zrinski, Vlad). Onze sont `nomVisible` : le nom y est écrit. Ceaușescu est montré à dix-huit ans, sur une
  photographie d'identité judiciaire de 1936, seule image libre convenable.
- **Statut américain des images : à relire.** Comme ailleurs, le script lit la licence que Commons déclare ; Celibidache, Ghiaurov, Christoff et Idromeno
  (autoportrait) ont été écartés parce que Commons les dit rétablis aux États-Unis, et plusieurs photographies yougoslaves ou roumaines d'avant 1978
  restent à confirmer.
- **Les images ont écarté seize fiches rédigées**, dont Syméon Ier, Miroslav Krleža, Boris Christoff, Nicolaï Ghiaurov, Dražen Petrović, Blaže Koneski, Vlaho
  Bukovac et Andrija Mohorovičić. Elles sont dans `scripts/pantheon/balkans_candidats.md`, avec la liste des figures examinées et laissées de côté.
- **Un téléchargement contraint.** Wikimedia répondait 429 aux miniatures de grands originaux : onze portraits de petite taille sont demandés à 330 px ou à la
  taille de l'original.
- **Géolocalisation** : seul Tesla, qui a une biographie, est placé sur l'Atlas (Smiljan, comme sa biographie).

### Un pays à part : l'Indonésie

`pan_id`, « Grandes figures d'Indonésie » (code `id`, pays) : **59 personnages**, d'Airlangga (vers 1002) à Munir Said Thalib (1965). Par axe : 21 Chefs d'État et
dirigeants, 15 Littérature et pensée, 10 Guerres et résistances, 8 Musique, spectacle et sport, 3 Sciences, techniques et innovation, 2 Beaux-arts ; 11 ⭐ et
aucune biographie liée. 59 portraits : 44 du domaine public, 2 CC0, 1 CC BY 4.0, 5 CC BY-SA 3.0, 4 CC BY-SA 3.0 NL, 2 CC BY-SA 4.0 et 1 image non libre (voir plus bas). Sept figures sont nées avant 1800, quinze
entre 1800 et 1899, trente-six depuis 1900 : le thème est celui de la naissance de la nation, des fondateurs de Budi Utomo et du Sarekat Islam aux
ministres de la République. Les mots-clés portent le pays et ses adjectifs, les grandes îles (Java, Sumatra, Bali, Sulawesi, Bornéo), les villes
(Jakarta, Batavia, Surabaya, Yogyakarta, Bandung), Aceh, les royaumes (Majapahit, Mataram), les Indes néerlandaises, le Pancasila et Borobudur.

- **Un pays, pas un bloc.** `pan_id`, aucun champ `pays` — aucun invité d'un autre État — et « Pendant ce temps, ailleurs… » le compte comme `thm_id`,
  l'« Histoire de l'Indonésie ». Le thème se range par « Indonésie », entre la Grèce et l'Iran. Il n'est qu'un des thèmes prévus pour l'Asie du Sud-Est :
  la Malaisie, Singapour, Brunei et le Timor oriental, les Philippines, le Vietnam-Cambodge-Laos puis la Thaïlande et la Birmanie ont leur propre thème (voir « Un bloc : le monde malais »). Raffles n'est donc pas ici : il revient au futur bloc malais, comme le décide la règle « celui qui l'honore le plus ».
- **Une liste que la règle de l'article français a réduite de moitié.** 114 candidats avaient été examinés, 73 retenus après les règles sur les vivants et les
  images ; vingt et un d'entre eux n'ont **aucun article sur Wikipédia en français** et sont écartés, comme ailleurs : Raden Wijaya (le fondateur de
  Majapahit n'a qu'une entrée dans l'article « Wijaya »), Mohammad Husni Thamrin, Soepomo, Imam Bonjol, Teuku Umar, Ahmad Yani, Pangeran Antasari,
  Hamengkubuwono Ier, Didi Kempot, W. S. Rendra, Sutan Takdir Alisjahbana, Ranggawarsita, Marah Rusli, S. Sudjojono, Basuki Abdullah, Friedrich
  Silaban, Ki Nartosabdho, Sardjito, Herman Johannes, Marie Thomas et Soedjatmoko. Les Beaux-arts et les Sciences en sortent les plus
  maigres : deux peintres (Raden Saleh, Affandi), trois savants. C'est un manque de l'encyclopédie plus que de l'histoire, et la liste se rouvrira si des articles
  paraissent.
- **Pas de vivants, pas d'entrepreneurs, pas de sportifs de palmarès.** Joko Widodo, Megawati, Susilo Bambang Yudhoyono, Prabowo Subianto, Anggun,
  Rhoma Irama, Iwan Fals, Christine Hakim, Iko Uwais, les badistes (Rudy Hartono, Liem Swie King, Susy Susanti, Taufik Hidayat…) et les boxeurs (Ellyas Pical,
  Chris John) sont dehors ; les fortunes (Liem Sioe Liong, Oei Tiong Ham) aussi. Aucun sportif indonésien n'entre : les records restent aux Biographies.
- **Dates retenues quand les sources divergent.** Airlangga est daté de « vers 1002 », comme Wikipédia en anglais (d'autres sources donnent 991), et son règne de
  1019 à 1045 ; Gajah Mada de « vers 1290-vers 1364 », comme le dit l'article français ; Iskandar Muda de « vers 1583 », Cut Nyak Dhien de « vers 1848 », Untung
  Surapati de « vers 1660 », Raden Saleh de « vers 1811 ». Tan Malaka est de 1897 (l'état civil, que l'article français donne ; on lit parfois 1894). Pangeran Antasari,
  né en 1797 ou en 1809 selon les sources, aurait été daté de « vers 1809 », mais il n'a pas d'article français. Sultan Agung est mort en 1645 pour la plupart des sources,
  en 1646 pour l'infobox de l'article français : 1645 est retenu. Hasyim Asy'ari est né en 1871 (1875 pour d'autres sources).
- **Où l'on range qui.** Habibie, ingénieur aéronautique avant d'être le troisième président, est avec les Sciences, comme le juriste Mochtar Kusumaatmadja (l'État
  archipélagique, la Convention de 1982) et le médecin Johannes Leimena ; l'économiste Sumitro Djojohadikusumo, avec la pensée, comme Adam Smith ; Hasyim Asy'ari et Hamka
  avec la pensée aussi ; Sudirman, Nasution, Bung Tomo et Ngurah Rai avec les Guerres et résistances ; Sukarno, Hatta, Sjahrir, Natsir, Amir Sjarifuddin
  avec les dirigeants, comme les nationalistes d'avant 1945 (Tjokroaminoto, Soetomo, Ki Hajar Dewantara, Douwes Dekker, Ratulangi). Trois chefs de
  guerre du XIXe siècle que la liste prévoyait (Imam Bonjol, Teuku Umar, Antasari) sont absents faute d'article ; Diponegoro et Cut Nyak Dhien tiennent seuls ce siècle.
- **Six femmes** : Kartini, Dewi Sartika, Maria Walanda Maramis et Ruhana Kuddus pour l'éducation et la presse des femmes, Rasuna Said pour la politique, Cut Nyak Dhien pour la
  guerre d'Aceh.
- **Des portraits souvent indirects**, et les légendes le disent : deux œuvres sculptées (Airlangga en Vishnu à Belahan, la statue moderne de Gajah Mada), cinq tableaux
  (Iskandar Muda, Sultan Agung, Surapati, Arung Palakka, Ngurah Rai), un dessin fait de son vivant (Diponegoro, par A. J. Bik en 1830, Rijksmuseum, CC0), un autoportrait
  (Raden Saleh), un billet de la Banque d'Indonésie (Cut Nyak Dhien) et deux timbres, de 1999 (Maria Walanda Maramis) et de 1997 (Affandi, un portrait peint) — tous trois `nomVisible`, le nom étant imprimé dans l'image.
  Trois sont recadrés dans une image plus large : Sjahrir (à la tribune, visage au bord gauche), Arung Palakka (le tableau, dans son cadre) et Ismaïl Marzuki (au piano, visage à
  droite) ; ce dernier a été recadré **à la main**, depuis la miniature de 500 pixels que Commons avait fournie, faute de pouvoir la retélécharger.
- **Statut américain des images : à relire.** Quarante-six portraits sont du « domaine public » ou CC0, et le script a lu la licence déclarée par Commons, non le statut américain,
  qu'il ne vérifie pas. La plupart sont des œuvres officielles (portraits ministériels, billets, timbres) ou des photographies d'agences anciennes (IPPHOS, archives nationales), que
  Commons étiquette « US ? » : c'est le cas qui a coûté huit figures à l'Amérique hispanique. **Décision prise** : accepter les images d'origine gouvernementale ou d'avant 1946,
  en gardant la liste ici. Les « US oui » relevés sont Diponegoro, Douwes Dekker, Kartini, Hatta, Ali Sadikin, Leimena, Mochtar Kusumaatmadja, Airlangga et Sultan Agung.
- **Une exception assumée : l'image non libre de Pramoedya Ananta Toer** (⭐). Son portrait libre (une photographie de 1954) existe sur Commons, mais Wikimedia répondait 429 à tout
  téléchargement de ce fichier depuis cet environnement. Sur décision de l'auteur du projet, il a donc l'image qui laisse le plus de libertés : « Pram semasa muda », la photographie de
  jeunesse téléversée sur la Wikipédia en indonésien (`id.wikipedia.org/wiki/Berkas:Pram_muda.JPG`) sous le modèle des images promotionnelles, source d'origine
  `lecturer.ukdw.ac.id`. Sa licence s'écrit « Image non libre » dans les données, `image.source` renvoie à cette page, `fetch_portraits.py` l'ignore et le test de schéma accepte cette
  exception. **À remplacer dès que le fichier libre se télécharge** (`Pramoedya Ananta Toer, Pekan Buku Indonesia 1954, p214.jpg`), ou à faire valider.
- **Six portraits récupérés par un chemin détourné.** Suharto, Usmar Ismail, Titiek Puspa, Sumitro, Affandi et Munir ont été téléchargés par `Special:FilePath` (miniature de 330
  ou 500 pixels, ou original), faute de pouvoir passer par `fetch_portraits.py`, que Wikimedia bloquait ; la licence, l'auteur et la date ont été lus par le script sur la page de chaque fichier,
  comme d'habitude. Munir, dont la seule image trouvée d'abord était une photographie de groupe, a une photographie de jeunesse tirée de l'album familial, dont l'auteur n'est pas nommé sur Commons
  (« TBD ») : le crédit dit « Famille de Munir (album personnel) ». Aucune image non libre n'a été nécessaire.
- **Les écartés fragiles** : Pattimura, Martha Christina Tiahahu, Kartosuwiryo, Frans Kaisiepo, Cut Meutia, Hasanuddin, Sisingamangaraja XII, Nuku de Tidore, Trunajaya, Ahmad Dahlan,
  Djuanda, Sjafruddin Prawiranegara, Soebardjo, Roosseno, Sutami, Bing Slamet ne sont gardés par aucune image convenable (timbres et billets seuls, ou images minuscules) : ils
  reviendront si un meilleur portrait apparaît.
- **Géolocalisation** : aucune figure n'est placée sur l'Atlas, faute de biographie liée (le test des faits liés ne l'exige pas).

### Un pays à part : l'Afrique du Sud

`pan_za`, « Grandes figures d'Afrique du Sud » (code `za`, pays ; rangé sous « Afrique du Sud », entre l'Afrique de l'Ouest et l'Allemagne) : **56 personnages**,
de Jan van Riebeeck (1619) à Lucky Dube (1964). Par axe : 21 Guerres et résistances, 9 Chefs d'État et dirigeants, 9 Littérature et pensée, 8 Musique, spectacle et sport,
6 Sciences, techniques et innovation, 3 Beaux-arts ; 21 ⭐ et 3 biographies liées (Mandela, Tutu, Biko). 56 portraits : 36 du domaine public, 4 CC0, 4 CC BY et 12 CC BY-SA.
Les mots-clés du thème portent le pays et ses villes (Le Cap, Johannesburg, Pretoria, Durban, Soweto), les peuples (Zoulous, Xhosa, Afrikaners, Boers), le Grand Trek,
l'apartheid, l'ANC, Rivonia, Sharpeville, Robben Island et la « nation arc-en-ciel ».

- **Un pays, pas un bloc** : `pan_za`, et « Pendant ce temps, ailleurs… » le compte comme `thm_za` (« Histoire de l'Afrique du Sud »). Les invités d'un autre État portent leur
  `pays` et la fiche le dit : Jan van Riebeeck (Pays-Bas) et Cecil Rhodes (Royaume-Uni). Les figures nées ailleurs mais devenues sud-africaines n'en portent pas :
  Verwoerd (né à Amsterdam), Anton van Wouw (né aux Pays-Bas) et Johnny Clegg (né en Angleterre). Gandhi, qui y a inventé le satyagraha, est au panthéon du sous-continent
  indien, Tolkien (né à Bloemfontein) à celui du Royaume-Uni, Pessoa (élevé à Durban) à celui du Portugal.
- **Le XXe siècle pèse lourd, et le panthéon le dit** : 21 figures sur 56 sont rangées sous « Guerres et résistances », parce que la lutte contre l'apartheid est le fil du
  siècle : Lutuli, Sisulu, Tambo, Mbeki, Kathrada, Sobukwe, Biko, Winnie Madikizela-Mandela, Albertina Sisulu, Ruth First, Helen Suzman, Beyers Naudé et Desmond Tutu
  (rangé là, comme Gandhi, plutôt qu'aux « dirigeants »). Les premières résistances à la colonisation (Chaka, Cetshwayo, Sekhukhune, Nongqawuse, Saartjie Baartman)
  y sont aussi, au même titre que la guerre des Boers (Christiaan de Wet).
- **Les deux camps de l'histoire, sans complaisance** : Kruger, Botha, Hertzog, Smuts et Verwoerd, qui ont fait l'Afrique du Sud blanche, sont écrits avec leurs fautes —
  Smuts « défend toutefois la ségrégation raciale », Hertzog fait voter la loi de 1936 qui retire aux Noirs du Cap leur inscription sur les listes communes, Verwoerd est
  « le principal architecte de l'apartheid ». Rhodes et Van Riebeeck, figures très débattues, sont dits comme tels. Winnie Madikizela-Mandela est écrite avec l'affaire
  Stompie Seipei.
- **Les peuples d'avant la colonisation** : Chaka, Cetshwayo (zoulous), Sekhukhune (pedi), Nongqawuse (xhosa) et Saartjie Baartman (khoïkhoï) ; les dates sont « vers »
  pour Cetshwayo (1826), Sekhukhune (1814), Nongqawuse (1841) et Lutuli (1898), approchées dans les sources, et Sontonga (1873) ; Baartman est datée de 1789 (les sources
  disent 1788 ou 1789).
- **Un classement à part** : en afrikaans, la particule fait partie du nom de famille. « Par nom de famille », la galerie range donc Frederik de Klerk à D (« De Klerk »),
  Jan van Riebeeck à V, Hendrik van der Bijl à V et Alex La Guma à L — contrairement au néerlandais de Belgique et des Pays-Bas, où Van Gogh est rangé à G (exceptions dans
  `scripts/pantheon_classement.py`).
- **Que des morts** : Mbeki, Zuma, Coetzee, Abdullah Ibrahim, Caster Semenya ou Charlize Theron n'y sont pas. Athol Fugard, mort en mars 2025, y aurait sa place (fiche en attente).
- **Les images** : Craven est montré par une statue et Mphahlele par un buste de bronze, et la légende le dit ; Sekoto, Laubser et le portrait peint de Van Riebeeck sont des
  œuvres d'époque ; Mbeki est vu sur une photographie d'identité judiciaire de la police, Ruth First sur une photographie de passeport (214 × 266 px), Plaatje, Sontonga et Linda
  sur des clichés de 200 à 250 px de large ; la gravure de Saartjie Baartman est recadrée sur le visage. Le visage de Chaka, dessiné en pied, reste petit.
- **Seize fiches rédigées n'ont pas de portrait libre convenable**, et sont gardées dans `scripts/pantheon/za_candidats.md` (avec le nom de fichier Commons quand il y en a un) :
  Chris Hani, Dingane, Piet Retief, Herman Charles Bosman (refusé par le garde-fou : alerte « non-free »), Alex La Guma, Athol Fugard, Bessie Head, Irma Stern, Ernest Mancoba,
  Walter Battiss (image trouvée, mais Wikimedia refuse la miniature), David Goldblatt, Ernest Cole, Basil D'Oliveira, Joseph Shabalala, Brenda Fassie et Raymond Dart (refusé :
  « fair use »). **Les Beaux-arts n'ont que trois figures** (Van Wouw, Laubser, Sekoto) à cause de cela : Stern, Mancoba, Battiss, Goldblatt et Cole sont à réintégrer en premier.
- **Wikimedia limite le débit** : sur les 72 fiches écrites à l'origine, 56 ont leur portrait. Plusieurs miniatures (Kathrada, Leipoldt, Van Wouw, Cormack, Maxeke, Locke) n'ont été obtenues
  qu'après plusieurs essais, deux d'entre elles (Leipoldt, Van Wouw) en largeur 330 seulement. Une photographie de la recherche, « David Goldblatt (14271185078).jpg », montre un autre
  homme que le photographe : à vérifier avant de choisir une image par son nom de fichier.
- **Statut américain des images : à relire**, comme pour l'Afrique centrale : les 36 « domaine public » sont en majorité des photographies d'auteur inconnu ; le script lit
  la licence que Commons déclare, non le statut américain, qui n'a pas été vérifié image par image.
- **Géolocalisation** : seules les figures qui ont leur biographie liée (Mandela, Tutu, Biko) y figurent déjà, par leur biographie.

### Un pays à part : l'Éthiopie

`pan_et`, « Grandes figures d'Éthiopie » (code `et`, pays ; rangé sous « Éthiopie », entre les États-Unis et l'Europe centrale) : **43 personnages**, de Zara Yaqob (1399) à Hachalu Hundessa (1986).
Par axe : 20 Chefs d'État et dirigeants, 8 Guerres et résistances, 6 Littérature et pensée, 6 Musique, spectacle et sport, 2 Sciences, techniques et innovation, 1 Beaux-arts ; 7 ⭐ et aucune biographie
liée. 43 portraits : 30 du domaine public, 2 CC0, 3 CC BY 2.0, 2 CC BY 3.0, 1 CC BY-SA 2.0, 3 CC BY-SA 3.0 et 2 CC BY-SA 4.0. Six figures sont nées avant 1800, dix-sept entre 1800 et 1899, vingt depuis 1900.
Les mots-clés du thème portent le pays et l'Abyssinie, ses villes (Addis-Abeba, Adoua, Gondar, Harar, Axoum, Lalibela), ses peuples (Oromo, Amhara, Tigré, Choa), le négus, les Salomonides, le Derg, le
rastafarisme et Magdala.

- **Un pays, pas un bloc** : l'Éthiopie a une continuité d'État de plus de deux mille ans, une langue, une écriture et une Église propres. C'est la condition posée avant d'écrire : **assez de figures
  avec un portrait libre** (environ 45 ; on en a trouvé 56 avant de retirer celles dont l'image ne convient pas, voir plus bas), faute de quoi le pays aurait rejoint un bloc de la Corne. `pan_et`
  compte comme `thm_et` (« Histoire de l'Éthiopie ») dans « Pendant ce temps, ailleurs… ». **L'Érythrée n'y est pas** : elle ira au bloc Afrique de l'Est et Corne ; Aman Andom, né dans l'Érythrée
  italienne, y est en revanche, parce qu'il préside le Derg éthiopien. Seule invitée d'un autre État : **Catherine Hamlin** (`pays` : AU), gynécologue australienne qui a fondé l'hôpital des fistules
  d'Addis-Abeba, rangée là où on l'honore le plus. Livingstone, Eusébio et Rhodes, qui touchent à la région, sont ailleurs.
- **Que des morts** : Mengistu Haile Mariam, Haile Gebrselassie, Kenenisa Bekele, Tirunesh Dibaba, Derartu Tulu, Mahmoud Ahmed, Mulatu Astatke ou Gebisa Ejeta n'y sont pas. Meles Zenawi, mort en 2012, y est.
- **Rien avant 1399** : Ézana, Kaleb, Lalibela et Yared, figures du royaume d'Aksoum et des Zagwé, n'ont pas de date de naissance dans Wikidata ou une date au siècle près. **À rediscuter** : un « vers 450 »
  pour Kaleb et un « vers 1162 » pour Lalibela, comme Mansa Moussa « vers 1280 » à l'Afrique de l'Ouest. Les Beaux-arts n'ont qu'**une figure** (Skunder Boghossian) et les Sciences deux (Aklilu Lemma et
  Catherine Hamlin), faute de portraits libres : comme pour l'Afrique du Sud, on ne force pas.
- **Dates retenues quand les sources divergent** : Iyasu V est daté de 1897 (l'article français ; Wikidata dit 1895) ; sont « vers » Mentewab (1706), Sahle Selassie (1795), Taytu Betul (1851) et Desta Damtew
  (1892). Kebede Mikael est écarté : son année de naissance est 1914 ou 1916 selon les sources. Les dates de Wikidata ont été recoupées avec l'article français quand celui-ci en donne.
- **Un classement à part** : un Éthiopien n'a pas de nom de famille, seulement son prénom suivi de celui de son père. « Par nom de famille », la galerie les range donc par leur prénom (Haïlé Sélassié Ier à H,
  Menelik II à M, Abebe Bikila à A), sauf Skunder Boghossian (« Boghossian, Skunder ») et Catherine Hamlin, qui ont un nom de famille (exceptions dans `scripts/pantheon_classement.py`).
- **Les images** : Zara Yaqob est vu sur une peinture du XVIIᵉ siècle, Gelawdewos sur un triptyque, Iyasu Ier sur une enluminure de manuscrit (recadrée sur lui), Mentewab sur une icône de l'église de Narga
  Selassié, Lebna Dengel sur un portrait posthume de Cristofano dell'Altissimo ; Skunder Boghossian est vu par son propre autoportrait à l'aquarelle ; Heruy et Desta sont recadrés sur le visage. Sahle Selassie, Tewodros II
  et Yohannes IV sont montrés par des images du XIXᵉ siècle dont l'auteur est inconnu ou incertain. Zara Yaqob : la peinture porte « Zara Yacob » sans plus de précision, elle montre un intronisé.
- **Sept figures n'ont pas leur image** (trois retirées, quatre en attente) : voir `scripts/pantheon/et_candidats.md`. **Ahmed Gragn** (⭐, la seule image est une statue), **Susenyos Ier** (un dessin
  de cavalier au visage minuscule) et **Miruts Yifter** (photographie de course où l'on ne distingue pas lequel est lui) ont leur fiche dans l'historique git ; **Alula Engeda** (⭐), **Gobena Dacche**, **Balcha
  Safo** et **Mikael du Wollo** ont leur fiche et leur fichier Commons dans `et_candidats.md` : Wikimedia a répondu 429 à tout téléchargement de ces images, pendant plus d'une heure. Cinq figures n'ont pas
  d'article en français et ne sont pas écrites (Tekle Hawariat, Onesimos Nesib, Abune Tewophilos, Bealu Girma, Afewerk Tekle).
- **Statut américain des images : à relire**, comme pour l'Afrique centrale et l'Afrique du Sud : 30 des 43 images sont « domaine public », en majorité des photographies d'auteur inconnu ; le script lit la
  licence que Commons déclare, non le statut américain.

### Un bloc : l'Afrique de l'Est et la Corne

`pan_afriqueest`, « Grandes figures d'Afrique de l'Est et de la Corne » (code `afriqueest`, bloc ; rangé sous « Afrique de l'Est et Corne », entre l'Afrique centrale et l'Afrique de l'Ouest) : **63 personnages de huit pays**
— Kenya 16, Soudan 11, Tanzanie 11, Somalie 10, Ouganda 9, Djibouti 3, Soudan du Sud 2, Érythrée 1 — d'Osman Digna (vers 1836) à Binyavanga Wainaina (1971). Par axe : 36 Chefs d'État et dirigeants,
15 Guerres et résistances, 5 Littérature et pensée, 5 Musique, spectacle et sport, 2 Sciences, techniques et innovation ; 8 ⭐ et aucune biographie liée. **Cinq axes, pas six** : aucune figure des Beaux-arts n'a
à la fois un article en français et un portrait libre (Tingatinga, Elimo Njau, Gregory Maloba n'ont pas d'article français ; Kamala Ibrahim Ishaq n'a pas d'image). 63 portraits : 36 du domaine public, 2 CC0,
2 CC BY 2.0, 1 CC BY 3.0, 2 CC BY 4.0, 4 CC BY-SA 2.0, 4 CC BY-SA 3.0, 2 CC BY-SA 3.0 NL, 1 CC BY-SA 3.0 DE, 5 CC BY-SA 4.0 et **4 images non libres** (voir plus bas). Quatorze figures sont nées entre 1800 et 1899, quarante-neuf
depuis 1900, aucune avant : l'Afrique de l'Est précoloniale (Aksoum, la côte swahilie, les Grands Lacs) est absente faute de dates de naissance. Les mots-clés du thème portent les huit pays, Zanzibar, le Buganda,
la Corne de l'Afrique, les capitales (Nairobi, Kampala, Khartoum, Mogadiscio, Dar es Salaam), les Mau Mau, le Mahdi, les Kikuyu et les Luo.

- **Le périmètre** : Kenya, Tanzanie, Ouganda, Somalie, Érythrée, Djibouti, Soudan et Soudan du Sud — **sans l'Éthiopie**, qui a son panthéon. Le Rwanda et le Burundi restent dans le bloc de l'Afrique centrale.
  Le Soudan (11 figures) est ici faute de bloc plus naturel : ni l'Égypte, ni le Maghreb, ni le Machrek ne le traitent. **Aucun pays au-delà de 40 %** : le Kenya pèse 16 sur 63 (25 %).
- **L'Érythrée n'a qu'une figure, Zerai Deres** (1915-1945), traducteur devenu héros de l'anticolonialisme (l'Éthiopie et l'Érythrée le revendiquent). Aucun autre Érythréen n'a à la fois un article français, une date de
  naissance, un décès et un portrait : Woldeab Woldemariam, Hamid Idris Awate et Tsehaytu Beraki n'ont pas d'image (celle qu'on prête à Awate est contestée), Osman Saleh Sabbe n'a pas d'article français.
  **À enrichir** si une image paraît.
- **Les images petites ont été gardées** : une douzaine de portraits ont de 150 à 300 px de large (Muteesa Ier, Gouled, Kiwanuka, Obote, Aden Adde, Bibi Titi, Oginga Odinga, Temu, Bi Kidude, Mirambo…). Ils sont agrandis,
  donc flous, mais le visage est reconnaissable.
- **Des représentations indirectes, que les légendes disent** : Dedan Kimathi est montré par sa statue de Nairobi (recadrée sur la tête), Janani Luwum par sa sculpture de l'abbaye de Westminster ; Wilson Kiprugut par une figurine de
  la série « Campioni dello Sport » (1968) ; le Mahdi, le Khalife, Mohammed Abdullah Hassan et Mirambo par des gravures d'époque.
- **Quatre images non libres, exception assumée** : Mwai Kibaki et Mkwawa (licence « Open Government Licence » du Royaume-Uni), Louis Leakey (« No restrictions », Smithsonian) et Aden Abdullah Osman Daar (« Attribution »)
  ont une image que `fetch_portraits.py` refuse (licence hors liste). Elles sont téléchargées depuis Commons, leur licence s'écrit « Image non libre » dans les données (`image.licence`), `image.source` renvoie à la page du
  fichier. **À remplacer dès qu'une image libre existe, ou à faire valider**, comme pour la Pologne.
- **Dates retenues quand les sources divergent** : Jomo Kenyatta est daté de 1894 (l'article français ; Wikidata dit 1893) ; sont « vers » Osman Digna (1836), Tippo Tip et Barghash ben Saïd (1837), Muteesa Ier (1837, l'article dit
  aussi 1827), Mirambo (1840), Idi Amin (1925, entre 1923 et 1928), Bi Kidude (1910). Mohamed Siad Barre est daté de 1919 (certaines sources donnent 1910).
- **Les noms, et le classement** : Kényans, Ougandais et Tanzaniens se rangent par leur nom (Kenyatta, Nyerere) ; Somalis, Arabes et Swahilis, qui n'ont pas de nom de famille, par leur prénom (Abdullahi Yusuf Ahmed à A, Hassan
  al-Tourabi à H, Abd al-Rahman al-Mahdi à A), de même que les souverains (Mwanga II, Muteesa II). Idi Amin Dada se range à « Amin Dada », Ahmed Dini Ahmed à « Dini » (exceptions dans `scripts/pantheon_classement.py`).
- **Les deux tiers sont des chefs d'État** : trente-six figures sur soixante-trois, dont Idi Amin, Siad Barre et Nimeiry, écrits avec leurs fautes. Wangari Maathai est rangée aux « Guerres et résistances », comme
  Tutu en Afrique du Sud. Louis Leakey, britannique né au Kenya, est ici faute de panthéon britannique qui l'ait.
- **Écartés ou en attente**, voir `scripts/pantheon/afriqueest_candidats.md` : Samuel Wanjiru (champion olympique du marathon : la seule image montre la foule d'un stade, pas son visage), Charles Lwanga (la seule image est une icône à plusieurs figures), Ali Dinar
  (la seule image est la photographie de son cadavre, prise par les Britanniques en 1916), Apollo Kaggwa (la photographie réunit deux hommes), Ali Aref Bourhan ; plusieurs dizaines de figures sans article en français et une vingtaine sans portrait libre.
- **Statut américain des images : à relire**, comme pour l'Éthiopie ; **le téléchargement a demandé des détours** : Wikimedia a limité le débit pendant des heures, et `fetch_portraits.py` a dû être doublé d'un
  téléchargement direct des miniatures sur `upload.wikimedia.org` (tailles standard seulement) pour les dernières images.

### Un bloc : l'Afrique australe

`pan_afriqueaustrale`, « Grandes figures d'Afrique australe » (code `afriqueaustrale`, bloc ; rangé sous « Afrique australe », avant l'Afrique centrale) : **64 personnages de neuf pays** — Zimbabwe 13, Angola 10, Namibie 10,
Mozambique 8, Zambie 7, Botswana 5, Lesotho 5, Malawi 4, Eswatini 2 — d'Alphonse Ier du Kongo (vers 1457) à Yvonne Vera (1964). Par axe : 36 Chefs d'État et dirigeants, 17 Guerres et résistances, 6 Littérature et pensée,
4 Musique, spectacle et sport, 1 Beaux-arts ; 12 ⭐ et aucune biographie liée. **Cinq axes, pas six** : aucune figure Sciences, techniques et innovation n'a à la fois un article en français et un portrait libre.
64 portraits : 21 du domaine public, 3 CC0, 3 CC BY 3.0, 2 CC BY 3.0 BR, 7 CC BY 4.0, 2 CC BY-SA 2.0, 2 CC BY-SA 2.5, 9 CC BY-SA 3.0, 4 CC BY-SA 3.0 NL, 8 CC BY-SA 4.0 et **3 images non libres** (voir plus bas).
Cinq figures sont nées avant 1800 (Alphonse Ier, Njinga, Kimpa Vita, Jonker Afrikaner, Moshoeshoe Ier), quatorze entre 1800 et 1899, quarante-cinq depuis 1900. Les mots-clés du thème portent les neuf pays et leurs anciens
noms (Rhodésie, Nyassaland, Sud-Ouest africain, Bechuanaland, Basutoland, Swaziland), les capitales, la SADC, le Kongo et le Ndongo, le Frelimo, le MPLA, la SWAPO, la ZANU, les Ndébélé, les Héréros et la Chimurenga.

- **Le périmètre** : Angola, Mozambique, Zimbabwe, Zambie, Malawi, Namibie, Botswana, Lesotho et Eswatini — **sans l'Afrique du Sud**, qui a son panthéon. Les **dix figures de l'Angola** viennent du bloc de l'Afrique centrale,
  qu'elles ont quitté à la demande de l'éditeur : leurs fiches, leurs portraits et leurs ⭐ (Njinga, Kimpa Vita, Neto) sont repris tels quels, les portraits renommés (`pan_afriqueaustrale_*`). L'Angola pèse 16 %,
  le Zimbabwe 20 % : aucun pays n'approche 40 %. Livingstone, Eusébio et Rhodes, qui touchent à la région, sont au Royaume-Uni, au Portugal et à l'Afrique du Sud.
- **L'Eswatini (2 figures) et le Malawi (4) sont maigres** : les rois du Swaziland (Sobhuza Ier, Mswati II, Mbandzeni) n'ont pas d'image libre, et Chipembere, Chiume et Chirwa n'ont pas d'article en français.
- **Le Zimbabwe et ses deux camps** : Mugabe, Nkomo, Tsvangirai, mais aussi les Blancs de Rhodésie Ian Smith et Garfield Todd (ce dernier né en Nouvelle-Zélande). Smith, qui proclame l'indépendance de 1965 pour préserver
  le pouvoir de la minorité blanche, est écrit avec ses fautes, comme Idi Amin et Siad Barre à l'Afrique de l'Est. Mugabe n'est pas épargné : « de plus en plus autoritaire ».
- **Dates retenues quand les sources divergent** : Nehanda est datée de « vers 1862 » (l'article français dit 1840 ou 1862 ; 1862 est la date la plus citée, mais c'est un choix éditorial), Hastings Banda de « vers 1898 »
  (aucun registre de naissance), Lobengula de « vers 1845 » (l'infobox donne aussi 1833), Hendrik Witbooi de « vers 1830 », Maharero de « vers 1820 », Jonker Afrikaner de « vers 1785 », Labotsibeni de « vers 1859 »
  (l'article dit aussi 1858), John Chilembwe de « vers 1871 ». Les autres dates viennent de l'article français ou de Wikidata, non recoupées une à une.
- **Des portraits souvent indirects**, et les légendes le disent : Eduardo Mondlane et Josina Machel sont montrés par leur effigie sur un tissu imprimé (capulana), Rose Chibambo par son portrait sur un billet de banque,
  Lobengula par un portrait de Ralph Peacock d'après un croquis, Jonker Afrikaner et Moshoeshoe Ier par des gravures, Orlando Mendes et Thomas Mofolo par des dessins. Marcelino dos Santos, Mário Coluna et Moshoeshoe II
  sont vus sur des photographies de groupe, recadrées sur eux. Six portraits (Nkomo, Lobengula, Samuel Maharero, Jonker Afrikaner, Witbooi, Labotsibeni) ont été **recadrés localement** sur le visage, à partir de
  l'image déjà téléchargée, et non via `recadrage` : un nouveau téléchargement les rendrait à leur cadrage de base.
- **Trois images non libres, exception assumée** : Chenjerai Hove (licence GFDL), Theo-Ben Gurirab (licence « GODL-India », du secrétariat du vice-président de l'Inde) et Sobhuza II (« Open Government Licence », Archives
  nationales du Royaume-Uni) ont une image que `fetch_portraits.py` refuse (licence hors liste). Elles sont téléchargées depuis Commons, leur licence s'écrit « Image non libre » dans les données, `image.source` renvoie à
  la page du fichier. **À remplacer dès qu'une image libre existe, ou à faire valider**, comme pour la Pologne et l'Afrique de l'Est.
- **Écartés ou en attente**, voir `scripts/pantheon/afriqueaustrale_candidats.md` : Mzilikazi (la seule image est un dessin de 1836 qui montre des guerriers, sans visage lisible), Deolinda Rodrigues (année de décès 1967 ou
  1968), Craveirinha, Chitepo, Tongogara, Marechera, Kutako (aucun portrait libre), et plusieurs dizaines de figures sans article en français. Les images de Seretse Khama et de Ruth Williams Khama ont dû être
  remplacées : les fichiers de Wikidata étaient proposés à la suppression sur Commons (« speedy deletion »).
- **Statut américain des images : à relire**, comme pour l'Éthiopie et l'Afrique de l'Est. Le téléchargement a de nouveau exigé le détour par les miniatures directes de `upload.wikimedia.org`, Wikimedia limitant le débit pendant
  des heures.

### Un bloc : le Caucase (Géorgie, Arménie, Azerbaïdjan)

`pan_caucase`, « Grandes figures du Caucase » (code `caucase`, bloc ; rangé sous « Caucase », entre le Canada et la Chine) : **72 personnages de trois pays** — Arménie 25, Azerbaïdjan 24, Géorgie 23 — de Tigrane II
(vers 140 av. J.-C.) à Lotfi Zadeh (1921). Par axe : 28 Littérature et pensée, 14 Chefs d'État et dirigeants, 14 Musique, spectacle et sport, 7 Guerres et résistances, 5 Beaux-arts, 4 Sciences, techniques et innovation ;
24 ⭐ et aucune biographie liée. Chaque pays pèse environ un tiers du bloc (35 % au plus : le seuil de 40 % n'est pas en jeu). 72 portraits, tous libres : domaine public, CC BY 2.0, CC BY 4.0, CC BY-SA 3.0 et 4.0, CC0.
Les mots-clés portent les trois pays, leurs villes (Tbilissi, Tiflis, Erevan, Bakou, Gandja, Choucha), le Haut-Karabagh, le Nakhitchevan, les alphabets, les républiques de 1918 et la révolution des Roses.

- **Le périmètre** : les trois États du Caucase du Sud. **Le Caucase du Nord** (Tchétchénie, Daghestan, Ossétie du Nord, Circassiens…) relève de la Russie et n'est pas ici.
- **Un personnage, un seul thème** : Staline (né à Gori), Bagration, Aïvazovski, Rostropovitch (né à Bakou) et Borodine sont à la Russie, Charles Aznavour à la France, Tamara Khanum à l'Asie centrale, Yousuf Karsh au Canada,
  Ara Güler à la Turquie, Chah Ismaïl Ier et Shahriar à l'Iran : ils n'ont pas été redoublés.
- **Le pays que le bloc donne à chacun, non l'état civil.** Les Arméniens de l'Empire ottoman honorés à Erevan (Komitas, né à Kütahya, Varoujan, Andranik) sont en Arménie, comme Khatchatourian (né à Tiflis), Paradjanov (né à Tbilissi)
  ou Ambartsoumian ; Mikoïan, Bagramian et Kerimov, soviétiques d'origine caucasienne, y figurent avec une fiche qui dit ce qu'ils furent. **Lotfi Zadeh**, né à Bakou, élevé en Iran, américain, est un cas disputé, écrit comme tel.
- **Nizami** écrit en persan : l'Azerbaïdjan et l'Iran le revendiquent, la fiche le dit. Les figures contestées (Heydar Aliyev, Chevardnadze, Gamsakhourdia, Mikoïan, Rassoulzadé et ses contacts avec l'Allemagne nazie)
  sont écrites avec ce qu'on leur reproche, sans l'éluder.
- **Dates retenues quand les sources divergent** : Tamar (« vers 1160 »), David IV (« vers 1073 »), Roustavéli (« vers 1172-vers 1216 »), Kétévan (« vers 1565 »), Grégoire de Narek (« vers 951 »), Nassimi (« vers 1369-1417 »).
  Écartés pour une date contestée : Fuzûlî (vers 1483 ou 1494), Hasan bey Zardabi (1837 ou 1842), Mkhitar Gosh (vers 1120 ou 1130), Zarifa Aliyeva (1923 ou 1924), Mikayil Mouchfig (mort en 1938 ou 1939), Zabel Yessayan (décès incertain).
- **Sans article en français, donc écartés** (la fiche renvoie à fr.wikipedia) : Jalil Mammadguloutzadé, Lado Goudiachvili, Ivané Beritachvili, Abbasgulu Bakikhanov, Mirza Chafi Vazeh.
- **Écartés faute d'image exploitable** : Sayat-Nova, Toros Roslin, Avétik Issahakian, Alexandre Spendiarov, Vardan Mamikonian (statues, timbres ou images minuscules), Tenguiz Abouladzé et Merab Mamardachvili (aucune photographie libre),
  Fikret Amirov (fichier signalé à la suppression), Sattar Bahlulzadé (le portrait de Commons n'est pas sûrement le sien) et Artem Alikhanian (seul un bas-relief).
- **Des portraits indirects, et les légendes le disent** : Tigrane II par une monnaie, Kétévan par un panneau d'azulejos de Lisbonne, Roustavéli par un détail de fresque, Nassimi par un portrait imaginaire, les médiévaux par des miniatures
  ou des icônes. **Kerimov est montré sur un timbre qui écrit son nom** (`nomVisible`) : il est écarté de « Qui est-ce ? », comme les autres portraits à inscription. Six portraits ont été recadrés (`recadrage`).
- **Statut américain des images : à relire**, comme pour les blocs précédents ; le téléchargement a de nouveau exigé le détour par les miniatures directes de `upload.wikimedia.org`.
- La liste examinée et les écartés sont dans `scripts/pantheon/caucase_candidats.md`.

### Un bloc : le monde malais (Malaisie, Singapour, Brunei et Timor oriental)

`pan_malais`, « Grandes figures du monde malais » (code `malais`, bloc ; rangé sous « Monde malais »,
entre le Maghreb et la Nouvelle-Zélande) : **33 personnages de quatre pays** — Malaisie 13, Singapour 13, Brunei 4, Timor oriental 3 — de Thomas Stamford Raffles (1781) à Yasmin
Ahmad (1958). Par axe : 22 Chefs d'État et dirigeants, 3 Musique, spectacle et sport, 3 Littérature et pensée, 2 Guerres et résistances, 2 Sciences, techniques et innovation,
1 Beaux-arts ; 7 ⭐ et aucune biographie liée. 33 portraits : 20 du domaine public, 2 CC0, 3 CC BY 2.0, 3 CC BY-SA 3.0 et 5 CC BY-SA 4.0. Une figure est née avant 1800, cinq
entre 1800 et 1899, vingt-sept depuis 1900. **C'est le plus petit et le plus politique des panthéons** : les deux tiers des figures sont des chefs d'État, rois ou chefs de gouvernement.
Les mots-clés portent les quatre pays et leurs adjectifs, les villes et États (Kuala Lumpur, Penang, Malacca, Johor, Kedah, Sabah, Sarawak, Dili, Bandar Seri Begawan), les
Établissements des détroits, Raffles, Merdeka, le sultanat, les Peranakan.

- **Pourquoi ce bloc, et pourquoi si petit.** Le monde malais rassemble des pays qui ont partagé la Malaya britannique, les Établissements des détroits puis la fédération de 1963-1965.
  La liste est sortie de Wikidata, qui donne les personnes disparues de chaque pays, classées par nombre de langues, et des catégories de Wikipédia en français, et non d'une liste
  écrite de mémoire : 104 candidats ont été examinés (avec les Philippines, qui ont leur propre thème), 52 d'entre eux dans ces quatre pays. Presque tous les écrivains, artistes
  et savants malaisiens ou singapouriens n'ont **aucun article en français**, ou aucun portrait libre, et sont écartés (voir plus bas).
- **Près de 40 % pour deux pays.** La Malaisie et Singapour pèsent chacune 13 figures sur 33, soit 39 % : la source déclare `partMaxPays` à 0,45, un choix écrit avant l'arrivée de Sylvan. Le Timor oriental, avec
  trois figures, est le plus mince ; Brunei en a quatre, tous des sultans, faute d'autres personnalités ayant à la fois un article français et une image libre.
- **Raffles et le Timor oriental, deux choix à discuter.** Raffles, britannique né en mer au large de la Jamaïque, est ici parce que Singapour l'honore et que le panthéon du Royaume-Uni
  ne l'a pas : c'est la règle « celui qui l'honore le plus ». Le Timor oriental, lusophone et occupé par l'Indonésie de 1975 à 1999, n'a pas vraiment sa place dans un « monde malais » :
  il y est rangé faute d'un bloc qui lui convienne mieux, avec Nicolau Lobato et Francisco Xavier do Amaral, les deux dirigeants de l'indépendance de 1975, et le poète Fernando Sylvan.
- **Écartés faute d'article en français** (une quarantaine) : Goh Keng Swee, S. Rajaratnam, Lim Yew Hock, Elizabeth Choy, Lim Boon Keng, Tan Siew Sin, V. T. Sambanthan, Onn Jaafar, Ismail Abdul
  Rahman, Za'ba, Usman Awang, Sudirman Arshad, Chin Peng, Mat Salleh, Tok Janggut, Dato' Bahaman, Syed Sheikh al-Hadi, Ibrahim Hussein, Syed Ahmad Jamal, Lim Chong Eu, Dom Boaventura
  (l'article existe mais l'image n'est pas un portrait), Martinho da Costa Lopes… Leur liste est dans `scripts/pantheon/malais_candidats.md`.
- **Écartés faute d'image libre convenable** : Hussein Onn (seules des photographies d'une station de métro portent son nom), Munshi Abdullah (le seul fichier est une page de manuscrit), Tun Jugah,
  Aishah Ghani, Irene Fernandez, Toh Chin Chye, Tan Kah Kee (seules des photographies de groupe), Zubir Said, Chan Choy Siong, Nino Konis Santana, Mustapha Harun (175 pixels). **Azlan
  Shah de Perak** n'a que des photographies de cérémonie où l'on ne le distingue pas, et **Tuanku Abdul Rahman**, premier roi de Malaisie, que des clichés de groupe.
- **Pas de vivants, pas d'entrepreneurs, peu de sportifs.** Mahathir, Anwar Ibrahim, Hassanal Bolkiah, Xanana Gusmão, José Ramos-Horta, Lee Hsien Loong sont dehors ; Mokhtar Dahari, légende du football
  malaisien, aussi (un sportif n'entre que si son nom dépasse le sport).
- **Fernando Sylvan** (1917-1993), poète timorais mort au Portugal, est le dernier arrivé. Sa photographie de 1965 (244 × 340 pixels) restait introuvable, Wikimedia répondant 429 : il est
  montré par un autre fichier de Commons, un photogramme de 1969 où il discourt lors d'une séance de propagande électorale (domaine public, recadré sur lui, la légende le dit).
- **Dates et noms.** Les noms à initiales (P. Ramlee, S. R. Nathan, J. B. Jeyaretnam) sont écrits en toutes lettres (Puteh Ramlee, Sellapan Ramanathan, Joshua Benjamin Jeyaretnam) : le découpage en
  phrases du script prend un point suivi d'une majuscule pour une fin de phrase. Fuad Stephens redevient ministre en chef de Sabah quelques semaines avant sa mort dans l'accident du « Double Six »
  (6 juin 1976). Saloma, née à Singapour, est rangée en Malaisie, où elle a fait carrière avec P. Ramlee.
- **Où l'on range qui.** Wu Lien-teh, médecin né à Penang et acteur de la lutte contre la peste de Mandchourie, est avec les Sciences, comme Lee Choo Neo, première femme médecin de Singapour ; Georgette
  Chen, la seule peintre, est aux Beaux-arts ; Lim Bo Seng (résistant) et Nicolau Lobato (chef de la résistance timoraise) sont aux Guerres et résistances ; Ungku Abdul Aziz (économiste) et Shahnon Ahmad
  sont avec la pensée et les lettres.
- **Des portraits souvent indirects**, et les légendes le disent : un tableau (Raffles, par George Francis Joseph), un autoportrait photographié dans son cadre (Georgette Chen), un timbre du Timor
  oriental (Lobato, `nomVisible`, le nom étant imprimé dans l'image) et une photographie de film (Puteh Ramlee). Sept sont recadrés dans une image plus large : Puteh Ramlee (à gauche d'un
  couple), Shahnon Ahmad, Ong Teng Cheong, Jeyaretnam (à la tribune), Georgette Chen (le tableau dans son cadre), Amaral (dans une foule) et Sylvan (à la tribune).
- **Statut américain des images : à relire.** Dix-neuf portraits sont du « domaine public », la plupart des photographies d'agence ou de presse anciennes ou des portraits officiels (Tun Abdul Razak,
  Tunku Abdul Rahman, les sultans de Brunei). Le script lit la licence que Commons déclare, non le statut américain, qui n'a pas été vérifié image par image ; comme pour l'Indonésie, la décision est
  d'accepter les images d'origine gouvernementale ou d'avant 1946, et la liste des « ? » est à relire.
- **Un téléchargement contraint.** Wikimedia refusait (429) la plupart des miniatures : les portraits ont été téléchargés par `Special:FilePath` (miniatures de 330, 500 ou 960 pixels, ou original), avec
  la licence, l'auteur et la date lus sur la page de chaque fichier. Trois crédits n'ont pas d'auteur sur Commons (Tan Cheng Lock, Lee Kuan Yew, Amaral) et disent « auteur inconnu ».
- **Géolocalisation** : aucune figure n'est placée sur l'Atlas, faute de biographie liée.

### Un pays à part : les Philippines

`pan_ph`, « Grandes figures des Philippines » (code `ph`, pays) : **39 personnages**, de Gabriela Silang (1731) à Nora Aunor (1953). Par axe : 15 Chefs d'État et dirigeants,
10 Guerres et résistances, 5 Musique, spectacle et sport, 4 Littérature et pensée, 3 Beaux-arts, 2 Sciences, techniques et innovation. Sept ⭐ : Aguinaldo, Quezon, Magsaysay, Marcos, Corazon Aquino,
Bonifacio et Rizal.

- **Pourquoi un thème à part.** Les Philippines ont une histoire propre (colonie espagnole puis américaine, révolution de 1896, occupation japonaise) et une culture que ni le monde malais ni
  l'Indonésie ne représentent. Le thème se range par « Philippines », entre les pays baltes et le Portugal ; ses figures portent l'étiquette de « Histoire des Philippines » (`thm_ph`), sans invité.
- **Des noms sans initiales** (le découpeur de phrases les prendrait pour des fins de phrase) : Manuel Quezon, José Laurel, Carlos García, Fidel Ramos, José Diokno, Marcelo del Pilar, Francisco Sionil José.
  Trois noms gardent leur ordre d'écriture au classement : Poe, Fernando, Jr. ; Sionil José, Francisco ; Defensor Santiago, Miriam (voir `EXCEPTIONS`).
- **Écartés ou en attente.** Quatre fiches sont écrites mais sans portrait libre exploitable (Commons répondait 429, ou la seule image était une statue lointaine) : Gregoria de Jesús, Marcela Agoncillo
  (deux timbres), Edith Tiempo (un timbre) et Leona Florentino (une statue à Vigan). Elles attendent dans `scripts/pantheon/ph_candidats.md`. Pedro Paterno (dates incertaines) et Carlos Rómulo
  (naissance 1898 ou 1899 selon les sources) ont été écartés ; Lorenzo Ruiz, Diego Silang, Teresa Magbanua, Lualhati Bautista, Zamora, Aurora Quezon et Pancho Villa n'ont pas d'article assez sûr
  ou pas d'image libre.
- **Des portraits souvent indirects**, et les légendes le disent : un dessin (Balagtas, illustration), des timbres philippins où le nom est imprimé (Gabriela Silang, Nicanor Abelardo : `nomVisible`),
  une photographie de scène (Josefa Llanes Escoda, recadrée sur son visage), un portrait en plan large recadré (José Rizal, Sergio Osmeña).
- **Statut américain des images** : même décision que pour l'Indonésie (images d'origine gouvernementale ou d'avant 1946 acceptées) ; Macapagal garde « auteur inconnu ».
- **Géolocalisation** : aucune figure n'est placée sur l'Atlas.

### Un bloc : l'Indochine (Vietnam, Cambodge et Laos)

`pan_indochine`, « Grandes figures d'Indochine » (code `indochine`, bloc ; rangé sous « Indochine », entre la Grèce et l'Indonésie) : **38 personnages
de trois pays** — Vietnam 19, Cambodge 12, Laos 7 — de Suryavarman II (vers 1094) à Đặng Thùy Trâm (1942). Par axe : 20 Chefs d'État et dirigeants, 7 Guerres et résistances, 5 Littérature et pensée,
4 Musique, spectacle et sport, 2 Beaux-arts, aucune figure pour les Sciences (l'axe est absent du thème) ; 9 ⭐ — Hô Chi Minh, Võ Nguyên Giáp, Trần Hưng Đạo, Nguyễn Du, Thích Nhất Hạnh, Jayavarman VII, Suryavarman II,
Norodom Sihanouk et Pol Pot — et aucune biographie liée. 38 portraits : 26 du domaine public, 1 CC0, 4 CC BY-SA 3.0, 2 CC BY-SA 4.0, 2 CC BY 3.0, 1 CC BY 4.0, 1 CC BY 2.0 et 1 CC BY-SA 2.0. Dix figures
sont nées avant 1800, huit entre 1800 et 1899, vingt depuis 1900. Les mots-clés portent les trois pays et leurs adjectifs, l'Indochine française, les villes (Hanoï, Saïgon, Huế, Phnom Penh, Vientiane,
Luang Prabang), Angkor, l'Annam, le Tonkin, la Cochinchine, le Đại Việt, le Lan Xang, le Việt Minh, les Khmers rouges, le Pathet Lao, Diên Biên Phu et la guerre du Vietnam.

- **Pourquoi ce bloc.** L'Indochine est un cadre colonial, mais les trois pays y ont partagé une administration, des guerres (la guerre d'Indochine, puis celle du Vietnam) et des régimes qui se répondent
  — Sihanouk, Hô Chi Minh et les princes lao. Le bloc se range par « Indochine ». Les mots-clés reprennent « Indochine » pour que la recherche trouve ce nom.
- **Plus de la moitié au Vietnam.** Le Vietnam pèse 19 figures sur 38, soit la moitié exacte : la source déclare `partMaxPays` à 0,55, un choix écrit. Le Laos n'en a que sept, et la culture lao,
  très peu documentée en français (aucun écrivain, aucun peintre, aucun savant lao n'a à la fois un article français et une image libre), en est absente.
- **Les rois bâtisseurs et la mémoire des guerres.** Suryavarman II (Angkor Vat) et Jayavarman VII (le Bayon) représentent l'empire khmer ; Fa Ngum et Setthathirath le Lan Xang ; Lê Thánh Tông, Gia Long,
  Nguyễn Huệ et Trần Hưng Đạo le Vietnam monarchique. Pol Pot, Lon Nol, Ngô Đình Diệm et Bảo Đại sont ici comme figures de l'histoire, non comme des modèles : le panthéon d'une série de jeu retient ceux
  dont l'histoire se mesure. Les dates incertaines portent « vers » : Jayavarman VII (vers 1122-vers 1218, Wikipédia hésite entre 1122 et 1128 pour la naissance) et Suryavarman II (vers 1094-vers 1150), Hồ Xuân Hương
  (vers 1772-vers 1822).
- **Des dates différentes selon les sources.** Fa Ngum : naissance en 1316 d'après toutes les sources, mort en 1374 selon l'article français, en 1393 selon Wikidata (le texte suit Wikipédia en français).
  Phetsarath est né en 1890 pour Wikidata, en 1891 pour l'article de son frère Souvanna Phouma (le texte suit Wikidata).
- **Introuvables sous leur nom dans l'index des articles français** (titres exacts testés avec Wikidata) : Nguyễn Trãi, Bùi Xuân Phái, Nguyễn Đình Chiểu, Nam Cao, Tôn Thất Tùng, Nhất Linh, Tố Hữu, Nguyễn Tuân,
  Tản Đà, Lê Hoàn, Đinh Tiên Hoàng, Chuon Nath, Maha Sila Viravong, Nhouy Abhay : ils n'ont pas été examinés plus avant (un article peut exister sous un autre titre). Khieu Samphan et Pung Chhiv Kek sont vivants.
  Lý Thái Tổ a un article, mais sa seule image est sous GFDL seule.
- **Écartés faute d'image libre convenable** : Ros Serey Sothea, Ang Duong (« No restrictions », sans licence reconnue), Souphanouvong et Kaysone Phomvihane (« Attribution » seule, photographies des archives
  roumaines), Anouvong (une entrée de stade de 229 pixels), Trịnh Công Sơn (le seul fichier est une photographie de la chanteuse Hà Thanh Lịch ; celui qui le montre est une statue éloignée), Lê Phổ (le peintre
  n'apparaît que minuscule dans une rue), Sisowath Monireth, Tự Đức, Nguyễn Thái Học, Phạm Văn Đồng et Hoàng Hoa Thám (écartés pour équilibrer le Vietnam, l'image existe).
- **Des portraits souvent indirects**, et les légendes le disent : des statues (Lê Thánh Tông, Trần Hưng Đạo, Nguyễn Du, Jayavarman VII, Fa Ngum, Setthathirath, Đặng Thùy Trâm), un bas-relief (Suryavarman II),
  une illustration de 1916 (Hồ Xuân Hương, `nomVisible` : le nom est imprimé en haut de l'image), un timbre (Sisavang Vong), une affiche (Ngô Đình Diệm, recadrée), une photographie de 1960 (Vang Pao, à droite,
  avec un conseiller américain). Six sont recadrés : Diệm, Trần Hưng Đạo, Setthathirath, Bảo Đại, Đặng Thùy Trâm et Vang Pao.
- **Le « Đ » du classement.** La galerie range les figures par initiale ; « Đ » (Đặng, Đại) ne se décompose pas en « D » + accent comme « É » : `galleryNormalize` le replie sur « D » à la main, comme
  « Ø » sur « O », et un test le vérifie. Le classement des trois pays garde l'ordre d'écriture (le nom de famille d'abord : Hô Chi Minh, Norodom Sihanouk), voir `KEEP_AS_WRITTEN`.
- **Statut américain des images : à relire.** Vingt-six portraits sont du « domaine public », dont beaucoup de photographies officielles ou anciennes que Commons étiquette « US ? » (Hô Chi Minh, Ngô Đình Diệm, Văn Cao,
  Nguyễn An Ninh) ; la décision prise pour l'Indonésie vaut ici (images d'origine gouvernementale ou d'avant 1946). La photographie de Thích Quảng Đức s'immolant (AP, 1963) a été écartée comme portrait :
  elle montre une mort, non un visage.
- **Un téléchargement contraint.** Wikimedia refusait (429) la plupart des miniatures : les portraits ont été téléchargés par `Special:FilePath`, avec la licence, l'auteur et la date lus sur la page de chaque fichier.

- **Géolocalisation** : aucune figure n'est placée sur l'Atlas, faute de biographie liée. Les listes de candidats sont dans `scripts/pantheon/indochine_candidats.md`.

### Un bloc : la Thaïlande et la Birmanie

`pan_thai`, « Grandes figures de Thaïlande et de Birmanie » (code `thai`, bloc ; rangé sous « Thaïlande et Birmanie », entre le sous-continent indien et la Turquie) : **38 personnages de deux pays** —
Thaïlande 22, Birmanie 16 — d'Anawrahta (1014) à Thawan Duchanee (1939). Par axe : 24 Chefs d'État et dirigeants, 8 Littérature et pensée, 4 Guerres et résistances,
1 Beaux-arts, 1 Musique, spectacle et sport (l'axe des Sciences est absent) ; 5 ⭐ — Naresuan, Rama V, Rama IX, Bayinnaung et Aung San — et aucune biographie liée. 38 portraits : 26 du domaine public, 3 CC0,
5 CC BY-SA 3.0, 1 CC BY-SA 3.0 NL, 2 CC BY-SA 4.0 et 1 CC BY 2.0. Onze figures sont nées avant 1800, dix entre 1800 et 1899, dix-sept depuis 1900. Les mots-clés portent les deux pays et leurs adjectifs, le Siam,
Bangkok, Ayutthaya, Sukhothaï, la dynastie Chakri, Rangoun, Mandalay, Pagan, les Konbaung, les Thakins, le bouddhisme theravada et le luk thung.

- **Pourquoi ces deux pays ensemble.** Le Siam et la Birmanie ont partagé une même tradition bouddhiste theravada et une rivalité de cinq siècles (le sac d'Ayutthaya par Bayinnaung, Naresuan qui libère le Siam, Taksin) :
  les rois des deux royaumes se répondent. Le bloc se range par « Thaïlande et Birmanie ». `partMaxPays` est déclaré à 0,6 : la Thaïlande pèse 22 figures sur 38, soit 58 %.
- **Un thème de rois et de politiciens.** Vingt-quatre figures sur 38 sont des souverains ou des chefs de gouvernement ; la culture est maigre (un peintre, un chanteur, des moines et des écrivains), parce que les écrivains
  et les artistes thaïlandais et birmans n'ont pour la plupart pas d'article en français ou pas de portrait libre exploitable. Le thème est tenu par le règne de Rama V (Chulalongkorn, modernisateur du Siam)
  et par la génération de l'indépendance birmane (Aung San, U Nu, Ne Win, U Thant).
- **Les rois thaïlandais portent leur nom dynastique** — Rama IV (Mongkut), Rama V (Chulalongkorn), Rama IX (Bhumibol Adulyadej) — comme leur article en français ; le texte donne le nom d'usage. Le classement les range
  sous « Rama ». Les Thaïlandais se rangent par leur prénom (le nom de famille date de 1913), les Birmans n'en ont pas : `KEEP_AS_WRITTEN`.
- **Dates incertaines.** Rama Khamhaeng (vers 1239-vers 1298) : les sources hésitent sur sa naissance (1237, 1239, 1279 pour Wikidata) ; Kulap Saipradit est né en 1905 d'après l'article français et en 1906 pour
  Wikidata (le texte suit l'article).
- **Examinés et laissés de côté.** Aung San Suu Kyi, Min Aung Hlaing et les autres vivants sont dehors ; Silpa Bhirasri (sculpteur italo-thaïlandais, « père de l'art moderne thaïlandais ») n'a qu'une image
  sous licence « FAL », que le projet n'accepte pas ; Pumpuang Duangjan (« reine du luk thung ») n'a qu'une photographie de 199 pixels, rendue en dessin ; Sunthorn Phu n'a qu'une statue de cire ; Ba U n'a qu'une
  image de 199 × 228 pixels. Mitr Chaibancha, Pone Kingpetch (premier champion du monde thaïlandais de boxe), Luang Wichitwathakan, Seni Pramoj, Ekathotsarot, Prasat Thong, Win Tin, Supayalat, Sirikit (morte en 2025)
  et plusieurs Premiers ministres thaïlandais ou chefs de junte birmans (Thanom, Kriangsak, Chatichai, Saw Maung, San Yu…) ont des images utilisables mais n'ont pas été retenus pour ne pas alourdir
  un thème déjà très politique ; ils peuvent entrer plus tard. Les écrivains et artistes birmans, et la plupart des artistes thaïlandais, n'ont pas d'article en français (par exemple Ma Ma Lay).
- **Des portraits souvent indirects**, et les légendes le disent : statues (Rama Khamhaeng, Naresuan, Thao Suranari, Anawrahta, Bayinnaung, Alaungpaya, Bodawpaya, Maha Bandula), une gravure française du XVIIIe siècle
  (Narai), des peintures (Taksin, Rama Ier) et une photographie de John Thomson pour Rama IV. Quatre sont recadrés : Rama Ier, Thao Suranari, Suraphol et Mahasi Sayadaw.
- **Statut américain des images : à relire.** Vingt-six portraits sont du « domaine public », la plupart des photographies de cour ou d'agence anciennes ; même décision que pour l'Indonésie.
- **Géolocalisation** : aucune figure n'est placée sur l'Atlas, faute de biographie liée. Les listes de candidats sont dans `scripts/pantheon/thai_candidats.md`.

### Un pays à part : la Mongolie

`pan_mn`, « Grandes figures de Mongolie » (code `mn`, pays ; rangé sous « Mongolie », entre le monde malais et la Nouvelle-Zélande) : **26 personnages**, de Gengis Khan (vers 1162) à Rinchen Barsbold (1935). Par axe :
17 Chefs d'État et dirigeants, 4 Guerres et résistances, 3 Littérature et pensée, 1 Beaux-arts, 1 Sciences, techniques et innovation (l'axe Musique, spectacle et sport est absent) ; 4 ⭐ — Gengis Khan, Bogdo Khan,
Damdin Sükhbaatar et Sanjaasürengiin Zorig — et **deux biographies liées** (Gengis Khan, Subötaï). 26 portraits : 18 du domaine public, 2 CC0, 2 CC BY-SA 3.0, 2 CC BY-SA 4.0, 1 CC BY 3.0 et 1 CC BY 4.0. Dix figures
sont nées avant 1800, huit entre 1800 et 1899, huit depuis 1900. Les mots-clés portent le pays et ses adjectifs, Oulan-Bator, Ourga, Karakorum, le Gobi, les Khalkhas, le naadam, l'Empire mongol, le khagan, le Khoural, la
Mongolie autonome, la révolution de 1921 et celle de 1990, l'Histoire secrète des Mongols et le bouddhisme tibétain.

- **Un pays, pas un bloc.** `pan_mn`, aucun champ `pays` — pas d'invité — et « Pendant ce temps, ailleurs… » le compte comme `thm_mn`, l'« Histoire de la Mongolie ». Il se tient avec les « Histoire de l'Empire mongol » (`thm_mgl`),
  qui couvrent l'empire et ses quatre khanats.
- **Une liste courte, de l'empire à la démocratie.** Dix figures seulement sont d'avant 1800 : les autres sont les chefs de la Mongolie du XXe siècle (Bogdo Khan, les révolutionnaires de 1921, les
  dirigeants de la République populaire, ceux de 1990). Les écrivains, artistes et savants mongols modernes sont rares en français (aucun peintre n'a à la fois un article et un portrait, aucun musicien non plus).
- **Qui est dans le thème, qui est ailleurs.** Kubilai Khan est au panthéon de la Chine (« celui qui l'honore le plus » : fondateur de la dynastie Yuan) ; Tamerlan est à l'Asie centrale ; Hülegü, Ghazan et Batu relèvent de
  l'Iran et de la Russie (ils n'ont pas été examinés). Gengis Khan et Subötaï, qui ont chacun leur biographie, sont ici reliés à elle : « une même personne, une même date » (1162 et 1176), et le point de naissance de Gengis Khan
  (Khentii) est repris de sa biographie dans `assets/geo/events-geo.json` : le test des faits liés exige que les deux fiches soient localisées ensemble ou pas du tout.
- **Dates incertaines.** Gengis Khan : vers 1162, l'article français hésite avec 1155 ; Ögedeï, Subötaï, Hö'elün, Khutulun et Mandukhaï Khatun portent « vers ». Sühbaataryn Yanjmaa est née en 1893 d'après l'article français et en
  1894 selon Wikidata (le texte suit l'article).
- **Écartés faute d'image convenable** : Altan Khan (150 pixels), Dayan Khan (aucune image libre), Tolui, Djötchi (dates incertaines), Muqali (une statue), Töregene (une pièce de monnaie), Börte, Djebé, Norovbanzad,
  Byambasuren Sharav, Gonchigiyn Bumatsende, Khatanbaatar Magsarjav (naissance 1877 ou 1878, article vide). Le portrait de Tsedenbal vient des archives fédérales allemandes (1963). Les sportifs (lutteurs, judokas) ne
  sont pas retenus : aucun n'a marqué l'histoire du pays au sens du projet.
- **Des portraits souvent indirects**, et les légendes le disent : des miniatures persanes et des portraits de l'album des empereurs Yuan pour l'époque mongole, un dessin (Subötaï), une stèle (Mandukhaï Khatun), trois statues
  (Sambuu, Zorig, Rinchen), une peinture bouddhique (Zanabazar) et un tableau de Marzan Sharav (Bogdo Khan). Deux sont recadrés : Sambuu et Zorig (leur statue).
- **Les noms mongols** n'ont pas de nom de famille d'usage : « Damdin Sükhbaatar » est le patronyme suivi du nom propre. Ils se rangent donc tels qu'on les écrit (`KEEP_AS_WRITTEN`).
- **Statut américain des images : à relire.** Dix-huit portraits sont du « domaine public », dont des photographies de cour ou d'agence que Commons étiquette « US ? » ; même décision que pour les autres thèmes asiatiques.
- **Les listes de candidats** sont dans `scripts/pantheon/mn_candidats.md`.

### Un bloc : la Corée (Corée du Sud et Corée du Nord)

`pan_coree`, « Grandes figures de Corée » (code `coree`, bloc ; rangé sous « Corée », entre la Chine et l'Égypte) : **47 personnages de deux pays** — Corée du Sud 41, Corée du Nord 6 — de Gwanggaeto le Grand (374) à Kim Jong-il (1941).
Par axe : 14 Chefs d'État et dirigeants, 12 Littérature et pensée, 10 Guerres et résistances, 8 Beaux-arts, 2 Musique, spectacle et sport, 1 Sciences, techniques et innovation ; 9 ⭐ — Sejong le Grand, Yi Sun-sin,
An Jung-geun, Yu Gwan-sun, Yun Dong-ju, Syngman Rhee, Park Chung-hee, Kim Dae-jung et Kim Il-sung — et aucune biographie liée. 47 portraits : 39 du domaine public, 1 CC0, 2 CC BY-SA 3.0, 1 CC BY-SA 2.0, 1 CC BY-SA 2.0 KR,
1 CC BY-SA 4.0 et 2 CC BY 4.0. Dix-huit figures sont nées avant 1800, douze entre 1800 et 1899, dix-sept depuis 1900. Les mots-clés portent les deux Corées et leurs adjectifs, Séoul, Pyongyang, les dynasties (Joseon, Goryeo,
Silla, Goguryeo, Baekje), le hangeul, la guerre d'Imjin, la guerre de Corée, le 38e parallèle, le Juche, le Donghak, le Silhak, le mouvement du 1er mars et le gouvernement provisoire.

- **Un bloc, parce que la Corée est une.** Jusqu'en 1945, Joseon et ses royaumes précédents n'ont qu'une histoire : Sejong, Yi Sun-sin ou An Jung-geun appartiennent aux deux États. Le bloc les traite comme les blocs des
  autres pays divisés et attribue à chaque figure le pays qui l'honore le plus. **Les figures d'avant 1945 sont rangées en Corée du Sud**, sauf celles dont toute la carrière se joue au Nord : Kim Il-sung, Kim Jong-il, Kim Jong-suk,
  Kim Chaek, Pak Hon-yong et Kim Won-bong, rangés en Corée du Nord. Un choix éditorial discutable, qui pèse sur Gwanggaeto (dont la capitale a été Pyongyang) et les Trois Royaumes. La source déclare `partMaxPays` à 0,9 : la
  Corée du Nord pèse 13 % du bloc (6 figures sur 47).
- **Une Corée du Nord mince.** Peu de figures nord-coréennes ont à la fois un article français et une image libre ; les trois dirigeants de la dynastie Kim (Kim Il-sung, Kim Jong-il, Kim Jong-suk) y sont comme figures de
  l'histoire, non comme des modèles : le panthéon d'une série de jeu retient ceux dont l'histoire se mesure. Cho Man-sik (le « Gandhi coréen », mort probablement en 1950 à Pyongyang) a une image mais n'a pas été retenu : la date de sa mort est incertaine.
- **Les noms.** Le nom de famille vient en premier en coréen (Park Chung-hee, Kim Il-sung) : le classement les range tels qu'écrits (`KEEP_AS_WRITTEN`), sauf Syngman Rhee et Nam June Paik, dont le nom est écrit à l'occidentale.
  Kim Jong-il est né en 1941 pour Wikidata (officiellement en 1942) ; Heo Jun en 1537 pour l'article français (1546 pour Wikidata) ; Kim Hong-do est mort « vers 1806 » ; Kim Won-bong est daté « vers 1898-vers 1958 » ;
  Gwanggaeto (374-413) et Wonhyo (617-686) suivent leur article français.
- **Écartés faute d'image libre convenable** : Roh Moo-hyun (le seul portrait libre fait 155 pixels ; l'image officielle est sous licence KOGL, que le projet n'accepte pas), Isang Yun (une tombe), Yi Sang (150 pixels), Lee Jong-wook (licence « Attribution » seule), Jang Bogo, Gang Gam-chan, Seo Hui et Heo Nanseolheon (l'image de Wikidata est une photographie générique du sanctuaire de Tongiljeon),
  Yeonsangun et Gwanghaegun n'ont pas été examinés plus avant. Les portraits officiels de Kim Dae-jung et de Kim Young-sam sont sous KOGL ; on les remplace par une photographie de 2001 (201 × 279 pixels, CC BY 3.0) et une photographie du DoD de 1996.
- **Des portraits souvent indirects**, et les légendes le disent : des illustrations pour les rois antiques (Gwanggaeto, Munmu, Jeongjo), des peintures de cour (Taejo, Yeongjo, Heo Jun, Choe Je-u), des statues (Yi I, Yi Hwang,
  Sin Saimdang), un portrait gravé (Yi Sun-sin, sanctuaire de Chungminsa, publié en 1929) et, pour Kim Hong-do et Jeong Seon, l'une de leurs peintures plutôt que leur visage. Deux sont recadrés : Taejo (le haut du buste) et
  Jeon Bong-jun (porté en palanquin, sur une photographie de groupe).
- **Un portrait royal de remplacement.** L'image de Wikidata pour Taejo (`King Taejo Yi 02.jpg`, copie de 1872) a perdu son visage ; le thème utilise `King Taejo Yi 01.jpg`, le portrait conservé à Jeonju.
- **Statut américain des images : à relire.** Trente-neuf portraits sont du « domaine public », beaucoup de photographies officielles ou anciennes que Commons étiquette « US ? » ; même décision que pour les autres thèmes asiatiques.
- **Les listes de candidats** sont dans `scripts/pantheon/coree_candidats.md`.

### Un pays à part : la Pologne

`pan_pl`, « Grandes figures de Pologne » (code `pl`, pays ; rangé sous « Pologne », entre les Philippines et le Portugal) : **108 personnages**, de Mieszko Ier (vers 935) à Jerzy Kukuczka (1948). Par axe :
28 Littérature et pensée, 19 Musique, spectacle et sport, 18 Guerres et résistances, 17 Chefs d'État et dirigeants, 16 Sciences, techniques et innovation, 10 Beaux-arts ; 18 ⭐ — Mieszko Ier, Casimir III le Grand,
Jean III Sobieski, Józef Piłsudski, Jean-Paul II, Tadeusz Kościuszko, Maximilien Kolbe, Witold Pilecki, Jan Kochanowski, Adam Mickiewicz, Henryk Sienkiewicz, Czesław Miłosz, Wisława Szymborska, Jan Matejko, Frédéric Chopin,
Andrzej Wajda, Nicolas Copernic et Marian Rejewski — et **aucune biographie liée**. 108 portraits : 86 du domaine public, 2 CC0, 11 CC BY-SA, 6 CC BY et **3 images non libres** (voir plus bas). Cinq figures sont nées avant 1500, vingt et une de 1500 à 1799,
quatre-vingt-deux depuis 1800. Les mots-clés portent le pays et ses adjectifs, ses grandes villes (Varsovie, Cracovie, Gdańsk, Poznań, Wrocław), la Silésie, la Poméranie, la Galicie, les Piast et les Jagellon, l'union de Lublin,
la République des Deux Nations, les partages, les insurrections de 1830, 1863 et 1944, l'Armia Krajowa, Solidarność, Katyń, le ghetto de Varsovie, Grunwald, la loi martiale et la Table ronde.

- **Un pays, pas un bloc.** `pan_pl`, aucun champ `pays` — pas d'invité — et « Pendant ce temps, ailleurs… » le compte comme `thm_pl`, l'« Histoire de la Pologne ». Un test le vérifie (`tests/simultaneity.test.js`).
- **Le pays qui honore, pas l'état civil.** Mickiewicz (né près de Nowogródek), Miłosz (né en Lituanie), Piłsudski (né près de Vilnius), Kościuszko (né dans l'actuelle Biélorussie), Moniuszko, Emilia Plater, Zamenhof (Białystok),
  Lem et Herbert (Lwów) ou Kapuściński (Pińsk) sont ici, la fiche disant le lieu : ce sont les Polonais qui les honorent d'abord. **Marie Curie reste au panthéon de la France**, qui l'avait déjà ;
  Joseph Conrad (Berdytchiv) est écarté pour le Royaume-Uni, Rosa Luxemburg et Édith Stein pour l'Allemagne, Isaac Bashevis Singer pour les États-Unis. Bronisław Malinowski, Józef Rotblat, Stanisław Ulam, Benoît Mandelbrot et Tamara
  de Lempicka, que ni la Grande-Bretagne, ni les États-Unis, ni la France n'ont à leur panthéon, sont laissés de côté : les pays où ils ont travaillé les honorent davantage.
- **Les vivants restent dehors** : Lech Wałęsa (il a sa biographie), Roman Polański, Robert Lewandowski, Olga Tokarczuk, Andrzej Sapkowski.
- **Dates incertaines.** Hedwige d'Anjou (1370 à 1374 selon les sources), Ladislas II Jagellon (1351 pour l'article français, 1362 pour Wikidata), Zawisza Czarny (naissance inconnue) et Marek Edelman (1919 ou 1922) sont écartés ;
  Mieszko Ier (« vers 935 »), Boym (« vers 1612 », Wikidata dit aussi 1614) et Chełmoński (1849, Wikidata hésite entre 1847 et 1850) portent la date de l'article français. Szymanowski est né en 1882 (Wikidata dit aussi 1883).
- **Une exception assumée : trois images non libres.** Bruno Schulz, Lech Kaczyński et Krzysztof Komeda n'avaient aucune image acceptée par le script : toutes les images de Schulz sont libres en Pologne mais « Not-PD-US-URAA »
  (donc protégées aux États-Unis) ; celle de Kaczyński, la photographie officielle de la Chancellerie (2006), n'est publiée que sous GFDL 1.2 ; celle de Komeda, un portrait à l'encre de Zbigniew Kresowaty, que sous la licence
  « Attribution ». Ils ont chacun la meilleure image disponible, téléchargée depuis Commons, et leur licence s'écrit « Image non libre » dans les données (`image.licence`) ; `image.source` renvoie à la page du fichier,
  `fetch_portraits.py` les ignore et le test de schéma accepte cette exception. Ces droits ne sont pas ceux de l'App Store : **à remplacer dès qu'une image libre existe, ou à faire valider.**
- **Écartés faute d'image convenable** : Tadeusz Sendzimir (la seule image libre est une fresque murale qui porte son nom, que « Qui est-ce ? » montrerait). Pulaski, Anders, Landowska, Lutosławski, Hirszfeld, Kieślowski, Tarski et Mazowiecki ont d'abord été refusés
  (images de 220 à 300 pixels, ou GFDL seule), puis remplacés après une recherche sur Commons : une gravure de Lossing pour Pulaski, une photographie de 1946 pour Lutosławski, la photographie des Archives numériques nationales pour
  Hirszfeld, un cliché de George Bergman (1968) pour Tarski, une photographie de 2013 pour Mazowiecki. Kieślowski (288 pixels de large) et Anders (299) sont agrandis de 7 à 11 %.
- **Des portraits souvent indirects**, et les légendes le disent : trois portraits imaginaires de Jan Matejko pour les premiers Piast (Mieszko, Boleslas, Casimir III), des portraits de Bacciarelli pour les derniers rois, cinq
  autoportraits (Matejko, Chełmoński, Malczewski, Boznańska, Witkacy) et deux gravures (Boym, Pulaski). Dix sont recadrés (Matejko, Siemiradzki, Boznańska, Landowska, Niemen, Hevelius, Boym, Czochralski, Kołakowski, Orzeszkowa) : le
  visage était petit dans une image en pied.
- **Les noms.** Les souverains se rangent par leur prénom (« Jean III Sobieski », « Stanislas II Auguste Poniatowski »), comme Louis XIV ; les autres par leur nom de famille. Les prénoms français de l'usage (Frédéric Chopin, Nicolas
  Copernic, Maximilien Kolbe, Jean-Paul II) l'emportent sur l'orthographe polonaise. **Une lettre de plus à la galerie** : « Ł » (Łukasiewicz) ne se décompose pas en « L » et un accent, comme « Đ » ; `galleryNormalize` la replie
  désormais sur « L », faute de quoi Łukasiewicz se rangeait sous « # » ; la recherche de thèmes (`normalizeSearchText`) fait de même, pour qu'on trouve « Wrocław » en tapant « wroclaw ».
- **Statut américain des images : à relire.** Quatre-vingt-six portraits sont du « domaine public » (et trois sont non libres), dont beaucoup de photographies polonaises (modèle « PD-Poland » / « PD-1996 ») que Commons étiquette « US ? » ; même décision que pour
  les autres thèmes : le script lit la licence déclarée, non le statut américain.
- **Les listes de candidats** sont dans `scripts/pantheon/pl_candidats.md`.

### Un pays à part : l'Ukraine, et la Biélorussie invitée de la Russie

`pan_ua`, « Grandes figures d'Ukraine » (code `ua`, pays ; rangé sous « Ukraine », après la Turquie) : **108 personnages**, d'Olga de Kiev (vers 890) à Ivan Mykolaïtchouk et Bohdan Stoupka (1941). Par axe :
31 Littérature et pensée, 23 Chefs d'État et dirigeants, 16 Musique, spectacle et sport, 14 Beaux-arts, 14 Guerres et résistances, 10 Sciences, techniques et innovation ; 16 ⭐ — Vladimir Ier, Iaroslav le Sage, Bogdan
Khmelnitski, Ivan Mazepa, Symon Petlioura, Mykhaïlo Hrouchevsky, Leonid Kravtchouk, Taras Chevtchenko, Ivan Franko, Lessia Oukraïnka, Vassyl Stous, Mykola Lyssenko, Maria Primatchenko, Aleksandr Dovjenko, Valeri
Lobanovski et Ilya Metchnikov — et **aucune biographie liée**. 108 portraits : 95 du domaine public, 1 CC0, 4 CC BY 4.0, 1 CC BY 3.0, 3 CC BY-SA 4.0, 2 CC BY-SA 3.0 et **2 images non libres** (voir plus bas). Sept figures sont nées avant 1500,
quinze de 1500 à 1799, quatre-vingt-six depuis 1800.

- **Un pays, pas un bloc.** `pan_ua`, aucun champ `pays` — pas d'invité — et « Pendant ce temps, ailleurs… » le compte comme `thm_ua`, l'« Histoire de l'Ukraine ». Un test le vérifie (`tests/simultaneity.test.js`).
- **Le pays qui honore, pas l'état civil — et ce qu'on a laissé en Russie.** Sont restés au panthéon de la Russie, qui les avait déjà : Gogol, Boulgakov, Akhmatova, Trotski, Brejnev, Korolev, Prokofiev, Vernadski,
  Aïvazovski (né en Crimée), **Malevitch et Répine** (que l'Ukraine revendique : l'éditeur a décidé de les laisser en Russie). Sont ici des figures nées hors des frontières actuelles mais honorées en Ukraine : Amossov, Filatov (né à Saransk, installé à Odessa), Glouchkov (Rostov-sur-le-Don) et Kostomarov (près de Voronej).
- **La diaspora et les autres nationalités sont exclues** : Babel, Cholem Aleikhem, Joseph Roth, Paul Celan, Sacher-Masoch, Oïstrakh, Gilels, Horowitz, Stern, Milstein, Nijinski, Lifar, Richter, Glière, Sonia Delaunay,
  Gamow, Timoshenko, Zworykin, Waksman, Dahl, mais aussi Archipenko, Bourliouk, Kvitka Cisyk et Sikorsky : ils relèvent d'Israël, des États-Unis, de la France, de la Pologne, de l'Autriche ou de la Russie, ou n'ont de
  l'Ukraine que la naissance.
- **Les figures controversées sont écrites comme telles** : Bandera est ici pour sa place dans l'histoire nationale, avec l'OUN, la prison allemande et son assassinat par le KGB ; sa mémoire est disputée, et la fiche le dit ;
  et la fiche de Choukhevytch dit qu'il a servi dans une unité liée à la Wehrmacht en 1941 et que sa mémoire est disputée ; celle de Petlioura dit qu'il a été tenu pour responsable des pogroms ; celle de Makhno que ses troupes
  ont combattu les Blancs et les Rouges. Les vivants restent dehors (Moustafa Djemilev) et les figures sans date de décès (Larissa Latynina, Volodymyr Ivassiouk) aussi.
- **Écartés** : Dmytro Vychnevetsky (naissance inconnue), Ivan Sirko, Andriy Melnyk, Mykola Kapustianski, Iouri Tioutiounnyk, Ihor Kostetsky, Les Taniouk, Volodymyr Svidzinsky, Mykola Kondratenko, Hryhoriy Pysarenko, Mykhailo Ostrohradsky,
  Mykola Bernstein, Oleksandr Smakula, Oleg Antonov et Anatol Petrytsky : pas d'article français, de portrait libre ou de date de naissance.
- **Deux images non libres, exception assumée** : Viatcheslav Tchornovil (photographie de la Rada suprême d'Ukraine, 1998, licence « Attribution » seule) et Volodymyr Sossioura (photographie de 1956, GFDL seule) n'avaient aucune
  image acceptée par le script ; leur licence s'écrit « Image non libre » dans les données (`image.licence`), `image.source` renvoie à la page du fichier. **À remplacer dès qu'une image libre existe, ou à faire valider.**
- **Des portraits souvent indirects**, et les légendes le disent : les princes de Kiev (Sviatoslav, Vladimir, Iaroslav, Vladimir Monomaque) sont des portraits imaginaires du Livre des titres du tsar (1672), Daniel de Galicie une
  miniature de la Chronique enluminée (recadrée) ; Grigorenko, Bagriany et Primatchenko ne sont connus que par l'effigie d'une pièce commémorative de la Banque nationale d'Ukraine, Berezovsky par une médaille, Symonenko par un
  timbre, Mykolaïtchouk par un buste ; **Iaroslav le Sage n'a plus la pièce** mais le portrait de 1672. L'image de Chtcherbytskiï est floue et petite : à remplacer.
- **Dates incertaines.** Olga (vers 890), Sviatoslav (vers 942), Vladimir (vers 958), Iaroslav (vers 978), Khmelnitski (vers 1595), Sahaïdatchnyi (vers 1570, Wikidata dit 1582), Gonta (vers 1740, Wikidata dit 1721), Bohun,
  Vyhovsky et Ostrogski portent la date de l'article français.
- **Les noms.** Les noms suivent le titre de l'article français (« Bogdan Khmelnitski », « Taras Chevtchenko ») ; Pierre Movilă s'écrit « Petro Mohyla », et l'article de Kondratiouk est sous son état civil, Alexandre Chargueï.

La Biélorussie est **invitée du panthéon de la Russie**, comme Monaco l'est de celui de la France : **20 figures** portent `pays: "BY"` dans `scripts/pantheon/ru.json`, et la fiche dit leur pays. D'Euphrosyne de Polotsk (vers 1104) à
Jaurès Alferov (1930) : 10 Littérature et pensée (Euphrosyne de Polotsk, Francysk Skaryna, Szymon Budny, Koupala, Kolas, Bahdanovitch, Héniouch, Karatkievitch, Bykov, Vygotski), 5 Chefs d'État et dirigeants (Sapieha, Macherov,
Chouchkievitch, Gromyko, Dzerjinski), 2 Sciences (Soukhoï, Alferov), 1 Beaux-arts (Napoleon Orda), 1 Guerres et résistances (Kalinowski), 1 Musique (Mouliavine) ; 1 ⭐ (Skaryna). 20 portraits : 15 du domaine public, 2 CC BY 4.0, 1 CC BY-SA 4.0,
1 CC BY-SA 3.0 et 1 CC BY-SA 3.0 NL. Tadeusz Kościuszko et Stanisław Moniuszko, nés en Biélorussie, restent au panthéon de la Pologne ; Marc Chagall et Chaïm Soutine à celui de la France, Simon Kuznets à celui des États-Unis.
Napoleon Orda, Lew Sapieha et Szymon Budny, nés dans le grand-duché de Lituanie, sont invités de la Russie faute de panthéon biélorusse. Ivan Khroutski, Dvartchanine, Savitsky et Louchenok n'ont pas d'article français.
Les listes de candidats sont dans `scripts/pantheon/ua_candidats.md`.

### Un pays à part : l'Irlande

`pan_ie`, « Grandes figures d'Irlande » (code `ie`, pays ; rangé sous « Irlande », entre l'Iran et Israël) : **107 personnages**, de Patrick d'Irlande (vers 385) à Dolores O'Riordan (1971). Par axe : 40 Littérature et pensée,
18 Chefs d'État et dirigeants, 18 Guerres et résistances, 14 Musique, spectacle et sport, 12 Sciences, techniques et innovation, 5 Beaux-arts ; 20 ⭐ et **une biographie liée** (Ernest Shackleton, `bio_ernestshackleton`).
107 portraits : 78 du domaine public, 2 CC0, 19 CC BY ou CC BY-SA et **8 images non libres** (voir plus bas). Sept figures sont nées avant 1500, vingt-cinq de 1500 à 1799, quarante-six de 1800 à 1899, vingt-neuf depuis 1900.
Les mots-clés portent l'Irlande et ses provinces (Ulster, Munster, Leinster, Connacht), Dublin, Cork, Galway, Belfast et Derry, la Grande Famine, le Home Rule, la Ligue agraire, Pâques 1916, le Sinn Féin, l'IRA, l'État libre
d'Irlande, le Dáil, le Taoiseach, le Fianna Fáil et le Fine Gael, l'Abbey Theatre, le Celtic Revival, les Oies sauvages, les Irlandais unis, l'accord du Vendredi saint et saint Patrick.

- **Le pays qui honore, pas l'état civil.** L'Irlande a le panthéon que le Royaume-Uni lui avait laissé (« Wilde, Swift, Shackleton… ») : les figures nées sur l'île et honorées par la République y sont, y compris celles de l'Irlande du
  Nord que l'Irlande revendique (Seamus Heaney, Brian Friel, Flann O'Brien, John Hume, Bobby Sands). Les figures nées ailleurs et honorées en Irlande aussi : de Valera (New York), Seán MacBride (Paris), James Connolly (Édimbourg),
  Constance Markievicz et Erskine Childers (Londres), Maud Gonne et Shane MacGowan (Angleterre), Mary Lavin (Massachusetts), Phil Lynott (West Bromwich), Maria Edgeworth (Angleterre).
- **Ce qui reste au Royaume-Uni** : Wellington (né à Dublin), Lord Kelvin (Belfast), et les Nord-Irlandais que le Royaume-Uni honore d'abord — George Best, Alex Higgins, Joey Dunlop, David Trimble, Louis MacNeice. **Francis Bacon** (peintre britannique né
  à Dublin), Francis Beaufort, Edward Sabine, Kathleen Lonsdale, Laurence Sterne et James Barry, que l'article français dit « britanniques », n'ont pas été retenus.
- **Deux saints partagés** : Colomban de Luxeuil (honoré aussi en France et en Italie) est ici, parce qu'aucun autre panthéon ne l'a ; Patrick d'Irlande (« vers 385 », date incertaine d'un personnage semi-légendaire) y entre comme saint patron de l'île.
- **Dates retenues** : Patrick (vers 385), Jean Scot Érigène (vers 800), Brian Boru (vers 941), Grace O'Malley (vers 1530), Hugh O'Neill (vers 1550), Owen Roe O'Neill (vers 1590), suivant l'article français ; Oliver Plunkett naît en 1629 (non 1625),
  Máirtín Ó Cadhain en 1905 (l'article hésite avec 1906), Arthur Griffith en 1871 (l'article dit aussi 1872). Les dates viennent de l'article français, non recoupées une à une.
- **Deux figures controversées** : Charles Haughey (scandale des paiements secrets) et Bobby Sands (militant de l'IRA mort en grève de la faim) ; les fiches disent les faits.
- **Huit images non libres, exception acceptée par l'éditeur** (une règle désormais permanente : à défaut d'image libre, une image non libre est acceptée, signalée par `licence` « Image non libre » et par `source`, page du fichier sur
  Wikipédia en anglais) : Bobby Sands, Patrick Kavanagh (portrait peint par Patrick Swift), Flann O'Brien, John McGahern, Máirtín Ó Cadhain, Mary Lavin, Nicholas Callan et Luke Kelly. À remplacer dès qu'une image libre existe.
- **Des portraits souvent indirects** : peintures (Brigitte, Colomba, Hugh O'Neill, Sarsfield, Plunkett, Swift, Berkeley, Burke, Guinness, Nagle, Hamilton, Orpen et O'Conor en autoportrait, O'Carolan), gravures (Brian Boru, Owen Roe O'Neill, Goldsmith, Sheridan, Wolfe Tone,
  Grattan, Field, Patrick), enluminures et dessins de manuscrits (Diarmait Mac Murchada, Jean Scot Érigène), une peinture murale (Colomban), un vitrail (Hugh Roe O'Donnell), une miniature (Robert Emmet) et une statue (Grace O'Malley).
  **Trois images écrivent un nom** et sont marquées `nomVisible` : la xylographie de Patrick (« Patricius eps »), le négatif de Shaw et la dédicace de Shackleton. Quatre sont recadrées : Colomba, Brian Boru, Berkeley et Behan.
- **Écartés** : les figures sans article en français (Edmund Rice, William Dargan, William Thompson), celles sans portrait convenable (Louis le Brocquy, Paul Henry, Robert Graves) et les vivants (Roddy Doyle, Colm Tóibín, Mary Robinson, Van Morrison, Bono…).
- **Statut américain des images : à relire**, comme pour les blocs précédents. Les listes de candidats sont dans `scripts/pantheon/ie_candidats.md`.

### Deux pays à part : Malte et Chypre

Malte et Chypre n'ont pas de passé commun (Malte, l'ordre de Saint-Jean puis la couronne britannique ; Chypre, Byzance, les Lusignan, Venise, les Ottomans puis la couronne britannique) : seuls l'insularité, l'entrée dans l'Union européenne en 2004 et une histoire croisée par les croisades les rapprochent, ce qui ne suffit pas à faire un bloc. Chacun a donc **son panthéon**, rangé sous son nom : « Malte », entre « Maghreb » et « monde malais » ; « Chypre », entre « Chine » et « Corée ».

**`pan_mt`, « Grandes figures de Malte »** (code `mt`, pays) : **34 personnages**, de Pietru Caxaro (vers 1400) à Oliver Friggieri (1947). Par axe : 13 Chefs d'État et dirigeants, 11 Littérature et pensée, 4 Beaux-arts, 2 Guerres et résistances, 2 Musique, spectacle et sport, 2 Sciences, techniques et innovation ; 7 ⭐ (Jean de Valette, Mikiel Anton Vassalli, Dun Karm Psaila, Georges Preca, Temi Zammit, Giorgio Borg Olivier, Dom Mintoff) et aucune biographie liée.
34 portraits : 17 du domaine public ou CC0 et 17 CC BY ou CC BY-SA, aucune image non libre. Trois figures sont nées avant 1500, douze de 1500 à 1799, neuf de 1800 à 1899, dix depuis 1900.
Les mots-clés portent Malte et ses îles (Gozo, Comino), La Valette, Mdina, les Trois Cités, l'ordre de Malte et ses grands maîtres, le Grand Siège de 1565, l'arrivée de Bonaparte et l'insurrection de 1798, Caravage, la George Cross, l'indépendance, la République, les deux grands partis et l'Union européenne.

- **Les grands maîtres sont des invités de leur pays de naissance** : Jean de Valette et Philippe de Villiers de L'Isle-Adam, Alof de Wignacourt (France), António Manoel de Vilhena et Manoel Pinto da Fonseca (Portugal), Ferdinand von Hompesch (Saint-Empire, rangé sous l'Allemagne). Ils règnent sur Malte et la marquent (La Valette, le fort Manoel, l'université), et aucun autre panthéon ne les honore plus qu'elle ; la fiche dit leur pays.
- **Ce qui reste ailleurs** : Nicolò Isouard (né à Żebbuġ, mort à Paris) est ici, parce qu'il est né maltais et qu'aucun autre panthéon ne le compte ; Juan Bautista Azopardo (Senglea) est ici aussi, bien que l'Argentine l'honore comme l'un des fondateurs de sa marine. Gerald Strickland, né maltais, gouverneur en Australie et Premier ministre de Malte, y reste.
- **Écartés** : les figures sans portrait (Emmanuel Vitale, Saverio Cassar, Giacomo de Pellegrino, Giovanni Antonio Ciantar, Léonce Abela, Anastasio Cuschieri, Manuel Cauchi), celles dont l'article français est lacunaire ou incohérent (Ugo Mifsud Bonnici, dont la date de mort manque ; Francesco Buhagiar, dont les dates ne concordent pas ; Gian Francesco Buonamico), Charles Camilleri (sans image) et les vivants.
- **Des portraits indirects** : peintures (grands maîtres, Caruana, Pisani), gravures (Vilhena, Hompesch, Isouard), bustes et monuments (Gafà, Agius de Soldanis, Mizzi, Zammit, Vassalli, Dun Karm, Cremona, Preca), un manuscrit (le « Cantilena » de Caxaro, faute de portrait). **Quatre images écrivent un nom** et sont marquées `nomVisible` : Jean de Valette, Vilhena, Hompesch et Melchiorre Gafà. Les portraits de Barbara, Cremona, Dun Karm, Vassalli, Wignacourt et Zammit sont recadrés.
- **Des dates** : Girolamo Cassar est donné « vers 1520-vers 1590 » (l'article hésite entre 1586 et 1592) ; Jean de Valette naît en 1494 (non 1495) ; Temi Zammit en 1864, date de son buste (l'article donne aussi le 30 décembre 1863).

**`pan_cy`, « Grandes figures de Chypre »** (code `cy`, pays) : **22 personnages**, d'Épiphane de Salamine (vers 315) à Mários Tókas (1954). Par axe : 13 Chefs d'État et dirigeants, 4 Littérature et pensée, 3 Guerres et résistances, 2 Musique, spectacle et sport ; 2 ⭐ (Guy de Lusignan, Makarios III) et aucune biographie liée. Le panthéon n'a **que quatre axes** : faute d'article français (Adamantios Diamantis, Christoforos Savva) ou d'image convenable (Vassos Karagiorgis), les peintres et les savants chypriotes manquent.
22 portraits : 11 du domaine public ou CC0, 9 CC BY ou CC BY-SA et **2 images non libres** (Ezekias Papaioannou et Michael Cacoyannis ; voir plus bas). Sept figures sont nées avant 1500, une de 1500 à 1799, deux de 1800 à 1899, douze depuis 1900. C'est le plus petit panthéon, en deçà des 26 figures de la Mongolie : le catalogue de l'article français est mince.
Les mots-clés portent Chypre, ses villes (Nicosie, Famagouste, Larnaca, Limassol, Paphos, Kyrenia), Salamine et Kition, les Lusignan, Venise, les Ottomans, l'EOKA, l'enosis, la ligne verte, l'invasion turque de 1974, le plan Annan, la république turque de Chypre du Nord et l'Union européenne.

- **Les deux communautés** : Fazıl Küçük et Rauf Denktaş (chypriotes turcs) figurent aux côtés de Makarios III, de Grivas et de Clerides ; les fiches décrivent les faits sans prendre parti sur la partition (la « république turque de Chypre du Nord » n'est reconnue que par la Turquie).
- **Invités** : Guy de Lusignan (né en Poitou ; France), Catherine Cornaro et Marcantonio Bragadin (nés à Venise ; Italie). Zénon de Kition reste dans le panthéon de la Grèce, qui l'a déjà.
- **Écartés** : Évagoras Ier, Kyprianos, Hadjigeorgakis Kornesios, Evagoras Pallikarides, Vasilis Michaelides et d'autres, sans article français ; Étienne de Lusignan et Léonce Machairas, sans image ; Isaac Doukas Comnène et Jacques II, dont seule la monnaie est illustrée ; Nikos Sampson, sans image.
- **Dates** : Georgios Grivas naît en 1897 (l'article français dit 1898), Michael Cacoyannis en 1921 (1922 dans l'article), Néophyte le Reclus en 1134 (mort en 1219), Jean l'Aumônier vers 550 (naissance « dans la seconde moitié du VIe siècle » dans l'article).
- **Deux images non libres, exception acceptée par l'éditeur** (règle permanente) : Ezekias Papaioannou et Michael Cacoyannis, tirées de Wikipédia en anglais. À remplacer dès qu'une image libre existe.
- **Statut américain des images : à relire**, comme pour les blocs précédents. Les listes de candidats sont dans `scripts/pantheon/mt_candidats.md` et `scripts/pantheon/cy_candidats.md`.

### Un bloc : l'Europe centrale (Hongrie, Tchéquie, Slovaquie et Slovénie)

`pan_europecentrale`, « Grandes figures d'Europe centrale » (code `europecentrale`, bloc ; rangé sous « Europe centrale », entre les États-Unis et la France) : **123 personnages de quatre pays** — Hongrie 48, Tchéquie 42, Slovaquie 17,
Slovénie 16 — d'Árpád (vers 845) à Janez Drnovšek (1950). Par axe : 30 Littérature et pensée, 27 Chefs d'État et dirigeants, 26 Sciences, techniques et innovation, 15 Guerres et résistances, 15 Musique, spectacle et sport,
10 Beaux-arts ; 34 ⭐ et **une biographie liée** (Václav Havel). 123 portraits : 92 du domaine public, 2 CC0, 1 CC BY et 28 CC BY-SA. Douze figures sont nées avant 1500, seize de 1500 à 1799, quatre-vingt-quinze depuis 1800.
Les mots-clés portent les quatre pays et leurs adjectifs, Budapest, Prague, Bratislava, Presbourg, Ljubljana, Brno, la Bohême, la Moravie, la Transylvanie, la Carniole, les Habsbourg, l'Autriche-Hongrie et le Compromis de 1867,
Árpád, les Přemyslides, les hussites, la Grande-Moravie, les révolutions de 1848 et de 1956, le Printemps de Prague, la révolution de velours, la Charte 77, Munich, Trianon, la Yougoslavie et les Provinces illyriennes.

- **Un bloc de quatre, une Pologne à part.** La Pologne (105 figures) a son propre panthéon, et la Hongrie, la Tchéquie, la Slovaquie et la Slovénie, qui partagent l'histoire des Habsbourg puis, pour les trois premières, celle du
  XXe siècle communiste, forment ce bloc. Le choix de la Slovénie est celui du bloc des Balkans, qui l'avait laissée de côté (« elle relèverait plutôt d'un bloc d'Europe centrale »). **Ne sont pas ici** : l'Autriche et le Liechtenstein
  (panthéon de l'Allemagne, de l'Autriche et de la Suisse), la Croatie (Balkans), les pays baltes, l'Ukraine et la Biélorussie, qui attendent leur thème.
- **Un équilibre juste sous le seuil.** La Hongrie pèse 48 figures sur 123, soit 39 %, sous les 40 % du constructeur ; la Slovaquie et la Slovénie (14 et 13 %) tiennent par dix-sept et seize figures, et les quatre pays sont tous représentés
  parmi les ancres de « Pendant ce temps, ailleurs… » (un test le vérifie). Pour rester sous le seuil, plusieurs Hongrois ont été écartés après examen : Mór Jókai, Ferenc Erkel, Mihály Vörösmarty, Ányos Jedlik, Ödön Lechner, Zsigmond Móricz,
  Mihály Babits, Kálmán Kandó, Tivadar Puskás, George de Hevesy, Alfréd Hajós et Tivadar Csontváry Kosztka.
- **Le pays qui honore, pas l'état civil.** Les figures nées hors des frontières actuelles vont en Hongrie quand c'est elle qui les honore, et la fiche dit le lieu : Bartók (Nagyszentmiklós, aujourd'hui en Roumanie), Ligeti
  (Târnăveni), Bolyai (Cluj), Ady (Érmindszent), Madách et Márai (Slovaquie), Munkácsy (Moukatchevo, Ukraine), Kun (Transylvanie) et Liszt, né à Raiding, village de langue allemande aujourd'hui en Autriche. Wolfgang von Kempelen
  (Presbourg) et Jozef Maximilián Petzval (Spišská Belá), dont la carrière se fait à Vienne, sont rangés en Slovaquie. **La Tchécoslovaquie** se partage selon le pays qui honore : Masaryk et Havel en Tchéquie, Dubček et Štefánik en
  Slovaquie ; l'attentat contre Heydrich réunit Jan Kubiš (Tchéquie) et Jozef Gabčík (Slovaquie). Les germanophones de Bohême et de Moravie (Kafka, Freud, Mahler, Mendel, Gödel, Rilke, Suttner) restent dans le bloc Allemagne-Autriche-Suisse.
  Les Hongrois d'Amérique (John von Neumann, Leó Szilárd, Eugene Wigner, Edward Teller, Albert Szent-Györgyi, André Kertész, Robert Capa, Marcel Breuer, László Moholy-Nagy) sont ici : aucun autre panthéon ne les a, et la Hongrie les honore.
- **Les vivants restent dehors** : George Soros, Ernő Rubik, Katalin Karikó, Slavoj Žižek, Luka Dončić, Martina Navrátilová. Joseph Pulitzer, Arthur Koestler, Harry Houdini, Béla Lugosi, Michael Curtiz, Georg Solti, Theodore von Kármán et Dennis Gabor,
  honorés surtout aux États-Unis ou au Royaume-Uni, ne sont pas retenus ; Joseph Joachim (carrière allemande), Ernő Dohnányi et Karl Polanyi (né à Vienne) non plus.
- **Dates incertaines.** Árpád (« vers 845 »), Étienne Ier (« vers 975 » ; Wikidata dit aussi 969), Jean Hunyadi (« vers 1406 » ; 1407 pour Wikidata), Jan Žižka (« vers 1360 » ; 1376 pour Wikidata) et Jan Hus (« vers 1372 » ; 1369 à 1371
  pour Wikidata) suivent l'article français. Széchenyi (1791), Kossuth (1802), Petőfi (1823), Madách (1823), Munkácsy (1844), Němcová (1820) et Diviš (1698) portent la date de l'article ; Wikidata en donne une autre en plus.
- **Écartés faute d'image convenable** : Přemysl Ottokar II (la seule image est son sceau) et Svätopluk Ier (une statue de fontaine, des cartes), et trois noms que
  Wikipédia français ne trouve pas sous la graphie cherchée (János Irinyi, Ľudovít Fulla, Anton Martin Slomšek). Des images refusées ont été remplacées après une recherche sur Commons (qui a aussi permis de réintégrer Venceslas Ier, par une icône bohémienne du XIVe siècle, et Gustáv Husák, par une photographie de la Matica slovenská du 21 février 1969, CC BY-SA 4.0, recadrée sur le visage) : Václav Havel (294 pixels) par une photographie de
  Lenke Szilágyi, Karel Čapek (« Not-PD-US-URAA ») par une photographie d'avant 1938, János Kádár (licence « Attribution », photographie roumaine) par un cliché d'Anefo de 1962, John von Neumann (« Attribution ») par une photographie
  CC BY-SA 3.0, Karel Gott (« Copyrighted free use ») par une photographie de 2016, Klement Gottwald et Robert Capa (« Not-PD-US-URAA ») par des clichés de 1946 et de 1938 (Rijksmuseum, CC0), Paul Erdős (308 pixels) par une photographie de
  1992 recadrée sur le visage, et Jan Palach (une carte d'identité qui écrit son nom) par un buste de Vlasta Prachatická (1998, CC BY-SA 4.0).
- **Des portraits souvent indirects** : miniatures de la Chronique de Thuróczy (1488) pour Árpád, Béla IV et Louis Ier, un détail du tableau votif de Jan Očko de Vlašim pour Charles IV, des gravures (Poděbrady, Ressel, Škoda, Vega, Valvasor,
  Gallus, Trubar), un vitrail (Jánošík), un dessin au fusain (Kempelen) et plusieurs portraits peints (Rákóczi par Mányoki, Széchenyi par Amerling, Comenius par Ovens, Prešeren par Goldenstein). **Cinq images écrivent le nom** et sont
  marquées `nomVisible` : l'inscription gravée de Poděbrady, la légende du dessin de Žižka, le nom sur le vitrail de Jánošík, le cadre gravé de Gallus et l'inscription cyrillique de l'icône de Venceslas ; « Qui est-ce ? » les écarte, la galerie les garde. Sept sont recadrées : Husák (le visage dans une photographie de groupe), Árpád
  (le texte de la chronique), Madách (la signature), Janáček (la légende imprimée), Purkyně (la légende), Széchenyi (le visage dans une image en pied) et Erdős.
- **Une biographie liée** : Václav Havel est relié à `bio_havel` (« une même personne, une même date » : 1936), et son point de naissance (Prague) est repris de la biographie dans `assets/geo/events-geo.json`.
- **Le rangement.** Les souverains se rangent par leur prénom (« Étienne Ier de Hongrie », « Louis Ier le Grand », « Charles IV »), les autres par leur nom de famille ; François II Rákóczi, prince de Transylvanie et non roi, se range à « Rákóczi »
  (`EXCEPTIONS`).
- **Statut américain des images : à relire.** Quatre-vingt-douze portraits sont du « domaine public », dont beaucoup de photographies d'agence ou d'État que Commons étiquette « US ? » (modèles « PD-anon-70-EU », « PD-CzechGov », « PD-UKGov ») ;
  même décision que pour les autres thèmes : le script lit la licence déclarée, non le statut américain.
- **Les listes de candidats** sont dans `scripts/pantheon/europecentrale_candidats.md`.

### Un bloc : la Caraïbe non hispanique (Haïti, Jamaïque, Trinité-et-Tobago, Barbade, Bahamas, Antigua-et-Barbuda, Dominique, Sainte-Lucie, Saint-Vincent, Grenade, Belize, Guyana et Suriname)

`pan_caraibes`, « Grandes figures de la Caraïbe non hispanique » (code `caraibes`, bloc ; rangé sous « Caraïbe non hispanique », entre le Canada et le Caucase) : **78 personnages de quatorze pays** — Haïti 20, Jamaïque 19,
Trinité-et-Tobago 8, Barbade 6, Suriname 6, Guyana 4, Grenade 3, Bahamas, Belize, Dominique, Saint-Christophe-et-Niévès et Sainte-Lucie 2 chacun, Antigua-et-Barbuda et Saint-Vincent 1 chacun — de Nanny des Marrons (vers 1685) à Andy Palacio (1960).
Par axe : 30 Chefs d'État et dirigeants, 20 Littérature et pensée, 13 Musique, spectacle et sport, 10 Guerres et résistances, 3 Beaux-arts, 2 Sciences, techniques et innovation ; 23 ⭐ et **deux biographies liées**
(Toussaint Louverture, `bio_toussaint`, et Bob Marley, `bio_bobmarley`). 78 portraits : 52 du domaine public, 6 CC0, 18 CC BY ou CC BY-SA et **2 images non libres** (Bradshaw et Southwell). Dix figures sont nées avant 1800, dix-neuf de 1800 à 1899, quarante-sept depuis 1900.
Les mots-clés portent les treize pays et leurs adjectifs, les anciens noms (Saint-Domingue, Honduras britannique, Guyane britannique, Surinam), les capitales, la CARICOM et la Fédération des Indes occidentales, la révolution
haïtienne, les Marrons, les Garifunas, le rastafari, le reggae et le calypso.

- **Le nom : « Caraïbe non hispanique ».** Il reprend la logique d'« Amérique hispanique », qui contient déjà Cuba, la République dominicaine et Porto Rico. « Antilles » aurait exclu le Belize, le Guyana et le Suriname, qui sont
  pourtant membres de la CARICOM et partagent l'histoire des plantations ; « Amérique non hispanique » aurait englobé le Brésil, le Canada, les États-Unis et la France, qui ont leur propre thème.
- **Les dépendances restent à leur métropole** : la Martinique, la Guadeloupe et la Guyane vont à la France, Aruba, Curaçao et Sint Maarten au Benelux, les Caïmans, les Bermudes ou Anguilla au Royaume-Uni, les îles Vierges
  américaines aux États-Unis. Aucun candidat n'en vient. **Le panthéon de la France n'a encore aucun Antillais ni Guyanais** (Césaire, Fanon, Glissant, Delgrès, Solitude, Éboué, Monnerville, Saint-John Perse, Joséphine de
  Beauharnais) : ils sont à y ajouter. Jean-Baptiste Belley, né à Gorée et député de Saint-Domingue, est un révolutionnaire français ; Thomas-Alexandre Dumas, né à Saint-Domingue, un général français : ni l'un ni l'autre n'est ici.
  Alexander Hamilton, né à Nevis, reste aux États-Unis.
- **Saint-Kitts-et-Nevis** n'est représenté que par ses deux premiers chefs de gouvernement, Robert Bradshaw (1916-1978) et Paul Southwell (1913-1979), né à la Dominique : leurs seules photographies viennent d'un site
  patrimonial local (historicstkitts.kn), sans licence, et sont donc **des images non libres** (`source` vers leur page) ; Commons n'en a aucune sous licence libre pour Southwell, et seulement un buste (CC BY-SA) pour Bradshaw.
  Antigua-et-Barbuda (Vere Bird) et Saint-Vincent (Chatoyer) n'ont qu'une figure.
- **Un équilibre sans pays dominant** : Haïti (26 %) et la Jamaïque (24 %) sont sous le seuil de 40 % ; aucun `partMaxPays`. Les quatorze pays sont tous représentés parmi les ancres de « Pendant ce temps, ailleurs… » (un test le vérifie).
- **Le pays qui honore, pas l'état civil.** Sidney Poitier (né à Miami, élevé aux Bahamas, ambassadeur des Bahamas), V. S. Naipaul et Jean Rhys, écrivains britanniques nés à Trinité et en Dominique, Claude McKay (naturalisé américain)
  et Maurice Bishop (né à Aruba) sont rangés ici : aucun autre panthéon ne les a, et leur pays natal les honore. Ellie Mannette, installé aux États-Unis, reste à Trinité.
- **Deux figures très controversées sont retenues** : François Duvalier (Haïti, 1907-1971) et Desi Bouterse (Suriname, 1945-2024, condamné pour les assassinats de décembre 1982), parce qu'un panthéon national n'efface pas ses
  dictateurs (voir Franco, Staline, Pétain) ; leurs fiches disent les faits sans les excuser. **À valider par l'éditeur.**
- **Dates retenues** : Nanny des Marrons (« vers 1685 » ; son existence repose surtout sur la tradition orale), Joseph Chatoyer (« vers 1750 »), Toussaint Louverture (« vers 1743 »), George William Gordon (« vers 1820 ») ;
  Charlemagne Péralte est daté de 1885 (l'article dit « 1885 ou 1886 », et sa première phrase 1885). Mighty Sparrow (1935-2026) et Jimmy Cliff (1944-2025) sont morts récemment, d'après l'article français ; Vere Bird est daté de 1910, comme dans l'article. Les dates viennent de l'article français, non recoupées une à une.
- **Des portraits souvent indirects**, et les légendes le disent : peintures posthumes ou d'époque (Toussaint Louverture, Dessalines par Louis Rigaud, Henri Christophe par Richard Evans, Seacole par Challen, Prescod dans un tableau de
  Haydon), gravures (Pétion, Soulouque, Janvier, Gordon, Chatoyer d'après Brunias), un timbre haïtien de 1954 (Boisrond-Tonnerre), une statue (Paul Bogle à Morant Bay) et deux bustes (Nanny des Marrons, Walter Rodney).
  **Trois images écrivent le nom** et sont marquées `nomVisible` : l'inscription de la gravure de Pétion, le timbre de Boisrond-Tonnerre et la plaque du buste de Nanny ; « Qui est-ce ? » les écarte, la galerie les garde.
  Dix portraits sont recadrés (Christophe, Chatoyer, Rodney, Rhys, Garvey, Bustamante, Marson, Mannette, Janvier, Obin) : `recadrage`, avec une miniature plus large que 500 pixels quand le visage est petit.
- **Deux images non libres (Saint-Christophe-et-Niévès, voir plus haut).** Plusieurs autres images sont petites ou de faible qualité, à remplacer dès qu'une meilleure existe : Maurice Bishop (113 × 148 px), Frank Worrell (193 × 242), Hector Hyppolite
  (225 × 288), George Cadle Price (225 × 266, de profil), Ellie Mannette, Michael Manley, Una Marson.
- **Écartés après examen**, voir `scripts/pantheon/caraibes_candidats.md` : **Samuel Sharpe** (la seule image trouvée est le portrait d'un homonyme, l'égyptologue britannique ; il n'a pas de portrait libre), Ebenezer Joshua (photographie
  trop sombre), Winifred Atwell, Cazabon, Milo Butler, Roland Symonette, Tim Hector, George Walter, Louise Bennett, Préfète Duffaut, Philip Goldson (image sous licence hors liste), Janet Jagan, Arthur Chung (idem) ;
  **vingt-huit figures sans article français** (Bedward, Cipriani, Tubal Uriah Butler, Fédon, Marryshow, Soberanis, Mittelholzer, Critchlow, Luckhoo, Huiswoud…) ; et les vivants. Six figures avaient en fait un article sous
  un autre titre (Sanité Belair, Dantès Louis Bellegarde, Louis Boisrond-Tonnerre, Samuel Selvon, Cecil Wallace Whitfield, Ebenezer Joshua) : trois sont dans le bloc (Bellegarde, Boisrond-Tonnerre, Selvon), Belair et Wallace Whitfield n'ont pas d'image libre.
- **Statut américain des images : à relire**, comme pour les blocs précédents. Une vingtaine de photographies de presse ou d'État sont étiquetées « US ? » sur Commons.
- **Les listes de candidats** sont dans `scripts/pantheon/caraibes_candidats.md`.

### Un fichier source par panthéon, un script qui l'écrit dans `data/fr.json`

`scripts/pantheon/<code>.json` (`fr`, `hispam`…) est **la seule source de
vérité** du thème : `code` (le nom du fichier), `nom` (le nom de rangement,
« France », « Amérique hispanique » — les panthéons se rangent par lui, pas par
le nom du thème, que « de », « des » et « du » fausseraient), `theme`
(`id`, `nom`, `difficulte`, `motsCles`), `axes`, `personnages` (dont leur `classement`,
voir plus haut), et pour un bloc la liste `pays`. `python3 scripts/build_pantheon.py fr` le valide puis le
reporte dans `data/fr.json` (qui se réécrit à l'octet près : le diff ne montre
que le thème). `--check` valide sans écrire, `--verify` vérifie que
`data/fr.json` est à jour — et `tests/pantheon.test.js` le lance, si bien que
retoucher le thème à la main dans `fr.json` fait échouer `npm test`.

Le constructeur applique les règles ci-dessus *avant* d'écrire, et celle qui
vaut entre thèmes — un personnage, un seul thème, par article Wikipédia et par
biographie ; il refuse un pays déclaré sans aucune figure et prévient quand un
pays pèse trop (plus de 40 % du bloc : un seuil relatif, parce que vingt
figures d'un même pays ne pèsent pas pareil dans un bloc de 97 et dans un bloc
de 30 ; un bloc dont un pays pèse davantage déclare `partMaxPays`, comme celui de
l'Allemagne, de l'Autriche et de la Suisse). Les mêmes règles, côté JavaScript, sont reprises par
`tests/data-schema.test.js` et `tests/pantheon.test.js` pour qu'une régression
venue d'ailleurs soit attrapée elle aussi.

### Portraits

Un événement peut porter un champ `image`, valable pour n'importe quelle
catégorie (les Biographies pourront en recevoir sans nouveau code) :

```json
"image": {
  "src": "assets/portraits/pan_fr_hugo.jpg",
  "legende": "Victor Hugo, photographie de Nadar (vers 1884)",
  "auteur": "Nadar",
  "licence": "Domaine public",
  "source": "https://commons.wikimedia.org/wiki/File:Victor_Hugo_001.jpg"
}
```

**Où ils s'affichent** : dans la fiche (portrait, légende, crédit), en pastille
ronde devant chaque repère de la frise, et en vignette sur la carte « À
placer ». Une image qui ne charge pas s'efface d'elle-même (`setPortraitImg`) :
la fiche reste complète sans elle.

**La légende dit ce qu'on voit.** « Charlemagne, portrait imaginaire peint par
Albrecht Dürer en 1512, sept siècles après sa mort » ; « Vercingétorix :
statère d'électrum frappé à son nom ; la tête stylisée n'est pas un portrait ».
Pour l'Antiquité et le haut Moyen Âge, aucun portrait authentique n'existe :
l'écrire est une petite leçon de critique des sources.

**Pourquoi héberger les images dans l'app plutôt que les charger depuis
Wikipédia** : l'app doit rester jouable hors-ligne, chaque affichage enverrait
l'adresse IP du joueur à un tiers que la politique de confidentialité ne
prévoit pas (même raison que l'absence de télémétrie, plus haut), et Wikimedia
limite sévèrement les requêtes.

**Licences : libres seulement, et libres aussi aux États-Unis.** Domaine
public, CC0, CC BY, CC BY-SA ; jamais « NC » (l'app est distribuée sur l'App
Store) ni « ND » (les images sont recadrées, donc modifiées).
`scripts/fetch_portraits.py` lit la licence sur la page du fichier Commons et
refuse tout fichier hors liste ; `tests/data-schema.test.js` la revérifie.
« Domaine public en France » ne suffit pas, parce que l'app est distribuée
partout : une photographie française publiée après 1930 peut être restée
protégée aux États-Unis (loi URAA). Pour cette raison, les portraits de Piaf
(photo de 1946 du studio Harcourt) et de Lumière (1948) ont été remplacés par
des images dont la licence est explicite (Piaf en 1962, archives néerlandaises,
CC0 ; Lumière vers 1890). Répartition finale : France, 54 domaine public, 4 CC0,
3 CC BY ou CC BY-SA ; Amérique hispanique, 75 domaine public, 2 CC0, 8 CC BY,
12 CC BY-SA ; Maghreb, 36 domaine public, 5 CC0, 3 CC BY, 14 CC BY-SA ; Égypte,
34 domaine public, 5 CC0, 2 CC BY, 11 CC BY-SA ; États-Unis, 109 domaine public,
3 CC0, 4 CC BY, 7 CC BY-SA ; Italie, 102 domaine public, 3 CC0, 7 CC BY, 15 CC BY-SA ;
Royaume-Uni, 131 domaine public, 3 CC0, 3 CC BY, 14 CC BY-SA ; Espagne, 102 domaine public, 2 CC0, 5 CC BY,
23 CC BY-SA. En France, trois portraits du XXe siècle reposent sur un
raisonnement plus fin que « ancien », à relire si l'on veut être plus strict :

- **Jean Moulin** (Harcourt, 1937) : œuvre collective, dont le délai français de
  50 ans était expiré avant 1996, donc non rétablie aux États-Unis ;
  autorisation enregistrée chez Wikimedia (ticket VRTS).
- **Henri Matisse** (Carl Van Vechten, 1933) : photographe américain, collection
  de la Bibliothèque du Congrès, « aucune restriction connue ».
- **Albert Camus** (United Press International, 1957) : cliché de presse
  américain de la collection du *World-Telegram*, même bibliothèque.

(De Gaulle est une photographie de l'Office of War Information, œuvre du
gouvernement fédéral américain.)

L'Amérique hispanique en compte vingt, parce que ses photographies du XXe
siècle y sont libres par une durée nationale très courte bien plus souvent que
par l'ancienneté. Les voici, pour qui voudrait être plus strict (les
peintures, gravures et photographies d'avant 1931, les œuvres du gouvernement
fédéral — Houssay, Gallegos, Chamorro, Torrijos — et les licences CC de
photographes ou d'institutions identifiés n'appellent pas de réserve) :

- **Quatorze photographies à deux balises, nationale et « États-Unis »** :
  protection de 20 ans après la publication en Argentine (Gardel 1933, Storni,
  Perón, Borges par Grete Stern en 1951, Cortázar 1967, Evita, Guayasamín et
  Mercedes Sosa par Annemarie Heinrich, Piazzolla 1965, Violeta Parra 1973),
  au Pérou (Vallejo 1929) et en Italie (Mgr Romero 1940) ; 25 ans en Espagne
  pour une photographie simple (Carpentier 1955) ; en Suède, pour une
  photographie d'avant 1976 sous le seuil d'originalité (Mistral 1945).
  Chacune porte la balise qui dit qu'elle était déjà libre le 1er janvier
  1996, donc que le rétablissement américain ne l'a pas touchée ; la date de
  publication est celle que donne la page du fichier, que rien ici ne permet
  de vérifier.
- **Deux photographies cubaines** (Celia Cruz 1957, le Che le 2 juin 1959) :
  le modèle cubain porte lui-même le raisonnement américain (publiée à Cuba
  avant le 20 février 1972, sans les formalités américaines). L'auteur du Che
  est inconnu, celui de Celia Cruz n'est donné qu'avec un « probablement ».
- **Fidel Castro** (15 avril 1959) : collection *U.S. News & World Report* de
  la Bibliothèque du Congrès, « aucune restriction connue » — le même
  raisonnement que pour Matisse et Camus. Le don de la collection ne couvre
  que les photographes salariés du magazine, et la page de ce cliché n'en
  nomme aucun.
- **Trois licences CC posées par un tiers**, plausibles mais invérifiables
  d'ici : Wifredo Lam (CC BY 3.0, archives photographiques de José
  Gómez-Sicre, dont se dit propriétaire l'utilisateur de Wikipédia en anglais
  qui a versé le cliché), Lázaro Cárdenas (1934, CC BY 2.5, archive du
  photographe Aurelio Escobar Castellanos, avec l'autorisation de ses
  « titulaires moraux ») et Luis Barragán (1981, CC BY 3.0, par celui qui se
  déclare l'auteur du cliché).

Un portrait est à part : celui de **Juan Santamaría**, héros national du Costa
Rica, qui est la photographie de sa statue (1891) par un contributeur, sous
licence CC BY-SA 4.0, faute de portrait libre ; la légende le dit.

Le Maghreb en compte dix-huit, d'une autre nature. Peu de photographes
identifiés ont versé leurs clichés du XXe siècle sous licence libre, et ceux des
figures politiques et militaires sont des portraits de presse, d'identité ou
d'administration, d'auteur inconnu : leur « domaine public » repose sur le droit
du pays d'origine, rarement sur un raisonnement américain. C'est le prix de
l'exigence « un portrait pour chaque personnage », acceptée telle quelle :

- **Quinze photographies à une seule balise nationale** — « PD-Algeria »
  (Ben M'hidi), « PD-Algeria-photo-except » (Rimitti, Ben Badis, Boumédiène),
  « PD-Tunisia » (Hached, Haddad, Ben Mrad, Ben Cheikh, Moncef Bey, Jouini,
  Msika, Bourguiba, Saliha, Chebbi), « PD-Morocco » et « PD-Poland » (Allal El
  Fassi : un cliché d'environ 1935, venu des archives numériques nationales
  polonaises). Toutes d'auteur inconnu, sauf Bourguiba (Habib Osman, années
  1960). Elles sont libres dans leur pays ; aucune ne porte la balise
  « PD-1996 », celle qui dit qu'une image l'était déjà au 1er janvier 1996 et
  que le rétablissement américain ne l'a donc pas touchée. Deux autres la
  portent (El Anka, 1955 ; Idris Ier), et Omar al-Mokhtar est dans un cas
  voisin : « PD-Libya », une photographie d'avant 1931 légendée en italien, donc
  libre aux États-Unis si, comme tout l'indique, elle a paru avant cette date.
- **Deux licences posées par un tiers** : Messali Hadj (CC0 apposé en 2024 sur
  une photographie parue dans *El Ouma* en 1934 : libre en France, mais peut-être
  encore protégée aux États-Unis jusqu'en 2029) et Kateb Yacine (CC BY-SA 2.0
  pour une photographie du salon du livre d'Alger de septembre 1962, dont la page
  donne pour auteur le téléverseur lui-même).
- **Une statue**, faute de tout portrait : Fatima al-Fihriya, photographiée au
  musée de Jordanie (CC BY-SA 4.0 pour la photographie ; les droits de la
  sculpture ne sont pas documentés). La légende le dit.

Les quarante autres reposent sur des bases plus solides : œuvres anciennes,
quatre clichés des archives néerlandaises (Ferhat Abbas, Ben Bella, Mohammed V,
Ben Barka, CC0), une photographie de la marine américaine (Kadhafi), deux de la
Commission européenne (Hassan II, Ould Daddah, CC BY 4.0) et des licences CC de
photographes, d'institutions ou de contributeurs qui se déclarent auteurs de
leur cliché.

L'Égypte en compte quinze, de la même nature : des portraits de presse,
d'ouvrage ou d'archive dont le « domaine public » repose sur le droit du pays
d'origine, ou sur une licence qu'un tiers a posée :

- **Douze images à la seule balise « PD-Egypt »**, aucune ne portant la balise
  « PD-1996 » : deux portraits tirés de l'ouvrage biographique *Al-A'lam*
  d'al-Zirikli (Rifa'a al-Tahtawi, antérieur à 1873 ; Sayed Darwich, antérieur à
  1923), la photographie de Saad Zaghloul parue en 1926 (W. Hanselman), celle de
  Qasim Amin (entre 1890 et 1908, collection Sakhr al-Khatib), celle de Mahmoud
  Mokhtar parue dans *Rose al-Youssef* en 1930, celle de Tawfiq al-Hakim parue
  dans *Al-Riyadh* en 1985, le portrait officiel de Mohamed Naguib (présidence
  égyptienne, vers 1954) et cinq clichés d'auteur inconnu — Taha Hussein, Oum
  Kalthoum (1938), Farouk Ier (1946), Faten Hamama (1962) et Inji Efflatoun.
  Leur « domaine public » est celui de l'Égypte ; rien n'établit qu'il vaille aussi
  aux États-Unis.
- **Une photographie à balise tunisienne** : Abdel Halim Hafez, dans le journal
  tunisien *Assabah* (1978), « PD-Tunisia » seule. Un chanteur égyptien sous le
  droit d'un autre pays que le sien.
- **Deux licences posées par un tiers**, plausibles mais invérifiables d'ici :
  Hassan Fathy (CC BY-SA 3.0, pour un cliché que la page tire de l'« archive
  personnelle de Dimitri Papadimos avec son fils Ioannis ») et Youssef Chahine
  (CC0, pour une photographie de 1978 mise en ligne par Mblegacy et dont la page
  dit elle-même « Photo Credit - Unknown »).

Les trente-sept autres reposent sur des bases plus solides : dix-neuf images
anciennes (œuvres d'art, gravures, photographies d'avant 1931, dont un cliché de
la collection Bain de la Bibliothèque du Congrès pour Fouad Ier), quatre pièces
de musée sous CC0 (le Metropolitan Museum pour Imhotep, Hatchepsout et
Akhenaton, le Rijksmuseum pour Ali Bey), deux œuvres du gouvernement américain
(Sadate par la CIA, Moubarak par le Département de la Défense) et douze licences
CC de photographes ou d'artistes identifiés (Néfertiti, Toutânkhamon, Ramsès II,
Plotin, Abdel Wahab, Mahfouz, Nasser, Idris, Saadawi, Sharif, Zewail, et
Boutros-Ghali, dont le cliché des archives Anefo porte la licence néerlandaise
« CC BY-SA 3.0 NL »).

Les États-Unis en comptent trente-huit, d'une troisième nature : des
photographies américaines du XXe siècle, libres non par l'ancienneté mais par
défaut de formalités (jusqu'en 1989, la loi américaine exigeait une mention de
copyright, et un renouvellement pour les œuvres publiées avant 1964) ou par le
don d'une collection à la Bibliothèque du Congrès. Les voici, pour qui voudrait
être plus strict (les œuvres anciennes, les photographies d'avant 1929, les
œuvres du gouvernement fédéral — Eisenhower, Kennedy, Lyndon Johnson, Nixon,
Carter, Reagan, Thurgood Marshall, MacArthur, Oppenheimer, Grace Hopper, Rachel
Carson, Ansel Adams, Neil Armstrong, Sagan, Sally Ride, Arthur Miller — et les
licences CC de photographes ou d'institutions identifiés n'appellent pas de
réserve) :

- **Vingt-deux photographies « PD US no notice » ou « PD US not renewed »**,
  publiées sans mention de copyright ou dont le copyright n'a pas été renouvelé :
  Truman (vers 1947), Malcolm X (Eddie Adams pour l'Associated Press, 1964), Zora
  Neale Hurston, Hemingway (1939), Steinbeck (1939), Frank Lloyd Wright (vers
  1926), Hopper (Harris & Ewing, 1937), Pollock (Hans Namuth, 1951), Ellington
  (1964), Bogart (1940), Disney (1946), Katharine Hepburn (1941), Brando (1955),
  Marilyn Monroe (1953), Kubrick (1971), James Dean (1955), Elvis Presley (1957),
  Hendrix, Aretha Franklin (1968), Michael Jackson (United Press International,
  1984), Hubble (1931) et Earhart (NBC, 1935). Beaucoup sont des photographies
  publicitaires de studios ou de maisons de disques ; la page du fichier les dit
  libres, ce que rien ici ne permet de vérifier.
- **Seize photographies de collections de la Bibliothèque du Congrès, « aucune
  restriction connue »** : huit de Carl Van Vechten (Fitzgerald, Faulkner,
  Langston Hughes, Baldwin, Man Ray, Calder, Gershwin, Welles), six de William
  Gottlieb (Armstrong, Billie Holiday, Sinatra, Ella Fitzgerald, Parker, Miles
  Davis), une du *New York World-Telegram* (Tennessee Williams) et une de l'*U.S.
  News & World Report* (Martin Luther King) — le même raisonnement que pour
  Matisse et Camus en France.

Les quatre-vingt-cinq autres reposent sur des bases plus solides : œuvres
anciennes (peintures, gravures, daguerréotypes, photographies d'avant 1929, dont
celles de la collection Bain, de Harris & Ewing ou d'Underwood & Underwood pour
Keaton, Keller, Wilson, Hoover, Lindbergh ou Rockwell), œuvres du gouvernement
fédéral, et quatorze licences CC ou CC0 de photographes ou d'institutions
identifiés (le musée de la Galerie nationale d'art pour Adams, la National
Portrait Gallery pour Patton, les archives Anefo pour Coltrane, la bibliothèque
Roosevelt pour Franklin et Eleanor Roosevelt, la Marshall Foundation, Jack
Mitchell pour Bernstein et Warhol, Tamiko Thiel pour Feynman, Matt Yohe pour
Jobs, John Mathew Smith pour Rosa Parks et Toni Morrison, le York College pour
Maya Angelou, Joel Levine pour César Chávez).

Un portrait sous licence CC BY ou CC BY-SA porte dans la fiche son auteur, le
**lien vers le texte de la licence**, la mention « image recadrée » et le lien
vers la page de l'œuvre : c'est ce que ces licences exigent.

**Récupération** : `python3 scripts/fetch_portraits.py fr` (ou `hispam`…) lit
auteur et licence sur la page HTML du fichier (les API de métadonnées sont
fermées aux IP partagées des environnements en nuage, la page HTML ne l'est
pas), télécharge la miniature, la recadre en 4:5 et l'écrit en 320 × 400. Une
requête à la fois, une pause entre deux, un `User-Agent` qui dit qui on est,
reprise après un 429. `recadrage` serre le cadre sur le visage ; `largeur` fixe
la miniature demandée à Commons : 330, 500, 960, 1280 ou 1920 px, les seules
qu'il rend sans peine (`0` : le fichier original, pour une image plus étroite
que 330 px) ; à défaut, 500 px, ou 960 avec un recadrage. Les miniatures
déjà calculées par Commons (330 px surtout) arrivent d'un coup ; les autres,
qu'il doit fabriquer, se font attendre de 5 à 30 secondes et déclenchent des
429 — d'où, pour 97 images, le choix pour chacune de la plus petite largeur qui
laisse encore 320 px utiles après recadrage (le chiffre est inscrit dans
le fichier source). Vingt images n'y parviennent pas, leur source étant plus
étroite (184 px utiles pour Posada, le plus bas ; 214 pour Lam, 220 pour
Pakal) : elles sont agrandies, donc un peu molles sur un écran à haute
densité, mais passables à la taille d'affichage (160 × 200 px). Le Maghreb en
compte six (230 px utiles pour Ibn Battûta, le plus bas ; 252 pour Kateb Yacine,
256 pour Omar al-Mokhtar, puis 281, 306 et 312 pour Haddad, Msika et Chraïbi),
l'Égypte huit (221 pour al-Manfaluti, le plus bas ; 233 pour Taha Hussein, 271
pour Sayed Darwich, 282 pour al-Akkad, 284 pour Farouk, 292 pour Mohamed Abduh,
306 pour Hoda Charaoui et 312 pour Ahmed Chawqi). Trois de ces huit le doivent à
Commons : les originaux d'al-Manfaluti, d'al-Akkad et de Sayed Darwich (de 669 à
860 px de large) ont été refusés à chaque reprise, en 429 avec `Retry-After: 600`,
y compris après onze minutes sans la moindre requête, alors que les miniatures de
500 px étaient servies sans difficulté ; ils sont donc des miniatures de 500 px.
Les États-Unis en comptent quatre (279 px utiles pour Sagan, le plus bas ; 282
pour Crazy Horse, 311 pour Ella Fitzgerald, 317 pour Gershwin), et neuf images
y sont demandées dans leur taille d'origine (`largeur: 0`), faute de miniature
standard assez large pour le recadrage voulu. Le script n'attend pas dix minutes : il renonce après trois reprises (6, 12 puis
24 s) et passe à l'image suivante. `--check` contrôle sans réseau (existence,
dimensions, licence).

**Le script refuse ce qui est signalé sur Commons** : une page de fichier qui
porte un bandeau de suppression (« nominated for deletion », « speedy
deletion », « copyright violation »…) est écartée, quelle que soit sa licence.
Il a ainsi arrêté, à la récupération de l'Amérique hispanique, le portrait de
Carlos Gardel (suppression demandée en mars 2026 : son auteur n'est pas
inconnu, c'est José María Silva, et la photographie reste protégée en Uruguay)
et celui de Fidel Castro pris par Mondadori (suppression demandée en mai 2026,
faute de licence établie), remplacés l'un par une photographie de 1933 aux
deux balises, l'autre par un cliché de 1959 de la Bibliothèque du Congrès.

**Poids** : JPEG de 320 × 400, 25 Ko en moyenne (62 au plus), soit 1,8 Mo pour
les 170 de la France, 2,5 Mo pour les 97 de l'Amérique hispanique, 1,7 Mo
pour les 58 du Maghreb, 1,4 Mo pour les 52 de l'Égypte et 3,1 Mo pour les 129
des États-Unis — de
l'ordre de 20 Mo pour 800 portraits, quand `assets/` en pèse déjà 38. Le WebP
gagnerait environ un tiers, mais la cible iOS actuelle (13, voir
`ios/App/Podfile`) ne le lit pas : il attendra la migration vers Capacitor 7
(iOS 14+) déjà évoquée plus haut.

**Cache** : `sw.js` range les portraits dans un cache à part
(`historiaxe-portraits-v2`), que le ménage de `activate` épargne. Rangés avec
le reste, ils seraient jetés à *chaque* mise à jour de l'app puis retéléchargés
un à un. Ils ne sont pas préchargés à l'installation (des centaines de
fichiers, que la plupart des joueurs ne verront jamais) mais se mettent en
cache à la première vue. Le revers est une règle de nommage : **un portrait
n'est jamais remplacé sous le même nom de fichier** (cache-first, l'ancien
resterait servi) — un portrait remplacé reçoit un nouveau nom.

### Ce que ça touche ailleurs dans le code

- **La note s'affiche à tous les niveaux** (`initSubcategories`). Elle ne
  s'affichait qu'au sommet, ce qui aurait fait disparaître celle de
  « Biographies », devenue une sous-catégorie qui porte elle-même des
  sous-catégories.
- **Les images des tuiles** : « Personnages illustres » reprend celle des
  anciennes Biographies ; « Panthéons » ne doit pas tomber sous la règle des
  mythologies (`panth`), qui lui donnerait la mauvaise image — d'où une
  égalité stricte sur le nom, qui laisse « Mythologies et panthéons antiques »
  à la sienne.
- **Le Mode Carte n'a rien eu à changer** : il ne retient que les thèmes
  listés dans `assets/geo/theme-country-map.json`, où aucun panthéon ne figure
  — heureusement, puisqu'il affiche la description pendant la question, et
  « (1802-1885) est un poète français » donnerait la réponse. Un test garde
  cette absence.
- **« Pendant ce temps, ailleurs… »** : `pan_<iso2>` compte comme le pays
  (sinon une naissance française répondrait, « ailleurs », à une ancre
  française) ; un panthéon de bloc, lui, n'a pas de pays et ses événements
  portent le leur ; et tous les panthéons — pays ou blocs — sont exclus du
  vivier de *réponses* même marqués ⭐. Des naissances sont d'excellentes
  ancres, jamais des réponses.

### Ajouter un pays ou un bloc

1. Copier `scripts/pantheon/fr.json` (un pays) ou `hispam.json` (un bloc), y
   mettre le panthéon, ses personnages (une naissance chacun, six ou sept axes, trois
   phrases, un `pays` pour un bloc, et au besoin `partMaxPays`), et le nom de fichier
   Commons de chaque portrait. Vérifier chaque année de naissance et de décès sur l'article
   Wikipédia du personnage, et qu'il n'est dans aucun autre panthéon.
2. `python3 scripts/fetch_portraits.py <code>`, puis écrire les légendes
   (et `recadrage` quand le visage est petit dans l'image).
3. `python3 scripts/build_pantheon.py <code>`.
4. Incrémenter `CACHE_VERSION` et `DATA_CACHE` dans `sw.js` : `data/fr.json` est
   servi cache-first.
5. `npm test` et `npm run test:e2e`.

### Ce qui n'est pas fait

- **Les autres panthéons** : la France, l'Égypte, les États-Unis, l'Italie, le
  Royaume-Uni, l'Espagne, l'Amérique hispanique, le Maghreb, le Machrek, l'Allemagne-Autriche-Suisse, la Scandinavie, l'Afrique de l'Ouest, l'Afrique centrale, le sous-continent indien, Israël, la Chine, la Turquie, le Japon, la Grèce, la Russie, l'Australie, le Canada, le Benelux, le Portugal, l'Asie centrale et l'Afghanistan, la Nouvelle-Zélande et le Pacifique, le Brésil, l'Iran, les Balkans, les pays baltes, l'Afrique du Sud, l'Éthiopie, l'Afrique de l'Est et la Corne, l'Afrique australe, l'océan Indien occidental, l'Indonésie, le monde malais, les Philippines, le Vietnam-Cambodge-Laos, la Thaïlande et la Birmanie, la Mongolie, la Corée, la Pologne, l'Europe centrale, l'Ukraine (avec la Biélorussie invitée de la Russie), la Caraïbe non hispanique, l'Irlande, Malte, Chypre sont écrits.
  Chaque liste de personnages est validée avant la rédaction. Feuille de route, dans l'ordre
  où on les propose (un pays seul quand il a de quoi faire un thème, un bloc sinon) :
  1. **Le Machrek est écrit** (voir « Le cinquième bloc »). Il reste : le portrait des trois
     fiches en attente (`scripts/pantheon/machrek_en_attente.md`), une image pour Khalid ibn
     al-Walid, Zaha Hadid et Asmahan, des titres français à retrouver (Zénobie, Al-Mansur, Ahmad
     ibn Majid) et le statut américain des images à confirmer.
  1 bis. **Israël est écrit** (voir « Un pays à part : Israël »). Pas de thème juif de la diaspora : la
     règle « un personnage, un seul thème » range chacun dans son pays. Le Maghreb compte deux
     figures juives (Edmond Amran El Maleh, Habiba Msika) et en a laissé cinq de côté (Cheikh
     Raymond, Reinette l'Oranaise, Salim Halali, Albert Memmi, Abraham Serfaty).
  2. **Pays seuls** : **l'Afrique du Sud** (voir « Un pays à part : l'Afrique du Sud »), **l'Iran** (voir « Un pays à part : l'Iran »), **le Brésil** (qui n'entre pas dans l'Amérique « hispanique » ; voir « Un pays à part : le Brésil »), **la Turquie** (voir « Un pays à part : la Turquie »), **le Japon** (voir « Un pays à part : le Japon ») et **la Russie** (voir « Un pays à part : la Russie ») et **l'Australie** (voir « Un pays à part : l'Australie ») sont écrits.
  3. **Blocs** : l'Asie du Sud-Est (l'Indonésie est écrite, voir « Un pays à part : l'Indonésie » ; le monde malais est écrit, voir « Un bloc : le monde malais » ; les Philippines sont écrites, voir « Un pays à part : les Philippines » ; l'Indochine — Vietnam, Cambodge, Laos — est écrite, voir « Un bloc : l'Indochine » ; la Thaïlande avec la Birmanie est écrite, voir « Un bloc : la Thaïlande et la Birmanie » ; restent le Brunei déjà au bloc malais, la Papouasie-Nouvelle-Guinée et les Mélanésiens), la Mongolie (l'Asie centrale est écrite, voir « Un bloc : l'Asie centrale et
     l'Afghanistan »), le Caucase, la Corée (`KR`/`KP`), l'Afrique de
     l'Ouest, puis les trois derniers morceaux de l'Afrique de l'Est et australe, décidés ainsi : **l'Éthiopie est écrite**, pays seul (voir « Un pays à part :
     l'Éthiopie ») ; le bloc **Afrique de l'Est et Corne** (Kenya, Tanzanie, Ouganda, Somalie, Érythrée, Djibouti, Soudan et Soudan du Sud, sans l'Éthiopie) **est écrit** (voir « Un bloc : l'Afrique de l'Est et la Corne ») ; le bloc
     **Afrique australe** (Angola, Mozambique, Zimbabwe, Zambie, Malawi, Namibie, Botswana, Lesotho et Eswatini, sans l'Afrique du Sud) **est écrit** (voir « Un bloc : l'Afrique australe » ; l'Angola y a été déplacé
     depuis l'Afrique centrale) ; le bloc **océan Indien occidental** (Madagascar, Comores, Maurice et Seychelles) **est écrit** (voir « Un bloc : l'océan Indien occidental »),
     avec un `partMaxPays` de 0,6 : Madagascar en pèse 56 %. **La Réunion et Mayotte n'y sont pas** : départements français, leurs figures vont au panthéon de la France, comme celles d'Hawaï à celui des
     États-Unis. **Le plan de l'Afrique de l'Est et australe est donc terminé.** L'Afrique centrale est écrite (voir « Un bloc : l'Afrique centrale »). « Nouvelle-Zélande et Pacifique » est écrit (voir « Un bloc : la
     Nouvelle-Zélande et le Pacifique »). Les pays baltes sont écrits (voir « Un bloc : les pays baltes »).
  4. **L'Europe et les Amériques qui manquent** : **le Portugal est écrit** (voir « Un pays à part : le Portugal »,
     qui a repris Magellan et Viriathe), Byzance (au-delà des cinq figures déjà au panthéon de la Grèce),
     la Pologne et l'Europe centrale (écrites : voir « Un pays à part : la Pologne » et « Un bloc : l'Europe centrale »), la Slovénie (dans le bloc d'Europe centrale), l'Ukraine (écrite : voir « Un pays à part : l'Ukraine », avec la Biélorussie invitée de la Russie), la Caraïbe non
     hispanique (écrite : voir « Un bloc : la Caraïbe non hispanique »).

  Les images décideront de la taille de chacun : pour l'Afrique subsaharienne et l'Asie du
  Sud-Est, on vérifiera les portraits sur Commons **avant** de valider la liste. Les figures
  disputées entre deux thèmes (Avicenne et al-Biruni, Rûmî, Babur, Kubilai Khan, Bruce Lee,
  Eusébio) se règlent par la règle « celui qui l'honore le plus ».
- **Pays encore sans figure dans aucun panthéon** (193 États de l'ONU, plus le Vatican et la Palestine) : **Andorre** et **Saint-Marin** (en attente de portraits, voir « Les micro-États »),
  **le Vatican** (aucune figure propre, par choix), **Kiribati** et **le Vanuatu** (aucune image libre ; la règle des images non libres permet désormais de les ajouter au panthéon du Pacifique). Ce sont les seuls pays à n'avoir encore aucune figure.
- **Des figures de l'Allemagne, de l'Autriche et de la Suisse à améliorer ou à rediscuter** :
  les vingt et un candidats écartés (voir « Ce que les images ont changé en Allemagne, en
  Autriche et en Suisse ») ; les images d'Hitler, de Marlene Dietrich, d'Hedy Lamarr et de
  Ramuz (une photographie en pied, où le visage est petit), à remplacer par une image plus nette
  si elle apparaît ; et le sort de Lauda, aujourd'hui aux seules Biographies.
- **Des figures des États-Unis écartées faute d'image libre convenable**, à
  réintégrer si l'une apparaît : John Rawls, Scott Joplin (un portrait de 200 px),
  Linus Pauling et Claude Shannon (portraits trop étroits), Barbara McClintock,
  Margaret Mead (licence) et Jean-Michel Basquiat (licence douteuse).
- **Des figures de l'Italie à améliorer** : Giovanni Falcone et Paolo Borsellino
  n'ont, faute de photographie libre, qu'un portrait dessiné au crayon par Luigi
  Oldani (CC BY-SA 3.0) ; Piero della Francesca est montré par un bois gravé des
  *Vies* de Vasari, son présumé autoportrait en soldat endormi de la *Résurrection*
  n'existant sur Commons qu'en 170 px ; Ferruccio Parri n'a que 200 px (photographie
  du Sénat, la seule sous licence explicite). À remplacer si une meilleure image libre
  apparaît.
- **Des figures de l'Égypte écartées faute d'image libre ou d'année de
  naissance**, à réintégrer si l'une apparaît : al-Maqrizi, al-Suyuti,
  al-Jabarti, Hassan al-Attar, et les pharaons sans naissance connue (voir « Un
  pays à part : l'Égypte »).
- **Des figures de l'Amérique hispanique écartées faute de portrait libre**,
  à réintégrer si une image convenable apparaît : voir « Ce que les images
  ont écarté » plus haut.
- **Les portraits des 360 Biographies** : le champ `image` les accepte déjà,
  il reste à les récupérer.
- **Les portraits dans les autres modes de jeu** (Quiz, Périodes, Fil du
  temps…) : ils n'apparaissent que dans la frise et la fiche.
- **Hors-ligne**, un portrait jamais vu n'est pas disponible (voir « Cache »).
- **La tuile « Panthéons »** réutilise l'image du globe : une image dédiée
  serait préférable.
- **Sportifs et entrepreneurs** n'ont pas d'axe dans les panthéons : ils sont
  couverts par les Biographies, sauf les sportifs de portée historique. **Yachine**
  est au panthéon de la Russie ; Smith et Carlos attendent de ne plus être vivants.
