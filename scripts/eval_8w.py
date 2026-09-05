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
print(f"Total long events to shorten: {len(long_events)}")

# Let's inspect all 8-word titles (3940 events)
titles_8w = [ev['titre'] for p, ev in long_events if len(ev['titre'].split()) == 8]
print(f"8-word titles count: {len(titles_8w)}")
for t in titles_8w[:25]:
    print(" ", t)
