// Les cartes bibliques (js/biblicalMapsCore.js) : des positions dessinées à la main, donc contrôlées pour ce qu'on peut vérifier.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/biblicalMapsCore.js');
const C = require('../js/countriesCore.js');

const root = path.join(__dirname, '..');
const sea = C.prepare(JSON.parse(fs.readFileSync(path.join(root, 'assets/geo/sea.json'), 'utf8')));
const get = id => { const m = B.mapById(id); return { map: m, places: B.placesOf(m) }; };
const named = (places, id) => places.find(p => p.id === id);

test('quatre cartes, aux identifiants uniques et aux champs complets', () => {
    assert.deepEqual(B.MAPS.map(m => m.id), ['abraham', 'guerre', 'jacob', 'desert', 'ebal', 'tribus']);
    B.MAPS.forEach(m => {
        ['name', 'icon', 'ref', 'summary'].forEach(k => assert.ok(m[k] && String(m[k]).length >= 1, m.id + ' ' + k));
        assert.ok(m.summary.length > 120, m.id + ' résumé');
        assert.ok(m.views.length >= 2, m.id + ' au moins deux vues');
        assert.equal(new Set(m.views.map(v => v.id)).size, m.views.length, m.id + ' vues uniques');
        m.views.forEach(v => {
            assert.ok(v.label, m.id + '/' + v.id + ' étiquette');
            const [[w, s], [e, n]] = v.bounds;
            assert.ok(w < e && s < n, m.id + '/' + v.id + ' : cadre à l\'endroit');
        });
        const ids = m.places.map(p => p.id);
        assert.equal(new Set(ids).size, ids.length, m.id + ' : lieux aux identifiants uniques');
    });
});

test('chaque lieu a un nom, une position valide et, hors étiquettes, une note avec sa référence', () => {
    B.MAPS.forEach(m => {
        B.placesOf(m).forEach(p => {
            const where = m.id + '/' + p.id;
            assert.ok(p.n, where + ' nom');
            assert.ok(Array.isArray(p.c) && p.c.length === 2 && p.c.every(Number.isFinite), where + ' position');
            assert.ok(p.c[0] > 25 && p.c[0] < 50 && p.c[1] > 25 && p.c[1] < 42, where + ' dans le Levant');
            assert.ok(['city', 'region', 'water', 'mountain', 'altar', 'war'].includes(p.kind), where + ' genre');
            if (p.views) p.views.forEach(v => assert.ok(m.views.some(view => view.id === v), where + ' vue inconnue ' + v));
            if (p.kind === 'city' || p.kind === 'mountain' || p.kind === 'altar' || p.kind === 'war') {
                assert.ok(p.note && p.note.length > 25, where + ' note');
                assert.match(p.ref || '', /\S/, where + ' référence');
            }
        });
    });
});

test('chaque lieu se voit dans au moins une vue, sauf les noms de mers laissés hors cadre', () => {
    B.MAPS.forEach(m => {
        B.placesOf(m).forEach(p => {
            if (p.kind === 'water') return;
            const seen = m.views.some(v => B.visibleIn(p, v.id, p.variant) && B.inBounds(p.c, v.bounds));
            assert.ok(seen, m.id + '/' + p.id + ' n\'est dans aucune de ses vues');
        });
    });
});

test('les villes et les montagnes sont sur la terre : pas dans le masque de mer', () => {
    B.MAPS.forEach(m => {
        B.placesOf(m).forEach(p => {
            if (!['city', 'mountain', 'altar', 'war'].includes(p.kind)) return;
            assert.ok(!C.contains(sea, p.c[0], p.c[1]), m.id + '/' + p.id + ' tombe en mer : ' + p.c);
        });
    });
});

test('les lieux communs gardent le même nom et la même position sur toutes les cartes', () => {
    ['hebron', 'chekhem', 'beitel', 'jerusalem'].forEach(id => {
        const positions = B.MAPS.map(m => named(B.placesOf(m), id)).filter(Boolean).map(p => p.c.join(','));
        assert.ok(positions.length >= 2, id + ' est sur plusieurs cartes');
        assert.equal(new Set(positions).size, 1, id + ' : une seule position');
    });
});

test('Abraham : quatre autels, aux quatre lieux de l\'ouvrage', () => {
    const { places } = get('abraham');
    const altars = places.filter(p => p.altar || p.kind === 'altar').map(p => p.id).sort();
    assert.deepEqual(altars, ['autel-beitel', 'chekhem', 'hebron', 'jerusalem']);
});

test('Jacob : deux autels, à Chékhem et à Beit-El', () => {
    const { places } = get('jacob');
    assert.deepEqual(places.filter(p => p.altar).map(p => p.id).sort(), ['beitel', 'chekhem']);
});

test('la guerre des rois : huit conquêtes numérotées, deux versions de la poursuite', () => {
    const { map, places } = get('guerre');
    const conquests = map.routes.filter(r => /^q\d$/.test(r.id));
    assert.deepEqual(conquests.map(r => r.num), ['1', '2', '3', '4', '5', '6', '7', '8']);
    assert.deepEqual(map.variants.options.map(o => o.id), ['v1', 'v2']);
    assert.ok(map.routes.some(r => r.variant === 'v1') && map.routes.some(r => r.variant === 'v2'));
    assert.ok(named(places, 'dan').variant === 'v1' && named(places, 'dan2').variant === 'v2');
    assert.equal(B.visibleIn(named(places, 'dan'), 'levant', 'v2'), false);
    assert.equal(B.visibleIn(named(places, 'dan2'), 'levant', 'v2'), true);
    const kings = map.sections.slice(0, 2).map(s => s.items.length);
    assert.deepEqual(kings, [4, 5]);
    // les huit conquêtes s'enchaînent : chaque départ est l'arrivée de la précédente
    for (let i = 1; i < conquests.length; i++) assert.deepEqual(conquests[i].from, conquests[i - 1].to, 'conquête ' + (i + 1));
});

test('les quarante-deux étapes : numérotées de 1 à 42, dans l\'ordre de Nombres 33', () => {
    const { map, places } = get('desert');
    const stops = places.filter(p => p.num).sort((a, b) => parseInt(a.num, 10) - parseInt(b.num, 10));
    // Kadèch compte pour 15 et 33, et les dix-sept stations errantes pour 16 à 32 : 25 repères sur la carte
    assert.equal(stops.length, 25);
    assert.deepEqual(stops.slice(0, 15).map(p => p.id), ['ramses', 'souccot', 'etam', 'pihahirot', 'mara', 'elim', 'merjoncs', 'sin', 'dofka', 'alouch', 'refidim', 'sinai', 'kivrot', 'hatserot', 'kadesh']);
    assert.equal(named(places, 'errance').num, '16-32');
    assert.deepEqual(stops.slice(-9).map(p => p.id).sort(), ['almon', 'avarim', 'divon', 'moab-plaines', 'ovot', 'pounone', 'tsalmona', 'yiei', 'mont-hor'].sort());
    // 14 + 20 + 8 étapes
    assert.deepEqual(map.sections.map(s => s.items.length), [14, 20, 8]);
    assert.equal(map.sections.reduce((n, s) => n + s.items.length, 0), 42);
    assert.deepEqual(map.sections[1].items.slice(0, 3).map(i => i.t), ['15. Kadèch Barnéa / Ritma', '16. Rimon-Parets', '17. Livna']);
});

test('les quarante années : les repères de la chronologie, en années hébraïques', () => {
    const { timeline } = B.mapById('desert');
    assert.deepEqual(timeline.rows.map(r => r.year), [2448, 2449, 2487, 2488]);
    assert.equal(timeline.rows[0].events[0].join(' — '), "Nissan — Sortie d'Égypte");
    assert.ok(timeline.rows[1].events.some(e => e[1].startsWith('Retour des explorateurs')));
    assert.ok(timeline.rows[3].events.some(e => e[1].startsWith('Entrée')));
});

test('les arcs et les lignes lissées : bornés, du départ à l\'arrivée, avec une flèche orientée', () => {
    const arc = B.curve([0, 0], [10, 0], 0.2);
    assert.deepEqual(arc[0], [0, 0]);
    assert.deepEqual(arc[arc.length - 1], [10, 0]);
    assert.ok(arc.every(p => p[1] >= -0.0001), 'l\'arc se courbe d\'un seul côté');
    const line = B.smooth([[0, 0], [1, 1], [2, 0]]);
    assert.deepEqual(line[0], [0, 0]);
    assert.deepEqual(line[line.length - 1], [2, 0]);
    assert.ok(line.length > 3);
    // la flèche vers l'est pointe à 90°, vers le nord à 0°
    assert.ok(Math.abs(B.endBearing(B.curve([0, 0], [10, 0], 0)) - 90) < 1);
    assert.ok(Math.abs(B.endBearing(B.curve([0, 0], [0, 10], 0))) < 1 || Math.abs(B.endBearing(B.curve([0, 0], [0, 10], 0)) - 360) < 1);
    B.MAPS.forEach(m => (m.routes || []).forEach(r => {
        const p = B.routePath(r);
        assert.ok(p.length >= 3, m.id + '/' + r.id);
        assert.ok(p.every(pt => pt.every(Number.isFinite)), m.id + '/' + r.id + ' points valides');
    }));
});

test('Guerizim et Ebal : six tribus sur chaque montagne, et les cohanim et Lévites entre les deux', () => {
    const { map, places } = get('ebal');
    assert.deepEqual(map.sections.map(s => s.items.length), [6, 6, 2]);
    const all = map.sections.slice(0, 2).flatMap(s => s.items.map(i => i.t.replace(' *', '')));
    assert.equal(new Set(all).size, 12, 'douze tribus, chacune une seule fois');
    // Chékhem est entre les deux montagnes : Ebal au nord, Guerizim au sud
    const [ebal, guerizim, chekhem] = ['ebal', 'guerizim', 'chekhem'].map(id => named(places, id).c);
    assert.ok(ebal[1] > chekhem[1] && chekhem[1] > guerizim[1]);
});

test('le partage par tribu : douze zones (Siméon fondu dans Juda, Manassé en deux), des anneaux simples, une étiquette dans chaque zone', () => {
    const H = require('../js/historyMapsCore.js');
    const { map, places } = get('tribus');
    const main = map.zones.filter(z => !z.variant);
    assert.equal(main.length, 12, 'Juda et Siméon sont une seule couleur ; Manassé est en deux zones');
    assert.equal(new Set(map.zones.map(z => z.id)).size, map.zones.length);
    map.zones.forEach(z => {
        assert.match(z.color, /^#[0-9a-f]{6}$/i, z.id + ' couleur');
        assert.equal(H.selfIntersection(z.ring), null, z.id + ' se recoupe');
        assert.ok(z.ring.every(p => B.inBounds(p, [[33.3, 30.4], [36.8, 34.1]])), z.id + ' hors de la carte');
        const prepared = C.prepare({ type: 'Polygon', coordinates: [B.closeRing(z.ring)] });
        const label = named(places, z.id);
        assert.ok(label, z.id + ' sans étiquette');
        assert.ok(label.offshore || C.contains(prepared, label.c[0], label.c[1]), z.id + ' : l\'étiquette est hors de sa zone');
        assert.ok(label.he && label.note && label.ref, z.id + ' fiche');
    });
    assert.deepEqual(map.variants.options.map(o => o.id), ['partage', 'dan']);
    assert.deepEqual(map.zones.filter(z => z.variant).map(z => z.id), ['dan-nord']);
    assert.ok(map.zones.filter(z => z.dan).length === 2);
});

test('les eaux : des anneaux fermés et des fleuves de deux points au moins', () => {
    B.HYDRO.lakes.forEach(l => { assert.ok(l.ring.length >= 6, l.id); assert.ok(l.ring.every(p => p.length === 2 && p.every(Number.isFinite)), l.id + ' points valides'); });
    B.HYDRO.rivers.forEach(r => assert.ok(r.pts.length >= 3, r.id));
});
