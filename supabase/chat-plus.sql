-- ════════════════════════════════════════════════════════════════
--  chat-plus.sql — réponses et réactions du chat (7.2.0)
--
--  · reponse_a : un message peut citer celui auquel il répond.
--  · chat_reactions : 👍 ❤️ 😂 😮 😢 🔥, une de chaque par personne et
--    par message (la personne = le pseudo, quel que soit l'appareil).
--  Mêmes règles que les messages : seuls les appareils avec une clé
--  d'accès valide lisent et réagissent ; chacun ne retire que les siennes.
--  « Léa écrit… » et les connectés passent par Realtime sans rien stocker.
--
--  À lancer une fois dans Supabase → SQL Editor → New query → Run,
--  APRÈS chat.sql. Le relancer ne casse rien.
-- ════════════════════════════════════════════════════════════════

alter table public.chat_messages
  add column if not exists reponse_a bigint references public.chat_messages(id) on delete set null;

create table if not exists public.chat_reactions (
  message_id bigint not null references public.chat_messages(id) on delete cascade,
  pseudo_cle text not null,               -- pseudo en minuscules
  pseudo     text not null,
  cle        uuid not null,               -- la clé d'accès de l'appareil
  emoji      text not null check (emoji in ('👍','❤️','😂','😮','😢','🔥')),
  cree       timestamptz not null default now(),
  primary key (message_id, pseudo_cle, emoji)
);

alter table public.chat_reactions enable row level security;
revoke all on public.chat_reactions from anon, authenticated;
grant select, insert, delete on public.chat_reactions to authenticated;

drop policy if exists chat_reac_lire    on public.chat_reactions;
drop policy if exists chat_reac_ajouter on public.chat_reactions;
drop policy if exists chat_reac_retirer on public.chat_reactions;
create policy chat_reac_lire on public.chat_reactions for select to authenticated
  using (public.chat_autorise());
create policy chat_reac_ajouter on public.chat_reactions for insert to authenticated
  with check (public.chat_autorise()
              and cle = (auth.jwt()->>'cle')::uuid
              and pseudo = auth.jwt()->>'pseudo'
              and pseudo_cle = lower(auth.jwt()->>'pseudo'));
create policy chat_reac_retirer on public.chat_reactions for delete to authenticated
  using (public.chat_autorise() and pseudo_cle = lower(auth.jwt()->>'pseudo'));

-- Temps réel : les réactions apparaissent et disparaissent en direct.
alter table public.chat_reactions replica identity full;
do $$
begin
  alter publication supabase_realtime add table public.chat_reactions;
exception when duplicate_object then null;
end $$;
