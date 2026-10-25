// =========================================================================
// === LES VILLES DU JEU : construction de assets/geo/cities.json ===
// =========================================================================
// Source : Wikidata (CC0). Retiennent les villes d'au moins 500 000 habitants, plus toutes les capitales (Canberra
// compte, même petite). Pour chaque ville : le nom français, le pays (nom français et code ISO à deux lettres, pour
// le rattacher à assets/geo/countries-facts.json), les coordonnées, et la population la plus élevée connue dans Wikidata.
//
// Usage : node scripts/cities/build_cities.js   (accès réseau à query.wikidata.org requis ; relancer après une mise à jour)
// La population est une estimation d'une année non précisée : le jeu l'affiche comme telle.

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ENDPOINT = 'https://query.wikidata.org/sparql';
const OUT = path.join(__dirname, '..', '..', 'assets', 'geo', 'cities.json');
const MIN_POP = 500000;
// Les pays de l'Atlas : une ville n'est retenue que si son pays y est (même liste que le quiz des pays).
const FACTS = path.join(__dirname, '..', '..', 'assets', 'geo', 'countries-facts.json');

const QUERY_BIG_CITIES = `
SELECT ?city ?cityLabel ?country ?countryLabel ?lon ?lat (MAX(?pop) AS ?maxPop) WHERE {
  ?city wdt:P31/wdt:P279* wd:Q515 ; wdt:P17 ?country ; p:P625/psv:P625 ?coordNode ; wdt:P1082 ?pop .
  ?coordNode wikibase:geoLongitude ?lon ; wikibase:geoLatitude ?lat .
  FILTER(?pop >= ${MIN_POP})
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
GROUP BY ?city ?cityLabel ?country ?countryLabel ?lon ?lat`;

const QUERY_CAPITALS = `
SELECT ?country ?countryLabel ?city ?cityLabel ?lon ?lat (MAX(?pop) AS ?maxPop) WHERE {
  ?country wdt:P31 wd:Q6256 ; wdt:P36 ?city .
  ?city p:P625/psv:P625 ?coordNode .
  ?coordNode wikibase:geoLongitude ?lon ; wikibase:geoLatitude ?lat .
  OPTIONAL { ?city wdt:P1082 ?pop . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "fr,en". }
}
GROUP BY ?country ?countryLabel ?city ?cityLabel ?lon ?lat`;

const QUERY_ISO = `
SELECT ?country ?iso WHERE { ?country wdt:P31 wd:Q6256 ; wdt:P297 ?iso . }`;

function sparql(query) {
    const body = execFileSync('curl', ['-sS', '--fail', '-m', '250', '-G', ENDPOINT,
        '--data-urlencode', 'query=' + query,
        '-H', 'Accept: application/sparql-results+json',
        '-H', 'User-Agent: HistoriAxe-cities/1.0 (https://github.com/Ruben715-MRS/HistoriAxe)'], { maxBuffer: 64 * 1024 * 1024 });
    return JSON.parse(body.toString('utf8')).results.bindings;
}

const qid = uri => uri.replace('http://www.wikidata.org/entity/', '');
const val = (row, key) => (row[key] ? row[key].value : null);
const isLabelMissing = label => !label || /^Q\d+$/.test(label);

function main() {
    const isoOf = new Map(sparql(QUERY_ISO).map(r => [qid(r.country.value), r.iso.value]));
    const cities = new Map();
    const add = (row, cityKey, labelKey, countryKey, countryLabelKey) => {
        const id = qid(row[cityKey].value);
        if (cities.has(id)) return;
        const label = val(row, labelKey);
        const country = qid(row[countryKey].value);
        if (isLabelMissing(label) || isLabelMissing(val(row, countryLabelKey))) return;
        cities.set(id, {
            id: id,
            n: label,
            country: val(row, countryLabelKey),
            cc: isoOf.get(country) || null,
            lon: Number(val(row, 'lon')),
            lat: Number(val(row, 'lat')),
            pop: val(row, 'maxPop') ? Math.round(Number(val(row, 'maxPop'))) : null,
            cap: false
        });
    };
    sparql(QUERY_BIG_CITIES).forEach(r => add(r, 'city', 'cityLabel', 'country', 'countryLabel'));
    const capitalRows = sparql(QUERY_CAPITALS);
    capitalRows.forEach(r => {
        const id = qid(r.city.value);
        if (!cities.has(id)) add(r, 'city', 'cityLabel', 'country', 'countryLabel');
        if (cities.has(id)) cities.get(id).cap = true;
    });
    // Une capitale est une capitale d'un pays : on la garde même sans population connue. Un même nom deux fois dans un pays
    // (Tokyo, Yulin…) : on ne garde que la ville la plus peuplée.
    const atlas = new Set(JSON.parse(fs.readFileSync(FACTS, 'utf8')).countries.map(c => c.iso2));
    const best = new Map();
    [...cities.values()].filter(c => atlas.has(c.cc) && (c.cap || (c.pop && c.pop >= MIN_POP))).forEach(c => {
        const key = c.cc + '|' + c.n;
        if (!best.has(key) || (c.pop || 0) > (best.get(key).pop || 0)) best.set(key, c);
    });
    const list = [...best.values()];
    list.sort((a, b) => (b.pop || 0) - (a.pop || 0) || (a.n < b.n ? -1 : 1));
    const out = {
        v: 1,
        source: 'Wikidata (CC0), requête du ' + new Date().toISOString().slice(0, 10),
        minPopulation: MIN_POP,
        cities: list
    };
    fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
    console.log(list.length + ' villes ; ' + list.filter(c => c.cap).length + ' capitales ; sans code pays : ' + list.filter(c => !c.cc).length);
}

main();
