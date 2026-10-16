// Le tirage du parcours d'Expédition (js/app/expedition.js) : pur, testé hors navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'app', 'expedition.js'), 'utf8');
const sandbox = { shuffleArray: (a) => a, Math, console };
vm.createContext(sandbox);
vm.runInContext(src + '\nthis.E = { planExpeditionStages, EXPEDITION_TIERS, EXPEDITION_CAPS, EXPEDITION_JOKER_AFTER };', sandbox);
const { planExpeditionStages, EXPEDITION_TIERS, EXPEDITION_CAPS, EXPEDITION_JOKER_AFTER } = sandbox.E;

function seeded(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

test('huit épreuves : deux faciles, trois moyennes, trois difficiles, dans cet ordre', () => {
    for (let seed = 1; seed <= 50; seed++) {
        const stages = planExpeditionStages(seeded(seed));
        assert.equal(stages.length, 8);
        assert.deepEqual(Array.from(stages.map(s => s.tier)), [0, 0, 1, 1, 1, 2, 2, 2]);
        stages.forEach(s => assert.ok(EXPEDITION_TIERS[s.tier].modes.includes(s.mode), `${s.mode} n'est pas du palier ${s.tier}`));
    }
});

test('aucun mode ne revient dans un parcours', () => {
    for (let seed = 1; seed <= 50; seed++) {
        const modes = planExpeditionStages(seeded(seed)).map(s => s.mode);
        assert.equal(new Set(modes).size, 8);
    }
});

test('le tirage varie d\'un parcours à l\'autre, et chaque mode de la difficulté maximale peut sortir', () => {
    const seen = new Set();
    for (let seed = 1; seed <= 200; seed++) planExpeditionStages(seeded(seed)).slice(5).forEach(s => seen.add(s.mode));
    assert.deepEqual([...seen].sort(), ['curseur', 'ecart', 'fil', 'ordre']);
    const first = planExpeditionStages(seeded(1)).map(s => s.mode).join();
    assert.ok([2, 3, 4, 5, 6].some(seed => planExpeditionStages(seeded(seed)).map(s => s.mode).join() !== first));
});

test('chaque mode du parcours a un plafond de questions, et les jokers tombent après la 3e et la 6e épreuve', () => {
    for (let seed = 1; seed <= 20; seed++) planExpeditionStages(seeded(seed)).forEach(s => assert.ok(EXPEDITION_CAPS[s.mode] > 0, s.mode));
    assert.deepEqual({ ...EXPEDITION_JOKER_AFTER }, { 3: 'skip', 6: 'life' });
});
