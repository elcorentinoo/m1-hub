-- ════════════════════════════════════════════════════════════════
--  progression.sql — progression partagée entre appareils
--
--  La progression (leçons, XP, scores, réponses, planning de révision)
--  vit d'abord dans le navigateur (progress.js) ; synchro.js la fusionne
--  ici entre les appareils d'un même pseudo.
--
--  Identité : le jeton de la messagerie (fonction Netlify acces-jeton),
--  délivré d'après le cookie signé de la clé d'accès. On ne croit que
--  l'identifiant de CLÉ du jeton, jamais le pseudo qu'il porte : à sa
--  première synchro, la clé est rattachée au pseudo enregistré pour elle
--  dans acces_cles, et ce lien est figé. Changer de pseudo dans le site
--  ne déplace donc pas la progression et ne donne pas accès à celle
--  d'un autre. Une clé révoquée ne synchronise plus (chat_autorise).
--
--  · progression_comptes  : clé d'accès → compte (pseudo en minuscules)
--  · progression_elements : un élément de progression par ligne ; la
--    colonne s arbitre les conflits (le plus grand gagne), rev sert de
--    curseur pour ne renvoyer que ce qui a changé.
--  Personne ne lit les tables directement : tout passe par trois
--  fonctions, réservées aux jetons valides.
--    progression_tirer   — ce qui a changé depuis un curseur
--    progression_pousser — envoi d'éléments (fusion élément par élément)
--    progression_effacer — remise à zéro (page Stats), sur tous les appareils
--
--  À lancer une fois dans Supabase → SQL Editor → New query → Run,
--  APRÈS acces.sql et chat.sql. Le relancer ne casse rien.
-- ════════════════════════════════════════════════════════════════

create sequence if not exists public.progression_rev;

create table if not exists public.progression_comptes (
  cle    uuid primary key,               -- acces_cles.id de l'appareil
  compte text not null check (char_length(compte) between 2 and 40),
  pseudo text not null,
  lie    timestamptz not null default now()
);
create index if not exists progression_comptes_compte on public.progression_comptes (compte);

create table if not exists public.progression_elements (
  compte text not null,
  k      text not null check (char_length(k) between 3 and 200),
  v      jsonb not null,
  s      double precision not null default 0,
  rev    bigint not null default nextval('public.progression_rev'),
  auteur text,                           -- appareil qui a écrit (pour ne pas lui renvoyer)
  maj    timestamptz not null default now(),
  primary key (compte, k)
);
create index if not exists progression_elements_rev on public.progression_elements (compte, rev);

alter table public.progression_comptes  enable row level security;
alter table public.progression_elements enable row level security;
revoke all on public.progression_comptes, public.progression_elements from anon, authenticated;
revoke all on sequence public.progression_rev from anon, authenticated;

-- Compte de la clé portée par le jeton ; rattachement à la première synchro.
create or replace function public.progression_compte()
returns text language plpgsql security definer set search_path = public as $$
declare
  c  uuid := nullif(auth.jwt()->>'cle', '')::uuid;
  r  text;
  ps text;
begin
  if c is null or not public.chat_autorise() then
    raise exception 'refusé' using errcode = '42501';
  end if;
  select compte into r from public.progression_comptes where cle = c;
  if r is not null then return r; end if;
  select btrim(pseudo) into ps from public.acces_cles where id = c;
  if char_length(coalesce(ps, '')) < 2 then
    raise exception 'refusé' using errcode = '42501';
  end if;
  insert into public.progression_comptes (cle, compte, pseudo)
  values (c, left(lower(ps), 40), ps)
  on conflict (cle) do nothing;
  select compte into r from public.progression_comptes where cle = c;
  return r;
end $$;

-- Ce qui a changé depuis le curseur p_depuis, sauf ce que cet appareil a écrit.
create or replace function public.progression_tirer(p_depuis bigint, p_dev text, p_limite int default 1000)
returns table (k text, v jsonb, s double precision, rev bigint)
language plpgsql security definer set search_path = public as $$
declare cpt text := public.progression_compte();
begin
  return query
    select e.k, e.v, e.s, e.rev from public.progression_elements e
     where e.compte = cpt and e.rev > coalesce(p_depuis, 0)
       and e.auteur is distinct from p_dev
     order by e.rev
     limit least(greatest(coalesce(p_limite, 1000), 1), 2000);
end $$;

-- Envoi d'éléments. Règle de fusion selon la première lettre de k :
--   d (leçon validée), r (réponse) : on garde l'existant (union)
--   b (meilleur score), l (dernière leçon), p (planning), x (XP d'un
--   appareil) : on garde le plus grand s.
create or replace function public.progression_pousser(p_elements jsonb, p_dev text)
returns int language plpgsql security definer set search_path = public as $$
declare
  cpt text := public.progression_compte();
  n   int;
begin
  if jsonb_typeof(p_elements) <> 'array' or jsonb_array_length(p_elements) > 1000 then
    raise exception 'trop d''éléments' using errcode = '22023';
  end if;
  insert into public.progression_elements as e (compte, k, v, s, auteur)
  select cpt, x->>'k', x->'v', coalesce((x->>'s')::double precision, 0), left(p_dev, 40)
    from jsonb_array_elements(p_elements) x
   where (x->>'k') ~ '^[dblprx]:[a-z0-9-]{2,40}(:|$)'
     and char_length(x->>'k') <= 200
     and x ? 'v' and octet_length((x->'v')::text) <= 2000
     and coalesce((x->>'s')::double precision, 0) >= 0
  on conflict (compte, k) do update
     set v = excluded.v, s = excluded.s, auteur = excluded.auteur,
         rev = nextval('public.progression_rev'), maj = now()
   where left(e.k, 1) in ('b', 'l', 'p', 'x') and excluded.s > e.s;
  get diagnostics n = row_count;
  -- l'historique des réponses est borné, comme sur l'appareil
  delete from public.progression_elements d
   where d.compte = cpt and left(d.k, 2) = 'r:'
     and d.k in (select k from public.progression_elements
                  where compte = cpt and left(k, 2) = 'r:'
                  order by s desc offset 5000);
  return n;
end $$;

-- Remise à zéro d'une matière (p_portee = son identifiant) ou de tout ('*').
-- Les autres appareils reçoivent la ligne z:<portee> et effacent à leur tour
-- ce qui précède p_t (millisecondes).
create or replace function public.progression_effacer(p_portee text, p_t double precision, p_dev text)
returns void language plpgsql security definer set search_path = public as $$
declare cpt text := public.progression_compte();
begin
  if p_portee is null or not (p_portee = '*' or p_portee ~ '^[a-z0-9-]{2,40}$') then
    raise exception 'portée invalide' using errcode = '22023';
  end if;
  delete from public.progression_elements
   where compte = cpt and left(k, 2) <> 'z:'
     and (p_portee = '*' or split_part(k, ':', 2) = p_portee);
  insert into public.progression_elements as e (compte, k, v, s, auteur)
  values (cpt, 'z:'||p_portee, jsonb_build_object('t', p_t), p_t, left(p_dev, 40))
  on conflict (compte, k) do update
     set v = excluded.v, s = excluded.s, auteur = excluded.auteur,
         rev = nextval('public.progression_rev'), maj = now()
   where excluded.s > e.s;
end $$;

revoke all on function public.progression_compte()                         from public;
revoke all on function public.progression_tirer(bigint, text, int)         from public;
revoke all on function public.progression_pousser(jsonb, text)             from public;
revoke all on function public.progression_effacer(text, double precision, text) from public;
grant execute on function public.progression_tirer(bigint, text, int)      to authenticated;
grant execute on function public.progression_pousser(jsonb, text)          to authenticated;
grant execute on function public.progression_effacer(text, double precision, text) to authenticated;
