# HistoriAxe

Le Quiz Chronologique — PWA & app iOS native (Capacitor).

## Backend — Classement mondial & synchronisation cloud

Le Défi du jour dispose d'un vrai backend (fonctions serverless Vercel +
Postgres) : classement mondial validé côté serveur, et sauvegarde cloud de
la progression (XP, badges, série, points faibles/SRS, favoris, contenu
personnalisé).

### 1. Créer une base Postgres

N'importe quel Postgres fonctionne (le code utilise `pg`, aucune dépendance
propriétaire). Deux options gratuites qui s'intègrent bien à Vercel :

- **[Neon](https://neon.tech)** — créez un projet, copiez la *connection
  string* (`postgres://...?sslmode=require`).
- **[Supabase](https://supabase.com)** — créez un projet, Project Settings →
  Database → Connection string (mode "Transaction" recommandé pour du
  serverless).

### 2. Configurer Vercel

Dans votre projet Vercel → **Settings → Environment Variables**, ajoutez :

| Variable       | Valeur                                             |
|----------------|-----------------------------------------------------|
| `DATABASE_URL` | La connection string Postgres de l'étape précédente |

C'est la **seule** variable requise. Les tables (`players`, `daily_scores`,
`weekly_challenge_scores`, `player_progress`) sont créées automatiquement au
premier appel d'une fonction API (voir `api/_lib/db.js: ensureSchema`) —
aucune migration manuelle n'est nécessaire. Le schéma est aussi documenté
dans `api/_lib/schema.sql` si vous préférez l'exécuter vous-même.

Redéployez (ou déclenchez un nouveau déploiement) après avoir ajouté la
variable.

### 3. App native iOS (Capacitor)

La PWA web fonctionne sans réglage supplémentaire (elle appelle `/api/...`
sur son propre domaine). L'app iOS/Android, elle, charge ses pages depuis un
bundle local (`capacitor://localhost` / `https://localhost`) : il faut donc
indiquer explicitement l'URL de votre déploiement Vercel avant de builder
l'app native, dans `js/apiClient.js` :

```js
var NATIVE_APP_API_BASE_URL = 'https://votre-projet.vercel.app';
```

Puis `npm run cap:build:ios`.

**Privacy Manifest (obligatoire à la soumission App Store depuis 2024) :**
`ios/App/App/PrivacyInfo.xcprivacy` est fourni (déclare les APIs "required
reason" UserDefaults/FileTimestamp utilisées indirectement par les plugins
Capacitor, et l'absence de tracking). Le format du projet Xcode généré ici
(objectVersion 48, pré-Xcode 16) ne référence pas automatiquement les
fichiers ajoutés au dossier — avant de builder/soumettre, ajoutez-le une
fois dans Xcode : clic droit sur le groupe "App" → *Add Files to "App"...*
→ sélectionner `PrivacyInfo.xcprivacy` (target "App" coché).

### Comment fonctionne l'anti-triche du Défi du jour (et du Défi hebdomadaire)

Le score n'est **jamais** envoyé par le client. Pendant la partie, chaque
placement de carte ({ intervalle choisi, temps de réponse }) est journalisé
(`js/app.js: dailyRoundLog`/`weeklyChallengeRoundLog`, rempli dans
`checkPlacement`). À l'envoi, seul ce journal brut est transmis à
`POST /api/scores` (Défi du jour) ou `POST /api/weeklyScores` (Défi
hebdomadaire), qui :

1. retrouve les 10 (ou 30, pour l'hebdomadaire) événements du tirage pour la
   langue donnée, à partir des vraies dates de `data/<lang>.json` ;
2. rejoue la partie coup par coup avec `js/dailyEngine.js` (le même module
   que le client, partagé pour ne jamais diverger) ;
3. enregistre le score ainsi recalculé, en ne conservant que le meilleur par
   joueur/jour (ou semaine ISO)/langue.

Modifier le score en local (DevTools, JS altéré...) n'a donc aucun effet :
le serveur ne fait jamais confiance à un score, seulement aux actions.

Le Défi hebdomadaire (`js/weekly.js`, `api/_lib/weeklyChallenge.js`,
`api/weeklyScores.js`, `api/weeklyLeaderboard.js`) est un miroir volontaire
du Défi du jour plutôt qu'une généralisation des mêmes fichiers : plus
difficile (30 événements au lieu de 10), tiré une fois par semaine ISO
(`DailyEngine.getWeeklySeedString`, frontière UTC identique à
`getDailySeedString`) plutôt qu'une fois par jour, mais mêmes règles de jeu
(3 vies, chronométré) et même mécanisme anti-triche. Accessible depuis le
bouton « Défis » de l'écran des catégories, qui déplie un choix entre les
deux plutôt que de lancer directement le Défi du jour comme auparavant. Les
deux thèmes exclus du tirage (calendrier non grégorien — voir
`DailyEngine.EXCLUDED_THEME_IDS`) et les séries consécutives (Défi du jour :
7 jours, trophée « Flamme Éternelle » ; Défi hebdomadaire : 4 semaines,
trophée « Pilier Hebdomadaire », `WEEKLY_CHALLENGE_STREAK_KEY` dans
`js/storage.js`) suivent le même principe des deux côtés, en parallèle plutôt
qu'en partagé — les deux défis ne tournent jamais en même temps, mais des
états séparés évitent toute ambiguïté dans les écrans/journaux partagés
(récap, sync cloud...).

### Points volontairement laissés pour une itération ultérieure

- **Sign in with Apple / Game Center** : intégration native (entitlements
  Xcode, revue App Store) — l'identité actuelle (UUID d'appareil + pseudo)
  couvre déjà le classement mondial et la sync, ceci s'ajouterait en option.
- **Vraie promotion/relégation de ligue** (paliers façon Bronze/Argent/Or
  persistés d'une semaine à l'autre) : la ligue hebdomadaire actuelle
  (`api/league.js`) recalcule un groupe à la volée par hash déterministe et
  réinitialise le classement chaque semaine ISO — volontairement sans job
  planifié ni table de cohortes, voir la section Rétention ci-dessous. Une
  vraie échelle de paliers persistés est un chantier ultérieur.
- **Fusion multi-appareils de la progression** : le modèle actuel est
  "dernière écriture gagne" (voir `api/sync.js`) — suffisant pour la sauvegarde
  de secours / changement d'appareil, pas encore une vraie fusion.
- **Capacitor 7** : les dépendances sont encore en v6 (`^6.0.0`). La v7
  ajoute le support iOS 18/Xcode 16 (SDK le plus récent, régulièrement
  exigé par Apple à la soumission) mais implique une migration native
  (Swift Package Manager, `pod install`/Xcode) qui ne peut être vérifiée
  que sur un Mac avec Xcode — à faire et tester avant une soumission App
  Store.
- **Compression des images** (`assets/`, ~34 Mo, essentiellement des JPEG
  non optimisés) : un passage en WebP/AVIF réduirait sensiblement le poids
  au téléchargement, un facteur de conversion sur l'App Store. Nécessite
  un outil de conversion (`cwebp`/`sharp`) non disponible dans tous les
  environnements et une vérification visuelle par image avant de committer.
- **Télémétrie/monitoring** (crashs, rétention J1/J7/J30, thèmes qui
  plantent) : volontairement absent — le choix d'un prestataire (Sentry,
  Plausible, Firebase Analytics...) engage la politique de confidentialité
  de l'app et mérite une décision produit, pas un ajout silencieux d'un
  service tiers qui recevrait des données de tous les joueurs.
- **`js/app.js` (185 Ko, variables globales)** : une migration vers des
  modules ES (`type="module"`, imports explicites) réduirait le risque de
  régression du type "fonction supprimée par erreur lors d'un refactor"
  (déjà vu dans l'historique du projet), mais doit se faire fichier par
  fichier avec une suite de tests qui couvre chaque mode de jeu — pas en
  un seul passage, sous peine d'introduire exactement ce genre de
  régression.

## Rétention — onboarding, notifications, série, ligues & duels

- **Onboarding guidé** (`js/onboarding.js`) : 4 bulles d'aide contextuelles
  (coach-marks) sur les 3 premières minutes d'un nouvel arrivant. Purement
  local, aucun réglage requis. Rejouable depuis Réglages → « Revoir le
  tutoriel ».
- **Notifications locales** (`js/notifications.js`, plugin
  `@capacitor/local-notifications`) : rappel de série en péril, Défi du jour
  disponible, récap hebdo prêt, nudge de duel. Actives uniquement dans l'app
  native iOS (no-op silencieux sur le web/PWA — aucune API de notification
  programmée fiable n'existe côté navigateur sans backend push). Après
  `npm install`, un `npx cap sync ios` est nécessaire pour que le projet Xcode
  embarque le nouveau plugin.
- **Multiplicateur d'XP lié à la série** (`js/gamification.js:
  getStreakXpMultiplier`) : de ×1.0 à ×2.0 selon la série quotidienne en
  cours, retombe à ×1.0 dès qu'un jour est manqué — volontairement sans « gel
  de série » pour garder un vrai enjeu de perte.
- **Récap hebdo/mensuel** (`js/recap.js`) : XP gagné, parties gagnées, jours
  actifs, comparaison à la période précédente. Entièrement local (journal
  compact dans `localStorage`, purgé au-delà de 35 jours), proposé
  automatiquement une fois par semaine ISO.
- **Ligue hebdomadaire** (`api/league.js`, table `weekly_xp`) : classement
  d'un groupe d'une trentaine de joueurs par XP gagné cette semaine. Le
  groupe est recalculé à la volée par hash déterministe
  (`player_id` + semaine ISO), sans job planifié ni table de cohortes — voir
  le commentaire en tête du fichier pour les limites connues de cette
  approche volontairement légère.
- **Duels asynchrones entre amis** (`api/duels.js`, table `duels`) : lien/code
  court à partager depuis la modale de résultats du Défi du jour, comparaison
  de score une fois l'adversaire ouvert le lien et joué. Sans infrastructure
  de push serveur (choix assumé pour rester livrable sans APNs), la détection
  « tu as été dépassé » se fait au mieux, à l'ouverture de l'app.

Ces fonctionnalités réutilisent l'infrastructure existante (`DATABASE_URL`,
`api/_lib/db.js: ensureSchema`) : aucune nouvelle variable d'environnement
n'est requise.

## Sommaires (fiches de synthèse dépliables)

Un thème peut porter, à côté de ses événements, un **sommaire**
(`js/mindMap.js`, écran `#screen-mindmap`) : une fiche de révision en
branches et sous-branches dépliables. Sommaires disponibles (CAPES &
Agrégation) : « Les Amériques (1550-1660) » et « Vivre à la campagne en
France (1815-1970) ».

Il se prend par la carte « Découverte » de l'écran des modes : pour un
thème qui propose un sommaire, elle ne lance plus la frise au premier tap
mais déplie un choix entre les deux, Frise à gauche et Sommaire à droite —
même principe que le bouton « Défis » de l'écran des catégories. Les
thèmes sans sommaire, c'est-à-dire presque tous, gardent « Découverte »
telle qu'elle était.

Le vocabulaire diffère volontairement entre l'interface et le code :
« sommaire » à l'écran, `mindMap`/`carteMentale` dans les fichiers et les
packs de données, où le terme d'origine est resté plutôt que de réécrire
des centaines de lignes de contenu au profit d'un synonyme.

Il complète la frise sans la remplacer : la frise ordonne par dates, le
sommaire donne la structure thématique (ce qui se joue en parallèle, les
notions transversales, les séries d'exemples comparables d'un empire à
l'autre) que l'ordre chronologique ne montre jamais.

Deux liens le rattachent au reste du jeu plutôt que d'en faire un document
isolé :

- une pastille **« Réviser cet axe »** en bas de branche ou de sous-branche
  prépare exactement l'état de l'écran des axes (voir `js/app.js:
  confirmAxesSelection`) et renvoie sur le choix des modes, filtré sur ce
  seul axe ;
- un **repère chronologique** qui correspond à un événement du thème
  (`eventId`) ouvre sa fiche, la même que depuis la frise.

### Format des données

Le sommaire est un champ facultatif `carteMentale` du thème, dans
`data/<lang>.json` — jamais du HTML : le pack de données ne contient que du
texte, mis en forme par `js/mindMap.js`. C'est ce qui lui permet de suivre
le thème clair/sombre, la taille de texte et la langue de l'interface, là
où un document HTML autonome resterait figé. Le seul balisage accepté dans
un texte est `**gras**` et `*italique*` (titres d'ouvrages).

```jsonc
"carteMentale": {
  "sousTitre": "Histoire moderne — thème d'agrégation",
  "esprit": "Le chapeau de la fiche : ce que le thème demande de savoir.",
  "branches": [
    {
      "titre": "Appropriation et exploitation des ressources",
      "couleur": "gold",          // palette d'axes (AXIS_PALETTE, js/app.js)
      "axe": "Économie coloniale, mines et traite",  // pastille de révision
      "intro": "Une phrase de cadrage.",
      "sousBranches": [
        {
          "titre": "Ressources exportées et économies locales",
          "axe": "…",             // facultatif, si la sous-branche vise un autre axe
          "intro": "…",           // facultatif, une phrase avant la liste
          "items": ["**Métaux précieux** : argent de Potosí…"],
          "tags": ["grandir", "apprendre"]   // au lieu d'items : mots non hiérarchisés
        }
      ]
    },
    {
      "titre": "Repères chronologiques",
      "couleur": "purple",
      "reperes": [
        { "date": "1550-1551", "texte": "Controverse de Valladolid.", "eventId": "a1" }
      ]
    }
  ]
}
```

Une branche porte soit des `sousBranches`, soit des `reperes` ; une
sous-branche porte des `items` rédigés, ou des `tags` — une série de mots
rendue en pastilles, pour une liste que rien ne hiérarchise. Les deux
références vers le reste du thème — l'`axe` d'une (sous-)branche et
l'`eventId` d'un repère — sont validées par `tests/data-schema.test.js` :
une référence morte casse les tests au lieu de ne se voir qu'en dépliant la
bonne branche au bon endroit de l'app.

## Longueur de la manche

Jusqu'ici, **une partie valait le thème entier**. Médiane de 18 événements,
donc sans conséquence la plupart du temps — mais 119 thèmes (14 %) en
comptent plus de 40, « Histoire de France » 217 et « Inventions et
découvertes » 400. Avec 3 vies, les terminer est hors d'atteinte : les
thèmes les plus riches de la base étaient précisément les moins jouables, et
rien dans l'interface ne le laissait deviner avant de lancer la partie.

Un sélecteur **10 / 20 / 50 / Tout (N)** s'affiche donc sous l'en-tête de
l'écran des modes (`js/app.js: renderRoundLengthPicker`). Il est placé là,
au-dessus des modes, parce qu'il les concerne tous : c'est un cadrage de la
partie à venir, pas un mode de plus.

**La valeur par défaut est 20, et ce n'est pas neutre.** Laisser « Tout »
par défaut n'aurait rien réglé pour qui ne trouve pas le réglage — or c'est
exactement le joueur que le problème atteint. 20 passe au-dessus de la
médiane, si bien que la majorité des thèmes ne bouge pas, tout en bornant
les gros. « Tout » reste à un tap, et le choix est retenu (il appartient au
joueur, pas au thème).

Trois précisions qui expliquent le code :

- Les événements d'une manche sont **tirés au sort dans tout le thème**,
  jamais pris en tranche chronologique : sinon la fin d'un gros thème ne
  serait jamais jouée.
- Le sélecteur **suit le vivier réellement disponible**, filtre d'axes et
  ⭐ Incontournables compris — « 20 » disparaît dès que l'axe choisi n'a que
  14 événements — et **s'efface entièrement** sous 11, où les quatre choix
  joueraient la même partie.
- « 10 » et « 20 » n'apparaissent que sur un thème **strictement plus grand**
  qu'elles : à 20 pile, « 20 » et « Tout (20) » joueraient la même partie, et
  121 thèmes du pack français ont exactement 20 événements — deux boutons
  identiques partout. **« 50 » fait exception** : son seuil se lit « au
  moins 50 événements », il est donc proposé dès 50, y compris à 50 pile (29
  thèmes), où il joue la même partie que « Tout (50) ». La redondance y est
  voulue ; un seul des deux boutons est alors actif, celui que le joueur a
  choisi (`activeRoundLengthChoice`). La règle vit dans
  `roundLengthChoicesFor` : toute longueur ajoutée plus tard suit la règle
  stricte, sauf à figurer dans `ROUND_LENGTH_INCLUSIVE`.
- **La Découverte garde le thème entier** : c'est une consultation, et une
  frise amputée n'a pas de sens. Les Défis (jour, hebdomadaire,
  simultanéité) et la Révision ont chacun leur propre longueur et ne sont
  pas concernés non plus.

L'historique des scores enregistre désormais la longueur jouée (`rounds`) et
l'affiche sous le nom du mode : un score sur 10 et un score sur 217 ne se
comparent pas, et les présenter dans la même colonne sans le dire serait
trompeur. Les scores enregistrés avant cette version n'ont pas ce champ et
n'affichent donc rien plutôt qu'une longueur inventée.

Au passage, les sept modes qui piochent dans un thème partageaient le même
bloc recopié à l'identique (« les événements du thème, ou de la révision,
moins ceux qu'une Sélection a écartés »). Il vit maintenant dans
`getModePoolRaw` / `getSessionPool`, ce qui donne un seul endroit où la
longueur de manche s'applique.

## Quatre modes fabriqués depuis les seules dates

`js/gameModes.js` réunit les générateurs de **Remise en ordre**, **Blitz**,
**Le curseur** et **L'intrus**. Un seul module parce qu'ils partagent leur
nature : aucun ne demande une ligne de contenu nouvelle, tous fabriquent
leurs questions à partir des dates déjà présentes. Comme
`js/simultaneity.js`, il ne touche ni au DOM ni à `window` et tourne donc
sous `npm test` — l'écran et le score de chacun vivent, eux, dans
`js/app.js`.

Ce que chacun entraîne diffère, et c'est tout l'intérêt de les avoir côte à
côte :

| Mode | Ce qu'il demande | Ce qui le distingue |
|---|---|---|
| **Remise en ordre** | L'ordre relatif de 5 événements d'un coup | La frise n'en fait insérer qu'un dans une suite déjà triée |
| **Blitz 60 s** | « X avant Y ? », le plus vite possible | Pas de vies : le chronomètre est la contrainte |
| **Le curseur** | La date, estimée plutôt que sue | « Le fil du temps » exige l'année exacte, « Périodes » un siècle parmi quatre |
| **L'intrus** | Reconnaître ce qui ne cadre pas | Aucune date affichée : c'est le sens de l'époque |

### Remise en ordre

Cinq cartes mélangées, **sans leurs dates**. L'interaction est le toucher
seul, jamais le glisser-déposer : on touche les cartes du plus ancien au
plus récent et un rang s'inscrit sur chacune ; retoucher une carte rangée la
retire et décale les suivantes. Le glisser-déposer aurait été plus joli et
inutilisable au clavier, pénible au doigt sur une liste qui défile, et cassé
par les lecteurs d'écran — pour un gain nul, puisque l'ordre se dit aussi
bien en touchant.

La vie se perd au tout ou rien (comme Avant/Après et Périodes & Ères), mais
le score suit le nombre de rangs justes : une manche ratée de peu ne vaut
pas une manche ratée de tout. Le nombre de manches dépend des **dates
distinctes** du vivier, pas de sa taille : un thème resserré comme
« Régimes autoritaires » (72 événements sur 21 ans) n'en produit que deux ou
trois, et c'est la réponse honnête.

### Blitz 60 secondes

Le format court qui manquait : le plus rapide jusqu'ici était le Défi du
jour, dix cartes, et une partie de thème peut en faire soixante-douze.

Pas de vies — une erreur coûte **trois secondes**, ce qui punit la réponse
au hasard sans jamais interrompre la partie. La série de questions est
**exactement moitié vraie, moitié fausse** : tirée à pile ou face, elle
pencherait assez souvent pour qu'un joueur pressé gagne à répondre toujours
la même chose. Et une partie de blitz ne se perd pas : elle se termine, le
score dit ce qu'elle valait.

C'est le seul des quatre à prendre le **vivier entier** plutôt qu'une manche
(voir « Longueur de la manche ») : sa longueur est donnée par l'horloge, pas
par un nombre de cartes, et le borner à dix ferait tourner les mêmes paires
pendant une minute.

### Le curseur

L'échelle et la tolérance sont calculées sur le thème
(`GameModes.sliderScaleFor`) : **±2 ans** sur un thème de vingt ans, **±60**
sur un thème qui traverse l'Antiquité. La tolérance doit suivre ce que le
thème demande de savoir. L'échelle déborde le vivier des deux côtés, sans
quoi les événements extrêmes se devineraient en poussant le curseur à fond,
et le curseur repart du milieu à chaque manche pour ne pas laisser d'indice.

Le barème se mesure à la **tolérance**, jamais à la longueur de l'échelle :
pile = 1, à la tolérance = 2/3, au-delà de trois fois = 0. Rapportée à
l'échelle, une réponse fausse de trois siècles sur « Histoire de France »
(6 600 ans couverts) gardait encore 96 % des points.

### L'intrus

Deux familles de questions, parce qu'un thème réunit ses événements de deux
façons et qu'un mode qui n'en connaîtrait qu'une passerait à côté de la
moitié de la base :

- **période** — trois événements voisins dans le temps, un quatrième à
  l'écart. L'écart exigé est un **multiple de l'étalement du trio**, jamais
  une valeur absolue : un thème de vingt ans et un de trois millénaires
  n'ont pas la même idée de « loin » ;
- **axe** — trois événements du même fil thématique, un quatrième d'un
  autre. Ne s'applique qu'aux thèmes dont les événements portent un axe
  (85 % de la base).

L'énoncé dit toujours de quelle famille il s'agit, sans quoi la question
serait indécidable. Le révélé montre les dates que la question cachait et
rappelle ce qui liait les trois autres — sans lui, le joueur qui se trompe
n'apprendrait rien.

### Une contrainte commune : l'échelle historique

Les quatre modes **comparent** des dates, et une seule valeur hors échelle
fausse tout ce qu'ils construisent. Sur « Histoire de France », trois
événements préhistoriques étiraient l'échelle du Curseur de −486162 à
38186, avec une tolérance de ±22601 ans — un curseur sur lequel tout le
XXᵉ siècle tenait dans un pixel.

Ces modes écartent donc les dates au-delà de ±10000 (même seuil que
`js/app.js: LONG_YEAR_THRESHOLD` et que `js/simultaneity.js`). Mesuré :
**50 événements sur 19 781** (0,25 %), répartis sur 13 thèmes, et **aucun
thème ne descend sous son minimum jouable** en les retirant. Ils restent
parfaitement jouables sur la frise et dans tous les autres modes.

## L'Atlas : tous les événements sur une carte

Une carte du monde qu'on zoome au doigt, avec tous les événements qui ont un lieu (un peu
plus de la moitié de la base) : `js/atlas.js` (l'écran et la carte) et `js/atlasCore.js`
(la logique, testable sans navigateur). On y entre par la cinquième action rapide de l'écran
des catégories, ou par « 📍 Voir sur la carte » dans une fiche. Ce n'est pas un mode de jeu,
c'est une vitrine, comme la galerie des portraits.

**Les points** viennent de `assets/geo/events-geo.json` : `{ "thème:id": [lat, lon, "s|v|z",
libellé, drapeau] }`. La précision dit ce qu'est le point : `s` un site (monument, champ de
bataille), `v` une ville, `z` une zone (une région, pour la seule carte de découverte). Le drapeau
vaut 1 quand le lieu est discutable (création ≠ lieu évoqué par le titre, emplacement
disputé, déduit de mémoire) : l'Atlas le signale (« lieu approximatif »), et le futur mode de
jeu les écartera. Le fichier est produit par `scripts/geo/` (voir son README) ; l'Atlas n'écrit rien
dedans.

**Un point par fait.** Un même fait figure souvent dans plusieurs thèmes (voir « Vu aussi dans… »,
`js/linkedEvents.js`) : sur la carte il n'a qu'un point, et le toucher ouvre la fiche la plus
pertinente du groupe (`AtlasCore.scoreEntry` : une description développée sans excès, un titre
qui porte un seul fait, un thème généraliste — le même critère que le pipeline), d'où les boutons
« Vu aussi dans… » mènent aux autres. **Une pile par lieu** : Paris porte plus de 300 événements
au même endroit ; ils forment une pile (un point, un compteur) dont le toucher ouvre la liste,
triée par date.

**Filtres.** Les catégories (puces), l'époque (deux curseurs et cinq préréglages). Le curseur est
gradué par tronçons égaux (−450 000, −10 000, −3 000, −500, 0, 500, 1000, 1500, 1800, 1900, 2030) :
sur une échelle linéaire, 99 % de la course serait la préhistoire.

**La carte.** MapLibre GL (`assets/vendor/maplibre-gl/`, BSD-3), chargé à l'ouverture de l'Atlas
seulement ; fond vectoriel OpenStreetMap servi par OpenFreeMap (gratuit, sans clé, noms de lieux en
français quand OSM les connaît). **Il faut du réseau pour le fond** ; hors-ligne, les points
s'affichent sur fond uni. « © contributeurs OpenStreetMap » est porté par le contrôle de la carte
et doit y rester : les points eux-mêmes sont dérivés d'OSM (Nominatim), donc soumis à l'ODbL.

**Tests.** `tests/atlasCore.test.js` (fiche choisie, piles, filtres, échelle du temps, et sur la vraie
base : un événement n'est que dans un fait, coordonnées valides) ; `tests/geo.test.js` (le fichier
de points) ; `e2e/atlas.spec.js` (commandes, feuille, fiche, « Voir sur la carte »). La carte
elle-même (WebGL, réseau) n'est pas exercée par les e2e.

**Recherche.** Un champ en haut de l'Atlas cherche dans les titres et les noms de lieux (sans accents
ni casse, mots dans n'importe quel ordre, dès 2 lettres), hors connexion puisque tout est dans le
modèle déjà chargé. Les lieux sont regroupés par nom, puis viennent les événements (titre commençant par
la requête d'abord). Choisir un résultat lève les filtres d'époque/catégorie qui le cacheraient, cadre la
carte et ouvre la feuille ; Entrée prend le premier résultat, Échap efface. Logique : `searchAtlas` dans
`js/atlasCore.js` (`tests/atlasCore.test.js`), écran dans `js/atlas.js` (`e2e/atlas.spec.js`).

**Disposition.** Sur écran large (≥ 900 px), la fiche et les filtres s'affichent dans une colonne à gauche
(comme Google Maps) au lieu de masquer le centre de la carte ; le bouton ▤ de la colonne les remet en bas, et
le choix est mémorisé (`historiaxe_atlas_layout`). Sur téléphone, toujours en bas.

**Grandes catastrophes de transport** (`thm_catastrophes_transport`, catégorie « Société et Géopolitique ») :
54 événements en quatre axes — maritimes et fluviales, aériennes et spatiales, ferroviaires, routières et
terrestres. Les données et leurs points sont dans `scripts/transport/events.py` ; `python3
scripts/transport/build_theme.py` les écrit dans `data/fr.json` et `assets/geo/events-geo.json` (relançable). Treize
événements existaient déjà dans d'autres thèmes (aviation, espace, littoraux…) : ils reprennent leur lien Wikipédia,
donc leur point et leur « Vu aussi dans… ». Les autres liens sont des recherches Wikipédia sur le titre de l'article.

## Le Mode Carte : poser l'événement sur la carte

Deux temps par question, comme avant : « Où ? » puis « Quand ? » (quatre dates, inchangé).
Le « Où ? » se joue désormais sur une **carte sans aucun nom** (le fond OpenFreeMap de l'Atlas,
dont on retire toutes les couches de texte) : on pose un repère, on valide, la carte montre le
vrai lieu et la distance.

- **Points** : 80 de base × `exp(−d / D)` × combo. `D` s'adapte à la zone jouée (étendue 5ᵉ‥95ᵉ
  centile des lieux du thème ÷ 12, entre 25 et 2 500 km : environ 1 300 km pour le monde,
  120 km pour la France). Tolérance avant pénalité : 1,5 km pour un site, 10 km pour une ville.
  Aucun bonus de vitesse.
- **Verdict** : très bon ≥ 60 % des points (le combo monte), raté < 25 % (le combo retombe, une
  vie est perdue), entre les deux rien ne bouge.
- **Questions** : seulement les faits au lieu sûr (site ou ville, sans drapeau « discutable »),
  un par fait lié entre thèmes, deux au plus par lieu et par partie. Logique pure dans
  `js/geoPlace.js` (`tests/geoPlace.test.js`), écran dans `js/geoMap.js` (`e2e/carte.spec.js`).
- **Clavier** : la carte se pilote aux flèches ; Entrée pose le repère au centre.
- Le mode exige le réseau (tuiles de la carte).

## « Qui est-ce ? » et le portrait du jour

Les portraits des panthéons permettent un mode que rien d'autre dans la base n'autorise :
mettre un nom sur un visage. Un portrait, quatre noms, trois vies, dix portraits
(`js/gameModes.js: buildWhoQuestions`, comme les quatre modes ci-dessus : aucune donnée à
écrire). La carte n'apparaît que pour un thème dont au moins huit figures ont un portrait —
un mode sans rien à montrer ne se propose pas.

**Des mauvaises réponses qui ne se devinent pas.** Elles sont tirées du même thème que la
bonne (tout le thème, et non les seuls vingt événements de la manche), avec trois règles :
le même domaine d'abord (un chanteur parmi des chanteurs : on ne se trompe pas sur le
métier) ; parmi les figures les plus proches en date, pour qu'un portrait de la Renaissance
ne côtoie pas deux Romains dont le costume suffirait à le désigner ; et jamais deux noms de
famille identiques dans une question — Jacob et Wilhelm Grimm, ou Louis XIV et Louis XVI,
rendraient la réponse indécidable au visage.

**Une image qui donne la réponse.** Certains portraits portent le nom écrit dans l'image :
une inscription peinte (« IOAN PICVS e MIRANDVLA »), un badge de combinaison, une légende
gravée. `portrait.nomVisible` (dans `scripts/pantheon/*.json`, reporté sur `image.nomVisible`)
les écarte du mode et du portrait du jour ; la galerie les garde, puisqu'elle montre les
visages avec leurs noms. Il y en a **30** aujourd'hui : 19 repérés par reconnaissance de texte sur
les 838 premières images, 7 pour l'Espagne (Cortés, Las Casas, Vives, Cervantès, Quevedo, le Gran
Capitán et le socle de Rodrigo) et 4 pour la France (le sceau de Philippe Auguste, Du Guesclin, le
médaillon de Montesquieu, le portrait de Racine), repérés à l'œil faute d'outil de reconnaissance ; tous vérifiés à l'œil (le texte lu à 320 × 400 est celui que le joueur peut
lire aussi) : « Karolus magnus imperator » sur le Charlemagne de Dürer, « VERCINGETORIX » sur
la monnaie, « Doctor William Harvey », « LE SEIGNEUR DE MONTAIGNE »… Un nouveau portrait se
contrôle de la même façon, et la liste n'est pas une garantie : c'est un drapeau d'une ligne à poser
dès qu'on en voit un.

**Le révélé.** La légende de l'image, qui nomme la personne, n'apparaît qu'à la réponse ; le
crédit (auteur, licence, Commons) reste sous le portrait pendant la question, condition des
licences CC BY et CC BY-SA (`fillPortraitCredit`, partagé avec la fiche). Il porte la fiche de
la personne — verdict, nom, année, légende, description — et **ne se referme pas tout seul** :
on ne lit pas trois phrases en deux secondes. Un vrai bouton « Continuer » prend le focus,
Entrée suffit. Rencontrer une figure ici la débloque dans la collection, comme dans tout autre
mode.

### « Découvrir » : un événement ou un personnage

Le bouton 🎲 déplie deux choix sous la grille, comme « Défis » (un seul volet ouvert à la fois) :
**Événement**, le tirage d'avant, et **Personnage**, qui pioche une figure de la galerie des
portraits (`discoverRandomPortrait`) et ouvre sa fiche avec les mêmes accès au jeu — sa biographie
quand elle existe, son panthéon — et un bouton « Un autre personnage » qui repioche, jamais deux fois
la même de suite. La fiche n'est pas celle de la galerie : ni barre de passage entre portraits, ni
noir et blanc de la collection, puisqu'on découvre. Sans aucun portrait dans la base (pack sans
panthéons), le bouton garde son comportement d'origine et pioche un événement directement.

### Le portrait du jour

Un « Qui est-ce ? » d'**une seule question**, la même pour tous les joueurs d'un jour : un
quatrième bouton sous « Défis », à côté du Défi du jour. Il est **non classé** — ni points,
ni vies, ni série, ni écran de fin — et c'est structurel : le Défi du jour est classé, son
tirage et son score sont recalculés par le serveur avec le même moteur
(`js/dailyEngine.js`), et y mêler une question de portrait en fausserait l'équité. Le
portrait du jour a donc **sa propre graine** (`historiaxe_portrait_` + la date du Défi, là où le
Défi classé utilise `historiaxe_daily_`) ; un test vérifie que `generateDailyEvents()` ne
bouge pas. Les candidats sont triés par identifiant avant le tirage : le résultat ne dépend
ni de l'ordre des événements ni de l'appareil.

Une seule réponse par jour : répondu, il se rouvre tel qu'on l'a laissé (options colorées,
fiche affichée), et le bouton dit où l'on en est (« ✔ Trouvé aujourd'hui », « Revoir la fiche
du jour »). La réponse est retenue sous `historiaxe_portrait_day_v1`, avec sa date, hors de
`SYNC_KEYS` : une habitude du jour, pas une progression. Quitter sans répondre ne coûte rien
et n'enregistre rien. La fiche complète, avec ses accès au jeu, est à un bouton.

## « Pendant ce temps, ailleurs… » (simultanéité)

Tous les autres modes piochent dans **un seul thème**. On peut donc
maîtriser « Révolution française » et « Histoire de la Chine » chacun de son
côté sans jamais savoir que Qianlong régnait en 1789. Ce mode-ci
(`js/simultaneity.js` pour le moteur, `js/app.js: startSimultaneityGame`
pour l'écran `#screen-simultaneity`) est le seul qui fasse travailler les
795 thèmes ensemble.

Toute sa conception tient dans une asymétrie :

> **L'ancre vient du thème. Les réponses viennent d'ailleurs.**

Ce n'est pas qu'un cadrage. La question « lequel de ces 4 événements est
contemporain de X ? » n'est répondable que si le joueur connaît X — sans
quoi il compare quatre inconnues à une cinquième. Le thème qu'il vient
d'ouvrir est justement ce qu'il connaît. C'est aussi pourquoi le mode se
prend par thème et non depuis l'accueil : un tirage global n'offrirait pas
cette garantie.

La récompense n'est pas la question mais le **révélé** qui la suit : deux ou
trois contemporains réels, venus d'endroits différents, affichés que la
réponse soit bonne ou mauvaise. La question n'est que le prétexte.

Le SRS enregistre l'événement-**réponse**, jamais l'ancre : une session sème
donc la liste des points faibles avec des repères venus de thèmes que le
joueur n'a peut-être jamais ouverts, et « Réviser » devient une porte
d'entrée vers le reste du catalogue.

### Ce que « ailleurs » veut dire

Les cinq catégories ne sont **pas** un signal de lieu : « Histoires
nationales > Europe > Histoire de France » et « Programmes scolaires >
France » parlent du même endroit. L'étiquette est donc dérivée de
l'identifiant du thème, jamais du nom de sa catégorie — qui change d'une
langue à l'autre (même précaution que `js/geoMap.js: isGeoEligible`). Voir
`Simultaneity.themeTag` : pays connu (`assets/geo/theme-country-map.json`,
déjà là pour le Mode Carte), sinon convention `psn_<iso2>_` des programmes
scolaires nationaux ou `pan_<iso2>` du panthéon d'un pays (voir
« Personnages illustres » ; l'événement d'un panthéon de bloc porte son propre
`pays`), sinon position dans l'arbre (indices, pas noms).

### Quatre contraintes, toutes mesurées sur les données

Elles sont détaillées en tête de `js/simultaneity.js` et tenues par
`tests/simultaneity.test.js` :

1. **Dédoublonner.** 540 événements figurent dans plusieurs thèmes (6 % de
   la base) ; 0,30 % des paires candidates ont des titres seulement
   *proches* (« Lancement de Spoutnik 1 » / « Lancement de Spoutnik »).
   Sans garde, le mode proposerait l'ancre elle-même comme « ailleurs ».
2. **Exclure le calendrier non grégorien**, via
   `DailyEngine.EXCLUDED_THEME_IDS` — la même liste que les Défis, pour la
   même raison.
3. **Limiter les réponses aux ⭐ Incontournables.** C'est la contrainte de
   qualité. Sans elle la génération produit des paires exactes mais vides
   (« Invention du moteur à quatre temps (1876) » → « Part étudier le droit
   en Angleterre (1878) »), à cause des milliers de micro-événements
   biographiques. Le champ `essentiel` les écarte tous seul : vivier de
   ~2 700 réponses, dont aucune biographique. Les biographies restent
   d'excellentes **ancres**.
4. **Assumer un biais moderne.** 41 % du vivier tombe entre 1800 et 1999 ;
   avant 1500, chaque siècle n'en offre que 30 à 110. Un thème d'Antiquité
   se répétera davantage. C'est une limite du **contenu**, pas du code :
   elle se corrigera en étendant `essentiel` (absent de 0 % des Biographies
   et de 2 % des Programmes scolaires), pas en touchant le moteur.

Une catégorie **sans sous-catégories** est écartée du vivier des réponses :
tous ses thèmes partageraient la même étiquette, si bien qu'un thème
français y répondrait à une ancre française sous le titre « ailleurs ».
C'est le cas de « CAPES & Agrégation », dont les thèmes sont des
monographies — ils restent d'excellentes ancres. La règle est structurelle,
pas une liste en dur : toute future catégorie plate sera traitée pareil.

Sur le pack français, **aucun thème ne refuse le mode** : 76 % remplissent
une session complète de 12 questions, 23 % en obtiennent 8 à 11. Le
garde-fou en dessous de 4 questions (`simultaneity.not_enough`) ne sert donc
aujourd'hui qu'aux packs de démo non francophones, dont le vivier est vide.

### Le Défi de simultanéité (version globale)

Le troisième bouton du choix « Défis », à côté du Défi du jour et du Défi
hebdomadaire (`js/app.js: startSimultaneityChallenge`). Même écran et mêmes
règles que le mode par thème, mais lancé depuis l'écran des catégories.

Il perd donc la garantie qui rend le mode par thème jouable — l'ancre n'est
plus le thème que le joueur vient d'ouvrir. **C'est la règle du tirage qui la
rétablit : les ancres sortent de ce que le joueur a déjà rencontré, jamais de
toute la base.** Le signal est le SRS (`js/storage.js: srsRecord`), alimenté
par tous les modes sans exception : y figurent exactement les événements sur
lesquels il a été interrogé au moins une fois. Le défi préfère ceux qu'il a
déjà réussis (boîte ≥ 2) et n'élargit aux simples rencontres que si le stock
est trop mince.

En dessous de **20 événements rencontrés**, le bouton reste visible mais
verrouillé, et le clic annonce ce qui l'ouvrira — un mode qu'on ne voit pas
ne donne envie de rien (même parti pris que les verrous Chrono/Expert). Le
seuil est atteint après deux ou trois parties.

**Ce défi n'est pas classé, et c'est structurel** : le tirage dépend de
l'historique de chaque joueur, donc deux joueurs ne répondent jamais aux
mêmes questions et aucun classement ne serait équitable. Aucun score n'est
envoyé au serveur, contrairement au Défi du jour et au Défi hebdomadaire —
et aucun n'est rattaché à un thème non plus, faute de `theme.id` auquel
l'accrocher (même situation que le Mode Carte).

Il garde en revanche le rythme des deux autres : la graine mêle
l'identifiant d'appareil au jour courant (`DailyEngine.hashStringToSeed` +
`mulberry32`, les mêmes que le Défi du jour), si bien que **les 10 questions
restent identiques jusqu'au lendemain**. Relancer le défi dans la journée
redonne exactement le même tirage — c'est ce que vérifie
`e2e/defi-simultaneite.spec.js`, avec son pendant sans DOM dans
`tests/simultaneity.test.js`.

## Personnages illustres : biographies, panthéons et portraits

« Biographies » n'est plus une catégorie à part : c'est la première des deux
sous-catégories de **Personnages illustres**, l'autre étant **Panthéons**. Elles
ne posent pas la même question :

| | Un thème, c'est | Une date, c'est | On le joue par |
|---|---|---|---|
| **Biographies** | une vie (360 thèmes, en 12 domaines) | une étape de cette vie | étape de la vie |
| **Panthéons** | un pays, ou une région qui en rassemble plusieurs (la France, la Chine, l'Égypte, l'Espagne, les États-Unis, l'Italie, le Royaume-Uni, l'Amérique hispanique, le Maghreb, le Machrek et la péninsule Arabique, l'Allemagne, l'Autriche et la Suisse, la Scandinavie, l'Afrique de l'Ouest, le sous-continent indien, Israël, la Turquie, le Japon, la Russie, l'Australie, le Canada, le Benelux, le Portugal, l'Asie centrale et l'Afghanistan, la Nouvelle-Zélande et le Pacifique, le Brésil) | la naissance d'un personnage | domaine |

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
| Exemples | France, Égypte, Espagne, États-Unis, Italie, Royaume-Uni, Israël, Portugal, Brésil | Amérique hispanique, Maghreb, Machrek, Allemagne-Autriche-Suisse, Scandinavie |

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
| Chefs d'État et dirigeants | souverains, présidents, chefs de gouvernement | 33 | 21 |
| Guerres et résistances | chefs militaires, résistants, héros d'indépendance, combats pour les droits | 18 | 24 |
| Littérature et pensée | écrivains, poètes, philosophes | 31 | 25 |
| Beaux-arts | peinture, sculpture, architecture | 19 | 12 |
| Musique, spectacle et sport | compositeurs, interprètes, cinéma, théâtre, sport | 18 | 22 |
| Sciences, techniques et innovation | savants, ingénieurs, inventeurs, explorateurs | 21 | 16 |
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
- **⭐ Incontournables** (`essentiel`) : 39 sur 152 pour la France, 39 sur 129 pour les États-Unis,
  56 sur 149 pour l'Allemagne, l'Autriche et la Suisse, 51 sur 151 pour le Royaume-Uni, 36 sur 132 pour l'Espagne.

Quantités visées : 68 personnages pour la France (portés à 152, voir plus bas), 52 pour l'Égypte, 129 pour les
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
**103 personnages de dix pays** — Liban 25, Syrie 21, Irak 19, Palestine 15, Arabie saoudite 12,
Jordanie, Yémen 3 chacun, Émirats arabes unis et Koweït 2 chacun, Oman 1 — de Assurbanipal
(vers 685 av. J.-C.) à Shireen Abu Akleh (1971). Par axe : 46 Chefs d'État et dirigeants, 33
Littérature et pensée, 12 Guerres et résistances, 6 Sciences, techniques et innovation, 4
Musique, spectacle et sport, 2 Beaux-arts ; 25 ⭐ et 2 biographies liées (Saladin et Ibn
al-Haytham). Le Liban, le plus fourni, pèse 24 % du bloc, sous le seuil de 40 % du
constructeur. Les mots-clés du thème portent les noms des pays, de Babylone à Bagdad, si bien
que « irak », « liban » ou « yémen » mènent au Machrek dans la recherche.

Les choix qui ne vont pas de soi :

- **Le périmètre.** Douze pays étaient prévus : Liban, Syrie, Irak, Jordanie, Palestine,
  Arabie saoudite, Yémen, Oman, Émirats, Koweït, Qatar et Bahreïn. Les deux derniers n'ont
  aucune figure avec un portrait libre exploitable et ne sont donc pas dans la liste des
  pays du bloc (le constructeur refuse un pays déclaré sans personnage). L'Égypte a son thème
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

`pan_us`, « Grandes figures des États-Unis » : **141 personnages** (131 des États-Unis continentaux, plus les dix figures d'Hawaï, voir « Un bloc : la Nouvelle-Zélande et le Pacifique »), de Pocahontas
(vers 1596) à Steve Jobs (1955). Par axe : 25 Littérature et pensée, 24 Guerres et
résistances, 24 Musique, spectacle et sport, 21 Chefs d'État et dirigeants, 16
Sciences, techniques et innovation, 12 Beaux-arts, 9 Économie et entreprise ; 39 ⭐ et
31 biographies liées. La liste a été soumise puis validée décision par décision : 85
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
  laissés à un futur panthéon irlandais ; Wellington, né à Dublin sous la couronne
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
Royaume-Uni (151). Il passe de 68 à **152 personnages**, de Vercingétorix (vers 82 av. J.-C.) à
Serge Gainsbourg (1928) : 72 figures ajoutées, plus 10 invités de Monaco (voir « Les micro-États ») , Pétain et Rachi.
Par axe : 33 Chefs d'État et dirigeants, 31 Littérature et pensée, 21 Sciences, techniques et
innovation, 19 Beaux-arts, 18 Guerres et résistances, 18 Musique, spectacle et sport, 12
Économie et entreprise ; 39 ⭐ et 29 biographies
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

`pan_ru`, « Grandes figures de Russie » (code `ru`, pays) : **135 personnages**, d'Alexandre Nevski (1220) à
Alexeï Navalny (1976). Par axe : 31 Littérature et pensée, 23 Chefs d'État et dirigeants, 22 Guerres et
résistances, 21 Musique, spectacle et sport, 20 Sciences, techniques et innovation, 18 Beaux-arts ; 37 ⭐ et
8 biographies liées (Pierre le Grand, Catherine II, Koutouzov, Joukov, Dostoïevski, Tolstoï, Mendeleïev,
Gagarine). 135 portraits : 108 du domaine public, 2 CC0, 11 CC BY et 14 CC BY-SA. Pas d'axe « Économie et
entreprise » : les mécènes (Tretiakov) et le joaillier Fabergé sont rangés aux Beaux-arts.

- **Un pays, pas un bloc** : `pan_ru`, aucun champ `pays`, et « Pendant ce temps, ailleurs… » le compte
  comme `thm_ru` et `thm_urss`. La Biélorussie et l'Ukraine n'y sont pas associées : elles attendent leurs
  propres thèmes (voir plus bas, « L'Europe et les Amériques qui manquent »).
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
  al-Razi, al-Ghazali) sont laissées à un futur panthéon de l'Iran, et celles déjà prises ailleurs le restent : Babur et
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
les 152 de la France, 2,5 Mo pour les 97 de l'Amérique hispanique, 1,7 Mo
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
  Royaume-Uni, l'Espagne, l'Amérique hispanique, le Maghreb, le Machrek, l'Allemagne-Autriche-Suisse, la Scandinavie, l'Afrique de l'Ouest le sous-continent indien, Israël, la Chine, la Turquie, le Japon, la Grèce, la Russie, l'Australie, le Canada, le Benelux, le Portugal, l'Asie centrale et l'Afghanistan, la Nouvelle-Zélande et le Pacifique, le Brésil sont écrits.
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
  2. **Pays seuls** : l'Afrique du Sud, l'Iran. **Le Brésil** (qui n'entre pas dans l'Amérique « hispanique » ; voir « Un pays à part : le Brésil »), **la Turquie** (voir « Un pays à part : la Turquie »), **le Japon** (voir « Un pays à part : le Japon ») et **la Russie** (voir « Un pays à part : la Russie ») et **l'Australie** (voir « Un pays à part : l'Australie ») sont écrits.
  3. **Blocs** : l'Asie du Sud-Est, la Mongolie (l'Asie centrale est écrite, voir « Un bloc : l'Asie centrale et
     l'Afghanistan »), le Caucase, la Corée (`KR`/`KP`), l'Afrique de
     l'Ouest, l'Afrique centrale, l'Afrique de l'Est et la Corne, l'Afrique australe et l'océan
     Indien (sans l'Afrique du Sud). « Nouvelle-Zélande et Pacifique » est écrit (voir « Un bloc : la
     Nouvelle-Zélande et le Pacifique »).
  4. **L'Europe et les Amériques qui manquent** : **le Portugal est écrit** (voir « Un pays à part : le Portugal »,
     qui a repris Magellan et Viriathe), Byzance (au-delà des cinq figures déjà au panthéon de la Grèce),
     la Pologne, l'Europe centrale, les Balkans, les Caraïbes non
     hispaniques.

  Les images décideront de la taille de chacun : pour l'Afrique subsaharienne et l'Asie du
  Sud-Est, on vérifiera les portraits sur Commons **avant** de valider la liste. Les figures
  disputées entre deux thèmes (Avicenne et al-Biruni, Rûmî, Babur, Kubilai Khan, Bruce Lee,
  Eusébio) se règlent par la règle « celui qui l'honore le plus ».
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

## Accessibilité : le clavier et le zoom

Jusqu'ici l'app ne se jouait qu'au doigt ou à la souris. Un inventaire des
écrans, fait en parcourant l'app dans un vrai navigateur (voir
`e2e/clavier.spec.js`), comptait **59 éléments cliquables sans accès
clavier** — à commencer par l'écran d'accueil tout entier, un
`<div onclick>` : au clavier, on ne pouvait littéralement pas démarrer
l'app. S'y ajoutaient l'absence de tout anneau de focus global, un champ de
recherche dont le focus était supprimé (`outline: none`), aucune gestion du
focus entre écrans ni dans les modales, et une balise viewport qui
interdisait tout zoom (`user-scalable=no`, critère WCAG 1.4.4).

### Le zoom

La balise viewport n'interdit plus de zoomer. Retirer `maximum-scale=1.0` ne
suffisait pas : il masquait en silence deux défauts, qu'il a fallu régler
avant de le supprimer.

- **Le zoom automatique d'iOS.** Sous 16 px, iOS zoome dans la page à chaque
  focus d'un champ. Huit champs (tous les `.form-input`) étaient à 15 px :
  le zoom se serait déclenché en pleine saisie d'un pseudo ou d'un thème.
- **Le zoom au double-tap.** Le Blitz enchaîne les taps en moins d'une
  demi-seconde. `touch-action: manipulation` supprime ce seul geste et garde
  le pincement (même liste que le reboot de Bootstrap ; le curseur d'année
  en est exclu, qu'on fait glisser).

### Le clavier : `role="button"` + `tabindex="0"`, pas des `<button>`

`js/a11y.js` rend activable au clavier tout ce qui se clique, avec un seul
gestionnaire de touches global : Entrée active un bouton, l'Espace aussi (au
relâchement, comme un vrai bouton) et bascule une case à cocher — jamais
Entrée, qui ne coche pas une case selon la convention ARIA. Une touche
maintenue enfoncée ne relance pas l'action.

Le `<button>` natif serait préférable en principe, mais la quarantaine de
sites concernés (cartes de mode, de catégorie, de thème, d'axe…) portent des
styles propres : les convertir demandait de réinitialiser le rendu d'un
bouton à chaque fois, avec un risque visuel réel pour un gain nul. Là où
l'élément est déjà un vrai `<button>` (créneaux de la frise, options de quiz,
pions de la carte), rien n'a changé.

Trois conséquences de conception :

- **Un `button` ne contient pas un autre `button`.** La carte-thème porte une
  étoile de favori et, pour un thème personnalisé, une corbeille. Rendre la
  carte focalisable aurait imbriqué trois contrôles : les lecteurs d'écran
  n'exposent alors pas l'intérieur. Le **titre** est le contrôle principal,
  l'étoile et la corbeille des contrôles frères, et la carte garde son clic à
  la souris. Elle se déclare `data-kbd-proxy` : son équivalent clavier est
  ailleurs. C'est aussi le cas d'une ligne de la Sélection, dont la case à
  cocher native est le contrôle clavier.
- **Un axe se coche : c'est un `role="checkbox"`** avec `aria-checked`, pas un
  bouton. Une carte de mode **verrouillée** reste atteignable et activable
  (son clic explique ce qui la débloquera) mais s'annonce `aria-disabled`.
- **Les pions du Mode Carte se nomment par leur pays** (« Option 2 : Suisse »)
  au lieu d'un « Option 2 » qui ne désigne rien pour qui ne voit pas la
  carte. Ce n'est pas un indice de plus pour les autres : un `aria-label` ne
  s'affiche jamais.

### Le focus

- **Entre écrans** (`A11y.focusScreen`, appelé par `showScreen`) : le focus
  passe au conteneur du nouvel écran, faute de quoi l'élément choisi
  disparaissait avec l'écran quitté, le focus retombait sur `<body>`, et Tab
  repartait du haut du *document*. On focalise le conteneur plutôt que le
  titre, qui se trouve souvent après un bouton de retour que Tab sauterait.
  **Jamais avant une première action** : au chargement, `showScreen` vole sinon
  le focus à l'accueil, et le premier Tab repart vers le navigateur.
- **Dans les modales** : `role="dialog"` + `aria-modal`, focus piégé (Tab ne
  sort jamais, dans les deux sens), Échap ferme la modale du dessus (celle au
  z-index le plus haut — la confirmation, à 105, s'ouvre par-dessus les
  autres), et le focus revient à l'élément qui l'avait ouverte. Le focus entre
  sur le conteneur et non sur le premier champ, pour ne pas ouvrir le clavier
  à l'écran sur mobile à chaque ouverture.
- **À chaque question** (`A11y.focusQuestion`, balise `data-focus-target`) :
  les options viennent d'être reconstruites, le bouton pressé n'existe plus.
  Le focus va à la carte-question, pas à la première option : une touche
  Entrée enfoncée trop longtemps ne doit pas répondre toute seule à la
  question suivante.
- **Après une reconstruction** (`A11y.keepFocus`) : cocher un axe, choisir une
  longueur de manche, étoiler un favori, toucher une carte de la Remise en
  ordre ou placer un repère sur la frise reconstruisent leur liste. Le focus
  est rendu à la même *position*, sans quoi chaque geste renvoyait au haut de
  l'écran.

L'anneau de focus (`:focus-visible`, donc jamais au clic ni au toucher) a une
couleur par thème : le bleu marine de l'app est invisible sur fond sombre, le
jaune illisible sur fond clair. Il est décalé de 3 px pour se dessiner sur le
fond de la page et non sur la couleur de l'élément. Deux cas particuliers :
l'accueil, dont l'image de fond et son voile sont peints *par-dessus* le
contour de leur parent (un pseudo-élément doublé d'un filet blanc les passe
au-dessus), et la carte-thème, dont l'anneau entoure la carte entière quand
son titre a le focus (`:has()`) plutôt que le seul texte posé sur le dégradé.

### Les tests

`tests/a11y.test.js` (28) couvre sans navigateur la logique de décision (quelle
touche active quoi, où va le focus piégé, quelle modale est au-dessus) et des
gardes sur les fichiers statiques : viewport, `role` + `tabindex` sur chaque
élément cliquable de `index.html`, taille des champs, anneau de focus.

`e2e/clavier.spec.js` (17) obéit à une règle : **ne jamais poser le focus à la
main avant d'agir**. On appuie sur Tab, comme quelqu'un sans souris, jusqu'à
tomber sur l'élément visé — un `locator.focus()` suivi d'Entrée prouverait que
l'élément réagit à Entrée, pas qu'on peut l'atteindre, et c'est précisément
l'atteignabilité qui manquait. Son parcours mène de l'accueil à une question
de Quiz sans toucher la souris.

Il embarque un détecteur de zones cliquables hors d'atteinte du clavier (tout
ce qui a `cursor: pointer` ou un `onclick`) lancé sur une trentaine d'écrans
(le parcours, partagé avec les contrastes, vit dans `e2e/ecrans.js`),
**et un test qui vérifie que ce détecteur détecte** : sans lui, un détecteur
qui ne trouverait jamais rien passerait pour une app irréprochable. Les
garde-fous ont par ailleurs été éprouvés par mutation — remettre
`user-scalable=no`, repasser un champ à 15 px, retirer le `tabindex` de
l'accueil, désactiver `focusScreen`, le piège à focus ou `keepFocus` : chacun
fait échouer le test qui le garde, et lui seul.

### Ce qui n'est pas fait

Cette passe porte sur le clavier et le zoom (les contrastes ont leur propre
section, ci-dessous). Restent, tels que l'audit les a mesurés :

- **Repères de page** : aucun landmark, aucun `<h1>`.
- **Annonces aux lecteurs d'écran** : score, vies et retour juste/faux d'une
  réponse ne sont pas dans une zone `aria-live` ; un changement d'écran
  n'est pas annoncé.
- **La frise au clavier est jouable, mais lente** : on parcourt les créneaux
  un à un avec Tab, sans saut direct. Le focus reste au voisinage de la carte
  posée, mais une frise de 200 repères demanderait une vraie navigation
  (flèches, saut par siècle).
- **« Le fil du temps » et « Trouve l'écart » n'acceptent pas encore la
  saisie des chiffres au clavier physique** : le pavé numérique est à l'écran
  (ses touches sont de vrais boutons, donc atteignables).

## Accessibilité : les contrastes

L'audit signalait des contrastes insuffisants (WCAG 1.4.3, niveau AA : 4,5:1
pour le texte courant, 3:1 pour le grand texte). Le chiffre alors avancé —
« 7 nœuds sur l'écran des catégories » — était inexact : il additionnait des
échecs avérés (5 en thème clair, 1 en sombre) et des éléments qu'axe-core
déclare « à vérifier » faute de pouvoir les juger. Mesuré proprement sur tout
le parcours (une trentaine d'écrans et de modales, voir `e2e/ecrans.js`) :
**114 textes distincts sous le seuil en thème clair, 12 en sombre**, plus neuf
textes (six en sombre) posés sur une photo ou un dégradé, que l'outil ne sait
pas évaluer.

### Ce qui les causait

Presque tout tenait à deux gris : `--muted-text` (`#888888`, soit 3,5:1 sur
blanc et 3,2:1 sur le fond d'écran) et `--ink-soft` (`#7A848F`, 3,8:1) en
expliquaient 108 sur 114 — un jeton utilisé soixante-dix fois, l'autre dix. Les
six autres tenaient à trois règles isolées. Une fois ceux-là corrigés, le test
des états de réponse (voir plus bas) en a trouvé d'autres, que le parcours ne
montre pas : 12 en clair, 11 en sombre.

### Ce qui a changé

- **`--muted-text` : `#646464`.** Le bon gris se choisit sur le pire fond où le
  texte se pose, pas sur le fond habituel : `#6B6B6B` passait partout sauf sur
  la teinte verte ou rouge d'une réponse juste ou fausse (4,2:1). `#646464` :
  5,9:1 sur blanc, 4,7:1 sur cette teinte.
- **`--ink-soft` : `#66717D`** (5,0:1 sur blanc).
- **Les modales passent de 78 % à 94 % d'opacité.** À 78 %, le panneau
  laissait transparaître le voile sombre et n'était plus blanc mais gris
  (`#E1E1E2` mesuré) : même avec le gris corrigé, le texte discret n'y
  atteignait que 4,1:1 — il aurait fallu assombrir toute l'app pour ce seul
  fond.
- **Les cartes de catégorie, sur photo.** Leur voile était uniforme (50 % de
  bleu marine) et le sous-titre — « 12 Sous-catégories », en bleu pâle —
  plafonnait à 2,4:1 sur certaines photos. Un voile uniforme n'y suffit pas :
  à 70 %, plus de la moitié des pixels derrière le texte restaient sous le
  seuil, pour une image entièrement assombrie. Le voile est un dégradé, épais
  en bas là où est le texte (90 %), léger en haut (40 %, donc plus de photo
  qu'avant).
- **Le rouge et le vert posés en texte ont leurs jetons** (`--danger-red-text`,
  `--success-text`) ; les aplats et les filets gardent les leurs. Le rouge
  `#BA1A1A` faisait 2,5:1 sur fond sombre — le commentaire du thème sombre le
  jugeait pourtant « excellent » — et s'éclaircit donc (`#FF8A80`). Le vert
  « juste » faisait 4,2:1 en clair et 2,8:1 en sombre, où rien ne le
  redéfinissait : `#1A6E3A` en clair, `#5ED68A` en sombre.
- **Les trophées verrouillés s'estompent par leur icône, plus par une opacité
  sur toute la carte.** À 0,65, le texte qui dit comment débloquer le trophée
  (« Réussir 5 thèmes de l'Antiquité ») tombait à 2:1 : l'information la plus
  utile de la carte en était la moins lisible.
- **Quatre règles isolées** : le badge « ⭐ essentiel » d'une carte d'axe
  (ambre `#7A5A14`, et clair en sombre), la pastille de combo « ×1.1 » des
  jeux (bleu marine sur fond sombre : 1,2:1, donc invisible), le badge
  « Niv. 1 » en sombre (4,3:1), et le multiplicateur de série du profil
  (3,5:1).

### Le test

`e2e/contrastes.spec.js` (7 tests) mesure de trois façons, parce qu'aucune ne
suffit seule :

- **axe-core**, sur tout le parcours, en thème clair puis sombre. Il calcule
  le contraste de tout texte posé sur un aplat. C'est une dépendance de
  développement (MPL-2.0), jamais livrée dans l'app. Il ne sait pas juger ce
  qui est posé sur une photo ou un dégradé, et le range alors parmi les cas
  « à vérifier » — ce que le test ignore.
- **Un échantillonnage de pixels** pour ce reste : on masque le texte, on
  photographie la zone qu'il occupait, et l'on compare chaque pixel à sa
  couleur. 95 % des pixels doivent atteindre le seuil. C'est ce qui a montré
  que le sous-titre des cartes de catégorie plafonnait à 3:1, là où axe se
  contentait de dire « à vérifier ».
- **Les états de réponse**, que le parcours n'affiche pas. Les atteindre en
  jouant voudrait dire répondre faux exprès dans chaque mode : on pose donc
  sur les vrais éléments les classes que le JS leur pose (`correct`, `wrong`…).
  C'est le couple de couleurs de la règle CSS qui est mesuré, pas la logique du
  jeu. Le « révélé » de la simultanéité et de l'intrus, lui, est construit par
  le JS : on répond pour de bon.

Un test vérifie que les mesures détectent (un texte pâle, un texte sur un
dégradé qui finit presque blanc), et chaque correction a été éprouvée par
mutation : remettre `#888888`, `#7A848F`, les modales à 78 %, le voile
uniforme, un rouge ou un vert, ou l'opacité des trophées fait échouer le test
qui la garde — quatorze mutations, quatorze attrapées.

### Ce que le test ne voit pas

- Le **Mode Carte**, la ligue, le récap, les classements et les résultats de
  défi : le parcours n'ouvre pas ces écrans et ces modales.
- Les **états de la frise** (repère raté, créneau faux).
- Le **contraste des éléments qui ne sont pas du texte** (WCAG 1.4.11 : icônes,
  bordures de champ), qui relève d'un autre critère.

## Développement

```bash
npm install
npm run build          # compile Tailwind (css/tailwind.generated.css) puis copie les fichiers statiques dans www/ (build iOS)
npm run cap:sync        # + npx cap sync
npm run cap:open:ios
npm test                # tests unitaires + validation du schéma des packs de données (data/*.json)
npm run test:e2e        # tests de bout en bout dans un vrai navigateur (voir ci-dessous)
```

### Tests de bout en bout

`npm test` (node --test, sans DOM) couvre les modules isolables : stockage,
gamification, moteur du Défi du jour, schéma des packs de données. Il ne
peut rien dire de `js/app.js`, qui suppose un `document`, un `localStorage`
et un `fetch` — c'est-à-dire de la quasi-totalité de l'interface.

`npm run test:e2e` (Playwright, `e2e/`) comble ce trou en ouvrant un vrai
navigateur sur le site servi tel qu'il l'est en production
(`e2e/server.js`, un serveur statique sans dépendance). Treize parcours,
103 tests, environ trois minutes :

- `e2e/modes.spec.js` — chaque mode de jeu se lance et répond à une
  première interaction. C'est la famille de régressions déjà vécue ici :
  une fonction supprimée lors d'un refactor, un mode qui ne démarre plus.
- `e2e/frise-paysage.spec.js` — la disposition de la frise en paysage
  (Réglages → « Disposition en paysage ») : « Ligne », « Lignes multiples »
  (par défaut) et « Serpentin », plus la case « Une ligne par axe
  thématique ». Il vérifie les règles plus que le dessin : ces dispositions
  n'existent que sur tablette et ordinateur (un téléphone, même en paysage,
  garde une ligne et le réglage disparaît), le serpentin et les voies par axe
  ne valent qu'en Découverte (une partie repasse en lignes multiples), et une
  partie reste jouable en lignes multiples.
- `e2e/axes.spec.js` — le filtre par axe thématique : changer de thème
  repart de tous les axes, revenir au même thème conserve la sélection.
- `e2e/sommaire.spec.js` — le sommaire d'un thème : autant de branches
  affichées que la donnée en déclare, un repère daté qui ouvre la fiche du
  bon événement, une pastille qui prépare la révision du bon axe.
- `e2e/navigation.spec.js` — le seul parcours qui prend l'app par la porte :
  accueil, catégories, sous-catégories imbriquées, retours arrière,
  recherche, favoris, « Hasard », « Réviser » et « Défis ».
- `e2e/simultaneite.spec.js` — le mode « Pendant ce temps, ailleurs… » : la
  carte lance la session, l'ancre et ses quatre options s'affichent, un clic
  tranche et déplie le révélé, et surtout aucune option ne vient du thème
  dont l'ancre est issue — l'asymétrie sans laquelle « ailleurs » serait un
  mensonge. La génération elle-même, sans DOM, est couverte par `npm test`
  (`tests/simultaneity.test.js`).
- `e2e/clavier.spec.js` — l'app prise au clavier seul, et le zoom rendu : un
  parcours de l'accueil à une question de Quiz où l'on n'appuie que sur Tab,
  Entrée et Espace, les modales (focus piégé, Échap, retour du focus), les
  cases à cocher d'axe, et un détecteur de zones cliquables hors d'atteinte du
  clavier qui vérifie sa propre capacité à détecter. La logique de décision,
  sans DOM, est couverte par `npm test` (`tests/a11y.test.js`, 28 tests).
- `e2e/contrastes.spec.js` — les contrastes de couleur (WCAG AA) : axe-core
  sur tout le parcours en thème clair puis sombre, un échantillonnage de
  pixels pour le texte posé sur une photo ou un dégradé, et les états de
  réponse juste/faux. Il vérifie aussi que ses mesures détectent. Le
  parcours des écrans qu'il partage avec `clavier.spec.js` vit dans
  `e2e/ecrans.js`.
- `e2e/nouveaux-modes.spec.js` — les quatre modes fabriqués depuis les
  seules dates : chacun se lance depuis sa carte et répond à une première
  interaction, mais surtout ce qui doit rester caché le reste — aucune date
  n'est affichée en Remise en ordre ni en Intrus, puisque les montrer
  donnerait la réponse. Il vérifie aussi que l'horloge du Blitz s'arrête
  quand on quitte l'écran, sans quoi elle terminerait une partie qui n'est
  plus là. La fabrication des questions, sans DOM, est couverte par
  `npm test` (`tests/gameModes.test.js`, 20 tests).
- `e2e/manche.spec.js` — la longueur de la manche : le sélecteur propose les
  longueurs qui changent quelque chose, le choix agit réellement sur la
  partie lancée (10 ou 50 cartes, et non 72), il est retenu d'un thème à
  l'autre, la Découverte y échappe, un axe trop étroit fait disparaître le
  sélecteur, et « 50 » est bien proposé sur un thème de 50 événements pile
  (`thm_rome`, où il joue la même partie que « Tout ») sans que les deux
  boutons soient actifs ensemble.
- `e2e/defi-simultaneite.spec.js` — le Défi de simultanéité : verrouillé et
  explicite tant que l'historique est trop mince, puis 10 questions dont
  toutes les ancres sortent bien du SRS du joueur, un tirage stable d'une
  partie à l'autre dans la journée, et aucun score rattaché à un thème.
- `e2e/personnages.spec.js` — « Personnages illustres » : la navigation à
  trois étages avec la note de *chaque* étage (boîte visible, pas seulement
  son texte présent) et l'image de chaque tuile, puis la fiche d'un personnage
  — portrait réellement chargé en 320 px, légende, crédit avec lien Commons,
  bouton vers la biographie —, la pastille de chaque repère de la frise, la
  vignette de la carte « À placer », l'absence du bouton en pleine partie, et
  l'absence de tout portrait sur un thème qui n'en a pas. Éprouvé par
  mutation : remettre la note au sommet seul, ou rendre « Panthéons »
  à la règle des mythologies, fait échouer le test qui la garde.
- `e2e/shuffle.spec.js` — le seul parcours qui ne clique rien : il fait
  tourner `js/app.js: shuffleArray` 200 000 fois et vérifie que la
  distribution reste uniforme. `sort(() => Math.random() - 0.5)`, longtemps
  utilisé ici, ne mélangeait pas uniformément : la bonne réponse d'un QCM ne
  tombait pas aussi souvent sur les quatre options, et la première carte
  d'un pool de 10 ouvrait 19,5 % des parties au lieu de 10 %. Les seuils
  sont à plus de quinze écarts-types de la valeur attendue : ce test ne peut
  pas rougir par malchance.

Chaque test hérite d'une assertion du socle (`e2e/fixtures.js`) : **aucune
erreur console ni exception non rattrapée** sur les écrans traversés. C'est
la ligne la plus rentable de la suite ; elle a déjà trouvé un compteur de
progression qui se désynchronisait après un mauvais placement.

Les parcours entrent dans un thème par un raccourci assumé (choisir la
catégorie par programme, puis cliquer comme un joueur — voir
`e2e/fixtures.js: openThemeCard`), à une exception près :
`navigation.spec.js` ne clique que de vrais éléments, du premier écran au
dernier.

Le socle neutralise trois choses, chacune pour une raison précise : le
service worker (il recharge la page en plein test et relaie des requêtes
hors de portée des interceptions), les appels `/api/*` (les fonctions
serverless ne tournent pas derrière le serveur de test) et le tutoriel (ses
bulles interceptent les clics). Par défaut, Playwright utilise le Chromium
qu'il télécharge lui-même ; `E2E_CHROMIUM_PATH` permet d'en désigner un
déjà installé (image de CI, poste hors ligne).

Un test instable est traité comme un bug, pas comme un aléa : aucune
nouvelle tentative en local, une seule en CI pour distinguer une régression
d'un incident d'infrastructure.

Le site statique (`index.html`, `js/`, `css/`, `data/`...) se sert tel quel ;
`vercel.json` déploie le dossier racine et détecte automatiquement les
fonctions serverless dans `api/`. Une CI GitHub Actions (`.github/workflows/ci.yml`)
lance `npm test` et `npm run build` sur chaque pull request.

### Tailwind CSS

Le CSS Tailwind est compilé à l'avance (`tailwind.config.js` +
`css/tailwind-input.css` → `css/tailwind.generated.css`, régénéré via
`npm run build:css` ou `npm run build`) plutôt que chargé depuis le Play
CDN (`cdn.tailwindcss.com`) : ce CDN est déconseillé en production par
Tailwind lui-même (compilation JIT à chaque chargement) et, pour une app
qui se veut utilisable hors-ligne, dépendait d'un accès réseau à un
domaine tiers à chaque lancement. `css/tailwind.generated.css` est
committé (comme `css/style.css`) : après une modification de classes
Tailwind dans `index.html`/`js/*.js` ou de `tailwind.config.js`, relancez
`npm run build:css` et committez le fichier généré. Les polices Inter et
Material Symbols sont pour la même raison auto-hébergées
(`css/fonts.css` + `assets/fonts/`) plutôt que chargées depuis
`fonts.googleapis.com`.
