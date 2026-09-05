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
            recurse(item)

recurse(data)
long_events = [(p, ev) for p, ev in events if len(ev.get('titre', '').split()) in (7, 8)]

print(f"Total long events: {len(long_events)}")

# Let's count how many match some frequent phrases
phrases = [
    "au sein de la", "au sein du", "au sein des", "au sein d'",
    "met au point", "met en place", "prend la tête de",
    "sous le règne de", "sous le commandement de", "sous la présidence de",
    "à la suite de la", "à la suite du", "à la suite d'",
    "dans le cadre de", "dans le cadre du", "dans le cadre d'",
    "à l'occasion de", "à l'occasion du", "à l'occasion d'",
    "pour la première fois",
    "dans une famille", "dans une famille de",
    "à travers le monde", "dans le monde entier",
    "par l'intermédiaire de",
    "à la bataille de", "à la bataille d'",
    "vers le monde",
    "de la ville de", "de la ville d'",
    "du royaume de", "du royaume d'",
    "de l'empire", "de l'Empire",
    "du président", "du premier ministre",
    "des États-Unis",
    "de la république", "de la République",
    "à l'université de", "à l'université d'",
    "à la cour de", "à la cour d'",
]

matches = {ph: 0 for ph in phrases}
for p, ev in long_events:
    t = ev['titre']
    for ph in phrases:
        if ph in t.lower():
            matches[ph] += 1

print("Matches for selected locutions:")
for ph, c in sorted(matches.items(), key=lambda x: x[1], reverse=True):
    if c > 5:
        print(f"  '{ph}': {c}")
