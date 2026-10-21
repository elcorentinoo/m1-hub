-- ════════════════════════════════════════════════════════════════
--  chat-notif.sql — notifications du chat, même appli fermée (7.1.0)
--
--  À lancer APRÈS supabase/chat.sql (il faut la table chat_messages).
--  À chaque nouveau message, la base appelle la fonction Supabase
--  « chat-notif » (supabase/functions/chat-notif/index.ts), qui envoie
--  « Léa a envoyé un message » à tous les abonnés aux notifications.
--  Gratuit : tout reste chez Supabase, rien ne passe par Netlify.
--
--  Le secret partagé avec la fonction est rangé dans le coffre de la
--  base (vault), sous le nom « chat_notif » : il ne figure pas ici.
--  Le relancer ne casse rien.
-- ════════════════════════════════════════════════════════════════

create extension if not exists pg_net with schema extensions;

-- Chacun peut couper les notifications du chat (et garder celles de BeQuick).
alter table public.push_abonnements add column if not exists chat boolean not null default true;
create or replace function public.push_chat(e text, actif boolean) returns void
language sql security definer set search_path = public as $$
  update public.push_abonnements set chat = actif where endpoint = e;
$$;
grant execute on function public.push_chat(text, boolean) to anon;

-- Anti-spam : au plus une notification toutes les 3 minutes ; la suivante
-- regroupe les messages arrivés entre-temps (« Léa et 2 autres… »).
create table if not exists public.chat_notif_etat (
  id          int primary key default 1 check (id = 1),
  dernier     timestamptz,
  dernier_msg bigint not null default 0
);
insert into public.chat_notif_etat (id) values (1) on conflict do nothing;
alter table public.chat_notif_etat enable row level security;
revoke all on public.chat_notif_etat from anon, authenticated;

create or replace function public.chat_notif_tour(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e record; n int; p text[];
begin
  select * into e from public.chat_notif_etat where id = 1 for update;
  if e.dernier is not null and now() - e.dernier < interval '3 minutes' then
    return jsonb_build_object('envoyer', false);
  end if;
  select count(*), array_agg(distinct pseudo) into n, p
    from public.chat_messages
   where id > e.dernier_msg and id <= p_id and cree > now() - interval '1 hour';
  update public.chat_notif_etat set dernier = now(), dernier_msg = greatest(p_id, e.dernier_msg) where id = 1;
  return jsonb_build_object('envoyer', true, 'nb', greatest(n, 1), 'pseudos', coalesce(to_jsonb(p), '[]'::jsonb));
end $$;
revoke all on function public.chat_notif_tour(bigint) from public, anon, authenticated;

-- À chaque message : appel de la fonction chat-notif (sans attendre sa réponse).
create or replace function public.chat_notif_declencher() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare s text;
begin
  select decrypted_secret into s from vault.decrypted_secrets where name = 'chat_notif' limit 1;
  if s is null then return new; end if;            -- secret pas encore rangé : pas de notification
  perform net.http_post(
    url     := 'https://vrlvtcydgdyrcljfgasg.supabase.co/functions/v1/chat-notif',
    body    := jsonb_build_object('id', new.id, 'pseudo', new.pseudo),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-chat-secret', s));
  return new;
end $$;

drop trigger if exists chat_notif on public.chat_messages;
create trigger chat_notif after insert on public.chat_messages
  for each row execute function public.chat_notif_declencher();
