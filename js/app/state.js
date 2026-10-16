// Extrait de l'ancien js/app.js — État global de la partie et des modes.
// Découpage mécanique : les fichiers se chargent dans l'ordre d'index.html, qui est celui du fichier d'origine
// (tout reste global ; une fonction ou un `let` d'un fichier est visible des suivants).
// VARIABLES GLOBALES
let selectedCategoryIndex = null;
let selectedSubcategoryIndex = null;
let selectedThemeIndex = null;
let currentMode = 'classic';
let revisionMode = false;
// Origine de la session de révision en cours : 'weak' (points faibles) ou 'due' (échéances).
let revisionKind = 'weak';
let revisionEvents = [];
let revisionRequestedSize = 0;
let dailyChallengeMode = false;
let dailyChallengeEventsWithLocation = [];
let dailyCountdownInterval = null;
// Journal des manches du Défi du jour ({ slotIndex, elapsedMs } dans
// l'ordre de jeu), envoyé tel quel à l'API : c'est le SERVEUR qui
// recalcule le score à partir de ces actions brutes (voir daily.js:
// submitDailyScoreToServer et api/scores.js) — jamais depuis `score`,
// qui n'est qu'un affichage local et n'est jamais transmis tel quel.
let dailyRoundLog = [];
// Défi hebdomadaire (js/weekly.js) : même principe que les 5 variables
// ci-dessus, en parallèle plutôt qu'en réutilisant les mêmes (les deux
// défis ne tournent jamais en même temps, mais garder deux jeux de
// variables distincts évite toute ambiguïté dans les écrans/journaux
// partagés — ex. le récap affiche les deux séries séparément).
let weeklyChallengeMode = false;
let weeklyChallengeEventsWithLocation = [];
let weeklyChallengeCountdownInterval = null;
let weeklyChallengeRoundLog = [];
let favoritesMode = false;
let axisFilterActive = false;
let essentialFilterActive = false;
let currentThemeAxes = [];
let selectedAxes = new Set();
// Thème auquel se rapporte selectedAxes. La sélection d'axes doit survivre
// à un aller-retour sur le MÊME thème (retour de partie, bouton retour) et
// repartir de « tous les axes » dès qu'on en ouvre un autre — voir
// initAxes(), qui comparait jusqu'ici les listes d'axes au lieu du thème.
let selectedAxesThemeId = null;

let currentPool = [];
let placedEvents = [];
let eventToPlace = null;
let lives = 3;
let score = 0;
let totalEvents = 0;
let isAnimating = false;
// Identifiant du setTimeout de révélation d'une mauvaise réponse (voir
// checkPlacement) : si la partie est quittée ou relancée avant que ce délai
// ne s'écoule, il faut l'annuler explicitement. Sans cela, `isAnimating`
// pouvait rester bloqué à `true` pour le reste de la session (aucune
// fonction de lancement de partie ne le réinitialisait), rendant tout
// placement ultérieur silencieusement sans effet — le seul symptôme visible
// étant que plus aucun créneau ne réagissait au clic.
let wrongAnswerTimeoutId = null;

let timerInterval = null;
let startTime = 0;
let totalTimePlayed = 0;

// Système de points : combo (série de bonnes réponses) et étendue chronologique
// de la partie en cours (sert à normaliser l'écart d'années des erreurs).
// Partagés entre le mode frise et le mode Quiz, qui suivent le même principe.

let comboMultiplier = 1.0;

// --- MULTIPLAYER STATE ---
let multiPlayers = [];
let currentMultiPlayerIndex = 0;
let multiGameActive = false;

let currentGameSpan = 1;
let questionStartTime = 0;

// Mode Quiz : QCM à 4 réponses, mêlant questions « événement → année »
// et « année → événement », piochées dans le même pool que les autres modes.
let quizQuestions = [];
let quizIndex = 0;
let quizFiftyLeft = 2;
let quizFiftyActive = false;

// Mode Le fil du temps : les événements du pool sont présentés triés du plus
// ancien au plus récent, et il faut en saisir l'année exacte au clavier numérique.
let filEvents = [];
let filIndex = 0;
let filInput = '';
let filEra = 1; // 1 = apr. J.-C., -1 = av. J.-C.
let filHintsRevealed = 0;
let filCorrectYearString = '';

// Mode Avant / Après : chaque question oppose un événement du pool à un autre
// événement (dates distinctes), sans révéler leurs dates ; il faut désigner
// le plus ancien des deux. Pas de points partiels (voir answerAvap).
let avapQuestions = [];
let avapIndex = 0;

// Mode Trouve l'écart : même principe d'appariement qu'Avant / Après, mais il
// faut cette fois saisir au clavier le nombre d'années séparant les deux
// événements. Reprend le mécanisme d'indice chiffre par chiffre du Fil du temps.
let ecartQuestions = [];
let ecartIndex = 0;
let ecartInput = '';
let ecartAttemptsUsed = 0;

