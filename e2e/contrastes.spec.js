// Les contrastes de couleur : WCAG 1.4.3, niveau AA — 4,5:1 pour le texte
// courant, 3:1 pour le grand texte (24 px, ou 18,66 px en gras).
//
// Deux mesures, parce qu'aucune ne suffit seule :
//
//  1. axe-core, sur chaque écran et chaque modale, en thème clair puis sombre.
//     Il calcule le contraste de tout texte posé sur un aplat. Il ne sait pas
//     juger ce qui est posé sur une photo ou un dégradé, et le range alors
//     parmi les cas « à vérifier » — que ce test ignore.
//
//  2. Un échantillonnage de pixels pour ce reste. On masque le texte, on
//     photographie la zone qu'il occupait, et l'on compare chaque pixel à la
//     couleur du texte. C'est ainsi qu'on a vu que « 12 Sous-catégories »,
//     sous le titre d'une carte de catégorie, plafonnait à 3:1 sur sa photo :
//     axe, lui, se contentait de la ranger parmi les cas « à vérifier ».
//
// Le parcours est celui de l'inventaire clavier (voir e2e/ecrans.js).

const { test, expect, openThemeModes } = require('./fixtures');
const { attendreLePack, parcourirLesEcrans } = require('./ecrans');

// `reducedMotion` : l'app coupe alors ses animations d'entrée (cartes en
// fondu, glissements d'écran). Sans cela, axe mesurerait un texte à mi-opacité,
// et le test devrait attendre la fin des animations à coups de pauses.
test.use({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });

const AXE = require.resolve('axe-core/axe.min.js');
const THEMES = [['light', 'clair'], ['dark', 'sombre']];

async function appliquerLApparence(page, apparence) {
    await page.evaluate(a => { appSettings.appearance = a; applyAppearance(); }, apparence);
}

// --- 1. axe-core ------------------------------------------------------------

async function echecsAxe(page) {
    return page.evaluate(async () => {
        const res = await axe.run(document, {
            runOnly: { type: 'rule', values: ['color-contrast'] },
            resultTypes: ['violations']
        });
        return res.violations.flatMap(v => v.nodes.map(n => {
            const d = (n.any[0] && n.any[0].data) || {};
            const cible = n.target[n.target.length - 1];
            const el = document.querySelector(cible);
            return {
                cible,
                texte: ((el && el.innerText) || '').trim().replace(/\s+/g, ' ').slice(0, 40),
                ratio: d.contrastRatio, attendu: d.expectedContrastRatio,
                fg: d.fgColor, bg: d.bgColor, taille: d.fontSize
            };
        }));
    });
}

const decrireAxe = e =>
    `${e.etape} › ${e.cible} « ${e.texte} » : ${e.ratio}:1 pour ${e.attendu} (${e.fg} sur ${e.bg}, ${e.taille})`;

for (const [apparence, nom] of THEMES) {
    test(`axe : aucun texte sous le contraste exigé — thème ${nom}`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.addScriptTag({ path: AXE });
        await appliquerLApparence(page, apparence);

        // Un même composant (la barre de rang, par exemple) se répète d'un
        // écran à l'autre : on ne le signale qu'une fois, à sa première étape.
        const echecs = new Map();
        await parcourirLesEcrans(page, async etape => {
            for (const e of await echecsAxe(page)) {
                const cle = [e.cible, e.fg, e.bg].join('|');
                if (!echecs.has(cle)) echecs.set(cle, { etape, ...e });
            }
        });

        expect([...echecs.values()].map(decrireAxe),
            'textes sous le contraste WCAG AA (4,5:1, ou 3:1 en grand texte)').toEqual([]);
    });
}

// --- 2. Échantillonnage de pixels --------------------------------------------

// Contraste de chaque pixel d'une capture face à la couleur du texte. Si la
// couleur du texte est translucide, elle est mêlée à chaque pixel de fond.
async function ratiosDeLaCapture(page, png, fg, alpha) {
    return page.evaluate(async ({ b64, fg, alpha }) => {
        const blob = await (await fetch('data:image/png;base64,' + b64)).blob();
        const bmp = await createImageBitmap(blob);
        const canvas = new OffscreenCanvas(bmp.width, bmp.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(bmp, 0, 0);
        const { data } = ctx.getImageData(0, 0, bmp.width, bmp.height);
        const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
        const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
        const ratios = [];
        for (let i = 0; i < data.length; i += 4) {
            const bg = [data[i], data[i + 1], data[i + 2]];
            const mix = fg.map((c, k) => c * alpha + bg[k] * (1 - alpha));
            const lt = lum(mix[0], mix[1], mix[2]);
            const lb = lum(bg[0], bg[1], bg[2]);
            ratios.push((Math.max(lt, lb) + 0.05) / (Math.min(lt, lb) + 0.05));
        }
        return ratios;
    }, { b64: png.toString('base64'), fg, alpha });
}

// Mesure chaque élément qui correspond à `selecteur` : le texte est masqué,
// la zone qu'il occupait est photographiée, puis restituée. Renvoie, par
// élément, le 5ᵉ centile du contraste (95 % des pixels derrière le texte font
// au moins ce score) et le contraste exigé pour sa taille.
async function mesurerSurFond(page, selecteur) {
    const mesures = [];
    const total = await page.locator(selecteur).count();
    for (let i = 0; i < total; i++) {
        const el = page.locator(selecteur).nth(i);
        if (!(await el.isVisible())) continue;
        await el.scrollIntoViewIfNeeded();

        const info = await el.evaluate(node => {
            const cs = getComputedStyle(node);
            const [r, g, b, a] = cs.color.match(/[\d.]+/g).map(Number);
            const plage = document.createRange();
            plage.selectNodeContents(node);
            const rects = [...plage.getClientRects()]
                .filter(b2 => b2.width > 1 && b2.height > 1)
                .map(b2 => ({ x: b2.x, y: b2.y, width: b2.width, height: b2.height }));
            node.dataset.styleAvant = node.getAttribute('style') || '';
            node.style.setProperty('color', 'transparent', 'important');
            node.style.setProperty('text-shadow', 'none', 'important');
            const poids = Number(cs.fontWeight) || (cs.fontWeight === 'bold' ? 700 : 400);
            const taille = parseFloat(cs.fontSize);
            return {
                texte: node.innerText.trim().replace(/\s+/g, ' ').slice(0, 40),
                fg: [r, g, b], alpha: a === undefined ? 1 : a,
                exige: (taille >= 24 || (taille >= 18.66 && poids >= 700)) ? 3 : 4.5,
                rects
            };
        });

        const ratios = [];
        for (const rect of info.rects) {
            const png = await page.screenshot({
                clip: { x: Math.max(0, rect.x), y: Math.max(0, rect.y), width: rect.width, height: rect.height },
                type: 'png'
            });
            ratios.push(...await ratiosDeLaCapture(page, png, info.fg, info.alpha));
        }
        await el.evaluate(node => {
            const avant = node.dataset.styleAvant;
            if (avant) node.setAttribute('style', avant); else node.removeAttribute('style');
            delete node.dataset.styleAvant;
        });
        if (!ratios.length) continue;

        ratios.sort((a, b) => a - b);
        mesures.push({
            texte: info.texte,
            exige: info.exige,
            p5: ratios[Math.floor(0.05 * (ratios.length - 1))],
            sousLeSeuil: ratios.filter(r => r < info.exige).length / ratios.length
        });
    }
    return mesures;
}

// Texte posé sur une photo ou un dégradé : ce qu'axe ne sait pas juger. Chaque
// entrée dit comment amener l'écran, et quoi mesurer dessus.
const SURFACES = [
    {
        nom: 'accueil — bandeau sur la photo',
        aller: page => page.evaluate(() => showScreen('screen-home')),
        cibles: ['.home-tagline-badge']
    },
    {
        nom: 'catégories — cartes sur photo',
        aller: page => page.evaluate(() => showScreen('screen-categories')),
        cibles: ['#screen-categories .relative.h-32 h4', '#screen-categories .relative.h-32 p']
    },
    {
        nom: 'sous-catégories — cartes sur photo',
        aller: page => page.evaluate(() => {
            selectedCategoryIndex = bdd.findIndex(c => c.subcategories);
            selectedSubcategoryIndex = null;
            showScreen('screen-subcategories');
        }),
        cibles: ['#screen-subcategories .relative.h-32 h4', '#screen-subcategories .relative.h-32 p']
    },
    {
        nom: 'thèmes — titres sur dégradé',
        // La catégorie de thm_aut : ses titres sont longs, donc les lignes
        // s'étendent loin vers la partie claire du dégradé.
        aller: page => page.evaluate(() => {
            selectedCategoryIndex = bdd.findIndex(c => (c.themes || []).some(t => t.id === 'thm_aut'));
            selectedSubcategoryIndex = null;
            showScreen('screen-themes');
        }),
        cibles: ['#themes-container .data-card-title']
    },
    {
        nom: 'profil — en-tête sur dégradé',
        aller: page => page.evaluate(() => openProfileModal()),
        cibles: ['#profile-hero-title', '#profile-hero-level', '#profile-hero-xp-needed', '#profile-streak-multiplier']
    }
];

const decrireFond = (surface, m) =>
    `${surface} › « ${m.texte} » : ${(m.sousLeSeuil * 100).toFixed(0)} % des pixels sous ${m.exige}:1, `
    + `95 % atteignent au moins ${m.p5.toFixed(2)}:1`;

for (const [apparence, nom] of THEMES) {
    test(`texte sur photo ou dégradé : lisible sur toute sa surface — thème ${nom}`, async ({ page }) => {
        test.setTimeout(120_000);
        await page.waitForFunction(() => window.bdd && window.bdd.some(c => (c.themes || []).some(t => t.id === 'thm_aut')),
            null, { timeout: 45_000 });
        await appliquerLApparence(page, apparence);

        const trop_pales = [];
        for (const surface of SURFACES) {
            await surface.aller(page);
            let vues = 0;
            for (const cible of surface.cibles) {
                const mesures = await mesurerSurFond(page, cible);
                vues += mesures.length;
                // 5ᵉ centile : on tolère que 5 % de la zone mesurée (les blancs
                // entre deux mots, le bord d'une lettre) tombe sous le seuil.
                mesures.filter(m => m.p5 < m.exige).forEach(m => trop_pales.push(decrireFond(surface.nom, m)));
            }
            // Un test qui ne mesure rien passerait pour une app irréprochable.
            expect(vues, `${surface.nom} : aucune zone de texte mesurée — les sélecteurs sont périmés`).toBeGreaterThan(0);
            await page.evaluate(() => document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden')));
        }

        expect(trop_pales, 'textes illisibles sur une partie de leur fond (WCAG AA)').toEqual([]);
    });
}

// --- 3. Les états que le parcours n'affiche pas ----------------------------------

// La réponse juste (vert) et la réponse fausse (rouge) de chaque mode. Les
// atteindre en jouant voudrait dire répondre faux exprès dans chaque mode, en
// connaissant la bonne réponse de chacun. On pose donc sur les vrais éléments
// les classes que le JS leur pose (`correct`, `wrong`… — voir js/app.js :
// answerQuiz et ses équivalents) : c'est le couple de couleurs de la règle CSS
// qui est mesuré, pas la logique du jeu. C'est ainsi qu'on a vu le vert
// « juste » passer de 4,7:1 en thème clair à 2,5:1 en thème sombre — où rien
// ne le redéfinissait — sans qu'aucun écran du parcours ne l'affiche.
//
// [étape, carte du mode, [[sélecteur, classes du 1er élément, classes du 2e, …], …]]
// `'reveler'` au lieu de classes : l'élément est caché jusqu'à la réponse, on
// l'affiche (et on lui donne un texte s'il est vide).
const ETATS = [
    ['quiz', '.quiz-card', [['#quiz-options .quiz-option', ['correct'], ['wrong']]]],
    ['périodes', '.periodes-card', [['#periodes-options .periodes-option', ['correct'], ['wrong']]]],
    ['avant/après', '.avap-card', [['.avap-option', ['correct'], ['wrong']], ['.avap-option-year', 'reveler', 'reveler']]],
    ['simultanéité', '#mode-card-simultaneity', [['#simul-options .quiz-option', ['correct'], ['wrong']]]],
    ['intrus', '#mode-card-intrus', [['#intrus-options .quiz-option', ['correct'], ['wrong']]]],
    ['blitz', '#mode-card-blitz', [['.blitz-btn', ['correct'], ['wrong']], ['#blitz-clock', ['urgent']]]],
    ['écart : juste', '.ecart-card', [['#ecart-display-value', ['fil-feedback-correct']]]],
    ['écart : faux', '.ecart-card', [['#ecart-display-value', ['fil-feedback-wrong']]]],
    ['curseur : juste', '#mode-card-curseur', [['#curseur-verdict', ['is-good']]]],
    ['curseur : faux', '#mode-card-curseur', [['#curseur-verdict', ['is-bad']]]]
];

// Ce que la réponse déplie — le « révélé » de la simultanéité et de l'intrus —
// est construit par le JS : ici on répond pour de bon (peu importe si juste ou
// fausse : les lignes du révélé sont les mêmes, l'intrus y est toujours en rouge).
const REVELES = [
    ['simultanéité : révélé', '#mode-card-simultaneity', '#simul-options .quiz-option', '#simul-reveal'],
    ['intrus : révélé', '#mode-card-intrus', '#intrus-options .quiz-option', '#intrus-reveal']
];

for (const [apparence, nom] of THEMES) {
    test(`axe : les états juste et faux sont lisibles — thème ${nom}`, async ({ page }) => {
        test.setTimeout(180_000);
        await page.addScriptTag({ path: AXE });
        await appliquerLApparence(page, apparence);

        const echecs = [];
        const noter = async etape => {
            for (const e of await echecsAxe(page)) echecs.push(decrireAxe({ etape, ...e }));
        };
        const retourAuxModes = () => page.evaluate(() => { currentMode = 'classic'; showScreen('screen-modes'); });

        // Un seul passage par le thème : les cartes de l'écran des modes
        // restent valables d'un mode à l'autre, comme dans e2e/ecrans.js.
        await openThemeModes(page, 'thm_aut');

        for (const [etape, carte, regles] of ETATS) {
            await page.locator(carte).click();
            await page.evaluate(regles => {
                for (const [selecteur, ...jeux] of regles) {
                    document.querySelectorAll(selecteur).forEach((el, i) => {
                        const jeu = jeux[i];
                        if (!jeu) return;
                        el.classList.remove('hidden');
                        if (!el.textContent.trim() || el.textContent.trim() === '—') el.textContent = 'Réponse : 1789';
                        if (jeu !== 'reveler') el.classList.add(...jeu);
                    });
                }
            }, regles);
            await noter(etape);
            await retourAuxModes();
        }

        for (const [etape, carte, options, revele] of REVELES) {
            await page.locator(carte).click();
            await page.locator(options).first().click();
            await page.waitForSelector(`${revele}:not(.hidden)`);
            await noter(etape);
            await retourAuxModes();
        }

        expect([...new Set(echecs)], 'textes sous le contraste WCAG AA dans un état de réponse').toEqual([]);
    });
}

// --- Les mesures mesurent ------------------------------------------------------

test('les mesures détectent : un texte pâle, et un texte sur dégradé clair, sont signalés', async ({ page }) => {
    // Sans ce test, une mesure qui ne signalerait jamais rien passerait pour
    // une app irréprochable.
    //
    // Deux précautions, nées d'un échec intermittent : on attend le pack de
    // langue (son arrivée redessine l'écran), et les pièges sont des <p> et non
    // des <div> — showScreen cache TOUT `body > div`, et un piège caché n'est
    // plus mesuré, ce que le test prenait pour une mesure qui ne voit rien.
    await attendreLePack(page);
    await page.addScriptTag({ path: AXE });
    await page.evaluate(() => {
        const pale = document.createElement('p');
        pale.id = 'piege-axe';
        pale.style.cssText = 'position:fixed;left:8px;top:8px;z-index:99999;margin:0;background:#fff;color:#999;font-size:14px';
        pale.innerText = 'texte beaucoup trop pâle pour son fond';
        document.body.appendChild(pale);

        const degrade = document.createElement('p');
        degrade.id = 'piege-pixels';
        degrade.style.cssText = 'position:fixed;left:8px;top:60px;z-index:99999;width:360px;padding:12px;'
            + 'background:linear-gradient(90deg,#001a4b,#e8f0f8);color:#fff;font-size:16px';
        degrade.innerText = 'blanc sur un dégradé qui finit presque blanc';
        document.body.appendChild(degrade);
    });

    const axe = await echecsAxe(page);
    expect(axe.some(e => e.cible === '#piege-axe'), 'axe n’a pas vu le texte pâle').toBe(true);

    const mesures = await mesurerSurFond(page, '#piege-pixels');
    expect(mesures.length).toBe(1);
    expect(mesures[0].p5, 'l’échantillonnage n’a pas vu la partie claire du dégradé').toBeLessThan(mesures[0].exige);
});
