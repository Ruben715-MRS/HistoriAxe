// Thèmes de « Culture générale > Prix et récompenses » autres que le Prix Nobel (Oscars, festivals, prix
// littéraires, scientifiques, sportifs, musicaux) : ce que data-schema.test.js ne couvre pas.
//
// Chaque test garde une décision dont la rupture serait silencieuse :
//  - un événement est daté de l'année du PRIX (celle de la cérémonie), pas de celle de l'œuvre : l'Oscar de
//    La Liste de Schindler est de 1994, le film de 1993 ;
//  - le titre ne donne jamais l'année, sinon la question est sa propre réponse ;
//  - data/fr.json reflète scripts/prix/*.json : retoucher un thème à la main est la façon la plus sûre de le
//    faire diverger de sa source.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const doc = JSON.parse(fs.readFileSync(path.join(root, 'data', 'fr.json'), 'utf8'));
const culture = doc.categories.find((c) => c.nom === 'Culture générale');
const sous = culture.subcategories.find((s) => s.nom === 'Prix et récompenses');
const themes = sous.themes.filter((t) => t.id !== 'thm_nobel');
const byId = (theme, id) => theme.events.find((e) => e.id === id);
const theme = (id) => themes.find((t) => t.id === id);

test('chaque thème de prix a ses axes, des événements chronologiques et des incontournables existants', () => {
    assert.ok(themes.length >= 2, 'aucun thème de prix en dehors du Prix Nobel');
    for (const t of themes) {
        assert.ok(t.axeOrder.length >= 2, `${t.id} : au moins deux axes`);
        for (const axe of t.axeOrder) {
            const n = t.events.filter((e) => e.axe === axe).length;
            assert.ok(n >= 8, `${t.id} : l'axe « ${axe} » n'a que ${n} événements, trop peu pour se jouer seul`);
        }
        for (let i = 1; i < t.events.length; i++) {
            assert.ok(t.events[i - 1].date <= t.events[i].date, `${t.id} : ${t.events[i].id} est mal rangé`);
        }
        for (const id of t.essentiel) assert.ok(byId(t, id), `${t.id} : incontournable « ${id} » inconnu`);
    }
});

test('le titre d\'un événement de prix ne donne pas l\'année, et sa description dit ce qui est récompensé', () => {
    for (const t of themes) {
        for (const e of t.events) {
            assert.ok(!e.titre.includes(String(e.date)), `${e.id} : le titre donne l'année (${e.titre})`);
            assert.ok(e.description.length >= 150, `${e.id} : description trop courte`);
            assert.match(e.wikipedia, /^https:\/\/fr\.wikipedia\.org\/wiki\//, `${e.id} : lien Wikipédia`);
        }
    }
});

test('les Oscars sont datés de la cérémonie, pas du film', () => {
    const oscars = theme('thm_oscars');
    assert.ok(oscars, 'thème thm_oscars absent');
    const dates = {
        osc_01: 1929, // Les Ailes, première cérémonie (films de 1927-1928)
        osc_11: 1994, // La Liste de Schindler, film de 1993
        osc_16: 2020, // Parasite, film de 2019
        osc_25: 2010, // Kathryn Bigelow
        osc_47: 1973, // Brando refuse l'Oscar du Parrain
    };
    for (const [id, date] of Object.entries(dates)) assert.equal(byId(oscars, id).date, date, id);
});

test('data/fr.json est à jour avec les sources des thèmes de prix (scripts/prix/*.json)', (t) => {
    const probe = spawnSync('python3', ['--version']);
    if (probe.error) {
        t.skip('python3 indisponible : vérification de la source ignorée');
        return;
    }
    const run = spawnSync('python3', ['-I', path.join('scripts', 'build_prix.py'), '--verify'],
        { cwd: root, encoding: 'utf8' });
    assert.equal(run.status, 0, `${run.stdout}${run.stderr}`);
});
