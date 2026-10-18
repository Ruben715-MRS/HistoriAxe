// Thème « Prix Nobel » (Culture générale > Prix et récompenses) : ce que les tests de schéma
// (data-schema.test.js) ne couvrent pas — la règle de datation, le déplacement des événements de
// prix qui vivaient dans d'autres thèmes, et le lien avec scripts/nobel/.
//
// Chaque test garde une décision dont la rupture serait silencieuse :
//  - un événement est daté de l'année du PRIX, pas de celle de la découverte (la PCR est de 1983 ;
//    son Nobel, de 1993) ;
//  - un événement de prix n'est qu'à un seul endroit de « Culture générale » : les thèmes d'histoire
//    de la médecine, de la littérature et des inventions racontent la découverte ou l'œuvre, pas leur
//    récompense ;
//  - data/fr.json reflète scripts/nobel/*.json : retoucher le thème à la main est la façon la plus
//    sûre de le faire diverger de sa source.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(path.join(root, 'data', 'fr.json'), 'utf8'));

function themesOf(node, out = []) {
    for (const theme of node.themes || []) out.push(theme);
    for (const child of node.subcategories || []) themesOf(child, out);
    return out;
}

const culture = doc.categories.find((c) => c.nom === 'Culture générale');
const sousCategorie = culture.subcategories.find((s) => s.nom === 'Prix et récompenses');
const nobel = themesOf(sousCategorie || {}).find((t) => t.id === 'thm_nobel');
const allThemes = doc.categories.flatMap((c) => themesOf(c));
const byId = (theme, id) => theme.events.find((e) => e.id === id);

test('« Prix et récompenses » est une sous-catégorie de « Culture générale » qui explique sa règle de datation', () => {
    assert.ok(sousCategorie, 'sous-catégorie « Prix et récompenses » absente');
    assert.ok(nobel, 'thème thm_nobel absent');
    assert.match(sousCategorie.note, /année du prix/);
});

test('le thème Prix Nobel couvre les six domaines, du premier prix à aujourd\'hui', () => {
    assert.deepEqual(nobel.axeOrder,
        ['Paix', 'Littérature', 'Physiologie ou médecine', 'Physique', 'Chimie', 'Économie']);
    for (const axe of nobel.axeOrder) {
        const n = nobel.events.filter((e) => e.axe === axe).length;
        assert.ok(n >= 25, `l'axe « ${axe} » n'a que ${n} événements : trop peu pour se jouer seul`);
    }
    const years = nobel.events.map((e) => e.date);
    assert.equal(Math.min(...years), 1901);
    assert.ok(Math.max(...years) >= 2025, 'les derniers prix manquent');
    // Chronologique, comme les autres thèmes.
    for (let i = 1; i < nobel.events.length; i++) {
        assert.ok(nobel.events[i - 1].date <= nobel.events[i].date, `${nobel.events[i].id} est mal rangé`);
    }
});

test('chaque événement d\'un prix est daté de l\'année du prix, et son titre ne la donne pas', () => {
    for (const e of nobel.events) {
        assert.ok(!e.titre.includes(String(e.date)), `${e.id} : le titre donne l'année (${e.titre})`);
        assert.ok(e.description.length >= 150, `${e.id} : description trop courte pour dire ce qui est récompensé`);
        assert.match(e.wikipedia, /^https:\/\/fr\.wikipedia\.org\/wiki\//, `${e.id} : lien Wikipédia`);
    }
    // Repères : le millésime officiel de la fondation Nobel, pas la date de la découverte ni de la remise.
    const dates = {
        nobph_01: 1901, // Röntgen, premier Nobel de physique
        nobph_10: 1921, // Einstein, remis en 1922
        nobch_05: 1911, // Marie Curie, second Nobel
        nobch_07: 1918, // Haber, remis en 1920
        med305: 1993, // PCR (inventée en 1983)
        med263: 1950, // cortisone : le prix de 1949 est celui de Hess et Moniz
        litty55: 1957, // Camus
        nobpa_26: 1993, // Mandela et de Klerk
        nobec_02: 1969, // premiers lauréats du prix d'économie
    };
    for (const [id, date] of Object.entries(dates)) assert.equal(byId(nobel, id).date, date, id);
});

test('un événement de prix n\'est plus dans les thèmes de découvertes, de littérature et de médecine', () => {
    for (const id of ['thm_lit', 'thm_med', 'thm_inv']) {
        const theme = allThemes.find((t) => t.id === id);
        const encore = theme.events.filter((e) => /nobel/i.test(e.titre)).map((e) => e.id);
        assert.deepEqual(encore, [], `${id} garde des événements de prix`);
        for (const evt of nobel.events) {
            assert.ok(!byId(theme, evt.id), `${evt.id} est à la fois dans ${id} et dans thm_nobel`);
        }
        for (const ref of theme.essentiel || []) {
            assert.ok(byId(theme, ref), `${id} : l'incontournable « ${ref} » n'existe plus`);
        }
    }
});

test('l\'histoire de la médecine date la découverte, le thème Nobel la récompense', () => {
    const med = allThemes.find((t) => t.id === 'thm_med');
    const paires = [
        ['medn05', 'med305', 'PCR'],
        ['medn04', 'med322', 'fécondation in vitro'],
        ['medn03', 'med326', 'artémisinine'],
        ['medn07', 'med331', 'immunothérapie'],
        ['medn06', 'med341', 'récepteurs de la température'],
        ['medn02', 'med263', 'cortisone'],
        ['medn01', 'med212', 'suture vasculaire'],
    ];
    for (const [decouverte, prix, nom] of paires) {
        const d = byId(med, decouverte);
        assert.ok(d, `${nom} : la découverte manque dans thm_med`);
        assert.ok(d.date < byId(nobel, prix).date, `${nom} : la découverte doit précéder son prix`);
    }
    // Le thème reste chronologique.
    for (let i = 1; i < med.events.length; i++) {
        assert.ok(med.events[i - 1].date <= med.events[i].date, `thm_med : ${med.events[i].id} est mal rangé`);
    }
});

test('data/fr.json est à jour avec les sources du thème (scripts/nobel/*.json)', (t) => {
    const probe = spawnSync('python3', ['--version']);
    if (probe.error) {
        t.skip('python3 indisponible : vérification de la source ignorée');
        return;
    }
    const run = spawnSync('python3', ['-I', path.join('scripts', 'build_nobel.py'), '--verify'],
        { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
});
