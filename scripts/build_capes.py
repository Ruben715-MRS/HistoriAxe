#!/usr/bin/env python3
"""Écrit les événements des 22 thèmes de « CAPES & Agrégation » dans data/fr.json.

    python3 scripts/build_capes.py            # écrit data/fr.json
    python3 scripts/build_capes.py --check    # valide, n'écrit rien
    python3 scripts/build_capes.py --verify   # data/fr.json reflète-t-il les sources ?
    python3 scripts/build_capes.py --export   # réécrit les sources en entier depuis data/fr.json

Sources : scripts/capes/<code>.json, un fichier par thème (voir scripts/capes/README.md). Elles sont la
seule source de vérité des événements de ces thèmes ; le sommaire (`carteMentale`), la difficulté et
l'identifiant du thème restent dans data/fr.json et ne sont pas touchés (sauf le rattachement d'un repère
à son événement, voir « reperes » ci-dessous).

Un fichier source :
    {
      "theme": "thm_grc",
      "essentiel": ["grc1", ...],              # les ⭐ Incontournables
      "reperes": [{"texte": "Début du texte du repère", "eventId": "grc12"}],   # facultatif
      "axes": ["Axe A", "Axe B"],              # facultatif : ordre des axes (peut en introduire de nouveaux)
      "events": [
        {"id", "axe", "date", "titre", "description", "wp" | "ws"},   # événement complet ("axe" : le texte,
                                                                      # ou son rang dans l'ordre des axes)
        {"id": "grc3", "description": "..."}                          # événement existant : seuls les champs
      ]                                                               # donnés remplacent ceux de data/fr.json
    }
`wp` est le titre d'un article de Wikipédia, `ws` une recherche (lien `w/index.php?search=`, qui mène à
l'article quand le terme est exact) ; un événement existant garde son lien sauf s'il en donne un autre.

Règles (vérifiées ici) :
  - description en trois phrases : ce qu'est l'événement et son contexte, puis pourquoi il pèse dans le
    thème (sans le dire en toutes lettres) ;
  - un axe connu du thème, un identifiant unique dans tout le pack, une date entière ;
  - le titre ne contient pas de date ;
  - les événements restent groupés par axe (ordre d'apparition des axes), puis par date.
"""
import argparse
import json
import os
import re
import sys
from urllib.parse import quote, quote_plus

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data', 'fr.json')
SOURCES = os.path.join(ROOT, 'scripts', 'capes')
CATEGORY = 'CAPES & Agrégation'
WIKI = 'https://fr.wikipedia.org/wiki/'
SEARCH = 'https://fr.wikipedia.org/w/index.php?search='
DESC_MIN, DESC_MAX = 220, 760


def wiki_url(title):
    return WIKI + quote(title.replace(' ', '_'), safe="_()',-")


def search_url(term):
    return SEARCH + quote_plus(term)


def sentence_count(text):
    protected = text.replace('av. J.-C.', 'av J-C').replace('ap. J.-C.', 'ap J-C')
    protected = protected.replace('av. n.è.', 'av ne').replace('apr. J.-C.', 'apr J-C')
    protected = re.sub(r'\b([A-Z])\.', r'\1', protected)  # initiales
    protected = re.sub(r'\b(vol|n°|p|pp|c|cf|env|etc|St|Ste|Mgr|Dr)\.', r'\1', protected)
    return len([s for s in re.split(r'(?<=[.!?])\s+(?=[A-ZÉÈÀÂÎÔÇ«"“(])', protected.strip()) if s])


def load_data():
    with open(DATA, encoding='utf8') as f:
        return json.load(f)


def capes_themes(data):
    cat = next(c for c in data['categories'] if c['nom'] == CATEGORY)
    return cat['themes']


def source_files():
    return sorted(f for f in os.listdir(SOURCES) if f.endswith('.json'))


def load_source(name):
    with open(os.path.join(SOURCES, name), encoding='utf8') as f:
        return json.load(f)


def build_events(theme, src):
    """Événements du thème : ceux de data/fr.json recouverts par la source, plus les nouveaux."""
    existing = {e['id']: e for e in theme['events']}
    axes = list(src.get('axes', []))
    for e in theme['events']:
        if e['axe'] not in axes:
            axes.append(e['axe'])
    out = {}
    order = {}
    for i, e in enumerate(theme['events']):
        order[e['id']] = i
    for s in src['events']:
        base = dict(existing.get(s['id'], {}))
        new = s['id'] not in existing
        for k, v in s.items():
            if k in ('wp', 'ws', 'url'):
                continue
            base[k] = v
        if 'url' in s:
            base['wikipedia'] = s['url']
        if 'wp' in s:
            base['wikipedia'] = wiki_url(s['wp'])
        elif 'ws' in s:
            base['wikipedia'] = search_url(s['ws'])
        for k in ('titre', 'description'):
            if k in base:
                base[k] = base[k].replace("'", '’')
        if isinstance(base.get('axe'), int):
            base['axe'] = axes[base['axe']]
        if new:
            order[s['id']] = 10 ** 6 + len(order)
        if base.get('axe') not in axes and new:
            axes.append(base.get('axe'))
        out[s['id']] = {k: base[k] for k in ('id', 'axe', 'date', 'titre', 'description', 'wikipedia') if k in base}
        for k in base:
            if k not in out[s['id']]:
                out[s['id']][k] = base[k]
    # un événement existant que la source ne mentionne pas est conservé tel quel
    for i, e in existing.items():
        out.setdefault(i, e)
    events = sorted(out.values(), key=lambda e: (axes.index(e['axe']) if e['axe'] in axes else 99, e['date'], order[e['id']]))
    return events


def check_theme(theme, events, src, other_ids):
    errors = []
    axes = {e['axe'] for e in theme['events']} | set(src.get('axes', []))
    ids = set()
    for e in events:
        where = f'{theme["id"]} « {e["id"]} » ({e["titre"]})'
        if e['id'] in ids or e['id'] in other_ids:
            errors.append(f'{where} : identifiant déjà utilisé')
        ids.add(e['id'])
        if e['axe'] not in axes:
            errors.append(f'{where} : axe inconnu « {e["axe"]} »')
        if not isinstance(e['date'], int) or isinstance(e['date'], bool):
            errors.append(f'{where} : date non entière')
        if re.search(r'\b(1\d{3}|20\d{2}|\d{3})\b', e['titre'].replace('Port 2000', '')) and not re.search(r'(Louis|Pie|Léon|Grégoire|Innocent|Urbain|Jean|Henri|Charles|Clément|Boniface|Alexandre|Édouard|Philippe|Guillaume|Frédéric|Richard)\s+[IVX\d]+', e['titre']):
            errors.append(f'{where} : le titre contient une date')
        n = sentence_count(e['description'])
        if n != 3:
            errors.append(f'{where} : {n} phrases au lieu de 3')
        if not DESC_MIN <= len(e['description']) <= DESC_MAX:
            errors.append(f'{where} : description de {len(e["description"])} caractères')
        if not e.get('wikipedia', '').startswith('https://fr.wikipedia.org/'):
            errors.append(f'{where} : lien Wikipédia absent')
    for i in src.get('essentiel', []):
        if i not in ids:
            errors.append(f'{theme["id"]} : incontournable inconnu « {i} »')
    return errors


def apply(data, only=None):
    themes = {t['id']: t for t in capes_themes(data)}
    all_ids = {}
    for t in themes.values():
        for e in t['events']:
            all_ids[e['id']] = t['id']
    # identifiants du reste du pack, pour refuser les collisions
    outside = set()

    def walk(node):
        for t in node.get('themes', []) or []:
            if t['id'] not in themes:
                outside.update(e['id'] for e in t['events'])
        for c in node.get('subcategories', []) or []:
            walk(c)
    for c in data['categories']:
        walk(c)
    errors = []
    built = {}
    for name in source_files():
        src = load_source(name)
        theme = themes[src['theme']]
        if only and theme['id'] not in only:
            continue
        events = build_events(theme, src)
        errors += check_theme(theme, events, src, outside)
        built[theme['id']] = (events, src)
    return themes, built, errors


def reperes_fix(theme, src):
    left = []
    for fix in src.get('reperes', []):
        hit = False
        for b in theme['carteMentale']['branches']:
            for r in b.get('reperes', []) or []:
                if r['texte'].startswith(fix['texte']):
                    r['eventId'] = fix['eventId']
                    hit = True
        if not hit:
            left.append(fix['texte'])
    return left


def recount(data):
    themes = events = 0

    def walk(node):
        nonlocal themes, events
        for t in node.get('themes', []) or []:
            themes += 1
            events += len(t['events'])
        for c in node.get('subcategories', []) or []:
            walk(c)
    for c in data['categories']:
        walk(c)
    data['totalThemes'], data['totalEvents'] = themes, events


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--verify', action='store_true')
    ap.add_argument('--export', action='store_true')
    ap.add_argument('--only', nargs='*')
    args = ap.parse_args()
    data = load_data()

    if args.export:
        for t in capes_themes(data):
            code = t['id'].replace('thm_', '')
            path = os.path.join(SOURCES, code + '.json')
            old = json.load(open(path, encoding='utf8')) if os.path.exists(path) else {}
            events = []
            for e in t['events']:
                events.append({'id': e['id'], 'axe': e['axe'], 'date': e['date'], 'titre': e['titre'],
                               'description': e['description'], 'url': e['wikipedia']})
            doc = {'theme': t['id'], 'essentiel': t['essentiel'], 'events': events}
            if old.get('reperes'):
                doc['reperes'] = old['reperes']
            with open(path, 'w', encoding='utf8') as f:
                json.dump(doc, f, ensure_ascii=False, indent=1)
                f.write('\n')
        print('sources exportées')
        return 0

    themes, built, errors = apply(data, args.only)
    if errors:
        print('\n'.join(errors[:80]))
        print(f'{len(errors)} erreur(s)')
        return 1
    if args.verify:
        bad = [tid for tid, (events, src) in built.items() if events != themes[tid]['events']]
        print('divergences :', bad or 'aucune')
        return 1 if bad else 0
    left_all = []
    for tid, (events, src) in built.items():
        print(f'{tid}: {len(themes[tid]["events"])} -> {len(events)} événements')
        if args.check:
            continue
        themes[tid]['events'] = events
        if 'essentiel' in src:
            themes[tid]['essentiel'] = src['essentiel']
        left_all += [f'{tid}: repère introuvable « {t} »' for t in reperes_fix(themes[tid], src)]
    if left_all:
        print('\n'.join(left_all))
        return 1
    if not args.check:
        recount(data)
        with open(DATA, 'w', encoding='utf8') as f:
            f.write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
        print('data/fr.json écrit :', data['totalThemes'], 'thèmes,', data['totalEvents'], 'événements')
    return 0


if __name__ == '__main__':
    sys.exit(main())
