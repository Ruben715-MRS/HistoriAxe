import json
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('data/fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

events = []
def recurse(node, path=""):
    if isinstance(node, dict):
        if 'events' in node and isinstance(node['events'], list):
            theme_nom = node.get('nom', 'Unknown')
            for ev in node['events']:
                events.append((path + " > " + theme_nom, ev))
        for k, v in node.items():
            if k != 'events':
                name = node.get('nom', '')
                new_path = path + (" > " + name if name and k in ['categories', 'subcategories', 'themes'] else "")
                recurse(v, new_path)
    elif isinstance(node, list):
        for item in node:
            recurse(item, path)

recurse(data)

bio_long = [(p, ev) for p, ev in events if 'Biographies' in p and len(ev.get('titre', '').split()) in (7, 8)]
print(f'Total long events in Biographies: {len(bio_long)}')
for p, ev in bio_long[:40]:
    t = ev['titre']
    th = p.split('>')[-1].strip()
    print(f'[{len(t.split())}w] ({th}) {t}')
