#!/usr/bin/env python3
"""Construit le thème « Prix Nobel » dans data/fr.json.

    python3 scripts/build_nobel.py            # écrit data/fr.json
    python3 scripts/build_nobel.py --check    # valide, n'écrit rien
    python3 scripts/build_nobel.py --verify   # data/fr.json reflète-t-il les sources ?

Sources : scripts/nobel/<domaine>.json (un fichier par prix), scripts/nobel/theme.json (nom, axes,
incontournables, note) et scripts/nobel/medecine_remplacements.json.
Cible : « Culture générale > Prix et récompenses > Prix Nobel » (`thm_nobel`). Relancer le script
remplace ce thème : il est la seule source de vérité de son contenu, ne pas le retoucher à la main
dans fr.json.

Règles (vérifiées ici, puis par tests/data-schema.test.js et tests/nobel.test.js) :
  - la date d'un événement est l'année du prix (millésime officiel de la fondation Nobel) ;
  - la description dit ce que le lauréat a découvert ou accompli et pourquoi cela est important ;
  - le titre ne donne pas l'année (ce serait donner la réponse) ;
  - un événement porte un axe connu (un domaine) et un identifiant unique dans tout le pack.

Les événements marqués `"deplace": "<thème>"` existaient déjà dans un autre thème de « Culture générale »
(Histoire de l'Écriture et Littérature, Histoire de la Médecine et Santé, Inventions et découvertes) :
ils en sont retirés et gardent leur identifiant, pour que les points faibles, la révision et les défis
des joueurs qui les connaissent restent valables. Dans « Histoire de la Médecine et Santé », chaque
événement retiré dont la découverte n'avait pas de fiche propre est remplacé par un événement daté de la
découverte (`medecine_remplacements.json`) : sans cela, la PCR resterait datée de 1993, année de son prix.
Le point de carte d'un événement déplacé le suit (assets/geo/events-geo.json).
"""
import argparse
import json
import os
import re
import sys
from urllib.parse import quote, unquote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data', 'fr.json')
GEO = os.path.join(ROOT, 'assets', 'geo', 'events-geo.json')
SOURCES = os.path.join(ROOT, 'scripts', 'nobel')
CATEGORY = 'Culture générale'
WIKI = 'https://fr.wikipedia.org/wiki/'


def load(name):
    with open(os.path.join(SOURCES, name), encoding='utf8') as f:
        return json.load(f)


def wiki_url(title):
    return WIKI + quote(title.replace(' ', '_'), safe="_()',-")


def themes_of(node):
    for theme in node.get('themes', []):
        yield theme
    for child in node.get('subcategories', []):
        yield from themes_of(child)


def sentence_count(text):
    protected = text.replace('av. J.-C.', 'av J-C').replace('ap. J.-C.', 'ap J-C')
    protected = re.sub(r'\b([A-Z])\.', r'\1', protected)  # initiales : « J. J. Thomson »
    return len([s for s in re.split(r'(?<=[.!?])\s+(?=[A-ZÉÈÀÂÎ«])', protected.strip()) if s])


def build_events(config):
    """Événements du thème, dans l'ordre chronologique, et la liste des déplacés par thème d'origine."""
    events = []
    deplaces = {}
    for fichier, axe in config['fichiers'].items():
        for src in load(fichier + '.json'):
            event = {'id': src['id'], 'axe': axe, 'date': src['date'], 'titre': src['titre'],
                     'description': src['description'], 'wikipedia': wiki_url(src['wp'])}
            events.append(event)
            if src.get('deplace'):
                deplaces.setdefault(src['deplace'], []).append(src['id'])
    order = {axe: i for i, axe in enumerate(config['axes'])}
    events.sort(key=lambda e: (e['date'], order[e['axe']], e['id']))
    return events, deplaces


def check_events(events, config, existing_ids):
    errors = []
    seen = set()
    for e in events:
        where = f'« {e["id"]} » ({e["titre"]})'
        if e['id'] in seen:
            errors.append(f'{where} : identifiant en double')
        seen.add(e['id'])
        if e['id'] in existing_ids:
            errors.append(f'{where} : identifiant déjà utilisé ailleurs dans le pack')
        if e['axe'] not in config['axes']:
            errors.append(f'{where} : axe inconnu')
        if not isinstance(e['date'], int):
            errors.append(f'{where} : date invalide')
        elif str(e['date']) in e['titre']:
            errors.append(f'{where} : le titre donne l\'année')
        if not 1 <= sentence_count(e['description']) <= 3:
            errors.append(f'{where} : la description doit faire une à trois phrases')
        if not 150 <= len(e['description']) <= 460:
            errors.append(f'{where} : description de {len(e["description"])} caractères (150 à 460 attendus)')
    for ident in config['essentiel']:
        if ident not in seen:
            errors.append(f'incontournable « {ident} » inconnu')
    for axe in config['axes']:
        if not any(e['axe'] == axe for e in events):
            errors.append(f'l\'axe « {axe} » n\'a aucun événement')
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--check', action='store_true', help='valide sans écrire')
    parser.add_argument('--verify', action='store_true',
                        help="vérifie que data/fr.json est à jour avec les sources (code de sortie 1 sinon)")
    args = parser.parse_args()

    config = load('theme.json')
    with open(DATA, encoding='utf8') as f:
        raw = f.read()
    data = json.loads(raw)
    if json.dumps(data, indent=2, ensure_ascii=False) + '\n' != raw:
        sys.exit('data/fr.json n\'a pas le formatage attendu (indent=2, ensure_ascii=False)')

    category = next(c for c in data['categories'] if c['nom'] == CATEGORY)
    subs = category['subcategories']
    # Repart d'un état sans le thème : le script est rejouable.
    subs[:] = [s for s in subs if s['nom'] != config['sousCategorie']]

    events, deplaces = build_events(config)
    themes = {t['id']: t for t in themes_of(data_root(data))}
    nobel_ids = {e['id'] for e in events}
    other_ids = {e['id'] for t in themes.values() for e in t['events']} - nobel_ids
    for origin, ids in deplaces.items():
        # Un événement déplacé est encore dans son thème d'origine à la première exécution ; ensuite non.
        other_ids -= set(ids)
    errors = check_events(events, config, other_ids)

    remplacements = load('medecine_remplacements.json')
    for r in remplacements:
        if r['id'] in other_ids and r['id'] not in {e['id'] for e in themes['thm_med']['events']}:
            errors.append(f'remplacement « {r["id"]} » : identifiant déjà utilisé')
    if errors:
        sys.exit('Sources invalides :\n  - ' + '\n  - '.join(errors))
    if args.check:
        print(f'{len(events)} événements, {len(deplaces)} thèmes d\'origine, sources valides.')
        return

    # 1. retire les événements déplacés (et les incontournables qui les citaient)
    moved = {i for ids in deplaces.values() for i in ids}
    for origin, ids in deplaces.items():
        theme = themes[origin]
        theme['events'] = [e for e in theme['events'] if e['id'] not in ids]
        if 'essentiel' in theme:
            theme['essentiel'] = [i for i in theme['essentiel'] if i not in ids]
    # 2. événements de remplacement dans l'histoire de la médecine, à leur place chronologique
    med = themes['thm_med']
    med['events'] = [e for e in med['events'] if e['id'] not in {r['id'] for r in remplacements}]
    for r in remplacements:
        event = {'id': r['id'], 'axe': r['axe'], 'date': r['date'], 'titre': r['titre'],
                 'description': r['description'], 'wikipedia': wiki_url(r['wp'])}
        index = next((i for i, e in enumerate(med['events']) if e['date'] > event['date']), len(med['events']))
        med['events'].insert(index, event)
    # 3. le thème
    theme = dict(config['theme'])
    theme['events'] = events
    theme['axeOrder'] = config['axes']
    theme['essentiel'] = config['essentiel']
    subs.append({'nom': config['sousCategorie'], 'note': config['note'], 'themes': [theme]})

    total_themes = sum(1 for c in data['categories'] for _ in themes_of(c))
    total_events = sum(len(t['events']) for c in data['categories'] for t in themes_of(c))
    data['totalThemes'] = total_themes
    data['totalEvents'] = total_events
    rebuilt = json.dumps(data, indent=2, ensure_ascii=False) + '\n'
    if args.verify:
        if rebuilt != raw:
            sys.exit('data/fr.json diverge des sources de scripts/nobel/ : relancer python3 scripts/build_nobel.py')
        print('data/fr.json est à jour avec scripts/nobel/.')
        return
    with open(DATA, 'w', encoding='utf8') as f:
        f.write(rebuilt)

    # 4. la carte : les points des événements déplacés les suivent, et un événement qui est le même fait
    #    qu'un autre thème (même lien Wikipédia, même année : la règle de js/linkedEvents.js) en prend le point,
    #    car un fait lié est localisé une fois pour tous ses membres (tests/geo.test.js).
    with open(GEO, encoding='utf8') as f:
        geo_raw = f.read()
    geo = json.loads(geo_raw)
    points = geo['points']
    nobel_id = config['theme']['id']
    renamed = 0
    for key in list(points):
        theme_id, _, event_id = key.partition(':')
        if event_id in moved and theme_id != nobel_id:
            points[nobel_id + ':' + event_id] = points.pop(key)
            renamed += 1
    facts = {}
    for t in themes_of(data_root(data)):
        for e in t['events']:
            key = fact_key(e)
            if key:
                facts.setdefault(key, []).append((t['id'], e['id']))
    linked = 0
    for members in facts.values():
        if not any(t == nobel_id for t, _ in members) or len({t for t, _ in members}) < 2:
            continue
        known = [points[f'{t}:{i}'] for t, i in members if f'{t}:{i}' in points and t != nobel_id]
        if not known:
            continue
        for t, i in members:
            if t == nobel_id and f'{t}:{i}' not in points:
                points[f'{t}:{i}'] = known[0]
                linked += 1
    if renamed or linked:
        with open(GEO, 'w', encoding='utf8') as f:
            f.write(json.dumps(geo, ensure_ascii=False, separators=(',', ':')) + ('\n' if geo_raw.endswith('\n') else ''))
    print(f'{config["theme"]["nom"]} : {len(events)} événements ({len(moved)} déplacés, '
          f'{len(remplacements)} remplacés dans l\'histoire de la médecine) ; {renamed} points de carte suivis, '
          f'{linked} repris de faits liés.')
    print(f'fr.json : {total_themes} thèmes, {total_events} événements.')


def fact_key(event):
    """Identité d'un fait : lien Wikipédia (décodé, minuscules) + année, comme js/linkedEvents.js."""
    url = event.get('wikipedia')
    if not url or not isinstance(event.get('date'), int):
        return None
    return unquote(url).lower() + '|' + str(event['date'])


def data_root(data):
    return {'subcategories': data['categories']}


if __name__ == '__main__':
    main()
