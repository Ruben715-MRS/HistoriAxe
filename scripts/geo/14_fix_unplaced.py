#!/usr/bin/env python3
"""Reprend les faits que 11_geocode.py n'a pas pu placer (statuts failed / suspect-large).

Causes constatées : (1) résultats vides mis en cache AVANT l'ajout des alias de pays
(Kourou « GF », Hong Kong « HK ») ; (2) emprise administrative énorme (province
de Québec, municipalité de Pékin, préfecture de Tokyo avec ses îles) : le centre
renvoyé est bon mais le garde-fou de taille l'écartait ; (3) lieux très spécifiques
que Nominatim ne connaît que sous un autre nom.
Stratégie, dans l'ordre : requête précise (cache vide purgé) → ville/localité seule avec
featuretype=settlement (centre de l'agglomération, emprise petite) → nom sans contrainte
d'entité. Un site ramené à sa ville devient « ville ». Écrit work/fixes.json, lu par
12_merge_geo.py avant geocoded.json. Les zones (découverte seulement) tolèrent une emprise vaste.
"""
import json, os, glob, time, urllib.request, urllib.parse, sys
sys.path.insert(0, os.path.dirname(__file__))
import importlib.util
spec = importlib.util.spec_from_file_location('geo11', os.path.join(os.path.dirname(__file__), '11_geocode.py'))
g11 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g11)

WORK = g11.WORK
ZONE_MAX = 12000   # une zone est un repère de découverte : l'étendue du pays/archipel importe peu


def search(q, cc, feature=None, cache=None):
    key = f'{q}|{cc}|{feature or ""}'
    if key in cache:
        return cache[key] or None
    params = {'q': q, 'format': 'jsonv2', 'limit': 1, 'accept-language': 'fr'}
    if cc:
        params['countrycodes'] = g11.CC_ALIASES.get(cc.upper(), cc.lower())
    if feature:
        params['featuretype'] = feature
    res = None
    for attempt in range(4):
        try:
            j = json.load(urllib.request.urlopen(urllib.request.Request(
                'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(params), headers={'User-Agent': g11.UA}), timeout=30))
            res = {'lat': float(j[0]['lat']), 'lon': float(j[0]['lon']), 'name': j[0]['display_name'][:120],
                   'diag': round(g11.diag_km(j[0]['boundingbox']), 1)} if j else {}
            break
        except Exception:
            time.sleep(5 * (attempt + 1))
    time.sleep(1.1)
    if res is None:
        return None
    cache[key] = res
    return res or None


def main():
    cache = json.load(open(os.path.join(WORK, 'fixes_cache.json'))) if os.path.exists(os.path.join(WORK, 'fixes_cache.json')) else {}
    ann = {}
    for f in glob.glob(os.path.join(WORK, 'annot', '*.json')):
        for a in json.load(open(f)):
            ann[a['id']] = a
    geo = json.load(open(os.path.join(WORK, 'geocoded.json')))
    todo = {i: a for i, a in ann.items() if geo.get(i, {}).get('status') in ('failed', 'suspect-large')}
    fixes, memo = {}, {}
    for n, (i, a) in enumerate(todo.items()):
        k = (a['place'], a['alt'], a['cc'], a['precision'])
        if k not in memo:
            head = a['place'].split(',')[0].strip()
            attempts = []
            if a['precision'] == 'zone':
                attempts = [(a['place'], a['cc'], None, 'zone'), (a['alt'], a['cc'], None, 'zone'), (a['alt'], None, None, 'zone'), (head, a['cc'], None, 'zone')]
            else:
                attempts = [(a['place'], a['cc'], None, a['precision']),
                            (a['alt'], a['cc'], 'settlement', 'ville'), (head, a['cc'], 'settlement', 'ville'),
                            (a['alt'], a['cc'], None, 'ville'), (a['alt'], None, 'settlement', 'ville'), (head, None, None, 'ville')]
            found = None
            for q, cc, feat, prec in attempts:
                if not q:
                    continue
                r = search(q, cc, feat, cache)
                if not r:
                    continue
                lim = {'site': 40, 'ville': 120, 'zone': ZONE_MAX}[prec]
                if r['diag'] <= lim:
                    found = {'lat': r['lat'], 'lon': r['lon'], 'name': r['name'], 'diag': r['diag'], 'via': 'place' if q == a['place'] else 'alt',
                             'status': 'ok' if prec == a['precision'] else 'downgraded', 'q': q, 'feat': feat or '', 'cc': cc or ''}
                    break
            memo[k] = found
        if memo[k]:
            fixes[i] = memo[k]
        if n % 25 == 0:
            json.dump(cache, open(os.path.join(WORK, 'fixes_cache.json'), 'w'), ensure_ascii=False)
            print(n, '/', len(todo), flush=True)
    json.dump(cache, open(os.path.join(WORK, 'fixes_cache.json'), 'w'), ensure_ascii=False)
    json.dump(fixes, open(os.path.join(WORK, 'fixes.json'), 'w'), ensure_ascii=False, indent=0)
    print(len(fixes), 'faits placés sur', len(todo))


if __name__ == '__main__':
    main()
