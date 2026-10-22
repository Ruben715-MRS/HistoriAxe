// =========================================================================
// === HISTORIAXE API — ÉQUIPE DE CLASSE : LOGIQUE PURE (sans base ni HTTP) ===
// =========================================================================
// Voir api/team.js pour le déroulé. Une équipe de classe réunit les élèves d'un enseignant autour d'un coffre
// commun : chaque étoile gagnée sur le Chemin du Temps, chaque bonne réponse d'une séance de Mode Classe
// remplit le coffre. Quand il est plein, chacun reçoit des pièces, et un coffre sur trois contient une carte rare
// pour chaque membre — et un trophée pour la classe.
//
// Les récompenses ne valent rien d'autre que du plaisir de jeu (pas d'achat, pas de classement public) : c'est
// ce qui permet de se contenter d'un plafond journalier plutôt que d'un rejeu complet des niveaux côté serveur.

const classroom = require('./classroom');
const TeamBadge = require('../../js/teamBadge.js');

const MAX_MEMBERS = 40;
const MAX_NAME = classroom.MAX_NAME;
const MAX_TEAM_NAME = 40;
// Étoiles que l'on peut apporter au coffre en un jour depuis le Chemin (3 niveaux parfaits ≈ 9 étoiles ; 30 laisse
// de la marge à un élève très investi sans rendre le plafond ridicule).
const DAILY_PATH_CAP = 30;
// Étoiles par appel : un niveau rapporte 3 étoiles au plus, un boss davantage de cartes mais pas d'étoiles en plus.
const MAX_PER_CONTRIBUTION = 6;
// Un coffre sur CARD_EVERY contient une carte rare pour chaque membre.
const CARD_EVERY = 3;

// Le coffre grossit avec la classe : 12 points par élève, au moins 60 — environ une semaine d'élèves assidus.
function chestTarget(memberCount) {
    return Math.max(60, 12 * Math.max(0, memberCount | 0));
}

// Pièces versées à chaque membre pour le coffre numéro k (1, 2, 3…). Croît doucement puis plafonne.
function chestCoins(k) {
    return 30 + 10 * Math.min(Math.max(1, k | 0), 5);
}

function chestHasCard(k) {
    return k > 0 && k % CARD_EVERY === 0;
}

// Ajoute des points au coffre : renvoie la nouvelle progression et les coffres ouverts.
// `progress` est le contenu du coffre en cours ; chaque coffre plein est ouvert et son excédent reporté.
function addToChest(state, points, memberCount) {
    let { progress, chestIndex } = state;
    progress += Math.max(0, points | 0);
    let opened = 0;
    // Bornage : jamais plus de quelques coffres d'un coup, quoi qu'on envoie.
    while (opened < 10) {
        const target = chestTarget(memberCount);
        if (progress < target) break;
        progress -= target;
        chestIndex++;
        opened++;
    }
    return { progress, chestIndex, opened };
}

// Ce que le membre doit encore toucher : les coffres (chestIndex déjà réclamés, chestIndex courant].
function unclaimedChests(claimed, chestIndex) {
    const list = [];
    for (let k = Math.max(0, claimed | 0) + 1; k <= chestIndex && list.length < 20; k++) {
        list.push({ index: k, coins: chestCoins(k), card: chestHasCard(k) });
    }
    return list;
}

// Points qu'un membre peut encore apporter aujourd'hui depuis le Chemin, et ce qui est accepté sur `asked`.
function acceptPathPoints(asked, usedToday) {
    const wanted = Math.min(Math.max(0, asked | 0), MAX_PER_CONTRIBUTION);
    return Math.max(0, Math.min(wanted, DAILY_PATH_CAP - Math.max(0, usedToday | 0)));
}

// Le nom d'une équipe est choisi par l'enseignant (un adulte) : nettoyé comme les prénoms, un peu plus long.
function sanitizeTeamName(raw) {
    if (typeof raw !== 'string') return null;
    const cleaned = raw.replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.slice(0, MAX_TEAM_NAME) || null;
}

// L'écusson reçu d'un client : quatre entiers valides, et une bordure déjà débloquée par les coffres ouverts.
// Renvoie la forme canonique, ou null.
function sanitizeBadge(raw, chestsOpened) {
    const badge = TeamBadge.parse(raw);
    if (!badge || !TeamBadge.canUseBorder(badge.border, chestsOpened)) return null;
    return TeamBadge.stringify(badge);
}

module.exports = {
    sanitizeBadge,
    MAX_MEMBERS, MAX_NAME, MAX_TEAM_NAME, DAILY_PATH_CAP, MAX_PER_CONTRIBUTION, CARD_EVERY,
    chestTarget, chestCoins, chestHasCard, addToChest, unclaimedChests, acceptPathPoints, sanitizeTeamName,
    generateCode: classroom.generateCode, normalizeCode: classroom.normalizeCode, sanitizeName: classroom.sanitizeName
};
