// Échappement des textes insérés dans la page (js/escape.js).
//
// 1. escapeHtml et safeHttpUrl se comportent.
// 2. Un balayage du code refuse une donnée utilisateur — nom, titre, axe, description, pseudo, prénom… —
//    interpolée dans un gabarit `innerHTML` sans passer par escapeHtml. C'est une heuristique, pas une preuve :
//    elle attrape l'oubli le plus courant (ajouter `${theme.nom}` à un gabarit) ; ce qui est réellement sûr
//    parce que constant se déclare `// html-safe: raison` sur la ligne.
// 3. Les packs de données ne contiennent aucun balisage : les échapper ne change pas ce qui s'affiche.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { escapeHtml, safeHttpUrl } = require('../js/escape.js');
const root = path.resolve(__dirname, '..');

test('escapeHtml neutralise le balisage, les guillemets et les esperluettes', () => {
    assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
    assert.equal(escapeHtml(`l'astre & "lui"`), 'l&#39;astre &amp; &quot;lui&quot;');
    assert.equal(escapeHtml(null), '');
    assert.equal(escapeHtml(undefined), '');
    assert.equal(escapeHtml(1936), '1936');
    // Une valeur d'attribut ne peut plus s'échapper de ses guillemets.
    const attr = `<input value="${escapeHtml('" autofocus onfocus="alert(1)')}">`;
    assert.ok(!/ onfocus=/.test(attr.replace(/&quot;/g, '')) || attr.includes('&quot; autofocus'), attr);
    assert.equal((attr.match(/"/g) || []).length, 2);
});

test('safeHttpUrl : http et https seulement', () => {
    assert.equal(safeHttpUrl('https://fr.wikipedia.org/wiki/Rome'), 'https://fr.wikipedia.org/wiki/Rome');
    assert.equal(safeHttpUrl('http://example.org/a b'), 'http://example.org/a%20b');
    for (const bad of ['javascript:alert(1)', ' JavaScript:alert(1)', 'data:text/html,<script>1</script>', '//evil.example', 'wiki/Rome', '', null, undefined]) {
        assert.equal(safeHttpUrl(bad), '', String(bad));
    }
});

// --- Le balayage -----------------------------------------------------------------
// Tout gabarit (`...`) du code dont une interpolation désigne une donnée utilisateur doit l'échapper, SAUF
// s'il est destiné à textContent / innerText / setAttribute… (le contexte avant le gabarit le dit) ou déclaré
// `// html-safe: raison`. Un gabarit construit dans une variable puis assemblé plus loin (axeHtml, badges…)
// est donc couvert lui aussi, pas seulement celui qui suit directement `innerHTML =`.
const USER_FIELD = /\.(titre|nom|axe|name|pseudo|description|label|themeName|legende|auteur)\b/;
const SAFE_CONTEXT = /textContent|innerText|setAttribute|\.title\s*=|alert\(|showConfirm|showToast|awardXP|console\.|placeholder\s*=|\.value\s*=|aria-label/;
const PALETTE_NAME = /color\.name/; // nom de couleur de la palette d'axes : une constante

function sources() {
    const out = [];
    (function walk(d) {
        for (const f of fs.readdirSync(d, { withFileTypes: true })) {
            const p = path.join(d, f.name);
            if (f.isDirectory()) walk(p);
            else if (f.name.endsWith('.js') && f.name !== 'escape.js') out.push(p);
        }
    })(path.join(root, 'js'));
    return out;
}

function unescapedUserInterpolations(src) {
    const found = [];
    for (const m of src.matchAll(/`((?:[^`\\]|\\.)*)`/gs)) {
        const before = src.slice(Math.max(0, src.lastIndexOf('\n', m.index - 1)), m.index);
        const previousLine = src.slice(Math.max(0, src.lastIndexOf('\n', src.lastIndexOf('\n', m.index - 1) - 1)), m.index);
        if (SAFE_CONTEXT.test(before) || /html-safe:/.test(previousLine)) continue;
        for (const im of m[1].matchAll(/\$\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
            const expr = im[1].trim();
            if (!USER_FIELD.test(expr) || PALETTE_NAME.test(expr) || /^escapeHtml\(/.test(expr)) continue;
            found.push({ expr, line: src.slice(0, m.index).split('\n').length });
        }
    }
    return found;
}

test('aucune donnée utilisateur n\'est interpolée dans un gabarit HTML sans escapeHtml', () => {
    const problems = [];
    for (const file of sources()) {
        for (const { expr, line } of unescapedUserInterpolations(fs.readFileSync(file, 'utf8'))) {
            problems.push(`${path.relative(root, file)}:${line}  \${${expr}}`);
        }
    }
    assert.deepEqual(problems, [], 'à passer par escapeHtml(...), ou `// html-safe: raison` sur la ligne précédente si la valeur est sûre');
});

test('le balayage voit bien un oubli, et respecte les exceptions déclarées', () => {
    assert.deepEqual(unescapedUserInterpolations('x = `<b>${theme.nom}</b>`;').map((p) => p.expr), ['theme.nom']);
    assert.deepEqual(unescapedUserInterpolations('x = `<b>${escapeHtml(theme.nom)}</b>`;'), []);
    assert.deepEqual(unescapedUserInterpolations('el.textContent = `${theme.nom}`;'), []);
    assert.deepEqual(unescapedUserInterpolations('// html-safe: constante\nx = `${theme.nom}`;'), []);
    assert.deepEqual(unescapedUserInterpolations('x = `<i data-axis="${color.name}">${evt.axe}</i>`;').map((p) => p.expr), ['evt.axe']);
});

test('showToast n\'interprète pas son message comme du HTML', () => {
    const src = fs.readFileSync(path.join(root, 'js', 'app', 'session-end.js'), 'utf8');
    const body = src.slice(src.indexOf('function showToast'), src.indexOf('}', src.indexOf('toast.classList.remove')));
    assert.ok(!/toast\.innerHTML/.test(body));
    assert.ok(/toast\.textContent\s*=\s*message/.test(body));
});

test('aucun texte des packs de données ne contient de balisage ni d\'entité : les échapper ne change rien', () => {
    const doc = JSON.parse(fs.readFileSync(path.join(root, 'data', 'fr.json'), 'utf8'));
    const bad = [];
    (function walk(n) {
        if (/[<>]|&[a-z#0-9]+;/i.test(n.nom || '')) bad.push(n.nom);
        (n.subcategories || []).forEach(walk);
        (n.themes || []).forEach((theme) => {
            if (/[<>]|&[a-z#0-9]+;/i.test(theme.nom)) bad.push(theme.nom);
            for (const e of theme.events) for (const k of ['titre', 'axe', 'description']) if (/[<>]|&[a-z#0-9]+;/i.test(e[k] || '')) bad.push(`${e.id}.${k}`);
        });
    })({ subcategories: doc.categories });
    assert.deepEqual(bad.slice(0, 10), []);
});
