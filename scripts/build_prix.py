#!/usr/bin/env python3
"""Construit les thèmes de « Culture générale > Prix et récompenses » (hors Prix Nobel) dans data/fr.json.

    python3 scripts/build_prix.py            # écrit data/fr.json
    python3 scripts/build_prix.py --check    # valide, n'écrit rien
    python3 scripts/build_prix.py --verify   # data/fr.json reflète-t-il les sources ?

Sources : scripts/prix/<code>.json (un fichier par thème : Oscars, festivals, prix littéraires...) et
scripts/prix/sous_categorie.json (nom et note de la sous-catégorie, partagés avec build_nobel.py).
Relancer le script remplace ces thèmes : ils sont la seule source de vérité de leur contenu, ne pas les
retoucher à la main dans fr.json. Le thème Prix Nobel a son propre script (scripts/build_nobel.py).

Règles (vérifiées ici, puis par tests/prix.test.js) :
  - la date d'un événement est l'année du prix, celle où il est décerné (la cérémonie) ;
  - la description dit ce qui est récompensé et pourquoi cela a compté ;
  - le titre ne donne pas l'année (ce serait donner la réponse) ;
  - un événement porte un axe connu et un identifiant unique dans tout le pack.
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
SOURCES = os.path.join(ROOT, 'scripts', 'prix')
CATEGORY = 'Culture générale'
WIKI = 'https://fr.wikipedia.org/wiki/'
# Ordre des thèmes dans la sous-catégorie (le Prix Nobel est toujours le premier).
CODES = ['oscars', 'festivals', 'litteraires', 'sciences', 'sport', 'musique']


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
    protected = re.sub(r'\b([A-Z])\.', r'\1', protected)  # initiales : « J. R. R. Tolkien »
    return len([s for s in re.split(r'(?<=[.!?])\s+(?=[A-ZÉÈÀÂÎ«])', protected.strip()) if s])


def build_theme(code):
    src = load(code + '.json')
    order = {axe: i for i, axe in enumerate(src['axes'])}
    events = [{'id': e['id'], 'axe': e['axe'], 'date': e['date'], 'titre': e['titre'],
               'description': e['description'], 'wikipedia': wiki_url(e['wp'])} for e in src['events']]
    events.sort(key=lambda e: (e['date'], order.get(e['axe'], 99), e['id']))
    theme = dict(src['theme'])
    theme['events'] = events
    theme['axeOrder'] = src['axes']
    theme['essentiel'] = src['essentiel']
    return theme


def check_theme(theme, other_ids):
    errors = []
    seen = set()
    for e in theme['events']:
        where = f'{theme["id"]} « {e["id"]} » ({e["titre"]})'
        if e['id'] in seen or e['id'] in other_ids:
            errors.append(f'{where} : identifiant déjà utilisé')
        seen.add(e['id'])
        if e['axe'] not in theme['axeOrder']:
            errors.append(f'{where} : axe inconnu « {e["axe"]} »')
        if not isinstance(e['date'], int):
            errors.append(f'{where} : date invalide')
        elif str(e['date']) in e['titre']:
            errors.append(f'{where} : le titre donne l\'année')
        if not 1 <= sentence_count(e['description']) <= 3:
            errors.append(f'{where} : la description doit faire une à trois phrases')
        if not 150 <= len(e['description']) <= 460:
            errors.append(f'{where} : description de {len(e["description"])} caractères (150 à 460 attendus)')
    for ident in theme['essentiel']:
        if ident not in seen:
            errors.append(f'{theme["id"]} : incontournable « {ident} » inconnu')
    for axe in theme['axeOrder']:
        if not any(e['axe'] == axe for e in theme['events']):
            errors.append(f'{theme["id"]} : l\'axe « {axe} » n\'a aucun événement')
    return errors


def fact_key(event):
    """Identité d'un fait : lien Wikipédia (décodé, minuscules) + année, comme js/linkedEvents.js."""
    url = event.get('wikipedia')
    if not url or not isinstance(event.get('date'), int):
        return None
    return unquote(url).lower() + '|' + str(event['date'])


def link_geo(data, mine):
    """Un événement qui est le même fait qu'un autre thème (même lien Wikipédia, même année) en prend le point :
    un fait lié est localisé une fois pour tous ses membres (tests/geo.test.js)."""
    with open(GEO, encoding='utf8') as f:
        raw = f.read()
    geo = json.loads(raw)
    points = geo['points']
    alive = {f'{t["id"]}:{e["id"]}' for t in themes_of({'subcategories': data['categories']}) for e in t['events']}
    for key in [k for k in points if k.partition(':')[0] in mine and k not in alive]:
        del points[key]
    facts = {}
    for t in themes_of({'subcategories': data['categories']}):
        for e in t['events']:
            key = fact_key(e)
            if key:
                facts.setdefault(key, []).append((t['id'], e['id']))
    linked = 0
    for members in facts.values():
        if len({t for t, _ in members}) < 2 or not any(t in mine for t, _ in members):
            continue
        known = [points[f'{t}:{i}'] for t, i in members if t not in mine and f'{t}:{i}' in points]
        if not known:
            continue
        for t, i in members:
            if t in mine and f'{t}:{i}' not in points:
                points[f'{t}:{i}'] = known[0]
                linked += 1
    out = json.dumps(geo, ensure_ascii=False, separators=(',', ':')) + ('\n' if raw.endswith('\n') else '')
    if out != raw:
        with open(GEO, 'w', encoding='utf8') as f:
            f.write(out)
    return linked


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--check', action='store_true', help='valide sans écrire')
    parser.add_argument('--verify', action='store_true',
                        help="vérifie que data/fr.json est à jour avec les sources (code de sortie 1 sinon)")
    args = parser.parse_args()

    shared = load('sous_categorie.json')
    with open(DATA, encoding='utf8') as f:
        raw = f.read()
    data = json.loads(raw)
    if json.dumps(data, indent=2, ensure_ascii=False) + '\n' != raw:
        sys.exit('data/fr.json n\'a pas le formatage attendu (indent=2, ensure_ascii=False)')

    category = next(c for c in data['categories'] if c['nom'] == CATEGORY)
    sous = next((s for s in category['subcategories'] if s['nom'] == shared['nom']), None)
    if not sous:
        sys.exit(f'sous-catégorie « {shared["nom"]} » absente : lancer d\'abord scripts/build_nobel.py')
    themes = [build_theme(code) for code in CODES if os.path.exists(os.path.join(SOURCES, code + '.json'))]
    mine = {t['id'] for t in themes}
    sous['themes'] = [t for t in sous['themes'] if t['id'] not in mine]
    sous['note'] = shared['note']
    others = {e['id'] for t in themes_of({'subcategories': data['categories']}) for e in t['events']}
    errors = []
    for theme in themes:
        errors += check_theme(theme, others)
        others |= {e['id'] for e in theme['events']}
    if errors:
        sys.exit('Sources invalides :\n  - ' + '\n  - '.join(errors))
    if args.check:
        print(', '.join(f'{t["nom"]} ({len(t["events"])})' for t in themes) + ' : sources valides.')
        return

    nobel = [t for t in sous['themes'] if t['id'] == 'thm_nobel']
    rest = [t for t in sous['themes'] if t['id'] != 'thm_nobel']
    sous['themes'] = nobel + rest + themes

    data['totalThemes'] = sum(1 for c in data['categories'] for _ in themes_of(c))
    data['totalEvents'] = sum(len(t['events']) for c in data['categories'] for t in themes_of(c))
    rebuilt = json.dumps(data, indent=2, ensure_ascii=False) + '\n'
    if args.verify:
        if rebuilt != raw:
            sys.exit('data/fr.json diverge des sources de scripts/prix/ : relancer python3 scripts/build_prix.py')
        print('data/fr.json est à jour avec scripts/prix/.')
        return
    with open(DATA, 'w', encoding='utf8') as f:
        f.write(rebuilt)
    linked = link_geo(data, mine)
    print(', '.join(f'{t["nom"]} ({len(t["events"])})' for t in themes) + f' ; {linked} points de carte repris de faits liés.')
    print(f'fr.json : {data["totalThemes"]} thèmes, {data["totalEvents"]} événements.')


if __name__ == '__main__':
    main()
