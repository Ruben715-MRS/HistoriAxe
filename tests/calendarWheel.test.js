// La roue des fêtes (js/calendarWheel.js) : intégrité des huit calendriers, tirage, étoiles. Pur, sans navigateur.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const W = require('../js/calendarWheel.js');

const root = path.resolve(__dirname, '..');
const uiFr = JSON.parse(fs.readFileSync(path.join(root, 'ui', 'fr.json'), 'utf8'));

test('huit calendriers : chrétien, juif, musulman et les civils de cinq pays', () => {
    assert.deepEqual(W.CALENDARS.map((c) => c.id),
        ['chretien', 'juif', 'musulman', 'france', 'royaumeuni', 'etatsunis', 'allemagne', 'espagne']);
});

test('chaque calendrier a douze mois distincts, un titre et une introduction', () => {
    W.CALENDARS.forEach((c) => {
        assert.equal(c.months.length, 12, c.id);
        assert.equal(new Set(c.months).size, 12, c.id);
        assert.ok(c.title && c.short && c.icon && c.intro, c.id);
    });
});

test('les fêtes sont complètes, leurs identifiants et leurs emojis uniques dans le calendrier', () => {
    W.CALENDARS.forEach((c) => {
        assert.ok(c.events.length >= 10, `${c.id} : au moins dix fêtes`);
        assert.equal(new Set(c.events.map((e) => e.id)).size, c.events.length, `${c.id} : identifiants`);
        // L'emoji est tout ce qu'on voit d'une fête posée dans sa part : deux fêtes identiques s'y confondraient.
        assert.equal(new Set(c.events.map((e) => e.icon)).size, c.events.length, `${c.id} : emojis`);
        c.events.forEach((e) => {
            assert.ok(e.name && e.icon && e.when && e.explain, `${c.id}/${e.id}`);
            assert.ok(e.months.length >= 1 && e.months.length <= 2, `${c.id}/${e.id} : un ou deux mois`);
            e.months.forEach((m) => assert.ok(Number.isInteger(m) && m >= 1 && m <= 12, `${c.id}/${e.id} : mois ${m}`));
            if (e.months.length === 2) {
                assert.equal(e.months[1], e.months[0] + 1, `${c.id}/${e.id} : deux mois acceptés = deux mois qui se suivent`);
                assert.match(e.when, /mobile|cheval/, `${c.id}/${e.id} : une date mobile ou à cheval le dit`);
            }
        });
    });
});

test('une fête mobile n\'est jamais la seule d\'un mois qu\'on ne puisse pas deviner : au plus la moitié sont mobiles', () => {
    W.CALENDARS.forEach((c) => {
        const mobile = c.events.filter((e) => e.months.length > 1).length;
        assert.ok(mobile <= c.events.length / 2, `${c.id} : ${mobile} fêtes mobiles sur ${c.events.length}`);
    });
});

test('les fêtes d\'un mois tiennent dans une part (quatre au plus, deux pastilles ne se chevauchent pas)', () => {
    W.CALENDARS.forEach((c) => {
        const count = new Array(13).fill(0);
        c.events.forEach((e) => { count[e.months[0]] += 1; });
        assert.ok(Math.max.apply(null, count) <= 4, `${c.id} : ${count}`);
    });
});

test('les dates sûres : Noël en décembre, Pâques en mars ou avril, Hanoucca en Kislev, l\'Aïd el-Fitr en Chawwal', () => {
    const ev = (cal, id) => W.findEvent(W.find(cal), id);
    assert.ok(W.accepts(ev('chretien', 'noel'), 12));
    assert.ok(!W.accepts(ev('chretien', 'noel'), 1));
    assert.ok(W.accepts(ev('chretien', 'paques'), 3) && W.accepts(ev('chretien', 'paques'), 4));
    assert.ok(!W.accepts(ev('chretien', 'paques'), 5));
    assert.equal(W.find('juif').months[ev('juif', 'hanoucca').months[0] - 1], 'Kislev');
    assert.equal(W.find('juif').months[ev('juif', 'pessah').months[0] - 1], 'Nissan');
    assert.equal(W.find('musulman').months[ev('musulman', 'aidfitr').months[0] - 1], 'Chawwal');
    assert.equal(W.find('musulman').months[ev('musulman', 'ramadan').months[0] - 1], 'Ramadan');
    assert.ok(W.accepts(ev('france', 'fetenationale'), 7));
    assert.ok(W.accepts(ev('etatsunis', 'thanksgiving'), 11));
    assert.ok(W.accepts(ev('allemagne', 'einheit'), 10));
});

test('shuffle et deal : mêmes éléments, ordre mêlé, jamais celui du calendrier, liste d\'origine intacte', () => {
    const list = [1, 2, 3, 4, 5];
    const copy = list.slice();
    assert.deepEqual(W.shuffle(list, () => 0).sort(), copy);
    assert.deepEqual(list, copy);
    W.CALENDARS.forEach((c) => {
        const ids = c.events.map((e) => e.id);
        // Un « hasard » qui rend toujours l'ordre du calendrier (il choisit toujours le dernier cran).
        const dealt = W.deal(c, () => 0.999999);
        assert.deepEqual(dealt.slice().sort(), ids.slice().sort(), c.id);
        assert.notDeepEqual(dealt, ids, c.id);
    });
});

test('étoiles : 3 jusqu\'à une erreur, 2 jusqu\'à quatre, 1 ensuite', () => {
    assert.equal(W.starsFor(0), 3);
    assert.equal(W.starsFor(1), 3);
    assert.equal(W.starsFor(2), 2);
    assert.equal(W.starsFor(4), 2);
    assert.equal(W.starsFor(5), 1);
    assert.equal(W.starsFor(99), 1);
});

test('la progression garde le meilleur résultat et ignore ce qui est abîmé', () => {
    let p = W.recordResult(null, 'juif', 6);
    assert.deepEqual(p.juif, { stars: 1, errors: 6 });
    p = W.recordResult(p, 'juif', 3);
    assert.deepEqual(p.juif, { stars: 2, errors: 3 });
    p = W.recordResult(p, 'juif', 8);
    assert.deepEqual(p.juif, { stars: 2, errors: 3 }, 'un moins bon résultat ne remplace pas le meilleur');
    p = W.recordResult(p, 'juif', 2);
    assert.deepEqual(p.juif, { stars: 2, errors: 2 }, 'à égalité d\'étoiles, moins d\'erreurs');
    assert.deepEqual(W.normalizeProgress('n\'importe quoi'), {});
    assert.deepEqual(W.normalizeProgress({ inconnu: { stars: 3, errors: 0 }, juif: { stars: 9, errors: -2 } }), { juif: { stars: 3, errors: 0 } });
});

test('l\'interface de la roue a tous ses textes dans ui/fr.json', () => {
    ['entry', 'title', 'tabs_aria', 'tab_stars', 'aria', 'slice_aria', 'progress', 'pick', 'place', 'pick_first', 'wrong',
        'wrong_hint', 'tray_label', 'spin_left', 'spin_right', 'reset', 'hint', 'done', 'next', 'replay']
        .forEach((k) => assert.ok(uiFr.wheel && uiFr.wheel[k], 'wheel.' + k));
});

test('la roue est branchée : script dans index.html et dans le service worker, bouton dans la fiche du niveau 4', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
    ['js/calendarWheel.js', 'js/app/wheel.js'].forEach((f) => {
        assert.ok(html.includes(`<script src="${f}">`), f + ' dans index.html');
        assert.ok(sw.includes(`'./${f}'`), f + ' dans sw.js');
    });
    assert.ok(html.includes('id="screen-wheel"'));
    assert.ok(html.includes('id="path-sheet-wheel"'));
});
