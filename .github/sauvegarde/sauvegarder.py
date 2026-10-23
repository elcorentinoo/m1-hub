#!/usr/bin/env python3
# ════════════════════════════════════════════════════════════════════
#  Sauvegarde des tables Supabase du hub (chantier A6).
#
#  Lancé chaque semaine par .github/workflows/sauvegarde.yml. Lit toutes
#  les tables du schéma public par l'API REST de Supabase (clé secrète),
#  et écrit dans le dossier donné :
#    tables/<table>.json      les lignes, telles quelles
#    restaurer/<table>.sql    remise d'une seule table (SQL Editor)
#    restaurer.sql            remise de toutes les tables, d'un coup
#    schema.json              colonnes et types (description de l'API)
#    manifeste.json           date, nombre de lignes par table
#  Le workflow chiffre ensuite ce dossier : rien ne sort en clair.
#
#  N'affiche jamais le contenu des tables, seulement les nombres de lignes
#  (le journal des workflows d'un dépôt public est visible de tous).
#
#  Variables : SUPABASE_URL, SUPABASE_CLE.  Python 3 seul, sans module.
# ════════════════════════════════════════════════════════════════════

import json, os, re, sys, urllib.request, urllib.error
from datetime import datetime, timezone

# Tables attendues d'après supabase/*.sql et le site (lb.js : scores,
# moyennes). Toute autre table du schéma public est sauvegardée aussi ;
# une table attendue mais absente donne seulement un avertissement.
ATTENDUES = [
    'acces_cles', 'admin_notes', 'admin_personnes', 'bequick_jours',
    'bequick_parties', 'chat_messages', 'chat_notif_etat', 'chat_reactions',
    'moyennes', 'push_abonnements', 'scores', 'suivi_activite',
    'suivi_progression',
]
PAGE = 1000   # plafond de lignes par réponse de l'API Supabase


def appel(url, cle, chemin, entetes=None):
    h = {'apikey': cle, 'Accept': 'application/json'}
    if cle.startswith('eyJ'):            # ancienne clé service_role (JWT)
        h['Authorization'] = 'Bearer ' + cle
    h.update(entetes or {})
    req = urllib.request.Request(url.rstrip('/') + '/rest/v1/' + chemin, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode('utf-8')), dict(r.headers)
    except urllib.error.HTTPError as e:
        raise SystemExit(f'Erreur {e.code} sur « {chemin.split("?")[0] or "/"} » : '
                         f'{e.read().decode("utf-8", "replace")[:300]}')


def cles_primaires(defn):
    return [c for c, p in defn.get('properties', {}).items()
            if '<pk/>' in (p.get('description') or '')]


def dependances(defn):
    """Tables visées par une clé étrangère (à remettre avant celle-ci)."""
    return {m for p in defn.get('properties', {}).values()
            for m in re.findall(r"<fk table='([^']+)'", p.get('description') or '')}


def ordre(tables, defs):
    """Parents d'abord (chat_messages avant chat_reactions)."""
    vu, sortie = set(), []
    def visite(t, pile=()):
        if t in vu or t in pile:
            return
        for d in sorted(dependances(defs.get(t, {}))):
            if d in tables and d != t:
                visite(d, pile + (t,))
        vu.add(t); sortie.append(t)
    for t in sorted(tables):
        visite(t)
    return sortie


def lire_table(url, cle, table, pk):
    lignes, debut, total = [], 0, None
    tri = '&order=' + ','.join(f'{c}.asc' for c in pk) if pk else ''
    while True:
        page, h = appel(url, cle, f'{table}?select=*{tri}', {
            'Range-Unit': 'items', 'Range': f'{debut}-{debut + PAGE - 1}',
            'Prefer': 'count=exact'})
        lignes += page
        cr = h.get('Content-Range') or h.get('content-range') or ''
        if cr.rsplit('/', 1)[-1].isdigit():
            total = int(cr.rsplit('/', 1)[-1])
        if len(page) < PAGE or (total is not None and len(lignes) >= total):
            break
        debut += PAGE
    if total is not None and total != len(lignes):
        raise SystemExit(f'{table} : {len(lignes)} lignes lues sur {total} annoncées.')
    return lignes


def ident(nom):
    return '"' + nom.replace('"', '""') + '"'


def sql_table(table, lignes):
    """Remise d'une table : ajoute les lignes manquantes, ne touche à
    aucune ligne existante, déclencheurs coupés le temps de l'insertion
    (sinon BeQuick refuserait hors horaires et le chat enverrait des
    notifications pour d'anciens messages)."""
    t = 'public.' + ident(table)
    out = [f'-- ─── {table} : {len(lignes)} ligne(s) ───',
           f'-- Pour REMPLACER toute la table au lieu de compléter, retirer les deux tirets :',
           f'-- delete from {t};']
    if not lignes:
        return '\n'.join(out + ['-- (table vide dans la sauvegarde)', ''])
    cols = []
    for l in lignes:
        for c in l:
            if c not in cols:
                cols.append(c)
    donnees = json.dumps(lignes, ensure_ascii=False)
    n = 0
    while f'$d{n}$' in donnees:
        n += 1
    q = f'$d{n}$'
    lc = ', '.join(ident(c) for c in cols)
    out += [
        f'alter table {t} disable trigger user;',
        f'insert into {t} ({lc}) overriding system value',
        f'  select {lc} from jsonb_populate_recordset(null::{t}, {q}{donnees}{q}::jsonb)',
        f'  on conflict do nothing;',
        f'alter table {t} enable trigger user;',
        # Compteurs automatiques (id) recalés après les lignes remises.
        f"do $s$ declare c text; begin",
        f"  for c in select attname from pg_attribute where attrelid = '{t}'::regclass",
        f"           and attidentity <> '' and not attisdropped loop",
        f"    execute format('select setval(pg_get_serial_sequence(%L, %L), greatest(coalesce((select max(%I) from {t}), 0), 1))', '{t}', c, c);",
        f"  end loop; end $s$;",
        '']
    return '\n'.join(out)


ENTETE = """-- ════════════════════════════════════════════════════════════
--  Restauration Supabase — sauvegarde du {date}
--  Supabase → SQL Editor → New query → coller → Run.
--  Ajoute les lignes manquantes sans modifier celles qui existent.
--  Tout ou rien : en cas d'erreur, rien n'est changé.
-- ════════════════════════════════════════════════════════════
begin;

"""


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage : sauvegarder.py <dossier de sortie>')
    url, cle = os.environ.get('SUPABASE_URL', ''), os.environ.get('SUPABASE_CLE', '')
    if not url or not cle:
        raise SystemExit('Secrets SUPABASE_URL et SUPABASE_CLE manquants (Settings → Secrets → Actions).')
    sortie = sys.argv[1]
    os.makedirs(os.path.join(sortie, 'tables'), exist_ok=True)
    os.makedirs(os.path.join(sortie, 'restaurer'), exist_ok=True)

    spec, _ = appel(url, cle, '')
    defs = spec.get('definitions', {})
    tables = sorted({p.strip('/') for p in spec.get('paths', {})
                     if p.strip('/') and not p.startswith('/rpc/')})
    if not tables:
        raise SystemExit('Aucune table trouvée : la clé est-elle bien la clé secrète (service_role) ?')
    for t in ATTENDUES:
        if t not in tables:
            print(f'::warning::Table attendue absente : {t}')

    date = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
    manifeste = {'date': date, 'projet': url, 'tables': {}}
    complet = [ENTETE.format(date=date)]
    for t in ordre(tables, defs):
        lignes = lire_table(url, cle, t, cles_primaires(defs.get(t, {})))
        with open(os.path.join(sortie, 'tables', t + '.json'), 'w', encoding='utf-8') as f:
            json.dump(lignes, f, ensure_ascii=False, indent=1)
        bloc = sql_table(t, lignes)
        with open(os.path.join(sortie, 'restaurer', t + '.sql'), 'w', encoding='utf-8') as f:
            f.write(ENTETE.format(date=date) + bloc + '\ncommit;\n')
        complet.append(bloc)
        manifeste['tables'][t] = len(lignes)
        print(f'{t:<22} {len(lignes):>7} ligne(s)')
    with open(os.path.join(sortie, 'restaurer.sql'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(complet) + '\ncommit;\n')
    with open(os.path.join(sortie, 'schema.json'), 'w', encoding='utf-8') as f:
        json.dump(defs, f, ensure_ascii=False, indent=1)
    with open(os.path.join(sortie, 'manifeste.json'), 'w', encoding='utf-8') as f:
        json.dump(manifeste, f, ensure_ascii=False, indent=1)
    print(f'{len(tables)} table(s), {sum(manifeste["tables"].values())} ligne(s) au total.')


if __name__ == '__main__':
    main()
