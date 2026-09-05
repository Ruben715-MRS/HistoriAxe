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
events_7w = [ev['titre'] for p, ev in events if len(ev.get('titre', '').split()) == 7]

# Let's see what 1-word removals or replacements can fix 7w events
# For instance, common adverbs, adjectives, articles, prepositions
word_freq = Counter()
for t in events_7w:
    for w in t.split():
        word_freq[w] += 1

print("Top words in 7w events:")
for w, c in word_freq.most_common(25):
    print(f"  {w:12s}: {c}")
