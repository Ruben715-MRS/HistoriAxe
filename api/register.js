// POST /api/register — { deviceId, pseudo? } → { playerId, pseudo }
// Crée (ou retrouve) le joueur associé à cet appareil. Appelé au premier
// lancement de l'app et à chaque changement de pseudo.

const { ensureSchema } = require('./_lib/db');
const { upsertPlayer, isValidDeviceId } = require('./_lib/players');
const { handlePreflight, readJsonBody, sendError } = require('./_lib/http');

module.exports = async (req, res) => {
    if (handlePreflight(req, res)) return;

    if (req.method !== 'POST') {
        return sendError(res, 405, 'Méthode non autorisée.');
    }

    try {
        const body = await readJsonBody(req);
        const { deviceId, pseudo } = body || {};

        if (!isValidDeviceId(deviceId)) {
            return sendError(res, 400, 'deviceId invalide.');
        }

        await ensureSchema();
        const player = await upsertPlayer(deviceId, pseudo);

        return res.status(200).json({ playerId: player.id, pseudo: player.pseudo });
    } catch (err) {
        console.error('[api/register]', err);
        return sendError(res, err.statusCode || 500, err.message || 'Erreur serveur.');
    }
};
