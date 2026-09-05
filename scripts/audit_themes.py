import json
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('data/fr.json', encoding='utf-8') as f:
    data = json.load(f)

themes_info = []
for cat in data['categories']:
    for sub in cat.get('subcategories', []):
        for theme in sub.get('themes', []):
            events = theme.get('events', [])
            axes = theme.get('axes', [])
            themes_info.append({
                'cat': cat['nom'],
                'sub': sub['nom'],
                'theme': theme['nom'],
                'theme_id': theme.get('id', ''),
                'count': len(events),
                'has_axes': len(axes) > 0,
                'axes_count': len(axes),
                'axes_names': [a.get('nom', a.get('name', '?')) for a in axes]
            })

themes_info.sort(key=lambda x: x['count'], reverse=True)

big = [t for t in themes_info if t['count'] >= 30]

print(f'Total themes: {len(themes_info)}')
print(f'Themes >= 30 events: {len(big)}')
print(f'Themes >= 30 WITH axes: {sum(1 for t in big if t["has_axes"])}')
print(f'Themes >= 30 WITHOUT axes: {sum(1 for t in big if not t["has_axes"])}')
print()
print('=== THEMES >= 30 events ===')
for t in big:
    axes_str = f'({t["axes_count"]} axes)' if t['has_axes'] else '(NO AXES)'
    print(f'  [{t["count"]:3d}] {axes_str:16s} | {t["theme"]}')
    if t['has_axes']:
        for a in t['axes_names']:
            print(f'         > {a}')
