// =========================================================================
// === HISTORIAXE API — AMIS : LOGIQUE PURE (sans base ni HTTP) ===
// =========================================================================
// Voir api/friends.js pour le déroulé. Chaque joueur avec un compte (e-mail, Google ou Apple) reçoit un IDENTIFIANT
// D'AMI : huit caractères tirés au hasard, présentés « K7QX-92HM ». Il est généré, sans aucun lien avec l'adresse
// e-mail ni avec l'identifiant du compte : le donner à un ami ne révèle rien d'autre. C'est la SEULE façon de
// retrouver un joueur — pas d'annuaire, pas de recherche par pseudo ni par e-mail.

const crypto = require('crypto');
const { CODE_ALPHABET } = require('./classroom');

const FRIEND_CODE_LENGTH = 8;
const MAX_FRIENDS = 200;
const MAX_PENDING_SENT = 50;

function generateFriendCode() {
    let code = '';
    for (let i = 0; i < FRIEND_CODE_LENGTH; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
    return code;
}

// On tolère #, minuscules, espaces et tirets : l'ami le dicte ou le recopie.
function normalizeFriendCode(raw) {
    if (typeof raw !== 'string') return null;
    const code = raw.replace(/^#/, '').toUpperCase().replace(/[\s-]+/g, '');
    return new RegExp('^[' + CODE_ALPHABET + ']{' + FRIEND_CODE_LENGTH + '}$').test(code) ? code : null;
}

// « K7QX92HM » → « K7QX-92HM ».
function formatFriendCode(code) {
    return typeof code === 'string' && code.length === FRIEND_CODE_LENGTH ? code.slice(0, 4) + '-' + code.slice(4) : code;
}

module.exports = { FRIEND_CODE_LENGTH, MAX_FRIENDS, MAX_PENDING_SENT, generateFriendCode, normalizeFriendCode, formatFriendCode };
