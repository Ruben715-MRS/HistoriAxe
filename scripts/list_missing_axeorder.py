import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('data/fr.json', encoding='utf-8') as f:
    data = json.load(f)

# For all themes >= 30 events WITHOUT axeOrder, show their existing axes
print("=== Themes >= 30 events WITHOUT axeOrder ===\n")
for cat in data['categories']:
    for sub in cat.get('subcategories', []):
        for theme in sub.get('themes', []):
            events = theme.get('events', [])
            if len(events) >= 30 and 'axeOrder' not in theme:
                unique_axes = list(dict.fromkeys([e.get('axe') for e in events if e.get('axe')]))
                print(f"[{len(events):3d}] {theme['nom']}")
                for a in unique_axes:
                    count = sum(1 for e in events if e.get('axe') == a)
                    print(f"      [{count:3d}] {a}")
                print()
