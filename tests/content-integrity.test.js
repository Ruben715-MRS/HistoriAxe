// Garde-fou de contenu, en plus du schéma (tests/data-schema.test.js).
//
// Cas d'origine : le thème « William Shakespeare » portait les titres de Ravi
// Shankar (mêmes identifiants sha_01…), sous des descriptions et des dates
// de Shakespeare. Aucun test de forme ne le voit. Les identifiants uniques
// (data-schema) en attrapent la cause ; ce test attrape l'effet : dans une
// biographie, un titre dont AUCUN nom propre n'apparaît dans la description.
//
// L'heuristique a des faux positifs (une description n'a pas à répéter chaque
// nom du titre) : c'est donc un cliquet — le nombre de cas signalés ne doit
// pas augmenter. Le faire baisser est bienvenu : baissez alors BASELINE.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const BASELINE = 390; // mesuré le jour de l'ajout du test

const doc = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'data', 'fr.json'), 'utf8'));

function* themes(node) {
    for (const t of node.themes || []) yield t;
    for (const s of node.subcategories || []) yield* themes(s);
}
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function suspects() {
    const out = [];
    for (const cat of doc.categories) {
        for (const theme of themes(cat)) {
            if (!theme.id.startsWith('bio_')) continue;
            for (const evt of theme.events) {
                let names = (evt.titre.match(/[A-ZÀ-Ý][\wÀ-ÿ'’-]+/g) || []).filter((w) => w.length >= 4);
                if (names.length && evt.titre.startsWith(names[0])) names = names.slice(1); // majuscule de début de phrase
                if (!names.length) continue;
                const desc = norm(evt.description);
                if (!names.some((w) => desc.includes(norm(w).slice(0, 5)))) out.push(`${theme.id}/${evt.id} « ${evt.titre} »`);
            }
        }
    }
    return out;
}

test('biographies : le nombre de titres sans lien avec leur description ne progresse pas', () => {
    const found = suspects();
    assert.ok(found.length <= BASELINE,
        `${found.length} titres suspects (limite ${BASELINE}). Nouveaux possibles :\n${found.slice(0, 40).join('\n')}`);
});

test('biographie de Shakespeare : plus aucun titre de Ravi Shankar', () => {
    for (const cat of doc.categories) {
        for (const theme of themes(cat)) {
            if (theme.id !== 'bio_shakespeare') continue;
            for (const evt of theme.events) assert.ok(!/Shankar|Annapurna|sitar/i.test(evt.titre), evt.titre);
        }
    }
});
