import json
import sys
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')

with open('data/fr.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

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

recurse(d)

long_events = [(p, ev) for p, ev in events if len(ev.get('titre', '').split()) in (7, 8)]

print(f"Total long events: {len(long_events)}")

# Check what words are most common across all long titles
words_counter = Counter()
for p, ev in long_events:
    for w in ev['titre'].split():
        words_counter[w] += 1

print("Top words in long titles:")
for w, c in words_counter.most_common(30):
    print(f"  {w}: {c}")
