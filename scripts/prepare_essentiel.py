"""
Prépare un fichier JSON compact listant les événements de chaque thème >= 30 events
pour que les sous-agents puissent sélectionner les 30 incontournables.
Exclut les thèmes avec exactement 30 events (inutile).
"""
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

with open('data/fr.json', encoding='utf-8') as f:
    data = json.load(f)

themes_data = []
for cat in data['categories']:
    for sub in cat.get('subcategories', []):
        for theme in sub.get('themes', []):
            events = theme.get('events', [])
            n = len(events)
            if n > 30:  # strictly > 30, skip themes with exactly 30
                # Build compact event list: id, titre, axe, date
                compact_events = []
                for e in events:
                    compact_events.append({
                        'id': e['id'],
                        'titre': e.get('titre', ''),
                        'axe': e.get('axe', ''),
                        'date': e.get('date', 0)
                    })
                themes_data.append({
                    'theme_id': theme.get('id', ''),
                    'theme_nom': theme['nom'],
                    'event_count': n,
                    'events': compact_events
                })

# Sort by event count desc
themes_data.sort(key=lambda t: t['event_count'], reverse=True)

print(f"Themes to process: {len(themes_data)}")
for t in themes_data:
    print(f"  [{t['event_count']:3d}] {t['theme_nom']}")

# Save to file
with open('scripts/essentiel_themes.json', 'w', encoding='utf-8') as f:
    json.dump(themes_data, f, ensure_ascii=False, indent=2)

print("\nessentiel_themes.json saved.")
