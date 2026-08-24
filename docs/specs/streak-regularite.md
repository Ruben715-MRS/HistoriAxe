# Spécification — Série de régularité (« streak » quotidien)

Statut : **implémentée** dans `index.html` (badge, panneau détail, toast, palier, réglage d'opt-out — voir §12)
Périmètre technique concerné : `index.html` (application front-end unique, sans backend, stockage `localStorage` par appareil/navigateur — pas de compte, pas de synchronisation multi-appareils)

## 0. Cadrage

HistoriAxe est une application 100 % client, mono-fichier. Il n'y a ni serveur, ni compte utilisateur, ni horloge de référence : toute la donnée (système de révision Leitner `SRS_KEY`, progression `PROGRESS_KEY`, favoris, réglages…) vit dans le `localStorage` du navigateur, et l'unique horloge disponible est celle de l'appareil. Cette spécification assume ces contraintes plutôt que de les contourner : le streak est un compteur **local, honnête, non compétitif**, pas un système anti-fraude.

Elle répond aux trois contraintes de conception données :
1. Valoriser la régularité utile au Leitner, sans récompenser l'action creuse.
2. Déclencher dès la première action de révision/jeu du jour, sans quota.
3. Absorber les accidents de vie via un gel (≈1/semaine) sans culpabiliser.

## 1. Principes directeurs

- **P1 — Le streak récompense le rappel actif, pas la présence.** Seule une action qui produit un enregistrement dans le moteur de révision (une réponse notée, juste ou fausse) compte. Ouvrir l'app, consulter la frise en mode Découverte, ou parcourir ses réglages ne compte pas.
- **P2 — Un jour est binaire.** Faire 1 révision ou 50 révisions dans la même journée a le même effet sur le streak : +1 jour, une seule fois. Ça retire toute incitation au grinding pour « gonfler » la métrique.
- **P3 — Ne jamais punir plus que le strict reset du compteur.** Une coupure ne fait jamais perdre de contenu, de boîtes Leitner, de progression de thème, ni un accès (Chrono/Expert restent gouvernés par leurs propres règles, indépendantes du streak). Le streak est purement motivationnel/cosmétique.
- **P4 — Répondre juste ou faux compte pareil.** Le Leitner a besoin qu'on affronte ses points faibles ; si seules les bonnes réponses maintenaient le streak, l'utilisateur serait incité à éviter ses cartes difficiles pile le jour où il doit les retravailler. Une réponse fausse enregistrée est un jour actif tout autant qu'une réponse juste.
- **P5 — Calcul simple, local, vérifiable.** Pas de minuteur serveur, pas de notification push (techniquement hors de portée d'une app sans backend, et non souhaitable ici). Le calcul se fait en comparant des clés de date calendaire, jamais des différences de millisecondes.

## 2. Terminologie

| Terme | Définition |
|---|---|
| **Jour calendaire** | Jour au sens `AAAA-MM-JJ`, dans le fuseau horaire *local de l'appareil* au moment de l'action. |
| **Action qualifiante** | Toute réponse notée par le moteur de jeu, qu'elle soit juste ou fausse (voir §3). |
| **Jour actif** | Jour calendaire où au moins une action qualifiante a eu lieu. |
| **Série courante (`currentStreak`)** | Nombre de jours actifs consécutifs jusqu'au dernier jour actif inclus. |
| **Record (`bestStreak`)** | Plus longue série courante jamais atteinte. |
| **Gel (freeze)** | Jeton qui neutralise rétroactivement un jour calendaire sans jour actif, pour préserver la continuité de la série. |
| **Jour blanc** | Jour calendaire sans action qualifiante — couvert par un gel, ou non (→ rupture). |

**Remarque de nommage — collision à éviter.** L'app utilise déjà « Série » pour le multiplicateur de combo en cours de partie (`comboMultiplier`, 🔥 « Série (combo multiplicateur) », ligne ~1517). Ce sont deux notions très différentes : le combo récompense l'enchaînement de bonnes réponses *pendant une partie* (performance immédiate), le streak récompense la régularité *entre les jours* (assiduité). Les confondre affaiblirait le message pédagogique. **Recommandation : nommer la nouvelle fonctionnalité « Régularité »** dans toute l'UI (badge, panneau, réglages), en réservant « Série » au combo déjà existant. L'icône 🔥 reste associable aux deux (elle est déjà comprise comme « chaud/actif » dans l'app), mais jamais dans le même écran au même moment pour ne pas les faire lire comme une seule métrique.

## 3. Déclencheur — quelles actions comptent

Le moteur de jeu a déjà un point de passage unique pour « une réponse a été évaluée » : la fonction `srsRecord(eventId, isCorrect)` (ligne 13675), appelée depuis :

- Quiz (`answerQuiz`, l.15224)
- Périodes (l.15516)
- Fil du temps (l.15743)
- Frise — Classique / Chrono / Expert / Multijoueur, sur bonne **et** mauvaise réponse (l.16016 et l.16029)
- Les sessions de révision ciblée des points faibles (hub `screen-revision-hub`), qui rejouent ces mêmes modes sur un sous-ensemble d'événements

**Règle : toute action qualifiante = tout appel à `srsRecord()`.** C'est un choix délibéré et déjà cohérent avec le code existant : pas besoin de redéfinir un périmètre séparé, pas de risque de désynchronisation entre « ce qui compte pour le Leitner » et « ce qui compte pour le streak ».

**Explicitement exclu :**
- Mode Découverte (navigation passive de la frise, aucun rappel actif demandé).
- Navigation dans les catégories/thèmes, consultation d'un événement, écran de progression/radar, réglages.
- Le simple fait d'ouvrir l'application.

**Aucun quota :** une seule action qualifiante, correcte ou non, suffit à valider le jour. Pas de « il faut au moins 5 cartes » ni de session minimale — une journée de 5 minutes compte exactement comme une journée d'une heure.

## 4. Règle d'incrémentation

Le jour est identifié par une **clé de date calendaire locale** (`AAAA-MM-JJ`, `getFullYear`/`getMonth`/`getDate` — jamais `Date.now()` en millisecondes, jamais UTC). C'est le point d'implémentation le plus important de cette spec : comparer des clés de date évite par construction les bugs classiques liés aux changements d'heure (DST) ou aux jours de durée irrégulière (voir §5).

À chaque action qualifiante :

1. Calculer `todayKey`.
2. Si `lastActiveDay === todayKey` → déjà compté aujourd'hui, ne rien faire de plus (P2).
3. Sinon, calculer l'écart `gap` en jours calendaires entre `lastActiveDay` et `todayKey`, et `missed = gap - 1` (nombre de jours calendaires entièrement sautés) :
   - **`missed <= 0`** (jour suivant immédiat) → `currentStreak += 1`.
   - **`0 < missed <= freezesAvailable`** → les gels couvrent *entièrement* le trou : consommer `missed` gels, `currentStreak += 1` (la série continue, sans interruption visible).
   - **`missed > freezesAvailable`** → rupture : `currentStreak` repart à `1` (le jour du retour compte immédiatement comme un nouveau jour 1, il n'y a pas de jour « perdu » à zéro).
4. `lastActiveDay = todayKey`, `bestStreak = max(bestStreak, currentStreak)`.

**Couverture totale ou rien.** Si le trou dépasse le nombre de gels disponibles, les gels ne sont **pas** partiellement consommés — inutile de brûler son seul gel sur une absence de 5 jours qu'il ne peut de toute façon pas couvrir entièrement. Ils restent disponibles pour la prochaine coupure.

## 5. Le gel (freeze)

- **Acquisition : passive et temporelle, pas méritée.** +1 gel toutes les 7 jours calendaires révolus, calculés en continu depuis le premier jour d'usage (`firstActiveDay`), *indépendamment de l'activité de révision*. Le gel n'est volontairement **pas** une récompense de performance (« réussissez 20 cartes pour gagner un gel ») : en faire un objectif à atteindre recréerait de la pression, exactement ce qu'il est censé absorber. C'est un filet de sécurité qui existe *avant* qu'on en ait besoin.
- **Plafond de stock : 2.** Au-delà, l'accrual suivant est simplement ignoré (pas de dette négative, pas d'accumulation illimitée). Un plafond bas garde le mécanisme lisible comme « un vrai imprévu occasionnel », pas une monnaie à thésauriser.
- **Application : automatique et silencieuse**, jamais un choix actif de l'utilisateur. Pas de bouton « activer mon gel » à penser à cliquer avant minuit — ce serait une source d'anxiété (« est-ce que j'ai bien pensé à l'activer ? ») exactement contraire à l'objectif. Le gel s'applique de lui-même au calcul du §4 dès qu'il peut couvrir intégralement le trou.
- **Pas de monétisation, pas de publicité pour en obtenir davantage.** Contrairement au modèle freemium classique, le gel n'est ni acheté, ni gagné par une action commerciale : il est acquis par le simple usage du temps, gratuitement, pour tout le monde.
- **Un gel non consommé n'expire jamais** de lui-même (hormis l'écrêtage au plafond) : il reste en réserve jusqu'à utilisation ou jusqu'à ce qu'un nouvel accrual soit ignoré par plafond.

## 6. Rupture

- Se produit uniquement quand `missed > freezesAvailable` (§4).
- Effet unique : `currentStreak` redémarre à `1` au prochain jour actif. `bestStreak` n'est jamais rétrogradé.
- **Aucun autre effet.** Pas de perte de boîtes Leitner, pas de reset de progression de thème, pas de blocage de mode de jeu. Le streak ne gate jamais rien — il ne fait qu'observer et afficher.
- Aucune notification, aucun écran interstitiel de type « vous avez perdu votre série ! ». Voir §8 pour le ton du feedback.

## 7. Cas limites

| # | Cas | Règle |
|---|---|---|
| 1 | Session à cheval sur minuit (démarrée 23:58, réponse donnée à 00:02) | Le jour retenu est celui du **timestamp de l'action qualifiante elle-même** (chaque appel `srsRecord` a son propre instant), pas celui du début de session. |
| 2 | Fuseaux horaires / voyage | Référence = horloge locale de l'appareil au moment de l'action, toujours. Un changement de fuseau peut ponctuellement raccourcir ou allonger un jour calendaire ; assumé comme limite connue d'un modèle sans compte ni serveur — sans enjeu puisqu'il n'y a ni classement ni récompense monnayable adossés au streak. |
| 3 | Changement d'heure été/hiver (DST) | Sans effet : le calcul compare des **clés de date** (`AAAA-MM-JJ`), jamais une différence en millisecondes / `86400000`. C'est justement le piège à éviter à l'implémentation. |
| 4 | Horloge système avancée ou reculée par l'utilisateur | Aucun enjeu compétitif ou monnayable n'est attaché au streak : on fait confiance à l'horloge locale, sans détection anti-triche. Seul garde-fou : si `todayKey < lastActiveDay` (horloge reculée), l'action est traitée normalement pour la révision, mais **ignorée pour le calcul du streak** (ni incrément ni rupture) pour éviter un état incohérent. |
| 5 | Plusieurs actions le même jour | Idempotent — un seul incrément par jour calendaire (P2). |
| 6 | Effacement du `localStorage`, réinstallation, navigation privée, nouvel appareil | Perte totale et attendue, au même titre que `SRS_KEY`/`PROGRESS_KEY` aujourd'hui. Limite connue du mode 100 % local ; une synchronisation multi-appareil est hors périmètre de cette spec. |
| 7 | Bouton existant « ⟲ Réinitialiser » (vide `SRS_KEY`, hub de révision) | Le streak vit dans sa **propre clé** (`historiaxe_streak_v1`), indépendante. Réinitialiser ses points faibles ne doit pas casser sa régularité : ce sont deux notions différentes (mémoire vs. assiduité). Un reset du streak, si souhaité, doit être une action séparée et explicite dans les réglages. |
| 8 | Tout premier jour d'usage | `lastActiveDay` est `null` → initialisation `currentStreak = 1`, `bestStreak = 1`, `firstActiveDay = todayKey`, aucun gel consommé. |
| 9 | Mode Découverte seul (navigation sans réponse notée) | Ne déclenche ni ne maintient jamais le streak (§3, P1) — c'est le cas limite qui garantit qu'on évite le piège Duolingo. |
| 10 | Jour en cours, pas encore joué | Aucune tâche de fond ne « tranche » à minuit (l'app n'a pas de backend). Le verdict (gel consommé ou rupture) n'est calculé et persisté qu'au prochain appel `srsRecord`, de façon paresseuse. L'affichage peut néanmoins projeter honnêtement l'état courant sans le persister (§8, `streakPeek`). |
| 11 | Gel gagné pendant une coupure déjà en cours | Utilisable rétroactivement : l'accrual est temporel (§5), donc le stock disponible au moment de la reprise est celui qui compte, peu importe quand il a été crédité. |
| 12 | Stock de gel déjà au plafond | L'accrual suivant est perdu silencieusement, sans dette négative. |
| 13 | Multijoueur local (passe-et-joue) | Un seul streak par appareil (pas de profils). Toute réponse notée, quel que soit le joueur local dont c'est le tour, compte comme action qualifiante — question ouverte listée en §11 si un profil multi-joueur devait un jour exister. |

## 8. Modèle de données proposé

Nouvelle clé, sur le même schéma que l'existant (`SRS_KEY`, `PROGRESS_KEY`, `FAVORITES_KEY`…) :

```js
const STREAK_KEY = 'historiaxe_streak_v1';
const STREAK_FREEZE_CAP = 2;
const STREAK_FREEZE_INTERVAL_DAYS = 7;

function streakDefault() {
    return {
        currentStreak: 0,
        bestStreak: 0,
        lastActiveDay: null,        // 'AAAA-MM-JJ'
        firstActiveDay: null,       // 'AAAA-MM-JJ', ancre pour l'accrual de gel
        freezesAvailable: 0,
        lastFreezeAccrualDay: null, // 'AAAA-MM-JJ'
        freezeLog: []               // historique court, pour affichage ("gel utilisé le ...")
    };
}
function streakLoad() {
    try { return Object.assign(streakDefault(), JSON.parse(localStorage.getItem(STREAK_KEY)) || {}); }
    catch (e) { return streakDefault(); }
}
function streakSave(data) {
    try { localStorage.setItem(STREAK_KEY, JSON.stringify(data)); } catch (e) {}
}
```

### Fonctions utilitaires (clé de date, jamais de diff en millisecondes)

```js
function dateKeyLocal(d = new Date()) {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseDateKey(key) {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d); // minuit local
}
function diffCalendarDays(keyA, keyB) {
    const msPerDay = 86400000;
    // Date(y,m,d) est toujours à minuit local pour les deux clés : la soustraction
    // n'est jamais perturbée par un changement d'heure DST au milieu de l'intervalle.
    return Math.round((parseDateKey(keyB) - parseDateKey(keyA)) / msPerDay);
}
function addDays(key, n) {
    const d = parseDateKey(key);
    d.setDate(d.getDate() + n);
    return dateKeyLocal(d);
}
```

### Accrual des gels

```js
function accrueFreezes(state, todayKey) {
    if (!state.firstActiveDay) return state;
    const anchor = state.lastFreezeAccrualDay || state.firstActiveDay;
    const elapsed = diffCalendarDays(anchor, todayKey);
    const weeksElapsed = Math.floor(elapsed / STREAK_FREEZE_INTERVAL_DAYS);
    if (weeksElapsed > 0) {
        state.freezesAvailable = Math.min(STREAK_FREEZE_CAP, state.freezesAvailable + weeksElapsed);
        // avance l'ancre exactement des semaines pleines écoulées : la fraction de
        // semaine en cours n'est jamais perdue.
        state.lastFreezeAccrualDay = addDays(anchor, weeksElapsed * STREAK_FREEZE_INTERVAL_DAYS);
    }
    return state;
}
```

### Lecture pure pour l'affichage (aucune écriture — cf. cas limite #10)

```js
function streakPeek() {
    const state = streakLoad();
    const todayKey = dateKeyLocal();
    const projected = accrueFreezes(Object.assign({}, state), todayKey);

    if (!projected.lastActiveDay) return { ...projected, status: 'new' };
    if (projected.lastActiveDay === todayKey) return { ...projected, status: 'active-today' };

    const gap = diffCalendarDays(projected.lastActiveDay, todayKey);
    if (gap < 0) return { ...projected, status: 'clock-back' }; // cas limite #4
    const missed = gap - 1;
    if (missed <= 0) return { ...projected, status: 'pending-today' };
    if (missed <= projected.freezesAvailable) return { ...projected, status: 'freeze-will-cover', missed };
    return { ...projected, status: 'will-break', missed };
}
```

### Écriture réelle — à appeler depuis `srsRecord()`

```js
function streakCommit() {
    const state = streakLoad();
    const todayKey = dateKeyLocal();
    accrueFreezes(state, todayKey);

    if (!state.lastActiveDay) {
        state.currentStreak = 1;
        state.firstActiveDay = todayKey;
    } else if (state.lastActiveDay !== todayKey) {
        const gap = diffCalendarDays(state.lastActiveDay, todayKey);
        if (gap < 0) {
            streakSave(state); // cas limite #4 : on ignore, sans rien casser
            return state;
        }
        const missed = gap - 1;
        if (missed <= 0) {
            state.currentStreak += 1;
        } else if (missed <= state.freezesAvailable) {
            state.freezesAvailable -= missed;
            state.currentStreak += 1;
            state.freezeLog = [...state.freezeLog, { coveredThrough: todayKey, count: missed }].slice(-10);
        } else {
            state.currentStreak = 1; // rupture
        }
    }
    state.lastActiveDay = todayKey;
    state.bestStreak = Math.max(state.bestStreak, state.currentStreak);
    streakSave(state);
    return state;
}
```

**Point d'ancrage dans le code existant :** appeler `streakCommit()` une seule fois, à l'intérieur de `srsRecord()` (l.13675), plutôt que sur chacun de ses quatre points d'appel (Quiz, Périodes, Fil du temps, Frise). C'est le choke point naturel : tout ce qui alimente déjà le Leitner alimente le streak, par construction, sans risque de désynchronisation future si un nouveau mode de jeu est ajouté.

## 9. Parcours utilisateur & feedback visuel (UX/UI)

Le vocabulaire visuel suit le design system existant (`UI/tailored_executive/DESIGN.md`) : Navy `#000311` en primaire, fond `#f6faff`, accents ambre `#fed65b` réservés aux mises en avant sobres, cartes en `rounded-3xl`, boutons en pilule, ombres très diffuses, verre dépoli sur les barres fixes. Le ton général du produit est sobre et « executive » — le streak ne doit pas basculer dans une esthétique de jeu mobile agressive (confettis systématiques, minuteurs rouges, mascotte insistante).

### A. Badge sur l'écran d'accueil
Un chip compact, positionné en `fixed` en haut comme le `.settings-btn` / `.back-btn` déjà présents, avec trois états visuels distincts et volontairement peu contrastés :

- **Actif aujourd'hui** : icône pleine 🔥, teinte ambre discrète, nombre de jours. Pas d'animation en boucle.
- **Pas encore joué aujourd'hui, série intacte** : icône en contour, gris neutre (`outline #757780`), aucun compte à rebours, aucune couleur d'alerte. Un simple survol/tap révèle « Une révision aujourd'hui prolongera votre série. »
- **Gel actif sur un jour couvert** : petit pictogramme ❄️ en complément du badge.

Le tap ouvre un panneau (réutilise le `.modal-content` existant, pas un nouvel écran plein) : jours consécutifs, record, gels disponibles/plafond, et une mini-frise des 14 derniers jours (point plein = jour actif, ❄️ = jour couvert par un gel, point creux = jour manqué avant une rupture). Un court texte pédagogique rappelle le principe : « Chaque jour où vous vous entraînez au moins une fois compte. Pas de minimum. Un jour de pause par semaine est automatiquement couvert par un gel. »

### B. Moment de l'incrément
Feedback **non bloquant et discret** à chaque première action qualifiante du jour : un toast léger en haut de l'écran (cohérent avec le style verre dépoli), 2 secondes, qui s'estompe — « 🔥 12 jours de régularité ». Pas de modal plein écran à chaque jour : ce serait justement recréer le tic Duolingo que la spec cherche à éviter. Un feedback plus marqué (petit modal de félicitations, ton sobre) n'apparaît qu'aux **paliers** (7, 14, 30, 50, 100 jours…), comme reconnaissance ponctuelle méritée plutôt que relance quotidienne.

### C. Retour après une coupure couverte par un gel
Ton **neutre-positif**, jamais anxiogène. À éviter : « Vous avez failli perdre votre série ! ». À privilégier, dans le panneau détail (jamais en pop-up qui bloquerait l'accès au contenu) : « Bon retour. Votre pause a été couverte automatiquement — la régularité continue. »

### D. Retour après une rupture réelle
Aucun pop-up de culpabilisation, aucune croix rouge. Le compteur affiche sobrement `1`. Au mieux, dans le panneau détail seulement, un message d'encouragement neutre : « Vous reprenez aujourd'hui, c'est ce qui compte. » Le record (`bestStreak`) reste affiché à côté pour montrer que rien n'est perdu de ce qui a été accompli.

### E. Réglages
Une entrée « Régularité » listant l'état des gels et un **opt-out explicite** : « Masquer le badge de régularité ». Offrir la sortie plutôt que d'imposer la métrique à qui n'en veut pas est cohérent avec le principe P3 — certains utilisateurs préfèrent réviser sans aucun compteur affiché, et le leur permettre est moins coûteux que de risquer que la métrique devienne une source de pression pour eux.

## 10. Hors périmètre (explicite)

- Pas de classement social basé sur le streak.
- Pas de notifications push « n'oubliez pas votre série » (hors de portée technique d'une app 100 % front-end sans backend, et non souhaitable même si elle devenait possible).
- Le streak ne gate jamais un mode de jeu, une boîte Leitner ou une progression de thème.
- Pas de gel achetable ni monnayable.

## 11. Questions ouvertes

- Plafond de gel proposé à **2** — à valider avec le produit (un plafond plus haut dilue le sentiment de rareté qui rend le geste « rassurant » plutôt qu'anecdotique).
- Multijoueur local passe-et-joue : la proposition (§7, cas 13) est que toute réponse notée alimente le streak de l'appareil, indépendamment du joueur actif, tant qu'il n'existe pas de profils séparés.
- Faut-il des badges de palier visuellement marqués (7/14/30/100 jours) au-delà du modal de félicitations décrit en §9.B ? Non bloquant pour une v1.

## 12. Écart entre ce document et le code livré

L'implémentation dans `index.html` (fonctions `streak*`, préfixées pour ne pas collisionner avec `SRS_KEY`/`PROGRESS_KEY`) suit fidèlement les règles ci-dessus, avec un seul raffinement du modèle de données par rapport au pseudocode du §8 : le champ `freezeLog` (compteurs agrégés) a été remplacé par un journal `history: [{date, type: 'active'|'frozen'}, …]`, plafonné aux 60 dernières entrées. Motif : `freezeLog` ne permettait pas de reconstruire de façon certaine *quelles* dates précises avaient été gelées quand plusieurs coupures s'étaient produites, ce qui est nécessaire pour dessiner honnêtement la bande des 14 derniers jours du panneau détail (§9.A). `history` résout ça directement, sans ambiguïté, au prix d'un stockage local trivialement plus grand (quelques dizaines de petits objets JSON).

Points d'ancrage réels dans le code : le module de données suit directement `srsRecord()` (auparavant ligne 13763, désormais suivi de l'appel à `streakCommit()`) ; le badge vit dans `screen-categories` à côté de `.settings-btn` (et non `screen-home`, qui n'est qu'un splash cliquable sans aucun chrome) ; le réglage d'opt-out (`streakBadgeHidden`) rejoint `DEFAULT_SETTINGS` aux côtés de `orientation`/`appearance` ; le bouton « ⚠️ Réinitialiser le jeu » des réglages a été étendu pour effacer aussi `STREAK_KEY`, cohérent avec son rôle de purge totale des données de progression.
