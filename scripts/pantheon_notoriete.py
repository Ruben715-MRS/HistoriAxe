#!/usr/bin/env python3
"""Mesure la notoriété de chaque personnage des panthéons, pour les niveaux de « Qui suis-je ? ».

    python3 scripts/pantheon_notoriete.py collecte            # interroge Wikidata (reprend où il s'était arrêté)
    python3 scripts/pantheon_notoriete.py collecte --limite 100
    python3 scripts/pantheon_notoriete.py repartition         # distribution des mesures et seuils proposés
    python3 scripts/pantheon_notoriete.py etoiles --ecrire    # écrit le champ `etoiles` dans scripts/pantheon/*.json

La mesure : le NOMBRE DE LIENS INTERLANGUES de l'élément Wikidata de la personne, c'est-à-dire le nombre de
pages (surtout des éditions de Wikipédia, un peu de Commons, Wikiquote…) qui parlent d'elle : Napoléon Ier en a près
de trois cents, un héros national d'un petit pays quelques dizaines. C'est un indice classique de notoriété mondiale,
stable d'une année à l'autre, qui ne dépend ni de l'actualité ni du pays du lecteur. Ses limites : il favorise
les figures occidentales et celles que les Wikipédias de langues voisines ont recopiées ; un lecteur local peut
connaître très bien quelqu'un que le monde ignore (c'est voulu : le jeu mesure la réputation dans le monde).

Étoiles : ★ peu connu dans le monde (difficile), ★★ moyennement connu (moyen), ★★★ universellement connu (facile).
Les seuils sont fixés par `repartition` d'après la distribution réelle, puis écrits en tête de SEUILS ci-dessous.
Un personnage dont la mesure est proche d'un seuil, ou dont l'étoile choisie est discutable, est listé dans
scripts/notoriete/a_relire.md ; les corrections de jugement se mettent dans CORRECTIONS (avec une raison).

Politesse envers les serveurs de Wikimedia : une requête à la fois, un User-Agent qui dit qui on est, des requêtes
SPARQL de trois cents personnages (l'API ordinaire est bien plus limitée), et on attend le délai qu'ils demandent
(`Retry-After`) quand ils limitent le débit.
Le résultat de la collecte est gardé dans scripts/notoriete/mesures.json : on ne réinterroge jamais un
personnage déjà mesuré.
"""
import argparse
import glob
import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SOURCES = os.path.join(ROOT, 'scripts', 'pantheon')
DOSSIER = os.path.join(ROOT, 'scripts', 'notoriete')
CACHE = os.path.join(DOSSIER, 'mesures.json')
A_RELIRE = os.path.join(DOSSIER, 'a_relire.md')

USER_AGENT = 'HistoriAxe-notoriete/1.0 (https://github.com/Ruben715-MRS/HistoriAxe; ruben.arditti@gmail.com)'
API_SPARQL = 'https://query.wikidata.org/sparql'
API_WIKIPEDIA = 'https://fr.wikipedia.org/w/api.php'
LOT = 50               # pour l'API de Wikipédia
LOT_SPARQL = 300       # articles par requête SPARQL
PAUSE = 1.5            # secondes entre deux appels, au minimum

# Seuils : nombre de liens à partir duquel on passe à l'étoile supérieure. Fixés d'après `repartition` : à 150 liens on
# trouve Verdi, Proust, Pelé, Hô Chi Minh, Audrey Hepburn (connus presque partout) ; à 60, Giotto, Cavour, Sejong, Mossadegh
# (connus d'un public déjà averti) ; en dessous, des figures nationales ou régionales (Vondel, Ulmanis, Manu Dibango).
SEUILS = {'deux_etoiles': 60, 'trois_etoiles': 150}

# Corrections de jugement : « code/slug » -> (étoiles, raison). La mesure reste la règle ; on ne corrige que ce qu'elle ne
# peut pas voir, et on dit pourquoi. Elle favorise les Wikipédias occidentales : une figure immense en Asie ou une
# invention universelle peut y compter moins de liens qu'un écrivain européen du XIXe siècle.
CORRECTIONS = {
    'maghreb/hannibal': (3, "Un des chefs de guerre les plus connus de l'Antiquité, partout : 141 liens seulement."),
    'fr/piaf': (3, "Chanteuse française connue dans le monde entier (« La Vie en rose ») ; 146 liens, à peine sous le seuil."),
    'cn/zhugeliang': (2, "Stratège mythique de la Chine, du Japon, de la Corée et du Vietnam ; l'Asie le connaît bien plus que ses 59 liens."),
    'cn/guanyu': (2, "Divinité populaire dans toute l'Asie de l'Est (Guan Di) : bien plus connu que ses 52 liens."),
    'dach/wgrimm': (2, "Les frères Grimm : leurs contes sont lus dans le monde entier ; 58 liens, juste sous le seuil."),
    'fr/bleriot': (2, "La première traversée de la Manche en avion (1909) : un nom d'aviation connu bien au-delà de ses 56 liens."),
    'br/santosdumont': (2, "Pionnier de l'aviation, héros brésilien connu bien au-delà : 57 liens, juste sous le seuil."),
    'us/sacagawea': (2, "Figure américaine très connue (guide de l'expédition Lewis et Clark, pièce de monnaie à son effigie) ; 51 liens."),
    'scandinavie/lagerlof': (2, "Prix Nobel de littérature ; connue des lecteurs, pas « universelle » : 155 liens, juste au-dessus du seuil."),
    'it/boccace': (2, "Le Décaméron est un classique, mais l'auteur n'est pas connu de tous : 151 liens, juste au-dessus du seuil."),
    'it/bruno': (2, "Philosophe et martyr connu des seuls lecteurs : 151 liens, juste au-dessus du seuil."),
    # Quatre personnages que Wikidata n'a pas pu rattacher (titre devenu introuvable) : étoile estimée.
    'afriquecentrale/mwambutsa': (1, "Roi du Burundi (1915-1977) : figure régionale, peu connue dans le monde. Pas de mesure."),
    'benelux/thorbecke': (1, "Homme d'État néerlandais du XIXe siècle, auteur de la constitution de 1848 : connu aux Pays-Bas, peu ailleurs. Pas de mesure."),
    'cy/bragadin': (1, "Défenseur vénitien de Famagouste (1571) : figure locale. Pas de mesure."),
    'ir/shariati': (1, "Sociologue iranien (1933-1977), idéologue de la révolution : connu des spécialistes. Pas de mesure."),
}


def sources():
    """[(code, personnage)] pour tous les panthéons, dans l'ordre des fichiers."""
    out = []
    for path in sorted(glob.glob(os.path.join(SOURCES, '*.json'))):
        with open(path, encoding='utf-8') as f:
            doc = json.load(f)
        for p in doc.get('personnages', []):
            out.append((doc['code'], p))
    return out


def cle(code, p):
    return code + '/' + p['slug']


def charge_cache():
    if os.path.exists(CACHE):
        with open(CACHE, encoding='utf-8') as f:
            return json.load(f)
    return {}


def enregistre_cache(cache):
    tmp = CACHE + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(cache, f, ensure_ascii=False, indent=0, sort_keys=True)
    os.replace(tmp, CACHE)


def attend_et_reessaie(requete):
    """Exécute `requete()` ; sur une limite de débit ou une erreur réseau, attend le délai demandé puis réessaie."""
    for essai in range(8):
        try:
            return requete()
        except urllib.error.HTTPError as e:
            if e.code in (429, 503):
                attente = int(e.headers.get('Retry-After') or 30) + 2
                print('  limite de débit (%d) : on attend %d s' % (e.code, attente), flush=True)
                time.sleep(attente)
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as e:
            print('  réseau : %s ; nouvel essai dans 20 s' % e, flush=True)
            time.sleep(20)
    raise RuntimeError('trop d\'échecs')


def lit_json(req):
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.load(r)


def sparql(requete):
    """Une requête SPARQL (en POST : la liste des articles est longue)."""
    corps = urllib.parse.urlencode({'query': requete, 'format': 'json'}).encode()
    req = urllib.request.Request(API_SPARQL, data=corps, headers={
        'User-Agent': USER_AGENT, 'Accept': 'application/sparql-results+json'})
    return attend_et_reessaie(lambda: lit_json(req))['results']['bindings']


def wikipedia(params):
    url = API_WIKIPEDIA + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT, 'Accept': 'application/json'})
    return attend_et_reessaie(lambda: lit_json(req))


def titre(p):
    return urllib.parse.unquote(p['wikipedia']).replace('_', ' ')


def iri(t):
    """L'adresse d'un article de fr.wikipedia telle que Wikidata la note (comme wfUrlencode de MediaWiki)."""
    return 'https://fr.wikipedia.org/wiki/' + urllib.parse.quote(t.replace(' ', '_'), safe=";@$!*(),/:~")


def liens_par_article(titres):
    """{ titre : (qid, nombre de liens interlangues) } pour les articles que Wikidata connaît sous exactement ce titre."""
    valeurs = ' '.join('<%s>' % iri(t) for t in titres)
    lignes = sparql('SELECT ?a ?item ?n WHERE { VALUES ?a { %s } ?a schema:about ?item . ?item wikibase:sitelinks ?n }' % valeurs)
    par_iri = {l['a']['value']: (l['item']['value'].rsplit('/', 1)[1], int(l['n']['value'])) for l in lignes}
    return {t: par_iri[iri(t)] for t in titres if iri(t) in par_iri}


def liens_par_qid(qids):
    valeurs = ' '.join('wd:%s' % q for q in qids)
    lignes = sparql('SELECT ?item ?n WHERE { VALUES ?item { %s } ?item wikibase:sitelinks ?n }' % valeurs)
    return {l['item']['value'].rsplit('/', 1)[1]: int(l['n']['value']) for l in lignes}


CLASSES_NON_PERSONNE = 'wd:Q4167410 wd:Q22808320 wd:Q13406463 wd:Q11266439 wd:Q4167836'   # homonymie, liste, modèle, catégorie…


def qid_non_personnes(qids):
    """Parmi `qids`, ceux qui sont une page d'homonymie, une liste ou une catégorie (et non une personne)."""
    out = set()
    for i in range(0, len(qids), 400):
        lot = qids[i:i + 400]
        lignes = sparql('SELECT DISTINCT ?item WHERE { VALUES ?item { %s } ?item wdt:P31 ?cls . VALUES ?cls { %s } }'
                        % (' '.join('wd:' + q for q in lot), CLASSES_NON_PERSONNE))
        out |= {l['item']['value'].rsplit('/', 1)[1] for l in lignes}
        time.sleep(PAUSE)
    return out


def litteral(texte):
    return '"' + texte.replace('\\', '\\\\').replace('"', '\\"') + '"'


def vraie_personne(nom, titre_wp, naissance):
    """(qid, liens) de la personne qui porte ce nom et est née à un an près de `naissance` ; la plus liée si plusieurs."""
    if not isinstance(naissance, int):
        return None
    noms = sorted({nom, titre_wp, titre_wp.split(' (')[0]})
    etiquettes = ' UNION '.join('{ ?h rdfs:label %s@fr } UNION { ?h rdfs:label %s@en } UNION { ?h skos:altLabel %s@fr }' % (litteral(n), litteral(n), litteral(n)) for n in noms)
    lignes = sparql('SELECT ?h ?n WHERE { ?h wdt:P31 wd:Q5 ; wdt:P569 ?b ; wikibase:sitelinks ?n . %s '
                    'FILTER(YEAR(?b) >= %d && YEAR(?b) <= %d) } ORDER BY DESC(?n) LIMIT 3' % (etiquettes, naissance - 1, naissance + 1))
    if not lignes:
        return None
    return lignes[0]['h']['value'].rsplit('/', 1)[1], int(lignes[0]['n']['value'])


def corrige_homonymies(cache):
    """Un lien Wikipédia des sources qui mène à une page d'homonymie ne dit rien de la notoriété de la personne : on cherche la vraie."""
    info = {cle(c, p): p for c, p in sources()}
    qids = sorted({v['qid'] for v in cache.values() if v.get('qid') and not v.get('homonymie')})
    faux = qid_non_personnes(qids)
    for k, v in sorted(cache.items()):
        if v.get('qid') in faux and not v.get('homonymie'):
            p = info[k]
            v['homonymie'] = True
            v['qid_homonymie'] = v['qid']
            vrai = vraie_personne(p['nom'], titre(p), p.get('naissance'))
            if vrai:
                v['qid'], v['liens'] = vrai
                print('  homonymie corrigée : %s -> %s (%d liens)' % (k, vrai[0], vrai[1]), flush=True)
            else:
                v['liens'] = None
                print('  homonymie SANS correction possible :', k, flush=True)
            time.sleep(PAUSE)
    enregistre_cache(cache)


def collecte(limite):
    cache = charge_cache()
    todo = [(c, p) for c, p in sources() if cle(c, p) not in cache]
    if limite:
        todo = todo[:limite]
    print('%d personnages à mesurer (%d déjà en cache)' % (len(todo), len(cache)), flush=True)
    introuvables = []
    for i in range(0, len(todo), LOT_SPARQL):
        lot = todo[i:i + LOT_SPARQL]
        trouves = liens_par_article([titre(p) for _, p in lot])
        for c, p in lot:
            v = trouves.get(titre(p))
            if v:
                cache[cle(c, p)] = {'qid': v[0], 'liens': v[1]}
            else:
                introuvables.append((c, p))
        enregistre_cache(cache)
        print('%d / %d' % (min(i + LOT_SPARQL, len(todo)), len(todo)), flush=True)
        time.sleep(PAUSE)
    # Les titres que Wikidata ne connaît pas tels quels sont presque toujours des redirections (« Knut le Grand » → « Cnut le Grand ») :
    # Wikipédia dit vers quoi elles mènent et donne l'élément Wikidata, dont on compte alors les liens.
    print('%d titres à résoudre par redirection' % len(introuvables), flush=True)
    for i in range(0, len(introuvables), LOT):
        lot = introuvables[i:i + LOT]
        titres = [titre(p) for _, p in lot]
        rep = wikipedia({'action': 'query', 'titles': '|'.join(titres), 'redirects': 1, 'prop': 'pageprops',
                         'ppprop': 'wikibase_item', 'format': 'json', 'formatversion': 2})
        vers = {}
        for r in (rep.get('query', {}).get('normalized') or []):
            vers[r['from']] = r['to']
        for r in (rep.get('query', {}).get('redirects') or []):
            vers[r['from']] = r['to']
        qids = {pg['title']: pg.get('pageprops', {}).get('wikibase_item') for pg in rep.get('query', {}).get('pages', [])}
        qid_de = {}
        for (c, p), t in zip(lot, titres):
            cible = vers.get(t, t)
            cible = vers.get(cible, cible)
            qid_de[cle(c, p)] = qids.get(cible)
        comptes = liens_par_qid(sorted({q for q in qid_de.values() if q})) if any(qid_de.values()) else {}
        for (c, p), t in zip(lot, titres):
            q = qid_de[cle(c, p)]
            cache[cle(c, p)] = {'qid': q, 'liens': comptes.get(q)} if q in comptes else {'qid': q, 'liens': None, 'titre': t}
        enregistre_cache(cache)
        print('  redirections %d / %d' % (min(i + LOT, len(introuvables)), len(introuvables)), flush=True)
        time.sleep(PAUSE)
    corrige_homonymies(cache)
    manquants = [k for k, v in cache.items() if v.get('liens') is None]
    print('terminé : %d mesurés, %d sans mesure' % (len(cache) - len(manquants), len(manquants)))
    for k in manquants[:30]:
        print('  sans mesure :', k, cache[k].get('titre'))


def valeurs():
    cache = charge_cache()
    return sorted(v['liens'] for v in cache.values() if v.get('liens') is not None)


def repartition():
    vals = valeurs()
    if not vals:
        sys.exit('rien en cache : lancer `collecte` d\'abord')
    n = len(vals)
    print('%d mesures' % n)
    for q in (0.05, 0.10, 0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 0.95):
        print('  %2d %% des personnages ont au plus %d liens' % (round(q * 100), vals[min(n - 1, int(q * n))]))
    seuils = [1, 5, 10, 20, 30, 40, 50, 60, 80, 100, 120, 150, 200]
    print('liens >= seuil :')
    for s in seuils:
        print('  >= %3d : %5d (%4.1f %%)' % (s, sum(1 for v in vals if v >= s), 100 * sum(1 for v in vals if v >= s) / n))


def etoiles_de(liens, seuils):
    if liens is None:
        return None
    if liens >= seuils['trois_etoiles']:
        return 3
    if liens >= seuils['deux_etoiles']:
        return 2
    return 1


def etoiles_proposees(cache):
    """{ clé : (étoiles, mesure, étoiles selon la seule mesure, raison de la correction ou None) }."""
    out = {}
    for c, p in sources():
        k = cle(c, p)
        liens = cache.get(k, {}).get('liens')
        mesuree = etoiles_de(liens, SEUILS)
        if k in CORRECTIONS:
            out[k] = (CORRECTIONS[k][0], liens, mesuree, CORRECTIONS[k][1])
        elif mesuree is None:
            raise SystemExit('pas de mesure pour %s : relancer `collecte` ou ajouter une correction' % k)
        else:
            out[k] = (mesuree, liens, mesuree, None)
    return out


def ecrit_etoiles(proposees):
    """Écrit `etoiles` dans chaque personnage, en gardant la mise en forme du fichier (indentation, saut de ligne final)."""
    changes = 0
    for path in sorted(glob.glob(os.path.join(SOURCES, '*.json'))):
        with open(path, encoding='utf-8') as f:
            texte = f.read()
        doc = json.loads(texte)
        for p in doc['personnages']:
            valeur = proposees[cle(doc['code'], p)][0]
            if p.get('etoiles') != valeur:
                p['etoiles'] = valeur
                changes += 1
        # Quelques sources sont indentées d'un espace, la plupart de deux : on garde celle du fichier, et on vérifie qu'en
        # ne changeant rien le texte se reproduit à l'identique (sinon le diff noierait l'ajout des étoiles).
        ligne = texte.split('\n')[1]
        indent = len(ligne) - len(ligne.lstrip(' '))
        fin = '\n' if texte.endswith('\n') else ''
        if json.dumps(json.loads(texte), ensure_ascii=False, indent=indent) + fin != texte:
            raise SystemExit('%s : mise en forme non reproductible (indentation %d) ; ne pas réécrire' % (os.path.basename(path), indent))
        nouveau = json.dumps(doc, ensure_ascii=False, indent=indent) + fin
        if nouveau != texte:
            with open(path, 'w', encoding='utf-8') as f:
                f.write(nouveau)
    return changes


def relecture(proposees, cache):
    """scripts/notoriete/a_relire.md : ce qu'un humain doit regarder."""
    noms = {cle(c, p): (p['nom'], c, p.get('naissance')) for c, p in sources()}
    comptes = {1: 0, 2: 0, 3: 0}
    for v in proposees.values():
        comptes[v[0]] += 1
    L = []
    L.append('# Notoriété des personnages : ce qui est à relire\n')
    L.append('Généré par `scripts/pantheon_notoriete.py` — ne pas modifier à la main (les corrections de jugement se font dans `CORRECTIONS`).\n')
    L.append('Mesure : nombre de liens interlangues Wikidata de la personne. Seuils : ★★ à partir de %d liens, ★★★ à partir de %d.\n'
             % (SEUILS['deux_etoiles'], SEUILS['trois_etoiles']))
    L.append('Répartition : ★★★ %d · ★★ %d · ★ %d (total %d).\n' % (comptes[3], comptes[2], comptes[1], sum(comptes.values())))
    L.append('## 1. Corrections de jugement (%d)\n' % len(CORRECTIONS))
    L.append('| Personnage | Panthéon | Liens | Selon la mesure | Retenu | Pourquoi |\n|---|---|---|---|---|---|')
    for k, (note, liens, mesuree, raison) in sorted(proposees.items(), key=lambda kv: noms[kv[0]][0]):
        if raison:
            L.append('| %s | %s | %s | %s | %s | %s |' % (noms[k][0], noms[k][1], liens if liens is not None else '—',
                                                          '★' * mesuree if mesuree else '—', '★' * note, raison))
    L.append('')
    for titre_, seuil, haut in (('2. Cas limites entre ★ et ★★ (autour de %d liens)' % SEUILS['deux_etoiles'], SEUILS['deux_etoiles'], 40),
                                ('3. Cas limites entre ★★ et ★★★ (autour de %d liens)' % SEUILS['trois_etoiles'], SEUILS['trois_etoiles'], 40)):
        L.append('## %s\n' % titre_)
        L.append('Les %d personnages les plus proches du seuil, de chaque côté.\n' % haut)
        mesures = sorted(((v[1], k) for k, v in proposees.items() if v[1] is not None))
        sous = [(l, k) for l, k in mesures if l < seuil][-haut:]
        sur = [(l, k) for l, k in mesures if l >= seuil][:haut]
        L.append('| Personnage | Panthéon | Liens | Étoiles |\n|---|---|---|---|')
        for l, k in sous + sur:
            L.append('| %s | %s | %d | %s |' % (noms[k][0], noms[k][1], l, '★' * proposees[k][0]))
        L.append('')
    L.append('## 4. Liens Wikipédia des sources qui mènent à une page d\'homonymie\n')
    L.append('Le champ `wikipedia` de ces personnages ne pointe pas vers leur biographie : le bouton « biographie » de la fiche mène à une '
             'page d\'homonymie. La notoriété a été mesurée sur la bonne personne (élément Wikidata indiqué) ; reste à corriger le titre dans la source.\n')
    L.append('| Personnage | Panthéon | Titre actuel | Bonne personne (Wikidata) | Liens |\n|---|---|---|---|---|')
    titres = {cle(c, p): p['wikipedia'] for c, p in sources()}
    for k, v in sorted(cache.items()):
        if v.get('homonymie'):
            q = v.get('qid') if v.get('qid') != v.get('qid_homonymie') else None   # None : aucune bonne personne trouvée
            L.append('| %s | %s | %s | %s | %s |' % (noms[k][0], noms[k][1], titres[k], ('[%s](https://www.wikidata.org/wiki/%s)' % (q, q)) if q else 'à chercher à la main',
                                                     v['liens'] if v.get('liens') is not None else '—'))
    L.append('')
    with open(A_RELIRE, 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')


def etoiles(ecrire):
    cache = charge_cache()
    proposees = etoiles_proposees(cache)
    comptes = {1: 0, 2: 0, 3: 0}
    for v in proposees.values():
        comptes[v[0]] += 1
    print('★★★ %d · ★★ %d · ★ %d' % (comptes[3], comptes[2], comptes[1]))
    if ecrire:
        print('%d champs `etoiles` écrits' % ecrit_etoiles(proposees))
        relecture(proposees, cache)
        print('relecture : ' + os.path.relpath(A_RELIRE, ROOT))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest='cmd', required=True)
    c = sub.add_parser('collecte')
    c.add_argument('--limite', type=int, default=0)
    sub.add_parser('repartition')
    e = sub.add_parser('etoiles')
    e.add_argument('--ecrire', action='store_true')
    a = ap.parse_args()
    if a.cmd == 'collecte':
        collecte(a.limite)
    elif a.cmd == 'repartition':
        repartition()
    else:
        etoiles(a.ecrire)


if __name__ == '__main__':
    main()
