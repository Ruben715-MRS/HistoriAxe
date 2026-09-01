// =========================================================================
// === HISTORIAXE API — PETITS UTILITAIRES HTTP PARTAGÉS ===
// =========================================================================

// CORS ouvert : l'app native iOS (Capacitor) charge ses pages depuis un
// bundle local (scheme https://localhost), donc les appels vers ce backend
// sont par nature cross-origin. L'API ne repose sur aucun cookie de session
// (identité = device_id applicatif dans le corps de la requête), autoriser
// toute origine n'expose donc pas plus que l'API elle-même.
function setCors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Max-Age', '86400');
}

// Gère la requête OPTIONS de préflight CORS. Retourne true si la requête a
// été traitée (l'appelant doit alors s'arrêter là).
function handlePreflight(req, res) {
    setCors(res);
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return true;
    }
    return false;
}

// Vercel parse déjà le JSON dans req.body quand Content-Type: application/json,
// mais on garde un filet de sécurité si jamais ce n'est pas le cas (autre
// runtime, corps envoyé en texte...).
async function readJsonBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string' && req.body.length) {
        try { return JSON.parse(req.body); } catch (e) { return {}; }
    }
    return new Promise((resolve) => {
        let data = '';
        req.on('data', (chunk) => { data += chunk; });
        req.on('end', () => {
            try { resolve(data ? JSON.parse(data) : {}); } catch (e) { resolve({}); }
        });
        req.on('error', () => resolve({}));
    });
}

function sendError(res, status, message) {
    res.status(status).json({ error: message || 'Erreur serveur.' });
}

module.exports = { setCors, handlePreflight, readJsonBody, sendError };
