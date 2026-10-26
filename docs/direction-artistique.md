# HistoriAxe — Guide de style et liste des assets

Ce document sert à **commander ou générer** les visuels qui remplaceront les dessins SVG provisoires du Chemin du
Temps (paysages, monuments) et à créer Clio, la mascotte. Il se lit sans connaître le code : il dit *quoi* produire, *dans quel
style*, *à quelles dimensions*, *sous quel nom de fichier*. Le code (placement, animation, repli sur les SVG actuels) est
déjà en place ou sera branché une fois les fichiers livrés (§7).

> **Décision préalable (à valider)** : ce guide suppose une direction **illustrée en 2D, avec un rendu « 3D stylisé »**
> (volumes doux, éclairage unique), livrée en images détourées et en calques. C'est la voie la plus légère
> (hors ligne, vieux téléphones) et la plus cohérente. La 3D temps réel n'est pas retenue (poids, perfs) ; si elle
> l'était un jour, les modèles seraient rendus en images fixes de toute façon (§7).

---

## 1. Intention

HistoriAxe est un jeu de frise chronologique pour **tout public** (collégiens comme adultes), jouable en classe. Le
Chemin du Temps est sa carte de progression : chaque monde est **un petit pays à parcourir**, du premier niveau au
monument qui garde le boss.

- **Ton** : chaleureux, lumineux, curieux — un manuel d'histoire qui aurait des couleurs de jeu mobile. Jamais
  sombre, jamais cynique, jamais enfantin au point de gêner un adulte.
- **Référence d'ambiance** : les cartes de Castle Crumble / Royal Match (route sinueuse, relief en falaise, grands
  volumes lisibles, décor dense mais calme). On s'en inspire pour **l'esprit et la lisibilité**, pas pour copier : aucun
  élément, personnage ni cadrage identifiable de ces jeux.
- **Priorité absolue : la lisibilité.** Au premier regard, on doit reconnaître **l'époque** (par le monument et deux ou
  trois objets) et **voir où est le chemin**. Le décor ne doit jamais concurrencer les pastilles de niveau.
- **Exactitude** : les monuments et objets doivent être *reconnaissables et crédibles pour l'époque* (un enseignant ne
  doit pas grimacer), sans pédanterie. En cas de doute entre joli et faux / simple et juste : simple et juste.

## 2. Style visuel

| Point | Consigne |
|---|---|
| **Rendu** | Illustration « 3D stylisée » : volumes simples et arrondis, matières suggérées (pierre, bois, tuile), **sans contour noir**. Pas de photoréalisme, pas de texture bruitée. |
| **Vue** | Même caméra pour tout : **3/4 vue du dessus, environ 35° d'inclinaison**, légèrement de face. Pas de perspective forcée ni de grand angle. |
| **Lumière** | **Une seule source, en haut à gauche** (soleil doux), ombres douces vers le bas droite, ciel clair. Aucune ombre portée au sol cuite dans l'image (le jeu ajoute la sienne) — seulement l'ombrage propre des volumes. |
| **Couleur** | Saturation moyenne à forte, **valeurs claires à moyennes**, peu de noir pur. Un monument = 3 à 5 teintes dominantes. Les verts de végétation sont partagés d'un monde à l'autre (voir palette §2.1). |
| **Détail** | Peu : on doit lire le monument à **90 px de large**. Pas de petites écritures, pas de visages détaillés, pas de logos, pas de textes. |
| **Échelle** | Le monument fait environ **3 fois la hauteur d'un grand arbre** ; un arbre ≈ 2 fois une maison ; la pastille de niveau (56 px) est plus petite qu'une porte de monument. Même échelle dans tous les mondes. |
| **Ambiance par monde** | Une dominante de couleur et une météo légère propres au monde (voir §4), **sans jamais assombrir** : même au pire moment (14-18) le ciel reste lisible. |

### 2.1 Palette de référence (à ajuster en phase pilote)

Les valeurs sont celles du prototype SVG ; elles servent de point de départ, pas de dogme.

- Verdure : `#3f9d5b` (feuillage), `#2c7a45` (ombre), `#6cc16f` (lumière), tronc `#8a5a33`
- Pierre : `#c4c9ce` (claire), `#9aa0a6`, `#737a82` (ombre) ; sable : `#e6c98a` / `#cfa965`
- Toiture : `#c0563c` / `#963f2b` ; or : `#e3b23c` ; bleu : `#3b7dc4` ; rouge : `#cf3f3a`
- Sols (haut → bas) : vert `#c9e8a6→#9fd47c`, sec `#e9d9a4→#d9bd7c`, sable `#f2e0ae→#e6c887`, roche `#cfd3c0→#aeb59a`,
  guerre `#bdb59f→#9a9179`, ville `#d3d8da→#b5bdc2`, printemps `#d8ecb8→#b4dc8c`. Route : `#f0d9a0` (variantes par sol)

### 2.2 À ne jamais faire

- Aucun symbole nazi, aucun signe de haine, **aucun cadavre ni blessure** (Grande Guerre, guerres de Religion,
  Révolution) : la guerre se dit par le décor (cratères, barbelés, ruines), jamais par les corps.
- Aucune représentation de l'esclavage ni de scène de violence coloniale. Les mondes non européens (Chine, Amériques précolombiennes,
  Islam, Japon, Afrique) sont montrés **par leur architecture et leur nature**, sans clichés ni exotisme : pas de
  « sauvages », pas de costumes de carnaval.
- Aucun bâtiment moderne identifiable protégé (logos, enseignes, marques) ; **pas d'éclairage nocturne de la tour
  Eiffel** (l'illumination est protégée par le droit d'auteur en France) : la tour est montrée **de jour**.
- Aucune personne réelle reconnaissable dans les décors (les portraits d'illustres ont leur propre pipeline, voir
  `docs/personnages-illustres.md`).
- Aucun texte dans les images (les noms sont ajoutés par le jeu, traduits).

## 3. Spécifications techniques (valables pour toutes les images)

| Point | Valeur |
|---|---|
| **Format de livraison** | **WebP avec transparence** (qualité ≈ 85). Une copie **PNG sans perte** de chaque fichier est gardée à côté, pour retouches. |
| **Détourage** | Fond **transparent propre**, sans liseré clair ni halo ; bords antialiasés. Les parties en contrebas (terre, rocher) font partie du sprite. |
| **Ancrage** | Le sprite est **posé sur le bord bas, centré** ; 4 % de marge en bas et sur les côtés. Un décor ne comporte jamais son propre sol plat. |
| **Résolutions** | Monument : **1024 × 900 px** (affichage ≈ 260 px de large, écrans 3×). Décor : **384 × 384 px**. Exporter aussi la version **×0,5** (512 et 192 px) pour les petits écrans. |
| **Poids cibles** | Monument ≤ **70 Ko** (version 512), ≤ 200 Ko (1024) ; décor ≤ **15 Ko** (192 px). Ensemble des monuments < 3 Mo, chargés **par monde**, à la demande. |
| **Profil colorimétrique** | sRGB. |
| **Nommage** | minuscules, tirets, sans accent — exactement les identifiants du jeu (§4). `monuments/grece.webp`, `monuments/grece@2x.webp`, `decor/olivier.webp`. |
| **Variantes** | Aucune variante « vaincu » à livrer : l'éclat doré est ajouté par le jeu. Pour les monuments qui s'y prêtent, une **variante illuminée** (fanions, torches, fenêtres allumées) est un plus (§4, colonne *Option*). |

## 4. Les 26 monuments (un par monde)

Un monument garde la fin de chaque monde ; c'est **le boss final**. Colonne **Aujourd'hui** : ce que dessine le prototype.
Colonne **Proposition** : le sujet recommandé pour le vrai visuel ; une ligne **⚠** signale un décalage entre le prototype
et le titre du boss, à trancher avant de commander.

Pour chaque monument : cadrage identique (§2–§3), le monument **centré**, avec **son socle naturel** (rocher, terrasse,
douves…), et un **pas de porte ou escalier lisible** au pied, à la hauteur de la pastille du boss.

| Monde (identifiant) | Boss | Aujourd'hui | Proposition (sujet réel et repères) |
|---|---|---|---|
| Monde 0 (`monde0`) | L'épreuve du temps | Tour d'horloge | **Grande tour d'horloge ou sablier monumental** posé sur une terrasse, cadran lisible, rouages dorés. Fantaisie assumée : le monde 0 parle du temps, pas d'une époque. |
| Préhistoire (`prehistoire`) | Le gardien des cavernes | Grotte | **Entrée de grotte ornée** (esprit Lascaux/Chauvet) : falaise calcaire, bouche sombre, **bisons et mains en négatif** sur la paroi visible, feu de camp devant. |
| Égypte et Orient ancien (`orient`) | La pesée des âmes | Ziggurat | ⚠ **Pyramide de Gizeh + pylône de temple** (la pesée des âmes est égyptienne) ; la ziggurat devient un décor secondaire. Sable, Nil au loin. |
| Grèce antique (`grece`) | L'oracle de Delphes | Parthénon | **Parthénon sur son rocher** (Acropole), colonnes dorées, fronton lisible. Alternative : tholos de Delphes, moins reconnaissable. |
| Rome, naissance d'un empire (`rome1`) | Le triomphe romain | Temple | ⚠ **Arc de triomphe romain (type arc de Titus) devant le Forum** (le triomphe), temples et colonnes rostrales en fond. |
| Rome, fin d'un empire (`rome2`) | Le dernier empereur | Colisée | **Colisée**, arènes lisibles, un pan en ruine à droite, ciel chaud de fin de jour. |
| France avant la France (`haut-moyen-age`) | Le défi de Charlemagne | Abbaye | ⚠ **Chapelle palatine d'Aix-la-Chapelle** (octogone et coupole) dans une enceinte carolingienne ; sinon abbaye romane simple. |
| Féodalités (`feodalites`) | Le tournoi des seigneurs | Château fort | **Château fort à donjon carré** sur motte, pont-levis, **lices de tournoi** et tribunes à bannières devant. |
| L'âge d'or capétien (`capetiens`) | L'épreuve des cathédrales | Cathédrale | **Cathédrale gothique** (façade à deux tours, rosace, arcs-boutants), échafaudage et grue en bois discrète. |
| Guerre de Cent Ans (`cent-ans`) | Le siège d'Orléans | Forteresse | **Remparts d'Orléans** et tour fortifiée sur le pont, tentes et bannières anglaises et françaises en fond, **sans combattants**. |
| Les Renaissances (`renaissances`) | Le défi de Léonard | Château de la Loire | **Château de Chambord** (tours, cheminées, lanternon) au bord de l'eau, jardins en terrasse. |
| Guerres de Religion (`religion`) | L'édit de Nantes | Église | ⚠ **Château des ducs de Bretagne à Nantes** (l'édit) : logis blanc et remparts ; un temple et une église, côte à côte, en second plan. |
| Rois absolus (`absolus`) | Le défi du Roi-Soleil | Versailles | **Château de Versailles**, cour d'honneur dorée, bassin et allées de jardins à la française. |
| Monarchie des Lumières (`lumieres`) | Le salon des philosophes | Panthéon | **Panthéon de Paris** (fronton, dôme) ou **hôtel particulier à salon** vitré ; une montgolfière flotte au loin. |
| Révolution, Consulat, Empire (`revolution`) | Le défi de Bonaparte | Bastille | ⚠ **Dôme des Invalides** (Bonaparte) avec **drapeaux tricolores**, ou Bastille à moitié démolie. À choisir : Bastille = 1789, Invalides = Empire. |
| Révolution inachevée (`revolution-inachevee`) | Les barricades | Arc de triomphe | **Arc de triomphe de l'Étoile**, pavés dressés en barricade au premier plan, drapeaux 1830/1848. |
| République et empires (`republique`) | L'Exposition universelle | Tour Eiffel | **Tour Eiffel de jour** dans son parc d'Exposition, pavillons colorés. **Jamais de nuit.** |
| Grande Guerre (`grande-guerre`) | L'épreuve du feu | Fort en ruine | **Fort de Douaumont** ou village et église en ruines, **tranchées en zigzag, cratères et barbelés**. Ciel voilé mais clair. **Aucun corps.** |
| Entre-deux-guerres à 1945 (`entre-deux-guerres`) | Le défi de 1945 | Immeuble Art déco | **Palais de Chaillot** (années 30) ou immeuble Art déco à pylône radio ; **aucun symbole politique de l'époque**. Un détail de paix (colombe, drapeau blanc) est bienvenu pour 1945. |
| Guerre froide et Trente Glorieuses (`trente-glorieuses`) | La course à l'espace | Barres d'immeubles | ⚠ **Fusée type Saturn V sur son pas de tir** (et Spoutnik en vol) ; les barres HLM, la voiture et l'antenne restent en décor. |
| Crises et fin de la guerre froide (`crises`) | Le mur de Berlin | Usine | ⚠ **Porte de Brandebourg avec un pan du Mur** couvert de graffitis colorés (sans texte lisible) — l'usine fermée devient décor. |
| Monde depuis 1991 (`depuis-1991`) | Le défi du présent | Gratte-ciel | **Ville connectée générique** : tours de verre, éoliennes, panneaux solaires, **satellite** au-dessus. Aucun immeuble réel identifiable. |
| Chine impériale — île (`ile-chine`) | La Grande Muraille | Pagode | ⚠ **Grande Muraille avec sa tour de guet** serpentant sur la crête ; pagode en second plan. |
| Amériques précolombiennes — île (`ile-ameriques`) | Le temple du Soleil | Pyramide maya | **Pyramide à degrés** (Chichén Itzá, escalier central), jungle et ciel dégagé. |
| Islam et Empire ottoman — île (`ile-islam`) | Les mille et une nuits | Mosquée | **Mosquée à dômes et minarets** (esprit Soliman ou Sainte-Sophie) avec palmiers et fontaine ; ni calligraphie ni personnages. |
| Japon — île (`ile-japon`) | Le sabre du shogun | Château japonais | **Château de Himeji** (toits étagés blancs), cerisiers, torii à l'entrée. |
| Histoires d'Afrique — île (`ile-afrique`) | L'arbre à palabres | Mosquée de terre | ⚠ **Immense baobab ou arbre à palabres** abritant une place de village ; la mosquée de Djenné en monument voisin (ou version « Afrique de l'Ouest médiévale »). |

> **À trancher avec vous avant la commande** : pour chaque ligne ⚠, garder le prototype (déjà cohérent avec le décor) ou
> adopter la proposition (cohérente avec le titre du boss). Ma recommandation : suivre les propositions ⚠, sauf pour
> `lumieres` et `revolution` où les deux options se défendent.

## 5. Les décors

Petits éléments posés de part et d'autre de la route (384 × 384, ancrés en bas, mêmes règles que §3). **Un lot commun**
sert à plusieurs mondes ; il est tiré au hasard et retourné au miroir, donc **chaque décor doit être lisible en
miroir** (pas de texte, pas de dissymétrie voulue).

### 5.1 Lot « nature » (communs)
`pin`, `chene`, `palmier`, `cyprès`, `olivier`, `baobab`, `acacia`, `bambou`, `cerisier`, `cactus`, `arbre-mort`,
`souche`, `rocher`, `buisson`, `fleurs`, `tulipes`, `roseaux`, `dune`, `champ-de-blé`.

### 5.2 Lot « hommes et époques »
- Préhistoire : `hutte-peaux`, `feu-de-camp`, `mammouth`
- Antiquité : `colonne`, `ruines`, `amphore`, `arche` (aqueduc), `fontaine`, `statue`, `obelisque`, `pyramide-petite`,
  `chameau`, `voilier`
- Moyen Âge : `hutte`, `maison-colombages`, `moulin`, `tour`, `croix`, `tente`, `bannière`, `canon`, `torche`
- Âge classique : `topiaire`, `montgolfière`, `livre`, `lampadaire`, `drapeau-tricolore`, `barricade`
- XIXᵉ–XXᵉ : `cheminée-usine`, `grue`, `voiture`, `barre-hlm`, `antenne`, `peuplier`
- Guerre : `cratère`, `barbelés`, `sacs-de-sable`
- Aujourd'hui : `éolienne`, `panneau-solaire`
- Asie / Japon : `pagode-petite`, `torii`
- Monde 0 : `horloge`, `parchemin`

Soit **≈ 60 décors** ; comme beaucoup servent à plusieurs mondes, c'est **≈ 45 images vraiment distinctes** si l'on garde
la liste actuelle (`js/pathSprites.js` en donne le dessin d'attente de chacun, nom pour nom).

### 5.3 Décors propres à un monde (facultatif, +)
Un ou deux éléments *signature* par monde pour distinguer les mondes voisins (ex. Rome : `colonne-rostrale` ; Renaissance :
`atelier-vinci` ; Trente Glorieuses : `spoutnik`). À définir monde par monde après la phase pilote.

## 6. Fonds et paysages

| Asset | Description | Format |
|---|---|---|
| **Sols** (8 types) | Texture de pré/terrain **tuilable** discrète (herbe, sable, roche, boue, béton…) posée sous le dégradé du monde. | `ground/<type>.webp`, 512 × 512, répétable sans couture, ≤ 40 Ko |
| **Route** | Texture de chemin tuilable (terre, pavé, sable) suivant la courbe de la route. | `ground/route-<type>.webp`, 256 × 256 tuilable |
| **Horizon** (26) | Bandeau panoramique de silhouettes lointaines au sommet de la piste (collines, mer, montagnes, skyline), fondu vers le haut. | `horizon/<monde>.webp`, 1200 × 300, ≤ 60 Ko |
| **Ciel / brume** (3) | Dégradés de ciel (jour clair, brume, soleil couchant) pour moduler l'ambiance d'un monde. | `sky/<nom>.webp`, 1200 × 600 |

Les sols et horizons sont **optionnels pour une première livraison** : le jeu a déjà des dégradés de repli.

## 7. Clio, la mascotte

Une chatte. **Décisions validées (octobre 2026)** :

| Point | Choix |
|---|---|
| **Style** | **Cartoon vectoriel 2D** (SVG) : tête large (≈ 45 % de la hauteur), formes rondes, **contour fin de couleur** (brun roux, jamais noir pur). Le pixel art reste possible pour une variante de Flappy Clio ; le réaliste est écarté. |
| **Pelage** | **Roux tigré**, poitrail, museau et bout des pattes **crème** ; rayures sobres (front, joues, flancs, queue). |
| **Yeux** | **Verts**, grands et ronds, pupille verticale, deux reflets blancs. |
| **Allure** | **Jeune chatte ronde et compacte** (silhouette des premiers croquis), queue en point d'interrogation. Pas de signe distinctif ajouté (la « patte d'encre » est écartée). |
| **Caractère** | Curieuse, un peu savante, jamais moqueuse ; elle **encourage**, ne juge pas. |

Palette figée : pelage `#EE8A3C`, rayures `#C65E1C`, contour `#9C4A17`, crème `#FFF0DA`, intérieur des oreilles
`#F7B3A6`, yeux `#5FB46A`, truffe `#E26F80`, pupilles `#17171F`.

> **Pour la propriété intellectuelle, Clio mérite un créateur humain** (illustrateur·rice) ou au minimum une conception
> très guidée : le droit d'auteur sur des images générées par IA est incertain selon les pays, et Clio est ce que vous
> voudrez protéger (marque, produits dérivés, costumes vendus un jour). Les monuments et décors, eux, peuvent sans souci
> passer par un générateur d'images.

### 7.1 Fiche de personnage (à produire d'abord)
- **Turnaround** : face, ¾ face, profil, dos ; **planche d'expressions** (neutre, content, ravi, surpris, triste, réfléchit,
  fier, endormi).
- **Proportions** et **palette** figées, **taille relative** (Clio = 1 « tête et demie » de haut par rapport à un
  portrait de carte).
- **Silhouette lisible à 48 px** (icône d'écran).

### 7.2 Livrables d'animation (2D en calques — choix recommandé)
Clio est livrée **découpée en calques** (tête, oreilles ×2, yeux ouverts / fermés / contents, bouche ×3, museau,
moustaches, corps, bras ×2, jambes ×2, queue en 2 segments), pour être animée dans le jeu **sans vidéo** (animation
vectorielle de type Rive ou Lottie, ou calques SVG/WebP animés en code). Formats acceptés : **fichier source Rive (.riv)**,
**Lottie (.json)**, ou **calques PNG nommés** avec un fichier de points d'ancrage.

| Animation | Boucle ? | Quand elle joue |
|---|---|---|
| `repos` (respiration, clignement, queue) | oui | écran du Chemin, boutique |
| `marche` | oui | déplacement sur la carte (futur) |
| `content` (saut léger) | non | niveau réussi |
| `ravi` (saut + étoiles) | non | 3 étoiles, boss vaincu, coffre d'équipe ouvert |
| `triste` (oreilles basses) | non | niveau perdu — **toujours doux**, jamais punitif |
| `réfléchit` (patte au menton) | oui | écran de leçon, chargement |
| `salue` (patte levée) | non | accueil, nouvelle journée |
| `dort` | oui | rappel de série quotidienne en péril |
| `essaie` (tourne sur elle-même) | non | essayage d'un costume dans la boutique |
| `danse` | non | album complété |
| `vole` | oui | **Flappy Clio** : vue de profil, tournée **vers la droite**, pattes avant tendues, queue au vent (battement à chaque saut) |

Le jeu pilote ces animations par **états** (`repos` → `content` → `repos`…) : chaque animation commence et finit sur la
pose `repos` pour s'enchaîner proprement.

### 7.3 Costumes (21, un par monde principal)
Chaque costume est une **tenue complète, pour tout le corps** (pas seulement un accessoire) : **un jeu de calques** qui se superpose à Clio (tête / corps / pattes / queue si besoin) avec **points d'ancrage
communs** : un costume est dessiné **une fois par vue** (face, profil — qui sert aussi à la marche et au vol de
Flappy Clio —, dos), puis suit toutes les poses et expressions de cette vue sans redessin. Les prix et la règle d'achat sont dans
`js/rewardsCore.js` ; les noms ci-dessous sont ceux de `ui/fr.json`.

| Monde | Costume | Idée visuelle |
|---|---|---|
| Préhistoire | Peau de mammouth | cape de fourrure brune, collier de dents |
| Égypte | Collier du chat sacré | large collier doré, œil d'Horus, coiffe rayée |
| Grèce | Couronne de lauriers | couronne dorée, courte tunique blanche |
| Rome I | Armure de légionnaire | casque à crête, cuirasse, bouclier ovale |
| Rome II | Toge d'empereur | toge pourpre, couronne de laurier d'or |
| Haut Moyen Âge | Manteau mérovingien | grand manteau bordé, fibule ronde |
| Féodalités | Cotte de mailles | mailles grises, surcot, petit heaume |
| Capétiens | Cape fleurdelisée | cape bleue aux lys d'or |
| Guerre de Cent Ans | Armure de Jeanne | armure claire, bannière (**sans** visage de Jeanne d'Arc) |
| Renaissances | Pourpoint de Léonard | pourpoint, béret, carnet de croquis |
| Religion | Fraise et pourpoint | collerette blanche, pourpoint sobre |
| Rois absolus | Perruque du Roi-Soleil | grande perruque, manteau doré |
| Lumières | Habit de philosophe | redingote, plume d'oie, perruque poudrée |
| Révolution | Bonnet phrygien | bonnet rouge, cocarde |
| Révolution inachevée | Haut-de-forme | haut-de-forme, redingote |
| République | Costume Belle Époque | canotier, nœud papillon |
| Grande Guerre | Casque Adrian | casque bleu horizon, **sans arme ni uniforme complet** |
| Entre-deux-guerres | Tenue des années folles | cloche, long collier de perles |
| Trente Glorieuses | Combinaison spatiale | casque bulle, drapeau étoilé neutre |
| Crises | Perfecto des années 80 | blouson, lunettes, walkman |
| Depuis 1991 | Tenue connectée | casque audio, lunettes lumineuses |

Chaque costume est livré **avec une icône carrée de boutique** (256 × 256, Clio habillée de face, fond transparent).

## 8. Interface et récompenses

| Asset | États / variantes | Format |
|---|---|---|
| **Pièce** | brillante, tournante (animation 8 images) | 128 × 128 |
| **Étoile** | pleine, vide, brillante (éclat) | 128 × 128 |
| **Coffre d'équipe** | fermé, entrouvert, ouvert (lumière), vide | 512 × 512 |
| **Pastille de niveau** | verrouillée, à jouer, réussie ; boss (couronne) dans les 3 états | 256 × 256 |
| **Cadre de carte de personnage** | commune, rare, légendaire (dos de carte commun) | 600 × 840 |
| **Icônes de monde** (26) | une par monde, carrées, lisibles à 32 px | 256 × 256 |
| **Série de victoires** | flamme froide / chaude / en feu | 128 × 128 |
| **Boutique / album / équipe** | trois pictogrammes de bouton | 128 × 128 |
| **Couronne de boss** | normale, dorée | 256 × 256 |

## 9. Priorités de production

| Phase | Contenu | Objet |
|---|---|---|
| **0 — Pilote** | 3 mondes : **Grèce**, **Féodalités**, **Grande Guerre** (monument + 6 décors chacun + sol + horizon) ; fiche de Clio | Valider le **style**, la cohérence, le poids ; ajuster ce guide |
| **1 — Monuments** | Les 26 monuments | Le « effet waouh » du Chemin |
| **2 — Décors** | Lot nature, lot époques (≈ 45 images) | Peupler les paysages |
| **3 — Clio** | Fiche, calques, 10 animations de base | Mascotte vivante |
| **4 — Costumes** | 21 costumes | Boutique de Clio |
| **5 — Finitions** | Sols, routes, horizons, ciels, icônes de monde, UI, variantes illuminées | Cohérence globale |

**Critère de passage de chaque phase** : le jeu tourne **hors ligne**, le poids ajouté est dans le budget (§3), le texte
du boss reste lisible sur le décor, et **un enseignant reconnaît l'époque sans la légende**.

## 10. Briefs pour un générateur d'images

À adapter à l'outil (Midjourney, générateurs d'OpenAI, Flux, Firefly…). Les générateurs répondent mieux en anglais.

### 10.1 Préfixe de style (à coller en tête de **chaque** prompt, inchangé)
> *stylized 3D-look game illustration, soft rounded volumes, clean flat-shaded materials with subtle gradients, no outlines,
> single warm sunlight from top-left, bright friendly palette, medium saturation, ¾ top-down view at 35 degrees, centered
> object isolated on plain neutral background, no ground shadow, no text, no logo, no people, mobile game map asset*

### 10.2 Gabarit monument
> *[préfixe]* **+** *[sujet précis du §4 — par ex. "Parthenon on a rocky acropolis, golden columns, readable pediment"]* **+**
> *"tall landmark centered, wide steps at its base, readable at 90 px wide, 4:3.5 composition"*

### 10.3 Gabarit décor
> *[préfixe]* **+** *"single [objet], small prop, fully visible, symmetrical enough to be mirrored, tight crop, 1:1"*

### 10.4 À exclure (négatif / vérification)
*photorealistic, dark moody lighting, gore, blood, weapons pointed at viewers, soldiers, text, letters, signature,
watermark, logo, brand, nazi or hate symbols, night lighting of the Eiffel Tower, modern identifiable skyscrapers,
heavy black outline, fisheye, extreme perspective.*

### 10.5 Cohérence entre les 26 monuments
1. Générer **un monde à la fois**, avec le même préfixe, la **même graine**/image de référence quand l'outil le permet.
2. Partir du **premier monument validé** comme image de style pour tous les suivants.
3. Contrôler chaque lot sur une **planche contact** : même caméra, même lumière, même échelle.
4. Détourer et nettoyer à la main (les bords sont le défaut le plus visible).
5. Garder la **requête exacte** et l'outil utilisé pour chaque image (traçabilité des droits).

## 11. Droits, éthique, conformité

- **Licence** : avant tout achat/génération, vérifier que l'outil ou la banque d'images autorise **l'usage commercial
  dans une application**, pour toutes les images livrées, **sans** obligation d'attribution gênante. Conserver les
  conditions d'utilisation **à la date de génération**.
- **Droit d'auteur de l'IA** : les images générées pourraient ne pas être protégeables ; **à éviter pour Clio**, et à
  accepter en connaissance de cause pour les décors et monuments.
- **Banques gratuites** (Kenney, Quaternius, etc.) : prendre le **CC0** de préférence (aucune attribution), sinon noter
  les mentions à ajouter à l'écran « À propos ».
- **Mineurs** : aucun contenu violent, aucun réalisme gênant ; revue finale du lot **Grande Guerre**, **Religion**,
  **Révolution**, **Entre-deux-guerres** par un enseignant d'histoire.
- **Exactitude** : faire relire les 26 monuments par vous (ou un collègue) avant intégration ; un anachronisme (ex. une
  ampoule électrique en 1450) se corrige plus vite avant qu'après.
- **App Store** : le contenu historique sensible (symboles interdits, violences) est le premier motif de rejet : le §2.2
  est écrit pour l'éviter.

## 12. Intégration dans le jeu (ce que je fais une fois les images livrées)

1. Dépôt dans `assets/path/` selon le nommage du §3 (`monuments/`, `decor/`, `ground/`, `horizon/`, `clio/`).
2. `js/pathSprites.js` reste le **repli** : si l'image d'un monument ou d'un décor est absente, le dessin SVG actuel
   s'affiche. On peut donc livrer **monde par monde**, sans casser l'écran.
3. Chargement **par monde et à la demande**, version ×1 ou ×2 selon l'écran, et mise en cache hors ligne par le service worker
   (le budget de §3 en est la limite).
4. Placement, éclat d'un monde terminé, grisaille d'un monde fermé : **inchangés** (déjà codés, `js/pathScenery.js`).
5. Clio : lecteur d'animations par états + essayage de costumes sur la boutique, l'écran de fin de niveau et le Chemin.
6. Tests : un test vérifie que **chaque fichier cité existe**, que les **poids respectent le budget**, et que le jeu
   se charge **hors ligne** (pas d'image distante).
