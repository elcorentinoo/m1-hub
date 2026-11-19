-- ════════════════════════════════════════════════════════════════
--  archives.sql — matières archivées du M1, réglées depuis /admin (8.4.0)
--
--  · site_archives : une ligne par matière (subject-id), archivée ou non,
--                    avec la date du dernier changement.
--  · site_archives_liste()  : lecture publique (clé publishable) de la
--                    liste, pour archives.js (hub, menu, BeQuick, révision).
--  · site_archives_admin()  : écriture, réservée à la fonction Netlify
--                    acces-admin (jeton serveur ACCES_JETON, dont seule
--                    l'empreinte SHA-256 est écrite ici, comme dans
--                    admin.sql et acces.sql).
--
--  À lancer une fois dans Supabase → SQL Editor → New query → Run.
--  Le relancer ne casse rien (et ne touche pas aux réglages déjà faits).
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.site_archives (
  sid     text primary key check (sid ~ '^[a-z0-9-]{2,40}$'),
  archive boolean not null default false,
  maj     timestamptz not null default now()
);

alter table public.site_archives enable row level security;
revoke all on public.site_archives from anon, authenticated;

-- État de départ (8.4.0) : Produits Dérivés I et II et la révision du
-- partiel archivés. « on conflict do nothing » : un relancement ne
-- défait pas ce que Corentin a réglé ensuite dans /admin.
insert into public.site_archives (sid, archive) values
  ('produits-derives', true), ('produits-derives-2', true), ('partiel-derives', true)
on conflict (sid) do nothing;

-- Lecture publique : seulement sid, archive, maj (rien d'autre n'existe).
create or replace function public.site_archives_liste()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('sid', sid, 'archive', archive, 'maj', maj) order by sid), '[]'::jsonb)
  from public.site_archives;
$$;

-- Écriture : fonction Netlify acces-admin seulement (jeton serveur).
--   p_action 'liste'    → toutes les lignes
--   p_action 'archiver' → p_donnees {sid, archive:true|false}
create or replace function public.site_archives_admin(p_jeton text, p_action text, p_donnees jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  s text := btrim(coalesce(p_donnees->>'sid', ''));
begin
  if encode(extensions.digest(coalesce(p_jeton, ''), 'sha256'), 'hex')
     <> '07a0ba5dad1748f64ced608ffdeb388456b29ed38d1957df767ce10665949537' then
    raise exception 'refusé' using errcode = '42501';
  end if;
  if p_action = 'liste' then
    return public.site_archives_liste();
  elsif p_action = 'archiver' then
    if s !~ '^[a-z0-9-]{2,40}$' then raise exception 'sid invalide' using errcode = '22023'; end if;
    insert into public.site_archives as a (sid, archive, maj)
      values (s, coalesce((p_donnees->>'archive')::boolean, false), now())
    on conflict (sid) do update set archive = excluded.archive, maj = now();
    return public.site_archives_liste();
  end if;
  raise exception 'action inconnue' using errcode = '22023';
end $$;

revoke all on function public.site_archives_liste() from public;
revoke all on function public.site_archives_admin(text, text, jsonb) from public;
grant execute on function public.site_archives_liste() to anon, authenticated;
grant execute on function public.site_archives_admin(text, text, jsonb) to anon;
