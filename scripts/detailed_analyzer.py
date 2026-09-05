import json
import re
import sys
from collections import Counter
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

# Let's inspect the last 1 or 2 words of long titles
last_1 = Counter()
last_2 = Counter()
for p, ev in long_events:
    words = ev['titre'].split()
    last_1[words[-1]] += 1
    last_2[' '.join(words[-2:])] += 1

print("Top 20 last words:")
for w, c in last_1.most_common(20):
    print(f"  {w}: {c}")

print("\nTop 20 last 2-word pairs:")
for w, c in last_2.most_common(20):
    print(f"  '{w}': {c}")
