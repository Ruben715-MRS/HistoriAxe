#!/usr/bin/env python3
"""Construit un panthéon national dans data/fr.json.

    python3 scripts/build_pantheon.py fr            # écrit data/fr.json
    python3 scripts/build_pantheon.py fr --check    # valide, n'écrit rien

Source : scripts/pantheon/<pays>.json (voir le README, section « Panthéons
nationaux »). Cible : le thème `pan_<pays>` de « Personnages illustres >
Panthéons nationaux ». Relancer le script remplace ce thème — il est la seule
source de vérité de son contenu, ne pas le retoucher à la main dans fr.json.

Pourquoi un script plutôt qu'une saisie directe dans fr.json : chaque fiche
doit respecter les mêmes règles (une naissance par personnage, une phrase
d'ouverture « Nom (naissance-décès) est… » dont l'année doit être la date de
l'événement, trois phrases, un axe connu, un lien de biographie qui existe), et
quarante ou soixante personnages écrits à la main s'y trompent tôt ou tard.
Les règles sont vérifiées ici, avant l'écriture, et par tests/data-schema.test.js
après.
"""
import argparse
import json
import os
import re
import sys
import unicodedata
from urllib.parse import quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data', 'fr.json')
CATEGORY = 'Personnages illustres'
SECTION = 'Panthéons nationaux'
BIOGRAPHIES = 'Biographies'
PORTRAIT_DIR = 'assets/portraits'

# Première phrase : « Nom (1802-1885) est … » ; « vers » devant une année
# incertaine ; « av. J.-C. » une fois, à la fin, valable pour les deux années.
OPENING = re.compile(r'^(?P<nom>.+?) \((?P<dates>[^()]+)\) (?:est|était) ')
DATES = re.compile(r'^(?:vers )?(?P<naissance>\d{1,4})-(?:vers )?(?P<deces>\d{1,4})(?P<av> av\. J\.-C\.)?$')


def birth_year(dates):
    """Année de naissance lue dans « 1802-1885 », « vers 466-511 », « vers 82-46 av. J.-C. »."""
    m = DATES.match(dates)
    if not m:
        return None
    year = int(m.group('naissance'))
    return -year if m.group('av') else year


def sentence_count(text):
    protected = text.replace('av. J.-C.', 'av J-C')
    return len([s for s in re.split(r'(?<=[.!?])\s+(?=[A-ZÉÈÀÂÎ«])', protected.strip()) if s])


def collation_key(text):
    """Tri français sans accents ni casse : « États-Unis » se range avec les E."""
    return unicodedata.normalize('NFD', text).encode('ascii', 'ignore').decode().lower()


def walk_themes(node):
    for theme in node.get('themes') or []:
        yield theme
    for sub in node.get('subcategories') or []:
        yield from walk_themes(sub)


def find_child(node, nom):
    return next((c for c in node.get('subcategories') or [] if c['nom'] == nom), None)


def validate(src, bio_themes, errors):
    iso = src['pays']
    theme_id = src['theme']['id']
    if theme_id != f'pan_{iso}':
        errors.append(f"l'id du thème doit être pan_{iso}, pas {theme_id}")
    axes = src['axes']
    if len(axes) != len(set(axes)):
        errors.append('axes en double')
    used = set()
    slugs = set()
    for p in src['personnages']:
        who = p.get('slug', '?')
        if not re.fullmatch(r'[a-z0-9]+', who):
            errors.append(f'{who}: slug invalide (minuscules et chiffres seulement)')
        if who in slugs:
            errors.append(f'{who}: slug en double')
        slugs.add(who)
        for field in ('nom', 'titre', 'axe', 'naissance', 'description', 'wikipedia'):
            if field not in p:
                errors.append(f'{who}: champ « {field} » manquant')
        if errors and 'naissance' not in p:
            continue
        if p['axe'] not in axes:
            errors.append(f"{who}: axe inconnu « {p['axe']} »")
        used.add(p['axe'])
        if not isinstance(p['naissance'], int):
            errors.append(f'{who}: naissance doit être un entier')
        m = OPENING.match(p['description'])
        if not m:
            errors.append(f'{who}: la description doit commencer par « Nom (naissance-décès) est… »')
        else:
            if m.group('nom') != p['nom']:
                errors.append(f"{who}: la description commence par « {m.group('nom')} », attendu « {p['nom']} »")
            born = birth_year(m.group('dates'))
            if born is None:
                errors.append(f"{who}: dates illisibles « {m.group('dates')} »")
            elif born != p['naissance']:
                errors.append(f"{who}: la phrase d'ouverture dit {born}, l'événement {p['naissance']}")
        n = sentence_count(p['description'])
        if n != 3:
            errors.append(f'{who}: {n} phrases au lieu de 3')
        if p.get('biographie'):
            bio = bio_themes.get(p['biographie'])
            if bio is None:
                errors.append(f"{who}: biographie « {p['biographie']} » introuvable dans Personnages illustres > Biographies")
            elif min(e['date'] for e in bio['events']) != p['naissance']:
                errors.append(
                    f"{who}: naissance {p['naissance']} ≠ {min(e['date'] for e in bio['events'])} "
                    f"dans la biographie {p['biographie']} (une même personne, une même date)")
    for axe in axes:
        if axe not in used:
            errors.append(f'axe « {axe} » sans aucun personnage')


def build_theme(src, warnings):
    iso = src['pays']
    events = []
    for p in sorted(src['personnages'], key=lambda p: (p['naissance'], p['slug'])):
        event_id = f"pan_{iso}_{p['slug']}"
        event = {
            'id': event_id,
            'axe': p['axe'],
            'date': p['naissance'],
            'titre': p['titre'],
            'description': p['description'],
            'wikipedia': 'https://fr.wikipedia.org/wiki/' + quote(p['wikipedia'], safe="_()-,."),
        }
        if p.get('biographie'):
            event['biographie'] = p['biographie']
        portrait = p.get('portrait')
        if portrait:
            src_path = f'{PORTRAIT_DIR}/{event_id}.jpg'
            resolved = all(portrait.get(k) for k in ('fichier', 'legende', 'auteur', 'licence'))
            if not resolved:
                warnings.append(f"{p['slug']}: portrait non résolu (lancer scripts/fetch_portraits.py)")
            elif not os.path.exists(os.path.join(ROOT, src_path)):
                warnings.append(f"{p['slug']}: {src_path} absent du disque, image non référencée")
            else:
                event['image'] = {
                    'src': src_path,
                    'legende': portrait['legende'],
                    'auteur': portrait['auteur'],
                    'licence': portrait['licence'],
                    'source': 'https://commons.wikimedia.org/wiki/File:'
                              + quote(portrait['fichier'].replace(' ', '_'), safe="_()-,.!~*"),
                }
        else:
            warnings.append(f"{p['slug']}: aucun portrait prévu")
        events.append(event)
    essentials = [f"pan_{iso}_{p['slug']}" for p in sorted(src['personnages'], key=lambda p: (p['naissance'], p['slug']))
                  if p.get('essentiel')]
    theme = {
        'id': src['theme']['id'],
        'nom': src['theme']['nom'],
        'difficulte': src['theme']['difficulte'],
        'events': events,
        'axeOrder': list(src['axes']),
    }
    if essentials:
        theme['essentiel'] = essentials
    return theme


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('pays', help='code ISO du pays, ex. fr (fichier scripts/pantheon/<pays>.json)')
    parser.add_argument('--check', action='store_true', help="valider sans écrire data/fr.json")
    parser.add_argument('--verify', action='store_true',
                        help="vérifier que data/fr.json est à jour avec la source (code de sortie 1 sinon)")
    args = parser.parse_args()

    with open(os.path.join(ROOT, 'scripts', 'pantheon', f'{args.pays}.json'), encoding='utf-8') as f:
        src = json.load(f)
    with open(DATA, encoding='utf-8') as f:
        raw = f.read()
    data = json.loads(raw)
    if json.dumps(data, indent=2, ensure_ascii=False) + '\n' != raw:
        sys.exit('data/fr.json ne se réécrit pas à l\'identique : abandon, pour ne pas bruiter le diff')

    category = next((c for c in data['categories'] if c['nom'] == CATEGORY), None)
    section = find_child(category, SECTION) if category else None
    bio_root = find_child(category, BIOGRAPHIES) if category else None
    if not section or not bio_root:
        sys.exit(f'structure « {CATEGORY} > {BIOGRAPHIES} / {SECTION} » absente de data/fr.json')
    bio_themes = {t['id']: t for t in walk_themes(bio_root)}

    errors, warnings = [], []
    validate(src, bio_themes, errors)
    if errors:
        print('ERREURS :')
        for e in errors:
            print('  -', e)
        sys.exit(1)

    theme = build_theme(src, warnings)
    if args.verify:
        existing = next((t for t in section['themes'] if t['id'] == theme['id']), None)
        if existing == theme:
            print(f"{theme['id']} : data/fr.json est à jour avec scripts/pantheon/{args.pays}.json")
            return
        print(f"{theme['id']} : data/fr.json DIFFÈRE de scripts/pantheon/{args.pays}.json — "
              f"modifier la source, puis relancer `python3 scripts/build_pantheon.py {args.pays}`.")
        if existing is None:
            print('  le thème est absent de data/fr.json')
        else:
            before = {e['id']: e for e in existing['events']}
            for e in theme['events']:
                if before.get(e['id']) != e:
                    print(f"  événement différent : {e['id']}")
            for key in ('nom', 'difficulte', 'axeOrder', 'essentiel'):
                if existing.get(key) != theme.get(key):
                    print(f'  champ différent : {key}')
        sys.exit(1)
    others = [t for t in section['themes'] if t['id'] != theme['id']]
    others.append(theme)
    # Les pays se rangent par leur nom (« France »), pas par celui du thème
    # (« Grandes figures de France » / « …d'Allemagne » : la particule fausserait l'ordre).
    country_names = {theme['id']: src['paysNom']}
    for t in others:
        country_names.setdefault(t['id'], t['nom'])
    section['themes'] = sorted(others, key=lambda t: collation_key(country_names[t['id']]))

    data['totalThemes'] = sum(1 for c in data['categories'] for _ in walk_themes(c))
    data['totalEvents'] = sum(len(t['events']) for c in data['categories'] for t in walk_themes(c))

    per_axis = {}
    for e in theme['events']:
        per_axis[e['axe']] = per_axis.get(e['axe'], 0) + 1
    print(f"{theme['id']} : {len(theme['events'])} personnages, {len(theme.get('essentiel', []))} incontournables, "
          f"{sum(1 for e in theme['events'] if 'image' in e)} portraits, "
          f"{sum(1 for e in theme['events'] if 'biographie' in e)} biographies liées")
    for axe in src['axes']:
        print(f'   {per_axis.get(axe, 0):3d}  {axe}')
    for w in warnings:
        print('  ! ' + w)
    if args.check:
        print('(--check : data/fr.json n\'est pas modifié)')
        return
    with open(DATA, 'w', encoding='utf-8') as f:
        f.write(json.dumps(data, indent=2, ensure_ascii=False) + '\n')
    print(f"data/fr.json écrit : {data['totalThemes']} thèmes, {data['totalEvents']} événements")


if __name__ == '__main__':
    main()
