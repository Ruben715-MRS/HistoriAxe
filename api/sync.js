// GET  /api/sync?deviceId=          → { data, updatedAt, pseudo }
// POST /api/sync { deviceId, pseudo?, data } → { updatedAt }
//
// Sauvegarde cloud "meilleur effort" de la progression (XP, badges, série,
// points faibles/SRS, favoris, contenu personnalisé — cf. storage.js côté
// client pour la liste exacte). Modèle volontairement simple pour cette
// première version : la dernière écriture gagne (dernier appareil à avoir
// synchronisé écrase la sauvegarde précédente). Une vraie fusion multi-
// appareils (comme les ligues évoquées à terme) est un chantier ultérieur.

const { ensureSchema, query } = require('./_lib/db');
const { identifyDevice } = require('./_lib/players');
const { handlePreflight, readJsonBody, sendError } = require('./_lib/http');

const MAX_PAYLOAD_BYTES = 512 * 1024; // 512 Ko : largement suffisant pour SRS/badges/favoris/contenu perso

module.exports = async (req, res) => {
    if (handlePreflight(req, res)) return;

    try {
        await ensureSchema();

        if (req.method === 'GET') {
            const player = await identifyDevice(req, res, (req.query || {}).deviceId);
            if (!player) {
                return res.status(200).json({ data: null, updatedAt: null, pseudo: null });
            }
            const { rows } = await query('select data, updated_at from player_progress where player_id = $1', [player.id]);
            return res.status(200).json({
                data: rows[0] ? rows[0].data || null : null,
                updatedAt: rows[0] ? rows[0].updated_at : null,
                pseudo: player.pseudo,
            });
        }

        if (req.method === 'POST') {
            const body = await readJsonBody(req);
            const { deviceId, pseudo, data } = body || {};

            if (data == null || typeof data !== 'object' || Array.isArray(data)) {
                return sendError(res, 400, 'data doit être un objet JSON.');
            }
            const serialized = JSON.stringify(data);
            if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) {
                return sendError(res, 413, 'Progression trop volumineuse.');
            }

            const player = await identifyDevice(req, res, deviceId, { create: true, pseudo });
            const { rows } = await query(
                `insert into player_progress (player_id, data, updated_at)
                 values ($1, $2::jsonb, now())
                 on conflict (player_id) do update
                   set data = excluded.data, updated_at = now()
                 returning updated_at`,
                [player.id, serialized]
            );

            return res.status(200).json({ updatedAt: rows[0].updated_at });
        }

        return sendError(res, 405, 'Méthode non autorisée.');
    } catch (err) {
        console.error('[api/sync]', err);
        return sendError(res, err.statusCode || 500, err.message || 'Erreur serveur.');
    }
};
