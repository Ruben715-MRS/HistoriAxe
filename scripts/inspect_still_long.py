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
long_events = [(p, ev) for p, ev in events if len(ev.get('titre', '').split()) in (7, 8)]

sys.path.insert(0, '.')
from scripts.test_comprehensive import process_title

still = []
for p, ev in long_events:
    res = process_title(ev.get('id', ''), ev['titre'], p)
    if len(res.split()) > 6:
        still.append((p, ev.get('id', ''), ev['titre'], res))

print(f"Still long: {len(still)}")
for p, eid, orig, curr in still[:30]:
    print(f"[{len(curr.split())}w] ({eid}) '{curr}' (orig: '{orig}')")
