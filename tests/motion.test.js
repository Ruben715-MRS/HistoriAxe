// Le mouvement (voir la section « Mouvement » du README) tient à des branchements qu'aucune erreur ne trahit quand
// ils se défont : un identifiant d'écran faux, une animation qui n'est plus coupée par « réduire les animations ».
// Ces tests gardent ces deux fils.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const html = read('index.html');
const css = read('css/style.css');

function jsFiles(dir) {
    return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((f) => {
        const rel = `${dir}/${f.name}`;
        if (f.isDirectory()) return jsFiles(rel);
        return f.name.endsWith('.js') ? [rel] : [];
    });
}

test('chaque animateQuestionIn vise un écran qui existe, avec un corps de question', () => {
    const calls = [];
    for (const f of jsFiles('js')) {
        for (const m of read(f).matchAll(/animateQuestionIn\('([^']+)'\)/g)) calls.push({ f, screen: m[1] });
    }
    assert.ok(calls.length >= 10, 'les modes ont perdu leur appel à animateQuestionIn');
    for (const { f, screen } of calls) {
        const at = html.indexOf(`<div id="${screen}"`);
        assert.ok(at >= 0, `${f} : écran ${screen} introuvable dans index.html`);
        const next = html.indexOf('\n    <div id="', at + 10);
        const body = html.slice(at, next < 0 ? undefined : next);
        assert.match(body, /class="(?:quiz|periodes|avap|fil)-body"/, `${f} : ${screen} n'a pas de corps que animateQuestionIn sache animer`);
    }
});

test('les conteneurs .fx-cascade du HTML existent une seule fois', () => {
    const ids = [...html.matchAll(/<[a-z]+[^>]*class="[^"]*\bfx-cascade\b[^"]*"[^>]*\bid="([^"]+)"|<[a-z]+[^>]*\bid="([^"]+)"[^>]*class="[^"]*\bfx-cascade\b/g)]
        .map((m) => m[1] || m[2]);
    assert.ok(ids.length > 0);
    assert.equal(new Set(ids).size, ids.length);
});

test('« réduire les animations » coupe chaque animation de la section MOUVEMENT', () => {
    const start = css.indexOf('MOUVEMENT — apparitions et transitions partagées');
    assert.ok(start > 0, 'section MOUVEMENT introuvable');
    const section = css.slice(start);
    const reduce = section.slice(section.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    // Les sélecteurs qui posent une `animation:` dans la section (hors keyframes et hors le bloc de coupure lui-même).
    const outside = section.slice(0, section.lastIndexOf('@media (prefers-reduced-motion: reduce)'))
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
    const selectors = [];
    for (const m of outside.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (/\banimation\s*:/.test(m[2])) selectors.push(...m[1].split(',').map((s) => s.trim().replace(/\s+/g, ' ')).filter(Boolean));
    }
    assert.ok(selectors.length >= 8);
    for (const sel of selectors) {
        const flat = reduce.replace(/\s+/g, ' ');
        assert.ok(flat.includes(sel), `« ${sel} » n'est pas coupé par prefers-reduced-motion`);
    }
});

test('motion.js est chargé après frise.js (replayAnimClass) et avant app.js', () => {
    const scripts = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map((m) => m[1]);
    assert.ok(scripts.indexOf('js/app/motion.js') > scripts.indexOf('js/app/frise.js'));
    assert.ok(scripts.indexOf('js/app/motion.js') < scripts.indexOf('js/app.js'));
});
