// Le client annonce les ids du tirage qu'il a joué ; le serveur recalcule le
// sien. S'ils diffèrent (pack de données en cache plus ancien ou plus récent
// que celui du serveur), le journal de la partie se rejouerait sur d'autres
// dates : on refuse plutôt que d'enregistrer un score faux.
function drawMatches(clientIds, serverItems) {
    if (!Array.isArray(clientIds) || clientIds.length !== serverItems.length) return false;
    return serverItems.every((it, i) => String(clientIds[i]) === String(it.id));
}

const STALE_DRAW_MESSAGE = "Le contenu de l'app n'est pas à jour : relancez-la pour jouer le défi du jour.";

module.exports = { drawMatches, STALE_DRAW_MESSAGE };
