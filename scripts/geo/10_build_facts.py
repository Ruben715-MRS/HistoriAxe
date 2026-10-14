#!/usr/bin/env python3
"""Étape 1 / 1 : construit la liste des FAITS à localiser et les lots d'annotation.

Un fait = un événement, ou un groupe d'événements reliés entre thèmes (même
lien Wikipédia ET même année, la règle de js/linkedEvents.js). Un fait n'est
localisé qu'une fois ; tous ses membres reçoivent le même point.

Sorties (scripts/geo/work/, non versionné) :
  facts.json            tous les faits (représentant + membres)
  batches/NNN.json      lots de ~50 faits à faire lire (même thème regroupé)
Usage : 10_build_facts.py [--themes thm_a,thm_b,...] [--size 50] [--prefix p]
"""
import json, sys, os, urllib.parse, collections, argparse

ROOT = os.path.join(os.path.dirname(__file__), '..', '..')
WORK = os.path.join(os.path.dirname(__file__), 'work')
CAT_RANK = {'Culture générale': 0, 'Histoires nationales': 1, 'Programmes scolaires': 2, 'CAPES & Agrégation': 3, 'Personnages illustres': 4}


def fact_key(e):
    if not e.get('wikipedia') or not isinstance(e.get('date'), (int, float)):
        return None
    return urllib.parse.unquote(e['wikipedia']).lower() + '|' + str(e['date'])


def load():
    d = json.load(open(os.path.join(ROOT, 'data', 'fr.json')))
    entries = []
    def walk(n, cat, path):
        for sub in n.get('subcategories', []) or []:
            walk(sub, cat, path + [sub.get('nom')])
        for t in n.get('themes', []) or []:
            for e in t.get('events', []) or []:
                entries.append({'cat': cat, 'theme': t['id'], 'themeNom': t.get('nom') or t['id'], 'ev': e, 'themeSize': len(t.get('events', []))})
    for c in d['categories']:
        walk(c, c['nom'], [c['nom']])
    return entries


def score(m):
    """Fiche la plus pertinente d'un groupe : description développée sans excès,
    titre portant un seul fait, thème généraliste. Même règle côté jeu (étape 2)."""
    e = m['ev']; L = len(e.get('description') or '')
    s = 0.0
    s += 3.0 - abs(L - 350) / 150.0 if L else -3
    s -= 0.8 * sum(1 for w in (' et ', ', ', ' puis ') if w in e['titre'])
    s -= len(e['titre']) / 80.0
    s += 2.0 * (4 - CAT_RANK.get(m['cat'], 4)) / 4
    s += min(m['themeSize'], 400) / 400.0
    return s


def build():
    entries = load()
    groups = collections.defaultdict(list)
    for m in entries:
        k = fact_key(m['ev'])
        groups[k if k else id(m)].append(m)
    facts = []
    for k, members in groups.items():
        multi = len({m['theme'] for m in members}) >= 2
        parts = [members] if multi else [[m] for m in members]
        for p in parts:
            rep = max(p, key=score)
            facts.append({'id': f"{rep['theme']}:{rep['ev']['id']}", 'date': rep['ev']['date'], 'titre': rep['ev']['titre'],
                          'description': rep['ev'].get('description', ''), 'wikipedia': rep['ev'].get('wikipedia', ''),
                          'cat': rep['cat'], 'themes': sorted({m['themeNom'] for m in p}),
                          'members': sorted({f"{m['theme']}:{m['ev']['id']}" for m in p})})
    return facts


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--themes'); ap.add_argument('--size', type=int, default=50); ap.add_argument('--prefix', default='b'); ap.add_argument('--rest', action='store_true', help='tous les faits pas encore annotés (work/annot), par catégorie puis thème')
    a = ap.parse_args()
    facts = build()
    os.makedirs(os.path.join(WORK, 'batches'), exist_ok=True)
    json.dump(facts, open(os.path.join(WORK, 'facts.json'), 'w'), ensure_ascii=False)
    print(len(facts), 'faits;', sum(len(f['members']) for f in facts), 'événements')
    print(collections.Counter(f['cat'] for f in facts))
    if a.themes or a.rest:
        if a.rest:
            import glob
            done = set()
            for fn in glob.glob(os.path.join(WORK, 'annot', '*.json')):
                done.update(x['id'] for x in json.load(open(fn)))
            sel = [f for f in facts if f['id'] not in done]
            sel.sort(key=lambda f: (CAT_RANK.get(f['cat'], 9), f['id'].split(':')[0], f['date']))
        else:
            wanted = set(a.themes.split(','))
            sel = [f for f in facts if f['id'].split(':')[0] in wanted]
            sel.sort(key=lambda f: (f['id'].split(':')[0], f['date']))
        for i in range(0, len(sel), a.size):
            chunk = sel[i:i + a.size]
            out = [{'id': f['id'], 'date': f['date'], 'titre': f['titre'], 'description': f['description'][:280],
                    'themes': f['themes'], 'wikipedia': f['wikipedia'].split('/wiki/')[-1]} for f in chunk]
            json.dump(out, open(os.path.join(WORK, 'batches', f"{a.prefix}{i // a.size:03d}.json"), 'w'), ensure_ascii=False, indent=0)
        print('lots écrits :', (len(sel) + a.size - 1) // a.size, 'pour', len(sel), 'faits')
