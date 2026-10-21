-- ════════════════════════════════════════════════════════════════
--  admin.sql — suivi des progrès et tableau de bord /admin (7.3.0)
--
--  · suivi_activite    : par personne, par jour et par matière, le
--                        temps passé et les réponses données.
--  · suivi_progression : par personne et par matière, la dernière photo
--                        de sa progression (leçons, quiz, test, révision).
--  · admin_personnes   : regroupement de plusieurs pseudos sous une même
--                        personne (« valentin.m » = « Valentin »).
--  · admin_notes       : note privée de Corentin sur une personne.
--
--  Le site envoie le suivi avec le jeton de la messagerie (acces-jeton) :
--  seuls les appareils avec une clé valide écrivent, et chacun seulement
--  sous son propre pseudo. Personne ne lit ces tables, sauf la fonction
--  Netlify acces-admin (mot de passe + jeton serveur).
--
--  À lancer une fois dans Supabase → SQL Editor → New query → Run,
--  APRÈS acces.sql et chat.sql. Le relancer ne casse rien.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.suivi_activite (
  pseudo_cle text not null,
  pseudo     text not null,
  jour       date not null,
  sujet      text not null check (sujet ~ '^[a-z0-9-]{2,40}$'),
  secondes   integer not null default 0,
  reponses   integer not null default 0,
  bonnes     integer not null default 0,
  maj        timestamptz not null default now(),
  primary key (pseudo_cle, jour, sujet)
);

create table if not exists public.suivi_progression (
  pseudo_cle text not null,
  pseudo     text not null,
  sujet      text not null check (sujet ~ '^[a-z0-9-]{2,40}$'),
  pct        integer not null default 0,
  lecons     integer not null default 0,
  lecons_tot integer not null default 0,
  quiz       integer not null default 0,
  quiz_tot   integer not null default 0,
  test_pct   integer,
  acquis     integer not null default 0,
  encours    integer not null default 0,
  a_revoir   integer not null default 0,
  xp         integer not null default 0,
  maj        timestamptz not null default now(),
  primary key (pseudo_cle, sujet)
);

create table if not exists public.admin_personnes (
  pseudo_cle text primary key,
  personne   text not null check (char_length(personne) between 1 and 60)
);

create table if not exists public.admin_notes (
  personne_cle text primary key,
  note         text not null default '',
  maj          timestamptz not null default now()
);

alter table public.suivi_activite    enable row level security;
alter table public.suivi_progression enable row level security;
alter table public.admin_personnes   enable row level security;
alter table public.admin_notes       enable row level security;
revoke all on public.suivi_activite, public.suivi_progression, public.admin_personnes, public.admin_notes
  from anon, authenticated;

-- Envoi du suivi par le site (jeton de la messagerie).
create or replace function public.suivi_envoyer(p_activite jsonb, p_progression jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  ps text := btrim(coalesce(auth.jwt()->>'pseudo', ''));
  pc text := lower(btrim(coalesce(auth.jwt()->>'pseudo', '')));
  auj date := (now() at time zone 'Europe/Paris')::date;
  x jsonb;
  b int := 0;
  borne constant text := '^[a-z0-9-]{2,40}$';
begin
  if not public.chat_autorise() or char_length(ps) < 2 then
    raise exception 'refusé' using errcode = '42501';
  end if;
  for x in select value from jsonb_array_elements(case when jsonb_typeof(p_activite) = 'array' then p_activite else '[]'::jsonb end) limit 80 loop
    if (x->>'sujet') ~ borne and (x->>'jour') ~ '^\d{4}-\d{2}-\d{2}$'
       and (x->>'jour')::date between auj - 7 and auj then
      insert into public.suivi_activite as a (pseudo_cle, pseudo, jour, sujet, secondes, reponses, bonnes)
      values (pc, ps, (x->>'jour')::date, x->>'sujet',
              least(greatest(coalesce((x->>'s')::int, 0), 0), 3600),
              least(greatest(coalesce((x->>'r')::int, 0), 0), 500),
              least(greatest(coalesce((x->>'b')::int, 0), 0), 500))
      on conflict (pseudo_cle, jour, sujet) do update set
        secondes = least(a.secondes + excluded.secondes, 57600),
        reponses = least(a.reponses + excluded.reponses, 5000),
        bonnes   = least(a.bonnes + excluded.bonnes, 5000),
        pseudo = excluded.pseudo, maj = now();
    end if;
  end loop;
  for x in select value from jsonb_array_elements(case when jsonb_typeof(p_progression) = 'array' then p_progression else '[]'::jsonb end) limit 20 loop
    if (x->>'sujet') ~ borne then
      insert into public.suivi_progression as g (pseudo_cle, pseudo, sujet, pct, lecons, lecons_tot, quiz, quiz_tot,
                                                  test_pct, acquis, encours, a_revoir, xp)
      values (pc, ps, x->>'sujet',
              least(greatest(coalesce((x->>'pct')::int, 0), 0), 100),
              least(greatest(coalesce((x->>'l')::int, 0), 0), 200),
              least(greatest(coalesce((x->>'lt')::int, 0), 0), 200),
              least(greatest(coalesce((x->>'q')::int, 0), 0), 2000),
              least(greatest(coalesce((x->>'qt')::int, 0), 0), 2000),
              case when x ? 't' and x->>'t' is not null then least(greatest((x->>'t')::int, 0), 100) end,
              least(greatest(coalesce((x->>'a')::int, 0), 0), 5000),
              least(greatest(coalesce((x->>'e')::int, 0), 0), 5000),
              least(greatest(coalesce((x->>'v')::int, 0), 0), 5000),
              least(greatest(coalesce((x->>'xp')::int, 0), 0), 10000000))
      on conflict (pseudo_cle, sujet) do update set
        pseudo = excluded.pseudo, pct = excluded.pct, lecons = excluded.lecons, lecons_tot = excluded.lecons_tot,
        quiz = excluded.quiz, quiz_tot = excluded.quiz_tot, test_pct = excluded.test_pct,
        acquis = excluded.acquis, encours = excluded.encours, a_revoir = excluded.a_revoir,
        xp = excluded.xp, maj = now();
    end if;
  end loop;
end $$;

-- Tableau de bord, réservé au serveur (même jeton que acces_admin).
create or replace function public.admin_tableau(p_jeton text, p_action text, p_donnees jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  r jsonb;
  depuis date := (now() at time zone 'Europe/Paris')::date - 120;
  p text := lower(btrim(coalesce(p_donnees->>'pseudo', '')));
  n text := btrim(coalesce(p_donnees->>'personne', ''));
begin
  if encode(extensions.digest(coalesce(p_jeton, ''), 'sha256'), 'hex')
     <> '07a0ba5dad1748f64ced608ffdeb388456b29ed38d1957df767ce10665949537' then
    raise exception 'refusé' using errcode = '42501';
  end if;
  if p_action = 'donnees' then
    select jsonb_build_object(
      'maintenant', now(),
      'cles', (select coalesce(jsonb_agg(jsonb_build_object('pseudo', pseudo, 'nom', nom, 'utilisee', utilisee,
                 'revoquee', revoquee, 'appareil', appareil)), '[]'::jsonb) from public.acces_cles),
      'scores', (select coalesce(jsonb_agg(jsonb_build_object('p', pseudo, 'm', subject, 'mo', mode,
                 'c', correct, 't', total, 'd', created_at)), '[]'::jsonb)
                   from public.scores where created_at >= depuis),
      'bequick', (select coalesce(jsonb_agg(jsonb_build_object('p', pseudo, 'j', jour, 's', score,
                 'b', bonnes, 'r', repondues, 'd', detail)), '[]'::jsonb)
                   from public.bequick_parties where jour >= depuis),
      'bq_jours', (select coalesce(jsonb_agg(jsonb_build_object('j', jour, 'ids', ids, 'm', matieres)), '[]'::jsonb)
                   from public.bequick_jours where jour >= depuis),
      'chat', (select coalesce(jsonb_agg(jsonb_build_object('p', x.pseudo, 'j', x.jour, 'n', x.n)), '[]'::jsonb)
                 from (select pseudo, (cree at time zone 'Europe/Paris')::date as jour, count(*) as n
                         from public.chat_messages group by 1, 2) x),
      'activite', (select coalesce(jsonb_agg(jsonb_build_object('p', pseudo, 'j', jour, 'm', sujet,
                 's', secondes, 'r', reponses, 'b', bonnes)), '[]'::jsonb)
                   from public.suivi_activite where jour >= depuis),
      'progression', (select coalesce(jsonb_agg(to_jsonb(g) - 'pseudo_cle'), '[]'::jsonb) from public.suivi_progression g),
      'personnes', (select coalesce(jsonb_object_agg(pseudo_cle, personne), '{}'::jsonb) from public.admin_personnes),
      'notes', (select coalesce(jsonb_object_agg(personne_cle, note), '{}'::jsonb) from public.admin_notes)
    ) into r;
    return r;
  elsif p_action = 'associer' then
    if char_length(p) < 1 or char_length(n) < 1 then raise exception 'données'; end if;
    insert into public.admin_personnes (pseudo_cle, personne) values (left(p, 40), left(n, 60))
      on conflict (pseudo_cle) do update set personne = excluded.personne;
    return jsonb_build_object('ok', true);
  elsif p_action = 'dissocier' then
    delete from public.admin_personnes where pseudo_cle = p;
    return jsonb_build_object('ok', true);
  elsif p_action = 'bq_reset' then
    -- 7.3.1 : efface la partie BeQuick du soir de ce pseudo, qui peut rejouer jusqu'à 22 h
    delete from public.bequick_parties
     where pseudo_cle = p and jour = (now() at time zone 'Europe/Paris')::date;
    return jsonb_build_object('ok', true);
  elsif p_action = 'note' then
    insert into public.admin_notes (personne_cle, note) values (lower(left(n, 60)), left(coalesce(p_donnees->>'note', ''), 2000))
      on conflict (personne_cle) do update set note = excluded.note, maj = now();
    return jsonb_build_object('ok', true);
  end if;
  raise exception 'action inconnue';
end $$;

revoke all on function public.suivi_envoyer(jsonb, jsonb) from public;
revoke all on function public.admin_tableau(text, text, jsonb) from public;
grant execute on function public.suivi_envoyer(jsonb, jsonb) to authenticated;
grant execute on function public.admin_tableau(text, text, jsonb) to anon;
