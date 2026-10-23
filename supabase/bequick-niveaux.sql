-- ════════════════════════════════════════════════════════════
--  BeQuick par niveau (8.0.0, hub multi-promos) — à coller UNE FOIS
--  dans Supabase : SQL Editor → New query → coller tout ce fichier → Run.
--  À passer AVANT la publication du site 8.0.0 (l'ancien site continue
--  de fonctionner avec ces changements ; le nouveau sait aussi fonctionner
--  sans, pour le M1 seulement).
--  Sans danger si on le relance : il ne refait que ce qui manque.
--
--  Les lignes existantes prennent le niveau 'm1' (valeur par défaut) :
--  aucun score, aucune série, aucun abonnement n'est modifié autrement.
-- ════════════════════════════════════════════════════════════

-- 1. La série du jour : une par jour ET par niveau
alter table public.bequick_jours add column if not exists niveau text not null default 'm1';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bequick_jours_niveau_ok') then
    alter table public.bequick_jours add constraint bequick_jours_niveau_ok check (niveau in ('licence','m1','m2'));
  end if;
  -- l'ancienne clé (jour seul) devient (jour, niveau)
  if exists (select 1 from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
             where c.conname = 'bequick_jours_pkey' group by c.oid having count(*) = 1) then
    alter table public.bequick_jours drop constraint bequick_jours_pkey;
    alter table public.bequick_jours add constraint bequick_jours_pkey primary key (jour, niveau);
  end if;
end $$;

-- 2. Les parties : une par joueur, par jour ET par niveau
alter table public.bequick_parties add column if not exists niveau text not null default 'm1';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bequick_parties_niveau_ok') then
    alter table public.bequick_parties add constraint bequick_parties_niveau_ok check (niveau in ('licence','m1','m2'));
  end if;
  if exists (select 1 from pg_constraint where conname = 'bequick_parties_jour_pseudo_cle_key') then
    alter table public.bequick_parties drop constraint bequick_parties_jour_pseudo_cle_key;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'bequick_parties_jour_niveau_pseudo_key') then
    alter table public.bequick_parties add constraint bequick_parties_jour_niveau_pseudo_key unique (jour, niveau, pseudo_cle);
  end if;
end $$;
create index if not exists bequick_parties_niveau on public.bequick_parties (niveau, jour);

-- Le contrôle du serveur, inchangé, plus : le niveau d'une partie ne
-- change jamais après son départ.
create or replace function public.bequick_controle() returns trigger
language plpgsql as $$
declare
  paris timestamp := now() at time zone 'Europe/Paris';
begin
  if tg_op = 'INSERT' then
    if extract(isodow from paris) > 5 then
      raise exception 'BeQuick a lieu du lundi au vendredi.';
    end if;
    if paris::time < time '18:30' or paris::time >= time '22:00' then
      raise exception 'BeQuick est ouvert de 18 h 30 à 22 h 00.';
    end if;
    new.jour := paris::date;
    new.debut := now(); new.maj := now();
    new.score := 0; new.bonnes := 0; new.repondues := 0; new.detail := '';
    new.pseudo := btrim(new.pseudo);
    new.pseudo_cle := lower(new.pseudo);
    new.niveau := coalesce(new.niveau, 'm1');
  else
    if now() > old.debut + interval '10 minutes 20 seconds' then
      raise exception 'Le chrono est écoulé.';
    end if;
    new.id := old.id; new.jour := old.jour; new.debut := old.debut;
    new.pseudo := old.pseudo; new.pseudo_cle := old.pseudo_cle;
    new.niveau := old.niveau;
    new.maj := now();
    if new.repondues < old.repondues or new.repondues > 15 or new.bonnes > new.repondues
       or new.score < old.score or new.score > new.bonnes * 500 then
      raise exception 'Valeurs refusées.';
    end if;
  end if;
  return new;
end $$;

-- 3. Les alertes de 18 h 30 : chaque téléphone reçoit celle de son niveau
alter table public.push_abonnements add column if not exists niveau text not null default 'm1';

-- 4. Vérification (doit afficher le nombre de lignes M1 d'avant, et 0 ailleurs)
select 'bequick_jours' as table_, niveau, count(*) from public.bequick_jours group by niveau
union all
select 'bequick_parties', niveau, count(*) from public.bequick_parties group by niveau
union all
select 'push_abonnements', niveau, count(*) from public.push_abonnements group by niveau;
