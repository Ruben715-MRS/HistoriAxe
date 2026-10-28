// Rappels « n événements à réviser » : js/notifications.js, avec un faux plugin Capacitor.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SRS = require('../js/srs.js');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'notifications.js'), 'utf8');

function load({ entries = [], enabled = true, supported = true, settings = {}, streak = 0, playedToday = false, pending = [], permission = 'granted' }) {
    const calls = { scheduled: [], cancelled: [], confirms: [] };
    const sandbox = {
        window: supported ? { Capacitor: { isNativePlatform: () => true, Plugins: { LocalNotifications: {
            schedule: (o) => calls.scheduled.push(...o.notifications),
            cancel: (o) => calls.cancelled.push(...o.notifications.map((n) => n.id)),
            checkPermissions: async () => ({ display: permission }),
            requestPermissions: async () => ({ display: 'granted' }),
            getPending: async () => ({ notifications: pending.map((id) => ({ id })) })
        } } } } : {},
        SRS,
        getSrsEntries: () => entries,
        appSettings: Object.assign({ notifications: enabled }, settings),
        getStreakCount: () => streak,
        streakLoad: () => ({ lastPlayedDate: playedToday ? '2026-01-01' : null }),
        getTodayStringUTC: () => '2026-01-01',
        t: (key, params) => (params ? `${key}:${params.count}` : key),
        showConfirm: (message, onOk, options) => calls.confirms.push({ message, onOk, options }),
        Date, Math, Promise, console, setTimeout
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

test('askAfterFirstGame explique les rappels une seule fois, puis ne redemande plus', async () => {
    const { N, calls } = load({ entries: many, permission: 'prompt' });
    N.askAfterFirstGame();
    await new Promise((r) => setTimeout(r, 1600));
    assert.equal(calls.confirms.length, 1);
    assert.equal(calls.confirms[0].message, 'notifications.ask_body');
    calls.confirms[0].onOk();
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(calls.scheduled.some((n) => n.id === 1010));
    N.askAfterFirstGame();
    await new Promise((r) => setTimeout(r, 1600));
    assert.equal(calls.confirms.length, 1);
});

test('askAfterFirstGame ne montre rien si les notifications sont désactivées', async () => {
    const { N, calls } = load({ entries: many, enabled: false, permission: 'prompt' });
    N.askAfterFirstGame();
    await new Promise((r) => setTimeout(r, 1600));
    assert.equal(calls.confirms.length, 0);
});

const ids = (calls) => calls.scheduled.map((n) => n.id).sort((a, b) => a - b);

test('le récap hebdomadaire part le dimanche à 19 h (Capacitor : 1 = dimanche)', () => {
    const { N, calls } = load({});
    N.scheduleAll();
    const recap = calls.scheduled.find((n) => n.id === 1003);
    assert.deepEqual(JSON.parse(JSON.stringify(recap.schedule.on)), { weekday: 1, hour: 19, minute: 0 });
});

test('chaque type se décoche séparément : il n’est ni programmé ni conservé', () => {
    const off = { notifStreak: false, notifDaily: false, notifRecap: false, notifReview: false, notifMilestone: false, notifComeback: false };
    const { N, calls } = load({ entries: many, settings: off, streak: 6, playedToday: true });
    N.scheduleAll();
    assert.deepEqual(calls.scheduled, []);
    for (const id of [1001, 1002, 1003, 1004, 1010, 1020, 1021]) assert.ok(calls.cancelled.includes(id), `id ${id} annulé`);
    const only = load({ entries: many, settings: { notifDaily: false, notifRecap: false, notifReview: false, notifMilestone: false, notifComeback: false } });
    only.N.scheduleAll();
    // 1001 (série, 20 h) est ignoré si l'heure est déjà passée : seul cet id peut subsister.
    assert.ok(ids(only.calls).every((id) => id === 1001), ids(only.calls).join());
});

test('palier de série : la veille seulement, si on a déjà joué aujourd’hui', () => {
    const a = load({ streak: 6, playedToday: true });
    a.N.scheduleAll();
    const m = a.calls.scheduled.find((n) => n.id === 1004);
    assert.ok(m.title.startsWith('notifications.milestone_title'));
    assert.ok(m.schedule.at.getTime() > Date.now());
    const noPlay = load({ streak: 6, playedToday: false });
    noPlay.N.scheduleAll();
    assert.ok(!noPlay.calls.scheduled.some((n) => n.id === 1004));
    const far = load({ streak: 4, playedToday: true });
    far.N.scheduleAll();
    assert.ok(!far.calls.scheduled.some((n) => n.id === 1004));
});

test('retour après inactivité : exactement deux rappels, à J+3 et J+7', () => {
    const { N, calls } = load({});
    N.scheduleAll();
    const back = calls.scheduled.filter((n) => n.id === 1020 || n.id === 1021);
    assert.equal(back.length, 2);
    const days = back.map((n) => Math.round((n.schedule.at.getTime() - Date.now()) / 86400000));
    assert.deepEqual(days, [3, 7]);
    assert.ok(back[0].title.startsWith('notifications.comeback3_title'));
    assert.ok(back[1].title.startsWith('notifications.comeback7_title'));
});

test('tout couper annule aussi palier, retour et rappels de duel en attente', async () => {
    const { N, calls } = load({ pending: [2050, 5, 101999, 150000] });
    N.cancelAll();
    await new Promise((r) => setTimeout(r, 10));
    for (const id of [1004, 1020, 1021, 2050, 101999]) assert.ok(calls.cancelled.includes(id), `id ${id}`);
    assert.ok(!calls.cancelled.includes(5) && !calls.cancelled.includes(150000));
});

test('un duel décoché ne programme rien, et annule ceux en attente', async () => {
    const { N, calls } = load({ settings: { notifDuel: false }, pending: [2100] });
    N.scheduleDuelNudge('abc');
    N.scheduleAll();
    await new Promise((r) => setTimeout(r, 10));
    assert.ok(!calls.scheduled.some((n) => n.id >= 2000));
    assert.ok(calls.cancelled.includes(2100));
});
