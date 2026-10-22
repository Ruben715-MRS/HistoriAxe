// Les cartes historiques (js/historyMapsCore.js) : des contours dessinés à la main, donc contrôlés pour ce qu'on peut vérifier.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require('../js/historyMapsCore.js');
const C = require('../js/countriesCore.js');

const root = path.join(__dirname, '..');
const place = (entity, name) => entity.places.find(p => p.n.startsWith(name)).c;
const zoneContains = (zone, [lon, lat]) => C.contains(C.prepare({ type: 'Polygon', coordinates: [H.closeRing(zone.ring)] }), lon, lat);
const snapshotContains = (snapshot, point) => snapshot.zones.some(z => zoneContains(z, point));
const get = (entityId, snapshotId) => { const e = H.entityById(entityId); return { entity: e, snapshot: H.snapshotOf(e, snapshotId) }; };

test('les six entités, aux identifiants uniques et aux champs complets', () => {
    assert.deepEqual(H.ENTITIES.map(e => e.id), ['mesopotamie', 'egypte', 'rome', 'saint-empire', 'ottoman', 'mongol']);
    assert.equal(new Set(H.ENTITIES.map(e => e.id)).size, H.ENTITIES.length);
    H.ENTITIES.forEach(e => {
        ['name', 'icon', 'color', 'span', 'capital', 'summary'].forEach(k => assert.ok(e[k] && String(e[k]).length > 1, e.id + ' ' + k));
        assert.match(e.color, /^#[0-9a-f]{6}$/i);
        assert.ok(e.from < e.to, e.id + ' période');
        assert.ok(e.snapshots.length >= 2, e.id + ' au moins deux dates');
        assert.ok(e.places.length >= 5, e.id + ' villes repères');
    });
});

test('les instantanés sont datés dans la période de l\'entité, dans l\'ordre', () => {
    H.ENTITIES.forEach(e => {
        let last = -Infinity;
        const ids = new Set();
        e.snapshots.forEach(s => {
            assert.ok(!ids.has(s.id), 'doublon ' + e.id + '/' + s.id); ids.add(s.id);
            assert.ok(s.label && s.text && s.text.length > 40, e.id + '/' + s.id + ' texte');
            assert.ok(H.inSpan(e, s.year), e.id + '/' + s.id + ' hors période : ' + s.year);
            assert.ok(s.year > last, e.id + ' ordre chronologique');
            last = s.year;
        });
    });
});

test('chaque contour est un anneau sain : assez de points, dans le monde, sans croisement, d\'une vraie surface', () => {
    H.ENTITIES.forEach(e => e.snapshots.forEach(s => {
        assert.ok(s.zones.length >= 1);
        s.zones.forEach(z => {
            const where = e.id + '/' + s.id + '/' + z.name;
            assert.ok(z.name, where + ' nom');
            assert.ok(z.ring.length >= 8, where + ' trop peu de points');
            z.ring.forEach(([lon, lat]) => {
                assert.ok(lon >= -180 && lon <= 180 && lat >= -85 && lat <= 85, where + ' hors du monde : ' + lon + ',' + lat);
            });
            assert.equal(H.selfIntersection(z.ring), null, where + ' se recoupe');
            const closed = H.closeRing(z.ring);
            assert.deepEqual(closed[0], closed[closed.length - 1]);
            // surface en degrés carrés (formule du lacet)
            let area = 0;
            for (let i = 0; i < closed.length - 1; i++) area += closed[i][0] * closed[i + 1][1] - closed[i + 1][0] * closed[i][1];
            assert.ok(Math.abs(area) / 2 > 5, where + ' surface trop petite');
            if (z.color) assert.match(z.color, /^#[0-9a-f]{6}$/i);
        });
    }));
});

test('les villes repères sont dans le monde et nommées', () => {
    H.ENTITIES.forEach(e => e.places.forEach(p => {
        assert.ok(p.n);
        assert.ok(p.c[0] >= -180 && p.c[0] <= 180 && p.c[1] >= -85 && p.c[1] <= 85);
    }));
});

test('la détection de croisement voit un huit', () => {
    assert.ok(H.selfIntersection([[0, 0], [2, 2], [2, 0], [0, 2]]));
    assert.equal(H.selfIntersection([[0, 0], [2, 0], [2, 2], [0, 2]]), null);
});

test('GeoJSON : une entité par zone, anneaux fermés, couleur de l\'entité ou de la zone', () => {
    const { entity, snapshot } = get('rome', 'partage');
    const features = H.snapshotFeatures(entity, snapshot);
    assert.equal(features.length, 2);
    assert.equal(features[0].properties.color, '#b91c1c');
    assert.equal(features[1].properties.color, '#7e22ce');
    features.forEach(f => { const r = f.geometry.coordinates[0]; assert.deepEqual(r[0], r[r.length - 1]); });
    const geometry = H.snapshotGeometry(snapshot);
    assert.equal(geometry.type, 'MultiPolygon');
    assert.equal(geometry.coordinates.length, 2);
    const mesopotamie = get('mesopotamie', 'sumer');
    assert.equal(H.snapshotFeatures(mesopotamie.entity, mesopotamie.snapshot)[0].properties.color, '#c2703d');
});

test('Rome : l\'empire d\'Auguste, de Trajan, puis le partage', () => {
    const rome = H.entityById('rome');
    const auguste = H.snapshotOf(rome, 'auguste'), trajan = H.snapshotOf(rome, 'trajan'), partage = H.snapshotOf(rome, 'partage');
    ['Rome', 'Constantinople', 'Carthage', 'Alexandrie', 'Lyon', 'Antioche', 'Milan'].forEach(n => assert.ok(snapshotContains(auguste, place(rome, n)), n + ' en 14'));
    assert.ok(!snapshotContains(auguste, place(rome, 'Londres')), 'la Bretagne n\'est conquise qu\'en 43');
    assert.ok(snapshotContains(trajan, place(rome, 'Londres')), 'Londres en 117');
    // l'étendue de Trajan dépasse celle d'Auguste : Ctésiphon-Dacie-Bretagne en plus (plus de zone, plus d'étendue)
    const bounds = s => C.prepare(H.snapshotGeometry(s)).box;
    assert.ok(bounds(trajan)[3] > bounds(auguste)[3], 'Trajan va plus au nord (Bretagne)');
    assert.ok(bounds(trajan)[2] > bounds(auguste)[2] - 1, 'et au moins aussi à l\'est');
    // le partage : Rome à l'Occident, Constantinople à l'Orient, sans recouvrement des deux capitales
    const [west, east] = partage.zones;
    assert.ok(zoneContains(west, place(rome, 'Rome')) && !zoneContains(east, place(rome, 'Rome')));
    assert.ok(zoneContains(east, place(rome, 'Constantinople')) && !zoneContains(west, place(rome, 'Constantinople')));
    assert.ok(zoneContains(west, place(rome, 'Londres')) && zoneContains(west, place(rome, 'Carthage')));
    assert.ok(zoneContains(east, place(rome, 'Alexandrie')) && zoneContains(east, place(rome, 'Antioche')));
});

test('Mésopotamie : de Sumer à l\'Assyrie', () => {
    const m = H.entityById('mesopotamie');
    const sumer = H.snapshotOf(m, 'sumer'), assyrie = H.snapshotOf(m, 'assyrie'), akkad = H.snapshotOf(m, 'akkad'), babylone = H.snapshotOf(m, 'babylone');
    ['Ur', 'Uruk', 'Babylone'].forEach(n => assert.ok(snapshotContains(sumer, place(m, n)), n + ' à Sumer'));
    assert.ok(!snapshotContains(sumer, place(m, 'Ninive')), 'Ninive est trop au nord pour Sumer');
    ['Babylone', 'Assur', 'Ninive', 'Suse'].forEach(n => assert.ok(snapshotContains(assyrie, place(m, n)), n + ' sous les Assyriens'));
    assert.ok(snapshotContains(akkad, place(m, 'Ur')) && snapshotContains(akkad, place(m, 'Assur')));
    assert.ok(snapshotContains(babylone, place(m, 'Babylone')) && snapshotContains(babylone, place(m, 'Ninive')));
});

test('Égypte : la vallée du Nil, puis le Nouvel Empire', () => {
    const e = H.entityById('egypte');
    const ancien = H.snapshotOf(e, 'ancien'), nouveau = H.snapshotOf(e, 'nouveau');
    ['Memphis', 'Gizeh', 'Thèbes', 'Alexandrie', 'Assouan'].forEach(n => assert.ok(snapshotContains(ancien, place(e, n)), n + ' dans l\'Ancien Empire'));
    assert.ok(!snapshotContains(ancien, place(e, 'Napata')), 'la Nubie n\'est pas encore égyptienne');
    assert.ok(snapshotContains(nouveau, place(e, 'Napata')), 'Napata en Nubie sous Thoutmosis III');
    // le Nouvel Empire s'étend en Syrie-Palestine : plus au nord-est que l'Ancien
    const box = s => C.prepare(H.snapshotGeometry(s)).box;
    assert.ok(box(nouveau)[3] > box(ancien)[3] + 3);
});

test('Saint-Empire : la Germanie, puis la Bourgogne, puis la fin', () => {
    const s = H.entityById('saint-empire');
    const a = H.snapshotOf(s, '962'), b = H.snapshotOf(s, '1250'), c = H.snapshotOf(s, '1648');
    ['Aix-la-Chapelle', 'Francfort', 'Prague', 'Ratisbonne'].forEach(n => assert.ok(snapshotContains(a, place(s, n)), n + ' en 962'));
    ['Aix-la-Chapelle', 'Francfort', 'Prague', 'Vienne'].forEach(n => assert.ok(snapshotContains(b, place(s, n)), n + ' en 1250'));
    ['Aix-la-Chapelle', 'Francfort', 'Prague', 'Vienne', 'Ratisbonne'].forEach(n => assert.ok(snapshotContains(c, place(s, n)), n + ' en 1648'));
    assert.ok(!snapshotContains(c, place(s, 'Milan')), 'l\'Italie du Nord n\'est plus une réalité en 1648');
    assert.ok(!snapshotContains(c, place(s, 'Rome')));
    // la Bourgogne (vallée du Rhône) n'est dans l'empire qu'après 1032
    assert.ok(!snapshotContains(a, [4.85, 45.75]), 'Lyon n\'est pas dans l\'empire en 962');
    assert.ok(snapshotContains(b, [5.8, 46.5]), 'la Bourgogne (Saône) est dans l\'empire en 1250');
});

test('Empire ottoman : de Bursa à la veille de la guerre', () => {
    const o = H.entityById('ottoman');
    const a = H.snapshotOf(o, '1520'), b = H.snapshotOf(o, '1683'), c = H.snapshotOf(o, '1914');
    ['Constantinople', 'Le Caire', 'La Mecque', 'Edirne'].forEach(n => assert.ok(snapshotContains(a, place(o, n)), n + ' en 1520'));
    assert.ok(!snapshotContains(a, place(o, 'Belgrade')), 'Belgrade n\'est prise qu\'en 1521');
    assert.ok(!snapshotContains(a, place(o, 'Bagdad')), 'Bagdad n\'est prise qu\'en 1534');
    ['Le Caire', 'Bagdad', 'Belgrade', 'Alger', 'La Mecque'].forEach(n => assert.ok(snapshotContains(b, place(o, n)), n + ' en 1683'));
    ['Constantinople', 'Bagdad', 'La Mecque'].forEach(n => assert.ok(snapshotContains(c, place(o, n)), n + ' en 1914'));
    ['Le Caire', 'Belgrade', 'Alger'].forEach(n => assert.ok(!snapshotContains(c, place(o, n)), n + ' est perdue en 1914'));
});

test('Empire mongol : de Gengis Khan aux quatre khanats', () => {
    const m = H.entityById('mongol');
    const a = H.snapshotOf(m, '1227'), b = H.snapshotOf(m, '1279');
    ['Karakorum', 'Samarcande'].forEach(n => assert.ok(snapshotContains(a, place(m, n)), n + ' en 1227'));
    ['Bagdad', 'Kiev'].forEach(n => assert.ok(!snapshotContains(a, place(m, n)), n + ' n\'est pas encore mongole en 1227'));
    assert.equal(b.zones.length, 4);
    const zone = name => b.zones.find(z => z.name.startsWith(name));
    assert.ok(zoneContains(zone('Dynastie Yuan'), place(m, 'Khanbaliq')) && zoneContains(zone('Dynastie Yuan'), place(m, 'Karakorum')));
    assert.ok(zoneContains(zone('Khanat de Djaghataï'), place(m, 'Samarcande')));
    assert.ok(zoneContains(zone('Ilkhanat'), place(m, 'Tabriz')) && zoneContains(zone('Ilkhanat'), place(m, 'Bagdad')));
    assert.ok(zoneContains(zone('Horde d\'or'), place(m, 'Saraï')) && zoneContains(zone('Horde d\'or'), place(m, 'Kiev')));
    // les quatre khanats ne se recouvrent pas sur leurs capitales
    b.zones.forEach(z => assert.equal(b.zones.filter(o => zoneContains(o, place(m, 'Karakorum'))).length, 1));
});

test('période d\'une entité', () => {
    const rome = H.entityById('rome');
    assert.equal(H.inSpan(rome, 14), true);
    assert.equal(H.inSpan(rome, 1000), false);
    assert.equal(H.inSpan(rome, -500), false);
    assert.equal(H.inSpan(rome, null), false);
});

test('les données de la silhouette de la terre sont là et raisonnables', () => {
    const land = JSON.parse(fs.readFileSync(path.join(root, 'assets/geo/land.json'), 'utf8'));
    assert.equal(land.type, 'MultiPolygon');
    assert.ok(land.coordinates.length > 500);
    assert.ok(fs.statSync(path.join(root, 'assets/geo/land.json')).size < 700 * 1024);
});
