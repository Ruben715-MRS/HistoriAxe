// =========================================================================
// === HISTORIAXE API — IDENTITÉ JOUEUR (device_id + pseudo) ===
// =========================================================================
// Authentification légère volontairement minimale (voir README) : chaque
// appareil génère un identifiant unique côté client (crypto.randomUUID(),
// stocké dans localStorage) au premier lancement — pas de compte, pas de
// mot de passe. Le pseudo est libre et modifiable ; il ne sert qu'à
// l'affichage du classement, jamais à l'authentification.

const crypto = require('crypto');
const { query } = require('./db');

function sanitizePseudo(raw) {
    if (typeof raw !== 'string') return null;
    const cleaned = raw.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.slice(0, 20) || null;
}

function isValidDeviceId(id) {
    return typeof id === 'string' && id.length >= 8 && id.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(id);
}

// Crée le joueur s'il n'existe pas encore (device_id inconnu), ou met à jour
// son pseudo/dernière connexion sinon. `pseudo` peut être omis (null) : dans
// ce cas le pseudo existant est conservé (utile pour les appels de sync qui
// ne connaissent pas forcément le dernier pseudo choisi par le joueur).
async function upsertPlayer(deviceId, pseudo) {
    const id = crypto.randomUUID();
    const cleanPseudo = sanitizePseudo(pseudo);
    const { rows } = await query(
        `insert into players (id, device_id, pseudo, created_at, last_seen_at)
         values ($1, $2, coalesce($3, 'Anonyme'), now(), now())
         on conflict (device_id) do update
           set pseudo = coalesce($3, players.pseudo),
               last_seen_at = now()
         returning id, pseudo`,
        [id, deviceId, cleanPseudo]
    );
    return rows[0];
}

async function findPlayerByDeviceId(deviceId) {
    const { rows } = await query('select id, pseudo from players where device_id = $1', [deviceId]);
    return rows[0] || null;
}

module.exports = { upsertPlayer, findPlayerByDeviceId, sanitizePseudo, isValidDeviceId };
