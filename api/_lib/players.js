// =========================================================================
// === HISTORIAXE API — IDENTITÉ DE L'APPAREIL (jeton secret + deviceId) ===
// =========================================================================
// Chaque appareil reçoit, à sa première utilisation, un JETON SECRET tiré
// côté serveur (en-tête de réponse X-Device-Token). Le serveur ne garde que
// son empreinte SHA-256 (table device_tokens). Le client le renvoie dans
// l'en-tête X-Device-Token de chaque requête : c'est lui qui identifie le
// joueur. Le deviceId (généré par l'appareil, sans secret serveur) n'est plus
// une preuve d'identité.
//
// Migration : un ancien client n'envoie que son deviceId. Tant que son joueur
// n'a encore aucun jeton, il reçoit le premier (accord de première utilisation).
// Dès qu'un jeton existe, le deviceId seul ne suffit plus.

const crypto = require('crypto');
const { query } = require('./db');

const DEVICE_TOKEN_HEADER = 'x-device-token';
const DEVICE_ID_HEADER = 'x-device-id';
const TOKEN_RE = /^[A-Za-z0-9_-]{32,100}$/;

function httpError(status, message) {
    const err = new Error(message);
    err.statusCode = status;
    return err;
}

function sanitizePseudo(raw) {
    if (typeof raw !== 'string') return null;
    const cleaned = raw.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
    return cleaned.slice(0, 20) || null;
}

function isValidDeviceId(id) {
    return typeof id === 'string' && id.length >= 8 && id.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(id);
}

function hashDeviceToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

function headerOf(req, name) {
    const v = req.headers && req.headers[name];
    return typeof v === 'string' ? v.trim() : '';
}

// deviceId fourni par le corps ou l'URL (anciens clients), sinon en-tête X-Device-Id (qui n'apparaît pas dans l'URL).
function requestDeviceId(req, explicit) {
    return explicit || headerOf(req, DEVICE_ID_HEADER);
}

// Nouveau jeton pour ce joueur : renvoyé dans l'en-tête de réponse, seule copie en clair.
async function issueDeviceToken(res, playerId) {
    const token = crypto.randomBytes(32).toString('base64url');
    await query('insert into device_tokens (token_hash, player_id) values ($1, $2)', [hashDeviceToken(token), playerId]);
    res.setHeader('X-Device-Token', token);
    return token;
}

// Met le pseudo à jour s'il est fourni, et marque la dernière activité.
async function touchPlayer(player, pseudo) {
    const cleanPseudo = sanitizePseudo(pseudo);
    const { rows } = await query(
        `update players set pseudo = coalesce($2, pseudo), last_seen_at = now()
          where id = $1 returning id, device_id, pseudo, country`,
        [player.id, cleanPseudo]
    );
    return rows[0];
}

// Le joueur de l'appareil qui appelle.
//  - Jeton présent : le joueur qui le possède. deviceId ignoré. Jeton inconnu : 401.
//  - Pas de jeton : le joueur de deviceId, seulement si son joueur n'a encore aucun jeton ; il en reçoit un.
//    Un joueur déjà pourvu d'un jeton ne se laisse plus identifier par deviceId seul : 401.
//  - Joueur inconnu : créé si create est vrai (il reçoit alors son jeton), sinon renvoie null.
async function identifyDevice(req, res, deviceId, { create = false, pseudo } = {}) {
    const token = headerOf(req, DEVICE_TOKEN_HEADER);
    if (token) {
        if (!TOKEN_RE.test(token)) throw httpError(401, 'Appareil non reconnu : reconnectez-vous.');
        const { rows } = await query(
            `select p.id, p.device_id, p.pseudo, p.country
               from device_tokens t join players p on p.id = t.player_id
              where t.token_hash = $1`,
            [hashDeviceToken(token)]
        );
        if (!rows[0]) throw httpError(401, 'Appareil non reconnu : reconnectez-vous.');
        return touchPlayer(rows[0], pseudo);
    }

    const id = requestDeviceId(req, deviceId);
    if (!isValidDeviceId(id)) throw httpError(400, 'deviceId invalide.');

    let { rows } = await query('select id, device_id, pseudo, country from players where device_id = $1', [id]);
    let player = rows[0];
    if (!player) {
        if (!create) return null;
        const inserted = await query(
            `insert into players (id, device_id, pseudo, created_at, last_seen_at)
             values ($1, $2, coalesce($3, 'Anonyme'), now(), now())
             on conflict (device_id) do nothing
             returning id, device_id, pseudo, country`,
            [crypto.randomUUID(), id, sanitizePseudo(pseudo)]
        );
        if (inserted.rows[0]) {
            await issueDeviceToken(res, inserted.rows[0].id);
            return inserted.rows[0];
        }
        // Créé par une requête concurrente entre-temps : on le relit, sans lui donner de jeton.
        player = (await query('select id, device_id, pseudo, country from players where device_id = $1', [id])).rows[0];
    }

    const hasToken = (await query('select 1 from device_tokens where player_id = $1 limit 1', [player.id])).rows[0];
    if (hasToken) throw httpError(401, 'Appareil non reconnu : reconnectez-vous.');
    await issueDeviceToken(res, player.id);
    return touchPlayer(player, pseudo);
}

// Comme identifyDevice, pour une lecture : sans appareil connu (ni jeton ni deviceId), renvoie null.
// Un jeton périmé ou refusé est traité comme un appareil inconnu : une lecture publique (classement) ne doit pas
// échouer pour lui. Une écriture, elle, passe par identifyDevice et reste refusée.
async function identifyOptional(req, res, deviceId) {
    if (!headerOf(req, DEVICE_TOKEN_HEADER) && !requestDeviceId(req, deviceId)) return null;
    try {
        return await identifyDevice(req, res, deviceId);
    } catch (err) {
        if (err.statusCode === 401) return null;
        throw err;
    }
}

// Pays déclaré (classement national). '' retire le pays ; la validation (liste fermée) est faite par l'appelant.
async function setPlayerCountry(playerId, country) {
    await query('update players set country = $2 where id = $1', [playerId, country]);
}

module.exports = {
    DEVICE_TOKEN_HEADER, DEVICE_ID_HEADER,
    identifyDevice, identifyOptional, issueDeviceToken, requestDeviceId, hashDeviceToken,
    setPlayerCountry, sanitizePseudo, isValidDeviceId,
};
