# HistoriAxe

Le Quiz Chronologique — PWA & app iOS native (Capacitor).

## Où est quoi

| Dossier | Contenu |
|---|---|
| `index.html`, `css/` | l'app (un seul HTML, ses écrans `#screen-*`) et ses styles |
| `js/` | le code, chargé dans l'ordre d'`index.html` (voir `tests/scripts-shell.test.js`) : modules `js/*.js`, `js/app/*.js` (réglages, navigation, frise, fiche…) et `js/modes/*.js` (un fichier par mode de jeu) |
| `data/fr.json` | **la source** du contenu français ; `data/pack/fr/` en est la version découpée que l'app télécharge (`npm run build:pack`) ; `data/<lang>.json` : packs de démonstration |
| `assets/` | images de tuiles (WebP), portraits (JPEG), polices, cartes (`geo/`), MapLibre |
| `api/` | fonctions serverless Vercel (classement, défis, ligue, duels, synchronisation) |
| `tests/`, `e2e/` | `npm test` (sans navigateur) et `npm run test:e2e` (Playwright) |
| `scripts/` | outils de contenu et de build — voir `scripts/README.md` |
| `docs/` | journaux détaillés (panthéons, portraits) |
| `ios/` | projet Xcode (Capacitor) |
| `ui/` | textes de l'interface par langue (`ui/<lang>.json`) et maquettes de design |

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

### Comptes joueurs (Supabase Auth)

Connexion facultative par e-mail + mot de passe, lien magique par e-mail ou
Google (Apple : à configurer avec le compte Apple Developer). Le client
(`js/auth.js`) parle directement à Supabase Auth ; le serveur
(`api/account.js`) vérifie le jeton, puis rattache l'appareil au joueur du
compte : tous les appareils connectés partagent alors le même `device_id`,
donc les mêmes scores, classements et sauvegarde. La progression des
appareils est fusionnée (`js/storage.js: mergeSyncableStates`).

Variable Vercel supplémentaire, **secrète**, nécessaire à la suppression de
compte : `SUPABASE_SECRET_KEY` (Supabase → Project Settings → API Keys →
Secret keys). L'URL du projet et la clé « publishable », publiques, sont
dans `js/auth.js` et `api/_lib/auth.js`.

Côté Supabase : Authentication → URL Configuration → Site URL
`https://histori-axe.vercel.app`, Redirect URLs `https://histori-axe.vercel.app/**`.

### 3. App native iOS (Capacitor)

La PWA web fonctionne sans réglage supplémentaire (elle appelle `/api/...`
sur son propre domaine). L'app iOS/Android, elle, charge ses pages depuis un
bundle local (`capacitor://localhost` / `https://localhost`) : il faut donc
indiquer explicitement l'URL de votre déploiement Vercel au moment de builder
l'app native, par une variable d'environnement (injectée dans la copie `www/`
de `js/apiClient.js`, jamais écrite dans le dépôt) :

```sh
HISTORIAXE_API_BASE_URL=https://votre-projet.vercel.app npm run cap:build:ios
```

Sans cette variable, les scripts `cap:*` refusent de construire : l'app native
ne pourrait joindre ni classement, ni synchronisation, ni ligue, ni duels.
`capacitor.config.ts` ne définit plus `server.iosScheme` : Capacitor réserve
`capacitor://` à iOS et rejette `https` (WKWebView n'accepte pas ce schéma).

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
3. enregistre le score ainsi recalculé : pour le **Défi du jour, seul le
   premier envoi compte** (`on conflict do nothing`) ; le client mémorise son
   premier essai du jour (`js/daily.js: registerDailyAttempt`) et c'est
   toujours celui-là qui est envoyé, même après avoir rejoué. Défi hebdomadaire :
   le meilleur par joueur/semaine ISO/langue.

Le client joint aussi les **ids du tirage** qu'il a joué (`eventIds`) ; si le
serveur, avec son propre pack, en tire d'autres, il répond 409 plutôt que de
rejouer le journal sur de mauvaises dates. Le tirage classe les événements par
un hachage de (graine + id) (`DailyEngine.pickDailyItems`) : il ne dépend ni de
l'ordre du pack ni, pour l'essentiel, des ajouts de contenu.

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
- **Images des tuiles : fait ; portraits : non.** Les images de catégories et de
  sous-catégories (`assets/images/`) sont en WebP, 1 200 px au plus : 3,3 Mo au lieu
  de 32 Mo (dont cinq doublons horodatés jamais référencés), vérifié par
  `tests/assets-images.test.js`. Les 2 563 portraits (`assets/portraits/`, 62 Mo)
  restent en JPEG : déjà petits (320×400, ~25 Ko), leur passage en WebP ne gagnerait
  qu'environ 26 % (mesuré sur un échantillon) pour un chantier qui touche chaque
  `image.src` de `data/fr.json`, le motif `PORTRAIT_SRC_PATTERN`, la règle de nommage
  du cache de portraits et le script de collecte. `accueil.jpg` et les écrans de
  lancement iOS restent en JPEG (le format exigé pour ces derniers).
- **Télémétrie/monitoring** (crashs, rétention J1/J7/J30, thèmes qui
  plantent) : volontairement absent — le choix d'un prestataire (Sentry,
  Plausible, Firebase Analytics...) engage la politique de confidentialité
  de l'app et mérite une décision produit, pas un ajout silencieux d'un
  service tiers qui recevrait des données de tous les joueurs.
- **`js/app.js` (variables globales)** : l'ancien fichier de 6 500 lignes est
  découpé en `js/app/*.js` (réglages, dates, contenu personnalisé, état,
  navigation, écrans, frise, fin de partie, fiche) et `js/modes/*.js` (un fichier
  par mode de jeu) ; `js/app.js` ne garde que la synchronisation cloud et
  `window.onload`. C'est un découpage **mécanique** : tout reste global, les
  fichiers se chargent dans l'ordre d'`index.html` (qui est celui de l'ancien
  fichier) et `tests/scripts-shell.test.js` vérifie que chaque script existe, est
  précaché par le service worker, et qu'aucun n’appelle à son chargement une
  fonction définie plus loin. La migration vers des modules ES (imports
  explicites) reste à faire, fichier par fichier, avec les tests de bout en bout
  comme filet — le découpage en est l'étape préalable.

## Rétention — onboarding, notifications, série, ligues & duels

- **Onboarding guidé** (`js/onboarding.js`) : des bulles d'aide contextuelles
  (coach-marks), toutes passables d'un seul bouton. **Sept bulles au menu
  principal** (bienvenue, Chemin du Temps, pièces/album/amis/équipe, Défis,
  Réviser, Salle de jeux + Atelier + Atlas, profil), qui éclairent chacune
  leur bouton et reprennent là où on s'est arrêté ; **une** à la première visite
  de la carte des mondes ; **deux** sur l'écran des modes (« Jouer », puis les
  groupes de modes) ; **une** à la fin de la première partie. Chaque pas a un
  identifiant dans `STEPS` ; le tutoriel est terminé quand tous sont vus. Textes
  dans `ui/*.json` (`onboarding.*`, six langues), repli français dans le code.
  Purement local, aucun réglage requis. Rejouable depuis Réglages → « Revoir le
  tutoriel ». `e2e/tutoriel.spec.js` le déroule. **Pour ajouter une fonction au
  tour** : une entrée dans `MENU_TOUR` (cible CSS) et `STEPS`, un texte de repli
  dans `FALLBACK`, et `onboarding.<id>_title` / `_text` dans les six langues.
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
- **Ligue hebdomadaire** (`api/league.js`) : classement
  d'un groupe d'une trentaine de joueurs par XP **vérifié** cette semaine — celui
  des parties de Défi du jour et de Défi hebdomadaire que le serveur a rejouées
  (l'XP local, invérifiable, n'est plus envoyé ; la table `weekly_xp` est
  abandonnée). Le
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
branches et sous-branches dépliables. Les 22 thèmes de la catégorie
« CAPES & Agrégation » en ont un ; leurs sources, ce que le cadrage du jury en dit et les points
à revérifier sont dans `docs/sommaires-capes-agregation.md`.
La frise de ces thèmes compte de 93 à 119 événements chacun (les incontournables ⭐ en tête) et reprend les
événements que le sommaire cite ; leurs descriptions suivent toutes la même forme, en trois phrases — ce
qu'est l'événement et son contexte, puis ce qui le rend déterminant pour le concours, sans le dire en toutes
lettres. Les sources sont dans `scripts/capes/` (voir son README).

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

## Répétition espacée (« À réviser aujourd'hui »)

Cinq boîtes de Leitner (`js/srs.js`) avec un intervalle chacune : **1, 3, 7, 14,
30 jours**. Un événement réussi **à l'échéance** monte d'une boîte et ne revient
qu'à la suivante ; raté, il retombe en boîte 1 et revient le lendemain. L'échéance
se calcule (minuit local du jour de la dernière révision + l'intervalle) : l'entrée
stockée garde sa forme `{ box, lastReviewed, failCount, successCount }`, les
données déjà enregistrées restent valides, rien n'est migré.

Avant ce changement, `lastReviewed` était écrit mais jamais lu : chaque réussite
montait d'une boîte, si bien qu'on « maîtrisait » un événement en quatre bonnes
réponses… en cinq minutes. **Une réussite avant l'échéance ne fait plus rien** (ni
montée, ni report) : c'est le temps entre deux révisions qui fait la mémoire. La
maîtrise affichée dans l'onglet Progression monte donc plus lentement, et c'est
voulu.

Côté écrans : « Réviser (n) » sur l'écran des catégories compte ce qui est **dû
aujourd'hui** ; l'écran de révision s'ouvre sur l'onglet **À réviser** (session de
10/20/30/50 événements, les plus fragiles puis les plus en retard d'abord ;
« Rejouer » en tire la suite), à côté des onglets Points faibles (échecs récents,
immédiatement rejouables) et Progression. Sans rien de dû, l'onglet annonce ce qui
arrive demain.

**Rappel « n événements à réviser »** (app iOS, `js/notifications.js`). Une
notification locale a un texte figé à la programmation : `SRS.planReminders`
calcule donc, pour chacun des **trois prochains jours**, combien d'événements seront à
échéance ce jour-là (si le joueur n'a rien révisé d'ici là) et programme « 🧠 Révisions du
jour — n événements à réviser aujourd'hui » à **18 h 30**, pour les jours où il y en a au
moins **5**. Reprogrammé à chaque ouverture de l'app et à chaque fin de partie, si bien
que le compte annoncé suit ce que le joueur a fait ; un joueur qui n'ouvre plus l'app
reçoit au plus trois rappels, pas une semaine de relances. Ids 1010-1012, annulés avec
les autres rappels quand le réglage Notifications est désactivé ; sans effet sur le web
(voir « Rétention »). Le seuil, l'heure et l'horizon sont dans `SRS.planReminders`.

## L'écran des modes et « Reprendre »

L'écran des modes d'un thème tenait 18 cartes sur 3 500 px : « Classique », le
mode principal, démarrait sous le pli (894 px pour un écran de 727). Il s'ouvre
maintenant sur un grand bouton **Jouer** (partie classique, un tap), puis
**La frise** (Entraînement, Classique, Chrono, Expert), puis trois groupes
repliables — **Défis express** (Quiz, Blitz, Curseur, Intrus, Remise en ordre,
Avant/Après, Périodes), **Explorer** (Découverte, Pendant ce temps, Qui est-ce ?,
Fil du temps, Trouve l'écart), **Outils** (Sélection, Ajouter, Multijoueurs).
Le bouton **Jouer** lance le **mode favori** du joueur — Réglages › « Mode du bouton
Jouer », `appSettings.playMode`, retenu jusqu'à ce qu'il le change ; Classique par
défaut (`js/app/play-mode.js: PLAY_MODES`). Un mode favori indisponible sur le thème
affiché (Chrono ou Expert verrouillés, Qui est-ce ? sans assez de portraits) retombe
sur Classique, et le libellé du bouton le dit. « La frise » reprend les cases des
autres groupes (deux colonnes sur toute la largeur du groupe).
Tout est déplié par défaut ; un groupe replié le reste d'une visite à l'autre
(`MODES_GROUPS_KEY`, `initModesGroups`). Les identifiants `#mode-card-*` n'ont pas
changé. Mesuré : 2 580 px au lieu de 3 540, « Classique » à 344 px.

L'écran des catégories affiche une carte **Reprendre** vers le dernier thème
ouvert (`lastThemeSave` dans `openThemeAt`, clé `LAST_THEME_KEY`, propre à
l'appareil et hors synchronisation). Elle ouvre le thème là où on l'avait
laissé : choix des axes s'il en a, sinon écran des modes. L'écran d'accueil
(l'image affichée pendant le chargement, quittée toute seule) n'en porte pas.

## L'Expédition : huit épreuves, trois vies pour tout le parcours

Au lieu de choisir un mode parmi vingt, le joueur enchaîne **huit épreuves** sur le thème
affiché (carte « Expédition » en tête des Défis express, ou comme mode favori du bouton
Jouer) : deux faciles (Quiz, Avant/Après), trois moyennes (frise Classique, Périodes,
Intrus), trois difficiles tirées parmi Curseur, Remise en ordre, Trouve l'écart et Fil du
temps — jamais deux fois le même mode (`planExpeditionStages`). **Trois vies pour tout le
parcours** : ce qu'on perd dans une épreuve manque à la suivante ; la dernière vie perdue
interrompt l'expédition. Il faut au moins 12 événements dans le thème.

Les modes sont de **vrais modes**, lancés par leurs fonctions d'origine ; `js/app/expedition.js`
ne touche à aucun moteur sauf par trois points d'accroche : `startingLives()` (les vies au
lancement d'une épreuve, au lieu d'un `3` écrit en dur dans chaque mode),
`expeditionCap(liste, mode)` (une épreuve fait 2 à 6 questions, pas une partie entière) et
`expeditionOnStageEnd(gagné)`, appelée au début d'`endGame` : la fin d'une épreuve rend la main
au parcours, qui garde vies et points. Un mode qui manque de matière sur le thème (il le dit
par une alerte) est détecté et l'épreuve passée sans pénalité. L'XP est versée une fois, à
la fin du parcours.

**Jokers**, gagnés après la 3ᵉ et la 6ᵉ épreuve : « passer l'épreuve » et « regagner une vie »
(jamais au-delà de trois). Ils ne dépendent d'aucun moteur — c'est pourquoi les « révéler le
siècle » et « changer la carte » imaginés au départ ne sont pas faits : chacun aurait demandé
un branchement par mode. Quitter en pleine épreuve abandonne le parcours. Le partage donne
une ligne de carrés (🟩 réussie, ⏭ passée, 🟥 échouée, ⬜ non atteinte).

## Le Chemin du Temps : un parcours commun, niveau après niveau (prototype)

Le jeu libre laisse tout choisir (834 thèmes, une vingtaine de modes) : il n'y a pas d'« étape
suivante », donc pas de raison évidente de revenir demain. Le Chemin du Temps ajoute le contraire :
**une carte unique, la même pour tous, qu'on gravit niveau après niveau** — le premier en bas, le boss du
monde en haut, le chemin parcouru qui se colore en vert, le reste en pointillé. Il **complète** le jeu
libre, il ne le remplace pas (carte « Chemin du Temps » en tête de l'écran des catégories).

- **Des mondes empilés**, qu'on gravit l'un après l'autre (le premier en bas) : un monde s'ouvre quand le
  boss du précédent est vaincu. **21 mondes** sur le chemin principal (le Monde 0, puis la Préhistoire, l'Égypte
  et l'Orient ancien, la Grèce, Rome en deux mondes, et la France de 481 à nos jours sur le modèle des
  collections Belin) et **5 îles bonus** (voir plus bas). Un monde fermé se replie en un simple en-tête : seul
  le prochain est dessiné en entier. La liste, avec les bornes et les thèmes de chaque monde, est dans
  `docs/chemin-du-temps-mondes.md`.
- **Mondes chrono-thématiques** : un monde a des bornes ET des thèmes où puiser (la Grèce ne tire que dans les
  thèmes grecs, pas dans tout ce qui s'est passé dans le monde à la même époque). La Grèce et Rome se
  chevauchent dans le temps ; c'est voulu (idée n° 3 du Monde 0 : diviser le temps est un choix).
- **Un niveau = une tranche de temps** : 12 repères, un par douzième de la tranche, jamais plus de 2 par année
  (3 en période dense). Le **boss** est la révision du monde : 20 repères répartis sur tous ses niveaux.
- **Un niveau = une mini-expédition** de 3 épreuves (6 pour le boss), 3 vies pour tout le niveau. Les
  épreuves sont de vrais modes (Quiz, Avant/Après, frise Classique, Périodes, Curseur, Remise en ordre) :
  la difficulté monte d'un niveau à l'autre en changeant leur mélange. Pas d'Intrus : il s'appuie sur les
  axes d'un seul thème.
- **Étoiles** : ★ pour finir, ★★ avec deux vies gardées, ★★★ sans la moindre erreur. Elles ne redescendent
  jamais en rejouant. Un niveau s'ouvre en réussissant le précédent (une étoile suffit) ; le **boss**
  demande en plus la moitié des étoiles possibles des niveaux du monde (`bossStarsRequired`) — de quoi
  rejouer un peu sans bloquer. Le boss offre une vie à mi-parcours (joker de l'Expédition).
- **Récompense** : XP du niveau (`PathCore.levelXp` : fraction des points, prime de réussite et d'étoiles,
  prime au premier passage, boss plus généreux), et la réussite d'un niveau **compte pour la série
  quotidienne**.
- **Contenu sans saisie à la main.** Les événements d'un niveau sont tirés des thèmes de son monde, dans sa
  tranche de temps, **un par douzième de la tranche** (répartition régulière), en préférant les
  **incontournables** (`theme.essentiel`) puis les repères **connus** : un événement que plusieurs thèmes
  racontent (même année, même nom propre dans le titre — `fame`) passe avant un événement cité par un seul
  thème. Le tirage est **déterministe** (hachage de l'id de niveau et de l'id d'événement) : même niveau,
  mêmes repères, pour tous et à chaque visite — c'est ce qui en fait une mission. Un événement ajouté au pack
  peut entrer dans un niveau sans toucher au code. Le contenu du joueur et le thème exclu des défis (calendrier
  non grégorien) sont ignorés.
- **Un fait n'apparaît qu'une fois.** Un même fait existe souvent sous plusieurs identifiants (la proclamation
  de la République dans trois thèmes) : `cluster` relie les événements de la même année qui partagent un nom
  propre ou la moitié de leurs mots, et un monde n'en tire qu'un.
- **Les bornes des niveaux sont figées** dans `js/pathWorlds.js` (généré par `scripts/path_plan.js --write`) :
  l'identifiant d'un niveau (`grece-3`) et les étoiles gagnées dessus en dépendent, un ajout de contenu ne
  doit donc pas les déplacer.

### Les dates sont des années : « tiers » pour les périodes denses

Les dates du jeu sont des **années**. Deux événements de 1916 ne se départagent pas, et plusieurs modes (Avant/
Après, Remise en ordre, Écart, Fil du temps) ne gardent qu'un événement par année. Un niveau doit donc couvrir
**au moins 6 années** : on ne peut pas faire un niveau par année de guerre. Pour qu'une période dense (le XXe
siècle compte cinq fois plus d'événements que l'Antiquité) ait plus de niveaux, une même tranche en donne
plusieurs (`tiers`) : le premier prend les événements les plus connus, le suivant les suivants, et ainsi de suite,
avec des épreuves plus dures. Exemples : la Révolution et l'Empire (3 tranches × 2), la Grande Guerre (1 tranche
de 6 ans × 3 niveaux). **La Grande Guerre court de 1914 à 1919** : le traité de Versailles en est la fin
officielle, l'armistice de 1918 n'en est que la fin des combats.

### Les îles bonus

Facultatives, elles évitent la monotonie d'une époque : **une île s'ouvre quand le joueur a réussi la moitié de
son monde d'attache** (le niveau `opensAfter`), et l'écran de fin du niveau qui l'ouvre l'annonce. Elle a sa
propre piste (ses niveaux, son boss, ses étoiles), s'ouvre depuis une carte sous l'en-tête de son monde, et la
flèche de retour revient à la carte des mondes. Le chemin principal ne propose jamais une île d'office, et le
boss d'une île ne mène nulle part.

| Île | Attachée à | Niveaux |
|---|---|---|
| 🐉 La Chine impériale | La Grèce antique | 6 + boss |
| 🌽 Les Amériques précolombiennes | La France avant la France | 5 + boss |
| 🕌 L'Islam et l'Empire ottoman | Féodalités | 6 + boss |
| 🗾 Le Japon | Les Renaissances | 5 + boss |
| 🌍 Histoires d'Afrique | La République et les empires | 5 + boss (jusqu'aux indépendances : après 1962, les thèmes africains ne racontent presque que des coups d'État) |

### Le Monde 0 : « Le temps des historiens »

Le chapitre introductif de Seconde sur la périodisation, et en même temps le **tutoriel du jeu**. Il est en
bas de la carte, avant la Préhistoire, qu'il ouvre quand son boss est vaincu. Un joueur qui connaît déjà peut le
**passer** (« Je connais déjà : ouvrir « La Préhistoire » ») : le monde suivant s'ouvre, le Monde 0 reste jouable.
Un monde déjà commencé n'est jamais reverrouillé.

| Niveau | Contenu |
|---|---|
| 1. Premiers pas sur la frise | Avant/Après + frise, sur 8 repères connus : **on joue tout de suite, sans leçon** |
| 2. Avant et après Jésus-Christ | leçon (pas d'an 0, compter à rebours) + Avant/Après autour de l'an 1 |
| 3. Compter les années | leçons : les ères (Hégire, calendrier hébraïque, an I) ; la réforme grégorienne |
| 4. Calendriers et fêtes | leçons : solaire / lunaire / luni-solaire, Nouvel An ; temps cyclique et temps linéaire |
| 5. Siècles et millénaires | leçon (les pièges : 1900, 2000, av. J.-C.) + Périodes & Ères |
| 6. Les noms des périodes | leçons : chrononymes ; les échelles du temps (Braudel, Hobsbawm) |
| 7. Où commence une période ? | leçon (bornes et critères : 476/496, 1453/1492, Le Goff) + frise des bornes du thème « Périodisation historique » |
| Boss · L'épreuve du temps | révision de toutes les leçons + frise + remise en ordre |

**Mini-jeu du niveau 4 : la roue des fêtes** (`js/app/wheel.js`, écran `#screen-wheel`, données et règles dans
`js/calendarWheel.js`). Un bouton de la fiche du niveau 4 l'ouvre, même avant que le niveau soit débloqué ; il est
**à côté** du niveau : il ne donne pas d'étoiles au Chemin et ne bloque rien. Un cercle de douze parts (les douze
mois d'un calendrier, écrits à plat sur la jante) et, dessous, les fêtes dans le désordre : on touche une fête, puis le
mois où elle tombe. On tourne la roue en la glissant horizontalement, avec les boutons ↺ ↻ ou les flèches du clavier.
Trente-huit roues, en deux familles choisies par deux boutons, **Religieux** et **Civil** : chacun ouvre la liste de ses calendriers,
par ordre alphabétique (choisir un calendrier referme la liste).

- **Religieux (8)** : bahaïsme, bouddhisme, christianisme, hindouisme, islam (mois de l'Hégire), judaïsme (mois de Tichri à Elloul),
  sikhisme (mois Nanakshahi), zoroastrisme (mois persans). Les calendriers bahaï (19 mois de 19 jours) et bouddhiste (un calendrier
  lunaire par pays) ne tiennent pas dans douze parts : leurs fêtes sont rangées dans les mois grégoriens.
- **Civil (30)** : Afrique du Sud, Algérie, Allemagne, Argentine, Australie, Autriche, Brésil, Canada, Chine, Colombie, Congo (RDC), Corée du Sud,
  Égypte, Espagne, États-Unis, France, Grèce, Inde, Indonésie, Italie, Japon, Maroc, Mexique, Nigéria, Royaume-Uni, Russie, Suisse,
  Tunisie, Turquie, Vietnam. Les fêtes musulmanes (Aïd…), qui parcourent toute l'année, n'y figurent pas : elles sont dans la roue de l'Islam.

Une **fête mobile** (Pâques, Pentecôte, Nouvel An lunaire…) accepte deux mois consécutifs, la date changeant chaque année. Après deux erreurs sur la
même fête, le jeu en donne la date. 3 étoiles jusqu'à 1 erreur, 2 jusqu'à 4, 1 ensuite ; le meilleur résultat de chaque roue
est gardé sur l'appareil (`historiaxe_wheel_v1`, hors synchronisation). Pour ajouter un calendrier ou une fête : le
tableau `CALENDARS` de `js/calendarWheel.js` (douze mois, un emoji unique par fête : `tests/calendarWheel.test.js`
le vérifie). **Tout ce contenu est à relire par un enseignant.**

**Autres mini-jeux du Monde 0** (tous facultatifs, sans étoiles au Chemin, dans la fiche du niveau) :

- **Le convertisseur d'ères** (niveau 3, `js/app/eras.js`, `js/eraConverter.js`) : une année de notre calendrier est donnée, on
  fait coulisser la règle d'une autre ère (juive, Hégire, républicaine, romaine, bouddhique, persane, ères japonaises Meiji à
  Reiwa) jusqu'à l'année correspondante. Là où l'ère change en cours d'année (juive, républicaine, persane), les deux réponses
  valent ; l'Hégire (années lunaires) accepte un an d'écart. La règle de conversion est expliquée après chaque réponse. 8 questions,
  3 étoiles jusqu'à 1 erreur, meilleur résultat gardé sur l'appareil (`historiaxe_eras_v1`).
- **Le Tetris des siècles** (niveau 5, et salle d'arcade) : des événements tombent dans cinq colonnes (Antiquité, Moyen Âge,
  Temps modernes, 1789-1914, depuis 1914) ; on choisit la colonne (boutons, tap, flèches). Bien rangé : vert ; sinon rouge, et le
  bloc reste. Une ligne de cinq blocs verts disparaît. Les années proches de 476 et de 1453-1492 sont exclues (bornes discutées).

**La salle de jeux** (`js/app/arcade.js`, écran `#screen-arcade` : l'identifiant a gardé l'ancien nom « salle d'arcade ») : une carte sous
« Le Chemin du Temps » sur l'écran des catégories. Un seul écran, trois sections, seize jeux, et sur chaque carte ce que le joueur y a fait
(meilleur score, étoiles, calendriers terminés) :

| Section | Jeux | Principe |
|---|---|---|
| **Mini-jeux** | la roue des fêtes, le convertisseur d'ères, les siècles en chiffres romains, le calendrier de l'Avent historique | courts, liés à une notion du cours, avec des étoiles (aussi proposés dans la fiche de leur niveau du Monde 0) |
| **Jeux d'arcade** | Snake, Tetris, Pac-Man, Space Invaders, Casse-briques des repères, Flappy Clio, Course de chars de la frise | de l'adresse en temps réel, un score à battre |
| **Jeux de réflexion** | Memory, Qui suis-je ?, Cause ou conséquence ?, Chasse aux anachronismes, Pendu des dates | au tour par tour, sans minuteur |

Les jeux d'arcade portent sur les événements connus du pack chargé (incontournables, un seul par fait) ; les jeux de réflexion sont décrits plus bas.

**Mini-jeux sur des axes choisis** : sur l'écran des axes d'un thème, le bouton **Mini-jeux** (à droite de « Continuer avec ces axes », actif dès qu'un axe est coché) ouvre la salle sur les seuls événements des axes cochés. Ici, **tous** les événements entrent, incontournables ou non (`ArcadeCore.themePool`, un seul par identifiant). La bannière indique le thème, les axes et le nombre d'événements jouables. Seuls les jeux à vivier restent affichés (Snake, Tetris, Pac-Man, Space Invaders, Casse-briques, Flappy Clio, Course, Mémoire, Pendu) ; un jeu qui refuse le vivier (`game.empty`) est grisé avec sa raison : Tetris et Space Invaders exigent des événements dans chaque grande période de l'histoire, les autres un nombre suffisant d'événements distincts. Les records de chaque sélection d'axes sont rangés à part (`historiaxe_arcade_scope_v1`, clé `ArcadeCore.scopeKey` : le thème et les axes triés), car un score sur cinq axes ne se compare pas à un score sur un seul. Quitter vers les catégories, les thèmes ou le Chemin efface la portée ; la salle de l'accueil est toujours complète.
Un jeu rend la main à l'écran d'où on l'a ouvert (`gamesBackTo` : la salle de jeux, ou le Chemin). Pour ajouter un jeu : une carte dans la section
voulue de `#screen-arcade`, ses textes dans `ui/fr.json`, et sa ligne dans `renderGamesHub`.

- **Snake chronologique** : quatre pastilles lettrées (couleur *et* lettre) et leur légende ; il faut les manger du plus ancien
  au plus récent. Une erreur, un mur ou sa queue : une vie en moins (3). Flèches, boutons ou glisser du doigt.
- **Tetris des siècles** (ci-dessus).
- **Pac-Man de la frise** : un labyrinthe (même grille pour toutes les manches), cinq pastilles qui portent des années, une consigne
  qui nomme un événement. Il faut manger la pastille de SA date ; une autre année coûte une vie et dit de quel événement elle est.
  Les fantômes (un de plus à chaque manche, jusqu'à trois) avancent un pas sur deux et poursuivent Pac-Man, avec une part de hasard.
- **Space Invaders des anachronismes** : sous l'intitulé d'une période, des cartes-événements descendent sur trois voies. On place le
  vaisseau sur une voie et on tire sur la carte la plus basse ; il faut abattre les événements HORS de la période et laisser passer
  les autres (tirer sur un événement de la période, ou en laisser passer un hors période, coûte une vie). Chaque tir ou carte
  passée est expliqué en une phrase. Le temps est un flottant (secondes) : `invStep(état, dt)` est pur et testé avec des `dt` simulés.

- **Casse-briques des repères** (`ArcadeExtraCore.createBreakout`, `js/app/arcade-extra.js`) : des briques portent des années ; seule la plus ancienne encore
  debout se casse. Toucher une autre brique coûte une vie (3) et la balle repart. La balle accélère de 6 % à chaque brique cassée. Raquette au doigt,
  à la souris ou aux flèches ; un tap lance la balle. Boucle `requestAnimationFrame` dont chaque pas `breakoutStep(état, dt)` est pur.
- **Flappy Clio** (`ArcadeExtraCore.createFlappy`) : Clio vole (un tap = un battement) entre des piliers qui portent des années ; il faut passer par
  l'ouverture qui suit l'ordre croissant, pas par le leurre (une année plus ancienne que la précédente). Le premier pilier n'a qu'une large ouverture
  pour s'échauffer ; trois vies ; huit portes par série, de plus en plus vite. **Stabilité** : la simulation avance par pas fixes de 1/120 s (la
  hauteur d'un battement ne dépend plus de la fluidité de l'écran), la chute est plafonnée, le plafond arrête Clio sans la blesser (seuls les
  piliers et le sol coûtent une vie), et après un choc le monde **attend le prochain battement** : les portes jugées disparaissent, la suivante est
  ramenée à bonne distance et Clio repart au centre d'une de ses ouvertures (avant, elle réapparaissait au milieu de l'écran, souvent *dans* un
  pilier, d'où des chocs en cascade). Une pause automatique quand l'onglet est masqué ; le canevas n'est plus réalloué à chaque image. Un test
  fait voler un pilote automatique à la cadence humaine sur 900 s sans une égratignure. **Décor 2D** (`js/app/flappy-backdrop.js`, dessiné au
  canevas, sans image) : ciel, nuages, collines, monuments et sol défilent en parallaxe et changent avec l'époque du dernier repère franchi
  (préhistoire : volcan et cromlech ; Orient : pyramides et ziggourat ; Antiquité : temple grec, aqueduc, amphithéâtre ; Moyen Âge : château,
  cathédrale, moulin ; Temps modernes : palais à dôme, caravelle ; ère industrielle : usine, locomotive ; monde contemporain : tour, gratte-ciel,
  fusée), avec un fondu entre deux époques.
- **Course de chars de la frise** (`ArcadeExtraCore.createRace`) : douze cases, **sans minuteur**. Un événement est nommé, on choisit son année parmi
  quatre ; une bonne réponse avance le cheval d'une case, une mauvaise d'aucune. La bonne réponse reste affichée **une seconde** (`RACE.PAUSE`), puis la
  question suivante s'enchaîne toute seule. Les chevaux (qui regardent à gauche) **partent de la droite, la ligne d'arrivée est à gauche**. Face à
  l'ordinateur, **l'adversaire avance sans cesse** (`raceTick`), à une vitesse en cases par seconde qui dépend de la difficulté (facile 0,10, normal 0,16,
  difficile 0,24) et qui ondule de ±18 % (des élans, des essoufflements) : s'il franchit la ligne le premier, la course s'arrête. Ou **à deux sur le
  même appareil** (tour à tour, avec un écran de passation entre les joueurs pour cacher la question ; rien n'avance seul). À la fin, un **récapitulatif**
  de toutes les questions : ✓ réussies, ✗ ratées avec la bonne année et la réponse donnée. **Musique de fond** équestre synthétisée (`startRaceMusic`,
  js/audio.js) : un galop (un coup fort, deux faibles) sous une fanfare en do majeur de huit mesures, à un tempo qui suit la difficulté ; elle se tait
  quand on quitte la course, quand l'onglet est masqué ou quand les sons sont coupés.
  **Pas de duel en ligne** : les duels existants de l'app sont asynchrones et passent par le serveur (défi quotidien) ; un duel en direct demanderait
  un canal temps réel qui n'existe pas encore.
- **Bruitages** (`playArcadeSfx`, js/audio.js, tous synthétisés, sans fichier son, et soumis au réglage « Sons ») : le tir du vaisseau et l'explosion d'une
  carte touchée (Space Invaders), le « ouaka-ouaka » de Pac-Man à chaque pas, le battement d'ailes de Flappy Clio, un tic de déplacement et un bruit de chute (Tetris).
- **Un vivier d'⭐ incontournables seulement** (`arcadePool`, `whoFigures`) : les événements et les figures tirés dans toute la salle de jeux sont ceux que les
  thèmes classent parmi leurs incontournables (4 300 faits distincts, 1 100 figures à portrait) ; un événement obscur ne se devine pas. Si un pack chargé
  en comptait trop peu (moins de 60 faits, 40 figures), on y ajoute les faits cités par plusieurs thèmes plutôt que de manquer de cartes.

Deux mini-jeux de plus, dont le contenu écrit à la main est **à relire par un enseignant** :

- **Siècles en chiffres romains** (`js/minigamesCore.js`, `js/app/minigames.js`) : le « Bon siècle » est devenu un jeu de lecture des chiffres romains,
  dix questions : lire un chiffre romain (XVIIIe) → quel siècle ? (avec ses années), quel siècle contient telle année ? (le piège des années rondes :
  l'an 1700 appartient au XVIIe ; l'an 100 av. J.-C. ouvre le IIe siècle av. J.-C.), et **remettre dans l'ordre chronologique** plusieurs siècles écrits en
  chiffres romains (av. J.-C. compris, où l'ordre s'inverse). 100 points par bonne réponse, −25 par erreur dans l'ordre. Aussi proposé dans la fiche du
  niveau 5 du Monde 0, à côté du Tetris.
- **Calendrier de l'Avent historique** (`js/adventContent.js`, `js/app/minigames.js`) : 31 cases, une par jour de décembre, chacune un événement
  daté de ce jour. On ouvre la case, on retrouve l'année parmi quatre propositions, puis l'événement est expliqué. En décembre, les cases s'ouvrent
  jour après jour ; hors décembre, tout est ouvert pour s'exercer. Progression par année civile (`historiaxe_advent_v1`, sur l'appareil).
  **Le menu principal change chaque jour de décembre** : une carte (`adventHomeCard`) porte l'emoji du jour, une teinte propre à la date
  (`--advent-hue`) et le décompte « Plus que N jours avant Noël » (« Joyeux Noël ! » le 25, « Entre Noël et le Nouvel An » ensuite). Hors décembre,
  elle n'apparaît pas. Les tests moquent la date en remplaçant `adventNow`.

**Jeux de réflexion** (`js/reflexionCore.js`, `js/reflexionContent.js`, `js/app/reflexion.js`) ; le contenu écrit à la main (paires de causes, scènes) est **à relire par un enseignant** :

- **Memory chronologique** : douze cartes face cachée, six événements aux années différentes, chacun une fois en titre et une fois en date.
  Deux cartes qui ne vont pas ensemble (deux événements, deux dates, ou une mauvaise date) comptent une erreur et se recachent. 100 points par
  paire, −25 par erreur.
- **Qui suis-je ?** : six figures à portrait (celles des panthéons : `GameModes.whoCandidates`), à trouver parmi quatre noms voisins en date et en
  domaine. Les indices s'ajoutent un à un : domaine et pays, siècle, deux phrases de la notice, puis le portrait. **Le nom est caché** dans les
  phrases (chaque mot du nom et du nom de classement, avec ou sans accent) : un test le vérifie sur toutes les figures du pack français. On marque
  100, 80, 60, 40 ou 20 points selon le nombre d'indices vus ; une mauvaise réponse retire l'option et dévoile l'indice suivant. Les notices d'un pack
  découpé arrivent thème par thème (`Pack.ensureDescriptions`) : une figure dont la notice ne se charge pas (hors ligne) est écartée. Limite connue :
  une notice qui donne un autre nom de la figure (nom de scène, nom de naissance) le laisse passer.
  **Niveaux** : chaque figure des panthéons porte une notoriété dans le monde, `etoiles` (1 : peu connue, 2 : moyennement, 3 : connue presque partout).
  Facile tire des figures à trois étoiles avec deux indices dès le départ, moyen des figures à deux étoiles, difficile des figures à une étoile, et leurs
  mauvaises réponses sont aussi peu connues que la bonne (`ReflexionCore.whoSelect`). **Mesure** : le nombre de liens interlangues de l'élément Wikidata
  de la personne, collecté par `python3 scripts/pantheon_notoriete.py collecte` (résultat dans `scripts/notoriete/mesures.json`, repris là où il s'est arrêté),
  seuils à 60 et 150 liens, quelques corrections de jugement écrites avec leur raison dans le script (`CORRECTIONS`) ;
  `python3 scripts/pantheon_notoriete.py etoiles --ecrire` écrit `etoiles` dans `scripts/pantheon/*.json` et la liste à relire dans `scripts/notoriete/a_relire.md`
  (cas limites, corrections, liens Wikipédia qui mènent à une page d'homonymie). Puis `python3 scripts/build_pantheon.py <code>` pour chaque panthéon, et
  `npm run build:pack`. Un nouveau personnage sans `etoiles` donne un avertissement à la construction et compte pour « moyennement connu ».
  **Affichage** (`js/renown.js`, `js/app/renown.js`) : le niveau se montre comme une *renommée* — locale (1), régionale (2), mondiale (3) — par un contour
  autour du portrait : un filet bronze, deux filets argent, trois filets or, avec une étiquette (trois pastilles et le libellé) ; la couleur ne porte jamais
  seule le sens. Il décrit la diffusion d'un nom dans le monde, pas la valeur de la personne. On le voit dans la galerie (avec un filtre par niveau), sur la
  fiche d'une figure et, **seulement une fois la réponse donnée**, dans « Qui est-ce ? » et « Qui suis-je ? » (avant, il dirait si la figure est célèbre).
  La case « Afficher la renommée » de la galerie cache les contours et le filtre partout (réglage retenu : `historiaxe_renown_v1`). Le champ de données
  garde son premier nom, `etoiles`.

- **Cause ou conséquence ?** (`ReflexionContent.CAUSES`) : huit questions sur 52 paires écrites à la main (de Salamine à la crise des subprimes). Deux
  événements s'affichent, sans date ; on désigne celui qui a **provoqué** l'autre, ou celui qui est la **conséquence** de l'autre (les deux sens se mêlent,
  et la cause passe tantôt à gauche, tantôt à droite). Après chaque réponse : le lien avec les années, puis une explication qui dit le mécanisme, pas
  seulement l'ordre. 100 points par bonne réponse. Un test vérifie que la cause n'est jamais postérieure à sa conséquence.
- **Chasse aux anachronismes** (`ReflexionContent.SCENES`) : cinq scènes sur treize (banquet de Louis XIV, agora d'Athènes, camp romain, village de l'an 1100,
  port de Palos, Bastille, Verdun, New York 1925, Chine des Han, laboratoire de Lavoisier, salon des Lumières, drakkar viking, Exposition de 1900). Huit
  éléments par scène, dont **un, deux, trois ou quatre** anachronismes (le nombre varie d'une scène à l'autre et n'est jamais annoncé) ; on touche ceux qu'on croit déplacés, puis on valide : 100 points si tout est trouvé sans erreur,
  un élément à sa place désigné à tort retire autant qu'un anachronisme trouvé en rapporte. Chaque tuile se colore (trouvé, manqué, désigné à tort) et
  **chaque élément est expliqué** (quand la chose est inventée, ou pourquoi elle est bien de l'époque : le café de Louis XIV date de 1669). Les scènes
  sont décrites par du texte et des emojis : le dépôt ne contient pas d'illustrations de scènes ; en ajouter se ferait en remplaçant `icon` par une image.

- **Pendu des dates** (`ReflexionCore.createHangman`) : cinq manches ; un événement est nommé, son année est cachée sous des tirets. On devine
  chiffre par chiffre (six vies) ou on tente l'année entière ; une année entière fausse dit « plus tôt » ou « plus tard ». Score : 30 + 10 par vie
  restante. Les chiffres se tapent aussi au clavier.

Les règles sont pures (`ArcadeCore`, testées sans minuteur) ; l'écran ne fait que cadencer et dessiner. Meilleurs scores sur l'appareil
(`historiaxe_arcade_v1`, hors synchronisation). Pas de `touch-action: none` (interdit par `tests/a11y.test.js`) : le glisser du
Snake retient le défilement par un écouteur `touchmove` non passif, seulement sur le plateau.

**L'Atelier** (ex-« boîte à outils » ; `js/toolsCore.js`, `js/app/tools.js`, écrans `#screen-tools` et `#screen-tool-*`) : une carte « Atelier » sous la salle de
jeux, sur l'écran des catégories. Des utilitaires, pas des jeux : pas d'étoiles, rien n'est enregistré, le résultat s'affiche à mesure qu'on tape
(`oninput`). Les calculs sont purs et testés (`tests/toolsCore.test.js`) ; tout ce qui vient de la saisie passe par `textContent`. Le contenu écrit à la main
(leçon, périodes, notes sur les calendriers, fiches des pays) est **à relire par un enseignant**. Huit outils :

**Commandements bibliques** (`js/commandmentsCore.js`, `js/app/commandments.js`, écran `#screen-tool-commandments`, groupe « Repères » de l'Atelier) : cinq listes présentées **selon la tradition juive et rabbinique**, dans cet ordre, avec des onglets et des boutons « liste précédente / suivante » — les sept lois de Noé (Sanhédrin 56a-b ; pour toute l'humanité), les dix commandements (le Décalogue, numéroté à la juive : « Je suis l'Éternel ton Dieu » est le premier ; deux tables de cinq) les trente-neuf travaux interdits le Chabbat (Michna Chabbat 7:2, regroupés 11 + 13 + 9 + 6) et les 613 commandements selon le décompte du Rambam (`js/commandments613Data.js` : 248 positifs et 365 négatifs, chacun avec son verset ; boutons « Tous (613) » / « Positifs (248) » / « Négatifs (365) » (l'onglet s'ouvre sur « Tous »), regroupements par thème (35 : 15 + 20) avec un menu déroulant qui y mène sans cacher le reste (il suit le choix de liste), recherche insensible aux accents, apostrophes et tirets, sur l'énoncé, le verset ou le numéro). Chaque élément a son numéro, son nom, sa source (verset ou traité) et son explication ; chaque liste a un chapeau et des « à savoir ». La cinquième, « Mitsvot pratiques », regroupe trois petites listes de dix mitsvot (les trois mitsvot des femmes, Mishna Chabbat 2:6 ; celles de Pessa'h, Pessa'him 10:5 ; les quatre espèces de Soukkot, Lévitique 23:40), avec un menu déroulant par thème qui mène à chacune sans cacher les autres. La structure est dans `commandmentsCore.js` (pur), les textes sous `tools.cmd_*` de `ui/fr.json` (les autres langues retombent sur le français) ; le bouton « A / א » (comme sur la généalogie, choix mémorisé dans `commandmentsLang`) remplace la transcription des travaux du Chabbat par les lettres hébraïques et ajoute le nom hébreu des lois de Noé et des dix commandements (champ `*_he`) ; `tests/commandmentsCore.test.js` vérifie les effectifs (7, 10, 39, 248, 365), que les regroupements des 613 se suivent sans trou et qu'aucun texte ne manque. Les 613 suivent la liste de Maïmonide en tête du Mishné Torah (le Séfer ha-Mitsvot en diffère légèrement par l'ordre de quelques commandements) ; les énoncés français sont des résumés, et le verset est celui que le Rambam cite, en numérotation hébraïque. Le contenu écrit à la main est à relire par une personne compétente.

**Poids et mesures bibliques** (`js/measuresCore.js`, `js/app/biblical-measures.js`, écran `#screen-tool-measures`, groupe « Convertir et calculer » de l'Atelier) : trois onglets — distances, volumes, monnaies — qui ont chacun un convertisseur (une valeur, une unité biblique ou moderne : les équivalents dans toutes les autres) et une leçon (tableaux des livres, opinions, notes). Chaque famille a une unité de base : le doigt (la coudée en compte 24 ; 48 cm selon Rav Naé, 57,6 cm selon le 'Hazon Ich, au choix dans le convertisseur), l'œuf ou bétsa (l'épha en compte 432 ; ≈ 22 L) et la proutah (le chékel en compte 640 ; ≈ 11,4 g d'argent). Les rapports entre unités bibliques sont donc exacts ; seule la conversion vers mètres, litres et grammes est approchée (le signe ≈ le dit). Pour les monnaies, c'est le poids d'argent qui compte (talent ≈ 17,1 kg, talent pour les usages sacrés ≈ 34,2 kg). Les tableaux des livres (équivalences entre monnaies, volumes en œufs) sont encodés tels quels dans `MONEY_TABLE` et `VOLUME_TABLE`, et `tests/measuresCore.test.js` vérifie que le calcul les retrouve case par case.

**Citations** (`js/citationsCore.js`, `js/app/citations.js`, écrans `#screen-tool-citations` et `#screen-tool-citation`, groupe « Repères » de l'Atelier) : un recueil de phrases qui ont marqué l'histoire, **sans nombre fixé** : il grossit par lots (`assets/citations/NN.json`, listés dans `assets/citations/index.json`, chargés à l'ouverture de l'écran et précachés par `sw.js`). Une recherche sans accent (texte, auteur, contexte, version originale), des filtres (époque, thème, fiabilité, « Incontournables »), deux tris (par date, par auteur) et un affichage par tranches de trente. Chaque fiche donne la phrase, son contexte, sa source précise et **sa fiabilité** : *attestée*, *attribuée* ou *apocryphe*. Les phrases apocryphes (« Qu'ils mangent de la brioche », « Et pourtant elle tourne ») sont gardées exprès, avec la vraie origine. Quand l'auteur a une carte « Naissance de… » parmi les panthéons, la fiche l'ouvre (liée par identifiant, `naissance`) et propose de jouer sur sa biographie ; sans carte, elle s'affiche sans bouton. Le recueil compte plus de cent quarante citations (sept lots), dont des maximes des **Pirké Avot** et des versets de **Kohélet** avec leur texte hébreu. Règles d'écriture, statuts de fiabilité et gabarit d'une entrée : `docs/citations.md`. `tests/citationsCore.test.js` vérifie les règles, l'unicité des identifiants, la validité de chaque entrée et l'existence des liens. Contenu en français seulement, **à relire par un enseignant**.

| Outil | Ce qu'il fait |
|---|---|
| **Convertisseur d'années** | Une année (de 3 800 av. J.-C. à 2100) dans les onze ères de `js/eraConverter.js`, avec la règle repliable ; dit quand l'ère n'existe pas encore ou plus (république de 1792 à 1805, ères japonaises), et les deux réponses quand l'ère change en cours d'année. Aussi proposé dans la fiche du niveau 3 du Monde 0. |
| **Chronologie des chefs d’État** | Liste verticale pour 33 pays : la France, de Clovis à Emmanuel Macron, et trente-deux pays importants (États-Unis, Royaume-Uni, Russie, Chine, Iran, Allemagne, Japon, Brésil, Inde…), choisis par un bouton « Pays » (`js/stateLeadersCore.js`, `js/stateLeadersData.js`, `js/stateLeadersGouvernements.js`, `js/app/state-leaders.js`). Pour les régimes parlementaires qui ont une liste de chefs du gouvernement (Royaume-Uni, Israël, Canada, Australie), deux boutons permettent de choisir entre chefs d’État (par défaut) et chefs du gouvernement. : à gauche les années de début et de fin de règne ou de mandat, à droite le nom et la fonction. Le fond indique la dynastie ou le régime républicain ; un trait sépare chaque nouveau régime. Recherche par nom ou fonction. Liste indicative, testée pour l'ordre des dates et les groupes (`tests/stateLeadersCore.test.js`). |
| **Généalogie biblique** | Un seul arbre horizontal d'Adam aux enfants de Jacob (`js/genealogyCore.js`, `js/app/genealogy.js` ; environ 600 personnes : d'Adam à Jésus, selon les livres de la Bible et la généalogie de Matthieu 1 ; les personnages nommés dans les récits principaux, pas toutes les listes de noms) : lignée d'Adam à Noé, les soixante-dix nations de Genèse 10, la famille d'Abraham, d'Ésaü, la maison de Jacob arrivée en Égypte, Moïse, Aaron et Miriam. Cartes bleu clair (hommes) et rose clair (femmes), conjointes en pastilles, mère indiquée quand le père a plusieurs unions, pointillés pour les descendants lointains ; branches repliables, zoom, recherche (français ou hébreu). Sens vertical par défaut (Adam centré en haut), bouton 🔄 pour le sens horizontal. Trois boutons collés en haut à droite : « A » (français, par défaut), « א » (hébreu sans voyelles) et 🔄 (sens), choix mémorisés. |
| **Chiffres romains** | Nombre ↔ chiffres romains de 1 à 3 999, dans les deux sens, avec la décomposition (1994 = M + CM + XC + IV). Seule la forme usuelle est acceptée : IIII est refusé, avec la bonne forme (IV). Une **leçon** (`#screen-tool-roman-lesson`) explique les sept lettres, l'addition, la soustraction, la règle des trois répétitions (et les cadrans à IIII), la méthode et l'usage en histoire. Aussi proposé dans la fiche du niveau 5. |
| **Siècles et années** | Année → siècle, et siècle (en chiffres arabes ou romains) → années, avant et après J.-C. ; le piège des années rondes est expliqué (l'an 1700 est du XVIIe siècle). |
| **Calculateur de durées** | Années entre deux années, et année ± un nombre d'années, **sans an 0** (de 44 av. J.-C. à 14 : 57 ans). |
| **Une date dans les autres calendriers** | Un jour grégorien (de 1583 à 2500) en julien (calcul exact), juif, musulman, persan, bouddhique, japonais, copte (via `Intl`, le calendrier du navigateur) et républicain (calculé ici : 1792-1805, les débuts d'année sont dans `REPUBLICAN_STARTS`). Le calendrier musulman est arithmétique : le vrai dépend de l'observation de la lune et peut différer d'un ou deux jours, ce que l'écran dit. |
| **Repères de périodes** | Les grandes périodes de l'histoire selon **onze découpages au choix** (`js/periodSystems.js`) : France (Antiquité, Moyen Âge, Temps modernes…), Espagne (Al-Andalus et Reconquista, Rois catholiques et Habsbourg, régimes du XXe siècle), Italie (communes, Renaissance, guerres d'Italie, Risorgimento, fascisme…), Allemagne (Réforme, fin du Saint-Empire en 1806, Kaiserreich, Weimar…), monde anglophone (Early Modern, Contemporary…), Russie (Rus' de Kiev, joug mongol, Moscovie, Romanov, Empire, URSS), monde arabo-musulman (califats omeyyade et abbasside, Mamelouks, Ottomans…), Inde (Sultanat de Delhi, Moghols, domination britannique…), Chine (par dynasties, des Xia à la République populaire), Corée (Trois Royaumes, Goryeo, Joseon, colonisation, deux Corées) et Japon (par capitales et shogunats, puis par ères impériales). Chaque période a ses bornes et ce qui est discuté ; le choix est gardé sur l'appareil (`historiaxe_period_system_v1`). Une année saisie donne sa période dans le découpage choisi **et dans les dix autres** : c'est là qu'on voit qu'ils ne coupent pas aux mêmes endroits (1500 : « Temps modernes » en France, Ming en Chine, Muromachi au Japon). Les périodes d'un découpage se suivent sans trou ni recouvrement (testé), et là où des dynasties coexistaient on suit celle des manuels. |
| **Atlas des pays** | Une carte du monde actuelle (`js/app/countries.js`, `js/countriesCore.js`) : on touche un pays, ou on le cherche par son nom ou sa capitale (sans accent), et la fiche donne le drapeau (un emoji, aucune image), la capitale, les langues, la monnaie, la population **avec son année** (estimation 2024 arrondie) et la région. Les statuts disputés (Taïwan, Kosovo, Palestine, Sahara occidental) et les territoires dépendants sont dits. La fiche liste aussi les événements de l'app situés dans le pays (les points de l'Atlas des événements, retrouvés par leur position dans le contour) et en ouvre la fiche. La carte est **autonome** : les contours (`assets/geo/countries.json`, Natural Earth 1:50 m, domaine public, simplifiés, 215 entités) sont locaux, donc elle marche hors-ligne ; seuls les noms écrits sur la carte demandent le réseau (polices d'OpenFreeMap). Les fiches sont dans `assets/geo/countries-facts.json` (écrites à la main, **à relire** ; les populations sont à actualiser chaque année). Sans WebGL, la recherche et les fiches marchent quand même. Quand le pays a son thème « Histoire de … » (les « Histoires nationales », repérées par le drapeau dans leur nom), un bouton **« Jouer sur Histoire de … »** s'insère entre la fiche et les événements extraits et ouvre ce thème. La fiche compte six lignes : capitale, langues, monnaie, population, région, puis **fête nationale** (jour et événement commémoré ; « aucune fête nationale officielle » pour les 16 entités sans fête, dont le Royaume-Uni et les territoires ; les données sont dans `assets/geo/countries-facts.json`, champs `fete` et `fete_jour` `[mois, jour]`, vérifiés à la main). Le menu **Découvrir** (le dé) a un bouton **Pays** : il ouvre dans l'Atlas, carte et fiche comprises, le pays dont c'est la fête nationale aujourd'hui (bannière « Fête nationale aujourd'hui », au sort s'il y en a plusieurs ; `CountriesCore.discoverPick`), sinon un pays au hasard ; le bouton « Un autre pays », en bas d'écran, repioche sans répéter le précédent. |
| **Quiz des pays** | Un jeu de questions sur les pays (`js/modes/geoquiz.js`, `js/geoQuizCore.js`, `js/geoQuizSessionCore.js`), lancé depuis l'Atlas des pays ou la Salle de jeux. **Réglages** : zone (monde, Afrique, Amériques, Asie, Europe ou Océanie), difficulté (une part des pays de la zone, les plus peuplés d'abord : facile 20 %, moyen 50 %, difficile tous les pays, avec des fausses réponses de la même région ; une petite zone garde au moins 6 pays, et l'écran donne le nombre réel), nombre de questions (5, 10, 20, 50) et chrono (sans chrono par défaut, 3 s, 7 s ou 15 s par question) ; les réglages restent sur l'appareil. **Formes** : QCM (indices et quatre réponses), drapeau → pays, « touche le pays » sur la carte, **carte → nom** (le pays est surligné, sans nom, quatre noms à choisir), **saisie libre** (nom ou capitale tapés ; accents, majuscules, article et fautes légères tolérés, sauf si la saisie est plus proche d'un autre pays), **fêtes nationales** (fête → pays ou pays → fête), **Qui suis-je ?** (indices révélés un à un, à la demande ou à chaque erreur ; chaque indice resté caché rapporte 20 points), **Pays mystère** (6 essais ; chaque proposition donne distance, direction et proximité ; 20 points par essai restant), **Rafale** (60 s pour enchaîner, la question suivante arrive seule) **Survie** (3 vies, une par erreur), **Voisins** (quel pays a une frontière terrestre avec X ; les voisins viennent de `nb` dans `assets/geo/countries-facts.json`, calculés sur les contours puis complétés à la main pour trois frontières que le tracé simplifié manque ; les trois mauvaises réponses ne sont ni voisines ni à moins d'un degré, `nr`), **Plus ou moins** (le plus peuplé, au moins 1,5 fois, ou le plus au nord, d'au moins 8° de latitude), **Chefs d'État** (qui dirigeait en telle année, d'après les listes de `js/stateLeadersCore.js` pour 33 pays ; une année n'est posée que si un seul mandat la couvre) et **Duel à deux** (deux joueurs sur le même appareil, chacun son tour, le même nombre de questions, rien d'enregistré), et **panaché**, qui mélange QCM, drapeau, carte, carte → nom, saisie, fêtes, Qui suis-je ?, voisins et plus ou moins (un pays une seule fois, jamais plus de deux fois la même forme de suite). Le chrono par question ne s'applique ni à la Rafale, ni à la Survie, ni au Pays mystère. **Maîtrise** : chaque réponse alimente le suivi du pays interrogé (vu, réussi, cinq dernières réponses) ; un pays est *maîtrisé* (au moins 3 réponses, 80 % de réussite et la dernière juste), *à revoir* (dernière fausse, ou moins de la moitié de réussite), *en cours* ou *jamais vu*. « Ma maîtrise des pays » montre les drapeaux par continent selon ce niveau ; « Réviser mes pays faibles » tire d'abord les pays à revoir (tous niveaux confondus), puis les pays en cours, puis les nouveaux, en panaché, sans chrono et hors des records. Un « Qui suis-je ? » trouvé après des erreurs ne compte pas comme su ; « plus ou moins », « chefs d'État » et le duel ne nourrissent pas la maîtrise. **Défi du jour** : dix questions panachées (monde, niveau moyen, sans chrono) tirées de la date, donc les mêmes pour tous ; seule la première partie du jour compte (`daily` dans l'état), la série compte les jours de suite. **XP et trophées** : une partie donne un cinquième de ses points en XP (300 au plus ; moitié moins en révision), + 10 par pays devenu maîtrisé, + 100 pour le défi du jour ; six trophées (Globe-trotter, Cartographe, Sans-faute géographe, Voyageur assidu, Flair de détective, Rafale d'érudit). La maîtrise et le défi du jour sont synchronisés avec le compte (`mergeGeoQuiz` : plus grand compte par pays, meilleur score par jour). Le jeu de pays comprend les territoires et les entités contestées, sauf la Palestine, que le quiz exclut. **Points** : 100 par bonne réponse, + 10 par bonne réponse de suite déjà obtenue (jusqu'à + 50), + un bonus de vitesse avec un chrono : 300 divisé par le temps accordé, réduit selon le temps restant (jusqu'à 100 points à 3 s, 43 à 7 s, 20 à 15 s) ; un temps écoulé compte comme une erreur. **Scores** : le meilleur score de chaque réglage et les 50 dernières parties sont enregistrés (`historiaxe_geoquiz_v1`) et **synchronisés avec le compte** (`mergeGeoQuiz` : le meilleur score de chaque réglage, les historiques réunis sans doublon) ; « Mes scores » les montre, avec **Mes statistiques** : parties jouées, pourcentage de bonnes réponses, plus longue série et une ligne par forme (parties, réussite, meilleur score, série). « Ma progression » trace le pourcentage de bonnes réponses de chaque partie (les 50 dernières) ; « Pays les moins bien réussis » et « mieux réussis » classent les pays vus au moins deux fois (moins de 100 % pour les premiers, au moins 80 % pour les seconds). Les compteurs ne sont jamais tronqués (contrairement aux 50 dernières parties) ; à la fusion entre deux appareils, chaque compteur prend le maximum, donc une partie jouée sur un seul appareil peut ne pas apparaître dans le total de l'autre. À la fin, les erreurs sont listées avec la bonne réponse, et « Rejouer mes erreurs » en fait une partie de révision, qui n'est pas enregistrée. Tests : `tests/geoQuizCore.test.js`, `tests/geoQuizSessionCore.test.js`, `tests/sync-merge.test.js`, `e2e/geoquiz.spec.js`. |
| **Villes du monde** | Cinq jeux de villes, de dix questions, dans la section « Jeux géographiques » de la Salle de jeux (la carte « Villes du monde » ouvre un menu) : `js/modes/cities.js`, `js/cityGameCore.js`, `js/cityHistoryCore.js`. **Les villes** : `assets/geo/cities.json` (environ 1 150 villes : au moins 500 000 habitants, plus toutes les capitales, avec le nom français, le pays rattaché à l'Atlas, les coordonnées et la population maximale connue), produit par `node scripts/cities/build_cities.js` à partir de Wikidata (CC0) ; à relancer pour la mettre à jour. Le script écarte les entités administratives (« Ville de Madrid », « Métropole de Lyon », « Grand New York »), ne garde qu'une ville par nom et par pays, et corrige à la main quelques libellés (`NAME_FIXES`). Les populations sont des estimations d'années différentes : elles ne servent qu'à départager et à classer. **Les jeux** : « Capitale ou plus grande ville ? » (la capitale d'un pays ou sa plus grande ville, avec l'autre en piège parmi les réponses ; la plus grande ville n'est posée que si elle devance la suivante d'au moins 30 %), « Quelle ville est la plus au nord (ou au sud) ? » (quatre villes de pays différents, l'une nettement devant les autres : au moins 3 degrés), « Touchez la ville sur la carte » (une carte sans aucun nom, tracée avec les contours locaux, donc hors ligne ; 100 points, moins avec la distance, `exp(−d / 1 300 km)` après 10 km de tolérance), « Classer les villes par population » (quatre villes de pays différents, d'au moins 100 000 habitants, séparées d'au moins 30 % ; 25 points par ville bien placée) et **Villes de l'histoire**. Les mauvaises réponses viennent du même continent en difficulté « difficile ». **Réglages** : la zone, la difficulté et le chrono sont ceux du Quiz des pays (même choix, même enregistrement) ; la zone et la difficulté ne gardent que les villes des pays retenus. Avec un chrono, chaque question a son temps accordé : sans réponse, c'est une erreur ; une bonne réponse rapide gagne le bonus de vitesse du Quiz des pays, proportionnel à la justesse pour les jeux de carte et de classement. Rien n'est enregistré. **Villes de l'histoire** : « Où se déroule ce fait ? », un fait de l'Atlas des événements à situer en touchant la ville. Le vivier est celui du Mode Carte (lieux sûrs, sans drapeau « discutable »), limité aux lieux de **ville** qui se rattachent à une ville du jeu : à moins de 5 km de son centre, ou de 12 km avec le même nom (Röcken, où naît Nietzsche, n'est pas Leipzig). **Un fait dont le titre nomme la ville est écarté**, faute de quoi le jeu ne demanderait que de situer une ville connue. On montre le titre, l'année et le thème ; la description, qui nomme souvent la ville, vient après la réponse (elle se charge à la demande, `Pack.ensureDescriptions`). Une ville au plus par partie, tirée avec un poids racine de son nombre de faits ; au plus deux naissances ou décès. **Période** : Toutes, Antiquité (avant 500), Moyen Âge (500–1491), Époque moderne (1492–1788), Époque contemporaine (1789 →) ; le choix reste pendant la session, et une période a moins de faits, donc une partie peut être plus courte. Sur la base actuelle : environ 1 800 faits dans 360 villes. Tests : `tests/cityGameCore.test.js`, `tests/cityHistoryCore.test.js`. |
| **Cartes historiques** | **Trente-six entités**, rangées dans un **menu déroulant à quatre groupes d'apogée** (« jusqu'en 500 », « entre 500 et 1500 », « entre 1500 et 1800 », « depuis 1800 » : des bornes neutres plutôt que Antiquité ou Moyen Âge), car trente-six puces encombreraient l'écran (seules les deux à quatre dates de l'empire choisi restent des puces) : Mésopotamie, Égypte pharaonique, Empire maurya, Han, Empire romain, Empire d'Aksoum, Empire gupta, civilisation maya, Empire perse achéménide, Empire d'Alexandre (et royaumes des Diadoques), Empire byzantin, Califat arabe, Empire carolingien, Saint-Empire romain germanique, Empire du Mali, Empire mongol, Empire songhaï, Empire ottoman, Empire de Charles Quint, Empire aztèque, Empire inca, royaume de Kongo, Empire chinois des Qing, Empire d'Éthiopie, Empire britannique, Empire russe, Empire napoléonien, Empire austro-hongrois, Empire colonial français, Empire parthe, Empire perse sassanide, Mapungubwe et Grand Zimbabwe, Empire khmer, Empire du Japon, Empire allemand et Royaume de Prusse. Une zone formée de plusieurs anneaux (des îles, des territoires séparés) porte le même nom partout : la légende n'en fait qu'une ligne. Chacune a 2 à 4 **instantanés datés** (Rome en 14, 117 et 395 ; Byzance en 565, 1025 et 1450 ; le partage de Verdun en 843 ; les quatre khanats mongols en 1279…), souvent en plusieurs zones colorées. **Deux façons de regarder** : « Par empire » (le menu, puis une date) et « Par date » (un **curseur temporel** de 3500 av. J.-C. à 2000, à échelle irrégulière, qui montre toutes les entités existantes à l'année choisie, chacune avec la carte la plus proche ; toucher une ligne ouvre l'empire ; des dates repères en raccourci). Par empire, la carte colore la zone, la fiche donne capitale, période, un texte par date et les événements de l'app **situés dans la zone pendant la période de l'entité** (ouverture de leur fiche). **Les contours sont dessinés à la main (`js/historyMapsCore.js`) et approximatifs** : aucune source libre fiable, et un tracé « exact » serait trompeur (frontières anciennes floues, discutées). Ils peuvent déborder sur la mer : un **masque de mer** (`assets/geo/sea.json` : tout ce qui n'est pas terre, calculé une fois à partir de l'union des pays actuels et **découpé en cases de 30°** ; un seul polygone « monde moins 1 200 masses de terre » se faisait mal trianguler et laissait des bandes de mer parasites sur la terre selon le cadrage ; la source `sea` est en `tolerance: 0`) ne laisse colorée que la terre. Chaque entité a ses villes repères (`places`), en points toujours visibles et en noms (réseau). Pour ajouter une entité ou une date : un anneau `[lon, lat]` de plus dans `ENTITIES` ; `tests/historyMapsCore.test.js` refuse un contour qui se recoupe ou une ville repère mal placée (par exemple Londres dans l'Empire romain de l'an 14). |
| **Cartes bibliques** | **Six cartes du Levant** refaites à la main d'après un ouvrage de référence en culture biblique : les lieux où Abraham a séjourné (quatre autels), la guerre des rois de Genèse 14 (huit conquêtes numérotées, deux versions de la poursuite d'Abraham en puces), les lieux de Jacob et de ses enfants, les quarante-deux étapes du désert (Nombres 33, avec les guerres et la chronologie des quarante années), le mont Guerizim et le mont Ebal (Deutéronome 27) et le partage de la terre par tribu (treize zones colorées, `zones` dans `js/biblicalMapsCore.js`, recouvertes par le masque de mer des cartes historiques ; seconde carte avec la part supplémentaire de Dan, selon Rachi). Un menu choisit la carte, des puces la vue (d'ensemble ou de détail). Le fond est celui des cartes historiques (pays actuels sans frontières, lacs et fleuves dessinés à la main) ; **les lieux sont des repères HTML** (`maplibregl.Marker`), avec leur nom hébreu, sans police du réseau, et s'affichent par niveaux de détail au zoom (`lv`, `top`, `dense`, `all` dans `js/biblicalMapsCore.js`). Toucher un lieu ouvre sa note et son verset ; la fiche en donne la liste, utilisable sans WebGL. Les positions sont approximatives, `(?)` marque un emplacement discuté. `tests/biblicalMapsCore.test.js` vérifie les positions (dans leurs vues, sur la terre) et les numéros d'étapes. |
| **Calendrier annuel** | Une liste de **366 jours** (le 29 février compris), du 1er janvier au 31 décembre (`js/app/calendar.js`, règles dans `js/calendarYearCore.js`, testées). À gauche la date ; à droite les **fêtes nationales** (le nom du pays avec son drapeau émoji, données de `countries-facts.json`) et les **fêtes chrétiennes à date fixe** (Épiphanie, Chandeleur, Annonciation, Assomption, Toussaint, Noël, etc. ; les fêtes mobiles sont datées pour l'année choisie). Un **champ d'année** (1583-2400, année en cours par défaut) date les **fêtes mobiles** : Mardi gras, Mercredi des Cendres, Pâques, Ascension, Pentecôte et Fête-Dieu, calculées localement (algorithme de Meeus, calendrier grégorien, sans réseau : « 5 avril : Pâques (2026) »), et les **fêtes juives** : Roch Hachana, Yom Kippour, Souccot, Hanouka, Pourim, Pessa'h, Chavouot et Tisha B'Av, calculées par le calendrier hébraïque arithmétique (Reingold et Dershowitz), avec Pourim en Adar II les années à deux Adar. Chaque fête chrétienne porte une croix ✝️, chaque fête juive une étoile de David ✡️, sauf Hanouka qui a une ménorah 🕎. Les **fêtes musulmanes** (Nouvel an hégirien, Achoura, Mawlid, Isra et Miraj, début du ramadan, Laylat al-Qadr, Aïd al-Fitr, Aïd al-Adha) sont calculées par le calendrier hégirien arithmétique, avec le croissant ☪️ ; comme tout calcul, elles peuvent différer d'un jour de l'observation locale de la lune. Les fêtes juives et mobiles n'apparaissent qu'avec une année choisie. **Yom Haatzmaut**, fête nationale d'Israël (5 iyar, depuis 1949), y figure aussi, avec le drapeau et l'année : « 🇮🇱 Israël (2026) ». Elle est affichée à la date de sa célébration officielle (`israelCelebrationDay`) : avancée au jeudi quand le 5 iyar tombe un vendredi ou un samedi (depuis 1951), reportée au mardi quand il tombe un lundi (depuis 2004, règle du Grand Rabbinat) ; la fiche d'Israël dans l'Atlas explique la règle. Sans année (`yearDays(facts)`), le calendrier reste intemporel et ne les montre pas. Une barre de douze mois mène directement à un mois ; sur grand écran, les mois se rangent en trois colonnes. Les **journées des saints patrons des nations du Royaume-Uni** y figurent aussi (Pays de Galles 1er mars, Irlande du Nord 17 mars, Angleterre 23 avril, Écosse 30 novembre), avec le drapeau émoji quand il existe (l'Irlande du Nord n'en a pas) ; la fiche du Royaume-Uni dans l'Atlas donne les quatre journées dans une note, sans les compter comme fête nationale. Le jour courant est surligné. |

Pour ajouter un outil : une fonction pure dans `ToolsCore` (avec ses tests), un écran `screen-tool-…` dans `index.html`, ses textes dans `ui/fr.json` (groupe `tools`),
une entrée dans `TOOL_SCREENS` et une carte dans `#screen-tools`. Un outil se lance avec `openTool(id, écranDeRetour)` ; depuis le Chemin, il rend la main au Chemin
(`PATH_SIDE_GAMES` dans `js/app/path.js`, jusqu'à trois boutons par fiche).

Les **leçons** sont une nouvelle sorte d'épreuve (`js/app/lesson.js`, écran `#screen-lesson`) : des questions
**rédigées à la main** (`js/pathLessons.js` : 9 séries, 71 questions, la première réponse est la bonne et
l'ordre est mélangé à l'affichage). Après chaque réponse, juste ou fausse, l'**explication** s'affiche ; une
erreur coûte une vie. Le contenu reprend les trois idées du cours, avec une correction de l'idée 1 : toute
société combine un temps cyclique (fêtes, saisons) et un temps linéaire (une ère), plutôt qu'opposer un temps
« occidental » linéaire et un temps « juif » cyclique. **Tout ce contenu est à relire par un enseignant.**

### Mondes chrono-thématiques

Un niveau peut fixer ses événements à la main (`ids`, comme au Monde 0) ou les tirer dans une fenêtre de temps
(`from`/`to`), éventuellement **restreinte à des thèmes** (`themes`) : c'est ce qui permettra des mondes « la
Grèce », « Rome » ou « les guerres de Religion » sur le modèle des collections Belin, au lieu de tout ce qui
s'est passé dans le monde à la même époque. Avec des thèmes, les événements non incontournables entrent aussi
dans le tirage (les incontournables restent prioritaires). `PathCore.sliceWindows` propose un découpage en
niveaux d'effectifs voisins : plus le temps est dense, plus les tranches sont courtes.

### Le paysage des mondes

Chaque monde est un petit paysage, façon Castle Crumble : un pré (teinte propre au monde), la route qui serpente, des
décors de l'époque de part et d'autre (oliviers et colonnes en Grèce, tentes et bannières pendant la guerre de Cent Ans,
cratères et barbelés en 14-18, éoliennes et antennes aujourd'hui…) et, au bout du chemin, **le monument que garde le
boss** : grotte ornée, ziggurat, Parthénon, Colisée, château fort, cathédrale, Versailles, Bastille, tour Eiffel,
fort ruiné, tours de bureaux… un monument différent par monde, îles comprises. Le monument s'illumine d'or quand le
boss est vaincu ; un monde pas encore atteint reste en grisaille.

Les dessins sont des SVG à plat (`js/pathSprites.js`, aucune image à charger, pas de dégradé) ; `js/pathScenery.js`
choisit le thème de chaque monde et place les décors de façon déterministe, sans jamais en poser sur la route
(`tests/path.test.js` le vérifie, et que tout dessin cité existe). Pour changer le décor d'un monde, ou en ajouter,
c'est le tableau `THEMES` de `pathScenery.js` ; pour un nouveau dessin, une entrée dans `pathSprites.js`.

### Clio, la mascotte : où elle apparaît

En attendant ses dessins (`docs/direction-artistique.md`), Clio est un chat en emoji qui porte le costume du moment.
Toutes ses apparitions passent par `clioAvatar` (`js/app/clio.js`) : quand les vrais visuels arriveront, c'est le seul
endroit à changer.

- **Sur le Chemin** : debout près du niveau à jouer, du côté opposé à son titre ; elle **marche jusqu'au niveau suivant**
  après une première victoire (immobile si « réduire les animations » est demandé). On peut la toucher : elle encourage.
  À la toute première visite, elle se présente.
- **À la fin d'un niveau** : réaction à la mesure du résultat — contente (1-2 étoiles), ravie (3), douce après une
  défaite, ravie pour un boss.
- **Boss d'un monde vaincu** : elle propose le **costume du monde** (avec un bouton vers la boutique) ou dit ce qu'il manque
  en pièces.
- **À l'accueil, une fois par jour** : bonjour, un mot sur la série quotidienne, ou — si celle-ci s'éteint ce soir — elle dort
  et le dit. Fermable d'un tap.

**Le système de réactions** (`js/clioCore.js`, testé sans navigateur) : un événement donne une humeur (`repos`, `content`,
`ravi`, `triste`, `reflechit`, `salue`, `dort` — les poses d'animation prévues pour l'illustrateur) et une phrase tirée d'une
banque fixe et traduite (`clio.line.<événement>.<n>` dans `ui/fr.json`), jamais deux fois la même d'affilée. Aucun texte
libre ni généré. **Elle n'apparaît jamais pendant une partie chronométrée.** Pour ajouter une réaction : un événement dans
`EVENTS` (humeur + nombre de variantes), ses phrases dans `fr.json`, et un appel à `clioReaction(événement, paramètres)`.
Elle se souvient, sur l'appareil seulement (`historiaxe_clio_v1`, hors synchronisation), de la dernière salutation et des
dernières phrases. Tests : `tests/clio.test.js`, `e2e/clio.spec.js`.

### Les récompenses : pièces, série de victoires, cartes, boutique

La boucle qui donne envie de « jouer encore un niveau » (modèle : Royal Match). Les **règles** sont dans
`js/rewardsCore.js` (pur, testé : `tests/rewards.test.js`), les **écrans et effets** dans `js/app/rewards.js`
(`e2e/recompenses.spec.js`). L'état est dans `historiaxe_rewards_v1`, synchronisé dans le cloud.

- **Pièces 🪙.** Un niveau réussi paie **10 / 15 / 20** pièces selon ses étoiles (**×4** pour un boss), plus une
  **prime au premier passage** (10 ; 30 pour un boss) et une **prime de série**. Un niveau **perdu** paie quand même
  une consolation (2 pièces par épreuve réussie, 6 au plus) : on récompense l'effort. **Rejouer sans faire
  mieux ne paie que 40 %**, sans prime ni carte : on peut rejouer pour le plaisir, pas pour farmer.
- **Parties libres.** Une partie hors Chemin paie peu (8 pièces à la victoire, + points, + parfait, + défi du jour,
  2 pour une défaite) et **plafonne à 200 pièces par jour** ; aucune pièce dans les modes sans enjeu
  (Entraînement, Découverte, Mode Classe, Mode Carte, multijoueur). L'Expédition libre paie 4 pièces par épreuve
  réussie + 20 si elle est menée au bout. Le Chemin reste la source principale.
- **Série de victoires ⚡.** Chaque niveau réussi d'affilée ajoute 5 pièces de plus (25 au plus) ; une défaite la
  remet à zéro (le record reste), un abandon ne la touche pas. Des **primes de palier** tombent à 3, 5, 10 et 20
  victoires (20, 40, 100, 200 pièces). Distincte de la série quotidienne 🔥.
- **Cartes de personnages 🎴.** Un **album par monde** (20 mondes, 8 à 12 figures chacun) : les figures à portrait
  du jeu, classées dans le monde où elles ont **40 ans** (la date des portraits est celle de la naissance :
  Napoléon, né en 1769, est de la Révolution et de l'Empire), une figure dans un seul album. Une carte tombe à la
  **première réussite** d'un niveau, une de plus par étoile gagnée en plus du meilleur résultat, **trois (dont une
  rare au moins) pour un boss**. Les îles piochent dans l'album de leur monde d'attache. Rareté : **légendaire** si
  la figure a une biographie dans le jeu, **rare** si elle est incontournable de son panthéon, sinon commune. Album
  complet : +150 pièces ; carte en double : 10 / 20 / 40 pièces. Toucher une carte de l'album ouvre la fiche.
- **Boutique de Clio 🛍️.** Un **costume par monde** (21, de 100 à 600 pièces), qui ne s'achète qu'une fois le monde
  atteint. Clio est la future mascotte (un chat, qui changera de costume à chaque époque) : en attendant les
  dessins, un chat et l'emoji du costume en tiennent lieu — l'écran le dit. Le catalogue a déjà un emplacement
  « décors d'arrière-plan », vide. Un Chemin entièrement fait à trois étoiles rapporte à peu près de quoi tout
  acheter : ce rapport est vérifié par un test.
- **Effets.** Les étoiles jaillissent l'une après l'autre, le gain monte (`+45 🪙`) pendant que des pièces volent
  jusqu'au porte-monnaie, la série à partir de 3 lance des confettis, puis la carte se retourne. Tout se montre
  d'un coup avec « réduire les animations ».
- **Pas d'argent réel dans la boucle.** Les pièces et les cartes **ne s'achètent jamais** : ce serait des
  « loot boxes » (interdites en Belgique, surveillées en France) dans un jeu joué par des mineurs. Quand la
  monétisation viendra : publicité, retrait de la publicité, costumes ou décors cosmétiques ; jamais de contenu
  pédagogique bloqué, jamais de paquets de cartes payants pour des mineurs, et le Mode Classe reste gratuit (voir « Décisions produit »
  plus bas pour une éventuelle offre réservée aux adultes).

### Décisions produit à garder en tête (non codées)

- **Cartes payantes pour adultes** : écartées pour l'instant, mais envisageables plus tard pour un public adulte
  seulement (vérification d'âge, jamais d'accès aux mineurs). À étudier pays par pays avant toute décision : la
  Belgique interdit les « loot boxes » pour tous, pas seulement pour les mineurs ; une alternative sans hasard
  (acheter une carte précise, pas un paquet tiré au sort) évite le problème.
- **Équipes** : deux familles. **Équipe de classe** : codée (voir « L'équipe de classe » plus bas). **Équipes libres**
  (à concevoir), façon Clash of
  Clans, que tout joueur peut créer ou rejoindre (jeu tout public). Garde-fous prévus dès la conception : aucun
  texte libre entre joueurs (messages et emojis prédéfinis seulement), pseudos modérés, consentement parental sous
  15 ans (RGPD), signalement, et pas de classement public des mineurs avec leur vrai nom.

### Où est quoi

| Fichier | Rôle |
|---|---|
| `js/pathWorlds.js` | **généré** (`node scripts/path_plan.js --write`) et figé : groupes de thèmes, mondes, tranches de temps |
| `js/pathCore.js` | moteur **pur**, testé hors navigateur (`tests/path.test.js`) : construction des mondes, composition d'un niveau, doublons, étoiles, déblocage des niveaux, des mondes et des îles, XP |
| `js/pathLessons.js`, `js/app/lesson.js` | les questions des leçons (pur, testé) et l'écran qui les pose |
| `scripts/path_plan.js` | la liste des mondes, mesurée sur `data/fr.json` → `docs/chemin-du-temps-mondes.md` ; `--write` fige les tranches dans `js/pathWorlds.js` ; `--titles` aide à écrire les titres |
| `js/app/path.js` | l'écran `#screen-path` (carte SVG + pastilles, fiche d'un niveau), le lancement d'un niveau, la récompense (`pathOnLevelFinish`) |
| `js/app/expedition.js` | réutilisé tel quel ; `startExpedition(plan)` lance un niveau (vivier imposé via `revisionMode`, comme la révision) |
| `js/storage.js` | `PATH_PROGRESS_KEY` (`historiaxe_path_v1`), **synchronisée** dans le cloud (`SYNC_KEYS`, aucune modification de l'API) |
| `ui/fr.json` | clés `path.*` (titres des niveaux : `path.worlds.<monde>.levels.<n>`) — **français seulement** : les autres langues retombent sur le français |
| `e2e/chemin.spec.js` | la carte, le Monde 0 et ses leçons, le passage d'un monde, un niveau joué, les étoiles, le déblocage, l'abandon, le boss, et que **chaque niveau démarre avec chacune de ses épreuves** sans alerte |

### Ajouter un monde

Ajouter l'entrée au `PLAN` de `scripts/path_plan.js` (bornes, groupes de thèmes, nombre de tranches, `tiers`),
**en gardant les mondes existants tels quels** (relancer `--write` re-découperait leurs tranches si les données
ont changé : vérifier avec `git diff js/pathWorlds.js` que seules les nouvelles lignes bougent), puis écrire ses
titres dans `ui/fr.json` (`path.worlds.<id>` : `title`, `boss`, `done`, `levels`, 46 caractères au plus : le
test le vérifie). `--titles` liste, pour chaque niveau, ses repères les plus connus.

### Limites assumées de ce prototype

- **Franco-centré** pour le chemin principal à partir de 481 (suivre les collections Belin) ; le reste du monde
  est dans les îles. Les parcours nationaux et la frise personnelle qui grandit à chaque niveau n'existent pas
  encore.
- **Les titres des niveaux sont un premier jet** (195 titres écrits à la main) ; la composition des niveaux,
  elle, est automatique : un repère obscur peut subsister dans une tranche pauvre en événements connus, et les
  niveaux « pointus » (2e et 3e tiers) sont par construction moins célèbres. Une relecture historique reste à
  faire.
- **Les modes jouent sur des années** : dans une tranche courte (6 ans), l'ordre chronologique est grossier.
- **Français seulement** pour les textes ; sur un autre pack de langue, un niveau qui trouve moins de 8
  événements refuse de se lancer (`PATH_MIN_EVENTS`).
- **Aucune mesure de rétention** (voir « Télémétrie » plus haut) : on ne saura pas si le parcours retient
  mieux que le jeu libre sans cela.
- Les étoiles sont synchronisées en « dernière écriture gagne », comme le reste de la progression.
- **Plus de 190 niveaux, jamais testés par des joueurs** : la difficulté (épreuves choisies selon la place du
  niveau dans le Chemin) et la durée d'un niveau (3 à 5 minutes) sont des hypothèses.

## Le Mode Classe : une séance en direct pour une classe

L'enseignant choisit un thème (carte « Mode Classe » dans le groupe Outils de l'écran des
modes), le nombre de cartes (10, 15 ou 20) et obtient un **code de 6 caractères**
(`ABCDEFGHJKLMNPQRSTUVWXYZ23456789` : sans I, O, 0, 1, pour se dicter). Les élèves le
saisissent (Défis › « Rejoindre une classe ») avec leur prénom, patientent dans le salon,
puis **placent les mêmes cartes dans le même ordre** quand l'enseignant lance la séance. Son
écran montre le classement et l'avancement de chacun en direct ; à la fin, **les cartes les
plus ratées** de la classe — ce que l'enseignant va reprendre en cours.

- **Pas de temps réel.** Une classe, c'est ~30 requêtes de quelques Ko toutes les 2,5 s sur
  les fonctions Vercel existantes (`api/classroom.js`, une fonction de plus). Pas de websocket.
- **Le score n'est jamais déclaré par l'élève.** Comme pour le Défi du jour, il envoie le
  **journal cumulatif** de ses placements (renvoyé à chaque carte) et le serveur le rejoue
  (`DailyEngine.replayDailyGame`, désormais avec `{ lives: Infinity }` et un détail carte par
  carte) : mêmes règles que la frise, mais **sans élimination** — trois vies feraient sortir
  des élèves en pleine séance. C'est aussi ce qui donne, carte par carte, qui a juste.
- **Le paquet** est fixé par l'enseignant (ids dans l'ordre de jeu, le premier est l'ancre) ;
  le serveur vérifie qu'ils existent. Un élève dont le pack ne les connaît pas est invité à
  mettre l'app à jour plutôt que de jouer un autre paquet.
- **Pas de compte, pas de donnée durable.** L'enseignant est reconnu à l'identifiant de son
  appareil ; les élèves ne sont que des prénoms libres (nettoyés, 20 caractères, affichés comme du
  texte et jamais comme du HTML), jamais renvoyés avec un identifiant ; une séance ne vit que
  **deux jours** (purge à la création suivante) et compte au plus 60 élèves.
- Tables `class_sessions` et `class_players` (créées par `ensureSchema`, voir aussi
  `api/_lib/schema.sql`). Côté client : `js/classroom.js` (écran `#screen-class`, un seul écran,
  des panneaux qui se relaient) et le mode `'class'` de la frise (`startActualGame`).
- **Tests.** `tests/classroom.test.js` fait tourner les vrais endpoints sur **Postgres en
  mémoire** (`pg-mem`, dépendance de développement) : création, salon, départ, rejeu, classement,
  bilan, droits de l'enseignant, purge, plafond ; `e2e/classe.spec.js` vérifie l'interface contre un
  faux serveur de séance.
- **Pas fait** : pas d'export du bilan, pas de reprise d'une séance par un autre appareil de
  l'enseignant, pas de mode « cours » avec correction projetée carte par carte.

### Plusieurs modes dans une séance

L'enseignant coche, un par ligne, les modes que les élèves enchaîneront (la frise d'abord, puis le fil du temps, « Trouve l'écart », « Avant / Après », le quiz, la remise en ordre, le curseur, le blitz vrai / faux et l'intrus), et peut mélanger leur ordre. Tous jouent sur le même paquet de cartes ; les points s'additionnent au tableau, en direct.

- `js/classModes.js` (client + serveur) construit les manches de chaque mode à partir du paquet (un générateur pseudo-aléatoire initialisé par le paquet : mêmes questions pour tous, et pour le serveur) et rejoue les journaux : l'élève n'envoie jamais de score, seulement ses réponses (`logs: { frise: [...], quiz: [...], ordre: [...], ... }`). Les générateurs de `js/gameModes.js` (remise en ordre, curseur, blitz, intrus) sont réutilisés tels quels. Le blitz se joue sans chronomètre en classe, le fil du temps sans indice, le quiz sans 50/50. Un mode qui ne peut bâtir aucune manche sur un petit paquet (l'intrus) est passé. Ne sont pas proposés : Périodes & Ères, Carte, Qui est-ce ?, Pendant ce temps, ailleurs… et les jeux d'arcade (libellés propres à la langue, gestes ou jeu libre, rejeu serveur sans objet).
- Chaque mode vaut au plus 100 points par manche, pour que les scores se comparent : la frise garde son barème (combo, vitesse) ramené à cette échelle, le fil du temps retire des points selon l'écart, « Trouve l'écart » vaut 100, 80, 60… selon l'essai, « Avant / Après » 100 ou 0.
- Le bilan devient « manches les plus ratées », avec le mode ; la barre de toute la classe et le podium additionnent tous les modes.
- Colonne `class_sessions.modes` (jsonb), ajoutée par `ensureSchema`.

## L'équipe de classe : un coffre commun

L'enseignant crée une équipe (écran **Équipe**, bouton 👥 de la barre de récompenses du Chemin) : un nom, un
**code de 6 caractères** comme le Mode Classe. Les élèves la rejoignent avec ce code et leur prénom. Tout ce qu'ils
gagnent remplit un **coffre commun** :

- chaque **étoile gagnée de plus** sur un niveau du Chemin = 1 point (rejouer un niveau sans progresser ne verse rien) ;
- chaque **bonne réponse** d'une séance de Mode Classe que l'enseignant a **liée à l'équipe** (case « Compter pour
  l'équipe », cochée par défaut) = 1 point, versé une seule fois par carte (le serveur rejoue le journal des
  placements, comme pour le classement).

La cible du coffre grandit avec la classe : 12 points par élève, au moins 60. Coffre plein, **chaque membre touche
des pièces** (40, 50… 80 au plus) et **un coffre sur trois contient une carte rare pour chacun** (tirée dans l'album
du monde le plus avancé du joueur ; pièces à la place tant qu'il n'a aucun album ouvert) — le compteur de cartes
rares offertes est le trophée de la classe. Un élève qui arrive après l'ouverture d'un coffre ne le touche pas.
Les coffres se réclament automatiquement et ne paient qu'une fois, même depuis deux appareils.

**Compte personnel.** Un élève connecté (e-mail ou Google, voir `api/account.js`) garde ses points d'équipe : le
serveur les cumule sur son joueur (`players.team_points`, qui suit le compte d'un appareil à l'autre) et il touche
**une pièce de plus par point apporté**. Sans compte, les points servent le coffre mais ne restent à personne ; l'écran
l'écrit en clair pour inciter à se connecter, sans rien promettre de plus.

**Garde-fous.** Aucun texte libre entre élèves, aucun classement public : l'équipe n'est visible que de ses membres.
Les prénoms ne sont affichés qu'à l'intérieur de l'équipe. L'enseignant voit un bouton pour retirer un membre, peut
supprimer l'équipe ; un élève peut la quitter. Les étoiles du Chemin sont déclarées par l'appareil (les niveaux se
jouent hors ligne), donc **plafonnées** : 6 points par envoi et 30 par jour et par élève ; hors ligne, elles sont
gardées (60 au plus) et versées au prochain envoi réussi. Le coffre ne donne que du plaisir de jeu — jamais d'avantage
payant ni durable. Les équipes inactives depuis un an sont supprimées.

**Écusson.** L'enseignant dessine celui de son équipe, à la création puis quand il veut : un **fond**, un **motif** (douze) avec
sa couleur, une **bordure**. Les bordures se gagnent avec la classe : de la bronze (d'emblée) à la royale (18 coffres), selon
le nombre de coffres ouverts, et un médaillon donne le niveau de l'équipe (1 + coffres ouverts). Un écusson tient en quatre
petits entiers (`fond.motif.couleur.bordure`, ex. `0.2.1.0`) : le serveur ne stocke et ne valide que cela (colonne
`class_teams.badge`, action `badge` réservée à l'enseignant, bordure vérifiée contre `chest_index`) — jamais de texte libre.
Les dessins sont originaux, en SVG, dans `js/teamBadge.js` (pur, testé : `tests/teamBadge.test.js`) ; l'éditeur est dans
`js/app/team.js`.

**Qui crée une équipe.** N'importe quel joueur — enseignant, club, groupe d'amis, adulte indépendant : le créateur en est le
chef (rôle `teacher` dans le code), il modifie le profil et l'écusson et lance les défis. Une équipe est **privée par défaut** :
elle ne se rejoint qu'avec son identifiant ; la case « Visible dans la recherche » (colonne `class_teams.listed`) la rend
trouvable par son nom. Les équipes d'avant cette option sont restées listées.

**Fiche d'équipe (style « clan »).** L'écran de l'équipe montre l'écusson, l'**identifiant** unique `#ABC234` (le code de
6 caractères : c'est lui qui fait retrouver et rejoindre l'équipe), une **description** (200 caractères, texte seulement),
le **pays** et la **langue parlée** (listes fermées de codes ISO ; les noms viennent d'`Intl.DisplayNames`, rien à
traduire), les points cumulés et la liste des **membres, 50 au plus**, classés par **niveau de joueur** (celui du grade,
envoyé par chaque appareil à la jointure, à chaque versement et dès qu'il change : action `level`) puis par points, le chef
d'équipe en tête. L'enseignant modifie profil et écusson (action `profile`). Une **recherche** par nom ou identifiant
(action `search`, huit résultats au plus, jokers SQL neutralisés) sert à rejoindre une équipe comme à en défier une.
**Défi entre équipes** : l'enseignant défie une autre équipe (`challenge`), l'enseignant de celle-ci accepte ou refuse
(`challenge_reply`) ; accepté, le défi dure **sept jours** et compare les points que chaque équipe a gagnés depuis le départ
(`class_teams.points_total`, relevé à l'acceptation) ; une invitation sans réponse expire au bout de trois jours ; une équipe
n'a qu'un défi ouvert à la fois ; le score est figé à la fin. Fichiers : `js/teamProfile.js` (listes et validation, partagés
avec le serveur, testés dans `tests/teamProfile.test.js`) et `js/app/team-social.js` (fiche, membres, recherche, défis).

Fichiers : `api/team.js` (endpoint), `api/_lib/team.js` (règles pures), `api/_lib/teamStore.js` (versement,
transactionnel), `js/app/team.js` (écran), tables `class_teams` / `team_members` (+ `players.team_points`,
`class_sessions.team_code`, `class_players.credited`). Tests : `tests/team.test.js`, `e2e/equipe.spec.js`.

## La colonne des grades

Depuis la fenêtre du profil, « Voir tous les grades » ouvre une grande colonne romaine (`js/app/ranks.js`) : le premier grade à son pied, le dernier sous le chapiteau. Le fût se remplit comme un thermomètre, avec une ligne qui monte avec l'XP. Les grades ne sont pas espacés selon l'XP (le dernier en demande 42 000) : chacun a la même hauteur et la ligne monte de façon continue à l'intérieur du grade courant, signalé « Vous êtes ici ». Seuils et titres viennent de `RANKS` (`js/gamification.js`). Au-delà du grade 10 (« Maître du Temps », 42 000 XP), il n'y a plus de nouveau titre mais les niveaux continuent jusqu'au niveau 300 (`MAX_LEVEL`, `levelMinXP()`) : l'écart d'XP entre deux niveaux, 12 000 entre le 9 et le 10, grandit de 400 XP à chaque niveau (niveau 11 à 54 400 XP, niveau 300 à environ 20 millions). Une hausse de ×1,2 par niveau donnerait ~10²³ XP au niveau 300, d'où la progression linéaire. La colonne reste pleine et le dernier grade affiche le niveau réel. Test : `e2e/grades.spec.js`, `tests/gamification.test.js`.

## Amis

Un joueur **avec un compte** (e-mail, Google ou Apple) a un **identifiant d'ami** : huit caractères tirés au hasard,
présentés `K7QX-92HM` (alphabet sans I, O, 0, 1). Il est **généré**, sans aucun lien avec l'adresse e-mail ni avec
l'identifiant du compte (le module `api/_lib/friends.js` ne reçoit ni l'un ni l'autre) : le donner à quelqu'un ne
révèle rien d'autre. C'est la **seule** façon de retrouver un joueur — pas d'annuaire, pas de recherche par pseudo
ni par e-mail. Un joueur sans compte n'a pas d'identité durable (il est lié à un appareil) : les amis lui sont fermés
(réponse 403, l'écran renvoie vers la connexion des Réglages).

On envoie une **demande**, l'autre l'**accepte**, la **refuse** ou la **bloque** ; deux demandes croisées valent
acceptation. Un ami voit le **pseudo et le niveau** de l'autre (le niveau est envoyé par chaque appareil à chaque
relevé) — rien d'autre. Un joueur peut **refuser toutes les demandes** (réglage `friend_requests`) : son identifiant ne
trouve alors personne. Un identifiant inconnu, un joueur qui n'accepte pas de demandes et un joueur qui nous a bloqué
donnent **la même réponse** (404) : on ne devine ni qui existe ni qui nous a bloqué ; un blocage n'est visible que de
celui qui bloque. Limites : 200 amis, 50 demandes envoyées en attente. L'écran « Amis » est ouvert par la pastille de
l'accueil, qui annonce les demandes reçues.

Fichiers : `api/friends.js` (endpoint `POST /api/friends`, actions `list`, `request`, `respond`, `cancel`, `remove`,
`block`, `unblock`, `settings`), `api/_lib/friends.js` (identifiant, limites), `js/app/friends.js` (écran), tables
`friendships` et colonnes `players.friend_code` / `friend_requests` / `level`. Tests : `tests/friends.test.js`,
`e2e/amis.spec.js`. Ce qui n'existe pas encore (à construire sur ces liens) : inviter un ami dans son équipe, le
défier directement, comparer les progressions.

**Limite des fonctions serverless.** Avec `api/friends.js`, le dossier `api/` compte **12 fonctions** — le maximum de
l'offre gratuite de Vercel : un nouvel endpoint demande de regrouper des routes existantes (ou de changer d'offre).

## Historique des parties (comptes)

Pour un joueur connecté (e-mail, Google), chaque partie terminée est enregistrée
dans `game_history` : mode, thème, langue, score, victoire, manches, erreurs,
durée, date. Les parties jouées hors ligne attendent dans une file locale
(`historiaxe_history_outbox_v1`) et partent à la prochaine connexion ; un
identifiant par partie (`client_id`) rend l'envoi idempotent. Sans compte, rien
n'est gardé. La Découverte n'entre pas dans l'historique, et les épreuves de
l'Expédition et les manches du Mode Classe ne sont pas encore historisées.

Endpoints : `PUT /api/account` (lot de 50 parties au plus) et `GET
/api/account?limit=&offset=` (la plus récente d'abord), sur le même endpoint que
le compte : l'offre gratuite de Vercel plafonne `api/` à 12 fonctions. La
suppression du compte emporte l'historique. Ces valeurs viennent de l'appareil
et ne sont pas rejouées par le serveur : c'est un journal personnel, pas un
classement. Fichiers : `api/_lib/history.js` (validation des bornes),
`js/app/session-end.js` (enregistrement et envoi). Tests :
`tests/gameHistory.test.js`.

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

### Chrono-Géo : la carte, puis l'année au curseur

Une variante du Mode Carte, proposée juste sous lui (`buildChronoGeoCard`) : même
vivier, même carte sans noms, même barème de distance, mais la question « quand ? » n'est
plus un choix parmi quatre années — le joueur **estime l'année au curseur**, avec le
barème et la tolérance du mode « Le curseur » (`GameModes.sliderScaleFor` /
`scoreSliderGuess`, échelle calculée sur toute la zone). Les points de l'espace
(80 × proximité) et du temps (100 × proximité) s'additionnent. Le partage tient en une
ligne comparable d'un joueur à l'autre : « 📍 312 km · ⏳ 14 ans en moyenne ». C'est le
même moteur (`js/geoMap.js`, `geoYearVariant = 'slider'`) : « Rejouer » garde la variante.
Pas de défi quotidien associé : un classement vérifié demanderait au serveur de rejouer
aussi la partie sur la carte.

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

**Personnages illustres** a deux sous-catégories : **Biographies** (360 thèmes, un par
vie, une date par étape) et **Panthéons** (un thème par pays ou par bloc de pays,
`pan_<iso2>`, une date par *naissance* de personnage, titrée « Naissance de X »). Les
identifiants de thème et d'événement ne bougent pas : favoris, révision et scores
n'en dépendent pas de la position dans l'arbre.

- **Sources.** Chaque panthéon vit dans `scripts/pantheon/<pays>.json` ;
  `scripts/build_pantheon.py` l'écrit dans `data/fr.json` (puis `npm run build:pack`).
  `tests/pantheon.test.js` échoue si `data/fr.json` n'est pas à jour avec les sources.
- **Portraits.** `assets/portraits/<id>.jpg` (320×400), collectés par
  `scripts/fetch_portraits.py` / `scripts/search_portraits.py`, avec auteur, licence et
  source dans le champ `image` de l'événement (règles vérifiées par
  `tests/data-schema.test.js`).
- **Galerie des portraits** (`js/gallery.js`) : trombinoscope de toutes les figures
  qui ont un portrait, trois ordres, recherche et filtres ; **Qui est-ce ?** et le
  **portrait du jour** s'appuient sur les mêmes portraits.
- **Un personnage ne figure que dans un seul panthéon** (règle pays/bloc), les
  écarts étant tranchés par les portraits disponibles.

Le détail — règles de contenu, journal de chaque pays et de chaque bloc, ce que les
images ont écarté, licences, « Ajouter un pays ou un bloc », ce qui reste à faire —
est dans **[docs/personnages-illustres.md](docs/personnages-illustres.md)**.


## Accessibilité : le clavier et le zoom

**Annonces aux lecteurs d'écran.** `A11y.announce(texte)` (`js/a11y.js`) pose un texte dans
une zone `role="status"` hors écran (`#a11y-live`, classe `.sr-only` — jamais
`display:none`, qui ne serait pas lu). La frise s'en sert : à chaque placement, le
résultat (« Correct. Brunelleschi couronne…, 1436. Placé entre 1419 et 1450. » ou
« Raté. … il se place plus haut dans la frise. Il vous reste 2 vies. ») puis la carte
suivante, **dans un seul message** — deux annonces rapprochées s'écrasent dans une
zone unique. Un raté est annoncé tout de suite, la carte suivante 2,2 s plus tard. Les
autres modes gardent leurs propres zones `aria-live` (réponses, révélations) ; ce
canal-ci n'est branché que sur la frise.

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

## Mouvement : rien n'apparaît d'un coup

Les changements d'état passent par un court mouvement (150 à 450 ms, une seule courbe, `--ease-out`, dans `css/style.css`,
section « MOUVEMENT ») : on voit où ça se passe, et l'app perd son côté mécanique. Trois mécanismes, du plus au moins simple :

- **Du CSS seul.** Une animation démarre quand un élément passe de `display: none` à affiché, ou qu'il est inséré. Écrans
  (`body > div[id^="screen-"]`), modales (voile puis panneau), panneaux dévoilés après une réponse, `<details>` qui s'ouvrent,
  groupes de modes qui se déplient, écran de fin : rien à appeler. Les sélecteurs sont en `:where()` (spécificité nulle) pour que
  les mouvements plus précis (glissements de navigation, rebond de l'XP) gardent la main.
- **Une classe.** `.fx-cascade` sur le conteneur d'une liste (posée dans `index.html`, ou par `applyCascade()`) : ses dix premières
  cartes arrivent l'une après l'autre. `applyStagger()` fait de même sur des listes construites par le JS.
- **`js/app/motion.js`** pour ce que le CSS ne sait pas faire :
  - la **frise** : poser une carte reconstruit toute la colonne ; `timelineFlipSnapshot` / `timelineFlipPlay` notent la place de
    chaque repère (clé `data-flip`) avant la reconstruction et le font glisser jusqu'à la nouvelle (technique « FLIP »). La carte
    posée atterrit (`entryLand`), les deux intervalles qu'elle crée se déploient (`.slot-new`). La carte à placer arrive par le bas
    (`.hand-card-in`) et sa date se retourne quand on a raté (`.hand-revealed`). Le repère à animer se déclare avec
    `queueEntryFx(id, classes)` **avant** la reconstruction (`renderTimeline`) : le repère n'existe pas encore avant, et c'était
    la cause d'une animation « posée » qui ne se jouait jamais ;
  - la **dernière carte** d'une partie atterrit sous les yeux du joueur (~1 s) avant l'écran de fin. Le chrono est figé à l'instant
    du dernier clic (`timerFrozenAt`) : ce délai ne compte ni dans le temps affiché, ni dans le badge de rapidité ;
  - `animateQuestionIn(screenId)`, appelée par chaque mode au moment d'afficher une question : la carte-question, puis ses réponses
    en cascade. Le Blitz (course contre la montre) et le Mode Carte n'en ont volontairement pas ;
  - `initMotion()` : un observateur par bandeau fait « rebondir » le score quand il monte (`…hud-score`) et gonfler une vie qui
    vient d'être perdue (`…hud-lives`), pour tous les modes d'un coup.

**« Réduire les animations »** (`prefers-reduced-motion`) coupe tout : le CSS, `timelineFlipSnapshot` (qui ne note rien), `animateQuestionIn`
et le délai de la dernière carte. `e2e/mouvement.spec.js` vérifie qu'il y a bien un mouvement là où il faut, et aucun avec ce réglage.
Les tests de contraste tournent déjà dans ce mode, pour ne pas mesurer des couleurs à moitié transparentes.

## Échappement des textes insérés dans la page

Presque tout l'affichage passe par des gabarits `innerHTML`. Tout texte qui peut venir d'un joueur — nom de thème ou titre d'événement personnalisés, prénom multijoueur, pseudo, lien Wikipédia d'un contenu importé — doit donc être **échappé** :

- `escapeHtml(valeur)` (`js/escape.js`, chargé avant tous les autres scripts) neutralise `& < > " '`, y compris dans une valeur d'attribut (`value="${escapeHtml(x)}"`).
- `safeHttpUrl(url)` ne laisse passer que `http:` / `https:` ; un `javascript:` donne une chaîne vide (`href = safeHttpUrl(u) || '#'`).
- `showToast` et les zones de simple texte utilisent `textContent`.

Les packs de données (`data/fr.json`, `ui/*.json`) ne contiennent ni balisage ni entité (vérifié par test) : échapper ne change donc rien à l'affichage du contenu officiel.

Le garde-fou est `tests/escaping.test.js` : il balaie tous les gabarits de `js/**` et refuse une interpolation `${x.nom|titre|axe|name|pseudo|description|label…}` non échappée. Une valeur réellement constante se déclare par un commentaire `// html-safe: raison` sur la ligne précédente. `e2e/echappement.spec.js` vérifie en navigateur qu'un thème nommé `<img src=x onerror=…>` s'affiche en texte et n'exécute rien.

Suite possible : une Content-Security-Policy, écartée pour l'instant (scripts inline, MapLibre, Capacitor).

## Développement

### Pack de données découpé (`data/pack/`)

`data/fr.json` reste la **source** (c'est lui que les scripts de contenu
écrivent et que l'API serveur charge), mais l'app ne le télécharge plus : elle
lit `data/pack/fr/`, produit par `npm run build:pack` (`scripts/build_pack.js`) :

- `skeleton.json` (~5 Mo, ~0,9 Mo compressé) : tout l'arbre et tous les
  événements **sans le texte des fiches** (`description`, 62 % du poids), qui est
  remplacé par `dl`, sa longueur ;
- `desc/<thème>.json` : les fiches d'**un** thème, chargées à l'ouverture d'une
  fiche, d'une anecdote de fin de partie, d'une manche de Mode Carte… ;
- `manifest.json` : les empreintes. Les URL portent `?v=<empreinte>`, si bien que
  le service worker garde le squelette et les fiches indéfiniment (jamais
  périmés) sans incrémenter `DATA_CACHE` à chaque ajout de contenu.

Mesuré (Pixel 5 simulé) : données prêtes en 0,3 s au lieu de 1,2 s (1,1 s au lieu
de 3,6 s avec un processeur ralenti ×4), 16 Mo de mémoire JS au lieu de 37 Mo.

**Après avoir modifié `data/fr.json`, relancez `npm run build:pack` et commitez
`data/pack/`** — `tests/pack.test.js` échoue sinon. Côté code, un événement d'un
pack découpé n'a pas de `description` tant que `Pack.needsDescription(evt)` est
vrai : tout écran qui affiche ce texte passe par `ensureDescriptions([...])`
(`js/pack.js`), qui ne rejette jamais (hors ligne, la fiche reste sans texte).
Après un premier lancement en ligne, les fiches sont aussi réchauffées en
arrière-plan (connexion rapide uniquement) pour rester lisibles hors ligne. Les
langues de démonstration, trop petites pour être découpées, gardent leur fichier
unique ; l'app native n'embarque pas `data/fr.json`.

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
