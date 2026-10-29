// Veille des dirigeants : photographie des chefs d'État et de gouvernement en fonction, à comparer aux sources.
// Ne modifie aucune donnée : écrit un rapport Markdown daté dans scripts/veille/rapports/.
//
//     node scripts/veille/dirigeants.js            # écrit le rapport du jour
//     node scripts/veille/dirigeants.js --stdout   # affiche sans écrire

'use strict';

const fs = require('fs');
const path = require('path');
const Core = require(path.join(__dirname, '..', '..', 'js', 'stateLeadersCore.js'));

const OUT_DIR = path.join(__dirname, 'rapports');

function rowOf(item) {
    return item.row || item;
}

function enFonction(mode, key) {
    return Core.rowsOf(key, mode).map(rowOf).filter(function (r) { return r.to === null || r.to === undefined; });
}

// Anomalies : une fin antérieure au début, ou plusieurs lignes « en fonction » pour un même mode (à vérifier, pas forcément une erreur : deux branches).
function anomalies(mode, key) {
    const rows = Core.rowsOf(key, mode).map(rowOf);
    const out = [];
    rows.forEach(function (r) {
        if (r.to !== null && r.to !== undefined && r.to < r.from) out.push('fin antérieure au début : ' + r.name + ' (' + r.from + '–' + r.to + ')');
    });
    if (enFonction(mode, key).length > 1) out.push('plusieurs lignes en fonction : ' + enFonction(mode, key).map(function (r) { return r.name; }).join(', '));
    return out;
}

function build() {
    const today = new Date().toISOString().slice(0, 10);
    const lines = [];
    const problems = [];
    lines.push('# Veille des dirigeants : photographie au ' + today);
    lines.push('');
    lines.push('Chefs d’État et de gouvernement marqués « en fonction » dans les données. À comparer aux sources officielles : une ligne ' +
        'fausse ou périmée se corrige dans le fichier source, pas dans ce rapport.');
    lines.push('');
    lines.push('| Pays | Chef de l’État (depuis) | Chef du gouvernement (depuis) |');
    lines.push('|---|---|---|');
    Core.countryList().forEach(function (c) {
        const etat = enFonction('etat', c.key);
        const gouv = Core.hasGovernment(c.key) ? enFonction('gouvernement', c.key) : [];
        const fmt = function (list) {
            if (!list.length) return '—';
            return list.map(function (r) { return r.name + ' (' + r.from + ')'; }).join(' ; ');
        };
        lines.push('| ' + c.name + ' | ' + fmt(etat) + ' | ' + (Core.hasGovernment(c.key) ? fmt(gouv) : 'pas de liste séparée') + ' |');
        anomalies('etat', c.key).forEach(function (a) { problems.push(c.name + ' (État) : ' + a); });
        if (Core.hasGovernment(c.key)) anomalies('gouvernement', c.key).forEach(function (a) { problems.push(c.name + ' (gouvernement) : ' + a); });
    });
    lines.push('');
    lines.push('## Anomalies à vérifier');
    lines.push('');
    if (problems.length) problems.forEach(function (p) { lines.push('- ' + p); });
    else lines.push('Aucune.');
    lines.push('');
    lines.push('## Vérification des sources');
    lines.push('');
    lines.push('Pour chaque ligne ci-dessus : date de prise de fonction confirmée, et changement survenu depuis (élection, démission, décès, coalition).');
    lines.push('');
    return { text: lines.join('\n'), today: today, count: Core.countryList().length, problems: problems.length };
}

function main() {
    const report = build();
    if (process.argv.indexOf('--stdout') !== -1) {
        process.stdout.write(report.text);
        return;
    }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const file = path.join(OUT_DIR, 'dirigeants-' + report.today + '.md');
    fs.writeFileSync(file, report.text, 'utf8');
    console.log(report.count + ' pays, ' + report.problems + ' anomalie(s). Rapport : ' + file);
}

main();
