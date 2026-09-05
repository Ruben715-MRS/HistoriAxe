"""
Script d'ajout d'axeOrder aux 6 thèmes >= 30 événements qui n'en ont pas encore.
Les axes sont déjà présents sur les événements — on définit uniquement l'ordre d'affichage.
"""
import json
import io
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Ordre logique/pédagogique pour chaque thème
AXE_ORDERS = {
    "La Conquête spatiale": [
        "Précurseurs et théorie",
        "Fusées et lanceurs",
        "Satellites et télécommunications",
        "Vols habités",
        "Stations spatiales",
        "Exploration robotique",
        "Nouvel âge spatial",
    ],
    "Inventions et découvertes": [
        "Agriculture et alimentation",
        "Architecture et ingénierie",
        "Énergie",
        "Transports",
        "Industrie et matériaux",
        "Écriture, savoir et institutions",
        "Communication",
        "Médecine et sciences du vivant",
        "Sciences et mathématiques",
        "Informatique et électronique",
        "Environnement",
    ],
    "Histoire de l'Aviation et Aéronautique": [
        "Technologie et propulsion",
        "Records, exploits et pionniers",
        "Aviation civile et commerciale",
        "Aviation militaire et conflits",
        "Sécurité, réglementation et infrastructures",
        "Aéronautique contemporaine et nouvelles mobilités",
    ],
    "Histoire de la Médecine et Santé": [
        "Savoirs médicaux",
        "Techniques et traitements",
        "Santé publique et institutions",
    ],
    "Histoire de l'Art et chefs-d'œuvre": [
        "Peinture",
        "Sculpture",
        "Architecture",
        "Techniques et matériaux",
        "Mouvements et courants",
        "Artistes et ateliers",
        "Musées et institutions",
        "Arts décoratifs",
        "Théâtre et danse",
        "Musique",
        "Photographie",
        "Design et arts numériques",
        "Cinéma",
    ],
    "Histoire de l'Écriture et Littérature": [
        "Naissance de l'écriture",
        "Alphabets et systèmes d'écriture",
        "Supports et techniques du livre",
        "Antiquité",
        "Moyen Âge",
        "Renaissance et âge classique",
        "Lumières",
        "XIXe siècle",
        "XXe et XXIe siècle",
        "Auteurs et mouvements littéraires",
        "Littératures des Amériques et d'Océanie",
        "Littératures d'Asie",
        "Littératures du monde arabo-musulman et persan",
        "Littératures d'Afrique",
        "Diffusion, édition et lecture",
    ],
}

with open('data/fr.json', encoding='utf-8') as f:
    data = json.load(f)

updated = 0
for cat in data['categories']:
    for sub in cat.get('subcategories', []):
        for theme in sub.get('themes', []):
            theme_nom = theme['nom']
            if theme_nom in AXE_ORDERS and 'axeOrder' not in theme:
                # Validate that all axes in axeOrder exist in events
                events = theme.get('events', [])
                existing_axes = set(e.get('axe') for e in events if e.get('axe'))
                proposed_order = AXE_ORDERS[theme_nom]
                
                missing = [a for a in proposed_order if a not in existing_axes]
                extra = [a for a in existing_axes if a not in proposed_order]
                
                if missing:
                    print(f"WARNING [{theme_nom}]: axes in axeOrder but NOT in events: {missing}")
                if extra:
                    print(f"WARNING [{theme_nom}]: axes in events but NOT in axeOrder: {extra}")
                
                # Only add axes that actually exist in events, in the specified order
                valid_order = [a for a in proposed_order if a in existing_axes]
                # Append any remaining axes not in proposed order at the end
                for a in existing_axes:
                    if a not in valid_order:
                        valid_order.append(a)
                
                theme['axeOrder'] = valid_order
                print(f"OK [{len(events)} events] {theme_nom} -> {len(valid_order)} axes")
                updated += 1

print(f"\nTotal themes updated: {updated}")

with open('data/fr.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, separators=(',', ':'))

print("fr.json saved.")
