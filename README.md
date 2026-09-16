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

Un sélecteur **10 / 20 / Tout (N)** s'affiche donc sous l'en-tête de l'écran
des modes (`js/app.js: renderRoundLengthPicker`). Il est placé là, au-dessus
des modes, parce qu'il les concerne tous : c'est un cadrage de la partie à
venir, pas un mode de plus.

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
  14 événements — et **s'efface entièrement** sous 11, où les trois choix
  joueraient la même partie.
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
scolaires nationaux, sinon position dans l'arbre (indices, pas noms).

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
(`e2e/server.js`, un serveur statique sans dépendance). Huit parcours,
43 tests, une minute :

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
- `e2e/manche.spec.js` — la longueur de la manche : le sélecteur propose les
  longueurs qui changent quelque chose, le choix agit réellement sur la
  partie lancée (10 cartes et non 72), il est retenu d'un thème à l'autre, la
  Découverte y échappe, et un axe trop étroit fait disparaître le sélecteur.
- `e2e/defi-simultaneite.spec.js` — le Défi de simultanéité : verrouillé et
  explicite tant que l'historique est trop mince, puis 10 questions dont
  toutes les ancres sortent bien du SRS du joueur, un tirage stable d'une
  partie à l'autre dans la journée, et aucun score rattaché à un thème.
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
