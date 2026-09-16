// Le mélange des cartes et des options de réponse (js/app.js: shuffleArray).
//
// Ce parcours ne clique rien : il mesure. `shuffleArray` vit dans js/app.js,
// que `npm test` ne peut pas charger (il suppose un document) — mais c'est
// une fonction pure, et un vrai navigateur est un endroit parfaitement
// légitime pour la faire tourner quelques centaines de milliers de fois.
//
// Ce qu'il surveille est arrivé pour de bon : `shuffleArray` a longtemps été
// `sort(() => Math.random() - 0.5)`. Un comparateur aléatoire ne produit pas
// une permutation uniforme. Relevé dans Chromium avant le correctif : sur un
// pool de 10 cartes, la première ressortait en tête dans 19,5 % des parties
// au lieu de 10 % ; sur 4 options de QCM, la bonne réponse — toujours à
// l'indice 0 avant mélange — se répartissait 28,1 / 28,2 / 25,1 / 18,7 % au
// lieu de 25 % partout.
//
// L'ampleur du second cas dépend du tri du moteur JS : Node et Chromium n'y
// donnaient pas les mêmes chiffres, et seul celui du navigateur décrit ce
// que vivait le joueur. C'est toute la raison d'être de ce fichier.
//
// Le nombre de tirages n'est pas décoratif : à 200 000 tirages, l'écart-type
// d'une case vaut 0,10 point de pourcentage, donc la tolérance de 1,5 point
// retenue ici est à plus de 15 écarts-types. Ce test ne peut pas échouer par
// malchance ; s'il rougit, le mélange est vraiment biaisé.

const { test, expect } = require('./fixtures');

const TIRAGES = 200_000;
// Tolérance en POINTS de pourcentage autour de la fréquence attendue.
const TOLERANCE_POINTS = 1.5;

// Fréquence (en %) de la position finale d'un élément repéré, sur `tirages`
// mélanges d'un tableau de `taille` éléments.
async function mesurerPositions(page, { taille, tirages }) {
    return page.evaluate(({ taille, tirages }) => {
        // L'élément suivi part toujours de l'indice 0 : c'est exactement la
        // forme des appels réels, `[bonneRéponse, ...distracteurs]`.
        const base = Array.from({ length: taille }, (_, i) => (i === 0 ? 'suivi' : 'autre' + i));
        const compte = new Array(taille).fill(0);
        for (let i = 0; i < tirages; i++) {
            compte[shuffleArray(base).indexOf('suivi')]++;
        }
        return compte.map(c => (100 * c) / tirages);
    }, { taille, tirages });
}

test('un QCM place la bonne réponse aussi souvent sur chaque option', async ({ page }) => {
    // Le cas des trois modes à choix multiples : 4 options, la bonne en tête
    // du tableau avant mélange (voir renderQuizQuestion, buildPeriodesQuestions,
    // js/geoMap.js: pickGeoCountryOptions).
    const frequences = await mesurerPositions(page, { taille: 4, tirages: TIRAGES });
    const attendu = 25;

    frequences.forEach((freq, position) => {
        expect(
            Math.abs(freq - attendu),
            `la bonne réponse tombe en position ${position + 1} dans ${freq.toFixed(1)} % des cas ` +
            `au lieu de ${attendu} % — un joueur qui répondrait toujours « option ${position + 1} » ` +
            `serait avantagé (fréquences relevées : ${frequences.map(f => f.toFixed(1) + ' %').join(', ')})`
        ).toBeLessThan(TOLERANCE_POINTS);
    });
});

test('l’ordre de pioche des cartes ne favorise aucune position', async ({ page }) => {
    // L'autre gros appel : l'ordre dans lequel les événements d'un thème sont
    // proposés en Classique/Chrono/Expert (voir startActualGame). Un biais ici
    // ferait revenir les mêmes cartes en début de partie à chaque fois.
    const taille = 10;
    const frequences = await mesurerPositions(page, { taille, tirages: TIRAGES });
    const attendu = 100 / taille;

    frequences.forEach((freq, position) => {
        expect(
            Math.abs(freq - attendu),
            `la première carte du pool finit en position ${position + 1} dans ${freq.toFixed(1)} % ` +
            `des cas au lieu de ${attendu} % (fréquences relevées : ` +
            `${frequences.map(f => f.toFixed(1) + ' %').join(', ')})`
        ).toBeLessThan(TOLERANCE_POINTS);
    });
});

test('mélanger conserve exactement les mêmes éléments, sans toucher à l’original', async ({ page }) => {
    // Un mélange uniforme qui perdrait une carte en route ferait disparaître
    // un événement de la partie : la propriété vaut d'être tenue à part de la
    // mesure statistique.
    const probleme = await page.evaluate(() => {
        const original = Array.from({ length: 12 }, (_, i) => 'e' + i);
        const temoin = original.join(',');
        for (let i = 0; i < 2000; i++) {
            const melange = shuffleArray(original);
            if (melange.length !== original.length) return `longueur ${melange.length} au lieu de ${original.length}`;
            if (melange.slice().sort().join(',') !== original.slice().sort().join(',')) {
                return 'éléments perdus ou dupliqués : ' + melange.join(',');
            }
            if (original.join(',') !== temoin) return 'le tableau d’origine a été modifié';
        }
        return null;
    });
    expect(probleme, 'shuffleArray doit renvoyer une permutation du tableau reçu, sans le modifier').toBeNull();
});
