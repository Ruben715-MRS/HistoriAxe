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
| **Panthéons** | un pays, ou une région qui en rassemble plusieurs (la France, l'Égypte, les États-Unis, l'Italie, le Royaume-Uni, l'Amérique hispanique, le Maghreb, l'Allemagne, l'Autriche et la Suisse) | la naissance d'un personnage | domaine |

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
| `pays` sur chaque événement | interdit (le thème le dit déjà) | obligatoire : code ISO à deux lettres (`"pays": "VE"`) |
| Exemples | France, Égypte, États-Unis, Italie, Royaume-Uni ; plus tard Brésil… | Amérique hispanique, Maghreb, Allemagne-Autriche-Suisse ; plus tard Machrek |

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

**Les sportifs : une exception, pas une règle.** Un sportif n'entre au panthéon que
si son nom dépasse le sport : il a porté l'image de son pays dans le monde (Maradona,
Beckenbauer), marqué l'histoire (Owens aux Jeux de Berlin) ou posé un acte politique
dont on se souvient (Ali refusant la guerre du Viêt Nam, Schmeling et Bartali face au
nazisme et au fascisme). Les records seuls ne suffisent pas : ils restent aux
Biographies. Le sportif est rangé en « Musique, spectacle et sport », et la règle des
morts s'applique à lui comme aux autres : Tommie Smith et John Carlos, dont le poing
levé à Mexico en 1968 serait un cas d'école, sont vivants et restent donc dehors. Lev Yachine (seul gardien Ballon d'or) attend un panthéon de la
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
propre** ; l'Égypte, l'Italie, le Maghreb et l'Amérique hispanique n'en ont pas, faute de
candidats évidents. Le sport n'a pas d'axe — une poignée de figures par pays — mais il est
accueilli dans « Musique, spectacle et sport », pour les sportifs de portée historique
(voir « Les sportifs : une exception, pas une règle »).

| Axe | Contenu | France | États-Unis |
|---|---|---|---|
| Chefs d'État et dirigeants | souverains, présidents, chefs de gouvernement | 12 | 21 |
| Guerres et résistances | chefs militaires, résistants, héros d'indépendance, combats pour les droits | 8 | 24 |
| Littérature et pensée | écrivains, poètes, philosophes | 15 | 25 |
| Beaux-arts | peinture, sculpture, architecture | 9 | 12 |
| Musique, spectacle et sport | compositeurs, interprètes, cinéma, théâtre, sport | 8 | 22 |
| Sciences, techniques et innovation | savants, ingénieurs, inventeurs, explorateurs | 9 | 16 |
| Économie et entreprise | fondateurs d'entreprises, industriels, banquiers, marchands | 7 | 9 |

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
- **Une personne ne naît pas deux fois.** Les 26 personnages qui ont aussi une
  biographie (champ `biographie`, qui nourrit le bouton « Voir sa biographie »
  de la fiche) doivent porter la *même* date. Les dates des soixante et une premières ont été
  comparées une à une à la phrase d'ouverture de l'article Wikipédia.
- **⭐ Incontournables** (`essentiel`) : 22 sur 68 pour la France, 39 sur 129 pour les États-Unis,
  56 sur 149 pour l'Allemagne, l'Autriche et la Suisse, 51 sur 151 pour le Royaume-Uni.

Quantités visées : 68 personnages pour la France, 52 pour l'Égypte, 129 pour les
États-Unis (85 proposés, portés à 123 : « mieux vaut plus que moins », puis à 129 avec l'axe Économie et entreprise), 127 pour
l'Italie (126 proposés, plus Enzo Ferrari), 80 à 100
pour l'Amérique hispanique (dix-neuf pays, de 1 à 19 figures chacun), 58 pour le
Maghreb (cinq pays, de 1 à 21), 149 pour l'Allemagne, l'Autriche et la Suisse (170 candidats,
21 coupés ; trois pays, de 26 à 85 figures), 151 pour le Royaume-Uni (194 candidats, 4 ajoutés, 47 écartés),
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
  autre histoire, aura son propre thème ; Haïti ou le Belize n'ont pas leur
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
Deutschland, Austria, Confoederatio Helvetica) : **151 personnages de trois pays** —
Allemagne 87, Autriche 38, Suisse 26 — d'Arminius (vers 17 av. J.-C.) à Helmut Kohl
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

`pan_us`, « Grandes figures des États-Unis » : **131 personnages**, de Pocahontas
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

### Un fichier source par panthéon, un script qui l'écrit dans `data/fr.json`

`scripts/pantheon/<code>.json` (`fr`, `hispam`…) est **la seule source de
vérité** du thème : `code` (le nom du fichier), `nom` (le nom de rangement,
« France », « Amérique hispanique » — les panthéons se rangent par lui, pas par
le nom du thème, que « de », « des » et « du » fausseraient), `theme`
(`id`, `nom`, `difficulte`, `motsCles`), `axes`, `personnages`, et pour un bloc
la liste `pays`. `python3 scripts/build_pantheon.py fr` le valide puis le
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
Royaume-Uni, 131 domaine public, 3 CC0, 3 CC BY, 14 CC BY-SA. En France, trois portraits du XXe siècle reposent sur un
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
les 68 de la France, 2,5 Mo pour les 97 de l'Amérique hispanique, 1,7 Mo
pour les 58 du Maghreb, 1,4 Mo pour les 52 de l'Égypte et 3,1 Mo pour les 129
des États-Unis — de
l'ordre de 20 Mo pour 800 portraits, quand `assets/` en pèse déjà 38. Le WebP
gagnerait environ un tiers, mais la cible iOS actuelle (13, voir
`ios/App/Podfile`) ne le lit pas : il attendra la migration vers Capacitor 7
(iOS 14+) déjà évoquée plus haut.

**Cache** : `sw.js` range les portraits dans un cache à part
(`historiaxe-portraits-v1`), que le ménage de `activate` épargne. Rangés avec
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
  Royaume-Uni, l'Amérique hispanique, le Maghreb et l'Allemagne-Autriche-Suisse sont écrits. Viennent ensuite le Machrek (sans l'Égypte,
  qui a le sien ; le sort d'Israël et des figures juives reste à trancher, l'idée
  d'un thème juif à part ayant été abandonnée), le Brésil à part, puis les autres
  pays — chaque liste de personnages validée avant la rédaction.
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
  attend un panthéon de la Russie ; Smith et Carlos, qu'ils ne soient plus vivants.

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
(`e2e/server.js`, un serveur statique sans dépendance). Douze parcours,
96 tests, environ trois minutes :

- `e2e/modes.spec.js` — chaque mode de jeu se lance et répond à une
  première interaction. C'est la famille de régressions déjà vécue ici :
  une fonction supprimée lors d'un refactor, un mode qui ne démarre plus.
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
