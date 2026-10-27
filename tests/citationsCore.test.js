// Les règles du recueil de citations (js/citationsCore.js) et l'intégrité de ses données (assets/citations/).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../js/citationsCore.js');

const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'assets', 'citations');
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const all = C.mergeLots(index.lots.map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))));

const sample = [
    { id: 'cit_a', texte: 'Je pense, donc je suis.', auteur: 'René Descartes', classement: 'Descartes', annee: 1637, theme: 'savoir', fiabilite: 'attestee', contexte: 'Quatrième partie.', source: { oeuvre: 'Discours de la méthode' }, repere: true },
    { id: 'cit_b', texte: 'Et pourtant elle tourne !', auteur: 'Galilée', annee: 1633, theme: 'savoir', fiabilite: 'apocryphe', contexte: 'Procès de 1633.', source: { oeuvre: 'The Italian Library' }, note: 'Première trace en 1757.' },
    { id: 'cit_c', texte: 'Le sort en est jeté.', original: 'Iacta alea est', langue: 'latin', auteur: 'Jules César', classement: 'César', annee: -49, theme: 'guerre', fiabilite: 'attribuee', contexte: 'Le Rubicon.', source: { oeuvre: 'Suétone' }, note: 'Rapportée 170 ans après.' },
    { id: 'cit_d', texte: 'Quoi qu’il arrive…', auteur: 'Charles de Gaulle', classement: 'Gaulle', annee: 1940, theme: 'guerre', fiabilite: 'attestee', contexte: 'Appel du 18 juin.', source: { oeuvre: 'Appel du 18 juin' } }
];

test('époques : bornes incluses à droite, 1800 ouvre la dernière', () => {
    assert.equal(C.eraOf(-49), 'avant500');
    assert.equal(C.eraOf(500), 'avant500');
    assert.equal(C.eraOf(501), '500-1500');
    assert.equal(C.eraOf(1500), '500-1500');
    assert.equal(C.eraOf(1501), '1500-1800');
    assert.equal(C.eraOf(1799), '1500-1800');
    assert.equal(C.eraOf(1800), 'depuis1800');
    assert.equal(C.eraOf(2024), 'depuis1800');
});

test('année : av. J.-C., « vers » et note', () => {
    assert.equal(C.formatYear({ annee: 1637 }), '1637');
    assert.equal(C.formatYear({ annee: -49 }), '49 av. J.-C.');
    assert.equal(C.formatYear({ annee: -480, vers: true }), 'vers 480 av. J.-C.');
    assert.equal(C.formatYear({ annee: 1906, anneeNote: 'première trace connue' }), '1906 (première trace connue)');
});

test('recherche : sans accent, mots dans n’importe quel ordre, dans l’original comme dans le contexte', () => {
    const ids = q => C.search(sample, { query: q }).map(c => c.id);
    assert.deepEqual(ids('rene descartes'), ['cit_a']);
    assert.deepEqual(ids('descartes rene'), ['cit_a']);
    assert.deepEqual(ids('IACTA'), ['cit_c']);
    assert.deepEqual(ids('rubicon'), ['cit_c']);
    assert.deepEqual(ids('quoi qu\'il'), ['cit_d']);
    assert.deepEqual(ids('zzz'), []);
    assert.equal(ids('').length, 4);
});

test('filtres : combinés, « all » ne filtre pas', () => {
    assert.deepEqual(C.search(sample, { theme: 'guerre' }).map(c => c.id), ['cit_c', 'cit_d']);
    assert.deepEqual(C.search(sample, { theme: 'guerre', era: 'depuis1800' }).map(c => c.id), ['cit_d']);
    assert.deepEqual(C.search(sample, { fiabilite: 'apocryphe' }).map(c => c.id), ['cit_b']);
    assert.deepEqual(C.search(sample, { repere: true }).map(c => c.id), ['cit_a']);
    assert.equal(C.search(sample, { era: 'all', theme: 'all', fiabilite: 'all' }).length, 4);
});

test('tri : chronologique, ou par nom de classement de l’auteur', () => {
    assert.deepEqual(C.sorted(sample, 'chrono').map(c => c.id), ['cit_c', 'cit_b', 'cit_a', 'cit_d']);
    // César, Descartes, Galilée (pas de classement : son nom), Gaulle
    assert.deepEqual(C.sorted(sample, 'alpha').map(c => c.id), ['cit_c', 'cit_a', 'cit_b', 'cit_d']);
    assert.deepEqual(sample.map(c => c.id), ['cit_a', 'cit_b', 'cit_c', 'cit_d'], 'le tri ne modifie pas la liste d’origine');
});

test('tranches : le reste se compte', () => {
    assert.deepEqual(C.page(sample, 3).items.length, 3);
    assert.equal(C.page(sample, 3).rest, 1);
    assert.equal(C.page(sample, 10).rest, 0);
});

test('validation : une entrée correcte passe, les défauts sont dits', () => {
    sample.forEach(c => assert.deepEqual(C.validate(c), [], c.id));
    assert.ok(C.validate({}).length > 5);
    assert.ok(C.validate(Object.assign({}, sample[0], { id: 'Cit A' })).some(p => /identifiant/.test(p)));
    assert.ok(C.validate(Object.assign({}, sample[0], { annee: 0 })).some(p => /année/.test(p)));
    assert.ok(C.validate(Object.assign({}, sample[0], { annee: 1637.5 })).some(p => /année/.test(p)));
    assert.ok(C.validate(Object.assign({}, sample[1], { note: '' })).some(p => /note/.test(p)));
    assert.ok(C.validate(Object.assign({}, sample[0], { fiabilite: 'douteuse' })).some(p => /fiabilité/.test(p)));
    assert.ok(C.validate(Object.assign({}, sample[0], { theme: 'x' })).some(p => /thème/.test(p)));
    assert.ok(C.validate(Object.assign({}, sample[0], { original: 'Ego cogito' })).some(p => /langue/.test(p)));
    assert.ok(C.validate(Object.assign({}, sample[0], { source: {} })).some(p => /source/.test(p)));
});

test('doublons d’identifiant repérés', () => {
    assert.deepEqual(C.duplicateIds(sample), []);
    assert.deepEqual(C.duplicateIds(sample.concat(sample[0])), ['cit_a']);
});

// --- Les données --------------------------------------------------------------------------------------

test('données : chaque lot de l’index existe et aucun fichier de lot n’est oublié', () => {
    assert.ok(index.lots.length > 0);
    const files = fs.readdirSync(dir).filter(f => /^\d+\.json$/.test(f)).sort();
    assert.deepEqual(index.lots.slice().sort(), files, 'un lot est absent de index.json ou de assets/citations/');
});

test('données : chaque citation est valable, les identifiants sont uniques', () => {
    assert.ok(all.length >= 100);
    assert.deepEqual(C.duplicateIds(all), []);
    all.forEach(c => assert.deepEqual(C.validate(c), [], c.id));
});

test('données : les liens vers les cartes « Naissance de… » et les biographies existent', () => {
    const doc = JSON.parse(fs.readFileSync(path.join(root, 'data', 'fr.json'), 'utf8'));
    const events = new Map();
    const themes = new Set();
    (function walk(node) {
        (node.themes || []).forEach(t => { themes.add(t.id); (t.events || []).forEach(e => events.set(e.id, e)); });
        (node.subcategories || []).forEach(walk);
    })({ subcategories: doc.categories });
    all.forEach(c => {
        if (c.naissance) {
            const evt = events.get(c.naissance);
            assert.ok(evt, `${c.id} : la carte « ${c.naissance} » n’existe pas`);
            assert.match(evt.titre, /^Naissance /, `${c.id} : ${c.naissance} n’est pas une carte de naissance`);
        }
        if (c.biographie) assert.ok(themes.has(c.biographie), `${c.id} : la biographie « ${c.biographie} » n’existe pas`);
    });
});

test('données : une citation traduite garde sa version originale visible, une citation française n’en a pas', () => {
    all.forEach(c => {
        if (c.langue) assert.ok(c.original, `${c.id} : langue sans version originale`);
    });
});

test('données : typographie française, guillemets et ponctuation haute tiennent à leur texte par une espace insécable', () => {
    all.forEach(c => {
        [c.texte, c.contexte, c.note].filter(Boolean).forEach(text => {
            assert.ok(!/« | [»:;!?]/.test(text), `${c.id} : espace ordinaire autour d'un guillemet ou avant : ; ! ? (il faut une espace insécable)`);
        });
    });
});

test('données : les citations non attestées sont bien présentes dans le premier lot (apocryphes gardées exprès)', () => {
    assert.ok(all.some(c => c.fiabilite === 'apocryphe'));
    assert.ok(all.some(c => c.fiabilite === 'attribuee'));
});
