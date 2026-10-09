#!/usr/bin/env python3
"""Construit un panthéon dans data/fr.json.

    python3 scripts/build_pantheon.py fr            # écrit data/fr.json
    python3 scripts/build_pantheon.py fr --check    # valide, n'écrit rien
    python3 scripts/build_pantheon.py hispam        # un « bloc » : plusieurs pays

Source : scripts/pantheon/<code>.json (voir le README, section « Panthéons »).
Cible : le thème `pan_<code>` de « Personnages illustres > Panthéons ». Relancer
le script remplace ce thème — il est la seule source de vérité de son contenu,
ne pas le retoucher à la main dans fr.json.

Deux sortes de panthéons, distinguées par la longueur du code :
  - un PAYS a un code ISO à deux lettres (`fr` → `pan_fr`) ;
  - un BLOC rassemble plusieurs pays qui partagent une histoire (`hispam` →
    `pan_hispam`, plus tard `maghreb`) : trois lettres au moins, pour qu'aucun
    code de bloc n'entre jamais en collision avec un code de pays. Chaque
    personnage d'un bloc porte alors son pays (`pays`, ISO à deux lettres), qui
    sert à l'afficher et à la Simultanéité.

Pourquoi un script plutôt qu'une saisie directe dans fr.json : chaque fiche
doit respecter les mêmes règles (une naissance par personnage, une phrase
d'ouverture « Nom (naissance-décès) est… » dont l'année doit être la date de
l'événement, trois phrases, un axe connu, un lien de biographie qui existe), et
quarante ou cent personnages écrits à la main s'y trompent tôt ou tard. Une
règle vaut entre panthéons : un personnage n'apparaît que dans UN thème. Les
règles sont vérifiées ici, avant l'écriture, et par tests/data-schema.test.js
et tests/pantheon.test.js après.
"""
import argparse
import glob
import json
import os
import re
import sys
import unicodedata
from urllib.parse import quote

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
DATA = os.path.join(ROOT, 'data', 'fr.json')
SOURCES = os.path.join(ROOT, 'scripts', 'pantheon')
CATEGORY = 'Personnages illustres'
SECTION = 'Panthéons'
BIOGRAPHIES = 'Biographies'
PORTRAIT_DIR = 'assets/portraits'

# Équilibre d'un bloc : les pays n'ont pas à y être représentés à égalité — le
# Mexique pèse un cinquième de l'Amérique hispanique, l'Algérie plus d'un tiers du
# Maghreb — mais un panthéon dont la moitié des figures viendrait d'un seul pays
# n'en serait plus un. Au-delà de 40 % des figures on prévient (sans bloquer) :
# c'est un jugement éditorial. Un pays listé doit avoir au moins une figure
# (sinon il n'a rien à faire dans le bloc).
MAX_PART_PAYS = 0.4

# Première phrase : « Nom (1802-1885) est … » ; « vers » devant une année
# incertaine ; « av. J.-C. » une fois, à la fin, valable pour les deux années.
# Une vie qui enjambe l'ère chrétienne (Auguste, Ovide) dit les deux : « 63 av.
# J.-C.-14 ap. J.-C. » — « av. J.-C. » après l'année de naissance, « ap. J.-C. » à la fin.
OPENING = re.compile(r'^(?P<nom>.+?) \((?P<dates>[^()]+)\) (?:est|était) ')
DATES = re.compile(r'^(?:vers )?(?P<naissance>\d{1,4})(?P<av_naissance> av\. J\.-C\.)?-(?:vers )?(?P<deces>\d{1,4})'
                   r'(?P<av> av\. J\.-C\.| ap\. J\.-C\.)?$')


def birth_year(dates):
    """Année de naissance lue dans « 1802-1885 », « vers 466-511 », « vers 82-46 av. J.-C. »."""
    m = DATES.match(dates)
    if not m:
        return None
    year = int(m.group('naissance'))
    avant = m.group('av_naissance') or (m.group('av') or '').strip().startswith('av.')
    return -year if avant else year


def sentence_count(text):
    protected = text.replace('av. J.-C.', 'av J-C').replace('ap. J.-C.', 'ap J-C')
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


def is_bloc(code):
    return len(code) >= 3


def wikipedia_url(title):
    return 'https://fr.wikipedia.org/wiki/' + quote(title, safe="_()-,.")


def load_source_names():
    """code → nom de rangement de CHAQUE source (« France », « Amérique hispanique »).
    Les panthéons se rangent par ce nom, pas par celui du thème (« Grandes figures
    de France » / « d'Allemagne » / « des États-Unis » : la particule fausserait l'ordre)."""
    names = {}
    for path in glob.glob(os.path.join(SOURCES, '*.json')):
        with open(path, encoding='utf-8') as f:
            other = json.load(f)
        names[other['code']] = other['nom']
    return names


def validate(src, code, bio_themes, other_pantheons, errors, warnings):
    if src.get('code') != code:
        errors.append(f"« code » de la source ({src.get('code')}) ≠ nom du fichier ({code})")
    if not re.fullmatch(r'[a-z]{2,}', code):
        errors.append(f'code « {code} » invalide : deux lettres pour un pays, trois ou plus pour un bloc')
    if not src.get('nom'):
        errors.append('« nom » (nom de rangement : « France », « Amérique hispanique ») manquant')
    theme_id = src['theme']['id']
    if theme_id != f'pan_{code}':
        errors.append(f"l'id du thème doit être pan_{code}, pas {theme_id}")

    bloc = is_bloc(code)
    countries = src.get('pays')
    if bloc:
        if (not isinstance(countries, list) or len(countries) < 2
                or any(not isinstance(c, str) or not re.fullmatch(r'[A-Z]{2}', c) for c in countries)
                or len(countries) != len(set(countries))):
            errors.append('un bloc déclare « pays » : la liste (≥ 2, sans doublon) des codes ISO à deux lettres majuscules')
            countries = []
    elif 'pays' in src:
        errors.append('« pays » est réservé aux blocs : un pays (code à deux lettres) n\'en déclare pas')
    mots = src['theme'].get('motsCles')
    if mots is not None and (not isinstance(mots, list) or not mots
                             or any(not isinstance(m, str) or not m.strip() for m in mots)):
        errors.append('theme.motsCles doit être une liste de mots non vides')

    axes = src['axes']
    if len(axes) != len(set(axes)):
        errors.append('axes en double')
    used = set()
    slugs = set()
    seen_wiki = {}
    seen_bio = {}
    per_country = {}
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
        if bloc:
            if p.get('pays') not in countries:
                errors.append(f"{who}: pays « {p.get('pays')} » absent de la liste du bloc")
            else:
                per_country[p['pays']] = per_country.get(p['pays'], 0) + 1
        elif 'pays' in p:
            errors.append(f'{who}: « pays » n\'a de sens que dans un bloc')
        if p.get('biographie'):
            bio = bio_themes.get(p['biographie'])
            if bio is None:
                errors.append(f"{who}: biographie « {p['biographie']} » introuvable dans Personnages illustres > Biographies")
            elif min(e['date'] for e in bio['events']) != p['naissance']:
                errors.append(
                    f"{who}: naissance {p['naissance']} ≠ {min(e['date'] for e in bio['events'])} "
                    f"dans la biographie {p['biographie']} (une même personne, une même date)")
        # Un personnage = un seul thème, dans ce panthéon comme dans les autres.
        url = wikipedia_url(p['wikipedia'])
        for label, key, seen_here, seen_elsewhere in (
                ('article', url, seen_wiki, other_pantheons['wikipedia']),
                ('biographie', p.get('biographie'), seen_bio, other_pantheons['biographie'])):
            if not key:
                continue
            if key in seen_here:
                errors.append(f"{who}: même {label} que {seen_here[key]} ({key}) — un personnage, une seule fiche")
            seen_here[key] = who
            if key in seen_elsewhere:
                errors.append(f"{who}: déjà dans le panthéon {seen_elsewhere[key]} (même {label} : {key}) — "
                              f"un personnage ne figure que dans un seul thème")
    for axe in axes:
        if axe not in used:
            errors.append(f'axe « {axe} » sans aucun personnage')
    if bloc:
        for iso in countries:
            count = per_country.get(iso, 0)
            if count == 0:
                errors.append(f'pays {iso} déclaré sans aucun personnage')
            elif count > MAX_PART_PAYS * len(src['personnages']):
                warnings.append(f"{iso} : {count} personnages sur {len(src['personnages'])} "
                                f"(> {MAX_PART_PAYS:.0%}) — un pays pèse trop dans le bloc")
    return per_country


def other_pantheon_index(section, theme_id):
    """Articles et biographies déjà pris par les AUTRES panthéons de data/fr.json."""
    index = {'wikipedia': {}, 'biographie': {}}
    for theme in section['themes']:
        if theme['id'] == theme_id:
            continue
        for e in theme['events']:
            index['wikipedia'][e['wikipedia']] = theme['id']
            if e.get('biographie'):
                index['biographie'][e['biographie']] = theme['id']
    return index


def build_theme(src, code, warnings):
    bloc = is_bloc(code)
    events = []
    for p in sorted(src['personnages'], key=lambda p: (p['naissance'], p['slug'])):
        event_id = f"pan_{code}_{p['slug']}"
        event = {
            'id': event_id,
            'axe': p['axe'],
            'date': p['naissance'],
            'titre': p['titre'],
            'description': p['description'],
            'wikipedia': wikipedia_url(p['wikipedia']),
        }
        if bloc:
            event['pays'] = p['pays']
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
    essentials = [f"pan_{code}_{p['slug']}" for p in sorted(src['personnages'], key=lambda p: (p['naissance'], p['slug']))
                  if p.get('essentiel')]
    theme = {
        'id': src['theme']['id'],
        'nom': src['theme']['nom'],
        'difficulte': src['theme']['difficulte'],
    }
    if src['theme'].get('motsCles'):
        theme['motsCles'] = list(src['theme']['motsCles'])
    theme['events'] = events
    theme['axeOrder'] = list(src['axes'])
    if essentials:
        theme['essentiel'] = essentials
    return theme


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('code', help='code du panthéon : pays ISO à deux lettres (fr) ou bloc (hispam) ; '
                                     'fichier scripts/pantheon/<code>.json')
    parser.add_argument('--check', action='store_true', help="valider sans écrire data/fr.json")
    parser.add_argument('--verify', action='store_true',
                        help="vérifier que data/fr.json est à jour avec la source (code de sortie 1 sinon)")
    args = parser.parse_args()
    code = args.code

    with open(os.path.join(SOURCES, f'{code}.json'), encoding='utf-8') as f:
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
    per_country = validate(src, code, bio_themes, other_pantheon_index(section, f'pan_{code}'), errors, warnings)
    if errors:
        print('ERREURS :')
        for e in errors:
            print('  -', e)
        sys.exit(1)

    theme = build_theme(src, code, warnings)
    if args.verify:
        existing = next((t for t in section['themes'] if t['id'] == theme['id']), None)
        if existing == theme:
            print(f"{theme['id']} : data/fr.json est à jour avec scripts/pantheon/{code}.json")
            return
        print(f"{theme['id']} : data/fr.json DIFFÈRE de scripts/pantheon/{code}.json — "
              f"modifier la source, puis relancer `python3 scripts/build_pantheon.py {code}`.")
        if existing is None:
            print('  le thème est absent de data/fr.json')
        else:
            before = {e['id']: e for e in existing['events']}
            for e in theme['events']:
                if before.get(e['id']) != e:
                    print(f"  événement différent : {e['id']}")
            for key in ('nom', 'difficulte', 'motsCles', 'axeOrder', 'essentiel'):
                if existing.get(key) != theme.get(key):
                    print(f'  champ différent : {key}')
        sys.exit(1)
    others = [t for t in section['themes'] if t['id'] != theme['id']]
    others.append(theme)
    names = load_source_names()
    section['themes'] = sorted(others, key=lambda t: collation_key(names.get(t['id'][len('pan_'):], t['nom'])))

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
    if per_country:
        print('   par pays : ' + ', '.join(f'{iso} {n}' for iso, n in sorted(per_country.items(), key=lambda kv: (-kv[1], kv[0]))))
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
