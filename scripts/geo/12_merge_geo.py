#!/usr/bin/env python3
"""Fusionne faits + annotations + géocodage → assets/geo/events-geo.json, et la liste de relecture.

assets/geo/events-geo.json : {"v":1,"points":{"thème:id":[lat,lon,"s|v|z","libellé"]}}
Tous les membres d'un fait lié reçoivent le même point. Seuls les points
`site` et `ville` entrent dans le jeu ; `zone` ne sert qu'à la découverte.
work/review.json : ce qu'un humain doit regarder (faible confiance, ambigu,
repli, résultat suspect, échec).
"""
import json, os, glob, collections

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
WORK = os.path.join(os.path.dirname(__file__), 'work')
CODE = {'site': 's', 'ville': 'v', 'zone': 'z'}


def main():
    facts = {f['id']: f for f in json.load(open(os.path.join(WORK, 'facts.json')))}
    annots = {}
    for f in sorted(glob.glob(os.path.join(WORK, 'annot', '*.json'))):
        for a in json.load(open(f)):
            annots[a['id']] = a
    geo = json.load(open(os.path.join(WORK, 'geocoded.json')))
    fx = os.path.join(WORK, 'fixes.json')
    if os.path.exists(fx):
        geo.update(json.load(open(fx)))   # reprises de 14_fix_unplaced.py, prioritaires
    path = os.path.join(ROOT, 'assets', 'geo', 'events-geo.json')
    points = json.load(open(path))['points'] if os.path.exists(path) else {}
    review = collections.defaultdict(list); n = 0
    for fid, a in annots.items():
        if fid not in facts:
            review['unknown-fact'].append(fid); continue
        if a['precision'] == 'none':
            continue
        g = geo.get(fid)
        if not g or g['status'] in ('failed',):
            review['failed'].append({'id': fid, 'place': a['place'], 'cc': a['cc']}); continue
        prec = a['precision']
        if g['status'] == 'downgraded': prec = 'ville'
        if g['status'] == 'suspect-large':
            review['suspect-large'].append({'id': fid, 'place': a['place'], 'name': g['name'], 'diag': g['diag']}); continue
        for m in facts[fid]['members']:
            # 5ᵉ champ : 1 = lieu discutable (ambigu ou faible confiance) — réservé à la
            # découverte, à ne pas poser en question de jeu ; 0 = fiable.
            flag = 1 if (a.get('ambig') or a.get('conf') == 'low') else 0
            points[m] = [round(g['lat'], 4), round(g['lon'], 4), CODE[prec], (a['alt'] if g['via'] == 'alt' else a['place'])[:60], flag]
        n += 1
        if g['status'] == 'downgraded': review['downgraded'].append({'id': fid, 'place': a['place']})
        if a.get('ambig'): review['ambig'].append({'id': fid, 'titre': facts[fid]['titre'], 'place': a['place'], 'note': a.get('note', '')})
        if a.get('conf') == 'low': review['low-conf'].append({'id': fid, 'titre': facts[fid]['titre'], 'place': a['place'], 'name': g['name']})
    json.dump({'v': 1, 'points': dict(sorted(points.items()))}, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump(review, open(os.path.join(WORK, 'review.json'), 'w'), ensure_ascii=False, indent=1)
    print(n, 'faits placés ;', len(points), 'événements dans assets/geo/events-geo.json ;', {k: len(v) for k, v in review.items()}, 'dont jouables fiables :', sum(1 for p in points.values() if p[2] in 'sv' and p[4] == 0))


if __name__ == '__main__':
    main()
