-- ════════════════════════════════════════════════════════════
--  BeQuick + notifications — à coller UNE FOIS dans Supabase :
--  SQL Editor → New query → coller tout ce fichier → Run.
--  Sans danger si on le relance : il ne recrée que ce qui manque.
-- ════════════════════════════════════════════════════════════

-- 1. La série du jour, figée par le premier joueur
create table if not exists public.bequick_jours (
  jour      date primary key,
  ids       text not null,
  matieres  text not null default '',
  cree      timestamptz not null default now()
);
alter table public.bequick_jours enable row level security;
grant select, insert on public.bequick_jours to anon;
drop policy if exists "bq jours lecture" on public.bequick_jours;
create policy "bq jours lecture"  on public.bequick_jours for select to anon using (true);
drop policy if exists "bq jours creation" on public.bequick_jours;
create policy "bq jours creation" on public.bequick_jours for insert to anon with check (true);

-- 2. Une partie par joueur et par jour
create table if not exists public.bequick_parties (
  id          bigint generated always as identity primary key,
  jour        date not null,
  pseudo      text not null,
  pseudo_cle  text not null,
  debut       timestamptz not null default now(),
  maj         timestamptz not null default now(),
  score       integer not null default 0,
  bonnes      integer not null default 0,
  repondues   integer not null default 0,
  detail      text not null default '',
  unique (jour, pseudo_cle)
);
alter table public.bequick_parties enable row level security;
grant select, insert, update on public.bequick_parties to anon;
drop policy if exists "bq lecture" on public.bequick_parties;
create policy "bq lecture"     on public.bequick_parties for select to anon using (true);
drop policy if exists "bq creation" on public.bequick_parties;
create policy "bq creation"    on public.bequick_parties for insert to anon with check (true);
drop policy if exists "bq mise a jour" on public.bequick_parties;
create policy "bq mise a jour" on public.bequick_parties for update to anon using (true) with check (true);

-- Le serveur fait foi : il horodate le départ, n'accepte un départ
-- qu'entre 18 h 30 et 22 h 00 (heure de Paris), et refuse toute
-- réponse après les 20 minutes du chrono.
create or replace function public.bequick_controle() returns trigger
language plpgsql as $$
declare
  paris timestamp := now() at time zone 'Europe/Paris';
begin
  if tg_op = 'INSERT' then
    if paris::time < time '18:30' or paris::time >= time '22:00' then
      raise exception 'BeQuick est ouvert de 18 h 30 à 22 h 00.';
    end if;
    new.jour := paris::date;
    new.debut := now(); new.maj := now();
    new.score := 0; new.bonnes := 0; new.repondues := 0; new.detail := '';
    new.pseudo := btrim(new.pseudo);
    new.pseudo_cle := lower(new.pseudo);
  else
    if now() > old.debut + interval '20 minutes 20 seconds' then
      raise exception 'Le chrono est écoulé.';
    end if;
    new.id := old.id; new.jour := old.jour; new.debut := old.debut;
    new.pseudo := old.pseudo; new.pseudo_cle := old.pseudo_cle;
    new.maj := now();
    if new.repondues < old.repondues or new.repondues > 30 or new.bonnes > new.repondues
       or new.score < old.score or new.score > new.bonnes * 500 then
      raise exception 'Valeurs refusées.';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists bequick_controle on public.bequick_parties;
create trigger bequick_controle before insert or update on public.bequick_parties
  for each row execute function public.bequick_controle();

-- 3. Les téléphones qui reçoivent l'alerte de 18 h 30
create table if not exists public.push_abonnements (
  endpoint  text primary key,
  p256dh    text not null,
  auth      text not null,
  pseudo    text,
  cree      timestamptz not null default now()
);
alter table public.push_abonnements enable row level security;
grant select, insert, update on public.push_abonnements to anon;
drop policy if exists "push lecture" on public.push_abonnements;
create policy "push lecture"     on public.push_abonnements for select to anon using (true);
drop policy if exists "push creation" on public.push_abonnements;
create policy "push creation"    on public.push_abonnements for insert to anon with check (true);
drop policy if exists "push mise a jour" on public.push_abonnements;
create policy "push mise a jour" on public.push_abonnements for update to anon using (true) with check (true);

-- Désinscrire un téléphone (appelé par le site, ou par l'envoi du soir
-- quand un abonnement a expiré). Une seule ligne, par son adresse.
create or replace function public.push_oublier(e text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_abonnements where endpoint = e;
$$;
grant execute on function public.push_oublier(text) to anon;
