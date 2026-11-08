-- ════════════════════════════════════════════════════════════════
--  acces-niveaux.sql — clés par niveau et par année, clé admin,
--  limites anti-abus (hub multi-promos)
--
--  À lancer APRÈS acces.sql, une fois, dans Supabase → SQL Editor →
--  New query → Run. Le relancer ne casse rien (idempotent).
--
--  Ce que ça change pour les clés existantes : RIEN à refaire.
--  Toutes reçoivent automatiquement niveau = m1, année = 2026-2027,
--  donc valables jusqu'au 31 août 2027. Les appareils déjà autorisés
--  restent autorisés, avec leur pseudo, leurs scores, leur progression.
--
--  Une clé est valable jusqu'au 31 août de la 2e année de son année
--  universitaire (2026-2027 → 31 août 2027, heure de Paris).
--
--  Clé administratrice : voir la procédure en bas du fichier.
-- ════════════════════════════════════════════════════════════════

alter table public.acces_cles add column if not exists niveau text    not null default 'm1';
alter table public.acces_cles add column if not exists annee  text    not null default '2026-2027';
alter table public.acces_cles add column if not exists admin  boolean not null default false;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'acces_cles_niveau_ok') then
    alter table public.acces_cles add constraint acces_cles_niveau_ok check (niveau in ('licence', 'm1', 'm2'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'acces_cles_annee_ok') then
    alter table public.acces_cles add constraint acces_cles_annee_ok
      check (annee ~ '^\d{4}-\d{4}$' and right(annee, 4)::int = left(annee, 4)::int + 1);
  end if;
end $$;

-- Dernier jour de validité d'une année universitaire : « 2026-2027 » → 2027-08-31.
create or replace function public.acces_fin(p_annee text)
returns date language sql immutable as $$
  select make_date(right(p_annee, 4)::int, 8, 31);
$$;

-- Consomme une clé encore libre et non périmée ; renvoie son identifiant, ou null.
create or replace function public.acces_activer(p_hash text, p_appareil text)
returns uuid language sql security definer set search_path = public as $$
  update public.acces_cles
     set utilisee = now(), appareil = left(coalesce(p_appareil, ''), 80)
   where cle_hash = p_hash and utilisee is null and not revoquee
     and (now() at time zone 'Europe/Paris')::date <= public.acces_fin(annee)
  returning id;
$$;

-- L'appareil lié à cette clé est-il toujours autorisé ? (même signature qu'avant :
-- la version déjà en ligne du site continue de fonctionner)
create or replace function public.acces_valide(p_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.acces_cles where id = p_id and not revoquee and utilisee is not null
                  and (now() at time zone 'Europe/Paris')::date <= public.acces_fin(annee));
$$;

-- État complet, pour la porte (contrôle quotidien) et /admin.
create or replace function public.acces_etat(p_id uuid)
returns jsonb language sql security definer set search_path = public as $$
  select coalesce(
    (select jsonb_build_object(
       'valide', not revoquee and utilisee is not null
                 and (now() at time zone 'Europe/Paris')::date <= public.acces_fin(annee),
       'niveau', niveau, 'annee', annee, 'admin', admin)
       from public.acces_cles where id = p_id),
    jsonb_build_object('valide', false));
$$;

-- Gestion, réservée au serveur (jeton vérifié par son empreinte).
-- Reprend toutes les actions d'acces.sql, plus le niveau, l'année et la clé admin.
create or replace function public.acces_admin(p_jeton text, p_action text, p_donnees jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare r jsonb;
begin
  if encode(extensions.digest(coalesce(p_jeton, ''), 'sha256'), 'hex')
     <> '07a0ba5dad1748f64ced608ffdeb388456b29ed38d1957df767ce10665949537' then
    raise exception 'refusé' using errcode = '42501';
  end if;
  if p_action = 'liste' then
    select coalesce(jsonb_agg(to_jsonb(c) - 'cle_hash' order by c.cree desc), '[]'::jsonb) into r
      from public.acces_cles c;
    return r;
  elsif p_action = 'creer' then
    insert into public.acces_cles (cle_hash, nom, suffixe, niveau, annee)
    select x->>'hash', nullif(left(x->>'nom', 60), ''), x->>'suffixe',
           coalesce(x->>'niveau', 'm1'), coalesce(x->>'annee', '2026-2027')
      from jsonb_array_elements(p_donnees->'cles') x;
    return jsonb_build_object('ok', true);
  elsif p_action = 'revoquer' then
    update public.acces_cles set revoquee = true where id = (p_donnees->>'id')::uuid;
    return jsonb_build_object('ok', true);
  elsif p_action = 'retablir' then
    update public.acces_cles set revoquee = false where id = (p_donnees->>'id')::uuid;
    return jsonb_build_object('ok', true);
  elsif p_action = 'admin' then
    update public.acces_cles set admin = coalesce((p_donnees->>'admin')::boolean, false)
     where id = (p_donnees->>'id')::uuid;
    return jsonb_build_object('ok', true);
  elsif p_action = 'admin_existe' then
    return to_jsonb(exists(select 1 from public.acces_cles where admin and not revoquee));
  end if;
  raise exception 'action inconnue';
end $$;

-- Limites anti-abus (essais, demandes de clé) : un compteur par jour et par
-- empreinte (IP hachée côté serveur, jamais l'IP en clair).
create table if not exists public.acces_limites (
  cle  text not null,
  jour date not null default (now() at time zone 'Europe/Paris')::date,
  n    int  not null default 0,
  primary key (cle, jour)
);
alter table public.acces_limites enable row level security;
revoke all on public.acces_limites from anon, authenticated;

create or replace function public.acces_limite(p_jeton text, p_cle text, p_max int)
returns boolean language plpgsql security definer set search_path = public, extensions as $$
declare v int; j date := (now() at time zone 'Europe/Paris')::date;
begin
  if encode(extensions.digest(coalesce(p_jeton, ''), 'sha256'), 'hex')
     <> '07a0ba5dad1748f64ced608ffdeb388456b29ed38d1957df767ce10665949537' then
    raise exception 'refusé' using errcode = '42501';
  end if;
  delete from public.acces_limites where jour < j - 7;
  insert into public.acces_limites as l (cle, jour, n) values (left(p_cle, 80), j, 1)
    on conflict (cle, jour) do update set n = l.n + 1
  returning n into v;
  return v <= p_max;
end $$;

revoke all on function public.acces_fin(text)                  from public;
revoke all on function public.acces_etat(uuid)                 from public;
revoke all on function public.acces_limite(text, text, int)    from public;
revoke all on function public.acces_activer(text, text)        from public;
revoke all on function public.acces_valide(uuid)               from public;
revoke all on function public.acces_admin(text, text, jsonb)   from public;
grant execute on function public.acces_etat(uuid)               to anon;
grant execute on function public.acces_limite(text, text, int)  to anon;
grant execute on function public.acces_activer(text, text)      to anon;
grant execute on function public.acces_valide(uuid)             to anon;
grant execute on function public.acces_admin(text, text, jsonb) to anon;

-- ════════════════════════════════════════════════════════════════
--  Clé administratrice — procédure normale (aucun SQL) :
--    1. Sur ton appareil qui a déjà une clé, ouvre /admin.
--    2. Entre le mot de passe (ADMIN_MDP) comme d'habitude.
--    3. Onglet « Clés » → « Faire de la clé de cet appareil la clé
--       administratrice ».
--  Dès qu'une clé admin existe, le mot de passe seul n'ouvre plus /admin.
--
--  Secours (appareil perdu, par exemple) : dans le SQL Editor,
--    -- voir les clés de Corentin :
--    select id, pseudo, appareil, utilisee, admin from public.acces_cles where pseudo ilike 'corentin%';
--    -- marquer la bonne (remplacer l'identifiant) :
--    update public.acces_cles set admin = true where id = '…';
--    -- ou tout retirer (le mot de passe ADMIN_MDP refonctionne alors) :
--    update public.acces_cles set admin = false;
-- ════════════════════════════════════════════════════════════════
