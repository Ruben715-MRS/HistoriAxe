#!/usr/bin/env python3
"""Cherche des portraits libres sur Wikimedia Commons, sans passer par l'API.

    python3 scripts/search_portraits.py "Saladin portrait" "Saladin Soldan"
    python3 scripts/search_portraits.py "Ghassan Kanafani" --max 8

Pour chaque requête, liste les fichiers image trouvés avec leur taille, leur
licence (même liste que `fetch_portraits.py`), leur date, leur auteur et leur
statut américain d'après les modèles de licence de la page. Ce script ne
télécharge rien et n'écrit rien : il sert à choisir le nom de fichier Commons
qu'on mettra dans `scripts/pantheon/<code>.json`.

Pourquoi pas l'API : `api.php` répond 429 (`retry-after: 10`) aux IP partagées des
environnements en nuage, même à une requête toutes les dix secondes, et ce
blocage dure. La recherche (`Special:Search`) et les pages de fichier, elles,
répondent. Une requête toutes les 11 secondes ; un 429 double l'attente.

Statut américain (colonne « US ») : `oui` si la page porte un modèle américain
(PD-US*, PD-old*, PD-1923, PD-USGov*, PD-self, CC…), `NON` si elle porte
Not-PD-US*, `?` s'il n'y a que la loi d'un pays (PD-Irak, PD-Liban…) — c'est le
cas qui a coûté huit figures à l'Amérique hispanique. Un modèle américain
n'est qu'une déclaration de l'importateur : « publié aux États-Unis sans mention de
copyright » (PD-US-no_notice) sur une photographie libanaise de 1964 est douteux.
"""
import argparse
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

sys.dont_write_bytecode = True
sys.path.insert(0, __file__.rsplit('/', 1)[0])
import fetch_portraits as fp  # noqa: E402

PAUSE = 11
IMAGE = re.compile(r'\.(jpe?g|png)$', re.I)
US_OK = re.compile(r'^(PD-US(?!-no-notice-UN)|PD-USGov|PD-old|PD-1923|PD-self|PD-user|PD-Art|PD-Matson|'
                   r'PD-anon-expired|Cc-by(?:-sa)?-\d|Cc-zero)', re.I)


def get(url, tries=5):
    delay = 15
    for _ in range(tries):
        time.sleep(PAUSE)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': fp.UA})
            return urllib.request.urlopen(req, timeout=60).read().decode('utf-8', 'replace')
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f'    429, nouvelle tentative dans {delay} s…', file=sys.stderr)
                time.sleep(delay)
                delay *= 2
                continue
            return ''
        except OSError as e:
            print(f'    {e}', file=sys.stderr)
            time.sleep(delay)
    return ''


def search(query, limit):
    url = 'https://commons.wikimedia.org/w/index.php?' + urllib.parse.urlencode(
        dict(search=query, title='Special:Search', profile='images', fulltext=1, limit=limit))
    names = []
    for m in re.findall(r'href="/wiki/File:([^"#?]+)"', get(url)):
        name = urllib.parse.unquote(m).replace('_', ' ')
        if IMAGE.search(name) and name not in names:
            names.append(name)
    return names


def us_status(page):
    templates = {t.split('/')[0] for t in re.findall(r'Template:([A-Za-z0-9_\-]+(?:/[a-z\-]+)?)', page)}
    templates = {t.replace('_', '-') for t in templates}
    if any(t.startswith('Not-PD-US') for t in templates):
        return 'NON'
    return 'oui' if any(US_OK.match(t) for t in templates) else '?'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('requetes', nargs='+')
    ap.add_argument('--max', type=int, default=5, help='fichiers examinés par requête (5)')
    args = ap.parse_args()
    for q in args.requetes:
        print(f'== {q}')
        for name in search(q, args.max + 3)[:args.max]:
            page = get(fp.commons_url(name))
            if not page:
                continue
            info = fp.parse_file_page(page)
            dim = re.search(r'\(([\d,]+) × ([\d,]+) pixels', page)
            size = f'{dim.group(1)} × {dim.group(2)}' if dim else 'taille ?'
            labels = [fp.licence_label(x) for x in info['licences']]
            lic = next((x for x in labels if x), 'HORS LISTE (' + '; '.join(info['licences'][:2]) + ')')
            print(f"  {name}\n      {size} | {lic} | US {us_status(page)} | {(info['date'] or '')[:24]} | "
                  f"{(info['auteur'] or '')[:30]}" + (f" | ALERTE {info['alertes']}" if info['alertes'] else ''))


if __name__ == '__main__':
    main()
