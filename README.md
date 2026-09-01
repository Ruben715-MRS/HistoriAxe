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
`player_progress`) sont créées automatiquement au premier appel d'une
fonction API (voir `api/_lib/db.js: ensureSchema`) — aucune migration
manuelle n'est nécessaire. Le schéma est aussi documenté dans
`api/_lib/schema.sql` si vous préférez l'exécuter vous-même.

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

### Comment fonctionne l'anti-triche du Défi du jour

Le score n'est **jamais** envoyé par le client. Pendant la partie, chaque
placement de carte ({ intervalle choisi, temps de réponse }) est journalisé
(`js/app.js: dailyRoundLog`, rempli dans `checkPlacement`). À l'envoi, seul
ce journal brut est transmis à `POST /api/scores`, qui :

1. retrouve les 10 événements du tirage du jour pour la langue donnée, à
   partir des vraies dates de `data/<lang>.json` ;
2. rejoue la partie coup par coup avec `js/dailyEngine.js` (le même module
   que le client, partagé pour ne jamais diverger) ;
3. enregistre le score ainsi recalculé, en ne conservant que le meilleur par
   joueur/jour/langue.

Modifier le score en local (DevTools, JS altéré...) n'a donc aucun effet :
le serveur ne fait jamais confiance à un score, seulement aux actions.

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

## Développement

```bash
npm install
npm run build          # compile Tailwind (css/tailwind.generated.css) puis copie les fichiers statiques dans www/ (build iOS)
npm run cap:sync        # + npx cap sync
npm run cap:open:ios
npm test                # tests unitaires + validation du schéma des packs de données (data/*.json)
```

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
