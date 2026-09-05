import json
import re
import sys
sys.stdout.reconfigure(encoding='utf-8')

with open('data/fr.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

events = []
def recurse(node, path=""):
    if isinstance(node, dict):
        if 'events' in node and isinstance(node['events'], list):
            theme_nom = node.get('nom', 'Unknown')
            for ev in node['events']:
                events.append((path + " > " + theme_nom, ev))
        for k, v in node.items():
            if k != 'events':
                name = node.get('nom', '')
                new_path = path + (" > " + name if name and k in ['categories', 'subcategories', 'themes'] else "")
                recurse(v, new_path)
    elif isinstance(node, list):
        for item in node:
            recurse(item, path)

recurse(data)
long_events = [(p, ev) for p, ev in events if len(ev.get('titre', '').split()) in (7, 8)]
print(f"Total long events to shorten: {len(long_events)}")

# Layer 1: Specific overrides for known complex/truncated titles
KNOWN = {
    "esp21": "Fusées au siège de Kaifeng",
    "esp28": "Congreve développe la fusée militaire",
    "esp29": "Fusées Congreve à Copenhague",
    "esp30": "De la Terre à la Lune",
    "esp31": "Autour de la Lune (Verne)",
    "esp33": "Équation de fusée de Tsiolkovski",
    "esp37": "A Method of Reaching Altitudes",
    "esp38": "Die Rakete zu den Planetenräumen",
    "esp41": "Premier vol à propergol liquide",
    "esp44": "Film La Femme sur la Lune",
    "esp47": "Von Braun à Kummersdorf",
    "esp50": "Goddard franchit le mur sonore",
    "esp54": "Premier vol de fusée V2",
    "esp55": "Production de V2 à Mittelwerk",
    "esp57": "Prise du site de Peenemünde",
    "esp60": "Premier vol biologique en V2",
    "esp61": "Fusée Bumper-WAC : record d'altitude",
    "esp62": "Essais de fusée soviétique R-1",
    "esp64": "Annonce de lancement de satellite",
    "esp73": "Retour de Belka et Strelka",
    "esp80": "Vol groupé Vostok 3 et 4",
    "esp88": "Gemini 5 : record de durée",
    "esp89": "Rendez-vous de Gemini 6A et 7",
    "esp6": "Apollo 8 autour de la Lune",
    "esp97": "Premier vol du module lunaire",
    "par_24": "Serment pastafarien à San Jose",
    "amfr120": "« Vive le Québec libre ! »",
}

# Layer 2: Verbal and prepositional multi-word substitutions
SUBS = [
    (r"\bmet au point la\b", "conçoit la"),
    (r"\bmet au point le\b", "conçoit le"),
    (r"\bmet au point les\b", "conçoit les"),
    (r"\bmet au point l'\b", "conçoit l'"),
    (r"\bmet au point d'\b", "conçoit d'"),
    (r"\bmet au point de\b", "conçoit"),
    (r"\bmet au point un\b", "conçoit un"),
    (r"\bmet au point une\b", "conçoit une"),
    (r"\bmet au point des\b", "conçoit des"),
    (r"\bmet au point\b", "développe"),
    (r"\bmettent au point\b", "développent"),
    (r"\bmet en place la\b", "instaure la"),
    (r"\bmet en place le\b", "instaure le"),
    (r"\bmet en place les\b", "instaure les"),
    (r"\bmet en place l'\b", "instaure l'"),
    (r"\bmet en place un\b", "instaure un"),
    (r"\bmet en place une\b", "instaure une"),
    (r"\bmet en place des\b", "instaure des"),
    (r"\bmet en place\b", "instaure"),
    (r"\bmettent en place\b", "instaurent"),
    (r"\bmet en service\b", "lance"),
    (r"\bmettent en service\b", "lancent"),
    (r"\bentre en service commercial\b", "entre en service"),
    (r"\bentre en service transatlantique\b", "entre en service"),
    (r"\bprend ses fonctions de\b", "devient"),
    (r"\bprend ses fonctions\b", "entre en fonction"),
    (r"\bprend la tête de la\b", "dirige la"),
    (r"\bprend la tête du\b", "dirige le"),
    (r"\bprend la tête des\b", "dirige les"),
    (r"\bprend la tête d'\b", "dirige "),
    (r"\bprend la direction de la\b", "dirige la"),
    (r"\bprend la direction du\b", "dirige le"),
    (r"\bprend la direction des\b", "dirige les"),
    (r"\bprend la direction d'\b", "dirige "),
    (r"\bprend part à la\b", "participe à la"),
    (r"\bprend part au\b", "participe au"),
    (r"\bprend part aux\b", "participe aux"),
    (r"\bprend part à\b", "participe à"),
    (r"\bfait son entrée dans\b", "entre dans"),
    (r"\bfait son entrée à\b", "entre à"),
    (r"\bfait son entrée au\b", "entre au"),
    (r"\bfait ériger des\b", "érige des"),
    (r"\bfait ériger un\b", "érige un"),
    (r"\bfait ériger une\b", "érige une"),
    (r"\bfait ériger\b", "érige"),
    (r"\bfait construire des\b", "construit des"),
    (r"\bfait construire un\b", "construit un"),
    (r"\bfait construire une\b", "construit une"),
    (r"\bfait construire\b", "construit"),
    (r"\bse voit décerner le\b", "reçoit le"),
    (r"\bse voit décerner la\b", "reçoit la"),
    (r"\bse voit décerner les\b", "reçoit les"),
    (r"\bse voit décerner l'\b", "reçoit l'"),
    (r"\bse voit attribuer le\b", "reçoit le"),
    (r"\bse voit attribuer la\b", "reçoit la"),
    (r"\bse voit attribuer les\b", "reçoit les"),
    (r"\bse voit attribuer l'\b", "reçoit l'"),
    (r"\bse voit confier la\b", "reçoit la"),
    (r"\bse voit confier le\b", "reçoit le"),
    (r"\bse voit confier les\b", "reçoit les"),
    (r"\bse voit confier l'\b", "reçoit l'"),
    (r"\bpoursuit son combat pour\b", "combat pour"),
    (r"\bpoursuit son combat\b", "lutte"),
    (r"\baffirme avoir survolé\b", "survole"),
    (r"\baffirme l'indépendance\b", "déclare l'indépendance"),
    (r"\bautorise le mariage pour les évêques\b", "autorise le mariage des évêques"),
    (r"\batteignent pôle Nord\b", "au pôle Nord"),
    (r"\batteignent le pôle Nord\b", "au pôle Nord"),
    (r"\brelie l'Angleterre à l'Australie en solitaire\b", "relie l'Angleterre à l'Australie"),
    (r"\brelie l'Angleterre à la Nouvelle-Zélande\b", "relie l'Angleterre à Nouvelle-Zélande"),
    (r"\brelie Paris à New York\b", "relie Paris et New York"),
    (r"\bcloué au sol dans monde entier\b", "cloué au sol mondialement"),
    (r"\bfranchit le mur du son\b", "franchit le mur sonore"),
    (r"\bparticipe à la bataille de\b", "bataille de"),
    (r"\bparticipe à la bataille d'\b", "bataille d'"),

    # Prépositions et locutions
    (r"\bà travers le monde\b", "dans le monde"),
    (r"\bdans le monde entier\b", "dans le monde"),
    (r"\bau cours de la guerre\b", "pendant la guerre"),
    (r"\bau cours de la\b", "pendant la"),
    (r"\bau cours du\b", "pendant le"),
    (r"\bau cours des\b", "pendant les"),
    (r"\bau cours d'\b", "pendant "),
    (r"\bà la suite de la\b", "après la"),
    (r"\bà la suite du\b", "après le"),
    (r"\bà la suite des\b", "après les"),
    (r"\bà la suite d'\b", "après "),
    (r"\bdans le cadre de la\b", "lors de la"),
    (r"\bdans le cadre du\b", "lors du"),
    (r"\bdans le cadre des\b", "lors des"),
    (r"\bdans le cadre d'\b", "lors d'"),
    (r"\bdans le cadre de\b", "lors de"),
    (r"\bà l'occasion de la\b", "lors de la"),
    (r"\bà l'occasion du\b", "lors du"),
    (r"\bà l'occasion des\b", "lors des"),
    (r"\bà l'occasion d'\b", "lors d'"),
    (r"\bà l'occasion de\b", "lors de"),
    (r"\bsous le règne de\b", "sous"),
    (r"\bsous le commandement de\b", "sous"),
    (r"\bsous la présidence de\b", "sous"),
    (r"\bsous la direction de\b", "sous"),
    (r"\bpar l'intermédiaire de\b", "par"),
    (r"\bde la part de\b", "par"),
    (r"\ben faveur de\b", "pour"),
    (r"\bà l'encontre de\b", "contre"),
    (r"\bdans le but de\b", "pour"),
    (r"\ben vue de\b", "pour"),
    (r"\bafin de\b", "pour"),
    (r"\bà l'âge de\b", "à"),
    (r"\ben solitaire\b", ""),
    (r"\bdans une famille de\b", "dans une famille"),
    (r"\bdans une famille\b", "en famille"),
    (r"\bau sein de la dynastie\b", "dans la dynastie"),
    (r"\bau sein de la\b", "dans la"),
    (r"\bau sein du\b", "dans le"),
    (r"\bau sein des\b", "dans les"),
    (r"\bau sein d'\b", "dans "),
    (r"\bau profit de la\b", "pour la"),
    (r"\bau profit du\b", "pour le"),
    (r"\bau profit des\b", "pour les"),
    (r"\bau profit d'\b", "pour "),
    (r"\bau profit de\b", "pour"),

    # Titres et distinctions
    (r"\bMise au point de la\b", "Développement de la"),
    (r"\bMise au point du\b", "Développement du"),
    (r"\bMise au point des\b", "Développement des"),
    (r"\bMise au point d'\b", "Développement d'"),
    (r"\bMise au point de\b", "Développement de"),
    (r"\bMise en place de la\b", "Création de la"),
    (r"\bMise en place du\b", "Création du"),
    (r"\bMise en place des\b", "Création des"),
    (r"\bMise en place d'\b", "Création d'"),
    (r"\bMise en place de\b", "Création de"),
    (r"\bMise en service de la\b", "Lancement de la"),
    (r"\bMise en service du\b", "Lancement du"),
    (r"\bMise en service des\b", "Lancement des"),
    (r"\bMise en service d'\b", "Lancement d'"),
    (r"\bMise en service de\b", "Lancement de"),
    (r"\bPrix Nobel de physique pour\b", "Nobel de physique pour"),
    (r"\bPrix Nobel de chimie pour\b", "Nobel de chimie pour"),
    (r"\bPrix Nobel de médecine pour\b", "Nobel de médecine pour"),
    (r"\bPrix Nobel de physiologie ou médecine\b", "Nobel de médecine"),
    (r"\bPrix Nobel de littérature pour\b", "Nobel de littérature pour"),
    (r"\bPrix Nobel de la paix pour\b", "Nobel de la paix pour"),
    (r"\bPrix Nobel de la paix remis à\b", "Nobel de la paix à"),
    (r"\bPrix Nobel de la paix décerné à\b", "Nobel de la paix à"),
    (r"\bPrix Nobel de la paix\b", "Nobel de la paix"),
    (r"\bPrix Nobel de\b", "Nobel de"),
    (r"\bprix Nobel de\b", "Nobel de"),
    (r"\bDéclenchement officiel de la guerre de Cent Ans\b", "Début de guerre de Cent Ans"),
    (r"\bDéclenchement de la guerre de Cent Ans\b", "Début de guerre de Cent Ans"),
    (r"\bDébut de la guerre de Cent Ans\b", "Début de guerre de Cent Ans"),
    (r"\bFin de la guerre de Cent Ans\b", "Fin de guerre de Cent Ans"),
    (r"\bTraité de Brétigny, guerre de Cent Ans\b", "Traité de Brétigny (Cent Ans)"),
    (r"\bDéclaration des droits de l'homme et du citoyen\b", "Déclaration des droits de l'homme"),
    (r"\bLoi de séparation des Églises et de l'État\b", "Séparation des Églises et de l'État"),
    (r"\bLois Jules Ferry sur l'école gratuite et laïque\b", "Lois Ferry sur l'école laïque"),
    (r"\bAbolition définitive de l'esclavage dans les colonies françaises\b", "Abolition de l'esclavage en France"),
    (r"\bDébut de la guerre de Sept Ans\b", "Début de guerre de Sept Ans"),
    (r"\bÉtats généraux et serment du Jeu de paume\b", "Serment du Jeu de paume"),
    (r"\bDébut du règne personnel de Louis XIV\b", "Règne personnel de Louis XIV"),
    (r"\bDébut de la guerre froide \(doctrine Truman\)\b", "Début de la guerre froide"),
    (r"\bL'inégalable triple-triplé olympique aux Jeux de Rio\b", "Triple-triplé olympique à Rio"),
    (r"\bDeuxième triplé olympique consécutif aux Jeux de Londres\b", "Deuxième triplé olympique à Londres"),
    (r"\bKipchoge court le marathon sous les deux heures\b", "Marathon sous deux heures (Kipchoge)"),
    (r"\bNellie Bly invente journalisme d'investigation infiltré, New York\b", "Nellie Bly et journalisme d'investigation"),
    (r"\bRobert Peary et Matthew Henson atteignent pôle Nord\b", "Peary et Henson au pôle Nord"),
    (r"\bFranklin Roosevelt inaugure « causeries au coin »\b", "« Causeries au coin du feu »"),
    (r"\bTristan et Isolde de Wagner et l'harmonie chromatique\b", "Tristan et Isolde : harmonie chromatique"),
    (r"\bAttentats du 11 septembre contre World Trade Center\b", "Attentats du 11 septembre 2001"),
    (r"\bCulte du Monolithe de 2001 l'Odyssée de l'espace\b", "Culte du Monolithe (2001 l'Odyssée)"),
    (r"\bMort d'Oum Kalthoum à l'hôpital militaire du Caire\b", "Mort d'Oum Kalthoum au Caire"),
    (r"\bFranz Liszt invente le récital de piano\b", "Liszt invente le récital de piano"),
    (r"\bTravaille dans l'agence de Peter Behrens à Berlin\b", "Travail chez Peter Behrens à Berlin"),
    (r"\bRédige le Mishné Torah, codification du droit juif\b", "Rédaction du Mishné Torah"),
    (r"\bRoux et Yersin isolent la toxine diphtérique\b", "Isolement de la toxine diphtérique"),
    (r"\bFondation de la première école dentaire du monde\b", "Fondation de la première école dentaire"),
    (r"\bEasy Rider et l'avènement du Nouvel Hollywood\b", "Easy Rider et le Nouvel Hollywood"),
    (r"\bConçoit le musée d'art moderne de Fort Worth\b", "Musée d'art moderne de Fort Worth"),
]

# Layer 3: Superfluous adjectives
ADJECTIVES = [
    r"\bmajestueux\b", r"\bmajestueuse\b",
    r"\bdouloureux\b", r"\bdouloureuse\b",
    r"\binégalable\b",
    r"\bautocéphale\b",
    r"\béphémère\b",
    r"\btotale\b", r"\btotal\b",
    r"\bbrillant\b", r"\bbrillante\b",
    r"\bconsidérable\b",
    r"\bgrandiose\b",
    r"\babsolu\b", r"\babsolue\b",
    r"\bmassif\b", r"\bmassive\b",
    r"\bimportant\b", r"\bimportante\b",
    r"\bpuissant\b", r"\bpuissante\b",
    r"\bmajeur\b", r"\bmajeure\b",
    r"\bdécisif\b", r"\bdécisive\b",
    r"\bmarquant\b", r"\bmarquante\b",
    r"\bcélèbre\b", r"\bcélèbres\b",
    r"\bmilitaire absolu\b",
    r"\bcourageuse\b",
    r"\bsecrète\b",
    r"\bgénérale\b",
    r"\bmondiale\b", r"\bmondial\b",
    r"\bdu monde\b",
    r"\bclassiques et historiques\b",
    r"\bréussi\b", r"\bréussie\b",
    r"\bfondateur\b", r"\bfondatrice\b",
    r"\bpanhellénique\b",
    r"\bcanonique totale\b",
    r"\bconsécutif\b", r"\bconsécutive\b",
    r"\bpersonnelle\b", r"\bpersonnel\b",
    r"\bdéfinitif\b", r"\bdéfinitive\b",
    r"\bextraordinaire\b",
    r"\brequise\b",
    r"\bprécédent\b", r"\bprécédente\b",
    r"\binitiale\b", r"\binitial\b",
    r"\bprincipal\b", r"\bprincipale\b",
    r"\brenommé\b", r"\brenommée\b",
    r"\bimmense\b",
]

def clean(t):
    return re.sub(r'\s+', ' ', t).strip()

def shorten(ev_id, title, path=""):
    if ev_id in KNOWN:
        return KNOWN[ev_id]
        
    w = title.split()
    if len(w) <= 6:
        return title
        
    t = title
    
    # 1. Substitutions
    for pat, rep in SUBS:
        t = re.sub(pat, rep, t)
    t = clean(t)
    if len(t.split()) <= 6:
        return t
        
    # 2. Adjective trimming
    for adj in ADJECTIVES:
        cand = re.sub(r'\s+' + adj, '', t)
        cand = re.sub(adj + r'\s+', '', cand)
        cand = clean(cand)
        if len(cand.split()) < len(t.split()):
            t = cand
            if len(t.split()) <= 6:
                return t

    # 3. Biographies specific patterns
    if 'Biographies' in path:
        # Devient ...
        if t.startswith("Devient "):
            cand = re.sub(r"^Devient (une?|le|la|les)?\s*", "", t)
            cand = clean(cand[0].capitalize() + cand[1:])
            if len(cand.split()) <= 6: return cand
        # Nommé ...
        if t.startswith("Nommé ") and len(t.split()) > 6:
            cand = re.sub(r"\b(par|à|au|aux)\b.*$", "", t)
            cand = clean(cand)
            if len(cand.split()) <= 6: return cand
        # Publie son / sa ...
        if t.startswith("Publie son ") or t.startswith("Publie sa "):
            cand = re.sub(r"^Publie (son|sa)\s+", "", t)
            cand = clean(cand[0].capitalize() + cand[1:])
            if len(cand.split()) <= 6: return cand
        # Fonde ...
        if t.startswith("Fonde la ") or t.startswith("Fonde le ") or t.startswith("Fonde l'"):
            cand = re.sub(r"^Fonde (la|le|l'|un|une)\s+", "Fondation de ", t)
            cand = clean(cand)
            if len(cand.split()) <= 6: return cand
        # Naissance
        if t.startswith("Naissance"):
            m = re.match(r"Naissance à (.+?) dans une famille (.+)", t)
            if m:
                cand = f"Naissance à {m.group(1)} en famille {m.group(2)}"
                if len(cand.split()) <= 6: return cand
                return f"Naissance à {m.group(1)}"
            m = re.match(r"Naissance dans une famille (.+?) à (.+)", t)
            if m:
                cand = f"Naissance en famille {m.group(1)} à {m.group(2)}"
                if len(cand.split()) <= 6: return cand
                return f"Naissance en famille {m.group(1)}"
            m = re.match(r"Naissance de (.+?) à (.+)", t)
            if m and len(t.split()) > 6:
                cand = f"Naissance à {m.group(2)}"
                if len(cand.split()) <= 6: return cand
        # Mort
        if t.startswith("Mort"):
            m = re.match(r"Mort à l'âge de (\d+) ans à (.+)", t)
            if m:
                cand = f"Mort à {m.group(1)} ans à {m.group(2)}"
                if len(cand.split()) <= 6: return cand
                return f"Mort à {m.group(1)} ans"
            m = re.match(r"Mort de (.+?) à (.+)", t)
            if m and len(t.split()) > 6:
                cand = f"Mort à {m.group(2)}"
                if len(cand.split()) <= 6: return cand

    # 4. Leading article drop
    w = t.split()
    if w[0] in ['Le', 'La', 'Les', 'Un', 'Une'] and not w[1].startswith('«') and len(w) - 1 <= 6:
        cand = w[1].capitalize() + ' ' + ' '.join(w[2:])
        if len(cand.split()) <= 6:
            return cand

    # 5. Comma second part pruning
    if ',' in t and len(t.split()) > 6:
        parts = [p.strip() for p in t.split(',')]
        if 3 <= len(parts[0].split()) <= 6:
            p2 = parts[1].split()
            # If second part is location or qualifier or author
            if len(p2) <= 3:
                return parts[0]

    # 6. Trailing location trimming
    for loc in [r"\s+à Paris\b", r"\s+à Londres\b", r"\s+à Rome\b", r"\s+à New York\b", r"\s+en France\b", r"\s+en Chine\b"]:
        cand = re.sub(loc, '', t)
        cand = clean(cand)
        if len(cand.split()) <= 6 and len(cand.split()) >= 3:
            return cand

    return t

fixed = 0
still = []
for p, ev in long_events:
    res = shorten(ev.get('id', ''), ev['titre'], p)
    if len(res.split()) <= 6:
        fixed += 1
    else:
        still.append((p, ev.get('id', ''), ev['titre'], res))

print(f"Fixed: {fixed} / {len(long_events)} ({fixed/len(long_events)*100:.1f}%)")
print(f"Still long: {len(still)}")
