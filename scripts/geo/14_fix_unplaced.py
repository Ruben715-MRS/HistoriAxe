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
CITYLIKE = {'city', 'town', 'village', 'municipality', 'suburb', 'borough', 'city_district', 'hamlet', 'quarter', 'neighbourhood'}
# Lieux que Nominatim ne trouve que sous un autre nom (variantes tentées après les requêtes standard).
MANUAL = {
    "Gesher Benot Ya'aqov": ['Gesher Benot Yaakov', 'Jisr Banat Yaqub', 'Rosh Pina'], 'Grotte de Sibudu, KwaZulu-Natal': ['Sibudu', 'Ballito'],
    'Mont Saint-Élie, Alaska': ['Mount Saint Elias'], 'Ghadir Khumm': ['Rabigh', 'Al Juhfah'], 'Monastère de Ganden, Dagzê, Lhassa': ['Ganden Monastery', 'Ganden'],
    'Temples de Dilwara, Mont Abu': ['Dilwara Temples', 'Mount Abu'], 'Tabennesi, Qena': ['Dendera', 'Qena'], 'Kahun, Fayoum': ['El-Lahun', 'Lahun'],
    'El-Achmounein, Minya': ['El Ashmunein', 'Mallawi'], 'Dinshaway, Menoufia': ['Denshway', 'Dinshway'], 'Abousir, Gizeh': ['Abusir', 'Abu Sir'],
    'Gondishapur, Khouzestan': ['Gundeshapur', 'Shahabad Dezful', 'Dezful'], 'Péninsule de Kii': ['Kii Peninsula', 'Wakayama'],
    'Haut-Karabagh': ['Nagorno-Karabakh', 'Stepanakert', 'Khankendi'], 'Dimawe, South-East District': ['Dimawe', 'Gaborone'],
    'Troizina, Argolide': ['Troizina', 'Troezen', 'Galatas'], 'Fort Kyk-Over-Al, Cuyuni-Mazaruni': ['Kyk-over-al', 'Bartica'],
    'Rivière Chongchon': ['Chongchon River', 'Chongchon'], 'Gare de Harbin': ['Harbin Railway Station', 'Harbin'], 'Panmunjeom, zone démilitarisée coréenne': ['Panmunjom', 'Kaesong'],
    'Courlande, Lettonie': ['Courland', 'Kurzeme'], 'Calakmul, Campeche': ['Calakmul', 'Xpujil'], 'Khalkhin Gol, Dornod': ['Khalkhin Gol', 'Khalkh Gol'],
    'Klushino, Smolensk Oblast': ['Klushino', 'Gagarin'], 'Champ de Koulikovo, Monastyrchino, Oblast de Toula': ['Kulikovo Field', 'Monastyrshchino'],
    'Monts Imatong': ['Imatong Mountains', 'Torit'], 'Parc historique de Sukhothaï, Sukhothai': ['Sukhothai Historical Park', 'Sukhothai'],
    'Hô Chi Minh-Ville': ['Ho Chi Minh City', 'Thành phố Hồ Chí Minh'], "Vallée de l'Ouergha": ['Ouergha', 'Ouerrha', 'Ouezzane'], 'Kufra, Libye': ['Al Jawf', 'Kufra'],
    'Béotie': ['Boeotia', 'Thèbes'], 'Ionie, Aydın': ['Ionia', 'Izmir'], 'Bithynie, Turquie': ['Bithynia', 'Bursa'], 'Ny-Alesund, Svalbard': ['Ny-Ålesund', 'Ny Alesund'],
    'Ile aux Ours, Svalbard': ['Bjørnøya', 'Bear Island'], 'Désert de Judée': ['Judean Desert', 'Jericho'], 'Mont Thabor, Galilée': ['Mount Tabor', 'Har Tavor'],
    'Lumbini': ['Lumbini', 'Bhairahawa'], 'Tiruchuzhi, Tamil Nadu': ['Thiruchuli', 'Virudhunagar'], 'Arqa, Akkar': ['Arqa', 'Halba'], 'Bqaakafra, Bcharré': ['Bqaa Kafra', 'Bsharri'],
    'Al-Qurayya, Soueida': ['Qraya', 'As-Suwayda'], "Priamoukhino, oblast de Tver": ['Pryamukhino'], "Selichtchi, oblast de Novgorod": ['Selishche'],
    "Semionovo, oblast de Novgorod": ['Semenovo'], "Poustomazovo, oblast de Tver": ['Pustomazovo'], "Kourya, kraï de l'Altaï": ['Kurya'], "Boutka, oblast de Sverdlovsk": ['Butka'],
    'Kypinos, Evros': ['Kipoi', 'Ipsala'], 'Atoll Midway': ['Midway Atoll', 'Midway Islands'], 'Atoll de Midway': ['Midway Atoll', 'Midway Islands'],
    'Saipan': ['Saipan', 'Garapan'], 'Îles Mariannes du Nord': ['Northern Mariana Islands', 'Saipan'], 'Svalbard': ['Svalbard', 'Longyearbyen'],
    "Hôpital de l'université Keio, Shinjuku, Tokyo": ['Keio University Hospital', 'Shinjuku'], 'Mopti': ['Mopti', 'Sévaré'],
}
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
        # Une grande ville dont l'emprise englobe des îles lointaines (Tokyo) garde un centre juste.
        lim = 3000 if (precision != 'zone' and r['type'] in CITYLIKE) else LIMITS[precision]
        if r['diag'] <= lim:
            return r
    return None


def first_region(results):
    return next((r for r in results or [] if r['diag'] <= LIMITS['zone']), None)


def resolve(a, cache):
    head = a['place'].split(',')[0].strip()
    cc = a['cc']
    aq = cc == 'AQ'
    if a['precision'] == 'zone':
        attempts = [(a['place'], 'zone'), (a['alt'], 'zone'), (head, 'zone')]
    else:
        attempts = [(a['place'], a['precision']), (a['alt'], 'ville'), (head, 'ville')]
    attempts += [(q, 'ville' if a['precision'] != 'zone' else 'zone') for q in MANUAL.get(a['place'], [])]
    seen = set()
    for q, prec in attempts:
        if not q or (q, prec) in seen:
            continue
        seen.add((q, prec))
        r = pick(search(q, None if aq else cc, cache), prec)
        if r:
            return {'lat': r['lat'], 'lon': r['lon'], 'name': r['name'], 'diag': r['diag'], 'via': 'place' if q == a['place'] else 'alt',
                    'status': 'ok' if prec == a['precision'] else 'downgraded', 'q': q, 'type': r['type']}
    # Dernier recours : la région citée, en « zone » (repère de découverte, hors jeu).
    for q in (a['alt'], head):
        r = first_region(search(q, None if aq else cc, cache)) if q else None
        if r:
            return {'lat': r['lat'], 'lon': r['lon'], 'name': r['name'], 'diag': r['diag'], 'via': 'alt', 'status': 'downgraded', 'q': q,
                    'type': r['type'], 'forceZone': True}
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
        elif a['precision'] in ('site', 'ville') and g.get('diag', 0) > 35:
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
