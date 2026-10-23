-- ════════════════════════════════════════════════════════════════
--  acces.sql — clés d'accès au hub M1 MBAF (6.5.0)
--
--  Une clé = une personne = un appareil : elle est consommée à la
--  première utilisation. La table ne contient que l'empreinte SHA-256
--  de chaque clé, jamais la clé elle-même.
--
--  Personne ne lit la table directement (aucun droit pour anon) : tout
--  passe par quatre fonctions.
--    acces_activer  — consomme une clé (page d'entrée du site)
--    acces_valide   — l'appareil est-il toujours autorisé ? (contrôle
--                     quotidien fait par Netlify)
--    acces_pseudo   — rattache le pseudo du site à la clé de l'appareil
--    acces_admin    — liste, création, révocation ; réservée à la
--                     fonction Netlify « acces-admin », qui présente un
--                     jeton serveur dont seule l'empreinte figure ici.
--
--  À lancer une fois dans Supabase → SQL Editor → New query → Run.
--  Le relancer ne casse rien.
--  Hub multi-promos : si tu relances ce fichier, relance ENSUITE
--  acces-niveaux.sql (il complète les fonctions ci-dessous).
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.acces_cles (
  id        uuid primary key default gen_random_uuid(),
  cle_hash  text not null unique,
  nom       text,
  suffixe   text,                       -- 3 derniers caractères, pour s'y retrouver
  cree      timestamptz not null default now(),
  utilisee  timestamptz,
  appareil  text,
  pseudo    text,                       -- pseudo du site (classements, BeQuick) utilisé sur l'appareil
  revoquee  boolean not null default false
);
alter table public.acces_cles add column if not exists pseudo text;

alter table public.acces_cles enable row level security;
revoke all on public.acces_cles from anon, authenticated;

-- Consomme une clé encore libre ; renvoie son identifiant, ou null.
create or replace function public.acces_activer(p_hash text, p_appareil text)
returns uuid language sql security definer set search_path = public as $$
  update public.acces_cles
     set utilisee = now(), appareil = left(coalesce(p_appareil, ''), 80)
   where cle_hash = p_hash and utilisee is null and not revoquee
  returning id;
$$;

-- L'appareil lié à cette clé est-il toujours autorisé ?
create or replace function public.acces_valide(p_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.acces_cles where id = p_id and not revoquee and utilisee is not null);
$$;

-- Rattache le pseudo du site à la clé de l'appareil (appelé par acces-pseudo,
-- qui a vérifié le cookie signé de l'appareil).
create or replace function public.acces_pseudo(p_id uuid, p_pseudo text)
returns void language sql security definer set search_path = public as $$
  update public.acces_cles set pseudo = nullif(left(trim(coalesce(p_pseudo, '')), 40), '')
   where id = p_id and not revoquee;
$$;

-- Gestion, réservée au serveur (jeton vérifié par son empreinte).
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
    insert into public.acces_cles (cle_hash, nom, suffixe)
    select x->>'hash', nullif(left(x->>'nom', 60), ''), x->>'suffixe'
      from jsonb_array_elements(p_donnees->'cles') x;
    return jsonb_build_object('ok', true);
  elsif p_action = 'revoquer' then
    update public.acces_cles set revoquee = true where id = (p_donnees->>'id')::uuid;
    return jsonb_build_object('ok', true);
  elsif p_action = 'retablir' then
    update public.acces_cles set revoquee = false where id = (p_donnees->>'id')::uuid;
    return jsonb_build_object('ok', true);
  end if;
  raise exception 'action inconnue';
end $$;

revoke all on function public.acces_activer(text, text) from public;
revoke all on function public.acces_valide(uuid)        from public;
revoke all on function public.acces_admin(text, text, jsonb) from public;
revoke all on function public.acces_pseudo(uuid, text)       from public;
grant execute on function public.acces_pseudo(uuid, text)         to anon;
grant execute on function public.acces_activer(text, text)        to anon;
grant execute on function public.acces_valide(uuid)               to anon;
grant execute on function public.acces_admin(text, text, jsonb)   to anon;
