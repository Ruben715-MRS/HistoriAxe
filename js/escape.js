// =========================================================================
// === HISTORIAXE — ÉCHAPPEMENT DES TEXTES INSÉRÉS DANS LA PAGE ===
// =========================================================================
// Règle du projet : tout texte qui n'est pas une constante du code et qui entre dans `innerHTML` (ou dans un
// attribut d'un gabarit) passe par `escapeHtml`. Sont à traiter comme non sûrs : noms de thèmes et titres,
// descriptions et axes d'événements PERSONNALISÉS (saisis par le joueur, restaurés par la synchronisation),
// prénoms et pseudos (multijoueur, classement, classe), tout ce qui vient du serveur. Les packs de données
// ne contiennent aucun balisage (tests/escaping.test.js le vérifie) : les échapper ne change rien à leur affichage.
//
// Quand c'est possible, on préfère `textContent` / `innerText`, qui n'ont pas à s'en soucier. `escapeHtml`
// sert pour les gabarits en chaîne, où il protège aussi les attributs (guillemets simples et doubles).
// tests/escaping.test.js balaie le code et refuse une donnée utilisateur interpolée sans cette fonction.

function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Une adresse à poser dans `href` : http(s) seulement. `javascript:` ou `data:` ne passent jamais.
function safeHttpUrl(url) {
    try {
        const parsed = new URL(String(url), 'https://invalid.example/');
        return /^https?:$/.test(parsed.protocol) && /^https?:/i.test(String(url).trim()) ? parsed.href : '';
    } catch (e) {
        return '';
    }
}

if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = { escapeHtml, safeHttpUrl };
}
