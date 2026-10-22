// Amis : un joueur avec un compte a un identifiant d'ami (généré, sans rapport avec son e-mail) ; on n'ajoute
// quelqu'un qu'avec son identifiant exact, par une demande que l'autre accepte. Blocage possible.
//
// POST /api/friends { action: 'list',     deviceId, level? }   → { code, requests, friends, incoming, outgoing, blocked }
// POST /api/friends { action: 'request',  deviceId, code }     → { status: 'pending' | 'accepted' }
// POST /api/friends { action: 'respond',  deviceId, id, accept, block? }   (demande reçue)  → { ok }
// POST /api/friends { action: 'cancel',   deviceId, id }       (demande envoyée)            → { ok }
// POST /api/friends { action: 'remove',   deviceId, id }       (ami)                        → { ok }
// POST /api/friends { action: 'block',    deviceId, id }       (ami ou demande reçue)       → { ok }
// POST /api/friends { action: 'unblock',  deviceId, id }                                    → { ok }
// POST /api/friends { action: 'settings', deviceId, requests } (accepter les demandes ou non) → { requests }
//
// Les `id` sont ceux des liens d'amitié (jamais ceux des joueurs). Un lien : demandeur, destinataire, état
// (pending | accepted | blocked) ; un blocage est un lien « bloqué » dont le demandeur est celui qui bloque, et il
// n'est visible que de lui. Réservé aux joueurs avec un compte (réponse 403 sinon) : sans compte, un joueur n'a
// qu'un appareil, pas d'identité durable à retrouver. Ce qu'un ami voit de l'autre : son pseudo et son niveau.
//
// Un identifiant inconnu, un joueur qui n'accepte pas de demandes et un joueur qui nous a bloqué donnent la MÊME
// réponse (404) : on ne peut pas deviner qui existe ni qui nous a bloqués.

const { ensureSchema, query } = require('./_lib/db');
const { isValidDeviceId } = require('./_lib/players');
const { handlePreflight, readJsonBody, sendError } = require('./_lib/http');
const F = require('./_lib/friends');
const Profile = require('../js/teamProfile.js');

function httpError(status, message) {
    const err = new Error(message);
    err.statusCode = status;
    return err;
}

const NOT_FOUND = 'Aucun joueur avec cet identifiant.';

// Le joueur de cet appareil, avec un compte — sinon 404 (inconnu) ou 403 (pas de compte).
async function accountPlayer(deviceId) {
    if (!isValidDeviceId(deviceId)) throw httpError(400, 'deviceId invalide.');
    const { rows } = await query(
        'select id, pseudo, friend_code, friend_requests, auth_user_id is not null as account from players where device_id = $1', [deviceId]
    );
    const me = rows[0];
    if (!me) throw httpError(404, 'Joueur inconnu.');
    if (!me.account) throw httpError(403, 'Connectez-vous avec un compte pour utiliser les amis.');
    return me;
}

// L'identifiant d'ami est créé la première fois qu'il est utile.
async function ensureFriendCode(me) {
    if (me.friend_code) return me.friend_code;
    for (let i = 0; i < 8; i++) {
        const code = F.generateFriendCode();
        try {
            const { rows } = await query('update players set friend_code = $2 where id = $1 and friend_code is null returning friend_code', [me.id, code]);
            if (rows[0]) return rows[0].friend_code;
            return (await query('select friend_code from players where id = $1', [me.id])).rows[0].friend_code;
        } catch (err) {
            if (err && err.code === '23505') continue; // déjà pris : on en tire un autre
            throw err;
        }
    }
    throw httpError(500, 'Impossible de créer l\'identifiant, réessayez.');
}

function readId(body) {
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) throw httpError(400, 'Lien invalide.');
    return id;
}

async function overview(me, body) {
    const level = body.level === undefined ? null : Profile.sanitizeLevel(body.level);
    if (level) await query('update players set level = $2 where id = $1', [me.id, level]);
    const code = await ensureFriendCode(me);
    const rows = (await query(
        `select f.id, f.requester_id, f.addressee_id, f.status, p.pseudo, p.level
           from friendships f
           join players p on p.id = case when f.requester_id = $1 then f.addressee_id else f.requester_id end
          where f.requester_id = $1 or f.addressee_id = $1
          order by p.level desc, p.pseudo asc`, [me.id]
    )).rows;
    const out = { code, requests: me.friend_requests, friends: [], incoming: [], outgoing: [], blocked: [] };
    for (const r of rows) {
        const mine = r.requester_id === me.id;
        const row = { id: Number(r.id), name: r.pseudo, level: r.level };
        if (r.status === 'accepted') out.friends.push(row);
        else if (r.status === 'pending') (mine ? out.outgoing : out.incoming).push(row);
        else if (r.status === 'blocked' && mine) out.blocked.push({ id: row.id, name: row.name }); // un blocage n'est visible que de celui qui bloque
    }
    return out;
}

async function countOf(sql, params) {
    return (await query(sql, params)).rows[0].n;
}

async function requestFriend(body, me) {
    const code = F.normalizeFriendCode(body.code);
    if (!code) throw httpError(400, 'Identifiant invalide : 8 caractères.');
    const target = (await query('select id, friend_requests from players where friend_code = $1', [code])).rows[0];
    if (!target) throw httpError(404, NOT_FOUND);
    if (target.id === me.id) throw httpError(400, 'C\'est votre propre identifiant.');
    const links = (await query(
        `select id, requester_id, status from friendships
          where (requester_id = $1 and addressee_id = $2) or (requester_id = $2 and addressee_id = $1)`, [me.id, target.id]
    )).rows;
    const theirs = links.find((l) => l.requester_id === target.id);
    const mine = links.find((l) => l.requester_id === me.id);
    // Bloqué par l'autre ou qui n'accepte pas de demandes : même réponse qu'un identifiant inconnu.
    if ((theirs && theirs.status === 'blocked') || !target.friend_requests) throw httpError(404, NOT_FOUND);
    if (mine && mine.status === 'blocked') throw httpError(409, 'Vous avez bloqué ce joueur : débloquez-le d\'abord.');
    if (links.some((l) => l.status === 'accepted')) throw httpError(409, 'Vous êtes déjà amis.');
    if (mine && mine.status === 'pending') throw httpError(409, 'Demande déjà envoyée.');
    if ((await countOf("select count(*)::int as n from friendships where status = 'accepted' and (requester_id = $1 or addressee_id = $1)", [me.id])) >= F.MAX_FRIENDS ||
        (await countOf("select count(*)::int as n from friendships where status = 'accepted' and (requester_id = $1 or addressee_id = $1)", [target.id])) >= F.MAX_FRIENDS) {
        throw httpError(409, 'Limite d\'amis atteinte.');
    }
    // L'autre avait déjà demandé : on devient amis tout de suite.
    if (theirs && theirs.status === 'pending') {
        await query("update friendships set status = 'accepted' where id = $1", [theirs.id]);
        return { status: 'accepted' };
    }
    if ((await countOf("select count(*)::int as n from friendships where status = 'pending' and requester_id = $1", [me.id])) >= F.MAX_PENDING_SENT) {
        throw httpError(409, 'Trop de demandes en attente.');
    }
    await query('insert into friendships (requester_id, addressee_id) values ($1, $2)', [me.id, target.id]);
    return { status: 'pending' };
}

async function linkOf(id, meId) {
    const link = (await query('select id, requester_id, addressee_id, status from friendships where id = $1', [id])).rows[0];
    if (!link || (link.requester_id !== meId && link.addressee_id !== meId)) throw httpError(404, 'Lien introuvable.');
    return link;
}

// Bloquer : le lien devient « bloqué », dont le demandeur est celui qui bloque.
async function blockLink(link, meId) {
    const otherId = link.requester_id === meId ? link.addressee_id : link.requester_id;
    await query('delete from friendships where id = $1', [link.id]);
    await query('delete from friendships where requester_id = $1 and addressee_id = $2', [meId, otherId]);
    await query("insert into friendships (requester_id, addressee_id, status) values ($1, $2, 'blocked')", [meId, otherId]);
}

async function respond(body, me) {
    const link = await linkOf(readId(body), me.id);
    if (link.status !== 'pending' || link.addressee_id !== me.id) throw httpError(404, 'Demande introuvable.');
    if (body.block === true) { await blockLink(link, me.id); return { ok: true }; }
    if (body.accept === true) {
        const full = async (pid) => (await countOf("select count(*)::int as n from friendships where status = 'accepted' and (requester_id = $1 or addressee_id = $1)", [pid])) >= F.MAX_FRIENDS;
        if (await full(me.id) || await full(link.requester_id)) throw httpError(409, 'Limite d\'amis atteinte.');
        await query("update friendships set status = 'accepted' where id = $1", [link.id]);
    } else {
        await query('delete from friendships where id = $1', [link.id]);
    }
    return { ok: true };
}

async function cancel(body, me) {
    const link = await linkOf(readId(body), me.id);
    if (link.status !== 'pending' || link.requester_id !== me.id) throw httpError(404, 'Demande introuvable.');
    await query('delete from friendships where id = $1', [link.id]);
    return { ok: true };
}

async function remove(body, me) {
    const link = await linkOf(readId(body), me.id);
    if (link.status !== 'accepted') throw httpError(404, 'Ami introuvable.');
    await query('delete from friendships where id = $1', [link.id]);
    return { ok: true };
}

async function block(body, me) {
    const link = await linkOf(readId(body), me.id);
    const ownBlock = link.status === 'blocked' && link.requester_id === me.id;
    if (link.status === 'blocked' && !ownBlock) throw httpError(404, 'Lien introuvable.');
    if (!ownBlock) await blockLink(link, me.id);
    return { ok: true };
}

async function unblock(body, me) {
    const link = await linkOf(readId(body), me.id);
    if (link.status !== 'blocked' || link.requester_id !== me.id) throw httpError(404, 'Lien introuvable.');
    await query('delete from friendships where id = $1', [link.id]);
    return { ok: true };
}

async function settings(body, me) {
    if (typeof body.requests !== 'boolean') throw httpError(400, 'Valeur invalide.');
    await query('update players set friend_requests = $2 where id = $1', [me.id, body.requests]);
    return { requests: body.requests };
}

module.exports = async (req, res) => {
    if (handlePreflight(req, res)) return;
    try {
        await ensureSchema();
        if (req.method !== 'POST') return sendError(res, 405, 'Méthode non autorisée.');
        const body = (await readJsonBody(req)) || {};
        const me = await accountPlayer(body.deviceId);
        switch (body.action) {
            case 'list': return res.status(200).json(await overview(me, body));
            case 'request': return res.status(200).json(await requestFriend(body, me));
            case 'respond': return res.status(200).json(await respond(body, me));
            case 'cancel': return res.status(200).json(await cancel(body, me));
            case 'remove': return res.status(200).json(await remove(body, me));
            case 'block': return res.status(200).json(await block(body, me));
            case 'unblock': return res.status(200).json(await unblock(body, me));
            case 'settings': return res.status(200).json(await settings(body, me));
            default: return sendError(res, 400, 'action inconnue.');
        }
    } catch (err) {
        if (!err.statusCode) console.error('[api/friends]', err);
        return sendError(res, err.statusCode || 500, err.statusCode ? err.message : 'Erreur serveur.');
    }
};
