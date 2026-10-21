// =========================================================================
// === HISTORIAXE API — COMPTES (Supabase Auth) ===
// =========================================================================
// La connexion elle-même (e-mail + mot de passe, lien magique, Google) se
// fait côté client, directement auprès de Supabase Auth (voir js/auth.js).
// Le serveur ne reçoit qu'un jeton d'accès, qu'il fait vérifier par
// Supabase (GET /auth/v1/user) : aucun secret de signature à garder ici.
//
// L'URL et la clé « publishable » sont publiques par nature (elles figurent
// aussi dans js/auth.js) ; les variables d'environnement permettent d'en
// changer sans toucher au code. SUPABASE_SECRET_KEY, elle, est secrète et
// ne sert qu'à supprimer un compte (api/account.js, DELETE).

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://mcdzwbrncawqsznhrcta.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_uTIev5ZkPi3GIM02Z-GURw_o4dpZvs_';

function bearerToken(req) {
    const h = (req.headers && (req.headers.authorization || req.headers.Authorization)) || '';
    const m = /^Bearer\s+(.+)$/i.exec(h);
    return m ? m[1].trim() : null;
}

// Renvoie { id, email } pour un jeton valide, null sinon (absent, expiré,
// révoqué). Ne lève que si Supabase est injoignable.
async function getAuthUser(req) {
    const token = bearerToken(req);
    if (!token) return null;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) {
        const err = new Error('Service de connexion indisponible.');
        err.statusCode = 503;
        throw err;
    }
    const user = await res.json();
    return user && user.id ? { id: user.id, email: user.email || null } : null;
}

// Supprime définitivement le compte Supabase (adresse e-mail, mot de passe,
// liens Google/Apple). Nécessite SUPABASE_SECRET_KEY sur Vercel.
async function deleteAuthUser(userId) {
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!secret) {
        const err = new Error("SUPABASE_SECRET_KEY n'est pas configurée sur le serveur.");
        err.statusCode = 500;
        throw err;
    }
    // Clé récente (sb_secret_…) : l'en-tête apikey suffit, ce n'est pas un JWT.
    // Ancienne clé service_role (un JWT) : Supabase l'attend aussi en Bearer.
    const headers = { apikey: secret };
    if (!secret.startsWith('sb_')) headers.Authorization = `Bearer ${secret}`;
    const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers,
    });
    if (!res.ok && res.status !== 404) {
        const err = new Error('La suppression du compte a échoué.');
        err.statusCode = 502;
        throw err;
    }
}

module.exports = { getAuthUser, deleteAuthUser, bearerToken };
