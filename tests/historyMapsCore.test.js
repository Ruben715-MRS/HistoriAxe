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

test('les vingt-neuf entités, aux identifiants uniques et aux champs complets', () => {
    assert.deepEqual(H.ENTITIES.map(e => e.id), ['mesopotamie', 'egypte', 'maurya', 'han', 'rome', 'aksoum', 'gupta', 'mayas', 'perse', 'alexandre', 'byzance', 'califat', 'carolingien', 'saint-empire', 'mali', 'mongol', 'songhai', 'ottoman', 'charles-quint', 'azteques', 'incas', 'kongo', 'qing', 'ethiopie', 'britannique', 'russe', 'napoleon', 'austro-hongrois', 'colonial-francais']);
    assert.equal(new Set(H.ENTITIES.map(e => e.id)).size, H.ENTITIES.length);
    H.ENTITIES.forEach(e => {
        ['name', 'icon', 'color', 'span', 'capital', 'summary'].forEach(k => assert.ok(e[k] && String(e[k]).length >= 1, e.id + ' ' + k));
        assert.match(e.color, /^#[0-9a-f]{6}$/i);
        assert.ok(e.from < e.to, e.id + ' période');
        assert.equal(typeof e.peak, 'number', e.id + ' apogée');
        assert.ok(e.peak >= e.from && e.peak <= e.to, e.id + ' : l\'apogée est dans la période');
        assert.ok(e.snapshots.length >= 2, e.id + ' au moins deux dates');
        assert.ok(e.places.length >= 5, e.id + ' villes repères');
        assert.ok(e.summary.length > 200, e.id + ' résumé');
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
            assert.ok(z.ring.length >= 4, where + ' trop peu de points');
            z.ring.forEach(([lon, lat]) => {
                assert.ok(lon >= -180 && lon <= 180 && lat >= -85 && lat <= 85, where + ' hors du monde : ' + lon + ',' + lat);
            });
            assert.equal(H.selfIntersection(z.ring), null, where + ' se recoupe');
            const closed = H.closeRing(z.ring);
            assert.deepEqual(closed[0], closed[closed.length - 1]);
            // surface en degrés carrés (formule du lacet)
            let area = 0;
            for (let i = 0; i < closed.length - 1; i++) area += closed[i][0] * closed[i + 1][1] - closed[i + 1][0] * closed[i][1];
            assert.ok(Math.abs(area) / 2 > 0.05, where + ' surface trop petite');
            if (z.color) assert.match(z.color, /^#[0-9a-f]{6}$/i);
        });
        // un instantané doit se voir sur une carte du monde
        const total = s.zones.reduce((sum, z) => {
            const c = H.closeRing(z.ring); let a = 0;
            for (let i = 0; i < c.length - 1; i++) a += c[i][0] * c[i + 1][1] - c[i + 1][0] * c[i][1];
            return sum + Math.abs(a) / 2;
        }, 0);
        assert.ok(total > 1, e.id + '/' + s.id + ' surface totale trop petite : ' + total);
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

test('Empire perse : de Cyrus à Darius', () => {
    const e = H.entityById('perse');
    const cyrus = H.snapshotOf(e, 'cyrus'), darius = H.snapshotOf(e, 'darius');
    ['Persépolis', 'Suse', 'Pasargades', 'Babylone', 'Sardes', 'Ecbatane'].forEach(n => assert.ok(snapshotContains(cyrus, place(e, n)), n + ' sous Cyrus'));
    assert.ok(!snapshotContains(cyrus, place(e, 'Memphis')), 'l\'Égypte n\'est conquise qu\'en 525');
    assert.ok(snapshotContains(darius, place(e, 'Memphis')), 'Memphis sous Darius');
    assert.ok(snapshotContains(darius, place(e, 'Persépolis')) && snapshotContains(darius, place(e, 'Sardes')));
});

test('Alexandre : de la Macédoine à l\'Indus, puis le partage', () => {
    const e = H.entityById('alexandre');
    const a = H.snapshotOf(e, '336'), b = H.snapshotOf(e, '323'), c = H.snapshotOf(e, '281');
    ['Pella', 'Athènes'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 336'));
    ['Alexandrie', 'Babylone', 'Persépolis', 'Samarcande'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' n\'est pas macédonienne en 336'));
    ['Pella', 'Athènes', 'Alexandrie', 'Babylone', 'Persépolis', 'Samarcande', 'Taxila'].forEach(n => assert.ok(snapshotContains(b, place(e, n)), n + ' en 323'));
    // le partage : chaque capitale dans son royaume
    const zone = name => c.zones.find(z => z.name.startsWith(name));
    assert.ok(zoneContains(zone('Lagides'), place(e, 'Alexandrie')) && !zoneContains(zone('Séleucides'), place(e, 'Alexandrie')));
    assert.ok(zoneContains(zone('Séleucides'), place(e, 'Babylone')) && zoneContains(zone('Séleucides'), place(e, 'Persépolis')));
    assert.ok(zoneContains(zone('Macédoine'), place(e, 'Pella')));
    assert.equal(c.zones.length, 3);
});

test('Empire byzantin : Justinien, Basile II, la veille de la chute', () => {
    const e = H.entityById('byzance');
    const a = H.snapshotOf(e, '565'), b = H.snapshotOf(e, '1025'), c = H.snapshotOf(e, '1450');
    ['Constantinople', 'Ravenne', 'Carthage', 'Antioche', 'Alexandrie', 'Jérusalem', 'Thessalonique'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 565'));
    ['Constantinople', 'Antioche', 'Thessalonique', 'Nicée'].forEach(n => assert.ok(snapshotContains(b, place(e, n)), n + ' en 1025'));
    ['Carthage', 'Alexandrie', 'Jérusalem', 'Ravenne'].forEach(n => assert.ok(!snapshotContains(b, place(e, n)), n + ' est perdue en 1025'));
    assert.ok(snapshotContains(c, place(e, 'Constantinople')));
    ['Antioche', 'Nicée', 'Thessalonique'].forEach(n => assert.ok(!snapshotContains(c, place(e, n)), n + ' est perdue en 1450'));
    assert.equal(c.zones.length, 2);
});

test('Califat : de Mu\'awiya aux Abbassides et à Cordoue', () => {
    const e = H.entityById('califat');
    const a = H.snapshotOf(e, '661'), b = H.snapshotOf(e, '750'), c = H.snapshotOf(e, '900');
    ['Médine', 'La Mecque', 'Damas', 'Bagdad'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 661'));
    ['Kairouan', 'Cordoue', 'Samarcande'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' n\'est pas encore conquise en 661'));
    e.places.forEach(p => assert.ok(snapshotContains(b, p.c), p.n + ' en 750'));
    const zone = name => c.zones.find(z => z.name.startsWith(name));
    assert.ok(zoneContains(zone('Califat abbasside'), place(e, 'Bagdad')) && zoneContains(zone('Califat abbasside'), place(e, 'Samarcande')));
    assert.ok(!zoneContains(zone('Califat abbasside'), place(e, 'Cordoue')) && !zoneContains(zone('Califat abbasside'), place(e, 'Kairouan')));
    assert.ok(zoneContains(zone('Émirat omeyyade'), place(e, 'Cordoue')));
});

test('Empire carolingien : de 768 au partage de Verdun', () => {
    const e = H.entityById('carolingien');
    const a = H.snapshotOf(e, '768'), b = H.snapshotOf(e, '814'), c = H.snapshotOf(e, '843');
    ['Aix-la-Chapelle', 'Paris', 'Verdun'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 768'));
    ['Rome', 'Pavie', 'Ratisbonne'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' n\'est pas franque en 768'));
    e.places.forEach(p => assert.ok(snapshotContains(b, p.c), p.n + ' en 814'));
    assert.equal(c.zones.length, 3);
    const zone = name => c.zones.find(z => z.name.startsWith(name));
    assert.ok(zoneContains(zone('Francie occidentale'), place(e, 'Paris')));
    assert.ok(zoneContains(zone('Francie orientale'), place(e, 'Ratisbonne')));
    assert.ok(zoneContains(zone('Lotharingie'), place(e, 'Aix-la-Chapelle')) && zoneContains(zone('Lotharingie'), place(e, 'Pavie')) && zoneContains(zone('Lotharingie'), place(e, 'Rome')));
    assert.ok(!zoneContains(zone('Francie occidentale'), place(e, 'Aix-la-Chapelle')));
});

test('Mayas : cités du Petén, classique, postclassique', () => {
    const e = H.entityById('mayas');
    const a = H.snapshotOf(e, 'preclassique'), b = H.snapshotOf(e, 'classique'), c = H.snapshotOf(e, 'postclassique');
    ['El Mirador', 'Tikal', 'Calakmul'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' au préclassique'));
    assert.ok(!snapshotContains(a, place(e, 'Chichén Itzá')) && !snapshotContains(a, place(e, 'Copán')));
    ['Tikal', 'Palenque', 'Copán', 'Chichén Itzá', 'Calakmul', 'Uxmal'].forEach(n => assert.ok(snapshotContains(b, place(e, n)), n + ' à l\'époque classique'));
    ['Chichén Itzá', 'Uxmal'].forEach(n => assert.ok(snapshotContains(c, place(e, n)), n + ' au postclassique'));
    ['Tikal', 'Copán'].forEach(n => assert.ok(!snapshotContains(c, place(e, n)), n + ' est abandonnée au postclassique'));
});

test('Aztèques : la vallée de Mexico, puis l\'empire', () => {
    const e = H.entityById('azteques');
    const a = H.snapshotOf(e, '1428'), b = H.snapshotOf(e, '1519');
    ['Tenochtitlan', 'Texcoco', 'Tlacopan'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 1428'));
    assert.ok(!snapshotContains(a, place(e, 'Tochtepec')), 'Tochtepec est conquise plus tard');
    ['Tenochtitlan', 'Texcoco', 'Tlacopan', 'Tochtepec'].forEach(n => assert.ok(snapshotContains(b, place(e, n)), n + ' en 1519'));
    // l'empire est bien plus étendu que la vallée
    assert.ok(C.prepare(H.snapshotGeometry(b)).box[3] - C.prepare(H.snapshotGeometry(b)).box[1] > 2 * (C.prepare(H.snapshotGeometry(a)).box[3] - C.prepare(H.snapshotGeometry(a)).box[1]));
});

test('Incas : Cusco, puis les Andes de l\'Équateur au Chili', () => {
    const e = H.entityById('incas');
    const a = H.snapshotOf(e, '1438'), b = H.snapshotOf(e, '1470'), c = H.snapshotOf(e, '1527');
    assert.ok(snapshotContains(a, place(e, 'Cusco')) && snapshotContains(a, place(e, 'Machu Picchu')));
    ['Cusco', 'Chan Chan', 'Tiwanaku'].forEach(n => assert.ok(snapshotContains(b, place(e, n)), n + ' en 1470'));
    assert.ok(!snapshotContains(b, place(e, 'Quito')), 'Quito n\'est conquise que vers 1500');
    e.places.forEach(p => assert.ok(snapshotContains(c, p.c), p.n + ' en 1527'));
    assert.ok(!snapshotContains(a, place(e, 'Tiwanaku')));
    // l'empire s'allonge du nord au sud : de Pasto au Maule, près de 4 000 km
    const box = C.prepare(H.snapshotGeometry(c)).box;
    assert.ok(box[3] - box[1] > 35);
});

test('Empire maurya : Chandragupta, puis Ashoka et le Kalinga', () => {
    const e = H.entityById('maurya');
    const a = H.snapshotOf(e, 'chandragupta'), b = H.snapshotOf(e, 'ashoka');
    ['Pataliputra', 'Taxila', 'Ujjain', 'Sarnath', 'Kandahar'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' vers 300'));
    assert.ok(!snapshotContains(a, place(e, 'Bhubaneswar')), 'le Kalinga n\'est conquis que vers 261');
    e.places.forEach(p => assert.ok(snapshotContains(b, p.c), p.n + ' sous Ashoka'));
    const box = s => C.prepare(H.snapshotGeometry(s)).box;
    assert.ok(box(b)[1] < box(a)[1] - 5, 'Ashoka descend plus au sud');
});

test('Empire Han : le corridor du Hexi, puis le Tarim', () => {
    const e = H.entityById('han');
    const a = H.snapshotOf(e, 'han-occ'), b = H.snapshotOf(e, 'han-or');
    ['Chang\'an', 'Luoyang', 'Chengdu', 'Pyongyang', 'Hanoï'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' vers -100'));
    assert.ok(!snapshotContains(a, place(e, 'Kashgar')), 'Kashgar n\'est pas encore chinoise');
    e.places.forEach(p => assert.ok(snapshotContains(b, p.c), p.n + ' vers 100'));
});

test('Empire gupta : du Magadha à l\'âge d\'or', () => {
    const e = H.entityById('gupta');
    const a = H.snapshotOf(e, '320'), b = H.snapshotOf(e, '350'), c = H.snapshotOf(e, '400');
    assert.ok(snapshotContains(a, place(e, 'Pataliputra')) && !snapshotContains(a, place(e, 'Ujjain')) && !snapshotContains(a, place(e, 'Mathura')));
    ['Pataliputra', 'Mathura', 'Ayodhya', 'Prayagraj', 'Nalanda'].forEach(n => assert.ok(snapshotContains(b, place(e, n)), n + ' en 350'));
    e.places.forEach(p => assert.ok(snapshotContains(c, p.c), p.n + ' en 400'));
    const area = s => { const box = C.prepare(H.snapshotGeometry(s)).box; return (box[2] - box[0]) * (box[3] - box[1]); };
    assert.ok(area(a) < area(b) && area(b) < area(c) + 100);
});

test('Empire du Mali : le pays mandingue, puis le Sahel', () => {
    const e = H.entityById('mali');
    const a = H.snapshotOf(e, '1235'), b = H.snapshotOf(e, '1325');
    ['Niani', 'Kangaba'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 1235'));
    ['Tombouctou', 'Gao', 'Walata'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' n\'est pas encore dans l\'empire'));
    e.places.forEach(p => assert.ok(snapshotContains(b, p.c), p.n + ' en 1325'));
});

test('Empire d\'Éthiopie : des hautes terres à Ménélik II', () => {
    const e = H.entityById('ethiopie');
    const a = H.snapshotOf(e, '1270'), b = H.snapshotOf(e, '1450'), c = H.snapshotOf(e, '1900');
    ['Lalibela', 'Gondar'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 1270'));
    assert.ok(!snapshotContains(a, place(e, 'Axoum')), 'Axoum est plus au nord');
    ['Axoum', 'Lalibela', 'Gondar'].forEach(n => assert.ok(snapshotContains(b, place(e, n)), n + ' en 1450'));
    e.places.forEach(p => assert.ok(snapshotContains(c, p.c), p.n + ' en 1900'));
});

test('Empire britannique : 1763 et 1920', () => {
    const e = H.entityById('britannique');
    const a = H.snapshotOf(e, '1763'), b = H.snapshotOf(e, '1920');
    ['Calcutta', 'Ottawa'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 1763'));
    ['Londres', 'Le Cap', 'Sydney', 'Nairobi', 'Singapour'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' n\'est pas britannique en 1763'));
    e.places.forEach(p => assert.ok(snapshotContains(b, p.c), p.n + ' en 1920'));
    assert.ok(b.zones.length >= 12, 'beaucoup de territoires en 1920');
    assert.ok(H.legendNeeded(e, a), 'légende demandée en 1763');
    assert.ok(!H.legendNeeded(e, b), 'pas de légende de quinze zones de la même couleur');
});

test('Empire russe : de Pierre le Grand à 1895', () => {
    const e = H.entityById('russe');
    const a = H.snapshotOf(e, '1721'), b = H.snapshotOf(e, '1796'), c = H.snapshotOf(e, '1895');
    ['Saint-Pétersbourg', 'Moscou', 'Kiev', 'Irkoutsk'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 1721'));
    ['Varsovie', 'Tbilissi', 'Tachkent', 'Vladivostok'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' n\'est pas russe en 1721'));
    assert.ok(!snapshotContains(b, place(e, 'Varsovie')), 'Varsovie est prussienne en 1796');
    assert.equal(b.zones.length, 2, 'l\'Alaska est une zone à part');
    e.places.forEach(p => assert.ok(snapshotContains(c, p.c), p.n + ' en 1895'));
});

test('Empire napoléonien : 1804 et 1812', () => {
    const e = H.entityById('napoleon');
    const a = H.snapshotOf(e, '1804'), b = H.snapshotOf(e, '1812');
    ['Paris'].forEach(n => assert.ok(snapshotContains(a, place(e, n))));
    ['Rome', 'Hambourg', 'Amsterdam', 'Madrid', 'Varsovie', 'Milan'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' n\'est pas dans l\'empire en 1804'));
    ['Paris', 'Rome', 'Hambourg', 'Amsterdam', 'Madrid', 'Varsovie', 'Milan'].forEach(n => assert.ok(snapshotContains(b, place(e, n)), n + ' en 1812'));
    assert.ok(!snapshotContains(b, place(e, 'Vienne')), 'Vienne reste autrichienne');
    // l'empire direct et les satellites ont des couleurs différentes
    const colors = new Set(b.zones.map(z => z.color));
    assert.equal(colors.size, 2);
    assert.ok(H.legendNeeded(e, b));
});

test('Empire colonial français : 1750 et 1930', () => {
    const e = H.entityById('colonial-francais');
    const a = H.snapshotOf(e, '1750'), b = H.snapshotOf(e, '1930');
    ['Québec', 'Pondichéry'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 1750'));
    ['Alger', 'Dakar', 'Hanoï', 'Tananarive', 'Brazzaville'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' n\'est pas française en 1750'));
    ['Alger', 'Dakar', 'Hanoï', 'Tananarive', 'Brazzaville'].forEach(n => assert.ok(snapshotContains(b, place(e, n)), n + ' en 1930'));
    assert.ok(!snapshotContains(b, place(e, 'Québec')), 'le Canada est perdu depuis 1763');
});

// --- Le classement, la légende, le curseur --------------------------------------------------------------
test('classement : chaque entité dans une tranche d\'apogée, et chaque tranche a des entités', () => {
    const ids = H.CATEGORIES.map(c => c.id);
    assert.deepEqual(ids, ['avant-500', '500-1500', '1500-1800', 'depuis-1800']);
    const groups = {};
    H.ENTITIES.forEach(e => { const c = H.categoryOf(e); assert.ok(ids.includes(c), e.id); (groups[c] = groups[c] || []).push(e.id); });
    ids.forEach(id => assert.ok(groups[id] && groups[id].length >= 3, id + ' a au moins trois entités'));
    assert.deepEqual(groups['avant-500'], ['mesopotamie', 'egypte', 'maurya', 'han', 'rome', 'aksoum', 'gupta', 'perse', 'alexandre']);
    assert.deepEqual(groups['1500-1800'], ['songhai', 'ottoman', 'charles-quint', 'azteques', 'incas', 'kongo', 'qing']);
    assert.deepEqual(groups['depuis-1800'], ['ethiopie', 'britannique', 'russe', 'napoleon', 'austro-hongrois', 'colonial-francais']);
    assert.equal(H.categoryOf({ peak: 500 }), 'avant-500');
    assert.equal(H.categoryOf({ peak: 501 }), '500-1500');
    assert.equal(H.categoryOf({ peak: 1800 }), '1500-1800');
    assert.equal(H.categoryOf({ peak: 1801 }), 'depuis-1800');
    assert.equal(Object.values(groups).reduce((n, g) => n + g.length, 0), H.ENTITIES.length);
});

test('légende : seulement pour des zones qui se distinguent, ou sur demande', () => {
    const rome = H.entityById('rome'), byz = H.entityById('byzance');
    assert.equal(H.legendNeeded(rome, H.snapshotOf(rome, 'auguste')), false);
    assert.equal(H.legendNeeded(rome, H.snapshotOf(rome, 'partage')), true);
    // Byzance 565 : trois zones de même couleur, mais nommées : on demande la légende
    assert.equal(H.legendNeeded(byz, H.snapshotOf(byz, '565')), true);
    assert.equal(H.legendNeeded(byz, H.snapshotOf(byz, '1450')), true);
});

test('curseur : l\'échelle monte sans à-coups, de 3500 av. J.-C. à 2000', () => {
    assert.equal(H.positionToYear(0), -3500);
    assert.equal(H.positionToYear(H.SLIDER_MAX), 2000);
    let last = -Infinity;
    for (let p = 0; p <= H.SLIDER_MAX; p++) {
        const y = H.positionToYear(p);
        assert.notEqual(y, 0, 'pas d\'an 0 (position ' + p + ')');
        const astro = y < 0 ? y + 1 : y;
        assert.ok(astro >= last, 'monotone à la position ' + p);
        last = astro;
    }
    // aller-retour : une position retrouve la même position
    [0, 100, 150, 349, 350, 351, 500, 750, 900, 1000].forEach(p => assert.equal(H.yearToPosition(H.positionToYear(p)), p, 'position ' + p));
    // le XIXe siècle occupe une vraie place, pas un cran
    assert.ok(H.yearToPosition(1900) - H.yearToPosition(1800) > 30);
    assert.equal(H.yearToPosition(-9999), 0);
    assert.equal(H.yearToPosition(9999), H.SLIDER_MAX);
});

test('curseur : ce qui existe à une date, avec la carte la plus proche', () => {
    const at = year => H.activeAt(year).map(a => a.entity.id + '@' + a.snapshot.year);
    assert.deepEqual(at(117).filter(x => x.startsWith('rome') || x.startsWith('han')), ['han@100', 'rome@117']);
    assert.ok(!at(117).some(x => x.startsWith('maurya') || x.startsWith('gupta')), 'Maurya a disparu, les Gupta ne sont pas nés');
    assert.ok(at(-250).some(x => x.startsWith('maurya')) && at(-250).some(x => x.startsWith('han')) === false, 'les Han ne naissent qu\'en -206');
    assert.ok(at(1250).includes('mali@1235') && at(1250).includes('saint-empire@1250') && at(1250).includes('mongol@1227'));
    assert.ok(at(1920).includes('britannique@1920') && at(1920).includes('colonial-francais@1930'), 'la carte la plus proche, même postérieure');
    assert.ok(at(1920).includes('ottoman@1914'));
    assert.ok(!at(1920).some(x => x.startsWith('russe')), 'l\'Empire russe finit en 1917');
    // une année sans aucune entité : -10000 (avant tout) ou 1980 après les derniers empires ?
    assert.deepEqual(H.activeAt(-9000), []);
    // `since` : années écoulées depuis la carte (négatif : la carte est postérieure)
    const rome = H.activeAt(150).find(a => a.entity.id === 'rome');
    assert.equal(rome.snapshot.year, 117); assert.equal(rome.since, 33);
    const colonial = H.activeAt(1920).find(a => a.entity.id === 'colonial-francais');
    assert.equal(colonial.since, -10);
    // chaque entité est vue au moins une année : aucune n'est cachée par la règle de proximité
    H.ENTITIES.forEach(e => assert.ok(H.activeAt(e.peak).some(a => a.entity.id === e.id), e.id + ' à son apogée'));
});

test('Empire d\'Aksoum : le royaume commerçant, Ézana, le Yémen', () => {
    const e = H.entityById('aksoum');
    const a = H.snapshotOf(e, '200'), b = H.snapshotOf(e, '350'), c = H.snapshotOf(e, '530');
    ['Axoum', 'Adulis', 'Yéha'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' vers 200'));
    assert.ok(!snapshotContains(a, place(e, 'Méroé')), 'Méroé n\'est conquise que vers 350');
    ['Axoum', 'Adulis', 'Méroé'].forEach(n => assert.ok(snapshotContains(b, place(e, n)), n + ' vers 350'));
    assert.ok(!snapshotContains(b, place(e, 'Sanaa')));
    assert.equal(c.zones.length, 2);
    assert.ok(c.zones.some(z => zoneContains(z, place(e, 'Sanaa'))), 'Sanaa sous Kaleb');
    assert.ok(H.legendNeeded(e, c));
});

test('Empire songhaï : la boucle du Niger, puis l\'Aïr', () => {
    const e = H.entityById('songhai');
    const a = H.snapshotOf(e, '1480'), b = H.snapshotOf(e, '1520');
    ['Gao', 'Tombouctou', 'Djenné'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 1480'));
    ['Agadez', 'Walata'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' n\'est pas encore songhaï'));
    e.places.forEach(p => assert.ok(snapshotContains(b, p.c), p.n + ' en 1520'));
});

test('Empire des Qing : de Pékin au Xinjiang, puis la perte de Taïwan', () => {
    const e = H.entityById('qing');
    const a = H.snapshotOf(e, '1644'), b = H.snapshotOf(e, '1760'), c = H.snapshotOf(e, '1900');
    ['Pékin', 'Moukden', 'Canton', 'Nankin'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 1644'));
    ['Lhassa', 'Ourounqi', 'Kashgar', 'Oulan-Bator', 'Taipei'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' n\'est pas qing en 1644'));
    e.places.forEach(p => assert.ok(snapshotContains(b, p.c), p.n + ' en 1760'));
    ['Pékin', 'Lhassa', 'Ourounqi', 'Kashgar', 'Oulan-Bator', 'Canton'].forEach(n => assert.ok(snapshotContains(c, place(e, n)), n + ' en 1900'));
    assert.ok(!snapshotContains(c, place(e, 'Taipei')), 'Taïwan est japonaise depuis 1895');
    // la Mandchourie extérieure (au nord de l\'Amour) est perdue entre 1760 et 1900
    assert.ok(snapshotContains(b, [130.5, 54.0]) && !snapshotContains(c, [130.5, 54.0]));
});

test('Autriche-Hongrie : le Compromis, puis la Bosnie', () => {
    const e = H.entityById('austro-hongrois');
    const a = H.snapshotOf(e, '1867'), b = H.snapshotOf(e, '1914');
    ['Vienne', 'Budapest', 'Prague', 'Cracovie', 'Trieste', 'Zagreb', 'Lemberg'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 1867'));
    assert.ok(!snapshotContains(a, place(e, 'Sarajevo')), 'la Bosnie n\'est annexée qu\'en 1908');
    e.places.forEach(p => assert.ok(snapshotContains(b, p.c), p.n + ' en 1914'));
    ['Rome', 'Belgrade', 'Berlin'].forEach(() => {});
    assert.ok(!snapshotContains(b, [20.46, 44.82]), 'Belgrade est serbe');
    assert.ok(!snapshotContains(b, [12.5, 41.9]), 'Rome est italienne');
});

test('Empire de Charles Quint : 1519 et le partage de 1556', () => {
    const e = H.entityById('charles-quint');
    const a = H.snapshotOf(e, '1519'), b = H.snapshotOf(e, '1556');
    ['Gand', 'Bruxelles', 'Tolède', 'Séville', 'Vienne', 'Naples'].forEach(n => assert.ok(snapshotContains(a, place(e, n)), n + ' en 1519'));
    ['Mexico', 'Lima', 'Milan'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' n\'est pas encore espagnole en 1519'));
    e.places.forEach(p => assert.ok(snapshotContains(b, p.c), p.n + ' en 1556'));
    // en 1556 Vienne revient à Ferdinand, pas à Philippe II
    const ferdinand = b.zones.filter(z => z.name.startsWith('États autrichiens'));
    assert.equal(ferdinand.length, 1);
    assert.ok(zoneContains(ferdinand[0], place(e, 'Vienne')));
    assert.ok(!b.zones.filter(z => !z.name.startsWith('États autrichiens')).some(z => zoneContains(z, place(e, 'Vienne'))));
    assert.ok(H.legendNeeded(e, a) && H.legendNeeded(e, b));
});

test('Royaume de Kongo : de Mbanza Kongo à Afonso Ier', () => {
    const e = H.entityById('kongo');
    const a = H.snapshotOf(e, '1400'), b = H.snapshotOf(e, '1520'), c = H.snapshotOf(e, '1680');
    assert.ok(snapshotContains(a, place(e, 'Mbanza Kongo')));
    ['Soyo', 'Kinshasa', 'Mbwila'].forEach(n => assert.ok(!snapshotContains(a, place(e, n)), n + ' est hors du premier royaume'));
    ['Mbanza Kongo', 'Soyo', 'Kinshasa', 'Mbwila'].forEach(n => assert.ok(snapshotContains(b, place(e, n)), n + ' en 1520'));
    assert.ok(!snapshotContains(b, place(e, 'Luanda')), 'Luanda est dans le Ndongo, pas au Kongo');
    assert.ok(snapshotContains(c, place(e, 'Mbanza Kongo')));
    const area = s => { const box = C.prepare(H.snapshotGeometry(s)).box; return (box[2] - box[0]) * (box[3] - box[1]); };
    assert.ok(area(c) < area(b), 'le royaume rétrécit après Mbwila');
});
