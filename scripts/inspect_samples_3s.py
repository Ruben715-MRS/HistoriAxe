import json
import sys
from analyze_sentences import split_sentences

sys.stdout.reconfigure(encoding='utf-8')

with open('data/fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

events = []
def recurse(node, theme=''):
    if isinstance(node, dict):
        t = node.get('nom', theme)
        if 'events' in node and isinstance(node['events'], list):
            for ev in node['events']:
                events.append((t, ev))
        for k, v in node.items():
            if k != 'events':
                recurse(v, t)
    elif isinstance(node, list):
        for item in node:
            recurse(item, theme)

recurse(data)

three_s = [(t, ev) for t, ev in events if len(split_sentences(ev.get('description', ''))) == 3]
print(f"Total 3-sentence events: {len(three_s)}")

step = len(three_s) // 8
for i in range(0, len(three_s), step)[:8]:
    t, ev = three_s[i]
    print('='*70)
    print(f"Thème: {t} | Titre: {ev['titre']} ({ev.get('date')}) [ID: {ev.get('id')}]")
    sents = split_sentences(ev['description'])
    for idx, s in enumerate(sents):
        print(f"  [P{idx+1}] {s}")
