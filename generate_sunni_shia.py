import json

with open('data/fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sunni_events = [
    {
        "id": "sunni_1", "axe": "Fondations et Califat (VIIe - XIe siècle)", "date": 632,
        "titre": "Élection d'Abou Bakr",
        "description": "À la mort de Muhammad, Abou Bakr est élu premier calife par consensus (ijma).",
        "wikipedia": "https://fr.wikipedia.org/wiki/Abou_Bakr_As-Siddiq"
    },
    {
        "id": "sunni_2", "axe": "Fondations et Califat (VIIe - XIe siècle)", "date": 634,
        "titre": "Califat d'Omar",
        "description": "Omar ibn al-Khattab succède à Abou Bakr et lance les grandes conquêtes islamiques.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Omar_ibn_al-Khattab"
    },
    {
        "id": "sunni_3", "axe": "Fondations et Califat (VIIe - XIe siècle)", "date": 644,
        "titre": "Compilation canonique du Coran",
        "description": "Sous le troisième calife, Othman, la Vulgate du Coran est compilée pour unifier le texte sacré.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Othman_ibn_Affan"
    },
    {
        "id": "sunni_4", "axe": "Fondations et Califat (VIIe - XIe siècle)", "date": 661,
        "titre": "Fondation du califat Omeyyade",
        "description": "Muawiya Ier établit le califat omeyyade à Damas, instaurant un principe dynastique.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Califat_omeyyade"
    },
    {
        "id": "sunni_5", "axe": "Fondations et Califat (VIIe - XIe siècle)", "date": 750,
        "titre": "Révolution abbasside",
        "description": "Les Abbassides renversent les Omeyyades et fondent Bagdad, marquant l'âge d'or du califat sunnite.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Califat_abbasside"
    },
    {
        "id": "sunni_6", "axe": "Théologie, Droit et Spiritualité", "date": 767,
        "titre": "Mort d'Abou Hanifa",
        "description": "Décès du fondateur de l'école (madhhab) hanafite, qui privilégie le raisonnement juridique.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Abou_Hanifa"
    },
    {
        "id": "sunni_7", "axe": "Théologie, Droit et Spiritualité", "date": 795,
        "titre": "Mort de Malik ibn Anas",
        "description": "Décès du fondateur de l'école malikite, basée sur la pratique des habitants de Médine.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Malik_ibn_Anas"
    },
    {
        "id": "sunni_8", "axe": "Théologie, Droit et Spiritualité", "date": 820,
        "titre": "Mort de l'Imam Al-Chafii",
        "description": "L'Imam Al-Chafii structure les fondements du droit musulman (Usul al-fiqh).",
        "wikipedia": "https://fr.wikipedia.org/wiki/Al-Chafii"
    },
    {
        "id": "sunni_9", "axe": "Théologie, Droit et Spiritualité", "date": 855,
        "titre": "Mort d'Ahmad Ibn Hanbal",
        "description": "Figure de proue de l'orthodoxie traditionaliste et fondateur de l'école hanbalite.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Ahmad_Ibn_Hanbal"
    },
    {
        "id": "sunni_10", "axe": "Théologie, Droit et Spiritualité", "date": 870,
        "titre": "Compilation du Sahih al-Bukhari",
        "description": "L'un des deux grands recueils authentiques (Sahih) de hadiths est achevé.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Sahih_al-Bukhari"
    },
    {
        "id": "sunni_11", "axe": "Théologie, Droit et Spiritualité", "date": 935,
        "titre": "Naissance de l'Ach'arisme",
        "description": "Al-Ach'ari meurt après avoir fondé une école théologique conciliant rationalisme et textes.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Acharisme"
    },
    {
        "id": "sunni_12", "axe": "Théologie, Droit et Spiritualité", "date": 1111,
        "titre": "Mort d'Al-Ghazali",
        "description": "Surnommé la 'Preuve de l'Islam', Al-Ghazali réconcilie la théologie sunnite et le soufisme.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Al-Ghazali"
    },
    {
        "id": "sunni_13", "axe": "Empires sunnites et âge d'or (XIe - XVIIIe siècle)", "date": 1055,
        "titre": "Les Seldjoukides à Bagdad",
        "description": "La dynastie turque seldjoukide prend Bagdad et se pose en protectrice du califat abbasside sunnite.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Empire_seldjoukide"
    },
    {
        "id": "sunni_14", "axe": "Empires sunnites et âge d'or (XIe - XVIIIe siècle)", "date": 1187,
        "titre": "Saladin reprend Jérusalem",
        "description": "Saladin, héros du monde sunnite, met fin aux Croisades et rétablit l'orthodoxie sunnite en Égypte.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Saladin"
    },
    {
        "id": "sunni_15", "axe": "Empires sunnites et âge d'or (XIe - XVIIIe siècle)", "date": 1258,
        "titre": "Chute de Bagdad",
        "description": "Les Mongols détruisent Bagdad et mettent fin à la lignée califale abbasside irakienne.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Bataille_de_Bagdad_(1258)"
    },
    {
        "id": "sunni_16", "axe": "Empires sunnites et âge d'or (XIe - XVIIIe siècle)", "date": 1517,
        "titre": "L'Empire Ottoman prend le Califat",
        "description": "Selim Ier vainc les Mamelouks et transfère le titre califal sunnite à Istanbul.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Empire_ottoman"
    },
    {
        "id": "sunni_17", "axe": "Réformisme et période contemporaine (XIXe - XXIe siècle)", "date": 1744,
        "titre": "Pacte de Dariya",
        "description": "Alliance entre Ibn Abd al-Wahhab et les Saoud, marquant la naissance du wahhabisme.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Wahhabisme"
    },
    {
        "id": "sunni_18", "axe": "Réformisme et période contemporaine (XIXe - XXIe siècle)", "date": 1924,
        "titre": "Abolition du califat ottoman",
        "description": "Mustafa Kemal abolit le califat, provoquant une crise politique majeure dans le monde sunnite.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Abolition_du_califat"
    },
    {
        "id": "sunni_19", "axe": "Réformisme et période contemporaine (XIXe - XXIe siècle)", "date": 1928,
        "titre": "Fondation des Frères musulmans",
        "description": "Hassan el-Banna fonde en Égypte cette confrérie réformiste qui marque l'islam politique contemporain.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Fr%C3%A8res_musulmans"
    },
    {
        "id": "sunni_20", "axe": "Réformisme et période contemporaine (XIXe - XXIe siècle)", "date": 2011,
        "titre": "Rôle d'Al-Azhar dans les Printemps Arabes",
        "description": "L'institution sunnite d'Al-Azhar au Caire publie des documents sur l'avenir démocratique de l'Égypte.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Universit%C3%A9_al-Azhar"
    }
]

shia_events = [
    {
        "id": "shia_1", "axe": "Les Origines et les Imams (VIIe - IXe siècle)", "date": 632,
        "titre": "Événement de Ghadir Khumm",
        "description": "Selon la tradition chiite, Muhammad désigne publiquement Ali ibn Abi Talib comme son successeur spirituel et temporel.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Ghadir_Khumm"
    },
    {
        "id": "shia_2", "axe": "Les Origines et les Imams (VIIe - IXe siècle)", "date": 656,
        "titre": "Bataille du Chameau",
        "description": "L'Imam Ali affronte et défait Aïcha, veuve du prophète, consolidant temporairement son pouvoir.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Bataille_du_Chameau"
    },
    {
        "id": "shia_3", "axe": "Les Origines et les Imams (VIIe - IXe siècle)", "date": 661,
        "titre": "Assassinat de l'Imam Ali",
        "description": "L'Imam Ali est assassiné à Koufa par un kharidjite. Muawiya prend le contrôle total du califat.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Ali_ibn_Abi_Talib"
    },
    {
        "id": "shia_4", "axe": "Les Origines et les Imams (VIIe - IXe siècle)", "date": 680,
        "titre": "Martyre de l'Imam Hussein",
        "description": "Bataille de Karbala où Hussein, troisième imam, est massacré par les Omeyyades. C'est l'événement central du chiisme.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Bataille_de_Karbala"
    },
    {
        "id": "shia_5", "axe": "Scissions et fondations des dynasties (VIIIe - XIIe siècle)", "date": 765,
        "titre": "Mort de l'Imam Ja'far al-Sadiq",
        "description": "Sa succession provoque la principale scission entre chiites duodécimains et ismaéliens.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Ja%27far_al-S%C3%A2diq"
    },
    {
        "id": "shia_6", "axe": "Scissions et fondations des dynasties (VIIIe - XIIe siècle)", "date": 874,
        "titre": "La Petite Occultation",
        "description": "Le 12ème Imam, Muhammad al-Mahdi, entre en occultation et communique via des représentants.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Occultation_mineure"
    },
    {
        "id": "shia_7", "axe": "Scissions et fondations des dynasties (VIIIe - XIIe siècle)", "date": 909,
        "titre": "Fondation du Califat Fatimide",
        "description": "Les ismaéliens fondent la dynastie fatimide en Ifriqiya (actuelle Tunisie), un grand empire chiite.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Califat_fatimide"
    },
    {
        "id": "shia_8", "axe": "Scissions et fondations des dynasties (VIIIe - XIIe siècle)", "date": 941,
        "titre": "La Grande Occultation",
        "description": "Mort du dernier représentant du Mahdi. Le chiisme duodécimain entre dans l'attente messianique de son retour.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Occultation_majeure"
    },
    {
        "id": "shia_9", "axe": "Scissions et fondations des dynasties (VIIIe - XIIe siècle)", "date": 945,
        "titre": "La dynastie bouyide à Bagdad",
        "description": "La dynastie chiite zaydite des Bouyides prend le contrôle de Bagdad et impose sa tutelle aux califes abbassides.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Bouyides"
    },
    {
        "id": "shia_10", "axe": "Scissions et fondations des dynasties (VIIIe - XIIe siècle)", "date": 1090,
        "titre": "Prise d'Alamut par les Nizarites",
        "description": "Hassan al-Sabbah fonde l'État ismaélien nizarite, célèbre pour la secte des 'Assassins'.",
        "wikipedia": "https://fr.wikipedia.org/wiki/État_niz%C3%A2rite"
    },
    {
        "id": "shia_11", "axe": "Scissions et fondations des dynasties (VIIIe - XIIe siècle)", "date": 1171,
        "titre": "Fin du califat fatimide",
        "description": "Saladin met un terme au règne de la dynastie fatimide en Égypte, restaurant le sunnisme au Caire.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Fatimides"
    },
    {
        "id": "shia_12", "axe": "Le triomphe du duodécimain (XVIe - XVIIIe siècle)", "date": 1501,
        "titre": "Fondation de l'Empire séfévide",
        "description": "Ismaïl Ier prend le pouvoir en Iran et proclame le chiisme duodécimain religion d'État.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Empire_s%C3%A9f%C3%A9vide"
    },
    {
        "id": "shia_13", "axe": "Le triomphe du duodécimain (XVIe - XVIIIe siècle)", "date": 1514,
        "titre": "Bataille de Tchaldiran",
        "description": "Défaite des Séfévides face aux Ottomans, fixant durablement les frontières confessionnelles du Moyen-Orient.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Bataille_de_Tchaldiran"
    },
    {
        "id": "shia_14", "axe": "Le triomphe du duodécimain (XVIe - XVIIIe siècle)", "date": 1588,
        "titre": "Apogée sous Abbas Ier le Grand",
        "description": "L'Empire séfévide atteint son zénith culturel et politique, et Ispahan devient une magnifique capitale.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Abbas_Ier_le_Grand"
    },
    {
        "id": "shia_15", "axe": "Le triomphe du duodécimain (XVIe - XVIIIe siècle)", "date": 1722,
        "titre": "Chute d'Ispahan",
        "description": "La prise de la capitale par les Afghans marque la fin de la puissance séfévide.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Dynastie_s%C3%A9f%C3%A9vide"
    },
    {
        "id": "shia_16", "axe": "Époque contemporaine et pensée politique (XIXe - XXIe siècle)", "date": 1905,
        "titre": "Révolution constitutionnelle persane",
        "description": "Le clergé chiite iranien joue un rôle central dans l'instauration du premier parlement.",
        "wikipedia": "https://fr.wikipedia.org/wiki/R%C3%A9volution_constitutionnelle_persane"
    },
    {
        "id": "shia_17", "axe": "Époque contemporaine et pensée politique (XIXe - XXIe siècle)", "date": 1970,
        "titre": "Velayat-e faqih",
        "description": "L'ayatollah Khomeini théorise à Nadjaf la doctrine du gouvernement du jurisconsulte islamique.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Velayat-e_faqih"
    },
    {
        "id": "shia_18", "axe": "Époque contemporaine et pensée politique (XIXe - XXIe siècle)", "date": 1979,
        "titre": "Révolution islamique en Iran",
        "description": "Renversement du Shah et instauration de la République islamique par Khomeini.",
        "wikipedia": "https://fr.wikipedia.org/wiki/R%C3%A9volution_iranienne"
    },
    {
        "id": "shia_19", "axe": "Époque contemporaine et pensée politique (XIXe - XXIe siècle)", "date": 1982,
        "titre": "Création du Hezbollah",
        "description": "Émergence au Liban du Hezbollah, soutenu par l'Iran, acteur militaire et politique chiite majeur.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Hezbollah"
    },
    {
        "id": "shia_20", "axe": "Époque contemporaine et pensée politique (XIXe - XXIe siècle)", "date": 2003,
        "titre": "Fin du régime irakien baasiste",
        "description": "La chute de Saddam Hussein permet l'essor politique de la majorité chiite en Irak.",
        "wikipedia": "https://fr.wikipedia.org/wiki/Guerre_d%27Irak"
    }
]

for cat in data['categories']:
    if 'subcategories' in cat:
        for sub in cat['subcategories']:
            if sub['nom'] == 'Religions, croyances et mythologies':
                for s2 in sub['subcategories']:
                    if 'Islam' in s2['nom']:
                        for theme in s2['themes']:
                            if theme['id'] == 'thm_islam_sunnisme':
                                theme['nom'] = 'Histoire du sunnisme'
                                theme['events'] = sunni_events
                                theme['axeOrder'] = [
                                    "Fondations et Califat (VIIe - XIe siècle)",
                                    "Théologie, Droit et Spiritualité",
                                    "Empires sunnites et âge d'or (XIe - XVIIIe siècle)",
                                    "Réformisme et période contemporaine (XIXe - XXIe siècle)"
                                ]
                            elif theme['id'] == 'thm_islam_chiisme':
                                theme['nom'] = 'Histoire du chiisme'
                                theme['events'] = shia_events
                                theme['axeOrder'] = [
                                    "Les Origines et les Imams (VIIe - IXe siècle)",
                                    "Scissions et fondations des dynasties (VIIIe - XIIe siècle)",
                                    "Le triomphe du duodécimain (XVIe - XVIIIe siècle)",
                                    "Époque contemporaine et pensée politique (XIXe - XXIe siècle)"
                                ]

with open('data/fr.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Themes updated.')
