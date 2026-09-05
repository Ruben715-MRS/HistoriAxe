import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('data/fr.json', encoding='utf-8') as f:
    data = json.load(f)

# Find all themes with axeOrder or axes array defined
print("=== Themes WITH axeOrder defined ===")
found = 0
for cat in data['categories']:
    for sub in cat.get('subcategories', []):
        for theme in sub.get('themes', []):
            if 'axeOrder' in theme or 'axes' in theme:
                events = theme.get('events', [])
                print(f"  [{len(events):3d}] {theme['nom']}")
                if 'axeOrder' in theme:
                    print(f"       axeOrder: {theme['axeOrder']}")
                if 'axes' in theme:
                    print(f"       axes: {json.dumps(theme['axes'], ensure_ascii=False)[:200]}")
                found += 1
if found == 0:
    print("  (none)")

print()
print("=== All unique field names in theme objects ===")
all_keys = set()
for cat in data['categories']:
    for sub in cat.get('subcategories', []):
        for theme in sub.get('themes', []):
            all_keys.update(theme.keys())
print(sorted(all_keys))
