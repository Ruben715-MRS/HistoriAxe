import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('data/fr.json', encoding='utf-8') as f:
    data = json.load(f)

print('=== Themes >= 30 events where events have NO axe field ===')
found = 0
for cat in data['categories']:
    for sub in cat.get('subcategories', []):
        for theme in sub.get('themes', []):
            events = theme.get('events', [])
            nom = theme['nom']
            if len(events) >= 30:
                no_axe = [e for e in events if not e.get('axe')]
                has_axe = [e for e in events if e.get('axe')]
                if len(no_axe) == len(events):
                    print(f'  FULL NO-AXE [{len(events):3d}] {nom}')
                    found += 1
                elif len(no_axe) > 0:
                    print(f'  PARTIAL [{len(events):3d}] {nom} — {len(no_axe)} without / {len(has_axe)} with axe')
                    found += 1

if found == 0:
    print('  None — all themes >= 30 events already have axe on every event.')
    print()
    print('  Conclusion: the axeOrder additions were the right approach,')
    print('  since all events already had axe values but the order was undefined.')
