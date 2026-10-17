// Les textes saisis par le joueur (nom de thème, titre d'événement personnalisés) sont affichés comme du
// texte, jamais interprétés comme du balisage (js/escape.js).

const { test, expect } = require('./fixtures');

const PAYLOAD = '<img src=x onerror="window.__xss=1">"\'&';

test('un thème personnalisé au nom piégé s\'affiche en texte brut partout', async ({ page }) => {
    await page.evaluate((nom) => {
        customCategory.themes.push({
            id: 'custom_thm_xss', nom, difficulte: 'Tous niveaux', isCustom: true,
            events: [{ id: 'custom_evt_xss', titre: nom, date: 1900, axe: nom, description: nom, isCustom: true }]
        });
        saveCustomThemesToStorage();
        // Le moteur de recherche, la liste de thèmes et les modes affichent ce nom.
        selectedCategoryIndex = bdd.findIndex(c => c.isCustomCategory);
        selectedSubcategoryIndex = [];
        initThemes();
        showScreen('screen-themes');
        onThemeSearchInput('img');
    }, PAYLOAD);
    await page.waitForTimeout(400);
    const etat = await page.evaluate(() => ({
        xss: window.__xss,
        injectes: document.querySelectorAll('img[src="x"]').length,
        texte: document.body.innerText.includes('<img src=x')
    }));
    expect(etat.xss).toBeUndefined();
    expect(etat.injectes).toBe(0);
    expect(etat.texte).toBe(true);
});
