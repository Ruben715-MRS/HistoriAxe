import json
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

theme_counts = Counter()
for p, ev in events:
    if len(ev.get('titre', '').split()) in (7, 8):
        theme_counts[p] += 1

print(f"Themes with long titles: {len(theme_counts)}")
print("Top 25 themes with most long titles:")
for th, cnt in theme_counts.most_common(25):
    th_name = th.split('>')[-1].strip()
    print(f"  {cnt:3d} : {th_name}")
