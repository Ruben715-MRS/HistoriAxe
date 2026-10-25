// Portraits hors ligne et langue du téléphone : les constantes partagées, la liste des portraits, la
// proposition du pack de langue, et l'exclusion des portraits du paquet natif.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const S = require('../js/storage.js');

const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('js/portraits.js et sw.js partagent le même nom de cache des portraits', () => {
    const page = read('js/portraits.js').match(/const PORTRAIT_CACHE_NAME = '([^']+)'/);
    const sw = read('sw.js').match(/const PORTRAIT_CACHE = '([^']+)'/);
    assert.ok(page && sw, 'constantes introuvables');
    assert.equal(page[1], sw[1], 'sous deux noms, le service worker purge les portraits téléchargés à chaque mise à jour');
});

test('assets/portraits.json liste exactement les portraits de assets/portraits/ (relancer scripts/build_portraits_manifest.js sinon)', () => {
    const onDisk = fs.readdirSync(path.join(root, 'assets', 'portraits'))
        .filter((f) => f.endsWith('.jpg'))
        .sort()
        .map((f) => 'assets/portraits/' + f);
    const manifest = JSON.parse(read('assets/portraits.json'));
    assert.deepEqual(manifest, onDisk);
});

test('le paquet natif n\'embarque pas assets/portraits/, le build web oui', () => {
    const build = read('scripts/build.js');
    assert.match(build, /nativeOnlySkip = new Set\(isNativeBuild \? \[path\.join\(projectDir, 'assets', 'portraits'\)\] : \[\]\)/);
    assert.match(build, /nativeOnlySkip\.has\(src\)/);
});

test('les portraits sont servis avec CORS (l\'app native les lit depuis le site)', () => {
    const vercel = JSON.parse(read('vercel.json'));
    const rule = (vercel.headers || []).find(h => h.source === '/assets/portraits/(.*)');
    assert.ok(rule, 'règle d\'en-têtes absente');
    assert.ok(rule.headers.some(h => h.key === 'Access-Control-Allow-Origin' && h.value === '*'));
});

test('proposition du pack : langue du téléphone, sinon anglais ; une seule fois ; jamais pour le français', () => {
    const codes = ['fr', 'en', 'es', 'de', 'it', 'ja'];
    assert.equal(S.suggestedPackLanguage('ja-JP', codes, ['fr'], null), 'ja', 'langue présente');
    assert.equal(S.suggestedPackLanguage('de', codes, ['fr'], null), 'de');
    assert.equal(S.suggestedPackLanguage('pt-BR', codes, ['fr'], null), 'en', 'langue absente : anglais');
    assert.equal(S.suggestedPackLanguage('', codes, ['fr'], null), 'en', 'téléphone sans langue : anglais');
    assert.equal(S.suggestedPackLanguage('fr-CA', codes, ['fr'], null), null, 'français : rien à proposer');
    assert.equal(S.suggestedPackLanguage('en-US', codes, ['fr', 'en'], null), null, 'pack déjà installé');
    assert.equal(S.suggestedPackLanguage('de-DE', codes, ['fr'], 'de'), null, 'déjà proposé à cet appareil');
    assert.equal(S.suggestedPackLanguage('ja-JP', codes, ['fr'], 'de'), 'ja', 'une autre langue déjà proposée ne bloque pas');
});

test('chaque langue de l\'interface a les textes des nouveaux réglages et de la proposition', () => {
    const keys = ['lang_suggest_ask', 'lang_suggest_yes', 'lang_suggest_no', 'portraits_offline_label', 'portraits_offline_hint',
        'portraits_offline_need_internet', 'portraits_status', 'portraits_download_btn', 'portraits_delete_btn',
        'portraits_download_confirm', 'portraits_delete_confirm', 'portraits_progress', 'portraits_failed',
        'portraits_done', 'portraits_deleted'];
    for (const lang of ['fr', 'en', 'es', 'de', 'it', 'ja']) {
        const ui = JSON.parse(read(`ui/${lang}.json`));
        for (const k of keys) assert.ok(ui.settings[k], `${lang} : settings.${k} manquant`);
    }
});
