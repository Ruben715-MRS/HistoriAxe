#!/usr/bin/env python3
"""Récupère les portraits d'un panthéon depuis Wikimedia Commons.

    python3 scripts/fetch_portraits.py fr                 # les portraits pas encore résolus
    python3 scripts/fetch_portraits.py fr --only hugo,sand
    python3 scripts/fetch_portraits.py fr --force         # tout re-télécharger et re-vérifier
    python3 scripts/fetch_portraits.py fr --check         # hors réseau : contrôle l'existant
    python3 scripts/fetch_portraits.py hispam             # un panthéon de région : même chose

Entrée et sortie : scripts/pantheon/<code>.json (`fr`, `hispam`…). Chaque personnage y porte un
`portrait` : {fichier, legende, recadrage?, largeur?, auteur?, licence?}. Seuls
`fichier` (nom du fichier sur Commons) et `legende` (écrite à la main, voir
plus bas) sont à fournir ; `recadrage` ([x0, y0, x1, y1], en fractions de
l'image) serre le cadre sur le visage, et `largeur` impose 500 ou 960 px si
Commons refuse l'une des deux pour un fichier donné ; ce script remplit `auteur` et `licence` d'après la page du
fichier, et écrit assets/portraits/pan_<code>_<slug>.jpg (320 × 400).
Puis `python3 scripts/build_pantheon.py <code>` reporte le tout dans data/fr.json.

Pourquoi lire la page du fichier plutôt que d'écrire la licence à la main : une
licence mal recopiée, c'est un crédit faux dans l'application. Le script lit
les balises que Commons publie pour cela (`licensetpl_short`) et REFUSE tout
fichier dont la licence n'est pas dans la liste : domaine public, CC0, CC BY,
CC BY-SA. Jamais de « NC » (l'application est distribuée sur l'App Store) ni de
« ND » (les images sont recadrées, donc modifiées).

La légende, elle, reste manuelle : elle doit dire ce qu'on voit — photographie,
peinture d'époque, représentation posthume — et c'est une phrase d'historien.
« Charlemagne, portrait imaginaire peint par Albrecht Dürer en 1512 » dit
quelque chose que ni le nom du fichier ni sa licence ne diront.

Réseau : une requête à la fois, une pause entre deux, un User-Agent qui dit qui
on est. Wikimedia limite sévèrement les clients qui ne le font pas (réponse 429),
et les API de métadonnées (api.php) sont fermées aux IP partagées des
environnements en nuage : on lit donc la page HTML du fichier, qui ne l'est pas.
Les miniatures n'existent qu'en largeurs standard (330, 500, 960…).
"""
import argparse
import html
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
PORTRAIT_DIR = os.path.join(ROOT, 'assets', 'portraits')
UA = 'HistoriAxe-portraits/0.1 (+https://github.com/Ruben715-MRS/HistoriAxe)'
OUT_W, OUT_H = 320, 400
RATIO = OUT_W / OUT_H
PAUSE = 2.0

# Mentions qui, sur la page d'un fichier, disent qu'il ne faut pas s'en servir.
BAD_MARKERS = (
    'candidate for deletion', 'speedy deletion', 'copyright violation', 'no permission since',
    'possible copyright violation', 'fair use', 'non-free', 'this file has been nominated',
)


def licence_label(short):
    """Libellé affichable d'une licence acceptée, ou None si elle ne l'est pas."""
    s = html.unescape(short).strip()
    if re.fullmatch(r'Public domain|Domaine public', s, re.I):
        return 'Domaine public'
    if re.fullmatch(r'CC0(?: 1\.0)?|CC-Zero', s, re.I):
        return 'CC0 (domaine public)'
    m = re.fullmatch(r'CC[ -]BY(-SA)?[ -](\d\.\d)(?: ([A-Za-z]{2,3}))?', s, re.I)
    if m:
        return ('CC BY-SA ' if m.group(1) else 'CC BY ') + m.group(2) + (' ' + m.group(3).upper() if m.group(3) else '')
    return None


def best_licence(labels):
    """Un fichier sous plusieurs licences (GFDL ou CC BY-SA, par exemple) s'utilise sous
    l'UNE d'elles : on retient, parmi les admises, la plus permissive — domaine public,
    CC0, CC BY, puis CC BY-SA, à version égale la plus récente."""
    admises = [label for label in labels if label]
    if not admises:
        return None

    def rang(label):
        if label == 'Domaine public':
            return (0, 0)
        if label.startswith('CC0'):
            return (1, 0)
        version = float(re.search(r'\d\.\d', label).group())
        return (3 if label.startswith('CC BY-SA') else 2, -version)

    return min(admises, key=rang)


TAG = re.compile(r'<(?:[^>"\']|"[^"]*"|\'[^\']*\')*>')


def text_of(fragment):
    s = re.sub(r'<style.*?</style>', '', fragment, flags=re.S)
    s = TAG.sub(' ', s)
    s = re.sub(r'\[\d+\]', '', html.unescape(s))
    return re.sub(r'\s+', ' ', s).strip()


def fetch(url, tries=4):
    delay = 6
    for attempt in range(tries):
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < tries - 1:
                print(f'    429, nouvelle tentative dans {delay} s…')
                time.sleep(delay)
                delay *= 2
                continue
            raise
    raise RuntimeError('inatteignable')


def parse_file_page(page):
    page = page.replace('&#95;', '_')

    def cell(*ids):
        for i in ids:
            m = re.search(r'id="%s"[^>]*>.*?</td>\s*<td[^>]*>(.*?)</td>' % i, page, re.S)
            if m:
                return text_of(m.group(1))
        return None

    return {
        # `[^>]*` : selon le modèle de licence, la balise porte ou non un style (display:none).
        'licences': [text_of(x) for x in re.findall(r'class="licensetpl_short"[^>]*>(.*?)</span>', page, re.S)],
        'auteur': cell('fileinfotpl_aut', 'fileinfotpl_art_artist'),
        'date': cell('fileinfotpl_date', 'fileinfotpl_art_date'),
        'description': cell('fileinfotpl_desc', 'fileinfotpl_art_title'),
        'alertes': [k for k in BAD_MARKERS if k in page.lower()],
    }


def commons_url(fichier):
    return 'https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(fichier.replace(' ', '_'), safe="_()-,.!~*")


def make_portrait(data, recadrage):
    """Image recadrée en 4:5 et réduite à 320 × 400. Sans `recadrage` : le centre si
    l'image est plus large que 4:5, le HAUT si elle est plus haute (on garde la tête)."""
    im = Image.open(io.BytesIO(data))
    if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
        flat = Image.new('RGB', im.size, 'white')
        flat.paste(im.convert('RGBA'), mask=im.convert('RGBA').split()[-1])
        im = flat
    im = im.convert('RGB')
    w, h = im.size
    x0, y0, x1, y1 = (recadrage or [0, 0, 1, 1])
    x0, x1, y0, y1 = int(x0 * w), int(x1 * w), int(y0 * h), int(y1 * h)
    bw, bh = x1 - x0, y1 - y0
    if bw / bh > RATIO:                      # trop large : on rogne les côtés, au centre
        nw = int(bh * RATIO)
        x0 += (bw - nw) // 2
        bw = nw
    else:                                    # trop haut : on rogne le bas, la tête reste
        bh = int(bw / RATIO)
    im = im.crop((x0, y0, x0 + bw, y0 + bh))
    return im.resize((OUT_W, OUT_H), Image.LANCZOS)


def check_offline(src, code):
    problems = []
    for p in src['personnages']:
        portrait = p.get('portrait') or {}
        event_id = f"pan_{code}_{p['slug']}"
        path = os.path.join(PORTRAIT_DIR, event_id + '.jpg')
        if not portrait.get('licence'):
            problems.append(f"{p['slug']}: licence non résolue")
            continue
        if not licence_label(portrait['licence'].replace('Domaine public', 'Public domain')
                             .replace(' (domaine public)', '')) and portrait['licence'] != 'Domaine public':
            problems.append(f"{p['slug']}: licence « {portrait['licence']} » non autorisée")
        for field in ('legende', 'auteur', 'fichier'):
            if not portrait.get(field):
                problems.append(f"{p['slug']}: « {field} » manquant")
        if not os.path.exists(path):
            problems.append(f"{p['slug']}: {event_id}.jpg absent")
        else:
            with Image.open(path) as im:
                if im.size != (OUT_W, OUT_H):
                    problems.append(f"{p['slug']}: {im.size} au lieu de {(OUT_W, OUT_H)}")
    return problems


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('code', help='code du panthéon : fr, hispam… (fichier scripts/pantheon/<code>.json)')
    parser.add_argument('--only', help='slugs séparés par des virgules')
    parser.add_argument('--force', action='store_true')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()

    src_path = os.path.join(ROOT, 'scripts', 'pantheon', f'{args.code}.json')
    with open(src_path, encoding='utf-8') as f:
        src = json.load(f)

    if args.check:
        problems = check_offline(src, args.code)
        for line in problems:
            print('  -', line)
        print(f'{len(src["personnages"]) - len({q.split(":")[0] for q in problems})} portraits en règle, {len(problems)} problème(s)')
        sys.exit(1 if problems else 0)

    only = set(args.only.split(',')) if args.only else None
    os.makedirs(PORTRAIT_DIR, exist_ok=True)
    refused, failed, done = [], [], 0
    for p in src['personnages']:
        if only and p['slug'] not in only:
            continue
        portrait = p.get('portrait')
        if not portrait or not portrait.get('fichier'):
            continue
        event_id = f"pan_{args.code}_{p['slug']}"
        out = os.path.join(PORTRAIT_DIR, event_id + '.jpg')
        if not args.force and portrait.get('licence') and os.path.exists(out):
            continue
        print(f"{p['slug']:14s} {portrait['fichier']}")
        try:
            meta = parse_file_page(fetch(commons_url(portrait['fichier'])).decode('utf-8', 'replace'))
            time.sleep(PAUSE)
            labels = [licence_label(s) for s in meta['licences']]
            chosen = best_licence(labels)
            print(f"    licence(s) : {meta['licences']}  -> {labels}  => {chosen}")
            print(f"    auteur     : {(meta['auteur'] or '?')[:150]}")
            print(f"    date       : {(meta['date'] or '?')[:80]}")
            if meta['alertes']:
                print(f"    ALERTE     : {meta['alertes']}")
            if chosen is None or meta['alertes']:
                refused.append(p['slug'])
                print('    -> REFUSÉ : licence absente, non libre ou fichier signalé')
                continue
            data = fetch('https://commons.wikimedia.org/wiki/Special:FilePath/'
                         + urllib.parse.quote(portrait['fichier'].replace(' ', '_'), safe='_()-,.')
                         + f"?width={portrait.get('largeur') or (960 if portrait.get('recadrage') else 500)}")
            make_portrait(data, portrait.get('recadrage')).save(out, 'JPEG', quality=82, optimize=True, progressive=True)
            portrait['licence'] = chosen
            if not portrait.get('auteur') and meta['auteur'] and len(meta['auteur']) <= 90:
                portrait['auteur'] = meta['auteur']
            done += 1
            print(f'    -> ok ({os.path.getsize(out) // 1024} Ko)')
        except Exception as e:  # noqa: BLE001 — on rapporte et on continue avec le suivant
            failed.append(p['slug'])
            print(f'    -> ERREUR : {e!r}')
        with open(src_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(src, indent=2, ensure_ascii=False) + '\n')
        time.sleep(PAUSE)
    print(f'\n{done} portrait(s) récupéré(s) ; refusés : {refused or "aucun"} ; en erreur : {failed or "aucun"}')


if __name__ == '__main__':
    main()
