-- ════════════════════════════════════════════════════════════════
--  chat.sql — messagerie instantanée du hub M1 MBAF (7.1.0)
--
--  Un salon unique, « Général » (la colonne salon est gardée pour
--  plus tard). Seuls les appareils qui ont une clé d'accès valide
--  peuvent LIRE et ÉCRIRE : le navigateur présente un jeton signé par
--  la fonction Netlify « acces-jeton » (secret JWT du projet), qui
--  porte l'identifiant de la clé (cle) et le pseudo. Les règles
--  ci-dessous vérifient, à chaque lecture et à chaque envoi, que cette
--  clé existe, a bien été activée et n'est pas révoquée.
--
--  Les messages arrivent en direct (Supabase Realtime) et sont
--  effacés au bout de 30 jours.
--
--  À lancer une fois dans Supabase → SQL Editor → New query → Run,
--  APRÈS acces.sql. Le relancer ne casse rien.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.chat_messages (
  id     bigint generated always as identity primary key,
  salon  text not null default 'general' check (salon ~ '^[a-z0-9-]{2,40}$'),
  cle    uuid not null,                  -- la clé d'accès de l'appareil qui a écrit
  pseudo text not null check (char_length(pseudo) between 2 and 24),
  texte  text not null check (char_length(texte) between 1 and 1000),
  cree   timestamptz not null default now()
);
create index if not exists chat_messages_salon_cree on public.chat_messages (salon, cree desc);
create index if not exists chat_messages_cle_cree   on public.chat_messages (cle, cree desc);

-- La clé portée par le jeton est-elle toujours valable ?
create or replace function public.chat_autorise()
returns boolean language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from public.acces_cles
     where id = nullif(auth.jwt()->>'cle', '')::uuid
       and not revoquee and utilisee is not null);
$$;
revoke all on function public.chat_autorise() from public;
grant execute on function public.chat_autorise() to authenticated;

-- Droits : personne sans jeton ; avec jeton, lire et écrire (jamais modifier).
alter table public.chat_messages enable row level security;
revoke all on public.chat_messages from anon, authenticated;
grant select, insert on public.chat_messages to authenticated;

drop policy if exists chat_lire   on public.chat_messages;
drop policy if exists chat_ecrire on public.chat_messages;
create policy chat_lire on public.chat_messages for select to authenticated
  using (public.chat_autorise() and cree > now() - interval '30 days');
create policy chat_ecrire on public.chat_messages for insert to authenticated
  with check (public.chat_autorise()
              and cle = (auth.jwt()->>'cle')::uuid
              and pseudo = auth.jwt()->>'pseudo');

-- Anti-rafale : 5 messages au plus par appareil toutes les 10 secondes.
create or replace function public.chat_rafale()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.chat_messages
       where cle = new.cle and cree > now() - interval '10 seconds') >= 5 then
    raise exception 'trop de messages, patiente quelques secondes' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists chat_rafale on public.chat_messages;
create trigger chat_rafale before insert on public.chat_messages
  for each row execute function public.chat_rafale();

-- Purge légère : à chaque envoi, on efface ce qui a plus de 30 jours.
create or replace function public.chat_purge()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.chat_messages where cree < now() - interval '30 days';
  return null;
end $$;
drop trigger if exists chat_purge on public.chat_messages;
create trigger chat_purge after insert on public.chat_messages
  for each statement execute function public.chat_purge();

-- Modération, réservée au serveur (fonction Netlify « acces-admin »,
-- même jeton serveur que acces_admin, vérifié par son empreinte).
create or replace function public.chat_admin(p_jeton text, p_action text, p_donnees jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
begin
  if encode(extensions.digest(coalesce(p_jeton, ''), 'sha256'), 'hex')
     <> '07a0ba5dad1748f64ced608ffdeb388456b29ed38d1957df767ce10665949537' then
    raise exception 'refusé' using errcode = '42501';
  end if;
  if p_action = 'supprimer' then
    delete from public.chat_messages where id = (p_donnees->>'id')::bigint;
    return jsonb_build_object('ok', true);
  end if;
  raise exception 'action inconnue';
end $$;
revoke all on function public.chat_admin(text, text, jsonb) from public;
grant execute on function public.chat_admin(text, text, jsonb) to anon;

-- Temps réel : la table est diffusée (ajouts et suppressions).
alter table public.chat_messages replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;   -- déjà diffusée
end $$;
