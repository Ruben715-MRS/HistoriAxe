import json

with open('data/fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Find Islam subcategory
islam = None
for cat in data['categories']:
    if 'subcategories' in cat:
        for sub in cat['subcategories']:
            if sub['nom'] == 'Religions, croyances et mythologies':
                for s2 in sub['subcategories']:
                    if 'Islam' in s2['nom']:
                        islam = s2
                        break

if islam:
    # Find Sunnisme and Chiisme
    for theme in islam['themes']:
        if theme['nom'] == 'Sunnisme':
            theme['events'] = [
                {
                    'id': 'sunni_1',
                    'axe': 'Fondations',
                    'date': 632,
                    'titre': 'Élection d\'Abou Bakr',
                    'description': 'À la mort de Muhammad, Abou Bakr est élu comme premier calife (successeur), posant les bases du sunnisme qui privilégie le consensus (ijma) de la communauté pour le choix du dirigeant.',
                    'wikipedia': 'https://fr.wikipedia.org/wiki/Abou_Bakr_As-Siddiq'
                },
                {
                    'id': 'sunni_2',
                    'axe': 'Fondations',
                    'date': 661,
                    'titre': 'Fondation du Califat omeyyade',
                    'description': 'L\'assassinat d\'Ali marque la fin des califes bien guidés. Muawiya prend le pouvoir et fonde la dynastie omeyyade, ancrant politiquement le sunnisme face aux partisans d\'Ali.',
                    'wikipedia': 'https://fr.wikipedia.org/wiki/Califat_omeyyade'
                },
                {
                    'id': 'sunni_3',
                    'axe': 'Doctrine et droit',
                    'date': 767,
                    'titre': 'Mort d\'Abou Hanifa',
                    'description': 'Mort d\'Abou Hanifa, fondateur de l\'école hanafite, la première des quatre grandes écoles juridiques (madhhab) du droit musulman sunnite.',
                    'wikipedia': 'https://fr.wikipedia.org/wiki/Abou_Hanifa'
                },
                {
                    'id': 'sunni_4',
                    'axe': 'Doctrine et droit',
                    'date': 870,
                    'titre': 'Compilation du Sahih al-Bukhari',
                    'description': 'Al-Bukhari achève son recueil de hadiths. Avec le Sahih Muslim, ils deviennent les sources les plus authentiques de la tradition (Sunna) pour l\'islam sunnite.',
                    'wikipedia': 'https://fr.wikipedia.org/wiki/Sahih_al-Bukhari'
                },
                {
                    'id': 'sunni_5',
                    'axe': 'Théologie',
                    'date': 935,
                    'titre': 'Mort d\'Al-Ash\'ari',
                    'description': 'Al-Ash\'ari fonde l\'école théologique ach\'arite, qui deviendra avec le maturidisme le dogme officiel de la majorité des musulmans sunnites orthodoxes.',
                    'wikipedia': 'https://fr.wikipedia.org/wiki/Al-Ach%27ari'
                }
            ]
        elif theme['nom'] == 'Chiisme':
            theme['events'] = [
                {
                    'id': 'shia_1',
                    'axe': 'Origines et schisme',
                    'date': 632,
                    'titre': 'Événement de Ghadir Khumm',
                    'description': 'Selon la tradition chiite, Muhammad aurait désigné Ali ibn Abi Talib comme son successeur spirituel et politique (Mawla), fondement de la doctrine de l\'Imamat.',
                    'wikipedia': 'https://fr.wikipedia.org/wiki/Ghadir_Khumm'
                },
                {
                    'id': 'shia_2',
                    'axe': 'Origines et schisme',
                    'date': 680,
                    'titre': 'Bataille de Karbala',
                    'description': 'Le martyre de l\'Imam Hussein, petit-fils du prophète, face aux troupes omeyyades. Cet événement tragique devient le ciment de l\'identité chiite et est commémoré chaque année (Achoura).',
                    'wikipedia': 'https://fr.wikipedia.org/wiki/Bataille_de_Karbala'
                },
                {
                    'id': 'shia_3',
                    'axe': 'Occultation',
                    'date': 874,
                    'titre': 'Début de l\'Occultation',
                    'description': 'Le douzième imam, Muhammad al-Mahdi, entre en occultation (ghayba). Le chiisme duodécimain attend depuis lors son retour messianique à la fin des temps.',
                    'wikipedia': 'https://fr.wikipedia.org/wiki/Occultation_(islam)'
                },
                {
                    'id': 'shia_4',
                    'axe': 'Âge d\'or et États',
                    'date': 909,
                    'titre': 'Fondation du Califat Fatimide',
                    'description': 'La dynastie chiite ismaélienne des Fatimides prend le pouvoir en Afrique du Nord et fondera plus tard Le Caire, rivalisant avec le califat sunnite abbasside.',
                    'wikipedia': 'https://fr.wikipedia.org/wiki/Califat_fatimide'
                },
                {
                    'id': 'shia_5',
                    'axe': 'Âge d\'or et États',
                    'date': 1501,
                    'titre': 'L\'Empire séfévide',
                    'description': 'Ismaïl Ier fonde la dynastie séfévide en Iran et décrète le chiisme duodécimain comme religion d\'État, unifiant le pays sous l\'obédience chiite de manière définitive.',
                    'wikipedia': 'https://fr.wikipedia.org/wiki/Empire_s%C3%A9f%C3%A9vide'
                }
            ]

with open('data/fr.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print('Events added to Sunnisme and Chiisme.')
