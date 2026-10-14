#!/usr/bin/env python3
"""Reprend les faits mal ou non placés par 11_geocode.py. Écrit work/fixes.json (lu par 12_merge_geo.py).

Constat (art, France, puis base entière) : Nominatim classe souvent en premier la RÉGION
homonyme (province de Québec, préfecture de Nagasaki, État de Puebla) avant la ville
(`addresstype` = state/province…), et l'emprise d'une grande ville (Pékin, Tokyo avec ses
îles) fait écarter à tort un résultat correct. Ce script lit les 5 premiers résultats et
choisit le premier qui n'est pas une région quand le fait est un site/une ville.

Portée : (a) faits échoués / écartés (failed, suspect-large) ; (b) faits acceptés dont
l'emprise dépasse 80 km, où un résultat « région » aurait pu passer inaperçu.
Règles : toujours contraint au pays annoté (sauf l'Antarctique) ; un site ramené à sa ville
devient « ville » ; une zone tolère une emprise vaste.
"""
import json, os, glob, time, urllib.request, urllib.parse, sys, importlib.util

spec = importlib.util.spec_from_file_location('geo11', os.path.join(os.path.dirname(__file__), '11_geocode.py'))
g11 = importlib.util.module_from_spec(spec); spec.loader.exec_module(g11)
WORK = g11.WORK
REGIONLIKE = {'state', 'province', 'region', 'county', 'state_district', 'country', 'continent', 'department', 'territory', 'archipelago', 'ocean', 'sea'}
LIMITS = {'site': 150, 'ville': 400, 'zone': 12000}
CACHE = os.path.join(WORK, 'fixes_cache.json')


def search(q, cc, cache):
    key = f'{q}|{cc}|5'
    if key in cache:
        return cache[key]
    params = {'q': q, 'format': 'jsonv2', 'limit': 5, 'accept-language': 'fr'}
    if cc:
        params['countrycodes'] = g11.CC_ALIASES.get(cc.upper(), cc.lower())
    res = None
    for attempt in range(4):
        try:
            j = json.load(urllib.request.urlopen(urllib.request.Request(
                'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(params), headers={'User-Agent': g11.UA}), timeout=30))
            res = [{'lat': float(x['lat']), 'lon': float(x['lon']), 'name': x['display_name'][:120], 'type': x.get('addresstype') or x.get('type'),
                    'diag': round(g11.diag_km(x['boundingbox']), 1)} for x in j]
            break
        except Exception:
            time.sleep(5 * (attempt + 1))
    time.sleep(1.1)
    if res is None:
        return None
    cache[key] = res
    return res


def pick(results, precision):
    """Premier résultat acceptable pour cette précision, sinon None."""
    for r in results or []:
        if precision != 'zone' and r['type'] in REGIONLIKE:
            continue
        if r['diag'] <= LIMITS[precision]:
            return r
    return None


def resolve(a, cache):
    head = a['place'].split(',')[0].strip()
    cc = a['cc']
    aq = cc == 'AQ'
    if a['precision'] == 'zone':
        attempts = [(a['place'], 'zone'), (a['alt'], 'zone'), (head, 'zone')]
    else:
        attempts = [(a['place'], a['precision']), (a['alt'], 'ville'), (head, 'ville')]
    seen = set()
    for q, prec in attempts:
        if not q or (q, prec) in seen:
            continue
        seen.add((q, prec))
        r = pick(search(q, None if aq else cc, cache), prec)
        if r:
            return {'lat': r['lat'], 'lon': r['lon'], 'name': r['name'], 'diag': r['diag'], 'via': 'place' if q == a['place'] else 'alt',
                    'status': 'ok' if prec == a['precision'] else 'downgraded', 'q': q, 'type': r['type']}
    return None


def main():
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    ann = {}
    for f in glob.glob(os.path.join(WORK, 'annot', '*.json')):
        for a in json.load(open(f)):
            ann[a['id']] = a
    geo = json.load(open(os.path.join(WORK, 'geocoded.json')))
    todo = {}
    for i, g in geo.items():
        a = ann[i]
        if g['status'] in ('failed', 'suspect-large'):
            todo[i] = a
        elif a['precision'] in ('site', 'ville') and g.get('diag', 0) > 80:
            todo[i] = a
    fixes, memo = {}, {}
    for n, (i, a) in enumerate(todo.items()):
        k = (a['place'], a['alt'], a['cc'], a['precision'])
        if k not in memo:
            memo[k] = resolve(a, cache)
        r = memo[k]
        g = geo[i]
        if r is None:
            continue
        if g['status'] in ('failed', 'suspect-large'):
            fixes[i] = r
        else:   # point déjà accepté : on ne le remplace que s'il était une région ou s'il diffère nettement
            d = g11 and abs(r['lat'] - g['lat']) + abs(r['lon'] - g['lon'])
            if d > 0.3:
                fixes[i] = r
        if n % 50 == 0:
            json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
            print(n, '/', len(todo), flush=True)
    json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
    json.dump(fixes, open(os.path.join(WORK, 'fixes.json'), 'w'), ensure_ascii=False, indent=0)
    unresolved = [i for i, g in geo.items() if g['status'] in ('failed', 'suspect-large') and i not in fixes]
    json.dump(unresolved, open(os.path.join(WORK, 'unresolved.json'), 'w'))
    print(len(fixes), 'corrections ;', len(unresolved), 'faits toujours non placés sur', sum(1 for g in geo.values() if g['status'] in ('failed', 'suspect-large')))


if __name__ == '__main__':
    main()
