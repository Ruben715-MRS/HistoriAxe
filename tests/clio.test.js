// Clio : les réactions (js/clioCore.js) — quel événement, quelle humeur, quelle phrase — et la banque de phrases traduite.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../js/clioCore.js');

const fr = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ui', 'fr.json'), 'utf8'));

test('chaque événement a une humeur connue et toutes ses phrases traduites', () => {
    for (const [event, cfg] of Object.entries(C.EVENTS)) {
        assert.ok(C.MOODS.includes(cfg.mood), `${event} : humeur inconnue`);
        for (let i = 0; i < cfg.lines; i++) {
            const key = C.lineKey(event, i).split('.').reduce((o, k) => (o ? o[k] : undefined), fr);
            assert.equal(typeof key, 'string', `phrase manquante : ${C.lineKey(event, i)}`);
            assert.ok(key.length > 5);
        }
        // Pas de variante en trop dans fr.json.
        assert.equal(fr.clio.line[event][String(cfg.lines)], undefined, `${event} : phrase non déclarée`);
    }
});

test('la réaction suit le résultat d\'un niveau', () => {
    assert.equal(C.eventForLevel({ won: false, stars: 0 }), 'lose');
    assert.equal(C.eventForLevel({ won: true, stars: 1 }), 'win1');
    assert.equal(C.eventForLevel({ won: true, stars: 2 }), 'win2');
    assert.equal(C.eventForLevel({ won: true, stars: 3 }), 'win3');
    assert.equal(C.eventForLevel({ won: true, stars: 1, boss: true }), 'boss');
    assert.equal(C.eventForLevel({ won: false, stars: 0, boss: true }), 'lose', 'un boss perdu se console comme un niveau perdu');
    assert.equal(C.EVENTS[C.eventForLevel({ won: false })].mood, 'triste');
    assert.equal(C.EVENTS[C.eventForLevel({ won: true, stars: 3 })].mood, 'ravi');
});

test('une phrase ne se répète jamais deux fois de suite, et toutes les variantes sortent', () => {
    for (const event of ['win3', 'lose', 'greet']) {
        const n = C.EVENTS[event].lines;
        const seen = new Set();
        let last = -1;
        for (let i = 0; i < 500; i++) {
            const idx = C.pickLine(event, last, Math.random);
            assert.ok(idx >= 0 && idx < n);
            assert.notEqual(idx, last);
            seen.add(idx);
            last = idx;
        }
        assert.equal(seen.size, n);
    }
    assert.equal(C.pickLine('first', 0, Math.random), 0, 'une seule variante : toujours la même');
});

test('la série quotidienne : en danger la veille d\'une extinction seulement', () => {
    assert.equal(C.streakState(5, 1), 'risk');
    assert.equal(C.streakState(5, 0), 'ok');
    assert.equal(C.streakState(5, 2), 'none', 'déjà éteinte');
    assert.equal(C.streakState(1, 1), 'none', 'une série d\'un jour n\'est pas encore une série');
    assert.equal(C.streakState(0, null), 'none');
});

test('le costume du monde fini : proposé seulement s\'il n\'est pas possédé', () => {
    const item = { price: 100 };
    assert.equal(C.costumeHint(item, true, 500), 'none');
    assert.equal(C.costumeHint(null, false, 500), 'none');
    assert.equal(C.costumeHint(item, false, 100), 'costume');
    assert.equal(C.costumeHint(item, false, 40), 'costumeShort');
});
