import json
with open('data/fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

for cat in data['categories']:
    if 'subcategories' in cat:
        for sub in cat['subcategories']:
            if sub['nom'] == 'Religions, croyances et mythologies':
                print('Order in Religions:')
                for i, s2 in enumerate(sub['subcategories']):
                    print(str(i+1) + '. ' + s2['nom'])
                    if 'Islam' in s2['nom']:
                        print('   Themes in Islam: ' + str(len(s2.get('themes', []))))
                        for t in s2.get('themes', []):
                            print('   - ' + t['nom'])
