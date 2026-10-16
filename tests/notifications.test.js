// Rappels « n événements à réviser » : js/notifications.js, avec un faux plugin Capacitor.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRS = require('../js/srs.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'notifications.js'), 'utf8');

function load({ entries, enabled = true, supported = true }) {
    const calls = { scheduled: [], cancelled: [] };
    const sandbox = {
        window: supported ? { Capacitor: { isNativePlatform: () => true, Plugins: { LocalNotifications: {
            schedule: (o) => calls.scheduled.push(...o.notifications),
            cancel: (o) => calls.cancelled.push(...o.notifications.map((n) => n.id)),
            checkPermissions: async () => ({ display: 'granted' }),
            requestPermissions: async () => ({ display: 'granted' })
        } } } } : {},
        SRS,
        getSrsEntries: () => entries,
        appSettings: { notifications: enabled },
        t: (key, params) => (params ? `${key}:${params.count}` : key),
        Date, Math, Promise, console
    };
    vm.createContext(sandbox);
    vm.runInContext(src + '\nthis.N = HistoriAxeNotifications;', sandbox);
    return { N: sandbox.N, calls };
}

const day = 24 * 3600 * 1000;
const many = Array.from({ length: 8 }, () => ({ box: 1, lastReviewed: Date.now() - 20 * day }));

test('scheduleReviewReminders programme au plus trois rappels, avec le compte dans le texte', () => {
    const { N, calls } = load({ entries: many });
    N.scheduleReviewReminders();
    assert.ok(calls.scheduled.length >= 2 && calls.scheduled.length <= 3);
    for (const n of calls.scheduled) {
        assert.ok(n.id >= 1010 && n.id <= 1012, 'ids réservés aux rappels de révision');
        assert.equal(n.title, 'notifications.review_title');
        assert.equal(n.body, 'notifications.review_body:8');
        assert.ok(n.schedule.at.getTime() > Date.now());
    }
    // Les anciens rappels sont annulés avant d'en reprogrammer (pas de doublons).
    assert.deepEqual(calls.cancelled.sort(), [1010, 1011, 1012]);
});

test('rien à programmer sous le seuil, ni réglage désactivé, ni hors app native', () => {
    for (const opts of [{ entries: many.slice(0, 3) }, { entries: many, enabled: false }, { entries: many, supported: false }]) {
        const { N, calls } = load(opts);
        N.scheduleReviewReminders();
        assert.equal(calls.scheduled.length, 0, JSON.stringify({ n: opts.entries.length, enabled: opts.enabled, supported: opts.supported }));
    }
});

test('désactiver les notifications annule aussi les rappels de révision', () => {
    const { N, calls } = load({ entries: many });
    N.cancelAll();
    for (const id of [1010, 1011, 1012]) assert.ok(calls.cancelled.includes(id), `id ${id}`);
});

test('enableAndSchedule et refreshAll programment les rappels de révision', async () => {
    const a = load({ entries: many });
    await a.N.enableAndSchedule();
    assert.ok(a.calls.scheduled.some((n) => n.id === 1010));
    const b = load({ entries: many });
    b.N.refreshAll();
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(b.calls.scheduled.some((n) => n.id === 1010));
});
