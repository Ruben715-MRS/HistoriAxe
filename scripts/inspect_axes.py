import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('data/fr.json', encoding='utf-8') as f:
    data = json.load(f)

# Examine the biggest themes and their existing axe values on events
themes_to_check = []
for cat in data['categories']:
    for sub in cat.get('subcategories', []):
        for theme in sub.get('themes', []):
            events = theme.get('events', [])
            if len(events) >= 30:
                themes_to_check.append(theme)

themes_to_check.sort(key=lambda t: len(t['events']), reverse=True)

# Show top 5 biggest
for theme in themes_to_check[:5]:
    events = theme['events']
    unique_axes = list(dict.fromkeys([e.get('axe') for e in events if e.get('axe')]))
    print(f"\n=== {theme['nom']} ({len(events)} events) ===")
    print(f"Unique axes: {len(unique_axes)}")
    for a in unique_axes:
        count = sum(1 for e in events if e.get('axe') == a)
        print(f"  [{count:3d}] {a}")
