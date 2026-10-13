#!/usr/bin/env python3
"""Géocode les annotations (work/annot/*.json) avec Nominatim.

Garde-fous appris sur les prototypes (France, Art) : requête contrainte au pays
annoté (countrycodes), variante `alt` si la requête précise échoue, résultat
trop vaste ou hors pays marqué suspect. Cache : work/nominatim_cache.json
(clé « place|CC »), reprise possible. 1 requête/s (conditions d'usage Nominatim).
"""
import json, os, sys, glob, time, math, urllib.request, urllib.parse

WORK = os.path.join(os.path.dirname(__file__), 'work')
CACHE = os.path.join(WORK, 'nominatim_cache.json')
UA = 'HistoriAxeGeo/1.0 (ruben.arditti@gmail.com)'


def diag_km(bbox):
    s, n, w, e = [float(x) for x in bbox]
    p = math.pi / 180
    a = math.sin((n - s) * p / 2) ** 2 + math.cos(s * p) * math.cos(n * p) * math.sin((e - w) * p / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(a))


def query(q, cc, cache):
    key = f'{q}|{cc}'
    if key in cache:
        return cache[key]
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(
        {'q': q, 'format': 'jsonv2', 'limit': 1, 'accept-language': 'fr', 'countrycodes': cc.lower()})
    res = None
    for attempt in range(4):
        try:
            j = json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=30))
            res = {'lat': float(j[0]['lat']), 'lon': float(j[0]['lon']), 'name': j[0]['display_name'][:120],
                   'diag': round(diag_km(j[0]['boundingbox']), 1)} if j else {}
            break
        except Exception:
            time.sleep(5 * (attempt + 1))
    time.sleep(1.1)
    if res is None:
        return None            # erreur réseau : non mis en cache, sera retenté
    cache[key] = res
    return res


def main():
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    annots = {}
    for f in sorted(glob.glob(os.path.join(WORK, 'annot', '*.json'))):
        for a in json.load(open(f)):
            annots[a['id']] = a
    todo = [a for a in annots.values() if a['precision'] != 'none']
    out = {}
    for n, a in enumerate(todo):
        r = query(a['place'], a['cc'], cache); via = 'place'
        if not r and a.get('alt') and a['alt'] != a['place']:
            r = query(a['alt'], a['cc'], cache); via = 'alt'
        status = 'ok'
        if not r:
            status = 'failed'
        else:
            limit = {'site': 15, 'ville': 60, 'zone': 800}[a['precision']]
            if r['diag'] > limit:
                status = 'suspect-large'
            elif via == 'alt' and a['precision'] == 'site':
                status = 'downgraded'
        out[a['id']] = {'lat': r['lat'], 'lon': r['lon'], 'name': r['name'], 'diag': r['diag'], 'via': via, 'status': status} if r else {'status': status, 'via': via}
        if n % 25 == 0:
            json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
            print(n, '/', len(todo), flush=True)
    json.dump(cache, open(CACHE, 'w'), ensure_ascii=False)
    json.dump(out, open(os.path.join(WORK, 'geocoded.json'), 'w'), ensure_ascii=False)
    import collections
    print(collections.Counter(v['status'] for v in out.values()))


if __name__ == '__main__':
    main()
