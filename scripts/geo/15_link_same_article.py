# -*- coding: utf-8 -*-
"""Relie les fiches dont le lien Wikipédia est une recherche (…/w/index.php?search=X) à celles dont le lien
est l'article X pour la même année : c'est le même fait, que js/linkedEvents.js ne reconnaît qu'à l'identité du lien.

Puis donne à chaque fait lié (au moins deux thèmes) ainsi élargi un seul point (le plus sûr : sans drapeau, site avant ville avant zone,
et à égalité le plus répandu dans le groupe).

REJETS : candidats écartés après lecture (même article mais pas le même événement ni le même lieu).
Usage : python3 scripts/geo/15_link_same_article.py
"""
import json
import os
import re
import urllib.parse

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FR = os.path.join(ROOT, 'data', 'fr.json')
GEO = os.path.join(ROOT, 'assets', 'geo', 'events-geo.json')
REJETS = {
    'thm_geopop:gpop19',   # chaînes de valeur : une analyse, pas la déclaration de pandémie
    'thm_geopop:gpop30',   # confinements et métropoles denses : idem
    'thm_littor:litt50',   # voile à Marseille : pas l'ouverture des Jeux à Paris
    'thm_rev18:rv18_35',   # départ de Toulon : pas les Pyramides
    'thm_colafr:cola24',   # ralliement de l'AEF : pas le ralliement général à la France libre
    'thm_medi:medi43',     # conquête de la Sicile (Noto) : pas la reconquête de Malte : pas l'achèvement de la conquête de la Sicile (Noto)
}
# Point choisi à la main pour tout le fait dont l'une des fiches est la clé (le choix automatique donnerait Alexandrie).
OVERRIDES = {
    'thm_20s:xxs27': [31.2653, 32.3019, 'v', 'Port-Saïd', 0],
}
RANK = {'s': 0, 'v': 1, 'z': 2}


def walk(node):
    if isinstance(node, dict):
        if 'events' in node and 'id' in node and 'nom' in node:
            yield node
        for v in node.values():
            yield from walk(v)
    elif isinstance(node, list):
        for v in node:
            yield from walk(v)


def main():
    doc = json.load(open(FR, encoding='utf-8'))
    geo = json.load(open(GEO, encoding='utf-8'))
    P = geo['points']
    evs = [(t['id'], e) for t in walk(doc) for e in t['events']]
    # (article, année) → thèmes qui le citent en lien direct, et ce lien
    direct = {}
    urls = {}
    for tid, e in evs:
        m = re.match(r'https://fr\.wikipedia\.org/wiki/(.+)$', e.get('wikipedia') or '')
        if m and isinstance(e.get('date'), int):
            key = (urllib.parse.unquote(m.group(1)).replace('_', ' ').lower(), e['date'])
            direct.setdefault(key, set()).add(tid)
            urls[key] = e['wikipedia']
    linked = 0
    for tid, e in evs:
        m = re.match(r'https://fr\.wikipedia\.org/w/index\.php\?search=(.+)$', e.get('wikipedia') or '')
        if not m or tid + ':' + e['id'] in REJETS:
            continue
        key = (urllib.parse.unquote_plus(m.group(1)).lower(), e['date'])
        # Un fait n'est « lié » qu'entre thèmes différents : deux fiches d'un même thème qui citent le même article
        # la même année peuvent être deux événements distincts (Blériot à Douvres, son école à Pau).
        if key in direct and direct[key] - {tid}:
            e['wikipedia'] = urls[key]
            linked += 1
    groups = {}
    for tid, e in evs:
        if e.get('wikipedia') and isinstance(e.get('date'), int):
            groups.setdefault(urllib.parse.unquote(e['wikipedia']).lower() + '|' + str(e['date']), []).append(tid + ':' + e['id'])
    moved = 0
    for mem in groups.values():
        have = [m for m in mem if m in P]
        if len({m.split(':')[0] for m in mem}) < 2 or not have:
            continue

        def score(m):
            v = P[m]
            return (v[4], RANK[v[2]], -sum(1 for x in have if P[x][:2] == v[:2]))
        pt = next((OVERRIDES[m] for m in mem if m in OVERRIDES), None) or P[min(have, key=score)]
        for m in mem:
            if P.get(m) != pt:
                P[m] = list(pt)
                moved += 1
    open(FR, 'w', encoding='utf-8').write(json.dumps(doc, indent=2, ensure_ascii=False) + '\n')
    geo['points'] = dict(sorted(P.items()))
    json.dump(geo, open(GEO, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('liens remplacés :', linked, '| points harmonisés :', moved)


if __name__ == '__main__':
    main()
