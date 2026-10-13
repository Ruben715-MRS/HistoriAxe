// Géolocalisation des événements (assets/geo/events-geo.json, produit par scripts/geo/).
//
// Le fichier est généré par étapes (thème après thème) : le test valide ce qui
// s'y trouve, quel que soit l'avancement, et refuse les erreurs qu'un pipeline
// de géocodage laisse passer en silence (point hors du monde, événement
// inconnu, deux fiches du même fait à deux endroits différents).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const L = require('../js/linkedEvents.js');

const GEO_PATH = path.join(__dirname, '..', 'assets', 'geo', 'events-geo.json');
const FR_PATH = path.join(__dirname, '..', 'data', 'fr.json');
const present = fs.existsSync(GEO_PATH);
const skip = present ? false : 'assets/geo/events-geo.json absent (géolocalisation pas encore générée)';

function loadEntries() {
    const bdd = JSON.parse(fs.readFileSync(FR_PATH, 'utf8'));
    const entries = [];
    (function walk(node, category) {
        (node.subcategories || []).forEach(s => walk(s, category));
        (node.themes || []).forEach(theme => {
            (theme.events || []).forEach(event => entries.push({ event, theme, category }));
        });
    })({ subcategories: bdd.categories }, null);
    return entries;
}

test('geo.json : format, coordonnées et précisions valides', { skip }, () => {
    const geo = JSON.parse(fs.readFileSync(GEO_PATH, 'utf8'));
    assert.equal(geo.v, 1);
    const ids = Object.keys(geo.points);
    assert.ok(ids.length > 0);
    for (const id of ids) {
        const [lat, lon, prec, label, flag] = geo.points[id];
        assert.ok(Number.isFinite(lat) && lat >= -90 && lat <= 90, `${id}: latitude ${lat}`);
        assert.ok(Number.isFinite(lon) && lon >= -180 && lon <= 180, `${id}: longitude ${lon}`);
        assert.ok(['s', 'v', 'z'].includes(prec), `${id}: précision ${prec}`);
        assert.ok(typeof label === 'string' && label.length > 0, `${id}: libellé vide`);
        assert.ok(flag === 0 || flag === 1, `${id}: drapeau ${flag}`);
    }
});

test('geo.json : chaque point désigne un événement existant (thème:id)', { skip }, () => {
    const geo = JSON.parse(fs.readFileSync(GEO_PATH, 'utf8'));
    const known = new Set(loadEntries().map(e => `${e.theme.id}:${e.event.id}`));
    const unknown = Object.keys(geo.points).filter(id => !known.has(id));
    assert.deepEqual(unknown.slice(0, 10), []);
});

test('geo.json : les fiches d\'un même fait lié partagent le même point', { skip }, () => {
    const geo = JSON.parse(fs.readFileSync(GEO_PATH, 'utf8'));
    const entries = loadEntries();
    const groups = new Map();
    entries.forEach(en => {
        const key = L.factKey(en.event);
        if (!key) return;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(en);
    });
    const conflicts = [];
    groups.forEach(members => {
        if (new Set(members.map(m => m.theme.id)).size < 2) return;
        const pts = members.map(m => geo.points[`${m.theme.id}:${m.event.id}`]).filter(Boolean);
        if (pts.length === 0) return;
        const first = JSON.stringify(pts[0]);
        // Un fait lié est localisé une fois : soit tous ses membres ont le même point,
        // soit aucun (jamais « certains oui, d'autres non »).
        if (pts.length !== members.length || pts.some(p => JSON.stringify(p) !== first)) {
            conflicts.push(members.map(m => `${m.theme.id}:${m.event.id}`).join(' | '));
        }
    });
    assert.deepEqual(conflicts.slice(0, 5), []);
});
