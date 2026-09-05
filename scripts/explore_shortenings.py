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
            recurse(item)

recurse(data)
long_events = [(p, ev) for p, ev in events if len(ev.get('titre', '').split()) in (7, 8)]

# Let's inspect frequent multi-word sequences in these 7055 titles
ngrams = Counter()
for p, ev in long_events:
    words = ev['titre'].split()
    for n in [2, 3, 4]:
        for i in range(len(words) - n + 1):
            ngrams[' '.join(words[i:i+n])] += 1

print("Top 3-word ngrams in long titles:")
for ng, cnt in [(k, v) for k, v in ngrams.items() if len(k.split()) == 3 and v >= 20]:
    print(f"  '{ng}': {cnt}")
