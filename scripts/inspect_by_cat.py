import json
import sys
from collections import defaultdict
sys.stdout.reconfigure(encoding='utf-8')

with open('data/fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

events_by_cat = defaultdict(list)
def recurse(node, current_cat="", theme_nom=""):
    if isinstance(node, dict):
        if 'events' in node and isinstance(node['events'], list):
            for ev in node['events']:
                events_by_cat[current_cat].append((theme_nom, ev))
        for k, v in node.items():
            if k == 'categories':
                for cat in v:
                    recurse(cat, cat.get('nom', 'Autre'), theme_nom)
            elif k in ['subcategories', 'themes']:
                for item in v:
                    th = item.get('nom', theme_nom) if k == 'themes' else theme_nom
                    recurse(item, current_cat, th)
            elif k != 'events':
                recurse(v, current_cat, theme_nom)
    elif isinstance(node, list):
        for item in node:
            recurse(item, current_cat, theme_nom)

recurse(data)

for cat, evts in events_by_cat.items():
    long_e = [(th, e) for th, e in evts if len(e.get('titre', '').split()) in (7, 8)]
    print(f"=== {cat} (Total {len(evts)}, >6w: {len(long_e)}) ===")
    for th, e in long_e[:10]:
        print(f"  [{len(e['titre'].split())}w] ({th}) {e['titre']}")
